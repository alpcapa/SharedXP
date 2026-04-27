// Pure helpers for normalising / serialising booking-history items.
// Extracted from HistoryPage so the page itself stays focused on UI state.

export const FALLBACK_EVENT_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

export const FALLBACK_PARTICIPANT_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%2393c5fd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='24' font-weight='700' fill='%231e3a8a'%3ESP%3C/text%3E%3C/svg%3E";

const DEFAULT_FALLBACK_LAST_NAME = "User";
const DEFAULT_HOST_FALLBACK_FIRST_NAME = "Host";
const DEFAULT_PARTICIPANT_FALLBACK_FIRST_NAME = "Participant";
export const DEFAULT_FIELD_POST_USER_NAME = "SharedXP User";
export const CONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1000;
export const MAX_PHOTOS_PER_SESSION = 5;
export const HOST_RATING_FIELDS = [
  { key: "overall", label: "Overall" },
  { key: "punctuality", label: "Punctuality" },
  { key: "equipmentQuality", label: "Equipment Quality" },
  { key: "localKnowledge", label: "Local Knowledge" },
  { key: "friendliness", label: "Friendliness" },
  { key: "value", label: "Value" },
];

export const formatStarRating = (rating) =>
  `${Math.max(0, Math.min(5, Math.round(rating)))}⭐`;

export const clampRating = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
};

export const toTimestamp = (dateValue) => {
  const ts = Date.parse(String(dateValue ?? ""));
  return Number.isFinite(ts) ? ts : null;
};

export const formatEventDate = (dateValue) => {
  const ts = toTimestamp(dateValue);
  if (ts === null) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ts));
};

const normalizeName = (value, fallback) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeFullName = (
  value,
  fallbackFirst,
  fallbackLast = DEFAULT_FALLBACK_LAST_NAME
) => {
  const text = String(value ?? "").trim();
  if (!text) return `${fallbackFirst} ${fallbackLast}`;
  if (/\s/.test(text)) return text;
  return `${text} ${fallbackLast}`;
};

export const normalizeHostRatings = (item) => {
  const src =
    item?.hostRatings && typeof item.hostRatings === "object"
      ? item.hostRatings
      : {};
  return {
    overall: clampRating(src.overall ?? item?.rating ?? 0),
    punctuality: clampRating(src.punctuality ?? item?.punctualityRating ?? 0),
    equipmentQuality: clampRating(
      src.equipmentQuality ?? item?.equipmentQualityRating ?? 0
    ),
    localKnowledge: clampRating(
      src.localKnowledge ?? item?.localKnowledgeRating ?? 0
    ),
    friendliness: clampRating(src.friendliness ?? item?.friendlinessRating ?? 0),
    value: clampRating(src.value ?? item?.valueRating ?? 0),
  };
};

const normalizeConfirmationState = (item, completedAtValue, completedAtTs) => {
  const rawStatus = String(
    item.confirmationStatus ?? item.status ?? ""
  ).toLowerCase();
  const explicitlyCompleted =
    rawStatus === "completed" ||
    rawStatus === "confirmed" ||
    item.confirmed === true ||
    item.paymentReleased === true ||
    String(item.confirmedAt ?? "").trim().length > 0;
  const autoConfirmed =
    !explicitlyCompleted &&
    completedAtTs !== null &&
    Date.now() - completedAtTs >= CONFIRMATION_WINDOW_MS;
  const confirmationStatus =
    explicitlyCompleted || autoConfirmed ? "completed" : "pending";
  const paymentReleased = confirmationStatus === "completed";
  const autoConfirmedAt =
    completedAtTs !== null
      ? new Date(completedAtTs + CONFIRMATION_WINDOW_MS).toISOString()
      : "";
  const confirmedAt =
    confirmationStatus === "completed"
      ? String(item.confirmedAt ?? "").trim() ||
        (autoConfirmed ? autoConfirmedAt : String(completedAtValue ?? "").trim())
      : "";
  return { confirmationStatus, paymentReleased, confirmedAt, autoConfirmed };
};

const normalizePhotoGallery = (value, primary) => {
  const fromList = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? [value]
    : [];
  const set = new Set();
  const primaryStr = String(primary ?? "").trim();
  if (primaryStr) set.add(primaryStr);
  fromList
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .forEach((p) => set.add(p));
  const unique = Array.from(set);
  return unique.length ? unique : [FALLBACK_EVENT_PHOTO];
};

