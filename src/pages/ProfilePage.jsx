import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const timeOptions = ["06:30", "08:00", "10:30", "18:00", "19:30"];

const getUpcomingDates = (count = 10) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
};

const ProfilePage = () => {
  const { buddyId } = useParams();
  const buddy = buddies.find((item) => String(item.id) === buddyId);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);

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
  const dateOptions = useMemo(() => getUpcomingDates(10), []);
  const canRequestBooking = selectedDates.length > 0 && selectedTimes.length > 0;
  const selectedSlots = useMemo(
    () =>
      selectedDates.flatMap((date) =>
        selectedTimes.map((time) => ({
          id: `${date}-${time}`,
          date,
          time
        }))
      ),
    [selectedDates, selectedTimes]
  );

  const toggleDate = (dateValue) => {
    setSelectedDates((currentDates) =>
      currentDates.includes(dateValue)
        ? currentDates.filter((date) => date !== dateValue)
        : [...currentDates, dateValue]
    );
  };

  const toggleTime = (timeValue) => {
    setSelectedTimes((currentTimes) =>
      currentTimes.includes(timeValue)
        ? currentTimes.filter((time) => time !== timeValue)
        : [...currentTimes, timeValue]
    );
  };

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
            <p className="booking-subtitle">Select one or more dates and times.</p>

            <p className="booking-label">Dates</p>
            <div className="booking-chip-grid">
              {dateOptions.map((dateOption) => (
                <button
                  key={dateOption}
                  type="button"
                  className={`booking-chip${
                    selectedDates.includes(dateOption) ? " selected" : ""
                  }`}
                  onClick={() => toggleDate(dateOption)}
                >
                  {formatDate(dateOption)}
                </button>
              ))}
            </div>

            <p className="booking-label">Times</p>
            <div className="booking-time-grid">
              {timeOptions.map((timeOption) => (
                <button
                  key={timeOption}
                  type="button"
                  className={`booking-chip${selectedTimes.includes(timeOption) ? " selected" : ""}`}
                  onClick={() => toggleTime(timeOption)}
                >
                  {formatTime(timeOption)}
                </button>
              ))}
            </div>

            <p className="booking-selection-hint">
              {selectedDates.length} date(s) · {selectedTimes.length} time(s) ·{" "}
              {selectedSlots.length} booking option(s)
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
                  {selectedSlots.map((slot) => (
                    <p key={slot.id}>
                      {formatDate(slot.date)} at {formatTime(slot.time)}
                    </p>
                  ))}
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
                    Final confirmation
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
