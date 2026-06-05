// Supabase "Send Email" auth hook — powered by Resend.
// Deploy with: supabase functions deploy send-email
// Then register the hook in the Supabase dashboard under
// Authentication → Hooks → Send Email.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sharedxp.com";
// APP_URL must match the production origin listed in Supabase Dashboard →
// Authentication → URL Configuration → Redirect URLs (and Site URL).
// Set it as an Edge Function secret:
//   supabase secrets set APP_URL=https://project-gq4ge.vercel.app
const APP_URL = Deno.env.get("APP_URL") ?? "https://project-gq4ge.vercel.app";

interface EmailData {
  token?: string;
  token_hash?: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

interface HookPayload {
  user: { email: string; [key: string]: unknown };
  email_data: EmailData;
}

function confirmationUrl(
  tokenHash: string,
  actionType: string,
  redirectTo: string | undefined,
): string {
  if (actionType === "recovery") {
    // Use redirectTo when provided (already validated by Supabase's allow-list).
    // Fall back to APP_URL/reset-password if absent or malformed.
    let base = `${APP_URL}/reset-password`;
    if (redirectTo) {
      try {
        new URL(redirectTo); // validate
        base = redirectTo;
      } catch {
        // malformed URL — use APP_URL fallback
      }
    }

    const url = new URL(base);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", actionType);
    return url.toString();
  }

  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: actionType,
  });
  return `${APP_URL}/auth/confirm?${params}`;
}

function emailHtml(heading: string, body: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${heading}</title>
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
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a1a;">${heading}</h1>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#444;">${body}</p>
              <a href="${ctaUrl}"
                 style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;">
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
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:12px;color:#aaa;line-height:1.5;">
                  This is a noreply email, please <a href="${APP_URL}/contact" style="color:#aaa;text-decoration:underline;">contact us</a> if you need support.
                </td>
                <td style="font-size:12px;color:#aaa;text-align:right;white-space:nowrap;padding-left:16px;">
                  © ${new Date().getFullYear()} SharedXP
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmail(
  actionType: string,
  userEmail: string,
  ctaUrl: string,
): { subject: string; html: string } {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your SharedXP account",
        html: emailHtml(
          "You're almost in!",
          `Welcome to SharedXP. Click the button below to confirm your email address <strong>${userEmail}</strong> and activate your account.`,
          ctaUrl,
          "Confirm email",
        ),
      };

    case "recovery":
      return {
        subject: "Reset your SharedXP password",
        html: emailHtml(
          "Reset your password",
          "We received a request to reset the password for your SharedXP account. Click the button below to choose a new password. If you didn't make this request, you can safely ignore this email.",
          ctaUrl,
          "Reset password",
        ),
      };

    case "invite":
      return {
        subject: "You've been invited to SharedXP",
        html: emailHtml(
          "You're invited!",
          `You've been invited to join SharedXP. Click the button below to accept your invitation and set up your account.`,
          ctaUrl,
          "Accept invitation",
        ),
      };

    case "email_change":
    case "email_change_new":
    case "email_change_current":
      return {
        subject: "Email confirmation required for your SharedXP account",
        html: emailHtml(
          "Email confirmation required",
          "Please click the button below to confirm your email on your SharedXP account. After confirmation, you will be able to login with your new email and old password.",
          ctaUrl,
          "Confirm email",
        ),
      };

    default:
      return {
        subject: "Email confirmation required for your SharedXP account",
        html: emailHtml(
          "Email confirmation required",
          "Please click the button below to confirm your email on your SharedXP account. After confirmation, you will be able to login with your new email and old password.",
          ctaUrl,
          "Confirm email",
        ),
      };
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: HookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user, email_data } = payload;
  const { email_action_type, token_hash, token } = email_data;

  const verificationToken = token_hash || token || "";
  const ctaUrl = confirmationUrl(verificationToken, email_action_type, email_data.redirect_to);
  const { subject, html } = buildEmail(email_action_type, user.email, ctaUrl);

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: user.email,
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text();
    console.error("Resend error:", resendRes.status, errorText);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
