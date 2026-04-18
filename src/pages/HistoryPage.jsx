import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const FALLBACK_EVENT_PHOTO =
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=420&h=240&q=80";

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

const createHistoryId = (item, index, eventName, hostName) => {
  if (item && typeof item === "object" && item.id !== undefined && item.id !== null) {
    return String(item.id);
  }

  const slug = `${eventName}-${hostName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `history-${index}-${slug || "item"}`;
};

const normalizeHistory = (historyItems) => {
  const normalizedItems = Array.isArray(historyItems) ? historyItems : [];
  return normalizedItems
    .map((rawItem, index) => {
      const item = rawItem && typeof rawItem === "object" ? rawItem : {};
      const fallbackEventName = typeof rawItem === "string" ? rawItem : "";
      const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackEventName, "Experience");
      const hostName = normalizeName(item.hostName ?? item.host, "Host");
      const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
      const photoSource = String(item.photo ?? item.image ?? "").trim();
      return {
        source: rawItem,
        fallbackIndex: index,
        sortKey: toTimestamp(completedAt),
        id: createHistoryId(item, index, eventName, hostName),
        eventName,
        hostName,
        sport: String(item.sport ?? "Other"),
        photo: photoSource || FALLBACK_EVENT_PHOTO,
        rating: clampRating(item.rating ?? 0),
        review: String(item.review ?? item.comment ?? ""),
        completedAt: String(completedAt)
      };
    })
    .sort((firstItem, secondItem) => {
      if (firstItem.sortKey !== null && secondItem.sortKey !== null) {
        return secondItem.sortKey - firstItem.sortKey;
      }
      if (firstItem.sortKey !== null) {
        return -1;
      }
      if (secondItem.sortKey !== null) {
        return 1;
      }
      return secondItem.fallbackIndex - firstItem.fallbackIndex;
    });
};

const toStoredHistory = (historyItems) =>
  historyItems.map((item) => {
    const baseItem = item.source && typeof item.source === "object" ? { ...item.source } : {};
    return {
      ...baseItem,
      id: item.id,
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

const HistoryPage = ({ currentUser, onLogout, onSaveHistory }) => {
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

  const [historyItems, setHistoryItems] = useState(() => normalizeHistory(currentUser.history));
  const [selectedSport, setSelectedSport] = useState("All");

  useEffect(() => {
    setHistoryItems(normalizeHistory(currentUser.history));
  }, [currentUser.history]);

  const availableSports = useMemo(
    () => ["All", ...new Set(historyItems.map((item) => item.sport).filter(Boolean))],
    [historyItems]
  );

  const visibleHistoryItems = useMemo(
    () =>
      historyItems.filter((item) => (selectedSport === "All" ? true : item.sport === selectedSport)),
    [historyItems, selectedSport]
  );

  const updateHistoryItem = (itemId, fieldName, fieldValue) => {
    setHistoryItems((previousItems) => {
      const nextItems = previousItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [fieldName]: fieldValue
            }
          : item
      );
      onSaveHistory?.(toStoredHistory(nextItems));
      return nextItems;
    });
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page history-page">
          <h1>History</h1>
          <p className="history-subtitle">Your completed experiences are shown from latest to oldest.</p>

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

          {visibleHistoryItems.length ? (
            <div className="history-list">
              {visibleHistoryItems.map((item) => (
                <article key={item.id} className="history-card">
                  <img
                    className="history-card-photo"
                    src={item.photo}
                    alt={`Photo of ${item.eventName} hosted by ${item.hostName}`}
                    onError={(event) => {
                      if (event.currentTarget.src !== FALLBACK_EVENT_PHOTO) {
                        event.currentTarget.src = FALLBACK_EVENT_PHOTO;
                      }
                    }}
                  />
                  <div className="history-card-body">
                    <div className="history-card-head">
                      <div>
                        <h2>{item.eventName}</h2>
                        <p>
                          Hosted by <strong>{item.hostName}</strong>
                        </p>
                      </div>
                      <span className="sport-pill">{item.sport}</span>
                    </div>

                    <div className="history-edit-grid">
                      <label className="history-field">
                        Rating
                        <select
                          value={String(item.rating)}
                          onChange={(event) =>
                            updateHistoryItem(item.id, "rating", clampRating(event.target.value))
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
                        Review
                        <textarea
                          value={item.review}
                          rows={3}
                          placeholder="Write your review"
                          aria-label={`Review for ${item.eventName}`}
                          onChange={(event) => updateHistoryItem(item.id, "review", event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>
              {historyItems.length
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
