// Receives inbound emails forwarded by Resend (via Svix webhook) to
// support@sharedxp.com and persists them to the support_messages table.
//
// Deploy:  supabase functions deploy inbound-support
// Secret:  supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET       = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

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
  const bodyText  = typeof data.text === "string" ? data.text : null;
  const bodyHtml  = typeof data.html === "string" ? data.html : null;
  const replyToRaw = Array.isArray(data.reply_to)
    ? String(data.reply_to[0] ?? "")
    : String(data.reply_to ?? "");
  const replyTo   = replyToRaw ? extractEmail(replyToRaw) : fromEmail;
  const resendId  = typeof data.email_id === "string" ? data.email_id : null;

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await db.from("support_messages").insert({
    from_email: fromEmail,
    from_name:  fromName,
    subject,
    body_text:  bodyText,
    body_html:  bodyHtml,
    reply_to:   replyTo,
    resend_id:  resendId,
  });

  if (error) {
    console.error("[inbound-support] insert error:", error);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
