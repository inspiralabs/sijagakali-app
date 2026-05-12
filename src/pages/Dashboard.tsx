import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { AlertLog } from '@/components/AlertLog';
import { AppLayout } from '@/components/AppLayout';
import { CctvPanel } from '@/components/CctvPanel';
import { useLiveData } from '@/lib/liveDataContext';

export default function Dashboard() {
  const { devices, alerts, histories } = useLiveData();

  return (
    <AppLayout>
      <div className="flex w-full flex-col gap-8 pb-2">
        <header className="rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">SiJagaAir</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Dashboard Pemantauan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pantau kondisi air, status perangkat, dan peringatan penting secara real-time.
          </p>
        </header>

        <SummaryCards devices={devices} />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 border-b border-border/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ringkasan titik pantau
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">{devices.length} perangkat</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} embedCctv={false} />
            ))}
          </div>
        </section>

        <CctvPanel devices={devices} showAdminLinks emphasis />

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
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Grafik historis memakai sebagian besar lebar; log peringatan ringkas di samping (~70% / 30%).
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
