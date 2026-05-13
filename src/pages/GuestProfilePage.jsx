import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { getAgeFromBirthday } from "../utils/profileAge";

const FALLBACK_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

const REVIEWS_PER_PAGE = 3;
const PHOTOS_PER_PAGE = 5;

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(iso));
};

const StarRating = ({ rating }) => {
  const r = Math.round(Number(rating) * 2) / 2;
  return (
    <span className="guest-profile-stars" aria-label={`${r} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={r >= n ? "star filled" : r >= n - 0.5 ? "star half" : "star empty"}>
          ★
        </span>
      ))}
    </span>
  );
};

const GuestProfilePage = ({ currentUser, onLogout }) => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [photosPage, setPhotosPage] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setPhotosPage(0);

    Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, photo_url, signed_up_at, is_host, birthday, city, country")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("host_rating, sport, completed_at, counterparty_name, photo, photo_gallery")
        .eq("user_id", userId)
        .eq("role", "attended")
        .order("completed_at", { ascending: false }),
      supabase
        .from("booking_requests")
        .select("host_rating, host_review, host_rated_at, guest_photos, sport, host_profile:profiles!host_id(full_name, first_name, last_name)")
        .eq("requester_id", userId)
        .eq("status", "completed")
        .order("host_rated_at", { ascending: false }),
    ]).then(([profileResult, bookingsResult, brResult]) => {
      if (!profileResult.error && profileResult.data) {
        setProfile(profileResult.data);
      }

      const bookings = bookingsResult.data ?? [];
      const brRows = brResult.data ?? [];

      // Reviews: from legacy bookings table + from booking_requests (host_rating), sorted newest-first
      const legacyReviews = bookings.filter((b) => Number(b.host_rating) > 0);
      const brReviews = brRows.filter((r) => Number(r.host_rating) > 0).map((r) => {
        const p = r.host_profile;
        const hostName = p
          ? (p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Host")
          : "Host";
        return {
          counterparty_name: hostName,
          host_rating: r.host_rating,
          host_review: r.host_review,
          sport: r.sport,
          completed_at: r.host_rated_at,
        };
      });
      const allReviews = [...brReviews, ...legacyReviews].sort((a, b) => {
        if (!a.completed_at && !b.completed_at) return 0;
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
      setReviews(allReviews);

      // Photos: from legacy bookings + from guest_photos in booking_requests
      // (guest_photos are set when the guest submitted a rating/photos for a host)
      const legacyPhotos = bookings.flatMap((b) => {
        const gallery = Array.isArray(b.photo_gallery) ? b.photo_gallery : [];
        return [b.photo, ...gallery];
      });
      const brPhotos = brRows.flatMap((r) =>
        Array.isArray(r.guest_photos) ? r.guest_photos : []
      );
      const allPhotos = [...brPhotos, ...legacyPhotos]
        .map((p) => String(p ?? "").trim())
        .filter((p) => p && p !== FALLBACK_PHOTO);
      setPhotos([...new Set(allPhotos)]);

      setLoading(false);
    });
  }, [userId]);

  const getName = (p) =>
    p?.full_name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    "User";

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.host_rating), 0) / reviews.length
      : null;

  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const visibleReviews = reviews.slice(reviewsPage * REVIEWS_PER_PAGE, (reviewsPage + 1) * REVIEWS_PER_PAGE);
  const totalPhotoPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));
  const visiblePhotos = photos.slice(photosPage * PHOTOS_PER_PAGE, (photosPage + 1) * PHOTOS_PER_PAGE);


  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page guest-profile-page">
          {loading ? (
            <p>Loading profile…</p>
          ) : !profile ? (
            <>
              <h1>Profile not found</h1>
              <Link to="/" className="btn btn-primary">Go home</Link>
            </>
          ) : (
            <>
              <div className="guest-profile-header">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={getName(profile)}
                    className="guest-profile-photo"
                  />
                ) : (
                  <div className="guest-profile-photo guest-profile-photo-placeholder">
                    {getName(profile).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="guest-profile-info">
                  <h1 className="guest-profile-name">
                    {getName(profile)}
                    {getAgeFromBirthday(profile.birthday) != null && (
                      <span className="guest-profile-age"> ({getAgeFromBirthday(profile.birthday)})</span>
                    )}
                    {avgRating !== null && (
                      <span className="guest-profile-rating-inline">
                        ⭐ {avgRating.toFixed(1)}
                        {reviews.length > 0 && ` (${reviews.length})`}
                      </span>
                    )}
                  </h1>
                  {(profile.city || profile.country) && (
                    <p className="guest-profile-location">
                      {[profile.city, profile.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {profile.is_host && (
                    <Link to={`/buddy/${userId}`} className="btn btn-light guest-profile-host-link">
                      View host profile →
                    </Link>
                  )}
                  {profile.signed_up_at && (
                    <p className="guest-profile-member-since">
                      Member since {fmtDate(profile.signed_up_at)}
                    </p>
                  )}
                </div>
              </div>

              <section className="guest-profile-reviews">
                <h2 className="guest-profile-section-title">Reviews from hosts</h2>
                {reviews.length === 0 ? (
                  <p>No reviews yet.</p>
                ) : (
                  <>
                    {visibleReviews.map((r, i) => (
                      <article key={i} className="guest-review-card">
                        <div className="guest-review-header">
                          <div>
                            <p className="guest-review-host">{r.counterparty_name || "Host"}</p>
                            <p className="guest-review-sport">{r.sport}</p>
                          </div>
                          <div className="guest-review-meta">
                            <StarRating rating={r.host_rating} />
                            {r.completed_at && (
                              <p className="guest-review-date">{fmtDate(r.completed_at)}</p>
                            )}
                          </div>
                        </div>
                        {r.host_review && (
                          <p className="guest-review-text">{r.host_review}</p>
                        )}
                      </article>
                    ))}
                    {totalReviewPages > 1 && (
                      <div className="locals-nav-row">
                        <button
                          type="button"
                          className="locals-nav"
                          aria-label="Previous reviews"
                          onClick={() => setReviewsPage((p) => Math.max(p - 1, 0))}
                          disabled={reviewsPage === 0}
                        >
                          ‹
                        </button>
                        <span className="locals-nav-info">{reviewsPage + 1} / {totalReviewPages}</span>
                        <button
                          type="button"
                          className="locals-nav"
                          aria-label="Next reviews"
                          onClick={() => setReviewsPage((p) => Math.min(p + 1, totalReviewPages - 1))}
                          disabled={reviewsPage >= totalReviewPages - 1}
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {currentUser && (
                <section className="guest-profile-gallery">
                  <h2 className="guest-profile-section-title">Photo gallery</h2>
                  {photos.length === 0 ? (
                    <p>No history photos yet.</p>
                  ) : (
                    <>
                      <div className="gallery-grid">
                        {visiblePhotos.map((src) => (
                          <img key={src} src={src} alt="Experience photo" />
                        ))}
                      </div>
                      {totalPhotoPages > 1 && (
                        <div className="locals-nav-row">
                          <button
                            type="button"
                            className="locals-nav"
                            aria-label="Previous photos"
                            onClick={() => setPhotosPage((p) => Math.max(p - 1, 0))}
                            disabled={photosPage === 0}
                          >
                            ‹
                          </button>
                          <span className="locals-nav-info">{photosPage + 1} / {totalPhotoPages}</span>
                          <button
                            type="button"
                            className="locals-nav"
                            aria-label="Next photos"
                            onClick={() => setPhotosPage((p) => Math.min(p + 1, totalPhotoPages - 1))}
                            disabled={photosPage >= totalPhotoPages - 1}
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default GuestProfilePage;
