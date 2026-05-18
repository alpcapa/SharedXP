-- Migration 027 backfilled xp_earned from gross_amount for all invoices,
-- but did not account for bookings already cancelled or dispute-refunded.
-- This migration retroactively applies the same XP reclaim logic.

-- Full refunds: cancelled with 100% refund or dispute-resolved-refunded → XP = 0
UPDATE invoices i
SET xp_earned = 0
FROM booking_requests br
WHERE i.booking_request_id = br.id
  AND (
    br.status = 'resolved_refunded'
    OR (br.status = 'cancelled' AND br.refund_pct = 100)
  );

-- Partial refunds: cancelled with 1–99% refund → XP reduced proportionally
UPDATE invoices i
SET xp_earned = CEIL(i.xp_earned::numeric * (100 - br.refund_pct) / 100)::integer
FROM booking_requests br
WHERE i.booking_request_id = br.id
  AND br.status = 'cancelled'
  AND br.refund_pct > 0
  AND br.refund_pct < 100;
