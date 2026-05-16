export const CANCELLATION_POLICIES = {
  flexible: {
    label: "Flexible",
    tagline: "Full refund if cancelled 24+ hours before",
    color: "green",
    rules: [
      { hoursThreshold: 24, refundPct: 100, description: "Full refund if cancelled more than 24 hours before the session" },
      { hoursThreshold: 0,  refundPct: 0,   description: "No refund if cancelled within 24 hours of the session" },
    ],
  },
  moderate: {
    label: "Moderate",
    tagline: "Full refund if cancelled 5+ days before",
    color: "amber",
    rules: [
      { hoursThreshold: 120, refundPct: 100, description: "Full refund if cancelled more than 5 days before the session" },
      { hoursThreshold: 24,  refundPct: 50,  description: "50% refund if cancelled 1–5 days before the session" },
      { hoursThreshold: 0,   refundPct: 0,   description: "No refund if cancelled within 24 hours of the session" },
    ],
  },
  strict: {
    label: "Strict",
    tagline: "50% refund if cancelled 7+ days before; no refund after",
    color: "red",
    rules: [
      { hoursThreshold: 168, refundPct: 50, description: "50% refund if cancelled more than 7 days before the session" },
      { hoursThreshold: 0,   refundPct: 0,  description: "No refund if cancelled within 7 days of the session" },
    ],
  },
};

/**
 * Returns 0, 50, or 100 — the refund percentage the guest is entitled to
 * given the policy and how far out the cancellation is from the session.
 */
export const computeRefundPct = (policy, requestedDate, requestedTime, now = new Date()) => {
  const sessionStart = new Date(`${requestedDate}T${requestedTime}:00`);
  const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilSession < 0) return 0;
  const tier = CANCELLATION_POLICIES[policy] ?? CANCELLATION_POLICIES.flexible;
  for (const rule of tier.rules) {
    if (hoursUntilSession >= rule.hoursThreshold) return rule.refundPct;
  }
  return 0;
};

export const refundLabel = (pct) => {
  if (pct === 100) return "Full refund";
  if (pct > 0) return `${pct}% refund`;
  return "No refund";
};
