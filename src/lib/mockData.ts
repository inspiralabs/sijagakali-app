import { Device, WaterReading, AlertEvent, StatusLevel, getStatusFromLevel } from './types';

export const mockDevices: Device[] = [
  {
    id: "esp_wadas",
    name: "Jembatan Wadas",
    location: "Hulu Cileungsi",
    mac: "A4:CF:12:7B:3E:01",
    lat: -6.548,
    lng: 107.012,
    waterLevel: 185,
    maxCapacity: 250,
    threshold: { waspada: 120, siaga: 160, awas: 200 },
    battery: 72,
    rssi: -65,
    boxTemp: 34,
    reportInterval: 300,
    status: "siaga",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "esp_cileungsi",
    name: "Sungai Cileungsi",
    location: "Tengah · Jonggol",
    mac: "A4:CF:12:7B:3E:02",
    lat: -6.532,
    lng: 107.045,
    waterLevel: 140,
    maxCapacity: 200,
    threshold: { waspada: 90, siaga: 130, awas: 170 },
    battery: 88,
    rssi: -58,
    boxTemp: 31,
    reportInterval: 300,
    status: "siaga",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "esp_cikeas",
    name: "Hulu Cikeas",
    location: "Gunung Putri · Bogor",
    mac: "A4:CF:12:7B:3E:03",
    lat: -6.489,
    lng: 106.992,
    waterLevel: 65,
    maxCapacity: 180,
    threshold: { waspada: 80, siaga: 120, awas: 160 },
    battery: 45,
    rssi: -78,
    boxTemp: 37,
    reportInterval: 300,
    status: "normal",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "esp_muara",
    name: "Muara Bekasi",
    location: "Hilir · Bekasi Barat",
    mac: "A4:CF:12:7B:3E:04",
    lat: -6.238,
    lng: 107.013,
    waterLevel: 110,
    maxCapacity: 220,
    threshold: { waspada: 100, siaga: 150, awas: 190 },
    battery: 91,
    rssi: -52,
    boxTemp: 29,
    reportInterval: 300,
    status: "waspada",
    lastSeen: new Date().toISOString(),
  }
];

/** Generate realistic 24h history with N readings (default 144 = every 10 min). */
export function generateWaterHistory(device: Device, points = 144): WaterReading[] {
  const readings: WaterReading[] = [];
  const now = Date.now();
  const stepMs = (24 * 60 * 60 * 1000) / points;
  const baseLevel = device.waterLevel * 0.5;
  const peakLevel = device.waterLevel;

  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now - i * stepMs);
    const hour = (time.getUTCHours() + 7) % 24;

    let factor: number;
    if (hour >= 0 && hour < 6) factor = 0.3 + Math.random() * 0.1;
    else if (hour >= 6 && hour < 10) factor = 0.3 + (hour - 6) * 0.15 + Math.random() * 0.05;
    else if (hour >= 10 && hour < 14) factor = 0.85 + Math.random() * 0.15;
    else if (hour >= 14 && hour < 18) factor = 0.9 - (hour - 14) * 0.12 + Math.random() * 0.05;
    else factor = 0.45 - (hour - 18) * 0.02 + Math.random() * 0.05;

    const level = Math.round(baseLevel + (peakLevel - baseLevel) * factor + (Math.random() - 0.5) * 8);
    readings.push({ timestamp: time.toISOString(), waterLevel: Math.max(0, level) });
  }
  return readings;
}

const STATUS_TITLES: Record<StatusLevel, string> = {
  normal: 'Kembali Normal',
  waspada: 'Siaga 3 — Waspada',
  siaga: 'Siaga 2 — Siaga',
  bahaya: 'Siaga 1 — BAHAYA',
};

function makeAlert(id: string, device: Device, status: StatusLevel, level: number, ts: string): AlertEvent {
  return {
    id,
    deviceId: device.id,
    deviceName: device.name,
    status,
    title: `${STATUS_TITLES[status]} — ${level} cm`,
    description:
      status === 'normal'
        ? `Ketinggian air kembali normal di ${device.name}.`
        : `Ketinggian air melewati ambang ${STATUS_TITLES[status].split('—')[1]?.trim() ?? status} di ${device.name}.`,
    timestamp: ts,
  };
}

/** Generate a long alert history (default 60 entries) spread over 7 days. */
export function generateAlertHistory(devices: Device[], count = 60): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  const now = Date.now();
  const statuses: StatusLevel[] = ['normal', 'waspada', 'siaga', 'bahaya'];
  for (let i = 0; i < count; i++) {
    const device = devices[i % devices.length];
    const status = statuses[(i * 3 + Math.floor(i / devices.length)) % statuses.length];
    const ts = new Date(now - i * 1000 * 60 * (15 + (i % 90))).toISOString();
    let level: number;
    switch (status) {
      case 'bahaya': level = device.threshold.awas + 5 + Math.floor(Math.random() * 30); break;
      case 'siaga': level = device.threshold.siaga + 3 + Math.floor(Math.random() * (device.threshold.awas - device.threshold.siaga - 3)); break;
      case 'waspada': level = device.threshold.waspada + 2 + Math.floor(Math.random() * (device.threshold.siaga - device.threshold.waspada - 2)); break;
      default: level = Math.max(10, device.threshold.waspada - 10 - Math.floor(Math.random() * 30));
    }
    alerts.push(makeAlert(`evt_${i}_${device.id}`, device, status, level, ts));
  }
  return alerts.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export const mockAlerts: AlertEvent[] = generateAlertHistory(mockDevices, 60);

export function buildAlert(device: Device, prevStatus: StatusLevel): AlertEvent {
  const status = device.status;
  const ts = new Date().toISOString();
  return makeAlert(`evt_live_${device.id}_${Date.now()}`, device, status, device.waterLevel, ts);
}

export function formatWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimeWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
}
