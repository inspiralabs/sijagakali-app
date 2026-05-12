import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { DeviceHealth } from '@/components/DeviceHealth';
import { AlertLog } from '@/components/AlertLog';
import { AppLayout } from '@/components/AppLayout';
import { CctvPanel } from '@/components/CctvPanel';
import { useLiveData } from '@/lib/liveDataContext';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const { devices, alerts, histories } = useLiveData();

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="border-border bg-card/70 p-4 sm:p-5">
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Dashboard Pemantauan</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Pantau kondisi air, status perangkat, dan peringatan penting secara real-time.
          </p>
        </Card>

        <SummaryCards devices={devices} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ringkasan Titik Pantau</h2>
            <span className="text-xs text-muted-foreground">{devices.length} perangkat</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {devices.map(d => <DeviceCard key={d.id} device={d} />)}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <WaterChart devices={devices} histories={histories} />
            <CctvPanel devices={devices} showAdminLinks={true} />
          </div>
          <div className="space-y-6">
            <DeviceHealth devices={devices} />
            <AlertLog alerts={alerts.slice(0, 8)} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
