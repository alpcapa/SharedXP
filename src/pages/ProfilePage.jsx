import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";
import { supabase } from "../lib/supabase";
import { getDateKey } from "../utils/date";
import { getProfileAge } from "../utils/profileAge";

const DAY_NAME_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKS_AHEAD = 8;

const ALL_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

const generateAvailableDates = (availabilityDays) => {
  const dayIndices =
    !Array.isArray(availabilityDays) || availabilityDays.length === 0
      ? ALL_DAY_INDICES
      : availabilityDays
          .map((d) => DAY_NAME_TO_INDEX[d])
          .filter((d) => d !== undefined);
  if (dayIndices.length === 0) return [];
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < WEEKS_AHEAD * 7; offset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (dayIndices.includes(candidate.getDay())) {
      dates.push(
        `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}`
      );
    }
  }
  return dates;
};

const generateTimeSlots = (startTime, endTime) => {
  const slots = [];
  const [startHour, startMin] = String(startTime || "09:00").split(":").map(Number);
  const [endHour, endMin] = String(endTime || "18:00").split(":").map(Number);
  let currentMinutes = startHour * 60 + (startMin || 0);
  const endMinutes = endHour * 60 + (endMin || 0);
  while (currentMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += 60;
  }
  return slots;
};

const shapeSupabaseHost = (data) => {
  const hp = data;
  const profile = data.profile;
  const languages = (profile.user_languages || [])
    .sort((a, b) => a.position - b.position)
    .map((ul) => ul.language)
    .filter(Boolean);
  const sports = (hp.host_sports || [])
    .filter((hs) => !hs.paused)
    .map((hs) => ({
      sport: hs.sport || "",
      description: hs.description || "",
      about: hs.about || "",
      pricing: hs.pricing || 0,
      pricingCurrency: hs.pricing_currency || "EUR",
      level: hs.level || "",
      paused: false,
      equipmentAvailable: hs.equipment_available || false,
      equipmentDetails: hs.equipment_details || "",
      availability: {
        days: hs.availability_days || [],
        startTime: hs.availability_start_time || "09:00",
        endTime: hs.availability_end_time || "18:00",
      },
      availableDates: generateAvailableDates(hs.availability_days),
      availableTimes: generateTimeSlots(
        hs.availability_start_time || "09:00",
        hs.availability_end_time || "18:00"
      ),
      images: (hs.host_sport_images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => img.image_url)
        .filter(Boolean),
    }));
  const fullName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Host";
  return {
    id: profile.id,
    name: fullName,
    fullName,
    email: profile.email || "",
    image: profile.photo_url || "",
    gender: profile.gender || "",
    birthday: profile.birthday || "",
    signedUpAt: profile.signed_up_at || "",
    city: hp.city || "",
    country: hp.country || "",
    paused: hp.pause_hosting || false,
    sports,
    languages,
    reviews: [],
    rating: 0,
    reviewCount: 0,
    gallery: [],
  };
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const getStars = (value) => `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  INR: "₹",
  BRL: "R$"
};
const LOCALS_PER_PAGE = 4;
const REVIEWS_PER_PAGE = 3;
const normalizeIdentifier = (value) => String(value ?? "").trim().toLowerCase();

const isCurrentUserHostForBuddy = (currentUser, buddy) => {
  if (!currentUser || !buddy) {
    return false;
  }
  const currentUserEmail = normalizeIdentifier(currentUser.email);
  const buddyEmail = normalizeIdentifier(buddy.email ?? buddy.hostProfile?.email);
  if (currentUserEmail && buddyEmail && currentUserEmail === buddyEmail) {
    return true;
  }
  const currentUserName = normalizeIdentifier(currentUser.fullName ?? currentUser.name);
  const buddyName = normalizeIdentifier(buddy.fullName ?? buddy.name);
  return Boolean(currentUserName && buddyName && currentUserName === buddyName);
};

const getNameParts = (buddy) => {
  const fullName = String(buddy.fullName ?? buddy.name ?? "").trim();
  if (!fullName) {
    return {
      firstName: "Host",
      lastName: "User",
      fullName: "Host User"
    };
  }
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ").trim() || "User";
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim()
  };
};

const getLocationParts = (buddy) => {
  const explicitCity = String(buddy.city ?? buddy.hostProfile?.city ?? "").trim();
  const explicitCountry = String(buddy.country ?? buddy.hostProfile?.country ?? "").trim();
  if (explicitCity || explicitCountry) {
    return {
      city: explicitCity,
      country: explicitCountry
    };
  }
  const [city = "", country = ""] = String(buddy.location ?? "")
    .split(",")
    .map((part) => part.trim());
  return { city, country };
};

const getHostRatingSummary = (buddy) => {
  const reviewRatings = Array.isArray(buddy.reviews)
    ? buddy.reviews
        .map((review) => Number(review.overall ?? review.rating))
        .filter((rating) => Number.isFinite(rating) && rating > 0)
    : [];
  const fallbackRating = Number(buddy.rating);
  const computedRating =
    reviewRatings.length > 0
      ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length
      : Number.isFinite(fallbackRating)
        ? fallbackRating
        : 0;
  return {
    rating: computedRating.toFixed(1),
    reviewCount:
      reviewRatings.length > 0
        ? reviewRatings.length
        : Number.isFinite(Number(buddy.reviewCount))
          ? Number(buddy.reviewCount)
          : 0
  };
};

const getMemberSinceLabel = (buddy) => {
  const signedUpTimestamp = Date.parse(String(buddy.signedUpAt ?? ""));
  if (Number.isFinite(signedUpTimestamp)) {
    const now = new Date();
    const signedUpDate = new Date(signedUpTimestamp);
    if (signedUpDate > now) {
      return "0 months";
    }
    let totalMonths =
      (now.getFullYear() - signedUpDate.getFullYear()) * 12 + (now.getMonth() - signedUpDate.getMonth());
    if (now.getDate() < signedUpDate.getDate()) {
      totalMonths -= 1;
    }
    totalMonths = Math.max(0, totalMonths);
    if (totalMonths >= 12) {
      const years = Math.floor(totalMonths / 12);
      return `${years} year${years === 1 ? "" : "s"}`;
    }
    return `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
  }

  const fallbackYear = Number(buddy.memberSince);
  if (Number.isFinite(fallbackYear) && fallbackYear > 1900) {
    const years = Math.max(0, new Date().getFullYear() - fallbackYear);
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return "New";
};

