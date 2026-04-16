import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const featuredStatuses = ["Online", "New", "Online", "Online"];
const featuredLocals = buddies.slice(0, 4);

const sports = [
  { name: "Cycling", count: "1,248 locals", icon: "🚲", active: true },
  { name: "Tennis", count: "842 locals", icon: "🎾" },
  { name: "Running", count: "643 locals", icon: "🏃" },
  { name: "Football", count: "512 locals", icon: "⚽" },
  { name: "Surfing", count: "320 locals", icon: "🏄" },
  { name: "Basketball", count: "211 locals", icon: "🏀" },
  { name: "More", count: "+8 sports", icon: "···" }
];

const steps = [
  {
    stepNum: 1,
    title: "1. Find a buddy",
    text: "Browse locals by sport, location, and vibe.",
    img: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 2,
    title: "2. Request & book",
    text: "Chat, agree on details, and book securely.",
    img: "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 3,
    title: "3. Meet & play",
    text: "Have an amazing time. We handle the payment.",
    img: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=500&h=220&q=80"
  }
];

const sportOptions = ["Cycling", "Tennis", "Running", "Football", "Surfing", "Basketball"];

const locationOptions = [
  "Lisbon, Portugal",
  "Porto, Portugal",
  "Madrid, Spain",
  "Barcelona, Spain",
  "Paris, France",
  "Berlin, Germany",
  "Rome, Italy"
];

