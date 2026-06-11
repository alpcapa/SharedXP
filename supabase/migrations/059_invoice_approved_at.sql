-- Admin approval step before accounting releases payment to host.
-- approved_at: set by admin when they review and approve the invoice.
-- released_at: set by accounting after admin approval (already exists).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
