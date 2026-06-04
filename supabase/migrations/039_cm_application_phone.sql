-- Add phone contact field to cm_applications for interview scheduling
ALTER TABLE cm_applications ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
