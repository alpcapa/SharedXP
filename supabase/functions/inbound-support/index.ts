// Receives inbound emails forwarded by Resend (via Svix webhook) to
// support@sharedxp.com, persists them to support_messages, and sends an
// auto-reply from noreply@sharedxp.com directing the sender to the Contact Center.
//
// Deploy:  supabase functions deploy inbound-support
// Secret:  supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET       = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL              = Deno.env.get("APP_URL") ?? "https://project-gq4ge.vercel.app";

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifySignature(body: string, headers: Headers): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // skip verification if secret not configured

  const msgId        = headers.get("svix-id");
  const msgTimestamp = headers.get("svix-timestamp");
  const msgSignature = headers.get("svix-signature");

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject if timestamp is more than 5 minutes old
  const ts = parseInt(msgTimestamp, 10);
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;

  const signedContent = `${msgId}.${msgTimestamp}.${body}`;
  const secretBytes   = base64Decode(WEBHOOK_SECRET.replace(/^whsec_/, ""));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // svix-signature header: "v1,<base64> v1,<base64> ..."
  return msgSignature.split(" ").some((s) => s.replace(/^v1,/, "") === computed);
}

function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return m ? m[1].trim() : raw.trim();
}

function extractName(raw: string): string {
  const m = raw.match(/^(.+?)\s*<[^>]+>$/);
  return m ? m[1].trim() : "";
}

async function sendAutoReply(toEmail: string, toName: string, originalSubject: string): Promise<void> {
  if (!RESEND_API_KEY || !toEmail) return;

  const greeting = toName ? `Dear ${toName},` : "Dear Sender,";
  const p = (text: string) =>
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#444;">${text}</p>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#1a1a1a;padding:20px 32px;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;">SharedXP Support</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${p(greeting)}
          ${p("Unfortunately we are unable to respond to emails sent directly to support@sharedxp.com.")}
          ${p(`Please visit our <a href="${APP_URL}/contact" style="color:#1a1a1a;font-weight:600;">Contact Center</a> to reach us — our contact form goes directly to our support team.`)}
          ${p("Thank you for your understanding.")}
          <hr style="border:none;border-top:1px solid #e8e9e4;margin:24px 0 16px"/>
          <p style="margin:0 0 4px;font-size:14px;color:#444;">Sincerely,</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#444;">SharedXP Support</p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eeeeee;">
          <p style="margin:0;font-size:12px;color:#aaa;">
            © ${new Date().getFullYear()} SharedXP &nbsp;·&nbsp;
            <a href="${APP_URL}/contact" style="color:#aaa;text-decoration:none;">Contact Center</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SharedXP <noreply@sharedxp.com>",
      to: [toEmail],
      subject: `Re: ${originalSubject}`,
      html,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();

  if (!(await verifySignature(body, req.headers))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  // Resend wraps inbound data under payload.data
  const data = (payload.data ?? payload) as Record<string, unknown>;

  const rawFrom   = String(data.from ?? "");
  const fromEmail = extractEmail(rawFrom);
  const fromName  = extractName(rawFrom) || String(data.from_name ?? "");
  const subject   = String(data.subject ?? "(no subject)");
  const emailId   = typeof data.email_id === "string" ? data.email_id : null;

  // Resend's inbound webhook omits the body — store metadata only
  const replyToRaw = Array.isArray(data.reply_to)
    ? String(data.reply_to[0] ?? "")
    : String(data.reply_to ?? "");
  const replyTo  = replyToRaw ? extractEmail(replyToRaw) : fromEmail;

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await db.from("support_messages").insert({
    from_email: fromEmail,
    from_name:  fromName,
    subject,
    reply_to:   replyTo,
    resend_id:  emailId,
    status:     "autoreplied",
  });

  if (error) {
    console.error("[inbound-support] insert error:", error);
    return new Response("Internal error", { status: 500 });
  }

  // Send auto-reply in background — do not block the 200 OK to Resend
  sendAutoReply(replyTo, fromName, subject).catch((e) =>
    console.error("[inbound-support] auto-reply error:", e)
  );

  return new Response("OK", { status: 200 });
});
