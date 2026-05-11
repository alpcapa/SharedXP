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
              The SharedXP Loyalty Program rewards every participant in a shared experience — whether
              you booked it or hosted it. This page explains how the program works, how you earn XP,
              and what to expect as the program grows.
            </p>

            <section className="legal-section">
              <h2>1. What is XP?</h2>
              <p>
                <strong>XP (Experience Points)</strong> is the SharedXP loyalty currency. It reflects
                how deeply you participate in shared sporting experiences — as a guest, as a host, or
                both. The more you engage with the platform, the more XP you accumulate.
              </p>
              <p>
                XP is designed to grow with you — it is a record of your journey on SharedXP, and
                the foundation for future rewards, recognition, and benefits.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. How to Earn XP</h2>
              <p>
                XP is earned automatically on every completed, paid experience — for both the guest
                who booked and the host who delivered it. The earning rule is simple and equal:
              </p>
              <ul>
                <li>
                  <strong>1 XP Point per Normalized Spending Unit (NSU).</strong> XP is based on
                  the gross booking amount converted to NSU, which normalizes spending across
                  currencies so that 1 XP represents roughly equal value regardless of which
                  currency was used. Fractional NSU are rounded up. The conversion rates are:
                  <ul>
                    <li>$1 USD → 1 XP</li>
                    <li>€1 EUR → 1 XP</li>
                    <li>¥100 JPY → 1 XP</li>
                    <li>₺40 TRY → 1 XP</li>
                    <li>₩1,000 KRW → 1 XP</li>
                  </ul>
                  For example: a €45.00 booking earns 45 XP each; a ¥4,500 booking earns 45 XP
                  each; a ₺200 booking earns 5 XP each.
                </li>
                <li>
                  <strong>Equal for guests and hosts.</strong> Both parties earn the same XP from
                  every experience. Hosting is valued the same as booking — the value created by the
                  host's service is just as important as the guest's participation.
                </li>
                <li>
                  <strong>Instant credit.</strong> XP is added to your balance as soon as payment is
                  processed. You can see XP earned per transaction — both from bookings you made and
                  sessions you hosted — in your{" "}
                  <Link to="/payment-history">Payment History</Link>.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Where to See Your XP</h2>
              <p>
                Your total XP balance — combining XP from both bookings and hosted sessions — is
                displayed at the top of your{" "}
                <Link to="/payment-history">Payment History</Link> page (accessible from the profile
                menu). Each invoice card shows the XP earned for that individual transaction, along
                with a "Booked" or "Hosted" label so you can see where each batch of XP came from.
              </p>
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
                  favour of either party via a dispute may be reclaimed by SharedXP.
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
