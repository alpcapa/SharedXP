-- Field posts: user-generated posts shared to "The Field" public feed.
-- Previously stored in browser localStorage only; this table makes them
-- persistent and visible across all devices and sessions.

CREATE TABLE IF NOT EXISTS public.field_posts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  poster_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role              TEXT        NOT NULL DEFAULT '',
  host_name         TEXT        NOT NULL DEFAULT '',
  host_photo        TEXT        NOT NULL DEFAULT '',
  sport             TEXT        NOT NULL DEFAULT '',
  city              TEXT        NOT NULL DEFAULT '',
  country           TEXT        NOT NULL DEFAULT '',
  caption           TEXT        NOT NULL DEFAULT '',
  photos            TEXT[]      NOT NULL DEFAULT '{}',
  likes             INTEGER     NOT NULL DEFAULT 0,
  source_request_id UUID        REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_posts_poster_idx     ON public.field_posts (poster_id);
CREATE INDEX IF NOT EXISTS field_posts_created_at_idx ON public.field_posts (created_at DESC);

ALTER TABLE public.field_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can read the public feed.
DROP POLICY IF EXISTS "field_posts_public_read" ON public.field_posts;
CREATE POLICY "field_posts_public_read" ON public.field_posts
  FOR SELECT USING (true);

-- Only the poster can create a field post.
DROP POLICY IF EXISTS "field_posts_insert" ON public.field_posts;
CREATE POLICY "field_posts_insert" ON public.field_posts
  FOR INSERT WITH CHECK (auth.uid() = poster_id);

-- Only the poster can delete their own post.
DROP POLICY IF EXISTS "field_posts_delete" ON public.field_posts;
CREATE POLICY "field_posts_delete" ON public.field_posts
  FOR DELETE USING (auth.uid() = poster_id);

GRANT SELECT ON public.field_posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.field_posts TO authenticated;
