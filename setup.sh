#!/bin/bash

# ==============================================================================
# Skrip Setup Otomatis untuk Ryystore Panel
# Dibuat untuk: Ubuntu Server 20.04/22.04
# Versi 2.0: Disesuaikan dengan struktur repo ryankputra/webtembak
# ==============================================================================

# Hentikan skrip jika terjadi error
set -e

# --- FUNGSI UNTUK TAMPILAN ---
print_banner() {
    echo "======================================================"
    echo "$1"
    echo "======================================================"
}

print_step() {
    echo "-----> $1"
}

# --- 1. MEMINTA INPUT DARI PENGGUNA ---
print_banner "Konfigurasi Domain"
read -p "Masukkan Subdomain (contoh: tembak): " SUBDOMAIN
read -p "Masukkan Domain Utama (contoh: cloudrystore.xyz): " DOMAIN

if [ -z "$SUBDOMAIN" ] || [ -z "$DOMAIN" ]; then
    echo "Error: Subdomain dan Domain Utama tidak boleh kosong."
    exit 1
fi

FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"
# Direktori kloning utama
CLONE_DIR="/var/www/ryystore-app" 
# Direktori aplikasi yang sebenarnya di dalam repo
PROJECT_DIR="${CLONE_DIR}/tembak-paket-app"
APP_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"

echo "Domain lengkap Anda adalah: ${FULL_DOMAIN}"
echo "Direktori proyek akan dibuat di: ${PROJECT_DIR}"
echo ""
read -p "Apakah konfigurasi di atas sudah benar? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Setup dibatalkan."
    exit 1
fi

# --- 2. INSTALASI PRASYARAT ---
print_banner "Langkah 1: Menginstal Prasyarat Server"
print_step "Memperbarui daftar paket..."
sudo apt-get update -y
print_step "Menginstal git, nginx, curl..."
sudo apt-get install -y git nginx curl

# Instal Node.js v18 dan npm
if ! command -v node &> /dev/null
then
    print_step "Node.js tidak ditemukan. Menginstal Node.js v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_step "Node.js sudah terinstal."
fi

# Instal PM2
if ! command -v pm2 &> /dev/null
then
    print_step "PM2 tidak ditemukan. Menginstal PM2 secara global..."
    sudo npm install -g pm2
else
    print_step "PM2 sudah terinstal."
fi

# --- 3. KLONING REPOSITORI & SETUP APLIKASI ---
print_banner "Langkah 2: Kloning Repositori & Setup Aplikasi"
print_step "Membuat direktori induk di /var/www/..."
sudo mkdir -p /var/www
cd /var/www

if [ -d "$CLONE_DIR" ]; then
    print_step "Direktori proyek sudah ada. Menghapus versi lama..."
    sudo rm -rf "$CLONE_DIR"
fi

print_step "Mulai kloning dari GitHub..."
sudo git clone https://github.com/ryankputra/webtembak.git ryystore-app

print_step "Masuk ke direktori backend: ${APP_DIR}"
cd "$APP_DIR"

print_step "Menginstal dependensi Node.js (npm install)..."
sudo npm install --production

# --- 4. MEMBUAT FILE .env ---
print_banner "Langkah 3: Membuat File Konfigurasi .env"
print_step "Membuat file .env di ${APP_DIR}/.env"

sudo bash -c "cat > ${APP_DIR}/.env" <<EOF
PORT=3001
SESSION_SECRET=GANTI_DENGAN_TEKS_ACAK_YANG_SANGAT_PANJANG_DAN_AMAN_$(openssl rand -hex 32)
KMSP_API_KEY=MASUKKAN_KUNCI_API_KMSP_ANDA
QRIS_STATIS_STRING=MASUKKAN_STRING_QRIS_STATIS_ANDA
OKE_API_KEY=MASUKKAN_KUNCI_API_OKE_CONNECT_ANDA
OKE_API_BASE=MASUKKAN_API_BASE_OKE_CONNECT_ANDA
TELEGRAM_BOT_TOKEN=MASUKKAN_TOKEN_BOT_TELEGRAM_ANDA
TELEGRAM_CHAT_ID=MASUKKAN_ID_GRUP_TELEGRAM_ANDA
TELEGRAM_ADMIN_CHAT_ID=MASUKKAN_ID_CHAT_PRIBADI_ADMIN
EOF

