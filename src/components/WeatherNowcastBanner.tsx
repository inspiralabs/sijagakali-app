import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NowcastResponse } from '@/lib/sijagaair/fetchWeather';

interface WeatherNowcastBannerProps {
  data: NowcastResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function WeatherNowcastBanner({ data, isLoading, error }: WeatherNowcastBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;
  if (error) return null;

  const alerts = data?.alerts ?? [];
  if (alerts.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm ring-1 ring-amber-500/20"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">Peringatan dini cuaca BMKG</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {alerts.length} peringatan aktif untuk wilayah titik pantau
          </p>
          <div className="mt-3 space-y-2">
            {alerts.slice(0, expanded ? alerts.length : 1).map((a, i) => (
              <div key={`${a.title}-${i}`} className="rounded-lg border border-amber-500/25 bg-background/60 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                {expanded && a.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
                )}
              </div>
            ))}
          </div>
          {alerts.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 gap-1 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Sembunyikan <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Lihat detail ({alerts.length}) <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
