import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const LoyaltyProgramPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section legal-content">
          <article className="simple-page legal-page">
            <h1>SharedXP Loyalty Program</h1>
            <p className="legal-last-updated">Effective: May 10, 2026</p>
            <p>
              The SharedXP Loyalty Program rewards you for every experience you book on the platform.
              This page explains how the program works, how you earn XP, and what to expect as the
              program grows.
            </p>

            <section className="legal-section">
              <h2>1. What is XP?</h2>
              <p>
                <strong>XP (Experience Points)</strong> is the SharedXP loyalty currency. It reflects
                how much you have invested in shared sporting experiences. The more you book and
                explore, the more XP you accumulate.
              </p>
              <p>
                XP is designed to grow with you — it is a record of your journey on SharedXP, and
                the foundation for future rewards, recognition, and benefits.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. How to Earn XP</h2>
              <p>XP can be earned in two ways depending on your role on SharedXP.</p>

              <h3>As a Participant</h3>
              <p>
                XP is earned automatically whenever you pay for an experience. The earning rule is
                simple:
              </p>
              <ul>
                <li>
                  <strong>1 XP Point per whole currency unit paid.</strong> The XP amount equals the
                  integer part (floor) of your gross payment. For example:
                  <ul>
                    <li>€45.00 → 45 XP</li>
                    <li>€45.90 → 45 XP (fractional cents are not counted)</li>
                    <li>$120.00 → 120 XP</li>
                    <li>£80.50 → 80 XP</li>
                  </ul>
                </li>
                <li>
                  <strong>Instant credit.</strong> XP is added as soon as your payment is processed.
                </li>
              </ul>

              <h3>As a Host</h3>
              <p>
                Hosts also earn XP on every session they host, based on their net earnings after the
                platform fee and tax are deducted:
              </p>
              <ul>
                <li>
                  <strong>1 XP Point per whole currency unit of net earnings received.</strong> For
                  example, if a participant pays €50 and your net payout is €37.50, you earn 37 XP.
                </li>
                <li>
                  <strong>Credited on release.</strong> Host XP is credited when the payment is
                  released to you — not at the moment the participant pays.
                </li>
                <li>
                  <strong>Currency independent.</strong> XP is based on the face value of your net
                  earnings, with no currency conversion applied.
                </li>
              </ul>

              <p>
                You can see XP earned per transaction (both as participant and host) in your{" "}
                <Link to="/payment-history">Payment History</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Where to See Your XP</h2>
              <p>
                Your combined XP balance (participant + host) is displayed at the top of your{" "}
                <Link to="/payment-history">Payment History</Link> page, accessible from the profile
                menu. The page has two tabs:
              </p>
              <ul>
                <li>
                  <strong>Bookings</strong> — invoices for experiences you have paid for as a
                  participant, with XP earned per invoice.
                </li>
                <li>
                  <strong>Hosting</strong> — earnings from sessions you have hosted, with XP credited
                  when each payment is released.
                </li>
              </ul>
              <p>Each invoice card shows the XP earned for that individual transaction.</p>
            </section>

            <section className="legal-section">
              <h2>4. XP Value and Limitations</h2>
              <ul>
                <li>
                  XP Points currently have <strong>no monetary value</strong> and cannot be exchanged
                  for cash, refunds, discounts, or credits unless explicitly stated in a future program
                  update.
                </li>
                <li>XP cannot be transferred to another account.</li>
                <li>XP cannot be purchased or topped up directly.</li>
                <li>
                  XP earned on a payment that is subsequently reversed, refunded, or resolved in
                  favour of the participant via a dispute may be reclaimed by SharedXP.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Foundation Phase</h2>
              <p>
                This is the <strong>foundation phase</strong> of the SharedXP Loyalty Program. In this
                phase, XP is earned and displayed. Future phases will introduce:
              </p>
              <ul>
                <li>XP tiers and status levels (e.g. Explorer, Adventurer, Legend)</li>
                <li>Rewards and perks tied to XP milestones</li>
                <li>Potential redemption options for discounts or featured placement</li>
                <li>Bonus XP events and referral rewards</li>
              </ul>
              <p>
                Updates to the program will be communicated through the platform when introduced.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Program Changes</h2>
              <p>
                SharedXP reserves the right to modify XP earning rates, introduce earning caps,
                adjust tier thresholds, or change redemption rules. Where changes materially affect
                accumulated XP, reasonable notice will be provided.
              </p>
              <p>
                Full loyalty program terms are incorporated into the{" "}
                <Link to="/terms-and-conditions">Terms &amp; Conditions</Link> (Section 5) and the{" "}
                <Link to="/payments-and-payout-terms">Payments and Payout Terms</Link> (Section 11).
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Questions</h2>
              <p>
                For questions about the XP Loyalty Program, contact SharedXP through the official
                support channels available on the platform.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default LoyaltyProgramPage;
