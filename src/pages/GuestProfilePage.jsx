import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { getAgeFromBirthday } from "../utils/profileAge";

const FALLBACK_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

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

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

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
    ]).then(([profileResult, bookingsResult]) => {
      if (!profileResult.error && profileResult.data) {
        setProfile(profileResult.data);
      }

      const bookings = bookingsResult.data ?? [];

      setReviews(bookings.filter((b) => Number(b.host_rating) > 0));

      const allPhotos = bookings.flatMap((b) => {
        const gallery = Array.isArray(b.photo_gallery) ? b.photo_gallery : [];
        return [b.photo, ...gallery];
      }).map((p) => String(p ?? "").trim())
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
                  {avgRating !== null && (
                    <div className="guest-profile-rating">
                      <StarRating rating={avgRating} />
                      <span className="guest-profile-rating-label">
                        {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"} as guest
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <section className="guest-profile-reviews">
                <h2 className="guest-profile-section-title">Ratings & reviews from hosts</h2>
                {reviews.length === 0 ? (
                  <p>No host ratings or reviews yet.</p>
                ) : (
                  reviews.map((r, i) => (
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
                    </article>
                  ))
                )}
              </section>

              {currentUser && (
                <section className="guest-profile-gallery">
                  <h2 className="guest-profile-section-title">Photo gallery</h2>
                  {photos.length === 0 ? (
                    <p>No history photos yet.</p>
                  ) : (
                    <div className="gallery-grid">
                      {photos.map((src) => (
                        <img key={src} src={src} alt="Experience photo" />
                      ))}
                    </div>
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
