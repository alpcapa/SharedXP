import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";
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
    rating
  };
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

const UserProfilePage = ({ currentUser, onLogout }) => {
  const [recommendationsPage, setRecommendationsPage] = useState(0);
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
  const overallHostReviews = (Array.isArray(currentUser?.history) ? currentUser.history : [])
    .map(toOverallHostReview)
    .filter(Boolean);
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
  const galleryPhotos = getHistoryGalleryPhotos(currentUser?.history);
  useEffect(() => {
    setRecommendationsPage((currentPage) => Math.min(currentPage, totalRecommendationPages - 1));
  }, [totalRecommendationPages]);

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to view your profile.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />

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
          <div className="gallery-grid">
            {galleryPhotos.map((photo) => (
              <img key={photo} src={photo} alt={`${currentUser.fullName || currentUser.firstName || "User"} history gallery`} />
            ))}
          </div>
        ) : (
          <p>No history photos yet.</p>
        )}
      </section>

      <section className="reviews">
        <h3>Ratings & reviews from hosts</h3>
        {overallHostReviews.length > 0 ? (
          overallHostReviews.map((review) => (
            <article key={review.id} className="review-card">
              <p>
                <strong>{review.hostName}</strong>
                {review.eventName ? ` (${review.eventName})` : ""} · ⭐ {review.rating || "Not rated"}
              </p>
            </article>
          ))
        ) : (
          <p>No host ratings or reviews yet.</p>
        )}
      </section>

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
  );
};

export default UserProfilePage;
