import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeclineModal from "./DeclineModal";
import DeclineConfirmationModal from "./DeclineConfirmationModal";

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", CAD: "C$",
  AUD: "A$", JPY: "¥", INR: "₹", BRL: "R$",
};

const fmt = (price, currency) => {
  const sym = CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? currency;
  return `${sym}${Number(price).toFixed(2)}`;
};

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

const useCountdown = (targetIso) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Confirming…"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
};

const STATUS_LABELS = {
  pending: { label: "Awaiting host response", cls: "pending" },
  accepted: { label: "Accepted — payment needed", cls: "accepted" },
  payment_pending: { label: "Payment pending", cls: "payment-pending" },
  in_progress: { label: "Experience in progress", cls: "in-progress" },
  completed: { label: "Completed", cls: "completed" },
  declined: { label: "Declined by host", cls: "declined" },
  cancelled: { label: "Cancelled", cls: "cancelled" },
  disputed: { label: "Dispute in progress", cls: "disputed" },
  resolved_paid_host: { label: "Resolved — payment released", cls: "resolved" },
  resolved_refunded: { label: "Resolved — refunded", cls: "resolved" },
};

const getName = (profile) => {
  if (!profile) return null;
  return profile.full_name ||
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    null;
};

const ProfileLink = ({ profile, userId, name }) => {
  const href = profile?.is_host ? `/buddy/${userId}` : `/user/${userId}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pending-profile-link"
    >
      {name}
    </a>
  );
};

const PendingBookingCard = ({
  request,
  currentUserId,
  onAccept,
  onDecline,
  onCancel,
  onConfirmExperience,
  onOpenDispute,
}) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isHost = request.host_id === currentUserId;
  const isRequester = request.requester_id === currentUserId;

  const hostName = getName(request.host_profile) ?? "Host";
  const requesterName = getName(request.requester_profile) ?? "Guest";
  const statusInfo = STATUS_LABELS[request.status] ?? { label: request.status, cls: "pending" };

  const autoConfirmCountdown = useCountdown(
    request.status === "in_progress" ? request.auto_confirm_at : null,
  );

  const experienceEnded =
    request.status === "in_progress" &&
    request.experience_ends_at &&
    new Date(request.experience_ends_at).getTime() <= Date.now();

  const handleAccept = async () => {
    setActionLoading(true);
    await onAccept(request.id);
    setActionLoading(false);
  };

  const handleDecline = async (reason) => {
    setActionLoading(true);
    await onDecline(request.id, reason);
    setActionLoading(false);
    setShowDeclineModal(false);
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this booking request?")) return;
    setActionLoading(true);
    await onCancel(request.id);
    setActionLoading(false);
  };

  const handleConfirmExperience = async () => {
    setActionLoading(true);
    await onConfirmExperience(request.id);
    setActionLoading(false);
  };

  const handleOpenDispute = async (explanation) => {
    setActionLoading(true);
    await onOpenDispute(request.id, explanation);
    setActionLoading(false);
    setShowDisputeModal(false);
  };

  return (
    <>
      <article className={`pending-card status-${statusInfo.cls}`}>
        <div className="pending-card-header">
          <div className="pending-card-title-row">
            <h2 className="pending-card-sport">{request.sport}</h2>
            <span className={`pending-status-badge status-${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="pending-card-date">
            {fmtDate(request.requested_date)} · {fmtTime(request.requested_time)}
          </p>
          <p className="pending-card-price">
            {fmt(request.price, request.currency)} per session
          </p>
          <p className="pending-card-role">
            {isHost ? (
              <>Requested by <ProfileLink profile={request.requester_profile} userId={request.requester_id} name={requesterName} /></>
            ) : (
              <>Hosted by <ProfileLink profile={request.host_profile} userId={request.host_id} name={hostName} /></>
            )}
          </p>
        </div>

        {/* In-progress countdown + actions */}
        {request.status === "in_progress" && (
          <div className="pending-card-inprogress">
            {!experienceEnded ? (
              <p className="pending-countdown-info">
                Experience scheduled — confirmation window opens after {fmtDate(request.requested_date)} at {fmtTime(request.requested_time)}.
              </p>
            ) : (
              <p className="pending-countdown">
                Auto-confirms in: <strong>{autoConfirmCountdown}</strong>
              </p>
            )}
            <div className="pending-card-actions">
              <Link to={`/chat/${request.id}`} className="btn btn-light pending-chat-btn">
                💬 {isHost ? `Contact ${requesterName}` : `Contact ${hostName}`}
              </Link>
              {isRequester && experienceEnded && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmExperience}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "…" : "✓ Confirm Experience"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setShowDisputeModal(true)}
                    disabled={actionLoading}
                  >
                    ✗ Didn't Happen
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Host actions for pending requests */}
        {isHost && request.status === "pending" && (
          <div className="pending-card-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? "…" : "Accept"}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeclineModal(true)}
              disabled={actionLoading}
            >
              Decline
            </button>
          </div>
        )}

        {/* Requester action for accepted requests */}
        {isRequester && request.status === "accepted" && (
          <div className="pending-card-actions">
            <Link to={`/payment/${request.id}`} className="find-button pending-pay-btn">
              Proceed to Payment →
            </Link>
          </div>
        )}

        {/* Requester can cancel a pending request */}
        {isRequester && request.status === "pending" && (
          <div className="pending-card-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel Request
            </button>
          </div>
        )}

        {/* Declined: show reason */}
        {request.status === "declined" && request.decline_reason && (
          <div className="pending-card-decline-reason">
            <p className="pending-decline-label">Reason given:</p>
            <blockquote className="pending-decline-quote">"{request.decline_reason}"</blockquote>
            {isRequester && (
              <Link to="/locals" className="btn btn-primary pending-find-btn">
                Find Another Host
              </Link>
            )}
          </div>
        )}

        {/* Disputed */}
        {request.status === "disputed" && (
          <div className="pending-card-disputed">
            <p>This booking is under review by our customer service team. We'll be in touch within 24 hours.</p>
          </div>
        )}

        {/* Completed — prompt for review if no bookings row yet */}
        {request.status === "completed" && (
          <div className="pending-card-actions">
            <Link to={`/chat/${request.id}`} className="btn btn-light pending-chat-btn">
              💬 {isHost ? `Contact ${requesterName}` : `Contact ${hostName}`}
            </Link>
          </div>
        )}
      </article>

      {showDeclineModal && (
        <DeclineModal
          onConfirm={handleDecline}
          onCancel={() => setShowDeclineModal(false)}
          loading={actionLoading}
        />
      )}
      {showDisputeModal && (
        <DeclineConfirmationModal
          onConfirm={handleOpenDispute}
          onCancel={() => setShowDisputeModal(false)}
          loading={actionLoading}
        />
      )}
    </>
  );
};

export default PendingBookingCard;
