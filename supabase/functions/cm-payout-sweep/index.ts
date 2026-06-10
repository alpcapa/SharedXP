// Daily CM payout sweep — run via cron (GitHub Actions or pg_cron).
//
// What it does:
//   1. Finds every CM+currency pair that has at least one pending commission
//      older than 45 days (CM_PAYOUT_DAYS_FALLBACK).
//   2. For each such pair, approves ALL pending commissions for that CM in
//      that currency — the oldest commission triggers a full group sweep, so
//      a commission created on day 43 is paid out with the day-45 one.
//   3. Finds every approved-but-unpaid commission that hasn't triggered an
//      admin notification yet (payout_notified_at IS NULL). Groups them by CM.
//   4. For each CM: emails the admin (CS_EMAIL) with the total owed and the
//      CM's payment details, and emails the CM to say their commissions are
//      approved and payment is on the way.
//   5. Stamps payout_notified_at so the same batch is never re-notified.
//
// Scheduling (pick one):
//   a) GitHub Actions — add a workflow with `schedule: [{cron: "0 6 * * *"}]`
//      that POSTs to this function with the service role key.
//   b) Supabase pg_cron — SELECT cron.schedule('cm-payout-sweep', '0 6 * * *',
//      $$SELECT net.http_post(...)$$);
//
// Deploy: supabase functions deploy cm-payout-sweep

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL           = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sharedxp.com";
const APP_URL              = Deno.env.get("APP_URL") ?? "https://project-gq4ge.vercel.app";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CS_EMAIL             = Deno.env.get("CS_EMAIL") ?? "support@sharedxp.com";
const PAYOUT_DAYS          = 10;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function emailHtml(heading: string, bodyLines: string[], ctaUrl: string, ctaLabel: string, extraHtml = ""): string {
  const body = bodyLines
    .map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#444;">${l}</p>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#1a1a1a;padding:28px 40px;">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">SharedXP</span>
        </td></tr>
        <tr><td style="padding:40px 40px 24px;">
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a1a;">${heading}</h1>
          ${body}
          <a href="${ctaUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;margin-top:20px;">${ctaLabel}</a>
          ${extraHtml}
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} SharedXP</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function commissionBreakdownHtml(
  items: Array<{ sport: string; date: string; gmv: number; commissionAmount: number; currency: string }>,
  totalAmount: number,
  currency: string,
): string {
  const fmt = (n: number) => Number(n).toFixed(2);
  const fmtDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const thStyle = `padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;`;
  const thRStyle = `${thStyle}text-align:right;`;
  const tdStyle = `padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#444;`;
  const tdRStyle = `${tdStyle}text-align:right;`;
  const rows = items.map((item) => `
    <tr>
      <td style="${tdStyle}">${item.sport || "—"}</td>
      <td style="${tdStyle}">${fmtDate(item.date)}</td>
      <td style="${tdRStyle}color:#666;">${item.currency} ${fmt(item.gmv)}</td>
      <td style="${tdRStyle}font-weight:600;color:#1a1a1a;">${item.currency} ${fmt(item.commissionAmount)}</td>
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr style="background:#f5f5f0;">
      <th style="${thStyle}">Sport</th>
      <th style="${thStyle}">Session</th>
      <th style="${thRStyle}">Booking value</th>
      <th style="${thRStyle}">Commission (5%)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#f5f5f0;">
      <td colspan="3" style="padding:8px 12px;font-size:14px;font-weight:700;color:#1a1a1a;">Total</td>
      <td style="padding:8px 12px;font-size:14px;font-weight:700;color:#1a1a1a;text-align:right;">${currency} ${fmt(totalAmount)}</td>
    </tr></tfoot>
  </table>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[cm-payout-sweep] Resend error ${res.status}:`, err);
  }
}

