import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { fieldPosts } from "../data/fieldPosts";

const FIELD_POSTS_STORAGE_KEY = "sharedxp-field-posts";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isSafeHttpImageUrl = (value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return false;
  }
  try {
    const parsed = new URL(text);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const isSafeDataImageUrl = (value) => {
  const text = String(value ?? "").trim();
  return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(text);
};

const toSafeUserImageUrl = (value) => {
  const text = String(value ?? "").trim();
  if (isSafeDataImageUrl(text) || isSafeHttpImageUrl(text)) {
    return text;
  }
  return "";
};

const sanitizeUserFieldPost = (post) => {
  const source = post && typeof post === "object" ? post : {};
  const rawPhotoList = Array.isArray(source.photos)
    ? source.photos
    : source.photo
      ? [source.photo]
      : [];
  const photos = rawPhotoList.map(toSafeUserImageUrl).filter(Boolean);
  return {
    id: String(source.id ?? `user-post-${Math.random().toString(36).slice(2)}`),
    hostName: String(source.hostName ?? "SharedXP User"),
    hostPhoto: toSafeUserImageUrl(source.hostPhoto),
    sport: String(source.sport ?? "Other"),
    city: String(source.city ?? ""),
    country: String(source.country ?? ""),
    caption: String(source.caption ?? ""),
    photos,
    photo: photos[0] ?? "",
    postedAt: String(source.postedAt ?? ""),
    likes: Number.isFinite(Number(source.likes)) ? Number(source.likes) : 0
  };
};

const getUserFieldPosts = () => {
  try {
    const raw = localStorage.getItem(FIELD_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(sanitizeUserFieldPost) : [];
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
  const location = useLocation();
  const [selectedCity, setSelectedCity] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState({});
  const userPosts = useMemo(() => getUserFieldPosts(), [location.key]);

  const getCarouselIndex = (postId) => carouselIndex[postId] ?? 0;

  const shiftCarousel = (postId, photos, step) => {
    setCarouselIndex((prev) => {
      const current = prev[postId] ?? 0;
      const next = (current + step + photos.length) % photos.length;
      return { ...prev, [postId]: next };
    });
  };

  const cityOptions = useMemo(() => {
    const freshUserPosts = getUserFieldPosts();
    const allPosts = [...fieldPosts, ...freshUserPosts];
    const sortedCities = [...new Set(allPosts.map((post) => post.city).filter(Boolean))].sort();
    return ["All", ...sortedCities];
  }, [selectedCity]);

  const visiblePosts = useMemo(
    () => {
      const freshUserPosts = getUserFieldPosts();
      return [...fieldPosts, ...freshUserPosts]
        .filter((post) => selectedCity === "All" || post.city === selectedCity)
        .sort(
          (leftPost, rightPost) =>
            new Date(rightPost.postedAt).getTime() - new Date(leftPost.postedAt).getTime()
        );
    },
    [selectedCity]
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
