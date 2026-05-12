import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured, getDefaultDeploymentSlug } from '@/lib/sijagaairEnv';
import { getSupabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Video, Bell, MessageSquare, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

const STATUS_OPTIONS = [
  { value: 'normal',  label: 'Normal' },
  { value: 'waspada', label: 'Waspada' },
  { value: 'siaga',   label: 'Siaga' },
  { value: 'bahaya',  label: 'Bahaya' },
] as const;

const DEFAULT_TEMPLATE = `*SiJagaAir EWS Bojong Kulur*
Laporan Tinggi Muka Air

Lokasi   : {lokasi}
Waktu    : {waktu}

Laporan:
Ketinggian : {level_m} m ({level_cm} cm)
Status     : {status}

Dashboard  : {dashboard_url}`;

const PLACEHOLDERS = ['{lokasi}', '{level_cm}', '{level_m}', '{status}', '{waktu}', '{dashboard_url}'];

export default function DeviceSettings() {
  const { id } = useParams();
  const { devices, updateDeviceCctv } = useLiveData();
  const { accessToken } = useAuth();
  const device = devices.find((d) => d.id === id) ?? devices[0];

  // ── Interval ──────────────────────────────────────────────
  const [interval, setInterval] = useState([device?.reportInterval ?? 3600]);
  const [intervalSaving, setIntervalSaving] = useState(false);

  // ── CCTV ──────────────────────────────────────────────────
  const [cctvLocalIp, setCctvLocalIp] = useState('');
  const [streamPlaybackUrl, setStreamPlaybackUrl] = useState('');
  const [cctvSaving, setCctvSaving] = useState(false);

  // ── Threshold + Lokasi ────────────────────────────────────
  const [locationName, setLocationName] = useState('');
  const [tWaspada, setTWaspada] = useState('');
  const [tSiaga, setTSiaga] = useState('');
  const [tBahaya, setTBahaya] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Test Notifikasi ───────────────────────────────────────
  const [testStatus, setTestStatus] = useState<string>('waspada');
  const [testLevel, setTestLevel] = useState('');
  const [testIncludeCctv, setTestIncludeCctv] = useState(false);
  const [testPreview, setTestPreview] = useState('');
  const [testPreviewLoading, setTestPreviewLoading] = useState(false);
  const [testSendLoading, setTestSendLoading] = useState(false);

  // ── Template Pesan ─────────────────────────────────────────
  const [msgTemplate, setMsgTemplate] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

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

  // Fetch template dari Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setTemplateLoading(true);
    const slug = device?.deploymentSlug ?? getDefaultDeploymentSlug();
    supabase
      .from('deployments')
      .select('whatsapp_message_template')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setMsgTemplate(data?.whatsapp_message_template ?? '');
        setTemplateLoading(false);
      });
  }, [device?.deploymentSlug]);

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

  // ── Handlers ──────────────────────────────────────────────

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
        const body = await res.json() as { error?: string };
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
        const body = await res.json() as { error?: string };
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

  const callNotifTest = async (send: boolean) => {
    if (!isSupabaseConfigured()) {
      toast.info('Test notifikasi hanya tersedia dalam mode Supabase');
      return;
    }
    const levelNum = Number(testLevel);
    if (!testLevel || isNaN(levelNum)) {
      toast.error('Masukkan ketinggian air yang valid');
      return;
    }

    if (send) setTestSendLoading(true);
    else setTestPreviewLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/notification/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          device_id: device.id,
          deployment_slug: device.deploymentSlug,
          water_level_cm: levelNum,
          water_status: testStatus,
          include_cctv: testIncludeCctv,
          send,
        }),
      });

      const body = await res.json() as { preview?: string; sent?: boolean; gatewayError?: string; error?: string };

      if (!res.ok) throw new Error(body.error ?? 'Gagal');

      if (body.preview) setTestPreview(body.preview);

      if (send) {
        if (body.sent) toast.success('Pesan test berhasil dikirim ke WhatsApp Channel');
        else toast.warning(`Pesan tidak terkirim ke gateway: ${body.gatewayError ?? 'tidak diketahui'}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setTestPreviewLoading(false);
      setTestSendLoading(false);
    }
  };

  const handleTemplateSave = async () => {
    setTemplateSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/deployment/template`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: device.deploymentSlug,
          whatsapp_message_template: msgTemplate.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Gagal menyimpan template');
      }
      toast.success('Template pesan disimpan');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setTemplateSaving(false);
    }
  };

  const insertPlaceholder = (ph: string) => {
    setMsgTemplate((prev) => prev + ph);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
        </Link>

        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">{device.name}</h2>
          <StatusBadge status={device.status} />
        </div>

        {/* Info Perangkat */}
        <Card className="border-border bg-card p-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>ID perangkat:</span>
            <span className="text-foreground font-mono text-xs">{device.id}</span>
            <span>MAC Address:</span>
            <span className="text-foreground font-mono text-xs">{device.mac}</span>
            <span>Koordinat:</span>
            <span className="text-foreground">{device.lat}, {device.lng}</span>
            <span>Level saat ini:</span>
            <span className="text-foreground font-semibold">{device.waterLevel} cm</span>
          </div>
        </Card>

        {/* ── Konfigurasi Ambang Batas + Lokasi ── */}
        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Konfigurasi Lokasi &amp; Ambang Batas</h3>
          <form onSubmit={handleSettingsSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Lokasi</label>
              <Input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Sungai Bojong Kulur Hilir"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Waspada (cm)</label>
                <Input
                  type="number"
                  min={0}
                  value={tWaspada}
                  onChange={e => setTWaspada(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Siaga (cm)</label>
                <Input
                  type="number"
                  min={0}
                  value={tSiaga}
                  onChange={e => setTSiaga(e.target.value)}
                  placeholder="80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Bahaya (cm)</label>
                <Input
                  type="number"
                  min={0}
                  value={tBahaya}
                  onChange={e => setTBahaya(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
            <Button type="submit" disabled={settingsSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {settingsSaving ? 'Menyimpan...' : 'Simpan Lokasi &amp; Threshold'}
            </Button>
          </form>
        </Card>

        {/* ── CCTV ── */}
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                IP kamera di LAN lapangan
              </label>
              <Input
                value={cctvLocalIp}
                onChange={(e) => setCctvLocalIp(e.target.value)}
                placeholder="192.168.1.50"
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Referensi dokumentasi; node ESP32 memakai IP ini untuk snapshot HTTP di jaringan lokal.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                URL streaming (live) untuk dashboard
              </label>
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

        {/* ── Interval Laporan ── */}
        <Card className="border-border bg-card p-4">
          <h3 className="mb-1 font-semibold text-foreground">Interval Laporan</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Seberapa sering perangkat mengirim data ke server. Saat hujan lebat disarankan 5–15 menit; saat kemarau bisa 1–4 jam.
          </p>
          <Slider
            min={60}
            max={86400}
            step={60}
            value={interval}
            onValueChange={setInterval}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-foreground font-semibold">{formatInterval(interval[0])}</p>
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
          <Button
            type="button"
            onClick={handleIntervalSave}
            disabled={intervalSaving}
            className="mt-4 gap-2"
          >
            <Save className="h-4 w-4" />
            {intervalSaving ? 'Menyimpan...' : 'Simpan Interval'}
          </Button>
        </Card>

        {/* ── Test Notifikasi (Supabase mode saja) ── */}
        {isSupabaseConfigured() && (
          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Test Notifikasi</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Status yang disimulasikan</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTestStatus(opt.value)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          testStatus === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Ketinggian air (cm)</label>
                  <Input
                    type="number"
                    min={0}
                    value={testLevel}
                    onChange={e => setTestLevel(e.target.value)}
                    placeholder="75"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="test-cctv"
                  checked={testIncludeCctv}
                  onCheckedChange={(v) => setTestIncludeCctv(Boolean(v))}
                />
                <label htmlFor="test-cctv" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Sertakan foto CCTV terakhir
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => callNotifTest(false)}
                  disabled={testPreviewLoading || testSendLoading}
                >
                  {testPreviewLoading ? 'Memuat preview...' : 'Preview Pesan'}
                </Button>
                <Button
                  type="button"
                  onClick={() => callNotifTest(true)}
                  disabled={testSendLoading || testPreviewLoading}
                >
                  {testSendLoading ? 'Mengirim...' : 'Kirim Test ke Channel WhatsApp'}
                </Button>
              </div>

              {testPreview && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Preview:</label>
                  <pre className="rounded-md border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {testPreview}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Template Pesan WhatsApp (Supabase mode saja) ── */}
        {isSupabaseConfigured() && (
          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Template Pesan WhatsApp</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
              Kosongkan untuk menggunakan template default. Gunakan placeholder berikut:
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => insertPlaceholder(ph)}
                  className="rounded border border-dashed border-primary/50 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/10 transition-colors"
                >
                  {ph}
                </button>
              ))}
            </div>
            {templateLoading ? (
              <div className="h-32 animate-pulse rounded-md bg-muted" />
            ) : (
              <Textarea
                value={msgTemplate}
                onChange={e => setMsgTemplate(e.target.value)}
                placeholder={DEFAULT_TEMPLATE}
                rows={10}
                className="resize-y font-mono text-xs"
              />
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Kosongkan untuk menggunakan template default bawaan sistem.
            </p>
            <Button
              type="button"
              onClick={handleTemplateSave}
              disabled={templateSaving}
              className="mt-3 gap-2"
            >
              <Save className="h-4 w-4" />
              {templateSaving ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
