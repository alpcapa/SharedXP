import SiteHeader from "../components/SiteHeader";
import { Link } from "react-router-dom";
import { useState } from "react";

const locals = [
  {
    id: 1,
    name: "João",
    rating: "4.9",
    reviews: 32,
    location: "Lisbon, Portugal",
    tag: "Online",
    sport: "Cycling",
    description: "Love coastal rides & coffee stops ☕",
    bike: "Bike available",
    level: "Intermediate",
    price: "€30 per ride",
    image: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    id: 2,
    name: "Marta",
    rating: "5.0",
    reviews: 18,
    location: "Lisbon, Portugal",
    tag: "New",
    sport: "Cycling",
    description: "Gravel adventures & hidden trails.",
    bike: "Bike available",
    level: "Advanced",
    price: "€35 per ride",
    image: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    id: 3,
    name: "Rafael",
    rating: "4.8",
    reviews: 27,
    location: "Lisbon, Portugal",
    tag: "Online",
    sport: "Cycling",
    description: "Fast group rides, always pushing.",
    bike: "No bike",
    level: "Advanced",
    price: "€25 per ride",
    image: "https://randomuser.me/api/portraits/men/55.jpg"
  },
  {
    id: 4,
    name: "Inês",
    rating: "4.9",
    reviews: 21,
    location: "Lisbon, Portugal",
    tag: "Online",
    sport: "Cycling",
    description: "Relaxed pace, big climbs & good talks.",
    bike: "Bike available",
    level: "Intermediate",
    price: "€28 per ride",
    image: "https://randomuser.me/api/portraits/women/65.jpg"
  }
];

const sports = [
  { icon: "🚲", name: "Cycling", count: "1,248 locals" },
  { icon: "🎾", name: "Tennis", count: "842 locals" },
  { icon: "🏃", name: "Running", count: "643 locals" },
  { icon: "⚽", name: "Football", count: "512 locals" },
  { icon: "🏄", name: "Surfing", count: "320 locals" },
  { icon: "🏀", name: "Basketball", count: "211 locals" },
  { icon: "…", name: "More", count: "+8 sports" }
];

const steps = [
  {
    number: 1,
    title: "Find a buddy",
    text: "Browse locals by sport, location, and vibe.",
    art: "🗺️"
  },
  {
    number: 2,
    title: "Request & book",
    text: "Chat, agree on details, and book securely.",
    art: "📝"
  },
  {
    number: 3,
    title: "Meet & play",
    text: "Have an amazing time. We handle the payment.",
    art: "🤝"
  }
];

const HomePage = () => {
  const [activeSport, setActiveSport] = useState("Cycling");

  return (
    <div className="home-page">
      <section className="top-shell">
        <SiteHeader />
      </section>

      <main className="middle-section">
        <section className="locals-section">
          <div className="section-head">
            <div>
              <h1>Locals ready to play in Lisbon</h1>
              <p>Sports buddies near you. Real people. Real connections.</p>
            </div>
            <Link
              to="/"
              className="view-all-link"
              aria-label="View all locals in Lisbon"
            >
              View all
            </Link>
          </div>

          <div className="locals-row">
            {locals.map((local) => (
              <Link key={local.id} to={`/buddy/${local.id}`} className="local-card-link">
                <article className="local-card">
                  <div className="local-image-wrap">
                    <img src={local.image} alt={`Profile photo of ${local.name}`} />
                    <span className="status-pill">● {local.tag}</span>
                  </div>
                  <div className="local-content">
                    <h3>
                      {local.name}
                      <span>
                        ⭐ {local.rating} ({local.reviews})
                      </span>
                    </h3>
                    <p className="local-location">📍 {local.location}</p>
                    <span className="sport-pill">{local.sport}</span>
                    <p className="local-desc">{local.description}</p>
                    <ul>
                      <li>🚲 {local.bike}</li>
                      <li>🏃 {local.level}</li>
                      <li>💶 {local.price}</li>
                    </ul>
                  </div>
                </article>
              </Link>
            ))}
            <span className="carousel-next" aria-hidden="true">
              ›
            </span>
          </div>
        </section>

        <section className="sports-section">
          <h2>Explore by sport</h2>
          <p>All sports. All levels. All people.</p>

          <div className="sports-row">
            {sports.map((sport) => (
              <button
                key={sport.name}
                type="button"
                className={`sport-card${sport.name === activeSport ? " active" : ""}`}
                aria-pressed={sport.name === activeSport ? "true" : "false"}
                onClick={() => setActiveSport(sport.name)}
              >
                <div className="sport-icon">{sport.icon}</div>
                <h4>{sport.name}</h4>
                <span>{sport.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="how-it-works">
          <h2>How it works</h2>
          <p>Simple steps to connect and play.</p>

          <div className="steps-row">
            {steps.map((step) => (
              <article key={step.number} className="step-card">
                <div className="step-art">{step.art}</div>
                <h4>
                  <span>{step.number}</span> {step.title}
                </h4>
                <p>{step.text}</p>
              </article>
            ))}

            <article className="step-card payment-card">
              <h4>Fair payments, every time</h4>
              <p>
                You pay when you book. We hold the payment and release it after the
                experience.
              </p>
              <Link to="/">Learn more</Link>
              <div className="lock-badge">🔒</div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
