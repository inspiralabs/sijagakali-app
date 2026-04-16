import { Device, WaterReading, AlertEvent, StatusLevel } from './types';

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
    lastSeen: "2025-07-14T08:55:00Z"
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
    lastSeen: "2025-07-14T08:54:30Z"
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
    lastSeen: "2025-07-14T08:50:00Z"
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
    lastSeen: "2025-07-14T08:56:00Z"
  }
];

export function generateWaterHistory(device: Device): WaterReading[] {
  const readings: WaterReading[] = [];
  const now = new Date('2025-07-14T09:00:00Z');
  const baseLevel = device.waterLevel * 0.5;
  const peakLevel = device.waterLevel;
  
  for (let i = 287; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hour = (time.getUTCHours() + 7) % 24; // WIB
    
    // Realistic curve: low at night, peak 10-14 WIB
    let factor: number;
    if (hour >= 0 && hour < 6) factor = 0.3 + Math.random() * 0.1;
    else if (hour >= 6 && hour < 10) factor = 0.3 + (hour - 6) * 0.15 + Math.random() * 0.05;
    else if (hour >= 10 && hour < 14) factor = 0.85 + Math.random() * 0.15;
    else if (hour >= 14 && hour < 18) factor = 0.9 - (hour - 14) * 0.12 + Math.random() * 0.05;
    else factor = 0.45 - (hour - 18) * 0.02 + Math.random() * 0.05;
    
    const level = Math.round(baseLevel + (peakLevel - baseLevel) * factor + (Math.random() - 0.5) * 6);
    readings.push({
      timestamp: time.toISOString(),
      waterLevel: Math.max(0, level),
    });
  }
  return readings;
}

export const mockAlerts: AlertEvent[] = [
  {
    id: '1',
    deviceId: 'esp_wadas',
    deviceName: 'Jembatan Wadas',
    status: 'siaga',
    title: 'Siaga 2 — Level naik ke 185 cm',
    description: 'Ketinggian air melewati ambang Siaga di Jembatan Wadas.',
    timestamp: '2025-07-14T08:55:00Z',
  },
  {
    id: '2',
    deviceId: 'esp_cileungsi',
    deviceName: 'Sungai Cileungsi',
    status: 'siaga',
    title: 'Siaga 2 — Level naik ke 140 cm',
    description: 'Ketinggian air melewati ambang Siaga di Sungai Cileungsi.',
    timestamp: '2025-07-14T08:30:00Z',
  },
  {
    id: '3',
    deviceId: 'esp_muara',
    deviceName: 'Muara Bekasi',
    status: 'waspada',
    title: 'Siaga 3 — Level naik ke 110 cm',
    description: 'Ketinggian air melewati ambang Waspada di Muara Bekasi.',
    timestamp: '2025-07-14T07:45:00Z',
  },
  {
    id: '4',
    deviceId: 'esp_cikeas',
    deviceName: 'Hulu Cikeas',
    status: 'normal',
    title: 'Kembali Normal — Level turun ke 65 cm',
    description: 'Ketinggian air kembali normal di Hulu Cikeas.',
    timestamp: '2025-07-14T06:20:00Z',
  },
  {
    id: '5',
    deviceId: 'esp_wadas',
    deviceName: 'Jembatan Wadas',
    status: 'waspada',
    title: 'Siaga 3 — Level naik ke 125 cm',
    description: 'Ketinggian air melewati ambang Waspada di Jembatan Wadas.',
    timestamp: '2025-07-14T05:10:00Z',
  },
];

export function formatWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimeWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
}
