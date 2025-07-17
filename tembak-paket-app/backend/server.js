// backend/server.js - VERSI 100% FINAL, LENGKAP, DAN FUNGSIONAL (MIGRASI KE SQLITE3)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const qrcode = require('qrcode');
const multer = require('multer');
const excel = require('exceljs');
const cron = require('node-cron');
const crypto = require('crypto');
const fs = require('fs');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const FormData = require('form-data');
const https = require('https');
https.globalAgent.options.rejectUnauthorized = false;

const app = express();
const PORT = process.env.PORT || 3001;

// --- KONFIGURASI KUNCI API ---
const KMSP_API_KEY = process.env.KMSP_API_KEY;
const QRIS_STATIS_STRING = process.env.QRIS_STATIS_STRING;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const ORKUT_MERCHANT_ID = process.env.ORKUT_MERCHANT_ID;
const ORKUT_USERNAME = process.env.ORKUT_USERNAME;
const ORKUT_TOKEN = process.env.ORKUT_TOKEN;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || 'ganti-dengan-string-acak-yang-super-aman-dan-panjang';

if (!KMSP_API_KEY || !ORKUT_MERCHANT_ID || !ORKUT_USERNAME || !ORKUT_TOKEN || !QRIS_STATIS_STRING || !BREVO_API_KEY || !SESSION_SECRET) {
    console.error("FATAL ERROR: Kredensial (API, SESSION_SECRET) tidak lengkap di file .env.");
    process.exit(1);
}

// --- INISIALISASI DATABASE SQLITE ---
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("FATAL ERROR: Could not connect to SQLite database.", err.message);
        process.exit(1);
    }
    console.log("✅ Successfully connected to SQLite database.");
});

// --- FUNGSI HELPER DATABASE (PROMISE WRAPPER) ---
const dbRun = (query, params = []) => new Promise((resolve, reject) => { db.run(query, params, function (err) { if (err) return reject(err); resolve(this); }); });
const dbGet = (query, params = []) => new Promise((resolve, reject) => { db.get(query, params, (err, row) => { if (err) return reject(err); resolve(row); }); });
const dbAll = (query, params = []) => new Promise((resolve, reject) => { db.all(query, params, (err, rows) => { if (err) return reject(err); resolve(rows); }); });

// --- INISIALISASI STRUKTUR TABEL DATABASE ---
async function initializeDatabase() {
    db.serialize(async () => {
        try {
            await dbRun("PRAGMA foreign_keys = ON;");
            await dbRun(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, balance REAL DEFAULT 0, role TEXT DEFAULT 'user', verifiedPhone TEXT, savedPhones TEXT, status TEXT DEFAULT 'pending', createdAt TEXT NOT NULL, resetPasswordToken TEXT, resetPasswordExpires INTEGER)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS packages (package_code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, original_price REAL DEFAULT 0, platform_fee REAL DEFAULT 0, isVisible INTEGER DEFAULT 0, category TEXT DEFAULT 'reguler', isMultiPurchase INTEGER DEFAULT 0, payment_methods TEXT)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, packageId TEXT, packageName TEXT, platformFee REAL, originalPrice REAL, targetPhone TEXT, accessToken TEXT, paymentMethod TEXT, kmspTrxId TEXT, status TEXT NOT NULL, api_response TEXT, createdAt TEXT NOT NULL, paymentDetails TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS topups (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, baseAmount REAL NOT NULL, uniqueAmount REAL NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL, qrisBase64Image TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, message TEXT NOT NULL, createdAt TEXT NOT NULL)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS tutorialContent (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, content TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, position INTEGER DEFAULT 0)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceMode', 'false'), ('lowBalanceNotified', 'false'), ('topupOptions', '[]'), ('lastKmspBalance', '0')`);
            console.log("✅ Database schema initialized successfully.");
        } catch (error) {
            console.error("Database initialization failed:", error);
            process.exit(1);
        }
    });
}
initializeDatabase();

// --- SETUP MIDDLEWARE & LAINNYA ---
app.use(express.json());
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
const fileStoreOptions = { path: path.join(__dirname, 'sessions'), ttl: 86400, retries: 0 };
app.use(session({ store: new FileStore(fileStoreOptions), secret: SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => { console.log(`[REQ] ${req.method} ${req.originalUrl}`); next(); });

const brevoApiClient = SibApiV3Sdk.ApiClient.instance;
brevoApiClient.authentications['api-key'].apiKey = BREVO_API_KEY;

// --- PENGATURAN MULTER ---
const tutorialStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public', 'uploads');
        fs.mkdir(uploadPath, { recursive: true }, (err) => cb(err, uploadPath));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const tutorialUpload = multer({ storage: tutorialStorage, limits: { fileSize: 10 * 1024 * 1024 } }).array('files');
const handleUploadErrors = (req, res, next) => {
    tutorialUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ status: false, message: `File upload error: ${err.message}.` });
        if (err) return res.status(500).json({ status: false, message: `Terjadi kesalahan saat upload: ${err.message}` });
        next();
    });
};
const dbBackupUpload = multer({ dest: path.join(__dirname, 'temp_uploads/') });

// --- MIDDLEWARE AUTENTIKASI ---
const isAuthenticated = (req, res, next) => { if (req.session.userId) return next(); res.status(401).json({ status: false, message: 'Unauthorized: Anda harus login.' }); };
const isAdmin = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ status: false, message: 'Unauthorized: Sesi tidak ditemukan.' });
    try {
        const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (user && user.role === 'admin') return next();
        res.status(403).json({ status: false, message: 'Forbidden: Akses ditolak. Anda bukan Admin.' });
    } catch (error) { console.error("isAdmin middleware error:", error); res.status(500).json({ status: false, message: 'Server error saat memeriksa peran admin.' }); }
};

