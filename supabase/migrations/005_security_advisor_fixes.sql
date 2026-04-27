-- Fix Security Advisor warnings:
--   1. "Public Can Execute SECURITY DEFINER function" — public.handle_new_user()
--   2. "Signed-In Users Can Execute SECURITY DEFINER function" — public.handle_new_user()
--
-- handle_new_user() is only ever called by the on_auth_user_created TRIGGER,
-- which runs under the trigger-owner's privileges (bypassing normal permission
-- checks).  Application code and the PostgREST API never call it directly.
-- Revoking EXECUTE from all client roles prevents accidental or malicious
-- direct invocations without affecting trigger behaviour at all.
--
-- NOTE: Supabase grants EXECUTE to PUBLIC by default on newly-created functions.
-- Revoking from PUBLIC covers anonymous visitors; revoking from the named roles
-- (anon, authenticated) makes the intent explicit and survives future Supabase
-- role changes.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Remaining Security Advisor warnings — intentional design decisions:
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Warning: "RLS Policy Always True" — public.pending_profiles (INSERT & UPDATE)
--   The INSERT policy uses WITH CHECK (TRUE) and the UPDATE policy uses
--   USING (TRUE) WITH CHECK (TRUE).  Both are intentional: sign-up happens
--   before the user has an authenticated session, so auth.email() / auth.uid()
--   would be NULL at write time.  The table stores no passwords, rows are
--   deleted immediately after email confirmation, and data written here is the
--   same data the user just typed on the sign-up form.  Acceptable risk.
--
-- Warning: "RLS Policy Always True" — public.profiles (profiles_host_read)
--   Host profiles are intentionally public so the /explore page works for
--   unauthenticated visitors.  The policy only exposes rows where is_host = TRUE
--   and contains no sensitive payment or authentication data.  Acceptable risk.
--
-- Warning: "Leaked Password Protection" — Auth
--   This is a Supabase Auth dashboard setting (not configurable via SQL).
--   To enable it: Supabase Dashboard → Authentication → Settings →
--   "Enable leaked password protection" → Save.
--   When enabled, Supabase rejects passwords that appear in the HaveIBeenPwned
--   database, preventing users from choosing compromised passwords.
