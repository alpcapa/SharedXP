import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const DisclaimersPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Disclaimers Notice</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              This notice consolidates platform disclaimers applicable to SharedXP services. It is intended to improve
              policy transparency and should be read together with the Terms &amp; Conditions and linked legal policies.
            </p>

            <section className="legal-section">
              <h2>1. Marketplace Role Disclaimer</h2>
              <p>
                SharedXP is a technology platform connecting participants and hosts and is not the direct provider of
                each sport session, venue, transportation, equipment rental, or on-site supervision.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Risk and Safety Disclaimer</h2>
              <p>
                Participation in sports and outdoor activities involves inherent risk, including serious injury. Users
                remain responsible for personal readiness, informed participation, and adherence to local safety rules.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Insurance Disclaimer</h2>
              <p>
                SharedXP does not provide default medical, personal accident, travel, or host liability insurance unless
                explicitly stated for a specific program.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Third-Party Services Disclaimer</h2>
              <p>
                SharedXP may rely on independent providers for payments, identity checks, hosting, and communications.
                SharedXP is not responsible for independent provider outages, policy changes, or external decisions where
                legally permitted.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Warranty Disclaimer</h2>
              <p>
                The platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis to the maximum extent permitted by
                law. SharedXP does not guarantee uninterrupted operation, error-free services, or specific user
                outcomes.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Liability Scope</h2>
              <p>
                Nothing in this notice limits liability that cannot be excluded under applicable law. Subject to those
                non-excludable rights, liability limitations are governed by the Terms &amp; Conditions.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Related Legal Documents</h2>
              <ul>
                <li>
                  Terms &amp; Conditions: <a href="/terms-and-conditions">/terms-and-conditions</a>
                </li>
                <li>
                  Privacy Notice: <a href="/privacy-notice">/privacy-notice</a>
                </li>
                <li>
                  Payments and Payout Terms: <a href="/payments-and-payout-terms">/payments-and-payout-terms</a>
                </li>
                <li>
                  Safety and Risk Policy: <a href="/safety-and-risk-policy">/safety-and-risk-policy</a>
                </li>
                <li>
                  Content and Intellectual Property Policy: <a href="/content-and-intellectual-property-policy">/content-and-intellectual-property-policy</a>
                </li>
              </ul>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default DisclaimersPage;
