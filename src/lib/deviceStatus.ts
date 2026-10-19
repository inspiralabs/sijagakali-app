import { useEffect, useState } from 'react';
import type { Device } from './types';
import { formatTimeWIB, formatWIB } from './utils';

const MIN_STALE_MS = 10 * 60_000;
/** Heartbeat firmware tiap 2 menit, ditulis mqtt-collector ke last_seen_at paling lama tiap 5 menit. */
const HEARTBEAT_STALE_MS = 10 * 60_000;
const RECENT_DATA_MS = 10 * 60_000;

/** Data terakhir masuk dalam 3× interval baca (min. 10 menit) — sama dengan pengecekan di server. */
function dataWithinInterval(device: Pick<Device, 'lastSeen' | 'reportInterval'>, now: number): boolean {
  const last = Date.parse(device.lastSeen);
  if (!Number.isFinite(last)) return false;
  const staleMs = Math.max(3 * device.reportInterval * 1000, MIN_STALE_MS);
  return now - last <= staleMs;
}

/** Device online = heartbeat masih datang; perangkat tanpa heartbeat dinilai dari data terakhirnya. */
export function isDeviceOnline(
  device: Pick<Device, 'lastSeen' | 'reportInterval' | 'heartbeatAt'>,
  now = Date.now(),
): boolean {
  if (!device.heartbeatAt) return dataWithinInterval(device, now);
  return now - Date.parse(device.heartbeatAt) <= HEARTBEAT_STALE_MS;
}

type FreshnessInput = Pick<Device, 'lastSeen' | 'reportInterval' | 'heartbeatAt' | 'sensorError'>;

/**
 * Apakah angka di dashboard masih menggambarkan kondisi sekarang. Firmware ≥ v1.2.0 hanya mengirim
 * data saat level berubah ≥ 10 cm (atau tiap reportInterval), jadi data lama belum tentu basi:
 * heartbeat membuktikan perangkat hidup, last_error kosong membuktikan sensor terbaca.
 */
export function isDataCurrent(device: FreshnessInput, now = Date.now()): boolean {
  if (!dataWithinInterval(device, now)) return false;
  // "... -> blind_zone": sensor gagal saat air dekat sensor, firmware tetap mengirim level tertinggi.
  if (device.sensorError && !device.sensorError.endsWith('-> blind_zone')) return false;
  return isDeviceOnline(device, now);
}

/** Status kesegaran data + kalimat untuk warga (tanpa istilah teknis seperti "gangguan"). */
export function dataFreshness(device: FreshnessInput, now = Date.now()): { current: boolean; label: string } {
  const at = Date.parse(device.lastSeen);
  if (!Number.isFinite(at)) return { current: false, label: 'Belum ada data dari sensor' };
  if (!isDataCurrent(device, now)) {
    return { current: false, label: `Data belum diperbarui sejak ${formatWIB(device.lastSeen)} WIB` };
  }
  return {
    current: true,
    label:
      now - at <= RECENT_DATA_MS
        ? `Data terbaru pukul ${formatTimeWIB(device.lastSeen)} WIB`
        : `Level stabil sejak pukul ${formatTimeWIB(device.lastSeen)} WIB`,
  };
}

/** dataFreshness yang dihitung ulang tiap menit, agar data yang berhenti datang ikut terlihat basi. */
export function useDataFreshness(device: FreshnessInput) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return dataFreshness(device, now);
}
