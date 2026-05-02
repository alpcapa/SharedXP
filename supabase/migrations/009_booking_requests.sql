-- Booking requests: lifecycle table for the full booking flow from request
-- through completion / dispute. Separate from the `bookings` table which
-- stores completed history with reviews.

CREATE TABLE IF NOT EXISTS public.booking_requests (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id   UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_id        UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_sport_id  UUID    REFERENCES public.host_sports(id) ON DELETE SET NULL,
  sport          TEXT    NOT NULL DEFAULT '',
  requested_date DATE    NOT NULL,
  requested_time TEXT    NOT NULL DEFAULT '',
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'EUR',
  status         TEXT    NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending','accepted','payment_pending','in_progress',
      'completed','declined','cancelled',
      'disputed','resolved_paid_host','resolved_refunded'
    )),
  decline_reason    TEXT,
  experience_ends_at  TIMESTAMPTZ,
  auto_confirm_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_requests_requester_idx ON public.booking_requests (requester_id);
CREATE INDEX IF NOT EXISTS booking_requests_host_idx      ON public.booking_requests (host_id);
CREATE INDEX IF NOT EXISTS booking_requests_status_idx    ON public.booking_requests (status);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Both participants can read their own booking requests
DROP POLICY IF EXISTS "booking_requests_read" ON public.booking_requests;
CREATE POLICY "booking_requests_read" ON public.booking_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = host_id);

-- Only the requester can create a booking request
DROP POLICY IF EXISTS "booking_requests_insert" ON public.booking_requests;
CREATE POLICY "booking_requests_insert" ON public.booking_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Either participant can update (host accepts/declines; requester cancels/confirms)
DROP POLICY IF EXISTS "booking_requests_update" ON public.booking_requests;
CREATE POLICY "booking_requests_update" ON public.booking_requests
  FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = host_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = host_id);

GRANT SELECT, INSERT, UPDATE ON public.booking_requests TO authenticated;
