import {
  FALLBACK_EVENT_PHOTO,
  FALLBACK_PARTICIPANT_PHOTO,
  HOST_RATING_FIELDS,
  clampRating,
  formatStarRating,
} from "../../utils/historyItem";

const HistoryCard = ({
  item,
  isDirty,
  onUpdateField,
  onUpdateHostRating,
  onSaveItem,
  onConfirmCompletion,
  onOpenGallery,
  onUploadPhotos,
  onDeletePhoto,
}) => {
  const isAttendee = item.role === "attended";
  const realPhotos = (item.photoGallery ?? []).filter(
    (p) => p !== FALLBACK_EVENT_PHOTO
  );

  return (
    <article
      className={`history-card${isAttendee ? " history-card-attendee" : ""}`}
    >
      {isAttendee && (
        <div className="history-attendee-summary">
          <div className="history-event-title-row">
            <h2>{item.eventName}</h2>
            <span className="history-event-date">{item.eventDateLabel}</span>
          </div>
          <p className="history-host-line">
            Hosted by <strong>{item.hostName}</strong>
          </p>
        </div>
      )}
      <div className="history-card-photo-wrap">
        <img
          className="history-card-photo"
          src={item.photo}
          alt={`Photo of ${item.eventName}`}
          onError={(event) => {
            if (event.currentTarget.src !== FALLBACK_EVENT_PHOTO) {
              event.currentTarget.src = FALLBACK_EVENT_PHOTO;
            }
          }}
        />
        <span className={`history-role-stamp role-${item.role}`}>
          {item.role === "attended" ? "Attended" : "Hosted"}
        </span>
        <button
          type="button"
          className="history-photo-gallery-link"
          onClick={() => onOpenGallery(item)}
        >
          Photo Gallery
        </button>
        <label className="history-photo-upload-label" aria-label="Add photos">
          + Add Photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="history-photo-upload-input"
            onChange={(event) => onUploadPhotos(item.id, event.target.files)}
          />
        </label>

        {realPhotos.length > 0 && (
          <div className="history-thumb-strip">
            {realPhotos.map((photo, photoIndex) => (
              <div key={photoIndex} className="history-thumb-wrap">
                <img
                  src={photo}
                  alt={`Photo ${photoIndex + 1}`}
                  className="history-thumb"
                  onClick={() => onOpenGallery(item, photoIndex)}
                />
                <button
                  type="button"
                  className="history-thumb-delete"
                  aria-label={`Delete photo ${photoIndex + 1}`}
                  onClick={() => onDeletePhoto(item.id, photoIndex)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {item.confirmationStatus === "pending" ? (
          <button
            type="button"
            className={`history-confirmation-btn${
              isAttendee ? "" : " is-readonly"
            }`}
            onClick={isAttendee ? () => onConfirmCompletion(item.id) : undefined}
            disabled={!isAttendee}
          >
            {isAttendee ? "Confirm Completion" : "Confirmation Pending"}
          </button>
        ) : (
          <span className="history-completed-status">Completed</span>
        )}
        <span
          className={`history-payment-status ${
            item.paymentReleased ? "released" : "pending"
          }`}
        >
          {item.paymentReleased
            ? "Payment released to host"
            : "Payment release pending"}
        </span>
      </div>
      <div className="history-card-body">
        {!isAttendee && (
          <div className="history-card-head">
            <div>
              <div className="history-event-title-row">
                <h2>{item.eventName}</h2>
                <span className="history-event-date">{item.eventDateLabel}</span>
              </div>
              <div className="host-history-participant">
                <img
                  className="participant-photo"
                  src={item.participantPhoto}
                  alt={item.participantName}
                  onError={(event) => {
                    if (event.currentTarget.src !== FALLBACK_PARTICIPANT_PHOTO) {
                      event.currentTarget.src = FALLBACK_PARTICIPANT_PHOTO;
                    }
                  }}
                />
                <span className="participant-name">{item.participantName}</span>
                {item.attendeeRating > 0 && (
                  <span
                    className="history-stars history-participant-stars participant-gave-stars"
                    aria-label={`Attendee rating: ${item.attendeeRating} stars`}
                  >
                    (gave you {formatStarRating(item.attendeeRating)})
                  </span>
                )}
              </div>
            </div>
            <span className="sport-pill">{item.sport}</span>
          </div>
        )}

        <div className="history-edit-grid">
          {isAttendee ? (
            <div className="history-host-rating-section">
              <div className="history-host-rating-head">
                <span className="history-host-rating-title-wrap">
                  <span className="history-host-rating-title">Rate Host</span>
                  <span className="sport-pill">{item.sport}</span>
                </span>
                {item.rating > 0 && (
                  <span
                    className="history-stars"
                    aria-label={`Your rating: ${item.rating} stars`}
                  >
                    {formatStarRating(item.rating)}
                  </span>
                )}
              </div>
              <div className="history-host-rating-grid">
                {HOST_RATING_FIELDS.map((ratingField) => (
                  <label className="history-field" key={ratingField.key}>
                    {ratingField.label}
                    <select
                      value={String(item.hostRatings?.[ratingField.key] ?? 0)}
                      aria-label={`${ratingField.label} rating for host of ${item.eventName}`}
                      onChange={(event) =>
                        onUpdateHostRating(
                          item.id,
                          ratingField.key,
                          event.target.value
                        )
                      }
                    >
                      <option value="0">Not rated</option>
                      <option value="1">1⭐</option>
                      <option value="2">2⭐</option>
                      <option value="3">3⭐</option>
                      <option value="4">4⭐</option>
                      <option value="5">5⭐</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <label className="history-field">
              Rate participant
              <select
                value={String(item.rating)}
                aria-label={`Rating for ${item.participantName}`}
                onChange={(event) =>
                  onUpdateField(item.id, "rating", clampRating(event.target.value))
                }
              >
                <option value="0">Not rated</option>
                <option value="1">1⭐</option>
                <option value="2">2⭐</option>
                <option value="3">3⭐</option>
                <option value="4">4⭐</option>
                <option value="5">5⭐</option>
              </select>
            </label>
          )}

          <label className="history-field">
            {isAttendee ? "Review Host" : "Review participant"}
            <textarea
              value={item.review}
              rows={3}
              placeholder={
                isAttendee
                  ? "Write your review of the host"
                  : "Write your review of this participant"
              }
              aria-label={
                isAttendee
                  ? `Review host for ${item.eventName}`
                  : `Review for ${item.participantName}`
              }
              onChange={(event) =>
                onUpdateField(item.id, "review", event.target.value)
              }
            />
          </label>

          {isDirty && (
            <div className="history-save-row">
              <button
                type="button"
                className="btn btn-primary history-save-btn"
                onClick={() => onSaveItem(item.id)}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default HistoryCard;
