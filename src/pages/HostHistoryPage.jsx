import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

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

const createHostHistoryId = (item, index, eventName, participantName) => {
  if (item && typeof item === "object" && item.id !== undefined && item.id !== null) {
    return String(item.id);
  }

  const slug = `${eventName}-${participantName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `hh-${index}-${slug || "item"}`;
};

const normalizeHostHistory = (historyItems) => {
  const normalizedItems = Array.isArray(historyItems) ? historyItems : [];
  return normalizedItems
    .map((rawItem, index) => {
      const item = rawItem && typeof rawItem === "object" ? rawItem : {};
      const fallbackEventName = typeof rawItem === "string" ? rawItem : "";
      const eventName = normalizeName(
        item.eventName ?? item.label ?? item.title ?? fallbackEventName,
        "Experience"
      );
      const participantName = normalizeName(
        item.participantName ?? item.userName ?? item.attendeeName,
        "Participant"
      );
      const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
      const eventPhotoSrc = String(item.photo ?? item.image ?? "").trim();
      const participantPhotoSrc = String(item.participantPhoto ?? item.userPhoto ?? item.attendeePhoto ?? "").trim();
      return {
        source: rawItem,
        fallbackIndex: index,
        sortKey: toTimestamp(completedAt),
        id: createHostHistoryId(item, index, eventName, participantName),
        eventName,
        participantName,
        participantPhoto: participantPhotoSrc || FALLBACK_PARTICIPANT_PHOTO,
        sport: String(item.sport ?? "Other"),
        photo: eventPhotoSrc || FALLBACK_EVENT_PHOTO,
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

const toStoredHostHistory = (historyItems) =>
  historyItems.map((item) => {
    const baseItem = item.source && typeof item.source === "object" ? { ...item.source } : {};
    return {
      ...baseItem,
      id: item.id,
      eventName: item.eventName,
      label: item.eventName,
      participantName: item.participantName,
      participantPhoto: item.participantPhoto,
      sport: item.sport,
      photo: item.photo,
      rating: item.rating,
      review: item.review,
      completedAt: item.completedAt
    };
  });

const HostHistoryPage = ({ currentUser, onLogout, onSaveHostHistory }) => {
  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to view your host history.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  if (!currentUser.isHost) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <h1>Host History</h1>
            <p>You are not registered as a host. <Link to="/become-a-host">Become a host</Link> to start hosting experiences.</p>
          </main>
        </div>
      </div>
    );
  }

  const [historyItems, setHistoryItems] = useState(() =>
    normalizeHostHistory(currentUser.hostHistory)
  );
  const [selectedSport, setSelectedSport] = useState("All");

  useEffect(() => {
    setHistoryItems(normalizeHostHistory(currentUser.hostHistory));
  }, [currentUser.hostHistory]);

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
        item.id === itemId ? { ...item, [fieldName]: fieldValue } : item
      );
      onSaveHostHistory?.(toStoredHostHistory(nextItems));
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
          <div className="history-page-nav">
            <Link to="/history" className="history-switch-link">
              ← Attendee History
            </Link>
          </div>

          <h1>Host History</h1>
          <p className="history-subtitle">
            Experiences you have hosted, shown from latest to oldest. Rate and review your participants.
          </p>

          {availableSports.length > 1 && (
            <div
              className="host-sport-tabs history-sport-tabs"
              role="tablist"
              aria-label="Filter host history by sport"
            >
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
                    alt={`Photo of ${item.eventName}`}
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
                        </div>
                      </div>
                      <span className="sport-pill">{item.sport}</span>
                    </div>

                    <div className="history-edit-grid">
                      <label className="history-field">
                        Rate participant
                        <select
                          value={String(item.rating)}
                          aria-label={`Rating for ${item.participantName}`}
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
                        Review participant
                        <textarea
                          value={item.review}
                          rows={3}
                          placeholder="Write your review of this participant"
                          aria-label={`Review for ${item.participantName}`}
                          onChange={(event) =>
                            updateHistoryItem(item.id, "review", event.target.value)
                          }
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
                ? "No hosted experiences for this sport yet."
                : "No hosted experiences yet."}
            </p>
          )}
        </main>
      </div>
    </div>
  );
};

export default HostHistoryPage;
