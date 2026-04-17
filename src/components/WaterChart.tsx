import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { Device, STATUS_CONFIG, WaterReading } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEVICE_COLORS = ['hsl(217 91% 60%)', 'hsl(262 83% 65%)', 'hsl(38 92% 50%)', 'hsl(160 70% 42%)'];

interface WaterChartProps {
  devices: Device[];
  histories?: Record<string, WaterReading[]>;
}

export function WaterChart({ devices, histories }: WaterChartProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  const chartData = useMemo(() => {
    if (!histories || !devices.length) return [];
    // Use the longest device history as the time axis
    const maxLen = Math.max(...devices.map(d => histories[d.id]?.length ?? 0));
    if (!maxLen) return [];
    const baseDevice = devices[0];
    const baseHist = histories[baseDevice.id] ?? [];
    return baseHist.map((reading, idx) => {
      const point: Record<string, unknown> = {
        time: new Date(reading.timestamp).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
        }),
      };
      devices.forEach(d => {
        point[d.id] = histories[d.id]?.[idx]?.waterLevel ?? null;
      });
      return point;
    });
  }, [devices, histories]);

  const visibleDevices = selectedDevice === 'all' ? devices : devices.filter(d => d.id === selectedDevice);
  const refDevice = selectedDevice === 'all' ? devices[0] : devices.find(d => d.id === selectedDevice) || devices[0];

  return (
    <Card className="border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Tren Level Air — Live</h3>
        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Perangkat</SelectItem>
            {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} unit=" cm" />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {refDevice && <>
            <ReferenceLine y={refDevice.threshold.waspada} stroke={STATUS_CONFIG.waspada.hex} strokeDasharray="5 5" label={{ value: 'Waspada', fill: STATUS_CONFIG.waspada.hex, fontSize: 10 }} />
            <ReferenceLine y={refDevice.threshold.siaga} stroke={STATUS_CONFIG.siaga.hex} strokeDasharray="5 5" label={{ value: 'Siaga', fill: STATUS_CONFIG.siaga.hex, fontSize: 10 }} />
            <ReferenceLine y={refDevice.threshold.awas} stroke={STATUS_CONFIG.bahaya.hex} strokeDasharray="5 5" label={{ value: 'Awas', fill: STATUS_CONFIG.bahaya.hex, fontSize: 10 }} />
          </>}

          {visibleDevices.map(d => (
            <Line
              key={d.id}
              type="monotone"
              dataKey={d.id}
              name={d.name}
              stroke={DEVICE_COLORS[devices.indexOf(d) % DEVICE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
