import { useParams, Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured, getDefaultDeploymentSlug } from '@/lib/sijagaairEnv';
import { getSupabase } from '@/lib/supabase';
import { fetchDeviceNotificationLogs, type DeviceNotificationLogRow } from '@/lib/sijagaair/fetchDashboard';
import {
  PLACEHOLDERS,
  STATUS_OPTIONS,
  WA_DEPLOYMENT_SELECT,
  WA_DEFAULT_BAHAYA,
  WA_DEFAULT_NORMAL,
  WA_DEFAULT_SIAGA,
  WA_DEFAULT_WASPADA,
  resolveWaTemplatesFromDeployment,
  type TemplateField,
} from '@/lib/sijagaair/waTemplatesConstants';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Bell, History, MessageSquare, RadioTower, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatWIB } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '';

function formatDigestInput(hours: number[]): string {
  return hours.join(', ');
}

function parseDigestInput(s: string): { ok: true; value: number[] } | { ok: false; error: string } {
  const parts = s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'Minimal satu jam (0–23)' };
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 23) return { ok: false, error: `Jam tidak valid: ${p}` };
    nums.push(n);
  }
  return { ok: true, value: [...new Set(nums)].sort((a, b) => a - b) };
}

export default function DeviceNotifications() {
  const { id } = useParams();
  const { devices } = useLiveData();
  const { accessToken } = useAuth();
  const device = devices.find((d) => d.id === id) ?? devices[0];

  const [logs, setLogs] = useState<DeviceNotificationLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [coolW, setCoolW] = useState('');
  const [coolS, setCoolS] = useState('');
  const [coolB, setCoolB] = useState('');
  const [surgeDelta, setSurgeDelta] = useState('');
  const [surgeWin, setSurgeWin] = useState('');
  const [digestStr, setDigestStr] = useState('8, 12, 17, 21');
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

  const [testStatus, setTestStatus] = useState<string>('waspada');
  const [testLevel, setTestLevel] = useState('');
  const [testIncludeCctv, setTestIncludeCctv] = useState(false);
  const [testPreview, setTestPreview] = useState('');
  const [testPreviewLoading, setTestPreviewLoading] = useState(false);
  const [testSendLoading, setTestSendLoading] = useState(false);

  const [tplNormal, setTplNormal] = useState('');
  const [tplWaspada, setTplWaspada] = useState('');
  const [tplSiaga, setTplSiaga] = useState('');
  const [tplBahaya, setTplBahaya] = useState('');
  const [contactPetugas, setContactPetugas] = useState('');
  const [contactBpbd, setContactBpbd] = useState('');
  const [contactPosko, setContactPosko] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  const slug = device?.deploymentSlug ?? getDefaultDeploymentSlug();

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken ?? ''}`,
    }),
    [accessToken]
  );

  const loadLogs = useCallback(async () => {
    if (!device || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setLogsLoading(true);
    try {
      const rows = await fetchDeviceNotificationLogs(supabase, slug, device.id, 80);
      setLogs(rows);
    } finally {
      setLogsLoading(false);
    }
  }, [device, slug]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!device || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setPolicyLoading(true);
    supabase
      .from('device_configs')
      .select(
        'notify_cooldown_waspada_sec, notify_cooldown_siaga_sec, notify_cooldown_bahaya_sec, notify_surge_delta_cm, notify_surge_window_min, notify_digest_hours_local'
      )
      .eq('deployment_slug', slug)
      .eq('device_id', device.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          if (error) toast.error(error.message);
          setPolicyLoading(false);
          return;
        }
        const row = data as {
          notify_cooldown_waspada_sec: number;
          notify_cooldown_siaga_sec: number;
          notify_cooldown_bahaya_sec: number;
          notify_surge_delta_cm: number;
          notify_surge_window_min: number;
          notify_digest_hours_local: number[];
        };
        setCoolW(String(row.notify_cooldown_waspada_sec));
        setCoolS(String(row.notify_cooldown_siaga_sec));
        setCoolB(String(row.notify_cooldown_bahaya_sec));
        setSurgeDelta(String(row.notify_surge_delta_cm));
        setSurgeWin(String(row.notify_surge_window_min));
        const dh = Array.isArray(row.notify_digest_hours_local) ? row.notify_digest_hours_local : [];
        setDigestStr(dh.length ? formatDigestInput(dh) : '8, 12, 17, 21');
        setPolicyLoading(false);
      });
  }, [device?.id, slug]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !device) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setTemplateLoading(true);
    supabase
      .from('deployments')
      .select(WA_DEPLOYMENT_SELECT)
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        const t = resolveWaTemplatesFromDeployment(data);
        setTplNormal(t.n);
        setTplWaspada(t.w);
        setTplSiaga(t.s);
        setTplBahaya(t.b);
        setContactPetugas(data?.contact_petugas ?? '');
        setContactBpbd(data?.contact_bpbd ?? '');
        setContactPosko(data?.contact_posko ?? '');
        setTemplateLoading(false);
      });
  }, [slug, device?.id]);

  const handlePolicySave = async () => {
    if (!device || !isSupabaseConfigured()) {
      toast.info('Hanya tersedia dengan Supabase');
      return;
    }
    const parsed = parseDigestInput(digestStr);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const cw = Number(coolW);
    const cs = Number(coolS);
    const cb = Number(coolB);
    const sd = Number(surgeDelta);
    const sw = Number(surgeWin);
    if (![cw, cs, cb, sw].every((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0)) {
      toast.error('Cooldown dan jendela harus bilangan bulat tidak negatif');
      return;
    }
    if (!Number.isFinite(sd) || sd < 0) {
      toast.error('Lonjakan (cm) harus angka tidak negatif');
      return;
    }
    if (sw < 1) {
      toast.error('Jendela lonjakan minimal 1 menit');
      return;
    }
    setPolicySaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/device/${encodeURIComponent(device.id)}/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: slug,
          notify_cooldown_waspada_sec: cw,
          notify_cooldown_siaga_sec: cs,
          notify_cooldown_bahaya_sec: cb,
          notify_surge_delta_cm: sd,
          notify_surge_window_min: sw,
          notify_digest_hours_local: parsed.value,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan');
      toast.success('Kebijakan kirim WhatsApp disimpan');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setPolicySaving(false);
    }
  };

  const callNotifTest = async (send: boolean) => {
    if (!device || !isSupabaseConfigured()) {
      toast.info('Test hanya tersedia dengan Supabase');
      return;
    }
    const levelNum = Number(testLevel);
    if (!testLevel || Number.isNaN(levelNum)) {
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
          deployment_slug: slug,
          water_level_cm: levelNum,
          water_status: testStatus,
          include_cctv: testIncludeCctv,
          send,
        }),
      });
      const body = (await res.json()) as {
        preview?: string;
        sent?: boolean;
        gatewayError?: string;
        error?: string;
        imageAttached?: boolean;
        skipImageReason?: string | null;
      };
      if (!res.ok) throw new Error(body.error ?? 'Gagal');
      if (body.preview) setTestPreview(body.preview);
      if (send) {
        if (body.sent) {
          let detail = '';
          if (body.imageAttached) detail = ' Gambar terlampir.';
          else if (body.skipImageReason === 'unchecked') detail = ' Tanpa gambar (CCTV tidak dicentang).';
          else if (body.skipImageReason === 'no_path') detail = ' Tanpa gambar (belum ada path foto).';
          else if (body.skipImageReason === 'signed_url_failed') detail = ' Tanpa gambar (signed URL gagal).';
          else if (body.skipImageReason === 'image_download_failed') detail = ' Gambar gagal di gateway; teks terkirim.';
          toast.success(`Test terkirim ke channel.${detail}`);
          void loadLogs();
        } else {
          toast.warning(`Gateway: ${body.gatewayError ?? 'tidak diketahui'}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTestPreviewLoading(false);
      setTestSendLoading(false);
    }
  };

  const handleTemplateSave = async () => {
    if (!device) return;
    setTemplateSaving(true);
    try {
      const n = tplNormal.trim() || WA_DEFAULT_NORMAL;
      const w = tplWaspada.trim() || WA_DEFAULT_WASPADA;
      const s = tplSiaga.trim() || WA_DEFAULT_SIAGA;
      const b = tplBahaya.trim() || WA_DEFAULT_BAHAYA;
      const res = await fetch(`${API_BASE}/api/deployment/template`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          deployment_slug: slug,
          whatsapp_message_template: null,
          wa_template_normal: n,
          wa_template_waspada: w,
          wa_template_siaga: s,
          wa_template_bahaya: b,
          contact_petugas: contactPetugas.trim() || null,
          contact_bpbd: contactBpbd.trim() || null,
          contact_posko: contactPosko.trim() || null,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Gagal menyimpan template');
      toast.success('Template & kontak disimpan');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTemplateSaving(false);
    }
  };

  const insertPlaceholder = (which: TemplateField, ph: string) => {
    const append = (prev: string) => prev + ph;
    if (which === 'normal') setTplNormal(append);
    if (which === 'waspada') setTplWaspada(append);
    if (which === 'siaga') setTplSiaga(append);
    if (which === 'bahaya') setTplBahaya(append);
  };

  const applyBuiltinWaTemplates = () => {
    setTplNormal(WA_DEFAULT_NORMAL);
    setTplWaspada(WA_DEFAULT_WASPADA);
    setTplSiaga(WA_DEFAULT_SIAGA);
    setTplBahaya(WA_DEFAULT_BAHAYA);
    toast.info('Form diisi contoh; simpan untuk menulis ke database.');
  };

  if (!device) {
    return (
      <AppLayout>
        <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Tidak ada perangkat.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to="/devices" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Perangkat
          </Link>
          <span className="text-border">/</span>
          <Link to={`/devices/${encodeURIComponent(device.id)}/settings`} className="hover:text-foreground">
            Pengaturan
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card px-5 py-7 shadow-sm md:px-8 md:py-9">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background/40 to-transparent" aria-hidden />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">SiJagaAir</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Halaman Peringatan</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                WhatsApp: template, kontak, uji kirim, log — serta aturan kapan pesan otomatis boleh dikirim untuk{' '}
                <span className="font-medium text-foreground">{device.name}</span>.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
              <StatusBadge status={device.status} />
              <span className="font-mono text-xs text-muted-foreground">{device.id}</span>
            </div>
          </div>
        </section>

        {!isSupabaseConfigured() && (
          <Card className="border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-900 dark:text-amber-100">
            Mode tanpa Supabase: halaman ini membutuhkan koneksi Supabase untuk memuat dan menyimpan data.
          </Card>
        )}

        {/* Kebijakan kirim otomatis */}
        <Card className="overflow-hidden border-border/90 bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b border-border/80 bg-muted/30 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <RadioTower className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Kebijakan kirim otomatis (WhatsApp)</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Cooldown = jeda minimum sebelum kirim ulang saat status sama. Lonjakan = delta cm dalam jendela waktu. Digest = jam
                (WIB) saat status normal tetap bisa memicu laporan ringkas.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {policyLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Cooldown waspada (detik)</label>
                    <Input value={coolW} onChange={(e) => setCoolW(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Cooldown siaga (detik)</label>
                    <Input value={coolS} onChange={(e) => setCoolS(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Cooldown bahaya (detik)</label>
                    <Input value={coolB} onChange={(e) => setCoolB(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Lonjakan air (cm) dalam jendela</label>
                    <Input value={surgeDelta} onChange={(e) => setSurgeDelta(e.target.value)} type="number" min={0} step="0.1" className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Jendela lonjakan (menit)</label>
                    <Input value={surgeWin} onChange={(e) => setSurgeWin(e.target.value)} type="number" min={1} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Jam digest (WIB), pisahkan koma</label>
                  <Input value={digestStr} onChange={(e) => setDigestStr(e.target.value)} placeholder="8, 12, 17, 21" className="font-mono text-sm" />
                </div>
                <Button type="button" onClick={() => void handlePolicySave()} disabled={policySaving || !isSupabaseConfigured()} className="gap-2">
                  <Save className="h-4 w-4" />
                  {policySaving ? 'Menyimpan...' : 'Simpan kebijakan'}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Test */}
        {isSupabaseConfigured() && (
          <Card className="border-border/90 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--status-waspada)/0.15)] text-[hsl(var(--status-waspada))]">
                <Bell className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Test ke channel WhatsApp</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Status simulasi</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTestStatus(opt.value)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                          testStatus === opt.value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Ketinggian air (cm)</label>
                  <Input type="number" min={0} value={testLevel} onChange={(e) => setTestLevel(e.target.value)} placeholder="75" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cctv-test" checked={testIncludeCctv} onCheckedChange={(v) => setTestIncludeCctv(Boolean(v))} />
                <label htmlFor="cctv-test" className="cursor-pointer text-xs text-muted-foreground">
                  Sertakan foto CCTV terakhir
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void callNotifTest(false)} disabled={testPreviewLoading || testSendLoading}>
                  {testPreviewLoading ? 'Memuat…' : 'Preview pesan'}
                </Button>
                <Button type="button" onClick={() => void callNotifTest(true)} disabled={testSendLoading || testPreviewLoading}>
                  {testSendLoading ? 'Mengirim…' : 'Kirim test'}
                </Button>
              </div>
              {testPreview ? (
                <pre className="max-h-64 overflow-auto rounded-xl border border-border/80 bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {testPreview}
                </pre>
              ) : null}
            </div>
          </Card>
        )}

        {/* Template */}
        {isSupabaseConfigured() && (
          <Card className="border-border/90 bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Template & kontak</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disimpan di deployment <span className="font-mono text-foreground">{slug}</span> — sama untuk semua node wilayah ini.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={applyBuiltinWaTemplates} disabled={templateLoading}>
                  Isi contoh
                </Button>
                <Button type="button" size="sm" className="gap-1" onClick={() => void handleTemplateSave()} disabled={templateSaving || templateLoading}>
                  <Save className="h-4 w-4" />
                  {templateSaving ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </div>
            <div className="p-5">
              {templateLoading ? (
                <div className="h-48 animate-pulse rounded-lg bg-muted" />
              ) : (
                <div className="space-y-6">
                  {(
                    [
                      { key: 'normal' as const, label: 'Normal', val: tplNormal, set: setTplNormal },
                      { key: 'waspada' as const, label: 'Waspada', val: tplWaspada, set: setTplWaspada },
                      { key: 'siaga' as const, label: 'Siaga', val: tplSiaga, set: setTplSiaga },
                      { key: 'bahaya' as const, label: 'Bahaya', val: tplBahaya, set: setTplBahaya },
                    ] as const
                  ).map((row) => (
                    <div key={row.key}>
                      <label className="mb-1 block text-xs font-medium text-foreground">{row.label}</label>
                      <div className="mb-2 flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-md border border-dashed border-border/80 bg-muted/20 p-2">
                        {PLACEHOLDERS.map((ph) => (
                          <button
                            key={ph}
                            type="button"
                            onClick={() => insertPlaceholder(row.key, ph)}
                            className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:bg-primary/10"
                          >
                            {ph}
                          </button>
                        ))}
                      </div>
                      <Textarea value={row.val} onChange={(e) => row.set(e.target.value)} rows={5} className="resize-y font-mono text-xs" />
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Kontak petugas</label>
                      <Input value={contactPetugas} onChange={(e) => setContactPetugas(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">BPBD</label>
                      <Input value={contactBpbd} onChange={(e) => setContactBpbd(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Posko</label>
                      <Input value={contactPosko} onChange={(e) => setContactPosko(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Log */}
        <Card className="border-border/90 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Log notifikasi</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLogs()} disabled={logsLoading || !isSupabaseConfigured()}>
              {logsLoading ? 'Memuat…' : 'Segarkan'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Status air</th>
                  <th className="px-4 py-3 font-medium">Saluran</th>
                  <th className="px-4 py-3 font-medium">Hasil</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b border-border/80 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{formatWIB(row.sent_at)}</td>
                    <td className="px-4 py-2.5 font-medium capitalize">{row.water_status ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.channel}</td>
                    <td className="px-4 py-2.5">
                      {row.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          terkirim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          <ShieldAlert className="h-3 w-3" />
                          gagal
                        </span>
                      )}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-2.5 text-xs text-muted-foreground md:table-cell" title={row.error_message ?? ''}>
                      {row.error_message ?? '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !logsLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Belum ada log untuk perangkat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