const LockIcon = () => (
  <svg
    className="lock-icon"
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    aria-hidden="true"
  >
    <rect x="12" y="34" width="48" height="30" rx="7" stroke="#6ca43b" strokeWidth="3" />
    <path
      d="M24 34V24a12 12 0 0124 0v10"
      stroke="#6ca43b"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="36" cy="49" r="4" fill="#6ca43b" />
    <line x1="36" y1="53" x2="36" y2="58" stroke="#6ca43b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const HomePage = ({ currentUser, onLogout }) => {
  const [selectedSport, setSelectedSport] = useState("Cycling");
  const [selectedLocation, setSelectedLocation] = useState("Lisbon, Portugal");
  const [sportQuery, setSportQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const searchBarRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchBarRef.current?.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const filteredSports = useMemo(() => {
    if (!sportQuery.trim()) {
      return sportOptions.slice(0, 5);
    }

    return sportOptions
      .filter((sport) => sport.toLowerCase().includes(sportQuery.toLowerCase()))
      .slice(0, 5);
  }, [sportQuery]);

  const filteredLocations = useMemo(() => {
    if (!locationQuery.trim()) {
      return locationOptions.slice(0, 5);
    }

    return locationOptions
      .filter((location) => location.toLowerCase().includes(locationQuery.toLowerCase()))
      .slice(0, 5);
  }, [locationQuery]);

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          <div className="hero-content">
            <h1>
              Find your sports buddy<span className="dot">.</span>
              <br />
              Anywhere<span className="accent">.</span>
            </h1>
            <p>Join locals and travelers for unforgettable sports experiences.</p>
            <div className="search-bar" role="search" aria-label="Find sports buddies" ref={searchBarRef}>
              <div className="search-field">
                <label id="sport-label" htmlFor="sport-select">
                  Sport
                </label>
                <button
                  id="sport-select"
                  type="button"
                  className="dropdown-toggle"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "sport"}
                  aria-labelledby="sport-label"
                  onClick={() =>
                    setOpenDropdown((currentDropdown) =>
                      currentDropdown === "sport" ? null : "sport"
                    )
                  }
                >
                  {selectedSport}
                  <span className="dropdown-caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {openDropdown === "sport" && (
                  <div className="dropdown-menu">
                    <input
                      id="sport-search"
                      type="text"
                      className="option-search"
                      aria-label="Search sports"
                      placeholder="Search sport"
                      value={sportQuery}
                      onChange={(event) => setSportQuery(event.target.value)}
                    />
                    <div className="option-list" role="listbox" aria-label="Sport options">
                      {filteredSports.map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          role="option"
                          aria-selected={selectedSport === sport}
                          className={`option-item${selectedSport === sport ? " selected" : ""}`}
                          onClick={() => {
                            setSelectedSport(sport);
                            setOpenDropdown(null);
                            setSportQuery("");
                          }}
                        >
                          {sport}
                        </button>
                      ))}
                      {!filteredSports.length && (
                        <p className="option-empty">No sport found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="search-field">
                <label id="location-label" htmlFor="location-select">
                  Location
                </label>
                <button
                  id="location-select"
                  type="button"
                  className="dropdown-toggle"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "location"}
                  aria-labelledby="location-label"
                  onClick={() =>
                    setOpenDropdown((currentDropdown) =>
                      currentDropdown === "location" ? null : "location"
                    )
                  }
                >
                  {selectedLocation}
                  <span className="dropdown-caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {openDropdown === "location" && (
                  <div className="dropdown-menu">
                    <input
                      id="location-search"
                      type="text"
                      className="option-search"
                      aria-label="Search locations"
                      placeholder="Search location"
                      value={locationQuery}
                      onChange={(event) => setLocationQuery(event.target.value)}
                    />
                    <div className="option-list" role="listbox" aria-label="Location options">
                      {filteredLocations.map((location) => (
                        <button
                          key={location}
                          type="button"
                          role="option"
                          aria-selected={selectedLocation === location}
                          className={`option-item${
                            selectedLocation === location ? " selected" : ""
                          }`}
                          onClick={() => {
                            setSelectedLocation(location);
                            setOpenDropdown(null);
                            setLocationQuery("");
                          }}
                        >
                          {location}
                        </button>
                      ))}
                      {!filteredLocations.length && (
                        <p className="option-empty">No location found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="search-field">
                <label id="date-label" htmlFor="date-from">
                  Date
                </label>
                <div className="date-range">
                  <input
                    id="date-from"
                    className="date-input"
                    type="date"
                    value={dateFrom}
                    aria-label="From date"
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                  <span className="range-separator">to</span>
                  <input
                    id="date-to"
                    className="date-input"
                    type="date"
                    value={dateTo}
                    aria-label="To date"
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </div>
              </div>
              <button type="button" className="find-button" aria-label="Find buddies">
                Find Buddies
              </button>
            </div>
          </div>
        </section>

        <main className="middle-section">
          {/* ── Locals ───────────────────────────────────────── */}
          <section className="locals-section" id="locals">
            <div className="section-head">
              <div>
                <h2 className="section-title">Locals ready to play in Lisbon</h2>
                <p className="section-sub">
                  Sports buddies near you. Real people. Real connections.
                </p>
              </div>
              <Link to="/locals" className="view-all-link">
                View all
              </Link>
            </div>

            <div className="locals-grid-wrap">
              <div className="locals-grid">
                {featuredLocals.map((buddy, index) => (
                  <Link to={`/buddy/${buddy.id}`} key={buddy.id} className="local-card-link">
                    <article className="local-card">
                      <div className="local-image-wrap">
                        <img src={buddy.image} alt={buddy.name} />
                        <span className="status-badge">
                          <span className="status-dot" />
                          {featuredStatuses[index]}
                        </span>
                      </div>
                      <div className="local-body">
                        <div className="local-title-row">
                          <h3>{buddy.name}</h3>
                          <p className="local-rating">
                            <span className="star">★</span> {buddy.rating}{" "}
                            <span className="review-count">({buddy.reviewCount})</span>
                          </p>
                        </div>
                        <p className="local-location">📍 {buddy.location}</p>
                        <span className="sport-pill">{buddy.sport}</span>
                        <p className="local-bio">{buddy.bio}</p>
                        <ul className="local-meta">
                          <li>🚲 {buddy.bikeAvailable ? "Bike available" : "No bike"}</li>
                          <li>🏅 {buddy.level}</li>
                          <li>💶 €{buddy.price} per ride</li>
                        </ul>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <Link to="/locals" className="locals-next" aria-label="See more locals">
                ›
              </Link>
            </div>
          </section>

          {/* ── Explore by sport ─────────────────────────────── */}
          <section className="sports-section">
            <h2 className="section-title">Explore by sport</h2>
            <p className="section-sub">All sports. All levels. All people.</p>
            <div className="sports-scroll">
              {sports.map((sport) => (
                <article
                  key={sport.name}
                  className={`sport-chip${sport.active ? " active" : ""}`}
                >
                  <span className="sport-icon">{sport.icon}</span>
                  <h3>{sport.name}</h3>
                  <p>{sport.count}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────── */}
          <section className="how-section">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">Simple steps to connect and play.</p>
            <div className="how-grid">
              {steps.map((step) => (
                <article key={step.title} className="how-card">
                  <div className="how-step-img-wrap">
                    <img src={step.img} alt="" className="how-step-img" />
                    <span className="step-badge">{step.stepNum}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
              <article className="how-card how-highlight">
                <div className="how-highlight-body">
                  <h3>Fair payments, every time</h3>
                  <p>
                    You pay when you book. We hold the payment and release it after the
                    experience.
                  </p>
                  <a href="/how-it-works" className="learn-more-link">
                    Learn more
                  </a>
                </div>
                <LockIcon />
              </article>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HomePage;
