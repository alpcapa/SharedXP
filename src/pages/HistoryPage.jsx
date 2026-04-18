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

const normalizeAttended = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackName, "Experience");
    const hostName = normalizeName(item.hostName ?? item.host, "Host");
    const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const photoSrc = String(item.photo ?? item.image ?? "").trim();
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
      photo: photoSrc || FALLBACK_EVENT_PHOTO,
      rating: clampRating(item.rating ?? 0),
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
      photo: photoSrc || FALLBACK_EVENT_PHOTO,
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
        rating: item.rating,
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
  const [dirtyIds, setDirtyIds] = useState(() => new Set());

  useEffect(() => {
    setAllItems(
      mergeAndSort(normalizeAttended(currentUser.history), normalizeHosted(currentUser.hostHistory))
    );
    setDirtyIds(new Set());
  }, [currentUser.history, currentUser.hostHistory]);

  const availableSports = useMemo(
    () => ["All", ...new Set(allItems.map((item) => item.sport).filter(Boolean))],
    [allItems]
  );

  const visibleItems = useMemo(
    () => allItems.filter((item) => selectedSport === "All" || item.sport === selectedSport),
    [allItems, selectedSport]
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

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page history-page">
          <h1>History</h1>
          <p className="history-subtitle">Your completed experiences, shown from latest to oldest.</p>

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
                              <span className="participant-gave-stars">
                                (gave you {item.attendeeRating} {item.attendeeRating === 1 ? "star" : "stars"} for this event)
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
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
