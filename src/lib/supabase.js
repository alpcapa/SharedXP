import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://bwdkelprrvhztpviiujo.supabase.co";
const FALLBACK_KEY = "sb_publishable_eR4cMdFvm8y4RGBRJfUe2g_BrqlDLFP";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseUrl = FALLBACK_URL;
try {
  if (rawUrl?.trim()) supabaseUrl = new URL(rawUrl.trim()).origin;
} catch {
  supabaseUrl = FALLBACK_URL;
}

const supabaseAnonKey =
  typeof rawKey === "string" && rawKey.trim() ? rawKey.trim() : FALLBACK_KEY;

// Use implicit flow so email-confirmation links embed tokens in the URL hash
// (#access_token=…) rather than a PKCE code (?code=…).  Hash-based tokens
// need no code_verifier and work in every browser context — Safari, iOS native
// Mail (SFSafariViewController), Gmail/WKWebView, and any in-app browser.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: "implicit" },
});
export { supabaseUrl, supabaseAnonKey };

// Connectivity check — fires once at module load and logs a clear diagnostic
// to the browser console if Supabase is unreachable.  This helps identify
// missing / wrong env-var values in Vercel deployments (the fallback key is
// used when VITE_SUPABASE_ANON_KEY is not set, which causes all auth to fail).
fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: { apikey: supabaseAnonKey },
  signal: AbortSignal.timeout?.(8000),
})
  .then((res) => {
    if (!res.ok) {
      console.error(
        `[SharedXP] Supabase connectivity check failed (HTTP ${res.status}).` +
        " Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings."
      );
    }
  })
  .catch(() => {
    console.error(
      "[SharedXP] Cannot reach Supabase at " + supabaseUrl + "." +
      " Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings," +
      " and ensure the Supabase project is not paused (free-tier projects pause after 1 week of inactivity)."
    );
  });
