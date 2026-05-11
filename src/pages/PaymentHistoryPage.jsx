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
        <strong>XP (Experience Points)</strong> is the SharedXP loyalty reward. As a{" "}
        <strong>participant</strong>, every currency unit you spend earns you{" "}
        <strong>1 XP Point</strong>. As a <strong>host</strong>, every currency unit of net
        earnings you receive (after fees) earns you <strong>1 XP Point</strong> when the
        payment is released.
      </p>
      <p className="modal-body-text">
        For example, paying €45 earns 45 XP. Receiving a net payout of €38 earns 38 XP.
        Your XP total grows with every experience you book or host.
      </p>
      <p className="modal-body-text">
        This is the foundation of the <strong>SharedXP Loyalty Program</strong>, with more
        rewards, tiers, and benefits coming soon.
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

const InvoiceDetailModal = ({ invoice, onClose, isHostView }) => {
  const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency;
  const isReleased = Boolean(invoice.released_at);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box invoice-detail-box" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-detail-header">
          <div>
            <h3 className="invoice-detail-sport">{invoice.sport || "Experience"}</h3>
            <p className="invoice-detail-host">
              {isHostView
                ? `Booked by ${invoice.participantName}`
                : `with ${invoice.hostName}`}
            </p>
          </div>
          <span
            className={`invoice-status invoice-status--${
              isHostView
                ? isReleased ? "released" : "paid"
                : isReleased ? "released" : "paid"
            }`}
          >
            {isHostView
              ? isReleased ? "Released" : "Pending payout"
              : isReleased ? "Released" : "Paid"}
          </span>
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
          <span className="invoice-detail-label">
            {isHostView ? "Your earnings" : "Net to host"}
          </span>
          <span className="invoice-detail-value">
            {fmt(sym, invoice.currency, invoice.net_amount)}
          </span>
        </div>

        <div className="invoice-detail-divider" />

        <div className="invoice-detail-xp-row">
          <span className="invoice-detail-xp-label">XP earned</span>
          <span className="invoice-detail-xp-value">
            {invoice.xpEarned > 0 ? `+${invoice.xpEarned} XP` : isHostView && !isReleased ? "Pending release" : `+${invoice.xpEarned} XP`}
          </span>
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
  const [activeTab, setActiveTab] = useState(
    () => (currentUser?.isHost ? "hosting" : "bookings")
  );

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostInvoices, setHostInvoices] = useState([]);
  const [hostLoading, setHostLoading] = useState(true);

  const [showXpInfo, setShowXpInfo] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceIsHost, setSelectedInvoiceIsHost] = useState(false);

  const [filterSport, setFilterSport] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [hostFilterSport, setHostFilterSport] = useState("");
  const [hostFilterStatus, setHostFilterStatus] = useState("all");
  const [hostFilterCurrency, setHostFilterCurrency] = useState("");
  const [hostFilterFrom, setHostFilterFrom] = useState("");
  const [hostFilterTo, setHostFilterTo] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchInvoices = async () => {
      setLoading(true);

      const { data: bookingRequests, error: brError } = await supabase
        .from("booking_requests")
        .select("id, sport, requested_date, requested_time, status, host_id")
        .eq("requester_id", currentUser.id);

      if (brError || !bookingRequests?.length) {
        setLoading(false);
        return;
      }

      const brIds = bookingRequests.map((br) => br.id);
      const brMap = Object.fromEntries(bookingRequests.map((br) => [br.id, br]));

      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .in("booking_request_id", brIds)
        .order("paid_at", { ascending: false });

      if (invError) {
        setLoading(false);
        return;
      }

      const hostIds = [
        ...new Set(bookingRequests.map((br) => br.host_id).filter(Boolean)),
      ];
      let hostMap = {};
      if (hostIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", hostIds);
        for (const p of profiles ?? []) hostMap[p.id] = p;
      }

      const enriched = (invData ?? []).map((inv) => {
        const br = brMap[inv.booking_request_id] ?? {};
        return {
          ...inv,
          sport: br.sport ?? "",
          requestedDate: br.requested_date ?? "",
          requestedTime: br.requested_time ?? "",
          bookingStatus: br.status ?? "",
          hostName: hostMap[br.host_id]?.full_name ?? "Host",
          xpEarned: Math.floor(Number(inv.gross_amount) || 0),
        };
      });

      setInvoices(enriched);
      setLoading(false);
    };

    fetchInvoices();
  }, [currentUser?.id, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || !currentUser?.isHost) {
      setHostLoading(false);
      return;
    }

    const fetchHostInvoices = async () => {
      setHostLoading(true);

      const { data: hostedRequests, error: brError } = await supabase
        .from("booking_requests")
        .select("id, sport, requested_date, requested_time, status, requester_id")
        .eq("host_id", currentUser.id);

      if (brError || !hostedRequests?.length) {
        setHostLoading(false);
        return;
      }

      const brIds = hostedRequests.map((br) => br.id);
      const brMap = Object.fromEntries(hostedRequests.map((br) => [br.id, br]));

      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .in("booking_request_id", brIds)
        .order("paid_at", { ascending: false });

      if (invError) {
        setHostLoading(false);
        return;
      }

      const requesterIds = [
        ...new Set(hostedRequests.map((br) => br.requester_id).filter(Boolean)),
      ];
      let requesterMap = {};
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", requesterIds);
        for (const p of profiles ?? []) requesterMap[p.id] = p;
      }

      const enriched = (invData ?? []).map((inv) => {
        const br = brMap[inv.booking_request_id] ?? {};
        const isReleased = Boolean(inv.released_at);
        return {
          ...inv,
          sport: br.sport ?? "",
          requestedDate: br.requested_date ?? "",
          requestedTime: br.requested_time ?? "",
          bookingStatus: br.status ?? "",
          participantName: requesterMap[br.requester_id]?.full_name ?? "Participant",
          xpEarned: isReleased ? Math.floor(Number(inv.net_amount) || 0) : 0,
        };
      });

      setHostInvoices(enriched);
      setHostLoading(false);
    };

    fetchHostInvoices();
  }, [currentUser?.id, currentUser?.isHost, authLoading]);

  const isHost = Boolean(currentUser?.isHost);

  const participantXp = invoices.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const hostXp = hostInvoices.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const totalXp = participantXp + hostXp;

  const sports = [...new Set(invoices.map((i) => i.sport).filter(Boolean))].sort();
  const currencies = [...new Set(invoices.map((i) => i.currency).filter(Boolean))].sort();

  const filtered = invoices.filter((inv) => {
    if (filterSport && inv.sport !== filterSport) return false;
    if (filterCurrency && inv.currency !== filterCurrency) return false;
    if (filterStatus === "released" && !inv.released_at) return false;
    if (filterStatus === "paid" && inv.released_at) return false;
    if (filterFrom && inv.paid_at && inv.paid_at < filterFrom) return false;
    if (filterTo && inv.paid_at && inv.paid_at > filterTo + "T23:59:59") return false;
    return true;
  });

  const filteredXp = filtered.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const mixedCurrencies = new Set(filtered.map((i) => i.currency).filter(Boolean)).size > 1;
  const singleCurrency = !mixedCurrencies && filtered.length > 0 ? filtered[0]?.currency : null;
  const totalFiltered = filtered.reduce((sum, inv) => sum + Number(inv.gross_amount || 0), 0);

  const hostSports = [...new Set(hostInvoices.map((i) => i.sport).filter(Boolean))].sort();
  const hostCurrencies = [...new Set(hostInvoices.map((i) => i.currency).filter(Boolean))].sort();

  const hostFiltered = hostInvoices.filter((inv) => {
    if (hostFilterSport && inv.sport !== hostFilterSport) return false;
    if (hostFilterCurrency && inv.currency !== hostFilterCurrency) return false;
    if (hostFilterStatus === "released" && !inv.released_at) return false;
    if (hostFilterStatus === "pending" && inv.released_at) return false;
    if (hostFilterFrom && inv.paid_at && inv.paid_at < hostFilterFrom) return false;
    if (hostFilterTo && inv.paid_at && inv.paid_at > hostFilterTo + "T23:59:59") return false;
    return true;
  });

  const hostFilteredXp = hostFiltered.reduce((sum, inv) => sum + inv.xpEarned, 0);
  const hostMixedCurrencies =
    new Set(hostFiltered.map((i) => i.currency).filter(Boolean)).size > 1;
  const hostSingleCurrency =
    !hostMixedCurrencies && hostFiltered.length > 0 ? hostFiltered[0]?.currency : null;
  const hostTotalFiltered = hostFiltered.reduce(
    (sum, inv) => sum + Number(inv.net_amount || 0),
    0
  );

  const resetFilters = () => {
    setFilterSport("");
    setFilterStatus("all");
    setFilterCurrency("");
    setFilterFrom("");
    setFilterTo("");
  };

  const resetHostFilters = () => {
    setHostFilterSport("");
    setHostFilterStatus("all");
    setHostFilterCurrency("");
    setHostFilterFrom("");
    setHostFilterTo("");
  };

  const hasActiveFilters =
    filterSport || filterStatus !== "all" || filterCurrency || filterFrom || filterTo;
  const hasActiveHostFilters =
    hostFilterSport ||
    hostFilterStatus !== "all" ||
    hostFilterCurrency ||
    hostFilterFrom ||
    hostFilterTo;

  const openInvoice = (inv, isHostView) => {
    setSelectedInvoice(inv);
    setSelectedInvoiceIsHost(isHostView);
  };

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
            isHostView={selectedInvoiceIsHost}
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
              All your payments and earnings in one place. Every currency unit you spend or
              receive as a host earns{" "}
              <button
                type="button"
                className="xp-inline-link"
                onClick={() => setShowXpInfo(true)}
              >
                1 XP Point
              </button>
              .
            </p>
          </div>

          {isHost && (
            <div className="ph-tabs">
              <button
                type="button"
                className={`host-tab-btn${activeTab === "bookings" ? " active" : ""}`}
                onClick={() => setActiveTab("bookings")}
              >
                Bookings
                {participantXp > 0 && (
                  <span className="ph-tab-xp">{participantXp.toLocaleString()} XP</span>
                )}
              </button>
              <button
                type="button"
                className={`host-tab-btn${activeTab === "hosting" ? " active" : ""}`}
                onClick={() => setActiveTab("hosting")}
              >
                Hosting
                {hostXp > 0 && (
                  <span className="ph-tab-xp">{hostXp.toLocaleString()} XP</span>
                )}
              </button>
            </div>
          )}

          {activeTab === "bookings" && (
            <>
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
                  <button type="button" className="payment-filter-reset" onClick={resetFilters}>
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
                    Once you book and pay for an experience, your invoices will appear here.{" "}
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
                      onClick={() => openInvoice(inv, false)}
                      aria-label={`View invoice for ${inv.sport || "experience"} with ${inv.hostName}`}
                    >
                      <div className="invoice-card-left">
                        <p className="invoice-sport">{inv.sport || "Experience"}</p>
                        <p className="invoice-host">with {inv.hostName}</p>
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
            </>
          )}

          {activeTab === "hosting" && isHost && (
            <>
              <div className="payment-history-filters">
                <div className="payment-filter-group">
                  <label htmlFor="ph-host-sport">Sport</label>
                  <select
                    id="ph-host-sport"
                    value={hostFilterSport}
                    onChange={(e) => setHostFilterSport(e.target.value)}
                  >
                    <option value="">All sports</option>
                    {hostSports.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="payment-filter-group">
                  <label htmlFor="ph-host-status">Status</label>
                  <select
                    id="ph-host-status"
                    value={hostFilterStatus}
                    onChange={(e) => setHostFilterStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="released">Released</option>
                    <option value="pending">Pending payout</option>
                  </select>
                </div>

                <div className="payment-filter-group">
                  <label htmlFor="ph-host-currency">Currency</label>
                  <select
                    id="ph-host-currency"
                    value={hostFilterCurrency}
                    onChange={(e) => setHostFilterCurrency(e.target.value)}
                  >
                    <option value="">All currencies</option>
                    {hostCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="payment-filter-group">
                  <label htmlFor="ph-host-from">From</label>
                  <input
                    id="ph-host-from"
                    type="date"
                    value={hostFilterFrom}
                    onChange={(e) => setHostFilterFrom(e.target.value)}
                  />
                </div>

                <div className="payment-filter-group">
                  <label htmlFor="ph-host-to">To</label>
                  <input
                    id="ph-host-to"
                    type="date"
                    value={hostFilterTo}
                    onChange={(e) => setHostFilterTo(e.target.value)}
                  />
                </div>

                {hasActiveHostFilters && (
                  <button
                    type="button"
                    className="payment-filter-reset"
                    onClick={resetHostFilters}
                  >
                    Clear
                  </button>
                )}
              </div>

              {hostLoading ? (
                <p className="history-loading">Loading hosting history…</p>
              ) : hostInvoices.length === 0 ? (
                <div className="payment-history-empty">
                  <p className="payment-history-empty-title">No hosting earnings yet</p>
                  <p className="payment-history-empty-sub">
                    Once a participant pays for one of your sessions, the invoice will appear
                    here. You earn XP when the payment is released to you.
                  </p>
                </div>
              ) : hostFiltered.length === 0 ? (
                <div className="payment-history-empty">
                  <p className="payment-history-empty-title">No results match your filters</p>
                  <button type="button" className="btn btn-light" onClick={resetHostFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="payment-history-list">
                  {hostFiltered.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      className="payment-invoice-card"
                      onClick={() => openInvoice(inv, true)}
                      aria-label={`View earnings for ${inv.sport || "experience"} booked by ${inv.participantName}`}
                    >
                      <div className="invoice-card-left">
                        <p className="invoice-sport">{inv.sport || "Experience"}</p>
                        <p className="invoice-host">Booked by {inv.participantName}</p>
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
                          {Number(inv.net_amount || 0).toFixed(2)}{" "}
                          <span className="invoice-currency">{inv.currency}</span>
                        </p>
                        <p className="invoice-xp">
                          {inv.xpEarned > 0 ? `+${inv.xpEarned} XP` : "Pending XP"}
                        </p>
                        <span
                          className={`invoice-status invoice-status--${inv.released_at ? "released" : "paid"}`}
                        >
                          {inv.released_at ? "Released" : "Pending payout"}
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
                      {hostFiltered.length === hostInvoices.length
                        ? `${hostInvoices.length} invoice${hostInvoices.length !== 1 ? "s" : ""}`
                        : `${hostFiltered.length} of ${hostInvoices.length} invoices`}
                      {hostSingleCurrency && !hostMixedCurrencies && (
                        <span className="payment-summary-total">
                          {" "}· Earned:{" "}
                          <strong>
                            {CURRENCY_SYMBOLS[hostSingleCurrency] ?? hostSingleCurrency}
                            {hostTotalFiltered.toFixed(2)}
                          </strong>
                        </span>
                      )}
                    </div>
                    <div className="payment-summary-xp">
                      <span>
                        XP from {hasActiveHostFilters ? "filtered" : "all"} invoices:{" "}
                        <strong>{hostFilteredXp.toLocaleString()} XP</strong>
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
            </>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
