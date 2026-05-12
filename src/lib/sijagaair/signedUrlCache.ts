/**
 * Cache signed URL untuk gambar CCTV.
 * Memanggil GET /api/cctv/signed-url di sijagaair-api (Fastify).
 * Service role TIDAK diekspos ke browser; semua lewat endpoint ini.
 */

const API_BASE = (import.meta.env.VITE_SIJAGAAIRAPI_URL ?? '').replace(/\/$/, '');

interface CachedUrl {
  url: string;
  /** unix ms saat URL kedaluwarsa */
  expiresAt: number;
}

const cache = new Map<string, CachedUrl>();

const SIGNED_URL_EXPIRES_SEC = 86400; // 24 jam
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000; // refresh 5 menit sebelum kedaluwarsa

/**
 * Kembalikan signed URL untuk path di Supabase Storage.
 * Jika API belum dikonfigurasi, kembalikan null.
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path || !API_BASE) return null;

  const cached = cache.get(path);
  if (cached && Date.now() < cached.expiresAt - REFRESH_BEFORE_EXPIRY_MS) {
    return cached.url;
  }

  try {
    const resp = await fetch(
      `${API_BASE}/api/cctv/signed-url?path=${encodeURIComponent(path)}&expiresIn=${SIGNED_URL_EXPIRES_SEC}`
    );
    if (!resp.ok) return null;

    const json = (await resp.json()) as { signedUrl: string; expiresIn: number };
    const expiresAt = Date.now() + json.expiresIn * 1000;
    cache.set(path, { url: json.signedUrl, expiresAt });
    return json.signedUrl;
  } catch {
    return null;
  }
}

/** Hapus semua entry yang sudah kedaluwarsa dari cache. */
export function pruneSignedUrlCache() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now >= v.expiresAt) cache.delete(k);
  }
}

// Auto-prune setiap 10 menit
setInterval(pruneSignedUrlCache, 10 * 60_000);