const getDisplayedProfileAge = (buddy, currentUser) => {
  const buddyAge = getProfileAge(buddy);
  if (buddyAge != null) {
    return buddyAge;
  }
  if (isCurrentUserHostForBuddy(currentUser, buddy)) {
    return getProfileAge(currentUser);
  }
  return null;
};

const getSportConfigs = (buddy, currentUser) => {
  const sourceSports =
    isCurrentUserHostForBuddy(currentUser, buddy) &&
    Array.isArray(currentUser?.hostProfile?.sports) &&
    currentUser.hostProfile.sports.length > 0
      ? currentUser.hostProfile.sports
      : Array.isArray(buddy.sports) && buddy.sports.length > 0
        ? buddy.sports
        : null;

  if (sourceSports) {
    return sourceSports.map((sportConfig) => ({
      ...sportConfig,
      sport: sportConfig.sport ?? buddy.sport ?? "",
      level: sportConfig.level ?? buddy.level ?? "",
      description: sportConfig.description ?? "",
      about: sportConfig.about ?? "",
      equipmentAvailable: sportConfig.equipmentAvailable ?? buddy.equipmentAvailable ?? buddy.bikeAvailable ?? false,
      pricing: sportConfig.pricing ?? buddy.price ?? "",
      pricingCurrency: sportConfig.pricingCurrency ?? "EUR",
      priceUnit: sportConfig.priceUnit ?? buddy.priceUnit ?? "per session",
      availableDates: Array.isArray(sportConfig.availableDates) && sportConfig.availableDates.length > 0
        ? sportConfig.availableDates
        : generateAvailableDates(sportConfig.availability?.days ?? []),
      availableTimes: Array.isArray(sportConfig.availableTimes) && sportConfig.availableTimes.length > 0
        ? sportConfig.availableTimes
        : generateTimeSlots(
            sportConfig.availability?.startTime ?? "09:00",
            sportConfig.availability?.endTime ?? "18:00"
          )
    }));
  }

  return [
    {
      sport: buddy.sport ?? "",
      level: buddy.level ?? "",
      description: buddy.description ?? buddy.bio ?? "",
      about: buddy.about ?? "",
      equipmentAvailable: buddy.equipmentAvailable ?? buddy.bikeAvailable ?? false,
      pricing: buddy.price ?? "",
      pricingCurrency: "EUR",
      priceUnit: buddy.priceUnit ?? "per session"
    }
  ];
};

