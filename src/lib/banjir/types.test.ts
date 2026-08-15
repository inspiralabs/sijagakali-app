import { describe, it, expect } from 'vitest';
import { hitungUmur } from './types';

describe('hitungUmur', () => {
  it('computes full years elapsed, accounting for birthday not yet reached this year', () => {
    const now = new Date();
    const notYetBirthdayThisYear = new Date(now.getFullYear() - 30, now.getMonth() + 1, 1);
    expect(hitungUmur(notYetBirthdayThisYear.toISOString().slice(0, 10))).toBe(29);
  });

  it('counts the year once the birthday has passed this year', () => {
    const now = new Date();
    const birthdayAlreadyPassed = new Date(now.getFullYear() - 30, 0, 1);
    expect(hitungUmur(birthdayAlreadyPassed.toISOString().slice(0, 10))).toBe(30);
  });
});
