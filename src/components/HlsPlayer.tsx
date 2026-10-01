import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Batas tonton per klik — tab yang lupa ditutup tidak boleh menghabiskan kuota 4G lokasi. */
export const MAX_WATCH_MS = 5 * 60_000;

type PlayerState = 'idle' | 'playing' | 'stopped' | 'error';

interface HlsPlayerProps {
  src: string;
  poster?: string | null;
  className?: string;
}

/** Live HLS (MediaMTX). Tidak autoplay; stream ditutup saat berhenti/unmount agar kamera berhenti ditarik. */
export function HlsPlayer({ src, poster, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>('idle');

  useEffect(() => {
    if (state !== 'playing') return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setState('error');
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src; // Safari/iOS memutar HLS secara native
    }
    void video.play().catch(() => {});
    const timer = setTimeout(() => setState('stopped'), MAX_WATCH_MS);

    return () => {
      clearTimeout(timer);
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [state, src]);

  const label = state === 'idle' ? 'Putar live' : state === 'stopped' ? 'Lanjut menonton' : 'Coba lagi';

  return (
    <div className={className ?? 'relative h-full w-full bg-black'}>
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        className="h-full w-full object-contain"
        muted
        playsInline
        controls={state === 'playing'}
        onError={() => {
          if (state === 'playing') setState('error');
        }}
      />
      {state !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
          {state === 'error' && (
            <>
              <VideoOff className="h-10 w-10 opacity-60" />
              <p className="text-sm">Kamera offline</p>
            </>
          )}
          {state === 'stopped' && (
            <p className="px-4 text-center text-xs">Live dihentikan otomatis untuk menghemat kuota</p>
          )}
          <Button type="button" size="sm" onClick={() => setState('playing')} className="gap-1">
            <Play className="h-4 w-4" />
            {label}
          </Button>
        </div>
      )}
    </div>
  );
}