// --- FUNGSI HELPER ---
async function sendTelegramNotification(message, target = 'group') {
    let targetChatId = target === 'admin' ? TELEGRAM_ADMIN_CHAT_ID : TELEGRAM_CHAT_ID;
    if (!TELEGRAM_BOT_TOKEN || !targetChatId) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try { await fetch(url, { method: 'POST', body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'HTML' }), headers: { 'Content-Type': 'application/json' } }); } catch (error) { console.error(`Error mengirim notifikasi Telegram ke '${target}':`, error.message); }
}
async function getKmspAdminBalance() {
    const url = `https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return (data.status && data.data?.balance) ? parseFloat(data.data.balance) : 0;
    } catch (error) { console.error("Error fetching KMSP balance:", error); return 0; }
}

// =======================================================
// RUTE AUTENTIKASI PENGGUNA
// =======================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ status: false, message: "Nama, email, dan password wajib diisi." });
        if (await dbGet('SELECT id FROM users WHERE email = ?', [email])) return res.status(409).json({ status: false, message: "Email sudah terdaftar." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: `user_${Date.now()}`, name, email, password: hashedPassword, balance: 0, role: 'user', verifiedPhone: null, savedPhones: '[]', status: 'pending', createdAt: new Date().toISOString() };
        await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Object.values(newUser));
        
        // --- FORMAT PESAN ASLI ANDA ---
        sendTelegramNotification(
`<b>──────────────────────</b>
<b>👤 Registrasi Baru Menunggu Persetujuan</b>
<b>──────────────────────</b>
<b>Nama:</b> ${name}
<b>Email:</b> ${email}
<b>──────────────────────</b>
<b>Harap setujui akun ini di Panel Admin.</b>
<b>Notif:tembak.cloudrystore.com</b>`
        );
        
        res.status(201).json({ status: true, message: "Registrasi berhasil! Akun Anda sedang menunggu persetujuan dari Admin." });
    } catch (error) { console.error("Register error:", error); res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ status: false, message: "Email atau password salah." });
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(401).json({ status: false, message: "Email atau password salah." });
        if (user.role !== 'admin' && user.status !== 'approved') return res.status(403).json({ status: false, message: "Akun Anda belum disetujui oleh Admin." });

        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        if(userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
        res.status(200).json({ status: true, message: "Login berhasil!", user: userWithoutPassword });
    } catch (error) { console.error("Login error:", error); res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await dbGet('SELECT id, email, name FROM users WHERE email = ?', [email]);
        if (!user) {
            console.log(`[Forgot Pw] Permintaan untuk email tidak terdaftar: ${email}`);
            return res.json({ status: true, message: 'Jika email Anda terdaftar, Anda akan menerima link reset.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const oneHour = Date.now() + 3600000;
        await dbRun('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?', [token, oneHour, user.id]);

        const resetUrl = `https://tembak.cloudrystore.com/#reset-password?token=${token}`;
        const htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Permintaan Reset Password</h2><p>Klik link di bawah ini untuk mereset password Anda:</p><p style="margin: 20px 0;"><a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Reset Password Saya</a></p><p>Link ini kedaluwarsa dalam 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p></div>`;
        const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
        await tranEmailApi.sendTransacEmail({ sender: { email: 'no-reply@tembak.cloudrystore.com', name: 'RYYSTOREV2' }, to: [{ email: user.email }], subject: 'Reset Password Akun RYYSTORE Anda', htmlContent });
        res.json({ status: true, message: 'Jika email Anda terdaftar, Anda akan menerima link reset.' });
    } catch (error) { console.error("[FORGOT_PASSWORD_ERROR]", error); res.status(500).json({ status: false, message: 'Gagal mengirim email reset.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ status: false, message: 'Token dan password baru diperlukan.' });
        const user = await dbGet('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()]);
        if (!user) return res.status(400).json({ status: false, message: 'Token reset tidak valid atau telah kedaluwarsa.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', [hashedPassword, user.id]);
        sendTelegramNotification(`🔑 Password untuk pengguna <b>${user.name} (${user.email})</b> telah berhasil di-reset.`);
        res.json({ status: true, message: 'Password berhasil direset! Silakan login kembali.' });
    } catch (error) { console.error("[RESET_PASSWORD_ERROR]", error); res.status(500).json({ status: false, message: 'Terjadi kesalahan saat mereset password.' }); }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ status: false, message: "Gagal logout." });
        res.clearCookie('connect.sid');
        res.status(200).json({ status: true, message: "Logout berhasil." });
    });
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const maintenanceRow = await dbGet("SELECT value FROM settings WHERE key = 'maintenanceMode'");
        const maintenanceMode = maintenanceRow ? JSON.parse(maintenanceRow.value) : false;
        if (!req.session.userId) return res.status(200).json({ status: true, user: null, maintenanceMode });
        
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        if (!user) {
            req.session.destroy(); res.clearCookie('connect.sid');
            return res.status(200).json({ status: true, user: null, maintenanceMode });
        }
        const providerBalance = await getKmspAdminBalance();
        const { password, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
        res.status(200).json({ status: true, user: userWithoutPassword, maintenanceMode, providerBalance });
    } catch (error) { console.error("Error in /api/auth/me:", error); res.status(500).json({ status: false, message: "Gagal mengambil data sesi." }); }
});

app.post('/api/phone/login-saved', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Nomor telepon diperlukan." });
    try {
        const tokenResponse = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.status || !Array.isArray(tokenData.data)) throw new Error(tokenData.message || 'Gagal mengambil daftar sesi dari provider.');
        
        const relevantToken = tokenData.data.find(token => token.msisdn === phone);
        if (!relevantToken) throw new Error(`Tidak ditemukan sesi aktif untuk nomor ${phone}. Silakan verifikasi ulang dengan OTP.`);
        
        const auth_id = `${relevantToken.session_id}:${relevantToken.token}`;
        const extendResponse = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`);
        const extendData = await extendResponse.json();
        if (!extendResponse.ok || !extendData.status) throw new Error(extendData.message || 'Gagal menggunakan sesi tersimpan.');
        
        res.status(200).json({ status: true, message: "Berhasil login dengan sesi tersimpan.", data: extendData.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/auth/extend-session', isAuthenticated, async (req, res) => {
    const { phone, auth_id } = req.body;
    if (!phone || !auth_id) return res.status(400).json({ status: false, message: "Phone dan auth_id diperlukan." });
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon tidak terasosiasi dengan akun Anda." });
        
        const response = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal memperpanjang sesi dari KMSP.');
        res.status(200).json({ status: true, message: "Sesi berhasil diperpanjang.", data: data.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.get('/api/auth/token-list', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || !user.verifiedPhone) return res.status(200).json({ status: true, data: [] });
        
        const response = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const data = await response.json();
        if (!response.ok || !data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Gagal mengambil daftar token dari KMSP.');
        const filteredTokens = data.data.filter(token => token.msisdn === user.verifiedPhone);
        res.status(200).json({ status: true, message: "Daftar token berhasil diambil.", data: filteredTokens });
    } catch (error) { console.error("Error fetching token list:", error); res.status(500).json({ status: false, message: error.message }); }
});

// =======================================================
// RUTE VERIFIKASI & PEMBELIAN
// =======================================================
app.post('/api/phone/request-otp', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Parameter 'phone' diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-reqotp-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal meminta OTP dari provider.');
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/phone/verify-otp', isAuthenticated, async (req, res) => {
    const { phone, auth_id, otp } = req.body;
    if (!phone || !auth_id || !otp) return res.status(400).json({ status: false, message: "Phone, auth_id, dan OTP diperlukan." });
    try {
        const user = await dbGet('SELECT savedPhones FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        
        const loginResponse = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP&auth_id=${auth_id}&otp=${otp}`);
        const loginData = await loginResponse.json();
        if (!loginResponse.ok || !loginData.status) throw new Error(loginData.message || 'Verifikasi OTP Gagal.');
        if (!loginData.data?.access_token) throw new Error('Gagal mendapatkan access token dari provider.');
        
        const savedPhones = user.savedPhones ? JSON.parse(user.savedPhones) : [];
        let updatedPhones = savedPhones.filter(p => p !== phone);
        updatedPhones.unshift(phone);
        updatedPhones = updatedPhones.slice(0, 5);

        await dbRun('UPDATE users SET verifiedPhone = ?, savedPhones = ? WHERE id = ?', [phone, JSON.stringify(updatedPhones), req.session.userId]);
        res.status(200).json({ status: true, message: "Nomor berhasil diverifikasi!", data: loginData.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});
// GANTI FUNGSI INI SEPENUHNYA di backend/server.js

app.post('/api/purchase', isAuthenticated, async (req, res) => {
    // Ambil purchaseContext dari body, default ke 'paket-satuan' jika tidak ada
    const { packageId, phone, access_token, paymentMethod, purchaseContext = 'paket-satuan' } = req.body;
    
    if (!packageId || !phone || !access_token || !paymentMethod) return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });

    let user;
    let pkg;
    let platformFee = 0;
    const trxId = `trx_${Date.now()}_${uuidv4().slice(0, 4)}`; 

    try {
        user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        pkg = await dbGet('SELECT * FROM packages WHERE package_code = ?', [packageId]);

        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda." });
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        platformFee = pkg.platform_fee || 0;
        if (user.balance < platformFee) return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup.` });

        const packagePrice = pkg.original_price || 0;
        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [platformFee, user.id]);

        const adminBalance = await getKmspAdminBalance();
        if (adminBalance < packagePrice) {
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, platformFee, packagePrice, phone, access_token, paymentMethod, new Date().toISOString(), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);
            
            sendTelegramNotification(
`<b>⚠️ Saldo KMSP Kurang! (Paket OTP) ⚠️</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Meminta Paket:</b> ${pkg.name}
<b>Untuk Nomor:</b> ${phone}
<b>Harga Provider:</b> Rp ${packagePrice.toLocaleString('id-ID')}
<b>Saldo KMSP Saat Ini:</b> Rp ${adminBalance.toLocaleString('id-ID')}
──────────────────────
Transaksi diantrekan. Mohon segera top up saldo KMSP Anda.
<b>Notif:tembak.cloudrystore.com</b>`, 'admin');

            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan masuk antrean, akan diproses otomatis.", newBalance: updatedUser.balance });
        }
        
        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, platformFee, packagePrice, phone, access_token, paymentMethod, new Date().toISOString(), 'processing', 'Menghubungi provider...']);

        const purchaseParams = new URLSearchParams({ api_key: KMSP_API_KEY, package_code: pkg.package_code, phone, access_token, payment_method: paymentMethod, price_or_fee: pkg.original_price });
        const purchaseResponse = await fetch(`https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${purchaseParams.toString()}`);
        const purchaseData = await purchaseResponse.json();

        // --- Logika Kondisional Berdasarkan Konteks ---
        let isDorUlangFailure = false;
        // 1. Cek pesan "Dor Ulang" HANYA jika permintaan berasal dari 'multi-paket'
        if (purchaseContext === 'multi-paket') {
            isDorUlangFailure = (purchaseData.message || '').includes("Paket berhasil dibeli. Silakan cek kuotanya");
        }

        const isIpaasSuccessCase = (purchaseData.message || '').includes("422 -> Failed call ipaas purchase");
        const isProviderSuccess = ((purchaseResponse.ok && purchaseData.status) || isIpaasSuccessCase) && !isDorUlangFailure;
        // --- Akhir Logika Kondisional ---

        const requiresExternalPayment = purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink);

        if (isProviderSuccess) {
            let paymentDetails = null;
            if (requiresExternalPayment) {
                 if (purchaseData.data.is_qris && purchaseData.data.qris_data?.qr_code) {
                     purchaseData.data.qris_data.qr_code_base64 = await qrcode.toDataURL(purchaseData.data.qris_data.qr_code);
                 }
                 paymentDetails = JSON.stringify(purchaseData.data);
            }
            
            await dbRun("UPDATE transactions SET status = ?, api_response = ?, kmspTrxId = ?, paymentDetails = ? WHERE id = ?", ['success', purchaseData.message || 'Sukses', purchaseData.data?.trx_id || null, paymentDetails, trxId]);

            const maskedPhone = phone.slice(0, 4) + '****' + phone.slice(-3);
            sendTelegramNotification(`<b>✅ Transaksi Paket Baru!</b>\n──────────────────────\n<b>Nama Pengguna:</b> ${user.name}\n<b>Nama Paket:</b> ${pkg.name}\n<b>Nomor Tujuan:</b> ${maskedPhone}\n<b>Status: Sukses</b>`);
            
            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const successMessage = isIpaasSuccessCase ? "Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)" : (purchaseData.message || "Pembelian berhasil!");

            if (requiresExternalPayment) {
                return res.status(202).json({ status: true, message: "Pembayaran eksternal diperlukan.", payment_data: purchaseData.data, newBalance: finalUser.balance });
            }
            return res.status(200).json({ status: true, message: successMessage, newBalance: finalUser.balance });

        } else {
            await dbRun("UPDATE transactions SET status = 'failed', api_response = ? WHERE id = ?", [purchaseData.message || 'Gagal dari provider', trxId]);
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [platformFee, user.id]); // Kembalikan saldo

            sendTelegramNotification(
`<b>❌ Transaksi Gagal (Fee Dikembalikan)</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Paket:</b> ${pkg.name}
<b>Nomor:</b> ${phone}
<b>Pesan Error:</b> <pre>${purchaseData.message || 'Unknown Error'}</pre>
──────────────────────
Saldo fee sebesar Rp ${platformFee.toLocaleString('id-ID')} telah dikembalikan.
<b>Notif:tembak.cloudrystore.com</b>`);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const errorMessage = isDorUlangFailure ? "Gagal (Dor Ulang): Coba lagi setelah 10 menit." : (purchaseData.message || 'Pembelian gagal.');
            return res.status(500).json({ status: false, message: errorMessage, newBalance: finalUser.balance });
        }

    } catch (error) {
        console.error("Purchase route error:", error);
        if (user && pkg && platformFee > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [platformFee, user.id]);
        }
        const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [req.session.userId]);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan internal.", newBalance: finalUser?.balance });
    }
});

