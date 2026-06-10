import { Droplets, Eye, Wind } from 'lucide-react';
import type { WeatherBatchItem } from '@/lib/sijagaair/fetchWeather';
import { formatWeatherTime, weatherEmoji } from '@/lib/sijagaair/fetchWeather';
import { cn } from '@/lib/utils';

interface WeatherDeviceInlineProps {
  item: WeatherBatchItem | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
  /** compact = DeviceCard; expanded = modal CCTV (ringkas) */
  variant?: 'compact' | 'expanded';
  showAdminHints?: boolean;
  className?: string;
}

export function WeatherDeviceInline({
  item,
  isLoading,
  error,
  variant = 'compact',
  showAdminHints = false,
  className,
}: WeatherDeviceInlineProps) {
  if (!import.meta.env.VITE_SIJAGAAIRAPI_URL) return null;

  if (isLoading) {
    return (
      <div className={cn('animate-pulse rounded-lg bg-muted/40 px-3 py-2', className)}>
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="mt-2 h-4 w-40 rounded bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <p className={cn('text-[11px] text-destructive', className)}>
        Cuaca: {error.message}
      </p>
    );
  }

  if (!item?.adm4) {
    if (!showAdminHints) return null;
    return (
      <p className={cn('text-[11px] text-muted-foreground', className)}>
        Prakiraan cuaca belum dikonfigurasi untuk titik ini
      </p>
    );
  }

  if (item.error || !item.forecast) {
    return (
      <p className={cn('text-[11px] text-destructive', className)}>
        Cuaca: {item.error ?? 'tidak tersedia'}
      </p>
    );
  }

  const current = item.forecast.current;
  const loc = item.forecast.location;
  const forecastDays =
    variant === 'expanded' ? item.forecast.days.slice(0, 1) : item.forecast.days;

  if (variant === 'compact') {
    if (!current) return null;
    return (
      <div
        className={cn(
          'rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {weatherEmoji(current.weatherCode)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              {current.temperatureC ?? '—'}°C · {current.weatherDesc}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              💧 {current.humidityPct ?? '—'}% · 💨 {current.windSpeedKmh ?? '—'} km/j
              {current.updatedAt ? ` · ${formatWeatherTime(current.updatedAt)} WIB` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="mb-4">
        <h4 className="text-base font-semibold text-foreground sm:text-lg">Prakiraan cuaca</h4>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {loc?.desa ? `Desa ${loc.desa}` : item.device_name}
          {loc?.kecamatan ? ` · Kec. ${loc.kecamatan}` : ''}
        </p>
      </div>

      {current ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-3xl sm:text-4xl">{weatherEmoji(current.weatherCode)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {current.temperatureC ?? '—'}°C
              </p>
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                {current.weatherDesc}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground sm:grid sm:grid-cols-1 sm:gap-1">
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="h-4 w-4 shrink-0" /> {current.humidityPct ?? '—'}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wind className="h-4 w-4 shrink-0" /> {current.windSpeedKmh ?? '—'} km/j
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 shrink-0" /> {current.visibilityText || '—'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Data cuaca saat ini tidak tersedia</p>
      )}

      {forecastDays.length > 0 && (
        <div className="mt-4 space-y-2">
          {forecastDays.map((day) => (
            <div key={day.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                {day.label} · {day.dateLabel}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {day.hours.map((h) => (
                  <div
                    key={h.localDatetime}
                    className="flex min-w-[4rem] shrink-0 flex-col items-center rounded-md border border-border/50 bg-background px-2 py-1.5 text-center sm:min-w-[4.5rem]"
                  >
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatWeatherTime(h.localDatetime)}
                    </span>
                    <span className="text-lg sm:text-xl">{weatherEmoji(h.weatherCode)}</span>
                    <span className="text-sm font-semibold tabular-nums">{h.temperatureC ?? '—'}°</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-auto pt-3 text-xs text-muted-foreground">
        Sumber:{' '}
        <a
          href="https://data.bmkg.go.id"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          BMKG
        </a>
      </p>
    </div>
  );
}

export function findWeatherItem(
  items: WeatherBatchItem[],
  deviceId: string
): WeatherBatchItem | undefined {
  return items.find((i) => i.device_id === deviceId);
}
