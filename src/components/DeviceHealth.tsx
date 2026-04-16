import { Device } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Battery, Signal, Thermometer } from 'lucide-react';

interface DeviceHealthProps {
  devices: Device[];
}

export function DeviceHealth({ devices }: DeviceHealthProps) {
  return (
    <div>
      <h3 className="mb-3 font-semibold text-foreground">Kesehatan Perangkat</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {devices.map(d => {
          const battColor = d.battery > 60 ? 'bg-status-normal' : d.battery > 30 ? 'bg-status-waspada' : 'bg-status-bahaya';
          return (
            <Card key={d.id} className="border-border bg-card p-3">
              <p className="mb-2 text-sm font-medium text-foreground">{d.name}</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Battery className="h-3.5 w-3.5" />
                  <div className="flex-1">
                    <Progress value={d.battery} className="h-1.5" indicatorClassName={battColor} />
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
