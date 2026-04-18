import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const STAR_CHARS = ["", "⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"];
const renderStars = (rating) => STAR_CHARS[Math.max(0, Math.min(5, Math.round(rating)))] || null;

const FALLBACK_EVENT_PHOTO =
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=420&h=240&q=80";

const FALLBACK_PARTICIPANT_PHOTO =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80";

const clampRating = (value) => {
  const numericRating = Number(value);
  if (!Number.isFinite(numericRating)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(numericRating)));
};

const toTimestamp = (dateValue) => {
  const timestamp = Date.parse(String(dateValue ?? ""));
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizeName = (value, fallbackValue) => {
  const text = String(value ?? "").trim();
  return text || fallbackValue;
};

const normalizePhotoGallery = (value, primaryPhoto) => {
  const fromList = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  const normalized = fromList
    .map((photo) => String(photo ?? "").trim())
    .filter(Boolean);
  if (primaryPhoto) {
    normalized.unshift(String(primaryPhoto).trim());
  }
  const unique = Array.from(new Set(normalized.filter(Boolean)));
  return unique.length ? unique : [FALLBACK_EVENT_PHOTO];
};

const normalizeAttended = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackName, "Experience");
    const hostName = normalizeName(item.hostName ?? item.host, "Host");
    const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const photoSrc = String(item.photo ?? item.image ?? "").trim();
    const photoGallery = normalizePhotoGallery(
      item.photoGallery ?? item.photos ?? item.images ?? item.gallery,
      photoSrc
    );
    const rawId = item.id !== undefined && item.id !== null ? String(item.id) : null;
    const id = rawId !== null ? `att:${rawId}` : `att-${index}-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return {
      role: "attended",
      source: rawItem,
      fallbackIndex: index,
      sortKey: toTimestamp(completedAt),
      id,
      eventName,
      hostName,
      sport: String(item.sport ?? "Other"),
      photo: photoGallery[0] || FALLBACK_EVENT_PHOTO,
      photoGallery,
      rating: clampRating(item.rating ?? 0),
      attendeeRating: clampRating(item.attendeeRating ?? item.participantRatingForHost ?? 0),
      review: String(item.review ?? item.comment ?? ""),
      completedAt: String(completedAt)
    };
  });
};

const normalizeHosted = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackName, "Experience");
    const participantName = normalizeName(
      item.participantName ?? item.userName ?? item.attendeeName,
      "Participant"
    );
    const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const photoSrc = String(item.photo ?? item.image ?? "").trim();
    const photoGallery = normalizePhotoGallery(
      item.photoGallery ?? item.photos ?? item.images ?? item.gallery,
      photoSrc
    );
    const participantPhotoSrc = String(
      item.participantPhoto ?? item.userPhoto ?? item.attendeePhoto ?? ""
    ).trim();
    const rawId = item.id !== undefined && item.id !== null ? String(item.id) : null;
    const id = rawId !== null ? `hosted:${rawId}` : `hosted-${index}-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return {
      role: "hosted",
      source: rawItem,
      fallbackIndex: index,
      sortKey: toTimestamp(completedAt),
      id,
      eventName,
      participantName,
      participantPhoto: participantPhotoSrc || FALLBACK_PARTICIPANT_PHOTO,
      attendeeRating: clampRating(item.attendeeRating ?? item.participantRatingForHost ?? 0),
      sport: String(item.sport ?? "Other"),
      photo: photoGallery[0] || FALLBACK_EVENT_PHOTO,
      photoGallery,
      rating: clampRating(item.rating ?? 0),
      review: String(item.review ?? item.comment ?? ""),
      completedAt: String(completedAt)
    };
  });
};

const mergeAndSort = (attended, hosted) => {
  const combined = [...attended, ...hosted];
  return combined.sort((a, b) => {
    if (a.sortKey !== null && b.sortKey !== null) {
      return b.sortKey - a.sortKey;
    }
    if (a.sortKey !== null) {
      return -1;
    }
    if (b.sortKey !== null) {
      return 1;
    }
    return b.fallbackIndex - a.fallbackIndex;
  });
};

const toStoredAttended = (items) =>
  items
    .filter((item) => item.role === "attended")
    .map((item) => {
      const base = item.source && typeof item.source === "object" ? { ...item.source } : {};
      return {
        ...base,
        id: item.source?.id ?? item.id,
        eventName: item.eventName,
        label: item.eventName,
        hostName: item.hostName,
        sport: item.sport,
        photo: item.photo,
        photoGallery: item.photoGallery,
        rating: item.rating,
        attendeeRating: item.attendeeRating,
        review: item.review,
        completedAt: item.completedAt
      };
    });

