-- Allow admins to read all invoices (needed for Accounting tab in Admin Panel).
-- Without this policy admins could only read invoices for bookings they
-- personally participated in, which is not useful for accounting.
DROP POLICY IF EXISTS "invoices_admin_read" ON public.invoices;
CREATE POLICY "invoices_admin_read" ON public.invoices
  FOR SELECT USING (public.is_current_user_admin());
