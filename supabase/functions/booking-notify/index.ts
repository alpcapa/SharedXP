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
  "Access-Control-Allow-Origin": APP_URL || "*",
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
  invoice: Record<string, unknown> | null,
): { to: string; subject: string; html: string } {
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "Your guest");
  const ctaUrl = `${APP_URL}/history?tab=pending`;
  return {
    to: String(host.email),
    subject: `${reqName} confirmed your experience — payment released`,
    html: emailHtml(
      `Experience confirmed — payment released!`,
      [
        `<strong>${reqName}</strong> has confirmed that your <strong>${booking.sport}</strong> experience on ${booking.requested_date} took place.`,
        `Your payment has been released. Please allow 3–5 business days for the funds to appear in your registered bank account.`,
      ],
      ctaUrl,
      "Leave a Review",
      invoice ? invoiceTable(invoice) : "",
    ),
  };
}

function buildExperienceCompletedToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "your host");
  const ctaUrl = `${APP_URL}/history?tab=pending`;
  return {
    to: String(requester.email),
    subject: `How was your ${booking.sport} experience with ${hostName}? Please confirm`,
    html: emailHtml(
      `How was your experience?`,
      [
        `Hi ${reqName}! We hope your <strong>${booking.sport}</strong> session with <strong>${hostName}</strong> on ${booking.requested_date} went great.`,
        `Please head to your booking history to confirm the experience took place and leave a rating for your host.`,
        `Please note that if you do not confirm the experience, it will be automatically confirmed after 72 hours.`,
      ],
      ctaUrl,
      "Confirm & Rate Your Host",
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

function buildNewMessage(
  booking: Record<string, unknown>,
  recipient: Record<string, unknown>,
  senderName: string,
): { to: string; subject: string; html: string } {
  const recipientName = String((recipient.full_name ?? `${recipient.first_name ?? ""} ${recipient.last_name ?? ""}`.trim()) || "there");
  const ctaUrl = `${APP_URL}/chat/${booking.id}`;
  return {
    to: String(recipient.email),
    subject: `New message from ${senderName} — SharedXP`,
    html: emailHtml(
      `New message, ${recipientName}!`,
      [
        `<strong>${senderName}</strong> sent you a message about your <strong>${booking.sport}</strong> booking on ${booking.requested_date}.`,
        `Log in to your SharedXP account to read and reply.`,
      ],
      ctaUrl,
      "View Message",
    ),
  };
}

const POLICY_LABELS: Record<string, string> = {
  flexible: "Flexible",
  moderate: "Moderate",
  strict: "Strict",
};

function buildCancelledPrePaymentToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String((requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim()) || "A guest");
  const hostName = String((host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim()) || "Host");
  return {
    to: String(host.email),
    subject: `Booking cancelled — ${booking.sport} on ${booking.requested_date}`,
    html: emailHtml(
      `Booking cancelled, ${hostName}`,
      [
        `<strong>${reqName}</strong> has cancelled their <strong>${booking.sport}</strong> booking for <strong>${booking.requested_date}</strong> at <strong>${booking.requested_time}</strong>.`,
        `No payment was made, so there is nothing further to action. Your slot is now open again.`,
      ],
      `${APP_URL}/history?tab=pending`,
      "View Bookings",
    ),
  };
}

function buildCancelledPostPaymentToHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String((requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim()) || "A guest");
  const hostName = String((host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim()) || "Host");

  const refundPct = Number(booking.refund_pct ?? 0);
  const policyLabel = POLICY_LABELS[String(booking.cancellation_policy ?? "flexible")] ?? "Flexible";
  const gross = Number(invoice.gross_amount);
  const net = Number(invoice.net_amount);
  const currency = String(invoice.currency);
  const fmt = (n: number) => n.toFixed(2);

  const guestRefundAmt = gross * refundPct / 100;
  const hostPayoutAmt  = net   * (100 - refundPct) / 100;

  const refundLine =
    refundPct === 100
      ? `Under the <strong>${policyLabel}</strong> cancellation policy, the guest is entitled to a <strong>full refund</strong> of ${currency} ${fmt(guestRefundAmt)}.`
      : refundPct === 0
      ? `Under the <strong>${policyLabel}</strong> cancellation policy, <strong>no refund</strong> is due to the guest.`
      : `Under the <strong>${policyLabel}</strong> cancellation policy, the guest receives a <strong>${refundPct}% refund</strong> of ${currency} ${fmt(guestRefundAmt)}.`;

  const hostLine =
    hostPayoutAmt > 0.005
      ? `Your payout for this session: <strong>${currency} ${fmt(hostPayoutAmt)}</strong>. Please allow 3–5 business days.`
      : `No payout will be made for this session.`;

  return {
    to: String(host.email),
    subject: `Booking cancelled after payment — ${booking.sport} on ${booking.requested_date}`,
    html: emailHtml(
      `Booking cancelled, ${hostName}`,
      [
        `<strong>${reqName}</strong> has cancelled their paid <strong>${booking.sport}</strong> session scheduled for <strong>${booking.requested_date}</strong> at <strong>${booking.requested_time}</strong>.`,
        `<strong>Amount charged:</strong> ${currency} ${fmt(gross)}`,
        refundLine,
        hostLine,
      ],
      `${APP_URL}/history?tab=pending`,
      "View Bookings",
    ),
  };
}

function buildPaymentConfirmationToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "your host");
  const ctaUrl = `${APP_URL}/chat/${booking.id}`;
  return {
    to: String(requester.email),
    subject: `Booking confirmed — ${booking.sport} with ${hostName} on ${booking.requested_date}`,
    html: emailHtml(
      `Booking confirmed, ${reqName}!`,
      [
        `Your payment for the <strong>${booking.sport}</strong> session with <strong>${hostName}</strong> on <strong>${booking.requested_date}</strong> at <strong>${booking.requested_time}</strong> is confirmed.`,
        `<strong>Amount charged:</strong> ${booking.currency} ${Number(booking.price).toFixed(2)}`,
        `Message ${hostName} directly to arrange meeting details.`,
      ],
      ctaUrl,
      `Message ${hostName}`,
    ),
  };
}

function buildCancelledToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown> | null,
): { to: string; subject: string; html: string } {
  const reqName = String((requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim()) || "there");
  const hostName = String((host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim()) || "your host");

  if (!invoice) {
    return {
      to: String(requester.email),
      subject: `Booking cancelled — ${booking.sport} on ${booking.requested_date}`,
      html: emailHtml(
        `Booking cancelled`,
        [
          `Your <strong>${booking.sport}</strong> booking with <strong>${hostName}</strong> on <strong>${booking.requested_date}</strong> has been cancelled.`,
          `No payment was taken — you have not been charged.`,
        ],
        `${APP_URL}/locals`,
        "Find Another Host",
      ),
    };
  }

  const refundPct = Number(booking.refund_pct ?? 0);
  const policyLabel = POLICY_LABELS[String(booking.cancellation_policy ?? "flexible")] ?? "Flexible";
  const gross = Number(invoice.gross_amount);
  const currency = String(invoice.currency);
  const fmt = (n: number) => n.toFixed(2);
  const guestRefundAmt = gross * refundPct / 100;

  const refundLine =
    refundPct === 100
      ? `Under the <strong>${policyLabel}</strong> cancellation policy, you are entitled to a <strong>full refund</strong> of ${currency} ${fmt(guestRefundAmt)}. Please allow 5–7 business days.`
      : refundPct === 0
      ? `Under the <strong>${policyLabel}</strong> cancellation policy, <strong>no refund</strong> is due for this cancellation.`
      : `Under the <strong>${policyLabel}</strong> cancellation policy, you will receive a <strong>${refundPct}% refund</strong> of ${currency} ${fmt(guestRefundAmt)}. Please allow 5–7 business days.`;

  return {
    to: String(requester.email),
    subject: `Booking cancelled — ${booking.sport} on ${booking.requested_date}`,
    html: emailHtml(
      `Booking cancelled`,
      [
        `Your <strong>${booking.sport}</strong> booking with <strong>${hostName}</strong> on <strong>${booking.requested_date}</strong> has been cancelled.`,
        refundLine,
      ],
      `${APP_URL}/history`,
      "View History",
    ),
  };
}

function buildDisputeOpenedToRequester(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const reqName = String((requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim()) || "there");
  return {
    to: String(requester.email),
    subject: `Dispute received — we're reviewing your case — SharedXP`,
    html: emailHtml(
      `Dispute received, ${reqName}`,
      [
        `We've received your dispute for the <strong>${booking.sport}</strong> session on <strong>${booking.requested_date}</strong>.`,
        `Our team will review both accounts and get back to you within 24–48 hours. The host has been notified and given the opportunity to respond.`,
        `In the meantime, you can view the status of your booking in your history.`,
      ],
      `${APP_URL}/history?tab=pending`,
      "View Your Booking",
    ),
  };
}

