import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useAuth } from '@/lib/authContext';
import { getSupabase } from '@/lib/supabase';
import { getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import {
  hitungUmur,
  STATUS_SAAT_INI_LABEL,
  type BanjirEvent,
  type StatusSaatIni,
  type WargaTerdampak as WargaTerdampakRow,
  type WilayahDusun,
  type WilayahRw,
  type WilayahRt,
} from '@/lib/banjir/types';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

type FormState = {
  nik: string;
  nama_lengkap: string;
  tanggal_lahir: string;
  jenis_kelamin: 'laki-laki' | 'perempuan';
  no_kk: string;
  kontak_hp: string;
  status_saat_ini: StatusSaatIni;
  dusun_id: string;
  rw_id: string;
  rt_id: string;
  detail_alamat: string;
  catatan: string;
};

const EMPTY_FORM: FormState = {
  nik: '',
  nama_lengkap: '',
  tanggal_lahir: '',
  jenis_kelamin: 'laki-laki',
  no_kk: '',
  kontak_hp: '',
  status_saat_ini: 'di_rumah',
  dusun_id: '',
  rw_id: '',
  rt_id: '',
  detail_alamat: '',
  catatan: '',
};

export default function WargaTerdampak() {
  const { accessToken } = useAuth();
  const slug = getDefaultDeploymentSlug();

  const [events, setEvents] = useState<BanjirEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [warga, setWarga] = useState<WargaTerdampakRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dusunList, setDusunList] = useState<WilayahDusun[]>([]);
  const [rwList, setRwList] = useState<WilayahRw[]>([]);
  const [rtList, setRtList] = useState<WilayahRt[]>([]);
  // Nama RW/RT per baris tabel — beda dari rwList/rtList di atas, yang cuma
  // berisi opsi combobox untuk dusun/RW yang sedang dipilih DI FORM, bukan
  // RW/RT milik tiap baris warga (yang dusun/RW induknya bisa berbeda-beda).
  const [rwNameById, setRwNameById] = useState<Map<string, string>>(new Map());
  const [rtNameById, setRtNameById] = useState<Map<string, string>>(new Map());

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<WargaTerdampakRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WargaTerdampakRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` }),
    [accessToken],
  );

  // ---- Load kejadian banjir; default to the most recent still-open one ----
  const fetchEvents = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('banjir_events')
      .select('id, deployment_slug, nama, tanggal_mulai, tanggal_selesai, keterangan')
      .eq('deployment_slug', slug)
      .order('tanggal_mulai', { ascending: false });
    if (error) return toast.error('Gagal memuat kejadian banjir', { description: error.message });
    const list = (data ?? []) as BanjirEvent[];
    setEvents(list);
    setSelectedEventId((prev) => prev || list.find((e) => !e.tanggal_selesai)?.id || list[0]?.id || '');
  }, [slug]);

  // ---- Load wilayah master data (needed for the cascading combobox + address display) ----
  const fetchDusun = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('wilayah_dusun')
      .select('id, deployment_slug, nama')
      .eq('deployment_slug', slug)
      .order('nama');
    if (error) return toast.error('Gagal memuat dusun', { description: error.message });
    setDusunList((data ?? []) as WilayahDusun[]);
  }, [slug]);

  const fetchRwFor = useCallback(async (dusunId: string): Promise<WilayahRw[]> => {
    const supabase = getSupabase();
    if (!supabase || !dusunId) return [];
    const { data, error } = await supabase.from('wilayah_rw').select('id, dusun_id, nama').eq('dusun_id', dusunId).order('nama');
    if (error) {
      toast.error('Gagal memuat RW', { description: error.message });
      return [];
    }
    return (data ?? []) as WilayahRw[];
  }, []);

  const fetchRtFor = useCallback(async (rwId: string): Promise<WilayahRt[]> => {
    const supabase = getSupabase();
    if (!supabase || !rwId) return [];
    const { data, error } = await supabase.from('wilayah_rt').select('id, rw_id, nama').eq('rw_id', rwId).order('nama');
    if (error) {
      toast.error('Gagal memuat RT', { description: error.message });
      return [];
    }
    return (data ?? []) as WilayahRt[];
  }, []);

  // ---- Load RW/RT display names for whichever rw_id/rt_id values appear in the loaded rows ----
  const fetchNameLookups = useCallback(async (rows: WargaTerdampakRow[]) => {
    const supabase = getSupabase();
    if (!supabase || rows.length === 0) {
      setRwNameById(new Map());
      setRtNameById(new Map());
      return;
    }
    const rwIds = [...new Set(rows.map((r) => r.rw_id))];
    const rtIds = [...new Set(rows.map((r) => r.rt_id))];
    const [{ data: rwRows }, { data: rtRows }] = await Promise.all([
      supabase.from('wilayah_rw').select('id, nama').in('id', rwIds),
      supabase.from('wilayah_rt').select('id, nama').in('id', rtIds),
    ]);
    setRwNameById(new Map(((rwRows ?? []) as { id: string; nama: string }[]).map((r) => [r.id, r.nama])));
    setRtNameById(new Map(((rtRows ?? []) as { id: string; nama: string }[]).map((r) => [r.id, r.nama])));
  }, []);

  // ---- Load warga for the selected event ----
  const fetchWarga = useCallback(
    async (eventId: string) => {
      if (!eventId) {
        setWarga([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('warga_terdampak')
        .select(
          'id, banjir_event_id, deployment_slug, nik, nama_lengkap, tanggal_lahir, jenis_kelamin, no_kk, kontak_hp, status_saat_ini, dusun_id, rw_id, rt_id, detail_alamat, catatan',
        )
        .eq('banjir_event_id', eventId)
        .order('nama_lengkap');
      setLoading(false);
      if (error) return toast.error('Gagal memuat data warga', { description: error.message });
      const rows = (data ?? []) as WargaTerdampakRow[];
      setWarga(rows);
      await fetchNameLookups(rows);
    },
    [fetchNameLookups],
  );

  useEffect(() => {
    void fetchEvents();
    void fetchDusun();
  }, [fetchEvents, fetchDusun]);

  useEffect(() => {
    void fetchWarga(selectedEventId);
  }, [selectedEventId, fetchWarga]);

  // ---- Stats for the selected event ----
  const stats = useMemo(() => {
    const total = warga.length;
    const totalKk = new Set(warga.map((w) => w.no_kk).filter((v): v is string => !!v)).size;
    const mengungsi = warga.filter((w) => w.status_saat_ini === 'mengungsi').length;
    const diRumah = warga.filter((w) => w.status_saat_ini === 'di_rumah').length;
    const perDusun = new Map<string, number>();
    for (const w of warga) perDusun.set(w.dusun_id, (perDusun.get(w.dusun_id) ?? 0) + 1);
    const topDusun = [...perDusun.entries()]
      .map(([dusunId, count]) => ({ nama: dusunList.find((d) => d.id === dusunId)?.nama ?? '—', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return { total, totalKk, mengungsi, diRumah, topDusun };
  }, [warga, dusunList]);

  const dusunOptions: ComboboxOption[] = dusunList.map((d) => ({ value: d.id, label: d.nama }));
  const rwOptions: ComboboxOption[] = rwList.map((r) => ({ value: r.id, label: r.nama }));
  const rtOptions: ComboboxOption[] = rtList.map((r) => ({ value: r.id, label: r.nama }));

  const namaFor = (id: string, list: { id: string; nama: string }[]) => list.find((x) => x.id === id)?.nama ?? '—';

  // ---- Cascading combobox handlers (form state) ----
  const setFormDusun = async (dusunId: string) => {
    setForm((f) => ({ ...f, dusun_id: dusunId, rw_id: '', rt_id: '' }));
    setRtList([]);
    setRwList(await fetchRwFor(dusunId));
  };
  const addNewDusun = async (nama: string) => {
    const res = await fetch(`${API_BASE}/api/wilayah/dusun`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ deployment_slug: slug, nama }),
    });
    if (!res.ok) {
      toast.error(((await res.json()) as { error?: string }).error ?? 'Gagal menambah dusun');
      return;
    }
    const { dusun } = (await res.json()) as { dusun: WilayahDusun };
    setDusunList((prev) => [...prev, dusun].sort((a, b) => a.nama.localeCompare(b.nama)));
    await setFormDusun(dusun.id);
  };

  const setFormRw = async (rwId: string) => {
    setForm((f) => ({ ...f, rw_id: rwId, rt_id: '' }));
    setRtList(await fetchRtFor(rwId));
  };
  const addNewRw = async (nama: string) => {
    if (!form.dusun_id) {
      toast.error('Pilih Dusun terlebih dahulu');
      return;
    }
    const res = await fetch(`${API_BASE}/api/wilayah/rw`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ dusun_id: form.dusun_id, nama }),
    });
    if (!res.ok) {
      toast.error(((await res.json()) as { error?: string }).error ?? 'Gagal menambah RW');
      return;
    }
    const { rw } = (await res.json()) as { rw: WilayahRw };
    setRwList((prev) => [...prev, rw].sort((a, b) => a.nama.localeCompare(b.nama)));
    await setFormRw(rw.id);
  };

  const setFormRt = (rtId: string) => setForm((f) => ({ ...f, rt_id: rtId }));
  const addNewRt = async (nama: string) => {
    if (!form.rw_id) {
      toast.error('Pilih RW terlebih dahulu');
      return;
    }
    const res = await fetch(`${API_BASE}/api/wilayah/rt`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rw_id: form.rw_id, nama }),
    });
    if (!res.ok) {
      toast.error(((await res.json()) as { error?: string }).error ?? 'Gagal menambah RT');
      return;
    }
    const { rt } = (await res.json()) as { rt: WilayahRt };
    setRtList((prev) => [...prev, rt].sort((a, b) => a.nama.localeCompare(b.nama)));
    setFormRt(rt.id);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setRwList([]);
    setRtList([]);
    setEditTarget(null);
    setDialogMode('add');
  };

  const openEdit = async (w: WargaTerdampakRow) => {
    setForm({
      nik: w.nik ?? '',
      nama_lengkap: w.nama_lengkap,
      tanggal_lahir: w.tanggal_lahir,
      jenis_kelamin: w.jenis_kelamin,
      no_kk: w.no_kk ?? '',
      kontak_hp: w.kontak_hp ?? '',
      status_saat_ini: w.status_saat_ini,
      dusun_id: w.dusun_id,
      rw_id: w.rw_id,
      rt_id: w.rt_id,
      detail_alamat: w.detail_alamat ?? '',
      catatan: w.catatan ?? '',
    });
    setRwList(await fetchRwFor(w.dusun_id));
    setRtList(await fetchRtFor(w.rw_id));
    setEditTarget(w);
    setDialogMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return toast.error('Pilih kejadian banjir terlebih dahulu');
    if (!form.nama_lengkap.trim()) return toast.error('Nama lengkap wajib diisi');
    if (!form.tanggal_lahir) return toast.error('Tanggal lahir wajib diisi');
    if (!form.dusun_id || !form.rw_id || !form.rt_id) return toast.error('Dusun, RW, dan RT wajib dipilih');
    if (form.nik && !/^\d{16}$/.test(form.nik)) return toast.error('NIK harus 16 digit angka');

    setSaving(true);
    try {
      const payload = {
        banjir_event_id: selectedEventId,
        deployment_slug: slug,
        nik: form.nik.trim() || null,
        nama_lengkap: form.nama_lengkap.trim(),
        tanggal_lahir: form.tanggal_lahir,
        jenis_kelamin: form.jenis_kelamin,
        no_kk: form.no_kk.trim() || null,
        kontak_hp: form.kontak_hp.trim() || null,
        status_saat_ini: form.status_saat_ini,
        dusun_id: form.dusun_id,
        rw_id: form.rw_id,
        rt_id: form.rt_id,
        detail_alamat: form.detail_alamat.trim() || null,
        catatan: form.catatan.trim() || null,
      };
      const url = dialogMode === 'add' ? `${API_BASE}/api/banjir/warga` : `${API_BASE}/api/banjir/warga/${editTarget!.id}`;
      const res = await fetch(url, { method: dialogMode === 'add' ? 'POST' : 'PATCH', headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menyimpan');
      toast.success('Data warga tersimpan');
      setDialogMode(null);
      await fetchWarga(selectedEventId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/banjir/warga/${confirmDelete.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menghapus');
      toast.success(`"${confirmDelete.nama_lengkap}" dihapus`);
      setConfirmDelete(null);
      await fetchWarga(selectedEventId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Warga Terdampak Banjir</h1>
          <p className="text-sm text-muted-foreground">Pendataan warga terdampak per kejadian banjir</p>
        </div>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Pilih kejadian banjir" />
          </SelectTrigger>
          <SelectContent>
            {events.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.nama} {!ev.tanggal_selesai && '(berlangsung)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {events.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Belum ada kejadian banjir. Buat kejadian banjir dulu di menu "Kejadian Banjir".
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Warga</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total KK</p>
              <p className="text-2xl font-bold">{stats.totalKk}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Mengungsi</p>
              <p className="text-2xl font-bold">{stats.mengungsi}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Di Rumah</p>
              <p className="text-2xl font-bold">{stats.diRumah}</p>
            </Card>
          </div>

          <div className="mb-4 flex justify-end">
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Warga
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Umur</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : warga.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum ada data warga untuk kejadian ini
                  </TableCell>
                </TableRow>
              ) : (
                warga.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.nama_lengkap}</TableCell>
                    <TableCell className="font-mono text-xs">{w.nik ?? '—'}</TableCell>
                    <TableCell>{hitungUmur(w.tanggal_lahir)} th</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {namaFor(w.dusun_id, dusunList)} / RW {rwNameById.get(w.rw_id) ?? '—'} / RT {rtNameById.get(w.rt_id) ?? '—'}
                      {w.detail_alamat ? ` — ${w.detail_alamat}` : ''}
                    </TableCell>
                    <TableCell>{STATUS_SAAT_INI_LABEL[w.status_saat_ini]}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => void openEdit(w)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(w)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Tambah Warga Terdampak' : 'Edit Warga Terdampak'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">NIK (opsional, 16 digit)</label>
              <Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="3204xxxxxxxxxxxx" maxLength={16} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Lengkap</label>
              <Input value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tanggal Lahir</label>
                <Input type="date" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Jenis Kelamin</label>
                <Select value={form.jenis_kelamin} onValueChange={(v) => setForm({ ...form, jenis_kelamin: v as 'laki-laki' | 'perempuan' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">No. KK (opsional)</label>
                <Input value={form.no_kk} onChange={(e) => setForm({ ...form, no_kk: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Kontak HP (opsional)</label>
                <Input value={form.kontak_hp} onChange={(e) => setForm({ ...form, kontak_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status Saat Ini</label>
              <Select value={form.status_saat_ini} onValueChange={(v) => setForm({ ...form, status_saat_ini: v as StatusSaatIni })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_SAAT_INI_LABEL) as StatusSaatIni[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS_SAAT_INI_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Dusun/Kampung</label>
                <Combobox options={dusunOptions} value={form.dusun_id || null} onChange={(v) => void setFormDusun(v)} onAddNew={addNewDusun} placeholder="Pilih dusun" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">RW</label>
                <Combobox
                  options={rwOptions}
                  value={form.rw_id || null}
                  onChange={(v) => void setFormRw(v)}
                  onAddNew={addNewRw}
                  placeholder="Pilih RW"
                  disabled={!form.dusun_id}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">RT</label>
                <Combobox options={rtOptions} value={form.rt_id || null} onChange={setFormRt} onAddNew={addNewRt} placeholder="Pilih RT" disabled={!form.rw_id} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Detail Alamat (opsional)</label>
              <Input value={form.detail_alamat} onChange={(e) => setForm({ ...form, detail_alamat: e.target.value })} placeholder="No. rumah, patokan, dll" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan (opsional)</label>
              <Textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Kerusakan, kebutuhan khusus, dll" />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && !deleting && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data "{confirmDelete?.nama_lengkap}"?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void executeDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
