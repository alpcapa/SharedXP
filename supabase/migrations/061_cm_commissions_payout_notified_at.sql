-- Add payout_notified_at to cm_commissions.
-- The cm-payout-sweep edge function uses this column to track which approved
-- commissions have already triggered admin/CM notification emails, preventing
-- duplicate sends across daily cron runs.
ALTER TABLE cm_commissions
  ADD COLUMN IF NOT EXISTS payout_notified_at TIMESTAMPTZ;
