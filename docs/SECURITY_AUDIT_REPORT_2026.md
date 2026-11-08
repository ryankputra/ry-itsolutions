# 🛡️ LAPORAN AUDIT KEAMANAN & HARDENING SISTEM (RY-ITSOLUTIONS)
**Tanggal:** 09 November 2026  
**Auditor:** Ryan Cyber Security Analyst  
**Penerima:** Project Manager & Putra Backend  
**Status:** Audit Selesai (Temuan Kerentanan Lengkap & Rekomendasi Hardening Kode)

---

## 📋 Ringkasan Eksekutif (Executive Summary)

Audit keamanan menyeluruh telah dilakukan terhadap codebase **Backend (`tembak-paket-app/backend`)**, **Payment Gateway (`tembak-paket-app/gopay-gateway`)**, dan **Frontend (`tembak-paket-app/frontend-v2`)**. 

Secara keseluruhan, arsitektur dasar telah menerapkan konsep modularitas dan keamanan (seperti Express Rate Limiter, Helmet, Bcrypt hashing, dan verifikasi OTP email). Namun, audit menemukan sejumlah **celah keamanan kritis (Critical & High Severity)** yang berisiko tinggi terhadap pengambilalihan hak akses administrator (*Privilege Escalation*), pemalsuan identitas (*Authentication Bypass*), manipulasi saldo (*Double Spending / Race Condition*), serta injeksi skrip (*Stored XSS* via file upload).

Berikut adalah matriks temuan kerentanan berdasarkan keparahan (CVSS v3.1):

| ID | Kerentanan / Bug | Severity | File Terdampak | Status |
|---|---|---|---|---|
| **VULN-01** | Autentikasi Bypass & Eskalasi Hak Akses Admin via Header `x-user-id` | **CRITICAL** (9.8) | `backend/middleware/auth.js` | Siap Diperbaiki |
| **VULN-02** | Bypass Otorisasi Endpoint Internal via `trust proxy` & Spoofing IP | **HIGH** (8.6) | `backend/server.js` | Siap Diperbaiki |
| **VULN-03** | Hardcoded Secrets & Kunci Rahasia Default di Kode Sumber | **HIGH** (8.1) | `server.js`, `security.js`, `webhook.js` | Siap Diperbaiki |
| **VULN-04** | Arbitrary File Upload & Potensi Stored XSS pada Upload Avatar / Bukti | **HIGH** (7.8) | `backend/routes/auth.js`, `transactions.js` | Siap Diperbaiki |
| **VULN-05** | Bypass Proteksi Anti-Brute Force via Header Uji Coba Hardcoded | **HIGH** (7.5) | `backend/middleware/security.js` | Siap Diperbaiki |
| **VULN-06** | Race Condition (TOCTOU) pada Pemotongan Saldo Pembelian | **HIGH** (7.4) | `backend/routes/orders.js`, `transactions.js` | Siap Diperbaiki |
| **VULN-07** | Konfigurasi Session Cookie Tidak Aman (`secure: false`) & CSP Disabled | **MEDIUM** (6.1) | `backend/server.js` | Siap Diperbaiki |
| **VULN-08** | Inefektivitas Regex Input Sanitizer terhadap XSS Modern | **MEDIUM** (5.4) | `backend/middleware/security.js` | Siap Diperbaiki |
| **VULN-09** | Tidak Ada Pembatasan Percobaan Tebak OTP Reset Password (Brute-Force) | **MEDIUM** (5.3) | `backend/routes/auth.js` | Siap Diperbaiki |
| **BUG-01** | Runtime Crash `ReferenceError: validName is not defined` saat Verifikasi OTP | **LOW / BUG** | `backend/routes/auth.js` | Siap Diperbaiki |

---

## 🔍 Analisis Mendalam Temuan Kerentanan & Rekomendasi Perbaikan

---

