import { describe, it, expect } from "vitest";
import { computeRefundPct, refundLabel } from "./cancellationPolicy";

const dateAt = (hoursFromNow) => {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time, now: new Date() };
};

describe("computeRefundPct — flexible", () => {
  it("returns 100 when >24h away", () => {
    const { date, time, now } = dateAt(25);
    expect(computeRefundPct("flexible", date, time, now)).toBe(100);
  });
  it("returns 0 when <24h away", () => {
    const { date, time, now } = dateAt(12);
    expect(computeRefundPct("flexible", date, time, now)).toBe(0);
  });
  it("returns 0 when session is in the past", () => {
    const { date, time, now } = dateAt(-1);
    expect(computeRefundPct("flexible", date, time, now)).toBe(0);
  });
});

describe("computeRefundPct — moderate", () => {
  it("returns 100 when >5 days away", () => {
    const { date, time, now } = dateAt(121);
    expect(computeRefundPct("moderate", date, time, now)).toBe(100);
  });
  it("returns 50 between 24h and 5 days", () => {
    const { date, time, now } = dateAt(48);
    expect(computeRefundPct("moderate", date, time, now)).toBe(50);
  });
  it("returns 0 within 24h", () => {
    const { date, time, now } = dateAt(10);
    expect(computeRefundPct("moderate", date, time, now)).toBe(0);
  });
});

describe("computeRefundPct — strict", () => {
  it("returns 50 when >7 days away", () => {
    const { date, time, now } = dateAt(169);
    expect(computeRefundPct("strict", date, time, now)).toBe(50);
  });
  it("returns 0 within 7 days", () => {
    const { date, time, now } = dateAt(100);
    expect(computeRefundPct("strict", date, time, now)).toBe(0);
  });
});

describe("computeRefundPct — unknown policy falls back to flexible", () => {
  it("returns 100 when >24h away with unknown policy", () => {
    const { date, time, now } = dateAt(48);
    expect(computeRefundPct("ultra-strict", date, time, now)).toBe(100);
  });
});

describe("refundLabel", () => {
  it("labels 100 as Full refund", () => expect(refundLabel(100)).toBe("Full refund"));
  it("labels 50 as 50% refund", () => expect(refundLabel(50)).toBe("50% refund"));
  it("labels 0 as No refund", () => expect(refundLabel(0)).toBe("No refund"));
});
