import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { generateWaterHistory } from '@/lib/mockData';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEVICE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

interface WaterChartProps {
  devices: Device[];
}

export function WaterChart({ devices }: WaterChartProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  const chartData = useMemo(() => {
    const histories = devices.map(d => ({
      id: d.id,
      name: d.name,
      readings: generateWaterHistory(d),
    }));

    // Sample every 12th reading (hourly) for readability
    const sampled = histories[0].readings
      .filter((_, i) => i % 12 === 0)
      .map((_, idx) => {
        const point: Record<string, unknown> = {
          time: new Date(histories[0].readings[idx * 12].timestamp).toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        histories.forEach(h => {
          point[h.id] = h.readings[idx * 12]?.waterLevel ?? 0;
        });
        return point;
      });
    return sampled;
  }, [devices]);

  const visibleDevices = selectedDevice === 'all' ? devices : devices.filter(d => d.id === selectedDevice);
  const refDevice = selectedDevice === 'all' ? devices[0] : devices.find(d => d.id === selectedDevice) || devices[0];

  return (
    <Card className="border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Tren Level Air — 24 Jam</h3>
        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Perangkat</SelectItem>
            {devices.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
          <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} unit=" cm" />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(220, 18%, 13%)', border: '1px solid hsl(220, 14%, 20%)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          <ReferenceLine y={refDevice.threshold.waspada} stroke={STATUS_CONFIG.waspada.hex} strokeDasharray="5 5" label={{ value: 'Waspada', fill: STATUS_CONFIG.waspada.hex, fontSize: 10 }} />
          <ReferenceLine y={refDevice.threshold.siaga} stroke={STATUS_CONFIG.siaga.hex} strokeDasharray="5 5" label={{ value: 'Siaga', fill: STATUS_CONFIG.siaga.hex, fontSize: 10 }} />
          <ReferenceLine y={refDevice.threshold.awas} stroke={STATUS_CONFIG.bahaya.hex} strokeDasharray="5 5" label={{ value: 'Awas', fill: STATUS_CONFIG.bahaya.hex, fontSize: 10 }} />

          {visibleDevices.map((d, i) => (
            <Line
              key={d.id}
              type="monotone"
              dataKey={d.id}
              name={d.name}
              stroke={DEVICE_COLORS[devices.indexOf(d) % DEVICE_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
