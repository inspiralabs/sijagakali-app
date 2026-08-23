export interface WilayahDusun {
  id: string;
  deployment_slug: string;
  nama: string;
}

export interface WilayahRw {
  id: string;
  dusun_id: string;
  nama: string;
}

export interface WilayahRt {
  id: string;
  rw_id: string;
  nama: string;
}

export interface BanjirEvent {
  id: string;
  deployment_slug: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  keterangan: string | null;
}

export type StatusSaatIni = 'di_rumah' | 'mengungsi' | 'lainnya';

export const STATUS_SAAT_INI_LABEL: Record<StatusSaatIni, string> = {
  di_rumah: 'Di rumah',
  mengungsi: 'Mengungsi',
  lainnya: 'Lainnya',
};

export interface WargaTerdampak {
  id: string;
  banjir_event_id: string;
  deployment_slug: string;
  nik: string | null;
  nama_lengkap: string;
  tanggal_lahir: string;
  jenis_kelamin: 'laki-laki' | 'perempuan';
  no_kk: string | null;
  kontak_hp: string | null;
  status_saat_ini: StatusSaatIni;
  dusun_id: string;
  rw_id: string;
  rt_id: string;
  detail_alamat: string | null;
  catatan: string | null;
}

/** Umur (tahun) dari tanggal_lahir, dihitung terhadap tanggal hari ini. */
export function hitungUmur(tanggalLahir: string): number {
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let umur = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    now.getMonth() < lahir.getMonth() ||
    (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}