const toStoredHosted = (items) =>
  items
    .filter((item) => item.role === "hosted")
    .map((item) => {
      const base = item.source && typeof item.source === "object" ? { ...item.source } : {};
      return {
        ...base,
        id: item.source?.id ?? item.id,
        eventName: item.eventName,
        label: item.eventName,
        participantName: item.participantName,
        participantPhoto: item.participantPhoto,
        attendeeRating: item.attendeeRating,
        sport: item.sport,
        photo: item.photo,
        photoGallery: item.photoGallery,
        rating: item.rating,
        review: item.review,
        completedAt: item.completedAt
      };
    });

const HistoryPage = ({ currentUser, onLogout, onSaveHistory, onSaveHostHistory }) => {
  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to view your experience history.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const [allItems, setAllItems] = useState(() =>
    mergeAndSort(normalizeAttended(currentUser.history), normalizeHosted(currentUser.hostHistory))
  );
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedRole, setSelectedRole] = useState("all");
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [activeGallery, setActiveGallery] = useState(null);

  useEffect(() => {
    setAllItems(
      mergeAndSort(normalizeAttended(currentUser.history), normalizeHosted(currentUser.hostHistory))
    );
    setDirtyIds(new Set());
  }, [currentUser.history, currentUser.hostHistory]);

  useEffect(() => {
    if (!activeGallery) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveGallery(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeGallery]);

  const availableSports = useMemo(
    () => ["All", ...new Set(allItems.map((item) => item.sport).filter(Boolean))],
    [allItems]
  );

  const visibleItems = useMemo(
    () =>
      allItems.filter(
        (item) =>
          (selectedSport === "All" || item.sport === selectedSport) &&
          (selectedRole === "all" || item.role === selectedRole)
      ),
    [allItems, selectedSport, selectedRole]
  );

  const updateItem = useCallback((itemId, fieldName, fieldValue) => {
    setAllItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [fieldName]: fieldValue } : item))
    );
    setDirtyIds((prev) => new Set([...prev, itemId]));
  }, []);

  const saveItem = useCallback(
    (itemId) => {
      setAllItems((prev) => {
        onSaveHistory?.(toStoredAttended(prev));
        onSaveHostHistory?.(toStoredHosted(prev));
        return prev;
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    [onSaveHistory, onSaveHostHistory]
  );

  const openGallery = useCallback((item, startIndex = 0) => {
    const photos = Array.isArray(item.photoGallery) && item.photoGallery.length
      ? item.photoGallery
      : [item.photo || FALLBACK_EVENT_PHOTO];
    const safeStartIndex = Math.max(0, Math.min(photos.length - 1, startIndex));
    setActiveGallery({
      eventName: item.eventName,
      photos,
      currentIndex: safeStartIndex
    });
  }, []);

  const closeGallery = useCallback(() => {
    setActiveGallery(null);
  }, []);

  const shiftGallery = useCallback((step) => {
    setActiveGallery((previous) => {
      if (!previous || previous.photos.length <= 1) {
        return previous;
      }
      const total = previous.photos.length;
      return {
        ...previous,
        currentIndex: (previous.currentIndex + step + total) % total
      };
    });
  }, []);

  const activeGalleryPhoto = activeGallery?.photos?.[activeGallery.currentIndex] || FALLBACK_EVENT_PHOTO;
  const activeGalleryCount = activeGallery?.photos?.length ?? 0;

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page history-page">
          <h1>History</h1>
          <p className="history-subtitle">Your completed experiences, shown from latest to oldest.</p>
          <div className="host-sport-tabs history-role-tabs" role="tablist" aria-label="Filter history by role">
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === "all"}
              className={`host-sport-tab${selectedRole === "all" ? " active" : ""}`}
              onClick={() => setSelectedRole("all")}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === "hosted"}
              className={`host-sport-tab${selectedRole === "hosted" ? " active" : ""}`}
              onClick={() => setSelectedRole("hosted")}
            >
              Hosted
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === "attended"}
              className={`host-sport-tab${selectedRole === "attended" ? " active" : ""}`}
              onClick={() => setSelectedRole("attended")}
            >
              Attended
            </button>
          </div>

          {availableSports.length > 1 && (
            <div className="host-sport-tabs history-sport-tabs" role="tablist" aria-label="Filter history by sport">
              {availableSports.map((sportName) => (
                <button
                  key={sportName}
                  type="button"
                  role="tab"
                  aria-selected={selectedSport === sportName}
                  className={`host-sport-tab${selectedSport === sportName ? " active" : ""}`}
                  onClick={() => setSelectedSport(sportName)}
                >
                  {sportName}
                </button>
              ))}
            </div>
          )}

          {visibleItems.length ? (
            <div className="history-list">
              {visibleItems.map((item) => (
                <article key={item.id} className="history-card">
                  <div className="history-card-photo-wrap">
                    <img
                      className="history-card-photo"
                      src={item.photo}
                      alt={`Photo of ${item.eventName}`}
                      onError={(event) => {
                        if (event.currentTarget.src !== FALLBACK_EVENT_PHOTO) {
                          event.currentTarget.src = FALLBACK_EVENT_PHOTO;
                        }
                      }}
                    />
                    <span className={`history-role-stamp role-${item.role}`}>
                      {item.role === "attended" ? "Attended" : "Hosted"}
                    </span>
                    <button
                      type="button"
                      className="history-photo-gallery-link"
                      onClick={() => openGallery(item)}
                    >
                      Photo Gallery
                    </button>
                  </div>
                  <div className="history-card-body">
                    <div className="history-card-head">
                      <div>
                        <h2>{item.eventName}</h2>
                        {item.role === "attended" ? (
                          <p className="history-host-line">
                            Hosted by <strong>{item.hostName}</strong>
                            {item.rating > 0 && (
                              <span className="history-host-stars" aria-label={`Your rating: ${item.rating} stars`}>
                                {renderStars(item.rating)}
                              </span>
                            )}
                          </p>
                        ) : (
                          <div className="host-history-participant">
                            <img
                              className="participant-photo"
                              src={item.participantPhoto}
                              alt={item.participantName}
                              onError={(event) => {
                                if (event.currentTarget.src !== FALLBACK_PARTICIPANT_PHOTO) {
                                  event.currentTarget.src = FALLBACK_PARTICIPANT_PHOTO;
                                }
                              }}
                            />
                            <span className="participant-name">{item.participantName}</span>
                            {item.attendeeRating > 0 && (
                              <span
                                className="history-host-stars history-participant-stars"
                                aria-label={`Attendee rating: ${item.attendeeRating} stars`}
                              >
                                {renderStars(item.attendeeRating)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="sport-pill">{item.sport}</span>
                    </div>

                    <div className="history-edit-grid">
                      <label className="history-field">
                        {item.role === "attended" ? "Rate Host" : "Rate participant"}
                        <select
                          value={String(item.rating)}
                          aria-label={
                            item.role === "attended"
                              ? `Rate host for ${item.eventName}`
                              : `Rating for ${item.participantName}`
                          }
                          onChange={(event) =>
                            updateItem(item.id, "rating", clampRating(event.target.value))
                          }
                        >
                          <option value="0">Not rated</option>
                          <option value="1">1 ⭐</option>
                          <option value="2">2 ⭐⭐</option>
                          <option value="3">3 ⭐⭐⭐</option>
                          <option value="4">4 ⭐⭐⭐⭐</option>
                          <option value="5">5 ⭐⭐⭐⭐⭐</option>
                        </select>
                      </label>

                      <label className="history-field">
                        {item.role === "attended" ? "Review Host" : "Review participant"}
                        <textarea
                          value={item.review}
                          rows={3}
                          placeholder={
                            item.role === "attended"
                              ? "Write your review of the host"
                              : "Write your review of this participant"
                          }
                          aria-label={
                            item.role === "attended"
                              ? `Review host for ${item.eventName}`
                              : `Review for ${item.participantName}`
                          }
                          onChange={(event) => updateItem(item.id, "review", event.target.value)}
                        />
                      </label>

                      {dirtyIds.has(item.id) && (
                        <div className="history-save-row">
                          <button
                            type="button"
                            className="btn btn-primary history-save-btn"
                            onClick={() => saveItem(item.id)}
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>
              {allItems.length
                ? "No completed experiences for this sport yet."
                : "No completed experiences yet."}
            </p>
          )}

          {activeGallery && (
            <div className="booking-modal-backdrop history-gallery-backdrop" onClick={closeGallery}>
              <div
                className="booking-modal history-gallery-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${activeGallery.eventName} photo gallery`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="booking-modal-close"
                  aria-label="Close photo gallery"
                  onClick={closeGallery}
                >
                  ×
                </button>
                <h3>Photo Gallery</h3>
                <p className="booking-modal-meta">{activeGallery.eventName}</p>
                <div className="history-gallery-carousel">
                  <button
                    type="button"
                    className="history-gallery-nav"
                    onClick={() => shiftGallery(-1)}
                    aria-label="Previous photo"
                    disabled={activeGalleryCount <= 1}
                  >
                    ‹
                  </button>
                  <img
                    className="history-gallery-photo"
                    src={activeGalleryPhoto}
                    alt={`${activeGallery.eventName} gallery`}
                    onError={(event) => {
                      if (event.currentTarget.src !== FALLBACK_EVENT_PHOTO) {
                        event.currentTarget.src = FALLBACK_EVENT_PHOTO;
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="history-gallery-nav"
                    onClick={() => shiftGallery(1)}
                    aria-label="Next photo"
                    disabled={activeGalleryCount <= 1}
                  >
                    ›
                  </button>
                </div>
                <p className="history-gallery-counter">
                  {Math.min(activeGallery.currentIndex + 1, activeGalleryCount)} of {activeGalleryCount}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
