import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import RolePill from "../components/RolePill";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { deleteFieldPost, fetchFieldPosts, fetchLikedPostIds, toggleFieldPostLike } from "../utils/fieldPosts";

const FieldPage = ({ currentUser, onLogout }) => {
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState({});
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  const [fieldPosts, setFieldPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());

  useEffect(() => {
    setPostsLoading(true);
    fetchFieldPosts().then((posts) => {
      setFieldPosts(posts);
      setPostsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setLikedPostIds(new Set());
      return;
    }
    fetchLikedPostIds(currentUser.id).then(setLikedPostIds);
  }, [currentUser?.id]);

  const handleLikePost = useCallback(async (post) => {
    if (!currentUser?.id || pendingLikeIds.has(post.id)) return;
    const isCurrentlyLiked = likedPostIds.has(post.id);
    setPendingLikeIds((prev) => new Set([...prev, post.id]));
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setFieldPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
          : p
      )
    );
    const result = await toggleFieldPostLike(post.id, currentUser.id, post.likes);
    if (!result) {
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setFieldPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: post.likes } : p))
      );
    }
    setPendingLikeIds((prev) => {
      const next = new Set(prev);
      next.delete(post.id);
      return next;
    });
  }, [currentUser, likedPostIds, pendingLikeIds]);

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
                const profilePath =
                  post.posterId && String(post.posterId).trim() !== ""
                    ? post.role === "hosted"
                      ? `/buddy/${post.posterId}`
                      : `/user/${post.posterId}`
                    : null;
                const avatar = post.hostPhoto ? (
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
                );
                return (
                  <article key={post.id} className="field-card">
                   <div className="field-host-row">
                     {profilePath ? (
                       <Link to={profilePath} className="field-host-link" aria-label={`View ${post.hostName} profile`}>
                         {avatar}
                       </Link>
                     ) : (
                       avatar
                     )}
                     <div>
                       <p>
                          {profilePath ? (
                            <Link to={profilePath} className="field-host-name field-host-name-link">
                              {post.hostName}
                            </Link>
                          ) : (
                            <span className="field-host-name">{post.hostName}</span>
                          )}
                          <span className="field-host-rating"> · {postRating.toFixed(1)}⭐</span>
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
                     <button
                       type="button"
                       className="field-like-btn"
                       onClick={() => handleLikePost(post)}
                       disabled={!currentUser || pendingLikeIds.has(post.id)}
                       aria-label={likedPostIds.has(post.id) ? "Unlike" : "Like"}
                     >
                       {likedPostIds.has(post.id) ? "❤️" : "🤍"}
                     </button>
                     {" "}{post.likes}
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
