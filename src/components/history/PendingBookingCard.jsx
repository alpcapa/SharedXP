import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DeclineModal from "./DeclineModal";
import DeclineConfirmationModal from "./DeclineConfirmationModal";
import DisputeResponseModal from "./DisputeResponseModal";
import ShareToFieldModal from "./ShareToFieldModal";
import { HOST_RATING_FIELDS, clampRating, FALLBACK_EVENT_PHOTO } from "../../utils/historyItem";
import { deleteFieldPost, lookupFieldPost, saveFieldPost } from "../../utils/fieldPosts";
import { CANCELLATION_POLICIES, computeRefundPct, refundLabel } from "../../utils/cancellationPolicy";

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
  resolved_paid_host: { label: "Dispute resolved — payment released", cls: "resolved" },
  resolved_refunded: { label: "Dispute resolved — Refunded", cls: "resolved" },
};

const getName = (profile) => {
  if (!profile) return null;
  return profile.full_name ||
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    null;
};

const ProfileLink = ({ profile, userId, name }) => {
  const href = `/user/${userId}`;
  return (
    <Link to={href} className="pending-profile-link">
      {name}
    </Link>
  );
};

const ContactLink = ({ requestId, name, unreadCount }) => (
  <Link to={`/chat/${requestId}`} className="btn btn-light pending-chat-btn">
    💬 Chat with {name}
    {unreadCount > 0 && <span className="pending-unread-badge">{unreadCount}</span>}
  </Link>
);

const StarRating = ({ value, onChange }) => (
  <span className="pending-star-row">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`pending-star-btn${value >= star ? " active" : ""}`}
        onClick={() => onChange(value === star ? 0 : star)}
        aria-label={`${star} star${star !== 1 ? "s" : ""}`}
      >
        ★
      </button>
    ))}
  </span>
);

