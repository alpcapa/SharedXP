import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import useHosts from "../hooks/useHosts";
import { getDateKey } from "../utils/date";
import { getProfileAge } from "../utils/profileAge";

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
      priceUnit: sportConfig.priceUnit ?? buddy.priceUnit ?? "per session"
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
  const { hosts, hostsLoading } = useHosts();
  const buddy = hosts.find((h) => h.id === buddyId);
  const [selectedSportIndex, setSelectedSportIndex] = useState(0);
  const [recommendationsPage, setRecommendationsPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  if (hostsLoading) {
    return (
      <div className="profile-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <div className="profile-back-wrap">
          <Link to="/" className="back-link">← Back to home</Link>
        </div>
        <p style={{ padding: "2rem" }}>Loading…</p>
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

  const recommendations = hosts.filter((h) => h.id !== buddy.id);
  const { firstName, lastName, fullName: hostDisplayName } = getNameParts(buddy);
  const { rating: hostRating, reviewCount } = getHostRatingSummary(buddy);
  const { city, country } = getLocationParts(buddy);
  const memberSince = getMemberSinceLabel(buddy);
  const hostSports = getSportConfigs(buddy, currentUser);
  const activeSport = hostSports[selectedSportIndex] ?? hostSports[0] ?? {};
  const availableDates = activeSport.availableDates ?? buddy.availableDates ?? [];
  const availableTimes = activeSport.availableTimes ?? buddy.availableTimes ?? [];
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const canRequestBooking = Boolean(selectedDate && selectedTime);
  const selectedPrice = formatPrice(activeSport.pricing, activeSport.pricingCurrency);
  const perLabel = activeSport.priceUnit ?? buddy.priceUnit ?? "per session";
  const languageLine = getLanguageLine(buddy);
  const hostAge = getDisplayedProfileAge(buddy, currentUser);
  const locationLine = [city, country].filter(Boolean).join(", ") || "Location unavailable";
  const selectedLevel = activeSport.level ?? buddy.level ?? "Not specified";
  const isEquipmentAvailable =
    activeSport.equipmentAvailable ?? buddy.equipmentAvailable ?? buddy.bikeAvailable ?? false;
  const selectedSportGallery = Array.isArray(activeSport.images) ? activeSport.images.filter(Boolean) : [];
  const fallbackGallery = Array.isArray(buddy.gallery) ? buddy.gallery.filter(Boolean) : [];
  const galleryPhotos =
    selectedSportGallery.length > 0
      ? selectedSportGallery
      : fallbackGallery.length > 0
        ? fallbackGallery
        : [];
  const totalRecommendationPages = Math.max(1, Math.ceil(recommendations.length / LOCALS_PER_PAGE));
  const visibleRecommendations = useMemo(() => {
    const startIndex = recommendationsPage * LOCALS_PER_PAGE;
    return recommendations.slice(startIndex, startIndex + LOCALS_PER_PAGE);
  }, [recommendations, recommendationsPage]);
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

    setIsRequestSubmitted(false);
    setIsConfirmationOpen(true);
  };

  const handleFinalConfirmation = () => {
    setIsRequestSubmitted(true);
  };

  useEffect(() => {
    setRecommendationsPage(0);
  }, [buddy.id]);

  useEffect(() => {
    setRecommendationsPage((currentPage) => Math.min(currentPage, totalRecommendationPages - 1));
  }, [totalRecommendationPages]);

  return (
    <div className="profile-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <div className="profile-back-wrap">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
      </div>

      <section className="profile-summary">
        <div className="profile-summary-header">
          <h1 className="profile-name-with-age">
            {firstName} {lastName}
            {hostAge != null && (
              <span className="profile-name-age" aria-label={`age ${hostAge}`}>
                ({hostAge})
              </span>
            )}
          </h1>
          <p>
            ⭐ {hostRating}
            {reviewCount > 0 ? ` (${reviewCount})` : ""} · <span className="verified">Verified</span>
          </p>
        </div>
        <div className="profile-summary-body">
          <div className="profile-summary-photo-column">
            <img src={buddy.image} alt={hostDisplayName} className="profile-main-image" />
            <div className="profile-summary-meta">
              <p>{locationLine}</p>
              <p>Member since {memberSince}</p>
              <p>{languageLine ? `Language: ${languageLine}` : "Language: Not specified"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="booking-engine-section" aria-label="Booking engine">
        <div className="booking-engine">
          <h3>Booking with {hostDisplayName}</h3>
          {activeSport.description && <p className="booking-subtitle">{activeSport.description}</p>}
          {activeSport.about && <p>{activeSport.about}</p>}
          {hostSports.length > 0 && (
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
          )}
          <p className="booking-subtitle">Choose one available date and time.</p>

          <p className="booking-label">Date</p>
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

          <label className="booking-label" htmlFor="booking-time-select">
            Time
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
          {selectedPrice && (
            <p className="booking-label">
              Price: {selectedPrice} {perLabel}
            </p>
          )}
          <p className="booking-label">Level: {selectedLevel}</p>
          <p className="booking-label">Equipment: {isEquipmentAvailable ? "Available" : "Not available"}</p>

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
        {buddy.reviews.map((review) => (
          <article key={`${review.author}-${review.comment}`} className="review-card">
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
            <p>{review.comment}</p>
          </article>
        ))}
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