function buildDisputeResolvedRefund(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
): { to: string; subject: string; html: string }[] {
  const reqName = String(requester.full_name ?? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() ?? "there");
  const hostName = String(host.full_name ?? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() ?? "Host");
  return [
    {
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
    },
    {
      to: String(host.email),
      subject: `Dispute outcome — SharedXP`,
      html: emailHtml(
        `Dispute outcome, ${hostName}`,
        [
          `After reviewing the dispute for your <strong>${booking.sport}</strong> session on ${booking.requested_date}, our team has decided to refund the guest.`,
          `Payment will not be released for this session. If you have any questions, please contact us at support@sharedxp.com.`,
        ],
        `${APP_URL}/history`,
        "View History",
      ),
    },
  ];
}

function buildDisputeResolvedPaidHost(
  booking: Record<string, unknown>,
  requester: Record<string, unknown>,
  host: Record<string, unknown>,
  invoice: Record<string, unknown> | null,
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
        invoice ? invoiceTable(invoice) : "",
      ),
    },
  ];
}

// ── CM email builders ──────────────────────────────────────────────────────

function buildCmEligible(
  user: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const name = String(user.full_name ?? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(user.email),
    subject: "Congratulations — you've been selected to become our new Community Manager",
    html: emailHtml(
      `Congratulations, ${name}!`,
      [
        `You've been selected to become our new Community Manager.`,
        `As a host with an outstanding track record on SharedXP, you're now eligible to apply for the Community Manager programme.`,
        `Community Managers earn 5% commission on every booking made by users they refer, and get their own unique invite code to share with sports enthusiasts in their city.`,
        `Click below to learn more and apply.`,
      ],
      `${APP_URL}/host-settings`,
      "Learn More & Apply",
    ),
  };
}

function buildCmApplicationReceived(
  applicant: Record<string, unknown>,
): { to: string; subject: string; html: string } {
  const name = String(applicant.full_name ?? `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(applicant.email),
    subject: "We received your CM application — SharedXP",
    html: emailHtml(
      `Application received, ${name}!`,
      [
        `Thank you for applying to become a SharedXP Community Manager.`,
        `Our team will review your application and get back to you within 5 business days.`,
        `In the meantime, keep sharing your love of sport and check out our Community Manager Policy for more details.`,
      ],
      `${APP_URL}/community-manager-policy`,
      "Read CM Policy",
    ),
  };
}

function buildCmInterview(
  applicant: Record<string, unknown>,
  adminNotes: string,
): { to: string; subject: string; html: string } {
  const name = String(applicant.full_name ?? `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(applicant.email),
    subject: "You've been shortlisted — SharedXP CM interview",
    html: emailHtml(
      `Great news, ${name}!`,
      [
        `Your application to become a SharedXP Community Manager has been shortlisted.`,
        `Our team would like to have a brief chat with you to learn more about your experience and how you'd grow the SharedXP community.`,
        ...(adminNotes ? [`<strong>Message from the team:</strong> ${adminNotes}`] : []),
        `We'll be in touch via email to schedule a call. Keep an eye on your inbox!`,
      ],
      `${APP_URL}/community-manager-policy`,
      "Learn More",
    ),
  };
}

function buildCmAccepted(
  applicant: Record<string, unknown>,
  inviteCode: string,
  adminNotes: string,
): { to: string; subject: string; html: string } {
  const name = String(applicant.full_name ?? `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(applicant.email),
    subject: "Welcome to the team — you're a SharedXP Community Manager!",
    html: emailHtml(
      `Welcome aboard, ${name}!`,
      [
        `Congratulations! You've been accepted as a SharedXP Community Manager.`,
        `Your personal invite code is:`,
        `<div style="text-align:center;margin:20px 0;"><span style="font-size:24px;font-weight:700;letter-spacing:2px;background:#f5f5f2;padding:12px 24px;border-radius:8px;border:2px solid #1a1a1a;">${inviteCode}</span></div>`,
        `Share this code with athletes and sports enthusiasts. Anyone who signs up using your code becomes your permanent referral, and you earn 5% commission on every completed booking they make.`,
        ...(adminNotes ? [`<strong>Message from the team:</strong> ${adminNotes}`] : []),
        `Log in to your SharedXP account to access your CM Dashboard and track your referrals and commissions.`,
      ],
      `${APP_URL}/cm-dashboard`,
      "Go to CM Dashboard",
    ),
  };
}

