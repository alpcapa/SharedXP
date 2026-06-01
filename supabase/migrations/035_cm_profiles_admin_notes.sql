-- Add admin_notes to cm_profiles for internal record-keeping on status changes.
ALTER TABLE cm_profiles
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NOT NULL DEFAULT '';
