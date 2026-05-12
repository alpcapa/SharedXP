-- Add per-party rating fields to booking_requests so each participant can
-- rate the other directly on the booking_request row (no cross-user writes
-- needed; the existing update RLS policy already allows both sides to edit).

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS guest_rating         INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_host_ratings   JSONB    NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guest_review         TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_photos         TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guest_rated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS host_rating          INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_review          TEXT     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_rated_at        TIMESTAMPTZ;

-- Allow the public to read completed booking_requests that have a guest rating
-- so that host profile pages can display reviews (mirrors 008_public_host_reviews
-- which grants the same for the legacy `bookings` table).
DROP POLICY IF EXISTS "booking_requests_host_reviews_public" ON public.booking_requests;
CREATE POLICY "booking_requests_host_reviews_public" ON public.booking_requests
  FOR SELECT USING (status = 'completed' AND guest_rating > 0);
