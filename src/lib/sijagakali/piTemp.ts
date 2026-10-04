const MAX_AGE_MS = 10 * 60_000;

/**
 * Suhu CPU Raspberry Pi lokasi bila laporan terakhirnya <= 10 menit, selain itu null (tampil "—").
 * Kesegaran dihitung saat data dimuat; halaman yang dibiarkan terbuka tidak memperbaruinya sampai reload.
 */
export function freshPiTemp(
  temp: number | string | null | undefined,
  at: string | null | undefined,
  now: number = Date.now(),
): number | null {
  const t = typeof temp === 'string' ? Number(temp) : temp;
  const atMs = at ? Date.parse(at) : NaN;
  if (typeof t !== 'number' || !Number.isFinite(t) || !Number.isFinite(atMs)) return null;
  return now - atMs <= MAX_AGE_MS ? t : null;
}
