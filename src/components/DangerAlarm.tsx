import { useEffect, useState, useRef } from 'react';
import { Device } from '@/lib/types';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DangerAlarmProps {
  devices: Device[];
}

export function DangerAlarm({ devices }: DangerAlarmProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  const bahayaDevices = devices.filter(
    d => d.status === 'bahaya' && !dismissed.includes(d.id)
  );

  // Browser notification (visual only — no sound)
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
          icon: '/logo.png',
          tag: `bahaya-${d.id}`,
          silent: true,
        });
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [devices]);

  // Cleanup notified set when device leaves bahaya
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-foreground hover:bg-destructive-foreground/20"
              onClick={() => setDismissed(prev => [...prev, ...bahayaDevices.map(d => d.id)])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
