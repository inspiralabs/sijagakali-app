import type { AlertEvent, Device, StatusLevel } from './types';

const STATUS_TITLES: Record<StatusLevel, string> = {
  normal: 'Siaga 4 - Normal',
  waspada: 'Siaga 3 — Waspada',
  siaga: 'Siaga 2 — Siaga',
  bahaya: 'Siaga 1 — BAHAYA',
};

/** Peringatan in-app saat status air sebuah device berubah. */
export function buildAlert(device: Device, _prevStatus: StatusLevel): AlertEvent {
  const status = device.status;
  const level = device.waterLevel;
  return {
    id: `evt_live_${device.id}_${Date.now()}`,
    deviceId: device.id,
    deviceName: device.name,
    status,
    title: `${STATUS_TITLES[status]} — ${level} cm`,
    description:
      status === 'normal'
        ? `Ketinggian air kembali normal di ${device.name}.`
        : `Ketinggian air melewati ambang ${STATUS_TITLES[status].split('—')[1]?.trim() ?? status} di ${device.name}.`,
    timestamp: new Date().toISOString(),
  };
}
