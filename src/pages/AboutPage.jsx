import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const howSteps = [
  { icon: "⚽", text: "Tell us your sport and location preferences." },
  { icon: "🤝", text: "We match you with locals that fit your level and vibe." },
  { icon: "🌍", text: "Chat to confirm details, then book securely." },
  { icon: "🏅", text: "Meet, play, and enjoy your sports experience." },
];

const makeAvatar = (bgColor, accentColor, initials) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bgColor}" />
          <stop offset="100%" stop-color="${accentColor}" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="18" fill="url(#g)" />
      <circle cx="60" cy="45" r="20" fill="#f8efe2" />
      <path d="M20 104c7-24 26-36 40-36s33 12 40 36" fill="#f8efe2" />
    </svg>`
  )}`;

const testimonials = [
  {
    name: "Sofia M.",
    location: "Lisbon",
    avatar: makeAvatar("#8cbf57", "#5a9332", "SM"),
    quote: "\"I found a tennis buddy in one day and had the best morning match in Lisbon.\""
  },
  {
    name: "Daniel R.",
    location: "Barcelona",
    avatar: makeAvatar("#78a7d9", "#3d77b7", "DR"),
    quote: "\"Super easy process - from search to booking it felt smooth and clear.\""
  },
  {
    name: "Mina T.",
    location: "Bali",
    avatar: makeAvatar("#cc9ad8", "#8f5ca9", "MT"),
    quote: "\"Traveling with no gear was no problem. My local host had everything ready.\""
  }
];

const AboutPage = ({ currentUser, onLogout }) => {
  return (
    <div className="about-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />

      <main>
        <section className="about-hero">
          <h1>Sport doesn't stop when you travel. Neither should you.</h1>
          <p className="about-hero-sub">
            SharedXP connects sports-loving travelers with local people who share their
            passion — their knowledge, their routes, and their gear.
          </p>
          <img
            className="about-hero-img"
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80"
            alt="Travelers enjoying outdoor sport activity"
          />
        </section>

        <section className="about-story">
          <p className="about-label">Our story</p>
          <h2>It started with a problem.</h2>
          <p>
            Alp Capa is a triathlete. Cycling, running, swimming — and mountain biking
            above all. But every time he travelled for work or pleasure, the same thing
            happened: the bike stayed home. Or he didn't feel safe to explore new trails
            alone. The sports that define his daily life were impossible to keep up on
            the road.
          </p>
          <p>
            He wasn't alone. Millions of active people travel every year and quietly give
            up the thing they love most — because carrying equipment is a hassle, because
            they don't know the local routes, and because doing sport alone in a new city
            isn't the same as doing it with someone who knows the place.
          </p>
          <p>
            So he built SharedXP. Not a gear rental app. Not a tourist activity platform.
            Something more human than that — a way to find the person in Lisbon who cycles
            the waterfront every Saturday morning, the tennis player in Barcelona who's
            always looking for a hitting partner, the runner in Berlin who knows every
            trail through Tiergarten. People who do what you do, where you are, and who
            are happy to share it.
          </p>
          <figure className="about-founder">
            <img
              className="about-founder-photo"
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80"
              alt="Alp R. Capa"
            />
            <figcaption>
              <p className="about-founder-name">Alp R. Capa</p>
              <p className="about-founder-title">Founder &amp; CEO, SharedXP</p>
            </figcaption>
          </figure>
        </section>

        <section className="about-steps">
          <p className="about-label">How it works</p>
          <h2>Four simple steps.</h2>
          <ol className="about-steps-list">
            {howSteps.map((step, index) => (
              <li key={index} className="about-step-item">
                <span className="about-step-icon" aria-hidden="true">{step.icon}</span>
                <span className="about-step-number">{index + 1}.</span>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-split">
          <p className="about-label">Who it's for</p>
          <h2>Built for two kinds of people.</h2>
          <div className="about-split-grid">
            <article className="about-split-card">
              <span className="about-card-icon" aria-hidden="true">✈️</span>
              <h3>For Travelers</h3>
              <p>
                You find a local who does your sport at your level. You book a session,
                show up, and play. No gear to carry. No guesswork about where to go.
                Just your sport, in a new city, with someone who makes it feel like home.
              </p>
              <Link to="/locals" className="about-split-link">Find a local →</Link>
            </article>
            <article className="about-split-card">
              <span className="about-card-icon" aria-hidden="true">🏅</span>
              <h3>For Hosts</h3>
              <p>
                You do what you already love — and earn from it. Share your routes, your
                court time, your local knowledge. Meet interesting people from around the
                world. Every session is a chance to connect, and every booking puts money
                in your pocket for something you'd be doing anyway.
              </p>
              <Link to="/become-a-host" className="about-split-link">Become a host →</Link>
            </article>
          </div>
        </section>

        <section className="about-testimonials">
          <p className="about-label">What people say</p>
          <h2>Real experiences.</h2>
          <div className="about-testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <article key={index} className="about-testimonial-card">
                <div className="about-testimonial-meta">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="about-testimonial-avatar"
                  />
                  <div>
                    <h3>{testimonial.name}</h3>
                    <p>{testimonial.location}</p>
                  </div>
                </div>
                <blockquote className="about-testimonial-quote">
                  {testimonial.quote}
                </blockquote>
              </article>
            ))}
          </div>
        </section>

        <section className="about-values">
          <p className="about-label">What we believe</p>
          <h2>Our values.</h2>
          <div className="about-values-grid">
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">🌍</span>
              <h3>Local knowledge, not tourist traps</h3>
              <p>
                Every host is a real local who knows their sport and their city. You get
                routes, spots, and tips you'd never find on a travel blog.
              </p>
            </article>
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">🤝</span>
              <h3>Trust built into every session</h3>
              <p>
                Verified profiles, structured reviews, and secure payments mean both
                sides are protected — before, during, and after every experience.
              </p>
            </article>
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">🏅</span>
              <h3>Every sport, every level</h3>
              <p>
                Cycling, tennis, running, surfing, football, basketball — and more.
                Whether you're a beginner or a seasoned athlete, there's a local who
                matches your pace.
              </p>
            </article>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-cta-grid">
            <div className="about-cta-block">
              <h3>Ready to play?</h3>
              <p>Find a local sports buddy at your next destination.</p>
              <Link to="/locals" className="btn btn-primary about-cta-btn">
                Explore locals
              </Link>
            </div>
            <div className="about-cta-block">
              <h3>Love your sport? Share it.</h3>
              <p>Turn what you already do into an experience worth booking.</p>
              <Link to="/become-a-host" className="btn btn-primary about-cta-btn">
                Become a host
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AboutPage;
