import { useParams, Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useLiveData } from '@/lib/liveDataContext';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured, getDefaultDeploymentSlug } from '@/lib/sijagakaliEnv';
import { getSupabase } from '@/lib/supabase';
import { fetchDeviceNotificationLogs, type DeviceNotificationLogRow } from '@/lib/sijagakali/fetchDashboard';
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
} from '@/lib/sijagakali/waTemplatesConstants';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  MessageSquare,
  Phone,
  RadioTower,
  Save,
  Settings2,
  FilePenLine 
} from 'lucide-react';
import { toast } from 'sonner';
import { formatWIB } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';

const TEMPLATE_STATUS_OPTIONS: { value: TemplateField; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'waspada', label: 'Waspada' },
  { value: 'siaga', label: 'Siaga' },
  { value: 'bahaya', label: 'Bahaya' },
];

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
  const [activeTemplateField, setActiveTemplateField] = useState<TemplateField>('normal');

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
    if (parsed.ok === false) {
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

  const templateEditors = {
    normal: { label: 'Normal', value: tplNormal, setValue: setTplNormal },
    waspada: { label: 'Waspada', value: tplWaspada, setValue: setTplWaspada },
    siaga: { label: 'Siaga', value: tplSiaga, setValue: setTplSiaga },
    bahaya: { label: 'Bahaya', value: tplBahaya, setValue: setTplBahaya },
  } satisfies Record<TemplateField, { label: string; value: string; setValue: (v: string) => void }>;
  const activeTemplateRow = templateEditors[activeTemplateField];

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
          <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Tidak ada perangkat.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Perangkat
        </Link>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pengaturan notifikasi</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{device.name}</h2>
            <StatusBadge status={device.status} />
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Konfigurasi template pesan, interval pengiriman pesan, dan pengaturan notifikasi lainnya.
          </p>
        </div>

        <Link
          to={`/devices/${encodeURIComponent(device.id)}/settings`}
          className="group block rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-border/60 transition-all hover:border-primary/35 hover:bg-muted/20 hover:ring-primary/15"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Pengaturan perangkat</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Lokasi, ambang batas, CCTV, dan interval pengiriman data.
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
              Buka
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-px" />
            </span>
          </div>
        </Link>

        {!isSupabaseConfigured() && (
          <Card className="border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            
          </Card>
        )}

        {/* Kebijakan kirim otomatis */}
        <Card className="border-border bg-card p-4">
          <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <RadioTower className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Kebijakan kirim otomatis (WhatsApp)</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Cooldown: jeda minimum sebelum kirim ulang saat status sama. Lonjakan: delta cm dalam jendela waktu. Digest: jam (WIB)
                untuk laporan ringkas saat status normal.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {policyLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">Cooldown waspada (detik)</label>
                    <Input value={coolW} onChange={(e) => setCoolW(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">Cooldown siaga (detik)</label>
                    <Input value={coolS} onChange={(e) => setCoolS(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">Cooldown bahaya (detik)</label>
                    <Input value={coolB} onChange={(e) => setCoolB(e.target.value)} type="number" min={0} className="font-mono text-sm" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">Lonjakan air (cm) dalam jendela</label>
                    <Input value={surgeDelta} onChange={(e) => setSurgeDelta(e.target.value)} type="number" min={0} step="0.1" className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">Jendela lonjakan (menit)</label>
                    <Input value={surgeWin} onChange={(e) => setSurgeWin(e.target.value)} type="number" min={1} className="font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Jam digest (WIB), pisahkan koma</label>
                  <Input value={digestStr} onChange={(e) => setDigestStr(e.target.value)} placeholder="8, 12, 17, 21" className="font-mono text-sm" />
                </div>
                <Button type="button" onClick={() => void handlePolicySave()} disabled={policySaving || !isSupabaseConfigured()} className="gap-2">
                  <Save className="h-4 w-4" />
                  {policySaving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Test */}
        {isSupabaseConfigured() && (
          <Card className="border-border bg-card p-4">
            <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Test Notifikasi</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Simulasikan status dan ketinggian air, lalu kirim ke WhatsApp Channel.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Status simulasi</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTestStatus(opt.value)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          testStatus === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="max-w-[280px] space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Ketinggian air (cm)</label>
                  <Input type="number" min={0} value={testLevel} onChange={(e) => setTestLevel(e.target.value)} placeholder="75" />
                </div>
              </div>
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2.5">
                <Checkbox id="cctv-test" checked={testIncludeCctv} onCheckedChange={(v) => setTestIncludeCctv(Boolean(v))} />
                <label htmlFor="cctv-test" className="cursor-pointer text-xs text-muted-foreground leading-snug">
                  Sertakan foto CCTV
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
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {testPreview}
                </pre>
              ) : null}
            </div>
          </Card>
        )}

        {/* Template WhatsApp */}
        {isSupabaseConfigured() && (
          <>
            <Card className="border-border bg-card p-4">
              <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Template WhatsApp</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Isi pesan untuk setiap status (Normal, Waspada, Siaga, Bahaya).
                  </p>
                </div>
              </div>
              <div>
                {templateLoading ? (
                  <div className="h-48 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="wa-template-status" className="block text-xs font-medium text-muted-foreground">
                        Template untuk status
                      </label>
                      <Select value={activeTemplateField} onValueChange={(v) => setActiveTemplateField(v as TemplateField)}>
                        <SelectTrigger id="wa-template-status" className="h-9 w-full text-xs sm:max-w-md">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">Sisipkan placeholder</span>
                      <div className="flex max-h-[5.5rem] flex-wrap gap-1.5 overflow-y-auto rounded-md border border-dashed border-border bg-muted/30 p-2.5">
                        {PLACEHOLDERS.map((ph) => (
                          <button
                            key={ph}
                            type="button"
                            onClick={() => insertPlaceholder(activeTemplateField, ph)}
                            className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary transition-colors hover:bg-primary/10"
                          >
                            {ph}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="wa-template-body" className="block text-xs font-medium text-muted-foreground">
                        Isi pesan ({activeTemplateRow.label})
                      </label>
                      <Textarea
                        id="wa-template-body"
                        value={activeTemplateRow.value}
                        onChange={(e) => activeTemplateRow.setValue(e.target.value)}
                        rows={10}
                        className="min-h-[220px] resize-y font-mono text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={applyBuiltinWaTemplates} disabled={templateLoading} className="gap-2">
                          <FilePenLine className="h-4 w-4" />
                          Gunakan Template
                        </Button>
                        <Button type="button" className="gap-2" onClick={() => void handleTemplateSave()} disabled={templateSaving || templateLoading}>
                          <Save className="h-4 w-4" />
                          {templateSaving ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-border bg-card p-4">
              <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Kontak</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Nomor untuk placeholder di template (opsional).
                  </p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Petugas</label>
                  <Input value={contactPetugas} onChange={(e) => setContactPetugas(e.target.value)} disabled={templateLoading} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">BPBD</label>
                  <Input value={contactBpbd} onChange={(e) => setContactBpbd(e.target.value)} disabled={templateLoading} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Posko</label>
                  <Input value={contactPosko} onChange={(e) => setContactPosko(e.target.value)} disabled={templateLoading} />
                </div>
                <div className="flex flex-col gap-3 border-t border-border pt-4 lg:col-span-3">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Simpan</span> di sini sama dengan di kartu Template — menulis ke database semua template beserta
                    kontak di atas sekaligus.
                  </p>
                  <Button type="button" size="sm" className="w-fit gap-2" onClick={() => void handleTemplateSave()} disabled={templateSaving || templateLoading}>
                    <Save className="h-4 w-4" />
                    {templateSaving ? 'Menyimpan…' : 'Simpan'}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
