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

// Use implicit flow so email-confirmation links carry tokens in the URL hash
// rather than a PKCE code.  Hash-based tokens work in every browser context
// (Safari, SFSafariViewController, WKWebView used by Gmail/other mail apps)
// because no code_verifier stored in localStorage is required.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: "implicit" },
});
export { supabaseUrl, supabaseAnonKey };
