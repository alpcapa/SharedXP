import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import InlineLoginForm from "../components/InlineLoginForm";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";
import { useBookingRequests } from "../hooks/useBookingRequests";
import { sendNotification } from "../utils/sendNotification";

// ── CM invite code generator ──────────────────────────────────────────────────
const CM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateInviteCode = (city) => {
  const cityCode = (city || "XP").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "XP";
  const rand = Array.from({ length: 4 }, () =>
    CM_CHARS[Math.floor(Math.random() * CM_CHARS.length)]
  ).join("");
  return `SXP-${cityCode}-${rand}`;
};

// ── CM email helper ───────────────────────────────────────────────────────────
// Uses text/plain content-type to avoid CORS preflight on the edge function
const sendCmEmail = async (emailType, userId, extra = {}) => {
  try {
    await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ emailType, userId, ...extra }),
    });
  } catch (e) {
    console.error("[cm-admin] email error:", emailType, e);
  }
};

// ── Note history helpers ──────────────────────────────────────────────────────
const parseNotes = (adminNotes) => {
  if (!adminNotes) return [];
  try {
    const parsed = JSON.parse(adminNotes);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ action: "note", note: adminNotes, at: null }];
};

// Merge cm_profiles.admin_notes + cm_applications.admin_notes into one
// deduplicated, chronologically sorted JSON string. Handles the case where
// the same notes were written to both tables (e.g. at acceptance time).
const mergeAdminNotes = (cmNotes, appNotes) => {
  const arr1 = parseNotes(cmNotes);
  const arr2 = parseNotes(appNotes);
  const seen = new Set();
  const merged = [...arr1, ...arr2].filter((n) => {
    const key = `${n.action}|${n.at ?? ""}|${n.note}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  merged.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return -1;
    if (!b.at) return 1;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
  return merged.length === 0 ? null : JSON.stringify(merged);
};

const appendNote = (existing, action, noteText, by) => {
  const notes = parseNotes(existing);
  const entry = { action, note: noteText.trim(), at: new Date().toISOString() };
  if (by) entry.by = by;
  notes.push(entry);
  return JSON.stringify(notes);
};

const NOTE_LABELS = {
  interview: "Moved to Interview",
  accepted: "Accepted",
  declined: "Declined",
  paused: "Paused",
  reactivated: "Re-activated",
  revoked: "Revoked",
  email: "Email Sent",
  note: "Note",
  suspend: "Account Suspended",
  unsuspend: "Account Unsuspended",
  close: "Account Closed",
  reopen: "Account Reopened",
  commission_approved: "Commission Approved",
  commission_paid: "Commission Marked Paid",
  payout_notified: "Payout Notification Sent",
  payment_details_added: "Payment Details Added",
};

const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso))
    : "";

const fmtDateLong = (iso) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
};

const NoteHistory = ({ adminNotes, adminName = "Admin", fallbackDate = null }) => {
  const notes = parseNotes(adminNotes).slice().reverse();
  if (notes.length === 0) return null;
  return (
    <div className="admin-note-history">
      {notes.map((n, i) => {
        const isLegacy = n.action === "note" && !n.at;
        return (
          <div key={i} className="admin-note-entry">
            <div className="admin-note-meta">
              {isLegacy ? (
                <>
                  <span className="admin-note-action-label">{adminName}</span>
                  {fallbackDate && (
                    <span className="admin-note-time">· wrote on {fmtDateTime(fallbackDate)}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="admin-note-action-label">{NOTE_LABELS[n.action] ?? n.action}</span>
                  <span className="admin-note-time">· {fmtDateTime(n.at)} · {n.by || adminName}</span>
                </>
              )}
            </div>
            <p className="admin-note-text">{n.note}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── Admin CM Management panel ─────────────────────────────────────────────────
const CMManagementPanel = ({ currentUser, initialSearch = "", initialSubTab = "applications", onCountChange }) => {
  const [subTab, setSubTab] = useState(initialSubTab);
  const [applications, setApplications] = useState([]);
  const [cmProfiles, setCmProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState({});
  const [emailSubjects, setEmailSubjects] = useState({});
  const [actionBusy, setActionBusy] = useState(null);
  const [appActionMode, setAppActionMode] = useState(null); // { id, action }
  const [cmActionMode, setCmActionMode] = useState(null); // { id, action }
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [cmSearch, setCmSearch] = useState(initialSearch);
  const [emailFeedback, setEmailFeedback] = useState({});
  const [viewApplication, setViewApplication] = useState(null);
  const [confirmPay, setConfirmPay] = useState(null); // { cm, comm }

  const toggleExpand = (id) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const adminName = currentUser?.fullName ||
    `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() ||
    "Admin";
  const pendingCommsTotal = cmProfiles.reduce(
    (sum, cm) => sum + (cm.cm_commissions ?? []).filter((c) => c.status === "pending").length,
    0
  );
  const approvedCommsTotal = cmProfiles.reduce(
    (sum, cm) => sum + (cm.cm_commissions ?? []).filter((c) => c.status === "approved" && !c.paid_at).length,
    0
  );

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
          cm_commissions(id, commission_amount, currency, status, approved_at, paid_at, created_at, booking_request:booking_requests(sport, requested_date, requester:profiles!requester_id(full_name, first_name, last_name), host:profiles!host_id(full_name, first_name, last_name)))
        `)
        .order("created_at", { ascending: false }),
    ]);
    const apps = appRes.data ?? [];
    const cms = cmRes.data ?? [];
    // Attach each CM's accepted application so old CMs can show their pre-existing notes
    const appByUserId = Object.fromEntries(apps.map((a) => [a.user_id, a]));
    setApplications(apps);
    setCmProfiles(cms.map((cm) => ({ ...cm, _application: appByUserId[cm.user_id] ?? null })));
    setLoading(false);
    onCountChange?.();
  }, [onCountChange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (p) =>
    p ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—" : "—";

  const getNote = (id) => actionNotes[id] ?? "";
  const setNote = (id, val) => setActionNotes((prev) => ({ ...prev, [id]: val }));
  const getSubject = (id) => emailSubjects[id] ?? "";
  const setSubject = (id, val) => setEmailSubjects((prev) => ({ ...prev, [id]: val }));

  const busy = (id) => actionBusy === id;

  const setEmailErr = (id, msg) => setEmailFeedback((prev) => ({ ...prev, [id]: { type: "error", msg } }));
  const clearEmailFeedback = (id) => setEmailFeedback((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const sendAdminEmail = async (cm) => {
    const subject = getSubject(cm.id).trim();
    const message = getNote(cm.id).trim();
    if (!subject) { setEmailErr(cm.id, "Please enter a subject."); return; }
    if (!message) { setEmailErr(cm.id, "Please enter a message."); return; }
    if (busy(`email-${cm.id}`)) return;
    clearEmailFeedback(cm.id);
    setActionBusy(`email-${cm.id}`);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ emailType: "cm_admin_message", userId: cm.user_id, subject, message }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setEmailErr(cm.id, `Failed to send: ${json.error ?? res.status}`);
      } else {
        const newNotes = appendNote(cm.admin_notes, "email", `Subject: ${subject}\n\n${message}`);
        await supabase.from("cm_profiles").update({ admin_notes: newNotes }).eq("id", cm.id);
        setEmailFeedback((prev) => ({ ...prev, [cm.id]: { type: "success", msg: "Sent" } }));
        setSubject(cm.id, "");
        setNote(cm.id, "");
        await fetchAll();
        setTimeout(() => { setCmActionMode(null); clearEmailFeedback(cm.id); }, 1500);
      }
    } catch (e) {
      setEmailErr(cm.id, `Error: ${e.message}`);
    }
    setActionBusy(null);
  };

  // Applications actions
  const moveToInterview = async (app) => {
    if (!getNote(app.id).trim()) return;
    if (busy(app.id)) return;
    setActionBusy(app.id);
    const newNotes = appendNote(app.admin_notes, "interview", getNote(app.id));
    await supabase.from("cm_applications").update({ status: "interview", admin_notes: newNotes }).eq("id", app.id);
    await sendCmEmail("cm_interview", app.user_id);
    setNote(app.id, "");
    setAppActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  const acceptApplication = async (app) => {
    if (!getNote(app.id).trim()) return;
    if (busy(app.id)) return;
    setActionBusy(app.id);
    const city = app.applicant?.city || app.city || "XP";
    let inviteCode = generateInviteCode(city);
    const { data: clash } = await supabase
      .from("cm_profiles")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (clash) inviteCode = generateInviteCode(city);
    const newNotes = appendNote(app.admin_notes, "accepted", getNote(app.id));
    const { error: profileErr } = await supabase.from("cm_profiles").insert({
      user_id: app.user_id,
      invite_code: inviteCode,
      status: "active",
      city: app.city || app.applicant?.city || "",
      country: app.country || app.applicant?.country || "",
      admin_notes: newNotes,
    });
    if (profileErr) {
      console.error("[cm-admin] failed to create CM profile:", profileErr);
      setActionBusy(null);
      return;
    }
    await supabase.from("cm_applications").update({ status: "accepted", admin_notes: newNotes }).eq("id", app.id);
    await sendCmEmail("cm_accepted", app.user_id, { inviteCode });
    setNote(app.id, "");
    setAppActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  const declineApplication = async (app) => {
    if (!getNote(app.id).trim()) return;
    if (busy(app.id)) return;
    setActionBusy(app.id);
    const newNotes = appendNote(app.admin_notes, "declined", getNote(app.id));
    await supabase.from("cm_applications").update({ status: "declined", admin_notes: newNotes }).eq("id", app.id);
    await sendCmEmail("cm_declined", app.user_id);
    setNote(app.id, "");
    setAppActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  // Active CM actions
  const pauseCm = async (cm) => {
    const note = getNote(cm.id);
    if (!note.trim()) { alert("Please enter a reason before pausing."); return; }
    if (busy(cm.id)) return;
    setActionBusy(cm.id);
    const newNotes = appendNote(mergeAdminNotes(cm.admin_notes, cm._application?.admin_notes), "paused", note);
    await supabase.from("cm_profiles").update({ status: "paused", admin_notes: newNotes }).eq("id", cm.id);
    await sendCmEmail("cm_paused", cm.user_id);
    setNote(cm.id, "");
    setCmActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  const reactivateCm = async (cm) => {
    const note = getNote(cm.id);
    if (!note.trim()) { alert("Please enter a reason before re-activating."); return; }
    if (busy(cm.id)) return;
    setActionBusy(cm.id);
    const newNotes = appendNote(mergeAdminNotes(cm.admin_notes, cm._application?.admin_notes), "reactivated", note);
    await supabase.from("cm_profiles").update({ status: "active", admin_notes: newNotes }).eq("id", cm.id);
    await sendCmEmail("cm_reactivated", cm.user_id);
    setNote(cm.id, "");
    setCmActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  const revokeCm = async (cm) => {
    const note = getNote(cm.id);
    if (!note.trim()) { alert("Please enter a reason before revoking."); return; }
    if (busy(cm.id)) return;
    setActionBusy(cm.id);
    const newNotes = appendNote(mergeAdminNotes(cm.admin_notes, cm._application?.admin_notes), "revoked", note);
    await supabase.from("cm_profiles").update({ status: "revoked", admin_notes: newNotes }).eq("id", cm.id);
    await sendCmEmail("cm_revoked", cm.user_id);
    setNote(cm.id, "");
    setCmActionMode(null);
    await fetchAll();
    setActionBusy(null);
  };

  // Describes a commission for the admin note thread, e.g. "EUR 12.50 — Skiing experience"
  const commissionNote = (comm) =>
    `${comm.currency} ${Number(comm.commission_amount).toFixed(2)}${
      comm.booking_request?.sport ? ` — ${comm.booking_request.sport} experience` : ""
    }`;

  const appendCmNote = async (cm, action, noteText) => {
    const newNotes = appendNote(
      mergeAdminNotes(cm.admin_notes, cm._application?.admin_notes),
      action,
      noteText,
      adminName
    );
    await supabase.from("cm_profiles").update({ admin_notes: newNotes }).eq("id", cm.id);
  };

  const approveCommission = async (cm, comm) => {
    const key = `${cm.id}-${comm.id}`;
    if (busy(key)) return;
    setActionBusy(key);
    const { error } = await supabase
      .from("cm_commissions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", comm.id);
    if (!error) {
      const detailsMissing = !String(cm.payment_info ?? "").trim();
      await appendCmNote(
        cm,
        "commission_approved",
        commissionNote(comm) + (detailsMissing ? " — payout details missing at approval" : "")
      );
      await sendCmEmail("cm_commission_approved", cm.user_id, { commissionId: comm.id });
    }
    await fetchAll();
    setActionBusy(null);
  };

  const markCommissionPaid = async (cm, comm) => {
    const key = `pay-${cm.id}`;
    if (busy(key)) return;
    setActionBusy(key);
    const { error } = await supabase
      .from("cm_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", comm.id);
    if (!error) {
      await appendCmNote(cm, "commission_paid", commissionNote(comm));
      await sendCmEmail("cm_commission_paid", cm.user_id, {
        commissionIds: [comm.id],
        totalAmount: Number(comm.commission_amount),
      });
    }
    await fetchAll();
    setActionBusy(null);
  };

  const matchesCmSearch = (name, email) => {
    if (!cmSearch.trim()) return true;
    const q = cmSearch.toLowerCase();
    return (name ?? "").toLowerCase().includes(q) || (email ?? "").toLowerCase().includes(q);
  };

  const pendingApps = applications.filter((a) =>
    ["pending", "interview"].includes(a.status) &&
    matchesCmSearch(getName(a.applicant), a.applicant?.email)
  );
  const declinedApps = applications.filter((a) =>
    a.status === "declined" &&
    matchesCmSearch(getName(a.applicant), a.applicant?.email)
  );
  const activeCms = cmProfiles.filter((cm) =>
    cm.status === "active" && matchesCmSearch(getName(cm.owner), cm.owner?.email)
  );
  const pausedCms = cmProfiles.filter((cm) =>
    cm.status === "paused" && matchesCmSearch(getName(cm.owner), cm.owner?.email)
  );
  const revokedCms = cmProfiles.filter((cm) =>
    cm.status === "revoked" && matchesCmSearch(getName(cm.owner), cm.owner?.email)
  );

  const statusBadge = (status) => {
    const map = {
      pending: "cm-badge-pending",
      interview: "cm-badge-interview",
      accepted: "cm-badge-accepted",
      declined: "cm-badge-declined",
      active: "cm-badge-accepted",
      paused: "cm-badge-pending",
      revoked: "cm-badge-declined",
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
    <>
    <div className="cm-admin-panel">
      <div className="support-inbox-controls">
        <div className="cm-admin-subtabs" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`admin-tab${subTab === "applications" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("applications")}
        >
          Applications <span className={`cm-admin-count${pendingApps.length > 0 ? " cm-admin-count-alert" : ""}`}>{pendingApps.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "active" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("active")}
        >
          Active CMs <span className="cm-admin-count">{activeCms.length}</span>
          {pendingCommsTotal > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{pendingCommsTotal}</span>
          )}
          {approvedCommsTotal > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{approvedCommsTotal} to pay</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "paused" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("paused")}
        >
          Paused <span className="cm-admin-count">{pausedCms.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "revoked" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("revoked")}
        >
          Revoked <span className="cm-admin-count">{revokedCms.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "declined" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("declined")}
        >
          Declined <span className="cm-admin-count">{declinedApps.length}</span>
        </button>
        </div>
        <div className="support-filters">
          <input
            type="text"
            className="support-search-input"
            placeholder="Search name or email…"
            value={cmSearch}
            onChange={(e) => setCmSearch(e.target.value)}
          />
          {cmSearch && (
            <button type="button" className="btn btn-light btn-sm" onClick={() => setCmSearch("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      {subTab === "applications" && (
        <div>
          <p className="admin-subtitle">Review pending and interview-stage applications.</p>
          {pendingApps.length === 0 && <p>No open applications.</p>}
          {pendingApps.map((app) => {
            const isInterview = app.status === "interview";
            const isExpanded = expandedIds.has(app.id);
            return (
              <article key={app.id} className="cm-admin-card">
                <button
                  type="button"
                  className="cm-admin-card-summary"
                  onClick={() => toggleExpand(app.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="cm-admin-card-summary-left">
                    <strong>{getName(app.applicant)}</strong>
                    <span className="cm-admin-email">{app.applicant?.email}</span>
                    <span className="cm-admin-location">{app.city}, {app.country}</span>
                  </div>
                  <div className="cm-admin-card-summary-right">
                    {statusBadge(app.status)}
                    <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="cm-admin-card-body">
                    <div className="cm-admin-fields">
                      <div><p className="admin-dispute-label">Sports background</p><p>{app.sports_background}</p></div>
                      <div><p className="admin-dispute-label">Motivation</p><p>{app.motivation}</p></div>
                      {app.phone && <div><p className="admin-dispute-label">Phone</p><p>{app.phone}</p></div>}
                      {app.contact_times && <div><p className="admin-dispute-label">Contact times</p><p>{app.contact_times}</p></div>}
                    </div>
                    {app.admin_notes && (
                      <div className="cm-admin-notes-row">
                        <p className="admin-dispute-label">Admin note history</p>
                        <NoteHistory adminNotes={app.admin_notes} adminName={adminName} fallbackDate={app.updated_at} />
                      </div>
                    )}
                    {appActionMode?.id === app.id ? (
                      <div className="cm-admin-notes-row">
                        <label htmlFor={`notes-${app.id}`} className="admin-dispute-label">
                          {appActionMode.action === "interview"
                            ? "Write reason to move to interview"
                            : appActionMode.action === "accept"
                            ? "Write reason to accept"
                            : "Write reason to decline"}
                        </label>
                        <textarea
                          id={`notes-${app.id}`}
                          className="cm-admin-notes"
                          rows={3}
                          placeholder="Enter your notes…"
                          value={getNote(app.id)}
                          onChange={(e) => setNote(app.id, e.target.value)}
                          autoFocus
                        />
                        <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => { setAppActionMode(null); setNote(app.id, ""); }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className={`btn ${appActionMode.action === "decline" ? "btn-danger" : "btn-primary"}`}
                            disabled={busy(app.id) || !getNote(app.id).trim()}
                            onClick={() => {
                              if (appActionMode.action === "interview") moveToInterview(app);
                              else if (appActionMode.action === "accept") acceptApplication(app);
                              else declineApplication(app);
                            }}
                          >
                            {busy(app.id) ? "…" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-dispute-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={isInterview}
                          onClick={() => setAppActionMode({ id: app.id, action: "interview" })}
                        >
                          Move to Interview
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setAppActionMode({ id: app.id, action: "accept" })}
                        >
                          Accept &amp; Welcome
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => setAppActionMode({ id: app.id, action: "decline" })}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

        </div>
      )}

      {subTab === "declined" && (
        <div>
          <p className="admin-subtitle">Applications that were declined.</p>
          {declinedApps.length === 0 && <p>No declined applications.</p>}
          {declinedApps.map((app) => {
            const isExpanded = expandedIds.has(app.id);
            return (
              <article key={app.id} className="cm-admin-card">
                <button
                  type="button"
                  className="cm-admin-card-summary"
                  onClick={() => toggleExpand(app.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="cm-admin-card-summary-left">
                    <strong>{getName(app.applicant)}</strong>
                    <span className="cm-admin-email">{app.applicant?.email}</span>
                    <span className="cm-admin-location">{app.city}, {app.country}</span>
                  </div>
                  <div className="cm-admin-card-summary-right">
                    {statusBadge(app.status)}
                    <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="cm-admin-card-body">
                    <div className="cm-admin-fields">
                      <div><p className="admin-dispute-label">Sports background</p><p>{app.sports_background}</p></div>
                      <div><p className="admin-dispute-label">Motivation</p><p>{app.motivation}</p></div>
                      {app.phone && <div><p className="admin-dispute-label">Phone</p><p>{app.phone}</p></div>}
                      {app.contact_times && <div><p className="admin-dispute-label">Contact times</p><p>{app.contact_times}</p></div>}
                    </div>
                    {app.admin_notes && (
                      <div className="cm-admin-notes-row">
                        <p className="admin-dispute-label">Admin note history</p>
                        <NoteHistory adminNotes={app.admin_notes} adminName={adminName} fallbackDate={app.updated_at} />
                      </div>
                    )}
                    <div className="cm-admin-notes-row">
                      <label htmlFor={`notes-${app.id}`} className="admin-dispute-label">
                        Reason for accepting (required)
                      </label>
                      <textarea
                        id={`notes-${app.id}`}
                        className="cm-admin-notes"
                        rows={2}
                        placeholder="Why are you accepting this previously declined application?"
                        value={getNote(app.id)}
                        onChange={(e) => setNote(app.id, e.target.value)}
                      />
                    </div>
                    <div className="admin-dispute-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy(app.id)}
                        onClick={() => acceptApplication(app)}
                      >
                        {busy(app.id) ? "…" : "Accept & Welcome"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {(subTab === "active" || subTab === "paused" || subTab === "revoked") && (() => {
        const listMap = { active: activeCms, paused: pausedCms, revoked: revokedCms };
        const subtitleMap = {
          active: "Manage active Community Managers.",
          paused: "Community Managers that are currently paused.",
          revoked: "Community Managers whose access has been revoked.",
        };
        const emptyMap = {
          active: cmProfiles.length === 0 ? "No Community Managers yet." : "No active CMs match your search.",
          paused: "No paused CMs.",
          revoked: "No revoked CMs.",
        };
        const list = listMap[subTab];
        return (
          <div>
            <p className="admin-subtitle">{subtitleMap[subTab]}</p>
            {list.length === 0 && <p>{emptyMap[subTab]}</p>}
            {list.map((cm) => {
              const s = cmStats(cm);
              const pendingComms = (cm.cm_commissions ?? []).filter((c) => c.status === "pending");
              const approvedComms = (cm.cm_commissions ?? []).filter((c) => c.status === "approved" && !c.paid_at);
              const isExpanded = expandedIds.has(cm.id);
              return (
                <article key={cm.id} className="cm-admin-card">
                  <button
                    type="button"
                    className="cm-admin-card-summary"
                    onClick={() => toggleExpand(cm.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="cm-admin-card-summary-left">
                      <strong>{getName(cm.owner)}</strong>
                      <span className="cm-admin-email">{cm.owner?.email}</span>
                      <code className="cm-invite-code-pill">{cm.invite_code}</code>
                    </div>
                    <div className="cm-admin-card-summary-right">
                      {statusBadge(cm.status)}
                      {approvedComms.length > 0 && (
                        <span className="cm-admin-count cm-admin-count-alert">{approvedComms.length} to pay</span>
                      )}
                      {pendingComms.length > 0 && (
                        <span className="cm-admin-count cm-admin-count-alert">{pendingComms.length} pending</span>
                      )}
                      <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="cm-admin-card-body">
                      <div className="cm-admin-stats-row">
                        <span><strong>{s.referrals}</strong> referrals</span>
                        <span><strong>{s.pending}</strong> pending commission</span>
                        <span><strong>{s.approved}</strong> approved</span>
                        <span><strong>{s.paid}</strong> paid</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy(`welcome-${cm.id}`)}
                          onClick={async () => {
                            setActionBusy(`welcome-${cm.id}`);
                            try {
                              const res = await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
                                method: "POST",
                                headers: { "Content-Type": "text/plain" },
                                body: JSON.stringify({ emailType: "cm_accepted", userId: cm.user_id, inviteCode: cm.invite_code }),
                              });
                              const json = await res.json();
                              setActionBusy(null);
                              if (!res.ok) alert(`Failed: ${json.error ?? JSON.stringify(json)}`);
                              else alert("Welcome email sent.");
                            } catch (e) {
                              setActionBusy(null);
                              alert(`Error: ${e.message}`);
                            }
                          }}
                        >
                          {busy(`welcome-${cm.id}`) ? "Sending…" : "Resend Welcome Email"}
                        </button>
                      </div>
                      {(approvedComms.length > 0 || pendingComms.length > 0) && (
                        <div className="cm-admin-pending-comms">
                          {approvedComms.length > 0 && (
                            <>
                              <p className="admin-dispute-label">
                                Commissions ready to pay:
                              </p>
                              {cm.payment_info ? (
                                <p className="cm-admin-payment-info">
                                  <strong>Send payment to:</strong> {cm.payment_info}
                                </p>
                              ) : (
                                <p className="cm-admin-payment-info cm-admin-payment-info--missing">
                                  No payment details provided — ask CM to add them in their dashboard.
                                </p>
                              )}
                              {approvedComms.map((c) => (
                                <div key={c.id} className="cm-pending-comm-row">
                                  <span>
                                    <strong>{c.currency} {Number(c.commission_amount).toFixed(2)}</strong>
                                    <span className="cm-comm-date"> · approved {c.approved_at ? new Date(c.approved_at).toLocaleDateString("en-GB") : "—"}</span>
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={busy(`pay-${cm.id}`)}
                                    onClick={() => setConfirmPay({ cm, comm: c })}
                                  >
                                    {busy(`pay-${cm.id}`) ? "…" : "Mark Paid"}
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                          {pendingComms.length > 0 && (
                            <>
                              <p className="admin-dispute-label" style={{ marginTop: approvedComms.length > 0 ? 16 : 0 }}>
                                Pending commissions (below threshold — manual approval):
                              </p>
                              {pendingComms.map((c) => (
                                <div key={c.id} className="cm-pending-comm-row">
                                  <span>
                                    <strong>{c.currency} {Number(c.commission_amount).toFixed(2)}</strong>
                                    {c.booking_request && (
                                      <span className="cm-comm-date">
                                        {" — from "}
                                        {getName(c.booking_request.requester)}
                                        {" "}
                                        {c.booking_request.sport}
                                        {" experience with "}
                                        {getName(c.booking_request.host)}
                                        {c.booking_request.requested_date
                                          ? ` on ${new Date(c.booking_request.requested_date).toLocaleDateString("en-GB")}`
                                          : ""}
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={busy(`${cm.id}-${c.id}`)}
                                    onClick={() => approveCommission(cm, c)}
                                  >
                                    {busy(`${cm.id}-${c.id}`) ? "…" : "Approve"}
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      {(cm.admin_notes || cm._application?.admin_notes) && (
                        <div className="cm-admin-notes-row">
                          <p className="admin-dispute-label">Admin note history</p>
                          <NoteHistory
                            adminNotes={mergeAdminNotes(cm.admin_notes, cm._application?.admin_notes)}
                            adminName={adminName}
                            fallbackDate={cm._application?.updated_at}
                          />
                        </div>
                      )}
                      {cmActionMode?.id === cm.id ? (
                        <div className="cm-admin-notes-row">
                          {cmActionMode.action === "email" ? (
                            <>
                              <p className="admin-dispute-label">Email {getName(cm.owner)}</p>
                              <input
                                type="text"
                                className="cm-admin-email-subject"
                                placeholder="Subject…"
                                value={getSubject(cm.id)}
                                onChange={(e) => { setSubject(cm.id, e.target.value); clearEmailFeedback(cm.id); }}
                                autoFocus
                              />
                              <textarea
                                className="cm-admin-notes"
                                rows={4}
                                placeholder="Message…"
                                value={getNote(cm.id)}
                                onChange={(e) => { setNote(cm.id, e.target.value); clearEmailFeedback(cm.id); }}
                              />
                              {emailFeedback[cm.id] && (
                                <p style={{ margin: "6px 0 0", fontSize: 13, color: emailFeedback[cm.id].type === "error" ? "#ef4444" : "#2e7d32" }}>
                                  {emailFeedback[cm.id].msg}
                                </p>
                              )}
                              <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => { setCmActionMode(null); setSubject(cm.id, ""); setNote(cm.id, ""); clearEmailFeedback(cm.id); }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={busy(`email-${cm.id}`) || emailFeedback[cm.id]?.type === "success"}
                                  onClick={() => sendAdminEmail(cm)}
                                >
                                  {emailFeedback[cm.id]?.type === "success" ? "Sent" : busy(`email-${cm.id}`) ? "Sending…" : "Send Email"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <label htmlFor={`cm-notes-${cm.id}`} className="admin-dispute-label">
                                Reason for {cmActionMode.action === "pause" ? "pausing" : cmActionMode.action === "revoke" ? "revoking" : "re-activating"} (required)
                              </label>
                              <textarea
                                id={`cm-notes-${cm.id}`}
                                className="cm-admin-notes"
                                rows={2}
                                placeholder="Enter reason…"
                                value={getNote(cm.id)}
                                onChange={(e) => setNote(cm.id, e.target.value)}
                                autoFocus
                              />
                              <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => { setCmActionMode(null); setNote(cm.id, ""); }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${cmActionMode.action === "revoke" ? "btn-danger" : "btn-primary"}`}
                                  disabled={busy(cm.id)}
                                  onClick={() => {
                                    if (cmActionMode.action === "pause") pauseCm(cm);
                                    else if (cmActionMode.action === "revoke") revokeCm(cm);
                                    else reactivateCm(cm);
                                  }}
                                >
                                  {busy(cm.id) ? "…" : "Confirm"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="admin-dispute-actions">
                          {cm._application && (
                            <button type="button" className="btn btn-light" onClick={() => setViewApplication(cm._application)}>
                              Application
                            </button>
                          )}
                          <button type="button" className="btn btn-light" onClick={() => setCmActionMode({ id: cm.id, action: "email" })}>
                            Email
                          </button>
                          {cm.status === "active" && (
                            <button type="button" className="btn btn-light" onClick={() => setCmActionMode({ id: cm.id, action: "pause" })}>
                              Pause
                            </button>
                          )}
                          {(cm.status === "paused" || cm.status === "revoked") && (
                            <button type="button" className="btn btn-primary" onClick={() => setCmActionMode({ id: cm.id, action: "reactivate" })}>
                              Re-activate
                            </button>
                          )}
                          {cm.status !== "revoked" && (
                            <button type="button" className="btn btn-danger" onClick={() => setCmActionMode({ id: cm.id, action: "revoke" })}>
                              Revoke
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        );
      })()}
    </div>

    {viewApplication && (
      <div className="cm-app-popup-backdrop" onClick={() => setViewApplication(null)}>
        <div className="cm-app-popup" onClick={(e) => e.stopPropagation()}>
          <div className="cm-app-popup-header">
            <h3 className="cm-app-popup-title">CM Application</h3>
            <button type="button" className="cm-app-popup-close" onClick={() => setViewApplication(null)}>✕</button>
          </div>
          <div className="cm-app-popup-body">
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Name</p>
              <p>{getName(viewApplication.applicant)}</p>
            </div>
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Email</p>
              <p>{viewApplication.applicant?.email ?? "—"}</p>
            </div>
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Location</p>
              <p>{[viewApplication.city, viewApplication.country].filter(Boolean).join(", ") || "—"}</p>
            </div>
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Sports background</p>
              <p>{viewApplication.sports_background || "—"}</p>
            </div>
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Motivation</p>
              <p>{viewApplication.motivation || "—"}</p>
            </div>
            {viewApplication.phone && (
              <div className="cm-app-popup-field">
                <p className="admin-dispute-label">Phone</p>
                <p>{viewApplication.phone}</p>
              </div>
            )}
            {viewApplication.contact_times && (
              <div className="cm-app-popup-field">
                <p className="admin-dispute-label">Contact times</p>
                <p>{viewApplication.contact_times}</p>
              </div>
            )}
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Submitted</p>
              <p>{new Date(viewApplication.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div className="cm-app-popup-field">
              <p className="admin-dispute-label">Status</p>
              <p style={{ textTransform: "capitalize" }}>{viewApplication.status}</p>
            </div>
          </div>
          <div className="cm-app-popup-footer">
            <button type="button" className="btn btn-light" onClick={() => setViewApplication(null)}>Close</button>
          </div>
        </div>
      </div>
    )}

    {confirmPay && (
      <div className="modal-backdrop" role="presentation" onClick={() => setConfirmPay(null)}>
        <div
          className="modal-box"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm commission payment"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">
            Mark {confirmPay.comm.currency} {Number(confirmPay.comm.commission_amount).toFixed(2)} as
            paid to {getName(confirmPay.cm.owner)}?
          </h3>
          <p className="modal-body-text">Have you confirmed with accounting about this?</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-light" onClick={() => setConfirmPay(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy(`pay-${confirmPay.cm.id}`)}
              onClick={async () => {
                await markCommissionPaid(confirmPay.cm, confirmPay.comm);
                setConfirmPay(null);
              }}
            >
              {busy(`pay-${confirmPay.cm.id}`) ? "Processing…" : "Yes, continue"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// ── Support inbox panel ────────────────────────────────────────────────────────
const CLOSED_STATUSES = new Set(["replied", "resolved", "autoreplied"]);

const SupportPanel = ({ currentUser, onRead }) => {
  const [messages, setMessages] = useState([]);
  const [profileMap, setProfileMap] = useState({}); // email → profile
  const [cmProfileMap, setCmProfileMap] = useState({}); // profile.id → cm_profile
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState(new Set()); // keyed by from_email
  const [replyMode, setReplyMode] = useState(null); // message id
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(null);
  const [supportTab, setSupportTab] = useState("open"); // "open" | "archive"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .order("received_at", { ascending: false });
    const msgs = data ?? [];
    setMessages(msgs);

    const emails = [...new Set(msgs.map((m) => m.from_email).filter(Boolean))];
    if (emails.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, email, is_host, is_admin")
        .in("email", emails);
      const pMap = {};
      const userIds = [];
      (profiles ?? []).forEach((p) => { pMap[p.email] = p; userIds.push(p.id); });
      setProfileMap(pMap);

      if (userIds.length > 0) {
        const { data: cmProfiles } = await supabase
          .from("cm_profiles")
          .select("user_id, status, invite_code")
          .in("user_id", userIds);
        const cmMap = {};
        (cmProfiles ?? []).forEach((cp) => { cmMap[cp.user_id] = cp; });
        setCmProfileMap(cmMap);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const toggleThread = async (fromEmail, unreadMsgs) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      next.has(fromEmail) ? next.delete(fromEmail) : next.add(fromEmail);
      return next;
    });
    if (unreadMsgs.length > 0) {
      const ids = unreadMsgs.map((m) => m.id);
      await supabase.from("support_messages").update({ status: "read" }).in("id", ids);
      setMessages((prev) =>
        prev.map((m) => ids.includes(m.id) ? { ...m, status: "read" } : m)
      );
      onRead?.();
    }
  };

  const markResolved = async (id) => {
    await supabase.from("support_messages").update({ status: "resolved" }).eq("id", id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "resolved" } : m));
  };

  const sendReply = async (msg) => {
    if (!replySubject.trim()) { alert("Please enter a subject."); return; }
    if (!replyBody.trim()) { alert("Please enter a message."); return; }
    setBusy(msg.id);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          emailType: "support_reply",
          supportMessageId: msg.id,
          replyTo: msg.reply_to || msg.from_email,
          subject: replySubject,
          message: replyBody,
          repliedBy: currentUser?.fullName ||
            `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() ||
            currentUser?.email ||
            "Admin",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Failed: ${j.error ?? res.status}`);
      } else {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "replied" } : m));
        setReplyMode(null);
        setReplySubject("");
        setReplyBody("");
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
    setBusy(null);
  };

  const statusBadge = (status) => {
    const map = {
      unread: "support-badge-unread",
      read: "support-badge-read",
      replied: "support-badge-replied",
      resolved: "support-badge-resolved",
      autoreplied: "support-badge-autoreplied",
    };
    const labels = { autoreplied: "auto-replied" };
    return <span className={`support-status-badge ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
  };

  const fmtMsgDate = (iso) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));

  // Group messages into threads keyed by from_email, latest first within each thread
  const threads = (() => {
    const map = {};
    messages.forEach((msg) => {
      const key = msg.from_email || "unknown";
      if (!map[key]) map[key] = [];
      map[key].push(msg);
    });
    return Object.entries(map).map(([email, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
      const allClosed = sorted.every((m) => CLOSED_STATUSES.has(m.status));
      const hasUnread = sorted.some((m) => m.status === "unread");
      return {
        fromEmail: email,
        fromName: sorted[0].from_name || "",
        msgs: sorted,
        latestAt: sorted[0].received_at,
        allClosed,
        hasUnread,
        unreadCount: sorted.filter((m) => m.status === "unread").length,
      };
    }).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
  })();

  // Apply tab filter
  const tabThreads = threads.filter((t) =>
    supportTab === "open" ? !t.allClosed : t.allClosed
  );

  // Apply search + month filter
  const filteredThreads = tabThreads.filter((t) => {
    const q = searchQuery.toLowerCase();
    if (q) {
      const matchName = t.fromName.toLowerCase().includes(q);
      const matchEmail = t.fromEmail.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (filterMonth) {
      const monthMatch = t.msgs.some((m) => m.received_at?.startsWith(filterMonth));
      if (!monthMatch) return false;
    }
    return true;
  });

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  if (loading) return <p style={{ marginTop: 24 }}>Loading messages…</p>;

  return (
    <div className="support-panel">
      <p className="admin-subtitle">
        Messages from the in-app contact form and email.
        {unreadCount > 0 && <strong> {unreadCount} unread.</strong>}
      </p>

      <div className="support-inbox-controls">
        <div className="cm-admin-subtabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`admin-tab${supportTab === "open" ? " admin-tab-active" : ""}`}
            onClick={() => setSupportTab("open")}
          >
            Open
            {(() => { const open = threads.filter((t) => !t.allClosed); const unread = open.filter((t) => t.hasUnread).length; return <span className={`cm-admin-count${unread > 0 ? " cm-admin-count-alert" : ""}`}>{open.length}</span>; })()}
          </button>
          <button
            type="button"
            className={`admin-tab${supportTab === "archive" ? " admin-tab-active" : ""}`}
            onClick={() => setSupportTab("archive")}
          >
            Archived <span className="cm-admin-count">{threads.filter((t) => t.allClosed).length}</span>
          </button>
        </div>
        <div className="support-filters">
          <input
            type="text"
            className="support-search-input"
            placeholder="Search name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <input
            type="month"
            className="support-month-input"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          {(searchQuery || filterMonth) && (
            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={() => { setSearchQuery(""); setFilterMonth(""); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredThreads.length === 0 && (
        <p style={{ marginTop: 16 }}>
          {threads.length === 0 ? "No support messages yet." : "No threads match your filters."}
        </p>
      )}

      {filteredThreads.map((thread) => {
        const { fromEmail, fromName, msgs, hasUnread, unreadCount: threadUnread } = thread;
        const isExpanded = expandedEmails.has(fromEmail);
        const matchedProfile = profileMap[fromEmail] ?? null;
        const cmProfile = matchedProfile ? cmProfileMap[matchedProfile.id] ?? null : null;
        const latestMsg = msgs[0];

        return (
          <article key={fromEmail} className={`cm-admin-card${hasUnread ? " support-card-unread" : ""}`}>
            <button
              type="button"
              className="cm-admin-card-summary"
              onClick={() => toggleThread(fromEmail, msgs.filter((m) => m.status === "unread"))}
              aria-expanded={isExpanded}
            >
              <div className="cm-admin-card-summary-left">
                <strong>{fromName || fromEmail}</strong>
                {fromName && <span className="cm-admin-email">{fromEmail}</span>}
                <span className="support-subject">{latestMsg.subject}</span>
                {msgs.length > 1 && (
                  <span className="cm-admin-email">{msgs.length} messages</span>
                )}
              </div>
              <div className="cm-admin-card-summary-right">
                {threadUnread > 0 && (
                  <span className="cm-admin-count cm-admin-count-alert">{threadUnread} unread</span>
                )}
                <span className="cm-admin-email" style={{ whiteSpace: "nowrap" }}>
                  {fmtMsgDate(latestMsg.received_at)}
                </span>
                <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
              </div>
            </button>

            {isExpanded && (
              <div className="cm-admin-card-body">
                {matchedProfile ? (
                  <div className="support-account-match">
                    <span className="admin-dispute-label">Matched account</span>
                    <span className="support-account-name">
                      {matchedProfile.full_name ||
                        `${matchedProfile.first_name ?? ""} ${matchedProfile.last_name ?? ""}`.trim() || "—"}
                    </span>
                    <span className="cm-admin-email">{matchedProfile.email}</span>
                    <div className="support-account-tags">
                      {matchedProfile.is_host && (
                        <span className="cm-admin-badge cm-badge-accepted">Host</span>
                      )}
                      {matchedProfile.is_admin && (
                        <span className="cm-admin-badge cm-badge-interview">Admin</span>
                      )}
                      {cmProfile && (
                        <>
                          <span className={`cm-admin-badge ${
                            cmProfile.status === "active" ? "cm-badge-accepted" :
                            cmProfile.status === "paused" ? "cm-badge-pending" : "cm-badge-declined"
                          }`}>
                            CM · {cmProfile.status}
                          </span>
                          <a
                            href={`/admin?tab=cm&subtab=active&search=${encodeURIComponent(matchedProfile.full_name || `${matchedProfile.first_name ?? ""} ${matchedProfile.last_name ?? ""}`.trim() || matchedProfile.email)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="support-cm-link"
                          >
                            View CM card ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="support-account-match support-account-nomatch">
                    <span className="admin-dispute-label">Matched account</span>
                    <span className="cm-admin-email">No registered account found for {fromEmail}</span>
                  </div>
                )}

                <div className="support-thread">
                  {msgs.map((msg) => {
                    const isReplying = replyMode === msg.id;
                    return (
                      <div key={msg.id} className="support-thread-message">
                        <div className="support-thread-message-header">
                          {statusBadge(msg.status)}
                          <span className="cm-admin-email">{msg.subject}</span>
                          <span className="cm-admin-email" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                            {fmtMsgDate(msg.received_at)}
                          </span>
                        </div>
                        <div className="support-body">
                          {msg.body_text ? (
                            <pre className="support-body-text">{msg.body_text}</pre>
                          ) : msg.body_html ? (
                            <div className="support-body-html" dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                          ) : (
                            <p className="cm-admin-email">No body content captured for this message.</p>
                          )}
                        </div>
                        {(msg.admin_replies ?? []).map((r, i) => (
                          <div key={i} className="support-admin-reply">
                            <div className="support-admin-reply-header">
                              <span className="support-admin-reply-label">{r.replied_by || "Admin"}</span>
                              <span className="cm-admin-email" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                                {fmtMsgDate(r.sent_at)}
                              </span>
                            </div>
                            <p className="support-admin-reply-subject">{r.subject}</p>
                            <pre className="support-body-text">{r.body}</pre>
                          </div>
                        ))}
                        {isReplying ? (
                          <div className="cm-admin-notes-row" style={{ marginTop: 12 }}>
                            <p className="admin-dispute-label">Reply to {msg.reply_to || msg.from_email}</p>
                            <input
                              type="text"
                              className="cm-admin-email-subject"
                              placeholder="Subject…"
                              value={replySubject}
                              onChange={(e) => setReplySubject(e.target.value)}
                              autoFocus
                            />
                            <textarea
                              className="cm-admin-notes"
                              rows={5}
                              placeholder="Your reply…"
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <div className="support-reply-signature">
                              <span className="support-reply-sig-line">Sincerely,</span>
                              <span className="support-reply-sig-name">SharedXP Support</span>
                            </div>
                            <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => { setReplyMode(null); setReplySubject(""); setReplyBody(""); }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy === msg.id}
                                onClick={() => sendReply(msg)}
                              >
                                {busy === msg.id ? "Sending…" : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setReplyMode(msg.id);
                                setReplySubject(`Re: ${msg.subject}`);
                                setReplyBody("");
                              }}
                            >
                              Reply
                            </button>
                            {!CLOSED_STATUSES.has(msg.status) && (
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => markResolved(msg.id)}
                              >
                                Mark resolved
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

const fmtDate = (iso) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
          .format(new Date(iso)) : "—";

// ── Field Post Reports Panel ──────────────────────────────────────────────────
const FieldPostReportsPanel = ({ currentUser, onCountChange, onViewMember }) => {
  const [reports, setReports] = useState([]);
  const [reportTab, setReportTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [emailMode, setEmailMode] = useState(() => new Set());
  const [emailSubjects, setEmailSubjects] = useState({});
  const [emailMessages, setEmailMessages] = useState({});
  const [emailFeedback, setEmailFeedback] = useState({});
  const [postActionMode, setPostActionMode] = useState(null); // { reportId, postId, posterId, action, post }
  const [postNoteText, setPostNoteText] = useState("");

  const adminName = currentUser?.fullName ||
    `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() || "Admin";

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("field_post_reports")
      .select(`
        id, created_at, status, post_id, reporter_id,
        post:field_posts!post_id(
          id, poster_id, caption, sport, city, country, photos, host_name, role, suspended_at, admin_notes,
          poster:profiles!poster_id(full_name, first_name, last_name)
        ),
        reporter:profiles!reporter_id(full_name, first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });
    if (error) console.error("[reports] fetch error:", error);
    const rows = data ?? [];
    setReports(rows);
    setLoading(false);
    onCountChange?.(rows.filter((r) => r.status === "pending").length);
  }, [onCountChange]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEmail = (id) => setEmailMode((prev) => new Set([...prev, id]));
  const closeEmail = (id) => {
    setEmailMode((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setEmailSubjects((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setEmailMessages((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setEmailFeedback((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const sendReportEmail = async (reportId, posterId, recipientName) => {
    const subject = (emailSubjects[reportId] ?? "").trim();
    const message = (emailMessages[reportId] ?? "").trim();
    if (!subject) { setEmailFeedback((p) => ({ ...p, [reportId]: { type: "error", msg: "Please enter a subject." } })); return; }
    if (!message) { setEmailFeedback((p) => ({ ...p, [reportId]: { type: "error", msg: "Please enter a message." } })); return; }
    setActing(reportId);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ emailType: "cm_admin_message", userId: posterId, subject, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEmailFeedback((p) => ({ ...p, [reportId]: { type: "error", msg: `Failed: ${json.error ?? res.status}` } }));
      } else {
        setEmailFeedback((p) => ({ ...p, [reportId]: { type: "success", msg: "Sent" } }));
        setTimeout(() => closeEmail(reportId), 1500);
      }
    } catch (e) {
      setEmailFeedback((p) => ({ ...p, [reportId]: { type: "error", msg: `Error: ${e.message}` } }));
    }
    setActing(null);
  };

  const sendModerationEmail = async (posterId, action, post) => {
    if (!posterId) return;
    const isSuspend = action === "suspend";
    const location = [post?.city, post?.country].filter(Boolean).join(", ");
    const captionLine = post?.caption ? `\n\nPost: "${post.caption}"` : "";
    const subject = isSuspend
      ? "Your SharedXP post has been temporarily suspended"
      : "Your SharedXP post has been removed";
    const message = isSuspend
      ? `Your ${post?.sport ?? "field"} post${location ? ` in ${location}` : ""} has been flagged by another user and temporarily suspended pending review.${captionLine}\n\nIf you believe this is a mistake, please contact us — we'll look into it right away.`
      : `Your ${post?.sport ?? "field"} post${location ? ` in ${location}` : ""} has been flagged and removed after review.${captionLine}\n\nIf you believe this is a mistake, please contact us.`;
    try {
      await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ emailType: "cm_admin_message", userId: posterId, subject, message }),
      });
    } catch (e) {
      console.error("[reports] moderation email error:", e);
    }
  };

  const openPostAction = (reportId, postId, posterId, action, post) => {
    setPostActionMode({ reportId, postId, posterId, action, post });
    setPostNoteText("");
  };

  const confirmPostAction = async () => {
    if (!postActionMode) return;
    const { postId, posterId, action, post } = postActionMode;
    const note = postNoteText.trim() || `Post ${action}d`;
    setActing(postId);
    setPostActionMode(null);
    setPostNoteText("");
    if (action === "remove") {
      await sendModerationEmail(posterId, "remove", post);
      const { error } = await supabase.from("field_posts").delete().eq("id", postId);
      if (error) console.error("[reports] remove post error:", error);
    } else {
      const newNotes = appendNote(post?.admin_notes, action, note, adminName);
      const update = action === "suspend"
        ? { suspended_at: new Date().toISOString(), admin_notes: newNotes }
        : { suspended_at: null, admin_notes: newNotes };
      const { error } = await supabase.from("field_posts").update(update).eq("id", postId);
      if (!error && action === "suspend") await sendModerationEmail(posterId, "suspend", post);
      else if (error) console.error(`[reports] ${action} error:`, error);
    }
    await fetchReports();
    setActing(null);
  };

  const dismiss = async (reportId) => {
    setActing(reportId);
    const { error } = await supabase
      .from("field_post_reports")
      .update({ status: "dismissed" })
      .eq("id", reportId);
    if (error) console.error("[reports] dismiss error:", error);
    await fetchReports();
    setActing(null);
  };

  const getProfileName = (profile) => {
    if (!profile) return "Anonymous";
    return profile.full_name ||
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
      profile.email || "Unknown";
  };

  if (loading) return <p style={{ marginTop: 24 }}>Loading reports…</p>;

  const pendingCount   = reports.filter((r) => r.status === "pending").length;
  const dismissedCount = reports.filter((r) => r.status === "dismissed").length;
  const visibleReports = reports.filter((r) => r.status === reportTab);

  return (
    <div>
      <p className="admin-subtitle">Field posts flagged by users as inappropriate.</p>
      <div className="cm-admin-subtabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`admin-tab${reportTab === "pending" ? " admin-tab-active" : ""}`} onClick={() => setReportTab("pending")}>
          Pending <span className={`cm-admin-count${pendingCount > 0 ? " cm-admin-count-alert" : ""}`} style={{ marginLeft: 4 }}>{pendingCount}</span>
        </button>
        <button type="button" className={`admin-tab${reportTab === "dismissed" ? " admin-tab-active" : ""}`} onClick={() => setReportTab("dismissed")}>
          Dismissed <span className="cm-admin-count" style={{ marginLeft: 4 }}>{dismissedCount}</span>
        </button>
      </div>
      {visibleReports.length === 0 ? (
        <p>No {reportTab} reports.</p>
      ) : (
        <div className="admin-dispute-list">
          {visibleReports.map((r) => {
            const post = r.post;
            const isExpanded = expandedIds.has(r.id);
            const isEmailOpen = emailMode.has(r.id);
            const photo = Array.isArray(post?.photos) && post.photos.length > 0 ? post.photos[0] : null;
            const isHost = post?.role === "hosted";
            const isSuspended = !!post?.suspended_at;
            const sharerName = isHost ? (post?.host_name || "—") : getProfileName(post?.poster);
            const posterId = post?.poster_id;
            const isBusy = acting === r.id || acting === post?.id;
            const isPostActionOpen = postActionMode?.reportId === r.id;
            return (
              <article key={r.id} className="cm-admin-card">
                <button
                  type="button"
                  className="cm-admin-card-summary"
                  onClick={() => toggleExpanded(r.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="cm-admin-card-summary-top">
                    <strong>{post?.sport ?? "Unknown sport"}</strong>
                    <div className="cm-admin-card-summary-right">
                      <span className={`pending-status-badge ${isSuspended ? "status-pending" : r.status === "dismissed" ? "cm-status-approved" : "status-disputed"}`}>
                        {isSuspended ? "Suspended" : r.status === "dismissed" ? "Dismissed" : "Pending"}
                      </span>
                      <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
                    </div>
                  </div>
                  <span className="cm-admin-email">
                    Experience hosted by {post?.host_name || "—"}
                    {(post?.city || post?.country) ? ` / ${[post.city, post.country].filter(Boolean).join(", ")}` : ""}
                    {` on ${fmtDate(r.created_at)}`}
                  </span>
                </button>

                {isExpanded && (
                  <div className="cm-admin-card-body">
                    <div className="report-card-media">
                      {photo && (
                        <img
                          src={photo}
                          alt="Reported post"
                          className="report-card-photo"
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="admin-dispute-accounts">
                          <div>
                            <p className="admin-dispute-label">Caption</p>
                            <blockquote className="dispute-quote">{post?.caption || "—"}</blockquote>
                          </div>
                          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
                            <div>
                              <p className="admin-dispute-label">Post shared by</p>
                              <p>{sharerName}</p>
                            </div>
                            <div>
                              <p className="admin-dispute-label">Post reported by</p>
                              <p>{getProfileName(r.reporter)}</p>
                            </div>
                          </div>
                        </div>

                        {!isEmailOpen && !isPostActionOpen && (
                          <div className="admin-dispute-actions">
                            <button type="button" className="btn btn-light" onClick={() => openEmail(r.id)} disabled={isBusy}>
                              Email
                            </button>
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => openPostAction(r.id, post.id, posterId, isSuspended ? "unsuspend" : "suspend", post)}
                              disabled={isBusy}
                            >
                              {isBusy ? "…" : isSuspended ? "Unsuspend Post" : "Suspend Post"}
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => openPostAction(r.id, post.id, posterId, "remove", post)} disabled={isBusy}>
                              {isBusy ? "…" : "Remove Post"}
                            </button>
                            <button type="button" className="btn btn-light" onClick={() => onViewMember?.(sharerName)} disabled={isBusy}>
                              View Member
                            </button>
                            <button type="button" className="btn btn-light" onClick={() => dismiss(r.id)} disabled={isBusy}>
                              {isBusy ? "…" : "Dismiss"}
                            </button>
                          </div>
                        )}

                        {isEmailOpen && (
                          <div className="cm-admin-notes-row" style={{ marginTop: 12 }}>
                            <p className="admin-dispute-label">Email {sharerName}</p>
                            <input
                              type="text"
                              className="cm-admin-email-subject"
                              placeholder="Subject…"
                              value={emailSubjects[r.id] ?? ""}
                              onChange={(e) => setEmailSubjects((p) => ({ ...p, [r.id]: e.target.value }))}
                              autoFocus
                            />
                            <textarea
                              className="cm-admin-notes"
                              rows={4}
                              placeholder="Message…"
                              value={emailMessages[r.id] ?? ""}
                              onChange={(e) => setEmailMessages((p) => ({ ...p, [r.id]: e.target.value }))}
                            />
                            {emailFeedback[r.id] && (
                              <p style={{ margin: "6px 0 0", fontSize: 13, color: emailFeedback[r.id].type === "error" ? "#ef4444" : "#2e7d32" }}>
                                {emailFeedback[r.id].msg}
                              </p>
                            )}
                            <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                              <button type="button" className="btn btn-light" onClick={() => closeEmail(r.id)}>Cancel</button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isBusy || emailFeedback[r.id]?.type === "success"}
                                onClick={() => sendReportEmail(r.id, posterId, sharerName)}
                              >
                                {emailFeedback[r.id]?.type === "success" ? "Sent" : isBusy ? "Sending…" : "Send Email"}
                              </button>
                            </div>
                          </div>
                        )}

                        {isPostActionOpen && (
                          <div className="cm-admin-notes-row" style={{ marginTop: 12 }}>
                            <p className="admin-dispute-label">
                              {postActionMode.action === "remove" ? "Remove post" : postActionMode.action === "suspend" ? "Suspend post" : "Unsuspend post"} — note (optional)
                            </p>
                            <textarea
                              className="cm-admin-notes"
                              rows={3}
                              placeholder="Reason or note…"
                              value={postNoteText}
                              onChange={(e) => setPostNoteText(e.target.value)}
                              autoFocus
                            />
                            <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                              <button type="button" className="btn btn-light" onClick={() => setPostActionMode(null)}>Cancel</button>
                              <button
                                type="button"
                                className={`btn ${postActionMode.action === "remove" ? "btn-danger" : "btn-primary"}`}
                                onClick={confirmPostAction}
                                disabled={!!acting}
                              >
                                {acting ? "…" : "Confirm"}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Experiences Panel ─────────────────────────────────────────────────────────
const ExperiencesPanel = ({ currentUser, onCountChange }) => {
  const [subTab, setSubTab] = useState("to-approve");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("booking_requests")
      .select(`
        id, status, sport, requested_date, requested_time, price, currency,
        refund_pct, cancellation_policy, created_at, updated_at,
        requester:profiles!requester_id(full_name, first_name, last_name, email),
        host:profiles!host_id(full_name, first_name, last_name, email),
        invoice:invoices(id, gross_amount, platform_commission, tax, net_amount, currency, approved_at, released_at, xp_earned)
      `)
      .order("updated_at", { ascending: false });
    setBookings(data ?? []);
    setLoading(false);
    onCountChange?.();
  }, [onCountChange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (p) =>
    p ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—" : "—";

  const fmtAmt = (amount, currency) =>
    `${currency ?? "EUR"} ${Number(amount ?? 0).toFixed(2)}`;

  const ACTIVE_STATUSES = ["pending", "accepted", "payment_pending", "in_progress"];

  const toApprove = bookings.filter((br) => {
    if (br.status !== "completed") return false;
    const inv = br.invoice?.[0];
    return inv && !inv.approved_at;
  });

  const active = bookings.filter((br) => ACTIVE_STATUSES.includes(br.status));
  const cancelled = bookings.filter((br) => ["cancelled", "declined"].includes(br.status));
  const approvedPending = bookings.filter((br) => {
    if (br.status !== "completed") return false;
    const inv = br.invoice?.[0];
    return inv && !!inv.approved_at && !inv.released_at;
  });

  const matchesSearch = (br, q) => {
    if (!q.trim()) return true;
    const lq = q.toLowerCase();
    return [
      getName(br.requester), br.requester?.email ?? "",
      getName(br.host), br.host?.email ?? "",
      br.sport ?? "", br.status ?? "",
      fmtDate(br.requested_date),
    ].some((f) => f.toLowerCase().includes(lq));
  };

  const STATUS_DISPLAY = {
    pending: { label: "Pending", cls: "pending" },
    accepted: { label: "Accepted", cls: "accepted" },
    payment_pending: { label: "Payment pending", cls: "payment-pending" },
    in_progress: { label: "In progress", cls: "in-progress" },
    completed: { label: "Completed", cls: "completed" },
    cancelled: { label: "Cancelled", cls: "cancelled" },
    declined: { label: "Declined", cls: "declined" },
  };

  const approveExperience = async (br) => {
    const inv = br.invoice?.[0];
    if (!inv || approving === br.id) return;
    setApproving(br.id);
    await supabase
      .from("invoices")
      .update({ approved_at: new Date().toISOString() })
      .eq("id", inv.id)
      .is("approved_at", null);
    await fetchAll();
    setApproving(null);
  };

  const renderBookingCard = (br, showApprove = false) => {
    const inv = br.invoice?.[0];
    const isExpanded = expandedId === br.id;
    const guestName = getName(br.requester);
    const hostName = getName(br.host);
    const sd = STATUS_DISPLAY[br.status] ?? { label: br.status, cls: "pending" };
    const isApproved = !!inv?.approved_at;
    const isReleased = !!inv?.released_at;

    return (
      <article key={br.id} className="admin-dispute-card">
        <button
          type="button"
          className="admin-dispute-summary-row"
          onClick={() => setExpandedId(isExpanded ? null : br.id)}
        >
          <span className="admin-dispute-summary-main">
            <span className="admin-dispute-sport">{br.sport ?? "—"}</span>
            <span className="admin-dispute-summary-sep">·</span>
            <span>{hostName}</span>
            <span className="admin-dispute-summary-sep">·</span>
            <span>{fmtDate(br.requested_date)}</span>
          </span>
          <span className="admin-dispute-summary-right">
            {inv && <span className="accounting-amount-badge">{fmtAmt(inv.gross_amount, inv.currency)}</span>}
            <span className={`pending-status-badge status-${sd.cls}`}>{sd.label}</span>
            {showApprove && isApproved && <span className="pending-status-badge status-completed">Approved</span>}
            <span className="admin-dispute-chevron">{isExpanded ? "▲" : "▼"}</span>
          </span>
        </button>

        {isExpanded && (
          <div className="admin-dispute-body">
            <div className="admin-dispute-parties">
              <div>
                <p className="admin-dispute-label">Guest</p>
                <p style={{ margin: 0 }}>{guestName}</p>
                <p style={{ margin: 0 }} className="admin-dispute-email">{br.requester?.email ?? ""}</p>
              </div>
              <div>
                <p className="admin-dispute-label">Host</p>
                <p style={{ margin: 0 }}>{hostName}</p>
                <p style={{ margin: 0 }} className="admin-dispute-email">{br.host?.email ?? ""}</p>
              </div>
              <div>
                <p className="admin-dispute-label">Session date</p>
                <p>{fmtDate(br.requested_date)}{br.requested_time ? ` · ${br.requested_time}` : ""}</p>
              </div>
              {br.status === "cancelled" && Number(br.refund_pct ?? 0) > 0 && (
                <div>
                  <p className="admin-dispute-label">Refund</p>
                  <p>{Number(br.refund_pct).toFixed(0)}% of {fmtAmt(br.price, br.currency)}</p>
                </div>
              )}
            </div>

            {inv && (
              <div className="accounting-breakdown">
                <div className="accounting-breakdown-row">
                  <span>Gross (guest paid)</span>
                  <strong>{fmtAmt(inv.gross_amount, inv.currency)}</strong>
                </div>
                <div className="accounting-breakdown-row accounting-breakdown-deduction">
                  <span>Platform commission (15%)</span>
                  <span>− {fmtAmt(inv.platform_commission, inv.currency)}</span>
                </div>
                <div className="accounting-breakdown-row accounting-breakdown-deduction">
                  <span>Tax (5%)</span>
                  <span>− {fmtAmt(inv.tax, inv.currency)}</span>
                </div>
                <div className="accounting-breakdown-row accounting-breakdown-net">
                  <span>Net to host</span>
                  <strong>{fmtAmt(inv.net_amount, inv.currency)}</strong>
                </div>
              </div>
            )}

            {showApprove && inv && !isApproved && (
              <div className="admin-dispute-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={approving === br.id}
                  onClick={() => approveExperience(br)}
                >
                  {approving === br.id ? "Approving…" : "Approve — send to accounting"}
                </button>
              </div>
            )}
            {showApprove && isApproved && (
              <div className="accounting-status-trail">
                <p className="accounting-released-info">
                  Approved {fmtDateTime(inv.approved_at)} — sent to accounting
                  {isReleased && ` · Released ${fmtDateTime(inv.released_at)}`}
                </p>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderTable = (rows) => (
    <div className="members-table-wrapper">
      <table className="members-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Host</th>
            <th>Sport</th>
            <th>Session date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((br) => {
            const sd = STATUS_DISPLAY[br.status] ?? { label: br.status, cls: "pending" };
            return (
              <tr key={br.id} className="members-row">
                <td>
                  <p style={{ fontWeight: 500, margin: 0 }}>{getName(br.requester)}</p>
                  <p style={{ margin: 0 }} className="admin-dispute-email">{br.requester?.email ?? ""}</p>
                </td>
                <td>
                  <p style={{ margin: 0 }}>{getName(br.host)}</p>
                  <p style={{ margin: 0 }} className="admin-dispute-email">{br.host?.email ?? ""}</p>
                </td>
                <td>{br.sport ?? "—"}</td>
                <td>{fmtDate(br.requested_date)}</td>
                <td>{fmtAmt(br.price, br.currency)}</td>
                <td><span className={`pending-status-badge status-${sd.cls}`}>{sd.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <p className="admin-subtitle">Review all experiences and approve completed ones for accounting to release payment.</p>

      <div className="cm-admin-subtabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`admin-tab${subTab === "to-approve" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("to-approve")}>
          To Approve
          {!loading && toApprove.length > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{toApprove.length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "approved" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("approved")}>
          Approved
          {!loading && approvedPending.length > 0 && (
            <span className="cm-admin-count" style={{ marginLeft: 4 }}>{approvedPending.length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "active" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("active")}>
          Active
          {!loading && active.length > 0 && (
            <span className="cm-admin-count" style={{ marginLeft: 4 }}>{active.length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "cancelled" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("cancelled")}>
          Cancelled
          {!loading && cancelled.length > 0 && (
            <span className="cm-admin-count" style={{ marginLeft: 4 }}>{cancelled.length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "all" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("all")}>
          All
          {!loading && <span className="cm-admin-count" style={{ marginLeft: 4 }}>{bookings.length}</span>}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {/* ── To Approve ───────────────────────────────────────────────── */}
          {subTab === "to-approve" && (
            toApprove.length === 0
              ? <p>No completed experiences awaiting approval.</p>
              : <div className="admin-dispute-list">{toApprove.map((br) => renderBookingCard(br, true))}</div>
          )}

          {/* ── Approved — waiting on accounting ─────────────────────────── */}
          {subTab === "approved" && (
            approvedPending.length === 0
              ? <p>No approved experiences waiting on accounting.</p>
              : <div className="admin-dispute-list">{approvedPending.map((br) => renderBookingCard(br, false))}</div>
          )}

          {/* ── Active ───────────────────────────────────────────────────── */}
          {subTab === "active" && (
            active.length === 0
              ? <p>No active bookings.</p>
              : renderTable(active)
          )}

          {/* ── Cancelled ────────────────────────────────────────────────── */}
          {subTab === "cancelled" && (
            cancelled.length === 0
              ? <p>No cancelled or declined bookings.</p>
              : renderTable(cancelled)
          )}

          {/* ── All ──────────────────────────────────────────────────────── */}
          {subTab === "all" && (() => {
            const filtered = bookings.filter((br) => matchesSearch(br, search));
            return (
              <>
                <div className="accounting-search-bar" style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    className="support-search-input"
                    placeholder="Search by name, sport, status, date…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  {search && (
                    <button type="button" className="btn btn-light btn-sm" onClick={() => setSearch("")}>Clear</button>
                  )}
                </div>
                {filtered.length === 0
                  ? <p>No bookings match "{search}".</p>
                  : <>
                      <p className="admin-dispute-label" style={{ marginBottom: 8 }}>{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</p>
                      {renderTable(filtered)}
                    </>
                }
              </>
            );
          })()}
        </>
      )}
    </div>
  );
};

// ── Accounting Panel ──────────────────────────────────────────────────────────
const AccountingPanel = ({ currentUser, onCountChange }) => {
  const [subTab, setSubTab] = useState("pending");
  const [commTab, setCommTab] = useState("pending");
  const [invoices, setInvoices] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [markingRefund, setMarkingRefund] = useState(null);
  const [releasedSearch, setReleasedSearch] = useState("");
  const [releasedSort, setReleasedSort] = useState("date-desc");
  const [approvingComm, setApprovingComm] = useState(null);
  const [payingComm, setPayingComm] = useState(null);
  const [confirmPayComm, setConfirmPayComm] = useState(null);

  const adminName = currentUser?.fullName ||
    `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() ||
    "Admin";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [invRes, refundRes, commRes] = await Promise.all([
      supabase
        .from("invoices")
        .select(`
          id, gross_amount, platform_commission, tax, net_amount, currency,
          paid_at, approved_at, released_at, xp_earned, created_at,
          booking_request:booking_requests(
            id, sport, requested_date, status,
            requester:profiles!requester_id(full_name, first_name, last_name, email),
            host:profiles!host_id(full_name, first_name, last_name, email)
          )
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("booking_requests")
        .select(`
          id, sport, requested_date, price, currency, refund_pct, updated_at, refund_sent_at,
          requester:profiles!requester_id(full_name, first_name, last_name, email),
          host:profiles!host_id(full_name, first_name, last_name, email)
        `)
        .eq("status", "cancelled")
        .gt("refund_pct", 0)
        .order("updated_at", { ascending: false }),
      supabase
        .from("cm_commissions")
        .select(`
          id, commission_amount, currency, status, approved_at, paid_at, created_at,
          cm:cm_profiles(
            id, user_id, payment_info,
            owner:profiles!user_id(full_name, first_name, last_name, email)
          ),
          booking:booking_requests(
            sport, requested_date,
            requester:profiles!requester_id(full_name, first_name, last_name)
          )
        `)
        .order("created_at", { ascending: false }),
    ]);
    setInvoices(invRes.data ?? []);
    setRefunds(refundRes.data ?? []);
    setCommissions(commRes.data ?? []);
    setLoading(false);
    onCountChange?.();
  }, [onCountChange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (p) =>
    p ? p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—" : "—";

  const fmtAmt = (amount, currency) =>
    `${currency ?? "EUR"} ${Number(amount ?? 0).toFixed(2)}`;

  const invRef = (inv) => `#${inv.id.slice(0, 8).toUpperCase()}`;

  const matchesInvoiceSearch = (inv, query) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const br = inv.booking_request;
    return [
      getName(br?.requester),
      br?.requester?.email ?? "",
      getName(br?.host),
      br?.host?.email ?? "",
      br?.sport ?? "",
      inv.id.slice(0, 8),
      fmtDate(br?.requested_date),
      fmtDate(inv.released_at),
      fmtDate(inv.approved_at),
      Number(inv.gross_amount ?? 0).toFixed(2),
      inv.currency ?? "",
    ].some((f) => f.toLowerCase().includes(q));
  };

  const sortInvoices = (list, sort) => {
    const copy = [...list];
    if (sort === "date-asc") return copy.sort((a, b) => new Date(a.released_at ?? a.created_at) - new Date(b.released_at ?? b.created_at));
    if (sort === "date-desc") return copy.sort((a, b) => new Date(b.released_at ?? b.created_at) - new Date(a.released_at ?? a.created_at));
    if (sort === "amount-desc") return copy.sort((a, b) => Number(b.gross_amount) - Number(a.gross_amount));
    if (sort === "amount-asc") return copy.sort((a, b) => Number(a.gross_amount) - Number(b.gross_amount));
    return copy;
  };

  const awaitingRelease = invoices.filter((inv) => !!inv.approved_at && !inv.released_at);
  const releasedInvoices = invoices.filter((inv) => !!inv.released_at);
  const pendingComms = commissions.filter((c) => c.status === "pending");
  const approvedComms = commissions.filter((c) => c.status === "approved");
  const paidComms = commissions.filter((c) => c.status === "paid");

  const releaseInvoice = async (inv) => {
    if (releasing === inv.id) return;
    setReleasing(inv.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("invoices")
      .update({ released_at: now })
      .eq("id", inv.id)
      .is("released_at", null);
    if (!error && inv.booking_request?.id) {
      await sendNotification("experience_confirmed_to_host", inv.booking_request.id);
    }
    await fetchAll();
    setReleasing(null);
  };

  const markRefundSent = async (br) => {
    if (markingRefund === br.id) return;
    setMarkingRefund(br.id);
    await supabase
      .from("booking_requests")
      .update({ refund_sent_at: new Date().toISOString() })
      .eq("id", br.id);
    await fetchAll();
    setMarkingRefund(null);
  };

  const approveCommission = async (comm) => {
    if (approvingComm === comm.id) return;
    setApprovingComm(comm.id);
    await supabase
      .from("cm_commissions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", comm.id);
    await fetchAll();
    setApprovingComm(null);
  };

  const markCommissionPaid = async (comm) => {
    if (payingComm === comm.id) return;
    setPayingComm(comm.id);
    await supabase
      .from("cm_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", comm.id);
    await fetchAll();
    setPayingComm(null);
    setConfirmPayComm(null);
  };

  const renderInvoiceCard = (inv) => {
    const br = inv.booking_request;
    const isExpanded = expandedId === inv.id;
    const isApproved = !!inv.approved_at;
    const isReleased = !!inv.released_at;
    const guestName = getName(br?.requester);
    const hostName = getName(br?.host);

    const statusBadge = isReleased
      ? <span className="pending-status-badge status-completed">Released</span>
      : <span className="pending-status-badge status-accepted">Approved</span>;

    return (
      <article key={inv.id} className={`admin-dispute-card${isReleased ? " resolved" : ""}`}>
        <button
          type="button"
          className="admin-dispute-summary-row"
          onClick={() => setExpandedId(isExpanded ? null : inv.id)}
        >
          <span className="admin-dispute-summary-main">
            <span className="accounting-inv-ref">{invRef(inv)}</span>
            <span className="admin-dispute-summary-sep">·</span>
            <span className="admin-dispute-sport">{br?.sport ?? "—"}</span>
            <span className="admin-dispute-summary-sep">·</span>
            <span>{hostName}</span>
            <span className="admin-dispute-summary-sep">·</span>
            <span>{fmtDate(br?.requested_date)}</span>
          </span>
          <span className="admin-dispute-summary-right">
            <span className="accounting-amount-badge">{fmtAmt(inv.gross_amount, inv.currency)}</span>
            {statusBadge}
            <span className="admin-dispute-chevron">{isExpanded ? "▲" : "▼"}</span>
          </span>
        </button>

        {isExpanded && (
          <div className="admin-dispute-body">
            <div className="admin-dispute-parties">
              <div>
                <p className="admin-dispute-label">Invoice</p>
                <p className="accounting-inv-ref-large">{invRef(inv)}</p>
                <p className="admin-dispute-email">Created {fmtDate(inv.created_at)}</p>
              </div>
              <div>
                <p className="admin-dispute-label">Guest</p>
                <p>{guestName}</p>
                <p className="admin-dispute-email">{br?.requester?.email ?? ""}</p>
              </div>
              <div>
                <p className="admin-dispute-label">Host</p>
                <p>{hostName}</p>
                <p className="admin-dispute-email">{br?.host?.email ?? ""}</p>
              </div>
              <div>
                <p className="admin-dispute-label">Session date</p>
                <p>{fmtDate(br?.requested_date)}</p>
              </div>
            </div>

            <div className="accounting-breakdown">
              <div className="accounting-breakdown-row">
                <span>Gross (guest paid)</span>
                <strong>{fmtAmt(inv.gross_amount, inv.currency)}</strong>
              </div>
              <div className="accounting-breakdown-row accounting-breakdown-deduction">
                <span>Platform commission (15%)</span>
                <span>− {fmtAmt(inv.platform_commission, inv.currency)}</span>
              </div>
              <div className="accounting-breakdown-row accounting-breakdown-deduction">
                <span>Tax (5%)</span>
                <span>− {fmtAmt(inv.tax, inv.currency)}</span>
              </div>
              <div className="accounting-breakdown-row accounting-breakdown-net">
                <span>Net to host</span>
                <strong>{fmtAmt(inv.net_amount, inv.currency)}</strong>
              </div>
              {inv.xp_earned != null && (
                <div className="accounting-breakdown-row">
                  <span>XP earned</span>
                  <span>{inv.xp_earned} XP</span>
                </div>
              )}
            </div>

            {isReleased && (
              <div className="accounting-status-trail">
                <p className="accounting-released-info">Approved {fmtDateTime(inv.approved_at)}</p>
                <p className="accounting-released-info">Released {fmtDateTime(inv.released_at)}</p>
              </div>
            )}
            {!isReleased && (
              <div className="accounting-approved-bar">
                <p className="accounting-released-info">Approved by admin on {fmtDateTime(inv.approved_at)}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={releasing === inv.id}
                  onClick={() => releaseInvoice(inv)}
                >
                  {releasing === inv.id ? "Releasing…" : "Release Payment to Host"}
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderCommissionRow = (comm, tabType) => {
    const cmOwner = comm.cm?.owner;
    const cmName = getName(cmOwner);
    const br = comm.booking;
    const isBusy = approvingComm === comm.id || payingComm === comm.id;
    return (
      <tr key={comm.id} className="members-row">
        <td>
          <p style={{ fontWeight: 500 }}>{cmName}</p>
          <p className="admin-dispute-email">{cmOwner?.email ?? ""}</p>
        </td>
        <td>
          <p>{br?.sport ?? "—"}</p>
          <p className="admin-dispute-email">{fmtDate(br?.requested_date)}</p>
        </td>
        <td><strong>{fmtAmt(comm.commission_amount, comm.currency)}</strong></td>
        <td>
          {tabType === "pending" && (
            <p className="admin-dispute-email">{fmtDateTime(comm.created_at)}</p>
          )}
          {tabType === "approved" && (
            <>
              <p className="admin-dispute-email">Approved {fmtDateTime(comm.approved_at)}</p>
              {comm.cm?.payment_info
                ? <p className="admin-dispute-email" style={{ color: "#047857" }}>Pay to: {comm.cm.payment_info}</p>
                : <p className="admin-dispute-email" style={{ color: "#dc2626" }}>No payment details</p>
              }
            </>
          )}
          {tabType === "paid" && (
            <p className="admin-dispute-email">Paid {fmtDateTime(comm.paid_at)}</p>
          )}
        </td>
        <td>
          {tabType === "pending" && (
            <button
              type="button"
              className="btn btn-light btn-sm"
              disabled={isBusy}
              onClick={() => approveCommission(comm)}
            >
              {approvingComm === comm.id ? "…" : "Approve"}
            </button>
          )}
          {tabType === "approved" && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isBusy}
              onClick={() => setConfirmPayComm(comm)}
            >
              {payingComm === comm.id ? "…" : "Mark Paid"}
            </button>
          )}
          {tabType === "paid" && (
            <span className="pending-status-badge status-completed">Paid</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <p className="admin-subtitle">Manage invoice releases, refunds, and CM commission payouts.</p>

      {/* Sub-tabs */}
      <div className="cm-admin-subtabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`admin-tab${subTab === "pending" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("pending")}>
          Invoices
          {!loading && awaitingRelease.length > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{awaitingRelease.length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "released" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("released")}>
          Released
          {!loading && <span className="cm-admin-count" style={{ marginLeft: 4 }}>{releasedInvoices.length}</span>}
        </button>
        <button type="button" className={`admin-tab${subTab === "refunds" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("refunds")}>
          Refunds Due
          {!loading && refunds.filter((r) => !r.refund_sent_at).length > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{refunds.filter((r) => !r.refund_sent_at).length}</span>
          )}
        </button>
        <button type="button" className={`admin-tab${subTab === "commissions" ? " admin-tab-active" : ""}`} onClick={() => setSubTab("commissions")}>
          CM Commissions
          {!loading && (pendingComms.length + approvedComms.length) > 0 && (
            <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{pendingComms.length + approvedComms.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {/* ── Invoices — approved by admin, ready to release ───────────── */}
          {subTab === "pending" && (
            awaitingRelease.length === 0
              ? <p>No approved invoices awaiting release. Experiences are approved in the Experiences tab.</p>
              : <>
                  <p className="admin-dispute-label" style={{ marginBottom: 8 }}>
                    Approved by admin — ready to release — {awaitingRelease.length} invoice{awaitingRelease.length !== 1 ? "s" : ""}
                  </p>
                  <div className="admin-dispute-list">
                    {awaitingRelease.map((inv) => renderInvoiceCard(inv))}
                  </div>
                </>
          )}

          {/* ── Released (searchable history) ────────────────────────────── */}
          {subTab === "released" && (() => {
            const filtered = sortInvoices(
              releasedInvoices.filter((inv) => matchesInvoiceSearch(inv, releasedSearch)),
              releasedSort,
            );
            const totalGross = filtered.reduce((s, inv) => s + Number(inv.gross_amount ?? 0), 0);
            const totalNet = filtered.reduce((s, inv) => s + Number(inv.net_amount ?? 0), 0);
            const currency = filtered[0]?.currency ?? "EUR";
            return (
              <>
                <div className="accounting-search-bar">
                  <input
                    type="text"
                    className="support-search-input"
                    placeholder="Search by name, sport, invoice ID, date, amount…"
                    value={releasedSearch}
                    onChange={(e) => setReleasedSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  <select
                    className="support-search-input"
                    value={releasedSort}
                    onChange={(e) => setReleasedSort(e.target.value)}
                    style={{ width: "auto" }}
                  >
                    <option value="date-desc">Newest first</option>
                    <option value="date-asc">Oldest first</option>
                    <option value="amount-desc">Highest amount</option>
                    <option value="amount-asc">Lowest amount</option>
                  </select>
                  {releasedSearch && (
                    <button type="button" className="btn btn-light btn-sm" onClick={() => setReleasedSearch("")}>
                      Clear
                    </button>
                  )}
                </div>

                {releasedInvoices.length === 0 ? (
                  <p>No released invoices yet.</p>
                ) : filtered.length === 0 ? (
                  <p>No invoices match "{releasedSearch}".</p>
                ) : (
                  <>
                    <div className="accounting-results-summary">
                      <span>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}{releasedSearch ? " matching" : ""}</span>
                      <span className="accounting-results-totals">
                        Gross: <strong>{fmtAmt(totalGross, currency)}</strong>
                        <span className="admin-dispute-summary-sep">·</span>
                        Net to hosts: <strong>{fmtAmt(totalNet, currency)}</strong>
                      </span>
                    </div>
                    <div className="admin-dispute-list">
                      {filtered.map((inv) => renderInvoiceCard(inv))}
                    </div>
                  </>
                )}
              </>
            );
          })()}

          {/* ── Refunds Due ──────────────────────────────────────────────── */}
          {subTab === "refunds" && (() => {
            const pendingRefunds = refunds.filter((br) => !br.refund_sent_at);
            const sentRefunds = refunds.filter((br) => !!br.refund_sent_at);
            const renderRefundTable = (rows, showAction) => (
              rows.length === 0 ? null : (
                <div className="members-table-wrapper">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Sport</th>
                        <th>Session date</th>
                        <th>Cancelled on</th>
                        <th>Gross paid</th>
                        <th>Refund %</th>
                        <th>Refund amount</th>
                        {showAction && <th>Action</th>}
                        {!showAction && <th>Sent on</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((br) => {
                        const refundAmt = (Number(br.price ?? 0) * Number(br.refund_pct ?? 0)) / 100;
                        return (
                          <tr key={br.id} className="members-row">
                            <td>
                              <p style={{ fontWeight: 500, margin: 0 }}>{getName(br.requester)}</p>
                              <p style={{ margin: 0 }} className="admin-dispute-email">{br.requester?.email ?? ""}</p>
                            </td>
                            <td>{br.sport ?? "—"}</td>
                            <td>{fmtDate(br.requested_date)}</td>
                            <td>{fmtDate(br.updated_at)}</td>
                            <td>{fmtAmt(br.price, br.currency)}</td>
                            <td>{Number(br.refund_pct ?? 0).toFixed(0)}%</td>
                            <td><strong>{fmtAmt(refundAmt, br.currency)}</strong></td>
                            {showAction ? (
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={markingRefund === br.id}
                                  onClick={() => markRefundSent(br)}
                                >
                                  {markingRefund === br.id ? "…" : "Mark Sent"}
                                </button>
                              </td>
                            ) : (
                              <td>
                                <span className="pending-status-badge status-completed">{fmtDate(br.refund_sent_at)}</span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            );
            return (
              <>
                {refunds.length === 0 ? (
                  <p>No cancelled bookings with refunds due.</p>
                ) : (
                  <>
                    {pendingRefunds.length > 0 && (
                      <>
                        <p className="admin-dispute-label" style={{ marginBottom: 8 }}>
                          Awaiting refund — {pendingRefunds.length} booking{pendingRefunds.length !== 1 ? "s" : ""}
                        </p>
                        {renderRefundTable(pendingRefunds, true)}
                      </>
                    )}
                    {sentRefunds.length > 0 && (
                      <>
                        <p className="admin-dispute-label" style={{ marginTop: pendingRefunds.length > 0 ? 24 : 0, marginBottom: 8 }}>
                          Refunds sent — {sentRefunds.length} booking{sentRefunds.length !== 1 ? "s" : ""}
                        </p>
                        {renderRefundTable(sentRefunds, false)}
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}

          {/* ── CM Commissions ───────────────────────────────────────────── */}
          {subTab === "commissions" && (
            <>
              <div className="cm-admin-subtabs" style={{ marginBottom: 16 }}>
                <button type="button" className={`admin-tab${commTab === "pending" ? " admin-tab-active" : ""}`} onClick={() => setCommTab("pending")}>
                  Pending
                  {pendingComms.length > 0 && <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{pendingComms.length}</span>}
                </button>
                <button type="button" className={`admin-tab${commTab === "approved" ? " admin-tab-active" : ""}`} onClick={() => setCommTab("approved")}>
                  Approved
                  {approvedComms.length > 0 && <span className="cm-admin-count cm-admin-count-alert" style={{ marginLeft: 4 }}>{approvedComms.length}</span>}
                </button>
                <button type="button" className={`admin-tab${commTab === "paid" ? " admin-tab-active" : ""}`} onClick={() => setCommTab("paid")}>
                  Paid
                  {paidComms.length > 0 && <span className="cm-admin-count" style={{ marginLeft: 4 }}>{paidComms.length}</span>}
                </button>
              </div>

              {commTab === "pending" && (
                pendingComms.length === 0 ? <p>No pending commissions.</p> : (
                  <div className="members-table-wrapper">
                    <table className="members-table">
                      <thead><tr><th>CM</th><th>Booking</th><th>Amount</th><th>Created</th><th>Action</th></tr></thead>
                      <tbody>{pendingComms.map((c) => renderCommissionRow(c, "pending"))}</tbody>
                    </table>
                  </div>
                )
              )}
              {commTab === "approved" && (
                approvedComms.length === 0 ? <p>No approved commissions awaiting payment.</p> : (
                  <div className="members-table-wrapper">
                    <table className="members-table">
                      <thead><tr><th>CM</th><th>Booking</th><th>Amount</th><th>Details</th><th>Action</th></tr></thead>
                      <tbody>{approvedComms.map((c) => renderCommissionRow(c, "approved"))}</tbody>
                    </table>
                  </div>
                )
              )}
              {commTab === "paid" && (
                paidComms.length === 0 ? <p>No paid commissions yet.</p> : (
                  <div className="members-table-wrapper">
                    <table className="members-table">
                      <thead><tr><th>CM</th><th>Booking</th><th>Amount</th><th>Paid on</th><th>Status</th></tr></thead>
                      <tbody>{paidComms.map((c) => renderCommissionRow(c, "paid"))}</tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </>
      )}

      {/* Mark Paid confirmation modal */}
      {confirmPayComm && (
        <div className="admin-dispute-resolve-panel" style={{ marginTop: 16 }}>
          <p className="admin-dispute-label">
            Confirm payment of <strong>{fmtAmt(confirmPayComm.commission_amount, confirmPayComm.currency)}</strong> to <strong>{getName(confirmPayComm.cm?.owner)}</strong>?
          </p>
          {confirmPayComm.cm?.payment_info && (
            <p style={{ fontSize: 13, color: "#047857", marginBottom: 8 }}>Pay to: {confirmPayComm.cm.payment_info}</p>
          )}
          <div className="admin-dispute-actions">
            <button type="button" className="btn btn-light" onClick={() => setConfirmPayComm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={payingComm === confirmPayComm.id} onClick={() => markCommissionPaid(confirmPayComm)}>
              {payingComm === confirmPayComm.id ? "…" : "Confirm Paid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Members Panel ─────────────────────────────────────────────────────────────
const MembersPanel = ({ currentUser, initialSearch = "" }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [actionMode, setActionMode] = useState(null); // { memberId, action }
  const [noteText, setNoteText] = useState("");
  const [blockMessage, setBlockMessage] = useState(null); // { memberId, message } | null
  const [acting, setActing] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(new Set());
  const toggleHistory = (id) => setHistoryOpen((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const adminName = currentUser?.fullName ||
    `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() || "Admin";

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const [profilesRes, cmRes, referralsRes] = await Promise.all([
      supabase.from("profiles").select("id, email, first_name, last_name, full_name, city, country, is_host, is_admin, signed_up_at, suspended_at, closed_at, admin_notes"),
      supabase.from("cm_profiles").select("id, user_id, status"),
      supabase.from("cm_referrals").select("referred_user_id, cm_id"),
    ]);
    const allProfiles  = profilesRes.data ?? [];
    const cmProfiles   = cmRes.data ?? [];
    const referrals    = referralsRes.data ?? [];
    const cmSet        = new Set(cmProfiles.map((c) => c.user_id));
    const profileById  = new Map(allProfiles.map((p) => [p.id, p]));
    const cmById       = new Map(cmProfiles.map((c) => [c.id, c]));
    const referralMap  = new Map(referrals.map((r) => {
      const owner = profileById.get(cmById.get(r.cm_id)?.user_id);
      const name  = owner ? (owner.full_name || `${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim()) || null : null;
      return [r.referred_user_id, name];
    }));
    const rows = allProfiles.map((p) => ({
      ...p,
      isCm:       cmSet.has(p.id),
      name:       p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "—",
      referredBy: referralMap.get(p.id) ?? null,
    }));
    setMembers(rows);
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const openAction = async (memberId, action) => {
    if (action === "suspend" || action === "close") {
      setActing(memberId);
      const { data: inProgress } = await supabase
        .from("booking_requests")
        .select("id")
        .or(`requester_id.eq.${memberId},host_id.eq.${memberId}`)
        .eq("status", "in_progress")
        .limit(1);
      setActing(null);
      if (inProgress?.length > 0) {
        setBlockMessage({
          memberId,
          message: "This member has an experience in progress. You cannot suspend or close their account right now. Come back later.",
        });
        return;
      }
    }
    setBlockMessage(null);
    setActionMode({ memberId, action });
    setNoteText("");
  };
  const closeAction = () => { setActionMode(null); setNoteText(""); setBlockMessage(null); };

  const sendAccountEmail = async (member, action) => {
    try {
      const subject = action === "suspend"
        ? "Your SharedXP account has been temporarily suspended"
        : action === "unsuspend"
        ? "Your SharedXP account has been unsuspended"
        : action === "reopen"
        ? "Your SharedXP account has been reopened"
        : "Your SharedXP account has been closed";
      const message = action === "suspend"
        ? "Your SharedXP account has been temporarily suspended pending review.\n\nIf you believe this is a mistake, please contact us and we'll look into it right away."
        : action === "unsuspend"
        ? "Good news — your SharedXP account has been unsuspended. You can now log in as normal.\n\nIf you have any questions, please don't hesitate to contact us."
        : action === "reopen"
        ? "Good news — your SharedXP account has been reopened. You can now log in as normal.\n\nIf you have any questions, please don't hesitate to contact us."
        : "Your SharedXP account has been closed.\n\nYou have a 30-day grace period to reverse this decision. Please contact us if you would like to reopen your account. If we do not hear from you within 30 days, your account and all personal data will be permanently deleted.";
      const useSupportCta = action === "suspend" || action === "close";
      await fetch(`${supabaseUrl}/functions/v1/booking-notify`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          emailType: "cm_admin_message",
          userId: member.id,
          subject,
          message,
          ...(useSupportCta && { ctaLabel: "Go to Support", ctaUrl: `${window.location.origin}/contact` }),
        }),
      });
    } catch (e) {
      console.error("[members] account email error:", e);
    }
  };

  const saveNoteAndAct = async (member) => {
    const note = noteText.trim();
    if (!note) { alert("Please enter a reason before proceeding."); return; }
    const action = actionMode.action;

    setActing(member.id);
    if (action === "suspend" || action === "close") {
      // Auto-cancel any bookings still in the booking phase
      await supabase
        .from("booking_requests")
        .update({ status: "cancelled" })
        .or(`requester_id.eq.${member.id},host_id.eq.${member.id}`)
        .in("status", ["pending", "accepted", "payment_pending"]);
    }
    const newNotes = appendNote(member.admin_notes, action, note, adminName);
    const update = { admin_notes: newNotes };
    if (action === "suspend")   update.suspended_at = new Date().toISOString();
    if (action === "unsuspend") update.suspended_at = null;
    if (action === "close")     { update.closed_at = new Date().toISOString(); update.suspended_at = new Date().toISOString(); }
    if (action === "reopen")    { update.closed_at = null; update.suspended_at = null; }

    const { error } = await supabase.from("profiles").update(update).eq("id", member.id);
    if (!error) await sendAccountEmail(member, action);
    else console.error("[members] action error:", error);
    closeAction();
    await loadMembers();
    setActing(null);
  };

  const isDeleted          = (m) => m.full_name === "Deleted User";
  const isSuspendedOrClosed = (m) => (!!m.suspended_at || !!m.closed_at) && !isDeleted(m);
  const isActive            = (m) => !m.suspended_at && !m.closed_at && !isDeleted(m);

  const tabFiltered = members.filter((m) => {
    if (tab === "restricted") return isSuspendedOrClosed(m);
    if (tab === "deleted")    return isDeleted(m);
    if (tab === "guest")      return isActive(m) && !m.is_host && !m.isCm && !m.is_admin;
    if (tab === "host")       return isActive(m) && m.is_host;
    if (tab === "cm")         return isActive(m) && m.isCm;
    if (tab === "admin")      return isActive(m) && m.is_admin;
    return isActive(m); // "all" — active accounts only
  });

  const isRestrictedOrDeletedTab = tab === "restricted" || tab === "deleted";

  const displayed = (
    search.trim()
      ? tabFiltered.filter((m) => {
          const q = search.toLowerCase();
          return m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
        })
      : tabFiltered
  ).slice().sort((a, b) => {
    if (isRestrictedOrDeletedTab) {
      const aDate = a.closed_at ?? a.suspended_at ?? "";
      const bDate = b.closed_at ?? b.suspended_at ?? "";
      return bDate.localeCompare(aDate);
    }
    let aVal = "", bVal = "";
    if (sortCol === "name")     { aVal = a.name; bVal = b.name; }
    if (sortCol === "email")    { aVal = a.email ?? ""; bVal = b.email ?? ""; }
    if (sortCol === "location") { aVal = [a.city, a.country].filter(Boolean).join(", "); bVal = [b.city, b.country].filter(Boolean).join(", "); }
    if (sortCol === "joined")   { aVal = a.signed_up_at ?? ""; bVal = b.signed_up_at ?? ""; }
    const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const chevron = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const tabs = [
    ["all",        "All",              members.filter(isActive).length],
    ["guest",      "Guests",           members.filter((m) => isActive(m) && !m.is_host && !m.isCm && !m.is_admin).length],
    ["host",       "Hosts",            members.filter((m) => isActive(m) && m.is_host).length],
    ["cm",         "CMs",              members.filter((m) => isActive(m) && m.isCm).length],
    ["admin",      "Admins",           members.filter((m) => isActive(m) && m.is_admin).length],
    ["restricted", "Suspended/Closed", members.filter(isSuspendedOrClosed).length],
    ["deleted",    "Deleted",          members.filter(isDeleted).length],
  ];

  if (loading) return <p style={{ marginTop: 24 }}>Loading members…</p>;

  return (
    <div>
      <p className="admin-subtitle">All registered members.</p>

      <div className="cm-admin-subtabs" style={{ marginBottom: 12 }}>
        {tabs.map(([key, label, count]) => (
          <button key={key} type="button" className={`admin-tab${tab === key ? " admin-tab-active" : ""}`} onClick={() => { setTab(key); setSearch(""); }}>
            {label}
            <span className="cm-admin-count" style={{ marginLeft: 4 }}>{count}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <input type="text" className="support-search-input" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {displayed.length === 0 ? (
        <p>No members found.</p>
      ) : (
        <div className="members-table-wrapper">
        <table className="members-table">
          <colgroup>
            <col style={{width: "17%"}} />
            <col style={{width: "20%"}} />
            <col style={{width: "15%"}} />
            <col style={{width: "13%"}} />
            <col style={{width: "16%"}} />
            <col style={{width: "19%"}} />
          </colgroup>
          <thead>
            <tr>
              <th className={sortCol === "name" ? "members-th-active" : ""} onClick={() => handleSort("name")}>Name{chevron("name")}</th>
              <th className={sortCol === "email" ? "members-th-active" : ""} onClick={() => handleSort("email")}>Email{chevron("email")}</th>
              <th className={sortCol === "location" ? "members-th-active" : ""} onClick={() => handleSort("location")}>Location{chevron("location")}</th>
              <th className={sortCol === "joined" ? "members-th-active" : ""} onClick={() => handleSort("joined")}>Member since{chevron("joined")}</th>
              <th>Type</th>
              <th>Account Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.flatMap((m) => {
              const isSuspended = !!m.suspended_at;
              const isClosed = !!m.closed_at;
              const isPermanentlyDeleted = isDeleted(m);
              const isBusy = acting === m.id;
              const isOpen = actionMode?.memberId === m.id;
              const isBlocked = blockMessage?.memberId === m.id;
              const isHistoryOpen = historyOpen.has(m.id) && !isOpen && !isBlocked;
              const noteCount = parseNotes(m.admin_notes).length;
              const graceDaysLeft = isClosed
                ? Math.max(0, 30 - Math.floor((Date.now() - new Date(m.closed_at).getTime()) / (1000 * 60 * 60 * 24)))
                : null;
              const ACTION_LABELS = { suspend: "Reason for suspension", unsuspend: "Reason for unsuspending", close: "Reason for closing account", reopen: "Reason for reopening account" };
              const ACTION_BTN = { suspend: "Save & Suspend", unsuspend: "Save & Unsuspend", close: "Save & Close", reopen: "Save & Reopen" };
              const rows = [
                <tr key={m.id} className={`members-row${isOpen || isHistoryOpen || isBlocked ? " members-row-open" : ""}${isClosed ? " members-row-closed" : ""}`}>
                  <td data-label="Name">
                    {m.name}
                    {m.referredBy && (
                      <div className="members-referred-by">
                        <span className="members-ref-badge" title={`Referred by ${m.referredBy}`}>R</span>
                        {m.referredBy}
                      </div>
                    )}
                  </td>
                  <td data-label="Email">{m.email || "—"}</td>
                  <td data-label="Location">{[m.city, m.country].filter(Boolean).join(", ") || "—"}</td>
                  <td data-label="Member since">
                    {m.signed_up_at ? fmtDate(m.signed_up_at) : "—"}
                  </td>
                  <td data-label="Type">
                    <div className="members-badges">
                      {isClosed    && <span className="pending-status-badge status-disputed">Closed</span>}
                      {isSuspended && !isClosed && <span className="pending-status-badge status-pending">Suspended</span>}
                      {m.is_admin  && <span className="pending-status-badge status-in_progress">Admin</span>}
                      {m.is_host   && <span className="pending-status-badge status-accepted">Host</span>}
                      {m.isCm      && <span className="pending-status-badge status-completed">CM</span>}
                      {!m.is_host && !m.isCm && !m.is_admin && !isSuspended && !isClosed && <span className="pending-status-badge status-pending">Guest</span>}
                    </div>
                  </td>
                  <td data-label="Actions">
                    {!m.is_admin && !isPermanentlyDeleted && (
                      <div className="members-actions-btns">
                        {!isClosed && (
                          isSuspended
                            ? <button type="button" className="btn btn-light btn-sm" disabled={isBusy || isOpen || isBlocked} onClick={() => openAction(m.id, "unsuspend")}>Unsuspend</button>
                            : <button type="button" className="btn btn-light btn-sm" disabled={isBusy || isOpen || isBlocked} onClick={() => openAction(m.id, "suspend")}>{isBusy ? "…" : "Suspend"}</button>
                        )}
                        {!isClosed && (
                          <button type="button" className="btn btn-danger btn-sm" disabled={isBusy || isOpen || isBlocked} onClick={() => openAction(m.id, "close")}>{isBusy ? "…" : "Close"}</button>
                        )}
                        {noteCount > 0 && (
                          <button type="button" className={`members-notes-btn${isHistoryOpen ? " members-notes-btn-active" : ""}`} onClick={() => toggleHistory(m.id)}>
                            {noteCount} {isHistoryOpen ? "▲" : "▼"}
                          </button>
                        )}
                        {isClosed && (
                          <>
                            <button type="button" className="btn btn-light btn-sm" disabled={isBusy || isOpen || isBlocked} onClick={() => openAction(m.id, "reopen")}>Reopen</button>
                            <span className={`members-grace-tag${graceDaysLeft === 0 ? " members-grace-expired" : ""}`}>
                              {graceDaysLeft > 0 ? `${graceDaysLeft}d left` : "Grace expired"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>,
              ];

              if (isHistoryOpen) {
                rows.push(
                  <tr key={`${m.id}-history`} className="members-action-row">
                    <td colSpan={6}>
                      <NoteHistory adminNotes={m.admin_notes} adminName={adminName} />
                    </td>
                  </tr>
                );
              }

              if (isBlocked) {
                rows.push(
                  <tr key={`${m.id}-block`} className="members-action-row">
                    <td colSpan={6}>
                      <p style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", padding: "8px 12px", borderRadius: 6, margin: 0 }}>
                        {blockMessage.message}
                      </p>
                      <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                        <button type="button" className="btn btn-light" onClick={() => setBlockMessage(null)}>Dismiss</button>
                      </div>
                    </td>
                  </tr>
                );
              }

              if (isOpen) {
                rows.push(
                  <tr key={`${m.id}-action`} className="members-action-row">
                    <td colSpan={6}>
                      <NoteHistory adminNotes={m.admin_notes} adminName={adminName} />
                      <p className="admin-dispute-label" style={{ marginTop: 12 }}>
                        {ACTION_LABELS[actionMode.action]} (required)
                      </p>
                      {actionMode.action === "close" && (
                        <p style={{ fontSize: 13, color: "#92400e", background: "#fef3c7", padding: "8px 12px", borderRadius: 6, margin: "6px 0 10px" }}>
                          There is a 30-day grace period before the account is permanently closed and all personal data is deleted. The member will be notified and can contact you to reopen their account within this window.
                        </p>
                      )}
                      <textarea
                        className="cm-admin-notes"
                        rows={3}
                        placeholder={actionMode.action === "close" ? "e.g. Customer requested, Terms violation…" : actionMode.action === "reopen" ? "e.g. Customer contacted us to reopen…" : actionMode.action === "unsuspend" ? "e.g. Review completed, no violation found…" : "e.g. Terms violation, Abusive behaviour…"}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        autoFocus
                      />
                      <div className="admin-dispute-actions" style={{ marginTop: 8 }}>
                        <button type="button" className="btn btn-light" onClick={closeAction}>Cancel</button>
                        <button
                          type="button"
                          className={actionMode.action === "close" ? "btn btn-danger" : "btn btn-light"}
                          disabled={isBusy}
                          onClick={() => saveNoteAndAct(m)}
                        >
                          {isBusy ? "…" : ACTION_BTN[actionMode.action]}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
              return rows;
            })}
          </tbody>
        </table>
        </div>
      )}
      <p className="admin-dispute-label" style={{ marginTop: 8 }}>
        {displayed.length} member{displayed.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

const AdminPage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword }) => {
  const [searchParams] = useSearchParams();
  const [disputes, setDisputes] = useState([]);
  const [disputeTab, setDisputeTab] = useState("open");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [resolvePanel, setResolvePanel] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [expandedDisputeId, setExpandedDisputeId] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "disputes");
  const [memberSearch, setMemberSearch] = useState("");
  const [cmCounts, setCmCounts] = useState({ pendingApps: 0, pendingComms: 0 });
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingAccountingCount, setPendingAccountingCount] = useState(0);
  const [pendingExperiencesCount, setPendingExperiencesCount] = useState(0);
  const { resolveDispute } = useBookingRequests(currentUser);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("booking_requests")
      .select(`
        id, status, sport, requested_date, price, currency, updated_at,
        requester:profiles!requester_id(full_name, first_name, last_name, email),
        host:profiles!host_id(full_name, first_name, last_name, email),
        dispute:disputes(*)
      `)
      .in("status", ["disputed", "resolved_refunded", "resolved_paid_host"])
      .order("updated_at", { ascending: false });
    const rows = (data ?? []).map((br) => {
      const d = br.dispute?.[0] ?? {};
      return {
        id: d.id ?? null,
        booking_request_id: br.id,
        requester_explanation: d.requester_explanation ?? null,
        host_response: d.host_response ?? null,
        opened_at: d.opened_at ?? null,
        resolved_at: d.resolved_at ?? null,
        resolution: d.resolution ?? null,
        resolved_by: d.resolved_by ?? null,
        admin_note: d.admin_note ?? null,
        booking_request: { status: br.status, sport: br.sport, requested_date: br.requested_date, price: br.price, currency: br.currency, requester: br.requester, host: br.host },
      };
    });
    setDisputes(rows);
    setLoading(false);
  }, []);

  const fetchCmCounts = useCallback(async () => {
    const [appRes, commRes] = await Promise.all([
      supabase
        .from("cm_applications")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "interview"]),
      supabase
        .from("cm_commissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    setCmCounts({ pendingApps: appRes.count ?? 0, pendingComms: commRes.count ?? 0 });
  }, []);

  const fetchUnreadSupport = useCallback(async () => {
    const { count } = await supabase
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread");
    setUnreadSupport(count ?? 0);
  }, []);

  const fetchPendingReports = useCallback(async () => {
    const { count } = await supabase
      .from("field_post_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingReports(count ?? 0);
  }, []);

  const fetchExperiencesCounts = useCallback(async () => {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .is("approved_at", null)
      .is("released_at", null);
    setPendingExperiencesCount(count ?? 0);
  }, []);

  const fetchAccountingCounts = useCallback(async () => {
    const [invRes, commRes, refundRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .not("approved_at", "is", null)
        .is("released_at", null),  // only approved-not-released invoices
      supabase
        .from("cm_commissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "approved"]),
      supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gt("refund_pct", 0)
        .is("refund_sent_at", null),
    ]);
    setPendingAccountingCount((invRes.count ?? 0) + (commRes.count ?? 0) + (refundRes.count ?? 0));
  }, []);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchDisputes();
      fetchCmCounts();
      fetchUnreadSupport();
      fetchPendingReports();
      fetchAccountingCounts();
      fetchExperiencesCounts();
    } else {
      setLoading(false);
    }
  }, [currentUser?.isAdmin, currentUser?.id, fetchDisputes, fetchCmCounts, fetchUnreadSupport, fetchPendingReports, fetchAccountingCounts, fetchExperiencesCounts]);

  const handleResolve = (disputeId, resolution) => {
    setResolvePanel({ disputeId, resolution });
    setAdminNote("");
  };

  const handleResolveConfirm = async () => {
    if (!resolvePanel) return;
    setResolving(resolvePanel.disputeId);
    setResolvePanel(null);
    await resolveDispute(resolvePanel.disputeId, resolvePanel.resolution, adminNote.trim() || undefined);
    await fetchDisputes();
    setResolving(null);
    setAdminNote("");
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
            {disputes.filter((d) => d.booking_request?.status === "disputed").length > 0 && (
              <span className="cm-admin-count cm-admin-count-alert">{disputes.filter((d) => d.booking_request?.status === "disputed").length}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "cm" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("cm")}
          >
            CM Management
            {cmCounts.pendingApps > 0 && (
              <span className="cm-admin-count cm-admin-count-alert">{cmCounts.pendingApps}</span>
            )}
            {cmCounts.pendingComms > 0 && (
              <span className="cm-admin-count cm-admin-count-alert">{cmCounts.pendingComms}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "support" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("support")}
          >
            Support
            {unreadSupport > 0 && <span className="cm-admin-count cm-admin-count-alert">{unreadSupport}</span>}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "reports" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
            {pendingReports > 0 && <span className="cm-admin-count cm-admin-count-alert">{pendingReports}</span>}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "experiences" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("experiences")}
          >
            Experiences
            {pendingExperiencesCount > 0 && (
              <span className="cm-admin-count cm-admin-count-alert">{pendingExperiencesCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "accounting" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("accounting")}
          >
            Accounting
            {pendingAccountingCount > 0 && (
              <span className="cm-admin-count cm-admin-count-alert">{pendingAccountingCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "members" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>
        </div>

        {activeTab === "disputes" && (
          <>
            <p className="admin-subtitle">Customer service view — all open and resolved disputes.</p>
            {!loading && (
              <div className="cm-admin-subtabs" style={{ marginBottom: 16 }}>
                <button type="button" className={`admin-tab${disputeTab === "open" ? " admin-tab-active" : ""}`} onClick={() => setDisputeTab("open")}>
                  {(() => { const n = disputes.filter((d) => d.booking_request?.status === "disputed").length; return <>Open <span className={`cm-admin-count${n > 0 ? " cm-admin-count-alert" : ""}`} style={{ marginLeft: 4 }}>{n}</span></>; })()}
                </button>
                <button type="button" className={`admin-tab${disputeTab === "resolved" ? " admin-tab-active" : ""}`} onClick={() => setDisputeTab("resolved")}>
                  Resolved <span className="cm-admin-count" style={{ marginLeft: 4 }}>{disputes.filter((d) => d.booking_request?.status?.startsWith("resolved_")).length}</span>
                </button>
              </div>
            )}
            {loading ? (
              <p>Loading disputes…</p>
            ) : disputes.filter((d) => disputeTab === "open" ? d.booking_request?.status === "disputed" : d.booking_request?.status?.startsWith("resolved_")).length === 0 ? (
              <p>No {disputeTab} disputes.</p>
            ) : (
              <div className="admin-dispute-list">
                {disputes.filter((d) => disputeTab === "open" ? d.booking_request?.status === "disputed" : d.booking_request?.status?.startsWith("resolved_")).map((d) => {
              const br = d.booking_request;
              const requesterName = br ? getName(br.requester) : "—";
              const hostName = br ? getName(br.host) : "—";
              const isResolved = !!br?.status?.startsWith("resolved_");

              const isExpanded = expandedDisputeId === d.id;
              return (
                <article key={d.id} className={`admin-dispute-card${isResolved ? " resolved" : ""}`}>
                  {/* Collapsed summary row */}
                  <button
                    type="button"
                    className="admin-dispute-summary-row"
                    onClick={() => setExpandedDisputeId(isExpanded ? null : d.id)}
                  >
                    <span className="admin-dispute-summary-main">
                      <span className="admin-dispute-sport">{br?.sport ?? "Unknown sport"}</span>
                      <span className="admin-dispute-summary-sep">·</span>
                      <span>{hostName}</span>
                      <span className="admin-dispute-summary-sep">·</span>
                      <span>{fmtDate(br?.requested_date)}</span>
                    </span>
                    <span className="admin-dispute-summary-right">
                      <span className={`pending-status-badge status-${isResolved ? "resolved" : "disputed"}`}>
                        {isResolved ? (d.resolution === "refunded" ? "Refunded" : "Paid host") : "Open"}
                      </span>
                      <span className="admin-dispute-chevron">{isExpanded ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="admin-dispute-body">
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

                      {!isResolved && resolvePanel?.disputeId === d.id ? (
                        <div className="admin-dispute-resolve-panel">
                          <p className="admin-dispute-label">
                            Resolving as: <strong>{resolvePanel.resolution === "refunded" ? "Refund Guest" : "Release to Host"}</strong>
                          </p>
                          <textarea
                            className="admin-dispute-note-input"
                            placeholder="Admin note (optional — internal only)"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={3}
                          />
                          <div className="admin-dispute-actions">
                            <button type="button" className="btn btn-light" onClick={() => setResolvePanel(null)}>Cancel</button>
                            <button type="button" className={resolvePanel.resolution === "refunded" ? "btn btn-danger" : "btn btn-primary"} onClick={handleResolveConfirm}>
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : !isResolved && (
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
                        <div className="admin-dispute-resolved-thread">
                          <p className="admin-dispute-resolved-info">
                            Resolved {fmtDate(d.resolved_at)} by {d.resolved_by ?? "admin"} — {d.resolution === "refunded" ? "Guest refunded" : "Payment released to host"}
                          </p>
                          {d.admin_note && (
                            <div className="admin-dispute-note-block">
                              <p className="admin-dispute-label">Admin note — {d.resolved_by ?? "admin"} · {fmtDateTime(d.resolved_at)}</p>
                              <p className="admin-dispute-note-text">{d.admin_note}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
              </div>
            )}
          </>
        )}

        {activeTab === "cm" && <CMManagementPanel currentUser={currentUser} initialSearch={searchParams.get("search") ?? ""} initialSubTab={searchParams.get("subtab") ?? "applications"} onCountChange={fetchCmCounts} />}
        {activeTab === "support" && <SupportPanel currentUser={currentUser} onRead={fetchUnreadSupport} />}
        {activeTab === "reports" && <FieldPostReportsPanel currentUser={currentUser} onCountChange={setPendingReports} onViewMember={(name) => { setMemberSearch(name); setActiveTab("members"); }} />}
        {activeTab === "experiences" && <ExperiencesPanel currentUser={currentUser} onCountChange={fetchExperiencesCounts} />}
        {activeTab === "accounting" && <AccountingPanel currentUser={currentUser} onCountChange={fetchAccountingCounts} />}
        {activeTab === "members" && <MembersPanel currentUser={currentUser} initialSearch={memberSearch} />}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default AdminPage;
