import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { Device, STATUS_CONFIG, WaterReading } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEVICE_COLORS = ['hsl(217 91% 60%)', 'hsl(262 83% 65%)', 'hsl(38 92% 50%)', 'hsl(160 70% 42%)'];

interface WaterChartProps {
  devices: Device[];
  histories?: Record<string, WaterReading[]>;
  className?: string;
  fixedDeviceId?: string;
  hideSelector?: boolean;
  hideHeader?: boolean;
  hideLegend?: boolean;
  title?: string;
  /** Tinggi eksplisit chart (px) — wajib untuk embed di modal/dialog. */
  chartHeight?: number;
}

export function WaterChart({
  devices,
  histories,
  className,
  fixedDeviceId,
  hideSelector = false,
  hideHeader = false,
  hideLegend = false,
  title = 'Tren Level Air — Live',
  chartHeight,
}: WaterChartProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>(fixedDeviceId ?? 'all');

  const chartData = useMemo(() => {
    if (!histories || !devices.length) return [];

    if (fixedDeviceId) {
      const hist = histories[fixedDeviceId] ?? [];
      return hist.map((reading) => ({
        time: new Date(reading.timestamp).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }),
        level: reading.waterLevel,
      }));
    }

    const maxLen = Math.max(...devices.map((d) => histories[d.id]?.length ?? 0));
    if (!maxLen) return [];
    const baseHist = histories[devices[0]!.id] ?? [];
    return baseHist.map((reading, idx) => {
      const point: Record<string, unknown> = {
        time: new Date(reading.timestamp).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      devices.forEach((d) => {
        point[d.id] = histories[d.id]?.[idx]?.waterLevel ?? null;
      });
      return point;
    });
  }, [devices, histories, fixedDeviceId]);

  const effectiveSelection = fixedDeviceId ?? selectedDevice;
  const visibleDevices =
    effectiveSelection === 'all'
      ? devices
      : devices.filter((d) => d.id === effectiveSelection);
  const refDevice =
    effectiveSelection === 'all'
      ? devices[0]
      : devices.find((d) => d.id === effectiveSelection) || devices[0];

  const isEmpty = chartData.length === 0;
  const heightPx = chartHeight;

  const chartBody = (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis
        dataKey="time"
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        interval="preserveStartEnd"
        minTickGap={30}
      />
      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} unit=" cm" />
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 8,
          fontSize: 12,
          color: 'hsl(var(--popover-foreground))',
        }}
        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
      />
      {!hideLegend && !fixedDeviceId && <Legend wrapperStyle={{ fontSize: 11 }} />}

      {refDevice && (
        <>
          <ReferenceLine
            y={refDevice.threshold.waspada}
            stroke={STATUS_CONFIG.waspada.hex}
            strokeDasharray="5 5"
            label={{ value: 'Waspada', fill: STATUS_CONFIG.waspada.hex, fontSize: 10 }}
          />
          <ReferenceLine
            y={refDevice.threshold.siaga}
            stroke={STATUS_CONFIG.siaga.hex}
            strokeDasharray="5 5"
            label={{ value: 'Siaga', fill: STATUS_CONFIG.siaga.hex, fontSize: 10 }}
          />
          <ReferenceLine
            y={refDevice.threshold.awas}
            stroke={STATUS_CONFIG.bahaya.hex}
            strokeDasharray="5 5"
            label={{ value: 'Awas', fill: STATUS_CONFIG.bahaya.hex, fontSize: 10 }}
          />
        </>
      )}

      {fixedDeviceId ? (
        <Line
          type="monotone"
          dataKey="level"
          name={refDevice?.name ?? 'Level air'}
          stroke={DEVICE_COLORS[0]}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      ) : (
        visibleDevices.map((d) => (
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
        ))
      )}
    </LineChart>
  );

  return (
    <Card
      className={cn(
        'flex min-h-0 min-w-0 flex-col overflow-hidden border-border/90 bg-card shadow-sm',
        className
      )}
    >
      {!hideHeader && (
        <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {!hideSelector && !fixedDeviceId && (
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Perangkat</SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full min-w-0 px-2 pb-4 sm:px-4',
          heightPx ? 'shrink-0' : 'min-h-[min(18rem,50vw)] flex-1 sm:min-h-72 lg:min-h-0'
        )}
        style={heightPx ? { height: heightPx, minHeight: heightPx } : undefined}
      >
        {isEmpty ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center',
              !heightPx && 'h-full min-h-[12rem]'
            )}
            style={heightPx ? { height: heightPx, minHeight: heightPx } : undefined}
          >
            <p className="text-xs text-muted-foreground">
              Belum ada data historis level air untuk ditampilkan
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={heightPx ?? '100%'}>
            {chartBody}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
