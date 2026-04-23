import { describe, it, expect } from 'vitest';
import { getDateKey } from './date.js';

describe('getDateKey', () => {
  it('pads single-digit month (0-indexed) and day', () => {
    // month=0 → January, day=5 → "01", "05"
    expect(getDateKey(2024, 0, 5)).toBe('2024-01-05');
  });

  it('handles double-digit month and day', () => {
    // month=11 → December
    expect(getDateKey(2024, 11, 31)).toBe('2024-12-31');
  });

  it('pads single-digit day only when month is already two digits', () => {
    // month=9 → October, day=3
    expect(getDateKey(2020, 9, 3)).toBe('2020-10-03');
  });

  it('does not pad already two-digit day', () => {
    expect(getDateKey(2021, 2, 15)).toBe('2021-03-15');
  });

  it('produces correct key for mid-year date', () => {
    expect(getDateKey(2023, 5, 20)).toBe('2023-06-20');
  });
});
