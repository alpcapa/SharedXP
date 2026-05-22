import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const LegalPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section legal-content">
          <article className="simple-page legal-page">
            <h1>Legal Center</h1>
            <p className="legal-last-updated">Last updated: May 18, 2026</p>
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
                  <strong>Terms &amp; Conditions</strong> (available at <Link to="/terms-and-conditions">/terms-and-conditions</Link>):
                  governs account use, bookings, conduct rules, platform limitations, and the XP Loyalty Program.
                </li>
                <li>
                  <strong>Privacy Notice</strong>: explains what account, booking, loyalty, and usage data is collected,
                  how it is processed, and user rights by jurisdiction. Read at{" "}
                  <Link to="/privacy-notice">/privacy-notice</Link>.
                </li>
                <li>
                  <strong>Payments and Payout Terms</strong>: defines payment processor roles, fee logic, payout timing,
                  verification checks, reserves, reversals, and XP earning rules. Read at{" "}
                  <Link to="/payments-and-payout-terms">/payments-and-payout-terms</Link>.
                </li>
                <li>
                  <strong>Safety and Risk Policy</strong>: sets user and host safety expectations, prohibited conduct,
                  escalation, and emergency-reporting pathways. Read at{" "}
                  <Link to="/safety-and-risk-policy">/safety-and-risk-policy</Link>.
                </li>
                <li>
                  <strong>Content and Intellectual Property Policy</strong>: covers rights in user content, infringements,
                  takedowns, and repeat-violation handling. Read at{" "}
                  <Link to="/content-and-intellectual-property-policy">/content-and-intellectual-property-policy</Link>.
                </li>
                <li>
                  <strong>Disclaimers Notice</strong>: consolidates marketplace role, risk, insurance, and warranty
                  disclaimers. Read at <Link to="/disclaimers">/disclaimers</Link>.
                </li>
                <li>
                  <strong>Cancellation Policy</strong>: documents the three host-selectable cancellation tiers
                  (Flexible, Moderate, Strict), refund thresholds, host-cancellation rules, and XP implications for
                  cancelled bookings. Read at{" "}
                  <Link to="/cancellation-policy">/cancellation-policy</Link>.
                </li>
                <li>
                  <strong>Community Manager Policy</strong>: governs participation in the SharedXP Community Manager
                  Program, including eligibility, responsibilities, invite code rules, commission structure (5% of
                  gross booking value), payment process, prohibited conduct, and status changes. Read at{" "}
                  <Link to="/community-manager-policy">/community-manager-policy</Link>.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>2a. SharedXP Loyalty Program (XP)</h2>
              <p>
                SharedXP operates a loyalty reward system called <strong>XP (Experience Points)</strong>. XP is
                earned in <strong>Normalized Spending Units (NSU)</strong> — 1 XP per NSU of the gross booking
                amount — so that 1 XP represents roughly equal spending power regardless of currency ($1 USD,
                €1 EUR, ¥100 JPY, ₺40 TRY, ₩1,000 KRW each equal 1 XP). Guests and hosts earn equal XP on
                every shared experience. XP has no monetary value and is subject to the rules set out in the
                Terms &amp; Conditions (Section 5) and Payments and Payout Terms (Section 11).
              </p>
              <p>
                XP balances and invoice history — for both bookings made and sessions hosted — are accessible from
                the <strong>Payment History</strong> page (profile menu → Payment History when logged in). The loyalty
                program is in its foundation phase; additional benefits will be communicated when introduced.
              </p>
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
                <li>
                  Full disclaimers notice available at <Link to="/disclaimers">/disclaimers</Link>.
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
                SharedXP provides a structured dispute process for unresolved booking issues. Either party may open a
                dispute after a session is marked completed. Hosts receive a response window to submit their account of
                events and supporting evidence. SharedXP administrators review the record and make a determination, which
                may result in full or partial refunds, XP adjustments, or other remedial actions.
              </p>
              <p>
                Parties must cooperate in good faith, provide accurate records, and follow the dispute process defined in
                the Payments and Payout Terms. SharedXP cannot guarantee outcomes but aims to resolve disputes fairly
                based on the available evidence.
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
