import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";
import { getDateKey } from "../utils/date";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ProfilePage = () => {
  const { buddyId } = useParams();
  const buddy = buddies.find((item) => String(item.id) === buddyId);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  if (!buddy) {
    return (
      <div className="profile-page">
        <p>Buddy not found.</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const recommendations = buddies.filter((item) => item.id !== buddy.id).slice(0, 2);
  const perLabel = buddy.sport === "Cycling" ? "per ride" : "per session";
  const availableDates = buddy.availableDates ?? [];
  const availableTimes = buddy.availableTimes ?? [];
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const canRequestBooking = Boolean(selectedDate && selectedTime);
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
      hour: "2-digit",
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

  return (
    <div className="profile-page">
      <SiteHeader />
      <div className="profile-back-wrap">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
      </div>

      <section className="profile-summary">
        <img src={buddy.image} alt={buddy.name} className="profile-main-image" />
        <div>
          <h1>{buddy.name}</h1>
          <p>
            ⭐ {buddy.rating} · <span className="verified">Verified</span>
          </p>
          <p>
            {buddy.location} · Member since {buddy.memberSince}
          </p>
          <p>{buddy.bio}</p>
          <p>Level: {buddy.level}</p>
          <p className="price">
            €{buddy.price} {perLabel}
          </p>
          <p>{buddy.availabilitySchedule.join(" · ")}</p>

          <section className="booking-engine" aria-label="Booking engine">
            <h3>Book with {buddy.name}</h3>
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
              <option value="">Select available time</option>
              {availableTimes.map((timeOption) => (
                <option key={timeOption} value={timeOption}>
                  {formatTime(timeOption)}
                </option>
              ))}
            </select>

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
              Request a Booking
            </button>
          </section>
        </div>
      </section>

      <section className="gallery">
        <h3>Photo gallery</h3>
        <div className="gallery-grid">
          {buddy.gallery.map((photo) => (
            <img key={photo} src={photo} alt={`${buddy.name} gallery`} />
          ))}
        </div>
      </section>

      <section className="about">
        <h3>About</h3>
        <p>{buddy.about}</p>
        <p>
          Bike: {buddy.bike.brand} {buddy.bike.model} ({buddy.bike.type})
        </p>
      </section>

      <section className="reviews">
        <h3>Reviews</h3>
        {buddy.reviews.map((review) => (
          <article key={`${review.author}-${review.comment}`} className="review-card">
            <p>
              <strong>{review.author}</strong> · ⭐ {review.rating}
            </p>
            <p>{review.comment}</p>
          </article>
        ))}
      </section>

      <section>
        <h3>More locals you might like</h3>
        <div className="grid">
          {recommendations.map((recommendation) => (
            <BuddyCard key={recommendation.id} buddy={recommendation} />
          ))}
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
                  {buddy.name} · €{buddy.price} {perLabel}
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
                <p>We shared your selected options with {buddy.name}.</p>
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
