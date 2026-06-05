-- Fix CM commission attribution: commission should be earned when an invited
-- person makes a booking AS A GUEST (requester), not as a host.
-- Replaces the function from migration 031; trigger binding is unchanged.

CREATE OR REPLACE FUNCTION public.create_cm_commission_on_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id     UUID;
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

  SELECT requester_id INTO v_requester_id
  FROM public.booking_requests
  WHERE id = NEW.booking_request_id;

  IF v_requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Was this guest referred by an active CM?
  SELECT cm_id INTO v_cm_id
  FROM public.cm_referrals
  WHERE referred_user_id = v_requester_id
    AND cm_id IN (
      SELECT id FROM public.cm_profiles WHERE status = 'active'
    );

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
