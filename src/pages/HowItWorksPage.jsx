import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const flowSteps = [
  {
    title: "1) Pick your sport + place",
    text: "Tell us what you want to play and where you're headed.",
    drawingLabel: "Cartoon showing you choosing from different sports.",
    drawing: `  ⚽  🎾  🚲
   \\  |  /
  [ You choose ]`
  },
  {
    title: "2) Meet matching locals",
    text: "We show friendly local buddies that match your vibe.",
    drawingLabel: "Flow from you to SharedXP and then to a local buddy.",
    drawing: ` [ You ] ---> [ SharedXP ] ---> [ Local buddy ]
   (^_^)         (smart match)         (^-^)`
  },
  {
    title: "3) Chat, confirm, book",
    text: "Agree on the details, then book with protected payment.",
    drawingLabel: "Cartoon showing two-way chat and a secure booking step.",
    drawing: ` You  <---- chat ---->  Buddy
   |                    |
   +---- secure book ---+`
  },
  {
    title: "4) Play and enjoy",
    text: "Show up, play together, and make a great memory.",
    drawingLabel: "Cartoon of two people high-fiving after playing.",
    drawing: `  o/            \\o
 /|   High-five!   |\\
 / \\              / \\`
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

            <div className="how-flow-grid">
              {flowSteps.map((step) => (
                <article key={step.title} className="how-flow-card">
                  <h3>{step.title}</h3>
                  <pre role="img" aria-label={step.drawingLabel}>
                    {step.drawing}
                  </pre>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="how-friendly-note">
            <h2 className="section-title">Why people like it</h2>
            <p>
              You get local knowledge, no heavy gear stress, and a sports buddy who makes your trip feel easy.
            </p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HowItWorksPage;
