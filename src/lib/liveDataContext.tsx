import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Device,
  AlertEvent,
  WaterReading,
  StatusLevel,
  getStatusFromLevel,
  STATUS_CONFIG,
  type DeviceCctvFormPayload,
} from './types';
import { mockDevices, mockAlerts, generateWaterHistory, buildAlert } from './mockData';
import { useAuth } from './authContext';
import { useSiren } from './sirenContext';
import { isSupabaseConfigured, getDefaultDeploymentSlug } from './sijagaairEnv';
import { getSupabase } from './supabase';
import { fetchDashboardSnapshot, fetchAlertHistory } from './sijagaair/fetchDashboard';
import { getSignedUrl } from './sijagaair/signedUrlCache';

export type LiveDataSource = 'mock' | 'supabase';

interface LiveDataCtx {
  devices: Device[];
  alerts: AlertEvent[];
  histories: Record<string, WaterReading[]>;
  lastUpdated: string;
  dataSource: LiveDataSource;
  supabaseError: string | null;
  /** Simpan IP LAN + URL streaming ke state (mock) atau Supabase (RPC). */
  updateDeviceCctv: (deviceId: string, payload: DeviceCctvFormPayload) => Promise<void>;
  /** Resolve signed URL untuk device tertentu (agendo pada cctv_image_path). */
  refreshCctvSignedUrl: (deviceId: string) => Promise<void>;
}

const Ctx = createContext<LiveDataCtx>({
  devices: mockDevices,
  alerts: mockAlerts,
  histories: {},
  lastUpdated: new Date().toISOString(),
  dataSource: 'mock',
  supabaseError: null,
  updateDeviceCctv: async () => {
    toast.error('Penyimpanan CCTV tidak tersedia');
  },
  refreshCctvSignedUrl: async () => {},
});

const TICK_MS = 4000;
const HISTORY_CAP = 200;

function MockLiveDataProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const isAuthRoute = !location.pathname.startsWith('/login');
  const notificationsEnabled = (isLoggedIn || location.pathname.startsWith('/public')) && isAuthRoute;
  const { playFor: playSiren, playNotif } = useSiren();
  const sirenRef = useRef(playSiren);
  const notifRef2 = useRef(playNotif);
  useEffect(() => {
    sirenRef.current = playSiren;
  }, [playSiren]);
  useEffect(() => {
    notifRef2.current = playNotif;
  }, [playNotif]);

  const [devices, setDevices] = useState<Device[]>(() =>
    mockDevices.map((d) => ({ ...d, lastSeen: new Date().toISOString() }))
  );
  const [alerts, setAlerts] = useState<AlertEvent[]>(mockAlerts);
  const [histories, setHistories] = useState<Record<string, WaterReading[]>>(() => {
    const map: Record<string, WaterReading[]> = {};
    mockDevices.forEach((d) => {
      map[d.id] = generateWaterHistory(d, 144);
    });
    return map;
  });
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const tickRef = useRef(0);
  const notifyRef = useRef(notificationsEnabled);
  useEffect(() => {
    notifyRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const tick = useCallback(() => {
    tickRef.current += 1;
    const t = tickRef.current;
    const nowIso = new Date().toISOString();
    const newAlerts: AlertEvent[] = [];

    setDevices((prev) => {
      return prev.map((d, i) => {
        const period = 30;
        const phase = (t + i * (period / prev.length)) % period;
        const norm = (1 - Math.cos((phase / period) * Math.PI * 2)) / 2;
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
    });

    setHistories((prev) => ({ ...prev }));
    setLastUpdated(nowIso);

    if (newAlerts.length) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 500));
      if (notifyRef.current) {
        newAlerts.forEach((a) => {
          const cfg = STATUS_CONFIG[a.status];
          const fn =
            a.status === 'bahaya'
              ? toast.error
              : a.status === 'siaga'
                ? toast.warning
                : a.status === 'waspada'
                  ? toast.warning
                  : toast.success;
          fn(`${cfg.siagaLabel} — ${a.deviceName}`, {
            description: a.description,
            duration: a.status === 'bahaya' ? 8000 : 4000,
          });
          if (a.status === 'siaga' || a.status === 'bahaya') {
            sirenRef.current(a.status);
          } else {
            notifRef2.current(a.status === 'waspada' ? 'warn' : 'info');
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    setHistories((prev) => {
      const map = { ...prev };
      devices.forEach((d) => {
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

  const updateDeviceCctv = useCallback(async (deviceId: string, payload: DeviceCctvFormPayload) => {
    const ip = payload.cctvLocalIp.trim();
    const url = payload.streamPlaybackUrl.trim();
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, cctvLocalIp: ip || undefined, cctvUrl: url || undefined }
          : d
      )
    );
    toast.success('Konfigurasi CCTV disimpan (mode simulasi lokal).');
  }, []);

  const refreshCctvSignedUrl = useCallback(async (_deviceId: string) => {}, []);

  return (
    <Ctx.Provider
      value={{
        devices,
        alerts,
        histories,
        lastUpdated,
        dataSource: 'mock',
        supabaseError: null,
        updateDeviceCctv,
        refreshCctvSignedUrl,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function isStatusLevel(s: unknown): s is StatusLevel {
  return s === 'normal' || s === 'waspada' || s === 'siaga' || s === 'bahaya';
}

function SupabaseLiveDataProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const isAuthRoute = !location.pathname.startsWith('/login');
  const notificationsEnabled = (isLoggedIn || location.pathname.startsWith('/public')) && isAuthRoute;
  const notifyRef = useRef(notificationsEnabled);
  useEffect(() => {
    notifyRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const { playFor: playSiren, playNotif } = useSiren();
  const sirenRef = useRef(playSiren);
  const notifRef2 = useRef(playNotif);
  useEffect(() => {
    sirenRef.current = playSiren;
  }, [playSiren]);
  useEffect(() => {
    notifRef2.current = playNotif;
  }, [playNotif]);

  const deploymentSlug = getDefaultDeploymentSlug();
  const slugRef = useRef(deploymentSlug);
  slugRef.current = deploymentSlug;

  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [histories, setHistories] = useState<Record<string, WaterReading[]>>({});
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Fetch awal data
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    if (!supabase) return;

    Promise.all([
      fetchDashboardSnapshot(supabase, deploymentSlug),
      fetchAlertHistory(supabase, deploymentSlug),
    ])
      .then(([{ devices: d, histories: h }, alertHistory]) => {
        if (cancelled) return;
        setDevices(d);
        setHistories(h);
        setAlerts(alertHistory);
        setLastUpdated(new Date().toISOString());
        setSupabaseError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setSupabaseError(msg);
        toast.error('Gagal memuat data SiJagaAir', { description: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [deploymentSlug]);

  // Supabase Realtime — INSERT sensor_readings
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('sensor_readings_inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'sijagaair',
          table: 'sensor_readings',
          filter: `deployment_slug=eq.${deploymentSlug}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.deployment_slug !== slugRef.current) return;
          const deviceId = String(row.device_id ?? '');
          const recordedAt = String(row.recorded_at ?? '');
          const waterLevel = Math.round(Number(row.water_level_cm ?? 0));
          const rawStatus = row.water_status;
          const cctvImagePath = (row.cctv_image_path as string | null) ?? null;
          const cctvCapturedAt = (row.cctv_captured_at as string | null) ?? null;

          setDevices((prev) => {
            const newAlerts: AlertEvent[] = [];
            const next = prev.map((d) => {
              if (d.id !== deviceId) return d;
              const status: StatusLevel =
                isStatusLevel(rawStatus)
                  ? rawStatus
                  : getStatusFromLevel(waterLevel, d.threshold);
              if (status !== d.status) {
                const updated: Device = {
                  ...d,
                  waterLevel,
                  status,
                  lastSeen: recordedAt,
                  rssi: typeof row.rssi === 'number' ? row.rssi : d.rssi,
                  battery: typeof row.battery_pct === 'number' ? row.battery_pct : d.battery,
                  cctvImagePath,
                  cctvCapturedAt,
                  cctvSignedUrl: null, // akan direfresh oleh komponen yang perlu
                };
                newAlerts.push(buildAlert(updated, d.status));
              }
              return {
                ...d,
                waterLevel,
                status,
                lastSeen: recordedAt,
                rssi: typeof row.rssi === 'number' ? row.rssi : d.rssi,
                battery: typeof row.battery_pct === 'number' ? row.battery_pct : d.battery,
                cctvImagePath,
                cctvCapturedAt,
                cctvSignedUrl: null,
              };
            });

            if (newAlerts.length) {
              queueMicrotask(() => {
                setAlerts((prevAlerts) => [...newAlerts, ...prevAlerts].slice(0, 500));
                if (!notifyRef.current) return;
                newAlerts.forEach((ev) => {
                  const cfg = STATUS_CONFIG[ev.status];
                  const fn =
                    ev.status === 'bahaya'
                      ? toast.error
                      : ev.status === 'siaga'
                        ? toast.warning
                        : ev.status === 'waspada'
                          ? toast.warning
                          : toast.success;
                  fn(`${cfg.siagaLabel} — ${ev.deviceName}`, {
                    description: ev.description,
                    duration: ev.status === 'bahaya' ? 8000 : 4000,
                  });
                  if (ev.status === 'siaga' || ev.status === 'bahaya') {
                    sirenRef.current(ev.status);
                  } else {
                    notifRef2.current(ev.status === 'waspada' ? 'warn' : 'info');
                  }
                });
              });
            }
            return next;
          });

          setHistories((prev) => {
            const copy = { ...prev };
            const arr = [...(copy[deviceId] ?? [])];
            arr.push({ timestamp: recordedAt, waterLevel });
            if (arr.length > HISTORY_CAP) arr.splice(0, arr.length - HISTORY_CAP);
            copy[deviceId] = arr;
            return copy;
          });

          setLastUpdated(new Date().toISOString());
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [deploymentSlug]);

  // Resolve signed URL untuk device tertentu
  const refreshCctvSignedUrl = useCallback(async (deviceId: string) => {
    setDevices((prev) => {
      const device = prev.find((d) => d.id === deviceId);
      if (!device?.cctvImagePath) return prev;
      const path = device.cctvImagePath;
      getSignedUrl(path).then((url) => {
        setDevices((latest) =>
          latest.map((d) =>
            d.id === deviceId && d.cctvImagePath === path
              ? { ...d, cctvSignedUrl: url }
              : d
          )
        );
      });
      return prev;
    });
  }, []);

  const updateDeviceCctv = useCallback(
    async (deviceId: string, payload: DeviceCctvFormPayload) => {
      const supabase = getSupabase();
      if (!supabase) {
        toast.error('Supabase tidak tersedia');
        return;
      }
      const ip = payload.cctvLocalIp.trim();
      const url = payload.streamPlaybackUrl.trim();
      const { error } = await supabase.rpc('update_device_cctv_config', {
        p_deployment_slug: deploymentSlug,
        p_device_id: deviceId,
        p_cctv_local_ip: ip.length ? ip : null,
        p_stream_playback_url: url.length ? url : null,
      });
      if (error) {
        const hint =
          /function .* does not exist|schema cache/i.test(error.message)
            ? ' Jalankan migrasi `20260212140000_rpc_update_device_cctv.sql` pada database Supabase.'
            : '';
        toast.error('Gagal menyimpan CCTV', { description: `${error.message}${hint}` });
        throw error;
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? { ...d, cctvLocalIp: ip || undefined, cctvUrl: url || undefined }
            : d
        )
      );
      setLastUpdated(new Date().toISOString());
      toast.success('Konfigurasi CCTV disimpan.');
    },
    [deploymentSlug]
  );

  return (
    <Ctx.Provider
      value={{
        devices,
        alerts,
        histories,
        lastUpdated,
        dataSource: 'supabase',
        supabaseError,
        updateDeviceCctv,
        refreshCctvSignedUrl,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    return <SupabaseLiveDataProvider>{children}</SupabaseLiveDataProvider>;
  }
  return <MockLiveDataProvider>{children}</MockLiveDataProvider>;
}

export const useLiveData = () => useContext(Ctx);
