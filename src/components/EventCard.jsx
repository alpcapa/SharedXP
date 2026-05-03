import { useState } from "react";
import { formatEventDateRange } from "../lib/events";

// Clearbit's free Logo API: takes a bare hostname and returns the official
// logo as PNG/SVG with transparent background. Returns 404 when no logo is
// known — handled by onError which flips to a gradient + sport emoji.
const buildLogoUrl = (eventUrl) => {
  if (!eventUrl) return "";
  try {
    const hostname = new URL(eventUrl).hostname.replace(/^www\./i, "");
    if (!hostname) return "";
    return "https://logo.clearbit.com/" + hostname;
  } catch {
    return "";
  }
};

const SPORT_EMOJI = {
  Running: "🏃",
  Tennis: "🎾",
  Cycling: "🚴",
  "Formula 1": "🏎️",
  Football: "⚽",
  "American Football": "🏈",
  Golf: "⛳",
  Triathlon: "🏊",
  "Multi-sport": "🎽"
};

const SPORT_GRADIENT = {
  Running: "linear-gradient(135deg,#ff7a59,#ffb27a)",
  Tennis: "linear-gradient(135deg,#9bd54b,#5fa83a)",
  Cycling: "linear-gradient(135deg,#3aa8a8,#1f6b8a)",
  "Formula 1": "linear-gradient(135deg,#e10600,#3a0a0a)",
  Football: "linear-gradient(135deg,#1f8a4a,#0d4f2a)",
  "American Football": "linear-gradient(135deg,#6b3a14,#3a1f0a)",
  Golf: "linear-gradient(135deg,#7fbf4d,#2f6b1f)",
  Triathlon: "linear-gradient(135deg,#4aa8e0,#1f5a8a)",
  "Multi-sport": "linear-gradient(135deg,#6c63ff,#3a3a8a)"
};

const FALLBACK_EMOJI = "🏟️";
const FALLBACK_GRADIENT = "linear-gradient(135deg,#6ca43b,#3a7a1f)";

const EventCard = ({ event, compact = false }) => {
  const dateLabel = formatEventDateRange(event.startsAt, event.endsAt);
  const location = [event.city, event.country].filter(Boolean).join(", ");
  const logoUrl = buildLogoUrl(event.url);
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = logoUrl && !logoFailed;
  const emoji = SPORT_EMOJI[event.sport] || FALLBACK_EMOJI;
  const gradient = SPORT_GRADIENT[event.sport] || FALLBACK_GRADIENT;

  return (
    <article className={`event-card${compact ? " event-card-compact" : ""}`}>
      <a
        href={event.url || "#"}
        target={event.url ? "_blank" : undefined}
        rel={event.url ? "noopener noreferrer" : undefined}
        className="event-card-image-link"
        aria-label={`Open ${event.title}`}
      >
        <div
          className="event-card-placeholder"
          style={{ backgroundImage: gradient }}
          aria-hidden="true"
        >
          {showLogo ? (
            <img
              src={logoUrl}
              alt=""
              className="event-card-logo"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="event-card-placeholder-emoji">{emoji}</span>
          )}
        </div>
        {event.category && (
          <span className="event-card-badge">{event.category}</span>
        )}
      </a>
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
