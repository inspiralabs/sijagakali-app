import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured } from '@/lib/sijagaairEnv';
import { AppLayout } from '@/components/AppLayout';

const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  is_default: boolean;
  created_at: string;
}

type DialogMode = 'add' | 'edit' | null;

export default function AdminUsers() {
  const { accessToken } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken ?? ''}`,
  }), [accessToken]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admins`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { admins: AdminUser[] };
      setAdmins(data.admins);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal memuat daftar admin: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (isSupabaseConfigured() && accessToken) {
      fetchAdmins();
    }
  }, [fetchAdmins, accessToken]);

  const openAdd = () => {
    setFormEmail('');
    setFormDisplayName('');
    setFormPassword('');
    setShowFormPassword(false);
    setEditTarget(null);
    setDialogMode('add');
  };

  const openEdit = (admin: AdminUser) => {
    setFormEmail(admin.email);
    setFormDisplayName(admin.display_name ?? '');
    setFormPassword('');
    setShowFormPassword(false);
    setEditTarget(admin);
    setDialogMode('edit');
  };

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      if (dialogMode === 'add') {
        const res = await fetch(`${API_BASE}/api/admins`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            display_name: formDisplayName || undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          throw new Error(body.error ?? 'Gagal menambahkan admin');
        }
        toast.success(`Admin ${formEmail} berhasil ditambahkan`);
      } else if (dialogMode === 'edit' && editTarget) {
        const body: Record<string, string> = {};
        if (formEmail !== editTarget.email) body.email = formEmail;
        if (formDisplayName !== (editTarget.display_name ?? '')) body.display_name = formDisplayName;
        if (formPassword) body.password = formPassword;

        const res = await fetch(`${API_BASE}/api/admins/${editTarget.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const resBody = await res.json() as { error?: string };
          throw new Error(resBody.error ?? 'Gagal mengubah admin');
        }
        toast.success('Data admin diperbarui');
      }

      setDialogMode(null);
      await fetchAdmins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    if (!window.confirm(`Hapus admin ${admin.email}? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admins/${admin.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Gagal menghapus admin');
      }
      toast.success(`Admin ${admin.email} dihapus`);
      await fetchAdmins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Manajemen Admin</h1>
            <p className="text-sm text-muted-foreground">Kelola akun admin SiJagaAir</p>
          </div>
          <Button onClick={openAdd} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Tambah Admin
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : admins.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada admin</div>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {admins.map((admin) => (
                  <div key={admin.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {admin.is_default && <Shield className="h-3.5 w-3.5 text-primary" />}
                          <p className="truncate text-sm font-semibold text-foreground">
                            {admin.display_name ?? 'Tanpa nama'}
                          </p>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                      {admin.is_default ? <Badge variant="secondary">Default</Badge> : <Badge variant="outline">Admin</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">Dibuat: {formatDate(admin.created_at)}</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(admin)} className="h-8 w-8 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(admin)}
                          disabled={admin.is_default}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Tampilan</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {admin.is_default && <Shield className="h-3.5 w-3.5 text-primary" />}
                            <span className="font-medium">{admin.display_name ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                        <TableCell>
                          {admin.is_default ? (
                            <Badge variant="secondary">Default</Badge>
                          ) : (
                            <Badge variant="outline">Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(admin.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(admin)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(admin)}
                                    disabled={admin.is_default}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive disabled:opacity-40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">Hapus</span>
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {admin.is_default && (
                                <TooltipContent>Admin default tidak dapat dihapus</TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

      {/* Dialog Tambah / Edit Admin */}
        <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
          <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Tambah Admin Baru' : 'Edit Admin'}
            </DialogTitle>
          </DialogHeader>

            <form onSubmit={handleDialogSubmit} className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Nama Tampilan
              </label>
              <Input
                value={formDisplayName}
                onChange={e => setFormDisplayName(e.target.value)}
                placeholder="Nama Admin"
              />
                </div>
                <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
                </div>
              </div>
              <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {dialogMode === 'add' ? 'Kata Sandi' : 'Kata Sandi Baru (kosongkan jika tidak berubah)'}
              </label>
                <div className="relative">
                  <Input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    required={dialogMode === 'add'}
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showFormPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Menyimpan...' : dialogMode === 'add' ? 'Tambahkan' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
