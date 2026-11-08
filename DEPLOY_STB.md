# 🚀 Panduan Build, Push & Sinkronisasi ke STB (Deployment SOP)

Dokumen ini berisi panduan standar operasional (SOP) untuk melakukan build di laptop, push perubahan ke repositori Git, dan menyinkronkannya ke server STB (Set-Top Box).

---

## 📌 Ringkasan Konfigurasi & Lingkungan

| Parameter | Keterangan |
|---|---|
| **Host / IP STB** | `root@192.168.0.203` |
| **Direktori Proyek di STB** | `/www/wwwroot/ry-itsolutions` |
| **Repositori Git** | `origin/main` |
| **Process Manager (STB)** | `pm2` via `ecosystem.config.js` |
| **Port Service PM2** | • `rystore-backend`: 3001<br>• `rystore-gateway`: 3002<br>• `rystore-frontend`: 3005<br>• `shoppepay-gateway`: 3003 |

> [!NOTE]
> **PENTING: Jangan lakukan build Next.js di dalam STB!**
> Resource RAM/CPU STB terbatas. Build frontend **wajib selalu dijalankan di laptop/mesin lokal**, kemudian folder build (`.next`) di-commit dan di-push ke Git agar STB hanya perlu melakukan *pull* dan *restart PM2*.

> [!CAUTION]
> **DATABASE PRODUKSI TIDAK BOLEH DIGANTI.**
> `tembak-paket-app/backend/database.sqlite`, `.env`, `sessions/` (WhatsApp/IG/GoPay), dan file di `backend/backups/` adalah data produksi. Semua file ini **wajib** berada di `.gitignore` dan tidak boleh di-commit. Saat sinkronisasi (`git reset --hard`), pastikan file tersebut tetap **untracked/ignored** sehingga tidak tersentuh.
>
> File data yang **masih terlacak Git** (`backend/public/tracks.json`, `frontend-v2/public/audio/tiktok/tracks.json`, `backend/data/*.json`) akan ditimpa oleh `git reset --hard`. **Wajib backup + restore** seperti pada Langkah 4 di bawah. Jangan pernah menyalin database dari laptop/repo ke STB.

---

## 🛠️ Langkah-Langkah Deployment

### Langkah 1: Build & Push dari Laptop (Lokal)

#### Opsi A: Sekali Jalan (Rekomendasi)
Jalankan skrip deploy bawaan dari folder `frontend-v2`:
```bash
cd tembak-paket-app/frontend-v2
npm run deploy
```
*Perintah di atas secara otomatis akan:*
1. Memperbarui stempel waktu di `public/version.json`.
2. Menjalankan build Next.js hemat memori (`NODE_OPTIONS='--max-old-space-size=1024' next build --webpack`).
3. Menambahkan folder `.next`, membuat commit `"Deploy build"`, lalu melakukan `git push origin main`.

#### Opsi B: Manual (Jika ingin menulis pesan commit custom)
```bash
# 1. Masuk ke folder frontend dan jalankan build
cd tembak-paket-app/frontend-v2
npm run build

# 2. Kembali ke root dan commit semua perubahan
cd ../..
git add .
git commit -m "feat: deskripsi perubahan fitur"

# 3. Push ke repositori GitHub
git push origin main
```

---

### Langkah 2: Sinkronkan ke STB

#### Cara 1: Sinkronisasi Langsung via SSH 1 Baris (Dari Terminal Laptop)
Jalankan perintah ini langsung dari terminal laptop Anda:
```bash
ssh root@192.168.0.203 "cd /www/wwwroot/ry-itsolutions && git fetch --all && git reset --hard origin/main && pm2 restart all"
```
*(Atau menggunakan skrip deploy root: `ssh root@192.168.0.203 "cd /www/wwwroot/ry-itsolutions && npm run deploy"`)*

---

#### Cara 2: Manual Masuk ke Terminal STB
Jika Anda sedang membuka sesi SSH/terminal di STB:
```bash
# 1. Masuk ke direktori proyek di STB
cd /www/wwwroot/ry-itsolutions

# 2. BACKUP data produksi yang terlacak Git (WAJIB sebelum reset)
TS=$(date +%Y%m%d-%H%M%S); BK=/root/deploy-backup-$TS; mkdir -p "$BK/files"
for p in tembak-paket-app/backend/public/tracks.json \
         tembak-paket-app/frontend-v2/public/audio/tiktok/tracks.json \
         tembak-paket-app/backend/data/rivera_daily_status.json \
         tembak-paket-app/backend/data/tiktok_dj_tracks.json; do
  mkdir -p "$BK/files/${p%/*}"; cp -p "$p" "$BK/files/$p"
done
git status --porcelain > "$BK/status.txt"; git diff origin/main > "$BK/full-diff.patch" 2>/dev/null || true

# 3. Ambil perubahan terbaru dan timpa file lokal STB dengan origin/main
git fetch --all
git reset --hard origin/main

# 4. Kembalikan data produksi yang tadi di-backup
cp -a "$BK/files/." ./

# 5. Restart seluruh proses PM2
pm2 restart all
```

