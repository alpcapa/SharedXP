const CM_COMMISSION_RATE = 0.05;

export const CM_PAYOUT_THRESHOLD = 25;
export const CM_PAYOUT_DAYS_FALLBACK = 10;

/**
 * Compute the CM commission amount for a given gross booking value.
 * Mirrors the rate used by the create_cm_commission_on_release DB trigger.
 */
export function computeCmCommission(grossAmount) {
  return Math.round(grossAmount * CM_COMMISSION_RATE * 100) / 100;
}