serve(async (req: Request): Promise<Response> => {
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
  const cutoff = new Date(Date.now() - PAYOUT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // ── Step 1 & 2: 45-day fallback auto-approval ─────────────────────────────

  const { data: oldPending } = await db
    .from("cm_commissions")
    .select("cm_id, currency")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  const pairs = [
    ...new Map(
      (oldPending ?? []).map((r) => [`${r.cm_id}-${r.currency}`, { cm_id: r.cm_id, currency: r.currency }])
    ).values(),
  ];

  for (const { cm_id, currency } of pairs) {
    const { error } = await db
      .from("cm_commissions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("cm_id", cm_id)
      .eq("currency", currency)
      .eq("status", "pending");
    if (error) console.error("[cm-payout-sweep] approve error:", cm_id, currency, error);
  }

  // ── Step 3: Find approved commissions not yet notified ────────────────────

  const { data: unnotified } = await db
    .from("cm_commissions")
    .select(`
      id, cm_id, commission_amount, currency, gmv, approved_at,
      booking_request:booking_requests(sport, requested_date),
      cm_profile:cm_profiles!cm_id(
        id, payment_info,
        owner:profiles!user_id(id, full_name, first_name, last_name, email)
      )
    `)
    .eq("status", "approved")
    .is("paid_at", null)
    .is("payout_notified_at", null);

  if (!unnotified?.length) {
    return new Response(JSON.stringify({ ok: true, approved: pairs.length, notified: 0 }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // ── Step 4: Group by CM, send emails ──────────────────────────────────────

  type CommRow = typeof unnotified[number];
  const byCm = new Map<string, CommRow[]>();
  for (const c of unnotified) {
    const key = c.cm_id as string;
    if (!byCm.has(key)) byCm.set(key, []);
    byCm.get(key)!.push(c);
  }

  const notifiedIds: string[] = [];

  for (const [, comms] of byCm) {
    const first = comms[0];
    const profile = (first.cm_profile as Record<string, unknown> | null);
    const owner = (profile?.owner as Record<string, unknown> | null);
    if (!owner?.email) continue;

    const cmName = String(owner.full_name ?? (`${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim() || "CM"));
    const cmEmail = String(owner.email);
    const hasPaymentInfo = Boolean(String(profile?.payment_info ?? "").trim());
    const paymentInfo = String(profile?.payment_info ?? "").trim() || "No payment details provided — ask CM to add them in their dashboard.";

    // Group by currency for display
    const byCurrency = new Map<string, number>();
    for (const c of comms) {
      const cur = String(c.currency);
      byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + Number(c.commission_amount));
    }
    const amountLines = [...byCurrency.entries()]
      .map(([cur, total]) => `${cur} ${total.toFixed(2)}`)
      .join(", ");

    const adminUrl = `${APP_URL}/admin?tab=cm&search=${encodeURIComponent(cmEmail)}`;

    // Email admin
    await sendEmail(
      CS_EMAIL,
      `CM payout ready — ${cmName} (${amountLines})`,
      emailHtml(
        `CM payout ready: ${cmName}`,
        [
          `<strong>${cmName}</strong> has approved commissions awaiting payment.`,
          `<strong>Total:</strong> ${amountLines}`,
          `<strong>Commissions:</strong> ${comms.length}`,
          `<strong>Send payment to:</strong><br/><span style="white-space:pre-wrap;font-family:monospace;">${paymentInfo}</span>`,
          `Once you've sent the payment, mark it as paid in the admin panel so the CM is notified.`,
        ],
        adminUrl,
        "Open Admin Panel",
      ),
    );

    // Build per-currency breakdown for CM email
    const byCurrencyItems = new Map<string, Array<{ sport: string; date: string; gmv: number; commissionAmount: number; currency: string }>>();
    for (const c of comms) {
      const cur = String(c.currency);
      if (!byCurrencyItems.has(cur)) byCurrencyItems.set(cur, []);
      const br = (c.booking_request as Record<string, unknown> | null);
      byCurrencyItems.get(cur)!.push({
        sport: String(br?.sport ?? ""),
        date: String(br?.requested_date ?? ""),
        gmv: Number(c.gmv),
        commissionAmount: Number(c.commission_amount),
        currency: cur,
      });
    }
    const breakdownHtml = [...byCurrencyItems.entries()]
      .map(([cur, items]) => {
        const total = items.reduce((s, i) => s + i.commissionAmount, 0);
        return commissionBreakdownHtml(items, total, cur);
      })
      .join("");

    // Email CM
    await sendEmail(
      cmEmail,
      `Your SharedXP commissions have been approved — ${amountLines}`,
      emailHtml(
        `Commission approved, ${cmName}!`,
        [
          `Your SharedXP commissions totalling <strong>${amountLines}</strong> have been approved for payment.`,
          hasPaymentInfo
            ? `Our team will process the payment to your registered payout method. You'll receive a confirmation email once the payment is sent.`
            : `<strong>Action required:</strong> we don't have your payment details on file. Please head to your CM Dashboard and add your preferred payout details (bank account, PayPal, etc.) — otherwise the payment cannot be made.`,
        ],
        `${APP_URL}/user/${owner.id}?tab=cm`,
        hasPaymentInfo ? "View CM Dashboard" : "Add Payout Details",
        `${breakdownHtml}<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#444;">You can track all your commissions on your CM Dashboard.</p>`,
      ),
    );

    for (const c of comms) notifiedIds.push(c.id as string);
  }

  // ── Step 5: Stamp payout_notified_at ─────────────────────────────────────

  if (notifiedIds.length) {
    await db
      .from("cm_commissions")
      .update({ payout_notified_at: new Date().toISOString() })
      .in("id", notifiedIds);
  }

  return new Response(
    JSON.stringify({ ok: true, approved: pairs.length, notified: notifiedIds.length }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
