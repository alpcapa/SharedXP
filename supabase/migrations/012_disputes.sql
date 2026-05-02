-- Disputes: opened when a requester declines confirmation of a completed
-- experience. Customer service reviews both accounts and resolves.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.disputes (
  id                     UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id     UUID    NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  requester_explanation  TEXT    NOT NULL,
  host_response          TEXT,
  opened_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  host_responded_at      TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  resolution             TEXT    CHECK (resolution IN ('refunded', 'paid_host')),
  resolved_by            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disputes_booking_idx
  ON public.disputes (booking_request_id);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Both participants can read disputes for their booking
DROP POLICY IF EXISTS "disputes_read" ON public.disputes;
CREATE POLICY "disputes_read" ON public.disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (br.requester_id = auth.uid() OR br.host_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Only the requester can open a dispute
DROP POLICY IF EXISTS "disputes_insert" ON public.disputes;
CREATE POLICY "disputes_insert" ON public.disputes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND br.requester_id = auth.uid()
    )
  );

-- Host can submit their response; admins can resolve
DROP POLICY IF EXISTS "disputes_update" ON public.disputes;
CREATE POLICY "disputes_update" ON public.disputes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND br.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