> [!WARNING]
> Jangan pernah menjalankan `git clean -xd` di STB: perintah itu menghapus file **ignored**, termasuk `database.sqlite`, `.env`, dan sesi WhatsApp/GoPay.
> Jika `git reset --hard` gagal karena "Untracked working tree file ... would be overwritten", pindahkan file yang disebut ke folder backup (jangan dihapus permanen), lalu ulangi reset.

---

## 🔍 Verifikasi & Monitoring di STB

Setelah proses sinkronisasi selesai, lakukan verifikasi:

### 1. Cek Status Seluruh Service
```bash
pm2 status
```
*Pastikan keempat service (`rystore-backend`, `rystore-gateway`, `rystore-frontend`, `shoppepay-gateway`) berstatus **online** dan tidak berulang kali restart (restart counter rendah).*

### 2. Cek Log Realtime (Opsional)
```bash
# Pantau log semua service
pm2 logs --lines 50

# Atau pantau service tertentu saja:
pm2 logs rystore-frontend
pm2 logs rystore-backend
```

### 3. Cek Healthcheck API & Frontend
* Buka browser dan akses frontend: `http://192.168.0.203:3005` (atau domain produksi Nginx).
* Periksa endpoint API backend: `http://192.168.0.203:3001/api/...`

---

## ⚠️ Troubleshooting & Penanganan Masalah Produksi

### 1. Masalah "502 Bad Gateway" di Web / Nginx / Cloudflare
Jika website menampilkan **502 Bad Gateway**, artinya Nginx / Reverse Proxy tidak dapat terhubung ke upstream port backend (`3001`, `3002`) atau frontend (`3005`).

#### A. Langkah Diagnosa Cepat:
1. **Periksa status dan restart loop PM2:**
   ```bash
   pm2 list
   ```
   *Lihat kolom `↺` (restarts) dan `uptime`. Jika restart counter bertambah terus (misal > 50) dan uptime selalu `0s - 3s`, aplikasi sedang mengalami **Crash Loop**.*

2. **Periksa error log PM2:**
   ```bash
   pm2 logs rystore-frontend --lines 30 --nostream --err
   ```

3. **Tes konektivitas port lokal di STB:**
   ```bash
   curl -I http://127.0.0.1:3005
   ```
   *Jika `Connection refused`, proses frontend mati atau belum listen di port.*

4. **Uji proses secara manual untuk melihat root cause error:**
   ```bash
   cd /www/wwwroot/ry-itsolutions/tembak-paket-app/frontend-v2
   node server.js
   ```

#### B. Akar Masalah & Solusi Sering Terjadi (Next.js & Node.js):
* **Penyebab (`ReferenceError: exports is not defined in ES module scope`):**
  Terjadi ketika `next.config.ts` menggunakan sintaks ESM murni seperti `import.meta.url`. Node v20 di STB yang menjalankan `server.js` (CommonJS) akan gagal mem-parsing konfigurasi saat `app.prepare()`.
* **Penyebab (`ReferenceError: __dirname is not defined`):**
  Terjadi di Node.js modern jika menggunakan bare `__dirname` dalam konteks module.
* **Aturan Baku Solusi Universal:**
  Selalu gunakan `process.cwd()` untuk mendeteksi root path, hindari bare `__dirname` dan `import.meta.url` di file konfigurasi:
  ```ts
  const rootDir = path.resolve(process.cwd(), process.cwd().endsWith('frontend-v2') ? '../..' : '.');
  ```

#### C. Prosedur Pemulihan (Restart & Verifikasi):
```bash
# 1. Bersihkan log lama & restart
pm2 flush rystore-frontend
pm2 restart rystore-frontend

# 2. Tunggu 5 detik lalu verifikasi respons 200 OK
sleep 5
curl -I http://127.0.0.1:3005
curl -I -k https://ry-itsolutionts.web.id
```

---

### 2. Konflik Git saat `git pull` di STB:
Gunakan reset keras agar kode di STB 100% sinkron dengan GitHub:
```bash
git fetch --all
git reset --hard origin/main
```

### 3. Frontend Blank atau Error Build:
Pastikan file `public/version.json` dan folder `.next` ikut ter-push dari laptop. Jalankan ulang `npm run deploy` di laptop.

### 4. Port Bentrok / PM2 Mati Total:
```bash
pm2 delete all
cd /www/wwwroot/ry-itsolutions
pm2 start ecosystem.config.js
pm2 save
```

