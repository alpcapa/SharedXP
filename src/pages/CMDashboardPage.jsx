import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { supabase } from "../lib/supabase";

const fmtDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

const fmtMoney = (amount, currency) =>
  `${currency ?? ""} ${Number(amount ?? 0).toFixed(2)}`;

const STATUS_LABEL = { pending: "Pending", approved: "Approved", paid: "Paid" };
const STATUS_CLASS = { pending: "cm-status-pending", approved: "cm-status-approved", paid: "cm-status-paid" };

const CMDashboardPage = ({ currentUser, authLoading, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.cmProfile?.id) return;
    setLoading(true);

    const cmId = currentUser.cmProfile.id;

    const [referralsRes, commissionsRes] = await Promise.all([
      supabase
        .from("cm_referrals")
        .select("id, referred_user_id, signed_up_at")
        .eq("cm_id", cmId),
      supabase
        .from("cm_commissions")
        .select(`
          id, gmv, commission_amount, currency, status, approved_at, paid_at, created_at,
          booking_request:booking_requests(requested_date, sport,
            requester:profiles!requester_id(full_name, first_name, last_name))
        `)
        .eq("cm_id", cmId)
        .order("created_at", { ascending: false }),
    ]);

    const commList = commissionsRes.data ?? [];
    const totalEarnings = commList
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const pendingEarnings = commList
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const approvedEarnings = commList
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const currency = commList[0]?.currency ?? "EUR";

    setStats({
      referredCount: referralsRes.data?.length ?? 0,
      completedBookings: commList.length,
      totalEarnings,
      pendingEarnings,
      approvedEarnings,
      currency,
    });
    setCommissions(commList);
    setLoading(false);
  }, [currentUser?.cmProfile?.id]);

  useEffect(() => {
    if (currentUser?.isCm) fetchData();
    else setLoading(false);
  }, [currentUser?.isCm, fetchData]);

  const copyCode = () => {
    navigator.clipboard.writeText(currentUser?.cmProfile?.inviteCode ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (authLoading) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page"><p>Loading…</p></main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <Link to="/login" className="btn btn-primary">Log in</Link>
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  if (!currentUser.isCm) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <h1>Community Manager Dashboard</h1>
            <p>You don't have an active Community Manager profile.</p>
            {currentUser.isHost && (
              <Link to="/host-settings" className="btn btn-primary">Go to Host Settings</Link>
            )}
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  const getName = (profile) =>
    profile
      ? profile.full_name ||
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
        "—"
      : "—";

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section cm-dashboard">
          <h1 className="cm-dashboard-title">CM Dashboard</h1>
          <p className="cm-dashboard-subtitle">
            Welcome back, {currentUser.firstName || "CM"}. Here's your referral and commission overview.
          </p>

          <div className="cm-invite-card">
            <p className="cm-invite-label">Your invite code</p>
            <div className="cm-invite-code-row">
              <span className="cm-invite-code">{currentUser.cmProfile.inviteCode}</span>
              <button type="button" className="btn btn-secondary cm-copy-btn" onClick={copyCode}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="cm-invite-hint">
              Share this code with athletes and sports enthusiasts. Anyone who signs up with your code becomes your referral permanently.
            </p>
          </div>

          {loading ? (
            <p>Loading stats…</p>
          ) : stats ? (
            <>
              <div className="cm-stats-grid">
                <div className="cm-stat-card">
                  <p className="cm-stat-value">{stats.referredCount}</p>
                  <p className="cm-stat-label">Referred users</p>
                </div>
                <div className="cm-stat-card">
                  <p className="cm-stat-value">{stats.completedBookings}</p>
                  <p className="cm-stat-label">Completed bookings</p>
                </div>
                <div className="cm-stat-card">
                  <p className="cm-stat-value">{fmtMoney(stats.totalEarnings, stats.currency)}</p>
                  <p className="cm-stat-label">Total paid out</p>
                </div>
                <div className="cm-stat-card">
                  <p className="cm-stat-value">{fmtMoney(stats.pendingEarnings + stats.approvedEarnings, stats.currency)}</p>
                  <p className="cm-stat-label">Pending commission</p>
                </div>
              </div>

              <h2 className="cm-section-title">Commission history</h2>
              {commissions.length === 0 ? (
                <p className="cm-empty">No commissions yet. Share your invite code to get started!</p>
              ) : (
                <div className="cm-commission-table-wrap">
                  <table className="cm-commission-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Sport</th>
                        <th>GMV</th>
                        <th>Commission</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.id}>
                          <td>{fmtDate(c.created_at)}</td>
                          <td>{getName(c.booking_request?.requester)}</td>
                          <td>{c.booking_request?.sport ?? "—"}</td>
                          <td>{fmtMoney(c.gmv, c.currency)}</td>
                          <td>{fmtMoney(c.commission_amount, c.currency)}</td>
                          <td>
                            <span className={`cm-status-badge ${STATUS_CLASS[c.status] ?? ""}`}>
                              {STATUS_LABEL[c.status] ?? c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default CMDashboardPage;
