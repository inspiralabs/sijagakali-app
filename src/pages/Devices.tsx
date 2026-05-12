import { useState } from 'react';
import { mockDevices } from '@/lib/mockData';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { useLiveData } from '@/lib/liveDataContext';
import { isSupabaseConfigured } from '@/lib/sijagaairEnv';
import { StatusBadge } from '@/components/StatusBadge';
import { formatWIB } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Settings2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

type DeviceFormState = {
  id?: string;
  name: string;
  location: string;
  mac: string;
  lat: string;
  lng: string;
  cctvUrl: string;
  waspada: string;
  siaga: string;
  awas: string;
  reportInterval: string;
};

const EMPTY: DeviceFormState = {
  name: '', location: '', mac: '', lat: '', lng: '', cctvUrl: '',
  waspada: '', siaga: '', awas: '', reportInterval: '300',
};

function deviceToForm(d: Device): DeviceFormState {
  return {
    id: d.id,
    name: d.name,
    location: d.location,
    mac: d.mac,
    lat: String(d.lat),
    lng: String(d.lng),
    cctvUrl: d.cctvUrl ?? '',
    waspada: String(d.threshold.waspada),
    siaga: String(d.threshold.siaga),
    awas: String(d.threshold.awas),
    reportInterval: String(d.reportInterval),
  };
}

export default function Devices() {
  const { devices: supabaseDevices } = useLiveData();
  const [localMockDevices, setLocalMockDevices] = useState<Device[]>(mockDevices);
  const fromSupabase = isSupabaseConfigured();
  const devices = fromSupabase ? supabaseDevices : localMockDevices;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DeviceFormState>(EMPTY);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isEdit = Boolean(form.id);

  const openCreate = () => { setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (d: Device) => { setForm(deviceToForm(d)); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromSupabase) {
      toast.message('Data perangkat berasal dari Supabase', {
        description: 'Ubah baris di tabel sijagaair.device_configs (dashboard SQL atau nanti lewat API admin).',
      });
      return;
    }
    const threshold = {
      waspada: Number(form.waspada) || 0,
      siaga: Number(form.siaga) || 0,
      awas: Number(form.awas) || 0,
    };
    if (isEdit) {
      setLocalMockDevices(prev => prev.map(d =>
        d.id === form.id
          ? {
              ...d,
              name: form.name, location: form.location, mac: form.mac,
              lat: Number(form.lat) || d.lat, lng: Number(form.lng) || d.lng,
              cctvUrl: form.cctvUrl || undefined,
              threshold,
              reportInterval: Number(form.reportInterval) || d.reportInterval,
            }
          : d
      ));
      toast.success(`Perangkat "${form.name}" diperbarui`);
    } else {
      const id = `esp_${Date.now()}`;
      setLocalMockDevices(prev => [
        ...prev,
        {
          id, name: form.name, location: form.location, mac: form.mac,
          lat: Number(form.lat) || 0, lng: Number(form.lng) || 0,
          cctvUrl: form.cctvUrl || undefined,
          waterLevel: 0, maxCapacity: Math.max(threshold.awas + 50, 200),
          threshold,
          battery: 100, rssi: -60, boxTemp: 30,
          reportInterval: Number(form.reportInterval) || 300,
          status: 'normal', lastSeen: new Date().toISOString(),
        }
      ]);
      toast.success(`Perangkat "${form.name}" ditambahkan`);
    }
    setDialogOpen(false);
    setForm(EMPTY);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    if (fromSupabase) return;
    const d = devices.find(x => x.id === confirmDeleteId);
    setLocalMockDevices(prev => prev.filter(x => x.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    if (d) toast.success(`Perangkat "${d.name}" dihapus`);
  };

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Manajemen Perangkat</h2>
        {!fromSupabase && (
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Perangkat
          </Button>
        )}
      </div>
      {fromSupabase && (
        <p className="mb-3 text-xs text-muted-foreground">
          Daftar perangkat diambil dari Supabase. Edit tambah/hapus melalui database atau API admin (roadmap).
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
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{d.mac}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatWIB(d.lastSeen)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
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
                      {/* Tombol pengaturan — selalu tampil */}
                      <Button variant="outline" size="sm" className="h-8 gap-1 px-2" asChild>
                        <Link to={`/devices/${encodeURIComponent(d.id)}/settings`} title="Pengaturan perangkat (threshold, interval, CCTV)">
                          <Settings2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Pengaturan</span>
                        </Link>
                      </Button>

                      {/* Edit & hapus — hanya mode mock */}
                      {!fromSupabase && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)} aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteId(d.id)} aria-label="Hapus">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada perangkat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Perangkat' : 'Tambah Perangkat Baru'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Perangkat</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jembatan Wadas" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi</label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Hulu Cileungsi" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">MAC Address</label>
              <Input value={form.mac} onChange={e => setForm({ ...form, mac: e.target.value })} placeholder="A4:CF:12:7B:3E:01" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Latitude</label>
                <Input value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="-6.548" type="number" step="any" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Longitude</label>
                <Input value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="107.012" type="number" step="any" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL CCTV (opsional)</label>
              <Input value={form.cctvUrl} onChange={e => setForm({ ...form, cctvUrl: e.target.value })} placeholder="rtsp://..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Waspada (cm)</label>
                <Input value={form.waspada} onChange={e => setForm({ ...form, waspada: e.target.value })} type="number" placeholder="120" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Siaga (cm)</label>
                <Input value={form.siaga} onChange={e => setForm({ ...form, siaga: e.target.value })} type="number" placeholder="160" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Awas (cm)</label>
                <Input value={form.awas} onChange={e => setForm({ ...form, awas: e.target.value })} type="number" placeholder="200" required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Interval Laporan (detik)</label>
              <Input value={form.reportInterval} onChange={e => setForm({ ...form, reportInterval: e.target.value })} type="number" placeholder="300" />
            </div>
            <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Simpan'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus perangkat?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Perangkat akan dihapus dari daftar pemantauan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
