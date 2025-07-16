server {
    server_name tembak.cloudrystore.com www.tembak.cloudrystore.com;

    # Arahkan ke direktori frontend Anda
    root /var/www/my-app-ryystore/tembak-paket-app/frontend;
    index index.html;

    # (PENTING) Blok untuk folder upload gambar dari backend
    location /public/ {
        alias /var/www/my-app-ryystore/tembak-paket-app/backend/public/;
        expires 1d;
        access_log off;
    }
    # Lokasi untuk API Backend
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Lokasi untuk semua permintaan lain (Frontend)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Pengaturan SSL ditambahkan oleh Certbot
    listen [::]:443 ssl http2;
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/tembak.cloudrystore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tembak.cloudrystore.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
# BLOK SERVER KEDUA: Mengalihkan HTTP ke HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tembak.cloudrystore.com www.tembak.cloudrystore.com;

    # Pengalihan ditambahkan oleh Certbot
    return 301 https://$host$request_uri;
}