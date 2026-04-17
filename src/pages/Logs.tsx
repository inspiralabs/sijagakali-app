import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLiveData } from '@/lib/liveDataContext';
import { STATUS_CONFIG, StatusLevel } from '@/lib/types';
import { formatWIB } from '@/lib/mockData';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  status: StatusLevel;
  waterLevel: number;
  source: 'reading' | 'alert';
  description?: string;
};

const PAGE_SIZE = 25;

export default function Logs() {
  const { devices, alerts, histories } = useLiveData();
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    devices.forEach(d => {
      const hist = histories[d.id] ?? [];
      hist.forEach((r, i) => {
        const status =
          r.waterLevel >= d.threshold.awas ? 'bahaya' :
          r.waterLevel >= d.threshold.siaga ? 'siaga' :
          r.waterLevel >= d.threshold.waspada ? 'waspada' : 'normal';
        out.push({
          id: `r_${d.id}_${i}_${r.timestamp}`,
          timestamp: r.timestamp,
          deviceId: d.id,
          deviceName: d.name,
          status,
          waterLevel: r.waterLevel,
          source: 'reading',
        });
      });
    });
    alerts.forEach(a => {
      const dev = devices.find(d => d.id === a.deviceId);
      out.push({
        id: a.id,
        timestamp: a.timestamp,
        deviceId: a.deviceId,
        deviceName: a.deviceName,
        status: a.status,
        waterLevel: dev?.waterLevel ?? 0,
        source: 'alert',
        description: a.title,
      });
    });
    return out.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [devices, alerts, histories]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (deviceFilter !== 'all' && r.deviceId !== deviceFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (from && new Date(r.timestamp) < from) return false;
      if (to) {
        const end = new Date(to); end.setHours(23, 59, 59, 999);
        if (new Date(r.timestamp) > end) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!r.deviceName.toLowerCase().includes(q) && !(r.description?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [rows, deviceFilter, statusFilter, from, to, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setDeviceFilter('all'); setStatusFilter('all'); setSearch(''); setFrom(undefined); setTo(undefined); setPage(1);
  };

  return (
    <AppLayout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">Logs</h2>
          <p className="text-xs text-muted-foreground">Riwayat pembacaan & peringatan dari semua perangkat</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
      </div>

      <Card className="mb-4 border-border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cari perangkat..." className="h-9 pl-7 text-xs" />
          </div>

          <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Perangkat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Perangkat</SelectItem>
              {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {(Object.keys(STATUS_CONFIG) as StatusLevel[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('h-9 justify-start text-xs font-normal', !from && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {from ? format(from, 'PP') : 'Dari tanggal'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={from} onSelect={(d) => { setFrom(d); setPage(1); }} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('h-9 justify-start text-xs font-normal', !to && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {to ? format(to, 'PP') : 'Sampai tanggal'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={to} onSelect={(d) => { setTo(d); setPage(1); }} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      <Card className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Perangkat</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Sumber</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => {
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatWIB(r.timestamp)}</td>
                    <td className="px-4 py-3 text-foreground">{r.deviceName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.waterLevel} cm</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {r.source === 'alert' ? 'Peringatan' : 'Sensor'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{r.description ?? '—'}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Tidak ada data ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{filtered.length.toLocaleString('id-ID')} entri · Halaman {safePage} dari {totalPages}</span>
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
