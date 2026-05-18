-- Add xp_earned to invoices so XP can be reduced on cancellation/dispute refunds.
-- Written at payment time; reduced proportionally on partial refund; zeroed on full refund.
-- NULL means "not yet computed" (pre-migration invoice); 0 means "reclaimed after refund".
-- This distinction lets the frontend fall back to gross_amount calculation for legacy rows.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT NULL;
