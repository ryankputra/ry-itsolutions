# Aplikasi Tembak Paket Ryystore Panel

Aplikasi web untuk manajemen dan pembelian paket XL/AXIS menggunakan API KMSP-STORE, dengan backend Node.js/Express dan frontend HTML/CSS/JS. Akses ke aplikasi diamankan dengan HTTP Basic Authentication.

## Daftar Isi
1.  [Prasyarat](#prasyarat)
2.  [Instalasi Awal di VPS](#instalasi-awal-di-vps)
    * [Persiapan Awal VPS](#persiapan-awal-vps)
    * [Instalasi Perangkat Lunak](#instalasi-perangkat-lunak)
    * [Deploy Kode Aplikasi](#deploy-kode-aplikasi)
    * [Konfigurasi dan Jalankan Backend](#konfigurasi-dan-jalankan-backend)
    * [Konfigurasi Nginx (Web Server & Reverse Proxy)](#konfigurasi-nginx)
    * [Konfigurasi Firewall (UFW)](#konfigurasi-firewall-ufw)
    * [Pengaturan Cloudflare (Jika Digunakan)](#pengaturan-cloudflare-jika-digunakan)
    * [Setup HTTPS dengan Certbot (Let's Encrypt)](#setup-https-dengan-certbot)
    * [Mengakses Aplikasi Anda](#mengakses-aplikasi-anda)
3.  [Cara Mengupdate Aplikasi di VPS](#cara-mengupdate-aplikasi-di-vps)
4.  [Catatan Penting](#catatan-penting)
5.  [Troubleshooting Umum](#troubleshooting-umum)

---

## 1. Prasyarat

Sebelum memulai, pastikan Anda memiliki:
* VPS baru dengan akses root atau sudo (disarankan Ubuntu 20.04 LTS atau lebih baru).
* Nama domain yang sudah Anda beli (contoh: `tembak.cloudrystore.xyz`).
* Akun Cloudflare (opsional, jika Anda ingin menggunakan layanan mereka untuk DNS dan proteksi).
* API Key KMSP-STORE yang valid.
* Git sudah terinstal di komputer lokal Anda.
* Kode proyek ini sudah di-push ke repository GitHub privat Anda.

---

## 2. Instalasi Awal di VPS

Langkah-langkah ini untuk setup aplikasi dari awal di VPS baru.

### Persiapan Awal VPS
1.  **Hubungkan ke VPS via SSH:**
    ```bash
    ssh root@ALAMAT_IP_VPS_ANDA
    ```
2.  **Buat User Baru (Non-Root dengan Sudo - Sangat Direkomendasikan):**
    ```bash
    adduser namauserbaru
    usermod -aG sudo namauserbaru
    su - namauserbaru 
    ```
    Selanjutnya, semua perintah dijalankan sebagai `namauserbaru` (gunakan `sudo` jika diperlukan).
3.  **Update Sistem:**
    ```bash
    sudo apt update && sudo apt full-upgrade -y && sudo apt autoremove -y
    ```

### Instalasi Perangkat Lunak
1.  **Install Node.js dan npm (via NVM):**
    ```bash
    curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash
    ```
    Tutup dan buka kembali sesi SSH Anda, atau jalankan:
    ```bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    ```
    Install versi LTS Node.js:
    ```bash
    nvm install --lts
    nvm use --lts
    node -v # Cek versi Node.js
    npm -v  # Cek versi npm
    ```
2.  **Install Git:**
    ```bash
    sudo apt install git -y
    ```
3.  **Install Nginx:**
    ```bash
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
    ```
4.  **Install PM2 (Process Manager untuk Node.js):**
    ```bash
    sudo npm install pm2 -g
    ```

### Deploy Kode Aplikasi
1.  **Konfigurasi Akses Git ke GitHub dari VPS (Pilih Salah Satu):**
    * **Via HTTPS dengan PAT (Personal Access Token):** Ini yang sudah Anda gunakan. Pastikan Anda memiliki PAT dengan scope `repo`.
    * **Via SSH Key (Direkomendasikan untuk jangka panjang):** Buat pasangan kunci SSH di VPS (`ssh-keygen`), lalu tambahkan kunci publik (`~/.ssh/id_rsa.pub`) ke pengaturan SSH keys di akun GitHub Anda.
2.  **Buat Direktori Proyek di VPS:**
    ```bash
    sudo mkdir -p /var/www/tembak-paket-app 
    sudo chown $(whoami):$(whoami) /var/www/tembak-paket-app 
    cd /var/www/tembak-paket-app
    ```
3.  **Clone Repository dari GitHub:**
    Ganti `URL_REPOSITORY_ANDA` dengan URL HTTPS (jika pakai PAT) atau SSH (jika pakai SSH key) repository GitHub privat Anda.
    ```bash
    git clone URL_REPOSITORY_ANDA .
    ```
    (Tanda `.` berarti clone ke direktori saat ini: `/var/www/tembak-paket-app`). Jika menggunakan HTTPS, Anda akan diminta username GitHub dan password (masukkan PAT Anda di sini).

### Konfigurasi dan Jalankan Backend
1.  **Masuk ke Direktori Backend:**
    ```bash
    cd /var/www/tembak-paket-app/backend 
    ```
2.  **Install Dependencies Backend:**
    ```bash
    npm install --production
    ```
3.  **Buat File `.env`:**
    ```bash
    nano .env
    ```
    Isi dengan konten berikut, ganti placeholder dengan nilai Anda:
    ```env
    KMSP_API_KEY=MASUKKAN_API_KEY_KMSP_ANDA_DI_SINI
    PORT=3001
    NODE_ENV=production
    # Username dan Password untuk Basic Auth (hardcoded di server.js, ini hanya catatan)
    # ADMIN_USERNAME=RyyStore26
    # ADMIN_PASSWORD=@Ayusiawan1R
    # SESSION_SECRET=JIKA_ANDA_PINDAH_KE_SESSION_BASED_LOGIN_NANTI_GANTI_INI_DENGAN_STRING_ACAK_PANJANG
    ```
    Simpan file (Ctrl+X, Y, Enter).
4.  **Jalankan Aplikasi Backend dengan PM2:**
    ```bash
    pm2 start server.js --name "webtembak-backend"
    pm2 save
    sudo pm2 startup 
    ```
    (Ikuti instruksi dari `pm2 startup`). Cek status dengan `pm2 list`.

### Konfigurasi Nginx
1.  **Buat File Konfigurasi Server Block Nginx:**
    Ganti `tembak.cloudrystore.xyz` dengan domain Anda.
    ```bash
    sudo nano /etc/nginx/sites-available/tembak.cloudrystore.xyz
    ```
    Tempelkan konfigurasi berikut:
    ```nginx
    server {
        listen 80;
        listen [::]:80;

        server_name tembak.cloudrystore.xyz; # Domain/Subdomain Anda

        root /var/www/tembak-paket-app/frontend; # Path ke folder frontend
        index index.html index.htm;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://localhost:3001; # Arahkan ke backend Node.js Anda (sesuai PORT di .env)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        access_log /var/log/nginx/tembak.cloudrystore.xyz.access.log;
        error_log /var/log/nginx/tembak.cloudrystore.xyz.error.log;
    }
    ```
    Simpan file.

2.  **Aktifkan Situs dan Tes Konfigurasi:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/tembak.cloudrystore.xyz /etc/nginx/sites-enabled/
    # Hapus konfigurasi default Nginx jika ada dan tidak dipakai:
    # sudo rm /etc/nginx/sites-enabled/default 
    sudo nginx -t 
    sudo systemctl reload nginx
    ```

### Konfigurasi Firewall (UFW)
1.  Izinkan koneksi yang diperlukan:
    ```bash
    sudo ufw allow OpenSSH # Atau port SSH kustom Anda
    sudo ufw allow 'Nginx Full' # Izinkan HTTP (80) dan HTTPS (443)
    ```
2.  Aktifkan UFW (jika belum):
    ```bash
    sudo ufw enable 
    ```
    Jawab `y` pada konfirmasi.
3.  Cek status:
    ```bash
    sudo ufw status
    ```

### Pengaturan Cloudflare (Jika Digunakan)
1.  Pastikan domain `cloudrystore.xyz` Anda sudah ditambahkan ke Cloudflare dan nameserver di registrar domain Anda sudah diubah ke nameserver Cloudflare.
2.  Di dashboard DNS Cloudflare untuk `cloudrystore.xyz`, buat **`A record`**:
    * **Type:** `A`
    * **Name:** `tembak`
    * **IPv4 address:** Alamat IP Publik VPS Anda
    * **Proxy status:** **Proxied (awan oranye)**
    * **TTL:** Auto
3.  Tunggu propagasi DNS jika baru diubah.

### Setup HTTPS dengan Certbot
1.  **Install Certbot (jika belum):**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```
2.  **Dapatkan Sertifikat SSL:**
    ```bash
    sudo certbot --nginx -d tembak.cloudrystore.xyz
    ```
    * Ikuti instruksi: masukkan email, setujui Terms of Service.
    * Pilih opsi untuk me-redirect semua traffic HTTP ke HTTPS (biasanya pilihan 2).
3.  **Konfigurasi SSL/TLS di Cloudflare (Jika Menggunakan Cloudflare):**
    * Di dashboard Cloudflare, domain `cloudrystore.xyz` -> SSL/TLS -> Overview.
    * Set mode enkripsi ke **"Full (strict)"**.
    * (Opsional) SSL/TLS -> Edge Certificates -> Aktifkan "Always Use HTTPS".

### Mengakses Aplikasi Anda
1.  Buka browser dan navigasi ke: `https://tembak.cloudrystore.xyz`
2.  Anda akan diminta login HTTP Basic Authentication. Masukkan:
    * Username: `RyyStore26`
    * Password: `@Ayusiawan1R`
3.  Aplikasi Anda seharusnya sudah bisa diakses.

---

## 3. Cara Mengupdate Aplikasi di VPS

Setelah melakukan perubahan pada kode di komputer lokal Anda:

1.  **Di Komputer Lokal Anda:**
    * Tambahkan perubahan ke Git: `git add .`
    * Commit perubahan: `git commit -m "Pesan update yang deskriptif"`
    * Push ke GitHub: `git push origin main` (atau branch Anda)

2.  **Di VPS Anda:**
    * Login ke VPS via SSH.
    * Navigasi ke direktori root proyek Anda:
        ```bash
        cd /var/www/tembak-paket-app 
        ```
    * Tarik perubahan terbaru dari GitHub:
        ```bash
        git pull origin main 
        ```
        (Anda mungkin diminta PAT jika menggunakan HTTPS).
    * **Update Backend (jika ada perubahan di folder `backend`):**
        ```bash
        cd backend
        npm install --production # Jalankan jika package.json berubah
        pm2 restart webtembak-backend # Atau nama proses PM2 Anda
        cd .. # Kembali ke root proyek
        ```
    * **Update Frontend:** Perubahan frontend sudah otomatis ter-update dengan `git pull`. Pengguna mungkin perlu melakukan Hard Refresh (Ctrl+Shift+R atau Cmd+Shift+R) di browser mereka.
    * **Update Konfigurasi Nginx (HANYA JIKA Anda mengubah file konfigurasi Nginx):**
        ```bash
        sudo nginx -t
        sudo systemctl reload nginx
        ```

3.  **Uji Kembali:** Akses `https://tembak.cloudrystore.xyz` dan pastikan semua update berfungsi. Periksa log jika ada masalah.

---

## 4. Catatan Penting
* **Keamanan:** Password Basic Auth (`ADMIN_PASSWORD`) disimpan langsung di `server.js`. Untuk keamanan lebih tinggi di masa depan, pertimbangkan metode penyimpanan yang lebih aman jika aplikasi ini berkembang. Selalu gunakan HTTPS.
* **`frontend/script.js`:** Pastikan `const BACKEND_BASE_URL = '/api';` saat disajikan oleh Nginx dari domain yang sama.
* **Backup:** Pertimbangkan untuk melakukan backup VPS Anda secara berkala.

---

## 5. Troubleshooting Umum
* **`EADDRINUSE` (Port sudah digunakan) saat menjalankan `node server.js` atau PM2:** Hentikan proses lama yang menggunakan port tersebut. Gunakan `lsof -i :PORT` untuk mencari PID-nya, lalu `kill -9 PID`.
* **Nginx `502 Bad Gateway`:** Biasanya berarti aplikasi backend Node.js Anda tidak berjalan atau Nginx tidak bisa menghubunginya di `proxy_pass http://localhost:3001;`. Cek status PM2 (`pm2 list`, `pm2 logs nama_proses`).
* **Perubahan Frontend Tidak Muncul:** Lakukan Hard Refresh di browser (Ctrl+Shift+R atau Cmd+Shift+R) atau bersihkan cache browser.
* **Error Certbot:** Pastikan DNS domain Anda sudah benar-benar mengarah ke IP VPS dan Nginx sudah berjalan dan merespons di port 80 untuk domain tersebut sebelum menjalankan Certbot. Jika pakai Cloudflare, pastikan untuk sementara nonaktifkan proxy (grey cloud) untuk domain/subdomain saat validasi Certbot HTTP-01, lalu aktifkan lagi setelahnya. Atau, gunakan metode validasi DNS Certbot jika HTTP-01 bermasalah dengan proxy Cloudflare.

---
