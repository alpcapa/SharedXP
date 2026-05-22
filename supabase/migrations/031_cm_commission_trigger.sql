-- Auto-create a cm_commissions row when an invoice is released (payout triggered).
-- Fires on both the manual confirmExperience path and the auto-complete path.
-- Runs SECURITY DEFINER to bypass RLS on cm_commissions (only admins can INSERT
-- via RLS, but this function owner has full table access).
--
-- Depends on migration 030 (cm_profiles, cm_referrals, cm_commissions).
-- Skips silently if those tables do not exist yet so the migration is safe
-- to apply in any order.

CREATE OR REPLACE FUNCTION public.create_cm_commission_on_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id          UUID;
  v_cm_id            UUID;
  v_commission_rate  CONSTANT NUMERIC := 0.05;
BEGIN
  -- Only act when released_at transitions NULL → non-NULL
  IF NEW.released_at IS NULL OR OLD.released_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Guard: cm_commissions table must exist (migration 030 applied)
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cm_commissions'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT host_id INTO v_host_id
  FROM public.booking_requests
  WHERE id = NEW.booking_request_id;

  IF v_host_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Was this host referred by an active CM?
  SELECT r.cm_id INTO v_cm_id
  FROM public.cm_referrals r
  JOIN public.cm_profiles p ON p.id = r.cm_id
  WHERE r.referred_user_id = v_host_id
    AND p.status = 'active';

  IF v_cm_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert commission; ON CONFLICT is a no-op safety net (booking_request_id is UNIQUE)
  INSERT INTO public.cm_commissions (
    cm_id,
    booking_request_id,
    gmv,
    commission_amount,
    currency,
    status
  ) VALUES (
    v_cm_id,
    NEW.booking_request_id,
    NEW.gross_amount,
    ROUND(NEW.gross_amount * v_commission_rate, 2),
    NEW.currency,
    'pending'
  )
  ON CONFLICT (booking_request_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_commission_on_release ON public.invoices;
CREATE TRIGGER trg_cm_commission_on_release
  AFTER UPDATE OF released_at ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.create_cm_commission_on_release();