### 🚨 VULN-01: Autentikasi Bypass & Eskalasi Hak Akses Admin via Header `x-user-id`
- **Tingkat Keparahan:** **CRITICAL (CVSS 9.8)**
- **Lokasi Kode:** `tembak-paket-app/backend/middleware/auth.js` (Baris 48–52, 59–64)
- **Deskripsi Masalah:**
  Middleware `isAuthenticated` dan `isAdmin` memeriksa identitas pengguna dari `req.session?.userId` ATAU `req.headers['x-user-id']`:
  ```javascript
  const isAuthenticated = (req, res, next) => {
      const uid = req.session?.userId || req.headers['x-user-id'];
      if (uid) {
          req.session = req.session || {};
          req.session.userId = uid;
          return next();
      }
      res.status(401).json({ status: false, message: 'Unauthorized: Anda harus login.' });
  };
  ```
- **Dampak Keamanan:**
  Siapapun dari internet dapat menyertakan header `x-user-id: <id_admin>` pada permintaan HTTP. Server langsung memvalidasi request tersebut sebagai akun Admin tanpa perlu kredensial password ataupun cookie sesi yang sah. Penyerang dapat mengubah saldo, mengubah peran pengguna lain, mengakses data sensitif, dan mengendalikan seluruh sistem.
- **Rekomendasi Perbaikan Defensif:**
  Hapus pengecekan `req.headers['x-user-id']` dari middleware autentikasi dan otorisasi produksi. Hanya izinkan sesi server (`req.session.userId`) atau JWT token terenkripsi yang telah divalidasi tandatangan kriptografinya.
  ```javascript
  const isAuthenticated = (req, res, next) => {
      if (req.session && req.session.userId) {
          return next();
      }
      return res.status(401).json({ status: false, message: 'Unauthorized: Anda harus login.' });
  };
  ```

---

### 🚨 VULN-02: Bypass Otorisasi Endpoint Internal via `trust proxy` & Spoofing IP
- **Tingkat Keparahan:** **HIGH (CVSS 8.6)**
- **Lokasi Kode:** `tembak-paket-app/backend/server.js` (Baris 58, 210–216, 246–250, 275–385)
- **Deskripsi Masalah:**
  Di baris 58, server mengaktifkan `app.set('trust proxy', 1);`. Selanjutnya, beberapa rute administrasi dan kontrol internal (seperti pairing bot WhatsApp, trigger story Instagram, hapus story, notifikasi tes) memvalidasi hak akses hanya dengan mengecek:
  ```javascript
  const ip = req.ip || req.socket?.remoteAddress || "";
  if (req.headers["x-internal-key"] === "tembak_internal_wa_2026" || ip.includes("127.0.0.1") || ip.includes("::1") || ip.includes("localhost")) {
      return next();
  }
  ```
- **Dampak Keamanan:**
  Dengan `trust proxy: 1`, nilai `req.ip` dapat dimanipulasi dengan menyertakan header `X-Forwarded-For: 127.0.0.1` dari luar jika reverse proxy (Nginx/Cloudflare) tidak membersihkan header tersebut secara ketat. Selain itu, secret header `tembak_internal_wa_2026` tertulis jelas (*hardcoded*) di dalam kode.
- **Rekomendasi Perbaikan Defensif:**
  1. Hapus pengujian otorisasi berbasis `req.ip` untuk aksi administratif berisiko tinggi.
  2. Proteksi seluruh rute manajemen internal dan admin menggunakan middleware `isAuthenticated` dan `isAdmin` secara wajib.
  3. Pindahkan token secret internal ke Environment Variable dan lakukan perbandingan menggunakan `crypto.timingSafeEqual`.

---

### 🚨 VULN-03: Hardcoded Secrets & Kunci Rahasia Default di Kode Sumber
- **Tingkat Keparahan:** **HIGH (CVSS 8.1)**
- **Lokasi Kode:**
  - `backend/server.js`: `SESSION_SECRET = 'ry-itsolutions-secret-key-2026'` / `'ryystore_secure_session_secret_2026'`
  - `backend/middleware/security.js`: `x-internal-test-key = 'ry-internal-test-pass'`
  - `backend/routes/webhook.js`: `AUTO_DEPLOY_SECRET = 'RyITSolutionsAutoDeploy2026'`
  - `backend/routes/gateway.js`: `GOPAY_GATEWAY_API_KEY = 'ryy-gopay-secret-key-2026'`, `SHOPPEPAY_GATEWAY_API_KEY = 'shopee-secret-key-2026'`
- **Deskripsi Masalah:**
  Nilai fallback secret digunakan jika variabel lingkungan (*environment variables*) tidak ditemukan.
