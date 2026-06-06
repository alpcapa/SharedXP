-- Adds admin_notes (JSON history) to profiles for tracking moderation actions.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes JSONB;
