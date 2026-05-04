import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";
import { useBookingRequests } from "../hooks/useBookingRequests";

const fmtDate = (iso) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
          .format(new Date(iso)) : "—";

const AdminDisputesPage = ({ currentUser, onLogout }) => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const { resolveDispute } = useBookingRequests(currentUser);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select(`
        *,
        booking_request:booking_requests(
          sport, requested_date, price, currency,
          requester:profiles!requester_id(full_name, first_name, last_name, email),
          host:profiles!host_id(full_name, first_name, last_name, email)
        )
      `)
      .order("opened_at", { ascending: false });
    setDisputes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.isAdmin) fetchDisputes();
    else setLoading(false);
  }, [currentUser?.isAdmin, currentUser?.id, fetchDisputes]);

  const handleResolve = async (disputeId, resolution) => {
    if (!confirm(`Resolve as "${resolution}"?`)) return;
    setResolving(disputeId);
    await resolveDispute(disputeId, resolution);
    await fetchDisputes();
    setResolving(null);
  };

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader /></section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <Link to="/login" className="btn btn-primary">Log in</Link>
          </main>
        </div>
      </div>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <h1>Access denied</h1>
            <p>You don't have permission to view this page.</p>
            <Link to="/" className="btn btn-primary">Go home</Link>
          </main>
        </div>
      </div>
    );
  }

  const getName = (profile) =>
    profile
      ? (profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unknown")
      : "Unknown";

  return (
    <div className="admin-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />
      <main className="admin-main">
        <h1 className="admin-title">Dispute Dashboard</h1>
        <p className="admin-subtitle">Customer service view — all open and resolved disputes.</p>

        {loading ? (
          <p>Loading disputes…</p>
        ) : disputes.length === 0 ? (
          <p>No disputes found.</p>
        ) : (
          <div className="admin-dispute-list">
            {disputes.map((d) => {
              const br = d.booking_request;
              const requesterName = br ? getName(br.requester) : "—";
              const hostName = br ? getName(br.host) : "—";
              const isResolved = !!d.resolved_at;

              return (
                <article key={d.id} className={`admin-dispute-card${isResolved ? " resolved" : ""}`}>
                  <div className="admin-dispute-header">
                    <div>
                      <h2 className="admin-dispute-sport">{br?.sport ?? "Unknown sport"}</h2>
                      <p className="admin-dispute-date">{fmtDate(br?.requested_date)}</p>
                    </div>
                    <span className={`pending-status-badge status-${isResolved ? "resolved" : "disputed"}`}>
                      {isResolved ? `Resolved: ${d.resolution}` : "Open"}
                    </span>
                  </div>

                  <div className="admin-dispute-parties">
                    <div>
                      <p className="admin-dispute-label">Guest</p>
                      <p>{requesterName}</p>
                      <p className="admin-dispute-email">{br?.requester?.email ?? ""}</p>
                    </div>
                    <div>
                      <p className="admin-dispute-label">Host</p>
                      <p>{hostName}</p>
                      <p className="admin-dispute-email">{br?.host?.email ?? ""}</p>
                    </div>
                    <div>
                      <p className="admin-dispute-label">Amount held</p>
                      <p>{br?.currency} {Number(br?.price ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="admin-dispute-accounts">
                    <div>
                      <p className="admin-dispute-label">Guest's account</p>
                      <blockquote className="dispute-quote">{d.requester_explanation}</blockquote>
                    </div>
                    <div>
                      <p className="admin-dispute-label">Host's response</p>
                      {d.host_response ? (
                        <blockquote className="dispute-quote dispute-quote-host">{d.host_response}</blockquote>
                      ) : (
                        <p className="admin-dispute-pending">Pending host response</p>
                      )}
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="admin-dispute-actions">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleResolve(d.id, "refunded")}
                        disabled={resolving === d.id}
                      >
                        {resolving === d.id ? "…" : "Refund Guest"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleResolve(d.id, "paid_host")}
                        disabled={resolving === d.id}
                      >
                        {resolving === d.id ? "…" : "Release to Host"}
                      </button>
                    </div>
                  )}

                  {isResolved && (
                    <p className="admin-dispute-resolved-info">
                      Resolved {fmtDate(d.resolved_at)} by {d.resolved_by ?? "admin"}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default AdminDisputesPage;
