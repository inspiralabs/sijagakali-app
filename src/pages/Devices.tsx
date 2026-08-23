import { useEffect, useState } from 'react';
import { mockDevices } from '@/lib/mockData';
import { Device } from '@/lib/types';
import { useLiveData } from '@/lib/liveDataContext';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured, getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import { getSupabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { formatWIB } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Link } from 'react-router-dom';
import { Plus, Trash2, Settings2, Bell, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

const DEVICE_ID_RE = /^[a-zA-Z0-9._-]{1,120}$/;

type DeviceFormState = {
  /** Hanya dipakai saat tambah perangkat Supabase (POST). */
  newDeviceId: string;
  name: string;
  location: string;
  mac: string;
  lat: string;
  lng: string;
  cctvUrl: string;
  sensorHeightCm: string;
  waspada: string;
  siaga: string;
  awas: string;
  reportInterval: string;
};

const EMPTY: DeviceFormState = {
  newDeviceId: '',
  name: '',
  location: '',
  mac: '',
  lat: '',
  lng: '',
  cctvUrl: '',
  sensorHeightCm: '250',
  waspada: '',
  siaga: '',
  awas: '',
  reportInterval: '300',
};

function parseOptionalCoord(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type InactiveDeviceRow = {
  id: string;
  deploymentSlug: string;
  name: string;
  location: string;
  mac: string;
  lastSeen: string | null;
};

export default function Devices() {
  const { devices: supabaseDevices, refreshDashboard } = useLiveData();
  const { accessToken } = useAuth();
  const [localMockDevices, setLocalMockDevices] = useState<Device[]>(mockDevices);
  const fromSupabase = isSupabaseConfigured();
  const devices = fromSupabase ? supabaseDevices : localMockDevices;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DeviceFormState>(EMPTY);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');
  const [formSaving, setFormSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [inactiveDevices, setInactiveDevices] = useState<InactiveDeviceRow[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchInactiveDevices = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const slug = getDefaultDeploymentSlug();
    const { data, error } = await supabase
      .from('device_configs')
      .select('device_id, deployment_slug, location_name, display_name, mac_address, last_seen_at')
      .eq('deployment_slug', slug)
      .eq('is_active', false)
      .order('device_id');
    if (error) {
      toast.error('Gagal memuat perangkat nonaktif', { description: error.message });
      return;
    }
    setInactiveDevices(
      (data ?? []).map((r) => ({
        id: r.device_id as string,
        deploymentSlug: r.deployment_slug as string,
        name: ((r.display_name as string | null)?.trim() || (r.location_name as string)) as string,
        location: r.location_name as string,
        mac: (r.mac_address as string | null)?.trim() || `— ${r.device_id}`,
        lastSeen: r.last_seen_at as string | null,
      }))
    );
  };

  useEffect(() => {
    if (fromSupabase) void fetchInactiveDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSupabase]);

  const openConfirm = (id: string, mode: 'soft' | 'permanent') => {
    setDeleteMode(mode);
    setConfirmDeleteId(id);
  };

  const handleRestore = async (id: string) => {
    if (!accessToken) {
      toast.error('Sesi tidak valid', { description: 'Silakan masuk ulang sebagai admin.' });
      return;
    }
    const d = inactiveDevices.find((x) => x.id === id);
    const slug = d?.deploymentSlug ?? getDefaultDeploymentSlug();
    setRestoringId(id);
    try {
      const res = await fetch(
        `${API_BASE}/api/device/${encodeURIComponent(id)}/restore?deployment_slug=${encodeURIComponent(slug)}`,
        { method: 'PATCH', headers: authHeadersBearerOnly() }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await refreshDashboard();
      await fetchInactiveDevices();
      toast.success(d ? `Perangkat "${d.name}" diaktifkan kembali` : 'Perangkat diaktifkan kembali');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal mengaktifkan kembali', { description: msg });
    } finally {
      setRestoringId(null);
    }
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken ?? ''}`,
  });

  const authHeadersBearerOnly = () => ({
    Authorization: `Bearer ${accessToken ?? ''}`,
  });

  const openCreate = () => {
    setForm(fromSupabase ? { ...EMPTY, reportInterval: '3600' } : { ...EMPTY });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = {
      waspada: Number(form.waspada) || 0,
      siaga: Number(form.siaga) || 0,
      awas: Number(form.awas) || 0,
    };
    if (!(threshold.waspada < threshold.siaga && threshold.siaga < threshold.awas)) {
      toast.error('Ambang tidak valid', {
        description: 'Harus memenuhi: waspada < siaga < bahaya (awas).',
      });
      return;
    }

    if (!fromSupabase) {
      const id = `esp_${Date.now()}`;
      const sh = Number(form.sensorHeightCm) || 250;
      setLocalMockDevices((prev) => [
        ...prev,
        {
          id,
          name: form.name || form.location,
          location: form.location,
          mac: form.mac,
          lat: Number(form.lat) || 0,
          lng: Number(form.lng) || 0,
          cctvUrl: form.cctvUrl || undefined,
          sensorHeightCm: sh,
          waterLevel: 0,
          maxCapacity: Math.max(threshold.awas + 50, 200),
          threshold,
          battery: 100,
          rssi: -60,
          boxTemp: 30,
          reportInterval: Number(form.reportInterval) || 300,
          status: 'normal',
          lastSeen: new Date().toISOString(),
        },
      ]);
      toast.success(`Perangkat "${form.name || form.location}" ditambahkan`);
      setDialogOpen(false);
      setForm(EMPTY);
      return;
    }

    if (!accessToken) {
      toast.error('Sesi tidak valid', { description: 'Silakan masuk ulang sebagai admin.' });
      return;
    }

    const slug = getDefaultDeploymentSlug();
    const locationName = form.location.trim();
    if (!locationName) {
      toast.error('Lokasi (deskripsi) wajib diisi');
      return;
    }
    const displayName = form.name.trim() || null;
    const sensorHeightCm = Number(form.sensorHeightCm);
    if (!Number.isFinite(sensorHeightCm) || sensorHeightCm <= 0) {
      toast.error('Tinggi sensor (cm) harus angka positif');
      return;
    }
    const readIntervalSec = Math.round(Number(form.reportInterval));
    if (!Number.isInteger(readIntervalSec) || readIntervalSec < 10) {
      toast.error('Interval laporan harus bilangan bulat minimal 10 detik');
      return;
    }

    const macTrim = form.mac.trim();
    const lat = parseOptionalCoord(form.lat);
    const lng = parseOptionalCoord(form.lng);
    const streamUrl = form.cctvUrl.trim();

    setFormSaving(true);
    try {
      const newId = form.newDeviceId.trim();
      if (!DEVICE_ID_RE.test(newId)) {
        toast.error('ID perangkat tidak valid', {
          description: '1–120 karakter: huruf, angka, titik, garis bawah, tanda hubung.',
        });
        setFormSaving(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/device`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: slug,
          device_id: newId,
          location_name: locationName,
          display_name: displayName,
          sensor_height_cm: sensorHeightCm,
          read_interval_sec: readIntervalSec,
          threshold_waspada_cm: threshold.waspada,
          threshold_siaga_cm: threshold.siaga,
          threshold_bahaya_cm: threshold.awas,
          stream_playback_url: streamUrl.length ? streamUrl : null,
          mac_address: macTrim.length ? macTrim : null,
          latitude: lat,
          longitude: lng,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast.success('Perangkat ditambahkan');
      await refreshDashboard();
      setDialogOpen(false);
      setForm(EMPTY);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal menambah perangkat', {
        description: msg,
      });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (!fromSupabase) {
      const d = devices.find((x) => x.id === confirmDeleteId);
      setLocalMockDevices((prev) => prev.filter((x) => x.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      if (d) toast.success(`Perangkat "${d.name}" dihapus`);
      return;
    }
    if (!accessToken) {
      toast.error('Sesi tidak valid', { description: 'Silakan masuk ulang sebagai admin.' });
      return;
    }
    const isPermanent = deleteMode === 'permanent';
    const d = isPermanent
      ? inactiveDevices.find((x) => x.id === confirmDeleteId)
      : devices.find((x) => x.id === confirmDeleteId);
    const slug = d?.deploymentSlug ?? getDefaultDeploymentSlug();
    setDeleteSaving(true);
    try {
      const url = isPermanent
        ? `${API_BASE}/api/device/${encodeURIComponent(confirmDeleteId)}/permanent?deployment_slug=${encodeURIComponent(slug)}`
        : `${API_BASE}/api/device/${encodeURIComponent(confirmDeleteId)}?deployment_slug=${encodeURIComponent(slug)}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeadersBearerOnly() });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if (isPermanent) {
        await fetchInactiveDevices();
        toast.success(d ? `Perangkat "${d.name}" dihapus permanen` : 'Perangkat dihapus permanen');
      } else {
        await refreshDashboard();
        await fetchInactiveDevices();
        toast.success(d ? `Perangkat "${d.name}" dinonaktifkan` : 'Perangkat dinonaktifkan');
      }
      setConfirmDeleteId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isPermanent ? 'Gagal menghapus permanen' : 'Gagal menonaktifkan perangkat', { description: msg });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Manajemen Perangkat</h2>
        <Button size="sm" className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Perangkat
        </Button>
      </div>
      {fromSupabase && (
        <p className="mb-3 text-xs text-muted-foreground">
          Tambah atau nonaktifkan dari sini. Mengubah nama, lokasi, ambang, sensor, MAC, dan koordinat: buka{' '}
          <strong>Pengaturan</strong> pada baris perangkat.
        </p>
      )}

      <Card className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Lokasi</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">MAC Address</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Terakhir Terlihat</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{d.mac}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {formatWIB(d.lastSeen)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                      {fromSupabase && (
                        <Button variant="outline" size="sm" className="h-8 gap-1 px-2" asChild>
                          <Link
                            to={`/devices/${encodeURIComponent(d.id)}/notifications`}
                            title="Halaman Peringatan — WhatsApp, test, log"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Peringatan</span>
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 gap-1 px-2" asChild>
                        <Link
                          to={`/devices/${encodeURIComponent(d.id)}/settings`}
                          title="Ubah data perangkat, lokasi, ambang, CCTV, dan interval"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Pengaturan</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => openConfirm(d.id, 'soft')}
                        aria-label={fromSupabase ? 'Nonaktifkan' : 'Hapus'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {inactiveDevices.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 bg-muted/30 opacity-70">
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{d.mac}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      Nonaktif
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {d.lastSeen ? formatWIB(d.lastSeen) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2"
                        onClick={() => void handleRestore(d.id)}
                        disabled={restoringId === d.id}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">
                          {restoringId === d.id ? 'Memproses…' : 'Aktifkan'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => openConfirm(d.id, 'permanent')}
                        aria-label="Hapus permanen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && inactiveDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada perangkat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah perangkat baru</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit}>
            {fromSupabase && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ID Perangkat (device_id)</label>
                <Input
                  value={form.newDeviceId}
                  onChange={(e) => setForm({ ...form, newDeviceId: e.target.value })}
                  placeholder="node-004"
                  required
                  pattern="[a-zA-Z0-9._\-]{1,120}"
                  title="1–120 karakter: huruf, angka, titik, garis bawah, tanda hubung"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama tampilan</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Titik pantau 1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Opsional. Untuk kolom &quot;Nama&quot; di tabel. Kosongkan agar pakai teks lokasi saja.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi (deskripsi)</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Sungai Cileungsi — segment hulu dekat jembatan"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tinggi sensor dari dasar sungai (cm)</label>
              <Input
                value={form.sensorHeightCm}
                onChange={(e) => setForm({ ...form, sensorHeightCm: e.target.value })}
                type="number"
                min={1}
                max={50000}
                placeholder="250"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">MAC Address</label>
              <Input
                value={form.mac}
                onChange={(e) => setForm({ ...form, mac: e.target.value })}
                placeholder="A4:CF:12:7B:3E:01 (opsional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Latitude</label>
                <Input
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="-6.548"
                  type="number"
                  step="any"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Longitude</label>
                <Input
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="107.012"
                  type="number"
                  step="any"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL CCTV (opsional)</label>
              <Input value={form.cctvUrl} onChange={(e) => setForm({ ...form, cctvUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Waspada (cm)</label>
                <Input
                  value={form.waspada}
                  onChange={(e) => setForm({ ...form, waspada: e.target.value })}
                  type="number"
                  placeholder="120"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Siaga (cm)</label>
                <Input
                  value={form.siaga}
                  onChange={(e) => setForm({ ...form, siaga: e.target.value })}
                  type="number"
                  placeholder="160"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Bahaya (cm)</label>
                <Input
                  value={form.awas}
                  onChange={(e) => setForm({ ...form, awas: e.target.value })}
                  type="number"
                  placeholder="200"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Interval Laporan (detik)</label>
              <Input
                value={form.reportInterval}
                onChange={(e) => setForm({ ...form, reportInterval: e.target.value })}
                type="number"
                placeholder={fromSupabase ? '3600' : '300'}
                min={10}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={formSaving}>
              {formSaving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && !deleteSaving && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {!fromSupabase ? 'Hapus perangkat?' : deleteMode === 'permanent' ? 'Hapus permanen?' : 'Nonaktifkan perangkat?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!fromSupabase
                ? 'Tindakan ini tidak dapat dibatalkan. Perangkat akan dihapus dari daftar pemantauan.'
                : deleteMode === 'permanent'
                  ? 'Baris perangkat akan dihapus permanen dari database. Jika masih ada data sensor historis untuk perangkat ini, penghapusan akan gagal — nonaktifkan saja jika begitu.'
                  : 'Perangkat akan ditandai tidak aktif di database (soft delete). Data riwayat tetap ada; perangkat tidak lagi muncul di daftar aktif.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSaving}
            >
              {deleteSaving
                ? 'Memproses…'
                : !fromSupabase
                  ? 'Hapus'
                  : deleteMode === 'permanent'
                    ? 'Hapus Permanen'
                    : 'Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
