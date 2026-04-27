import { CURRENCY_OPTIONS } from "./hostUtils";

const HostPaymentTab = ({
  draft,
  setDraft,
  isPaymentTabComplete,
  errorMessage,
  successMessage,
  onSubmit,
}) => {
  const updateStripeField = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      bankDetailsComplete: false,
      stripe: { ...prev.stripe, [field]: value },
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      {!isPaymentTabComplete && (
        <div className="host-payment-warning" role="alert">
          <span className="host-payment-warning-icon" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong>Payment details incomplete</strong>
            <p>
              You can host sessions and receive bookings, but payouts are on
              hold until you complete this section. SharedXP holds all collected
              payments until your bank details are saved and verified.
            </p>
          </div>
        </div>
      )}

      {isPaymentTabComplete && (
        <div className="host-payment-complete" role="status">
          <span aria-hidden="true">✅</span>
          <strong>Payment details complete.</strong> Payouts will be released
          after each confirmed session.
        </div>
      )}

      <section className="host-onboarding-card">
        <h2>Bank Details (Required for us to pay you)</h2>
        <div className="host-form-grid">
          <label htmlFor="stripeEmail">Stripe email</label>
          <input
            id="stripeEmail"
            type="email"
            required
            value={draft.stripe.stripeEmail}
            onChange={(e) => updateStripeField("stripeEmail", e.target.value)}
          />

          <label htmlFor="accountHolderName">Account holder name</label>
          <input
            id="accountHolderName"
            type="text"
            required
            value={draft.stripe.accountHolderName}
            onChange={(e) =>
              updateStripeField("accountHolderName", e.target.value)
            }
          />

          <label htmlFor="citizenIdNumber">Citizen ID number</label>
          <input
            id="citizenIdNumber"
            type="text"
            required
            value={draft.stripe.citizenIdNumber}
            onChange={(e) =>
              updateStripeField("citizenIdNumber", e.target.value)
            }
          />

          <label htmlFor="taxNumber">Tax Number</label>
          <input
            id="taxNumber"
            type="text"
            required
            value={draft.stripe.taxNumber}
            onChange={(e) => updateStripeField("taxNumber", e.target.value)}
          />

          <label htmlFor="bankName">Bank name</label>
          <input
            id="bankName"
            type="text"
            required
            value={draft.stripe.bankName}
            onChange={(e) => updateStripeField("bankName", e.target.value)}
          />

          <label htmlFor="accountNumber">Account number / IBAN</label>
          <input
            id="accountNumber"
            type="text"
            required
            value={draft.stripe.accountNumber}
            onChange={(e) =>
              updateStripeField("accountNumber", e.target.value)
            }
          />

          <label htmlFor="routingNumber">Routing number / SWIFT</label>
          <input
            id="routingNumber"
            type="text"
            required
            value={draft.stripe.routingNumber}
            onChange={(e) =>
              updateStripeField("routingNumber", e.target.value)
            }
          />

          <label htmlFor="payoutCurrency">Payout currency</label>
          <select
            id="payoutCurrency"
            required
            value={draft.stripe.payoutCurrency}
            onChange={(e) =>
              updateStripeField("payoutCurrency", e.target.value)
            }
          >
            <option value="">Select currency</option>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {errorMessage && <p className="auth-error">{errorMessage}</p>}
      {successMessage && (
        <p className="host-success-message">{successMessage}</p>
      )}

      <button type="submit" className="btn btn-primary">
        Save Payment Details
      </button>
    </form>
  );
};

export default HostPaymentTab;
