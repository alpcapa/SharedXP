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
              This Privacy Notice describes how SharedXP processes personal data in line with EU data-protection
              principles, including lawfulness, fairness, transparency, purpose limitation, data minimization,
              accuracy, storage limitation, integrity, and confidentiality.
            </p>

            <section className="legal-section">
              <h2>1. Data Controller and Scope</h2>
              <p>
                SharedXP is the data controller for account, profile, booking, and support data processed through the
                platform. Some payment and identity checks are performed by independent third-party controllers or
                processors under separate terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Categories of Data</h2>
              <ul>
                <li>Identity and contact data (name, email, phone, city, country, profile photo).</li>
                <li>Account and security data (authentication records and account preferences).</li>
                <li>Booking and transaction metadata (session requests, confirmations, payouts, disputes).</li>
                <li>Communications and support records.</li>
                <li>Technical usage data required for security and service reliability.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Legal Bases for Processing</h2>
              <ul>
                <li>Performance of contract (account access, booking workflow, host operations).</li>
                <li>Legitimate interests (fraud prevention, platform security, quality improvements).</li>
                <li>Legal obligations (tax, anti-fraud, lawful requests from authorities).</li>
                <li>Consent where required (for optional communications or non-essential processing).</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Data Subject Rights (EU/EEA)</h2>
              <ul>
                <li>Right of access, rectification, and erasure where legally applicable.</li>
                <li>Right to restrict processing and right to data portability.</li>
                <li>Right to object to processing based on legitimate interests.</li>
                <li>Right to withdraw consent at any time for consent-based processing.</li>
                <li>Right to lodge a complaint with a competent supervisory authority.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Data Retention</h2>
              <p>
                SharedXP retains personal data only for as long as necessary for service operation, dispute resolution,
                legal compliance, and security. Retention periods vary by data type and legal obligations.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. International Transfers</h2>
              <p>
                Where personal data is transferred outside the EU/EEA, SharedXP applies appropriate safeguards such as
                Standard Contractual Clauses or equivalent legal mechanisms required by applicable law.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Automated Decision-Making</h2>
              <p>
                SharedXP may use limited automated checks for fraud and abuse prevention. Material decisions with legal
                or similarly significant effects include human review where required.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Contact for Privacy Requests</h2>
              <p>
                Privacy requests can be submitted through SharedXP support and legal communication channels available on
                the platform.
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
