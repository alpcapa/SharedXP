// Booking notification dispatcher — called from the frontend via
// supabase.functions.invoke('booking-notify', { body: { emailType, bookingRequestId } })
// Uses the service role key to read across RLS boundaries.
//
// Deploy: supabase functions deploy booking-notify

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY         = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL             = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sharedxp.com";
const APP_URL                = Deno.env.get("APP_URL") ?? "https://project-gq4ge.vercel.app";
const SUPABASE_URL           = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CS_EMAIL               = Deno.env.get("CS_EMAIL") ?? "support@sharedxp.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Email template builder ─────────────────────────────────────────────────

function emailHtml(
  heading: string,
  bodyLines: string[],
  ctaUrl: string,
  ctaLabel: string,
  extraHtml = "",
): string {
  const body = bodyLines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#444;">${l}</p>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#1a1a1a;padding:28px 40px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">SharedXP</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px;">
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a1a;">${heading}</h1>
            ${body}
            ${extraHtml}
            <a href="${ctaUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;margin-top:20px;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px;">
            <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
              If the button above doesn't work, copy and paste this link into your browser:<br/>
              <a href="${ctaUrl}" style="color:#1a1a1a;word-break:break-all;">${ctaUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} SharedXP · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function invoiceTable(inv: Record<string, unknown>): string {
  const fmt = (n: number) => Number(n).toFixed(2);
  return `
<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:20px 0;font-size:14px;">
  <tr style="background:#f5f5f2;">
    <td style="border:1px solid #e8e9e4;"><strong>Gross amount</strong></td>
    <td style="border:1px solid #e8e9e4;text-align:right;">${inv.currency} ${fmt(Number(inv.gross_amount))}</td>
  </tr>
  <tr>
    <td style="border:1px solid #e8e9e4;">Platform fee (15%)</td>
    <td style="border:1px solid #e8e9e4;text-align:right;">− ${inv.currency} ${fmt(Number(inv.platform_commission))}</td>
  </tr>
  <tr>
    <td style="border:1px solid #e8e9e4;">Tax (5%)</td>
    <td style="border:1px solid #e8e9e4;text-align:right;">− ${inv.currency} ${fmt(Number(inv.tax))}</td>
  </tr>
  <tr style="background:#edf5df;">
    <td style="border:1px solid #c8dba0;"><strong>Net payout to you</strong></td>
    <td style="border:1px solid #c8dba0;text-align:right;"><strong>${inv.currency} ${fmt(Number(inv.net_amount))}</strong></td>
  </tr>
</table>`;
}

// ── Email builders per type ────────────────────────────────────────────────

function buildBookingRequestToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "A guest");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const ctaUrl = `${APP_URL}/history?tab=pending`;
  return {
    to: String(host.email),
    subject: `New booking request for ${booking.sport} — SharedXP`,
    html: emailHtml(
      `New booking request, ${hostName}!`,
      [
        `<strong>${reqName}</strong> wants to book a <strong>${booking.sport}</strong> session with you.`,
        `📅 <strong>Date:</strong> ${booking.requested_date} &nbsp; ⏰ <strong>Time:</strong> ${booking.requested_time}`,
        `💰 <strong>Price:</strong> ${booking.currency} ${Number(booking.price).toFixed(2)}`,
        `Log in to your SharedXP account and visit your Pending Bookings to accept or decline.`,
      ],
      ctaUrl,
      "View Booking Request",
    ),
  };
}

function buildBookingAcceptedToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Your host");
  const ctaUrl = `${APP_URL}/payment/${booking.id}`;
  return {
    to: String(requester.email),
    subject: `${hostName} accepted your booking — proceed to payment`,
    html: emailHtml(
      `Great news, ${reqName}!`,
      [
        `<strong>${hostName}</strong> has accepted your <strong>${booking.sport}</strong> booking request.`,
        `📅 <strong>Date:</strong> ${booking.requested_date} &nbsp; ⏰ <strong>Time:</strong> ${booking.requested_time}`,
        `💰 <strong>Price:</strong> ${booking.currency} ${Number(booking.price).toFixed(2)}`,
        `Click the button below to complete your payment and confirm the experience.`,
      ],
      ctaUrl,
      "Proceed to Payment",
    ),
  };
}

function buildBookingDeclinedToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "The host");
  const reason = String(booking.decline_reason ?? "No reason provided.");
  const ctaUrl = `${APP_URL}/history?tab=pending`;
  return {
    to: String(requester.email),
    subject: `Your booking request was declined — SharedXP`,
    html: emailHtml(
      `Booking request declined`,
      [
        `Unfortunately, <strong>${hostName}</strong> was unable to accept your <strong>${booking.sport}</strong> booking on ${booking.requested_date}.`,
        `<strong>Reason given:</strong> <em>"${reason}"</em>`,
        `Don't worry — there are other great hosts on SharedXP. Browse and find your next experience!`,
      ],
      `${APP_URL}/locals`,
      "Find Another Host",
    ),
  };
}

function buildPaymentProcessedToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "Your guest");
  const ctaUrl = `${APP_URL}/history`;
  return {
    to: String(host.email),
    subject: `Payment processed for your ${booking.sport} session — SharedXP`,
    html: emailHtml(
      `Payment released, ${hostName}!`,
      [
        `Great news! The payment for your <strong>${booking.sport}</strong> session with <strong>${reqName}</strong> on ${booking.requested_date} has been processed and released to you.`,
        `Here is your invoice summary:`,
      ],
      ctaUrl,
      "View History",
      invoiceTable(invoice) + `<p style="margin:16px 0 0;font-size:13px;color:#888;">Please allow 3–5 business days for the funds to appear in your registered bank account.</p>`,
    ),
  };
}

function buildExperienceConfirmedToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "Your guest");
  const ctaUrl = `${APP_URL}/history?tab=pending`;
  return {
    to: String(host.email),
    subject: `${reqName} confirmed your experience — leave a review`,
    html: emailHtml(
      `Experience confirmed!`,
      [
        `<strong>${reqName}</strong> has confirmed that your <strong>${booking.sport}</strong> experience on ${booking.requested_date} took place.`,
        `Payment has been processed. Please check your history and leave a review for your guest.`,
      ],
      ctaUrl,
      "Leave a Review",
    ),
  };
}

function buildDisputeOpenedToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  dispute: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "The guest");
  const ctaUrl = `${APP_URL}/dispute-response/${dispute.id}`;
  return {
    to: String(host.email),
    subject: `A guest has raised a dispute for your session — SharedXP`,
    html: emailHtml(
      `Dispute raised, ${hostName}`,
      [
        `<strong>${reqName}</strong> has reported that the <strong>${booking.sport}</strong> experience on ${booking.requested_date} did not take place as expected.`,
        `<strong>Their explanation:</strong>`,
        `<blockquote style="margin:0;padding:12px 16px;background:#fff8f0;border-left:3px solid #f59e0b;border-radius:4px;font-style:italic;color:#4b3a2a;">"${String(dispute.requester_explanation)}"</blockquote>`,
        `Please submit your side of the story within 48 hours so our team can resolve this fairly.`,
      ],
      ctaUrl,
      "Submit My Response",
    ),
  };
}

function buildDisputeEmergencyToCS(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown> | null,
  dispute: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "Guest");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const amount = invoice ? `${invoice.currency} ${Number(invoice.gross_amount).toFixed(2)}` : `${booking.currency} ${Number(booking.price).toFixed(2)}`;
  const ctaUrl = `${APP_URL}/admin/disputes`;
  return {
    to: CS_EMAIL,
    subject: `⚠️ DISPUTE OPENED — Booking ${String(booking.id).slice(0, 8)} — Action Required`,
    html: emailHtml(
      "⚠️ Dispute Requires Review",
      [
        `A dispute has been opened and requires customer service attention.`,
        `<strong>Guest:</strong> ${reqName} (${requester.email})`,
        `<strong>Host:</strong> ${hostName} (${host.email})`,
        `<strong>Sport:</strong> ${booking.sport} &nbsp;|&nbsp; <strong>Date:</strong> ${booking.requested_date}`,
        `<strong>Amount held:</strong> ${amount}`,
        `<strong>Guest's explanation:</strong>`,
        `<blockquote style="margin:0;padding:12px 16px;background:#fff8f0;border-left:3px solid #ef4444;border-radius:4px;font-style:italic;color:#4b1a1a;">"${String(dispute.requester_explanation)}"</blockquote>`,
        `<strong>Host response:</strong> ${dispute.host_response ? `"${dispute.host_response}"` : "<em>Pending</em>"}`,
        `<strong style="color:#ef4444;">Payment is currently held. Do not release until resolved.</strong>`,
      ],
      ctaUrl,
      "View Dispute Dashboard",
    ),
  };
}

function buildDisputeHostRespondedToCS(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  dispute: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "Guest");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const ctaUrl = `${APP_URL}/admin/disputes`;
  return {
    to: CS_EMAIL,
    subject: `Host responded to Dispute — Booking ${String(booking.id).slice(0, 8)}`,
    html: emailHtml(
      "Host has responded to the dispute",
      [
        `<strong>${hostName}</strong> has submitted a response to the dispute raised by <strong>${reqName}</strong>.`,
        `<strong>Host's response:</strong>`,
        `<blockquote style="margin:0;padding:12px 16px;background:#f0f8ff;border-left:3px solid #3b82f6;border-radius:4px;font-style:italic;color:#1a3a5c;">"${String(dispute.host_response)}"</blockquote>`,
        `Both accounts are now available for review. Please make a decision.`,
      ],
      ctaUrl,
      "View Dispute Dashboard",
    ),
  };
}

