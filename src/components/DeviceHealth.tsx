import { Device } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Battery, Signal, Thermometer } from 'lucide-react';

interface DeviceHealthProps {
  devices: Device[];
  /** `stack`: satu kolom (kolom samping dashboard); `grid`: dua kolom di layar lebar. */
  layout?: 'grid' | 'stack';
}

export function DeviceHealth({ devices, layout = 'grid' }: DeviceHealthProps) {
  const gridClass = layout === 'stack' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2';

  return (
    <div className="rounded-xl border border-border/80 bg-card/50 p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Kesehatan perangkat</h3>
      <div className={gridClass}>
        {devices.map(d => {
          return (
            <Card key={d.id} className="border-border bg-card p-3">
              <p className="mb-2 text-sm font-medium text-foreground">{d.name}</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Battery className="h-3.5 w-3.5" />
                  <div className="flex-1">
                    <Progress value={d.battery} className="h-1.5" />
                  </div>
                  <span>{d.battery}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal className="h-3.5 w-3.5" />
                  <span>{d.rssi} dBm</span>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="h-3.5 w-3.5" />
                  <span>{d.boxTemp}°C</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
