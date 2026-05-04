-- Allow admins to read booking_requests (needed to show dispute details)
DROP POLICY IF EXISTS "booking_requests_read" ON public.booking_requests;
CREATE POLICY "booking_requests_read" ON public.booking_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Allow admins to update booking_requests (needed for dispute resolution)
DROP POLICY IF EXISTS "booking_requests_update" ON public.booking_requests;
CREATE POLICY "booking_requests_update" ON public.booking_requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    auth.uid() = requester_id
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Allow either booking participant or an admin to update invoices (needed for
-- host-triggered auto-confirm and admin dispute resolution)
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id
        AND (
          br.requester_id = auth.uid()
          OR br.host_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
          )
        )
    )
  );
