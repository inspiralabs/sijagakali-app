import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { STATUS_SAAT_INI_LABEL, hitungUmur, type StatusSaatIni } from './types';

export interface WargaExportRow {
  nama_lengkap: string;
  nik: string | null;
  tanggal_lahir: string;
  jenis_kelamin: 'laki-laki' | 'perempuan';
  no_kk: string | null;
  kontak_hp: string | null;
  status_saat_ini: StatusSaatIni;
  alamat: string;
  catatan: string | null;
}

const HEADERS = ['Nama Lengkap', 'NIK', 'Umur', 'Tanggal Lahir', 'Jenis Kelamin', 'No. KK', 'Kontak HP', 'Status', 'Alamat', 'Catatan'];

function toTableBody(rows: WargaExportRow[]): string[][] {
  return rows.map((r) => [
    r.nama_lengkap,
    r.nik ?? '-',
    `${hitungUmur(r.tanggal_lahir)} th`,
    format(parseISO(r.tanggal_lahir), 'd MMM yyyy', { locale: idLocale }),
    r.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
    r.no_kk ?? '-',
    r.kontak_hp ?? '-',
    STATUS_SAAT_INI_LABEL[r.status_saat_ini],
    r.alamat,
    r.catatan ?? '-',
  ]);
}

function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'data';
}

function fileBaseName(namaKejadian: string): string {
  return `warga-terdampak-${slugify(namaKejadian)}-${format(new Date(), 'yyyy-MM-dd')}`;
}

export function exportWargaToExcel(rows: WargaExportRow[], namaKejadian: string): void {
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...toTableBody(rows)]);
  sheet['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Warga Terdampak');
  XLSX.writeFile(workbook, `${fileBaseName(namaKejadian)}.xlsx`);
}

export function exportWargaToPdf(rows: WargaExportRow[], namaKejadian: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(13);
  doc.text(`Data Warga Terdampak — ${namaKejadian}`, 14, 13);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Diekspor ${format(new Date(), "d MMMM yyyy 'pukul' HH.mm", { locale: idLocale })} · ${rows.length} data`, 14, 19);
  autoTable(doc, {
    head: [HEADERS],
    body: toTableBody(rows),
    startY: 24,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(`${fileBaseName(namaKejadian)}.pdf`);
}
