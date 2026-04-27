import { FALLBACK_EVENT_PHOTO } from "../../utils/historyItem";

const ShareToFieldModal = ({
  item,
  caption,
  captionError,
  onChangeCaption,
  onCancel,
  onShare,
}) => {
  if (!item) return null;
  const previewPhotos = (item.photoGallery ?? [])
    .filter((p) => p !== FALLBACK_EVENT_PHOTO)
    .slice(0, 4);

  return (
    <div
      className="booking-modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="booking-modal field-share-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share experience to The Field"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="booking-modal-close"
          aria-label="Close"
          onClick={onCancel}
        >
          ×
        </button>

        <h3>Share your experience to The Field?</h3>
        <p className="field-share-modal-sub">
          Your photos will appear as a carousel on The Field — visible to other
          travelers and hosts.
        </p>

        <div className="field-share-photo-preview">
          {previewPhotos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Preview ${index + 1}`}
              className="field-share-preview-thumb"
            />
          ))}
        </div>

        <label className="field-share-caption-label">
          Caption <span className="field-share-required">*</span>
          <textarea
            className={`field-share-caption-input${
              captionError ? " field-share-caption-error" : ""
            }`}
            rows={3}
            placeholder="Tell people about your experience..."
            value={caption}
            onChange={(event) => onChangeCaption(event.target.value)}
          />
          {captionError && (
            <span className="field-share-error-msg">
              Caption is required before sharing.
            </span>
          )}
        </label>

        <div className="booking-modal-actions">
          <button type="button" className="btn btn-light" onClick={onCancel}>
            Keep private
          </button>
          <button
            type="button"
            className="find-button"
            onClick={() => onShare(item)}
          >
            Share to The Field
          </button>
        </div>
      </section>
    </div>
  );
};

export default ShareToFieldModal;
