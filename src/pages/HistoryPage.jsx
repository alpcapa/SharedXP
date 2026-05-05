import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import HistoryCard from "../components/history/HistoryCard";
import PendingBookingCard from "../components/history/PendingBookingCard";
import HistoryPhotoGallery from "../components/history/HistoryPhotoGallery";
import ShareToFieldModal from "../components/history/ShareToFieldModal";
import {
  FALLBACK_EVENT_PHOTO,
  MAX_PHOTOS_PER_SESSION,
  DEFAULT_FIELD_POST_USER_NAME,
  clampRating,
  mergeAndSort,
  normalizeAttended,
  normalizeHosted,
  normalizeHostRatings,
  toStoredAttended,
  toStoredHosted,
} from "../utils/historyItem";
import { saveFieldPost } from "../utils/fieldPosts";
import { useBookingRequests } from "../hooks/useBookingRequests";

const buildFieldPost = (item, currentUser, caption) => {
  const realPhotos = (item.photoGallery ?? []).filter(
    (p) => p && p !== FALLBACK_EVENT_PHOTO
  );
  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? `user-${globalThis.crypto.randomUUID()}`
      : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    hostId: null,
    hostName: currentUser?.fullName ?? DEFAULT_FIELD_POST_USER_NAME,
    hostPhoto: currentUser?.photo ?? "",
    sport: item.sport,
    city: currentUser?.city ?? currentUser?.hostProfile?.city ?? "",
    country: currentUser?.country ?? currentUser?.hostProfile?.country ?? "",
    caption: caption.trim(),
    photos: realPhotos,
    photo: realPhotos[0] ?? "",
    postedAt: new Date().toISOString(),
    likes: 0,
  };
};

