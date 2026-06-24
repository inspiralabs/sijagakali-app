import { useId, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { Droplets } from 'lucide-react';
import { Device, STATUS_CONFIG, WaterReading, getStatusFromLevel } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

/** Palet biru air — selaras dengan referensi grafik ketinggian */
const WATER = {
  stroke: 'hsl(217 91% 55%)',
  strokeLight: 'hsl(210 96% 68%)',
  fillTop: 'hsl(217 91% 60%)',
  fillMid: 'hsl(210 100% 72%)',
  fillBottom: 'hsl(210 100% 96%)',
};

const DEVICE_COLORS = [
  'hsl(217 91% 60%)',
  'hsl(262 83% 65%)',
  'hsl(38 92% 50%)',
  'hsl(160 70% 42%)',
];

/** Kurva halus seperti gelombang air */
const WAVE_CURVE = 'basis' as const;

type ChartPoint = {
  time: string;
  timestamp: string;
  level?: number | null;
  [deviceId: string]: string | number | null | undefined;
};

function formatWibTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ThresholdStrip({ device, yMax }: { device: Device; yMax: number }) {
  const { threshold } = device;
  const segments = [
    { label: 'Normal', from: 0, to: threshold.waspada, cssVar: '--status-normal' },
    { label: 'Waspada', from: threshold.waspada, to: threshold.siaga, cssVar: '--status-waspada' },
    { label: 'Siaga', from: threshold.siaga, to: threshold.awas, cssVar: '--status-siaga' },
    { label: 'Bahaya', from: threshold.awas, to: yMax, cssVar: '--status-bahaya' },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 px-4 py-3 sm:px-5"
      role="list"
      aria-label="Legenda ambang batas level air"
    >
      {segments.map((seg) => (
        <div key={seg.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground" role="listitem">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: `hsl(var(${seg.cssVar}) / 0.55)` }}
            aria-hidden
          />
          <span>
            {seg.label}{' '}
            <span className="tabular-nums text-foreground/80">
              {seg.from}–{seg.to === yMax ? `${threshold.awas}+` : seg.to} cm
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

interface WaterChartProps {
  devices: Device[];
  histories?: Record<string, WaterReading[]>;
  className?: string;
  fixedDeviceId?: string;
  hideSelector?: boolean;
  hideHeader?: boolean;
  hideLegend?: boolean;
  title?: string;
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
  title = 'Statistik Ketinggian Air',
  chartHeight,
}: WaterChartProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>(fixedDeviceId ?? 'all');
  const waterGradientId = useId().replace(/:/g, '');

  const chartData = useMemo((): ChartPoint[] => {
    if (!histories || !devices.length) return [];

    if (fixedDeviceId) {
      const hist = histories[fixedDeviceId] ?? [];
      return hist.map((reading) => ({
        time: formatWibTime(reading.timestamp),
        timestamp: reading.timestamp,
        level: reading.waterLevel,
      }));
    }

    const maxLen = Math.max(...devices.map((d) => histories[d.id]?.length ?? 0));
    if (!maxLen) return [];
    const baseHist = histories[devices[0]!.id] ?? [];
    return baseHist.map((reading, idx) => {
      const point: ChartPoint = {
        time: formatWibTime(reading.timestamp),
        timestamp: reading.timestamp,
      };
      devices.forEach((d) => {
        point[d.id] = histories[d.id]?.[idx]?.waterLevel ?? null;
      });
      return point;
    });
  }, [devices, histories, fixedDeviceId]);

  const effectiveSelection = fixedDeviceId ?? selectedDevice;
  const isSingleSeries = Boolean(fixedDeviceId) || effectiveSelection !== 'all';
  const visibleDevices =
    effectiveSelection === 'all'
      ? devices
      : devices.filter((d) => d.id === effectiveSelection);
  const refDevice =
    effectiveSelection === 'all'
      ? devices[0]
      : devices.find((d) => d.id === effectiveSelection) || devices[0];

  const nowMarker = useMemo(() => {
    if (!chartData.length) return null;
    const now = Date.now();
    let best: ChartPoint = chartData[0]!;
    for (const point of chartData) {
      const ts = new Date(point.timestamp).getTime();
      if (ts <= now) best = point;
    }
    return best.time;
  }, [chartData]);

  const yMax = useMemo(() => {
    let max = 0;
    for (const point of chartData) {
      if (isSingleSeries) {
        max = Math.max(max, Number(point.level) || 0);
      } else {
        visibleDevices.forEach((d) => {
          max = Math.max(max, Number(point[d.id]) || 0);
        });
      }
    }
    if (refDevice) {
      max = Math.max(max, refDevice.threshold.awas);
    }
    return Math.max(20, Math.ceil((max * 1.12) / 10) * 10);
  }, [chartData, isSingleSeries, visibleDevices, refDevice]);

  const latestSnapshot = useMemo(() => {
    if (!chartData.length || !isSingleSeries) return null;
    const last = chartData[chartData.length - 1]!;
    const level = last.level;
    if (level == null || !refDevice) return null;
    const status = getStatusFromLevel(level, refDevice.threshold);
    return { level, time: last.time, status };
  }, [chartData, isSingleSeries, refDevice]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (isSingleSeries) {
      config.level = {
        label: refDevice?.name ?? 'Ketinggian air',
        color: WATER.stroke,
      };
    } else {
      devices.forEach((d, i) => {
        config[d.id] = {
          label: d.name,
          color: DEVICE_COLORS[i % DEVICE_COLORS.length],
        };
      });
    }
    return config;
  }, [devices, isSingleSeries, refDevice]);

  const isEmpty = chartData.length === 0;
  const heightPx = chartHeight;

  const chartBody = (
    <ComposedChart
      data={chartData}
      margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
    >
      {isSingleSeries && (
        <defs>
          <linearGradient id={waterGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={WATER.fillTop} stopOpacity={0.75} />
            <stop offset="45%" stopColor={WATER.fillMid} stopOpacity={0.45} />
            <stop offset="100%" stopColor={WATER.fillBottom} stopOpacity={0.08} />
          </linearGradient>
        </defs>
      )}

      <CartesianGrid
        vertical={false}
        strokeDasharray="3 3"
        stroke="hsl(var(--border) / 0.55)"
      />
      <XAxis
        dataKey="time"
        tickLine={false}
        axisLine={false}
        tickMargin={10}
        minTickGap={28}
        interval="preserveStartEnd"
        angle={-40}
        textAnchor="end"
        height={52}
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={6}
        width={40}
        domain={[0, yMax]}
        ticks={Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10).filter((t) => t <= yMax)}
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
        tickFormatter={(v) => String(v)}
      />
      <ChartTooltip
        cursor={{
          stroke: WATER.strokeLight,
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
        }}
        content={
          <ChartTooltipContent
            className="border-sky-200/60 bg-background/95 shadow-lg backdrop-blur-sm dark:border-sky-900/40"
            indicator={isSingleSeries ? 'line' : 'dot'}
            formatter={(value) => (
              <span className="font-mono text-sm font-semibold tabular-nums text-sky-700 dark:text-sky-300">
                {value} cm
              </span>
            )}
            labelFormatter={(label) => (
              <span className="font-medium text-foreground">{label}</span>
            )}
          />
        }
      />
      {!hideLegend && !fixedDeviceId && !isSingleSeries && (
        <ChartLegend content={<ChartLegendContent />} />
      )}

      {refDevice && (
        <>
          <ReferenceLine
            y={refDevice.threshold.waspada}
            stroke={STATUS_CONFIG.waspada.hex}
            strokeDasharray="5 5"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <ReferenceLine
            y={refDevice.threshold.siaga}
            stroke={STATUS_CONFIG.siaga.hex}
            strokeDasharray="5 5"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <ReferenceLine
            y={refDevice.threshold.awas}
            stroke={STATUS_CONFIG.bahaya.hex}
            strokeDasharray="5 5"
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        </>
      )}

      {nowMarker && isSingleSeries && (
        <ReferenceLine
          x={nowMarker}
          stroke="hsl(var(--muted-foreground) / 0.45)"
          strokeDasharray="4 6"
          strokeWidth={1.5}
          label={{
            value: 'Sekarang',
            position: 'insideTopRight',
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10,
            angle: -90,
            offset: 10,
          }}
        />
      )}

      {isSingleSeries ? (
        <Area
          type={WAVE_CURVE}
          dataKey="level"
          name={refDevice?.name ?? 'Ketinggian air'}
          stroke={WATER.stroke}
          strokeWidth={2.5}
          fill={`url(#${waterGradientId})`}
          fillOpacity={1}
          dot={false}
          activeDot={{
            r: 6,
            fill: WATER.stroke,
            stroke: 'hsl(var(--background))',
            strokeWidth: 2.5,
          }}
          isAnimationActive={false}
          connectNulls
        />
      ) : (
        visibleDevices.map((d) => (
          <Line
            key={d.id}
            type={WAVE_CURVE}
            dataKey={d.id}
            name={d.name}
            stroke={DEVICE_COLORS[devices.indexOf(d) % DEVICE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: DEVICE_COLORS[devices.indexOf(d) % DEVICE_COLORS.length],
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            connectNulls
          />
        ))
      )}
    </ComposedChart>
  );

  return (
    <Card
      className={cn(
        'flex min-h-0 min-w-0 flex-col overflow-hidden border-border/90 bg-card shadow-sm',
        className
      )}
    >
      {!hideHeader && (
        <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
              <h3 className="font-semibold text-foreground">{title}</h3>
            </div>
            {latestSnapshot && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-sky-700 dark:text-sky-300">
                  {latestSnapshot.level}
                  <span className="ml-0.5 text-sm font-medium text-muted-foreground">cm</span>
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'border-current/30 text-[11px] font-semibold',
                    STATUS_CONFIG[latestSnapshot.status].color
                  )}
                >
                  {STATUS_CONFIG[latestSnapshot.status].label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Terakhir {latestSnapshot.time} WIB
                </span>
              </div>
            )}
          </div>
          {!hideSelector && !fixedDeviceId && (
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="h-9 w-full shrink-0 text-xs sm:w-48">
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
          'w-full min-w-0 px-1 pb-1 pt-1 sm:px-3',
          heightPx ? 'shrink-0' : 'min-h-[min(18rem,50vw)] flex-1 sm:min-h-72 lg:min-h-0'
        )}
        style={heightPx ? { height: heightPx, minHeight: heightPx } : undefined}
      >
        {isEmpty ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-sky-200/60 bg-sky-50/30 px-4 text-center dark:border-sky-900/30 dark:bg-sky-950/20',
              !heightPx && 'h-full min-h-[12rem]'
            )}
            style={heightPx ? { height: heightPx, minHeight: heightPx } : undefined}
          >
            <Droplets className="h-8 w-8 text-sky-400/50" aria-hidden />
            <p className="text-sm font-medium text-muted-foreground">Belum ada data historis</p>
            <p className="max-w-xs text-xs text-muted-foreground/80">
              Gelombang level air akan muncul setelah perangkat mengirim pembacaan
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={cn(
              'h-full w-full justify-start',
              heightPx ? '' : 'aspect-auto min-h-[13rem] sm:min-h-[15rem]'
            )}
            style={heightPx ? { height: heightPx - 4, minHeight: heightPx - 4 } : undefined}
            aria-label="Grafik statistik ketinggian air"
          >
            {chartBody}
          </ChartContainer>
        )}
      </div>

      {!isEmpty && refDevice && !hideHeader && (
        <ThresholdStrip device={refDevice} yMax={yMax} />
      )}
    </Card>
  );
}
