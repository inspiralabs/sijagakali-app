import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/lib/authContext';
import { getSupabase } from '@/lib/supabase';
import { getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import type { WilayahDusun, WilayahRw, WilayahRt } from '@/lib/banjir/types';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

export default function KelolaWilayah() {
  const { accessToken } = useAuth();
  const slug = getDefaultDeploymentSlug();

  const [dusunList, setDusunList] = useState<WilayahDusun[]>([]);
  const [rwList, setRwList] = useState<WilayahRw[]>([]);
  const [rtList, setRtList] = useState<WilayahRt[]>([]);
  const [rwParentDusunId, setRwParentDusunId] = useState<string>('');
  const [rtParentRwId, setRtParentRwId] = useState<string>('');

  const [dialog, setDialog] = useState<
    | { kind: 'dusun'; mode: 'add' | 'edit'; target?: WilayahDusun }
    | { kind: 'rw'; mode: 'add' | 'edit'; target?: WilayahRw }
    | { kind: 'rt'; mode: 'add' | 'edit'; target?: WilayahRt }
    | null
  >(null);
  const [formNama, setFormNama] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'dusun' | 'rw' | 'rt'; id: string; label: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` }),
    [accessToken],
  );

  const fetchDusun = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('wilayah_dusun')
      .select('id, deployment_slug, nama')
      .eq('deployment_slug', slug)
      .order('nama');
    if (error) return toast.error('Gagal memuat daftar dusun', { description: error.message });
    setDusunList((data ?? []) as WilayahDusun[]);
  }, [slug]);

  const fetchRw = useCallback(async (dusunId: string) => {
    const supabase = getSupabase();
    if (!supabase || !dusunId) return setRwList([]);
    const { data, error } = await supabase
      .from('wilayah_rw')
      .select('id, dusun_id, nama')
      .eq('dusun_id', dusunId)
      .order('nama');
    if (error) return toast.error('Gagal memuat daftar RW', { description: error.message });
    setRwList((data ?? []) as WilayahRw[]);
  }, []);

  const fetchRt = useCallback(async (rwId: string) => {
    const supabase = getSupabase();
    if (!supabase || !rwId) return setRtList([]);
    const { data, error } = await supabase
      .from('wilayah_rt')
      .select('id, rw_id, nama')
      .eq('rw_id', rwId)
      .order('nama');
    if (error) return toast.error('Gagal memuat daftar RT', { description: error.message });
    setRtList((data ?? []) as WilayahRt[]);
  }, []);

  useEffect(() => {
    void fetchDusun();
  }, [fetchDusun]);

  useEffect(() => {
    void fetchRw(rwParentDusunId);
    setRtParentRwId('');
    setRtList([]);
  }, [rwParentDusunId, fetchRw]);

  useEffect(() => {
    void fetchRt(rtParentRwId);
  }, [rtParentRwId, fetchRt]);

  const openAdd = (kind: 'dusun' | 'rw' | 'rt') => {
    setFormNama('');
    setDialog({ kind, mode: 'add' } as never);
  };
  const openEdit = (kind: 'dusun' | 'rw' | 'rt', target: WilayahDusun | WilayahRw | WilayahRt) => {
    setFormNama(target.nama);
    setDialog({ kind, mode: 'edit', target } as never);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const nama = formNama.trim();
    if (!nama) return toast.error('Nama wajib diisi');
    setSaving(true);
    try {
      if (dialog.kind === 'dusun') {
        const url =
          dialog.mode === 'add' ? `${API_BASE}/api/wilayah/dusun` : `${API_BASE}/api/wilayah/dusun/${dialog.target!.id}`;
        const body = dialog.mode === 'add' ? { deployment_slug: slug, nama } : { nama };
        const res = await fetch(url, { method: dialog.mode === 'add' ? 'POST' : 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menyimpan dusun');
        await fetchDusun();
      } else if (dialog.kind === 'rw') {
        if (!rwParentDusunId) return toast.error('Pilih dusun induk terlebih dahulu');
        const url = dialog.mode === 'add' ? `${API_BASE}/api/wilayah/rw` : `${API_BASE}/api/wilayah/rw/${dialog.target!.id}`;
        const body = dialog.mode === 'add' ? { dusun_id: rwParentDusunId, nama } : { nama };
        const res = await fetch(url, { method: dialog.mode === 'add' ? 'POST' : 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menyimpan RW');
        await fetchRw(rwParentDusunId);
      } else {
        if (!rtParentRwId) return toast.error('Pilih RW induk terlebih dahulu');
        const url = dialog.mode === 'add' ? `${API_BASE}/api/wilayah/rt` : `${API_BASE}/api/wilayah/rt/${dialog.target!.id}`;
        const body = dialog.mode === 'add' ? { rw_id: rtParentRwId, nama } : { nama };
        const res = await fetch(url, { method: dialog.mode === 'add' ? 'POST' : 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menyimpan RT');
        await fetchRt(rtParentRwId);
      }
      toast.success('Tersimpan');
      setDialog(null);
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
      const url = `${API_BASE}/api/wilayah/${confirmDelete.kind}/${confirmDelete.id}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Gagal menghapus');
      toast.success(`"${confirmDelete.label}" dihapus`);
      if (confirmDelete.kind === 'dusun') await fetchDusun();
      else if (confirmDelete.kind === 'rw') await fetchRw(rwParentDusunId);
      else await fetchRt(rtParentRwId);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Kelola Wilayah</h1>
        <p className="text-sm text-muted-foreground">Master data Dusun, RW, dan RT untuk pendataan warga terdampak</p>
      </div>

      <Tabs defaultValue="dusun">
        <TabsList>
          <TabsTrigger value="dusun">Dusun/Kampung/Perumahan</TabsTrigger>
          <TabsTrigger value="rw">RW</TabsTrigger>
          <TabsTrigger value="rt">RT</TabsTrigger>
        </TabsList>

        <TabsContent value="dusun" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => openAdd('dusun')}>
              <Plus className="h-4 w-4" /> Tambah Dusun
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dusunList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.nama}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit('dusun', d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDelete({ kind: 'dusun', id: d.id, label: d.nama })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {dusunList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="rw" className="space-y-3">
          <Select value={rwParentDusunId} onValueChange={setRwParentDusunId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih dusun induk" />
            </SelectTrigger>
            <SelectContent>
              {dusunList.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" disabled={!rwParentDusunId} onClick={() => openAdd('rw')}>
              <Plus className="h-4 w-4" /> Tambah RW
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rwList.map((rw) => (
                <TableRow key={rw.id}>
                  <TableCell>{rw.nama}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit('rw', rw)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDelete({ kind: 'rw', id: rw.id, label: rw.nama })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rwParentDusunId && rwList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="rt" className="space-y-3">
          <Select value={rwParentDusunId} onValueChange={setRwParentDusunId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih dusun induk" />
            </SelectTrigger>
            <SelectContent>
              {dusunList.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rtParentRwId} onValueChange={setRtParentRwId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih RW induk" />
            </SelectTrigger>
            <SelectContent>
              {rwList.map((rw) => (
                <SelectItem key={rw.id} value={rw.id}>
                  {rw.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" disabled={!rtParentRwId} onClick={() => openAdd('rt')}>
              <Plus className="h-4 w-4" /> Tambah RT
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rtList.map((rt) => (
                <TableRow key={rt.id}>
                  <TableCell>{rt.nama}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit('rt', rt)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDelete({ kind: 'rt', id: rt.id, label: rt.nama })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rtParentRwId && rtList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'add' ? 'Tambah' : 'Edit'} {dialog?.kind === 'dusun' ? 'Dusun' : dialog?.kind === 'rw' ? 'RW' : 'RT'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={formNama} onChange={(e) => setFormNama(e.target.value)} placeholder="Nama" required autoFocus />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
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
            <AlertDialogTitle>Hapus "{confirmDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tidak bisa dihapus jika masih dipakai oleh data di bawahnya (RW/RT/warga terdampak).
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
