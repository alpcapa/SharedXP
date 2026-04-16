import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const flowSteps = [
  "Tell us your sport and location preferences.",
  "We match you with locals that fit your level and vibe.",
  "Chat to confirm details, then book securely.",
  "Meet, play, and enjoy your sports experience."
];

const testimonials = [
  "\"I found a tennis buddy in one day and had the best morning match in Lisbon.\"",
  "\"Super easy process - from search to booking it felt smooth and clear.\"",
  "\"Traveling with no gear was no problem. My local host had everything ready.\""
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
                  <span className="how-step-number">{index + 1}.</span>
                  <p>{step}</p>
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
            <h2 className="section-title">Testimonials</h2>
            <div className="testimonial-list">
              {testimonials.map((quote, index) => (
                <blockquote key={index} className="testimonial-quote">
                  {quote}
                </blockquote>
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
