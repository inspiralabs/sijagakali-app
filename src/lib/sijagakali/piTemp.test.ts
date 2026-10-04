import { describe, it, expect } from 'vitest';
import { freshPiTemp } from './piTemp';

const NOW = Date.parse('2026-10-04T10:00:00Z');
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

describe('freshPiTemp', () => {
  it('returns the temperature when reported within 10 minutes', () => {
    expect(freshPiTemp(52.1, ago(3), NOW)).toBe(52.1);
    expect(freshPiTemp(52.1, ago(10), NOW)).toBe(52.1);
  });
  it('accepts numeric strings from PostgREST numeric columns', () => {
    expect(freshPiTemp('48.5', ago(1), NOW)).toBe(48.5);
  });
  it('returns null when stale, missing, or not a number', () => {
    expect(freshPiTemp(52.1, ago(11), NOW)).toBeNull();
    expect(freshPiTemp(null, ago(1), NOW)).toBeNull();
    expect(freshPiTemp(52.1, null, NOW)).toBeNull();
    expect(freshPiTemp('abc', ago(1), NOW)).toBeNull();
    expect(freshPiTemp(52.1, 'not-a-date', NOW)).toBeNull();
  });
});
