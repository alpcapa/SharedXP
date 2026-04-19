import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const TermsAndConditionsPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Terms &amp; Conditions</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
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
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Pricing, Payments, and Payouts</h2>
              <p>
                Detailed payment and payout processing terms are available at{" "}
                <a href="/payments-and-payout-terms">/payments-and-payout-terms</a>.
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
              <h2>6. Host Responsibilities</h2>
              <ul>
                <li>Provide truthful information about identity, sport expertise, availability, and equipment.</li>
                <li>Maintain safe and suitable conditions for hosted experiences.</li>
                <li>Respect participants and avoid discriminatory, abusive, or misleading behavior.</li>
                <li>Comply with all applicable local laws, permits, and safety requirements.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>7. Participant Responsibilities</h2>
              <ul>
                <li>Provide accurate booking and profile information.</li>
                <li>Assess your physical readiness and medical suitability before participating in activities.</li>
                <li>Follow host instructions and local rules during experiences.</li>
                <li>Treat hosts, other users, and property with respect.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>8. Safety, Risk Assumption, and Conduct</h2>
              <p>
                Sports and outdoor activities can involve physical risk. By participating in any experience, you
                understand and accept those risks. SharedXP is not an insurer, coach, medical provider, or event
                organizer for each session, and users are responsible for their own decisions, preparation, and
                behavior.
              </p>
              <p>
                Detailed safety standards are available at <a href="/safety-and-risk-policy">/safety-and-risk-policy</a>.
              </p>
              <p>You must not use the Platform for unlawful, fraudulent, harmful, or abusive activity.</p>
            </section>

            <section className="legal-section">
              <h2>9. User Content, Reviews, and Media</h2>
              <p>
                Content rights and infringement process details are available at{" "}
                <a href="/content-and-intellectual-property-policy">/content-and-intellectual-property-policy</a>.
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
              <h2>10. Prohibited Activities</h2>
              <ul>
                <li>Impersonation, identity fraud, or false profile information.</li>
                <li>Harassment, hate speech, threats, or violent behavior.</li>
                <li>Posting illegal, infringing, or malicious content.</li>
                <li>Attempting to disrupt, reverse engineer, or misuse platform systems.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>11. Suspension and Termination</h2>
              <p>
                SharedXP may suspend or terminate access to the Platform for violations of these Terms, suspected
                fraud, safety concerns, legal requirements, or operational reasons. You may stop using the Platform at
                any time.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Data and Privacy</h2>
              <p>
                SharedXP processes account and usage data to provide platform functionality. Some features in this
                product store data locally in your browser environment. By using the Platform, you agree to such
                processing as required to operate account, booking, host, and history functions.
              </p>
              <p>
                Full privacy terms are available at <a href="/privacy-notice">/privacy-notice</a>.
              </p>
            </section>

            <section className="legal-section">
              <h2>13. Disclaimers</h2>
              <p>
                The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any
                kind to the maximum extent permitted by law. SharedXP does not guarantee uninterrupted availability,
                error-free operation, or outcomes from any experience.
              </p>
              <p>
                Full disclaimer document available at <a href="/disclaimers">/disclaimers</a>.
              </p>
            </section>

            <section className="legal-section">
              <h2>14. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, SharedXP will not be liable for indirect, incidental,
                special, consequential, or punitive damages, including lost profits, lost data, personal injury, or
                damages arising from user interactions or participation in activities arranged through the Platform.
              </p>
            </section>

            <section className="legal-section">
              <h2>15. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless SharedXP and its affiliates, officers, and personnel from
                claims, losses, liabilities, and expenses arising from your use of the Platform, your content, your
                activities, or your breach of these Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>16. Changes to These Terms</h2>
              <p>
                SharedXP may update these Terms from time to time. Continued use of the Platform after updates become
                effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>17. Contact</h2>
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
