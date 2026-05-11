import { describe, expect, it } from "vitest";
import { COMMISSION_RATE, TAX_RATE, CURRENCY_SYMBOLS, formatCurrency, toNSU } from "./pricing";

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

describe("toNSU", () => {
  it("1 USD = 1 XP", () => {
    expect(toNSU(1, "USD")).toBe(1);
    expect(toNSU(120, "USD")).toBe(120);
  });

  it("1 EUR = 1 XP", () => {
    expect(toNSU(45, "EUR")).toBe(45);
    expect(toNSU(45.9, "EUR")).toBe(45);
  });

  it("100 JPY = 1 XP", () => {
    expect(toNSU(100, "JPY")).toBe(1);
    expect(toNSU(4500, "JPY")).toBe(45);
    expect(toNSU(4599, "JPY")).toBe(45);
  });

  it("40 TRY = 1 XP", () => {
    expect(toNSU(40, "TRY")).toBe(1);
    expect(toNSU(200, "TRY")).toBe(5);
    expect(toNSU(39, "TRY")).toBe(0);
  });

  it("1000 KRW = 1 XP", () => {
    expect(toNSU(1000, "KRW")).toBe(1);
    expect(toNSU(45000, "KRW")).toBe(45);
    expect(toNSU(999, "KRW")).toBe(0);
  });

  it("unknown currency defaults to divisor 1", () => {
    expect(toNSU(80, "GBP")).toBe(80);
    expect(toNSU(50, "XYZ")).toBe(50);
  });

  it("handles zero and falsy amounts", () => {
    expect(toNSU(0, "USD")).toBe(0);
    expect(toNSU(null, "EUR")).toBe(0);
  });

  it("is case-insensitive for currency code", () => {
    expect(toNSU(100, "jpy")).toBe(1);
    expect(toNSU(100, "JPY")).toBe(1);
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
