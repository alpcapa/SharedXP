-- Grant API access to anon and authenticated roles.
-- Tables created via SQL migrations do not receive automatic grants in
-- Supabase; without these, every PostgREST query from the app returns
-- 403 Permission Denied regardless of RLS policies.

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.user_languages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_languages TO authenticated;

GRANT SELECT ON public.user_sports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_sports TO authenticated;

GRANT SELECT ON public.host_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.host_profiles TO authenticated;

GRANT SELECT ON public.host_sports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.host_sports TO authenticated;

GRANT SELECT ON public.host_sport_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.host_sport_images TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_profiles TO anon, authenticated;
