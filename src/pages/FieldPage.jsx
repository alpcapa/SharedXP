import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import RolePill from "../components/RolePill";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { deleteFieldPost, fetchFieldPosts } from "../utils/fieldPosts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getRelativePostedLabel = (postedAt) => {
  const postDate = new Date(postedAt);

  if (Number.isNaN(postDate.getTime())) {
    return "";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  postDate.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor((today.getTime() - postDate.getTime()) / MS_PER_DAY);

  if (dayDiff <= 0) {
    return "Today";
  }

  if (dayDiff === 1) {
    return "Yesterday";
  }

  return `${dayDiff} days ago`;
};

const FieldPage = ({ currentUser, onLogout }) => {
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState({});
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  const [fieldPosts, setFieldPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    setPostsLoading(true);
    fetchFieldPosts().then((posts) => {
      setFieldPosts(posts);
      setPostsLoading(false);
    });
  }, []);

  const getCarouselIndex = (postId) => carouselIndex[postId] ?? 0;

  const shiftCarousel = (postId, photos, step) => {
    setCarouselIndex((prev) => {
      const current = prev[postId] ?? 0;
      const next = (current + step + photos.length) % photos.length;
      return { ...prev, [postId]: next };
    });
  };

  const handleDeletePost = useCallback((postId) => {
    if (!window.confirm("Remove this post from The Field?")) return;
    deleteFieldPost(postId);
    setDeletedIds((prev) => new Set([...prev, postId]));
  }, []);

  const allActivePosts = useMemo(() => {
    return fieldPosts.filter((post) => !deletedIds.has(post.id));
  }, [fieldPosts, deletedIds]);

  const countryOptions = useMemo(
    () => ["All", ...[...new Set(allActivePosts.map((p) => p.country).filter(Boolean))].sort()],
    [allActivePosts]
  );

  const cityOptions = useMemo(() => {
    const postsForCountry =
      selectedCountry === "All" ? allActivePosts : allActivePosts.filter((p) => p.country === selectedCountry);
    return ["All", ...[...new Set(postsForCountry.map((p) => p.city).filter(Boolean))].sort()];
  }, [allActivePosts, selectedCountry]);

  const sportOptions = useMemo(
    () => ["All", ...[...new Set(allActivePosts.map((p) => p.sport).filter(Boolean))].sort()],
    [allActivePosts]
  );

  const visiblePosts = useMemo(
    () =>
      allActivePosts
        .filter(
          (post) =>
            (selectedCountry === "All" || post.country === selectedCountry) &&
            (selectedCity === "All" || post.city === selectedCity) &&
            (selectedSport === "All" || post.sport === selectedSport)
        )
        .sort(
          (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        ),
    [allActivePosts, selectedCountry, selectedCity, selectedSport]
  );

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <section className="field-hero">
          <h1>The Field</h1>
          <p>See what’s happening on the ground. Real sessions. Real people.</p>
        </section>
        <main className="field-main">
        <section className="explore-filters">
          <div className="explore-filter-dropdowns">
            <div className="explore-filter-group">
              <label htmlFor="field-filter-country">Country</label>
              <select
                id="field-filter-country"
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedCity("All");
                }}
              >
                {countryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="explore-filter-group">
              <label htmlFor="field-filter-city">City</label>
              <select
                id="field-filter-city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={cityOptions.length <= 1}
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="explore-filter-group">
              <label htmlFor="field-filter-sport">Sport</label>
              <select
                id="field-filter-sport"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
              >
                {sportOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {postsLoading ? (
          <p className="field-empty-state">Loading…</p>
        ) : visiblePosts.length === 0 ? (
          <p className="field-empty-state">
            No sessions found for the selected filters. Check back soon!
          </p>
        ) : (
          <div className="field-feed">
             {visiblePosts.map((post) => {
               const isOwner = post.posterId != null && post.posterId === currentUser?.id;
               const postLocation = [post.city, post.country].filter(Boolean).join(", ");
               const postRating = Number(post.rating ?? 0);
               return (
                 <article key={post.id} className="field-card">
                  <div className="field-host-row">
                    {post.hostPhoto ? (
                      <img src={post.hostPhoto} alt={post.hostName} className="field-host-avatar" />
                    ) : (
                      <div
                        className="field-host-avatar field-host-avatar-fallback"
                        aria-hidden="true"
                      >
                        {String(post.hostName ?? "?")
                          .trim()
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((word) => word[0].toUpperCase())
                          .join("") || "?"}
                      </div>
                    )}
                     <div>
                       <p>
                         <span className="field-host-name">{post.hostName}</span>
                         {postRating > 0 && (
                           <span className="field-host-rating"> · {postRating.toFixed(1)}⭐</span>
                         )}
                         {postLocation && (
                           <span className="field-host-city"> · {postLocation}</span>
                         )}
                       </p>
                       <div className="field-sport-pill-row">
                         <span className="sport-pill">{post.sport}</span>
                        <RolePill role={post.role} />
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const photos = Array.isArray(post.photos) && post.photos.length > 0
                      ? post.photos
                      : post.photo
                        ? [post.photo]
                        : [];
                    if (photos.length === 0) return null;
                    const idx = getCarouselIndex(post.id);
                    return (
                      <div className="field-carousel">
                        {photos.length > 1 && (
                          <button
                            type="button"
                            className="field-carousel-nav field-carousel-prev"
                            aria-label="Previous photo"
                            onClick={() => shiftCarousel(post.id, photos, -1)}
                          >
                            ‹
                          </button>
                        )}
                        <img
                          src={photos[idx]}
                          alt={post.sport}
                          className="field-post-photo"
                        />
                        {photos.length > 1 && (
                          <button
                            type="button"
                            className="field-carousel-nav field-carousel-next"
                            aria-label="Next photo"
                            onClick={() => shiftCarousel(post.id, photos, 1)}
                          >
                            ›
                          </button>
                        )}
                        {photos.length > 1 && (
                          <p className="field-carousel-counter">{idx + 1} / {photos.length}</p>
                        )}
                      </div>
                    );
                  })()}
                  <p className="field-caption">{post.caption}</p>
                   <p className="field-meta">
                     🤍 {post.likes} · {getRelativePostedLabel(post.postedAt)}
                   </p>
                   <div className="field-card-footer">
                     {post.hostId != null && String(post.hostId).trim() !== "" && (
                       <Link
                         to={`/buddy/${post.hostId}`}
                         className="field-view-host-link"
                       >
                         View host profile →
                       </Link>
                     )}
                     <div className="field-post-actions">
                       {isOwner && post.sourceRequestId && (
                         <Link
                           to={`/history?editRating=${post.sourceRequestId}`}
                           className="field-post-action-link"
                         >
                           Edit post
                         </Link>
                       )}
                       {isOwner && (
                         <button
                           type="button"
                           className="field-post-action-link"
                           aria-label="Delete this post"
                           onClick={() => handleDeletePost(post.id)}
                         >
                           Delete post
                         </button>
                       )}
                       {!isOwner && (
                         <button
                           type="button"
                           className="field-post-action-link"
                           onClick={() => {
                             if (window.confirm("Report this post as inappropriate?\n\nWe will review it and take action if needed.")) {
                               window.alert("Thank you — your report has been received.");
                             }
                           }}
                         >
                           Report
                         </button>
                       )}
                     </div>
                   </div>
                 </article>
               );
             })}
          </div>
        )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default FieldPage;
