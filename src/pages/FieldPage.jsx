import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { fieldPosts } from "../data/fieldPosts";
import { deleteFieldPost, getStoredFieldPosts } from "../utils/fieldPosts";

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

const getUserFieldPosts = () => getStoredFieldPosts().map(sanitizeUserFieldPost);

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
    const freshUserPosts = getUserFieldPosts().filter((post) => !deletedIds.has(post.id));
    return [...fieldPosts, ...freshUserPosts];
  }, [deletedIds]);

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
    <div className="field-page">
      <div className="middle-page-frame">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      </div>
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

        {visiblePosts.length === 0 ? (
          <p className="field-empty-state">
            No sessions found for the selected filters. Check back soon!
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
                {String(post.id).startsWith("user-") && currentUser && (
                  <button
                    type="button"
                    className="field-delete-post-btn"
                    aria-label="Delete this post"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    Remove post
                  </button>
                )}
                {post.hostId != null && String(post.hostId).trim() !== "" && (
                  <Link
                    to={`/buddy/${post.hostId}`}
                    className="field-view-host-link"
                  >
                    View host profile →
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <div className="middle-page-frame">
        <SiteFooter />
      </div>
    </div>
  );
};

export default FieldPage;
