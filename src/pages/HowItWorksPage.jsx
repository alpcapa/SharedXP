import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const flowSteps = [
  {
    icon: "⚽",
    text: "Tell us your sport and location preferences."
  },
  {
    icon: "🤝",
    text: "We match you with locals that fit your level and vibe."
  },
  {
    icon: "🌍",
    text: "Chat to confirm details, then book securely."
  },
  {
    icon: "🏅",
    text: "Meet, play, and enjoy your sports experience."
  }
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

const HowItWorksPage = () => {
  return (
    <div className="how-it-works-page">
      <div className="middle-page-frame">
        <section className="hero how-it-works-hero">
          <SiteHeader />
          <div className="how-it-works-intro">
            <h1>
              How SharedXP works<span className="dot">.</span>
            </h1>
            <p>Simple, friendly, and made for real people who love sports.</p>
          </div>
        </section>

        <main className="middle-section">
          <section className="how-flow-section">
            <h2 className="section-title">The flow</h2>
            <p className="section-sub">From idea to game day in a few easy steps.</p>

            <ol className="how-steps-list">
              {flowSteps.map((step, index) => (
                <li key={index} className="how-step-item">
                  <span className="how-step-icon" aria-hidden="true">
                    {step.icon}
                  </span>
                  <span className="how-step-number">{index + 1}.</span>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="how-friendly-note">
            <h2 className="section-title">Why people like it</h2>
            <p>
              You get local knowledge, no heavy gear stress, and a sports buddy who makes your trip feel easy.
            </p>
          </section>

          <section className="how-testimonials">
            <div className="how-testimonials-head">
              <h2 className="section-title">Testimonials</h2>
              <button type="button" className="testimonial-next-button" aria-label="See more testimonials">
                →
              </button>
            </div>
            <div className="testimonial-list">
              {testimonials.map((testimonial, index) => (
                <article key={index} className="testimonial-card">
                  <div className="testimonial-meta">
                    <img src={testimonial.avatar} alt={testimonial.name} className="testimonial-avatar" />
                    <div>
                      <h3>{testimonial.name}</h3>
                      <p>{testimonial.location}</p>
                    </div>
                  </div>
                  <blockquote className="testimonial-quote">{testimonial.quote}</blockquote>
                </article>
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HowItWorksPage;
