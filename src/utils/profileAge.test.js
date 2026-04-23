import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAgeFromBirthday, getProfileAge } from './profileAge.js';

// Pin "now" to a fixed date so age calculations are deterministic.
const FIXED_NOW = new Date('2026-04-23T12:00:00Z');

describe('getAgeFromBirthday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- null / empty inputs ---

  it('returns null for empty string', () => {
    expect(getAgeFromBirthday('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(getAgeFromBirthday(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(getAgeFromBirthday(undefined)).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(getAgeFromBirthday('   ')).toBeNull();
  });

  it('returns null for non-date string', () => {
    expect(getAgeFromBirthday('not-a-date')).toBeNull();
  });

  // --- DD/MM/YYYY format ---

  it('computes correct age when birthday already passed this year', () => {
    // Born 01/01/1990, today 2026-04-23 → turned 36 in January
    expect(getAgeFromBirthday('01/01/1990')).toBe(36);
  });

  it('computes correct age when birthday has not yet occurred this year', () => {
    // Born 30/12/1990, today 2026-04-23 → birthday in December, still 35
    expect(getAgeFromBirthday('30/12/1990')).toBe(35);
  });

  it('computes correct age when birthday is exactly today', () => {
    // Born 23/04/1990, today 2026-04-23 → turns 36 today
    expect(getAgeFromBirthday('23/04/1990')).toBe(36);
  });

  it('returns null for a future date in DD/MM/YYYY format', () => {
    expect(getAgeFromBirthday('01/01/2030')).toBeNull();
  });

  it('returns null for an impossible calendar date (Feb 31)', () => {
    expect(getAgeFromBirthday('31/02/2000')).toBeNull();
  });

  it('returns null for month=0 (invalid month) in DD/MM/YYYY', () => {
    expect(getAgeFromBirthday('15/00/1990')).toBeNull();
  });

  // --- ISO / fallback format via Date.parse ---

  it('computes age from ISO YYYY-MM-DD format', () => {
    expect(getAgeFromBirthday('1990-01-01')).toBe(36);
  });

  it('returns null for ISO date in the future', () => {
    expect(getAgeFromBirthday('2030-01-01')).toBeNull();
  });
});

describe('getProfileAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- explicit age field ---

  it('returns explicit integer age when positive', () => {
    expect(getProfileAge({ age: 30 })).toBe(30);
  });

  it('floors a decimal explicit age', () => {
    expect(getProfileAge({ age: 30.9 })).toBe(30);
  });

  it('ignores age=0 and falls back to birthday', () => {
    expect(getProfileAge({ age: 0, birthday: '01/01/1990' })).toBe(36);
  });

  it('ignores negative age and falls back to birthday', () => {
    expect(getProfileAge({ age: -5, birthday: '01/01/1990' })).toBe(36);
  });

  // --- birthday field variants ---

  it('reads age from birthday field', () => {
    expect(getProfileAge({ birthday: '01/01/1990' })).toBe(36);
  });

  it('reads age from dateOfBirth field', () => {
    expect(getProfileAge({ dateOfBirth: '01/01/1990' })).toBe(36);
  });

  it('reads age from dob field', () => {
    expect(getProfileAge({ dob: '01/01/1990' })).toBe(36);
  });

  it('prefers birthday over dateOfBirth and dob', () => {
    // birthday=1990 → 36, dob=2000 → 26; birthday wins
    expect(getProfileAge({ birthday: '01/01/1990', dob: '01/01/2000' })).toBe(36);
  });

  // --- empty / missing data ---

  it('returns null for profile with no age or birthday fields', () => {
    expect(getProfileAge({})).toBeNull();
  });

  it('returns null for null profile', () => {
    expect(getProfileAge(null)).toBeNull();
  });

  it('returns null for undefined profile', () => {
    expect(getProfileAge(undefined)).toBeNull();
  });
});
