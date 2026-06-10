import { CloudRain, Droplets, Eye, RefreshCw, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeatherBatchItem } from '@/lib/sijagaair/fetchWeather';
import { formatWeatherTime, weatherEmoji } from '@/lib/sijagaair/fetchWeather';

interface WeatherDeviceGridProps {
  items: WeatherBatchItem[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRefresh: () => void;
  attribution?: string;
  showAdminHints?: boolean;
}

function WeatherCardSkeleton() {
  return (
    <Card className="border-border bg-card p-4">
      <Skeleton className="mb-3 h-4 w-2/3" />
      <Skeleton className="mb-2 h-8 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </Card>
  );
}

function WeatherDeviceCard({
  item,
  showAdminHints,
}: {
  item: WeatherBatchItem;
  showAdminHints?: boolean;
}) {
  const forecast = item.forecast;
  const current = forecast?.current;
  const loc = forecast?.location;

  if (!item.adm4) {
    if (!showAdminHints) return null;
    return (
      <Card className="border-dashed border-border bg-card/50 p-4">
        <p className="text-sm font-semibold text-foreground">{item.device_name}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Kode ADM4 BMKG belum dikonfigurasi. Atur di pengaturan perangkat.
        </p>
      </Card>
    );
  }

  if (item.error || !forecast) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-foreground">{item.device_name}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.adm4}</p>
        <p className="mt-2 text-xs text-destructive">{item.error ?? 'Data tidak tersedia'}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="flex items-start justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.device_name}</p>
          <p className="text-xs text-muted-foreground">
            {loc?.desa ? `Desa ${loc.desa}` : item.device_name}
            {loc?.kecamatan ? ` · Kec. ${loc.kecamatan}` : ''}
          </p>
        </div>
        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
          {item.adm4}
        </span>
      </div>

      <div className="px-4 py-3">
        {current ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-3xl" aria-hidden>
              {weatherEmoji(current.weatherCode)}
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {current.temperatureC ?? '—'}°C
              </p>
              <p className="text-sm text-muted-foreground">{current.weatherDesc}</p>
            </div>
            <div className="ml-auto grid gap-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3 w-3" /> {current.humidityPct ?? '—'}%
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind className="h-3 w-3" /> {current.windSpeedKmh ?? '—'} km/j {current.windDir}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> {current.visibilityText || '—'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Data cuaca saat ini tidak tersedia</p>
        )}
        {current?.updatedAt && (
          <p className="mt-2 text-right text-[10px] text-muted-foreground">
            Update: {formatWeatherTime(current.updatedAt)} WIB
          </p>
        )}
      </div>

      {forecast.days.length > 0 && (
        <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
          {forecast.days.map((day) => (
            <div key={day.label} className="mb-3 last:mb-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {day.label} · {day.dateLabel}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {day.hours.map((h) => (
                  <div
                    key={h.localDatetime}
                    className="flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 text-center"
                  >
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {formatWeatherTime(h.localDatetime)}
                    </span>
                    <span className="my-0.5 text-lg">{weatherEmoji(h.weatherCode)}</span>
                    <span className="text-xs font-semibold tabular-nums">{h.temperatureC ?? '—'}°</span>
                    <span className="text-[9px] text-muted-foreground">💧{h.humidityPct ?? '—'}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function WeatherDeviceGrid({
  items,
  isLoading,
  isFetching,
  error,
  onRefresh,
  attribution,
  showAdminHints = false,
}: WeatherDeviceGridProps) {
  const visibleItems = showAdminHints ? items : items.filter((i) => i.adm4 && !i.error);

  if (!import.meta.env.VITE_SIJAGAAIRAPI_URL) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm ring-1 ring-black/[0.03] dark:bg-card/50 dark:ring-white/[0.06]"
      aria-labelledby="weather-section-heading"
    >
      <div className="border-b border-border/60 bg-gradient-to-r from-sky-500/10 via-transparent to-cyan-500/10 px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <CloudRain className="h-4 w-4" />
            </span>
            <div>
              <h2 id="weather-section-heading" className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                Cuaca di titik pantau
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                Prakiraan BMKG per lokasi sensor (3 hari)
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 self-start text-xs sm:self-auto"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WeatherCardSkeleton />
            <WeatherCardSkeleton />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {showAdminHints
              ? 'Belum ada titik pantau dengan kode ADM4 BMKG.'
              : 'Data cuaca belum tersedia untuk titik pantau ini.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <WeatherDeviceCard key={item.device_id} item={item} showAdminHints={showAdminHints} />
            ))}
          </div>
        )}

        {attribution && (
          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            {attribution} ·{' '}
            <a
              href="https://data.bmkg.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              data.bmkg.go.id
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

/** Ringkasan cuaca per device untuk chip di DeviceCard */
export function weatherChipFromBatch(
  items: WeatherBatchItem[],
  deviceId: string
): { temp: string; desc: string } | null {
  const item = items.find((i) => i.device_id === deviceId);
  const cur = item?.forecast?.current;
  if (!cur) return null;
  return {
    temp: cur.temperatureC != null ? `${Math.round(cur.temperatureC)}°C` : '—',
    desc: cur.weatherDesc || '—',
  };
}
