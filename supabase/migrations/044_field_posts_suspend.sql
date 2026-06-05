-- Adds suspended_at to field_posts so admins can temporarily hide a post,
-- and grants admins UPDATE access on field_posts.

ALTER TABLE public.field_posts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE POLICY "field_posts_update_admin" ON public.field_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
