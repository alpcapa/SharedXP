-- Allow booking participants to read each other's basic profile information.
--
-- Background: migration 015 replaced the open profiles_select_open policy
-- (USING true) with a narrower policy: host profiles are publicly readable
-- and non-host profiles are only readable by the profile owner
-- (is_host = TRUE OR auth.uid() = id).
--
-- This broke the booking_requests query in useBookingRequests.js, which joins
-- profiles on both host_id and requester_id. When a host fetches their booking
-- requests the join on requester_profile returns NULL for non-host requesters
-- (the host is neither the requester's owner nor a host row), so the display
-- falls back to "Guest" and the profile link leads to "Profile not found".
--
-- Fix: add a policy that allows an authenticated user to read any profile that
-- is a booking partner — i.e. they share at least one booking_request row as
-- host or requester. This is scoped to authenticated users only and requires
-- an actual booking relationship, so it does not re-open profiles to the public.

CREATE POLICY "profiles_booking_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests
      WHERE (requester_id = auth.uid() AND host_id = id)
         OR (host_id = auth.uid() AND requester_id = id)
    )
  );
