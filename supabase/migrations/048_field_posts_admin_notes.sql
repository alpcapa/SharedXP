-- Adds admin_notes (JSON history) to field_posts for tracking post moderation actions.

ALTER TABLE public.field_posts ADD COLUMN IF NOT EXISTS admin_notes JSONB;
