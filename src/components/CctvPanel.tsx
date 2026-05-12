/**
 * CctvPanel — menampilkan grid CCTV (snapshot + live) untuk semua titik pantau.
 * Dipakai di PublicDashboard dan Dashboard admin.
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, VideoOff, Video, Settings, RefreshCw } from 'lucide-react';
import { Device } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSignedUrl } from '@/lib/sijagaair/signedUrlCache';
import { formatWIB } from '@/lib/utils';

interface CctvTileProps {
  device: Device;
  showAdminLink?: boolean;
}

function CctvTile({ device, showAdminLink }: CctvTileProps) {
  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const prevPath = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (device.cctvImagePath === prevPath.current) return;
    prevPath.current = device.cctvImagePath;
    if (!device.cctvImagePath) { setImgSrc(null); return; }
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

  const hasStream = !!device.cctvUrl;
  const isIframe = hasStream && !/\.mp4|\.m3u8/i.test(device.cctvUrl!);

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Tile header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={device.status} />
          <span className="truncate text-xs font-semibold text-foreground">{device.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showAdminLink && (
            <Link
              to={`/admin/devices/${device.id}`}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Pengaturan CCTV"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          )}
          {tab === 'snapshot' && device.cctvImagePath && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              title="Refresh gambar"
            >
              <RefreshCw className={`h-3 w-3 ${imgLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border px-2 py-1">
        <button
          onClick={() => setTab('snapshot')}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
            tab === 'snapshot' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <Camera className="h-3 w-3" />
          Snapshot
        </button>
        <button
          onClick={() => setTab('live')}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
            tab === 'live' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <Video className="h-3 w-3" />
          Live
          {hasStream && (
            <span className="ml-0.5 rounded bg-red-500 px-0.5 text-[8px] text-white font-bold">
              ON
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="relative aspect-video w-full bg-black">
        {tab === 'snapshot' ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
                <Camera className="h-8 w-8 text-muted-foreground opacity-40" />
              </div>
            )}
            {imgSrc && !imgLoading ? (
              <>
                <img
                  src={imgSrc}
                  alt={`Snapshot ${device.name}`}
                  className="h-full w-full object-cover"
                  onError={() => setImgSrc(null)}
                />
                {device.cctvCapturedAt && (
                  <span className="absolute bottom-1.5 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/90 font-mono">
                    {formatWIB(device.cctvCapturedAt)}
                  </span>
                )}
              </>
            ) : !imgLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="mb-1 h-10 w-10 opacity-30" />
                <p className="text-xs">Belum ada gambar</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {!hasStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <VideoOff className="mb-1 h-10 w-10 opacity-30" />
                <p className="text-xs">Stream belum dikonfigurasi</p>
                {showAdminLink && (
                  <Link
                    to={`/admin/devices/${device.id}`}
                    className="mt-1 text-[10px] text-primary underline"
                  >
                    Konfigurasi di sini
                  </Link>
                )}
              </div>
            ) : isIframe ? (
              <iframe
                src={device.cctvUrl}
                title={`Live CCTV ${device.name}`}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen"
              />
            ) : (
              <video
                src={device.cctvUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
                controls
              />
            )}
            {hasStream && (
              <span className="absolute top-1.5 right-2 inline-flex items-center gap-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
                LIVE
              </span>
            )}
          </>
        )}
      </div>

      {/* Footer — level air */}
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>Level air saat ini:</span>
        <span className="font-bold text-foreground">{device.waterLevel} cm</span>
      </div>
    </Card>
  );
}

interface CctvPanelProps {
  devices: Device[];
  /** Tampilkan link pengaturan ke halaman admin (hanya untuk admin, bukan public). */
  showAdminLinks?: boolean;
}

export function CctvPanel({ devices, showAdminLinks = false }: CctvPanelProps) {
  if (!devices.length) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
        <Camera className="h-5 w-5 text-primary" />
        Pantau CCTV
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <CctvTile key={d.id} device={d} showAdminLink={showAdminLinks} />
        ))}
      </div>
    </section>
  );
}
