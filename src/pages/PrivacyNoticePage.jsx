import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PrivacyNoticePage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Privacy Notice</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              This Privacy Notice explains how SharedXP collects and uses personal data for account access, host
              onboarding, booking workflows, support, and platform security. It is drafted using GDPR transparency
              standards and should be read together with our Terms &amp; Conditions and related legal policies.
            </p>

            <section className="legal-section">
              <h2>1. Controller Identity and Scope</h2>
              <p>
                SharedXP acts as the data controller for personal data processed through the platform experience,
                including registration, profile setup, booking requests, and platform communications. Independent payment
                processors or verification providers may act as separate controllers for their own processing activities.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Data We Collect</h2>
              <ul>
                <li>Identity and account data (name, email, login credentials, profile image, city, country).</li>
                <li>Booking and operational data (requests, confirmations, cancellations, support records).</li>
                <li>Host operations data (offer details, schedule information, payout setup metadata).</li>
                <li>Technical and security data (device/browser logs, authentication events, anti-abuse signals).</li>
                <li>Communications data (messages submitted via support or legal contact channels).</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Data Sources</h2>
              <ul>
                <li>Directly from you during registration, profile editing, booking, and support interactions.</li>
                <li>From other users where necessary for booking coordination and dispute handling.</li>
                <li>From service providers supporting payments, fraud prevention, and infrastructure security.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Purposes and Legal Bases</h2>
              <ul>
                <li>
                  <strong>Contract performance:</strong> account management, booking flow, and host/participant
                  coordination.
                </li>
                <li>
                  <strong>Legitimate interests:</strong> service reliability, platform safety, anti-fraud checks, and
                  product quality improvements.
                </li>
                <li>
                  <strong>Legal obligations:</strong> tax, anti-money-laundering, legal notices, and lawful authority
                  requests.
                </li>
                <li>
                  <strong>Consent:</strong> optional communications and non-essential processing where consent is
                  required.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Sharing of Personal Data</h2>
              <p>
                SharedXP shares data only where necessary with infrastructure providers, payment processors, fraud and
                verification partners, customer-support tools, and authorities where legally required. We require
                processors to apply appropriate confidentiality and security controls.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. International Transfers</h2>
              <p>
                When personal data is transferred outside the EU/EEA, SharedXP uses legally recognized safeguards such as
                adequacy decisions or Standard Contractual Clauses and applies supplementary controls where needed.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Data Retention</h2>
              <p>
                We retain personal data only for as long as needed for account operation, transaction history,
                safety/security controls, dispute handling, and legal record-keeping. Retention periods vary by data type
                and applicable legal obligations.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Your GDPR Rights</h2>
              <ul>
                <li>Access your personal data and request a copy.</li>
                <li>Request correction of inaccurate or incomplete personal data.</li>
                <li>Request deletion where processing is no longer necessary or lawful.</li>
                <li>Object to processing based on legitimate interests.</li>
                <li>Request restriction of processing in specific circumstances.</li>
                <li>Receive portable data for transfer where legally applicable.</li>
                <li>Withdraw consent at any time for consent-based processing.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>9. Automated Checks</h2>
              <p>
                SharedXP may use limited automated signals for fraud and abuse prevention. Where a decision could produce
                legal or similarly significant effects, human review is provided where required by law.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Security Measures</h2>
              <p>
                SharedXP applies organizational and technical safeguards designed to protect personal data against
                unauthorized access, loss, alteration, and misuse. No online service is completely risk-free, so users
                should also maintain secure credentials and account practices.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Complaints and Supervisory Authorities</h2>
              <p>
                If you believe your data rights were not respected, you may contact SharedXP first for resolution and may
                also lodge a complaint with a competent EU/EEA data protection authority.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Contact and Policy Updates</h2>
              <p>
                Privacy requests can be submitted through SharedXP support/legal channels. We may update this notice from
                time to time and will publish the effective date on this page.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default PrivacyNoticePage;
