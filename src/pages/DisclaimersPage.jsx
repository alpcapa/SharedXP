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
              This notice consolidates key legal disclaimers relevant to using SharedXP. It is designed to clarify the
              platform role and limits of responsibility for marketplace interactions, payments, safety outcomes, and
              third-party dependencies.
            </p>

            <section className="legal-section">
              <h2>1. Platform Intermediary Disclaimer</h2>
              <p>
                SharedXP provides a technology marketplace that connects hosts and participants. Except where expressly
                stated, SharedXP is not the direct organizer, employer, operator, or on-site controller of activities
                listed by hosts.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Information and Listing Accuracy Disclaimer</h2>
              <p>
                Listing descriptions, host representations, user reviews, and other user-generated information may change
                over time and are provided by users. SharedXP does not guarantee completeness, legality, or suitability of
                all third-party statements.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Risk Assumption Disclaimer</h2>
              <p>
                Sports, outdoor, and physical activities involve inherent risks, including serious injury or property
                damage. Users are responsible for deciding whether participation is appropriate for their personal
                condition, skill, and circumstances.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Insurance Disclaimer</h2>
              <p>
                SharedXP does not provide default personal accident, health, travel, or host liability insurance unless
                explicitly stated for a specific program. Users should independently obtain coverage appropriate to their
                activities and local legal requirements.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Third-Party Services Disclaimer</h2>
              <p>
                SharedXP relies on independent partners for services such as payment processing, verification, hosting,
                communications, and analytics. SharedXP is not responsible for outages, policy changes, or operational
                decisions taken independently by those providers where legally permitted.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Availability and Warranty Disclaimer</h2>
              <p>
                SharedXP is offered on an &quot;as is&quot; and &quot;as available&quot; basis to the maximum extent permitted by law.
                We do not warrant uninterrupted availability, continuous compatibility, or error-free platform operation.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Limitation and Non-Excludable Rights</h2>
              <p>
                Nothing in this notice excludes liability that cannot be excluded under applicable law. Subject to those
                mandatory rights, limitations of liability are governed by the Terms &amp; Conditions.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Tax and Compliance Disclaimer</h2>
              <p>
                Hosts and participants remain responsible for understanding and complying with tax, permit, licensing,
                and regulatory obligations that apply to their use of the platform in relevant jurisdictions.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Related Legal Documents</h2>
              <ul>
                <li>
                  Terms &amp; Conditions: <a href="/terms-and-conditions">/terms-and-conditions</a>
                </li>
                <li>
                  Legal Center: <a href="/legal">/legal</a>
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
                  Content and Intellectual Property Policy:{" "}
                  <a href="/content-and-intellectual-property-policy">/content-and-intellectual-property-policy</a>
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
