import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
vi.mock("../data/majorEvents", () => ({ majorEvents: [] }));

const { isUpcomingOrRecent, formatEventDateRange } = await import("./events.js");

const makeEvent = (startsAt, endsAt) => ({ startsAt, endsAt });

describe("isUpcomingOrRecent — expiration logic", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps a single-day event on its day (just before midnight UTC)", () => {
    // Event: 2026-05-26, "now" = 23:59:59 UTC on that day
    vi.setSystemTime(new Date("2026-05-26T23:59:59Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T00:00:00Z", ""))).toBe(true);
  });

  it("removes a single-day event at 00:00 UTC the next day", () => {
    vi.setSystemTime(new Date("2026-05-27T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T00:00:00Z", ""))).toBe(false);
  });

  it("keeps a multi-day event on its last day (just before midnight UTC)", () => {
    vi.setSystemTime(new Date("2026-05-28T23:59:59Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T00:00:00Z", "2026-05-28T23:59:59Z"))).toBe(true);
  });

  it("removes a multi-day event at 00:00 UTC the day after it ends", () => {
    vi.setSystemTime(new Date("2026-05-29T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T00:00:00Z", "2026-05-28T23:59:59Z"))).toBe(false);
  });

  it("keeps a future event", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-06-01T00:00:00Z", "2026-06-05T23:59:59Z"))).toBe(true);
  });

  it("handles month-end rollover (event ends Dec 31)", () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:59Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-12-31T00:00:00Z", ""))).toBe(true);
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-12-31T00:00:00Z", ""))).toBe(false);
  });

  it("rejects events with an invalid start date", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("not-a-date", ""))).toBe(false);
  });

  it("falls back to start date when endsAt is missing", () => {
    vi.setSystemTime(new Date("2026-05-27T00:00:00Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T12:00:00Z", null))).toBe(false);
    vi.setSystemTime(new Date("2026-05-26T23:59:59Z"));
    expect(isUpcomingOrRecent(makeEvent("2026-05-26T12:00:00Z", null))).toBe(true);
  });
});

describe("formatEventDateRange", () => {
  it("returns empty string for invalid date", () => {
    expect(formatEventDateRange("bad")).toBe("");
  });

  it("formats a single-day event", () => {
    expect(formatEventDateRange("2026-03-01T00:00:00Z", "2026-03-01T23:59:59Z")).toBe("Mar 1, 2026");
  });

  it("formats a multi-day same-year range", () => {
    const result = formatEventDateRange("2026-05-26T00:00:00Z", "2026-05-28T23:59:59Z");
    expect(result).toBe("May 26 – May 28, 2026");
  });
});
