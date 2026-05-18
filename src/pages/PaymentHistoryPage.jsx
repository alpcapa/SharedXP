import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { CURRENCY_SYMBOLS } from "../utils/pricing";

const fmt = (sym, cur, amount) =>
  `${sym ?? cur}${Number(amount || 0).toFixed(2)}`;

const XpInfoPopup = ({ onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-box xp-info-box" onClick={(e) => e.stopPropagation()}>
      <h3 className="modal-title">What is XP?</h3>
      <p className="modal-body-text">
        <strong>XP (Experience Points)</strong> is the SharedXP loyalty reward. XP is earned in{" "}
        <strong>Normalized Spending Units (NSU)</strong> — so that 1 XP represents roughly the
        same spending power regardless of currency. Whether you booked or hosted, you both earn
        equal XP.
      </p>
      <p className="modal-body-text">
        XP rates: <strong>$1 USD = 1 XP · €1 EUR = 1 XP · ¥100 JPY = 1 XP · ₺40 TRY = 1 XP ·
        ₩1,000 KRW = 1 XP</strong>. For example, a ¥4,500 session earns 45 XP each; a $120
        session earns 120 XP each.
      </p>
      <p className="modal-body-text">
        This is the foundation of the <strong>SharedXP Loyalty Program</strong>, with more rewards,
        tiers, and benefits coming soon.
      </p>
      <div className="xp-popup-footer">
        <Link to="/loyalty-program" className="xp-loyalty-link" onClick={onClose}>
          View Loyalty Program details →
        </Link>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  </div>
);

const InvoiceDetailModal = ({ invoice, onClose }) => {
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;
  const isReleased = Boolean(invoice.released_at);
  const isHosted = invoice.role === "hosted";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box invoice-detail-box" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-detail-header">
          <div>
            <h3 className="invoice-detail-sport">{invoice.sport || "Experience"}</h3>
            <p className="invoice-detail-host">
              {isHosted ? `guest: ${invoice.guestName}` : `with ${invoice.hostName}`}
            </p>
          </div>
          <div className="invoice-detail-header-right">
            <span className={`invoice-role-badge invoice-role-badge--${isHosted ? "hosted" : "booked"}`}>
              {isHosted ? "Hosted" : "Booked"}
            </span>
            <span
              className={`invoice-status invoice-status--${isReleased ? "released" : "paid"}`}
            >
              {isReleased ? "Released" : "Paid"}
            </span>
          </div>
        </div>

        {(invoice.requestedDate || invoice.requestedTime) && (
          <div className="invoice-detail-row">
            <span className="invoice-detail-label">Session</span>
            <span className="invoice-detail-value">
              {invoice.requestedDate
                ? new Date(invoice.requestedDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
              {invoice.requestedTime ? ` · ${invoice.requestedTime}` : ""}
            </span>
          </div>
        )}

        <div className="invoice-detail-row">
          <span className="invoice-detail-label">Paid on</span>
          <span className="invoice-detail-value">
            {invoice.paid_at
              ? new Date(invoice.paid_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        </div>

        {isReleased && (
          <div className="invoice-detail-row">
            <span className="invoice-detail-label">Released on</span>
            <span className="invoice-detail-value">
              {new Date(invoice.released_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        <div className="invoice-detail-divider" />

        <p className="invoice-detail-section-title">Payment breakdown</p>

        <div className="invoice-detail-row">
          <span className="invoice-detail-label">Amount charged</span>
          <span className="invoice-detail-value invoice-detail-total">
            {fmt(sym, invoice.currency, invoice.gross_amount)}{" "}
            <span className="invoice-currency">{invoice.currency}</span>
          </span>
        </div>

        <div className="invoice-detail-row invoice-detail-row--sub">
          <span className="invoice-detail-label">Platform fee (15%)</span>
          <span className="invoice-detail-value invoice-detail-deduct">
            −{fmt(sym, invoice.currency, invoice.platform_commission)}
          </span>
        </div>

        <div className="invoice-detail-row invoice-detail-row--sub">
          <span className="invoice-detail-label">Tax (5%)</span>
          <span className="invoice-detail-value invoice-detail-deduct">
            −{fmt(sym, invoice.currency, invoice.tax)}
          </span>
        </div>

        <div className="invoice-detail-row invoice-detail-row--net">
          <span className="invoice-detail-label">Net to host</span>
          <span className="invoice-detail-value">
            {fmt(sym, invoice.currency, invoice.net_amount)}
          </span>
        </div>

        <div className="invoice-detail-divider" />

        <div className="invoice-detail-xp-row">
          <span className="invoice-detail-xp-label">XP earned</span>
          <span className="invoice-detail-xp-value">+{invoice.xpEarned} XP</span>
        </div>

        <div className="invoice-detail-ref">
          Ref: <span>{invoice.id}</span>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PaymentHistoryPage = ({ currentUser, authLoading, onLogout }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [filterSport, setFilterSport] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchInvoices = async () => {
      setLoading(true);

      // Fetch both guest bookings (as requester) and host bookings (as host) in parallel
      const [guestResult, hostResult] = await Promise.all([
        supabase
          .from("booking_requests")
          .select("id, sport, requested_date, requested_time, status, host_id")
          .eq("requester_id", currentUser.id),
        supabase
          .from("booking_requests")
          .select("id, sport, requested_date, requested_time, status, requester_id")
          .eq("host_id", currentUser.id),
      ]);

      const guestBookingRequests = guestResult.data ?? [];
      const hostBookingRequests = hostResult.data ?? [];

      const guestBrMap = Object.fromEntries(guestBookingRequests.map((br) => [br.id, br]));
      const hostBrMap = Object.fromEntries(hostBookingRequests.map((br) => [br.id, br]));
      const hostBrIds = new Set(hostBookingRequests.map((br) => br.id));

      // Deduplicate booking request IDs (a user cannot be both requester and host)
      const allBrIds = [
        ...new Set([
          ...guestBookingRequests.map((br) => br.id),
          ...hostBookingRequests.map((br) => br.id),
        ]),
      ];

      if (allBrIds.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .in("booking_request_id", allBrIds)
        .order("paid_at", { ascending: false });

      if (invError) {
        setLoading(false);
        return;
      }

      // Fetch host profiles for guest bookings and requester profiles for host bookings in parallel
      const hostIds = [
        ...new Set(guestBookingRequests.map((br) => br.host_id).filter(Boolean)),
      ];
      const requesterIds = [
        ...new Set(hostBookingRequests.map((br) => br.requester_id).filter(Boolean)),
      ];

      const profileIds = [...new Set([...hostIds, ...requesterIds])];
      let profileMap = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);
        for (const p of profiles ?? []) profileMap[p.id] = p;
      }

      const enriched = (invData ?? []).map((inv) => {
        const isHosted = hostBrIds.has(inv.booking_request_id);
        const br = isHosted ? hostBrMap[inv.booking_request_id] : guestBrMap[inv.booking_request_id];
        return {
          ...inv,
          sport: br?.sport ?? "",
          requestedDate: br?.requested_date ?? "",
          requestedTime: br?.requested_time ?? "",
          bookingStatus: br?.status ?? "",
          role: isHosted ? "hosted" : "booked",
          hostName: isHosted ? null : (profileMap[br?.host_id]?.full_name ?? "Host"),
          guestName: isHosted ? (profileMap[br?.requester_id]?.full_name ?? "Guest") : null,
          xpEarned: inv.xp_earned ?? 0,
        };
      });

      setInvoices(enriched);
      setLoading(false);
    };

    fetchInvoices();
  }, [currentUser, authLoading, navigate]);

  const sports = [...new Set(invoices.map((i) => i.sport).filter(Boolean))].sort();
  const currencies = [...new Set(invoices.map((i) => i.currency).filter(Boolean))].sort();
  const totalXp = invoices.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const hasHosted = invoices.some((i) => i.role === "hosted");
  const hasBooked = invoices.some((i) => i.role === "booked");

  const filtered = invoices.filter((inv) => {
    if (filterSport && inv.sport !== filterSport) return false;
    if (filterCurrency && inv.currency !== filterCurrency) return false;
    if (filterRole !== "all" && inv.role !== filterRole) return false;
    if (filterStatus === "released" && !inv.released_at) return false;
    if (filterStatus === "paid" && inv.released_at) return false;
    if (filterFrom && inv.paid_at && inv.paid_at < filterFrom) return false;
    if (filterTo && inv.paid_at && inv.paid_at > filterTo + "T23:59:59") return false;
    return true;
  });

  const filteredXp = filtered.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const mixedCurrencies = new Set(filtered.map((i) => i.currency).filter(Boolean)).size > 1;
  const singleCurrency =
    !mixedCurrencies && filtered.length > 0 ? filtered[0]?.currency : null;
  const totalFiltered = filtered.reduce((sum, inv) => sum + Number(inv.gross_amount || 0), 0);

  const resetFilters = () => {
    setFilterSport("");
    setFilterStatus("all");
    setFilterCurrency("");
    setFilterRole("all");
    setFilterFrom("");
    setFilterTo("");
  };

  const hasActiveFilters =
    filterSport || filterStatus !== "all" || filterCurrency || filterRole !== "all" || filterFrom || filterTo;

  if (authLoading) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section">
            <p className="history-loading">Loading…</p>
          </main>
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

        {showXpInfo && <XpInfoPopup onClose={() => setShowXpInfo(false)} />}
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}

        <main className="middle-section payment-history-page">
          <div className="payment-history-header">
            <div className="payment-history-title-row">
              <h1 className="payment-history-title">Payment History</h1>
              <div className="payment-history-xp-badge">
                <span className="xp-badge-label">Total XP</span>
                <span className="xp-badge-value">{totalXp.toLocaleString()}</span>
                <button
                  type="button"
                  className="xp-info-trigger"
                  aria-label="What is XP?"
                  onClick={() => setShowXpInfo(true)}
                >
                  ?
                </button>
              </div>
            </div>
            <p className="payment-history-subtitle">
              All your payments and invoices in one place. Every{" "}
              <button
                type="button"
                className="xp-inline-link"
                onClick={() => setShowXpInfo(true)}
              >
                Normalized Spending Unit (NSU)
              </button>{" "}
              you spend booking — or earn hosting — gives you 1 XP. Guests and hosts earn equal XP.
            </p>
          </div>

          <div className="payment-history-filters">
            <div className="payment-filter-group">
              <label htmlFor="ph-sport">Sport</label>
              <select
                id="ph-sport"
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value)}
              >
                <option value="">All sports</option>
                {sports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {(hasBooked && hasHosted) && (
              <div className="payment-filter-group">
                <label htmlFor="ph-role">Role</label>
                <select
                  id="ph-role"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="booked">Booked</option>
                  <option value="hosted">Hosted</option>
                </select>
              </div>
            )}

            <div className="payment-filter-group">
              <label htmlFor="ph-status">Status</label>
              <select
                id="ph-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="released">Payment released</option>
                <option value="paid">Awaiting release</option>
              </select>
            </div>

            <div className="payment-filter-group">
              <label htmlFor="ph-currency">Currency</label>
              <select
                id="ph-currency"
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
              >
                <option value="">All currencies</option>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="payment-filter-group">
              <label htmlFor="ph-from">From</label>
              <input
                id="ph-from"
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>

            <div className="payment-filter-group">
              <label htmlFor="ph-to">To</label>
              <input
                id="ph-to"
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="payment-filter-reset"
                onClick={resetFilters}
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <p className="history-loading">Loading payment history…</p>
          ) : invoices.length === 0 ? (
            <div className="payment-history-empty">
              <p className="payment-history-empty-title">No payments yet</p>
              <p className="payment-history-empty-sub">
                Once you book or host a paid experience, your invoices will appear here.{" "}
                <Link to="/locals">Explore experiences</Link>.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="payment-history-empty">
              <p className="payment-history-empty-title">No results match your filters</p>
              <button type="button" className="btn btn-light" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="payment-history-list">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  className="payment-invoice-card"
                  onClick={() => setSelectedInvoice(inv)}
                  aria-label={`View invoice for ${inv.sport || "experience"} — ${inv.role === "hosted" ? `guest: ${inv.guestName}` : `with ${inv.hostName}`}`}
                >
                  <div className="invoice-card-left">
                    <p className="invoice-sport">{inv.sport || "Experience"}</p>
                    <p className="invoice-host">
                      {inv.role === "hosted" ? `guest: ${inv.guestName}` : `with ${inv.hostName}`}
                    </p>
                    <p className="invoice-date">
                      {inv.requestedDate
                        ? formatDate(inv.requestedDate)
                        : formatDate(inv.paid_at)}
                      {inv.requestedTime ? ` · ${inv.requestedTime}` : ""}
                    </p>
                    <p className="invoice-paid-on">Paid: {formatDate(inv.paid_at)}</p>
                  </div>
                  <div className="invoice-card-right">
                    <p className="invoice-amount">
                      {CURRENCY_SYMBOLS[inv.currency] ?? inv.currency}
                      {Number(inv.gross_amount || 0).toFixed(2)}{" "}
                      <span className="invoice-currency">{inv.currency}</span>
                    </p>
                    <p className="invoice-xp">+{inv.xpEarned} XP</p>
                    <span className={`invoice-role-badge invoice-role-badge--${inv.role}`}>
                      {inv.role === "hosted" ? "Hosted" : "Booked"}
                    </span>
                    <span
                      className={`invoice-status invoice-status--${inv.released_at ? "released" : "paid"}`}
                    >
                      {inv.released_at ? "Released" : "Paid"}
                    </span>
                  </div>
                  <span className="invoice-card-chevron" aria-hidden="true">
                    <span className="invoice-card-chevron-label">INVOICE</span>
                    ›
                  </span>
                </button>
              ))}

              <div className="payment-history-summary">
                <div className="payment-summary-count">
                  {filtered.length === invoices.length
                    ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
                    : `${filtered.length} of ${invoices.length} invoices`}
                  {singleCurrency && !mixedCurrencies && (
                    <span className="payment-summary-total">
                      {" "}· Total:{" "}
                      <strong>
                        {CURRENCY_SYMBOLS[singleCurrency] ?? singleCurrency}
                        {totalFiltered.toFixed(2)}
                      </strong>
                    </span>
                  )}
                </div>
                <div className="payment-summary-xp">
                  <span>
                    XP from {hasActiveFilters ? "filtered" : "all"} invoices:{" "}
                    <strong>{filteredXp.toLocaleString()} XP</strong>
                  </span>
                  <button
                    type="button"
                    className="xp-info-trigger xp-info-trigger--sm"
                    onClick={() => setShowXpInfo(true)}
                    aria-label="About XP"
                  >
                    ?
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
