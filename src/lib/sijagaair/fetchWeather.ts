const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

export interface WeatherForecastHour {
  localDatetime: string;
  temperatureC: number | null;
  weatherCode: number | null;
  weatherDesc: string;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDir: string;
  visibilityText: string;
}

export interface WeatherForecastDay {
  label: string;
  dateLabel: string;
  hours: WeatherForecastHour[];
}

export interface WeatherForecastCurrent {
  temperatureC: number | null;
  weatherCode: number | null;
  weatherDesc: string;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDir: string;
  visibilityText: string;
  updatedAt: string;
}

export interface NormalizedForecast {
  adm4: string;
  location: {
    desa: string;
    kecamatan: string;
    kotkab: string;
    provinsi: string;
  };
  current: WeatherForecastCurrent | null;
  days: WeatherForecastDay[];
  source: 'bmkg';
  fetchedAt: string;
}

export interface WeatherBatchItem {
  device_id: string;
  device_name: string;
  adm4: string | null;
  forecast: NormalizedForecast | null;
  error: string | null;
}

export interface WeatherBatchResponse {
  deployment_slug: string;
  items: WeatherBatchItem[];
  attribution: string;
  fetched_at: string;
}

export async function fetchWeatherBatch(deploymentSlug: string): Promise<WeatherBatchResponse> {
  const url = `${API_BASE}/api/weather/forecast/batch?deployment_slug=${encodeURIComponent(deploymentSlug)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Gagal memuat cuaca (${res.status})`);
  }
  return res.json() as Promise<WeatherBatchResponse>;
}

export const WEATHER_ICONS: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '🌥️',
  4: '☁️',
  5: '🌫️',
  10: '🌦️',
  11: '🌧️',
  17: '⛈️',
  45: '🌩️',
  60: '🌧️',
  61: '🌧️',
  80: '🌧️',
  95: '⛈️',
  97: '⛈️',
};

export function weatherEmoji(code: number | null | undefined): string {
  if (code == null) return '🌡️';
  return WEATHER_ICONS[code] ?? '🌡️';
}

export function formatWeatherTime(dtStr: string): string {
  if (!dtStr) return '';
  const d = new Date(dtStr.replace(' ', 'T') + (dtStr.includes('+') ? '' : '+07:00'));
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
}
