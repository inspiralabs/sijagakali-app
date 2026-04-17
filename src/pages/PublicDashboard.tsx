import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { AlertLog } from '@/components/AlertLog';
import { SummaryCards } from '@/components/SummaryCards';
import { DangerAlarm } from '@/components/DangerAlarm';
import { Waves, LogIn, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLiveData } from '@/lib/liveDataContext';
import { useTheme } from '@/lib/themeContext';
import { formatWIB } from '@/lib/mockData';

export default function PublicDashboard() {
  const { devices, alerts, histories, lastUpdated } = useLiveData();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <DangerAlarm devices={devices} />

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Waves className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">SiJagaAir</h1>
              <p className="text-[10px] text-muted-foreground">Monitoring Ketinggian Air — Publik</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="hidden sm:inline">LIVE</span>
            </div>
            <span className="text-xs text-muted-foreground hidden md:inline">
              Update: {formatWIB(lastUpdated)}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        <SummaryCards devices={devices} />
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map(d => <DeviceCard key={d.id} device={d} />)}
        </div>
        <WaterChart devices={devices} histories={histories} />
        <AlertLog alerts={alerts.slice(0, 5)} />
      </main>

      <footer className="border-t border-border bg-card px-4 py-4 text-center text-xs text-muted-foreground">
        SiJagaAir — Sistem Informasi Jaga Air · Early Warning System · Desa Bojong Kulur
      </footer>
    </div>
  );
}
