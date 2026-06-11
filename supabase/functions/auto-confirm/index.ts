// Hourly sweep that auto-confirms in_progress bookings whose time windows
// have elapsed. Acts as the server-side safety net when no participant has
// the app open — mirrors the client-side logic in useBookingRequests.js.
//
// Two jobs per run:
//   1. Feedback email — bookings where experience_ends_at has passed but
//      auto_confirm_at hasn't yet and feedback_email_sent_at is NULL.
//      Sends a prompt asking the guest to confirm or dispute the session.
//   2. Auto-confirm — bookings where auto_confirm_at has passed; marks them
//      completed, releases invoices, notifies both parties.
//
// Both jobs use an atomic "claim" pattern (update ... IS NULL ... returning id)
// so that if a client and this function race, exactly one of them sends the
// notification — no duplicates.
//
// Scheduling: .github/workflows/auto-confirm.yml (runs every hour at :15).
// Deploy: supabase functions deploy auto-confirm

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function invokeBookingNotify(emailType: string, bookingRequestId: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ emailType, bookingRequestId }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[auto-confirm] booking-notify error for ${bookingRequestId} (${emailType}):`, err);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now = new Date().toISOString();

  // ── Job 1: Send feedback emails ───────────────────────────────────────────
  // Session day has passed, auto-confirm window is still open, prompt not sent.

  const { data: needsFeedback, error: feedbackErr } = await db
    .from("booking_requests")
    .select("id")
    .eq("status", "in_progress")
    .lte("experience_ends_at", now)
    .gt("auto_confirm_at", now)
    .is("feedback_email_sent_at", null);

  if (feedbackErr) console.error("[auto-confirm] feedback query error:", feedbackErr);

  let feedbackSent = 0;
  for (const r of needsFeedback ?? []) {
    const { data: flagged } = await db
      .from("booking_requests")
      .update({ feedback_email_sent_at: now })
      .eq("id", r.id)
      .is("feedback_email_sent_at", null)
      .select("id");

    if (flagged?.length) {
      await invokeBookingNotify("experience_completed_to_requester", r.id);
      feedbackSent++;
    }
  }

  // ── Job 2: Auto-confirm expired bookings ──────────────────────────────────
  // auto_confirm_at has passed and the booking is still in_progress.

  const { data: expired, error: expiredErr } = await db
    .from("booking_requests")
    .select("id")
    .eq("status", "in_progress")
    .lte("auto_confirm_at", now);

  if (expiredErr) console.error("[auto-confirm] expired query error:", expiredErr);

  let confirmed = 0;
  for (const r of expired ?? []) {
    await db
      .from("booking_requests")
      .update({ status: "completed", updated_at: now })
      .eq("id", r.id);

    // Mark invoice as admin-approved so accounting can release payment.
    // Use atomic claim (IS NULL) so only the first writer (this function or a
    // live client) sets the flag — no double-approvals.
    const { data: approved } = await db
      .from("invoices")
      .update({ approved_at: now })
      .eq("booking_request_id", r.id)
      .is("approved_at", null)
      .select("id");

    if (approved?.length) {
      await invokeBookingNotify("experience_confirmed_to_host", r.id);
      confirmed++;
    }
  }

  console.log(`[auto-confirm] feedbackSent=${feedbackSent} confirmed=${confirmed}`);

  return new Response(
    JSON.stringify({ ok: true, feedbackSent, confirmed }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
