import { useEffect, useState, useRef, useCallback } from 'react';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { AlertTriangle, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DangerAlarmProps {
  devices: Device[];
}

export function DangerAlarm({ devices }: DangerAlarmProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const bahayaDevices = devices.filter(
    d => d.status === 'bahaya' && !dismissed.includes(d.id)
  );

  const playAlarm = useCallback(() => {
    if (muted || audioRef.current) return;
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 800;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Siren effect
      const now = ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        osc.frequency.setValueAtTime(800, now + i * 0.5);
        osc.frequency.linearRampToValueAtTime(1200, now + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(800, now + i * 0.5 + 0.5);
      }
      osc.start();
      oscillatorRef.current = osc;
    } catch (e) {
      // Audio not available
    }
  }, [muted]);

  const stopAlarm = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.close();
      audioRef.current = null;
    }
  }, []);

  // Browser notification
  useEffect(() => {
    const newBahaya = devices.filter(
      d => d.status === 'bahaya' && !notifiedRef.current.has(d.id)
    );
    if (newBahaya.length === 0) return;

    newBahaya.forEach(d => notifiedRef.current.add(d.id));

    if ('Notification' in window && Notification.permission === 'granted') {
      newBahaya.forEach(d => {
        new Notification('⚠️ BAHAYA — SiJagaAir', {
          body: `${d.name} (${d.location}) — Level air ${d.waterLevel} cm telah melewati ambang AWAS!`,
          icon: '/favicon.ico',
          tag: `bahaya-${d.id}`,
        });
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [devices]);

  // Play/stop alarm
  useEffect(() => {
    if (bahayaDevices.length > 0 && !muted) {
      playAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [bahayaDevices.length, muted, playAlarm, stopAlarm]);

  // Remove from notified when no longer bahaya
  useEffect(() => {
    const currentBahaya = new Set(devices.filter(d => d.status === 'bahaya').map(d => d.id));
    notifiedRef.current.forEach(id => {
      if (!currentBahaya.has(id)) notifiedRef.current.delete(id);
    });
  }, [devices]);

  if (bahayaDevices.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] animate-pulse-danger">
      <div className="mx-auto max-w-4xl p-3">
        <div className="rounded-xl border-2 border-destructive bg-destructive/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive-foreground animate-bounce" />
              <div>
                <p className="font-bold text-destructive-foreground">
                  🚨 PERINGATAN BAHAYA — SIAGA 1
                </p>
                <p className="text-sm text-destructive-foreground/90">
                  {bahayaDevices.map(d => `${d.name} (${d.waterLevel} cm)`).join(' • ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
                onClick={() => {
                  setDismissed(prev => [...prev, ...bahayaDevices.map(d => d.id)]);
                  stopAlarm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
