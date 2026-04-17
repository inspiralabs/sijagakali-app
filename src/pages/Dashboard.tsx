import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { DeviceHealth } from '@/components/DeviceHealth';
import { AlertLog } from '@/components/AlertLog';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';

export default function Dashboard() {
  const { devices, alerts, histories } = useLiveData();

  return (
    <AppLayout>
      <div className="space-y-6">
        <SummaryCards devices={devices} />

        <div className="grid gap-4 md:grid-cols-2">
          {devices.map(d => <DeviceCard key={d.id} device={d} />)}
        </div>

        <WaterChart devices={devices} histories={histories} />
        <DeviceHealth devices={devices} />
        <AlertLog alerts={alerts.slice(0, 12)} />
      </div>
    </AppLayout>
  );
}
