-- Add admin_note to disputes so admins can leave a verdict message
-- visible to both parties after resolution.

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS admin_note TEXT;
