import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { sendNotification } from "../utils/sendNotification";

const fmtTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })
        .format(new Date(iso))
    : "";

const ChatPage = ({ currentUser, onLogout }) => {
  const { bookingRequestId } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  const [booking, setBooking] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch booking + other participant profile
  useEffect(() => {
    if (!currentUser || !bookingRequestId) return;
    (async () => {
      const { data: br } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("id", bookingRequestId)
        .maybeSingle();

      if (!br || (br.requester_id !== currentUser.id && br.host_id !== currentUser.id)) {
        setLoading(false);
        return;
      }
      setBooking(br);

      const otherId = br.requester_id === currentUser.id ? br.host_id : br.requester_id;
      const { data: op } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, photo_url")
        .eq("id", otherId)
        .maybeSingle();
      setOtherUser(op);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_request_id", bookingRequestId)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);

      // Mark all incoming messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("booking_request_id", bookingRequestId)
        .neq("sender_id", currentUser.id)
        .is("read_at", null);

      setLoading(false);
    })();
  }, [currentUser, bookingRequestId]);

  // Realtime subscription
  useEffect(() => {
    if (!bookingRequestId || !currentUser) return;
    const channel = supabase
      .channel(`chat:${bookingRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_request_id=eq.${bookingRequestId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Mark as read immediately if the message is from the other person
          if (payload.new.sender_id !== currentUser.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id)
              .is("read_at", null);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingRequestId, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending || !booking) return;
    setSending(true);
    setDraft("");
    await supabase.from("messages").insert({
      booking_request_id: booking.id,
      sender_id: currentUser.id,
      content: text,
    });
    // Fire-and-forget email notification to the other participant
    sendNotification("new_message", booking.id, { senderId: currentUser.id });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader /></section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <Link to="/login" className="btn btn-primary">Go to Login</Link>
          </main>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <p className="chat-loading">Loading conversation…</p>
        <SiteFooter />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="chat-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <main className="chat-main">
          <h1>Conversation not found</h1>
          <Link to="/history?tab=pending" className="btn btn-primary">Back to History</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const otherName = otherUser
    ? (otherUser.full_name || `${otherUser.first_name ?? ""} ${otherUser.last_name ?? ""}`.trim() || "User")
    : "User";

  const myName = currentUser.fullName || currentUser.firstName || "You";

  return (
    <div className="chat-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <main className="chat-main">
        <div className="chat-back-row">
          <Link to="/history?tab=pending" className="back-link">← Back to History</Link>
        </div>

        <div className="chat-layout">
          {/* Sidebar */}
          <aside className="chat-sidebar">
            <h2 className="chat-sidebar-title">Chat</h2>
            {otherUser?.photo_url && (
              <img src={otherUser.photo_url} alt={otherName} className="chat-other-photo" />
            )}
            <p className="chat-other-name">{otherName}</p>
            <p className="chat-booking-sport">{booking.sport}</p>
            <p className="chat-booking-date">
              {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })
                .format(new Date(`${booking.requested_date}T00:00:00`))}
            </p>
            <p className="chat-booking-time">
              {new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" })
                .format(new Date(`2000-01-01T${booking.requested_time}:00`))}
            </p>
            <span className={`chat-status-badge status-${booking.status}`}>
              {booking.status.replace(/_/g, " ")}
            </span>
          </aside>

          {/* Chat panel */}
          <section className="chat-panel">
            <div className="chat-messages" aria-live="polite" aria-label="Chat messages">
              {messages.length === 0 && (
                <p className="chat-empty">No messages yet. Send the first one!</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-them"}`}
                  >
                    <p className="chat-bubble-author">{isMe ? myName : otherName} wrote</p>
                    <p className="chat-bubble-text">{msg.content}</p>
                    <time className="chat-bubble-time">{fmtTime(msg.created_at)}</time>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-row">
              <textarea
                className="chat-input"
                rows={2}
                placeholder={`Message ${otherName}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                type="button"
                className="find-button chat-send-btn"
                onClick={sendMessage}
                disabled={!draft.trim() || sending}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default ChatPage;
