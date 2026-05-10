import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PaymentsAndPayoutTermsPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section legal-content">
          <article className="simple-page legal-page">
            <h1>Payments and Payout Terms</h1>
            <p className="legal-last-updated">Last updated: May 10, 2026</p>
            <p>
              These terms explain how SharedXP handles participant payments, host payouts, fee disclosures, and payment
              risk controls. They reflect common EU marketplace practices and should be read together with the Terms
              &amp; Conditions.
            </p>

            <section className="legal-section">
              <h2>1. Scope and Definitions</h2>
              <p>
                These terms apply to all payments made for experiences listed on SharedXP and to all host payout flows.
                "Participant" means the user paying for an experience, and "Host" means the user receiving payout for
                offered activities.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Payment Service Providers</h2>
              <p>
                SharedXP may use regulated third-party payment providers for authorization, settlement, payout execution,
                anti-fraud controls, and compliance screening. Users may be required to accept provider-specific terms and
                complete identity checks.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Price Transparency and Charges</h2>
              <ul>
                <li>Total payable amounts are shown before booking confirmation.</li>
                <li>Applicable service fees and taxes are presented at checkout where available.</li>
                <li>Bank, card-network, and currency-conversion fees may be applied by external institutions.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Authorization and Capture</h2>
              <p>
                Payment attempts may be authorized, delayed, retried, or declined by card issuers and payment providers.
                SharedXP does not control third-party issuer decisions. Failed authorization may require users to provide
                a valid alternative payment method.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Host Payout Eligibility</h2>
              <ul>
                <li>Hosts must provide complete and accurate payout account information.</li>
                <li>Payout release can depend on booking status and completion confirmation.</li>
                <li>Payout timing may vary due to weekends, holidays, compliance checks, and bank cutoffs.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>6. Holds, Reserves, and Delays</h2>
              <p>
                SharedXP or payment providers may place temporary holds or reserves when required for risk management,
                unresolved disputes, fraud indicators, legal obligations, or expected chargeback exposure.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Refunds, Cancellations, and Reversals</h2>
              <p>
                Refund handling is based on booking status, applicable cancellation rules, evidence submitted by
                participants/hosts, and mandatory consumer rights. Reversed or refunded transactions may reduce current or
                future host payouts.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Chargebacks and Disputes</h2>
              <p>
                If a cardholder initiates a chargeback, SharedXP may request booking records and communications from both
                parties. Chargeback amounts, fees, and related liabilities may be deducted from host balances where
                permitted by law and contract.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Taxes and Regulatory Reporting</h2>
              <p>
                Hosts are generally responsible for taxes associated with their activity, including VAT and income taxes,
                unless withholding/reporting is legally required from the platform or payment providers.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Compliance and Restricted Use</h2>
              <p>
                Payments may be restricted, suspended, or refused for sanctions screening, anti-money-laundering
                obligations, unlawful activity concerns, or other compliance requirements.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. XP Loyalty Points and Payment History</h2>
              <p>
                SharedXP awards <strong>XP (Experience Points)</strong> to participants based on amounts paid for
                experiences. The following rules apply to XP earned through payments:
              </p>
              <ul>
                <li>
                  <strong>Earning rate:</strong> 1 XP Point is awarded for every whole currency unit of the
                  gross payment amount (the total charged to the participant). Fractional units are rounded
                  down. For example, a payment of €45.90 earns 45 XP.
                </li>
                <li>
                  <strong>Currency independence:</strong> XP is awarded based on the face value of the payment
                  amount, regardless of the currency used. No cross-currency normalization is applied.
                </li>
                <li>
                  <strong>Timing:</strong> XP is credited at the time of successful payment and is visible in
                  the participant's Payment History.
                </li>
                <li>
                  <strong>No monetary value:</strong> XP Points are non-monetary and cannot be exchanged for
                  cash, refunds, or discounts unless explicitly stated in a future program update.
                </li>
                <li>
                  <strong>Reversals and refunds:</strong> XP earned on a transaction that is subsequently
                  reversed, refunded, or resolved in favour of the participant (via dispute) may be reclaimed
                  by SharedXP. Chargebacks that succeed will result in XP reversal for the associated payment.
                </li>
                <li>
                  <strong>Program changes:</strong> SharedXP reserves the right to modify XP earning rates,
                  introduce caps, or adjust program terms with reasonable notice.
                </li>
              </ul>
              <p>
                Participants can view their full payment and invoice history, including XP earned per
                transaction, at <strong>Payment History</strong> (accessible from the profile menu when
                logged in).
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Changes and Contact</h2>
              <p>
                SharedXP may update these terms to reflect legal or operational changes. Questions can be submitted
                through official support/legal channels on the platform.
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
