import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const formatStarRating = (rating) => `${Math.max(0, Math.min(5, Math.round(rating)))}⭐`;

const FALLBACK_EVENT_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

const FALLBACK_PARTICIPANT_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%2393c5fd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='24' font-weight='700' fill='%231e3a8a'%3ESP%3C/text%3E%3C/svg%3E";

const DEFAULT_FALLBACK_LAST_NAME = "User";
const DEFAULT_HOST_FALLBACK_FIRST_NAME = "Host";
const DEFAULT_PARTICIPANT_FALLBACK_FIRST_NAME = "Participant";
const DEFAULT_FIELD_POST_USER_NAME = "SharedXP User";
const CONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1000;
const FIELD_POSTS_STORAGE_KEY = "sharedxp-field-posts";
const MAX_PHOTOS_PER_SESSION = 5;
const HOST_RATING_FIELDS = [
  { key: "overall", label: "Overall" },
  { key: "punctuality", label: "Punctuality" },
  { key: "equipmentQuality", label: "Equipment Quality" },
  { key: "localKnowledge", label: "Local Knowledge" },
  { key: "friendliness", label: "Friendliness" },
  { key: "value", label: "Value" }
];

const getStoredFieldPosts = () => {
  try {
    const raw = localStorage.getItem(FIELD_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveFieldPost = (post) => {
  try {
    const existing = getStoredFieldPosts();
    const updated = [post, ...existing];
    localStorage.setItem(FIELD_POSTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail — localStorage may be unavailable
  }
};

const clampRating = (value) => {
  const numericRating = Number(value);
  if (!Number.isFinite(numericRating)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(numericRating)));
};

const normalizeHostRatings = (item) => {
  const source = item?.hostRatings && typeof item.hostRatings === "object" ? item.hostRatings : {};
  return {
    overall: clampRating(source.overall ?? item?.rating ?? 0),
    punctuality: clampRating(source.punctuality ?? item?.punctualityRating ?? 0),
    equipmentQuality: clampRating(source.equipmentQuality ?? item?.equipmentQualityRating ?? 0),
    localKnowledge: clampRating(source.localKnowledge ?? item?.localKnowledgeRating ?? 0),
    friendliness: clampRating(source.friendliness ?? item?.friendlinessRating ?? 0),
    value: clampRating(source.value ?? item?.valueRating ?? 0)
  };
};

const toTimestamp = (dateValue) => {
  const timestamp = Date.parse(String(dateValue ?? ""));
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizeName = (value, fallbackValue) => {
  const text = String(value ?? "").trim();
  return text || fallbackValue;
};

const formatEventDate = (dateValue) => {
  const timestamp = toTimestamp(dateValue);
  if (timestamp === null) {
    return "Date unavailable";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(timestamp));
};

const normalizeFullName = (value, fallbackFirstName, fallbackLastName = DEFAULT_FALLBACK_LAST_NAME) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return `${fallbackFirstName} ${fallbackLastName}`;
  }
  if (/\s/.test(text)) {
    return text;
  }
  return `${text} ${fallbackLastName}`;
};

const normalizeConfirmationState = (item, completedAtValue, completedAtTimestamp) => {
  const rawStatus = String(item.confirmationStatus ?? item.status ?? "").toLowerCase();
  const explicitlyCompleted =
    rawStatus === "completed" ||
    rawStatus === "confirmed" ||
    item.confirmed === true ||
    item.paymentReleased === true ||
    String(item.confirmedAt ?? "").trim().length > 0;
  const autoConfirmed =
    !explicitlyCompleted &&
    completedAtTimestamp !== null &&
    Date.now() - completedAtTimestamp >= CONFIRMATION_WINDOW_MS;
  const confirmationStatus = explicitlyCompleted || autoConfirmed ? "completed" : "pending";
  const paymentReleased = confirmationStatus === "completed";
  const autoConfirmedAt =
    completedAtTimestamp !== null
      ? new Date(completedAtTimestamp + CONFIRMATION_WINDOW_MS).toISOString()
      : "";
  const confirmedAt =
    confirmationStatus === "completed"
      ? String(item.confirmedAt ?? "").trim() || (autoConfirmed ? autoConfirmedAt : String(completedAtValue ?? "").trim())
      : "";
  return {
    confirmationStatus,
    paymentReleased,
    confirmedAt,
    autoConfirmed
  };
};

const normalizePhotoGallery = (value, primaryPhoto) => {
  const fromList = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  const uniquePhotos = new Set();
  const primaryPhotoValue = String(primaryPhoto ?? "").trim();
  if (primaryPhotoValue) {
    uniquePhotos.add(primaryPhotoValue);
  }
  fromList
    .map((photo) => String(photo ?? "").trim())
    .filter(Boolean)
    .forEach((photo) => uniquePhotos.add(photo));
  const unique = Array.from(uniquePhotos);
  return unique.length ? unique : [FALLBACK_EVENT_PHOTO];
};

const normalizeAttended = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const hostRatings = normalizeHostRatings(item);
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackName, "Experience");
    const hostName = normalizeFullName(
      item.hostName ?? item.host,
      DEFAULT_HOST_FALLBACK_FIRST_NAME
    );
    const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const completedAtTimestamp = toTimestamp(completedAt);
    const confirmation = normalizeConfirmationState(item, completedAt, completedAtTimestamp);
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
      rating: hostRatings.overall,
      hostRatings,
      attendeeRating: clampRating(item.attendeeRating ?? item.participantRatingForHost ?? 0),
      review: String(item.review ?? item.comment ?? ""),
      sharedToField: item.sharedToField === true,
      completedAt: String(completedAt),
      completedAtTimestamp,
      eventDateLabel: formatEventDate(completedAt),
      ...confirmation
    };
  });
};

