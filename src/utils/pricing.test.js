import { describe, expect, it } from "vitest";
import { COMMISSION_RATE, TAX_RATE, CURRENCY_SYMBOLS, formatCurrency } from "./pricing";

describe("constants", () => {
  it("COMMISSION_RATE is 15%", () => {
    expect(COMMISSION_RATE).toBe(0.15);
  });

  it("TAX_RATE is 5%", () => {
    expect(TAX_RATE).toBe(0.05);
  });

  it("CURRENCY_SYMBOLS contains expected codes", () => {
    expect(CURRENCY_SYMBOLS.EUR).toBe("€");
    expect(CURRENCY_SYMBOLS.USD).toBe("$");
    expect(CURRENCY_SYMBOLS.GBP).toBe("£");
  });
});

describe("formatCurrency", () => {
  it("formats a known currency with symbol", () => {
    expect(formatCurrency(100, "EUR")).toBe("€100.00");
    expect(formatCurrency(9.5, "USD")).toBe("$9.50");
    expect(formatCurrency(0, "GBP")).toBe("£0.00");
  });

  it("falls back to currency code for unknown codes", () => {
    expect(formatCurrency(50, "XYZ")).toBe("XYZ50.00");
  });

  it("handles numeric strings", () => {
    expect(formatCurrency("25.5", "EUR")).toBe("€25.50");
  });

  it("handles zero and negative amounts", () => {
    expect(formatCurrency(0, "EUR")).toBe("€0.00");
    expect(formatCurrency(-10, "USD")).toBe("$-10.00");
  });
});