function buildCmDeclined(
  applicant: Record<string, unknown>,
  adminNotes: string,
): { to: string; subject: string; html: string } {
  const name = String(applicant.full_name ?? `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() ?? "there");
  return {
    to: String(applicant.email),
    subject: "Your CM application — SharedXP",
    html: emailHtml(
      `Application update, ${name}`,
      [
        `Thank you for your interest in becoming a SharedXP Community Manager.`,
        `After careful review, we're unable to move forward with your application at this time.`,
        ...(adminNotes ? [`<strong>Feedback from our team:</strong> ${adminNotes}`] : []),
        `We encourage you to continue enjoying SharedXP as a host or guest. You're welcome to reapply in the future.`,
      ],
      `${APP_URL}/locals`,
      "Explore SharedXP",
    ),
  };
}

function buildCmCommissionApproved(
  cm: Record<string, unknown>,
  commissionAmount: number,
  currency: string,
  bookingDetails: string,
): { to: string; subject: string; html: string } {
  const name = String(cm.full_name ?? `${cm.first_name ?? ""} ${cm.last_name ?? ""}`.trim() ?? "there");
  const fmt = (n: number) => Number(n).toFixed(2);
  return {
    to: String(cm.email),
    subject: `Commission approved — ${currency} ${fmt(commissionAmount)} — SharedXP`,
    html: emailHtml(
      `Commission approved, ${name}!`,
      [
        `Great news! A commission has been approved for your CM account.`,
        `<strong>Booking:</strong> ${bookingDetails}`,
        `<strong>Commission amount:</strong> ${currency} ${fmt(commissionAmount)}`,
        `Payment will be made via bank transfer within 10 business days. View your full commission history on your CM Dashboard.`,
      ],
      `${APP_URL}/cm-dashboard`,
      "View CM Dashboard",
    ),
  };
}

