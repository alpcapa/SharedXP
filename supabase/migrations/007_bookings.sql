-- Booking history (formerly localStorage `sharedxp-history-*` and
-- `sharedxp-host-history-*`). One row per (user, role, session) — the same
-- session naturally produces two rows when both attendee and host record it.
--
-- This denormalised shape mirrors the previous client-side data shape so the
-- existing HistoryPage normalisation logic keeps working unchanged.

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('attended', 'hosted')),
  event_name TEXT NOT NULL DEFAULT '',
  sport TEXT NOT NULL DEFAULT '',
  counterparty_name TEXT NOT NULL DEFAULT '',
  counterparty_photo TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  photo_gallery TEXT[] NOT NULL DEFAULT '{}',
  rating INTEGER NOT NULL DEFAULT 0,
  host_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  attendee_rating INTEGER NOT NULL DEFAULT 0,
  review TEXT NOT NULL DEFAULT '',
  shared_to_field BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  confirmation_status TEXT NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  payment_released BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_user_role_idx
  ON public.bookings (user_id, role);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_owner" ON public.bookings;
CREATE POLICY "bookings_owner" ON public.bookings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