const getLanguageLine = (buddy) => {
  if (Array.isArray(buddy.hostProfile?.languages)) {
    return buddy.hostProfile.languages.filter(Boolean).join(", ");
  }
  if (Array.isArray(buddy.languages)) {
    return buddy.languages.filter(Boolean).join(", ");
  }
  return String(buddy.language ?? "");
};

const formatPrice = (amount, currency) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "";
  }
  const normalizedCurrency = String(currency ?? "").toUpperCase();
  const currencySymbol = CURRENCY_SYMBOLS[normalizedCurrency];
  if (currencySymbol) {
    return `${currencySymbol}${numericAmount}`;
  }
  if (normalizedCurrency) {
    return `${normalizedCurrency} ${numericAmount}`;
  }
  return String(numericAmount);
};

const ProfilePage = ({ currentUser, onLogout }) => {
  const { buddyId } = useParams();
  const location = useLocation();

  // ── All hooks first (before any conditional returns) ────────────────────
  const [buddyFromSupabase, setBuddyFromSupabase] = useState(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [selectedSportIndex, setSelectedSportIndex] = useState(0);
  const [recommendationsPage, setRecommendationsPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reviewsPage, setReviewsPage] = useState(0);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const staticBuddy = useMemo(
    () => buddies.find((item) => String(item.id) === buddyId) ?? null,
    [buddyId]
  );

  // Fetch from Supabase when the static array has no match (UUID-based IDs)
  useEffect(() => {
    if (staticBuddy) {
      setBuddyFromSupabase(null);
      setSupabaseLoading(false);
      return;
    }
    let cancelled = false;
    setSupabaseLoading(true);
    Promise.all([
      supabase
        .from("host_profiles")
        .select(
          `pause_hosting, city, country,
           profile:profiles!user_id(
             id, email, full_name, first_name, last_name, photo_url, gender, birthday, signed_up_at,
             user_languages(language, position)
           ),
           host_sports(
             id, sport, description, about, pricing, pricing_currency, level, paused,
             equipment_available, equipment_details, availability_days,
             availability_start_time, availability_end_time,
             host_sport_images(image_url, position)
           )`
        )
        .eq("user_id", buddyId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("counterparty_name, attendee_rating, sport, completed_at")
        .eq("user_id", buddyId)
        .eq("role", "hosted")
        .gt("attendee_rating", 0)
        .order("completed_at", { ascending: false }),
    ]).then(([hostResult, reviewsResult]) => {
      if (cancelled) return;
      if (!hostResult.error && hostResult.data?.profile) {
        const shapedHost = shapeSupabaseHost(hostResult.data);
        const reviews = (reviewsResult.data ?? []).map((r) => ({
          author: r.counterparty_name || "Attendee",
          overall: r.attendee_rating,
          sport: r.sport,
          date: r.completed_at,
        }));
        setBuddyFromSupabase({ ...shapedHost, reviews });
      } else {
        setBuddyFromSupabase(null);
      }
      setSupabaseLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [buddyId, staticBuddy]);

  useEffect(() => {
    setRecommendationsPage(0);
    setSelectedSportIndex(0);
    setSelectedDate("");
    setSelectedTime("");
    setReviewsPage(0);
  }, [buddyId]);

  // Clear booking selection and reviews page when switching sport tabs
  useEffect(() => {
    setSelectedDate("");
    setSelectedTime("");
    setReviewsPage(0);
  }, [selectedSportIndex]);

  const buddy = staticBuddy ?? buddyFromSupabase;

  const recommendations = useMemo(
    () => buddies.filter((item) => String(item.id) !== buddyId && !item.paused),
    [buddyId]
  );

  const hostSports = useMemo(
    () => (buddy ? getSportConfigs(buddy, currentUser) : []),
    [buddy, currentUser]
  );
  const activeSport = useMemo(
    () => hostSports[selectedSportIndex] ?? hostSports[0] ?? {},
    [hostSports, selectedSportIndex]
  );
  const availableDates = useMemo(
    () => activeSport.availableDates ?? buddy?.availableDates ?? [],
    [activeSport, buddy]
  );
  const availableTimes = useMemo(
    () => activeSport.availableTimes ?? buddy?.availableTimes ?? [],
    [activeSport, buddy]
  );
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Auto-advance the calendar to the first month that contains available dates.
  // This runs when dates first load (buddy fetched) or when the sport tab changes.
  useEffect(() => {
    if (availableDates.length === 0) return;
    setCalendarMonth((prev) => {
      const hasAvailableThisMonth = availableDates.some((dateStr) => {
        const [y, m] = dateStr.split("-").map(Number);
        return y === prev.getFullYear() && m === prev.getMonth() + 1;
      });
      if (hasAvailableThisMonth) return prev;
      const [y, m] = availableDates[0].split("-").map(Number);
      return new Date(y, m - 1, 1);
    });
  }, [availableDates]);

  const totalRecommendationPages = Math.max(1, Math.ceil(recommendations.length / LOCALS_PER_PAGE));
  const visibleRecommendations = useMemo(() => {
    const startIndex = recommendationsPage * LOCALS_PER_PAGE;
    return recommendations.slice(startIndex, startIndex + LOCALS_PER_PAGE);
  }, [recommendations, recommendationsPage]);

  const filteredReviews = useMemo(() => {
    const reviews = Array.isArray(buddy?.reviews) ? buddy.reviews : [];
    const sportName = activeSport?.sport ?? "";
    return reviews.filter((r) => !r.sport || r.sport === sportName);
  }, [buddy, activeSport]);

  const sortedReviews = useMemo(
    () =>
      [...filteredReviews].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }),
    [filteredReviews]
  );

  const totalReviewPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE));

  const visibleReviews = useMemo(() => {
    const start = reviewsPage * REVIEWS_PER_PAGE;
    return sortedReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [sortedReviews, reviewsPage]);

  const monthYearLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric"
  }).format(calendarMonth);

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = firstDay.getDay();

    const leadingEmpty = Array.from({ length: firstDayIndex }, (_, index) => ({
      id: `empty-${index}`,
      isEmpty: true
    }));

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = getDateKey(year, month, day);
      return {
        id: dateKey,
        label: day,
        dateKey,
        isAvailable: availableDateSet.has(dateKey)
      };
    });

    return [...leadingEmpty, ...days];
  }, [availableDateSet, calendarMonth]);

  useEffect(() => {
    setRecommendationsPage((currentPage) => Math.min(currentPage, totalRecommendationPages - 1));
  }, [totalRecommendationPages]);

  useEffect(() => {
    setReviewsPage((p) => Math.min(p, Math.max(0, totalReviewPages - 1)));
  }, [totalReviewPages]);

  // ── Guards (after all hooks) ─────────────────────────────────────────────
  if (!buddy && supabaseLoading) {
    return (
      <div className="profile-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <p style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
          Loading host profile…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (!buddy) {
    return (
      <div className="profile-page">
        <p>Buddy not found.</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  // ── Derived values that depend on buddy (safe now that buddy is non-null) ─
  const { firstName, lastName, fullName: hostDisplayName } = getNameParts(buddy);
  const { rating: hostRating, reviewCount } = getHostRatingSummary(buddy);
  const { city, country } = getLocationParts(buddy);
  const memberSince = getMemberSinceLabel(buddy);
  const isHostPaused =
    Boolean(buddy.paused) ||
    (isCurrentUserHostForBuddy(currentUser, buddy) &&
      Boolean(currentUser?.hostProfile?.pauseHosting));
  const canRequestBooking = Boolean(selectedDate && selectedTime);
  const selectedPrice = formatPrice(activeSport.pricing, activeSport.pricingCurrency);
  const perLabel = activeSport.priceUnit ?? buddy.priceUnit ?? "per session";
  const languageLine = getLanguageLine(buddy);
  const hostAge = getDisplayedProfileAge(buddy, currentUser);
  const locationLine = [city, country].filter(Boolean).join(", ") || "Location unavailable";
  const selectedLevel = activeSport.level ?? buddy.level ?? "Not specified";
  const isEquipmentAvailable =
    activeSport.equipmentAvailable ?? buddy.equipmentAvailable ?? buddy.bikeAvailable ?? false;
  const equipmentDetails = activeSport.equipmentDetails ?? "";
  const selectedSportGallery = Array.isArray(activeSport.images) ? activeSport.images.filter(Boolean) : [];
  const fallbackGallery = Array.isArray(buddy.gallery) ? buddy.gallery.filter(Boolean) : [];
  const galleryPhotos =
    selectedSportGallery.length > 0
      ? selectedSportGallery
      : fallbackGallery.length > 0
        ? fallbackGallery
        : [];

  const formatDate = (dateValue) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(new Date(`${dateValue}T00:00:00`));

  const formatTime = (timeValue) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(`2000-01-01T${timeValue}:00`));

  const formatDateAriaLabel = (dateValue) => {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(year, month - 1, day));
  };

  const handleOpenConfirmation = () => {
    if (!canRequestBooking) {
      return;
    }

    if (!currentUser) {
      // Store the current path so post-auth redirect works for sign-up too
      sessionStorage.setItem("postAuthRedirect", location.pathname);
      setShowLoginPrompt(true);
      return;
    }

    setShowLoginPrompt(false);
    setIsRequestSubmitted(false);
    setIsConfirmationOpen(true);
  };

  const handleFinalConfirmation = () => {
    setIsRequestSubmitted(true);
  };

  return (
    <div className="profile-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <div className="profile-back-wrap">
        {location.state?.from === "explore" ? (
          <Link to="/locals" className="back-link">
            ← Back to Explore
          </Link>
        ) : (
          <Link to="/" className="back-link">
            ← Back to home
          </Link>
        )}
      </div>

      <section className="profile-summary">
        <div className="profile-summary-header">
          <div className="profile-name-rating-row">
            <h1 className="profile-name-with-age">
              {firstName} {lastName}
              {hostAge != null && (
                <span className="profile-name-age" aria-label={`age ${hostAge}`}>
                  ({hostAge})
                </span>
              )}
            </h1>
            <p className="profile-rating-inline">
              ⭐ {hostRating}
              {reviewCount > 0 ? ` (${reviewCount})` : ""} · <span className="verified">Verified</span>
            </p>
          </div>
          <p className="profile-location-line">{locationLine}</p>
        </div>
        <div className="profile-summary-body">
          <div className="profile-summary-photo-column">
            <img src={buddy.image} alt={hostDisplayName} className="profile-main-image" />
            <div className="profile-summary-meta">
              <p><strong>Language:</strong> {languageLine || "Not specified"}</p>
              {activeSport.about && <p><strong>About:</strong> {activeSport.about}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="booking-engine-section" aria-label="Booking engine">
        <div className="booking-engine">
          <h3>Book with {hostDisplayName}</h3>
          {isHostPaused ? (
            <p className="booking-paused-notice">
              This host is currently not accepting new bookings.
            </p>
          ) : (
          <>
          {hostSports.length > 0 && (
            <>
              <p className="booking-label"><strong>Choose Category:</strong></p>
              <div className="host-sport-tabs booking-sport-tabs" aria-label={`${hostDisplayName} sports`}>
                {hostSports.map((sportConfig, sportIndex) => (
                  <button
                    key={sportIndex}
                    type="button"
                    className={`host-sport-tab${sportIndex === selectedSportIndex ? " active" : ""}`}
                    onClick={() => setSelectedSportIndex(sportIndex)}
                  >
                    {sportConfig.sport || `Sport ${sportIndex + 1}`}
                  </button>
                ))}
              </div>
            </>
          )}
          {activeSport.description && (
            <p className="booking-subtitle">
              <strong>Description:</strong> {activeSport.description}
            </p>
          )}

          <p className="booking-label"><strong>Choose Date:</strong></p>
          <div className="booking-calendar" aria-label="Available dates calendar">
            <div className="booking-calendar-header">
              <button
                type="button"
                className="calendar-nav-button"
                aria-label="Previous month"
                onClick={() =>
                  setCalendarMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }
              >
                ‹
              </button>
              <strong>{monthYearLabel}</strong>
              <button
                type="button"
                className="calendar-nav-button"
                aria-label="Next month"
                onClick={() =>
                  setCalendarMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }
              >
                ›
              </button>
            </div>
            <div className="booking-weekdays">
              {weekDays.map((dayName) => (
                <span key={dayName}>{dayName}</span>
              ))}
            </div>
            <div className="booking-calendar-grid">
              {monthDays.map((dayItem) =>
                dayItem.isEmpty ? (
                  <span key={dayItem.id} className="booking-day-empty" />
                ) : (
                  <button
                    key={dayItem.id}
                    type="button"
                    className={`booking-day${
                      dayItem.isAvailable ? " available" : " unavailable"
                    }${selectedDate === dayItem.dateKey ? " selected" : ""}`}
                    aria-label={`${formatDateAriaLabel(dayItem.dateKey)}, ${
                      dayItem.isAvailable ? "Available" : "Unavailable"
                    }`}
                    aria-disabled={!dayItem.isAvailable}
                    onClick={() => {
                      if (!dayItem.isAvailable) {
                        return;
                      }
                      setSelectedDate((currentDate) =>
                        currentDate === dayItem.dateKey ? "" : dayItem.dateKey
                      );
                    }}
                    disabled={!dayItem.isAvailable}
                  >
                    {dayItem.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="booking-time-row">
            <label className="booking-label" htmlFor="booking-time-select">
              <strong>Choose Time:</strong>
            </label>
            <select
              id="booking-time-select"
              className="booking-time-select"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
            >
              <option value="">Select time</option>
              {availableTimes.map((timeOption) => (
                <option key={timeOption} value={timeOption}>
                  {formatTime(timeOption)}
                </option>
              ))}
            </select>
          </div>
          <div className="booking-details-group">
            <p className="booking-label"><strong>Details:</strong></p>
            {selectedPrice && (
              <p className="booking-label">
                <strong>Price:</strong> {selectedPrice} {perLabel}
              </p>
            )}
            <p className="booking-label"><strong>Level:</strong> {selectedLevel}</p>
            <p className="booking-label"><strong>Equipment:</strong> {isEquipmentAvailable ? "Available" : "Not available"}</p>
            {equipmentDetails && (
              <p className="booking-subtitle">{equipmentDetails}</p>
            )}
          </div>

          <p className="booking-selection-hint">
            {selectedDate ? formatDate(selectedDate) : "No date selected"} ·{" "}
            {selectedTime ? formatTime(selectedTime) : "No time selected"}
          </p>
          <button
            type="button"
            className="find-button booking-request-button"
            disabled={!canRequestBooking}
            onClick={handleOpenConfirmation}
          >
            Request booking
          </button>
          {showLoginPrompt && (
            <div className="booking-login-prompt" role="alert">
              <p>You need to login to book with a host.</p>
              <div className="booking-login-prompt-actions">
                <Link
                  to="/login"
                  state={{ from: { pathname: location.pathname } }}
                  className="find-button booking-login-button"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  state={{ from: { pathname: location.pathname } }}
                  className="find-button booking-signup-button"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </section>

      <section className="gallery">
        <h3>Photo gallery</h3>
        {galleryPhotos.length > 0 ? (
          <div className="gallery-grid">
            {galleryPhotos.map((photo) => (
              <img key={photo} src={photo} alt={`${buddy.name} gallery`} />
            ))}
          </div>
        ) : (
          <p>No photos yet for this sport.</p>
        )}
      </section>

      <section className="reviews">
        <h3>Reviews</h3>
        {sortedReviews.length > 0 ? (
          <>
            {visibleReviews.map((review, reviewIndex) => {
              const globalIndex = reviewsPage * REVIEWS_PER_PAGE + reviewIndex;
              return (
              <article key={globalIndex} className="review-card">
                <p>
                  <strong>{review.author}</strong> · ⭐ {review.overall ?? review.rating}
                </p>
                {review.overall != null && (
                  <div className="review-breakdown">
                    {review.punctuality != null && <span>Punctuality {getStars(review.punctuality)}</span>}
                    {review.equipmentQuality != null && (
                      <span>Equipment {getStars(review.equipmentQuality)}</span>
                    )}
                    {review.localKnowledge != null && (
                      <span>Local knowledge {getStars(review.localKnowledge)}</span>
                    )}
                    {review.friendliness != null && (
                      <span>Friendliness {getStars(review.friendliness)}</span>
                    )}
                    {review.value != null && <span>Value {getStars(review.value)}</span>}
                  </div>
                )}
                {review.comment && <p>{review.comment}</p>}
              </article>
              );
            })}
            {totalReviewPages > 1 && (
              <div className="locals-nav-row">
                <button
                  type="button"
                  className="locals-nav"
                  aria-label="Show previous reviews"
                  onClick={() => setReviewsPage((p) => Math.max(p - 1, 0))}
                  disabled={reviewsPage === 0}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="locals-nav"
                  aria-label="Show next reviews"
                  onClick={() => setReviewsPage((p) => Math.min(p + 1, totalReviewPages - 1))}
                  disabled={reviewsPage >= totalReviewPages - 1}
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <p>No reviews for this sport yet.</p>
        )}
      </section>

      <section className="recommendations">
        <h3>More locals you might like</h3>
        <div className="locals-grid-wrap">
          <div className="locals-grid">
          {visibleRecommendations.map((recommendation) => (
            <BuddyCard key={recommendation.id} buddy={recommendation} />
          ))}
          </div>
          <div className="locals-nav-row">
            <button
              type="button"
              className="locals-nav"
              aria-label="Show previous 4 locals"
              onClick={() => setRecommendationsPage((page) => Math.max(page - 1, 0))}
              disabled={recommendationsPage === 0}
            >
              ‹
            </button>
            <button
              type="button"
              className="locals-nav"
              aria-label="Show next 4 locals"
              onClick={() =>
                setRecommendationsPage((page) => Math.min(page + 1, totalRecommendationPages - 1))
              }
              disabled={recommendationsPage >= totalRecommendationPages - 1}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />

      {isConfirmationOpen && (
        <div
          className="booking-modal-backdrop"
          role="presentation"
          onClick={() => setIsConfirmationOpen(false)}
        >
          <section
            className="booking-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm booking request"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="booking-modal-close"
              aria-label="Close booking confirmation"
              onClick={() => setIsConfirmationOpen(false)}
            >
              ×
            </button>

            {!isRequestSubmitted ? (
              <>
                <h3>Confirm your booking request</h3>
                <p className="booking-modal-meta">
                  {hostDisplayName}
                  {selectedPrice ? ` · ${selectedPrice} ${perLabel}` : ""}
                </p>
                <div className="booking-modal-list">
                  <p>
                    {formatDate(selectedDate)} at {formatTime(selectedTime)}
                  </p>
                </div>
                <div className="booking-modal-actions">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setIsConfirmationOpen(false)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="find-button booking-confirm-button"
                    onClick={handleFinalConfirmation}
                  >
                    Final Confirmation
                  </button>
                </div>
              </>
            ) : (
              <div className="booking-success">
                <h3>Booking request sent</h3>
                <p>We shared your selected options with {hostDisplayName}.</p>
                <button
                  type="button"
                  className="find-button booking-confirm-button"
                  onClick={() => setIsConfirmationOpen(false)}
                >
                  Done
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
