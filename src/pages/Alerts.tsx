import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';
import { STATUS_CONFIG, StatusLevel } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWIB } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function Alerts() {
  const { devices, alerts } = useLiveData();
  const [filterDevice, setFilterDevice] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => alerts.filter(a => {
    if (filterDevice !== 'all' && a.deviceId !== filterDevice) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  }), [alerts, filterDevice, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AppLayout>
      <h2 className="mb-4 text-lg font-bold text-foreground">Riwayat Peringatan</h2>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filterDevice} onValueChange={(v) => { setFilterDevice(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-xs"><SelectValue placeholder="Perangkat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Perangkat</SelectItem>
            {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {(Object.keys(STATUS_CONFIG) as StatusLevel[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Perangkat</th>
                <th className="px-4 py-3 font-medium">Peringatan</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Deskripsi</th>
                <th className="px-4 py-3 font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(a => {
                const cfg = STATUS_CONFIG[a.status];
                return (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: cfg.hex }} />
                    </td>
                    <td className="px-4 py-3 text-foreground">{a.deviceName}</td>
                    <td className="px-4 py-3 text-foreground">{a.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.description}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatWIB(a.timestamp)}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada peringatan ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{filtered.length.toLocaleString('id-ID')} peringatan · Halaman {safePage} / {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
