-- Allow updating existing field posts in place and store the post rating.

ALTER TABLE public.field_posts
  ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "field_posts_update" ON public.field_posts;
CREATE POLICY "field_posts_update" ON public.field_posts
  FOR UPDATE USING (auth.uid() = poster_id)
  WITH CHECK (auth.uid() = poster_id);

GRANT UPDATE ON public.field_posts TO authenticated;
