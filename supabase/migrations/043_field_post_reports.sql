-- Creates field_post_reports to track user-reported field posts, and expands
-- the field_posts delete policy so admins can remove inappropriate posts.

CREATE TABLE IF NOT EXISTS public.field_post_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES public.field_posts(id) ON DELETE CASCADE,
  reporter_id UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'dismissed'))
);

ALTER TABLE public.field_post_reports ENABLE ROW LEVEL SECURITY;

-- Any user (including anonymous) can file a report
CREATE POLICY "field_post_reports_insert" ON public.field_post_reports
  FOR INSERT WITH CHECK (true);

-- Only admins can read reports
CREATE POLICY "field_post_reports_select" ON public.field_post_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can update reports (e.g. dismiss)
CREATE POLICY "field_post_reports_update" ON public.field_post_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Extend field_posts delete policy to also allow admin deletion
DROP POLICY IF EXISTS "field_posts_delete" ON public.field_posts;
CREATE POLICY "field_posts_delete" ON public.field_posts
  FOR DELETE USING (
    auth.uid() = poster_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
