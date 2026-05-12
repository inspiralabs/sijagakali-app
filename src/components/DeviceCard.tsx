import Wave from 'react-wavify';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Card } from '@/components/ui/card';
import { Battery, Signal, Thermometer, Camera, Video, VideoOff, Settings } from 'lucide-react';
import { getSignedUrl } from '@/lib/sijagaair/signedUrlCache';
import { formatWIB } from '@/lib/utils';

interface DeviceCardProps {
  device: Device;
}

function CctvSnapshot({ device }: { device: Device }) {
  const [src, setSrc] = useState<string | null>(device.cctvSignedUrl ?? null);
  const [loading, setLoading] = useState(false);
  const prevPath = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (device.cctvImagePath === prevPath.current) return;
    prevPath.current = device.cctvImagePath;
    if (!device.cctvImagePath) { setSrc(null); return; }
    setLoading(true);
    setSrc(null);
    getSignedUrl(device.cctvImagePath).then((url) => {
      setSrc(url);
      setLoading(false);
    });
  }, [device.cctvImagePath]);

  // Gunakan cctvSignedUrl dari context jika sudah direfresh
  useEffect(() => {
    if (device.cctvSignedUrl) setSrc(device.cctvSignedUrl);
  }, [device.cctvSignedUrl]);

  if (!device.cctvImagePath && !src) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Camera className="mx-auto mb-1 h-8 w-8 opacity-40" />
          <p className="text-xs">Belum ada gambar CCTV</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
          <Camera className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
      )}
      {src && (
        <>
          <img
            src={src}
            alt={`Snapshot CCTV — ${device.name}`}
            className="h-full w-full object-cover"
            onError={() => setSrc(null)}
          />
          {device.cctvCapturedAt && (
            <span className="absolute bottom-1.5 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/90 font-mono">
              {formatWIB(device.cctvCapturedAt)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function CctvLiveStream({ device }: { device: Device }) {
  const url = device.cctvUrl;

  if (!url) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <VideoOff className="mx-auto mb-1 h-8 w-8 opacity-40" />
          <p className="text-xs">Live stream belum dikonfigurasi</p>
          <Link
            to={`/admin/devices/${device.id}`}
            className="mt-1 inline-block text-[10px] text-primary underline"
          >
            Atur di Pengaturan Perangkat
          </Link>
        </div>
      </div>
    );
  }

  // Deteksi tipe URL: iframe untuk embed (mis. RTSP via HLS proxy), video untuk MP4/HLS langsung
  const isIframe = /rtsp:|youtube\.com|youtu\.be|/i.test(url) && !/\.mp4|\.m3u8/i.test(url);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {isIframe ? (
        <iframe
          src={url}
          title={`Live CCTV — ${device.name}`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen"
        />
      ) : (
        <video
          src={url}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          controls
          onError={(e) => {
            (e.target as HTMLVideoElement).style.display = 'none';
          }}
        />
      )}
      <span className="absolute top-1.5 right-2 inline-flex items-center gap-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
        LIVE
      </span>
    </div>
  );
}

export function DeviceCard({ device }: DeviceCardProps) {
  const config = STATUS_CONFIG[device.status];
  const levelPct = Math.min((device.waterLevel / device.maxCapacity) * 100, 100);
  const waveHeight = Math.max(10, levelPct * 0.6);
  const waveSpeed = device.status === 'bahaya' ? 0.15 : device.status === 'siaga' ? 0.2 : 0.3;

  const [cctvTab, setCctvTab] = useState<'snapshot' | 'live'>('snapshot');

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
        <div className="flex items-center gap-2">
          <StatusBadge status={device.status} />
          {device.deploymentSlug && (
            <Link
              to={`/admin/devices/${device.id}`}
              className="text-muted-foreground hover:text-foreground"
              title="Pengaturan perangkat"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
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

      {/* CCTV section */}
      <div className="border-t border-border px-4 pb-4 pt-3">
        {/* Tab bar */}
        <div className="mb-2 flex items-center gap-1">
          <button
            onClick={() => setCctvTab('snapshot')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              cctvTab === 'snapshot'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Camera className="h-3 w-3" />
            Snapshot
          </button>
          <button
            onClick={() => setCctvTab('live')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              cctvTab === 'live'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Video className="h-3 w-3" />
            Live Stream
          </button>
          <span className="ml-auto text-[9px] font-medium text-muted-foreground tracking-wide uppercase">
            CCTV
          </span>
        </div>

        {cctvTab === 'snapshot' ? (
          <CctvSnapshot device={device} />
        ) : (
          <CctvLiveStream device={device} />
        )}
      </div>
    </Card>
  );
}
