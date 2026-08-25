import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Waves } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { useAuth } from '@/lib/authContext';
import { getSupabase } from '@/lib/supabase';
import { getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import type { BanjirEvent } from '@/lib/banjir/types';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

type FormState = { nama: string; tanggal_mulai: string; tanggal_selesai: string; keterangan: string };
const EMPTY_FORM: FormState = { nama: '', tanggal_mulai: '', tanggal_selesai: '', keterangan: '' };

function formatTanggal(value: string): string {
  return format(parseISO(value), 'd MMM yyyy', { locale: idLocale });
}

export default function KejadianBanjir() {
  const { accessToken } = useAuth();
  const slug = getDefaultDeploymentSlug();
  const [events, setEvents] = useState<BanjirEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<BanjirEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BanjirEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` }),
    [accessToken],
  );

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('banjir_events')
      .select('id, deployment_slug, nama, tanggal_mulai, tanggal_selesai, keterangan')
      .eq('deployment_slug', slug)
      .order('tanggal_mulai', { ascending: false });
    setLoading(false);
    if (error) return toast.error('Gagal memuat kejadian banjir', { description: error.message });
    setEvents((data ?? []) as BanjirEvent[]);
  }, [slug]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setDialogMode('add');
  };
  const openEdit = (ev: BanjirEvent) => {
    setForm({
      nama: ev.nama,
      tanggal_mulai: ev.tanggal_mulai,
      tanggal_selesai: ev.tanggal_selesai ?? '',
      keterangan: ev.keterangan ?? '',
    });
    setEditTarget(ev);
    setDialogMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return toast.error('Nama kejadian wajib diisi');
    if (!form.tanggal_mulai) return toast.error('Tanggal mulai wajib diisi');
    setSaving(true);
    try {
      const url = dialogMode === 'add' ? `${API_BASE}/api/banjir/events` : `${API_BASE}/api/banjir/events/${editTarget!.id}`;
      const body =
        dialogMode === 'add'
          ? {
              deployment_slug: slug,
              nama: form.nama.trim(),
              tanggal_mulai: form.tanggal_mulai,
              tanggal_selesai: form.tanggal_selesai || null,
              keterangan: form.keterangan.trim() || null,
            }
          : {
              nama: form.nama.trim(),
              tanggal_mulai: form.tanggal_mulai,
              tanggal_selesai: form.tanggal_selesai || null,
              keterangan: form.keterangan.trim() || null,
            };
      const res = await fetch(url, { method: dialogMode === 'add' ? 'POST' : 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menyimpan');
      toast.success('Kejadian banjir tersimpan');
      setDialogMode(null);
      await fetchEvents();
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
      const res = await fetch(`${API_BASE}/api/banjir/events/${confirmDelete.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menghapus');
      toast.success(`"${confirmDelete.nama}" dihapus`);
      setConfirmDelete(null);
      await fetchEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Kejadian Banjir</h1>
          <p className="text-sm text-muted-foreground">Daftar kejadian banjir untuk pendataan warga terdampak</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Kejadian
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead>Tanggal Selesai</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="rounded-full bg-muted p-3">
                      <Waves className="h-6 w-6" />
                    </div>
                    <p>Belum ada kejadian banjir yang tercatat</p>
                    <Button size="sm" variant="outline" onClick={openAdd} className="gap-2">
                      <Plus className="h-4 w-4" /> Catat Kejadian Pertama
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.nama}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatTanggal(ev.tanggal_mulai)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {ev.tanggal_selesai ? (
                      <span className="text-muted-foreground">{formatTanggal(ev.tanggal_selesai)}</span>
                    ) : (
                      <StatusPill tone="info" label="Berlangsung" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{ev.keterangan ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(ev)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(ev)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Tambah Kejadian Banjir' : 'Edit Kejadian Banjir'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Kejadian</label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Banjir Januari 2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
                <DatePicker
                  value={form.tanggal_mulai}
                  onChange={(v) => setForm((f) => ({ ...f, tanggal_mulai: v, tanggal_selesai: f.tanggal_selesai && f.tanggal_selesai < v ? '' : f.tanggal_selesai }))}
                  maxDate={new Date()}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tanggal Selesai (opsional)</label>
                <DatePicker
                  value={form.tanggal_selesai}
                  onChange={(v) => setForm({ ...form, tanggal_selesai: v })}
                  minDate={form.tanggal_mulai ? parseISO(form.tanggal_mulai) : undefined}
                  allowClear
                  disabled={!form.tanggal_mulai}
                  placeholder="Masih berlangsung"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Keterangan</label>
              <Textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Opsional" />
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
            <AlertDialogTitle>Hapus "{confirmDelete?.nama}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data warga terdampak yang tercatat pada kejadian ini akan ikut terhapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
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
