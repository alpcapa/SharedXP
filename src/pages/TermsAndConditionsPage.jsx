import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const TermsAndConditionsPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section legal-content">
          <article className="simple-page legal-page">
            <h1>Terms &amp; Conditions</h1>
            <p className="legal-last-updated">Last updated: May 18, 2026</p>
            <p>
              These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of the SharedXP platform
              (the &quot;Platform&quot;), including the website, product features, and related services. By using
              SharedXP, you agree to these Terms.
            </p>

            <section className="legal-section">
              <h2>1. About SharedXP</h2>
              <p>
                SharedXP is a consumer-to-consumer experience-sharing platform that connects travelers and locals
                for sport activities and related guidance. SharedXP may provide discovery, profile, booking request,
                experience history, and related host onboarding tools.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Eligibility and Account Registration</h2>
              <ul>
                <li>You must be legally capable of entering into a binding agreement in your jurisdiction.</li>
                <li>You must provide accurate, current, and complete account information.</li>
                <li>
                  You are responsible for maintaining the confidentiality of your credentials and account activity.
                </li>
                <li>You must promptly update account data if it changes.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. User Roles</h2>
              <p>SharedXP supports two primary roles:</p>
              <ul>
                <li>
                  <strong>Traveler/Participant</strong>: Browses host profiles and submits booking requests.
                </li>
                <li>
                  <strong>Host</strong>: Creates host settings, sports offerings, pricing, availability, and payout
                  information.
                </li>
              </ul>
              <p>
                By using either role, you agree to act honestly, communicate clearly, and comply with these Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Booking Requests and Experience Participation</h2>
              <ul>
                <li>Booking requests are subject to host availability and confirmation workflow.</li>
                <li>
                  Experience details (sport type, date, time, level, location, equipment, and pricing) should be
                  confirmed by participants and hosts before participation.
                </li>
                <li>
                  SharedXP may provide confirmation and history tools, but users remain responsible for attending
                  agreed sessions and honoring commitments.
                </li>
                <li>
                  Each host selects a cancellation policy (Flexible, Moderate, or Strict) for their offering. The
                  applicable policy is displayed to guests before checkout and governs refund entitlement in the
                  event of cancellation.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4a. Cancellation Policy</h2>
              <p>
                Guests may cancel a confirmed booking through the platform. The refund amount depends on the
                host's chosen cancellation policy and the time remaining before the session:
              </p>
              <ul>
                <li>
                  <strong>Flexible:</strong> full refund if cancelled more than 24 hours before the session; no
                  refund within 24 hours.
                </li>
                <li>
                  <strong>Moderate:</strong> full refund if cancelled more than 5 days before; 50% refund if
                  cancelled 1–5 days before; no refund within 24 hours.
                </li>
                <li>
                  <strong>Strict:</strong> 50% refund if cancelled more than 7 days before; no refund within 7
                  days.
                </li>
              </ul>
              <p>
                If the host cancels a confirmed booking, the guest receives a full refund regardless of tier. Full
                details are available at{" "}
                <Link to="/cancellation-policy">/cancellation-policy</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. XP Loyalty Program</h2>
              <p>
                SharedXP operates a loyalty reward system called <strong>XP (Experience Points)</strong>.
                XP is a non-monetary benefit awarded to all platform participants — both guests and
                hosts — for activity on the Platform.
              </p>
              <ul>
                <li>
                  XP is earned in <strong>Normalized Spending Units (NSU)</strong>: each NSU of the
                  gross booking amount earns both the guest (the paying participant) and the host{" "}
                  <strong>1 XP Point each</strong>. The conversion rates are: $1 USD = 1 XP, €1 EUR
                  = 1 XP, ¥100 JPY = 1 XP, ₺40 TRY = 1 XP, ₩1,000 KRW = 1 XP. Fractional NSU are
                  rounded up. Hosts and guests always earn equal XP on every shared experience.
                </li>
                <li>
                  XP is awarded at the time of payment and is displayed in each user's Payment History
                  (for both bookings made and sessions hosted).
                </li>
                <li>
                  XP Points have <strong>no monetary value</strong> and cannot be exchanged for cash,
                  credit, or transferred to another account.
                </li>
                <li>
                  SharedXP reserves the right to modify, suspend, or discontinue the XP program at any
                  time, including adjusting earning rates, redemption rules, or expiry conditions, with
                  reasonable notice where practicable.
                </li>
                <li>
                  XP earned through fraudulent, reversed, or disputed transactions that result in a
                  refund may be reclaimed by SharedXP from both the guest and host accounts involved.
                </li>
                <li>
                  The XP program is in its foundation phase. Additional benefits, tiers, and redemption
                  mechanisms will be communicated when introduced.
                </li>
              </ul>
              <p>
                Full details on how XP is calculated and displayed are available in your{" "}
                <Link to="/payment-history">Payment History</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Pricing, Payments, and Payouts</h2>
              <p>
                Detailed payment and payout processing terms are available at{" "}
                <Link to="/payments-and-payout-terms">/payments-and-payout-terms</Link>.
              </p>
              <ul>
                <li>Hosts are responsible for setting accurate pricing and payout details.</li>
                <li>
                  Where payment functionality is made available, transactions may involve third-party providers.
                </li>
                <li>
                  SharedXP may hold, release, or otherwise process payment states based on completion workflows and
                  applicable platform rules.
                </li>
                <li>
                  Users are responsible for taxes, banking compliance, and legal obligations that apply to their use
                  of the Platform.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>7. Host Responsibilities</h2>
              <ul>
                <li>Provide truthful information about identity, sport expertise, availability, and equipment.</li>
                <li>Maintain safe and suitable conditions for hosted experiences.</li>
                <li>Respect participants and avoid discriminatory, abusive, or misleading behavior.</li>
                <li>Comply with all applicable local laws, permits, and safety requirements.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>8. Participant Responsibilities</h2>
              <ul>
                <li>Provide accurate booking and profile information.</li>
                <li>Assess your physical readiness and medical suitability before participating in activities.</li>
                <li>Follow host instructions and local rules during experiences.</li>
                <li>Treat hosts, other users, and property with respect.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>8a. Dispute Resolution</h2>
              <p>
                If a guest believes a completed session was materially different from what was agreed, or if either
                party has an unresolved concern about a booking, a dispute may be opened through the platform after
                the session is completed. The following process applies:
              </p>
              <ul>
                <li>The disputing party submits details and supporting evidence via the dispute form.</li>
                <li>
                  The host is notified and given a response window to provide their account of events and any
                  counter-evidence.
                </li>
                <li>
                  SharedXP administrators review the submission and determine an outcome, which may include a full
                  or partial refund, XP adjustment, or no change to the original settlement.
                </li>
                <li>
                  Parties must cooperate honestly and provide accurate information. Submitting false or misleading
                  evidence may result in account suspension.
                </li>
              </ul>
              <p>
                SharedXP's determination is final within platform processes. External legal remedies are not
                affected by these internal dispute mechanisms.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Safety, Risk Assumption, and Conduct</h2>
              <p>
                Sports and outdoor activities can involve physical risk. By participating in any experience, you
                understand and accept those risks. SharedXP is not an insurer, coach, medical provider, or event
                organizer for each session, and users are responsible for their own decisions, preparation, and
                behavior.
              </p>
              <p>
                Detailed safety standards are available at <Link to="/safety-and-risk-policy">/safety-and-risk-policy</Link>.
              </p>
              <p>You must not use the Platform for unlawful, fraudulent, harmful, or abusive activity.</p>
            </section>

            <section className="legal-section">
              <h2>10. User Content, Reviews, and Media</h2>
              <p>
                Content rights and infringement process details are available at{" "}
                <Link to="/content-and-intellectual-property-policy">/content-and-intellectual-property-policy</Link>.
              </p>
              <ul>
                <li>
                  You retain ownership of the content you submit (such as photos, profile data, and reviews), but
                  grant SharedXP a non-exclusive right to display and process that content for platform operation.
                </li>
                <li>You must have rights to all content you upload and must not infringe third-party rights.</li>
                <li>Reviews must be honest and not defamatory, misleading, or abusive.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>11. Prohibited Activities</h2>
              <ul>
                <li>Impersonation, identity fraud, or false profile information.</li>
                <li>Harassment, hate speech, threats, or violent behavior.</li>
                <li>Posting illegal, infringing, or malicious content.</li>
                <li>Attempting to disrupt, reverse engineer, or misuse platform systems.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>12. Suspension and Termination</h2>
              <p>
                SharedXP may suspend or terminate access to the Platform for violations of these Terms, suspected
                fraud, safety concerns, legal requirements, or operational reasons. You may stop using the Platform at
                any time.
              </p>
            </section>

            <section className="legal-section">
              <h2>13. Data and Privacy</h2>
              <p>
                SharedXP processes account and usage data to provide platform functionality. Some features in this
                product store data locally in your browser environment. By using the Platform, you agree to such
                processing as required to operate account, booking, host, and history functions.
              </p>
              <p>
                Full privacy terms are available at <Link to="/privacy-notice">/privacy-notice</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2>14. Disclaimers</h2>
              <p>
                The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any
                kind to the maximum extent permitted by law. SharedXP does not guarantee uninterrupted availability,
                error-free operation, or outcomes from any experience.
              </p>
              <p>
                Full disclaimer document available at <Link to="/disclaimers">/disclaimers</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2>15. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, SharedXP will not be liable for indirect, incidental,
                special, consequential, or punitive damages, including lost profits, lost data, personal injury, or
                damages arising from user interactions or participation in activities arranged through the Platform.
              </p>
            </section>

            <section className="legal-section">
              <h2>16. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless SharedXP and its affiliates, officers, and personnel from
                claims, losses, liabilities, and expenses arising from your use of the Platform, your content, your
                activities, or your breach of these Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>17. Changes to These Terms</h2>
              <p>
                SharedXP may update these Terms from time to time. Continued use of the Platform after updates become
                effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>18. Contact</h2>
              <p>
                If you have questions about these Terms, please contact SharedXP through the official support or
                communication channels made available on the Platform.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
