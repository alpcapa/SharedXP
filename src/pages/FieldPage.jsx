import { useMemo, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { fieldPosts } from "../data/fieldPosts";

const FIELD_POSTS_STORAGE_KEY = "sharedxp-field-posts";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getUserFieldPosts = () => {
  try {
    const raw = localStorage.getItem(FIELD_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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
  const [selectedCity, setSelectedCity] = useState("All");
  const [userPosts, setUserPosts] = useState(() => getUserFieldPosts());
  const [carouselIndex, setCarouselIndex] = useState({});

  const getCarouselIndex = (postId) => carouselIndex[postId] ?? 0;

  const shiftCarousel = (postId, photos, step) => {
    setCarouselIndex((prev) => {
      const current = prev[postId] ?? 0;
      const next = (current + step + photos.length) % photos.length;
      return { ...prev, [postId]: next };
    });
  };

  const cityOptions = useMemo(() => {
    const allPosts = [...fieldPosts, ...userPosts];
    const sortedCities = [...new Set(allPosts.map((post) => post.city).filter(Boolean))].sort();
    return ["All", ...sortedCities];
  }, [userPosts]);

  const visiblePosts = useMemo(
    () =>
      [...fieldPosts, ...userPosts]
        .filter((post) => selectedCity === "All" || post.city === selectedCity)
        .sort(
          (leftPost, rightPost) =>
            new Date(rightPost.postedAt).getTime() - new Date(leftPost.postedAt).getTime()
        ),
    [selectedCity, userPosts]
  );

  return (
    <div className="field-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <section className="field-hero">
        <h1>The Field</h1>
        <p>See what’s happening on the ground. Real sessions. Real people.</p>
      </section>
      <main className="field-main">
        <div className="field-city-filter">
          {cityOptions.map((cityOption) => (
            <button
              key={cityOption}
              type="button"
              className={`field-city-pill${cityOption === selectedCity ? " active" : ""}`}
              onClick={() => setSelectedCity(cityOption)}
            >
              {cityOption}
            </button>
          ))}
        </div>

        {visiblePosts.length === 0 ? (
          <p className="field-empty-state">
            No sessions posted in {selectedCity} yet. Check back soon!
          </p>
        ) : (
          <div className="field-feed">
            {visiblePosts.map((post) => (
              <article key={post.id} className="field-card">
                <div className="field-host-row">
                  <img src={post.hostPhoto} alt={post.hostName} className="field-host-avatar" />
                  <div>
                    <p>
                      <span className="field-host-name">{post.hostName}</span>
                      <span className="field-host-city"> · {post.city}</span>
                    </p>
                    <span className="sport-pill">{post.sport}</span>
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
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default FieldPage;
