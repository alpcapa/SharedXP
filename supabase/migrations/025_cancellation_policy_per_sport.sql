-- Move cancellation_policy from host_profiles to host_sports so each sport
-- offering can carry its own policy.
ALTER TABLE host_sports
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'flexible'
  CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

ALTER TABLE host_profiles
  DROP COLUMN IF EXISTS cancellation_policy;
