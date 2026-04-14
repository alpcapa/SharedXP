import { useState } from "react";
import BuddyCard from "../components/BuddyCard";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const sports = ["All sports", ...new Set(buddies.map((buddy) => buddy.sport))];
const locations = ["Anywhere", ...new Set(buddies.map((buddy) => buddy.location))];

const HomePage = () => {
  const [sport, setSport] = useState("Cycling");
  const [location, setLocation] = useState("Lisbon, Portugal");
  const [selectedDate, setSelectedDate] = useState("");

  const filtered = buddies.filter((buddy) => {
    const sportMatches = sport === "All sports" || buddy.sport === sport;
    const locationMatches = location === "Anywhere" || buddy.location === location;
    return sportMatches && locationMatches;
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