const PendingBookingCard = ({
  request,
  currentUserId,
  unreadCount = 0,
  onAccept,
  onDecline,
  onCancel,
  onConfirmExperience,
  onOpenDispute,
  onSubmitRating,
  currentUser,
  editRatingRequestId,
  scrollToId,
  openDisputeResponseId,
}) => {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDisputeResponseModal, setShowDisputeResponseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Rating panel state (for completed bookings)
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [hostRatings, setHostRatings] = useState({ overall: 0, punctuality: 0, equipmentQuality: 0, localKnowledge: 0, friendliness: 0, value: 0 });
  const [guestOverall, setGuestOverall] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingPhotos, setRatingPhotos] = useState([]);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [shareItem, setShareItem] = useState(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareCaptionError, setShareCaptionError] = useState(false);
  const [sharePosting, setSharePosting] = useState(false);
  const [sharePosted, setSharePosted] = useState(false);
  const [existingFieldPostId, setExistingFieldPostId] = useState(null);
  const [existingFieldCaption, setExistingFieldCaption] = useState("");
  const [initialRatingSnapshot, setInitialRatingSnapshot] = useState(null);

  const refreshExistingFieldPost = async () => {
    if (!currentUserId || !request.id) return null;
    const post = await lookupFieldPost(request.id, currentUserId);
    setExistingFieldPostId(post?.id ?? null);
    setExistingFieldCaption(post?.caption ?? "");
    return post;
  };

  // Check Supabase for an existing field post tied to this booking request.
  useEffect(() => {
    refreshExistingFieldPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, currentUserId]);

  const isHost = request.host_id === currentUserId;
  const isRequester = request.requester_id === currentUserId;

  const alreadyRated = isHost
    ? !!request.host_rated_at
    : !!request.guest_rated_at;

  // Pre-populate form fields from existing request data (for editing or auto-open).
  const populateFromExistingRating = () => {
    const existingPhotos = isHost
      ? (Array.isArray(request.host_photos) ? request.host_photos : [])
      : (Array.isArray(request.guest_photos) ? request.guest_photos : []);
    const existingReview = isHost ? (request.host_review ?? "") : (request.guest_review ?? "");
    const existingOverall = isHost ? (request.host_rating ?? 0) : (request.guest_rating ?? 0);
    const existingBreakdown = !isHost ? (request.guest_host_ratings ?? {}) : {};

    if (isHost) {
      setGuestOverall(existingOverall);
      setRatingReview(existingReview);
      setRatingPhotos(existingPhotos);
    } else {
      const breakdown = existingBreakdown;
      setHostRatings({
        overall: existingOverall,
        punctuality: breakdown.punctuality ?? 0,
        equipmentQuality: breakdown.equipmentQuality ?? 0,
        localKnowledge: breakdown.localKnowledge ?? 0,
        friendliness: breakdown.friendliness ?? 0,
        value: breakdown.value ?? 0,
      });
      setRatingReview(existingReview);
      setRatingPhotos(existingPhotos);
    }
    setInitialRatingSnapshot({
      overall: existingOverall,
      review: existingReview,
      photos: existingPhotos,
      hostRatings: {
        overall: existingOverall,
        punctuality: existingBreakdown.punctuality ?? 0,
        equipmentQuality: existingBreakdown.equipmentQuality ?? 0,
        localKnowledge: existingBreakdown.localKnowledge ?? 0,
        friendliness: existingBreakdown.friendliness ?? 0,
        value: existingBreakdown.value ?? 0,
      },
    });
    setRatingDone(false);
    setRatingError("");
  };

  // Auto-open and pre-fill the rating panel when navigating here from "Edit post" in The Field.
  useEffect(() => {
    if (editRatingRequestId !== request.id || request.status !== "completed") return;
    populateFromExistingRating();
    setShowRatingPanel(true);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRatingRequestId]);

  // Scroll to and briefly highlight this card when linked from an email notification.
  useEffect(() => {
    if (scrollToId !== request.id) return;
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      cardRef.current?.classList.add("pending-card-highlight");
      setTimeout(() => cardRef.current?.classList.remove("pending-card-highlight"), 2000);
    });
  }, [scrollToId, request.id]);

  // Auto-open the dispute response modal when arriving from the email link.
  useEffect(() => {
    if (!openDisputeResponseId || openDisputeResponseId !== request.dispute?.id) return;
    if (request.dispute?.host_response) return; // already responded
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setShowDisputeResponseModal(true);
  }, [openDisputeResponseId, request.dispute?.id, request.dispute?.host_response]);

  const initialHostRatings = initialRatingSnapshot?.hostRatings ?? {
    overall: 0,
    punctuality: 0,
    equipmentQuality: 0,
    localKnowledge: 0,
    friendliness: 0,
    value: 0,
  };
  const photosChanged =
    ratingPhotos.length !== (initialRatingSnapshot?.photos?.length ?? 0) ||
    ratingPhotos.some((photo, index) => photo !== initialRatingSnapshot?.photos?.[index]);
  const hasRatingChanges = isHost
    ? (
      guestOverall !== (initialRatingSnapshot?.overall ?? 0) ||
      ratingReview !== (initialRatingSnapshot?.review ?? "") ||
      photosChanged
    )
    : (
      hostRatings.overall !== initialHostRatings.overall ||
      hostRatings.punctuality !== initialHostRatings.punctuality ||
      hostRatings.equipmentQuality !== initialHostRatings.equipmentQuality ||
      hostRatings.localKnowledge !== initialHostRatings.localKnowledge ||
      hostRatings.friendliness !== initialHostRatings.friendliness ||
      hostRatings.value !== initialHostRatings.value ||
      ratingReview !== (initialRatingSnapshot?.review ?? "") ||
      photosChanged
    );

  const handleRatingPhotoUpload = (e) => {
    const remaining = 5 - ratingPhotos.length;
    if (remaining <= 0) return;
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    const promises = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(String(ev.target?.result ?? ""));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        })
    );
    Promise.all(promises).then((urls) => {
      const valid = urls.filter(Boolean);
      if (valid.length) setRatingPhotos((prev) => [...prev, ...valid].slice(0, 5));
    });
    e.target.value = "";
  };

  const handleSubmitRating = async () => {
    const overall = isHost ? guestOverall : hostRatings.overall;
    if (!overall || !hasRatingChanges) return;
    setRatingLoading(true);
    setRatingError("");
    const ratingData = isHost
      ? { rating: guestOverall, review: ratingReview, photos: ratingPhotos }
      : { overall: hostRatings.overall, hostRatings, review: ratingReview, photos: ratingPhotos };
    const result = await onSubmitRating?.(request.id, isHost, ratingData);
    setRatingLoading(false);
    // Support both the new { ok, errorMessage, photoUrls } shape and legacy boolean return.
    const ok = result && typeof result === "object" ? result.ok : Boolean(result);
    const errMsg = result && typeof result === "object" ? (result.errorMessage ?? "") : "";
    if (ok) {
      setRatingDone(true);
      setRatingError("");
      const existingPost = await refreshExistingFieldPost();
      const previousCaption = existingPost?.caption ?? "";
      // Use uploaded storage URLs for the field post so we avoid base64 data-URL
      // size limits that would cause localStorage.setItem to fail silently.
      const uploadedUrls = (result && typeof result === "object") ? (result.photoUrls ?? []) : [];
      const photosForShare = uploadedUrls.length > 0 ? uploadedUrls : ratingPhotos.filter(Boolean);
      if (photosForShare.length > 0) {
        setShareItem({
          id: request.id,
          eventName: request.sport,
          sport: request.sport,
          photoGallery: photosForShare,
        });
        setShareCaption(previousCaption || ratingReview || "");
        setShareCaptionError(false);
        setSharePosting(false);
        setSharePosted(false);
      }
      // Keep panel visible so user can close it with the toggle button
    } else {
      setRatingError(errMsg || "Could not save your rating. Please try again.");
    }
  };

  const handleShare = async (item) => {
    if (!shareCaption.trim()) { setShareCaptionError(true); return; }
    setSharePosting(true);
    setShareCaptionError(false);
    const fieldPostRating = clampRating(
      isHost
        ? (request.host_rating ?? 0)
        : (request.guest_rating ?? request.guest_host_ratings?.overall ?? 0)
    );
    const posterCity = currentUser?.city ?? currentUser?.hostProfile?.city ?? "";
    const posterCountry = currentUser?.country ?? currentUser?.hostProfile?.country ?? "";
    const savedId = await saveFieldPost({
      id: existingFieldPostId,
      sourceRequestId: request.id,
      posterId: currentUserId,
      role: isHost ? "hosted" : "attended",
      hostName: currentUser?.fullName ?? "SharedXP User",
      hostPhoto: currentUser?.photo ?? "",
      sport: item.sport,
      rating: fieldPostRating,
      city: posterCity,
      country: posterCountry,
      caption: shareCaption.trim(),
      photos: (item.photoGallery ?? []).filter((p) => p && p !== FALLBACK_EVENT_PHOTO),
    });
    setSharePosting(false);
      if (savedId) {
        setExistingFieldPostId(savedId);
        setExistingFieldCaption(shareCaption.trim());
        setSharePosted(true);
        navigate("/the-field");
      } else {
        window.alert("Could not post to The Field right now. Please try again.");
      }
  };

  const handleDeleteFieldPost = async () => {
    if (!existingFieldPostId) return;
    if (!window.confirm("Delete this post from The Field?")) return;
    await deleteFieldPost(existingFieldPostId);
    setExistingFieldPostId(null);
    setExistingFieldCaption("");
  };

  // Opens/closes the rating panel; pre-populates fields from saved data when opening for editing.
  const handleOpenEditPanel = () => {
    if (!showRatingPanel) {
      populateFromExistingRating();
    }
    setShowRatingPanel((prev) => !prev);
  };

  const hostName = getName(request.host_profile) ?? "Host";
  const requesterName = getName(request.requester_profile) ?? "Guest";
  const statusInfo = (() => {
    if (request.status === "cancelled" && Number(request.refund_pct ?? 0) > 0) {
      return request.refund_sent_at
        ? { label: "Cancelled · Refund sent", cls: "cancelled" }
        : { label: "Cancelled · Refund pending", cls: "cancelled-refund-pending" };
    }
    return STATUS_LABELS[request.status] ?? { label: request.status, cls: "pending" };
  })();

  const autoConfirmCountdown = useCountdown(
    request.status === "in_progress" ? request.auto_confirm_at : null,
  );

  const experienceEnded =
    request.status === "in_progress" &&
    request.experience_ends_at &&
    new Date(request.experience_ends_at).getTime() <= Date.now();

  const sessionStarted =
    request.requested_date &&
    request.requested_time &&
    new Date(`${request.requested_date}T${request.requested_time}:00`).getTime() <= Date.now();

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
    let message;
    if (request.status === "pending" || request.status === "accepted") {
      message = "Cancel this booking?\n\nNo payment has been taken — you will not be charged.";
    } else {
      const policy = request.cancellation_policy || "flexible";
      const refundPct = computeRefundPct(policy, request.requested_date, request.requested_time);
      const policyLabel = CANCELLATION_POLICIES[policy]?.label ?? "Flexible";
      message = `Cancel this booking?\n\nCancellation policy: ${policyLabel}\nRefund: ${refundLabel(refundPct)}`;
    }
    if (!confirm(message)) return;
    setActionLoading(true);
    await onCancel(request.id, request);
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
      <article ref={cardRef} className={`pending-card status-${statusInfo.cls}`}>
        <div className="pending-card-header">
          <div className="pending-card-title-row">
            <h2 className="pending-card-sport">{request.sport}</h2>
            <span className={`pending-status-badge status-${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="pending-card-ref">Ref: #{request.id.slice(0, 8).toUpperCase()}</p>
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
          {["pending", "accepted", "in_progress"].includes(request.status) && (
            <p className="pending-card-cancel-policy">
              {(() => {
                const policy = request.cancellation_policy || "flexible";
                const tier = CANCELLATION_POLICIES[policy] ?? CANCELLATION_POLICIES.flexible;
                return (
                  <>
                    <span className={`cancel-policy-badge cancel-policy-badge--${tier.color}`}>
                      {tier.label}
                    </span>
                    {" "}{tier.tagline}
                  </>
                );
              })()}
            </p>
          )}
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
              <ContactLink
                requestId={request.id}
                name={isHost ? requesterName : hostName}
                unreadCount={unreadCount}
              />
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
              {isRequester && !sessionStarted && (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? "…" : "Cancel Booking"}
                </button>
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
              Proceed to Payment
            </Link>
            <button
              type="button"
              className="btn btn-light"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? "…" : "Cancel Booking"}
            </button>
          </div>
        )}

        {/* Requester can cancel a pending or accepted request */}
        {isRequester && request.status === "pending" && (
          <div className="pending-card-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? "…" : "Cancel Request"}
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
            <p>This booking is under review by our customer service team. We'll be in touch as soon as possible.</p>
            {request.dispute && isHost && !request.dispute.host_response && (
              <div className="dispute-account-block" style={{ marginTop: 12 }}>
                <p className="dispute-pending-note">You haven't submitted your response yet.</p>
                <button
                  type="button"
                  className="find-button pending-pay-btn"
                  style={{ display: "inline-block", marginTop: 8 }}
                  onClick={() => setShowDisputeResponseModal(true)}
                >
                  Submit My Response
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resolved dispute verdict */}
        {(request.status === "resolved_paid_host" || request.status === "resolved_refunded") && (
          <div className="pending-card-disputed pending-card-dispute-resolved">
            <p className="dispute-verdict-label">
              {request.status === "resolved_refunded"
                ? "Our team reviewed this dispute and decided to refund the guest."
                : "Our team reviewed this dispute and decided to release payment to the host."}
              {" "}If you have questions, please <Link to="/contact">contact support</Link>.
            </p>
          </div>
        )}

        {/* Completed */}
        {request.status === "completed" && (
          <div className="pending-card-completed">
            <div className="pending-card-actions">
              {alreadyRated ? (
                <button
                  type="button"
                  className={`btn btn-light pending-rate-btn pending-edit-rated-btn`}
                  onClick={handleOpenEditPanel}
                >
                  {showRatingPanel ? "✕ Close" : "✏ Edit Rating"}
                </button>
              ) : onSubmitRating ? (
                <button
                  type="button"
                  className={`btn ${showRatingPanel ? "btn-light" : "btn-primary"} pending-rate-btn`}
                  onClick={() => setShowRatingPanel((prev) => !prev)}
                >
                  {showRatingPanel ? "✕ Close" : `⭐ ${isHost ? "Rate Guest" : "Rate Host"}`}
                </button>
              ) : null}
            </div>

            {showRatingPanel && (
              <div className="pending-rating-panel">
                <h3 className="pending-rating-title">
                  {ratingDone
                    ? `✓ Rating ${alreadyRated ? "updated" : "submitted"} — thank you!`
                    : isHost ? `Rate ${requesterName}` : `Rate ${hostName}`}
                </h3>

                {!ratingDone && (
                  <>
                    {isHost ? (
                      <div className="pending-rating-field">
                        <span className="pending-rating-label">Overall</span>
                        <StarRating value={guestOverall} onChange={setGuestOverall} />
                      </div>
                    ) : (
                      HOST_RATING_FIELDS.map((field) => (
                        <div key={field.key} className="pending-rating-field">
                          <span className="pending-rating-label">{field.label}</span>
                          <StarRating
                            value={hostRatings[field.key]}
                            onChange={(v) =>
                              setHostRatings((prev) => ({
                                ...prev,
                                [field.key]: v,
                              }))
                            }
                          />
                        </div>
                      ))
                    )}

                    <label className="pending-rating-field pending-rating-review">
                      <span className="pending-rating-label">
                        {isHost ? "Review guest" : "Review host"}
                      </span>
                      <textarea
                        className="pending-rating-textarea"
                        rows={3}
                        placeholder="Share your experience..."
                        value={ratingReview}
                        onChange={(e) => setRatingReview(e.target.value)}
                      />
                    </label>

                    <div className="pending-rating-field">
                      <span className="pending-rating-label">Add Photos</span>
                      <div className="pending-rating-photos">
                        {ratingPhotos.map((photo, i) => (
                          <div key={i} className="pending-rating-photo-wrap">
                            <img src={photo} alt={`Photo ${i + 1}`} className="pending-rating-thumb" />
                            <button
                              type="button"
                              className="pending-rating-photo-delete"
                              aria-label={`Remove photo ${i + 1}`}
                              onClick={() => setRatingPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                            >×</button>
                          </div>
                        ))}
                        {ratingPhotos.length < 5 && (
                          <label className="pending-rating-photo-add">
                            + Add
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="pending-rating-photo-input"
                              onChange={handleRatingPhotoUpload}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="pending-rating-actions">
                      {ratingError && (
                        <p className="pending-rating-error" role="alert">{ratingError}</p>
                      )}
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => setShowRatingPanel(false)}
                        disabled={ratingLoading}
                      >
                        Cancel
                      </button>
                       <button
                         type="button"
                         className="btn btn-primary"
                         onClick={handleSubmitRating}
                         disabled={ratingLoading || (isHost ? !guestOverall : !hostRatings.overall) || !hasRatingChanges}
                       >
                         {ratingLoading ? "Saving…" : alreadyRated ? "Update Rating" : "Submit Rating"}
                       </button>
                    </div>
                  </>
                )}
              </div>
            )}
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
      {showDisputeResponseModal && request.dispute && (
        <DisputeResponseModal
          dispute={request.dispute}
          request={request}
          requesterName={requesterName}
          onClose={() => setShowDisputeResponseModal(false)}
        />
      )}
      {shareItem && (
        <ShareToFieldModal
          item={shareItem}
          caption={shareCaption}
          captionError={shareCaptionError}
          isSharing={sharePosting}
          isShared={sharePosted}
          onChangeCaption={(v) => { setShareCaption(v); if (v.trim()) setShareCaptionError(false); }}
          onCancel={() => {
            setShareItem(null);
            setSharePosting(false);
            setSharePosted(false);
            setShowRatingPanel(false);
          }}
          onShare={handleShare}
        />
      )}
    </>
  );
};

export default PendingBookingCard;
