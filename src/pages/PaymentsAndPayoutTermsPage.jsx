import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PaymentsAndPayoutTermsPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Payments and Payout Terms</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              These terms describe how participant payments and host payouts are handled on SharedXP and are designed
              to align with EU consumer and payment-framework expectations.
            </p>

            <section className="legal-section">
              <h2>1. Payment Processing Model</h2>
              <p>
                SharedXP may use regulated third-party payment service providers for card processing, settlement,
                anti-fraud checks, and payout execution. Users may need to accept provider-specific terms.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Participant Charges</h2>
              <ul>
                <li>Total payable amounts are presented before booking confirmation.</li>
                <li>Additional local taxes or mandatory charges may apply by jurisdiction.</li>
                <li>
                  Payment authorizations may be delayed, retried, or declined based on provider risk or compliance
                  controls.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Host Payout Eligibility</h2>
              <ul>
                <li>Hosts must provide accurate payout and identity details before receiving funds.</li>
                <li>Payout release may depend on completion and dispute-status checks.</li>
                <li>Payout timing may vary by banking rails, holidays, and provider settlement windows.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Holds, Reserves, Reversals, and Chargebacks</h2>
              <p>
                SharedXP or its payment providers may hold or reserve funds where risk, dispute, fraud, legal requests,
                or chargeback exposure exists. Reversals and chargebacks may reduce future host payouts.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Fees and Currency Handling</h2>
              <p>
                Where applicable, platform and processing fees are disclosed before transaction confirmation. Currency
                conversion and banking fees may be imposed by payment providers or financial institutions.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Taxes and Reporting Responsibility</h2>
              <p>
                Hosts are responsible for VAT, income taxes, and other reporting obligations arising from activity on
                SharedXP, unless mandatory withholding or reporting applies by law.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Refunds and Disputes</h2>
              <p>
                Refund eligibility follows booking status, cancellation context, and evidence available during dispute
                review. SharedXP may request documentation from both participants and hosts.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default PaymentsAndPayoutTermsPage;
