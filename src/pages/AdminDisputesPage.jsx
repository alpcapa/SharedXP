import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import InlineLoginForm from "../components/InlineLoginForm";
import { supabase } from "../lib/supabase";
import { useBookingRequests } from "../hooks/useBookingRequests";

// ── CM invite code generator ──────────────────────────────────────────────────
const CM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateInviteCode = (city) => {
  const cityCode = (city || "XP").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "XP";
  const rand = Array.from({ length: 4 }, () =>
    CM_CHARS[Math.floor(Math.random() * CM_CHARS.length)]
  ).join("");
  return `SXP-${cityCode}-${rand}`;
};

// ── CM email helper (uses booking-notify edge function with userId) ────────────
const sendCmEmail = async (emailType, userId, extra = {}) => {
  try {
    const { error } = await supabase.functions.invoke("booking-notify", {
      body: { emailType, userId, ...extra },
    });
    if (error) console.error("[cm-admin] email error:", emailType, error);
  } catch (e) {
    console.error("[cm-admin] email exception:", e);
  }
};

// ── Admin CM Management panel ─────────────────────────────────────────────────
const CMManagementPanel = () => {
  const [subTab, setSubTab] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [cmProfiles, setCmProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState({});
  const [actionBusy, setActionBusy] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [appRes, cmRes] = await Promise.all([
      supabase
        .from("cm_applications")
        .select(`*, applicant:profiles!user_id(full_name, first_name, last_name, email, city, country)`)
        .order("created_at", { ascending: false }),
      supabase
        .from("cm_profiles")
        .select(`
          *,
          owner:profiles!user_id(full_name, first_name, last_name, email),
          cm_referrals(count),
          cm_commissions(id, commission_amount, status)
        `)
        .order("created_at", { ascending: false }),
    ]);
    setApplications(appRes.data ?? []);
    setCmProfiles(cmRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (p) =>
    p ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—" : "—";

  const getNote = (id) => actionNotes[id] ?? "";
  const setNote = (id, val) => setActionNotes((prev) => ({ ...prev, [id]: val }));

  const busy = (id) => actionBusy === id;

  // Applications actions
  const moveToInterview = async (app) => {
    if (busy(app.id)) return;
    if (!confirm("Move this application to interview stage?")) return;
    setActionBusy(app.id);
    await supabase.from("cm_applications").update({ status: "interview" }).eq("id", app.id);
    await sendCmEmail("cm_interview", app.user_id);
    await fetchAll();
    setActionBusy(null);
  };

  const acceptApplication = async (app) => {
    if (busy(app.id)) return;
    if (!confirm("Accept this application and generate an invite code?")) return;
    setActionBusy(app.id);
    const city = app.applicant?.city || app.city || "XP";
    let inviteCode = generateInviteCode(city);
    const { data: clash } = await supabase
      .from("cm_profiles")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (clash) inviteCode = generateInviteCode(city);
    const { error: profileErr } = await supabase.from("cm_profiles").insert({
      user_id: app.user_id,
      invite_code: inviteCode,
      status: "active",
      city: app.city || app.applicant?.city || "",
      country: app.country || app.applicant?.country || "",
    });
    if (profileErr) {
      console.error("[cm-admin] failed to create CM profile:", profileErr);
      setActionBusy(null);
      return;
    }
    await supabase.from("cm_applications").update({ status: "accepted" }).eq("id", app.id);
    await sendCmEmail("cm_accepted", app.user_id, { inviteCode });
    await fetchAll();
    setActionBusy(null);
  };

  const declineApplication = async (app) => {
    if (busy(app.id)) return;
    if (!confirm("Decline this application?")) return;
    setActionBusy(app.id);
    await supabase.from("cm_applications").update({ status: "declined" }).eq("id", app.id);
    await sendCmEmail("cm_declined", app.user_id);
    await fetchAll();
    setActionBusy(null);
  };

  // Active CM actions
  const pauseCm = async (cm) => {
    if (busy(cm.id)) return;
    if (!confirm("Pause this CM's account?")) return;
    setActionBusy(cm.id);
    await supabase.from("cm_profiles").update({ status: "paused" }).eq("id", cm.id);
    await sendCmEmail("cm_paused", cm.user_id, { adminNotes: getNote(cm.id) });
    await fetchAll();
    setActionBusy(null);
  };

  const reactivateCm = async (cm) => {
    if (busy(cm.id)) return;
    if (!confirm("Re-activate this CM's account?")) return;
    setActionBusy(cm.id);
    await supabase.from("cm_profiles").update({ status: "active" }).eq("id", cm.id);
    await sendCmEmail("cm_reactivated", cm.user_id, { adminNotes: getNote(cm.id) });
    await fetchAll();
    setActionBusy(null);
  };

  const revokeCm = async (cm) => {
    const reason = getNote(cm.id);
    if (!reason.trim()) { alert("Please enter a reason before revoking."); return; }
    if (busy(cm.id)) return;
    if (!confirm("Revoke this CM's access? This cannot be undone easily.")) return;
    setActionBusy(cm.id);
    await supabase.from("cm_profiles").update({ status: "revoked" }).eq("id", cm.id);
    await sendCmEmail("cm_revoked", cm.user_id, { adminNotes: reason });
    await fetchAll();
    setActionBusy(null);
  };

  const approveCommission = async (cm, commissionId) => {
    const key = `${cm.id}-${commissionId}`;
    if (busy(key)) return;
    setActionBusy(key);
    await supabase
      .from("cm_commissions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", commissionId);
    await sendCmEmail("cm_commission_approved", cm.user_id, { commissionId });
    await fetchAll();
    setActionBusy(null);
  };

  const pendingApps = applications.filter((a) => ["pending", "interview"].includes(a.status));
  const closedApps = applications.filter((a) => ["accepted", "declined"].includes(a.status));

  const statusBadge = (status) => {
    const map = {
      pending: "cm-badge-pending",
      interview: "cm-badge-interview",
      accepted: "cm-badge-accepted",
      declined: "cm-badge-declined",
      active: "cm-badge-accepted",
      paused: "cm-badge-pending",
      revoked: "cm-badge-declined",
      banned: "cm-badge-declined",
    };
    return <span className={`cm-admin-badge ${map[status] ?? ""}`}>{status}</span>;
  };

  const cmStats = (cm) => {
    const comms = cm.cm_commissions ?? [];
    const pending = comms.filter((c) => c.status === "pending").length;
    const approved = comms.filter((c) => c.status === "approved").length;
    const paid = comms.filter((c) => c.status === "paid").length;
    const referrals = cm.cm_referrals?.[0]?.count ?? 0;
    return { pending, approved, paid, referrals };
  };

  if (loading) return <p style={{ marginTop: 24 }}>Loading CM data…</p>;

  return (
    <div className="cm-admin-panel">
      <div className="cm-admin-subtabs">
        <button
          type="button"
          className={`admin-tab${subTab === "applications" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("applications")}
        >
          Applications {pendingApps.length > 0 && <span className="cm-admin-count">{pendingApps.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "active" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("active")}
        >
          Active CMs
        </button>
      </div>

      {subTab === "applications" && (
        <div>
          <p className="admin-subtitle">Review pending and interview-stage applications.</p>
          {pendingApps.length === 0 && <p>No open applications.</p>}
          {pendingApps.map((app) => (
            <article key={app.id} className="cm-admin-card">
              <div className="cm-admin-card-header">
                <div>
                  <strong>{getName(app.applicant)}</strong>
                  <span className="cm-admin-email">{app.applicant?.email}</span>
                  <span className="cm-admin-location">{app.city}, {app.country}</span>
                </div>
                {statusBadge(app.status)}
              </div>
              <div className="cm-admin-fields">
                <div><p className="admin-dispute-label">Sports background</p><p>{app.sports_background}</p></div>
                <div><p className="admin-dispute-label">Motivation</p><p>{app.motivation}</p></div>
                {app.contact_times && <div><p className="admin-dispute-label">Contact times</p><p>{app.contact_times}</p></div>}
              </div>
              <div className="admin-dispute-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy(app.id) || app.status === "interview"}
                  onClick={() => moveToInterview(app)}
                >
                  {busy(app.id) ? "…" : "Move to Interview"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy(app.id)}
                  onClick={() => acceptApplication(app)}
                >
                  {busy(app.id) ? "…" : "Accept & Generate Code"}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy(app.id)}
                  onClick={() => declineApplication(app)}
                >
                  {busy(app.id) ? "…" : "Decline"}
                </button>
              </div>
            </article>
          ))}

          {closedApps.length > 0 && (
            <details className="cm-admin-closed">
              <summary>Accepted / Declined ({closedApps.length})</summary>
              {closedApps.map((app) => (
                <article key={app.id} className="cm-admin-card cm-admin-card-closed">
                  <div className="cm-admin-card-header">
                    <div>
                      <strong>{getName(app.applicant)}</strong>
                      <span className="cm-admin-email">{app.applicant?.email}</span>
                    </div>
                    {statusBadge(app.status)}
                  </div>
                  {app.admin_notes && <p className="cm-admin-note-preview">Notes: {app.admin_notes}</p>}
                </article>
              ))}
            </details>
          )}
        </div>
      )}

      {subTab === "active" && (
        <div>
          <p className="admin-subtitle">Manage active, paused, and revoked Community Managers.</p>
          {cmProfiles.length === 0 && <p>No Community Managers yet.</p>}
          {cmProfiles.map((cm) => {
            const s = cmStats(cm);
            const pendingComms = (cm.cm_commissions ?? []).filter((c) => c.status === "pending");
            return (
              <article key={cm.id} className="cm-admin-card">
                <div className="cm-admin-card-header">
                  <div>
                    <strong>{getName(cm.owner)}</strong>
                    <span className="cm-admin-email">{cm.owner?.email}</span>
                    <code className="cm-invite-code-pill">{cm.invite_code}</code>
                  </div>
                  {statusBadge(cm.status)}
                </div>
                <div className="cm-admin-stats-row">
                  <span><strong>{s.referrals}</strong> referrals</span>
                  <span><strong>{s.pending}</strong> pending commission</span>
                  <span><strong>{s.approved}</strong> approved</span>
                  <span><strong>{s.paid}</strong> paid</span>
                </div>
                {pendingComms.length > 0 && (
                  <div className="cm-admin-pending-comms">
                    <p className="admin-dispute-label">Pending commissions to approve:</p>
                    {pendingComms.map((c) => (
                      <div key={c.id} className="cm-pending-comm-row">
                        <span>{c.currency} {Number(c.commission_amount).toFixed(2)}</span>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy(`${cm.id}-${c.id}`)}
                          onClick={() => approveCommission(cm, c.id)}
                        >
                          {busy(`${cm.id}-${c.id}`) ? "…" : "Approve"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="cm-admin-notes-row">
                  <label htmlFor={`cm-notes-${cm.id}`} className="admin-dispute-label">
                    Notes / reason (required for Revoke; included in all emails)
                  </label>
                  <textarea
                    id={`cm-notes-${cm.id}`}
                    className="cm-admin-notes"
                    rows={2}
                    placeholder="Enter reason or notes…"
                    value={getNote(cm.id)}
                    onChange={(e) => setNote(cm.id, e.target.value)}
                  />
                </div>
                <div className="admin-dispute-actions">
                  {cm.status === "active" && (
                    <button type="button" className="btn btn-light" disabled={busy(cm.id)} onClick={() => pauseCm(cm)}>
                      {busy(cm.id) ? "…" : "Pause"}
                    </button>
                  )}
                  {cm.status === "paused" && (
                    <button type="button" className="btn btn-primary" disabled={busy(cm.id)} onClick={() => reactivateCm(cm)}>
                      {busy(cm.id) ? "…" : "Re-activate"}
                    </button>
                  )}
                  {cm.status === "revoked" && (
                    <button type="button" className="btn btn-primary" disabled={busy(cm.id)} onClick={() => reactivateCm(cm)}>
                      {busy(cm.id) ? "…" : "Re-activate"}
                    </button>
                  )}
                  {cm.status !== "revoked" && (
                    <button type="button" className="btn btn-danger" disabled={busy(cm.id)} onClick={() => revokeCm(cm)}>
                      {busy(cm.id) ? "…" : "Revoke"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const fmtDate = (iso) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
          .format(new Date(iso)) : "—";

const AdminDisputesPage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword }) => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [activeTab, setActiveTab] = useState("disputes");
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
    if (authLoading) {
      return (
        <div className="home-page">
          <div className="middle-page-frame">
            <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
            <main className="middle-section simple-page"><p>Loading…</p></main>
            <SiteFooter />
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
          <main className="middle-section simple-page">
            <InlineLoginForm onEmailLogin={onEmailLogin} onForgotPassword={onForgotPassword} />
          </main>
          <SiteFooter />
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
          <SiteFooter />
        </div>
      </div>
    );
  }

  const getName = (profile) =>
    profile
      ? (profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unknown")
      : "Unknown";

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section admin-main">
        <h1 className="admin-title">Admin Panel</h1>

        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${activeTab === "disputes" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("disputes")}
          >
            Dispute Management
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "cm" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("cm")}
          >
            CM Management
          </button>
        </div>

        {activeTab === "disputes" && (
          <>
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
                      <p className="admin-dispute-label">Guest's response</p>
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
          </>
        )}

        {activeTab === "cm" && <CMManagementPanel />}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default AdminDisputesPage;
