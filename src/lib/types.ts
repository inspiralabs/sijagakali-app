export type StatusLevel = 'normal' | 'waspada' | 'siaga' | 'bahaya';

export interface DeviceThreshold {
  waspada: number;
  siaga: number;
  awas: number;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  mac: string;
  lat: number;
  lng: number;
  waterLevel: number;
  maxCapacity: number;
  threshold: DeviceThreshold;
  battery: number;
  rssi: number;
  boxTemp: number;
  reportInterval: number;
  status: StatusLevel;
  lastSeen: string;
  cctvUrl?: string;
}

export interface WaterReading {
  timestamp: string;
  waterLevel: number;
}

export interface AlertEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  status: StatusLevel;
  title: string;
  description: string;
  timestamp: string;
}

export const STATUS_CONFIG: Record<StatusLevel, { label: string; siagaLabel: string; color: string; hex: string }> = {
  normal: { label: 'Normal', siagaLabel: 'Siaga 4', color: 'status-normal', hex: '#1D9E75' },
  waspada: { label: 'Waspada', siagaLabel: 'Siaga 3', color: 'status-waspada', hex: '#BA7517' },
  siaga: { label: 'Siaga', siagaLabel: 'Siaga 2', color: 'status-siaga', hex: '#D85A30' },
  bahaya: { label: 'Bahaya', siagaLabel: 'Siaga 1', color: 'status-bahaya', hex: '#A32D2D' },
};

export function getStatusFromLevel(level: number, threshold: DeviceThreshold): StatusLevel {
  if (level >= threshold.awas) return 'bahaya';
  if (level >= threshold.siaga) return 'siaga';
  if (level >= threshold.waspada) return 'waspada';
  return 'normal';
}
