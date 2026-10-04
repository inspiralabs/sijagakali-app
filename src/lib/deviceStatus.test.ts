import { describe, it, expect } from 'vitest';
import { isDeviceOnline } from './deviceStatus';

const NOW = Date.parse('2026-10-04T10:00:00Z');
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

describe('isDeviceOnline', () => {
  it('online when last seen within 3x the report interval', () => {
    expect(isDeviceOnline({ lastSeen: ago(170), reportInterval: 3600 }, NOW)).toBe(true);
  });
  it('offline when last seen older than 3x the report interval', () => {
    expect(isDeviceOnline({ lastSeen: ago(190), reportInterval: 3600 }, NOW)).toBe(false);
  });
  it('uses a 10-minute floor for short intervals', () => {
    expect(isDeviceOnline({ lastSeen: ago(9), reportInterval: 30 }, NOW)).toBe(true);
    expect(isDeviceOnline({ lastSeen: ago(11), reportInterval: 30 }, NOW)).toBe(false);
  });
  it('offline when lastSeen is missing or invalid', () => {
    expect(isDeviceOnline({ lastSeen: '', reportInterval: 60 }, NOW)).toBe(false);
    expect(isDeviceOnline({ lastSeen: 'bukan-tanggal', reportInterval: 60 }, NOW)).toBe(false);
  });
});