export const normalizeAttended = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const hostRatings = normalizeHostRatings(item);
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(
      item.eventName ?? item.label ?? item.title ?? fallbackName,
      "Experience"
    );
    const hostName = normalizeFullName(
      item.hostName ?? item.host,
      DEFAULT_HOST_FALLBACK_FIRST_NAME
    );
    const completedAt =
      item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const completedAtTs = toTimestamp(completedAt);
    const confirmation = normalizeConfirmationState(
      item,
      completedAt,
      completedAtTs
    );
    const photoSrc = String(item.photo ?? item.image ?? "").trim();
    const photoGallery = normalizePhotoGallery(
      item.photoGallery ?? item.photos ?? item.images ?? item.gallery,
      photoSrc
    );
    const rawId =
      item.id !== undefined && item.id !== null ? String(item.id) : null;
    const id =
      rawId !== null
        ? `att:${rawId}`
        : `att-${index}-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return {
      role: "attended",
      source: rawItem,
      fallbackIndex: index,
      sortKey: completedAtTs,
      id,
      eventName,
      hostName,
      sport: String(item.sport ?? "Other"),
      photo: photoGallery[0] || FALLBACK_EVENT_PHOTO,
      photoGallery,
      rating: hostRatings.overall,
      hostRatings,
      attendeeRating: clampRating(
        item.attendeeRating ?? item.participantRatingForHost ?? 0
      ),
      review: String(item.review ?? item.comment ?? ""),
      sharedToField: item.sharedToField === true,
      completedAt: String(completedAt),
      completedAtTimestamp: completedAtTs,
      eventDateLabel: formatEventDate(completedAt),
      ...confirmation,
    };
  });
};

export const normalizeHosted = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const fallbackName = typeof rawItem === "string" ? rawItem : "";
    const eventName = normalizeName(
      item.eventName ?? item.label ?? item.title ?? fallbackName,
      "Experience"
    );
    const participantName = normalizeFullName(
      item.participantName ?? item.userName ?? item.attendeeName,
      DEFAULT_PARTICIPANT_FALLBACK_FIRST_NAME
    );
    const completedAt =
      item.completedAt ?? item.date ?? item.createdAt ?? item.updatedAt ?? "";
    const completedAtTs = toTimestamp(completedAt);
    const confirmation = normalizeConfirmationState(
      item,
      completedAt,
      completedAtTs
    );
    const photoSrc = String(item.photo ?? item.image ?? "").trim();
    const photoGallery = normalizePhotoGallery(
      item.photoGallery ?? item.photos ?? item.images ?? item.gallery,
      photoSrc
    );
    const participantPhotoSrc = String(
      item.participantPhoto ?? item.userPhoto ?? item.attendeePhoto ?? ""
    ).trim();
    const rawId =
      item.id !== undefined && item.id !== null ? String(item.id) : null;
    const id =
      rawId !== null
        ? `hosted:${rawId}`
        : `hosted-${index}-${eventName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`;
    return {
      role: "hosted",
      source: rawItem,
      fallbackIndex: index,
      sortKey: completedAtTs,
      id,
      eventName,
      participantName,
      participantPhoto: participantPhotoSrc || FALLBACK_PARTICIPANT_PHOTO,
      attendeeRating: clampRating(
        item.attendeeRating ?? item.participantRatingForHost ?? 0
      ),
      sport: String(item.sport ?? "Other"),
      photo: photoGallery[0] || FALLBACK_EVENT_PHOTO,
      photoGallery,
      rating: clampRating(item.rating ?? 0),
      review: String(item.review ?? item.comment ?? ""),
      sharedToField: item.sharedToField === true,
      completedAt: String(completedAt),
      completedAtTimestamp: completedAtTs,
      eventDateLabel: formatEventDate(completedAt),
      ...confirmation,
    };
  });
};

export const mergeAndSort = (attended, hosted) => {
  const combined = [...attended, ...hosted];
  return combined.sort((a, b) => {
    if (a.sortKey !== null && b.sortKey !== null) return b.sortKey - a.sortKey;
    if (a.sortKey !== null) return -1;
    if (b.sortKey !== null) return 1;
    return b.fallbackIndex - a.fallbackIndex;
  });
};

const baseStoredItem = (item) => ({
  ...(item.source && typeof item.source === "object" ? item.source : {}),
  id: item.source?.id ?? item.id,
  eventName: item.eventName,
  label: item.eventName,
  sport: item.sport,
  photo: item.photo,
  photoGallery: item.photoGallery,
  review: item.review,
  completedAt: item.completedAt,
  confirmationStatus: item.confirmationStatus,
  confirmedAt: item.confirmedAt,
  paymentReleased: item.paymentReleased,
});

export const toStoredAttended = (items) =>
  items
    .filter((item) => item.role === "attended")
    .map((item) => ({
      ...baseStoredItem(item),
      hostName: item.hostName,
      rating: item.hostRatings?.overall ?? item.rating,
      hostRatings: item.hostRatings,
      attendeeRating: item.attendeeRating,
      sharedToField: item.sharedToField ?? false,
    }));

export const toStoredHosted = (items) =>
  items
    .filter((item) => item.role === "hosted")
    .map((item) => ({
      ...baseStoredItem(item),
      participantName: item.participantName,
      participantPhoto: item.participantPhoto,
      attendeeRating: item.attendeeRating,
      rating: item.rating,
      sharedToField: item.sharedToField === true,
    }));
