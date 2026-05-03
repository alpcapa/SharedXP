import { useState } from "react";

const DeclineConfirmationModal = ({ onConfirm, onCancel, loading }) => {
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (explanation.trim().length < 20) {
      setError("Please describe what happened in at least 20 characters.");
      return;
    }
    onConfirm(explanation.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Decline experience confirmation"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Report that experience didn't happen</h3>
        <p className="modal-body-text">
          If the host accepted but the experience never took place, you can open a dispute.
          Your explanation will be shared with the host and our customer service team, who will
          make a final decision on the payment.
        </p>
        <textarea
          className="modal-textarea"
          rows={5}
          placeholder="Please describe what happened in detail…"
          value={explanation}
          onChange={(e) => { setExplanation(e.target.value); setError(""); }}
        />
        {error && <p className="modal-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-light" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit Dispute"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineConfirmationModal;