function buildDisputeResolvedRefund(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(requester.email),
    subject: `Your refund has been approved — SharedXP`,
    html: emailHtml(
      `Refund approved`,
      [
        `Dear ${reqName}, after reviewing both accounts for your <strong>${booking.sport}</strong> session on ${booking.requested_date}, our team has decided to issue a full refund.`,
        `Please allow 5–7 business days for the funds to appear on your original payment method.`,
        `We're sorry for the inconvenience and hope to see you on SharedXP again soon.`,
      ],
      `${APP_URL}/locals`,
      "Find Another Host",
    ),
  };
}

function buildDisputeResolvedPaidHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown>,
): { to: string; subject: string; html: string }[] {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  return [
    {
      to: String(requester.email),
      subject: `Dispute resolved — SharedXP`,
      html: emailHtml(
        `Dispute resolved`,
        [
          `Dear ${reqName}, after reviewing both accounts for your <strong>${booking.sport}</strong> session on ${booking.requested_date}, our team found that the experience was delivered as agreed.`,
          `The payment has been released to the host. If you have further concerns, please contact us at support@sharedxp.com.`,
        ],
        `${APP_URL}/history`,
        "View History",
      ),
    },
    {
      to: String(host.email),
      subject: `Dispute resolved — payment released — SharedXP`,
      html: emailHtml(
        `Payment released, ${hostName}!`,
        [
          `Our customer service team has reviewed the dispute for your <strong>${booking.sport}</strong> session on ${booking.requested_date} and found in your favour.`,
          `Payment has been released to your registered bank account.`,
        ],
        `${APP_URL}/history`,
        "View History",
        invoiceTable(invoice),
      ),
    },
  ];
}

// ── Resend sender ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[booking-notify] Resend error ${res.status}:`, err);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { emailType, bookingRequestId, disputeId } = body as {
    emailType: string;
    bookingRequestId?: string;
    disputeId?: string;
  };

  if (!emailType) {
    return new Response(JSON.stringify({ error: "emailType required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch booking request + both profiles
  let booking: Record<string, unknown> | null = null;
  let requester: Record<string, unknown> | null = null;
  let host: Record<string, unknown> | null = null;
  let invoice: Record<string, unknown> | null = null;
  let dispute: Record<string, unknown> | null = null;

  if (bookingRequestId) {
    const { data: br } = await db
      .from("booking_requests")
      .select("*")
      .eq("id", bookingRequestId)
      .maybeSingle();
    booking = br;

    if (booking) {
      const [rq, hs] = await Promise.all([
        db.from("profiles").select("*").eq("id", booking.requester_id).maybeSingle(),
        db.from("profiles").select("*").eq("id", booking.host_id).maybeSingle(),
      ]);
      requester = rq.data;
      host = hs.data;

      const { data: inv } = await db
        .from("invoices")
        .select("*")
        .eq("booking_request_id", bookingRequestId)
        .maybeSingle();
      invoice = inv;
    }
  }

  if (disputeId) {
    const { data: d } = await db
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .maybeSingle();
    dispute = d;
    if (dispute && !bookingRequestId) {
      const { data: br } = await db
        .from("booking_requests")
        .select("*")
        .eq("id", dispute.booking_request_id)
        .maybeSingle();
      booking = br;
      if (booking) {
        const [rq, hs] = await Promise.all([
          db.from("profiles").select("*").eq("id", booking.requester_id).maybeSingle(),
          db.from("profiles").select("*").eq("id", booking.host_id).maybeSingle(),
        ]);
        requester = rq.data;
        host = hs.data;
        const { data: inv } = await db
          .from("invoices")
          .select("*")
          .eq("booking_request_id", String(booking.id))
          .maybeSingle();
        invoice = inv;
      }
    }
  }

  if (!booking || !requester || !host) {
    return new Response(JSON.stringify({ error: "Booking or profile data not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    switch (emailType) {
      case "booking_request_to_host": {
        const e = buildBookingRequestToHost(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "booking_accepted_to_requester": {
        const e = buildBookingAcceptedToRequester(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "booking_declined_to_requester": {
        const e = buildBookingDeclinedToRequester(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "payment_processed_to_host": {
        if (!invoice) break;
        const e = buildPaymentProcessedToHost(booking, requester, host, invoice);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "experience_confirmed_to_host": {
        const e = buildExperienceConfirmedToHost(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "dispute_opened": {
        if (!dispute) break;
        const toHost = buildDisputeOpenedToHost(booking, requester, host, dispute);
        const toCS = buildDisputeEmergencyToCS(booking, requester, host, invoice, dispute);
        await Promise.all([
          sendEmail(toHost.to, toHost.subject, toHost.html),
          sendEmail(toCS.to, toCS.subject, toCS.html),
        ]);
        break;
      }
      case "dispute_host_responded": {
        if (!dispute) break;
        const e = buildDisputeHostRespondedToCS(booking, requester, host, dispute);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "dispute_resolved_refund": {
        const e = buildDisputeResolvedRefund(booking, requester);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "dispute_resolved_paid_host": {
        if (!invoice) break;
        const emails = buildDisputeResolvedPaidHost(booking, requester, host, invoice);
        await Promise.all(emails.map((e) => sendEmail(e.to, e.subject, e.html)));
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown emailType: ${emailType}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("[booking-notify] handler error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
