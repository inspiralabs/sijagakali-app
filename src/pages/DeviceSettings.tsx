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
import { ArrowLeft, Video, Save, MessageSquare, ChevronRight, CloudRain } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

export default function DeviceSettings() {
  const { id } = useParams();
  const { devices, updateDeviceCctv, refreshDashboard } = useLiveData();
  const { accessToken } = useAuth();
  const device = devices.find((d) => d.id === id) ?? devices[0];

  const [interval, setInterval] = useState([device?.reportInterval ?? 3600]);
  const [intervalSaving, setIntervalSaving] = useState(false);

  const [cctvLocalIp, setCctvLocalIp] = useState('');
  const [streamPlaybackUrl, setStreamPlaybackUrl] = useState('');
  const [cctvSaving, setCctvSaving] = useState(false);

  const [locationName, setLocationName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sensorHeightCm, setSensorHeightCm] = useState('');
  const [macAddr, setMacAddr] = useState('');
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [tWaspada, setTWaspada] = useState('');
  const [tSiaga, setTSiaga] = useState('');
  const [tBahaya, setTBahaya] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [bmkgAdm4, setBmkgAdm4] = useState('');
  const [weatherSaving, setWeatherSaving] = useState(false);

  useEffect(() => {
    if (!device) return;
    setInterval([device.reportInterval]);
    setCctvLocalIp(device.cctvLocalIp ?? '');
    setStreamPlaybackUrl(device.cctvUrl ?? '');
    setLocationName(device.location ?? '');
    setDisplayName(device.displayName ?? '');
    setSensorHeightCm(String(device.sensorHeightCm ?? 250));
    setMacAddr(device.mac.startsWith('— ') ? '' : device.mac);
    setLatStr(String(device.lat));
    setLngStr(String(device.lng));
    setTWaspada(String(device.threshold.waspada));
    setTSiaga(String(device.threshold.siaga));
    setTBahaya(String(device.threshold.awas));
    setBmkgAdm4(device.bmkgAdm4 ?? '');
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

  function parseOptionalCoord(raw: string): number | null {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

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
      const sh = Number(sensorHeightCm);
      if (!Number.isFinite(sh) || sh <= 0) {
        toast.error('Tinggi sensor (cm) harus angka positif');
        setSettingsSaving(false);
        return;
      }
      const tw = tWaspada ? Number(tWaspada) : undefined;
      const ts = tSiaga ? Number(tSiaga) : undefined;
      const tb = tBahaya ? Number(tBahaya) : undefined;
      if (
        tw !== undefined &&
        ts !== undefined &&
        tb !== undefined &&
        !(tw < ts && ts < tb)
      ) {
        toast.error('Ambang tidak valid: waspada < siaga < bahaya');
        setSettingsSaving(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/device/${device.id}/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: device.deploymentSlug,
          display_name: displayName.trim() ? displayName.trim() : null,
          location_name: locationName || undefined,
          sensor_height_cm: sh,
          mac_address: macAddr.trim() ? macAddr.trim() : null,
          latitude: parseOptionalCoord(latStr),
          longitude: parseOptionalCoord(lngStr),
          threshold_waspada_cm: tw,
          threshold_siaga_cm: ts,
          threshold_bahaya_cm: tb,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Gagal menyimpan');
      }
      await refreshDashboard();
      toast.success('Pengaturan perangkat disimpan');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  const ADM4_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;

  const handleWeatherSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.info('Simpan pengaturan cuaca hanya tersedia dalam mode Supabase');
      return;
    }
    const trimmedAdm4 = bmkgAdm4.trim();
    if (trimmedAdm4 && !ADM4_RE.test(trimmedAdm4)) {
      toast.error('Format kode ADM4 tidak valid (contoh: 32.01.02.2002)');
      return;
    }
    setWeatherSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/device/${device.id}/weather`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: device.deploymentSlug,
          bmkg_adm4: trimmedAdm4 || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Gagal menyimpan pengaturan cuaca');
      }
      await refreshDashboard();
      toast.success('Pengaturan cuaca BMKG disimpan');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setWeatherSaving(false);
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
      await refreshDashboard();
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
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Ubah nama, lokasi, tinggi sensor, MAC, koordinat, dan ambang lewat form di bawah. CCTV dan interval punya tombol simpan tersendiri.
            </p>
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
                  <p className="text-sm font-semibold text-foreground">Pengaturan Notifikasi</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Konfigurasi template pesan, interval pengiriman pesan, dan pengaturan notifikasi lainnya.
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
              <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-32">Level saat ini</dt>
              <dd className="font-semibold tabular-nums text-foreground">{device.waterLevel} cm</dd>
            </div>
          </dl>
        </Card>

        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Data perangkat, lokasi &amp; ambang</h3>
          <form onSubmit={handleSettingsSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama tampilan</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Titik pantau 1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nama singkat di daftar perangkat. Kosongkan agar kolom nama memakai teks lokasi.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi (deskripsi)</label>
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Sungai Bojong Kulur Hilir" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tinggi sensor dari dasar sungai (cm)</label>
              <Input
                type="number"
                min={1}
                max={50000}
                value={sensorHeightCm}
                onChange={(e) => setSensorHeightCm(e.target.value)}
                placeholder="250"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">MAC Address</label>
              <Input
                value={macAddr}
                onChange={(e) => setMacAddr(e.target.value)}
                placeholder="A4:CF:12:7B:3E:01 (opsional)"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Latitude</label>
                <Input type="number" step="any" value={latStr} onChange={(e) => setLatStr(e.target.value)} placeholder="-6.548" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Longitude</label>
                <Input type="number" step="any" value={lngStr} onChange={(e) => setLngStr(e.target.value)} placeholder="107.012" />
              </div>
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
              {settingsSaving ? 'Menyimpan...' : 'Simpan data perangkat'}
            </Button>
          </form>
        </Card>

        <Card className="border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-sky-600" />
            <h3 className="font-semibold text-foreground">Prakiraan cuaca BMKG</h3>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Kode wilayah desa (ADM4) untuk prakiraan cuaca titik pantau ini. Cari kode di{' '}
            <a
              href="https://data.bmkg.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              data.bmkg.go.id
            </a>
            .
          </p>
          <form onSubmit={handleWeatherSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode ADM4 BMKG</label>
              <Input
                value={bmkgAdm4}
                onChange={(e) => setBmkgAdm4(e.target.value)}
                placeholder="32.01.02.2002"
                className="font-mono text-xs"
              />
            </div>
            <Button type="submit" disabled={weatherSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {weatherSaving ? 'Menyimpan...' : 'Simpan pengaturan cuaca'}
            </Button>
          </form>
        </Card>

        <Card className="border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">CCTV</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
            Konfigurasi IP CCTV dan URL streaming (live) untuk dashboard.
          </p>
          <form className="space-y-4" onSubmit={handleCctvSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">IP kamera di LAN lapangan</label>
              <Input value={cctvLocalIp} onChange={(e) => setCctvLocalIp(e.target.value)} placeholder="192.168.1.50" autoComplete="off" />
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
          <h3 className="mb-1 font-semibold text-foreground">Interval Pengiriman Data</h3>
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
