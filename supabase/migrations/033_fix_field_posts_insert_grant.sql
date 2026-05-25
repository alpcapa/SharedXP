-- Re-grant field_posts permissions and recreate the insert policy idempotently.
-- Safe to run on a database that already has the correct grants in place (no-op).
-- Addresses cases where migration 021 was applied without the GRANT clause,
-- or where the grants were lost due to a table drop/recreate cycle.

GRANT SELECT ON public.field_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_posts TO authenticated;

DROP POLICY IF EXISTS "field_posts_insert" ON public.field_posts;
CREATE POLICY "field_posts_insert" ON public.field_posts
  FOR INSERT WITH CHECK (auth.uid() = poster_id);