app.post('/api/purchase/non-otp', isAuthenticated, async (req, res) => {
    const { packageId, phone: targetPhone } = req.body;
    if (!packageId || !targetPhone) return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });

    try {
        const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.session.userId]);
        const pkg = await dbGet("SELECT * FROM packages WHERE package_code = ?", [packageId]);
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        const platformFee = pkg.platform_fee || 0;
        if (user.balance < platformFee) return res.status(402).json({ status: false, message: `Saldo Anda tidak cukup.` });

        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [platformFee, user.id]);
        
        const baseTransaction = { id: `trx_${Date.now()}`, userId: user.id, userName: user.name, packageId, packageName: pkg.name, platformFee, originalPrice: pkg.original_price, targetPhone, paymentMethod: 'balance', createdAt: new Date().toISOString() };
        const adminBalance = await getKmspAdminBalance();

        if (adminBalance < pkg.original_price) {
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);
            sendTelegramNotification(`<b>⚠️ Saldo KMSP Kurang! (Non-OTP)</b>\nPengguna: ${user.name}\nPaket: ${pkg.name}\nTransaksi diantrekan.`, 'admin');
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan Anda masuk antrean.", newBalance: updatedUser.balance });
        }
        
        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'processing', 'Processing...']);
        const trxFromDb = await dbGet("SELECT * FROM transactions WHERE id = ?", [baseTransaction.id]);
        
        await executeNonOtpPurchase(trxFromDb);
        const finalTrx = await dbGet("SELECT status, api_response FROM transactions WHERE id = ?", [baseTransaction.id]);

        if (finalTrx.status !== 'success') {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [platformFee, user.id]);
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(500).json({ status: false, message: finalTrx.api_response, newBalance: updatedUser.balance });
        }
        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
        return res.status(200).json({ status: true, message: finalTrx.api_response || "Pembelian berhasil!", newBalance: updatedUser.balance });
        
    } catch (error) {
        console.error("Error di rute non-otp:", error);
        // Safety refund
        const { packageId } = req.body;
        const pkg = await dbGet("SELECT platform_fee FROM packages WHERE package_code = ?", [packageId]);
        if (pkg) await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [pkg.platform_fee || 0, req.session.userId]);
        res.status(500).json({ status: false, message: 'Terjadi kesalahan internal.' });
    }
});


async function handleMultiPulsaPurchase(e) {
    const button = e.currentTarget;
    const feedbackContainer = document.getElementById('multi-pulsa-feedback');
    if (!button || !feedbackContainer) return;

    if (!phoneAuth.accessToken) {
        showToast("Silakan verifikasi nomor Anda terlebih dahulu.", true);
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.pulsa-checkbox:checked');
    const packagesToProcess = Array.from(selectedCheckboxes).map(cb => {
        const label = cb.nextElementSibling;
        return { id: cb.dataset.packageId, name: label.querySelector('strong').textContent };
    });
    
    if (packagesToProcess.length === 0) {
        showToast("Pilih minimal satu paket untuk dieksekusi.", true);
        return;
    }

    if (!confirm(`Anda akan mengeksekusi ${packagesToProcess.length} paket. Lanjutkan?`)) return;

    button.disabled = true;
    feedbackContainer.innerHTML = `<h4>Memproses ${packagesToProcess.length} paket...</h4><ul id="realtime-log-list" class="realtime-log"></ul>`;
    const logList = document.getElementById('realtime-log-list');

    const KMSP_API_DELAY_MS = 16000;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const [index, pkg] of packagesToProcess.entries()) {
        const logItem = document.createElement('li');
        logItem.className = 'log-item-pending';
        logItem.innerHTML = `<div class="log-entry-header"><span class="log-icon">⏳</span><span>(${index + 1}/${packagesToProcess.length}) <strong>${pkg.name}</strong></span></div><div class="log-message">Mengirim...</div>`;
        logList.appendChild(logItem);
        logItem.scrollIntoView({ behavior: 'smooth', block: 'end' });

        try {
            // Frontend hanya meminta pembelian dan menunggu hasilnya dari backend
            const { data } = await apiFetch('/purchase', {
                method: 'POST',
                body: { packageId: pkg.id, phone: phoneAuth.phone, access_token: phoneAuth.accessToken, paymentMethod: 'balance' }
            });
            
            if (currentUser && typeof data.newBalance === 'number') {
                currentUser.balance = data.newBalance;
                updateBalanceUI(currentUser.balance);
            }
            
            // Tampilkan pesan sukses dari backend apa adanya
            logItem.className = 'log-item-success';
            logItem.querySelector('.log-icon').innerHTML = '✔';
            logItem.querySelector('.log-message').textContent = data.message;
            logItem.querySelector('.log-message').className = 'log-message success';

        } catch (error) {
            // Tangkap pesan error dari backend
            logItem.className = 'log-item-error';
            logItem.querySelector('.log-icon').innerHTML = '❌';
            logItem.querySelector('.log-message').textContent = error.message; // Pesan error dari backend akan berisi "Gagal (Dor Ulang)..."
            logItem.querySelector('.log-message').className = 'log-message error';
        }

        if (index < packagesToProcess.length - 1) {
            const delayMessageDiv = document.createElement('div');
            delayMessageDiv.className = 'delay-message';
            delayMessageDiv.textContent = `Menunggu jeda ${KMSP_API_DELAY_MS / 1000} detik...`;
            logItem.appendChild(delayMessageDiv);
            logItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
            await delay(KMSP_API_DELAY_MS);
        }
    }

    feedbackContainer.querySelector('h4').textContent = '✅ Semua Proses Selesai.';
    showToast('Eksekusi multi paket selesai.', false);
    button.disabled = false;
    selectedCheckboxes.forEach(cb => cb.checked = false);}

// =======================================================
// RUTE PENGGUNA
// =======================================================

app.post('/api/phone/login-saved', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Nomor telepon diperlukan." });
    try {
        const tokenResponse = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.status || !Array.isArray(tokenData.data)) throw new Error(tokenData.message || 'Gagal mengambil daftar sesi dari provider.');
        
        const relevantToken = tokenData.data.find(token => token.msisdn === phone);
        if (!relevantToken) throw new Error(`Tidak ditemukan sesi aktif untuk nomor ${phone}. Silakan verifikasi ulang dengan OTP.`);
        
        const auth_id = `${relevantToken.session_id}:${relevantToken.token}`;
        const extendResponse = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`);
        const extendData = await extendResponse.json();
        if (!extendResponse.ok || !extendData.status) throw new Error(extendData.message || 'Gagal menggunakan sesi tersimpan.');
        
        res.status(200).json({ status: true, message: "Berhasil login dengan sesi tersimpan.", data: extendData.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/auth/extend-session', isAuthenticated, async (req, res) => {
    const { phone, auth_id } = req.body;
    if (!phone || !auth_id) return res.status(400).json({ status: false, message: "Phone dan auth_id diperlukan." });
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon tidak terasosiasi dengan akun Anda." });
        
        const response = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal memperpanjang sesi dari KMSP.');
        res.status(200).json({ status: true, message: "Sesi berhasil diperpanjang.", data: data.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.get('/api/auth/token-list', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || !user.verifiedPhone) return res.status(200).json({ status: true, data: [] });
        
        const response = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const data = await response.json();
        if (!response.ok || !data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Gagal mengambil daftar token dari KMSP.');
        const filteredTokens = data.data.filter(token => token.msisdn === user.verifiedPhone);
        res.status(200).json({ status: true, message: "Daftar token berhasil diambil.", data: filteredTokens });
    } catch (error) { console.error("Error fetching token list:", error); res.status(500).json({ status: false, message: error.message }); }
});

// Tambahkan ini di bagian RUTE PENGGUNA
app.get('/api/user/financial-summary', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { startDate, endDate } = req.query;

        // Siapkan filter tanggal dan parameter terlebih dahulu
        let dateFilter = "";
        const params = [userId]; // Parameter untuk query, diawali dengan userId
        
        // Hanya tambahkan filter tanggal jika kedua tanggal tersedia
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            
            // String filter untuk ditambahkan ke query SQL
            dateFilter = "AND createdAt >= ? AND createdAt <= ?";
            
            // Tambahkan tanggal ke array parameter
            params.push(start.toISOString(), end.toISOString());
        }

        // --- BAGIAN YANG DIPERBAIKI ---
        // Sekarang, semua query (baik summary maupun detail) menggunakan filter tanggal yang sama.

        // 1. Hitung ringkasan HANYA untuk rentang tanggal yang dipilih
        const summaryTopup = await dbGet(`SELECT SUM(baseAmount) as total FROM topups WHERE userId = ? AND status = 'completed' ${dateFilter}`, params);
        const summarySpending = await dbGet(`SELECT SUM(platformFee) as total FROM transactions WHERE userId = ? AND status = 'success' ${dateFilter}`, params);
        
        // 2. Ambil detail aktivitas HANYA untuk rentang tanggal yang dipilih
        const topupsDetails = await dbAll(`SELECT id, createdAt, baseAmount, status FROM topups WHERE userId = ? AND status = 'completed' ${dateFilter}`, params);
        const purchasesDetails = await dbAll(`SELECT id, createdAt, packageName, platformFee, status FROM transactions WHERE userId = ? AND status = 'success' ${dateFilter}`, params);
        // --- AKHIR BAGIAN PERBAIKAN ---

        let combinedDetails = [];
        topupsDetails.forEach(t => {
            combinedDetails.push({
                createdAt: t.createdAt,
                type: 'Top Up',
                description: t.id.startsWith('TU-ADMIN-') ? 'Top Up Saldo oleh Admin' : 'Top Up Saldo via QRIS',
                amount: t.baseAmount
            });
        });
        purchasesDetails.forEach(p => {
            combinedDetails.push({
                createdAt: p.createdAt,
                type: 'Pembelian',
                description: p.packageName,
                amount: -Math.abs(p.platformFee)
            });
        });

        combinedDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            status: true,
            data: {
                summary: {
                    totalTopup: summaryTopup.total || 0,
                    totalSpending: summarySpending.total || 0,
                },
                details: combinedDetails
            }
        });

    } catch (error) {
        console.error("Error fetching financial summary:", error);
        res.status(500).json({ status: false, message: 'Gagal mengambil data laporan.' });
    }
});
app.get('/api/user/active-packages', isAuthenticated, async (req, res) => {
    const { access_token } = req.query;
    if (!access_token) return res.status(400).json({ status: false, message: "Parameter access_token diperlukan." });
    try {
        const url = `https://golang-openapi-quotadetails-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&access_token=${access_token}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal mengambil data paket aktif dari provider.');
        res.status(200).json(data);
    } catch (error) {
        console.error("Error checking active packages:", error.message);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan pada server." });
    }
});

