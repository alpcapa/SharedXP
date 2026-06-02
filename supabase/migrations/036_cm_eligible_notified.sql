ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cm_eligible_notified boolean NOT NULL DEFAULT false;
