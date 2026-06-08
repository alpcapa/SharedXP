-- Auto-approve CM commissions when the payout threshold is reached.
--
-- Two triggers:
--   1. trg_cm_auto_approve_on_insert  — fires on every cm_commissions INSERT.
--      If the CM's total pending commissions (same currency) now equal or
--      exceed the €25 threshold, all their pending commissions for that
--      currency are immediately approved.
--
--   2. A daily scheduled edge function (cm-payout-sweep) handles the 45-day
--      fallback: any CM whose oldest pending commission is ≥ 45 days old gets
--      all their pending commissions (same currency) approved in one batch,
--      regardless of total amount.  That function is in
--      supabase/functions/cm-payout-sweep/index.ts.

-- payout_notified_at tracks which approved commissions have already triggered
-- an admin notification email, so the daily sweep never sends duplicates.
ALTER TABLE cm_commissions
  ADD COLUMN IF NOT EXISTS payout_notified_at TIMESTAMPTZ;

-- ── Constants ─────────────────────────────────────────────────────────────
-- Threshold is stored here for reference; the trigger hard-codes the same
-- value so it stays in sync with src/utils/cmCommission.js (CM_PAYOUT_THRESHOLD).

CREATE OR REPLACE FUNCTION public.cm_auto_approve_on_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_threshold CONSTANT NUMERIC := 25;
BEGIN
  -- Sum all pending commissions for this CM in the same currency,
  -- including the one just inserted.
  SELECT COALESCE(SUM(commission_amount), 0)
    INTO v_total
    FROM public.cm_commissions
   WHERE cm_id   = NEW.cm_id
     AND currency = NEW.currency
     AND status   = 'pending';

  IF v_total >= v_threshold THEN
    UPDATE public.cm_commissions
       SET status      = 'approved',
           approved_at = now()
     WHERE cm_id    = NEW.cm_id
       AND currency  = NEW.currency
       AND status    = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_auto_approve_on_insert ON public.cm_commissions;
CREATE TRIGGER trg_cm_auto_approve_on_insert
  AFTER INSERT ON public.cm_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.cm_auto_approve_on_threshold();
