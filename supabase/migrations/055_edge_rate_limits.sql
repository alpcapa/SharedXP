-- Lightweight rate-limit log for Edge Functions.
-- Each row records one attempt keyed by a function-scoped string
-- (e.g. "forgot_password:user@example.com"). Edge Functions count
-- rows within a rolling window and reject requests over the threshold.
-- Old rows are pruned opportunistically by the function itself.

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id         bigserial     PRIMARY KEY,
  key        text          NOT NULL,
  created_at timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edge_rate_limits_key_created_at_idx
  ON public.edge_rate_limits (key, created_at);

-- No public access; service-role key (used by Edge Functions) bypasses RLS.
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
