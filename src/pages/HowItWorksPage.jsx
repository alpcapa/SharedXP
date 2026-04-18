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

const HowItWorksPage = ({ currentUser, onLogout }) => {
  return (
    <div className="how-it-works-page">
      <div className="middle-page-frame">
        <section className="hero how-it-works-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          <div className="how-it-works-intro">
            <h1>
              How SharedXP works<span className="dot">.</span>
            </h1>
            <p>Simple, friendly, and made for real people who love sports.</p>
          </div>
        </section>

        <main className="middle-section">
          <section className="how-what-section">
            <h2 className="section-title">What is SharedXP?</h2>
            <div className="how-what-description">
              <p>
                SharedXP is an experience-sharing platform designed for sports enthusiasts who love to travel. When exploring new places, it’s often difficult to find opportunities to do what you enjoy most — whether that’s cycling, hiking, or any other sport. Carrying equipment while traveling can also be a major challenge. SharedXP solves these problems by connecting you with local people who are eager to welcome you and share their sports experiences wherever you go. You can join as a host — helping others do what they love while earning money — or sign up as a user to take part in unique, local experiences. No more missing out, carrying heavy gear, or feeling lost in a new place. With SharedXP, you can stay active, connected, and inspired — anywhere in the world.
              </p>
            </div>
            <blockquote className="how-what-quote">
              <p>
                “I am a triathlete who loves cycling, running and swimming. My first passion mountain biking is also
                something I cherish so much. But, there is a problem. Every time I travel, I have to stop doing some
                of the things I do regularly back home. So, I thought of this idea to engage locals to help travelers
                with their sport expertise, equipment and guidance. In return, hosts can make money for their service
                and travelers are more than happy to pay for it. It's a win-win for all. Both enjoy being with
                different people and create new experiences together.”
              </p>
              <footer className="how-what-attribution">Alp R. Capa — Founder/CEO</footer>
            </blockquote>
          </section>

          <section className="how-flow-section">
            <h2 className="section-title">How It Works?</h2>

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
            <div className="testimonial-paging" aria-label="Testimonials paging controls">
              <button type="button" className="testimonial-page-button" aria-label="See previous testimonials">
                ←
              </button>
              <button type="button" className="testimonial-page-button" aria-label="See more testimonials">
                →
              </button>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HowItWorksPage;
