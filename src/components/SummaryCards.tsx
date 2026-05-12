import { Device } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Activity, AlertTriangle, Droplets, Wifi } from 'lucide-react';

interface SummaryCardsProps {
  devices: Device[];
}

export function SummaryCards({ devices }: SummaryCardsProps) {
  const total = devices.length;
  const bahayaCount = devices.filter(d => d.status === 'bahaya').length;
  const avgLevel = total ? Math.round(devices.reduce((s, d) => s + d.waterLevel, 0) / total) : 0;
  const onlineCount = devices.length; // mock: all online

  const cards = [
    {
      label: 'Titik Pantau',
      value: total,
      icon: Activity,
      accent: 'text-primary',
    },
    {
      label: 'Status Bahaya',
      value: bahayaCount,
      icon: AlertTriangle,
      accent: bahayaCount > 0 ? 'text-status-bahaya animate-pulse-danger' : 'text-muted-foreground',
    },
    {
      label: 'Rata-rata Level',
      value: `${avgLevel} cm`,
      icon: Droplets,
      accent: 'text-status-waspada',
    },
    {
      label: 'Perangkat Online',
      value: `${onlineCount}/${total}`,
      icon: Wifi,
      accent: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="flex items-center gap-3 border-border bg-card p-3.5 sm:p-4">
          <div className={`rounded-lg bg-secondary p-2 ${c.accent} sm:p-2.5`}>
            <c.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold text-foreground sm:text-xl">{c.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
