import { useState } from "react";
import BuddyCard from "../components/BuddyCard";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const sports = ["All sports", ...new Set(buddies.map((buddy) => buddy.sport))];
const locations = ["Anywhere", ...new Set(buddies.map((buddy) => buddy.location))];
const defaultSport = sports.includes("Cycling") ? "Cycling" : sports[0];
const defaultLocation = locations.includes("Lisbon, Portugal")
  ? "Lisbon, Portugal"
  : locations[0];
const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

const matchesAvailabilityForDay = (schedule, selectedDayIndex) => {
  const selectedDayName = dayNames[selectedDayIndex];
  const isWeekend = selectedDayIndex === 0 || selectedDayIndex === 6;
  const isWeekday = !isWeekend;
  const normalizedSchedule = schedule.join(" ").toLowerCase();

  if (normalizedSchedule.includes(selectedDayName)) {
    return true;
  }

  if (normalizedSchedule.includes("weekend") && isWeekend) {
    return true;
  }

  if (
    (normalizedSchedule.includes("weekdays") ||
      normalizedSchedule.includes("weeknights")) &&
    isWeekday
  ) {
    return true;
  }

  return false;
};

const matchesAvailability = (schedule, selectedDate) => {
  if (!selectedDate) {
    return true;
  }

  const [year, month, day] = selectedDate.split("-").map(Number);
  const selectedDayIndex = new Date(year, month - 1, day).getDay();
  return matchesAvailabilityForDay(schedule, selectedDayIndex);
};

const matchesAvailabilityInRange = (schedule, startDate, endDate) => {
  if (!startDate && !endDate) {
    return true;
  }

  if (!startDate || !endDate) {
    return matchesAvailability(schedule, startDate || endDate);
  }

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return true;
  }

  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const firstUtc = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate());
  const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const dayCount = Math.floor((lastUtc - firstUtc) / 86400000) + 1;

  if (dayCount >= 7) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (matchesAvailabilityForDay(schedule, dayIndex)) {
        return true;
      }
    }
    return false;
  }

  for (let offset = 0; offset < dayCount; offset += 1) {
    const dayIndex = (first.getDay() + offset) % 7;
    if (matchesAvailabilityForDay(schedule, dayIndex)) {
      return true;
    }
  }

  return false;
};

const HomePage = () => {
  const [sport, setSport] = useState(defaultSport);
  const [location, setLocation] = useState(defaultLocation);
  const [sportMenuOpen, setSportMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [sportSearch, setSportSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredSports = sports.filter((name) =>
    name.toLowerCase().includes(sportSearch.toLowerCase())
  );
  const filteredLocations = locations.filter((name) =>
    name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filtered = buddies.filter((buddy) => {
    const sportMatches = sport === "All sports" || buddy.sport === sport;
    const locationMatches = location === "Anywhere" || buddy.location === location;
    const dateMatches = matchesAvailabilityInRange(
      buddy.availabilitySchedule,
      startDate,
      endDate
    );
    return sportMatches && locationMatches && dateMatches;
  });

  return (
    <div className="home-page">
      <section className="hero">
        <SiteHeader />
        <div className="hero-content">
          <h1>
            Find your
            <br />
            sports buddy<span className="dot">.</span>
            <br />
            <span className="accent">Anywhere.</span>
          </h1>
          <p>
            Connect with locals who love the same sports.
            <br />
            Share gear, good vibes, and unforgettable moments.
          </p>

          <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
            <label className="search-field">
              <span>Sport</span>
              <button
                type="button"
                className="dropdown-toggle"
                onClick={() => {
                  setSportMenuOpen((isOpen) => !isOpen);
                  setLocationMenuOpen(false);
                }}
              >
                {sport}
              </button>
              {sportMenuOpen && (
                <div className="dropdown-menu">
                  <input
                    type="text"
                    className="option-search"
                    placeholder="Search sports"
                    value={sportSearch}
                    onChange={(event) => setSportSearch(event.target.value)}
                  />
                  <div className="option-list">
                    {(filteredSports.length ? filteredSports : sports).map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={`option-item${name === sport ? " selected" : ""}`}
                        onClick={() => {
                          setSport(name);
                          setSportMenuOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </label>

            <label className="search-field">
              <span>Where</span>
              <button
                type="button"
                className="dropdown-toggle"
                onClick={() => {
                  setLocationMenuOpen((isOpen) => !isOpen);
                  setSportMenuOpen(false);
                }}
              >
                {location}
              </button>
              {locationMenuOpen && (
                <div className="dropdown-menu">
                  <input
                    type="text"
                    className="option-search"
                    placeholder="Search cities"
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                  />
                  <div className="option-list">
                    {(filteredLocations.length ? filteredLocations : locations).map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={`option-item${name === location ? " selected" : ""}`}
                        onClick={() => {
                          setLocation(name);
                          setLocationMenuOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </label>

            <label className="search-field">
              <span>When (between 2 dates)</span>
              <div className="date-range">
                <input
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <span className="range-separator">to</span>
                <input
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </label>

            <button type="submit" className="find-button">
              Find Buddies
            </button>
          </form>

          <ul className="trust-points">
            <li>✨ Real people, not tours</li>
            <li>💫 Gear sharing</li>
            <li>🔒 Secure payments</li>
            <li>🧭 Reviewed & trusted</li>
          </ul>
        </div>
      </section>

      <section className="results-section">
        <div className="grid">
          {filtered.map((buddy) => (
            <BuddyCard key={buddy.id} buddy={buddy} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
