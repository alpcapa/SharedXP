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
  { name: "More", count: "+8 sports", icon: "⋯" }
];

const steps = [
  {
    title: "1. Find a buddy",
    text: "Browse locals by sport, location, and vibe.",
    icon: "🧭"
  },
  {
    title: "2. Request & book",
    text: "Chat, agree on details, and book securely.",
    icon: "💬"
  },
  {
    title: "3. Meet & play",
    text: "Have an amazing time. We handle the payment.",
    icon: "🤝"
  }
];

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <SiteHeader />

        <main className="middle-section">
          <section className="locals-section" id="locals">
            <div className="section-head">
              <div>
                <h1>Locals ready to play in Lisbon</h1>
                <p>Sports buddies near you. Real people. Real connections.</p>
              </div>
              <Link to="/#locals" className="view-all-link">
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
                        <span className="status-badge">{featuredStatuses[index]}</span>
                      </div>
                      <div className="local-body">
                        <div className="local-title-row">
                          <h3>{buddy.name}</h3>
                          <p>
                            ⭐ {buddy.rating} <span>({buddy.reviews.length})</span>
                          </p>
                        </div>
                        <p className="local-location">📍 {buddy.location}</p>
                        <p className="sport-pill">{buddy.sport}</p>
                        <p className="local-bio">{buddy.bio}</p>
                        <ul className="local-meta">
                          <li>{buddy.bikeAvailable ? "🚲 Bike available" : "🚲 No bike"}</li>
                          <li>🏅 {buddy.level}</li>
                          <li>💶 €{buddy.price} per ride</li>
                        </ul>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <button type="button" className="locals-next" aria-label="See more locals">
                ›
              </button>
            </div>
          </section>

          <section className="sports-section">
            <h2>Explore by sport</h2>
            <p>All sports. All levels. All people.</p>
            <div className="sports-scroll">
              {sports.map((sport) => (
                <article
                  key={sport.name}
                  className={`sport-chip${sport.active ? " active" : ""}`}
                >
                  <span>{sport.icon}</span>
                  <h3>{sport.name}</h3>
                  <p>{sport.count}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="how-section">
            <h2>How it works</h2>
            <p>Simple steps to connect and play.</p>
            <div className="how-grid">
              {steps.map((step) => (
                <article key={step.title} className="how-card">
                  <span className="how-icon" aria-hidden="true">
                    {step.icon}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
              <article className="how-card highlight">
                <h3>Fair payments, every time</h3>
                <p>
                  You pay when you book. We hold the payment and release it after the
                  experience.
                </p>
                <button type="button">Learn more</button>
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