// Tambahkan ini di bagian mana saja (bisa sebelum atau sesudah rute admin)
app.get('/api/status', isAuthenticated, async (req, res) => {
    try {
        const maintenanceRow = await dbGet("SELECT value FROM settings WHERE key = 'maintenanceMode'");
        const maintenanceMode = maintenanceRow ? JSON.parse(maintenanceRow.value) : false;
        const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
        res.status(200).json({ status: true, maintenanceMode, currentBalance: user ? user.balance : null });
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil status." });
    }
});

app.get('/api/user/packages', isAuthenticated, async (req, res) => {
    try {
        const packages = await dbAll('SELECT * FROM packages WHERE isVisible = 1 ORDER BY name ASC');
        res.status(200).json({ status: true, data: packages });
    } catch(e) { res.status(500).json({status: false, message: "Gagal memuat paket."})}
});
app.get('/api/user/transactions', isAuthenticated, async (req, res) => {
    try {
        const purchases = await dbAll('SELECT *, "purchase" as type FROM transactions WHERE userId = ?', [req.session.userId]);
        const topups = await dbAll('SELECT *, "topup" as type FROM topups WHERE userId = ?', [req.session.userId]);
        
        const allActivities = [...purchases, ...topups].map(item => {
            // Logika untuk Top Up
            if (item.type === 'topup') {
                // Beri deskripsi yang lebih baik untuk top up dari admin
                let topupDescription = 'Top Up via QRIS'; // Default
                if (item.id.startsWith('TU-ADMIN-')) {
                    topupDescription = 'Top Up Saldo oleh Admin';
                }

                return {
                    id: item.id,
                    userId: item.userId,
                    type: 'topup',
                    status: item.status,
                    createdAt: item.createdAt,
                    baseAmount: item.baseAmount,
                    uniqueAmount: item.uniqueAmount,
                    // Kita "pinjam" field packageName untuk deskripsi agar mudah di frontend
                    packageName: topupDescription, 
                    qrisData: item.qrisBase64Image ? { base64Image: item.qrisBase64Image, uniqueAmount: item.uniqueAmount } : undefined,
                    api_response: `Top up ${item.status}`
                };
            }
            // Untuk tipe 'purchase', kembalikan apa adanya
            return item;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.status(200).json({ status: true, data: allActivities });
    } catch (error) {
        console.error("Error fetching user transactions:", error);
        res.status(500).json({ status: false, message: 'Gagal mengambil riwayat aktivitas.' });
    }
});

app.get('/api/packages/stock/:packageId', isAuthenticated, async (req, res) => {
    const { packageId } = req.params;
    if (!packageId || packageId === "undefined") {
        return res.status(400).json({ status: false, message: "Package ID tidak valid." });
    }
    try {
        const url = `https://golang-openapi-checkpackagestock-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&package_id=${packageId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.status || !data.data) {
            throw new Error(data.message || 'Gagal mengambil data stok dari provider.');
        }
        const stockValue = data.data.is_out_of_stock ? 0 : (data.data.real_stock_from_suppliers || data.data.real_stock || 0);
        res.status(200).json({
            status: true,
            message: "Success",
            data: { stock: stockValue }
        });
    } catch (error) {
        console.error("Error checking package stock:", error.message);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan." });
    }
});

// Tambahkan ini di bagian Rute Admin
app.get('/api/admin/kmsp-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const balance = await getKmspAdminBalance();
        res.status(200).json({ status: true, data: { balance } });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal terhubung ke KMSP." });
    }
});

app.post('/api/user/change-password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ status: false, message: 'Password tidak valid.' });
    try {
        const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ status: false, message: 'Password saat ini salah.' });
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.session.userId]);
        res.status(200).json({ status: true, message: 'Password berhasil diubah.' });
    } catch (error) { console.error("Change password error:", error); res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server.' }); }
});

app.post('/api/user/update-profile', isAuthenticated, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ status: false, message: 'Nama tidak boleh kosong.' });
    try {
        await dbRun('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.session.userId]);
        const updatedUser = await dbGet('SELECT id, name, email, balance, role, status FROM users WHERE id = ?', [req.session.userId]);
        res.status(200).json({ status: true, message: 'Nama berhasil diperbarui.', user: updatedUser });
    } catch (error) { console.error("Update profile error:", error); res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server.' }); }
});

app.get('/api/user/announcement', isAuthenticated, async (req, res) => {
    try {
        const announcement = await dbGet("SELECT * FROM announcements ORDER BY createdAt DESC LIMIT 1");
        res.json({ status: true, data: announcement || null });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal memuat pengumuman."}) }
});

// =======================================================
// RUTE TOP UP SALDO
// =======================================================
const qrisPollingTimeouts = new Map();

async function generateDynamicQris(amount) {
    try {
        if (!QRIS_STATIS_STRING) throw new Error("QRIS_STATIS_STRING tidak dikonfigurasi.");
        const response = await axios.post('https://qrisku.my.id/api', { amount: amount.toString(), qris_statis: QRIS_STATIS_STRING }, { timeout: 15000 });
        console.log("[generateDynamicQris] Response from qrisku.my.id:", response.data);
        if (response.data?.status === 'success' && response.data.qris_base64) return `data:image/png;base64,${response.data.qris_base64}`;
        throw new Error(response.data?.message || 'Gagal menghasilkan QRIS dari API external.');
    } catch (error) { console.error(`[QRIS_GEN_ERROR]`, error.message); throw new Error(error.response?.data?.message || 'Gagal menghubungi layanan pembuat QRIS.'); }
}
// Ganti seluruh fungsi checkOrkutPaymentStatus dengan versi final ini:

async function checkOrkutPaymentStatus(topUpId, uniqueAmount) {
    if (!ORKUT_MERCHANT_ID || !ORKUT_USERNAME || !ORKUT_TOKEN) {
        return console.error("[ORKUT_POLL_CONFIG_ERROR] Konfigurasi ORKUT tidak lengkap.");
    }
    
    const url = `https://qris.payment.web.id/payment/qris/${ORKUT_MERCHANT_ID}`;
    const maxDurationMs = 15 * 60 * 1000;
    const interval = 15000;

    const pollingLoop = async () => {
        try {
            const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [topUpId]);
            if (!topUp || topUp.status !== 'pending') {
                qrisPollingTimeouts.delete(topUpId);
                return;
            }

            const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [topUpId]);
                qrisPollingTimeouts.delete(topUpId);
                console.log(`[ORKUT_POLL] Top-up ${topUpId} telah kedaluwarsa.`);
                return;
            }

            console.log(`[ORKUT_POLL] Mengecek mutasi untuk jumlah: ${uniqueAmount}`);
            
            const response = await axios.post(url, {
                username: ORKUT_USERNAME,
                token: ORKUT_TOKEN
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
            
            if (response.data && Array.isArray(response.data.data)) {
                const paymentFound = response.data.data.find(item => 
                    (item.type === 'CR' || item.tipe === 'CR') && parseFloat(item.nominal || item.amount) === parseFloat(uniqueAmount)
                );

                if (paymentFound) {
                    await dbRun("BEGIN TRANSACTION");
                    const result = await dbRun("UPDATE topups SET status = 'completed' WHERE id = ? AND status = 'pending'", [topUpId]);
                    
                    if (result.changes > 0) {
                        await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [topUp.baseAmount, topUp.userId]);
                        await dbRun("COMMIT");

                        // --- BARIS YANG HILANG, SEKARANG DITAMBAHKAN KEMBALI ---
                        const user = await dbGet("SELECT name FROM users WHERE id = ?", [topUp.userId]);
                        await sendTelegramNotification(
`<b>──────────────────────</b>
<b>💰 Top Up Berhasil (ORKUT)!</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user.name}
<b>Jumlah Masuk:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}
<b>ID Transaksi:</b> <code>${topUpId}</code>
<b>──────────────────────</b>
<b>Notif:tembak.cloudrystore.com</b>`
                        );
                        console.log(`[ORKUT_POLL] Saldo dan notifikasi untuk ${user.name} berhasil diproses.`);
                        // --- AKHIR BARIS YANG DITAMBAHKAN ---

                    } else {
                        await dbRun("ROLLBACK");
                    }
                    qrisPollingTimeouts.delete(topUpId);
                    return;
                }
            }
        } catch (error) {
            console.error(`[ORKUT_POLL_ERROR] Gagal saat polling untuk ${topUpId}:`, error.message);
        }
        
        const timeoutId = setTimeout(pollingLoop, interval);
        qrisPollingTimeouts.set(topUpId, timeoutId);
    };

    if (!qrisPollingTimeouts.has(topUpId)) {
        qrisPollingTimeouts.set(topUpId, setTimeout(pollingLoop, 5000));
    }
}

app.get('/api/topup/status/:topUpId', isAuthenticated, async (req, res) => {
    try {
        const { topUpId } = req.params;
        const topUp = await dbGet("SELECT status FROM topups WHERE id = ? AND userId = ?", [topUpId, req.session.userId]);
        if (!topUp) return res.status(404).json({ status: false, message: 'Transaksi top-up tidak ditemukan.' });
        res.status(200).json({ status: true, transactionStatus: topUp.status });
    } catch (error) { console.error("[TOPUP_STATUS_ERROR]", error); res.status(500).json({ status: false, message: "Gagal memeriksa status." }); }
});

// Ganti seluruh rute /api/topup/request-qris dengan versi final ini

app.post('/api/topup/request-qris', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const userId = req.session.userId;
    const baseAmount = parseInt(amount, 10);

    if (!baseAmount || baseAmount < 5000) {
        return res.status(400).json({ status: false, message: 'Jumlah top-up minimal adalah Rp 5.000.' });
    }

    try {
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        }

        // --- LOGIKA BARU YANG DIPERBAIKI ---
        // 1. Secara otomatis batalkan permintaan top-up lama yang masih 'pending'.
        await dbRun("UPDATE topups SET status = 'canceled' WHERE userId = ? AND status = 'pending'", [userId]);
        console.log(`[TopUp] Membatalkan top-up lama yang pending untuk user: ${userId}`);

        // 2. Lanjutkan untuk membuat permintaan top-up yang baru.
        const uniqueCode = Math.floor(Math.random() * 900) + 100;
        const uniqueAmount = baseAmount + uniqueCode;
        const qrisBase64Image = await generateDynamicQris(uniqueAmount);
        const topUpId = `TU-${Date.now()}`;
        
        await dbRun("INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [topUpId, req.session.userId, user.name, baseAmount, uniqueAmount, 'pending', new Date().toISOString(), qrisBase64Image]);
        
        // Mulai polling untuk transaksi baru ini
        checkOrkutPaymentStatus(topUpId, uniqueAmount);

        res.status(200).json({
            status: true,
            message: 'Silakan scan QRIS dan transfer sesuai jumlah unik.',
            topUpId,
            qrisData: { base64Image: qrisBase64Image, uniqueAmount, expiresAt: Math.floor((Date.now() + 15 * 60 * 1000) / 1000) }
        });

    } catch (error) {
        console.error("[REQUEST_QRIS_ERROR]", error);
        res.status(500).json({ status: false, message: error.message || 'Gagal membuat permintaan top-up.' });
    }
});

app.post('/api/topup/cancel', isAuthenticated, async (req, res) => {
    try {
        const pendingTopUp = await dbGet("SELECT id FROM topups WHERE userId = ? AND status = 'pending'", [req.session.userId]);
        if (!pendingTopUp) return res.status(404).json({ status: false, message: 'Tidak ada transaksi top-up aktif untuk dibatalkan.' });
        const timeoutId = qrisPollingTimeouts.get(pendingTopUp.id);
        if (timeoutId) { clearTimeout(timeoutId); qrisPollingTimeouts.delete(pendingTopUp.id); }
        await dbRun("UPDATE topups SET status = 'canceled' WHERE id = ?", [pendingTopUp.id]);
        res.status(200).json({ status: true, message: 'Permintaan top-up berhasil dibatalkan.' });
    } catch (error) { console.error("[CANCEL_QRIS_ERROR]", error); res.status(500).json({ status: false, message: 'Gagal membatalkan transaksi.' }); }
});

// =======================================================
// RUTE ADMIN
// =======================================================
app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, name, email, balance, role, status, createdAt, verifiedPhone FROM users ORDER BY createdAt DESC');
        res.status(200).json({ status: true, data: users });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal mengambil data pengguna." }) }
});

