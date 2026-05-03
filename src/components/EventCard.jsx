import { formatEventDateRange } from "../lib/events";

const EventCard = ({ event, compact = false }) => {
  const dateLabel = formatEventDateRange(event.startsAt, event.endsAt);
  const location = [event.city, event.country].filter(Boolean).join(", ");
  return (
    <article className={`event-card${compact ? " event-card-compact" : ""}`}>
      {event.imageUrl && (
        <a
          href={event.url || "#"}
          target={event.url ? "_blank" : undefined}
          rel={event.url ? "noopener noreferrer" : undefined}
          className="event-card-image-link"
          aria-label={`Open ${event.title}`}
        >
          <img src={event.imageUrl} alt="" className="event-card-image" />
          {event.category && (
            <span className="event-card-badge">{event.category}</span>
          )}
        </a>
      )}
      <div className="event-card-body">
        <span className="sport-pill event-card-sport">{event.sport}</span>
        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-meta">
          📅 {dateLabel}
          {location && <span> · 📍 {location}</span>}
        </p>
        {!compact && event.venue && (
          <p className="event-card-venue">{event.venue}</p>
        )}
        {!compact && event.description && (
          <p className="event-card-description">{event.description}</p>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="event-card-link"
          >
            Learn more →
          </a>
        )}
      </div>
    </article>
  );
};

export default EventCard;
