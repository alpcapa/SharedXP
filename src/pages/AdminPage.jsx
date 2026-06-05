import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import InlineLoginForm from "../components/InlineLoginForm";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";
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

const appendNote = (existing, action, noteText) => {
  const notes = parseNotes(existing);
  notes.push({ action, note: noteText.trim(), at: new Date().toISOString() });
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
                  <span className="admin-note-time">· {fmtDateTime(n.at)} · {adminName}</span>
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
  const [cmActionMode, setCmActionMode] = useState(null); // { id, action }
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [cmSearch, setCmSearch] = useState(initialSearch);
  const [emailFeedback, setEmailFeedback] = useState({});
  const [viewApplication, setViewApplication] = useState(null);

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
    if (!getNote(app.id).trim()) { alert("Please enter a reason before moving to interview."); return; }
    if (busy(app.id)) return;
    if (!confirm("Move this application to interview stage?")) return;
    setActionBusy(app.id);
    const newNotes = appendNote(app.admin_notes, "interview", getNote(app.id));
    await supabase.from("cm_applications").update({ status: "interview", admin_notes: newNotes }).eq("id", app.id);
    await sendCmEmail("cm_interview", app.user_id);
    setNote(app.id, "");
    await fetchAll();
    setActionBusy(null);
  };

  const acceptApplication = async (app) => {
    if (!getNote(app.id).trim()) { alert("Please enter the interview outcome before accepting."); return; }
    if (busy(app.id)) return;
    if (!confirm("Accept this application and generate a welcome invite code?")) return;
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
    await fetchAll();
    setActionBusy(null);
  };

  const declineApplication = async (app) => {
    if (!getNote(app.id).trim()) { alert("Please enter a reason before declining."); return; }
    if (busy(app.id)) return;
    if (!confirm("Decline this application?")) return;
    setActionBusy(app.id);
    const newNotes = appendNote(app.admin_notes, "declined", getNote(app.id));
    await supabase.from("cm_applications").update({ status: "declined", admin_notes: newNotes }).eq("id", app.id);
    await sendCmEmail("cm_declined", app.user_id);
    setNote(app.id, "");
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
          Applications {pendingApps.length > 0 && <span className="cm-admin-count">{pendingApps.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "active" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("active")}
        >
          Active CMs {pendingCommsTotal > 0 && <span className="cm-admin-count">{pendingCommsTotal}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "paused" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("paused")}
        >
          Paused {pausedCms.length > 0 && <span className="cm-admin-count">{pausedCms.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "revoked" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("revoked")}
        >
          Revoked {revokedCms.length > 0 && <span className="cm-admin-count">{revokedCms.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab${subTab === "declined" ? " admin-tab-active" : ""}`}
          onClick={() => setSubTab("declined")}
        >
          Declined {declinedApps.length > 0 && <span className="cm-admin-count">{declinedApps.length}</span>}
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
                    <div className="cm-admin-notes-row">
                      <label htmlFor={`notes-${app.id}`} className="admin-dispute-label">
                        {isInterview
                          ? "Interview outcome / review (required to accept or decline)"
                          : "Reason (required — saved to record only, not sent in email)"}
                      </label>
                      <textarea
                        id={`notes-${app.id}`}
                        className="cm-admin-notes"
                        rows={2}
                        placeholder={isInterview
                          ? "How did the interview go? Note key impressions before accepting or declining…"
                          : "Internal notes for this application…"}
                        value={getNote(app.id)}
                        onChange={(e) => setNote(app.id, e.target.value)}
                      />
                    </div>
                    <div className="admin-dispute-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy(app.id) || isInterview}
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
                        {busy(app.id) ? "…" : "Accept & Welcome"}
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
                      {pendingComms.length > 0 && (
                        <span className="cm-admin-count">{pendingComms.length} pending</span>
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
            {threads.filter((t) => !t.allClosed && t.hasUnread).length > 0 && (
              <span className="cm-admin-count">
                {threads.filter((t) => !t.allClosed && t.hasUnread).length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${supportTab === "archive" ? " admin-tab-active" : ""}`}
            onClick={() => setSupportTab("archive")}
          >
            Archive
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
                  <span className="cm-admin-count">{threadUnread} unread</span>
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
const FieldPostReportsPanel = ({ onCountChange }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("field_post_reports")
      .select(`
        id, created_at, status, post_id, reporter_id,
        post:field_posts!post_id(
          id, caption, sport, city, country, photos, host_name, role,
          poster:profiles!poster_id(full_name, first_name, last_name)
        ),
        reporter:profiles!reporter_id(full_name, first_name, last_name, email)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) console.error("[reports] fetch error:", error);
    const rows = data ?? [];
    setReports(rows);
    setLoading(false);
    onCountChange?.(rows.length);
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

  const removePost = async (reportId, postId) => {
    if (!confirm("Remove this post? This cannot be undone.")) return;
    setActing(reportId);
    const { error } = await supabase.from("field_posts").delete().eq("id", postId);
    if (error) console.error("[reports] remove post error:", error);
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

  return (
    <div>
      <p className="admin-subtitle">Field posts flagged by users as inappropriate.</p>
      {reports.length === 0 ? (
        <p>No pending reports.</p>
      ) : (
        <div className="admin-dispute-list">
          {reports.map((r) => {
            const post = r.post;
            const isExpanded = expandedIds.has(r.id);
            const photo = Array.isArray(post?.photos) && post.photos.length > 0 ? post.photos[0] : null;
            const isHost = post?.role === "hosted";
            const sharerName = isHost
              ? (post?.host_name || "—")
              : getProfileName(post?.poster);
            return (
              <article key={r.id} className="admin-dispute-card">
                <button
                  type="button"
                  className="cm-admin-card-summary"
                  onClick={() => toggleExpanded(r.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="cm-admin-card-summary-left">
                    <strong>{post?.sport ?? "Unknown sport"}</strong>
                    <span className="cm-admin-email">
                      {isHost ? "hosted by" : "attended by"} {sharerName}
                      {(post?.city || post?.country) ? ` / ${[post.city, post.country].filter(Boolean).join(", ")}` : ""}
                      {` on ${fmtDate(r.created_at)}`}
                    </span>
                  </div>
                  <div className="cm-admin-card-summary-right">
                    <span className="pending-status-badge status-disputed">Pending</span>
                    <span className={`cm-admin-chevron${isExpanded ? " cm-admin-chevron-open" : ""}`}>▾</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="cm-admin-card-body">
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      {photo && (
                        <img
                          src={photo}
                          alt="Reported post"
                          style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="admin-dispute-accounts">
                          <div>
                            <p className="admin-dispute-label">Caption</p>
                            <blockquote className="dispute-quote">{post?.caption || "—"}</blockquote>
                          </div>
                          <div>
                            <p className="admin-dispute-label">Shared by</p>
                            <p>{sharerName}</p>
                            <p className="admin-dispute-email">{isHost ? "Host" : "Guest"}</p>
                          </div>
                          <div>
                            <p className="admin-dispute-label">Reported by</p>
                            <p>{getProfileName(r.reporter)}</p>
                          </div>
                        </div>

                        <div className="admin-dispute-actions">
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removePost(r.id, r.post_id)}
                            disabled={acting === r.id}
                          >
                            {acting === r.id ? "…" : "Remove Post"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => dismiss(r.id)}
                            disabled={acting === r.id}
                          >
                            {acting === r.id ? "…" : "Dismiss"}
                          </button>
                        </div>
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

const AdminPage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword }) => {
  const [searchParams] = useSearchParams();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "disputes");
  const [cmCounts, setCmCounts] = useState({ pendingApps: 0, pendingComms: 0 });
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
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

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchDisputes();
      fetchCmCounts();
      fetchUnreadSupport();
      fetchPendingReports();
    } else {
      setLoading(false);
    }
  }, [currentUser?.isAdmin, currentUser?.id, fetchDisputes, fetchCmCounts, fetchUnreadSupport, fetchPendingReports]);

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
            {disputes.filter((d) => !d.resolved_at).length > 0 && (
              <span className="cm-admin-count">{disputes.filter((d) => !d.resolved_at).length}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "cm" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("cm")}
          >
            CM Management
            {(cmCounts.pendingApps + cmCounts.pendingComms) > 0 && (
              <span className="cm-admin-count">{cmCounts.pendingApps + cmCounts.pendingComms}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "support" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("support")}
          >
            Support
            {unreadSupport > 0 && <span className="cm-admin-count">{unreadSupport}</span>}
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "reports" ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
            {pendingReports > 0 && <span className="cm-admin-count">{pendingReports}</span>}
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

        {activeTab === "cm" && <CMManagementPanel currentUser={currentUser} initialSearch={searchParams.get("search") ?? ""} initialSubTab={searchParams.get("subtab") ?? "applications"} onCountChange={fetchCmCounts} />}
        {activeTab === "support" && <SupportPanel currentUser={currentUser} onRead={fetchUnreadSupport} />}
        {activeTab === "reports" && <FieldPostReportsPanel onCountChange={setPendingReports} />}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default AdminPage;
