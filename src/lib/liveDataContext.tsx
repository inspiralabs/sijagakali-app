import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Device, AlertEvent, WaterReading, StatusLevel, getStatusFromLevel, STATUS_CONFIG } from './types';
import { mockDevices, mockAlerts, generateWaterHistory, buildAlert } from './mockData';
import { useAuth } from './authContext';

interface LiveDataCtx {
  devices: Device[];
  alerts: AlertEvent[];
  histories: Record<string, WaterReading[]>;
  lastUpdated: string;
}

const Ctx = createContext<LiveDataCtx>({
  devices: mockDevices,
  alerts: mockAlerts,
  histories: {},
  lastUpdated: new Date().toISOString(),
});

const TICK_MS = 4000; // simulate sensor every 4s
const HISTORY_CAP = 200;

/**
 * Drives a sinusoidal cycle per device so each crosses Normal → Waspada → Siaga → Bahaya
 * over ~2 minutes, triggering toasts/notifications continuously.
 */
export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const isAuthRoute = !location.pathname.startsWith('/login') && !location.pathname.startsWith('/public');
  const notificationsEnabled = isLoggedIn && isAuthRoute;

  const [devices, setDevices] = useState<Device[]>(() =>
    mockDevices.map(d => ({ ...d, lastSeen: new Date().toISOString() }))
  );
  const [alerts, setAlerts] = useState<AlertEvent[]>(mockAlerts);
  const [histories, setHistories] = useState<Record<string, WaterReading[]>>(() => {
    const map: Record<string, WaterReading[]> = {};
    mockDevices.forEach(d => { map[d.id] = generateWaterHistory(d, 144); });
    return map;
  });
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const tickRef = useRef(0);
  const notifyRef = useRef(notificationsEnabled);
  useEffect(() => { notifyRef.current = notificationsEnabled; }, [notificationsEnabled]);

  const tick = useCallback(() => {
    tickRef.current += 1;
    const t = tickRef.current;
    const nowIso = new Date().toISOString();
    const newAlerts: AlertEvent[] = [];

    setDevices(prev => {
      const next = prev.map((d, i) => {
        // Cycle: each device offset by i, period 30 ticks (~2min), sweeps base..awas+15
        const period = 30;
        const phase = (t + i * (period / prev.length)) % period;
        const norm = (1 - Math.cos((phase / period) * Math.PI * 2)) / 2; // 0..1..0
        const min = Math.max(10, d.threshold.waspada - 30);
        const max = d.threshold.awas + 18;
        const target = min + (max - min) * norm;
        const noise = (Math.random() - 0.5) * 6;
        const waterLevel = Math.max(0, Math.round(target + noise));
        const status = getStatusFromLevel(waterLevel, d.threshold);

        if (status !== d.status) {
          const updated: Device = { ...d, waterLevel, status, lastSeen: nowIso };
          newAlerts.push(buildAlert(updated, d.status));
        }
        return { ...d, waterLevel, status, lastSeen: nowIso };
      });
      return next;
    });

    setHistories(prev => {
      const map = { ...prev };
      // Use latest computed levels via functional update — re-read via setDevices not possible here, so compute in next frame
      return map;
    });

    setLastUpdated(nowIso);

    if (newAlerts.length) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 500));
      if (notifyRef.current) {
        newAlerts.forEach(a => {
          const cfg = STATUS_CONFIG[a.status];
          const fn =
            a.status === 'bahaya' ? toast.error :
            a.status === 'siaga' ? toast.warning :
            a.status === 'waspada' ? toast.warning :
            toast.success;
          fn(`${cfg.siagaLabel} — ${a.deviceName}`, {
            description: a.description,
            duration: a.status === 'bahaya' ? 8000 : 4000,
          });
        });
      }
    }
  }, []);

  // Append history on every device change
  useEffect(() => {
    setHistories(prev => {
      const map = { ...prev };
      devices.forEach(d => {
        const arr = map[d.id] ? [...map[d.id]] : [];
        arr.push({ timestamp: d.lastSeen, waterLevel: d.waterLevel });
        if (arr.length > HISTORY_CAP) arr.splice(0, arr.length - HISTORY_CAP);
        map[d.id] = arr;
      });
      return map;
    });
  }, [devices]);

  useEffect(() => {
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <Ctx.Provider value={{ devices, alerts, histories, lastUpdated }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLiveData = () => useContext(Ctx);
