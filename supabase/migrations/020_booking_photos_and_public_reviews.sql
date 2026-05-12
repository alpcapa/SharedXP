-- Add host_photos column so hosts can also attach photos when rating a guest.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS host_photos TEXT[] NOT NULL DEFAULT '{}';

-- Grant anonymous SELECT access so unauthenticated public profile pages
-- (guest profile, host profile) can read booking_request review data.
-- The narrowing is done by the per-table RLS policies below and in 019.
GRANT SELECT ON public.booking_requests TO anon;

-- Allow public reading of booking_requests where the HOST has left a rating
-- for the guest.  This makes host ratings visible on the guest's public profile
-- page (mirrors booking_requests_host_reviews_public from 019 which covers the
-- guest→host direction).
DROP POLICY IF EXISTS "booking_requests_guest_reviews_public" ON public.booking_requests;
CREATE POLICY "booking_requests_guest_reviews_public" ON public.booking_requests
  FOR SELECT USING (status = 'completed' AND host_rating > 0);
