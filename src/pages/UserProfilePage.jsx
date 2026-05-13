import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";
import { supabase } from "../lib/supabase";
import { getProfileAge } from "../utils/profileAge";

const LOCALS_PER_PAGE = 4;
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

const UserProfilePage = ({ currentUser, authLoading, onLogout }) => {
  const [recommendationsPage, setRecommendationsPage] = useState(0);
  // Reviews/photos received as a guest (host rated the user)
  const [brGuestReviews, setBrGuestReviews] = useState([]);
  const [brGuestPhotos, setBrGuestPhotos] = useState([]);
  // Reviews/photos received as a host (guest rated the user)
  const [brHostReviews, setBrHostReviews] = useState([]);
  const [brHostPhotos, setBrHostPhotos] = useState([]);

  // Fetch reviews and photos from booking_requests for both guest and host roles
  useEffect(() => {
    if (!currentUser?.id) return;
    Promise.all([
      // As guest: bookings where the user was the requester
      supabase
        .from("booking_requests")
        .select(
          "host_rating, host_review, host_rated_at, guest_photos, sport, host_profile:profiles!host_id(full_name, first_name, last_name)"
        )
        .eq("requester_id", currentUser.id)
        .eq("status", "completed")
        .order("host_rated_at", { ascending: false }),
      // As host: bookings where the user was the host
      supabase
        .from("booking_requests")
        .select(
          "guest_rating, guest_review, guest_rated_at, guest_photos, host_photos, sport, requester_profile:profiles!requester_id(full_name, first_name, last_name)"
        )
        .eq("host_id", currentUser.id)
        .eq("status", "completed")
        .order("guest_rated_at", { ascending: false }),
    ]).then(([guestResult, hostResult]) => {
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
          .flatMap((r) => (Array.isArray(r.guest_photos) ? r.guest_photos : []))
          .map((p) => String(p ?? "").trim())
          .filter((p) => p && p !== HISTORY_PLACEHOLDER_EVENT_PHOTO);
        setBrGuestPhotos([...new Set(photos)]);
      }

      // As-host reviews (reviews guest gave about this user as host)
      if (hostResult.error) {
        console.error("[UserProfilePage] booking_requests (host) fetch:", hostResult.error);
      } else {
        const rows = hostResult.data ?? [];
        const reviews = rows
          .filter((r) => Number(r.guest_rating) > 0)
          .map((r) => {
            const p = r.requester_profile;
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
    });
  }, [currentUser?.id]);

  const sportsSelection = (Array.isArray(currentUser?.sports) ? currentUser.sports : [])
    .map((sport) => String(sport ?? "").trim())
    .filter(Boolean);
  const selectedSports = new Set(sportsSelection.map((sport) => sport.toLowerCase()));
  const hostRecommendations =
    selectedSports.size > 0
      ? buddies.filter((buddy) => selectedSports.has(String(buddy.sport ?? "").toLowerCase()))
      : buddies;
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
      .filter((item) => item && Number(item.rating) > 0)
      .map((item, index) => ({
        id: `legacy-host-${item.participantName ?? "Guest"}-${index}`,
        guestName: String(item.participantName ?? "Guest").trim() || "Guest",
        eventName: String(item.sport ?? item.eventName ?? "").trim(),
        rating: Number(item.rating),
        review: item.review || null,
        completedAt: item.completedAt || null,
      }));
    const merged = [...brHostReviews, ...legacy];
    merged.sort(sortByDateDesc);
    return merged;
  }, [brHostReviews, currentUser?.hostHistory]);

  const hostRatings = overallHostReviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const averageRating =
    hostRatings.length > 0
      ? (hostRatings.reduce((sum, rating) => sum + rating, 0) / hostRatings.length).toFixed(1)
      : "0.0";
  const locationLine =
    [String(currentUser?.city ?? "").trim(), String(currentUser?.country ?? "").trim()].filter(Boolean).join(", ") ||
    "Location unavailable";
  const memberSince = getMemberSinceLabel(currentUser);
  const userAge = getProfileAge(currentUser);
  const languageLine = (Array.isArray(currentUser?.languages) ? currentUser.languages : [])
    .map((language) => String(language ?? "").trim())
    .filter(Boolean)
    .join(", ");

  // Merge legacy history photos with booking_requests photos (both roles)
  const galleryPhotos = useMemo(() => {
    const legacyPhotos = getHistoryGalleryPhotos(currentUser?.history);
    return [...new Set([...brGuestPhotos, ...brHostPhotos, ...legacyPhotos])];
  }, [brGuestPhotos, brHostPhotos, currentUser?.history]);

  useEffect(() => {
    setRecommendationsPage((currentPage) => Math.min(currentPage, totalRecommendationPages - 1));
  }, [totalRecommendationPages]);

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
            <h1>Please log in</h1>
            <p>You need to log in to view your profile.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
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

        <section className="profile-summary">
        <div className="profile-summary-header">
          <div className="profile-summary-top-row">
            <div>
              <h1 className="profile-name-with-age">
                {currentUser.fullName || currentUser.firstName || "User"}
                {userAge != null && (
                  <span className="profile-name-age" aria-label={`age ${userAge}`}>
                    ({userAge})
                  </span>
                )}
                <span className="profile-rating-inline">
                  ⭐ {averageRating}
                  {hostRatings.length > 0 ? ` (${hostRatings.length})` : ""} · <span className="verified">Verified</span>
                </span>
              </h1>
              <p className="profile-location-line">{locationLine}</p>
              <p className="profile-member-since">Member since {memberSince}</p>
            </div>
            <div className="profile-summary-actions">
              <Link to="/my-profile" className="btn btn-primary">
                Edit Profile
              </Link>
              {currentUser.isHost && (
                <Link to={`/buddy/${currentUser.id}`} className="btn btn-primary">
                  My Host Page
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="profile-summary-body">
          <div className="profile-summary-photo-column">
            <img src={currentUser.photo} alt={currentUser.fullName || currentUser.firstName || "User"} className="profile-main-image" />
            <div className="profile-summary-meta">
              <p><strong>Language:</strong> {languageLine || "Not specified"}</p>
              <p><strong>Sports:</strong> {sportsSelection.length ? sportsSelection.join(", ") : "Not specified"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="gallery">
        <h3>Photo gallery</h3>
        {galleryPhotos.length > 0 ? (
          <div className="gallery-grid profile-gallery-scroll">
            {galleryPhotos.map((photo) => (
              <img key={photo} src={photo} alt={`${currentUser.fullName || currentUser.firstName || "User"} history gallery`} />
            ))}
          </div>
        ) : (
          <p>No history photos yet.</p>
        )}
      </section>

      <section className="reviews">
        <h3>Reviews from hosts</h3>
        {overallHostReviews.length > 0 ? (
          overallHostReviews.map((review) => (
            <article key={review.id} className="review-card">
              <p>
                <strong>{review.hostName}</strong>
                {review.eventName ? ` (${review.eventName})` : ""} · ⭐ {review.rating || "Not rated"}
              </p>
              {review.review && <p>{review.review}</p>}
            </article>
          ))
        ) : (
          <p>No reviews from hosts yet.</p>
        )}
      </section>

      {currentUser.isHost && (
        <section className="reviews">
          <h3>Reviews from guests</h3>
          {overallGuestReviews.length > 0 ? (
            overallGuestReviews.map((review) => (
              <article key={review.id} className="review-card">
                <p>
                  <strong>{review.guestName}</strong>
                  {review.eventName ? ` (${review.eventName})` : ""} · ⭐ {review.rating || "Not rated"}
                </p>
                {review.review && <p>{review.review}</p>}
              </article>
            ))
          ) : (
            <p>No reviews from guests yet.</p>
          )}
        </section>
      )}

      <section className="recommendations">
        <h3>More hosts you might like</h3>
        {hostRecommendations.length > 0 ? (
          <div className="locals-grid-wrap">
            <div className="locals-grid">
              {visibleRecommendations.map((recommendation) => (
                <BuddyCard key={recommendation.id} buddy={recommendation} />
              ))}
            </div>
            <div className="locals-nav-row">
              <button
                type="button"
                className="locals-nav"
                aria-label="Show previous 4 hosts"
                onClick={() => setRecommendationsPage((page) => Math.max(page - 1, 0))}
                disabled={recommendationsPage === 0}
              >
                ‹
              </button>
              <button
                type="button"
                className="locals-nav"
                aria-label="Show next 4 hosts"
                onClick={() =>
                  setRecommendationsPage((page) => Math.min(page + 1, totalRecommendationPages - 1))
                }
                disabled={recommendationsPage >= totalRecommendationPages - 1}
              >
                ›
              </button>
            </div>
          </div>
        ) : (
          <p>No hosts match your selected sports yet.</p>
        )}
      </section>

      <SiteFooter />
      </div>
    </div>
  );
};

export default UserProfilePage;
