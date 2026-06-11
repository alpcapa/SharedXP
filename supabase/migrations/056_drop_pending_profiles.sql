-- pending_profiles was used in the original signup flow to persist profile
-- data across cross-browser email confirmation (sign up in Safari, confirm
-- in an iOS in-app browser).
--
-- The flow was replaced: signup data is now stored in Supabase Auth's
-- user_metadata (sharedxp_pending_profile) which travels with the JWT and
-- needs no separate table. No frontend code writes to pending_profiles;
-- the open anonymous INSERT policy is dead attack surface.
--
-- Drop the table and its policies to clean up the schema.

DROP TABLE IF EXISTS public.pending_profiles;
