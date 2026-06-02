import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import InlineLoginForm from "../components/InlineLoginForm";
import { useHosts } from "../hooks/useHosts";
import { supabase } from "../lib/supabase";
import { getProfileAge } from "../utils/profileAge";

const LOCALS_PER_PAGE = 4;
const PHOTOS_PER_PAGE = 5;
const HISTORY_PLACEHOLDER_EVENT_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

const getMemberSinceLabel = (user) => {
  const signedUpTimestamp = Date.parse(String(user?.signedUpAt ?? ""));
  if (!Number.isFinite(signedUpTimestamp)) {
    return "New";
  }

  const now = new Date();
  const signedUpDate = new Date(signedUpTimestamp);
  if (signedUpDate > now) {
    return "0 months";
  }
  let totalMonths =
    (now.getFullYear() - signedUpDate.getFullYear()) * 12 + (now.getMonth() - signedUpDate.getMonth());
  if (now.getDate() < signedUpDate.getDate()) {
    totalMonths -= 1;
  }
  totalMonths = Math.max(0, totalMonths);
  if (totalMonths >= 12) {
    const years = Math.floor(totalMonths / 12);
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
};

const toOverallHostReview = (historyItem, index) => {
  const item = historyItem && typeof historyItem === "object" ? historyItem : {};
  const rating = Number(item.attendeeRating ?? 0);
  const hasRating = Number.isFinite(rating) && rating > 0;
  if (!hasRating) {
    return null;
  }
  const hostName = String(item.hostName ?? item.host ?? "Host").trim() || "Host";
  const eventName = String(item.eventName ?? item.label ?? item.title ?? "").trim();
  return {
    id: `${hostName}-${eventName || "event"}-${index}`,
    hostName,
    eventName,
    rating,
    review: item.review || null,
    completedAt: item.completedAt || null,
  };
};

const sortByDateDesc = (a, b) => {
  if (!a.completedAt && !b.completedAt) return 0;
  if (!a.completedAt) return 1;
  if (!b.completedAt) return -1;
  return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
};

const getHistoryGalleryPhotos = (historyItems) => {
  const photos = (Array.isArray(historyItems) ? historyItems : []).flatMap((historyItem) => {
    const item = historyItem && typeof historyItem === "object" ? historyItem : {};
    const list = item.photoGallery ?? item.photos ?? item.images ?? item.gallery ?? [];
    const normalizedList = Array.isArray(list) ? list : list ? [list] : [];
    return [item.photo, ...normalizedList];
  });

  return Array.from(
    new Set(
      photos
        .map((photo) => String(photo ?? "").trim())
        .filter((photo) => photo && photo !== HISTORY_PLACEHOLDER_EVENT_PHOTO)
    )
  );
};

const UserProfilePage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "cm" ? "cm" : "guest"
  );
  const [recommendationsPage, setRecommendationsPage] = useState(0);
  const [guestPhotosPage, setGuestPhotosPage] = useState(0);
  const [hostPhotosPage, setHostPhotosPage] = useState(0);
  // Reviews/photos received as a guest (host rated the user)
  const [brGuestReviews, setBrGuestReviews] = useState([]);
  const [brGuestPhotos, setBrGuestPhotos] = useState([]);
  // Reviews/photos received as a host (guest rated the user)
  const [brHostReviews, setBrHostReviews] = useState([]);
  const [brHostPhotos, setBrHostPhotos] = useState([]);

  // CM tab state
  const [cmStats, setCmStats] = useState(null);
  const [cmCommissions, setCmCommissions] = useState([]);
  const [cmLoading, setCmLoading] = useState(false);
  const [cmCopied, setCmCopied] = useState(false);

  const fetchCmData = useCallback(async () => {
    if (!currentUser?.cmProfile?.id) return;
    setCmLoading(true);
    const cmId = currentUser.cmProfile.id;
    const [referralsRes, commissionsRes] = await Promise.all([
      supabase.from("cm_referrals").select("id").eq("cm_id", cmId),
      supabase
        .from("cm_commissions")
        .select(`id, gmv, commission_amount, currency, status, created_at,
          booking_request:booking_requests(requested_date, sport,
            requester:profiles!requester_id(full_name, first_name, last_name))`)
        .eq("cm_id", cmId)
        .order("created_at", { ascending: false }),
    ]);
    const commList = commissionsRes.data ?? [];
    const currency = commList[0]?.currency ?? "EUR";
    setCmStats({
      referredCount: referralsRes.data?.length ?? 0,
      completedBookings: commList.length,
      totalEarnings: commList.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0),
      pendingEarnings: commList.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_amount), 0),
      approvedEarnings: commList.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.commission_amount), 0),
      currency,
    });
    setCmCommissions(commList);
    setCmLoading(false);
  }, [currentUser?.cmProfile?.id]);

  useEffect(() => {
    if (activeTab === "cm" && currentUser?.cmProfile && !cmStats) fetchCmData();
  }, [activeTab, currentUser?.cmProfile, cmStats, fetchCmData]);

  const copyCmCode = () => {
    navigator.clipboard.writeText(currentUser?.cmProfile?.inviteCode ?? "").then(() => {
      setCmCopied(true);
      setTimeout(() => setCmCopied(false), 2000);
    });
  };

  const fmtDate = (iso) =>
    iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "—";
  const fmtMoney = (amount, currency) => `${currency ?? ""} ${Number(amount ?? 0).toFixed(2)}`;
  const CM_STATUS_LABEL = { pending: "Pending", approved: "Approved", paid: "Paid" };
  const CM_STATUS_CLASS = { pending: "cm-status-pending", approved: "cm-status-approved", paid: "cm-status-paid" };
  const getCmName = (profile) =>
    profile ? profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—" : "—";

  // Fetch reviews and photos from booking_requests for both guest and host roles
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    (async () => {
      const [guestResult, hostResult] = await Promise.all([
        // As guest: bookings where the user was the requester
        supabase
          .from("booking_requests")
          .select(
            "host_rating, host_review, host_rated_at, guest_photos, host_photos, sport, host_profile:profiles!host_id(full_name, first_name, last_name)"
          )
          .eq("requester_id", currentUser.id)
          .eq("status", "completed")
          .order("host_rated_at", { ascending: false }),
        // As host: bookings where the user was the host
        supabase
          .from("booking_requests")
          .select(
            "requester_id, guest_rating, guest_review, guest_rated_at, guest_photos, host_photos, sport"
          )
          .eq("host_id", currentUser.id)
          .eq("status", "completed")
          .order("guest_rated_at", { ascending: false }),
      ]);

      if (cancelled) return;

      // As-guest reviews (reviews host gave about this user)
      if (guestResult.error) {
        console.error("[UserProfilePage] booking_requests (guest) fetch:", guestResult.error);
      } else {
        const rows = guestResult.data ?? [];
        const reviews = rows
          .filter((r) => Number(r.host_rating) > 0)
          .map((r) => {
            const p = r.host_profile;
            const hostName = p
              ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Host"
              : "Host";
            return {
              id: `br-guest-${hostName}-${r.sport ?? ""}-${r.host_rated_at ?? ""}`,
              hostName,
              eventName: r.sport ?? "",
              rating: r.host_rating,
              review: r.host_review || null,
              completedAt: r.host_rated_at,
            };
          });
        setBrGuestReviews(reviews);

        const photos = rows
          .flatMap((r) => [
            ...(Array.isArray(r.guest_photos) ? r.guest_photos : []),
            ...(Array.isArray(r.host_photos) ? r.host_photos : []),
          ])
          .map((p) => String(p ?? "").trim())
          .filter((p) => p && p !== HISTORY_PLACEHOLDER_EVENT_PHOTO);
        setBrGuestPhotos([...new Set(photos)]);
      }

      // As-host reviews: fetch reviewer names from profile_names view so non-host
      // guest names are visible (the profiles RLS only exposes is_host rows to others).
      if (hostResult.error) {
        console.error("[UserProfilePage] booking_requests (host) fetch:", hostResult.error);
      } else {
        const rows = hostResult.data ?? [];

        const requesterIds = [...new Set(rows.map((r) => r.requester_id).filter(Boolean))];
        const nameMap = {};
        if (requesterIds.length > 0) {
          const { data: nameRows } = await supabase
            .from("profile_names")
            .select("id, full_name, first_name, last_name")
            .in("id", requesterIds);
          if (!cancelled) {
            (nameRows ?? []).forEach((p) => { nameMap[p.id] = p; });
          }
        }

        if (cancelled) return;

        const reviews = rows
          .filter((r) => Number(r.guest_rating) > 0)
          .map((r) => {
            const p = nameMap[r.requester_id] ?? null;
            const guestName = p
              ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Guest"
              : "Guest";
            return {
              id: `br-host-${guestName}-${r.sport ?? ""}-${r.guest_rated_at ?? ""}`,
              guestName,
              eventName: r.sport ?? "",
              rating: r.guest_rating,
              review: r.guest_review || null,
              completedAt: r.guest_rated_at,
            };
          });
        setBrHostReviews(reviews);

        const photos = rows
          .flatMap((r) => [
            ...(Array.isArray(r.guest_photos) ? r.guest_photos : []),
            ...(Array.isArray(r.host_photos) ? r.host_photos : []),
          ])
          .map((p) => String(p ?? "").trim())
          .filter((p) => p && p !== HISTORY_PLACEHOLDER_EVENT_PHOTO);
        setBrHostPhotos([...new Set(photos)]);
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const sportsSelection = (Array.isArray(currentUser?.sports) ? currentUser.sports : [])
    .map((sport) => String(sport ?? "").trim())
    .filter(Boolean);

  const { hosts: hostRecommendations } = useHosts({ excludeId: currentUser?.id });
  const totalRecommendationPages = Math.max(1, Math.ceil(hostRecommendations.length / LOCALS_PER_PAGE));
  const visibleRecommendations = useMemo(() => {
    const startIndex = recommendationsPage * LOCALS_PER_PAGE;
    return hostRecommendations.slice(startIndex, startIndex + LOCALS_PER_PAGE);
  }, [hostRecommendations, recommendationsPage]);

  // Merge legacy bookings reviews with booking_requests reviews, newest first
  const overallHostReviews = useMemo(() => {
    const legacyReviews = (Array.isArray(currentUser?.history) ? currentUser.history : [])
      .map(toOverallHostReview)
      .filter(Boolean);
    const merged = [...brGuestReviews, ...legacyReviews];
    merged.sort(sortByDateDesc);
    return merged;
  }, [brGuestReviews, currentUser?.history]);

  // Reviews received as a host (from guests), sorted newest first
  const overallGuestReviews = useMemo(() => {
    const legacy = (Array.isArray(currentUser?.hostHistory) ? currentUser.hostHistory : [])
      .filter((item) => item && Number(item.attendeeRating) > 0)
      .map((item, index) => ({
        id: `legacy-host-${item.participantName ?? "Guest"}-${index}`,
        guestName: String(item.participantName ?? "Guest").trim() || "Guest",
        eventName: String(item.sport ?? item.eventName ?? "").trim(),
        rating: Number(item.attendeeRating),
        review: item.review || null,
        completedAt: item.completedAt || null,
      }));
    const merged = [...brHostReviews, ...legacy];
    merged.sort(sortByDateDesc);
    return merged;
  }, [brHostReviews, currentUser?.hostHistory]);

  const locationLine =
    [String(currentUser?.city ?? "").trim(), String(currentUser?.country ?? "").trim()].filter(Boolean).join(", ");
  const memberSince = getMemberSinceLabel(currentUser);
  const userAge = getProfileAge(currentUser);

  // Guest gallery: only photos from attended sessions (not hosted)
  const guestGalleryPhotos = useMemo(() => {
    const legacyPhotos = getHistoryGalleryPhotos(currentUser?.history);
    return [...new Set([...brGuestPhotos, ...legacyPhotos])];
  }, [brGuestPhotos, currentUser?.history]);
  const totalGuestPhotoPages = Math.max(1, Math.ceil(guestGalleryPhotos.length / PHOTOS_PER_PAGE));
  const visibleGuestPhotos = guestGalleryPhotos.slice(
    guestPhotosPage * PHOTOS_PER_PAGE,
    (guestPhotosPage + 1) * PHOTOS_PER_PAGE
  );

  // Host gallery: photos from hosted sessions (host_photos + guest_photos)
  const totalHostPhotoPages = Math.max(1, Math.ceil(brHostPhotos.length / PHOTOS_PER_PAGE));
  const visibleHostPhotos = brHostPhotos.slice(
    hostPhotosPage * PHOTOS_PER_PAGE,
    (hostPhotosPage + 1) * PHOTOS_PER_PAGE
  );

  useEffect(() => {
    setRecommendationsPage((currentPage) => Math.min(currentPage, totalRecommendationPages - 1));
  }, [totalRecommendationPages]);

  useEffect(() => {
    setGuestPhotosPage((currentPage) => Math.min(currentPage, totalGuestPhotoPages - 1));
  }, [totalGuestPhotoPages]);

  useEffect(() => {
    setHostPhotosPage((currentPage) => Math.min(currentPage, totalHostPhotoPages - 1));
  }, [totalHostPhotoPages]);

  if (!currentUser) {
    if (authLoading) {
      return (
        <div className="home-page">
          <div className="middle-page-frame">
            <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
            <main className="middle-section">
              <p>Loading…</p>
            </main>
            <SiteFooter />
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <InlineLoginForm
              onEmailLogin={onEmailLogin}
              onForgotPassword={onForgotPassword}
              title="Please log in"
              description="You need to log in to view this profile."
            />
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  const guestAvgRating =
    overallHostReviews.length > 0
      ? (overallHostReviews.reduce((s, r) => s + Number(r.rating), 0) / overallHostReviews.length).toFixed(1)
      : null;
  const hostAvgRating =
    overallGuestReviews.length > 0
      ? (overallGuestReviews.reduce((s, r) => s + Number(r.rating), 0) / overallGuestReviews.length).toFixed(1)
      : null;

  const currentRating = activeTab === "host" ? hostAvgRating : guestAvgRating;
  const currentRatingCount = activeTab === "host" ? overallGuestReviews.length : overallHostReviews.length;

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section host-settings-page unified-profile-page">
          <div className="guest-profile-header">
            {currentUser.photo ? (
              <img src={currentUser.photo} alt={currentUser.fullName || currentUser.firstName || "User"} className="guest-profile-photo" />
            ) : (
              <div className="guest-profile-photo guest-profile-photo-placeholder">
                {(currentUser.fullName || currentUser.firstName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="guest-profile-info">
              <h1 className="guest-profile-name">
                {currentUser.fullName || currentUser.firstName || "User"}
                {userAge != null && <span className="guest-profile-age"> ({userAge})</span>}
                {currentRating !== null && (
                  <span className="guest-profile-rating-inline">
                    ⭐ {currentRating}
                    {currentRatingCount > 0 && ` (${currentRatingCount})`}
                  </span>
                )}
              </h1>
              {locationLine && <p className="guest-profile-location">{locationLine}</p>}
              <p className="guest-profile-member-since">Member since {memberSince}</p>
            </div>
            <div className="unified-profile-own-actions">
              <Link to="/my-profile" className="btn btn-primary">Edit Profile</Link>
              {currentUser.isHost
                ? <Link to="/host-settings" className="btn btn-light">Host Settings</Link>
                : <Link to="/become-a-host" className="btn btn-light">Become Host</Link>
              }
            </div>
          </div>

          {/* ── Role tabs (shown when user is a host or CM) ── */}
          {(currentUser.isHost || currentUser.cmProfile) && (
            <div className="host-tab-bar unified-profile-tabs">
              <button
                type="button"
                className={`host-tab-btn${activeTab === "guest" ? " active" : ""}`}
                onClick={() => setActiveTab("guest")}
              >
                As Guest
                {guestAvgRating !== null && (
                  <span className="unified-profile-tab-rating">⭐ {guestAvgRating}</span>
                )}
              </button>
              {currentUser.isHost && (
                <button
                  type="button"
                  className={`host-tab-btn${activeTab === "host" ? " active" : ""}`}
                  onClick={() => setActiveTab("host")}
                >
                  As Host
                  {hostAvgRating !== null && (
                    <span className="unified-profile-tab-rating">⭐ {hostAvgRating}</span>
                  )}
                </button>
              )}
              {currentUser.cmProfile && (
                <button
                  type="button"
                  className={`host-tab-btn${activeTab === "cm" ? " active" : ""}`}
                  onClick={() => setActiveTab("cm")}
                >
                  As CM
                </button>
              )}
            </div>
          )}

          {/* ── As Guest tab ── */}
          {activeTab === "guest" && (
            <>
              <section className="gallery">
                <h3>Photo gallery</h3>
                {guestGalleryPhotos.length > 0 ? (
                  <>
                    <div className="gallery-grid">
                      {visibleGuestPhotos.map((photo) => (
                        <img key={photo} src={photo} alt="Experience photo" />
                      ))}
                    </div>
                    {totalGuestPhotoPages > 1 && (
                      <div className="locals-nav-row">
                        <button type="button" className="locals-nav" aria-label="Previous photos"
                          onClick={() => setGuestPhotosPage((p) => Math.max(p - 1, 0))}
                          disabled={guestPhotosPage === 0}>‹</button>
                        <span className="locals-nav-info">{guestPhotosPage + 1} / {totalGuestPhotoPages}</span>
                        <button type="button" className="locals-nav" aria-label="Next photos"
                          onClick={() => setGuestPhotosPage((p) => Math.min(p + 1, totalGuestPhotoPages - 1))}
                          disabled={guestPhotosPage >= totalGuestPhotoPages - 1}>›</button>
                      </div>
                    )}
                  </>
                ) : (
                  <p>No photos yet.</p>
                )}
              </section>

              <section className="reviews">
                <h3>Reviews from hosts</h3>
                {overallHostReviews.length > 0 ? (
                  overallHostReviews.map((review) => (
                    <article key={review.id} className="review-card">
                      <p>
                        <strong>{review.hostName}</strong>
                        {review.eventName ? ` (${review.eventName})` : ""} · ⭐ {review.rating ? Number(review.rating).toFixed(1) : "Not rated"}
                      </p>
                      {review.review && <p>{review.review}</p>}
                    </article>
                  ))
                ) : (
                  <p>No reviews from hosts yet.</p>
                )}
              </section>

              <section className="recommendations">
                <h3>More locals you might like</h3>
                {hostRecommendations.length > 0 ? (
                  <div className="locals-grid-wrap">
                    <div className="locals-grid">
                      {visibleRecommendations.map((recommendation) => (
                        <BuddyCard key={recommendation.id} buddy={recommendation} />
                      ))}
                    </div>
                    <div className="locals-nav-row">
                      <button type="button" className="locals-nav" aria-label="Show previous locals"
                        onClick={() => setRecommendationsPage((page) => Math.max(page - 1, 0))}
                        disabled={recommendationsPage === 0}>‹</button>
                      <button type="button" className="locals-nav" aria-label="Show next locals"
                        onClick={() => setRecommendationsPage((page) => Math.min(page + 1, totalRecommendationPages - 1))}
                        disabled={recommendationsPage >= totalRecommendationPages - 1}>›</button>
                    </div>
                  </div>
                ) : (
                  <p>No other hosts yet.</p>
                )}
              </section>
            </>
          )}

          {/* ── As CM tab ── */}
          {activeTab === "cm" && currentUser.cmProfile && (
            <div className="cm-dashboard">
              <div className="cm-invite-card">
                <p className="cm-invite-label">Your invite code</p>
                <div className="cm-invite-code-row">
                  <span className="cm-invite-code">{currentUser.cmProfile.inviteCode}</span>
                  <button type="button" className="btn btn-secondary cm-copy-btn" onClick={copyCmCode}>
                    {cmCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="cm-invite-hint">
                  Share this code with athletes and sports enthusiasts. Anyone who signs up with your code becomes your referral permanently.
                </p>
              </div>

              {cmLoading ? (
                <p>Loading stats…</p>
              ) : cmStats ? (
                <>
                  <div className="cm-stats-grid">
                    <div className="cm-stat-card">
                      <p className="cm-stat-value">{cmStats.referredCount}</p>
                      <p className="cm-stat-label">Referred users</p>
                    </div>
                    <div className="cm-stat-card">
                      <p className="cm-stat-value">{cmStats.completedBookings}</p>
                      <p className="cm-stat-label">Completed bookings</p>
                    </div>
                    <div className="cm-stat-card">
                      <p className="cm-stat-value">{fmtMoney(cmStats.totalEarnings, cmStats.currency)}</p>
                      <p className="cm-stat-label">Total paid out</p>
                    </div>
                    <div className="cm-stat-card">
                      <p className="cm-stat-value">{fmtMoney(cmStats.pendingEarnings + cmStats.approvedEarnings, cmStats.currency)}</p>
                      <p className="cm-stat-label">Pending commission</p>
                    </div>
                  </div>

                  <h2 className="cm-section-title">Commission history</h2>
                  {cmCommissions.length === 0 ? (
                    <p className="cm-empty">No commissions yet. Share your invite code to get started!</p>
                  ) : (
                    <div className="cm-commission-table-wrap">
                      <table className="cm-commission-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>User</th>
                            <th>Sport</th>
                            <th>GBV</th>
                            <th>Commission</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cmCommissions.map((c) => (
                            <tr key={c.id}>
                              <td>{fmtDate(c.created_at)}</td>
                              <td>{getCmName(c.booking_request?.requester)}</td>
                              <td>{c.booking_request?.sport ?? "—"}</td>
                              <td>{fmtMoney(c.gmv, c.currency)}</td>
                              <td>{fmtMoney(c.commission_amount, c.currency)}</td>
                              <td>
                                <span className={`cm-status-badge ${CM_STATUS_CLASS[c.status] ?? ""}`}>
                                  {CM_STATUS_LABEL[c.status] ?? c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ── As Host tab ── */}
          {activeTab === "host" && currentUser.isHost && (
            <>
              <section className="gallery">
                <h3>Photo gallery</h3>
                {brHostPhotos.length > 0 ? (
                  <>
                    <div className="gallery-grid">
                      {visibleHostPhotos.map((photo) => (
                        <img key={photo} src={photo} alt="Experience photo" />
                      ))}
                    </div>
                    {totalHostPhotoPages > 1 && (
                      <div className="locals-nav-row">
                        <button type="button" className="locals-nav" aria-label="Previous photos"
                          onClick={() => setHostPhotosPage((p) => Math.max(p - 1, 0))}
                          disabled={hostPhotosPage === 0}>‹</button>
                        <span className="locals-nav-info">{hostPhotosPage + 1} / {totalHostPhotoPages}</span>
                        <button type="button" className="locals-nav" aria-label="Next photos"
                          onClick={() => setHostPhotosPage((p) => Math.min(p + 1, totalHostPhotoPages - 1))}
                          disabled={hostPhotosPage >= totalHostPhotoPages - 1}>›</button>
                      </div>
                    )}
                  </>
                ) : (
                  <p>No session photos yet.</p>
                )}
              </section>

              <section className="reviews">
                <h3>Reviews from guests</h3>
                {overallGuestReviews.length > 0 ? (
                  overallGuestReviews.map((review) => (
                    <article key={review.id} className="review-card">
                      <p>
                        <strong>{review.guestName}</strong>
                        {review.eventName ? ` (${review.eventName})` : ""} · ⭐ {review.rating ? Number(review.rating).toFixed(1) : "Not rated"}
                      </p>
                      {review.review && <p>{review.review}</p>}
                    </article>
                  ))
                ) : (
                  <p>No reviews from guests yet.</p>
                )}
              </section>
            </>
          )}

        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default UserProfilePage;
