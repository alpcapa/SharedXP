import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const LegalPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Legal Center</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              Terms &amp; Conditions are necessary, but for a marketplace model like SharedXP they are not sufficient on
              their own. A Legal Center provides a complete framework across participant and host liability, third-party
              services, platform limits, safety, and compliance duties.
            </p>

            <section className="legal-section">
              <h2>1. Scope of this Legal Center</h2>
              <p>
                This page summarizes the legal structure of SharedXP and how core policies work together. It does not
                replace full policy texts, and in case of conflict, the specific policy document controls.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Core Legal Documents</h2>
              <ul>
                <li>
                  <strong>Terms &amp; Conditions</strong> (available at <a href="/terms-and-conditions">/terms-and-conditions</a>):
                  governs account use, bookings, conduct rules, and platform limitations.
                </li>
                <li>
                  <strong>Privacy Notice</strong>: explains what account, booking, and usage data is collected, how it is
                  processed, and user rights by jurisdiction.
                </li>
                <li>
                  <strong>Payments and Payout Terms</strong>: defines payment processor roles, fee logic, payout timing,
                  verification checks, reserves, and reversals.
                </li>
                <li>
                  <strong>Safety and Risk Policy</strong>: sets user and host safety expectations, prohibited conduct,
                  escalation, and emergency-reporting pathways.
                </li>
                <li>
                  <strong>Content and Intellectual Property Policy</strong>: covers rights in user content, infringements,
                  takedowns, and repeat-violation handling.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. SharedXP Marketplace Role</h2>
              <p>
                SharedXP operates as a technology platform that connects participants and hosts. Unless clearly stated in
                writing for a specific service, SharedXP is not the direct provider of hosted sport sessions, transport,
                equipment supply, medical supervision, or on-site venue control.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. User and Host Liability Allocation</h2>
              <ul>
                <li>
                  <strong>Hosts</strong> are responsible for lawful operation of their offerings, truthful listing details,
                  local permits, safety conditions, and compliance with tax and regulatory obligations.
                </li>
                <li>
                  <strong>Participants</strong> are responsible for assessing fitness, health readiness, and suitability of
                  sessions, and for following host and local safety requirements.
                </li>
                <li>
                  Both parties are responsible for direct conduct during experiences, including property damage,
                  misconduct, injury-causing behavior, and legal breaches.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Third-Party Providers and Partners</h2>
              <p>
                SharedXP may rely on third-party providers such as payment processors, identity or fraud services,
                hosting infrastructure, communication tools, and analytics partners. Those providers may enforce their
                own terms and compliance controls in addition to SharedXP policies.
              </p>
              <p>
                SharedXP is not responsible for service interruptions, external policy changes, or independent decisions
                made by third-party providers where legally permitted.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Risk, Insurance, and Disclaimers</h2>
              <ul>
                <li>Sports and outdoor activities can involve inherent risk, including serious injury.</li>
                <li>
                  SharedXP does not automatically provide medical, accident, travel, or host liability insurance unless
                  explicitly stated for a specific program.
                </li>
                <li>
                  Users and hosts should independently obtain insurance coverage suitable for their activities and local
                  legal requirements.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>7. Compliance and Regional Rules</h2>
              <p>
                Users are responsible for understanding and following local laws that apply to sport instruction,
                equipment use, public-space activities, licensing, consumer rights, and tax reporting. SharedXP may limit
                or disable features in some regions to satisfy legal obligations.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Disputes, Claims, and Cooperation</h2>
              <p>
                SharedXP may provide reporting and evidence tools but cannot guarantee outcomes in disputes between users.
                Parties must cooperate in good faith, provide accurate records, and follow the applicable dispute process
                defined in governing terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Why this page exists</h2>
              <p>
                Marketplace and booking platforms commonly maintain a dedicated Legal Center so users can find policy
                architecture in one place rather than relying only on a single Terms document. This improves clarity,
                consent quality, partner due diligence, and risk communication across all parties.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Contact and Notices</h2>
              <p>
                For legal notices, compliance concerns, or policy questions, contact SharedXP through official support or
                legal communication channels made available on the Platform.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default LegalPage;
