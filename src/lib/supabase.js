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
