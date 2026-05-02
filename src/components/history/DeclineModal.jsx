import { useState } from "react";

const DeclineModal = ({ onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (reason.trim().length < 10) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Decline booking"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Decline booking request</h3>
        <p className="modal-body-text">
          Please give a reason for declining. This message will be shared with the requester.
        </p>
        <textarea
          className="modal-textarea"
          rows={4}
          placeholder="e.g. I'm unavailable on that date due to a prior commitment."
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(""); }}
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
            {loading ? "Declining…" : "Confirm Decline"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineModal;