app.post('/api/admin/update-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount) || parsedAmount === 0) {
            return res.status(400).json({ status: false, message: "Input tidak valid atau jumlah adalah nol." });
        }

        // Dapatkan data user target dan admin yang melakukan aksi SEBELUM update
        const targetUser = await dbGet('SELECT name, balance FROM users WHERE id = ?', [userId]);
        if (!targetUser) {
            return res.status(404).json({ status: false, message: "Pengguna target tidak ditemukan." });
        }
        const adminUser = await dbGet('SELECT name FROM users WHERE id = ?', [req.session.userId]);

        // Lakukan update saldo
        const result = await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [parsedAmount, userId]);
        if (result.changes === 0) {
            return res.status(404).json({ status: false, message: "Gagal update, pengguna tidak ditemukan." });
        }

        // Dapatkan saldo TERBARU setelah update
        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [userId]);

        // === LOGIKA BARU: HANYA JIKA SALDO DITAMBAH (TOP UP) ===
        if (parsedAmount > 0) {
            const topUpId = `TU-ADMIN-${Date.now()}`;
            // Buat catatan di tabel topups
            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, targetUser.name, parsedAmount, parsedAmount, 'completed', new Date().toISOString()]
            );

            // Kirim notifikasi ke grup Telegram
            const notifMessage = `<b>✅ Top Up Manual Berhasil</b>
──────────────────────
👨‍💼 <b>Oleh Admin:</b> ${adminUser.name}
👤 <b>Untuk Pengguna:</b> ${targetUser.name}
💰 <b>Jumlah:</b> Rp ${parsedAmount.toLocaleString('id-ID')}
📈 <b>Saldo Baru:</b> Rp ${updatedUser.balance.toLocaleString('id-ID')}
──────────────────────
<b>Notif:tembak.cloudrystore.com</b>`;
            
            sendTelegramNotification(notifMessage, 'group'); // 'group' untuk channel umum, 'admin' untuk channel admin
        }
        // === AKHIR LOGIKA BARU ===

        res.status(200).json({ status: true, message: `Saldo ${targetUser.name} berhasil diubah. Saldo baru: Rp ${updatedUser.balance.toLocaleString('id-ID')}` });

    } catch (error) {
        console.error("Error updating balance by admin:", error);
        res.status(500).json({ status: false, message: "Gagal memperbarui saldo." });
    }
});

