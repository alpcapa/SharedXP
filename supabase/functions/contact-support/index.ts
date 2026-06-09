// Receives contact form submissions from unauthenticated users.
// Protection: honeypot field + in-memory rate limiting (5 req/hour per IP and email).
//
// Deploy: supabase functions deploy contact-support

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-memory rate limiter — resets on cold start, sufficient for a contact form
const submissions = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const prev = (submissions.get(key) ?? []).filter((t) => t > cutoff);
  if (prev.length >= 5) return true;
  submissions.set(key, [...prev, now]);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS_HEADERS });
  }

  const { fromEmail, fromName, subject, message, honeypot } = body;

  if (!fromEmail || !subject || !message) {
    return new Response(
      JSON.stringify({ error: "Missing required fields." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Honeypot — bots fill hidden fields; return fake success so they don't retry
  if (honeypot) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Rate limiting by IP and email
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  if ((ip && isRateLimited(`ip:${ip}`)) || isRateLimited(`email:${fromEmail.toLowerCase()}`)) {
    return new Response(
      JSON.stringify({ error: "Too many messages. Please try again later." }),
      { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
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
