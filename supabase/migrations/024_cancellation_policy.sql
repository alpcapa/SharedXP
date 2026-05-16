-- Cancellation policy tiers per host and policy snapshot per booking request.
-- Three tiers mirroring the Airbnb model:
--   flexible  — full refund if cancelled >24h before; no refund within 24h
--   moderate  — full refund >5 days; 50% refund 1-5 days; no refund <24h
--   strict    — 50% refund >7 days; no refund within 7 days

ALTER TABLE host_profiles
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'flexible'
  CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

-- Snapshot the host's policy at booking creation time so changing the policy
-- later does not retroactively affect existing bookings.
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

-- Refund percentage computed and stored at cancellation time (0, 50, or 100).
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS refund_pct NUMERIC(5,2);
