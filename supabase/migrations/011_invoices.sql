-- Simulated payment invoices. One row per booking_request once payment
-- is confirmed. real Stripe integration replaces this later.

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id  UUID    NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  gross_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency            TEXT    NOT NULL DEFAULT 'EUR',
  paid_at             TIMESTAMPTZ,
  released_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Both participants can view the invoice for their booking
DROP POLICY IF EXISTS "invoices_read" ON public.invoices;
CREATE POLICY "invoices_read" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (br.requester_id = auth.uid() OR br.host_id = auth.uid())
    )
  );

-- Only the requester (payer) can create the invoice
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND br.requester_id = auth.uid()
    )
  );

-- Only the requester can update (e.g. set released_at on confirmation)
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND br.requester_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
