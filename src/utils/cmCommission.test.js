import { describe, it, expect } from "vitest";
import { computeCmCommission } from "./cmCommission.js";

describe("computeCmCommission", () => {
  it("returns 5% of gross amount", () => {
    expect(computeCmCommission(100)).toBe(5);
    expect(computeCmCommission(200)).toBe(10);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeCmCommission(33.33)).toBe(1.67);
    expect(computeCmCommission(7)).toBe(0.35);
    expect(computeCmCommission(1)).toBe(0.05);
  });

  it("handles zero", () => {
    expect(computeCmCommission(0)).toBe(0);
  });

  it("handles large values", () => {
    expect(computeCmCommission(10000)).toBe(500);
    expect(computeCmCommission(999.99)).toBe(50);
  });

  it("matches the DB trigger rate (5% rounded to cent)", () => {
    // EUR 47.50 → 2.375 → rounds to 2.38
    expect(computeCmCommission(47.5)).toBe(2.38);
    // USD 120.00 → 6.00 exactly
    expect(computeCmCommission(120)).toBe(6);
  });
});
