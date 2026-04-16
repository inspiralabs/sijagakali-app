import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileNav } from '@/components/MobileNav';
import { mockDevices } from '@/lib/mockData';
import { Device, STATUS_CONFIG } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { formatWIB } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function Devices() {
  const [devices] = useState<Device[]>(mockDevices);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdated={devices[0].lastSeen} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Manajemen Perangkat</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Tambah Perangkat
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tambah Perangkat Baru</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={e => { e.preventDefault(); setDialogOpen(false); }}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Perangkat</label>
                    <Input placeholder="Jembatan Wadas" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi</label>
                    <Input placeholder="Hulu Cileungsi" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">MAC Address</label>
                    <Input placeholder="A4:CF:12:7B:3E:01" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Latitude</label>
                      <Input placeholder="-6.548" type="number" step="any" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Longitude</label>
                      <Input placeholder="107.012" type="number" step="any" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">URL CCTV (opsional)</label>
                    <Input placeholder="rtsp://..." />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Waspada (cm)</label>
                      <Input type="number" placeholder="120" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Siaga (cm)</label>
                      <Input type="number" placeholder="160" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Awas (cm)</label>
                      <Input type="number" placeholder="200" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Interval Laporan (detik)</label>
                    <Input type="number" placeholder="300" />
                  </div>
                  <Button type="submit" className="w-full">Simpan</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
