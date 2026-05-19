-- Fix booking_requests whose requester_id points to a stale profile UUID.
--
-- Background: when a user account is deleted and re-created (common during
-- testing), the new auth session gets a different UUID. Any booking_requests
-- created under the old UUID remain visible to the host (who is still the
-- host), but are invisible to the guest because their current auth.uid() no
-- longer matches requester_id.
--
-- Strategy: for each pair of profiles that share the same full_name (case-
-- insensitive), treat the one with the LATER created_at as the "live" account
-- and re-point any booking_requests still owned by the earlier profile to the
-- live one. Messages sent by the old requester are re-attributed too.
--
-- This is safe to run multiple times (idempotent): once the requester_ids are
-- updated the old profile no longer owns any booking_requests, so the UPDATE
-- becomes a no-op on subsequent runs.

DO $$
DECLARE
  rec RECORD;
  updated_br  INT;
  updated_msg INT;
BEGIN
  FOR rec IN
    SELECT
      older.id  AS old_id,
      newer.id  AS new_id,
      older.full_name
    FROM public.profiles older
    JOIN public.profiles newer
      ON  lower(newer.full_name) = lower(older.full_name)
      AND newer.id        <> older.id
      AND newer.created_at > older.created_at
    -- Only act when the older profile still has orphaned booking_requests
    -- that the newer profile does NOT own.
    WHERE EXISTS (
      SELECT 1 FROM public.booking_requests
      WHERE requester_id = older.id
    )
  LOOP
    -- Re-assign booking_requests
    UPDATE public.booking_requests
    SET    requester_id = rec.new_id,
           updated_at   = NOW()
    WHERE  requester_id = rec.old_id;

    GET DIAGNOSTICS updated_br = ROW_COUNT;

    -- Re-attribute messages (sender)
    UPDATE public.messages
    SET    sender_id  = rec.new_id
    WHERE  sender_id  = rec.old_id;

    GET DIAGNOSTICS updated_msg = ROW_COUNT;

    RAISE NOTICE 'Merged profile "%" (% → %): % booking_requests, % messages',
      rec.full_name, rec.old_id, rec.new_id, updated_br, updated_msg;
  END LOOP;
END;
$$;