app.post('/api/admin/approve-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
    try {
        const userToApprove = await dbGet("SELECT email, name FROM users WHERE id = ?", [userId]);
        if (!userToApprove) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });

        const result = await dbRun('UPDATE users SET status = ? WHERE id = ? AND status = ?', ['approved', userId, 'pending']);
        if (result.changes === 0) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan atau sudah disetujui." });
        
        // --- FORMAT PESAN ASLI ANDA ---
        const adminUser = await dbGet("SELECT name FROM users WHERE id = ?", [req.session.userId]);
        const adminName = adminUser ? adminUser.name : 'Sistem';

        sendTelegramNotification(
`<b>✅ Persetujuan Pengguna Berhasil</b>
──────────────────────
👤 <b>Pengguna:</b> ${userToApprove.name} (${userToApprove.email})
👨‍💼 <b>Disetujui oleh:</b> Admin ${adminName}
⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        );
        
        res.status(200).json({ status: true, message: `Pengguna ${userToApprove.name} berhasil disetujui.` });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal menyetujui pengguna." }) }
});

app.post('/api/admin/reject-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if(!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        await dbRun('DELETE FROM users WHERE id = ?', [userId]);
        res.status(200).json({ status: true, message: `Pengguna ${user.name} berhasil ditolak dan dihapus.` });
    } catch (error) { console.error("Error rejecting user:", error); res.status(500).json({ status: false, message: "Gagal menolak pengguna." }); }
});

app.post('/api/admin/delete-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
    if (req.session.userId === userId) return res.status(400).json({ status: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
    try {
        const result = await dbRun("DELETE FROM users WHERE id = ?", [userId]);
        if (result.changes === 0) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        res.json({ status: true, message: "Akun pengguna dan seluruh data terkait berhasil dihapus." });
    } catch(e) { res.status(500).json({ status: false, message: "Gagal menghapus pengguna." }); }
});

app.get('/api/admin/backup-database', isAuthenticated, isAdmin, (req, res) => {
    res.download(dbPath, 'backup-dbWeb.sqlite', (err) => {
        if (err) {
            console.error("Error downloading database:", err);
            if (!res.headersSent) res.status(500).json({ status: false, message: "Tidak dapat mengunduh database." });
        }
    });
});

app.post('/api/admin/restore-database', isAuthenticated, isAdmin, dbBackupUpload.single('dbFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: false, message: 'Tidak ada file yang diunggah.' });
    
    const tempPath = req.file.path;
    db.close(err => {
        if (err) {
            console.error("Error closing current DB:", err);
            return res.status(500).json({ status: false, message: "Gagal menutup database saat ini."});
        }
        fs.rename(tempPath, dbPath, (err) => {
            if (err) {
                console.error("Error replacing DB file:", err);
                return res.status(500).json({ status: false, message: "Gagal mengganti file database." });
            }
            res.json({ status: true, message: 'Database berhasil di-restore! Aplikasi akan otomatis restart untuk menerapkan perubahan.' });
            // Gunakan PM2 atau nodemon untuk auto-restart
            process.exit(1); 
        });
    });
});

app.get('/api/admin/transactions', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const allTransactions = await dbAll("SELECT * FROM transactions ORDER BY createdAt DESC");
        res.status(200).json({ status: true, data: allTransactions });
    } catch (error) { console.error("Error fetching all transactions:", error); res.status(500).json({ status: false, message: 'Gagal mengambil data transaksi.' }); }
});

app.post('/api/admin/transactions/:id/cancel', isAuthenticated, isAdmin, async (req, res) => {
    const { id: transactionId } = req.params;
    try {
        const transaction = await dbGet("SELECT * FROM transactions WHERE id = ? AND status = 'menunggu_saldo_provider'", [transactionId]);
        if (!transaction) return res.status(404).json({ status: false, message: 'Transaksi tidak ditemukan atau tidak bisa dibatalkan.' });
        
        await dbRun("BEGIN TRANSACTION");
        if(transaction.platformFee > 0) await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [transaction.platformFee, transaction.userId]);
        await dbRun("UPDATE transactions SET status = 'canceled', api_response = 'Dibatalkan oleh Admin' WHERE id = ?", [transactionId]);
        await dbRun("COMMIT");

        res.status(200).json({ status: true, message: 'Transaksi berhasil dibatalkan dan biaya layanan telah dikembalikan.' });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error("Error canceling transaction:", error);
        res.status(500).json({ status: false, message: "Gagal membatalkan transaksi." });
    }
});

app.get('/api/admin/detailed-stats', isAuthenticated, isAdmin, async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ status: false, message: 'Parameter tanggal diperlukan.' });
    try {
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);
        
        const successfulTransactions = await dbAll("SELECT platformFee, originalPrice FROM transactions WHERE status = 'success' AND createdAt >= ? AND createdAt <= ?", [start.toISOString(), end.toISOString()]);
        
        const totalNetRevenue = successfulTransactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const totalGrossRevenue = successfulTransactions.reduce((sum, t) => sum + (t.originalPrice || 0), 0);
        
        res.json({ status: true, data: {
            totalSuccessfulTransactions: successfulTransactions.length,
            totalNetRevenue,
            totalGrossRevenue,
            totalRevenue: totalGrossRevenue + totalNetRevenue,
            avgNetRevenuePerTrx: successfulTransactions.length > 0 ? totalNetRevenue / successfulTransactions.length : 0,
        }});
    } catch (error) { console.error("Error fetching detailed stats:", error); res.status(500).json({ status: false, message: "Gagal mengambil statistik." }); }
});

app.get('/api/admin/download-report', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).send('Tanggal tidak lengkap');
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);
        const transactionsToExport = await dbAll("SELECT * FROM transactions WHERE status = 'success' AND createdAt >= ? AND createdAt <= ?", [start.toISOString(), end.toISOString()]);
        
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet(`Laporan`);
        worksheet.columns = [
            { header: 'Tanggal', key: 'createdAt', width: 20 },
            { header: 'Nama Pengguna', key: 'userName', width: 30 },
            { header: 'Nama Paket', key: 'packageName', width: 40 },
            { header: 'Harga Pokok (Rp)', key: 'originalPrice', width: 20, style: { numFmt: '#,##0' } },
            { header: 'Laba/Fee (Rp)', key: 'platformFee', width: 20, style: { numFmt: '#,##0' } },
            { header: 'Total (Rp)', key: 'total', width: 20, style: { numFmt: '#,##0' } },
        ];
        let totalPokok = 0, totalLaba = 0;
        transactionsToExport.forEach(trx => {
            const hargaPokok = trx.originalPrice || 0;
            const laba = trx.platformFee || 0;
            totalPokok += hargaPokok;
            totalLaba += laba;
            worksheet.addRow({ createdAt: new Date(trx.createdAt).toLocaleString('id-ID'), userName: trx.userName, packageName: trx.packageName, originalPrice: hargaPokok, platformFee: laba, total: hargaPokok + laba });
        });
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(['TOTAL', '', '', totalPokok, totalLaba, totalPokok + totalLaba]);
        totalRow.font = { bold: true };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Laporan-${startDate}-sd-${endDate}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) { console.error("Error generating report:", error); res.status(500).send("Gagal membuat laporan"); }
});

app.get('/api/admin/statistics', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const revenueTodayRes = await dbGet("SELECT SUM(platformFee) as total FROM transactions WHERE status = 'success' AND createdAt >= ?", [todayStart]);
        const transactionsTodayRes = await dbGet("SELECT COUNT(id) as total FROM transactions WHERE createdAt >= ?", [todayStart]);
        const newUsersRes = await dbGet("SELECT COUNT(id) as total FROM users WHERE createdAt >= ?", [sevenDaysAgo]);
        const topPackagesRes = await dbAll("SELECT packageName, COUNT(id) as count FROM transactions WHERE status = 'success' GROUP BY packageName ORDER BY count DESC LIMIT 5");

        res.status(200).json({
            status: true, data: {
                revenueToday: revenueTodayRes.total || 0,
                transactionsTodayCount: transactionsTodayRes.total || 0,
                newUsersThisWeek: newUsersRes.total || 0,
                topPackages: topPackagesRes
            }
        });
    } catch (error) { console.error("Error fetching statistics:", error); res.status(500).json({ status: false, message: "Gagal mengambil data statistik." }); }
});

async function renderRekeningKoranPage(container) {
    // Set tanggal default: 30 hari terakhir
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
    const defaultEndDate = today.toISOString().split('T')[0];

    container.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1>Laporan Keuangan Anda</h1>
                <p>Lihat ringkasan dan rincian semua aktivitas keuangan di akun Anda.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Saldo Masuk (Top Up)</h4>
                    <p id="summary-total-topup" class="amount-credit">Memuat...</p>
                </div>
                <div class="stat-card">
                    <h4>Total Saldo Keluar (Fee)</h4>
                    <p id="summary-total-spending" class="amount-debit">Memuat...</p>
                </div>
            </div>

            <div class="page-content" style="margin-top: 2rem;">
                <h3>Rincian Aktivitas</h3>
                <div class="filter-controls" style="margin-bottom: 1.5rem;">
                    <div class="form-group">
                        <label for="start-date">Dari Tanggal</label>
                        <input type="date" id="start-date" value="${defaultStartDate}">
                    </div>
                    <div class="form-group">
                        <label for="end-date">Sampai Tanggal</label>
                        <input type="date" id="end-date" value="${defaultEndDate}">
                    </div>
                    <button id="filter-report-btn">Tampilkan</button>
                </div>
                <div id="detailed-report-container">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
    `;

    const fetchAndDisplayReport = async () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const reportContainer = document.getElementById('detailed-report-container');
        const topupSummaryEl = document.getElementById('summary-total-topup');
        const spendingSummaryEl = document.getElementById('summary-total-spending');
        
        // Tampilkan loading spinner
        reportContainer.innerHTML = '<div class="loading-spinner"></div>';
        topupSummaryEl.textContent = 'Memuat...';
        spendingSummaryEl.textContent = 'Memuat...';

        try {
            const { data } = await apiFetch(`/user/financial-summary?startDate=${startDate}&endDate=${endDate}`);
            if (!data.status) throw new Error(data.message);

            const summary = data.data.summary;
            const details = data.data.details;

            // Isi kartu ringkasan
            topupSummaryEl.textContent = `Rp ${summary.totalTopup.toLocaleString('id-ID')}`;
            spendingSummaryEl.textContent = `Rp ${summary.totalSpending.toLocaleString('id-ID')}`;

            // Buat tabel rincian
            if (details.length === 0) {
                reportContainer.innerHTML = '<p>Tidak ada aktivitas pada rentang tanggal yang dipilih.</p>';
                return;
            }

            const tableRows = details.map(item => {
                const isCredit = item.amount > 0;
                const amountClass = isCredit ? 'amount-credit' : 'amount-debit';
                const amountSign = isCredit ? '+' : '-';
                
                return `
                    <tr>
                        <td data-label="Tanggal">${new Date(item.createdAt).toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</td>
                        <td data-label="Tipe">${item.type}</td>
                        <td data-label="Deskripsi">${item.description}</td>
                        <td data-label="Jumlah" class="${amountClass}">
                            <strong>${amountSign} Rp ${Math.abs(item.amount).toLocaleString('id-ID')}</strong>
                        </td>
                    </tr>
                `;
            }).join('');

            reportContainer.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Waktu</th>
                            <th>Tipe</th>
                            <th>Deskripsi</th>
                            <th>Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            `;

        } catch (error) {
            reportContainer.innerHTML = `<p class="error-message">Gagal memuat laporan: ${error.message}</p>`;
            topupSummaryEl.textContent = 'Error';
            spendingSummaryEl.textContent = 'Error';
        }
    };

    // Pasang event listener dan panggil pertama kali
    document.getElementById('filter-report-btn').addEventListener('click', fetchAndDisplayReport);
    fetchAndDisplayReport();
}

app.get('/api/admin/maintenance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'maintenanceMode'");
        res.status(200).json({ status: true, data: { enabled: row ? JSON.parse(row.value) : false } });
    } catch (e) { res.status(500).json({status: false, message: 'Gagal membaca status.'}) }
});

app.post('/api/admin/maintenance', isAuthenticated, isAdmin, async (req, res) => {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') return res.status(400).json({ status: false, message: 'Input harus boolean.' });
    try {
        await dbRun("UPDATE settings SET value = ? WHERE key = ?", [JSON.stringify(enable), 'maintenanceMode']);
        res.status(200).json({ status: true, message: `Mode pemeliharaan diatur ke: ${enable ? 'AKTIF' : 'NONAKTIF'}` });
    } catch (e) { res.status(500).json({ status: false, message: 'Gagal memperbarui status.' }) }
});

app.post('/api/admin/sync-packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const response = await fetch(`https://golang-openapi-packagelist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const kmspData = await response.json();
        if (!kmspData.status || !Array.isArray(kmspData.data)) throw new Error(kmspData.message || "Gagal mengambil data dari KMSP.");

        const kmspPackages = new Map(kmspData.data.map(p => [p.package_code, p]));
        const localPackages = await dbAll('SELECT package_code FROM packages');
        const localPackageCodes = new Set(localPackages.map(p => p.package_code));
        let added = 0, updated = 0, removed = 0;

        await dbRun("BEGIN TRANSACTION");
        for (const [code, pkg] of kmspPackages.entries()) {
            const price = (parseInt(String(pkg.package_harga).replace(/\D/g, '')) || 0) / 100;
            const methods = JSON.stringify(pkg.available_payment_methods || []);
            if (localPackageCodes.has(code)) {
                await dbRun('UPDATE packages SET name = ?, description = ?, original_price = ?, payment_methods = ? WHERE package_code = ?', [pkg.package_name, pkg.package_description || '', price, methods, code]);
                updated++;
            } else {
                await dbRun('INSERT INTO packages (package_code, name, description, original_price, platform_fee, isVisible, category, isMultiPurchase, payment_methods) VALUES (?, ?, ?, ?, 0, 0, "reguler", 0, ?)', [code, pkg.package_name, pkg.package_description || '', price, methods]);
                added++;
            }
        }
        for (const localCode of localPackageCodes) {
            if (!kmspPackages.has(localCode)) {
                await dbRun('DELETE FROM packages WHERE package_code = ?', [localCode]);
                removed++;
            }
        }
        await dbRun("COMMIT");
        res.status(200).json({ status: true, message: `Sinkronisasi berhasil! ${added} ditambah, ${updated} diperbarui, ${removed} dihapus.` });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error("Sync packages error:", error);
        res.status(500).json({ status: false, message: error.message || "Gagal sinkronisasi paket." });
    }
});

