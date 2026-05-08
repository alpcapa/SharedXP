-- Add postcode for neighbourhood-level geocoding and store computed coordinates
-- on host_profiles so the Explore map reads from DB instead of geocoding client-side.

ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS postcode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
