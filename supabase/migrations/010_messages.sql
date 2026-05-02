-- Per-booking chat messages. Supabase Realtime is enabled so both
-- participants receive new messages without polling.

CREATE TABLE IF NOT EXISTS public.messages (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id  UUID    NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  sender_id           UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content             TEXT    NOT NULL,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_booking_idx
  ON public.messages (booking_request_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants of the linked booking can read messages
DROP POLICY IF EXISTS "messages_read" ON public.messages;
CREATE POLICY "messages_read" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (br.requester_id = auth.uid() OR br.host_id = auth.uid())
    )
  );

-- Only participants can send messages
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (br.requester_id = auth.uid() OR br.host_id = auth.uid())
    )
  );

-- Participants can mark messages as read
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (br.requester_id = auth.uid() OR br.host_id = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Enable Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
