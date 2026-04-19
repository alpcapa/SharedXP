import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const SafetyAndRiskPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Safety and Risk Policy</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              SharedXP prioritizes a safer community environment, while participants and hosts remain responsible for
              their own decisions, health readiness, and lawful conduct during experiences.
            </p>

            <section className="legal-section">
              <h2>1. Core Safety Principles</h2>
              <ul>
                <li>Communicate clearly about skill level, location, and session requirements before booking.</li>
                <li>Provide truthful profile and offering information.</li>
                <li>Respect local law, venue rules, and public-safety standards.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>2. Host Safety Duties</h2>
              <ul>
                <li>Assess session suitability for participant level and conditions.</li>
                <li>Disclose equipment, weather, terrain, and known hazards in advance.</li>
                <li>Stop or adjust a session where conditions become unsafe.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Participant Safety Duties</h2>
              <ul>
                <li>Assess personal fitness and medical suitability before joining activities.</li>
                <li>Follow safety instructions and use protective equipment where required.</li>
                <li>Do not participate while impaired by alcohol, drugs, or unsafe behavior.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Prohibited Conduct</h2>
              <ul>
                <li>Threats, harassment, discrimination, or abusive behavior.</li>
                <li>Fraud, impersonation, or deceptive safety claims.</li>
                <li>Any activity creating serious risk of harm to persons or property.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Incident Reporting and Response</h2>
              <p>
                Serious incidents should first be addressed through local emergency services where needed. Users should
                then report incidents through SharedXP channels with accurate evidence to support review actions.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Risk and Insurance Position</h2>
              <p>
                Sports activities involve inherent risk, including serious injury. SharedXP does not provide default
                personal accident or liability insurance unless expressly stated for a specific program.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default SafetyAndRiskPolicyPage;
