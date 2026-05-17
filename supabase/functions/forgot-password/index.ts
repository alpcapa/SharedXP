import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sharedxp.com";
const APP_URL = Deno.env.get("APP_URL") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": APP_URL || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Reset your SharedXP password</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="background:#1a1a1a;padding:28px 40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">SharedXP</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a1a;">Reset your password</h1>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#444;">
                We received a request to reset the password for your SharedXP account.
                Click the button below to choose a new password.
                If you didn't make this request, you can safely ignore this email.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;">
                Reset password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;">
              <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                If the button above doesn't work, copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color:#1a1a1a;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © ${new Date().getFullYear()} SharedXP · All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Server is not configured." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const normalizedEmail = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return new Response(JSON.stringify({ error: "Please provide a valid email address." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Determine the reset-password page URL. The frontend passes its own origin
  // so the link works on any deployment (preview, staging, production) without
  // needing the URL in Supabase's redirect allow-list.
  const frontendResetUrl =
    typeof body.redirectTo === "string" && body.redirectTo
      ? body.redirectTo
      : `${APP_URL}/reset-password`;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check if user exists.
  const adminApi = adminClient.auth.admin as {
    getUserByEmail?: (email: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };

  let found = false;
  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(normalizedEmail);
    if (error) {
      console.error("getUserByEmail error:", error);
      return new Response(JSON.stringify({ error: "Failed to process request." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    found = !!data?.user?.id;
  } else {
    let page = 1;
    const perPage = 200;
    let searching = true;
    while (searching) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers error:", error);
        return new Response(JSON.stringify({ error: "Failed to process request." }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const users = data?.users ?? [];
      if (users.some((u) => (u.email ?? "").trim().toLowerCase() === normalizedEmail)) {
        found = true;
        searching = false;
      } else if (users.length < perPage) {
        searching = false;
      } else {
        page += 1;
      }
    }
  }

  if (!found) {
    return new Response(
      JSON.stringify({ error: "Sorry, this email does not exist in our database." }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // Generate a recovery link via the admin API. This produces a hashed_token
  // that the client can verify with supabase.auth.verifyOtp — no Supabase
  // redirect allow-list needed, so any deployment URL works.
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
    options: { redirectTo: frontendResetUrl },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("generateLink error:", linkError);
    return new Response(JSON.stringify({ error: "Failed to generate reset link." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Build the direct reset URL the user will click. Using token_hash + verifyOtp
  // on the client side means no URL allow-list check is required.
  const resetUrl = (() => {
    const url = new URL(frontendResetUrl);
    url.searchParams.set("token_hash", linkData.properties.hashed_token);
    url.searchParams.set("type", "recovery");
    return url.toString();
  })();

  // Send email via Resend.
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Reset your SharedXP password",
      html: resetEmailHtml(resetUrl),
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend error:", resendRes.status, errText);
    return new Response(JSON.stringify({ error: "Failed to send reset email." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
