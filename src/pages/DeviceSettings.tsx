import { useParams, Link } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileNav } from '@/components/MobileNav';
import { mockDevices } from '@/lib/mockData';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';

export default function DeviceSettings() {
  const { id } = useParams();
  const device = mockDevices.find(d => d.id === id) || mockDevices[0];
  const [interval, setInterval] = useState([device.reportInterval]);

  const formatInterval = (s: number) => {
    if (s >= 3600) return `${Math.floor(s / 3600)} jam`;
    return `${Math.floor(s / 60)} menit`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdated={device.lastSeen} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6 space-y-4">
          <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
          </Link>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">{device.name}</h2>
            <StatusBadge status={device.status} />
          </div>

          {/* Info Card */}
          <Card className="border-border bg-card p-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Lokasi:</span><span className="text-foreground">{device.location}</span>
              <span>MAC Address:</span><span className="text-foreground font-mono text-xs">{device.mac}</span>
              <span>Koordinat:</span><span className="text-foreground">{device.lat}, {device.lng}</span>
              <span>Level saat ini:</span><span className="text-foreground font-semibold">{device.waterLevel} cm</span>
            </div>
          </Card>

          {/* Threshold Config */}
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">Konfigurasi Ambang Batas</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Waspada (cm)</label>
                <Input type="number" defaultValue={device.threshold.waspada} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Siaga (cm)</label>
                <Input type="number" defaultValue={device.threshold.siaga} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Awas (cm)</label>
                <Input type="number" defaultValue={device.threshold.awas} />
              </div>
            </div>
          </Card>

          {/* Calibration */}
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">Kalibrasi</h3>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Offset Kalibrasi (cm)</label>
              <Input type="number" defaultValue={0} />
            </div>
          </Card>

          {/* Report Interval */}
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">Interval Laporan</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Saat kemarau: 1 jam / Saat hujan: 5 menit
            </p>
            <Slider
              min={60}
              max={3600}
              step={60}
              value={interval}
              onValueChange={setInterval}
            />
            <p className="mt-2 text-sm text-foreground font-medium">{formatInterval(interval[0])}</p>
          </Card>

          {/* Alert Contacts */}
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">Kontak Peringatan</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input defaultValue="+62 812-xxxx-xxxx" className="flex-1" />
                <Button variant="ghost" size="sm" className="text-destructive">Hapus</Button>
              </div>
              <Button variant="outline" size="sm">+ Tambah Kontak</Button>
            </div>
          </Card>

          <Button className="gap-2">
            <Send className="h-4 w-4" /> Kirim Test Alert
          </Button>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
