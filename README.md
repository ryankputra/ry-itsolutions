# Ryystore Panel (Tembak Paket App)

Aplikasi panel manajemen layanan (tembak paket) dengan fitur otentikasi pengguna, pembelian paket, riwayat transaksi, top-up saldo via QRIS, dan panel admin.

## Fitur Utama

* **Otentikasi Pengguna:** Login dan Registrasi akun.
* **Pembelian Paket:** Memilih dan membeli paket layanan.
* **Verifikasi Nomor HP (KMSP):** Verifikasi nomor telepon satu kali untuk pembelian berulang.
* **Riwayat Transaksi:** Melihat riwayat pembelian dan top-up saldo.
* **Top Up Saldo:** Menambah saldo pengguna melalui pembayaran QRIS dinamis.
* **Panel Admin:**
    * Manajemen Saldo Pengguna.
    * Sinkronisasi dan Manajemen Paket dari KMSP.
    * Pengelolaan Pengumuman Sistem.
    * Backup dan Restore Database.
* **Responsif:** Tampilan yang menyesuaikan dengan berbagai ukuran layar (desktop dan mobile).

## Teknologi yang Digunakan

* **Frontend:** HTML, CSS (Vanilla), JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Database:** LowDB (berbasis file JSON sederhana)
* **Autentikasi:** `express-session`, `bcrypt`
* **Integrasi API:** KMSP XL Tembak Service, QRISku.my.id, OkeConnect (Mutasi QRIS)
* **Manajemen Proses:** PM2
* **Web Server/Reverse Proxy:** Nginx
* **SSL/HTTPS:** Certbot (Let's Encrypt)

## Struktur Proyek





## Cara Menjalankan di Lingkungan Lokal (Development)

1.  **Kloning repositori:**
    ```bash
    git clone [https://github.com/ryankputra/webtembak.git](https://github.com/ryankputra/webtembak.git) ryystore-app
    cd ryystore-app/tembak-paket-app/ # Masuk ke folder utama aplikasi Node.js
    ```
2.  **Instal dependensi:**
    ```bash
    npm install
    ```
3.  **Buat file `.env`:**
    Buat file bernama `.env` di direktori `tembak-paket-app/` (di mana `backend/` dan `frontend/` berada), dan isi dengan variabel-variabel berikut (ganti nilai dengan API Key Anda):
    ```
    PORT=3001
    SESSION_SECRET=string_rahasia_dan_panjang_untuk_sesi_anda
    KMSP_API_KEY=API_KEY_ANDA_DARI_KMSP
    QRIS_STATIS_STRING=QRIS_STATIS_STRING_ANDA_DARI_QRISKU
    OKE_API_KEY=OKE_API_KEY_ANDA_DARI_OKECONNECT
    OKE_API_BASE=OKE_API_BASE_ANDA_DARI_OKECONNECT
    ```
4.  **Jalankan aplikasi backend:**
    ```bash
    cd backend/
    node server.js
    ```
    (Server akan berjalan di `http://localhost:3001`)
5.  **Akses aplikasi:** Buka browser Anda dan navigasi ke `http://localhost:3001`.

## Cara Deployment ke VPS (Production)

Bagian ini mengasumsikan Anda sudah memiliki VPS dengan Ubuntu Server, Node.js, npm, Git, Nginx, dan PM2 terinstal.

1.  **Akses VPS:** SSH ke server Anda.

2.  **Kloning repositori:**
    ```bash
    cd /var/www/ # Direktori umum untuk proyek web
    sudo git clone [https://github.com/ryankputra/webtembak.git](https://github.com/ryankputra/webtembak.git) ryystore-app-production
    cd ryystore-app-production/tembak-paket-app/ # Masuk ke folder utama aplikasi Node.js
    ```

3.  **Konfigurasi Izin File:**
    ```bash
    sudo chown -R www-data:www-data . # Ubah kepemilikan ke user Nginx
    sudo find . -type d -exec chmod 755 {} \; # Ubah izin folder
    sudo find . -type f -exec chmod 644 {} \; # Ubah izin file
    ```

4.  **Instal dependensi:**
    ```bash
    npm install --production
    ```

5.  **Buat file `.env` (isi dengan kredensial produksi Anda):**
    ```bash
    nano .env
    ```
    *(Gunakan nilai produksi untuk API Key dan SESSION_SECRET yang lebih kuat!)*

6.  **Mulai aplikasi dengan PM2:**
    ```bash
    cd backend/
    pm2 start server.js --name "ryystore-backend" --update-env
    pm2 save
    ```

7.  **Konfigurasi Nginx:**
    * Buat file konfigurasi Nginx baru:
        ```bash
        sudo nano /etc/nginx/sites-available/tembak.cloudrystore.xyz
        ```
    * Tempel konfigurasi berikut (ganti `your_domain` dan `path_to_frontend`):
        ```nginx
        server {
            listen 80;
            server_name tembak.cloudrystore.xyz www.tembak.cloudrystore.xyz; # Ganti dengan domain Anda
            return 301 https://$server_name$request_uri;
        }

        server {
            listen 443 ssl http2;
            server_name tembak.cloudrystore.xyz www.tembak.cloudrystore.xyz; # Ganti dengan domain Anda

            # **PASTIKAN PATH SERTIFIKAT INI BENAR SETELAH MENJALANKAN CERTBOT**
            ssl_certificate /etc/letsencrypt/live/tembak.cloudrystore.xyz/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/tembak.cloudrystore.xyz/privkey.pem;
            include /etc/letsencrypt/options-ssl-nginx.conf;
            ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

            # Root untuk file statis frontend
            root /var/www/ryystore-app-production/tembak-paket-app/frontend; # <--- UBAH PATH INI!
            index index.html index.htm;

            location / {
                try_files $uri $uri/ /index.html;
            }

            location /api/ {
                proxy_pass http://localhost:3001; # Port internal Node.js backend
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            error_page 500 502 503 504 /50x.html;
            location = /50x.html {
                root /usr/share/nginx/html;
            }
        }
        ```
    * Aktifkan konfigurasi: `sudo ln -s /etc/nginx/sites-available/tembak.cloudrystore.xyz /etc/nginx/sites-enabled/`
    * Hapus default Nginx (jika ada): `sudo rm /etc/nginx/sites-enabled/default`
    * Uji Nginx: `sudo nginx -t`
    * Muat ulang Nginx: `sudo systemctl reload nginx`

8.  **Instal dan Konfigurasi SSL dengan Certbot:**
    ```bash
    sudo certbot --nginx -d tembak.cloudrystore.xyz -d www.tembak.cloudrystore.xyz
    sudo systemctl reload nginx
    ```

9.  **Uji Aplikasi:** Bersihkan cache browser Anda dan akses `https://tembak.cloudrystore.xyz`.

---

Selamat, dan semoga dokumentasi ini membantu Anda dan pengguna lainnya di masa mendatang!
