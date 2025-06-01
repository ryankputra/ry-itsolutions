// backend/server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); 
const cors = require('cors');
const path = require('path'); // Diperlukan untuk menyajikan file statis

const app = express();
const PORT = process.env.PORT || 3001;
const KMSP_API_KEY = process.env.KMSP_API_KEY;

// --- KONFIGURASI LOGIN ---
const ADMIN_USERNAME = "RyyStore26";
const ADMIN_PASSWORD = "@Ayusiawan1R"; // Simpan password ini dengan baik!
// --- AKHIR KONFIGURASI LOGIN ---

if (!KMSP_API_KEY) {
    console.error("FATAL ERROR: KMSP_API_KEY tidak diset di environment variables.");
    process.exit(1);
}

// Middleware untuk Basic Authentication
function basicAuthMiddleware(req, res, next) {
    // Izinkan request pre-flight CORS (OPTIONS) tanpa autentikasi
    if (req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Area Terbatas - Admin Ryystore"');
        return res.status(401).send('Autentikasi diperlukan. Silakan masukkan kredensial.');
    }

    try {
        const [scheme, credentialsBase64] = authHeader.split(' ');

        if (scheme !== 'Basic' || !credentialsBase64) {
            console.warn("Auth header tidak sesuai format Basic");
            throw new Error('Format header Authorization salah.');
        }
        
        const decodedCredentials = Buffer.from(credentialsBase64, 'base64').toString();
        const [username, password] = decodedCredentials.split(':');

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return next(); 
        } else {
            console.warn(`Upaya login gagal untuk username: ${username}`);
            res.setHeader('WWW-Authenticate', 'Basic realm="Area Terbatas - Admin Ryystore"');
            return res.status(401).send('Autentikasi gagal: Username atau password salah.');
        }
    } catch (e) {
        console.error("Error saat memproses header autentikasi:", e.message);
        res.setHeader('WWW-Authenticate', 'Basic realm="Area Terbatas - Admin Ryystore"');
        return res.status(401).send('Error saat autentikasi.');
    }
}

// --- URUTAN MIDDLEWARE PENTING ---
app.use(cors()); // 1. Middleware CORS untuk menangani permintaan lintas domain (jika diperlukan, misal saat dev dengan port berbeda)
app.use(express.json()); // 2. Middleware untuk mem-parse body JSON dari request

// 3. TERAPKAN BASIC AUTHENTICATION untuk semua rute di bawah ini
app.use(basicAuthMiddleware);

// 4. SAJIKAN FILE STATIS (FRONTEND) SETELAH AUTENTIKASI
// Pastikan path '../frontend' ini benar relatif terhadap lokasi server.js Anda.
// Jika server.js ada di 'tembak-paket-app/backend/', maka '../frontend' akan merujuk ke 'tembak-paket-app/frontend/'
app.use(express.static(path.join(__dirname, '../frontend')));


// Fungsi helper terpusat untuk meneruskan permintaan ke KMSP API
async function forwardRequest(req, res, kmspEndpointPath, queryParams = {}) {
    const kmspBaseUrl = `https://golang-openapi-${kmspEndpointPath}-xltembakservice.kmsp-store.com/v1`;
    const allQueryParams = {
        api_key: KMSP_API_KEY,
        ...queryParams
    };
    const queryString = new URLSearchParams(allQueryParams).toString();
    const kmspUrl = `${kmspBaseUrl}?${queryString}`; 

    console.log(`Backend: Meneruskan request ke KMSP URL Aktual: ${kmspUrl}`); 

    try {
        const apiResponse = await fetch(kmspUrl); 
        
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`Backend: KMSP API (${kmspEndpointPath}) mengembalikan status error ${apiResponse.status}. URL: ${kmspUrl}. Teks mentah: ${errorText}`);
            try {
                const errorJson = JSON.parse(errorText);
                return res.status(apiResponse.status).json(errorJson);
            } catch (parseError) {
                return res.status(apiResponse.status).json({ 
                    status: false, 
                    statusCode: apiResponse.status,
                    message: `KMSP API Error: ${apiResponse.statusText || `Status ${apiResponse.status}`}`, 
                    detail: errorText 
                });
            }
        }
        
        const data = await apiResponse.json();
        console.log(`Backend: Respons sukses dari KMSP untuk ${kmspEndpointPath}:`, JSON.stringify(data).substring(0, 200) + "...");
        res.json(data);

    } catch (error) {
        console.error(`Backend: Error fatal saat menghubungi KMSP (${kmspUrl}):`, error); 
        res.status(500).json({ 
            status: false, 
            statusCode: 500,
            message: "Kesalahan internal server saat menghubungi layanan KMSP.", 
            details: error.message 
        });
    }
}

// --- API ENDPOINTS (semua sudah otomatis terlindungi oleh basicAuthMiddleware) ---
app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ status: false, message: "Parameter 'phone' diperlukan." });
    await forwardRequest(req, res, 'reqotp', { phone, method: 'OTP' });
});

app.get('/api/login-otp', async (req, res) => {
    const { phone, auth_id, otp } = req.query;
    if (!phone || !auth_id || !otp) return res.status(400).json({ status: false, message: "Parameter 'phone', 'auth_id', dan 'otp' diperlukan." });
    await forwardRequest(req, res, 'login', { phone, method: 'OTP', auth_id, otp });
});

app.get('/api/packages', async (req, res) => {
    await forwardRequest(req, res, 'packagelist');
});

app.get('/api/purchase', async (req, res) => {
    const { package_code, phone, access_token, payment_method } = req.query;
    if (!package_code || !phone) return res.status(400).json({ status: false, message: "Parameter 'package_code' dan 'phone' diperlukan." });
    const params = { package_code, phone };
    if (access_token) params.access_token = access_token;
    if (payment_method) params.payment_method = payment_method;
    await forwardRequest(req, res, 'packagepurchase', params);
});

app.get('/api/transaction-status', async (req, res) => {
    const { trx_id } = req.query;
    if (!trx_id) return res.status(400).json({ status: false, message: "Parameter 'trx_id' diperlukan." });
    await forwardRequest(req, res, 'checktransaction', { trx_id });
});

app.get('/api/check-stock', async (req, res) => {
    const { package_id } = req.query;
    if (!package_id) return res.status(400).json({ status: false, message: "Parameter 'package_id' diperlukan." });
    await forwardRequest(req, res, 'checkpackagestock', { package_id });
});

app.get('/api/active-packages', async (req, res) => {
    const { access_token } = req.query;
    if (!access_token) return res.status(400).json({ status: false, message: "Parameter 'access_token' diperlukan." });
    await forwardRequest(req, res, 'quotadetails', { access_token });
});

app.get('/api/balance', async (req, res) => {
    await forwardRequest(req, res, 'panelaccountbalance');
});

app.get('/api/access-tokens', async (req, res) => {
    await forwardRequest(req, res, 'accesstokenlist');
});

app.get('/api/extend-session', async (req, res) => {
    const { phone, auth_id } = req.query; 
    if (!phone || !auth_id) return res.status(400).json({ status: false, message: "Parameter 'phone' dan 'auth_id' (session_id:token) diperlukan." });
    await forwardRequest(req, res, 'login', { phone, method: 'LOGIN_BY_ACCESS_TOKEN', auth_id });
});

// Handler untuk rute root ('/') agar menyajikan index.html dari folder frontend
// Ini juga akan terlindungi oleh basicAuthMiddleware karena ditempatkan setelahnya
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server backend berjalan di http://localhost:${PORT}`);
});