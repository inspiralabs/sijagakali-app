import { TopBar } from '@/components/TopBar';
import { SummaryCards } from '@/components/SummaryCards';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { DeviceHealth } from '@/components/DeviceHealth';
import { AlertLog } from '@/components/AlertLog';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { DangerAlarm } from '@/components/DangerAlarm';
import { mockDevices, mockAlerts } from '@/lib/mockData';
import { useAuth } from '@/lib/authContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/public');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DangerAlarm devices={mockDevices} />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdated={mockDevices[0].lastSeen} onLogout={handleLogout} />
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
