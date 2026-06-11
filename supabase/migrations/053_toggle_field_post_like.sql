-- Replaces the dual-path like system where adjust_field_post_likes updated
-- field_posts.likes directly while field_post_likes had an independent trigger,
-- creating a double-count risk if both paths ever fired.
--
-- New function toggle_field_post_like routes by auth state:
--   authenticated (p_user_id NOT NULL): insert/delete a field_post_likes row;
--     the existing field_post_likes_count_trigger maintains the counter.
--   anonymous (p_user_id NULL): apply p_delta directly to field_posts.likes,
--     same as the old adjust_field_post_likes (no user row to store).
--
-- The old adjust_field_post_likes function is left in place so any external
-- caller is not broken, but it is no longer used by the frontend.

CREATE OR REPLACE FUNCTION public.toggle_field_post_like(
  p_post_id  uuid,
  p_user_id  uuid    DEFAULT NULL,
  p_delta    integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_likes integer;
BEGIN
  IF p_user_id IS NOT NULL THEN
    IF p_delta > 0 THEN
      INSERT INTO public.field_post_likes (post_id, user_id)
      VALUES (p_post_id, p_user_id)
      ON CONFLICT DO NOTHING;
    ELSE
      DELETE FROM public.field_post_likes
      WHERE post_id = p_post_id AND user_id = p_user_id;
    END IF;
    -- Counter was updated atomically by field_post_likes_count_trigger.
    SELECT likes INTO v_likes FROM public.field_posts WHERE id = p_post_id;
  ELSE
    UPDATE public.field_posts
    SET likes = GREATEST(0, likes + p_delta)
    WHERE id = p_post_id
    RETURNING likes INTO v_likes;
  END IF;
  RETURN COALESCE(v_likes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_field_post_like(uuid, uuid, integer) TO anon, authenticated;