- **Dampak Keamanan:**
  Jika environment variable tidak disetel atau file `.env` terlewat saat migrasi, aplikasi menggunakan secret publik yang diketahui dari repositori. Penyerang dapat memalsukan cookie sesi Express (`connect.sid`), memicu webhook deploy server, atau mengakses API gateway pembayaran.
- **Rekomendasi Perbaikan Defensif:**
  Buat pemeriksaan *fail-fast* saat inisialisasi aplikasi. Jika variabel penting (`SESSION_SECRET`, `AUTO_DEPLOY_SECRET`, `GOPAY_GATEWAY_API_KEY`) tidak tersedia di `process.env`, server harus memunculkan error fatal dan menolak berjalan dengan kunci default.

---

### 🚨 VULN-04: Arbitrary File Upload & Potensi Stored XSS pada Upload Avatar / Bukti
- **Tingkat Keparahan:** **HIGH (CVSS 7.8)**
- **Lokasi Kode:**
  - `backend/routes/auth.js` (`avatarStorage`, baris 28–41)
  - `backend/routes/transactions.js` (`manualOrderStorage`, baris 36–54)
- **Deskripsi Masalah:**
  Konfigurasi Multer mengekstrak ekstensi file langsung dari nama asli yang dikirimkan klien:
  ```javascript
  const ext = path.extname(file.originalname) || '.jpg';
  cb(null, `avatar_${uid}_${Date.now()}${ext}`);
  ```
  Tidak ada whitelist ekstensi file (`.jpg`, `.jpeg`, `.png`, `.webp`) dan tidak ada validasi MIME-type (`image/jpeg`, dll.). File yang diunggah disimpan di folder `public/uploads/` yang disajikan secara statis langsung ke publik oleh Express (`express.static`).
- **Dampak Keamanan:**
  Pengguna dapat mengunggah file HTML, SVG, atau XML berisi kode JavaScript berbahaya (misalnya `<svg onload="alert(document.cookie)">`). Saat link avatar atau bukti transaksi dibuka oleh Admin atau pengguna lain di browser, skrip berbahaya akan dieksekusi dalam konteks origin domain (*Stored Cross-Site Scripting*).
- **Rekomendasi Perbaikan Defensif:**
  1. Pasang `fileFilter` pada konfigurasi Multer untuk memvalidasi MIME-type dan ekstensi file hanya untuk format gambar yang aman (`jpg`, `jpeg`, `png`, `webp`).
  2. Tolak ekstensi seperti `.html`, `.htm`, `.svg`, `.php`, `.js`.
  3. Konfigurasikan header `Content-Disposition: attachment` atau `X-Content-Type-Options: nosniff` saat menyajikan file statis dari direktori upload.

---

### 🚨 VULN-05: Bypass Proteksi Anti-Brute Force via Header Uji Coba Hardcoded
- **Tingkat Keparahan:** **HIGH (CVSS 7.5)**
- **Lokasi Kode:** `tembak-paket-app/backend/middleware/security.js` (Baris 52, 69)
- **Deskripsi Masalah:**
  Middleware `globalRateLimiter` dan `sensitiveRateLimiter` memiliki aturan `skip`:
  ```javascript
  skip: (req) => {
      if (req.headers['x-internal-test-key'] === 'ry-internal-test-pass') return true;
      if (req.ip === '127.0.0.1' && req.headers['x-skip-rate-limit'] === 'true') return true;
      return false;
  }
  ```
  Header `x-internal-test-key` juga secara eksplisit dimasukkan ke dalam `allowedHeaders` pada konfigurasi CORS di `server.js`.
- **Dampak Keamanan:**
  Penyerang dari luar dapat menyertakan header `x-internal-test-key: ry-internal-test-pass` untuk mematikan fungsi rate limiting pada endpoint autentikasi (`/api/auth/login`, `/api/auth/register`, `/api/auth/verify-otp`), sehingga dapat melakukan serangan *credential stuffing* dan *brute-force* OTP tanpa batasan.
- **Rekomendasi Perbaikan Defensif:**
  Hapus pengecekan bypass `x-internal-test-key` dari kode produksi. Pengecualian rate limit hanya boleh aktif jika `process.env.NODE_ENV === 'test'`.

