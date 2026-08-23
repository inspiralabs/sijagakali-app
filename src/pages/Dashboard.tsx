import { useMemo } from 'react';
import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { AlertLog } from '@/components/AlertLog';
import { AppLayout } from '@/components/AppLayout';
import { CctvPanel } from '@/components/CctvPanel';
import { useLiveData } from '@/lib/liveDataContext';
import { getMonitoringGridClass } from '@/lib/monitoringLayout';
import { findWeatherItem } from '@/components/WeatherDeviceInline';
import { useWeatherBatch } from '@/lib/sijagakali/useWeatherData';
import { getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';

export default function Dashboard() {
  const { devices, alerts, histories } = useLiveData();
  const gridClass = useMemo(() => getMonitoringGridClass(devices.length), [devices.length]);
  const deploymentSlug = getDefaultDeploymentSlug();
  const weatherBatch = useWeatherBatch(deploymentSlug);
  const weatherItems = weatherBatch.data?.items ?? [];

  return (
    <AppLayout>
      <div className="flex w-full flex-col gap-8 pb-2">
        <SummaryCards devices={devices} />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 border-b border-border/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Titik pantau
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">{devices.length} perangkat</span>
          </div>
          <div className={gridClass}>
            {devices.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                embedCctv={false}
                weatherItem={findWeatherItem(weatherItems, d.id)}
                weatherLoading={weatherBatch.isLoading}
                weatherError={weatherBatch.error}
                showAdminWeatherHints
              />
            ))}
          </div>
        </section>

        <CctvPanel
          devices={devices}
          showAdminLinks
          emphasis
          weatherItems={weatherItems}
          weatherLoading={weatherBatch.isLoading}
          weatherError={weatherBatch.error}
          histories={histories}
        />

        <section
          className="rounded-2xl border border-border/70 bg-card/30 p-4 shadow-sm ring-1 ring-black/[0.03] dark:bg-card/20 dark:ring-white/[0.05] sm:p-5"
          aria-labelledby="tren-peringatan-heading"
        >
          <div className="mb-5 flex flex-col gap-1 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="tren-peringatan-heading"
                className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
              >
                Tren & peringatan
              </h2>
              <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-muted-foreground sm:text-xs">
                Historis level air dan peristiwa terbaru
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[7fr_3fr] lg:items-stretch lg:gap-6 xl:gap-8">
            <div className="min-h-0 min-w-0 lg:min-h-[22rem]">
              <WaterChart devices={devices} histories={histories} className="h-full" />
            </div>
            <div className="min-h-0 min-w-0 lg:min-h-[22rem]">
              <AlertLog alerts={alerts.slice(0, 8)} className="h-full" />
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
