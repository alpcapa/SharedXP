import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import InlineLoginForm from "../components/InlineLoginForm";
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

const getRequestSortTs = (req) => {
  const ts = Date.parse(req.requested_date || req.created_at || "");
  return Number.isFinite(ts) ? ts : 0;
};
const sortByTs = (a, b) => getRequestSortTs(b) - getRequestSortTs(a);

const buildFieldPost = (item, currentUser, caption) => {
  const realPhotos = (item.photoGallery ?? []).filter(
    (p) => p && p !== FALLBACK_EVENT_PHOTO
  );
  const fieldPostRating = Number(
    item.role === "hosted"
      ? (item.attendeeRating ?? item.rating ?? 0)
      : (item.hostRatings?.overall ?? item.rating ?? 0)
  );
  return {
    posterId: currentUser?.id ?? null,
    role: item.role ?? null,
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
    rating: fieldPostRating,
    sourceRequestId: null,
  };
};

const HistoryPage = ({
  currentUser,
  authLoading,
  onLogout,
  onEmailLogin,
  onForgotPassword,
  onSaveHistory,
  onSaveHostHistory,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryTab = new URLSearchParams(location.search).get("tab");
  const queryEditRating = new URLSearchParams(location.search).get("editRating");
  const queryBookingId = new URLSearchParams(location.search).get("bookingId");

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
    fetchError: bookingFetchError,
    unreadCounts,
    acceptRequest,
    declineRequest,
    cancelRequest,
    confirmExperience,
    openDispute,
    submitRating,
  } = useBookingRequests(currentUser);

  const handleConfirmExperience = useCallback(async (requestId) => {
    const ok = await confirmExperience(requestId);
    if (ok) navigate("/history", { replace: true });
  }, [confirmExperience, navigate]);

  const ACTIVE_STATUSES = ["pending", "accepted", "payment_pending", "in_progress", "disputed"];
  const activeBookingRequests = bookingRequests.filter((r) => ACTIVE_STATUSES.includes(r.status)).sort(sortByTs);
  const completedBookingRequests = bookingRequests.filter((r) =>
    r.status === "completed" || r.status === "resolved_paid_host"
  );
  const completedHosted = completedBookingRequests.filter((r) => r.host_id === currentUser?.id).sort(sortByTs);
  const completedAttended = completedBookingRequests.filter((r) => r.requester_id === currentUser?.id).sort(sortByTs);
  const cancelledBookingRequests = bookingRequests.filter((r) =>
    ["cancelled", "declined", "resolved_refunded"].includes(r.status)
  ).sort(sortByTs);
  const disputedBookingRequests = bookingRequests.filter((r) =>
    ["disputed", "resolved_refunded", "resolved_paid_host"].includes(r.status)
  ).sort(sortByTs);

  // Sync tab from URL (e.g. after booking submission redirect)
  useEffect(() => {
    setSelectedRole(queryTab === "pending" ? "pending" : "all");
  }, [queryTab]);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [activeGallery, setActiveGallery] = useState(null);
  const [sharePromptItemId, setSharePromptItemId] = useState(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareCaptionError, setShareCaptionError] = useState(false);
  const [sharePosting, setSharePosting] = useState(false);
  const [sharePosted, setSharePosted] = useState(false);
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

  const mergedAllItems = useMemo(() => {
    const brItems = bookingRequests.map((req) => ({ kind: "request", data: req, ts: getRequestSortTs(req) }));
    const legacyItems = allItems
      .filter((item) => selectedSport === "All" || item.sport === selectedSport)
      .map((item) => ({ kind: "legacy", data: item, ts: item.sortKey ?? 0 }));
    return [...brItems, ...legacyItems].sort((a, b) => b.ts - a.ts);
  }, [bookingRequests, allItems, selectedSport]);

  const mergedHostedItems = useMemo(() => {
    const brItems = completedHosted.map((req) => ({ kind: "request", data: req, ts: getRequestSortTs(req) }));
    const legacyItems = allItems
      .filter((item) => item.role === "hosted" && (selectedSport === "All" || item.sport === selectedSport))
      .map((item) => ({ kind: "legacy", data: item, ts: item.sortKey ?? 0 }));
    return [...brItems, ...legacyItems].sort((a, b) => b.ts - a.ts);
  }, [completedHosted, allItems, selectedSport]);

  const mergedAttendedItems = useMemo(() => {
    const brItems = completedAttended.map((req) => ({ kind: "request", data: req, ts: getRequestSortTs(req) }));
    const legacyItems = allItems
      .filter((item) => item.role === "attended" && (selectedSport === "All" || item.sport === selectedSport))
      .map((item) => ({ kind: "legacy", data: item, ts: item.sortKey ?? 0 }));
    return [...brItems, ...legacyItems].sort((a, b) => b.ts - a.ts);
  }, [completedAttended, allItems, selectedSport]);

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
        setSharePosting(false);
        setSharePosted(false);
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
    async (item) => {
      if (!shareCaption.trim()) {
        setShareCaptionError(true);
        return;
      }
      setSharePosting(true);
      setShareCaptionError(false);
      const post = buildFieldPost(item, currentUser, shareCaption);
      const savedId = await saveFieldPost(post);
      if (!savedId) {
        setSharePosting(false);
        return;
      }

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
      setSharePosting(false);
      setSharePosted(true);
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
            <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
            <main className="middle-section simple-page">
              <p>Loading…</p>
            </main>
            <SiteFooter />
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <InlineLoginForm
              onEmailLogin={onEmailLogin}
              onForgotPassword={onForgotPassword}
              title="Please log in"
              description="You need to log in to view your experience history."
            />
          </main>
          <SiteFooter />
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
        <main className="middle-section edit-profile-page history-page">
          <h1>My <span style={{color: "#96c93d", fontWeight: 800}}>XP</span> History</h1>
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
              { value: "pending", label: `In Progress${activeBookingRequests.length ? ` (${activeBookingRequests.length})` : ""}` },
              { value: "hosted", label: `Hosted${(completedHosted.length + allItems.filter((i) => i.role === "hosted").length) ? ` (${completedHosted.length + allItems.filter((i) => i.role === "hosted").length})` : ""}` },
              { value: "attended", label: `Attended${(completedAttended.length + allItems.filter((i) => i.role === "attended").length) ? ` (${completedAttended.length + allItems.filter((i) => i.role === "attended").length})` : ""}` },
              { value: "cancelled", label: `Cancelled${cancelledBookingRequests.length ? ` (${cancelledBookingRequests.length})` : ""}` },
              { value: "disputes", label: `Disputed${disputedBookingRequests.length ? ` (${disputedBookingRequests.length})` : ""}` },
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

          {selectedRole === "cancelled" ? (
            requestsLoading ? (
              <p className="history-loading">Loading…</p>
            ) : cancelledBookingRequests.length ? (
              <div className="history-list">
                {cancelledBookingRequests.map((req) => (
                  <PendingBookingCard
                    key={req.id}
                    request={req}
                    currentUserId={currentUser.id}
                    unreadCount={unreadCounts[req.id] ?? 0}
                    onAccept={acceptRequest}
                    onDecline={declineRequest}
                    onCancel={cancelRequest}
                    onConfirmExperience={handleConfirmExperience}
                    onOpenDispute={openDispute}
                    onSubmitRating={submitRating}
                    currentUser={currentUser}
                    editRatingRequestId={queryEditRating}
                    scrollToId={queryBookingId}
                  />
                ))}
              </div>
            ) : (
              <p>No cancelled experiences yet.</p>
            )
          ) : selectedRole === "disputes" ? (
            requestsLoading ? (
              <p className="history-loading">Loading…</p>
            ) : disputedBookingRequests.length ? (
              <div className="history-list">
                {disputedBookingRequests.map((req) => (
                  <PendingBookingCard
                    key={req.id}
                    request={req}
                    currentUserId={currentUser.id}
                    unreadCount={unreadCounts[req.id] ?? 0}
                    onAccept={acceptRequest}
                    onDecline={declineRequest}
                    onCancel={cancelRequest}
                    onConfirmExperience={handleConfirmExperience}
                    onOpenDispute={openDispute}
                    onSubmitRating={submitRating}
                    currentUser={currentUser}
                    editRatingRequestId={queryEditRating}
                    scrollToId={queryBookingId}
                  />
                ))}
              </div>
            ) : (
              <p>No disputed experiences yet.</p>
            )
          ) : selectedRole === "pending" ? (
            requestsLoading ? (
              <p className="history-loading">Loading…</p>
            ) : bookingFetchError ? (
              <p className="history-fetch-error">Could not load active bookings: {bookingFetchError}</p>
            ) : activeBookingRequests.length ? (
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
                    onConfirmExperience={handleConfirmExperience}
                    onOpenDispute={openDispute}
                    onSubmitRating={submitRating}
                    currentUser={currentUser}
                    editRatingRequestId={queryEditRating}
                    scrollToId={queryBookingId}
                  />
                ))}
              </div>
            ) : (
              <>
                <p>No in-progress experiences.</p>
                <p className="history-autoconfirm-note">
                  Sessions auto-confirm 72 hours after they end. Completed experiences appear in the <strong>All</strong>, <strong>Hosted</strong>, or <strong>Attended</strong> tabs.
                </p>
              </>
            )
          ) : (
            <>
              {(() => {
                const merged =
                  selectedRole === "all" ? mergedAllItems :
                  selectedRole === "hosted" ? mergedHostedItems :
                  mergedAttendedItems;

                if (merged.length === 0) {
                  if (requestsLoading) return <p className="history-loading">Loading…</p>;
                  if (selectedRole === "hosted") return <p>No hosted experiences yet.</p>;
                  if (selectedRole === "attended") return <p>No attended experiences yet.</p>;
                  return <p>{allItems.length ? "No experiences for this sport yet." : "No experiences yet."}</p>;
                }

                return (
                  <div className="history-list">
                    {merged.map(({ kind, data }) =>
                      kind === "request" ? (
                        <PendingBookingCard
                          key={data.id}
                          request={data}
                          currentUserId={currentUser.id}
                          unreadCount={unreadCounts[data.id] ?? 0}
                          onAccept={acceptRequest}
                          onDecline={declineRequest}
                          onCancel={cancelRequest}
                          onConfirmExperience={handleConfirmExperience}
                          onOpenDispute={openDispute}
                          onSubmitRating={submitRating}
                          currentUser={currentUser}
                          editRatingRequestId={queryEditRating}
                    scrollToId={queryBookingId}
                        />
                      ) : (
                        <HistoryCard
                          key={data.id}
                          item={data}
                          isDirty={dirtyIds.has(data.id)}
                          onUpdateField={updateItem}
                          onUpdateHostRating={updateHostRating}
                          onSaveItem={saveItem}
                          onConfirmCompletion={confirmCompletion}
                          onOpenGallery={openGallery}
                          onUploadPhotos={handlePhotoUpload}
                          onDeletePhoto={handlePhotoDelete}
                        />
                      )
                    )}
                  </div>
                );
              })()}
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
            isSharing={sharePosting}
            isShared={sharePosted}
            onChangeCaption={(value) => {
              setShareCaption(value);
              if (value.trim()) setShareCaptionError(false);
            }}
            onCancel={() => {
              setSharePromptItemId(null);
              setSharePosting(false);
              setSharePosted(false);
              setShareCaption("");
              setShareCaptionError(false);
            }}
            onShare={handleShareToField}
          />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HistoryPage;