---

### 🚨 VULN-06: Race Condition (TOCTOU) pada Pemotongan Saldo Pembelian
- **Tingkat Keparahan:** **HIGH (CVSS 7.4)**
- **Lokasi Kode:** `tembak-paket-app/backend/routes/orders.js` (Baris 200–212) dan `backend/routes/transactions.js`
- **Deskripsi Masalah:**
  Pengecekan kecukupan saldo dan pemotongan saldo dilakukan secara terpisah tanpa penguncian transaksi basis data:
  ```javascript
  // 1. Cek saldo via SELECT
  if (user.balance < finalPrice) {
      return res.status(400).json({ ... });
  }
  // 2. Potong saldo via UPDATE
  await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [finalPrice, userId]);
  ```
- **Dampak Keamanan:**
  Jika penyerang mengirimkan puluhan request order secara simultan (*concurrency / parallel requests*), semua request akan membaca saldo yang sama sebelum salah satu UPDATE selesai dieksekusi. Hal ini menyebabkan saldo menjadi negatif atau pengguna mendapatkan layanan melebihi saldo yang mereka miliki (*Double Spending*).
- **Rekomendasi Perbaikan Defensif:**
  Gunakan pemotongan saldo atomik pada level SQL yang memeriksa kecukupan saldo dalam klausul `WHERE`:
  ```javascript
  const updateResult = await dbRun(
      "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      [finalPrice, userId, finalPrice]
  );
  if (!updateResult || updateResult.changes === 0) {
      return res.status(400).json({ status: false, message: "Saldo tidak mencukupi atau transaksi sedang diproses." });
  }
  ```

---

### ⚠️ VULN-07: Konfigurasi Session Cookie Tidak Aman (`secure: false`) & CSP Disabled
- **Tingkat Keparahan:** **MEDIUM (CVSS 6.1)**
- **Lokasi Kode:** `tembak-paket-app/backend/server.js` (Baris 74–79, 150–155)
- **Deskripsi Masalah:**
  1. Cookie sesi Express dikonfigurasi dengan `cookie: { secure: false }`.
  2. Middleware Helmet mematikan Content Security Policy: `helmet({ contentSecurityPolicy: false })`.
- **Dampak Keamanan:**
  Cookie sesi `connect.sid` dapat terkirim melalui koneksi HTTP polos yang tidak terenkripsi, memicu risiko *Session Hijacking* melalui serangan sniffing jaringan. Ketiadaan CSP meniadakan lapisan pertahanan sekunder terhadap eksploitasi XSS.
- **Rekomendasi Perbaikan Defensif:**
  1. Setel atribut `secure` menjadi dinamis sesuai environment: `secure: process.env.NODE_ENV === 'production'`.
  2. Aktifkan Content Security Policy (CSP) dasar yang mengizinkan pemuatan skrip dan gaya hanya dari origin tepercaya dan penyedia resmi (Google, Telegram WebApp).

---

### ⚠️ VULN-08: Inefektivitas Regex Input Sanitizer terhadap XSS Modern
- **Tingkat Keparahan:** **MEDIUM (CVSS 5.4)**
- **Lokasi Kode:** `tembak-paket-app/backend/middleware/security.js` (Baris 8–31)
- **Deskripsi Masalah:**
  Fungsi `sanitizeValue` menggunakan daftar hitam (*blacklist*) regex kustom:
  ```javascript
  let clean = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on[a-z]+\s*=/gi, '');
  ```
- **Dampak Keamanan:**
  Metode blacklist regex kustom terbukti mudah dilewati (*bypassable*), misalnya menggunakan payload tanpa event handler `on...` konvensional, payload bersarang, variasi encoding URL/HTML, tag `<object>`, `<svg/onload=...>`, atau `<img src=x onerror=...>`.
- **Rekomendasi Perbaikan Defensif:**
  Gunakan pustaka sanitasi standar industri seperti `dompurify` (dengan `jsdom`) atau `xss`. Pastikan sanitasi utama dilakukan pada fase rendering frontend menggunakan *context-aware output encoding* (React JSX secara default melakukan escaping teks, hindari penggunaan `dangerouslySetInnerHTML` tanpa sanitasi ketat).