app.get('/api/admin/packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const packages = await dbAll('SELECT * FROM packages ORDER BY name ASC');
        const processed = packages.map(p => ({ ...p, isVisible: p.isVisible === 1, isMultiPurchase: p.isMultiPurchase === 1, payment_methods: p.payment_methods ? JSON.parse(p.payment_methods) : [] }));
        res.status(200).json({ status: true, data: processed });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal mengambil data paket." }) }
});

app.put('/api/admin/packages/bulk-update', isAuthenticated, isAdmin, async (req, res) => {
    const { packages } = req.body;
    if (!Array.isArray(packages)) return res.status(400).json({ status: false, message: "Format data tidak valid." });
    try {
        await dbRun("BEGIN TRANSACTION");
        for (const update of packages) {
            await dbRun(`UPDATE packages SET platform_fee = ?, isVisible = ?, isMultiPurchase = ?, category = ? WHERE package_code = ?`,
                [update.platform_fee || 0, update.isVisible ? 1 : 0, update.isMultiPurchase ? 1 : 0, ['reguler', 'non-otp'].includes(update.category) ? update.category : 'reguler', update.package_code]
            );
        }
        await dbRun("COMMIT");
        res.status(200).json({ status: true, message: `Perubahan paket berhasil disimpan!` });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error("Error bulk updating packages:", error);
        res.status(500).json({ status: false, message: "Gagal menyimpan perubahan." });
    }
});

app.get('/api/admin/user-logs/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await dbGet("SELECT id, name, email, balance, role, status FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        const logs = await dbAll("SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC", [userId]);
        res.status(200).json({ status: true, data: { user, logs } });
    } catch (error) { console.error("Error fetching user logs:", error); res.status(500).json({ status: false, message: 'Gagal mengambil log pengguna.' }); }
});

app.get('/api/admin/topup-options', isAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'topupOptions'");
        res.status(200).json({ status: true, data: row ? JSON.parse(row.value) : [] });
    } catch (e) { res.status(500).json({ status: false, message: 'Gagal membaca pengaturan.' }) }
});

app.put('/api/admin/topup-options', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { options } = req.body;
        if (!Array.isArray(options)) return res.status(400).json({ status: false, message: "Format data harus array." });
        const validatedOptions = options.map(opt => ({ value: parseInt(opt.value, 10), label: `Rp ${parseInt(opt.value, 10).toLocaleString('id-ID')}` })).filter(opt => !isNaN(opt.value) && opt.value > 0);
        await dbRun("UPDATE settings SET value = ? WHERE key = 'topupOptions'", [JSON.stringify(validatedOptions)]);
        res.status(200).json({ status: true, message: 'Daftar nominal top-up berhasil disimpan!' });
    } catch (error) { console.error("Error saving topup options:", error); res.status(500).json({ status: false, message: "Gagal menyimpan nominal." }); }
});

app.post('/api/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim() === '') return res.status(400).json({ status: false, message: 'Pesan tidak boleh kosong.' });
    try {
        await dbRun("DELETE FROM announcements"); // Hanya simpan 1 pengumuman
        await dbRun("INSERT INTO announcements (id, message, createdAt) VALUES (?, ?, ?)", [`ann_${Date.now()}`, message.trim(), new Date().toISOString()]);
        res.json({ status: true, message: 'Pengumuman berhasil dikirim.' });
    } catch(e) { res.status(500).json({ status: false, message: "Gagal mengirim pengumuman." }) }
});


// =======================================================
// RUTE KONTEN TUTORIAL
// =======================================================
app.get('/api/tutorial-content', isAuthenticated, async (req, res) => {
    try {
        const tutorials = await dbAll("SELECT id, title, description FROM tutorialContent ORDER BY position ASC");
        res.json({ status: true, data: tutorials });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal memuat daftar tutorial." }); }
});

app.get('/api/tutorial-content/:id', isAuthenticated, async (req, res) => {
    try {
        const tutorial = await dbGet("SELECT * FROM tutorialContent WHERE id = ?", [req.params.id]);
        if (!tutorial) return res.status(404).json({ status: false, message: "Tutorial tidak ditemukan." });
        if(tutorial.content) tutorial.content = JSON.parse(tutorial.content);
        res.json({ status: true, data: tutorial });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal memuat detail tutorial." }); }
});

app.put('/api/admin/tutorial-content', isAuthenticated, isAdmin, handleUploadErrors, async (req, res) => {
    try {
        const { tutorialId, title, description, content } = req.body;
        if (!title || !content) return res.status(400).json({ status: false, message: "Judul dan konten wajib diisi." });

        let parsedContent;
        try { parsedContent = JSON.parse(content); } catch (e) { return res.status(400).json({ status: false, message: "Format konten tidak valid." }); }

        const uploadedFilesMap = new Map(req.files?.map(file => [file.originalname, `/public/uploads/${file.filename}`]) || []);
        const finalContentBlocks = parsedContent.map(block => uploadedFilesMap.has(block.content) ? { ...block, content: uploadedFilesMap.get(block.content) } : block);
        const finalContentJson = JSON.stringify(finalContentBlocks);
        
        if (tutorialId) {
            await dbRun("UPDATE tutorialContent SET title = ?, description = ?, content = ?, updatedAt = ? WHERE id = ?", [title, description, finalContentJson, new Date().toISOString(), tutorialId]);
        } else {
            const newId = `tut_${Date.now()}`;
            const now = new Date().toISOString();
            await dbRun("INSERT INTO tutorialContent (id, title, description, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [newId, title, description, finalContentJson, now, now]);
        }
        res.json({ status: true, message: "Konten tutorial berhasil disimpan!" });
    } catch (error) { console.error("Error saving tutorial:", error); res.status(500).json({ status: false, message: "Gagal menyimpan konten tutorial." }); }
});

app.delete('/api/admin/tutorial-content/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await dbRun("DELETE FROM tutorialContent WHERE id = ?", [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ status: false, message: "Tutorial tidak ditemukan." });
        res.json({ status: true, message: "Tutorial berhasil dihapus." });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal menghapus tutorial." }); }
});

app.put('/api/admin/tutorial-content/reorder', isAuthenticated, isAdmin, async (req, res) => {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ status: false, message: "Data urutan tidak valid." });
    try {
        await dbRun("BEGIN TRANSACTION");
        for (const [index, id] of order.entries()) {
            await dbRun("UPDATE tutorialContent SET position = ? WHERE id = ?", [index, id]);
        }
        await dbRun("COMMIT");
        res.json({ status: true, message: "Urutan tutorial berhasil disimpan." });
    } catch (error) {
        await dbRun("ROLLBACK");
        console.error("Error reordering tutorials:", error);
        res.status(500).json({ status: false, message: "Gagal menyimpan urutan." });
    }
});

