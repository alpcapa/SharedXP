-- Allow public reading of hosted booking reviews for host profile display.
-- Visitors (including unauthenticated) need to read a host's received ratings
-- when browsing a host's profile page.  We expose only rows where the role is
-- 'hosted' and the attendee left a positive rating; the app selects only the
-- non-sensitive columns (counterparty_name, attendee_rating, sport, completed_at).

GRANT SELECT ON public.bookings TO anon;

DROP POLICY IF EXISTS "bookings_host_reviews_public" ON public.bookings;
CREATE POLICY "bookings_host_reviews_public" ON public.bookings
  FOR SELECT USING (role = 'hosted' AND attendee_rating > 0);
