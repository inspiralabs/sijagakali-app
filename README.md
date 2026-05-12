# SiJagaAir — Aplikasi web (dashboard)

Aplikasi **React + Vite + TypeScript** untuk pemantauan ketinggian air (EWS), manajemen perangkat, dan konfigurasi notifikasi. Berpasangan dengan backend monorepo `sijagaair-api` dan database Supabase (`schema sijagaair`).

Dokumen fitur & contoh kasus (stakeholder + arsitektur): [`../plans/SiJagaAir-Fitur-dan-Contoh-Kasus.md`](../plans/SiJagaAir-Fitur-dan-Contoh-Kasus.md).

---

## Ringkasan fitur (sesuai capaian saat ini)

### Dashboard publik (`/public`)

- **Tanpa login**: kartu titik pantau (level air, ambang, baterai, sinyal, suhu kotak), **tanpa** CCTV ganda di kartu (CCTV terpusat di satu section).
- **Ringkasan** angka agregat (kartu ringkasan).
- **Pantau CCTV**: grid snapshot + live per titik; refresh snapshot; **perbesar** (dialog layar besar) dan **layar penuh** (browser fullscreen) untuk snapshot maupun live bila tersedia.
- **Tren & peringatan**: grafik historis level air dan log peringatan terbaru (**proporsi ~70% / 30%** pada layar lebar).
- **Sirine / audio peringatan** (jika diaktifkan data), kontrol mute, tema terang/gelap, tautan ke login admin.

### Dashboard admin (`/dashboard` — setelah login)

- **Ringkasan titik pantau**: kartu per perangkat (gelombang level air, ambang, telemetry); CCTV tidak diduplikasi di kartu (hanya di section Pantau CCTV).
- **Pantau CCTV**: sama seperti publik + tautan pengaturan per perangkat (ikon gear).
- **Tren & peringatan**: grafik + log (layout 70/30), tanpa panel “kesehatan perangkat” terpisah (informasi serupa sudah di kartu titik pantau).
- Data **realtime** dari Supabase (bila dikonfigurasi); fallback **mock** jika env belum diisi.

### Perangkat (`/devices`)

- Daftar titik pantau dengan status, level, pembaruan terakhir.
- Tautan ke **Pengaturan** dan **Notifikasi** per perangkat.
- Mode **Supabase**: pengeditan CRUD penuh lewat UI dibatasi (arahkan ke SQL/API); mode **mock** mendukung tambah/ubah/hapus lokal untuk demo.

### Pengaturan per perangkat (`/devices/:id/settings`)

- Informasi perangkat (ID, MAC, koordinat, level saat ini).
- **Lokasi & ambang** waspada / siaga / bahaya (cm) — simpan ke API (`POST /api/device/:id/settings`).
- **CCTV**: IP kamera di LAN (referensi dokumentasi node), **URL streaming live** untuk dashboard — simpan lewat konteks + RPC Supabase.
- **Interval laporan** node — `POST /api/device/:id/interval`.
- Kartu pintasan ke halaman **Notifikasi WhatsApp** untuk titik tersebut.

### Notifikasi per perangkat (`/devices/:id/notifications`)

- **Kebijakan**: cooldown per status, lonjakan (surge), jam digest.
- **Template WhatsApp** per status (normal, waspada, siaga, bahaya), kontak petugas / BPBD / posko.
- **Uji** pratinjau pesan dan kirim uji ke channel (via API).
- **Log** notifikasi terkirim/gagal (baca dari Supabase, scoped per deployment/perangkat sesuai implementasi).

### Peringatan (`/alerts`)

- Riwayat peringatan dengan filter perangkat & status, paginasi.

### Logs (`/logs`)

- Gabungan **pembacaan sensor** dan **peringatan** dengan filter tanggal, perangkat, status, pencarian teks, paginasi.

### Manajemen admin (`/admin/users`)

- Daftar admin aplikasi, tambah/ubah/hapus (via API), manajemen sandi untuk akun non-default.

### Autentikasi

- Login, lupa sandi, reset sandi (Supabase Auth).
- Proteksi rute admin (`ProtectedRoute`).

### Lain-lain

- **Tema** terang/gelap.
- Komponen UI **shadcn/ui** + Tailwind.
- Sirine/context audio untuk perubahan status berbahaya (admin + pola berbeda di publik sesuai implementasi).

---

## Variabel lingkungan (inti)

| Variabel | Fungsi |
|----------|--------|
| `VITE_SUPABASE_URL` | URL proyek Supabase |
| `VITE_SUPABASE_ANON_KEY` | Kunci anon (client) |
| `VITE_SIJAGAAIR_DEPLOYMENT_SLUG` | Slug wilayah pemasangan default |
| `VITE_SIJAGAAIRAPI_URL` | Base URL API Fastify (interval, device settings, admin, notifikasi uji) |

Tanpa Supabase yang valid, aplikasi dapat berjalan dengan **data mock** untuk UI.

---

## Rute singkat

| Path | Keterangan |
|------|------------|
| `/` | Alihkan ke `/public` |
| `/public` | Dashboard publik |
| `/login`, `/forgot-password`, `/reset-password` | Auth |
| `/dashboard` | Dashboard admin |
| `/devices` | Daftar perangkat |
| `/devices/:id/settings` | Pengaturan perangkat |
| `/devices/:id/notifications` | WA & kebijakan notifikasi |
| `/alerts`, `/logs` | Riwayat |
| `/admin/users` | Admin user |

---

## Menjalankan lokal

```bash
npm install
npm run dev
```

Build produksi: `npm run build`.

### Jalankan build hasil produksi dengan PM2

```bash
cd sijagaair-app
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Repositori terkait

- **API & worker**: `../sijagaair-api` (MQTT collector, data processing, notification gateway, REST API). **Build & deploy server:** lihat `../sijagaair-api/README.md` (perintah `npm run build:start`).
- **Skema & seed**: `../sijagaair-api/supabase/`.
