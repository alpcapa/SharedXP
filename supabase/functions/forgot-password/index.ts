import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sharedxp.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FALLBACK_MAX_LIST_PAGES = 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEMP_PASSWORD_LENGTH = 12;

const generateTemporaryPassword = () => {
  // Excludes ambiguous characters (I, l, 1, O, 0) to reduce user confusion.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
  const randomBytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH * 2));
  const maxUnbiasedByte = 256 - (256 % chars.length);
  let out = "";
  for (const byte of randomBytes) {
    if (byte >= maxUnbiasedByte) continue;
    out += chars[byte % chars.length];
    if (out.length === TEMP_PASSWORD_LENGTH) break;
  }
  while (out.length < TEMP_PASSWORD_LENGTH) {
    const refill = crypto.getRandomValues(new Uint8Array(1))[0];
    if (refill >= maxUnbiasedByte) continue;
    out += chars[refill % chars.length];
  }
  return out;
};

const emailHtml = (temporaryPassword: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Temporary password for SharedXP</title>
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
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a1a;">Your temporary password</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
                We received a forgot-password request for your SharedXP account.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444;">
                Temporary password: <strong style="font-size:18px;letter-spacing:0.3px;">${temporaryPassword}</strong>
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#666;">
                Please log in with this temporary password and update your password in Edit Profile.
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

const sendTemporaryPasswordEmail = async (email: string, temporaryPassword: string) => {
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Your temporary SharedXP password",
      html: emailHtml(temporaryPassword),
    }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text();
    console.error("Resend error:", resendRes.status, errorText);
    return false;
  }

  return true;
};

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

  let body: { email?: string };
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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let foundUser: { id: string; email?: string } | null = null;

  const adminApi = adminClient.auth.admin as {
    getUserByEmail?: (email: string) => Promise<{
      data: { user: { id: string; email?: string } | null };
      error: { message: string } | null;
    }>;
  };

  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(normalizedEmail);
    if (error) {
      console.error("getUserByEmail error:", error);
      return new Response(JSON.stringify({ error: "Failed to process request." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    foundUser = data?.user ?? null;
  } else {
    let page = 1;
    const perPage = 200;

    while (!foundUser) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers error:", error);
        return new Response(JSON.stringify({ error: "Failed to process request." }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const users = data?.users ?? [];
      foundUser =
        users.find((user) => (user.email ?? "").trim().toLowerCase() === normalizedEmail) ?? null;

      if (users.length < perPage) break;
      page += 1;
      if (page > FALLBACK_MAX_LIST_PAGES) break;
    }
  }

  if (!foundUser?.id) {
    return new Response(
      JSON.stringify({ error: "Sorry, this email does not exist in our database." }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(foundUser.id, {
    password: temporaryPassword,
  });
  if (updateError) {
    console.error("updateUserById error:", updateError);
    return new Response(JSON.stringify({ error: "Failed to process request." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const emailSent = await sendTemporaryPasswordEmail(normalizedEmail, temporaryPassword);
  if (!emailSent) {
    try {
      await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: APP_URL ? `${APP_URL}/reset-password` : undefined,
      });
    } catch (recoveryError) {
      console.error("resetPasswordForEmail fallback failed:", recoveryError);
    }

    return new Response(
      JSON.stringify({
        error:
          "Failed to send temporary password email. A password recovery email was triggered instead.",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
