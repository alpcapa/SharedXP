-- Track which users have liked which field posts.
-- This enables per-user like state (heart turns red when liked)
-- and prevents duplicate likes.

CREATE TABLE IF NOT EXISTS public.field_post_likes (
  post_id    UUID        NOT NULL REFERENCES public.field_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS field_post_likes_user_idx ON public.field_post_likes (user_id);

ALTER TABLE public.field_post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can read likes.
DROP POLICY IF EXISTS "field_post_likes_public_read" ON public.field_post_likes;
CREATE POLICY "field_post_likes_public_read" ON public.field_post_likes
  FOR SELECT USING (true);

-- Authenticated users can add their own likes.
DROP POLICY IF EXISTS "field_post_likes_insert" ON public.field_post_likes;
CREATE POLICY "field_post_likes_insert" ON public.field_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authenticated users can remove their own likes.
DROP POLICY IF EXISTS "field_post_likes_delete" ON public.field_post_likes;
CREATE POLICY "field_post_likes_delete" ON public.field_post_likes
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT ON public.field_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.field_post_likes TO authenticated;

-- Trigger: keep field_posts.likes in sync atomically.
CREATE OR REPLACE FUNCTION public.update_field_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.field_posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.field_posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS field_post_likes_count_trigger ON public.field_post_likes;
CREATE TRIGGER field_post_likes_count_trigger
  AFTER INSERT OR DELETE ON public.field_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_field_post_likes_count();
