-- Allows admins to read all member profiles for the Members section.
-- Uses a SECURITY DEFINER function to avoid circular RLS on the profiles table.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (public.is_current_user_admin());
