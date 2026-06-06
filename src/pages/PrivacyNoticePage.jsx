import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PrivacyNoticePage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Privacy Notice</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: June 6, 2026</p>
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
                <li>
                  <strong>Loyalty program data:</strong> XP (Experience Points) balances derived from booking
                  amounts (earned both as a guest paying for experiences and as a host delivering them), earning
                  history linked to your invoices, and usage of the Payment History feature. This data is used
                  to operate and display the SharedXP Loyalty Program.
                </li>
                <li>
                  <strong>Dispute data:</strong> submissions, evidence, communications, and outcomes related to
                  booking disputes opened by either guests or hosts. This data is retained to administer dispute
                  resolution, maintain audit records, and detect patterns of abuse.
                </li>
                <li>
                  <strong>Cancellation data:</strong> the cancellation policy selected by a host for each
                  offering, cancellation events, refund amounts, and timestamps. This data is used to process
                  refunds and enforce the applicable cancellation terms.
                </li>
                <li>
                  <strong>Field post content and reports:</strong> captions, photos, sport tags, and location
                  information published to The Field community feed; reports submitted by users flagging posts
                  as inappropriate; and moderation outcomes (suspension or removal of posts). This data is used
                  to operate the community feed, review flagged content, and detect patterns of abuse.
                </li>
                <li>
                  <strong>Account action history:</strong> records of account-level moderation actions
                  (suspension, closure, reopen), the dates those actions were taken, and the associated
                  administrative notes. This data is retained for audit, safety, and legal compliance purposes.
                </li>
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
                  <strong>Contract performance:</strong> account management, booking flow, host/participant
                  coordination, and loyalty program operation (XP calculation and display).
                </li>
                <li>
                  <strong>Legitimate interests:</strong> service reliability, platform safety, anti-fraud checks,
                  product quality improvements, and loyalty program integrity.
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
              <p>
                When an account is closed — whether by user request or platform action — a 30-day grace period
                applies before permanent deletion. During this window the account remains inactive but restorable
                upon request. After 30 days, the account and all associated personal data are permanently deleted.
                Transaction and legal records required for financial, tax, or safety obligations may be retained
                for longer periods as required by applicable law.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Your GDPR Rights</h2>
              <ul>
                <li>Access your personal data and request a copy.</li>
                <li>Request correction of inaccurate or incomplete personal data.</li>
                <li>
                  Request deletion where processing is no longer necessary or lawful. Account deletion requests
                  are processed via a 30-day closure and grace period, after which all personal data is
                  permanently erased (subject to legal retention requirements).
                </li>
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
