-- Replaces the two-step client-side history sync (separate DELETE then INSERT)
-- with a single atomic DB function. Previously, if the DELETE succeeded but
-- the subsequent INSERT failed (network error, crash), the bookings table was
-- left empty for that user/role until the next sync. Now both operations are
-- in the same transaction: either both commit or both roll back.
--
-- Called from AuthContext.syncBookings via supabase.rpc("sync_user_bookings").
-- RLS is enforced (no SECURITY DEFINER); users can only sync their own rows.

CREATE OR REPLACE FUNCTION public.sync_user_bookings(
  p_user_id uuid,
  p_role    text,
  p_rows    jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bookings
  WHERE user_id = p_user_id AND role = p_role;

  IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.bookings (
      user_id, role,
      event_name, sport, counterparty_name, counterparty_photo,
      photo, photo_gallery,
      rating, host_ratings, attendee_rating,
      review, shared_to_field,
      completed_at, confirmation_status, confirmed_at, payment_released
    )
    SELECT
      p_user_id,
      p_role,
      COALESCE(r->>'event_name', ''),
      COALESCE(r->>'sport', ''),
      COALESCE(r->>'counterparty_name', ''),
      COALESCE(r->>'counterparty_photo', ''),
      COALESCE(r->>'photo', ''),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'photo_gallery', '[]'::jsonb))),
      COALESCE((r->>'rating')::integer, 0),
      COALESCE(r->'host_ratings', '{}'::jsonb),
      COALESCE((r->>'attendee_rating')::integer, 0),
      COALESCE(r->>'review', ''),
      COALESCE((r->>'shared_to_field')::boolean, false),
      NULLIF(r->>'completed_at', '')::timestamptz,
      COALESCE(r->>'confirmation_status', 'pending'),
      NULLIF(r->>'confirmed_at', '')::timestamptz,
      COALESCE((r->>'payment_released')::boolean, false)
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_bookings(uuid, text, jsonb) TO authenticated;
