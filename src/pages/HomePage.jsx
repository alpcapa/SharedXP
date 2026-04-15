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

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero">
          <SiteHeader />
          <div className="hero-content">
            <h1>
              Find your sports buddy<span className="dot">.</span>
              <br />
              Anywhere<span className="accent">.</span>
            </h1>
            <p>Join locals and travelers for unforgettable sports experiences.</p>
            <form
              className="search-bar"
              role="search"
              aria-label="Find sports buddies"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="search-field">
                <label htmlFor="sport-select">
                  <span>Sport</span>
                </label>
                <select id="sport-select" defaultValue="Cycling">
                  <option>Cycling</option>
                  <option>Tennis</option>
                  <option>Running</option>
                  <option>Football</option>
                  <option>Surfing</option>
                  <option>Basketball</option>
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="location-input">
                  <span>Location</span>
                </label>
                <input id="location-input" type="text" defaultValue="Lisbon, Portugal" />
              </div>
              <div className="search-field">
                <label htmlFor="date-input">
                  <span>Date</span>
                </label>
                <input id="date-input" type="date" />
              </div>
              <button type="submit" className="find-button" aria-label="Find buddies">
                Find
              </button>
            </form>
            <ul className="trust-points">
              <li>
                <span role="img" aria-label="Trusted community">
                  🔒
                </span>{" "}
                Trusted community
              </li>
              <li>
                <span role="img" aria-label="Secure payments">
                  💳
                </span>{" "}
                Secure payments
              </li>
              <li>
                <span role="img" aria-label="24/7 support">
                  🕓
                </span>{" "}
                24/7 support
              </li>
            </ul>
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
