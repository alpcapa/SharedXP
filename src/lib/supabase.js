import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

let normalizedUrl = "";
if (rawUrl) {
  try {
    normalizedUrl = new URL(rawUrl).origin;
  } catch {
    // Defer the warning to runtime — we still want the bundle to load so the
    // page can render a clear error rather than a blank white screen.
    console.error(
      `[supabase] VITE_SUPABASE_URL is not a valid URL: ${rawUrl}`
    );
  }
}

if (!normalizedUrl || !rawKey) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Auth and DB queries will fail at runtime. See .env.example."
  );
}

// Use placeholder values so createClient itself doesn't throw at import time.
// Any actual Supabase call will surface a clear network error if env is missing.
const safeUrl = normalizedUrl || "https://missing-supabase-url.invalid";
const safeKey = rawKey || "missing-supabase-anon-key";

// Implicit flow: email-confirmation links embed tokens in the URL hash
// (#access_token=…) — no PKCE code_verifier needed, works in every browser
// context (Safari, iOS Mail/SFSafariViewController, in-app browsers).
export const supabase = createClient(safeUrl, safeKey, {
  auth: { flowType: "implicit" },
});

export const supabaseUrl = normalizedUrl;
export const supabaseAnonKey = rawKey;
