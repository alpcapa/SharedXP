-- Re-grant field_post_likes permissions and recreate policies idempotently.
-- Mirrors the approach of migration 033 for field_posts.
-- Addresses cases where grants were lost due to a table drop/recreate cycle
-- or where migration 023 was applied without the GRANT clauses taking effect.

GRANT SELECT ON public.field_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.field_post_likes TO authenticated;

DROP POLICY IF EXISTS "field_post_likes_public_read" ON public.field_post_likes;
CREATE POLICY "field_post_likes_public_read" ON public.field_post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "field_post_likes_insert" ON public.field_post_likes;
CREATE POLICY "field_post_likes_insert" ON public.field_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "field_post_likes_delete" ON public.field_post_likes;
CREATE POLICY "field_post_likes_delete" ON public.field_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure the likes-count trigger and function are in place.
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

-- Resync field_posts.likes to match actual counts in field_post_likes,
-- in case any rows got out of sync (e.g. trigger was absent for a period).
UPDATE public.field_posts fp
SET likes = (
  SELECT COUNT(*) FROM public.field_post_likes fpl WHERE fpl.post_id = fp.id
);