// =======================================================
// SCHEDULER OTOMATIS
// =======================================================
async function executePurchase(trx, isOtp) {
    // Persiapan parameter untuk dikirim ke API KMSP
    const params = { api_key: KMSP_API_KEY, package_code: trx.packageId, phone: trx.targetPhone, payment_method: isOtp ? trx.paymentMethod : 'balance', price_or_fee: trx.originalPrice };
    if (isOtp) params.access_token = trx.accessToken;

    const url = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${new URLSearchParams(params).toString()}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const success = response.ok && data.status;
        let paymentDetails = null;

        // =========================================================================
        // ### BAGIAN PENTING YANG MEMPERBAIKI MASALAH ###
        // Logika ini ditambahkan untuk menangkap dan menyimpan detail pembayaran (deeplink/QRIS)
        // yang diterima setelah transaksi dari antrean berhasil diproses.
        // =========================================================================
        if (success && data.data && (data.data.is_qris || data.data.have_deeplink)) {
            // Jika pembayaran berupa QRIS, generate gambar Base64-nya
            if (data.data.is_qris && data.data.qris_data?.qr_code) {
                data.data.qris_data.qr_code_base64 = await qrcode.toDataURL(data.data.qris_data.qr_code);
            }
            // Ubah objek detail pembayaran menjadi string JSON untuk disimpan di database
            paymentDetails = JSON.stringify(data.data);
        }

        const finalStatus = success ? 'success' : 'failed';
        const finalMessage = data.message || (success ? 'Sukses diproses dari antrean' : 'Gagal');
        const kmspTrxId = data.data?.trx_id || trx.kmspTrxId; // Ambil ID transaksi dari KMSP

        // Perbarui database dengan SEMUA data yang relevan, termasuk `paymentDetails`
        await dbRun(
            "UPDATE transactions SET status = ?, api_response = ?, kmspTrxId = ?, paymentDetails = ? WHERE id = ?",
            [finalStatus, finalMessage, kmspTrxId, paymentDetails, trx.id]
        );

    } catch (error) {
        // Tangani jika terjadi error saat menghubungi API KMSP
        await dbRun("UPDATE transactions SET status = ?, api_response = ? WHERE id = ?", ['failed', `Scheduler Error: ${error.message}`, trx.id]);
    }
}
const executeOtpPurchase = (trx) => executePurchase(trx, true);
const executeNonOtpPurchase = (trx) => executePurchase(trx, false);

// --- SCHEDULER UNTUK CEK SALDO DAN PROSES TRANSAKSI (Setiap 5 Menit) ---
cron.schedule('*/1 * * * *', async () => {
    console.log(`[Scheduler] Menjalankan tugas pengecekan pada ${new Date().toLocaleString()}`);
    try {
        // =============================================================
        // ### BAGIAN 1: LOGIKA NOTIFIKASI SALDO
        // =============================================================
        const currentBalance = await getKmspAdminBalance();
        
        // Dapatkan status notifikasi terakhir dari DB
        const lowBalanceNotifiedRow = await dbGet("SELECT value FROM settings WHERE key = 'lowBalanceNotified'");
        const lowBalanceNotified = lowBalanceNotifiedRow ? JSON.parse(lowBalanceNotifiedRow.value) : false;

        // Kondisi 1: Saldo RENDAH dan admin BELUM dinotifikasi.
        if (currentBalance < 1500 && !lowBalanceNotified) {
            // KIRIM NOTIFIKASI PERINGATAN
            await sendTelegramNotification(
`<b>🚨 PERINGATAN SALDO RENDAH 🚨</b>
──────────────────────
Saldo KMSP Anda saat ini adalah <b>Rp ${currentBalance.toLocaleString('id-ID')}</b>. Mohon segera isi ulang untuk menghindari antrean transaksi.
──────────────────────
<b>Notif:tembak.cloudrystore.com</b>`, 'admin');
            
            // Set flag agar tidak mengirim notifikasi berulang kali
            await dbRun("UPDATE settings SET value = 'true' WHERE key = 'lowBalanceNotified'");

        // Kondisi 2: Saldo SUDAH NORMAL (setelah sebelumnya rendah)
        } else if (currentBalance >= 1500 && lowBalanceNotified) {
            // KIRIM NOTIFIKASI PEMULIHAN SALDO
            await sendTelegramNotification(
`<b>✅ Saldo KMSP Pulih</b>
──────────────────────
<b>Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}</b>
Sistem akan kembali memproses antrean transaksi (jika ada).
──────────────────────
<b>Notif:tembak.cloudrystore.com</b>`, 'admin');

            // Reset flag ke kondisi normal
            await dbRun("UPDATE settings SET value = 'false' WHERE key = 'lowBalanceNotified'");
        }

        // =============================================================
        // ### BAGIAN 2: PROSES ANTRIAN TRANSAKSI
        // =============================================================
        const pendingTransactions = await dbAll("SELECT * FROM transactions WHERE status = 'menunggu_saldo_provider'");
        if (pendingTransactions.length > 0) {
            console.log(`[Scheduler] Ditemukan ${pendingTransactions.length} transaksi tertunda untuk diproses.`);
            for (const trx of pendingTransactions) {
                if (currentBalance >= (trx.originalPrice || 0)) {
                    
                    const userMessage = 
`<b>⏳ Transaksi Anda Sedang Diproses</b>
──────────────────────
<b>Pengguna:</b> ${trx.userName}
<b>Paket:</b> ${trx.packageName}
──────────────────────
Sistem sedang mencoba mengirimkan paket Anda. Mohon ditunggu.
<b>Notif:tembak.cloudrystore.com</b>`;
                    sendTelegramNotification(userMessage, 'group');

                    await (trx.accessToken ? executeOtpPurchase(trx) : executeNonOtpPurchase(trx));
                    
                    const updatedTrx = await dbGet("SELECT status, api_response FROM transactions WHERE id = ?", [trx.id]);
                    const adminReportMessage =
`<b>📊 Hasil Proses Transaksi Tertunda</b>
──────────────────────
<b>Pengguna:</b> ${trx.userName}
<b>Paket:</b> ${trx.packageName}
<b>Status Akhir:</b> <b>${updatedTrx.status.toUpperCase()}</b>
<b>Pesan API:</b> ${updatedTrx.api_response}
──────────────────────
<b>Notif:tembak.cloudrystore.com</b>`;
                    sendTelegramNotification(adminReportMessage, 'admin');
                }
            }
        }
    } catch (error) { 
        console.error('[Scheduler] Terjadi error:', error); 
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});


// --- SCHEDULER UNTUK BACKUP OTOMATIS HARIAN ---
cron.schedule('0 6,9,12,15,18,21,0,3 * * *', async () => { // Berjalan pada jam yang Anda tentukan
    console.log(`[Backup] Scheduler backup dipicu pada ${new Date().toLocaleString()}`);
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
    const backupFileName = `webRyyStoreBackup-${timestamp}.sqlite`;
    const backupFilePath = path.join(backupDir, backupFileName);

    console.log(`[Backup] Memulai proses backup ke: ${backupFileName}`);

    try {
        fs.copyFileSync(dbPath, backupFilePath);
        console.log(`[Backup] Database berhasil di-backup secara lokal.`);

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
            console.log('[Backup] Melewatkan pengiriman ke Telegram: Token atau Chat ID Admin tidak diset.');
        } else {
            const form = new FormData();
            form.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
            form.append('document', fs.createReadStream(backupFilePath), backupFileName);
            form.append('caption', `✅ Backup Database Otomatis Berhasil\nFile: ${backupFileName}\nWaktu: ${date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
            
            await fetch(telegramUrl, {
                method: 'POST',
                body: form
            });

            console.log(`[Backup] File backup berhasil dikirim ke Telegram Admin.`);
        }

        // Hapus backup yang lebih tua dari 3 hari
        const files = fs.readdirSync(backupDir);
        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            const fileStat = fs.statSync(filePath);
            const isOlderThan3Days = (Date.now() - fileStat.mtime.getTime()) > 3 * 24 * 60 * 60 * 1000;
            
            if (isOlderThan3Days) {
                fs.unlinkSync(filePath);
                console.log(`[Backup] Menghapus backup lama: ${file}`);
            }
        });

    } catch (error) {
        console.error('[Backup] Gagal melakukan backup atau mengirim ke Telegram:', error);
        await sendTelegramNotification(
`<b>❌ GAGAL Backup Database Otomatis</b>
──────────────────────
<b>Error:</b> <pre>${error.message}</pre>
<b>Waktu:</b> ${date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
──────────────────────
<b>Mohon periksa server segera!</b>`, 'admin'
        );
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});


// --- SAJIKAN FRONTEND & CATCH-ALL ---
const frontendPath = path.join(__dirname, '..', 'frontend'); // HAPUS ', 'build'' DARI SINI
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
    const indexPath = path.resolve(frontendPath, 'index.html');
    // fs.access tidak lagi diperlukan karena express.static sudah menanganinya,
    // tapi kita biarkan untuk keamanan jika file index.html hilang.
    fs.access(indexPath, fs.constants.F_OK, (err) => {
        if (err) return res.status(404).send("File index.html tidak ditemukan di dalam folder /frontend.");
        res.sendFile(indexPath);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server 100% Lengkap dengan SQLite3 berjalan di http://localhost:${PORT}`);
});