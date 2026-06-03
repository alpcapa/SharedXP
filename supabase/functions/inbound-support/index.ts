// Receives inbound emails forwarded by Resend to support@sharedxp.com
// and persists them to the support_messages table.
//
// Deploy:  supabase functions deploy inbound-support
// Secret:  supabase secrets set INBOUND_SUPPORT_SECRET=<random-string>
//
// In Resend dashboard → Domains → your domain → Inbound:
//   Endpoint: https://<project-ref>.supabase.co/functions/v1/inbound-support
//   Add header  x-webhook-secret: <same random string>

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET      = Deno.env.get("INBOUND_SUPPORT_SECRET") ?? "";

function extractName(raw: string): string {
  const match = raw.match(/^(.+?)\s*<[^>]+>$/);
  return match ? match[1].trim() : "";
}

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return raw.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate shared secret
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret")
      ?? new URL(req.url).searchParams.get("secret")
      ?? "";
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  const rawFrom    = String(payload.from ?? "");
  const fromEmail  = extractEmail(rawFrom);
  const fromName   = extractName(rawFrom) || String(payload.from_name ?? "");
  const subject    = String(payload.subject ?? "(no subject)");
  const bodyText   = typeof payload.text === "string" ? payload.text : null;
  const bodyHtml   = typeof payload.html === "string" ? payload.html : null;
  const replyToRaw = Array.isArray(payload.reply_to)
    ? String(payload.reply_to[0] ?? "")
    : String(payload.reply_to ?? "");
  const replyTo    = replyToRaw ? extractEmail(replyToRaw) : fromEmail;
  const resendId   = typeof payload.email_id === "string" ? payload.email_id : null;

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
