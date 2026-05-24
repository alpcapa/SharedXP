-- Create a public-readable view that exposes only display-safe profile fields.
-- This lets unauthenticated visitors see reviewer names on host profile pages
-- without exposing private data (email, phone, birthday, address, gender).
-- The view runs with the security context of the creator so it bypasses the
-- RLS policy on profiles that restricts anon reads to is_host=TRUE rows.

CREATE OR REPLACE VIEW public.profile_names AS
  SELECT id, full_name, first_name, last_name
  FROM public.profiles;

GRANT SELECT ON public.profile_names TO anon, authenticated;
