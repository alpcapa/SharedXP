-- Adds account-level suspension and closure flags to profiles,
-- and grants admins UPDATE access on all profiles.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_current_user_admin());
