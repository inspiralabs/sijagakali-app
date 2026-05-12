import type { AuthError } from '@supabase/supabase-js';

/**
 * Menerjemahkan error Supabase Auth ke pesan UI (Bahasa Indonesia).
 * Catatan keamanan: GoTrue tidak membedakan "email salah" vs "kata sandi salah"
 * untuk endpoint login — keduanya biasanya `invalid_credentials`.
 */
export function formatAuthError(error: AuthError | null | undefined, fallback?: string): string {
  if (!error) return fallback ?? 'Terjadi kesalahan. Coba lagi.';

  const code = typeof error.code === 'string' ? error.code.toLowerCase() : '';
  const msg = (error.message ?? '').trim();
  const lower = msg.toLowerCase();

  switch (code) {
    case 'invalid_credentials':
      return 'Email atau kata sandi salah. Pastikan akun admin ada dan kata sandi benar.';
    case 'email_not_confirmed':
      return 'Email belum diverifikasi. Periksa kotak masuk untuk tautan konfirmasi.';
    case 'user_not_found':
      return 'Tidak ada akun dengan email ini.';
    case 'captcha_failed':
      return 'Verifikasi keamanan (CAPTCHA) ditolak. Muat ulang halaman lalu coba lagi.';
    case 'over_request_rate_limit':
      return 'Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.';
    case 'over_email_send_rate_limit':
      return 'Terlalu banyak permintaan email. Tunggu sebentar sebelum meminta lagi.';
    case 'weak_password':
      return 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih kuat.';
    case 'same_password':
      return 'Kata sandi baru tidak boleh sama dengan kata sandi lama.';
    case 'validation_failed':
      return 'Data tidak valid. Periksa format email dan kolom lainnya.';
    default:
      break;
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email atau kata sandi salah. Pastikan akun admin ada dan kata sandi benar.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Periksa kotak masuk untuk tautan konfirmasi.';
  }
  if (lower.includes('captcha')) {
    return 'Verifikasi keamanan gagal. Selesaikan CAPTCHA lalu coba lagi.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Gagal menghubungi server. Periksa koneksi internet Anda.';
  }

  return msg || fallback || 'Terjadi kesalahan. Coba lagi.';
}
