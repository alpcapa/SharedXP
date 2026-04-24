import { useCallback, useEffect, useMemo, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getRelativePostedLabel = (postedAt) => {
  const postDate = new Date(postedAt);
  if (Number.isNaN(postDate.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  postDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((today.getTime() - postDate.getTime()) / MS_PER_DAY);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
};

const mapPost = (post) => {
  const sortedImages = (post.field_post_images || []).sort((a, b) => a.position - b.position);
  return {
    id: post.id,
    userId: post.user_id,
    hostName: post.host_name || "SharedXP User",
    hostPhoto: post.host_photo || "",
    sport: post.sport,
    city: post.city,
    country: post.country,
    caption: post.caption,
    photos: sortedImages.map((img) => img.image_url),
    photo: sortedImages[0]?.image_url || "",
    postedAt: post.created_at,
    likes: post.likes,
  };
};

const FieldPage = ({ currentUser, onLogout }) => {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState({});

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("field_posts")
      .select("*, field_post_images(id, image_url, position)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPosts(data.map(mapPost));
    }
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const getCarouselIndex = (postId) => carouselIndex[postId] ?? 0;

  const shiftCarousel = (postId, photos, step) => {
    setCarouselIndex((prev) => {
      const current = prev[postId] ?? 0;
      const next = (current + step + photos.length) % photos.length;
      return { ...prev, [postId]: next };
    });
  };

  const handleDeletePost = useCallback(
    async (postId) => {
      if (!window.confirm("Remove this post from The Field?")) return;
      await supabase.from("field_posts").delete().eq("id", postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    []
  );

  const cityOptions = useMemo(() => {
    const cities = [...new Set(posts.map((p) => p.city).filter(Boolean))].sort();
    return ["All", ...cities];
  }, [posts]);

  const sportOptions = useMemo(() => {
    const sports = [...new Set(posts.map((p) => p.sport).filter(Boolean))].sort();
    return ["All", ...sports];
  }, [posts]);

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          (selectedCity === "All" || post.city === selectedCity) &&
          (selectedSport === "All" || post.sport === selectedSport)
      ),
    [posts, selectedCity, selectedSport]
  );

  return (
    <div className="field-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <section className="field-hero">
        <h1>The Field</h1>
        <p>See what's happening on the ground. Real sessions. Real people.</p>
      </section>
      <main className="field-main">
        {postsLoading ? (
          <p className="field-empty-state">Loading posts…</p>
        ) : (
          <>
            <div className="field-city-filter">
              {cityOptions.map((cityOption) => (
                <button
                  key={cityOption}
                  type="button"
                  className={`field-city-pill${cityOption === selectedCity ? " active" : ""}`}
                  onClick={() => {
                    setSelectedCity(cityOption);
                    setSelectedSport("All");
                  }}
                >
                  {cityOption}
                </button>
              ))}
            </div>

            {sportOptions.length > 2 && (
              <div className="field-sport-filter">
                {sportOptions.map((sportOption) => (
                  <button
                    key={sportOption}
                    type="button"
                    className={`field-city-pill${sportOption === selectedSport ? " active" : ""}`}
                    onClick={() => setSelectedSport(sportOption)}
                  >
                    {sportOption}
                  </button>
                ))}
              </div>
            )}

            {visiblePosts.length === 0 ? (
              <p className="field-empty-state">
                {posts.length === 0
                  ? "No sessions posted yet. Check back soon!"
                  : `No sessions posted in ${selectedCity} yet. Check back soon!`}
              </p>
            ) : (
              <div className="field-feed">
                {visiblePosts.map((post) => {
                  const photos =
                    post.photos.length > 0
                      ? post.photos
                      : post.photo
                        ? [post.photo]
                        : [];
                  const idx = getCarouselIndex(post.id);
                  return (
                    <article key={post.id} className="field-card">
                      <div className="field-host-row">
                        {post.hostPhoto ? (
                          <img
                            src={post.hostPhoto}
                            alt={post.hostName}
                            className="field-host-avatar"
                          />
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
                            <span className="field-host-city"> · {post.city}</span>
                          </p>
                          <span className="sport-pill">{post.sport}</span>
                        </div>
                      </div>
                      {photos.length > 0 && (
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
                            <p className="field-carousel-counter">
                              {idx + 1} / {photos.length}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="field-caption">{post.caption}</p>
                      <p className="field-meta">
                        🤍 {post.likes} · {getRelativePostedLabel(post.postedAt)}
                      </p>
                      {currentUser && post.userId === currentUser.id && (
                        <button
                          type="button"
                          className="field-delete-post-btn"
                          aria-label="Delete this post"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Remove post
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default FieldPage;