print_step "File .env berhasil dibuat. PENTING: Harap edit file ini nanti untuk memasukkan API Key Anda!"
echo "Anda bisa mengeditnya dengan: sudo nano ${APP_DIR}/.env"
echo ""

# --- 5. MENJALANKAN APLIKASI DENGAN PM2 ---
print_banner "Langkah 4: Menjalankan Aplikasi dengan PM2"
cd "$APP_DIR"

# Hentikan jika proses dengan nama yang sama sudah ada
if pm2 list | grep -q "ryystore-app"; then
    print_step "Menghentikan proses PM2 yang sudah ada..."
    pm2 delete ryystore-app
fi

print_step "Memulai server.js dengan PM2..."
pm2 start server.js --name "ryystore-app"

print_step "Menyimpan konfigurasi PM2 agar berjalan saat startup..."
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $(eval echo ~$USER)

# --- 6. KONFIGURASI NGINX ---
print_banner "Langkah 5 & 6: Konfigurasi dan Aktivasi Nginx"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/${FULL_DOMAIN}"

print_step "Membuat file konfigurasi Nginx di ${NGINX_CONFIG_PATH}"
sudo bash -c "cat > ${NGINX_CONFIG_PATH}" <<EOF
server {
    listen 80;
    server_name ${FULL_DOMAIN} www.${FULL_DOMAIN};

    # Blok ini akan diurus oleh Certbot nanti untuk redirect ke HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${FULL_DOMAIN} www.${FULL_DOMAIN};

    # Path SSL akan dibuat oleh Certbot di Langkah 7
    # ssl_certificate /etc/letsencrypt/live/${FULL_DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${FULL_DOMAIN}/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${FRONTEND_DIR};
    index index.html index.htm;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
    }
}
EOF

print_step "Mengaktifkan konfigurasi dengan membuat symbolic link..."
# Hapus link jika sudah ada
if [ -L "/etc/nginx/sites-enabled/${FULL_DOMAIN}" ]; then
    sudo rm "/etc/nginx/sites-enabled/${FULL_DOMAIN}"
fi
sudo ln -s "$NGINX_CONFIG_PATH" /etc/nginx/sites-enabled/

# Hapus konfigurasi default Nginx jika ada
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    print_step "Menghapus konfigurasi default Nginx..."
    sudo rm /etc/nginx/sites-enabled/default
fi

print_step "Menguji konfigurasi Nginx..."
sudo nginx -t

print_step "Me-restart Nginx..."
sudo systemctl restart nginx

# --- 7. INSTALASI SSL DENGAN CERTBOT ---
print_banner "Langkah 7: Instalasi SSL (HTTPS) dengan Certbot"
print_step "Menginstal Certbot dan plugin Nginx..."
sudo apt-get install -y certbot python3-certbot-nginx

print_step "Meminta sertifikat SSL untuk ${FULL_DOMAIN}..."
echo "PENTING: Anda akan diminta memasukkan alamat email dan menyetujui persyaratan."
echo "Pilih opsi 'Redirect' (biasanya nomor 2) saat ditanya untuk mengalihkan HTTP ke HTTPS."
sudo certbot --nginx -d "${FULL_DOMAIN}" -d "www.${FULL_DOMAIN}"

print_step "Me-restart Nginx sekali lagi untuk menerapkan SSL..."
sudo systemctl restart nginx

# --- SELESAI ---
print_banner "🎉 SETUP SELESAI! 🎉"
echo "Aplikasi Anda sekarang seharusnya sudah berjalan dan dapat diakses di:"
echo "https://${FULL_DOMAIN}"
echo ""
echo "LANGKAH TERAKHIR YANG PALING PENTING:"
echo "Jangan lupa untuk mengedit file .env dan memasukkan semua API Key Anda."
echo "Jalankan perintah: sudo nano ${APP_DIR}/.env"
echo "Setelah mengedit, restart aplikasi dengan: pm2 restart ryystore-app"
echo ""
