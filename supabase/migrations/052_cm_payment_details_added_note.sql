-- Log a note in cm_profiles.admin_notes when a CM adds their payout details
-- after previously having none, so the admin sees "details arrived" in the
-- same thread as approvals/payments and knows they can proceed with payment.
-- The entry format matches appendNote in AdminPage.jsx.
--
-- Runs SECURITY DEFINER so the lookups on profiles and cm_commissions work
-- regardless of the RLS context of whoever performs the update.

CREATE OR REPLACE FUNCTION public.log_cm_payment_details_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notes        JSONB;
  v_name         TEXT;
  v_note_text    TEXT;
  v_has_approved BOOLEAN;
BEGIN
  -- Only act when payment_info transitions empty → non-empty
  IF COALESCE(TRIM(OLD.payment_info), '') <> '' OR COALESCE(TRIM(NEW.payment_info), '') = '' THEN
    RETURN NEW;
  END IF;

  -- Parse the existing thread: JSON array, legacy plain-text note, or empty
  IF COALESCE(TRIM(NEW.admin_notes), '') = '' THEN
    v_notes := '[]'::JSONB;
  ELSE
    BEGIN
      v_notes := NEW.admin_notes::JSONB;
      IF jsonb_typeof(v_notes) <> 'array' THEN
        v_notes := jsonb_build_array(jsonb_build_object('action', 'note', 'note', NEW.admin_notes, 'at', NULL));
      END IF;
    EXCEPTION WHEN others THEN
      v_notes := jsonb_build_array(jsonb_build_object('action', 'note', 'note', NEW.admin_notes, 'at', NULL));
    END;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), 'CM')
    INTO v_name
    FROM public.profiles
   WHERE id = NEW.user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.cm_commissions
     WHERE cm_id = NEW.id AND status = 'approved' AND paid_at IS NULL
  ) INTO v_has_approved;

  v_note_text := 'CM entered their payout details.'
    || CASE WHEN v_has_approved THEN ' Approved commissions can now be paid.' ELSE '' END;

  v_notes := v_notes || jsonb_build_object(
    'action', 'payment_details_added',
    'note',   v_note_text,
    'at',     to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'by',     COALESCE(v_name, 'CM')
  );
  NEW.admin_notes := v_notes::TEXT;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_payment_details_added ON public.cm_profiles;
CREATE TRIGGER trg_cm_payment_details_added
  BEFORE UPDATE OF payment_info ON public.cm_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_cm_payment_details_added();
