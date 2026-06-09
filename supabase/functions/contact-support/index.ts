// Receives contact form submissions from unauthenticated users.
// Verifies the Cloudflare Turnstile token before inserting into support_messages.
//
// Deploy:  supabase functions deploy contact-support
// Secret:  supabase secrets set TURNSTILE_SECRET_KEY=<secret from Cloudflare Turnstile dashboard>

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TURNSTILE_SECRET     = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS_HEADERS });
  }

  const { fromEmail, fromName, subject, message, turnstileToken } = body;

  if (!fromEmail || !subject || !message || !turnstileToken) {
    return new Response(
      JSON.stringify({ error: "Missing required fields." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Verify Turnstile token with Cloudflare
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "";
  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: TURNSTILE_SECRET, response: turnstileToken, remoteip: ip }),
  });

  const verifyData = await verifyRes.json() as { success: boolean; "error-codes"?: string[] };
  if (!verifyData.success) {
    console.warn("[contact-support] Turnstile failed:", verifyData["error-codes"]);
    return new Response(
      JSON.stringify({ error: "CAPTCHA verification failed. Please try again." }),
      { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error } = await db.from("support_messages").insert({
    from_email: fromEmail.trim(),
    from_name:  (fromName ?? "").trim(),
    subject:    subject.trim(),
    body_text:  message.trim(),
    reply_to:   fromEmail.trim(),
    status:     "unread",
  });

  if (error) {
    console.error("[contact-support] insert error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
