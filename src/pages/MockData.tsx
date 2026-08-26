import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/authContext';
import { getSupabase } from '@/lib/supabase';
import { getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import type { StatusSaatIni, WilayahDusun, WilayahRw, WilayahRt, BanjirEvent } from '@/lib/banjir/types';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

type DeviceOption = { device_id: string; location_name: string };
type AuthHeaders = () => Record<string, string>;

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  return supabase;
}

const WATER_STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'waspada', label: 'Waspada' },
  { value: 'siaga', label: 'Siaga' },
  { value: 'bahaya', label: 'Bahaya' },
];

function NotifikasiTab({ devices, slug, authHeaders }: { devices: DeviceOption[]; slug: string; authHeaders: AuthHeaders }) {
  const [deviceId, setDeviceId] = useState('');
  const [waterStatus, setWaterStatus] = useState('waspada');
  const [waterLevelCm, setWaterLevelCm] = useState('');
  const [includeCctv, setIncludeCctv] = useState(false);
  const [cctvImagePath, setCctvImagePath] = useState('node-001/2026-05-09/20260509T084012_node-001.jpg');
  const [messageText, setMessageText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const buildBody = (send: boolean) => ({
    device_id: deviceId,
    deployment_slug: slug,
    water_level_cm: Number(waterLevelCm) || 0,
    water_status: waterStatus,
    include_cctv: includeCctv,
    cctv_image_path: includeCctv ? cctvImagePath.trim() || undefined : undefined,
    send,
    message_text: messageText.trim() || undefined,
  });

  const handlePreview = async () => {
    if (!deviceId) return toast.error('Pilih device terlebih dahulu');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notification/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(buildBody(false)),
      });
      const json = (await res.json()) as { preview?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Gagal membuat pratinjau');
      setPreview(json.preview ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendReal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notification/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(buildBody(true)),
      });
      const json = (await res.json()) as { preview?: string; sent?: boolean; error?: string; gatewayError?: string };
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengirim');
      if (json.sent) {
        toast.success('Notifikasi terkirim ke WhatsApp');
      } else {
        toast.error(json.gatewayError ?? 'Gagal mengirim ke WhatsApp');
      }
      setPreview(json.preview ?? preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setConfirmSend(false);
    }
  };

  return (
    <Card className="max-w-xl space-y-4 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Device</label>
        <Select value={deviceId} onValueChange={setDeviceId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih device" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.device_id} value={d.device_id}>
                {d.location_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
          <Select value={waterStatus} onValueChange={setWaterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WATER_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Level Air (cm)</label>
          <Input type="number" value={waterLevelCm} onChange={(e) => setWaterLevelCm(e.target.value)} placeholder="120" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={includeCctv} onChange={(e) => setIncludeCctv(e.target.checked)} />
        Sertakan foto CCTV terakhir
      </label>
      {includeCctv && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Path Gambar di Storage (bucket cctv-images)
          </label>
          <Input
            value={cctvImagePath}
            onChange={(e) => setCctvImagePath(e.target.value)}
            placeholder="node-001/2026-05-09/20260509T084012_node-001.jpg"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Teks Pesan (opsional)</label>
        <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Kosongkan untuk pakai template default" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={loading} onClick={() => void handlePreview()}>
          Pratinjau
        </Button>
        <Button type="button" variant="destructive" disabled={loading || !deviceId} onClick={() => setConfirmSend(true)}>
          Kirim ke WhatsApp (Asli)
        </Button>
      </div>
      {preview && <Card className="whitespace-pre-wrap bg-muted/50 p-3 text-sm">{preview}</Card>}

      <AlertDialog open={confirmSend} onOpenChange={(o) => !o && setConfirmSend(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim pesan asli?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan mengirim pesan asli ke channel WhatsApp produksi. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSendReal();
              }}
              disabled={loading}
            >
              {loading ? 'Mengirim…' : 'Kirim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

type ChartStatus = { active: boolean; device_id: string | null; deployment_slug: string | null; started_at: string | null };

const AUTO_STOP_MIN = 15;
const STATUS_POLL_MS = 5_000;

function GrafikTab({ devices, slug, authHeaders }: { devices: DeviceOption[]; slug: string; authHeaders: AuthHeaders }) {
  const [deviceId, setDeviceId] = useState('');
  const [status, setStatus] = useState<ChartStatus>({ active: false, device_id: null, deployment_slug: null, started_at: null });
  const [loading, setLoading] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mock-data/chart/status`);
      if (!res.ok) return;
      setStatus((await res.json()) as ChartStatus);
    } catch {
      // abaikan — status tetap seperti sebelumnya
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const remainingMinutes = status.started_at
    ? Math.max(0, Math.ceil(AUTO_STOP_MIN - (Date.now() - new Date(status.started_at).getTime()) / 60_000))
    : 0;

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mock-data/chart/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ device_id: deviceId, deployment_slug: slug }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Gagal memulai demo');
      toast.success('Demo grafik dimulai');
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setConfirmStart(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mock-data/chart/stop`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Gagal menghentikan demo');
      toast.success('Demo grafik dihentikan');
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl space-y-4 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Device</label>
        <Select value={deviceId} onValueChange={setDeviceId} disabled={status.active}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih device" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.device_id} value={d.device_id}>
                {d.location_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Status:{' '}
        {status.active ? (
          <span className="font-medium text-amber-600">Aktif — sisa ~{remainingMinutes} menit</span>
        ) : (
          <span className="font-medium">Tidak aktif</span>
        )}
      </p>
      <div className="flex gap-2">
        <Button type="button" disabled={loading || status.active || !deviceId} onClick={() => setConfirmStart(true)}>
          Mulai
        </Button>
        <Button type="button" variant="outline" disabled={loading || !status.active} onClick={() => void handleStop()}>
          Hentikan
        </Button>
      </div>

      <AlertDialog open={confirmStart} onOpenChange={(o) => !o && setConfirmStart(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai demo grafik?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan menampilkan status air palsu di dashboard PUBLIK untuk pos ini selama maks. 15 menit, dan akan
              mengirim notifikasi WhatsApp ASLI ke channel produksi kalau levelnya melewati ambang waspada. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleStart();
              }}
              disabled={loading}
            >
              {loading ? 'Memulai…' : 'Mulai'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const DEMO_DUSUN_NAMES = ['[DEMO] Dusun A', '[DEMO] Dusun B'];
const DEMO_EVENT_NAME = 'Banjir Demo';

type DemoWarga = {
  nik: string;
  nama_lengkap: string;
  tanggal_lahir: string;
  jenis_kelamin: 'laki-laki' | 'perempuan';
  status_saat_ini: StatusSaatIni;
  dusunIndex: 0 | 1;
};

const DEMO_WARGA: DemoWarga[] = [
  { nik: '3200000000000001', nama_lengkap: 'Budi Santoso', tanggal_lahir: '1985-03-20', jenis_kelamin: 'laki-laki', status_saat_ini: 'mengungsi', dusunIndex: 0 },
  { nik: '3200000000000002', nama_lengkap: 'Siti Aminah', tanggal_lahir: '1990-07-12', jenis_kelamin: 'perempuan', status_saat_ini: 'di_rumah', dusunIndex: 0 },
  { nik: '3200000000000003', nama_lengkap: 'Ahmad Fauzi', tanggal_lahir: '1978-11-05', jenis_kelamin: 'laki-laki', status_saat_ini: 'mengungsi', dusunIndex: 0 },
  { nik: '3200000000000004', nama_lengkap: 'Dewi Lestari', tanggal_lahir: '2001-01-30', jenis_kelamin: 'perempuan', status_saat_ini: 'di_rumah', dusunIndex: 1 },
  { nik: '3200000000000005', nama_lengkap: 'Eko Prasetyo', tanggal_lahir: '1995-09-18', jenis_kelamin: 'laki-laki', status_saat_ini: 'mengungsi', dusunIndex: 1 },
  { nik: '3200000000000006', nama_lengkap: 'Fitriani', tanggal_lahir: '1988-04-25', jenis_kelamin: 'perempuan', status_saat_ini: 'di_rumah', dusunIndex: 1 },
];

function WargaSeedTab({ slug, authHeaders }: { slug: string; authHeaders: AuthHeaders }) {
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const ensureDusun = async (nama: string): Promise<WilayahDusun> => {
    const supabase = requireSupabase();
    const { data: existing } = await supabase
      .from('wilayah_dusun')
      .select('id, deployment_slug, nama')
      .eq('deployment_slug', slug)
      .eq('nama', nama)
      .maybeSingle();
    if (existing) return existing as WilayahDusun;
    const res = await fetch(`${API_BASE}/api/wilayah/dusun`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ deployment_slug: slug, nama }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal membuat dusun ${nama}`);
    const { dusun } = (await res.json()) as { dusun: WilayahDusun };
    return dusun;
  };

  const ensureRw = async (dusunId: string, nama: string): Promise<WilayahRw> => {
    const supabase = requireSupabase();
    const { data: existing } = await supabase
      .from('wilayah_rw')
      .select('id, dusun_id, nama')
      .eq('dusun_id', dusunId)
      .eq('nama', nama)
      .maybeSingle();
    if (existing) return existing as WilayahRw;
    const res = await fetch(`${API_BASE}/api/wilayah/rw`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ dusun_id: dusunId, nama }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal membuat RW ${nama}`);
    const { rw } = (await res.json()) as { rw: WilayahRw };
    return rw;
  };

  const ensureRt = async (rwId: string, nama: string): Promise<WilayahRt> => {
    const supabase = requireSupabase();
    const { data: existing } = await supabase
      .from('wilayah_rt')
      .select('id, rw_id, nama')
      .eq('rw_id', rwId)
      .eq('nama', nama)
      .maybeSingle();
    if (existing) return existing as WilayahRt;
    const res = await fetch(`${API_BASE}/api/wilayah/rt`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rw_id: rwId, nama }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal membuat RT ${nama}`);
    const { rt } = (await res.json()) as { rt: WilayahRt };
    return rt;
  };

  const ensureBanjirEvent = async (): Promise<BanjirEvent> => {
    const supabase = requireSupabase();
    const { data: existing } = await supabase
      .from('banjir_events')
      .select('id, deployment_slug, nama, tanggal_mulai, tanggal_selesai, keterangan')
      .eq('deployment_slug', slug)
      .eq('nama', DEMO_EVENT_NAME)
      .maybeSingle();
    if (existing) return existing as BanjirEvent;
    const res = await fetch(`${API_BASE}/api/banjir/events`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        deployment_slug: slug,
        nama: DEMO_EVENT_NAME,
        tanggal_mulai: new Date().toISOString().slice(0, 10),
        keterangan: 'Data contoh untuk presentasi/demo',
      }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal membuat kejadian demo');
    const { event } = (await res.json()) as { event: BanjirEvent };
    return event;
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const dusuns = await Promise.all(DEMO_DUSUN_NAMES.map((nama) => ensureDusun(nama)));
      const rws = await Promise.all(dusuns.map((d) => ensureRw(d.id, '[DEMO] RW 01')));
      const rts = await Promise.all(rws.map((rw) => ensureRt(rw.id, '[DEMO] RT 01')));
      const event = await ensureBanjirEvent();

      const supabase = requireSupabase();
      const { count } = await supabase
        .from('warga_terdampak')
        .select('id', { count: 'exact', head: true })
        .eq('banjir_event_id', event.id);

      if (!count) {
        for (const w of DEMO_WARGA) {
          const res = await fetch(`${API_BASE}/api/banjir/warga`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              banjir_event_id: event.id,
              deployment_slug: slug,
              nik: w.nik,
              nama_lengkap: w.nama_lengkap,
              tanggal_lahir: w.tanggal_lahir,
              jenis_kelamin: w.jenis_kelamin,
              status_saat_ini: w.status_saat_ini,
              dusun_id: dusuns[w.dusunIndex].id,
              rw_id: rws[w.dusunIndex].id,
              rt_id: rts[w.dusunIndex].id,
            }),
          });
          if (!res.ok) {
            throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal menambah warga ${w.nama_lengkap}`);
          }
        }
      }
      toast.success('Data contoh warga terdampak siap');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const supabase = requireSupabase();
      const { data: event } = await supabase
        .from('banjir_events')
        .select('id')
        .eq('deployment_slug', slug)
        .eq('nama', DEMO_EVENT_NAME)
        .maybeSingle();
      if (event) {
        const res = await fetch(`${API_BASE}/api/banjir/events/${event.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) toast.error(((await res.json()) as { error?: string }).error ?? 'Gagal menghapus kejadian demo');
      }

      const { data: rts } = await supabase.from('wilayah_rt').select('id, rw_id, nama').like('nama', '[DEMO]%');
      for (const rt of rts ?? []) {
        const res = await fetch(`${API_BASE}/api/wilayah/rt/${rt.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) toast.error(((await res.json()) as { error?: string }).error ?? `Gagal menghapus RT ${rt.nama}`);
      }
      const { data: rws } = await supabase.from('wilayah_rw').select('id, dusun_id, nama').like('nama', '[DEMO]%');
      for (const rw of rws ?? []) {
        const res = await fetch(`${API_BASE}/api/wilayah/rw/${rw.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) toast.error(((await res.json()) as { error?: string }).error ?? `Gagal menghapus RW ${rw.nama}`);
      }
      const { data: dusuns } = await supabase
        .from('wilayah_dusun')
        .select('id, deployment_slug, nama')
        .eq('deployment_slug', slug)
        .like('nama', '[DEMO]%');
      for (const d of dusuns ?? []) {
        const res = await fetch(`${API_BASE}/api/wilayah/dusun/${d.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) toast.error(((await res.json()) as { error?: string }).error ?? `Gagal menghapus dusun ${d.nama}`);
      }
      toast.success('Pembersihan data contoh selesai');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card className="max-w-xl space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        Membuat 2 dusun, kejadian "{DEMO_EVENT_NAME}", dan 6 warga contoh berlabel <span className="font-mono">[DEMO]</span>.
        Aman diklik berkali-kali.
      </p>
      <div className="flex gap-2">
        <Button type="button" disabled={seeding} onClick={() => void handleSeed()}>
          {seeding ? 'Mengisi…' : 'Isi Data Contoh'}
        </Button>
        <Button type="button" variant="outline" disabled={cleaning} onClick={() => void handleCleanup()}>
          {cleaning ? 'Menghapus…' : 'Hapus Data Contoh'}
        </Button>
      </div>
    </Card>
  );
}

export default function MockData() {
  const { accessToken } = useAuth();
  const slug = getDefaultDeploymentSlug();
  const [devices, setDevices] = useState<DeviceOption[]>([]);

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` }),
    [accessToken],
  );

  useEffect(() => {
    const fetchDevices = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('device_configs')
        .select('device_id, location_name')
        .eq('deployment_slug', slug)
        .eq('is_active', true)
        .order('location_name');
      if (error) return toast.error('Gagal memuat daftar perangkat', { description: error.message });
      setDevices((data ?? []) as DeviceOption[]);
    };
    void fetchDevices();
  }, [slug]);

  return (
    <AppLayout>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Mock Data</h1>
        <p className="text-sm text-muted-foreground">
          Data contoh untuk presentasi/demo — notifikasi, grafik realtime, dan warga terdampak.
        </p>
      </div>
      <Tabs defaultValue="notifikasi">
        <TabsList>
          <TabsTrigger value="notifikasi">Notifikasi</TabsTrigger>
          <TabsTrigger value="grafik">Grafik Realtime</TabsTrigger>
          <TabsTrigger value="warga">Warga Terdampak</TabsTrigger>
        </TabsList>
        <TabsContent value="notifikasi" className="space-y-4">
          <NotifikasiTab devices={devices} slug={slug} authHeaders={authHeaders} />
        </TabsContent>
        <TabsContent value="grafik" className="space-y-4">
          <GrafikTab devices={devices} slug={slug} authHeaders={authHeaders} />
        </TabsContent>
        <TabsContent value="warga" className="space-y-4">
          <WargaSeedTab slug={slug} authHeaders={authHeaders} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
