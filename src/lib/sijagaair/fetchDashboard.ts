import type { SupabaseClient } from '@supabase/supabase-js';
import type { Device, StatusLevel, WaterReading, AlertEvent } from '@/lib/types';
import { getStatusFromLevel } from '@/lib/types';

const HISTORY_CAP = 144;

/** Koordinat peta per `device_id` (DB belum menyimpan lat/lng). */
const NODE_COORDS: Record<string, { lat: number; lng: number }> = {
  'node-001': { lat: -6.548, lng: 107.012 },
  'node-002': { lat: -6.532, lng: 107.045 },
  'node-003': { lat: -6.489, lng: 106.992 },
};

type DeviceConfigRow = {
  deployment_slug: string;
  device_id: string;
  location_name: string;
  sensor_height_cm: number;
  read_interval_sec: number;
  threshold_waspada_cm: number;
  threshold_siaga_cm: number;
  threshold_bahaya_cm: number;
  last_seen_at: string | null;
  cctv_local_ip?: string | null;
  stream_playback_url?: string | null;
};

type SensorReadingLite = {
  device_id: string;
  recorded_at: string;
  water_level_cm: number;
  water_status: string | null;
  rssi: number | null;
  battery_pct: number | null;
  cctv_image_path: string | null;
  cctv_captured_at: string | null;
};

type NotificationLogRow = {
  id: string;
  device_id: string;
  deployment_slug: string;
  water_status: string;
  sent_at: string;
};

function isStatusLevel(s: string | null): s is StatusLevel {
  return s === 'normal' || s === 'waspada' || s === 'siaga' || s === 'bahaya';
}

const STATUS_TITLES: Record<StatusLevel, string> = {
  normal: 'Siaga 4 - Normal',
  waspada: 'Siaga 3 — Waspada',
  siaga: 'Siaga 2 — Siaga',
  bahaya: 'Siaga 1 — BAHAYA',
};

function mapRowToDevice(
  c: DeviceConfigRow,
  latest: SensorReadingLite | undefined
): Device {
  const threshold = {
    waspada: c.threshold_waspada_cm,
    siaga: c.threshold_siaga_cm,
    awas: c.threshold_bahaya_cm,
  };
  const waterLevel = latest ? Math.round(latest.water_level_cm) : 0;
  const status: StatusLevel =
    latest && isStatusLevel(latest.water_status)
      ? latest.water_status
      : getStatusFromLevel(waterLevel, threshold);
  const coords = NODE_COORDS[c.device_id] ?? { lat: -6.5, lng: 107.0 };

  return {
    id: c.device_id,
    deploymentSlug: c.deployment_slug,
    name: c.location_name,
    location: c.location_name,
    mac: `— ${c.device_id}`,
    lat: coords.lat,
    lng: coords.lng,
    waterLevel,
    maxCapacity: Math.max(c.sensor_height_cm, threshold.awas + 50),
    threshold,
    battery: latest?.battery_pct ?? 0,
    rssi: latest?.rssi ?? 0,
    boxTemp: 0,
    reportInterval: c.read_interval_sec,
    status,
    lastSeen: latest?.recorded_at ?? c.last_seen_at ?? new Date().toISOString(),
    cctvLocalIp: c.cctv_local_ip ?? undefined,
    cctvUrl: c.stream_playback_url ?? undefined,
    cctvImagePath: latest?.cctv_image_path ?? null,
    cctvCapturedAt: latest?.cctv_captured_at ?? null,
    cctvSignedUrl: null,
  };
}

export async function fetchDashboardSnapshot(
  supabase: SupabaseClient,
  deploymentSlug: string
): Promise<{
  devices: Device[];
  histories: Record<string, WaterReading[]>;
}> {
  const { data: configs, error: errConfigs } = await supabase
    .from('device_configs')
    .select(
      'deployment_slug, device_id, location_name, sensor_height_cm, read_interval_sec, threshold_waspada_cm, threshold_siaga_cm, threshold_bahaya_cm, last_seen_at, cctv_local_ip, stream_playback_url'
    )
    .eq('deployment_slug', deploymentSlug)
    .eq('is_active', true)
    .order('device_id');

  if (errConfigs) throw errConfigs;

  const { data: readings, error: errReadings } = await supabase
    .from('sensor_readings')
    .select('device_id, recorded_at, water_level_cm, water_status, rssi, battery_pct, cctv_image_path, cctv_captured_at')
    .eq('deployment_slug', deploymentSlug)
    .order('recorded_at', { ascending: false })
    .limit(4000);

  if (errReadings) throw errReadings;

  const list = (readings ?? []) as SensorReadingLite[];
  const latestByDevice = new Map<string, SensorReadingLite>();
  for (const r of list) {
    if (!latestByDevice.has(r.device_id)) latestByDevice.set(r.device_id, r);
  }

  const histories: Record<string, WaterReading[]> = {};
  for (const c of (configs ?? []) as DeviceConfigRow[]) {
    histories[c.device_id] = [];
  }
  for (const r of list) {
    const bucket = histories[r.device_id];
    if (!bucket || bucket.length >= HISTORY_CAP) continue;
    bucket.push({
      timestamp: r.recorded_at,
      waterLevel: Math.round(r.water_level_cm),
    });
  }
  for (const id of Object.keys(histories)) {
    histories[id].reverse();
  }

  const devices = ((configs ?? []) as DeviceConfigRow[]).map((c) =>
    mapRowToDevice(c, latestByDevice.get(c.device_id))
  );

  return { devices, histories };
}

/**
 * Ambil riwayat notifikasi dari `notification_logs` untuk ditampilkan
 * di halaman Alerts dan AlertLog sebagai AlertEvent[].
 */
export type DeviceNotificationLogRow = {
  id: string;
  device_id: string;
  deployment_slug: string | null;
  water_status: string | null;
  channel: string;
  status: string;
  error_message: string | null;
  sent_at: string;
};

/** Log kiriman channel (termasuk gagal) untuk satu perangkat — Halaman Peringatan. */
export async function fetchDeviceNotificationLogs(
  supabase: SupabaseClient,
  deploymentSlug: string,
  deviceId: string,
  limit = 80
): Promise<DeviceNotificationLogRow[]> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, device_id, deployment_slug, water_status, channel, status, error_message, sent_at')
    .eq('deployment_slug', deploymentSlug)
    .eq('device_id', deviceId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as DeviceNotificationLogRow[];
}

export async function fetchAlertHistory(
  supabase: SupabaseClient,
  deploymentSlug: string,
  limit = 100
): Promise<AlertEvent[]> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, device_id, deployment_slug, water_status, sent_at')
    .eq('deployment_slug', deploymentSlug)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as NotificationLogRow[]).map((row) => {
    const status: StatusLevel = isStatusLevel(row.water_status)
      ? row.water_status
      : 'normal';
    const label = STATUS_TITLES[status];
    return {
      id: row.id,
      deviceId: row.device_id,
      deviceName: row.device_id,
      status,
      title: label,
      description: `Notifikasi WhatsApp dikirim — ${label} di ${row.device_id}.`,
      timestamp: row.sent_at,
    };
  });
}

export type { SensorReadingLite };
