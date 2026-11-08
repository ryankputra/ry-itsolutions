# Evaluasi Web Produksi — 2026-11-09

- **Tanggal:** 2026-11-09
- **Pemilik:** tech-lead
- **Status:** Implementasi
- **Prioritas:** Tinggi
- **Target:** `https://ry-itsolutionts.web.id` (produksi STB)
- **Versi terpasang:** commit `27d3039e8`, BUILD_ID `z9TRxC6vAYqGG-9pBKf4I`
- **Sedang dikerjakan:** Sprint 2 (AdSense, form semantik, landmark `<main>`, branded 404, security headers)

## Konteks

Evaluasi read-only terhadap web produksi untuk mencari bug, masalah keamanan, aksesibilitas, dan UX sebelum perbaikan berikutnya. Pengujian dilakukan tanpa login, tanpa membuat order, tanpa memicu OTP/WhatsApp, dan tanpa mengubah data produksi.

**Catatan akses:** `http://192.168.0.203:3005` **tidak bisa dibuka dari laptop** (timeout; browser menampilkan 502). Di STB, port `3005` hanya listen di `127.0.0.1:3005`, jadi akses publik memang lewat domain/Cloudflare. Evaluasi dilakukan via domain.

## Tujuan

1. Daftar temuan dengan severity + langkah reproduksi.
2. Bukti terukur (status HTTP, header, Lighthouse, console, network).
3. Rekomendasi perbaikan dengan pemilik tugas.

## Batasan

- Hanya halaman publik/guest: `/`, `/login`, `/register`, `/cek-garansi`, `/gateway`, `/hiburan`, `/cek-ceir`, `/add-roamer`, `/beli-paket`, `/cart`, `/dashboard`, `/vouchers`, `/topup`, halaman 404.
- Alur berbayar (order, QRIS, topup, OTP, riwayat, dashboard login, bot WA) **tidak diuji** karena butuh akun/transaksi nyata.
- Viewport browser in-app 800×568; emulasi mobile <768px tidak tersedia di sesi ini.
- Lighthouse di sesi ini mengukur Accessibility, Best Practices, SEO (bukan benchmark performa).

## Hasil ringkas

| Area | Hasil |
|---|---|
| Network halaman publik | Tidak ada request gagal (83 request di home, 0 failure) |
| Console | 0 error; 2 warning (AdSense, THREE.Clock) |
| Waktu muat (home, cache SW aktif) | `responseStart` 262 ms, DCL 422 ms |
| FAQ accordion | Berfungsi |
| Toggle tema | Berfungsi (dark ⇄ light, tersimpan di localStorage) |
| Cek Garansi (IMEI 15 digit) | Berfungsi, menampilkan "Data Tidak Ditemukan" dengan benar |
| Validasi IMEI kosong | Diblokir validasi native HTML (`required` + pattern), tanpa pesan inline |
| Redirect guest → login | Berfungsi, ±1,5 detik dengan layar "Memuat Sistem & Layanan..." |
| Service Worker + manifest | Aktif (`sw: true`, `/manifest.json` 200) |
| Sertifikat TLS | Valid, CN `ry-itsolutionts.web.id`, berlaku s/d 6 Jan 2027 |
| Aset statis | `/sw.js`, `/manifest.json`, `/robots.txt`, `/ads.txt`, `/download/apk` → 200; `/sitemap.xml` → 404 |

## Temuan

### KRITIS
Tidak ditemukan dalam cakupan guest.

### TINGGI

**T1. HTTP (port 80) tidak dialihkan ke HTTPS, dan tidak ada HSTS**
- Bukti: `GET http://ry-itsolutionts.web.id/` → `200` (bukan 301/308). Header respons HTTPS tidak memuat `strict-transport-security`.
- Dampak: konten bisa diakses lewat plaintext; cookie sesi berisiko di jaringan tidak tepercaya; rentan downgrade/MITM.
- Reproduksi: `curl -I http://ry-itsolutionts.web.id/`.
- Perbaikan: aktifkan **Always Use HTTPS** + **HSTS** di Cloudflare (atau redirect 301 di Nginx).

### SEDANG

**S1. Header keamanan belum lengkap**
- Bukti header respons: ada `Server: cloudflare`, `X-Powered-By: Next.js`; **tidak ada** `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Dampak: clickjacking, MIME sniffing, kebocoran referrer; `X-Powered-By` membocorkan stack.
- Reproduksi: `curl -I https://ry-itsolutionts.web.id/`.
- Perbaikan: set header di `next.config.ts` (`headers()`) atau Cloudflare Transform Rules; hapus `X-Powered-By`.

