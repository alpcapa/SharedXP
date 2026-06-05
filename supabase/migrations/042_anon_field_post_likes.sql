-- Allow anyone (including anonymous visitors) to like field posts.
-- Likes are tracked in localStorage client-side; this function just adjusts
-- the counter. SECURITY DEFINER lets anon bypass RLS on field_posts.

CREATE OR REPLACE FUNCTION public.adjust_field_post_likes(p_post_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_likes integer;
BEGIN
  UPDATE public.field_posts
  SET likes = GREATEST(0, likes + p_delta)
  WHERE id = p_post_id
  RETURNING likes INTO new_likes;
  RETURN COALESCE(new_likes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_field_post_likes(uuid, integer) TO anon, authenticated;
