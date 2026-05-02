import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { sendNotification } from "../utils/sendNotification";

const DisputeResponsePage = ({ currentUser, onLogout }) => {
  const { disputeId } = useParams();

  const [dispute, setDispute] = useState(null);
  const [booking, setBooking] = useState(null);
  const [requesterProfile, setRequesterProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!currentUser || !disputeId) return;
    (async () => {
      const { data: d } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .maybeSingle();

      if (!d) { setLoading(false); return; }
      setDispute(d);

      const { data: br } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("id", d.booking_request_id)
        .maybeSingle();

      if (!br || br.host_id !== currentUser.id) { setLoading(false); return; }
      setBooking(br);

      const { data: rp } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name")
        .eq("id", br.requester_id)
        .maybeSingle();
      setRequesterProfile(rp);

      if (d.host_response) setSubmitted(true);
      setLoading(false);
    })();
  }, [currentUser, disputeId]);

  const handleSubmit = async () => {
    if (response.trim().length < 20) {
      setError("Please provide a response of at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError("");

    const now = new Date().toISOString();
    const { error: dError } = await supabase
      .from("disputes")
      .update({ host_response: response.trim(), host_responded_at: now })
      .eq("id", disputeId);

    if (dError) {
      setError("Failed to submit response. Please try again.");
      setSubmitting(false);
      return;
    }

    await sendNotification("dispute_host_responded", booking.id, { disputeId });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (!currentUser) {
    sessionStorage.setItem("postAuthRedirect", `/dispute-response/${disputeId}`);
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader /></section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to submit your dispute response.</p>
            <Link to="/login" className="btn btn-primary">Log in</Link>
          </main>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dispute-response-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <p style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>Loading…</p>
        <SiteFooter />
      </div>
    );
  }

  if (!dispute || !booking) {
    return (
      <div className="dispute-response-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <main className="dispute-main">
          <h1>Dispute not found</h1>
          <p>This dispute may not exist or you may not have permission to respond to it.</p>
          <Link to="/history?tab=pending" className="btn btn-primary">Back to History</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const requesterName = requesterProfile
    ? (requesterProfile.full_name || `${requesterProfile.first_name ?? ""} ${requesterProfile.last_name ?? ""}`.trim() || "The guest")
    : "The guest";

  return (
    <div className="dispute-response-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <main className="dispute-main">
        <h1 className="dispute-title">Respond to dispute</h1>

        {submitted ? (
          <div className="dispute-submitted">
            <div className="dispute-submitted-icon">✓</div>
            <h2>Response submitted</h2>
            <p>Thank you. Our customer service team will review both accounts and contact you within 24 hours.</p>
            <Link to="/history?tab=pending" className="btn btn-primary">Back to History</Link>
          </div>
        ) : (
          <div className="dispute-form-wrap">
            <div className="dispute-booking-summary">
              <h2>Booking in question</h2>
              <p><strong>Sport:</strong> {booking.sport}</p>
              <p><strong>Date:</strong> {booking.requested_date}</p>
              <p><strong>Time:</strong> {booking.requested_time}</p>
            </div>

            <div className="dispute-guest-account">
              <h2>{requesterName}'s account</h2>
              <blockquote className="dispute-quote">
                "{dispute.requester_explanation}"
              </blockquote>
            </div>

            <div className="dispute-response-section">
              <h2>Your response</h2>
              <p className="dispute-response-hint">
                Please describe what happened from your side. Be factual and specific.
                This will be read by our customer service team.
              </p>
              <textarea
                className="modal-textarea"
                rows={6}
                placeholder="Describe what happened…"
                value={response}
                onChange={(e) => { setResponse(e.target.value); setError(""); }}
              />
              {error && <p className="modal-error" role="alert">{error}</p>}
              <button
                type="button"
                className="find-button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit My Response"}
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default DisputeResponsePage;