**S2. Script AdSense dimuat dengan cara yang tidak didukung → iklan berisiko tidak tampil**
- Bukti console: `AdSense head tag doesn't support data-nscript attribute.` Sumber: `https://pagead2.googlesyndication.com/...adsbygoogle.js?client=ca-pub-2898811488813299`.
- Penyebab: `next/script` (`strategy="afterInteractive"`) di `<head>` menambahkan atribut `data-nscript`; loader AdSense menolak tag tersebut.
- Reproduksi: buka `/`, lihat Console.
- Perbaikan: render `<script async src="..." crossOrigin="anonymous" />` biasa di `<head>` (bukan `next/script`), lalu verifikasi slot iklan terisi.
- File terkait: `tembak-paket-app/frontend-v2/src/app/layout.tsx:63-68`.

**S3. Aksesibilitas: skor 84–89 (Lighthouse), penyebab berulang**
- Skor: home 94, `/login` 89, `/register` 84, `/cek-garansi` 84. Best Practices & SEO 100.
- Penyebab:
  - Tidak ada **landmark `<main>`** di semua halaman yang diuji.
  - **Kontras teks rendah**: teks 10px `text-slate-400` di atas putih 2.63:1; `#0071e3` di `#f8fafc` 4.48:1; watermark "SECURE SESSION" 3.35:1; label bottom-nav mobile 3.22–3.53:1 (target ≥4.5:1).
  - **Tombol tanpa nama aksesibel**: tombol show/hide password (`button.absolute right-3 ...`) tanpa `aria-label`, ukuran 16×16 px (target ≥24×24).
  - **Touch target kecil**: dot carousel sponsor 20×6 px dan 6×6 px di `/cek-garansi`.
- Reproduksi: Lighthouse (Accessibility) pada `/register` dan `/cek-garansi`; detail selector ada di laporan HTML Lighthouse.
- Perbaikan: tambah `<main>`, naikkan kontras token, beri `aria-label="Tampilkan/Sembunyikan password"` + area klik ≥24px, perbesar dot carousel.

**S4. Semantik form login/register kurang benar**
- Bukti: input email login memakai `autocomplete="username email"` (format tidak valid — Lighthouse `autocomplete-valid`). Input register tidak punya `autocomplete` (`name`, `email`, `new-password`) dan tidak punya `<label>`/`aria-label`; mayoritas input juga tanpa atribut `name`.
- Dampak: password manager/screen reader tidak maksimal; autofill tidak konsisten.
- Perbaikan: `autocomplete="email"` untuk login (atau `username`), `name`/`email`/`new-password` untuk register, tambahkan label/aria.

**S5. Keterbatasan akses halaman publik vs promosi di beranda**
- `/cek-ceir` dipromosikan besar di beranda ("Cek CEIR Sekarang"), tetapi halaman langsung redirect ke `/login` (±1,5 detik) karena tidak masuk `isPublicRoute` di `(main)/layout.tsx`.
- Perilaku ini konsisten (bukan blank), tetapi bisa mengejutkan calon pengguna. Perlu keputusan produk: jadikan publik (mode cek saja) atau beri label "Login diperlukan" di CTA beranda.
- File: `tembak-paket-app/frontend-v2/src/app/(main)/layout.tsx` (`isPublicRoute`).

### RENDAH

**R1. Halaman 404 memakai halaman default Next.js (Bahasa Inggris, tanpa branding/navigasi)**
- Bukti: `/halaman-tidak-ada-xyz` → teks "404 This page could not be found.", `<title>404: This page could not be found.</title>`.
- Perbaikan: buat `not-found.tsx` berbahasa Indonesia + link kembali.

**R2. Warning library 3D usang**
- Console: `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` (chunk `bd904a5c-...js`).
- Perbaikan: jadwalkan upgrade/penyesuaian saat menyentuh halaman 3D.

**R3. `sitemap.xml` 404**
- `/robots.txt` 200 (Cloudflare-managed), `/sitemap.xml` 404.
- Perbaikan: tambahkan `app/sitemap.ts` bila ingin indexing lebih baik (SEO saat ini 100, jadi ini opsional).

