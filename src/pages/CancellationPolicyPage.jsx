import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const CancellationPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Cancellation Policy</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: May 18, 2026</p>
            <p>
              SharedXP gives hosts the ability to choose a cancellation policy for each sport offering. The
              chosen policy is shown to guests on the host profile and at checkout before payment is made. By
              completing a booking, the guest accepts the cancellation terms for that specific experience.
            </p>

            <section className="legal-section">
              <h2>1. How Cancellation Policies Work</h2>
              <p>
                Refund entitlement is determined by the time remaining between the cancellation request and the
                scheduled start of the session. All thresholds are calculated from the moment SharedXP receives
                the cancellation request to the confirmed session start date and time. Cancellations must be
                submitted through the platform; verbal or off-platform requests are not valid for refund
                purposes.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Flexible</h2>
              <p>
                Designed for hosts who want to make it easy for guests to commit to a booking without financial
                risk if plans change with reasonable notice.
              </p>
              <ul>
                <li>
                  <strong>More than 24 hours before the session:</strong> full refund (100%).
                </li>
                <li>
                  <strong>Within 24 hours of the session:</strong> no refund (0%).
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Moderate</h2>
              <p>
                A balanced policy that rewards early cancellations with a full refund and provides partial
                compensation for cancellations made closer to the session.
              </p>
              <ul>
                <li>
                  <strong>More than 5 days (120 hours) before the session:</strong> full refund (100%).
                </li>
                <li>
                  <strong>Between 1 and 5 days (24–120 hours) before the session:</strong> 50% refund.
                </li>
                <li>
                  <strong>Within 24 hours of the session:</strong> no refund (0%).
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Strict</h2>
              <p>
                Intended for experiences that require significant host preparation, equipment logistics, or
                limited-spot sessions where late cancellations carry material cost.
              </p>
              <ul>
                <li>
                  <strong>More than 7 days (168 hours) before the session:</strong> 50% refund.
                </li>
                <li>
                  <strong>Within 7 days of the session:</strong> no refund (0%).
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Host Cancellations</h2>
              <p>
                If a host cancels a confirmed booking, the guest will receive a full refund regardless of the
                host's cancellation policy tier. Repeated host cancellations may result in restrictions on the
                host account and may affect host standing on the platform.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Refund Processing</h2>
              <p>
                Approved refunds are returned to the original payment method. Processing time depends on the
                guest's bank or card network and typically takes 5–10 business days after SharedXP approves the
                refund.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. XP and Cancellations</h2>
              <p>
                XP (Experience Points) are awarded at the time of payment. If a booking is subsequently
                cancelled and a refund is issued, the XP earned on that transaction may be reclaimed by
                SharedXP from both the guest and host accounts. Partial refunds (e.g. 50% under the Moderate
                or Strict tier) may result in proportional XP adjustment.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Disputes Related to Cancellations</h2>
              <p>
                If a guest believes they are entitled to a higher refund than the policy provides, or if a host
                disputes the circumstances of a cancellation, either party may raise a dispute through the
                platform. Dispute outcomes are determined by SharedXP in accordance with the booking record,
                communications, and applicable terms. See{" "}
                <Link to="/payments-and-payout-terms">/payments-and-payout-terms</Link> for full dispute
                process details.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Extraordinary Circumstances</h2>
              <p>
                In cases of documented force majeure, serious injury, or other exceptional circumstances,
                SharedXP may at its discretion override the standard cancellation policy and provide a full or
                partial refund. Requests must be submitted promptly with supporting evidence. SharedXP's
                determination in such cases is final.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Related Documents</h2>
              <ul>
                <li>
                  Terms &amp; Conditions: <Link to="/terms-and-conditions">/terms-and-conditions</Link>
                </li>
                <li>
                  Payments and Payout Terms:{" "}
                  <Link to="/payments-and-payout-terms">/payments-and-payout-terms</Link>
                </li>
                <li>
                  Legal Center: <Link to="/legal">/legal</Link>
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

export default CancellationPolicyPage;
