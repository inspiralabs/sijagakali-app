import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured } from '@/lib/sijagaairEnv';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Video, Save, MessageSquare, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

export default function DeviceSettings() {
  const { id } = useParams();
  const { devices, updateDeviceCctv } = useLiveData();
  const { accessToken } = useAuth();
  const device = devices.find((d) => d.id === id) ?? devices[0];

  const [interval, setInterval] = useState([device?.reportInterval ?? 3600]);
  const [intervalSaving, setIntervalSaving] = useState(false);

  const [cctvLocalIp, setCctvLocalIp] = useState('');
  const [streamPlaybackUrl, setStreamPlaybackUrl] = useState('');
  const [cctvSaving, setCctvSaving] = useState(false);

  const [locationName, setLocationName] = useState('');
  const [tWaspada, setTWaspada] = useState('');
  const [tSiaga, setTSiaga] = useState('');
  const [tBahaya, setTBahaya] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!device) return;
    setInterval([device.reportInterval]);
    setCctvLocalIp(device.cctvLocalIp ?? '');
    setStreamPlaybackUrl(device.cctvUrl ?? '');
    setLocationName(device.location ?? '');
    setTWaspada(String(device.threshold.waspada));
    setTSiaga(String(device.threshold.siaga));
    setTBahaya(String(device.threshold.awas));
  }, [device?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!device) {
    return (
      <AppLayout>
        <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Tidak ada perangkat. Periksa seed Supabase atau mode mock.
        </p>
      </AppLayout>
    );
  }

  const formatInterval = (s: number) => {
    if (s >= 3600) {
      const jam = Math.floor(s / 3600);
      const menit = Math.floor((s % 3600) / 60);
      return menit > 0 ? `${jam} jam ${menit} menit` : `${jam} jam`;
    }
    return `${Math.floor(s / 60)} menit`;
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken ?? ''}`,
  });

  const handleCctvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCctvSaving(true);
    try {
      await updateDeviceCctv(device.id, { cctvLocalIp, streamPlaybackUrl });
    } catch {
      /* toast dari context */
    } finally {
      setCctvSaving(false);
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.info('Simpan pengaturan hanya tersedia dalam mode Supabase');
      return;
    }
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/device/${device.id}/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: device.deploymentSlug,
          location_name: locationName || undefined,
          threshold_waspada_cm: tWaspada ? Number(tWaspada) : undefined,
          threshold_siaga_cm: tSiaga ? Number(tSiaga) : undefined,
          threshold_bahaya_cm: tBahaya ? Number(tBahaya) : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Gagal menyimpan');
      }
      toast.success('Pengaturan perangkat disimpan');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleIntervalSave = async () => {
    if (!isSupabaseConfigured()) {
      toast.info('Simpan interval hanya tersedia dalam mode Supabase');
      return;
    }
    setIntervalSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/device/${device.id}/interval`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: device.deploymentSlug,
          interval_sec: interval[0],
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Gagal menyimpan interval');
      }
      toast.success(`Interval laporan disimpan: ${formatInterval(interval[0])}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIntervalSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
        </Link>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pengaturan perangkat</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{device.name}</h2>
              <StatusBadge status={device.status} />
            </div>
          </div>
        </div>

        {isSupabaseConfigured() && (
          <Link
            to={`/devices/${encodeURIComponent(device.id)}/notifications`}
            className="group block rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-border/60 transition-all hover:border-primary/35 hover:bg-muted/20 hover:ring-primary/15"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Notifikasi WhatsApp</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Template pesan, kontak, uji kirim ke channel, log, dan aturan interval kirim otomatis — di halaman terpisah untuk titik pantau ini.
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    Lanjutan pengaturan · WhatsApp &amp; log
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                Buka
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-px" />
              </span>
            </div>
          </Link>
        )}

        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Informasi perangkat</h3>
          <dl className="max-w-xl space-y-2.5 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-32">ID perangkat</dt>
              <dd className="font-mono text-xs text-foreground sm:min-w-0">{device.id}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-32">MAC Address</dt>
              <dd className="font-mono text-xs text-foreground sm:min-w-0">{device.mac}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-32">Koordinat</dt>
              <dd className="text-foreground tabular-nums sm:min-w-0">
                {device.lat}, {device.lng}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-32">Level saat ini</dt>
              <dd className="font-semibold tabular-nums text-foreground">{device.waterLevel} cm</dd>
            </div>
          </dl>
        </Card>

        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Konfigurasi Lokasi &amp; Ambang Batas</h3>
          <form onSubmit={handleSettingsSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Lokasi</label>
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Sungai Bojong Kulur Hilir" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Waspada (cm)</label>
                <Input type="number" min={0} value={tWaspada} onChange={(e) => setTWaspada(e.target.value)} placeholder="50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Siaga (cm)</label>
                <Input type="number" min={0} value={tSiaga} onChange={(e) => setTSiaga(e.target.value)} placeholder="80" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Bahaya (cm)</label>
                <Input type="number" min={0} value={tBahaya} onChange={(e) => setTBahaya(e.target.value)} placeholder="120" />
              </div>
            </div>
            <Button type="submit" disabled={settingsSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {settingsSaving ? 'Menyimpan...' : 'Simpan Lokasi & Threshold'}
            </Button>
          </form>
        </Card>

        <Card className="border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">CCTV</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
            <strong>Snapshot</strong> diambil di lapangan oleh node IoT; backend menyimpan berkas di Storage.{' '}
            <strong>Live</strong> memakai URL playback (mis. HLS .m3u8) yang bisa diputar di browser.
          </p>
          <form className="space-y-4" onSubmit={handleCctvSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">IP kamera di LAN lapangan</label>
              <Input value={cctvLocalIp} onChange={(e) => setCctvLocalIp(e.target.value)} placeholder="192.168.1.50" autoComplete="off" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Referensi dokumentasi; node memakai IP ini untuk snapshot HTTP di jaringan lokal.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL streaming (live) untuk dashboard</label>
              <Textarea
                value={streamPlaybackUrl}
                onChange={(e) => setStreamPlaybackUrl(e.target.value)}
                placeholder="https://…/playlist.m3u8"
                rows={3}
                className="resize-y font-mono text-xs"
              />
            </div>
            <Button type="submit" disabled={cctvSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {cctvSaving ? 'Menyimpan...' : 'Simpan Pengaturan CCTV'}
            </Button>
          </form>
        </Card>

        <Card className="border-border bg-card p-4">
          <h3 className="mb-1 font-semibold text-foreground">Interval Laporan</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Seberapa sering perangkat mengirim data ke server. Saat hujan lebat disarankan 5–15 menit; saat kemarau bisa 1–4 jam.
          </p>
          <Slider min={60} max={86400} step={60} value={interval} onValueChange={setInterval} />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{formatInterval(interval[0])}</p>
            <p className="text-xs text-muted-foreground">{interval[0]} detik</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[300, 600, 900, 1800, 3600, 7200, 21600, 43200].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInterval([s])}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  interval[0] === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {formatInterval(s)}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => void handleIntervalSave()} disabled={intervalSaving} className="mt-4 gap-2">
            <Save className="h-4 w-4" />
            {intervalSaving ? 'Menyimpan...' : 'Simpan Interval'}
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