**R4. UX AntiScreenshotGuard**
- Overlay "Layar Dilindungi" aktif saat window kehilangan fokus/Alt-Tab dan memblur seluruh halaman; sesuai desain, tetapi cukup agresif untuk halaman publik.
- Watermark menampilkan `GUEST_USER • ID:GUEST` untuk pengunjung anonim.
- Saran: aktifkan overlay hanya di halaman sensitif (riwayat/transaksi), atau beri jeda lebih panjang sebelum blur.

## Bukti

Screenshot (viewport in-app 800×568):
- `docs/diskusi/assets/2026-11-09/home.jpeg`
- `docs/diskusi/assets/2026-11-09/login.jpeg`
- `docs/diskusi/assets/2026-11-09/register.jpeg`
- `docs/diskusi/assets/2026-11-09/cek-garansi.jpeg`
- `docs/diskusi/assets/2026-11-09/404.jpeg`

Command bukti:
```powershell
curl.exe -I http://ry-itsolutionts.web.id/
curl.exe -I https://ry-itsolutionts.web.id/
curl.exe -o NUL -w "%{http_code}" https://ry-itsolutionts.web.id/sitemap.xml
```

## Pertanyaan

1. Apakah `/cek-ceir` memang harus login (berbayar) atau boleh dibuka publik dalam mode "cek saja"?
2. Prioritas perbaikan: setujui urutan **T1 → S2 → S1 → S3/S4 → R1–R4**?
3. Apakah header keamanan dipasang di Next.js (`headers()`) atau di Cloudflare (lebih mudah, tanpa rebuild)?

## Pendapat UI/UX

- Kontras 10px (`slate-400`, watermark, label bottom-nav) adalah temuan paling terasa di HP; naikkan ke minimal `slate-600`/`#5b6472` dan ukuran minimal 11–12px.
- Tombol mata password perlu area klik 24×24 + `aria-label`; ini juga membantu pengguna umum, bukan hanya screen reader.
- CTA "Cek CEIR" sebaiknya diberi badge "Login" bila tetap protected, agar tidak terasa seperti halaman rusak.
- Halaman 404 perlu identitas brand + tombol "Kembali ke Beranda".

## Pendapat Frontend

- `<main>` landmark cukup ditambahkan di `(main)/layout.tsx` dan layout halaman publik; dampak kecil, tidak mengubah tampilan.
- Perbaikan `autocomplete` + `name` di form login/register aman dan tidak mengubah kontrak API.
- AdSense: ganti `next/script` di `layout.tsx` dengan tag `<script async>` biasa; jangan lupa `crossOrigin="anonymous"`.
- Header keamanan via Cloudflare tidak perlu rebuild; via `next.config.ts` perlu build + deploy sesuai `DEPLOY_STB.md`.

## Pendapat Backend

- T1/S1 tidak menyentuh API; cukup konfigurasi edge/Nginx. Pastikan redirect HTTP→HTTPS tidak memutus webhook GitHub (webhook memakai HTTPS).
- Tidak ada perubahan database yang diperlukan untuk temuan ini.

## Pendapat QA

Regression checklist setelah perbaikan:
1. `curl -I http://...` → 301/308 ke HTTPS; `curl -I https://...` memuat HSTS + CSP + `X-Content-Type-Options`.
2. Console home bersih dari warning AdSense; slot iklan terisi.
3. Lighthouse Accessibility `/register` dan `/cek-garansi` ≥ 95.
4. Login/register: autofill email/password bekerja; tombol mata bisa diklik di layar 360px.
5. `/cek-ceir` sesuai keputusan produk; 404 menampilkan halaman brand.
6. Semua halaman publik tetap 200 dan tidak ada request gagal.

## Ronde 2

_(belum ada perbedaan pendapat)_

## Keputusan

Belum diputuskan — menunggu jawaban pada bagian **Pertanyaan**. Usulan tech-lead:
- **Sprint 1 (cepat, tanpa rebuild):** T1 + S1 via Cloudflare.
- **Sprint 2 (butuh build & deploy):** S2, S3, S4, R1.
- **Sprint 3 (opsional):** R2, R3, R4, keputusan S5.

## Status deploy

Belum ada perubahan kode. Dokumen ini **docs-only** dan tidak memerlukan deployment (sesuai `AGENTS.md` §6). Deploy berikutnya tetap wajib melewati gate `DEPLOY_STB.md` (backup data tracked → `git reset --hard` → restore → `pm2 restart` → verifikasi).
