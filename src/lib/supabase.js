import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rawUrl?.trim() || !rawKey?.trim()) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example)."
  );
}

let supabaseUrl;
try {
  supabaseUrl = new URL(rawUrl.trim()).origin;
} catch {
  throw new Error(`VITE_SUPABASE_URL is not a valid URL: ${rawUrl}`);
}

const supabaseAnonKey = rawKey.trim();

// Implicit flow: email-confirmation links embed tokens in the URL hash
// (#access_token=…) — no PKCE code_verifier needed, works in every browser
// context (Safari, iOS Mail/SFSafariViewController, in-app browsers).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: "implicit" },
});
export { supabaseUrl, supabaseAnonKey };
