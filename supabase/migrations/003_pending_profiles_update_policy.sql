-- Allow UPDATE on pending_profiles so a repeat sign-up with the same email
-- (e.g. user re-registers after deleting their account) can overwrite the
-- existing pending row.
--
-- NOTE: This policy must remain open (USING TRUE) rather than restricting to
-- auth.email() = email, because the upsert is performed at sign-up time by an
-- anonymous (unauthenticated) user — auth.email() would be NULL at that point.
-- Risk is low: rows contain no passwords, are deleted immediately after
-- confirmation, and the data in the row is the same profile data the user just
-- entered on the sign-up form.

DROP POLICY IF EXISTS "pending_profiles_update" ON public.pending_profiles;
CREATE POLICY "pending_profiles_update" ON public.pending_profiles
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
