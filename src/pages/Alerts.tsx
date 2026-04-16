import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileNav } from '@/components/MobileNav';
import { mockAlerts, mockDevices, formatWIB } from '@/lib/mockData';
import { STATUS_CONFIG, StatusLevel } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Alerts() {
  const [filterDevice, setFilterDevice] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = mockAlerts.filter(a => {
    if (filterDevice !== 'all' && a.deviceId !== filterDevice) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdated={mockDevices[0].lastSeen} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Riwayat Peringatan</h2>

          <div className="mb-4 flex gap-3">
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Perangkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Perangkat</SelectItem>
                {mockDevices.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
                  {filtered.map(a => {
                    const config = STATUS_CONFIG[a.status];
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: config.hex }} />
                        </td>
                        <td className="px-4 py-3 text-foreground">{a.deviceName}</td>
                        <td className="px-4 py-3 text-foreground">{a.title}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.description}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatWIB(a.timestamp)}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada peringatan ditemukan
                      </td>
                    </tr>
                  )}
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