---

### ⚠️ VULN-09: Tidak Ada Pembatasan Percobaan Tebak OTP Reset Password (Brute-Force)
- **Tingkat Keparahan:** **MEDIUM (CVSS 5.3)**
- **Lokasi Kode:** `tembak-paket-app/backend/routes/auth.js` (`/auth/forgot-password-verify`, baris 547–580)
- **Deskripsi Masalah:**
  Ketika verifikasi kode OTP reset password gagal (`record.otp !== otp.trim()`), sistem hanya mengembalikan respon error tanpa menghitung jumlah kegagalan (*failed attempts counter*). Selain itu, pada `server.js`, rute `/api/auth/forgot-password-verify` tidak terlindungi oleh `sensitiveRateLimiter` karena definisi path di middleware adalah `/api/auth/forgot-password` (hanya mencocokkan exact match atau subpath bertingkat).
- **Dampak Keamanan:**
  Kode OTP berupa 6 digit angka (000000–999999) yang aktif selama 5 menit berisiko ditebak melalui serangan otomatis jika rate limiter dilewati menggunakan header `x-internal-test-key`.
- **Rekomendasi Perbaikan Defensif:**
  1. Tambahkan kolom `attempts` pada tabel `email_verifications`. Hapus atau kunci verifikasi jika percobaan salah mencapai 3 atau 5 kali.
  2. Pastikan rute `/api/auth/forgot-password-verify` terdaftar secara eksplisit pada `sensitiveRateLimiter`.

---

### 🐛 BUG-01: Runtime Crash `ReferenceError: validName is not defined` saat Verifikasi OTP
- **Tingkat Keparahan:** **LOW / FUNCTIONAL BUG**
- **Lokasi Kode:** `tembak-paket-app/backend/routes/auth.js` (Baris 337–338)
- **Deskripsi Masalah:**
  Pada handler endpoint `router.post('/auth/register-verify-otp')`, variabel `validName` dipanggil pada pemanggilan `logUserActivity` dan `updatePresence`:
  ```javascript
  logUserActivity({ userId: newUserId, userName: validName, userEmail: validEmail, action: 'REGISTER', ... });
  updatePresence({ id: newUserId, name: validName, email: validEmail, role: 'user' }, req, '/');
  ```
  Padahal variabel yang terdefinisi dari parsing payload adalah `data.name`.
- **Dampak Keamanan:**
  Setiap pengguna baru yang mendaftar dan berhasil memasukkan OTP yang benar akan mengalami crash server HTTP 500 (*Unhandled ReferenceError*), sehingga proses pendaftaran terputus.
- **Rekomendasi Perbaikan Defensif:**
  Ganti `validName` menjadi `data.name` pada baris 337 dan 338.

---

## 🛠️ Rencana Aksi Perbaikan (Action Plan untuk Putra Backend)

1. **Prioritas 1 (Kritis & Mendesak):**
   - Hapus fallback `req.headers['x-user-id']` di `backend/middleware/auth.js`.
   - Hapus bypass rate limiter `x-internal-test-key` di `backend/middleware/security.js`.
   - Perbaiki bug crash `validName` menjadi `data.name` di `backend/routes/auth.js`.
   - Terapkan pemotongan saldo atomik (`AND balance >= ?` + cek `changes > 0`) di `backend/routes/orders.js` dan `backend/routes/transactions.js`.

2. **Prioritas 2 (Tinggi):**
   - Tambahkan whitelist MIME-type & ekstensi gambar pada Multer upload (`avatarStorage` dan `manualOrderStorage`).
   - Hapus fallback secret hardcoded (`SESSION_SECRET`, `AUTO_DEPLOY_SECRET`, `GOPAY_GATEWAY_API_KEY`) dan ganti dengan pengecekan ketat pada startup.
   - Perbaiki otorisasi rute internal di `server.js` (jangan andalkan spoofable `req.ip`).

3. **Prioritas 3 (Sedang):**
   - Tambahkan counter kegagalan OTP (maksimal 5x percobaan) di `email_verifications`.
   - Aktifkan flag cookie `secure: process.env.NODE_ENV === 'production'`.
   - Perketat Content Security Policy (CSP) pada Helmet.
