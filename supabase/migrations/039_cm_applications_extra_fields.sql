-- Add phone and profile_url fields to cm_applications

ALTER TABLE cm_applications ADD COLUMN phone       TEXT NOT NULL DEFAULT '';
ALTER TABLE cm_applications ADD COLUMN profile_url TEXT NOT NULL DEFAULT '';
