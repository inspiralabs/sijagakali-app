import { TopBar } from '@/components/TopBar';
import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { DeviceHealth } from '@/components/DeviceHealth';
import { AlertLog } from '@/components/AlertLog';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { mockDevices, mockAlerts } from '@/lib/mockData';

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdated={mockDevices[0].lastSeen} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6 space-y-6">
          <SummaryCards devices={mockDevices} />

          <div className="grid gap-4 md:grid-cols-2">
            {mockDevices.map(d => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </div>

          <WaterChart devices={mockDevices} />
          <DeviceHealth devices={mockDevices} />
          <AlertLog alerts={mockAlerts} />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
