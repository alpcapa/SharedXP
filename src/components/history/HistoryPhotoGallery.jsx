import { useEffect } from "react";
import { FALLBACK_EVENT_PHOTO } from "../../utils/historyItem";

const HistoryPhotoGallery = ({ gallery, onClose, onShift }) => {
  useEffect(() => {
    if (!gallery) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery, onClose]);

  if (!gallery) return null;

  const currentPhoto =
    gallery.photos?.[gallery.currentIndex] || FALLBACK_EVENT_PHOTO;
  const total = gallery.photos?.length ?? 0;

  return (
    <div
      className="booking-modal-backdrop history-gallery-backdrop"
      onClick={onClose}
    >
      <div
        className="booking-modal history-gallery-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${gallery.eventName} photo gallery`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="booking-modal-close"
          aria-label="Close photo gallery"
          onClick={onClose}
        >
          ×
        </button>
        <h3>Photo Gallery</h3>
        <p className="booking-modal-meta">{gallery.eventName}</p>
        <div className="history-gallery-carousel">
          <button
            type="button"
            className="history-gallery-nav"
            onClick={() => onShift(-1)}
            aria-label="Previous photo"
            disabled={total <= 1}
          >
            ‹
          </button>
          <img
            className="history-gallery-photo"
            src={currentPhoto}
            alt={`${gallery.eventName} gallery`}
            onError={(event) => {
              if (event.currentTarget.src !== FALLBACK_EVENT_PHOTO) {
                event.currentTarget.src = FALLBACK_EVENT_PHOTO;
              }
            }}
          />
          <button
            type="button"
            className="history-gallery-nav"
            onClick={() => onShift(1)}
            aria-label="Next photo"
            disabled={total <= 1}
          >
            ›
          </button>
        </div>
        <p className="history-gallery-counter">
          {gallery.currentIndex + 1} of {total}
        </p>
      </div>
    </div>
  );
};

export default HistoryPhotoGallery;