const HistoryPage = ({
  currentUser,
  authLoading,
  onLogout,
  onSaveHistory,
  onSaveHostHistory,
}) => {
  const location = useLocation();
  const queryTab = new URLSearchParams(location.search).get("tab");

  const [allItems, setAllItems] = useState(() =>
    mergeAndSort(
      normalizeAttended(currentUser?.history),
      normalizeHosted(currentUser?.hostHistory)
    )
  );
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedRole, setSelectedRole] = useState(queryTab === "pending" ? "pending" : "all");

  const {
    requests: bookingRequests,
    loading: requestsLoading,
    unreadCounts,
    acceptRequest,
    declineRequest,
    cancelRequest,
    confirmExperience,
    openDispute,
  } = useBookingRequests(currentUser);

  const ACTIVE_STATUSES = ["pending", "accepted", "payment_pending", "in_progress", "disputed"];
  const activeBookingRequests = bookingRequests.filter((r) => ACTIVE_STATUSES.includes(r.status));

  // Sync tab from URL (e.g. after booking submission redirect)
  useEffect(() => {
    setSelectedRole(queryTab === "pending" ? "pending" : "all");
  }, [queryTab]);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [activeGallery, setActiveGallery] = useState(null);
  const [sharePromptItemId, setSharePromptItemId] = useState(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareCaptionError, setShareCaptionError] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const lastAutoConfirmPersistKeyRef = useRef("");

  useEffect(() => {
    setAllItems(
      mergeAndSort(
        normalizeAttended(currentUser?.history),
        normalizeHosted(currentUser?.hostHistory)
      )
    );
    setDirtyIds(new Set());
  }, [currentUser?.history, currentUser?.hostHistory]);

  // After items normalise, any session past the auto-confirm window is upgraded
  // to "completed" + paymentReleased. Persist this once per change so the
  // upgraded state survives a reload, then clear the autoConfirmed flag so we
  // don't loop.
  useEffect(() => {
    const autoConfirmedIds = allItems
      .filter((item) => item.autoConfirmed)
      .map((item) => item.id);
    if (!autoConfirmedIds.length) {
      lastAutoConfirmPersistKeyRef.current = "";
      return;
    }
    const persistKey = [...autoConfirmedIds].sort().join("|");
    if (lastAutoConfirmPersistKeyRef.current === persistKey) return;
    lastAutoConfirmPersistKeyRef.current = persistKey;

    const hasAttendedAuto = allItems.some(
      (item) => item.autoConfirmed && item.role === "attended"
    );
    const hasHostedAuto = allItems.some(
      (item) => item.autoConfirmed && item.role === "hosted"
    );
    if (hasAttendedAuto) onSaveHistory?.(toStoredAttended(allItems));
    if (hasHostedAuto) onSaveHostHistory?.(toStoredHosted(allItems));

    const autoConfirmedSet = new Set(autoConfirmedIds);
    setAllItems((prev) =>
      prev.map((item) =>
        autoConfirmedSet.has(item.id)
          ? { ...item, autoConfirmed: false }
          : item
      )
    );
  }, [allItems, onSaveHistory, onSaveHostHistory]);

  const availableSports = useMemo(
    () => [
      "All",
      ...new Set(allItems.map((item) => item.sport).filter(Boolean)),
    ],
    [allItems]
  );

  const visibleItems = useMemo(
    () =>
      allItems.filter(
        (item) =>
          (selectedSport === "All" || item.sport === selectedSport) &&
          (selectedRole === "all" || item.role === selectedRole)
      ),
    [allItems, selectedSport, selectedRole]
  );

  const updateItem = useCallback((itemId, fieldName, fieldValue) => {
    setAllItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [fieldName]: fieldValue } : item
      )
    );
    setDirtyIds((prev) => new Set([...prev, itemId]));
  }, []);

  const updateHostRating = useCallback((itemId, ratingField, fieldValue) => {
    const next = clampRating(fieldValue);
    setAllItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hostRatings = {
          ...normalizeHostRatings(item),
          [ratingField]: next,
        };
        return { ...item, hostRatings, rating: hostRatings.overall };
      })
    );
    setDirtyIds((prev) => new Set([...prev, itemId]));
  }, []);

  const saveItem = useCallback(
    (itemId) => {
      setAllItems((prev) => {
        onSaveHistory?.(toStoredAttended(prev));
        onSaveHostHistory?.(toStoredHosted(prev));
        return prev;
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // Prompt to share if the saved item now has real photos and isn't shared.
      const savedItem = allItems.find((item) => item.id === itemId);
      const hasRealPhotos = savedItem?.photoGallery?.some(
        (p) => p && p !== FALLBACK_EVENT_PHOTO
      );
      if (hasRealPhotos && !savedItem?.sharedToField) {
        setShareCaption("");
        setShareCaptionError(false);
        setSharePromptItemId(itemId);
      }
    },
    [onSaveHistory, onSaveHostHistory, allItems]
  );

  const handlePhotoUpload = useCallback(
    (itemId, files) => {
      if (!files || files.length === 0) return;
      const currentItem = allItems.find((item) => item.id === itemId);
      const currentRealPhotos = (currentItem?.photoGallery ?? []).filter(
        (p) => p && p !== FALLBACK_EVENT_PHOTO
      );
      const remainingSlots = MAX_PHOTOS_PER_SESSION - currentRealPhotos.length;
      if (remainingSlots <= 0) {
        alert(
          `You can add a maximum of ${MAX_PHOTOS_PER_SESSION} photos per session.`
        );
        return;
      }
      const fileArray = Array.from(files).slice(0, remainingSlots);
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = String(event.target?.result ?? "");
          if (!dataUrl) return;
          setAllItems((prev) =>
            prev.map((item) => {
              if (item.id !== itemId) return item;
              const currentGallery = Array.isArray(item.photoGallery)
                ? item.photoGallery.filter((p) => p !== FALLBACK_EVENT_PHOTO)
                : [];
              const updatedGallery = [...currentGallery, dataUrl];
              return {
                ...item,
                photo: updatedGallery[0],
                photoGallery: updatedGallery,
              };
            })
          );
          setDirtyIds((prev) => new Set([...prev, itemId]));
        };
        reader.readAsDataURL(file);
      });
    },
    [allItems]
  );

  const handlePhotoDelete = useCallback((itemId, photoIndex) => {
    setAllItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentGallery = Array.isArray(item.photoGallery)
          ? item.photoGallery.filter((p) => p !== FALLBACK_EVENT_PHOTO)
          : [];
        const updatedGallery = currentGallery.filter(
          (_, index) => index !== photoIndex
        );
        return {
          ...item,
          photo: updatedGallery[0] || FALLBACK_EVENT_PHOTO,
          photoGallery: updatedGallery.length
            ? updatedGallery
            : [FALLBACK_EVENT_PHOTO],
        };
      })
    );
    setDirtyIds((prev) => new Set([...prev, itemId]));
  }, []);

  const handleShareToField = useCallback(
    (item) => {
      if (!shareCaption.trim()) {
        setShareCaptionError(true);
        return;
      }
      const post = buildFieldPost(item, currentUser, shareCaption);
      saveFieldPost(post);

      setAllItems((prev) => {
        const next = prev.map((historyItem) =>
          historyItem.id === item.id
            ? { ...historyItem, sharedToField: true }
            : historyItem
        );
        onSaveHistory?.(toStoredAttended(next));
        onSaveHostHistory?.(toStoredHosted(next));
        return next;
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setShareCaption("");
      setShareCaptionError(false);
      setSharePromptItemId(null);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    },
    [shareCaption, currentUser, onSaveHistory, onSaveHostHistory]
  );

  const openGallery = useCallback((item, startIndex = 0) => {
    const photos = item.photoGallery?.length
      ? item.photoGallery
      : [item.photo || FALLBACK_EVENT_PHOTO];
    const safeStartIndex = Math.max(
      0,
      Math.min(photos.length - 1, startIndex)
    );
    setActiveGallery({
      eventName: item.eventName,
      photos,
      currentIndex: safeStartIndex,
    });
  }, []);

  const closeGallery = useCallback(() => setActiveGallery(null), []);

  const shiftGallery = useCallback((step) => {
    setActiveGallery((prev) => {
      if (!prev || prev.photos.length <= 1) return prev;
      const total = prev.photos.length;
      return {
        ...prev,
        currentIndex: (prev.currentIndex + step + total) % total,
      };
    });
  }, []);

  const confirmCompletion = useCallback(
    (itemId) => {
      const nowIso = new Date().toISOString();
      setAllItems((prev) => {
        const next = prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                confirmationStatus: "completed",
                confirmedAt: nowIso,
                paymentReleased: true,
                autoConfirmed: false,
              }
            : item
        );
        onSaveHistory?.(toStoredAttended(next));
        onSaveHostHistory?.(toStoredHosted(next));
        return next;
      });
    },
    [onSaveHistory, onSaveHostHistory]
  );

  if (!currentUser) {
    if (authLoading) {
      return (
        <div className="home-page">
          <div className="middle-page-frame">
            <section className="hero auth-hero"><SiteHeader /></section>
            <main className="middle-section simple-page">
              <p>Loading…</p>
            </main>
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to view your experience history.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const sharePromptItem = sharePromptItemId
    ? allItems.find((item) => item.id === sharePromptItemId)
    : null;

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page history-page">
          <h1>History</h1>
          <p className="history-subtitle">
            Your experiences, shown from latest to oldest.
          </p>
          <div
            className="host-sport-tabs history-role-tabs"
            role="tablist"
            aria-label="Filter history by role"
          >
            {[
              { value: "all", label: "All" },
              { value: "pending", label: `Ongoing${bookingRequests.filter(r => ["pending","accepted","payment_pending","in_progress","disputed"].includes(r.status)).length ? ` (${bookingRequests.filter(r => ["pending","accepted","payment_pending","in_progress","disputed"].includes(r.status)).length})` : ""}` },
              { value: "hosted", label: "Hosted" },
              { value: "attended", label: "Attended" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selectedRole === tab.value}
                className={`host-sport-tab${
                  selectedRole === tab.value ? " active" : ""
                }`}
                onClick={() => setSelectedRole(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {availableSports.length > 1 && (
            <div
              className="host-sport-tabs history-sport-tabs"
              role="tablist"
              aria-label="Filter history by sport"
            >
              {availableSports.map((sportName) => (
                <button
                  key={sportName}
                  type="button"
                  role="tab"
                  aria-selected={selectedSport === sportName}
                  className={`host-sport-tab${
                    selectedSport === sportName ? " active" : ""
                  }`}
                  onClick={() => setSelectedSport(sportName)}
                >
                  {sportName}
                </button>
              ))}
            </div>
          )}

          {selectedRole === "pending" ? (
            requestsLoading ? (
              <p className="history-loading">Loading…</p>
            ) : bookingRequests.length ? (
              <div className="history-list">
                {bookingRequests.map((req) => (
                  <PendingBookingCard
                    key={req.id}
                    request={req}
                    currentUserId={currentUser.id}
                    unreadCount={unreadCounts[req.id] ?? 0}
                    onAccept={acceptRequest}
                    onDecline={declineRequest}
                    onCancel={cancelRequest}
                    onConfirmExperience={confirmExperience}
                    onOpenDispute={openDispute}
                  />
                ))}
              </div>
            ) : (
              <p>No booking requests yet. <Link to="/locals">Find a host</Link> to get started.</p>
            )
          ) : (
            <>
              {selectedRole === "all" && activeBookingRequests.length > 0 && (
                <div className="history-list">
                  {activeBookingRequests.map((req) => (
                    <PendingBookingCard
                      key={req.id}
                      request={req}
                      currentUserId={currentUser.id}
                      unreadCount={unreadCounts[req.id] ?? 0}
                      onAccept={acceptRequest}
                      onDecline={declineRequest}
                      onCancel={cancelRequest}
                      onConfirmExperience={confirmExperience}
                      onOpenDispute={openDispute}
                    />
                  ))}
                </div>
              )}
              {visibleItems.length > 0 ? (
                <div className="history-list">
                  {visibleItems.map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      isDirty={dirtyIds.has(item.id)}
                      onUpdateField={updateItem}
                      onUpdateHostRating={updateHostRating}
                      onSaveItem={saveItem}
                      onConfirmCompletion={confirmCompletion}
                      onOpenGallery={openGallery}
                      onUploadPhotos={handlePhotoUpload}
                      onDeletePhoto={handlePhotoDelete}
                    />
                  ))}
                </div>
              ) : selectedRole === "all" && activeBookingRequests.length > 0 ? null : (
                <p>
                  {allItems.length
                    ? "No completed experiences for this sport yet."
                    : "No completed experiences yet."}
                </p>
              )}
            </>
          )}

          <HistoryPhotoGallery
            gallery={activeGallery}
            onClose={closeGallery}
            onShift={shiftGallery}
          />

          <ShareToFieldModal
            item={sharePromptItem}
            caption={shareCaption}
            captionError={shareCaptionError}
            onChangeCaption={(value) => {
              setShareCaption(value);
              if (value.trim()) setShareCaptionError(false);
            }}
            onCancel={() => setSharePromptItemId(null)}
            onShare={handleShareToField}
          />

          {shareSuccess && (
            <div
              className="field-share-toast"
              role="status"
              aria-live="polite"
            >
              ✅ Posted to The Field!
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HistoryPage;
