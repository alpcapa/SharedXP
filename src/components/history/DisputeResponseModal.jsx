import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { sendNotification } from "../../utils/sendNotification";

const fmtDate = (d) => {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${d}T00:00:00`));
};

const fmtTime = (t) => {
  if (!t) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" })
    .format(new Date(`2000-01-01T${t}:00`));
};

const DisputeResponseModal = ({ dispute, request, requesterName, onClose }) => {
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (response.trim().length < 20) {
      setError("Please provide a response of at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError("");

    const now = new Date().toISOString();
    const { error: dbError } = await supabase
      .from("disputes")
      .update({ host_response: response.trim(), host_responded_at: now })
      .eq("id", dispute.id);

    if (dbError) {
      setError("Failed to submit response. Please try again.");
      setSubmitting(false);
      return;
    }

    await sendNotification("dispute_host_responded", request.id, { disputeId: dispute.id });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-box dispute-response-modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Respond to dispute"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="dispute-response-modal-submitted">
            <div className="dispute-submitted-icon">✓</div>
            <h3 className="modal-title">Response submitted</h3>
            <p className="modal-body-text">
              Thank you. Our customer service team will review both accounts and be in touch as soon as possible.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="modal-title">Respond to dispute</h3>

            <div className="dispute-response-modal-summary">
              <p className="dispute-response-modal-summary-row">
                <span className="dispute-response-modal-label">Sport</span>
                <span>{request.sport}</span>
              </p>
              <p className="dispute-response-modal-summary-row">
                <span className="dispute-response-modal-label">Date</span>
                <span>{fmtDate(request.requested_date)}</span>
              </p>
              {request.requested_time && (
                <p className="dispute-response-modal-summary-row">
                  <span className="dispute-response-modal-label">Time</span>
                  <span>{fmtTime(request.requested_time)}</span>
                </p>
              )}
            </div>

            <div className="dispute-response-modal-guest">
              <p className="dispute-account-label">{requesterName} wrote:</p>
              <blockquote className="dispute-quote">{dispute.requester_explanation}</blockquote>
            </div>

            <div className="dispute-response-modal-host-section">
              <p className="dispute-account-label">Your response</p>
              <p className="dispute-response-hint">
                Describe what happened from your side. Be factual and specific — this will be read by our customer service team.
              </p>
              <textarea
                className="modal-textarea"
                rows={5}
                placeholder="Describe what happened…"
                value={response}
                onChange={(e) => { setResponse(e.target.value); setError(""); }}
              />
              {error && <p className="modal-error" role="alert">{error}</p>}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit My Response"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisputeResponseModal;
