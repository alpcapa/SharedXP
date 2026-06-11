-- Track when accounting has manually processed a guest refund.
-- Null = refund is still pending manual action; non-null = sent.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS refund_sent_at TIMESTAMPTZ;
