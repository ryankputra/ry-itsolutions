# 📱 MOBILE_SYNC_RULES.md — System Prompt & Workspace Guidelines

Dokumen ini adalah pedoman mutlak (System Prompt / Workspace Rules) untuk pengembangan aplikasi Mobile (`tembak-paket-app/mobile`) yang berjalan berdampingan dengan platform Web (`tembak-paket-app/frontend-v2`). Setiap sesi kerja wajib mematuhi aturan ini tanpa pengecualian.

---

## 1. 100% Parity (Kesamaan Mutlak)
- **Zero Omission:** Seluruh fitur yang ada pada versi Web harus tersedia pada versi Mobile. Tidak ada fitur yang boleh dipotong, diabaikan, atau disederhanakan secara sepihak.
- **Identical User Flows:** Alur pengguna dari awal hingga akhir (autentikasi, browsing katalog produk, checkout QRIS/ShopeePay/GoPay, polling pembayaran, cek CEIR & IMEI, riwayat transaksi, tiket bantuan, RyTone Music streaming, pengaturan profil, hingga panel admin) harus identik dengan alur kerja di Web.
- **Form Validation & Business Logic:** Validasi input (nomor telepon, IMEI, format nominal, voucher, kuota, dsb.) dan penanganan status respons API (200, 206, 400, 401, 403, 404, 429, 500) harus sama persis dengan aturan bisnis yang ada di Web.
- **State Management Parity:** State sesi login, token otentikasi (JWT/SecureStore), cache keranjang belanja, tema aktif, dan state pemutar musik harus memiliki perilaku reaktif yang sama dengan Context di Web (`authContext`, `cartContext`, `themeContext`, `musicContext`).

---

## 2. Konsistensi UI/UX & Design System
- **Adaptasi Native:** Tampilan mobile mengadopsi estetika Web (Palet warna, Glassmorphism, Dark/Light Mode, Border Hairline, Aksen Hijau Spotify `#1ed760`, Tipografi Inter/Geist) ke dalam komponen native React Native (`View`, `Text`, `Pressable`, `FlashList`, `Image`, `LinearGradient`, `BlurView`).
- **Smooth Animations & Micro-interactions:** Gunakan `react-native-reanimated` dan haptic feedback (`expo-haptics`) untuk interaksi sentuh tombol, swipe refresh, modal transition, dan bottom sheets.
- **Responsive Layout:** Tampilan wajib adaptif untuk seluruh ukuran layar perangkat smartphone (Android & iOS), safe area inset (`react-native-safe-area-context`), dan notch/island.

---

## 3. Shared Backend & Database (Single Source of Truth)
- **Satu Backend Bersama:** Aplikasi Mobile dan Web wajib terhubung ke endpoint API dan backend yang sama persis:
  - Production STB API: `http://192.168.0.203:3001/api/...`
  - Local Dev API: `http://localhost:3001/api/...` (atau IP LAN laptop untuk Expo Go)
- **Dilarang Menduplikasi Database:** Jangan pernah membuat skema database baru, tabel SQLite/Postgres terpisah, atau duplikasi logika transaksi yang berpotensi merusak integritas data Web.
- **Satu Alur Transaksi:** Pembuatan QRIS, webhook payment gateway (GoPay/ShopeePay), dan mutasi saldo voucher/poin menggunakan endpoint backend resmi yang sama.

---

## 4. Autonomous Execution Loop (Siklus Kerja Otonom)
Agent bekerja secara otonom dan berulang (looping) mengikuti 4 langkah sistematis:
```
┌────────────────────────────────────────────────────────┐
│  Langkah 1: SCAN & ANALYZE                            │
│  Pindai komponen, alur API, dan state pada modul Web  │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Langkah 2: CHECK MOBILE PARITY                        │
│  Periksa kesesuaian dan kelengkapan di src/ mobile    │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Langkah 3: WRITE & INTEGRATE CODE                    │
│  Tulis layar/komponen UI mobile + integrasi backend    │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Langkah 4: VERIFY, TYPE-CHECK & AUTO-ADVANCE         │
│  Jalankan npx tsc --noEmit, perbaiki bug, lanjut next  │
└────────────────────────────────────────────────────────┘
```

---

## 5. Session Control Triggers (Kendali Percakapan)
- **Ketik `go`:**
  Agent langsung melanjutkan siklus kerja otonom (Langkah 1 s/d 4) untuk modul berikutnya tanpa memerlukan instruksi mikro tambahan.
- **Ketik `stop`:**
  Agent segera menghentikan siklus penulisan kode baru dan merangkum kemajuan terakhir, **tanpa mematikan proses server Expo Go yang sedang berjalan di background**, sehingga aplikasi tetap bisa diuji langsung oleh user di perangkat HP.

---

## 6. Matrix Pemetaan Modul Web vs Mobile
| No | Modul Web (`frontend-v2/src/app`) | Status Mobile (`mobile/src/app`) | Tingkat Kesesuaian |
|---|---|---|---|
| 1 | Auth (Login, Register, Session) | `(auth)/login`, `(auth)/register` | 🟡 Verifikasi Parity |
| 2 | Beranda & Banner Promo (`/`) | `(tabs)/index` | 🟡 Penyelarasan UI/API |
| 3 | Katalog Beli Paket (`/beli-paket`) | `(screens)/packages` | 🟡 Integrasi Filter |
| 4 | Cek CEIR & IMEI (`/cek-ceir`) | `(screens)/cek-ceir` | 🟡 Parser & Status |
| 5 | Keranjang & QRIS Checkout (`/cart`) | `(screens)/cart` | 🟡 Polling Payment |
| 6 | Riwayat Transaksi (`/history`) | `(screens)/history` | 🟡 Status & Filter |
| 7 | RyTone Music Streaming (`/hiburan`) | `(screens)/rytone` | 🟡 Background Audio |
| 8 | Profil, Topup & Vouchers (`/saya`) | `(tabs)/profile` | 🟡 Sinkronisasi Saldo |
| 9 | Tiket Bantuan CS (`/tickets`) | `(screens)/tickets` | 🟡 Chat & Upload |
| 10 | Panel Admin Toko (`/admin/...`) | `(admin)/...` | 🟡 RBAC & Monitoring |
