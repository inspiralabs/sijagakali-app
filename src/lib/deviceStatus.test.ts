import { describe, it, expect } from 'vitest';
import { isDeviceOnline, isDataCurrent, dataFreshness } from './deviceStatus';

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
  it('follows the heartbeat when the device sends one', () => {
    expect(isDeviceOnline({ lastSeen: ago(50), reportInterval: 3600, heartbeatAt: ago(3) }, NOW)).toBe(true);
    expect(isDeviceOnline({ lastSeen: ago(5), reportInterval: 3600, heartbeatAt: ago(25) }, NOW)).toBe(false);
  });
});

describe('isDataCurrent', () => {
  const base = { lastSeen: ago(50), reportInterval: 3600, heartbeatAt: ago(3), sensorError: null };
  it('current when the level is unchanged but the device heartbeat is recent', () => {
    expect(isDataCurrent(base, NOW)).toBe(true);
  });
  it('stale when the heartbeat stopped, even if the reading is within 3x the interval', () => {
    expect(isDataCurrent({ ...base, heartbeatAt: ago(15) }, NOW)).toBe(false);
  });
  it('stale while the sensor reports an error', () => {
    expect(isDataCurrent({ ...base, sensorError: 'sensor_no_echo x4' }, NOW)).toBe(false);
  });
  it('stays current for the near-top fallback, which still sends the highest level', () => {
    expect(isDataCurrent({ ...base, sensorError: 'sensor_no_echo x4 -> blind_zone' }, NOW)).toBe(true);
  });
  it('falls back to the data rule for devices that never sent a heartbeat', () => {
    expect(isDataCurrent({ ...base, heartbeatAt: null }, NOW)).toBe(true);
    expect(isDataCurrent({ ...base, heartbeatAt: null, lastSeen: ago(190) }, NOW)).toBe(false);
  });
});

describe('dataFreshness', () => {
  const base = { reportInterval: 3600, heartbeatAt: ago(3), sensorError: null };
  it('labels recent, stable, stale and missing data', () => {
    expect(dataFreshness({ ...base, lastSeen: ago(2) }, NOW).label).toMatch(/^Data terbaru pukul/);
    expect(dataFreshness({ ...base, lastSeen: ago(50) }, NOW).label).toMatch(/^Level stabil sejak pukul/);
    const stale = dataFreshness({ ...base, lastSeen: ago(50), heartbeatAt: ago(30) }, NOW);
    expect(stale).toMatchObject({ current: false });
    expect(stale.label).toMatch(/^Data belum diperbarui sejak/);
    expect(dataFreshness({ ...base, lastSeen: '' }, NOW)).toEqual({ current: false, label: 'Belum ada data dari sensor' });
  });
});
