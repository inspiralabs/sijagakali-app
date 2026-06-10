/**
 * CctvPanel — menampilkan grid CCTV (snapshot + live) untuk semua titik pantau.
 * Dipakai di PublicDashboard dan Dashboard admin.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, VideoOff, Video, Settings, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Device, WaterReading } from '@/lib/types';
import type { WeatherBatchItem } from '@/lib/sijagaair/fetchWeather';
import { findWeatherItem, WeatherDeviceInline } from '@/components/WeatherDeviceInline';
import { WaterChart } from '@/components/WaterChart';
import { StatusBadge } from './StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSignedUrl } from '@/lib/sijagaair/signedUrlCache';
import { formatWIB, cn } from '@/lib/utils';

interface CctvTileProps {
  device: Device;
  showAdminLink?: boolean;
  emphasis?: boolean;
  weatherItems?: WeatherBatchItem[];
  weatherLoading?: boolean;
  weatherError?: Error | null;
  histories?: Record<string, WaterReading[]>;
}

function CctvTile({
  device,
  showAdminLink,
  emphasis,
  weatherItems = [],
  weatherLoading,
  weatherError,
  histories,
}: CctvTileProps) {
  const weatherItem = findWeatherItem(weatherItems, device.id);
  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState<'snapshot' | 'live'>('snapshot');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const prevPath = useRef<string | null | undefined>(null);
  const fullscreenTargetRef = useRef<HTMLDivElement | null>(null);
  const [fsActive, setFsActive] = useState(false);

  useEffect(() => {
    const onFs = () => setFsActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!viewerOpen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [viewerOpen]);

  useEffect(() => {
    if (device.cctvImagePath === prevPath.current) return;
    prevPath.current = device.cctvImagePath;
    if (!device.cctvImagePath) {
      setImgSrc(null);
      return;
    }
    setImgLoading(true);
    getSignedUrl(device.cctvImagePath).then((url) => {
      setImgSrc(url);
      setImgLoading(false);
    });
  }, [device.cctvImagePath]);

  useEffect(() => {
    if (device.cctvSignedUrl) setImgSrc(device.cctvSignedUrl);
  }, [device.cctvSignedUrl]);

  const handleRefresh = () => {
    if (!device.cctvImagePath) return;
    setImgLoading(true);
    setImgSrc(null);
    getSignedUrl(device.cctvImagePath).then((url) => {
      setImgSrc(url);
      setImgLoading(false);
    });
  };

  const hasStream = !!(device.cctvUrl && String(device.cctvUrl).trim());
  const isIframe = hasStream && !/\.mp4|\.m3u8/i.test(device.cctvUrl!);

  const canExpandSnapshot = !!device.cctvImagePath;
  const canExpandLive = hasStream;
  /** Perbesar aktif jika salah satu mode punya konten (default tab Snapshot tidak boleh memblokir Live-only). */
  const canExpand = canExpandSnapshot || canExpandLive;

  const openViewer = useCallback(() => {
    if (tab === 'snapshot' && canExpandSnapshot) setViewerTab('snapshot');
    else if (tab === 'live' && canExpandLive) setViewerTab('live');
    else if (canExpandLive) setViewerTab('live');
    else setViewerTab('snapshot');
    setViewerOpen(true);
  }, [tab, canExpandSnapshot, canExpandLive]);

  const toggleBrowserFullscreen = useCallback(async () => {
    const el = fullscreenTargetRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* izin ditolak / iframe membatasi */
    }
  }, []);

  const renderSnapshotBody = (forDialog: boolean) => (
    <>
      {imgLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
          <Camera className="h-10 w-10 text-muted-foreground opacity-40" />
        </div>
      )}
      {imgSrc && !imgLoading ? (
        forDialog ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <img
              src={imgSrc}
              alt={`Snapshot ${device.name}`}
              className="max-h-full max-w-full object-contain"
              onError={() => setImgSrc(null)}
            />
            {device.cctvCapturedAt && (
              <span className="absolute bottom-3 right-3 rounded bg-black/75 px-2 py-1 text-[10px] text-white/95 font-mono">
                {formatWIB(device.cctvCapturedAt)}
              </span>
            )}
          </div>
        ) : (
          <>
            <img
              src={imgSrc}
              alt={`Snapshot ${device.name}`}
              className="h-full w-full object-cover"
              onError={() => setImgSrc(null)}
            />
            {device.cctvCapturedAt && (
              <span className="absolute bottom-3 right-3 rounded bg-black/75 px-2 py-1 text-[10px] text-white/95 font-mono">
                {formatWIB(device.cctvCapturedAt)}
              </span>
            )}
          </>
        )
      ) : !imgLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="mb-2 h-12 w-12 opacity-30" />
          <p className="text-sm">Belum ada gambar</p>
        </div>
      ) : null}
    </>
  );

  const renderLiveBody = (forDialog: boolean) => (
    <>
      {!hasStream ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <VideoOff className="mb-2 h-12 w-12 opacity-30" />
          <p className="text-sm">Stream belum dikonfigurasi</p>
          {showAdminLink && (
            <Link
              to={`/devices/${encodeURIComponent(device.id)}/settings`}
              className="mt-2 text-xs text-primary underline"
            >
              Konfigurasi di sini
            </Link>
          )}
        </div>
      ) : isIframe ? (
        <iframe
          src={device.cctvUrl}
          title={`Live CCTV ${device.name}`}
          className={forDialog ? 'absolute inset-0 h-full w-full border-0' : 'h-full w-full border-0'}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (
        forDialog ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video
              src={device.cctvUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              controls
            />
          </div>
        ) : (
          <video
            src={device.cctvUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            controls
          />
        )
      )}
      {hasStream && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          LIVE
        </span>
      )}
    </>
  );

  return (
    <>
      <Card
        className={`overflow-hidden border-border bg-card shadow-sm transition-shadow hover:shadow-md ${
          emphasis ? 'ring-1 ring-black/[0.04] dark:ring-white/[0.06]' : ''
        }`}
      >
        {/* Tile header */}
        <div
          className={`flex items-center justify-between border-b border-border ${
            emphasis ? 'px-3.5 py-2.5 sm:px-4' : 'px-3 py-2'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <StatusBadge status={device.status} />
            <span
              className={`truncate font-semibold text-foreground ${
                emphasis ? 'text-sm' : 'text-xs'
              }`}
            >
              {device.name}
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={emphasis ? 'h-8 w-8' : 'h-7 w-7'}
              disabled={!canExpand}
              title={canExpand ? 'Perbesar / layar penuh' : 'Tidak ada konten untuk diperbesar'}
              onClick={openViewer}
            >
              <Maximize2 className={emphasis ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            </Button>
            {showAdminLink && (
              <Link
                to={`/devices/${encodeURIComponent(device.id)}/settings`}
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Pengaturan perangkat / CCTV"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
            )}
            {tab === 'snapshot' && device.cctvImagePath && (
              <Button
                variant="ghost"
                size="icon"
                className={emphasis ? 'h-8 w-8' : 'h-7 w-7'}
                onClick={handleRefresh}
                title="Refresh gambar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${imgLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className={`flex gap-1 border-b border-border ${
            emphasis ? 'px-2.5 py-1.5 sm:px-3' : 'px-2 py-1'
          }`}
        >
          <button
            onClick={() => setTab('snapshot')}
            type="button"
            className={`flex items-center gap-1 rounded-md font-medium transition-colors ${
              emphasis ? 'px-2.5 py-1 text-[11px] sm:text-xs' : 'px-2 py-0.5 text-[10px]'
            } ${tab === 'snapshot' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Camera className={emphasis ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
            Snapshot
          </button>
          <button
            onClick={() => setTab('live')}
            type="button"
            className={`flex items-center gap-1 rounded-md font-medium transition-colors ${
              emphasis ? 'px-2.5 py-1 text-[11px] sm:text-xs' : 'px-2 py-0.5 text-[10px]'
            } ${tab === 'live' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Video className={emphasis ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
            Live
            {hasStream && (
              <span className="ml-0.5 rounded bg-red-500 px-0.5 text-[8px] font-bold text-white">ON</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div
          className={`relative w-full bg-black ${
            emphasis ? 'aspect-video min-h-[200px] sm:min-h-[240px] lg:min-h-[260px]' : 'aspect-video'
          }`}
        >
          {tab === 'snapshot' ? renderSnapshotBody(false) : renderLiveBody(false)}
          {canExpand && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 gap-1.5 bg-background/90 text-xs shadow-md backdrop-blur-sm hover:bg-background"
              onClick={openViewer}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Perbesar
            </Button>
          )}
        </div>

        <div
          className={`flex items-center justify-between border-t border-border text-muted-foreground ${
            emphasis ? 'px-3.5 py-2 text-[11px] sm:px-4 sm:text-xs' : 'px-3 py-1.5 text-[10px]'
          }`}
        >
          <span>Level air saat ini:</span>
          <span className="font-bold text-foreground">{device.waterLevel} cm</span>
        </div>
      </Card>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className={cn(
            'flex max-h-[96vh] w-[min(96vw,1280px)] max-w-[96vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:rounded-xl',
            '[&>button]:right-3 [&>button]:top-3 [&>button]:z-[60]'
          )}
        >
          <DialogDescription className="sr-only">
            Tampilan besar CCTV {viewerTab === 'snapshot' ? 'snapshot' : 'live'} untuk {device.name}.
          </DialogDescription>
          <DialogHeader className="shrink-0 space-y-0 border-b border-border bg-card px-4 py-3 pr-12 sm:px-5 sm:pr-14">
            <DialogTitle className="text-left text-base font-semibold leading-snug sm:text-lg">
              {device.name}
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {viewerTab === 'snapshot' ? 'Snapshot CCTV' : 'Live stream'}
              </span>
            </DialogTitle>
            <div className="mt-3 flex gap-1">
              <button
                type="button"
                disabled={!canExpandSnapshot}
                onClick={() => setViewerTab('snapshot')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewerTab === 'snapshot'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary disabled:opacity-40'
                )}
              >
                Snapshot
              </button>
              <button
                type="button"
                disabled={!canExpandLive}
                onClick={() => setViewerTab('live')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewerTab === 'live'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary disabled:opacity-40'
                )}
              >
                Live
              </button>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div
              ref={fullscreenTargetRef}
              className="relative min-h-[min(42vh,420px)] w-full shrink-0 bg-black lg:min-h-[min(48vh,480px)]"
            >
              {viewerTab === 'snapshot' ? renderSnapshotBody(true) : renderLiveBody(true)}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-3 left-3 z-10 gap-1.5 bg-background/90 text-xs shadow-md backdrop-blur-sm hover:bg-background"
                onClick={toggleBrowserFullscreen}
              >
                {fsActive ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Keluar layar penuh
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Layar penuh
                  </>
                )}
              </Button>
            </div>

            <div className="shrink-0 border-t border-border bg-muted/30 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                  <WeatherDeviceInline
                    item={weatherItem}
                    isLoading={weatherLoading}
                    error={weatherError}
                    variant="expanded"
                  />
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Tren level air</h4>
                  {viewerOpen && (
                    <WaterChart
                      key={`${device.id}-chart`}
                      devices={[device]}
                      histories={histories}
                      fixedDeviceId={device.id}
                      hideSelector
                      hideHeader
                      hideLegend
                      chartHeight={240}
                      className="border-0 bg-transparent shadow-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CctvPanelProps {
  devices: Device[];
  /** Tampilkan link pengaturan ke halaman admin (hanya untuk admin, bukan public). */
  showAdminLinks?: boolean;
  /** Ukuran section & tile lebih besar, header lebih tegas (dashboard utama). */
  emphasis?: boolean;
  className?: string;
  weatherItems?: WeatherBatchItem[];
  weatherLoading?: boolean;
  weatherError?: Error | null;
  histories?: Record<string, WaterReading[]>;
}

export function CctvPanel({
  devices,
  showAdminLinks = false,
  emphasis = false,
  className = '',
  weatherItems = [],
  weatherLoading,
  weatherError,
  histories,
}: CctvPanelProps) {
  if (!devices.length) return null;

  return (
    <section
      id="pantau-cctv"
      aria-labelledby="cctv-panel-heading"
      className={`relative overflow-hidden scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 shadow-sm ring-1 ring-black/[0.04] dark:bg-card/40 dark:ring-white/[0.06] ${
        emphasis ? 'p-5 sm:p-6 lg:p-7' : 'p-4 sm:p-5'
      } ${className}`.trim()}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/[0.12] blur-3xl dark:bg-primary/[0.18]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-cyan-500/[0.08] blur-3xl dark:bg-cyan-400/[0.1]"
        aria-hidden
      />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={`flex shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 ${
                emphasis ? 'h-11 w-11' : 'h-9 w-9'
              }`}
            >
              <Camera className={emphasis ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.25} />
            </span>
            <div>
              <h2
                id="cctv-panel-heading"
                className={`font-bold tracking-tight text-foreground ${
                  emphasis ? 'text-lg sm:text-xl' : 'text-base'
                }`}
              >
                Pantau CCTV
              </h2>
              <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-muted-foreground sm:text-xs">
                Snapshot terbaru dan live stream dari berbagai titik pantau
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
            {devices.length} kamera
          </span>
        </div>

        <div
          className={`grid ${
            emphasis
              ? 'gap-5 sm:grid-cols-2 xl:grid-cols-3'
              : 'gap-4 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {devices.map((d) => (
            <CctvTile
              key={d.id}
              device={d}
              showAdminLink={showAdminLinks}
              emphasis={emphasis}
              weatherItems={weatherItems}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              histories={histories}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
