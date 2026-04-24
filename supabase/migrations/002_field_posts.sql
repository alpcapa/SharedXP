-- SharedXP Phase 2 schema additions
-- Adds field_posts + field_post_images tables for The Field feed,
-- and latitude/longitude columns on host_profiles for map support.

-- ── Geolocation for host profiles ──────────────────────────────────────────
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ── Field posts ──────────────────────────────────────────────────────────────
CREATE TABLE public.field_posts (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_name    TEXT          NOT NULL DEFAULT '',
  host_photo   TEXT          NOT NULL DEFAULT '',
  sport        TEXT          NOT NULL DEFAULT '',
  city         TEXT          NOT NULL DEFAULT '',
  country      TEXT          NOT NULL DEFAULT '',
  caption      TEXT          NOT NULL DEFAULT '',
  likes        INTEGER       NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE public.field_post_images (
  id             UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  field_post_id  UUID     NOT NULL REFERENCES public.field_posts(id) ON DELETE CASCADE,
  image_url      TEXT     NOT NULL,
  position       INTEGER  NOT NULL DEFAULT 0,
  UNIQUE (field_post_id, position)
);

-- ── Row-level security ───────────────────────────────────────────────────────
ALTER TABLE public.field_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_post_images ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read all field posts and their images.
CREATE POLICY "field_posts_public_read"
  ON public.field_posts FOR SELECT USING (TRUE);

-- Only the owning user may insert their own posts.
CREATE POLICY "field_posts_owner_insert"
  ON public.field_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owning user may delete their own posts.
CREATE POLICY "field_posts_owner_delete"
  ON public.field_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "field_post_images_public_read"
  ON public.field_post_images FOR SELECT USING (TRUE);

-- Images inherit ownership from their parent post.
CREATE POLICY "field_post_images_owner_insert"
  ON public.field_post_images FOR INSERT
  WITH CHECK (
    field_post_id IN (
      SELECT id FROM public.field_posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "field_post_images_owner_delete"
  ON public.field_post_images FOR DELETE
  USING (
    field_post_id IN (
      SELECT id FROM public.field_posts WHERE user_id = auth.uid()
    )
  );
