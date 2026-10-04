import type { Device } from './types';

const MIN_STALE_MS = 10 * 60_000;

/**
 * Device dianggap online bila data terakhir masuk dalam 3× interval baca (min. 10 menit) —
 * aturan yang sama dengan pengecekan kesehatan sensor di server.
 */
export function isDeviceOnline(
  device: Pick<Device, 'lastSeen' | 'reportInterval'>,
  now = Date.now(),
): boolean {
  const last = Date.parse(device.lastSeen);
  if (!Number.isFinite(last)) return false;
  const staleMs = Math.max(3 * device.reportInterval * 1000, MIN_STALE_MS);
  return now - last <= staleMs;
}
