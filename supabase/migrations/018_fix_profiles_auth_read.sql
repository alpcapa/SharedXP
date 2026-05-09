-- Fix circular RLS dependency introduced by migrations 014 and 017.
--
-- Migration 014 added an admin check to booking_requests_read:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
--
-- Migration 017 added profiles_booking_read:
--   EXISTS (SELECT 1 FROM booking_requests WHERE ...)
--
-- These create a cycle: querying booking_requests evaluates its SELECT policy,
-- which queries profiles, which evaluates profiles_booking_read, which queries
-- booking_requests again. PostgreSQL detects the recursion and the query
-- silently returns empty results — hosts see no booking requests at all.
--
-- Fix: drop profiles_booking_read and instead allow any authenticated user to
-- read any profile row. Unauthenticated (public) access remains limited to host
-- profiles only, preserving the intent of migration 015.

DROP POLICY IF EXISTS "profiles_booking_read" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (is_host = TRUE OR auth.uid() IS NOT NULL);
