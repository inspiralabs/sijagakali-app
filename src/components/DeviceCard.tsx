import Wave from 'react-wavify';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Card } from '@/components/ui/card';
import { Battery, Signal, Thermometer } from 'lucide-react';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const config = STATUS_CONFIG[device.status];
  const levelPct = Math.min((device.waterLevel / device.maxCapacity) * 100, 100);
  const waveHeight = Math.max(10, levelPct * 0.6);
  const waveSpeed = device.status === 'bahaya' ? 0.15 : device.status === 'siaga' ? 0.2 : 0.3;

  return (
    <Card
      className="relative overflow-hidden border-l-4 bg-card"
      style={{ borderLeftColor: config.hex }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <h3 className="font-semibold text-foreground">{device.name}</h3>
          <p className="text-xs text-muted-foreground">{device.location}</p>
        </div>
        <StatusBadge status={device.status} />
      </div>

      {/* Wave visualization */}
      <div className="relative mx-4 h-32 overflow-hidden rounded-lg bg-secondary">
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <span className="text-3xl font-extrabold text-foreground drop-shadow-lg">
              {device.waterLevel}
            </span>
            <span className="ml-1 text-sm font-medium text-muted-foreground">cm</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0" style={{ height: `${levelPct}%` }}>
          <Wave
            fill={config.hex + 'AA'}
            paused={false}
            style={{ display: 'flex', height: '100%' }}
            options={{
              height: waveHeight,
              amplitude: 12,
              speed: waveSpeed,
              points: 4,
            }}
          />
        </div>
      </div>

      {/* Thresholds */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] text-muted-foreground">
        <span>Waspada: <b className="text-status-waspada">{device.threshold.waspada} cm</b></span>
        <span>Siaga: <b className="text-status-siaga">{device.threshold.siaga} cm</b></span>
        <span>Awas: <b className="text-status-bahaya">{device.threshold.awas} cm</b></span>
      </div>

      {/* Mini stats */}
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Battery className="h-3.5 w-3.5" />
          {device.battery}%
        </span>
        <span className="flex items-center gap-1">
          <Signal className="h-3.5 w-3.5" />
          {device.rssi} dBm
        </span>
        <span className="flex items-center gap-1">
          <Thermometer className="h-3.5 w-3.5" />
          {device.boxTemp}°C
        </span>
      </div>
    </Card>
  );
}
