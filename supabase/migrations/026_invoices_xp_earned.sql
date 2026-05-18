-- Add xp_earned to invoices so XP can be reduced on cancellation/dispute refunds.
-- Written at payment time; reduced proportionally on partial refund; zeroed on full refund.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xp_earned integer NOT NULL DEFAULT 0;
