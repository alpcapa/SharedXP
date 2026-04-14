import { useState } from "react";
import BuddyCard from "../components/BuddyCard";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const sports = ["All sports", ...new Set(buddies.map((buddy) => buddy.sport))];
const locations = ["Anywhere", ...new Set(buddies.map((buddy) => buddy.location))];
const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

const matchesAvailability = (schedule, selectedDate) => {
  if (!selectedDate) {
    return true;
  }

  const selectedDayIndex = new Date(`${selectedDate}T00:00:00`).getDay();
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

const HomePage = () => {
  const [sport, setSport] = useState("Cycling");
  const [location, setLocation] = useState("Lisbon, Portugal");
  const [selectedDate, setSelectedDate] = useState("");

  const filtered = buddies.filter((buddy) => {
    const sportMatches = sport === "All sports" || buddy.sport === sport;
    const locationMatches = location === "Anywhere" || buddy.location === location;
    const dateMatches = matchesAvailability(buddy.availabilitySchedule, selectedDate);
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
              <select value={sport} onChange={(event) => setSport(event.target.value)}>
                {sports.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="search-field">
              <span>Where</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                {locations.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="search-field">
              <span>When</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
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
