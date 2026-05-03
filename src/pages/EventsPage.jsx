import { useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { loadMajorEvents } from "../lib/events";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EventsPage = ({ currentUser, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMajorEvents()
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sportOptions = useMemo(
    () => ["All", ...[...new Set(events.map((event) => event.sport).filter(Boolean))].sort()],
    [events]
  );

  const countryOptions = useMemo(
    () => ["All", ...[...new Set(events.map((event) => event.country).filter(Boolean))].sort()],
    [events]
  );

  const monthOptions = useMemo(() => {
    const months = new Set();
    events.forEach((event) => {
      const date = new Date(event.startsAt);
      if (!Number.isNaN(date.getTime())) {
        months.add(date.getUTCMonth());
      }
    });
    return [
      "All",
      ...[...months].sort((a, b) => a - b).map((index) => MONTH_NAMES[index])
    ];
  }, [events]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSport = selectedSport === "All" || event.sport === selectedSport;
      const matchesCountry = selectedCountry === "All" || event.country === selectedCountry;
      const date = new Date(event.startsAt);
      const matchesMonth =
        selectedMonth === "All" ||
        (Number.isFinite(date.getTime()) &&
          MONTH_NAMES[date.getUTCMonth()] === selectedMonth);
      return matchesSport && matchesCountry && matchesMonth;
    });
  }, [events, selectedSport, selectedCountry, selectedMonth]);

  return (
    <div className="events-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <section className="events-hero">
        <h1>Major Events</h1>
        <p>
          Marathons, Grand Slams, cycling Monuments, Grand Prix and more — the world's
          biggest sports events, all in one place.
        </p>
      </section>
      <main className="events-main">
        <div className="events-filter-row">
          <label className="events-filter-field">
            <span>Sport</span>
            <select
              value={selectedSport}
              onChange={(event) => setSelectedSport(event.target.value)}
            >
              {sportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="events-filter-field">
            <span>Country</span>
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
            >
              {countryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="events-filter-field">
            <span>Month</span>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {(selectedSport !== "All" ||
            selectedCountry !== "All" ||
            selectedMonth !== "All") && (
            <button
              type="button"
              className="events-filter-reset"
              onClick={() => {
                setSelectedSport("All");
                setSelectedCountry("All");
                setSelectedMonth("All");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <p className="events-empty-state">Loading events…</p>
        ) : visibleEvents.length === 0 ? (
          <p className="events-empty-state">
            No events match those filters yet. Try a different sport, country, or month.
          </p>
        ) : (
          <div className="events-feed">
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        <p className="events-attribution">
          Event data from TheSportsDB, OpenF1 and Wikidata.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default EventsPage;