const normalizeHosted = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(item.eventName ?? item.label ?? item.title ?? fallbackName, "Experience");
    const participantName = normalizeFullName(
      item.participantName ?? item.userName ?? item.attendeeName,
      DEFAULT_PARTICIPANT_FALLBACK_FIRST_NAME
    );
    const completedAt = item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const completedAtTimestamp = toTimestamp(completedAt);
    const confirmation = normalizeConfirmationState(item, completedAt, completedAtTimestamp);
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
      sharedToField: item.sharedToField === true,
      completedAt: String(completedAt),
      completedAtTimestamp,
      eventDateLabel: formatEventDate(completedAt),
      ...confirmation
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
        rating: item.hostRatings?.overall ?? item.rating,
        hostRatings: item.hostRatings,
        attendeeRating: item.attendeeRating,
        review: item.review,
        completedAt: item.completedAt,
        confirmationStatus: item.confirmationStatus,
        confirmedAt: item.confirmedAt,
        paymentReleased: item.paymentReleased,
        sharedToField: item.sharedToField ?? false
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
        sharedToField: item.sharedToField === true,
        completedAt: item.completedAt,
        confirmationStatus: item.confirmationStatus,
        confirmedAt: item.confirmedAt,
        paymentReleased: item.paymentReleased
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
  const [sharePromptItemId, setSharePromptItemId] = useState(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareCaptionError, setShareCaptionError] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const lastAutoConfirmPersistKeyRef = useRef("");

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

  useEffect(() => {
    const autoConfirmedIds = allItems
      .filter((item) => item.autoConfirmed)
      .map((item) => item.id);
    if (!autoConfirmedIds.length) {
      lastAutoConfirmPersistKeyRef.current = "";
      return;
    }
    const persistKey = [...autoConfirmedIds].sort().join("|");
    if (lastAutoConfirmPersistKeyRef.current === persistKey) {
      return;
    }
    lastAutoConfirmPersistKeyRef.current = persistKey;
    const hasAttendedAutoConfirm = allItems.some(
      (item) => item.autoConfirmed && item.role === "attended"
    );
    const hasHostedAutoConfirm = allItems.some((item) => item.autoConfirmed && item.role === "hosted");
    if (hasAttendedAutoConfirm) {
      onSaveHistory?.(toStoredAttended(allItems));
    }
    if (hasHostedAutoConfirm) {
      onSaveHostHistory?.(toStoredHosted(allItems));
    }
    const autoConfirmedIdSet = new Set(autoConfirmedIds);
    setAllItems((prev) =>
      prev.map((item) =>
        autoConfirmedIdSet.has(item.id) ? { ...item, autoConfirmed: false } : item
      )
    );
  }, [allItems, onSaveHistory, onSaveHostHistory]);

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

  const updateHostRating = useCallback((itemId, ratingField, fieldValue) => {
    const nextRating = clampRating(fieldValue);
    setAllItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const hostRatings = {
          ...normalizeHostRatings(item),
          [ratingField]: nextRating
        };
        return {
          ...item,
          hostRatings,
          rating: hostRatings.overall
        };
      })
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

      // After saving, check if this item has real photos — if so, prompt to share
      const savedItem = allItems.find((item) => item.id === itemId);
      const hasRealPhotos = savedItem?.photoGallery?.some(
        (p) => p && p !== FALLBACK_EVENT_PHOTO
      );
      if (hasRealPhotos && !savedItem?.sharedToField) {
        setShareCaption("");
        setShareCaptionError(false);
        setSharePromptItemId(itemId);
      }
    },
    [onSaveHistory, onSaveHostHistory, allItems]
  );

  const handlePhotoUpload = useCallback((itemId, files) => {
    if (!files || files.length === 0) return;

    const currentItem = allItems.find((item) => item.id === itemId);
    const currentRealPhotos = (currentItem?.photoGallery ?? []).filter(
      (p) => p && p !== FALLBACK_EVENT_PHOTO
    );
    const remainingSlots = MAX_PHOTOS_PER_SESSION - currentRealPhotos.length;

    if (remainingSlots <= 0) {
      alert(`You can add a maximum of ${MAX_PHOTOS_PER_SESSION} photos per session.`);
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlots);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = String(event.target?.result ?? "");
        if (!dataUrl) return;
        setAllItems((prev) =>
          prev.map((item) => {
            if (item.id !== itemId) return item;
            const currentGallery = Array.isArray(item.photoGallery)
              ? item.photoGallery.filter((p) => p !== FALLBACK_EVENT_PHOTO)
              : [];
            const updatedGallery = [...currentGallery, dataUrl];
            return {
              ...item,
              photo: updatedGallery[0],
              photoGallery: updatedGallery
            };
          })
        );
        setDirtyIds((prev) => new Set([...prev, itemId]));
      };
      reader.readAsDataURL(file);
    });
  }, [allItems]);

  const handlePhotoDelete = useCallback((itemId, photoIndex) => {
    setAllItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentGallery = Array.isArray(item.photoGallery)
          ? item.photoGallery.filter((p) => p !== FALLBACK_EVENT_PHOTO)
          : [];
        const updatedGallery = currentGallery.filter((_, index) => index !== photoIndex);
        return {
          ...item,
          photo: updatedGallery[0] || FALLBACK_EVENT_PHOTO,
          photoGallery: updatedGallery.length ? updatedGallery : [FALLBACK_EVENT_PHOTO]
        };
      })
    );
    setDirtyIds((prev) => new Set([...prev, itemId]));
  }, []);

  const handleShareToField = useCallback((item) => {
    if (!shareCaption.trim()) {
      setShareCaptionError(true);
      return;
    }

    const realPhotos = (item.photoGallery ?? []).filter(
      (p) => p && p !== FALLBACK_EVENT_PHOTO
    );

    const post = {
      id: typeof globalThis.crypto?.randomUUID === "function"
        ? `user-${globalThis.crypto.randomUUID()}`
        : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hostId: null,
      hostName: currentUser?.fullName ?? DEFAULT_FIELD_POST_USER_NAME,
      hostPhoto: currentUser?.photo ?? "",
      sport: item.sport,
      city: currentUser?.city ?? currentUser?.hostProfile?.city ?? "",
      country: currentUser?.country ?? currentUser?.hostProfile?.country ?? "",
      caption: shareCaption.trim(),
      photos: realPhotos,
      photo: realPhotos[0] ?? "",
      postedAt: new Date().toISOString(),
      likes: 0
    };

    saveFieldPost(post);
    updateItem(item.id, "sharedToField", true);
    setAllItems((prev) => {
      const next = prev.map((historyItem) =>
        historyItem.id === item.id ? { ...historyItem, sharedToField: true } : historyItem
      );
      onSaveHistory?.(toStoredAttended(next));
      onSaveHostHistory?.(toStoredHosted(next));
      return next;
    });
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setShareCaption("");
    setShareCaptionError(false);
    setSharePromptItemId(null);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  }, [shareCaption, currentUser, onSaveHistory, onSaveHostHistory]);

  const openGallery = useCallback((item, startIndex = 0) => {
    const photos = item.photoGallery?.length ? item.photoGallery : [item.photo || FALLBACK_EVENT_PHOTO];
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

  const confirmCompletion = useCallback(
    (itemId) => {
      const nowIso = new Date().toISOString();
      setAllItems((prev) => {
        const next = prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                confirmationStatus: "completed",
                confirmedAt: nowIso,
                paymentReleased: true,
                autoConfirmed: false
              }
            : item
        );
        onSaveHistory?.(toStoredAttended(next));
        onSaveHostHistory?.(toStoredHosted(next));
        return next;
      });
    },
    [onSaveHistory, onSaveHostHistory]
  );

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
              {visibleItems.map((item) => {
                const isAttendee = item.role === "attended";
                return (
                  <article
                    key={item.id}
                    className={`history-card${isAttendee ? " history-card-attendee" : ""}`}
                  >
                    {isAttendee && (
                      <div className="history-attendee-summary">
                        <div className="history-event-title-row">
                          <h2>{item.eventName}</h2>
                          <span className="history-event-date">{item.eventDateLabel}</span>
                        </div>
                        <p className="history-host-line">
                          Hosted by <strong>{item.hostName}</strong>
                        </p>
                      </div>
                    )}
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
                    {/* Photo upload button */}
                    <label className="history-photo-upload-label" aria-label="Add photos">
                      + Add Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="history-photo-upload-input"
                        onChange={(event) => handlePhotoUpload(item.id, event.target.files)}
                      />
                    </label>

                    {/* Thumbnail strip — only shown when real photos exist */}
                    {(item.photoGallery ?? []).filter((p) => p !== FALLBACK_EVENT_PHOTO).length > 0 && (
                      <div className="history-thumb-strip">
                        {item.photoGallery
                          .filter((p) => p !== FALLBACK_EVENT_PHOTO)
                          .map((photo, photoIndex) => (
                            <div key={photoIndex} className="history-thumb-wrap">
                              <img
                                src={photo}
                                alt={`Photo ${photoIndex + 1}`}
                                className="history-thumb"
                                onClick={() => openGallery(item, photoIndex)}
                              />
                              <button
                                type="button"
                                className="history-thumb-delete"
                                aria-label={`Delete photo ${photoIndex + 1}`}
                                onClick={() => handlePhotoDelete(item.id, photoIndex)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                    {item.confirmationStatus === "pending" ? (
                      <button
                        type="button"
                        className={`history-confirmation-btn${isAttendee ? "" : " is-readonly"}`}
                        onClick={isAttendee ? () => confirmCompletion(item.id) : undefined}
                        disabled={!isAttendee}
                      >
                        {isAttendee ? "Confirm Completion" : "Confirmation Pending"}
                      </button>
                    ) : (
                      <span className="history-completed-status">Completed</span>
                    )}
                    <span className={`history-payment-status ${item.paymentReleased ? "released" : "pending"}`}>
                      {item.paymentReleased ? "Payment released to host" : "Payment release pending"}
                    </span>
                    </div>
                    <div className="history-card-body">
                      {!isAttendee && (
                        <div className="history-card-head">
                          <div>
                            <div className="history-event-title-row">
                              <h2>{item.eventName}</h2>
                              <span className="history-event-date">{item.eventDateLabel}</span>
                            </div>
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
                                  className="history-stars history-participant-stars participant-gave-stars"
                                  aria-label={`Attendee rating: ${item.attendeeRating} stars`}
                                >
                                  (gave you {formatStarRating(item.attendeeRating)})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="sport-pill">{item.sport}</span>
                        </div>
                      )}

                      <div className="history-edit-grid">
                        {isAttendee ? (
                          <div className="history-host-rating-section">
                            <div className="history-host-rating-head">
                              <span className="history-host-rating-title-wrap">
                                <span className="history-host-rating-title">Rate Host</span>
                                <span className="sport-pill">{item.sport}</span>
                              </span>
                              {item.rating > 0 && (
                                <span className="history-stars" aria-label={`Your rating: ${item.rating} stars`}>
                                  {formatStarRating(item.rating)}
                                </span>
                              )}
                            </div>
                            <div className="history-host-rating-grid">
                              {HOST_RATING_FIELDS.map((ratingField) => (
                                <label className="history-field" key={ratingField.key}>
                                  {ratingField.label}
                                  <select
                                    value={String(item.hostRatings?.[ratingField.key] ?? 0)}
                                    aria-label={`${ratingField.label} rating for host of ${item.eventName}`}
                                    onChange={(event) =>
                                      updateHostRating(item.id, ratingField.key, event.target.value)
                                    }
                                  >
                                    <option value="0">Not rated</option>
                                    <option value="1">1⭐</option>
                                    <option value="2">2⭐</option>
                                    <option value="3">3⭐</option>
                                    <option value="4">4⭐</option>
                                    <option value="5">5⭐</option>
                                  </select>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <label className="history-field">
                            Rate participant
                            <select
                              value={String(item.rating)}
                              aria-label={`Rating for ${item.participantName}`}
                              onChange={(event) =>
                                updateItem(item.id, "rating", clampRating(event.target.value))
                              }
                            >
                              <option value="0">Not rated</option>
                              <option value="1">1⭐</option>
                              <option value="2">2⭐</option>
                              <option value="3">3⭐</option>
                              <option value="4">4⭐</option>
                              <option value="5">5⭐</option>
                            </select>
                          </label>
                        )}

                        <label className="history-field">
                          {isAttendee ? "Review Host" : "Review participant"}
                          <textarea
                            value={item.review}
                            rows={3}
                            placeholder={
                              isAttendee
                                ? "Write your review of the host"
                                : "Write your review of this participant"
                            }
                            aria-label={
                              isAttendee
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
                );
              })}
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
                  {activeGallery.currentIndex + 1} of {activeGalleryCount}
                </p>
              </div>
            </div>
          )}

          {/* Share to The Field prompt */}
          {sharePromptItemId && (() => {
            const promptItem = allItems.find((item) => item.id === sharePromptItemId);
            if (!promptItem) return null;
            return (
              <div
                className="booking-modal-backdrop"
                role="presentation"
                onClick={() => setSharePromptItemId(null)}
              >
                <section
                  className="booking-modal field-share-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Share experience to The Field"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="booking-modal-close"
                    aria-label="Close"
                    onClick={() => setSharePromptItemId(null)}
                  >
                    ×
                  </button>

                  <h3>Share your experience to The Field?</h3>
                  <p className="field-share-modal-sub">
                    Your photos will appear as a carousel on The Field — visible to other
                    travelers and hosts.
                  </p>

                  <div className="field-share-photo-preview">
                    {(promptItem.photoGallery ?? [])
                      .filter((p) => p !== FALLBACK_EVENT_PHOTO)
                      .slice(0, 4)
                      .map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Preview ${index + 1}`}
                          className="field-share-preview-thumb"
                        />
                      ))}
                  </div>

                  <label className="field-share-caption-label">
                    Caption <span className="field-share-required">*</span>
                    <textarea
                      className={`field-share-caption-input${shareCaptionError ? " field-share-caption-error" : ""}`}
                      rows={3}
                      placeholder="Tell people about your experience..."
                      value={shareCaption}
                      onChange={(event) => {
                        setShareCaption(event.target.value);
                        if (event.target.value.trim()) setShareCaptionError(false);
                      }}
                    />
                    {shareCaptionError && (
                      <span className="field-share-error-msg">Caption is required before sharing.</span>
                    )}
                  </label>

                  <div className="booking-modal-actions">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setSharePromptItemId(null)}
                    >
                      Keep private
                    </button>
                    <button
                      type="button"
                      className="find-button"
                      onClick={() => handleShareToField(promptItem)}
                    >
                      Share to The Field
                    </button>
                  </div>
                </section>
              </div>
            );
          })()}

          {/* Share success toast */}
          {shareSuccess && (
            <div className="field-share-toast" role="status" aria-live="polite">
              ✅ Posted to The Field!
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HistoryPage;