function buildCmStatusChange(
  cm: Record<string, unknown>,
  emailType: string,
  adminNotes = "",
): { to: string; subject: string; html: string } {
  const name = String(cm.full_name ?? `${cm.first_name ?? ""} ${cm.last_name ?? ""}`.trim() ?? "there");
  const configs: Record<string, { heading: string; lines: string[]; label: string }> = {
    cm_paused: {
      heading: `Your CM account has been paused`,
      lines: [
        `Hi ${name}, your SharedXP Community Manager account has been temporarily paused.`,
        ...(adminNotes ? [`<strong>Reason:</strong> ${adminNotes}`] : []),
        `While paused, your invite code will not be active and no new referrals will be attributed. Existing commissions are not affected.`,
        `Contact us at support@sharedxp.com if you have any questions.`,
      ],
      label: "Contact Support",
    },
    cm_banned: {
      heading: `Your CM account has been revoked`,
      lines: [
        `Hi ${name}, your SharedXP Community Manager status has been revoked.`,
        ...(adminNotes ? [`<strong>Reason:</strong> ${adminNotes}`] : []),
        `Any pending approved commissions will still be paid out. Please contact support@sharedxp.com if you believe this is an error.`,
      ],
      label: "Contact Support",
    },
    cm_reactivated: {
      heading: `Your CM account is active again, ${name}!`,
      lines: [
        `Great news! Your SharedXP Community Manager account has been re-activated.`,
        ...(adminNotes ? [`<strong>Note from the team:</strong> ${adminNotes}`] : []),
        `Your invite code is live again — start sharing and earning commissions!`,
      ],
      label: "Go to CM Dashboard",
    },
    cm_revoked: {
      heading: `Your CM status has been revoked`,
      lines: [
        `Hi ${name}, your SharedXP Community Manager status has been revoked.`,
        ...(adminNotes ? [`<strong>Reason:</strong> ${adminNotes}`] : []),
        `Any pending approved commissions will still be paid out. Please contact support@sharedxp.com if you believe this is an error.`,
      ],
      label: "Contact Support",
    },
  };
  const cfg = configs[emailType] ?? configs.cm_paused;
  return {
    to: String(cm.email),
    subject: `${cfg.heading} — SharedXP`,
    html: emailHtml(cfg.heading, cfg.lines, `${APP_URL}/help`, cfg.label),
  };
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

  const { emailType, bookingRequestId, disputeId, senderId, userId, adminNotes, inviteCode, commissionId } = body as {
    emailType: string;
    bookingRequestId?: string;
    disputeId?: string;
    senderId?: string;
    userId?: string;
    adminNotes?: string;
    inviteCode?: string;
    commissionId?: string;
  };

  if (!emailType) {
    return new Response(JSON.stringify({ error: "emailType required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── CM emails (no booking data required) ──────────────────────────────────
  if (emailType.startsWith("cm_")) {
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required for CM emails" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const { data: userProfile } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!userProfile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    try {
      switch (emailType) {
        case "cm_eligible": {
          const e = buildCmEligible(userProfile);
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_application_received": {
          const e = buildCmApplicationReceived(userProfile);
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_interview": {
          const e = buildCmInterview(userProfile, adminNotes ?? "");
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_accepted": {
          const e = buildCmAccepted(userProfile, inviteCode ?? "", adminNotes ?? "");
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_declined": {
          const e = buildCmDeclined(userProfile, adminNotes ?? "");
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_commission_approved": {
          let commAmount = 0;
          let currency = "EUR";
          let bookingDetails = "";
          if (commissionId) {
            const { data: comm } = await db
              .from("cm_commissions")
              .select("*, booking_request:booking_requests(sport, requested_date)")
              .eq("id", commissionId)
              .maybeSingle();
            if (comm) {
              commAmount = Number(comm.commission_amount);
              currency = String(comm.currency);
              bookingDetails = `${comm.booking_request?.sport ?? ""} on ${comm.booking_request?.requested_date ?? ""}`;
            }
          }
          const e = buildCmCommissionApproved(userProfile, commAmount, currency, bookingDetails);
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        case "cm_paused":
        case "cm_reactivated":
        case "cm_revoked":
        case "cm_banned": {
          const e = buildCmStatusChange(userProfile, emailType, adminNotes ?? "");
          await sendEmail(e.to, e.subject, e.html);
          break;
        }
        default:
          return new Response(JSON.stringify({ error: `Unknown CM emailType: ${emailType}` }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
      }
    } catch (e) {
      console.error("[booking-notify] CM email error:", e);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  // ── End CM emails ──────────────────────────────────────────────────────────

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
        const e = buildExperienceConfirmedToHost(booking, requester, host, invoice);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "experience_completed_to_requester": {
        const e = buildExperienceCompletedToRequester(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "dispute_opened": {
        if (!dispute) break;
        const toHost = buildDisputeOpenedToHost(booking, requester, host, dispute);
        const toRequesterDispute = buildDisputeOpenedToRequester(booking, requester);
        const toCS = buildDisputeEmergencyToCS(booking, requester, host, invoice, dispute);
        await Promise.all([
          sendEmail(toHost.to, toHost.subject, toHost.html),
          sendEmail(toRequesterDispute.to, toRequesterDispute.subject, toRequesterDispute.html),
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
      case "new_message": {
        const isRequesterSender = String(booking.requester_id) === senderId;
        const recipient = isRequesterSender ? host : requester;
        const senderProfile = isRequesterSender ? requester : host;
        const senderName = String((senderProfile.full_name ?? `${senderProfile.first_name ?? ""} ${senderProfile.last_name ?? ""}`.trim()) || "Someone");
        const e = buildNewMessage(booking, recipient, senderName);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "booking_cancelled_pre_payment_to_host": {
        const e = buildCancelledPrePaymentToHost(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "booking_cancelled_post_payment_to_host": {
        if (!invoice) break;
        const e = buildCancelledPostPaymentToHost(booking, requester, host, invoice);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "booking_cancelled_to_requester": {
        const e = buildCancelledToRequester(booking, requester, host, invoice);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "payment_confirmation_to_requester": {
        const e = buildPaymentConfirmationToRequester(booking, requester, host);
        await sendEmail(e.to, e.subject, e.html);
        break;
      }
      case "dispute_resolved_refund": {
        const emails = buildDisputeResolvedRefund(booking, requester, host);
        await Promise.all([
          ...emails.map((e) => sendEmail(e.to, e.subject, e.html)),
          sendEmail(CS_EMAIL, `[Dispute resolved — refunded] ${emails[0].subject}`, emails[0].html),
        ]);
        break;
      }
      case "dispute_resolved_paid_host": {
        const emails = buildDisputeResolvedPaidHost(booking, requester, host, invoice);
        await Promise.all([
          ...emails.map((e) => sendEmail(e.to, e.subject, e.html)),
          sendEmail(CS_EMAIL, `[Dispute resolved — paid host] ${emails[0].subject}`, emails[0].html),
        ]);
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
