import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", CAD: "C$",
  AUD: "A$", JPY: "¥", INR: "₹", BRL: "R$",
};
const COMMISSION = 0.15;
const TAX = 0.05;
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours assumed
const AUTO_CONFIRM_MS = 72 * 60 * 60 * 1000;     // 72 hours

const fmt = (n, currency) => {
  const sym = CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? currency;
  return `${sym}${Number(n).toFixed(2)}`;
};

const fmtDate = (d) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date(`${d}T00:00:00`)) : "";

const fmtTime = (t) =>
  t ? new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" })
        .format(new Date(`2000-01-01T${t}:00`)) : "";

const PaymentPage = ({ currentUser, onLogout }) => {
  const { bookingRequestId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser || !bookingRequestId) return;
    (async () => {
      const { data: br } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("id", bookingRequestId)
        .maybeSingle();

      if (!br || br.requester_id !== currentUser.id || br.status !== "accepted") {
        setLoading(false);
        return;
      }
      setBooking(br);

      const { data: hp } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, photo_url")
        .eq("id", br.host_id)
        .maybeSingle();
      setHostProfile(hp);
      setLoading(false);
    })();
  }, [currentUser, bookingRequestId]);

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
      <div className="payment-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <p className="payment-loading">Loading booking details…</p>
        <SiteFooter />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="payment-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <main className="payment-main">
          <h1>Booking not found</h1>
          <p>This booking may not exist, may already be paid, or you may not have permission to view it.</p>
          <Link to="/history?tab=pending" className="btn btn-primary">Back to History</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const gross = Number(booking.price);
  const commission = Math.round(gross * COMMISSION * 100) / 100;
  const tax = Math.round(gross * TAX * 100) / 100;
  const net = Math.round((gross - commission - tax) * 100) / 100;
  const hostName = hostProfile
    ? (hostProfile.full_name || `${hostProfile.first_name ?? ""} ${hostProfile.last_name ?? ""}`.trim() || "Host")
    : "Host";

  const handlePay = async () => {
    setPaying(true);
    setError("");

    const now = new Date();
    const sessionStart = new Date(`${booking.requested_date}T${booking.requested_time}:00`);
    const experienceEndsAt = new Date(sessionStart.getTime() + SESSION_DURATION_MS).toISOString();
    const autoConfirmAt = new Date(sessionStart.getTime() + SESSION_DURATION_MS + AUTO_CONFIRM_MS).toISOString();

    const { error: brError } = await supabase
      .from("booking_requests")
      .update({
        status: "in_progress",
        experience_ends_at: experienceEndsAt,
        auto_confirm_at: autoConfirmAt,
        updated_at: now.toISOString(),
      })
      .eq("id", booking.id);

    if (brError) {
      setError("Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    await supabase.from("invoices").insert({
      booking_request_id: booking.id,
      gross_amount: gross,
      platform_commission: commission,
      tax,
      net_amount: net,
      currency: booking.currency,
      paid_at: now.toISOString(),
    });

    setPaid(true);
    setPaying(false);
  };

  if (paid) {
    return (
      <div className="payment-page">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <main className="payment-main">
          <div className="payment-success">
            <div className="payment-success-icon">✓</div>
            <h1>Payment confirmed!</h1>
            <p>Your <strong>{booking.sport}</strong> experience with <strong>{hostName}</strong> on {fmtDate(booking.requested_date)} at {fmtTime(booking.requested_time)} is now confirmed.</p>
            <p className="payment-success-sub">You can message the host directly for meeting details.</p>
            <div className="payment-success-actions">
              <Link to={`/chat/${booking.id}`} className="find-button">
                Message {hostName}
              </Link>
              <Link to="/history?tab=pending" className="btn btn-light">
                View History
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="payment-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <main className="payment-main">
        <div className="payment-back-row">
          <Link to="/history?tab=pending" className="back-link">← Back to History</Link>
        </div>
        <h1 className="payment-title">Complete your booking</h1>

        <div className="payment-layout">
          {/* Booking summary */}
          <aside className="payment-summary">
            <h2 className="payment-summary-title">Booking summary</h2>
            {hostProfile?.photo_url && (
              <img src={hostProfile.photo_url} alt={hostName} className="payment-host-photo" />
            )}
            <p className="payment-summary-host">{hostName}</p>
            <p className="payment-summary-sport">{booking.sport}</p>
            <p className="payment-summary-datetime">
              {fmtDate(booking.requested_date)}<br />{fmtTime(booking.requested_time)}
            </p>

            <table className="payment-invoice-table">
              <tbody>
                <tr>
                  <td>Session price</td>
                  <td>{fmt(gross, booking.currency)}</td>
                </tr>
                <tr>
                  <td>Platform fee (15%)</td>
                  <td>{fmt(commission, booking.currency)}</td>
                </tr>
                <tr>
                  <td>Tax (5%)</td>
                  <td>{fmt(tax, booking.currency)}</td>
                </tr>
                <tr className="payment-total-row">
                  <td><strong>Total charged</strong></td>
                  <td><strong>{fmt(gross, booking.currency)}</strong></td>
                </tr>
                <tr className="payment-host-payout-row">
                  <td>Host receives</td>
                  <td>{fmt(net, booking.currency)}</td>
                </tr>
              </tbody>
            </table>
          </aside>

          {/* Simulated payment form */}
          <section className="payment-form-section">
            <h2 className="payment-form-title">Payment details</h2>
            <p className="payment-simulation-notice">
              This is a simulated payment — no real charge will be made.
            </p>
            <div className="payment-form">
              <label className="payment-field">
                Card number
                <input
                  type="text"
                  className="payment-input"
                  value="4242 4242 4242 4242"
                  readOnly
                />
              </label>
              <div className="payment-field-row">
                <label className="payment-field">
                  Expiry
                  <input type="text" className="payment-input" value="12/28" readOnly />
                </label>
                <label className="payment-field">
                  CVC
                  <input type="text" className="payment-input" value="•••" readOnly />
                </label>
              </div>
              <label className="payment-field">
                Name on card
                <input
                  type="text"
                  className="payment-input"
                  value={currentUser.fullName ?? ""}
                  readOnly
                />
              </label>
            </div>

            {error && <p className="payment-error" role="alert">{error}</p>}

            <button
              type="button"
              className="find-button payment-pay-btn"
              onClick={handlePay}
              disabled={paying}
            >
              {paying ? "Processing…" : `Pay ${fmt(gross, booking.currency)}`}
            </button>
            <p className="payment-terms">
              By confirming, you agree to our <Link to="/payments-and-payout-terms">Payments & Payout Terms</Link>.
              Your payment is held securely until you confirm the experience was completed.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PaymentPage;
