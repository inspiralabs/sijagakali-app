/** Konstanta template WA & resolver — dipakai Halaman Peringatan (bukan duplikasi di DeviceSettings). */

export const STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'waspada', label: 'Waspada' },
  { value: 'siaga', label: 'Siaga' },
  { value: 'bahaya', label: 'Bahaya' },
] as const;

export const WA_DEFAULT_NORMAL = `━━━━━━━━━━━━━━━━━━━━
🌊 *SiJagaAir | Laporan Muka Air*
📍 Pos Pantau: *{nama_pos}*
🏘️ Wilayah: *{wilayah}*
━━━━━━━━━━━━━━━━━━━━

📏 *Tinggi Muka Air*
  Saat ini : *{level_cm} cm* (~{level_m} m)
  Ambang waspada : {batas_waspada} cm
  Ambang siaga : {batas_siaga} cm

🟢 *Status: NORMAL*
Kondisi aman. Tidak ada ancaman banjir.

🕐 Waktu pencatatan (WIB): {waktu}
🔁 Update berikutnya: ±{interval} menit

📊 *Pantau live:* {dashboard_url}
━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis oleh SiJagaAir_`;

export const WA_DEFAULT_WASPADA = `━━━━━━━━━━━━━━━━━━━━
⚠️ *SiJagaAir | PERINGATAN DINI*
📍 Pos Pantau: *{nama_pos}*
🏘️ Wilayah: *{wilayah}*
━━━━━━━━━━━━━━━━━━━━

📏 *Tinggi Muka Air*
  Saat ini : *{level_cm} cm* (~{level_m} m)  ⬆️ naik {selisih} cm
  Ambang waspada : {batas_waspada} cm ✅ Terlampaui
  Ambang siaga : {batas_siaga} cm

🟡 *Status: WASPADA*
Air mulai meningkat. Harap pantau kondisi sekitar
dan waspada terhadap kemungkinan banjir.

🕐 Waktu (WIB): {waktu}
📊 *Pantau live:* {dashboard_url}

📞 Info lebih lanjut: {kontak_petugas}
━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis oleh SiJagaAir_`;

export const WA_DEFAULT_SIAGA = `🚨🚨🚨 *PERINGATAN BAHAYA* 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━
🌊 *SiJagaAir | SIAGA BANJIR*
📍 Pos Pantau: *{nama_pos}*
🏘️ Wilayah: *{wilayah}*
━━━━━━━━━━━━━━━━━━━━

📏 *Tinggi Muka Air*
  Saat ini : ⚠️ *{level_cm} cm* (~{level_m} m)
  Ambang siaga : {batas_siaga} cm — 🔴 TERLAMPAUI

🔴 *Status: SIAGA*
Ketinggian air sudah melewati batas siaga.
Warga di bantaran sungai harap segera
bersiap untuk evakuasi.

🕐 Waktu (WIB): {waktu}

🆘 *Hubungi segera:*
  BPBD : {no_bpbd}
  Posko Desa : {no_posko}

📊 *Pantau live:* {dashboard_url}
━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis oleh SiJagaAir_`;

export const WA_DEFAULT_BAHAYA = `🚨🚨🚨 *PERINGATAN BAHAYA* 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━
🌊 *SiJagaAir | BAHAYA BANJIR*
📍 Pos Pantau: *{nama_pos}*
🏘️ Wilayah: *{wilayah}*
━━━━━━━━━━━━━━━━━━━━

📏 *Tinggi Muka Air*
  Saat ini : ⚠️ *{level_cm} cm* (~{level_m} m)
  Ambang bahaya : {batas_bahaya} cm — 🔴 TERLAMPAUI

🔴 *Status: BAHAYA*
Ketinggian air sudah melewati batas bahaya.
Warga di bantaran sungai harap segera
bersiap untuk evakuasi.

🕐 Waktu (WIB): {waktu}

🆘 *Hubungi segera:*
  BPBD : {no_bpbd}
  Posko Desa : {no_posko}

📊 *Pantau live:* {dashboard_url}
━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis oleh SiJagaAir_`;

export const PLACEHOLDERS = [
  '{nama_pos}',
  '{lokasi}',
  '{wilayah}',
  '{deployment_slug}',
  '{device_id}',
  '{level_cm}',
  '{level_m}',
  '{status}',
  '{waktu}',
  '{dashboard_url}',
  '{batas_waspada}',
  '{batas_siaga}',
  '{batas_bahaya}',
  '{interval}',
  '{selisih}',
  '{kontak_petugas}',
  '{no_bpbd}',
  '{no_posko}',
] as const;

export type TemplateField = 'normal' | 'waspada' | 'siaga' | 'bahaya';

export const WA_DEPLOYMENT_SELECT =
  'wa_template_normal,wa_template_waspada,wa_template_siaga,wa_template_bahaya,contact_petugas,contact_bpbd,contact_posko';

const LEGACY_SEED_SINGLE_LINE =
  'Peringatan {status} di {lokasi}: air {level_cm} cm. Waktu {waktu}. Pantau: {dashboard_url}';

export function resolveWaTemplatesFromDeployment(data: {
  wa_template_normal?: string | null;
  wa_template_waspada?: string | null;
  wa_template_siaga?: string | null;
  wa_template_bahaya?: string | null;
} | null): { n: string; w: string; s: string; b: string } {
  const n = (data?.wa_template_normal ?? '').trim();
  const w = (data?.wa_template_waspada ?? '').trim();
  const s = (data?.wa_template_siaga ?? '').trim();
  const b = (data?.wa_template_bahaya ?? '').trim();
  const anyWa = Boolean(n || w || s || b);

  if (anyWa) {
    if ([n, w, s, b].every((x) => x === LEGACY_SEED_SINGLE_LINE)) {
      return {
        n: WA_DEFAULT_NORMAL,
        w: WA_DEFAULT_WASPADA,
        s: WA_DEFAULT_SIAGA,
        b: WA_DEFAULT_BAHAYA,
      };
    }
    return {
      n: n || WA_DEFAULT_NORMAL,
      w: w || WA_DEFAULT_WASPADA,
      s: s || WA_DEFAULT_SIAGA,
      b: b || WA_DEFAULT_BAHAYA,
    };
  }
  return {
    n: WA_DEFAULT_NORMAL,
    w: WA_DEFAULT_WASPADA,
    s: WA_DEFAULT_SIAGA,
    b: WA_DEFAULT_BAHAYA,
  };
}
