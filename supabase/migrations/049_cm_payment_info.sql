-- Add payment_info to cm_profiles so CMs can store their payout details
-- (bank account, PayPal, etc.) for manual processing by admin.

ALTER TABLE cm_profiles
  ADD COLUMN IF NOT EXISTS payment_info TEXT NOT NULL DEFAULT '';
