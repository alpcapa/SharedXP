-- Temporary store for sign-up profile data so it survives cross-browser email
-- confirmation (e.g. sign up in Safari, confirm in an iOS in-app browser).
-- Rows are deleted immediately after the data is applied to the profiles table.
-- Passwords are never stored here (stripped in the client before insertion).

CREATE TABLE IF NOT EXISTS public.pending_profiles (
  email TEXT PRIMARY KEY,
  data  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pending_profiles ENABLE ROW LEVEL SECURITY;

-- INSERT: open because the user is not yet authenticated at sign-up time.
DROP POLICY IF EXISTS "pending_profiles_insert" ON public.pending_profiles;
CREATE POLICY "pending_profiles_insert" ON public.pending_profiles
  FOR INSERT WITH CHECK (TRUE);

-- SELECT: restricted to the authenticated user's own email. The session is
-- active when _doApplyPendingProfile reads this row (auth callbacks have the
-- confirmed session), so auth.email() is always set at read time.
DROP POLICY IF EXISTS "pending_profiles_select" ON public.pending_profiles;
CREATE POLICY "pending_profiles_select" ON public.pending_profiles
  FOR SELECT USING (auth.email() = email);

-- DELETE: restricted to the authenticated user whose email matches the row,
-- preventing unauthenticated callers from removing other users' pending data.
DROP POLICY IF EXISTS "pending_profiles_delete" ON public.pending_profiles;
CREATE POLICY "pending_profiles_delete" ON public.pending_profiles
  FOR DELETE USING (auth.email() = email);

