
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
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const qrcode = require('qrcode');
const multer = require('multer');
const excel = require('exceljs');
const cron = require('node-cron');
const crypto = require('crypto');
const fs = require('fs');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const FormData = require('form-data');
const https = require('https');
const { ceirgoRoutes, setDependencies, initCeirgoRoutes } = require('./ceirgoRoutes');
const APP_START_TIME = Date.now();
https.globalAgent.options.rejectUnauthorized = false;


// --- TAMBAHKAN KODE DI BAWAH INI ---
let kmspBalanceCache = {
    balance: null,
    lastChecked: 0
};
const CACHE_DURATION_MS = 2 * 60 * 1000; // Cache selama 2 menit
// --- AKHIR KODE TAMBAHAN ---

const app = express();
const PORT = process.env.PORT || 3001;

// --- KONFIGURASI KUNCI API ---
const KMSP_API_KEY = process.env.KMSP_API_KEY;
const QRIS_STATIS_STRING = process.env.QRIS_STATIS_STRING;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// Optional: explicit group chat id for system notifications (preferred)
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const ORKUT_MERCHANT_ID = process.env.ORKUT_MERCHANT_ID;
const ORKUT_USERNAME = process.env.ORKUT_USERNAME;
const ORKUT_TOKEN = process.env.ORKUT_TOKEN;
const GOPAY_GATEWAY_URL = process.env.GOPAY_GATEWAY_URL;
const GOPAY_GATEWAY_API_KEY = process.env.GOPAY_GATEWAY_API_KEY;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.id';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || 'ganti-dengan-string-acak-yang-super-aman-dan-panjang';

if (!KMSP_API_KEY || !ORKUT_MERCHANT_ID || !ORKUT_USERNAME || !ORKUT_TOKEN || !QRIS_STATIS_STRING || !BREVO_API_KEY || !SESSION_SECRET) {
    console.error("FATAL ERROR: Kredensial (API, SESSION_SECRET) tidak lengkap di file .env.");
    process.exit(1);
}

// === SSE UTILS ===
const sseClients = new Map(); // userId -> Set<res>

function sseAddClient(userId, res) {
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId).add(res);
}

function sseRemoveClient(userId, res) {
    const set = sseClients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) sseClients.delete(userId);
}

function sseSend(userId, event, payload) {
    const set = sseClients.get(userId);
    if (!set) return;
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const res of set) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${data}\n\n`);
    }
}

function sseBroadcast(event, payload) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const [, set] of sseClients) {
        for (const res of set) {
            res.write(`event: ${event}\n`);
            res.write(`data: ${data}\n\n`);
        }
    }
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
            await dbRun(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, balance REAL DEFAULT 0, role TEXT DEFAULT 'user', upgradedToResellerAt TEXT, verifiedPhone TEXT, savedPhones TEXT, status TEXT DEFAULT 'pending', createdAt TEXT NOT NULL, resetPasswordToken TEXT, resetPasswordExpires INTEGER)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS packages (package_code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, original_price REAL DEFAULT 0, platform_fee REAL DEFAULT 0, reseller_fee REAL DEFAULT 0, isVisible INTEGER DEFAULT 0, category TEXT DEFAULT 'reguler', isMultiPurchase INTEGER DEFAULT 0, payment_methods TEXT, position INTEGER DEFAULT 0)`);
            // Kolom 'ewalletNumber TEXT' ditambahkan sebelum 'kmspTrxId' untuk menyimpan nomor OVO.
            await dbRun(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, packageId TEXT, packageName TEXT, platformFee REAL, originalPrice REAL, targetPhone TEXT, accessToken TEXT, paymentMethod TEXT, ewalletNumber TEXT, kmspTrxId TEXT, status TEXT NOT NULL, api_response TEXT, createdAt TEXT NOT NULL, paymentDetails TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS topups (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, baseAmount REAL NOT NULL, uniqueAmount REAL NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL, qrisBase64Image TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, message TEXT NOT NULL, createdAt TEXT NOT NULL)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS tutorialContent (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, content TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, position INTEGER DEFAULT 0)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

            // --- BAGIAN YANG DIPERBAIKI ---
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceMode', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lowBalanceNotified', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('topupOptions', '[]')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lastKmspBalance', '0')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceScheduleEnabled', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceStartTime', '01:00')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceEndTime', '04:00')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('announcementBgColor', '#dc2626')`);
            // TAMBAHAN BARU: Melacak status notifikasi maintenance
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceNotificationSent', 'none')`);
            // --- AKHIR PERBAIKAN ---

            // Gateway pembayaran aktif: 'orkut' atau 'gopay'
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('paymentGateway', 'orkut')`);

            // Tambahan kolom untuk fitur layanan manual
            try { await dbRun("ALTER TABLE transactions ADD COLUMN service_type TEXT DEFAULT 'reguler'"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN imei TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN user_image TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN admin_image TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN admin_note TEXT"); } catch (e) { }
            // Buat tabel imei_packages untuk durasi kustom
            await dbRun(`CREATE TABLE IF NOT EXISTS imei_packages (id TEXT PRIMARY KEY, duration TEXT NOT NULL, price REAL NOT NULL)`);
            // (Hardcode IMEI packages dihapus agar tidak muncul terus setiap direstart)
            // Buat tabel tiket
            await dbRun(`CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, userId INTEGER, subject TEXT, status TEXT, createdAt TEXT, updatedAt TEXT)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticketId TEXT, senderId INTEGER, senderRole TEXT, message TEXT, createdAt TEXT)`);
            // Tambah kolom opsional hasil cek ceir dan speed option
            try { await dbRun("ALTER TABLE transactions ADD COLUMN user_image_ceir TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN speed_option TEXT"); } catch (e) { }

            // Set harga default jika belum ada
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ceir_history', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ceir_register', '50000')`);
            // Tambahkan juga default untuk ceirgo_price_cek_imei_beacukai dan ceirgo_price_cek_history_imei
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ceirgo_price_cek_imei_beacukai', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ceirgo_price_cek_history_imei', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_fast', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_fast_status', 'hidden')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_semi', '20000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_semi_status', 'hidden')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_slow', '0')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_slow_status', 'hidden')`);

            console.log("✅ Database schema initialized successfully.");
        } catch (error) {
            console.error("Database initialization failed:", error);
            process.exit(1);
        }
    });
    // Ensure older databases get the `position` column (safe ALTER, ignore error if exists)
    try {
        await dbRun(`ALTER TABLE packages ADD COLUMN position INTEGER DEFAULT 0`);
        console.log('✅ Ensured packages.position column exists (added if missing).');
    } catch (err) {
        // If column already exists or any other DB-specific issue, ignore quietly
    }
}
initializeDatabase();

// --- SETUP MIDDLEWARE & LAINNYA ---
app.use(express.json());
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
const fileStoreOptions = { path: path.join(__dirname, 'sessions'), ttl: 86400, retries: 0 };
app.use(session({ store: new FileStore(fileStoreOptions), secret: SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', path: '/', maxAge: 24 * 60 * 60 * 1000 } }));
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

setDependencies({ dbAll, isAuthenticated, isAdmin, CEIRGO_API_KEY, CEIRGO_BASE_URL });
initCeirgoRoutes();
app.use('/api', ceirgoRoutes);

async function getEffectiveMaintenanceStatus() {
    try {
        const settingsRows = await dbAll("SELECT key, value FROM settings WHERE key IN ('maintenanceMode', 'maintenanceScheduleEnabled', 'maintenanceStartTime', 'maintenanceEndTime', 'lastKmspBalance')");
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        // 1. Prioritas utama: Maintenance Manual dari Admin
        if (settings.maintenanceMode === 'true') {
            return true;
        }

        // 2. Prioritas kedua: Saldo KMSP Rendah (DISABLED untuk local dev)
        // const lastBalance = parseFloat(settings.lastKmspBalance) || 0;
        // if (lastBalance < 1500) {
        //     return true;
        // }

        // 3. Prioritas ketiga: Maintenance Terjadwal
        if (settings.maintenanceScheduleEnabled === 'true') {
            const now = new Date();
            const timeZone = 'Asia/Jakarta';
            const currentTime = now.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }); // Format HH:MM

            const startTime = settings.maintenanceStartTime || '00:00';
            const endTime = settings.maintenanceEndTime || '00:00';

            // Kasus jadwal melewati tengah malam (e.g., 23:00 - 02:00)
            if (startTime > endTime) {
                if (currentTime >= startTime || currentTime < endTime) {
                    return true;
                }
            }
            // Kasus jadwal di hari yang sama (e.g., 01:00 - 04:00)
            else {
                if (currentTime >= startTime && currentTime < endTime) {
                    return true;
                }
            }
        }

        // Jika tidak ada kondisi di atas, maka tidak maintenance
        return false;
    } catch (error) {
        console.error("Error getting effective maintenance status:", error);
        return false; // Anggap tidak maintenance jika ada error sistem
    }
}
// --- FUNGSI HELPER ---
async function sendTelegramNotification(message, target = 'group') {
    // Map logical targets to chat IDs.
    // 'admin' -> TELEGRAM_ADMIN_CHAT_ID
    // 'group' -> TELEGRAM_GROUP_CHAT_ID if set, otherwise fallback to TELEGRAM_CHAT_ID (legacy)
    // any other value -> TELEGRAM_CHAT_ID (legacy)
    let targetChatId;
    if (target === 'admin') targetChatId = TELEGRAM_ADMIN_CHAT_ID;
    else if (target === 'group') targetChatId = TELEGRAM_GROUP_CHAT_ID || TELEGRAM_CHAT_ID;
    else targetChatId = TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
        console.warn(`[Telegram] Missing bot token or target chat id for target='${target}'. Skipping send.`);
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'HTML' }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(`Error mengirim notifikasi Telegram ke target='${target}' (chat_id=${targetChatId}):`, error.message);
    }
}
// MODIFIKASI: Menggunakan sistem cache untuk mengurangi panggilan API
async function getKmspAdminBalance() {
    const now = Date.now();

    // 1. Cek apakah cache masih valid (belum kedaluwarsa)
    if (kmspBalanceCache.balance !== null && (now - kmspBalanceCache.lastChecked < CACHE_DURATION_MS)) {
        console.log("[CACHE] Menggunakan saldo KMSP dari cache.");
        return kmspBalanceCache.balance;
    }

    // 2. Jika cache tidak valid, lakukan panggilan API
    console.log("[API] Cache kedaluwarsa, mengambil saldo KMSP baru...");
    const url = `https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
    try {
        const response = await fetch(url, { timeout: 15000 }); // Tambahkan timeout
        if (!response.ok) {
            // Jika status HTTP bukan 2xx, lempar error
            throw new Error(`KMSP API returned status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status && typeof data.data?.balance !== 'undefined') {
            const newBalance = parseFloat(data.data.balance);
            // 3. Simpan hasil baru ke cache
            kmspBalanceCache = {
                balance: newBalance,
                lastChecked: now
            };
            console.log(`[API] Saldo KMSP berhasil diperbarui: ${newBalance}`);
            return newBalance;
        } else {
            // Jika respons API tidak sesuai format, kembalikan nilai cache lama (jika ada) atau 0
            console.warn("Respons saldo KMSP tidak valid, menggunakan nilai lama (jika ada).");
            return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
        }
    } catch (error) {
        console.error("Error fetching KMSP balance:", error.message);
        // Jika gagal, kembalikan nilai cache terakhir agar aplikasi tidak crash
        return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
    }
}

// =======================================================
// RUTE AUTENTIKASI PENGGUNA
// =======================================================
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ status: false, message: 'Google Token diperlukan.' });
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'GANTI_DENGAN_GOOGLE_CLIENT_ID_ANDA') {
            return res.status(500).json({ status: false, message: 'Google Login belum dikonfigurasi oleh Admin.' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) return res.status(400).json({ status: false, message: 'Gagal mendapatkan data Google.' });

        const email = payload.email;
        const name = payload.name || 'User Google';

        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        // Jika belum terdaftar, otomatis daftarkan (Auto Register + Approve)
        if (!user) {
            const defaultPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);
            const newId = `user_${Date.now()}`;
            await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, name, email, defaultPassword, 0, 'user', null, '[]', 'approved', new Date().toISOString()]);

            user = await dbGet('SELECT * FROM users WHERE id = ?', [newId]);
            sendTelegramNotification(`<b>🎉 User Baru Mendaftar</b>\n<b>Metode:</b> 🌐 Login via Google\n<b>Nama:</b> ${name}\n<b>Email:</b> ${email}`, 'admin');
        } else {
            // Jika akun ada tapi masih pending, otomatis di-approve karena login pakai Google
            if (user.status === 'pending') {
                await dbRun('UPDATE users SET status = ? WHERE id = ?', ['approved', user.id]);
                user.status = 'approved';
            }
        }

        if (user.status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ status: false, message: 'Akun Anda diblokir.' });
        }

        // Set session
        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);

        res.status(200).json({ status: true, message: 'Login Google Berhasil!', user: userWithoutPassword });
    } catch (error) {
        console.error("Google Login Error:", error.message);
        res.status(500).json({ status: false, message: 'Verifikasi Google gagal.' });
    }
});

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
<b>Metode:</b> 📝 Manual (Form Web)
<b>Nama:</b> ${name}
<b>Email:</b> ${email}
<b>──────────────────────</b>
<b>Harap setujui akun ini di Panel Admin.</b>
<b>Notif:ry-itsolutionts.web.id</b>`, 'admin'
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
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
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

        const resetUrl = `https://ry-itsolutionts.web.id/#reset-password?token=${token}`;
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
        const maintenanceMode = await getEffectiveMaintenanceStatus();
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

app.post('/api/phone/check-token', isAuthenticated, async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ status: false, message: "Token diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-quotadetails-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&access_token=${access_token}`);
        const data = await response.json();
        if (!response.ok || !data.status) {
            return res.status(200).json({ status: false, message: data.message || "Token tidak valid." });
        }
        res.status(200).json({ status: true, message: "Token valid." });
    } catch (error) { res.status(500).json({ status: false, message: "Gagal mengecek token." }); }
});

// GANTI FUNGSI INI SEPENUHNYA di backend/server.js
// backend/server.js -> Ganti rute ini
app.post('/api/purchase', isAuthenticated, async (req, res) => {
    // PERUBAHAN 1: Tambahkan 'ewallet_number'
    const { packageId, phone, access_token, paymentMethod, ewallet_number, purchaseContext = 'paket-satuan' } = req.body;

    if (!packageId || !phone || !access_token || !paymentMethod) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });
    }

    let user;
    let pkg;
    let effectiveFee; // Deklarasikan di luar blok try
    const trxId = `trx_${Date.now()}_${uuidv4().slice(0, 4)}`;

    try {
        user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        pkg = await dbGet('SELECT * FROM packages WHERE package_code = ?', [packageId]);

        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda." });
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        // MODIFIKASI: Tentukan biaya efektif berdasarkan metode pembayaran
        const isBalancePayment = paymentMethod === 'balance';
        const fee = user.role === 'reseller' ? (pkg.reseller_fee || 0) : (pkg.platform_fee || 0);
        effectiveFee = isBalancePayment ? (pkg.original_price + fee) : fee;
        const platformFeeOnly = fee;

        if (user.balance < effectiveFee) {
            return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk membayar biaya Rp ${effectiveFee.toLocaleString()}.` });
        }

        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [effectiveFee, user.id]);

        const adminBalance = await getKmspAdminBalance();
        const packagePrice = pkg.original_price || 0;

        if (adminBalance < packagePrice) {
            // PERUBAHAN 2: Tambahkan 'ewalletNumber' saat menyimpan transaksi yang diantrekan
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, effectiveFee, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);

            sendTelegramNotification(
                `<b>⚠️ Saldo KMSP Kurang! (Paket OTP) ⚠️</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Meminta Paket:</b> ${pkg.name}
<b>Harga Provider:</b> Rp ${packagePrice.toLocaleString('id-ID')}
<b>Saldo KMSP Saat Ini:</b> Rp ${adminBalance.toLocaleString('id-ID')}
──────────────────────
Transaksi diantrekan. Mohon segera top up saldo KMSP Anda.`, 'admin');

            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan masuk antrean, akan diproses otomatis.", newBalance: updatedUser.balance });
        }

        // PERUBAHAN 3: Tambahkan 'ewalletNumber' saat menyimpan transaksi normal
        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, platformFeeOnly, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'processing', 'Menghubungi provider...']);

        // PERUBAHAN 4: Susun parameter API baru
        const purchaseParams = {
            api_key: KMSP_API_KEY,
            package_code: pkg.package_code,
            phone,
            access_token,
            payment_method: paymentMethod,
            price_or_fee: pkg.original_price,
            ewallet_number: (paymentMethod.toUpperCase() === 'OVO' && ewallet_number) ? ewallet_number : ''
        };

        const purchaseResponse = await fetch(`https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${new URLSearchParams(purchaseParams).toString()}`);
        const purchaseData = await purchaseResponse.json();

        const isIpaasSuccessCase = (purchaseData.message || '').includes("422 -> Failed call ipaas purchase") && purchaseContext === 'multi-paket';

        const isDorUlangFailure = purchaseContext === 'multi-paket' && (purchaseData.message || '').includes("Paket berhasil dibeli. Silakan cek kuotanya");

        const isProviderSuccess = ((purchaseResponse.ok && purchaseData.status) || isIpaasSuccessCase) && !isDorUlangFailure;

        if (isProviderSuccess) {
            let paymentDetails = null;
            if (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) {
                if (purchaseData.data.is_qris && purchaseData.data.qris_data?.qr_code) {
                    purchaseData.data.qris_data.qr_code_base64 = await qrcode.toDataURL(purchaseData.data.qris_data.qr_code);
                }
                paymentDetails = JSON.stringify(purchaseData.data);
            }

            await dbRun("UPDATE transactions SET status = ?, api_response = ?, kmspTrxId = ?, paymentDetails = ? WHERE id = ?", ['success', purchaseData.message || 'Sukses', purchaseData.data?.trx_id || null, paymentDetails, trxId]);

            const maskedPhone = phone.slice(0, 4) + '****' + phone.slice(-3);
            sendTelegramNotification(`<b>✅ Transaksi Paket Baru!</b>\n──────────────────────\n<b>Pengguna:</b> ${user.name}\n<b>Paket:</b> ${pkg.name}\n<b>Nomor:</b> ${maskedPhone}\n<b>Status: Sukses</b>`);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const successMessage = isIpaasSuccessCase ? "Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)" : (purchaseData.message || "Pembelian berhasil!");

            if (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) {
                return res.status(202).json({ status: true, message: "Pembayaran eksternal diperlukan.", payment_data: purchaseData.data, newBalance: finalUser.balance });
            }
            return res.status(200).json({ status: true, message: successMessage, newBalance: finalUser.balance });

        } else {
            await dbRun("UPDATE transactions SET status = 'failed', api_response = ? WHERE id = ?", [purchaseData.message || 'Gagal dari provider', trxId]);
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]); // Kembalikan saldo

            sendTelegramNotification(
                `<b>❌ Transaksi Gagal (Fee Dikembalikan)</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Paket:</b> ${pkg.name}
<b>Error:</b> <pre>${purchaseData.message || 'Unknown Error'}</pre>
──────────────────────
Saldo fee Rp ${effectiveFee.toLocaleString('id-ID')} telah dikembalikan.`);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const errorMessage = isDorUlangFailure ? "Gagal (Dor Ulang): Coba lagi setelah 10 menit." : (purchaseData.message || 'Pembelian gagal.');
            return res.status(500).json({ status: false, message: errorMessage, newBalance: finalUser.balance });
        }
    } catch (error) {
        console.error("Purchase route error:", error);
        // --- PERBAIKAN UTAMA: Safety refund untuk error tak terduga ---
        if (user && pkg && typeof effectiveFee === 'number' && effectiveFee > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);
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

        // MODIFIKASI: Tentukan biaya berdasarkan metode pembayaran
        const isBalancePayment = req.body.paymentMethod === 'balance';
        const fee = user.role === 'reseller' ? (pkg.reseller_fee || 0) : (pkg.platform_fee || 0);
        const effectiveFee = isBalancePayment ? (pkg.original_price + fee) : fee;

        if (user.balance < effectiveFee) {
            return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk membayar biaya Rp ${effectiveFee.toLocaleString()}.` });
        }

        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [effectiveFee, user.id]);

        const baseTransaction = { id: `trx_${Date.now()}`, userId: user.id, userName: user.name, packageId, packageName: pkg.name, platformFee: fee, originalPrice: pkg.original_price, targetPhone, paymentMethod: req.body.paymentMethod, ewalletNumber: req.body.ewallet_number || '', createdAt: new Date().toISOString() };
        const adminBalance = await getKmspAdminBalance();

        if (adminBalance < pkg.original_price) {
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);
            sendTelegramNotification(`<b>⚠️ Saldo KMSP Kurang! (Non-OTP)</b>\nPengguna: ${user.name}\nPaket: ${pkg.name}\nTransaksi diantrekan.`, 'admin');
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan Anda masuk antrean.", newBalance: updatedUser.balance });
        }

        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'processing', 'Processing...']);
        const trxFromDb = await dbGet("SELECT * FROM transactions WHERE id = ?", [baseTransaction.id]);

        await executeNonOtpPurchase(trxFromDb);
        const finalTrx = await dbGet("SELECT status, api_response FROM transactions WHERE id = ?", [baseTransaction.id]);

        if (finalTrx.status !== 'success') {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(500).json({ status: false, message: finalTrx.api_response, newBalance: updatedUser.balance });
        }
        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
        return res.status(200).json({ status: true, message: finalTrx.api_response || "Pembelian berhasil!", newBalance: updatedUser.balance });

    } catch (error) {
        console.error("Error di rute non-otp:", error);
        // Safety refund
        const user = await dbGet("SELECT role FROM users WHERE id = ?", [req.session.userId]);
        const pkg = await dbGet("SELECT platform_fee, reseller_fee FROM packages WHERE package_code = ?", [req.body.packageId]);
        const feeToRefund = user?.role === 'reseller' ? (pkg?.reseller_fee || 0) : (pkg?.platform_fee || 0);
        if (pkg && user) await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [feeToRefund, req.session.userId]);
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
    selectedCheckboxes.forEach(cb => cb.checked = false);
}

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
        const maintenanceMode = await getEffectiveMaintenanceStatus();
        const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
        res.status(200).json({ status: true, maintenanceMode, currentBalance: user ? user.balance : null });
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil status." });
    }
    // Rute version
});

app.get('/api/system-version', (req, res) => {
    res.json({ status: true, version: APP_START_TIME });
});

app.get('/api/admin/maintenance-schedule', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const settingsRows = await dbAll("SELECT key, value FROM settings WHERE key IN ('maintenanceScheduleEnabled', 'maintenanceStartTime', 'maintenanceEndTime')");
        const schedule = settingsRows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json({
            status: true,
            data: {
                enabled: schedule.maintenanceScheduleEnabled === 'true',
                startTime: schedule.maintenanceStartTime,
                endTime: schedule.maintenanceEndTime,
            }
        });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengambil jadwal maintenance.' });
    }
});

app.put('/api/admin/maintenance-schedule', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { enabled, startTime, endTime } = req.body;

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ status: false, message: 'Format waktu tidak valid. Gunakan HH:MM.' });
        }

        await dbRun("BEGIN TRANSACTION");
        await dbRun("UPDATE settings SET value = ? WHERE key = 'maintenanceScheduleEnabled'", [enabled ? 'true' : 'false']);
        await dbRun("UPDATE settings SET value = ? WHERE key = 'maintenanceStartTime'", [startTime]);
        await dbRun("UPDATE settings SET value = ? WHERE key = 'maintenanceEndTime'", [endTime]);
        await dbRun("COMMIT");

        res.json({ status: true, message: 'Jadwal maintenance berhasil disimpan.' });
    } catch (error) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: 'Gagal menyimpan jadwal maintenance.' });
    }
});

// Admin endpoint: trigger reseller retention check on-demand

// === ADMIN PAYMENT GATEWAY SETTINGS ===
app.get('/api/admin/payment-gateway', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'paymentGateway'");
        res.json({ status: true, data: { gateway: row ? row.value : 'orkut' } });
    } catch (e) { res.status(500).json({ status: false, message: 'Gagal mengambil setting gateway.' }); }
});

app.put('/api/admin/payment-gateway', isAuthenticated, isAdmin, async (req, res) => {
    const { gateway } = req.body;
    if (!['orkut', 'gopay'].includes(gateway)) {
        return res.status(400).json({ status: false, message: "Gateway harus 'orkut' atau 'gopay'." });
    }
    try {
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('paymentGateway', ?)", [gateway]);
        res.json({ status: true, message: `Payment gateway berhasil diubah ke ${gateway.toUpperCase()}.` });
    } catch (e) { res.status(500).json({ status: false, message: 'Gagal menyimpan setting gateway.' }); }
});

app.post('/api/admin/run-reseller-retention', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const summary = await runResellerRetentionCheck();
        res.json({ status: true, message: 'Reseller retention check executed', data: summary });
    } catch (error) {
        console.error('Error running reseller retention check (admin):', error);
        res.status(500).json({ status: false, message: 'Failed to run retention check.' });
    }
});

// Public endpoint: ambil konten info publik (bisa berformat markdown)
app.get('/api/public-info', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'publicInfoBox'");
        res.json({ status: true, data: row ? row.value : '' });
    } catch (error) {
        console.error('Error fetching public info:', error);
        res.status(500).json({ status: false, message: 'Gagal mengambil info publik.' });
    }
});

// Admin endpoint: update konten info publik (markdown)
app.post('/api/admin/public-info', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') return res.status(400).json({ status: false, message: 'Content harus berupa string.' });

        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('publicInfoBox', ?)", [content]);

        // Broadcast via SSE supaya client bisa refresh jika terhubung
        sseBroadcast('announcement', { id: 'publicInfoBox', content });

        res.json({ status: true, message: 'Konten info publik berhasil disimpan.' });
    } catch (error) {
        console.error('Error saving public info:', error);
        res.status(500).json({ status: false, message: 'Gagal menyimpan info publik.' });
    }
});

app.get('/api/user/packages', isAuthenticated, async (req, res) => {
    try { // --- PERBAIKAN: Filter paket berdasarkan peran pengguna ---
        const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        let query;
        // Admin dan Reseller melihat semua paket yang visible
        if (user && (user.role === 'admin' || user.role === 'reseller')) {
            // Order by admin-defined position first, then name
            query = 'SELECT * FROM packages WHERE isVisible = 1 ORDER BY position ASC, name ASC';
        } else {
            // User biasa hanya melihat paket yang visible dan BUKAN reseller-only
            query = 'SELECT * FROM packages WHERE isVisible = 1 AND isResellerOnly = 0 ORDER BY position ASC, name ASC';
        }
        const packages = await dbAll(query);
        res.status(200).json({ status: true, data: packages });
    } catch (e) { console.error("Error fetching user packages:", e); res.status(500).json({ status: false, message: "Gagal memuat paket." }) }
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

app.get('/api/admin/ceirgo-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (!CEIRGO_API_KEY) return res.status(200).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi' });

        const response = await axios.get(`${CEIRGO_BASE_URL}/api/wallet/snap`, {
            headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}` }
        });

        if (response.data && typeof response.data.balance !== 'undefined') {
            res.status(200).json({ status: true, data: { balance: response.data.balance, reserved: response.data.reserved } });
        } else {
            res.status(500).json({ status: false, message: 'Gagal parse saldo CEIRGO' });
        }
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil saldo CEIRGO' });
    }
});

app.get('/api/admin/ceirgo-display-settings', isAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'ceirgoDisplaySettings'");
        res.json({ status: true, data: row ? JSON.parse(row.value) : {} });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil setting tampilan.' });
    }
});

app.put('/api/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const settings = req.body;
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('ceirgoDisplaySettings', ?)", [JSON.stringify(settings)]);
        res.json({ status: true, message: 'Pengaturan tampilan berhasil disimpan.' });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal menyimpan setting tampilan.' });
    }
});

// GET metode pembayaran Ceirgo
app.get('/api/admin/ceirgo-deposit-providers', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (!CEIRGO_API_KEY) return res.status(200).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi' });

        const response = await axios.get(`${CEIRGO_BASE_URL}/api/deposit/provider?limit=20`, {
            headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}` }
        });

        if (response.data?.data?.items) {
            res.json({ status: true, data: response.data.data.items });
        } else {
            res.json({ status: false, message: 'Gagal mengambil provider Ceirgo' });
        }
    } catch (e) {
        res.status(500).json({ status: false, message: e.response?.data?.message || 'Gagal menghubungi CEIRGO' });
    }
});

// POST request deposit Ceirgo
app.post('/api/admin/ceirgo-deposit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { amount, provider_code } = req.body;
        if (!amount || amount < 10000) return res.status(400).json({ status: false, message: 'Minimal top up Rp 10.000' });
        if (!provider_code) return res.status(400).json({ status: false, message: 'Pilih provider' });

        const response = await axios.post(`${CEIRGO_BASE_URL}/api/deposit`, {
            amount: parseInt(amount),
            provider_code
        }, {
            headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}`, 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.id) {
            // response.data berisi { id, amounts: {total_pay}, qr_url, qr_string, dsb }
            // Jika dia QRIS dan punya qr_string tapi ga punya qr_url yang valid, kita generate base64-nya
            let finalQris = response.data.qr_url;
            if (!finalQris && response.data.qr_string) {
                finalQris = await qrcode.toDataURL(response.data.qr_string);
            }

            res.json({
                status: true,
                data: {
                    id: response.data.id,
                    total_pay: response.data.amounts?.total_pay || amount,
                    qr: finalQris,
                    qr_string: response.data.qr_string,
                    provider: response.data.provider_code,
                    account_number: response.data.account_number,
                    account_holder: response.data.account_holder_name
                }
            });
        } else {
            res.json({ status: false, message: 'Respons API Ceirgo tidak valid' });
        }
    } catch (e) {
        res.status(500).json({ status: false, message: e.response?.data?.message || 'Gagal membuat deposit Ceirgo' });
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



// =======================================================
// RUTE TOP UP SALDO
// =======================================================
const qrisPollingTimeouts = new Map();

// --- GOPAY GATEWAY: Generate QRIS via GoPay Gateway API ---
async function generateGopayQris(amount) {
    const URL = process.env.GOPAY_GATEWAY_URL;
    const API_KEY = process.env.GOPAY_GATEWAY_API_KEY;
    if (!URL || !API_KEY) {
        throw new Error("GOPAY_GATEWAY_URL atau GOPAY_GATEWAY_API_KEY belum dikonfigurasi di .env");
    }
    try {
        const response = await axios.get(`${URL}/create-qris`, {
            params: { amount, api_key: API_KEY },
            timeout: 15000
        });
        if (response.data?.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data?.message || 'Gagal membuat QRIS dari GoPay Gateway.');
    } catch (error) {
        console.error(`[GOPAY_QRIS_ERROR]`, error.message);
        throw new Error(error.response?.data?.message || error.message || 'Gagal menghubungi GoPay Gateway.');
    }
}

// --- GOPAY GATEWAY: Check payment status ---
async function checkGopayPaymentStatus(topUpId, amount, gopayTrxId, startTime) {
    const URL = process.env.GOPAY_GATEWAY_URL;
    const API_KEY = process.env.GOPAY_GATEWAY_API_KEY;
    if (!URL || !API_KEY) return;
    const maxDurationMs = 5 * 60 * 1000;
    const interval = 8000;

    const pollingLoop = async () => {
        try {
            const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [topUpId]);
            if (!topUp || topUp.status !== 'pending') { qrisPollingTimeouts.delete(topUpId); return; }
            const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [topUpId]);
                qrisPollingTimeouts.delete(topUpId);
                return;
            }

            // Tambahkan parameter startTime ke URL
            const response = await axios.get(`${URL}/check-payment`, {
                params: { amount, trx_id: gopayTrxId, api_key: API_KEY, start_time: startTime },
                timeout: 15000
            });
            console.log(`[GOPAY_POLL] Cek trx ${gopayTrxId} (Rp ${amount}) -> response:`, response.data);
            if (response.data?.success && response.data.paid) {
                await dbRun("BEGIN TRANSACTION");
                const result = await dbRun("UPDATE topups SET status = 'completed' WHERE id = ? AND status = 'pending'", [topUpId]);
                if (result.changes > 0) {
                    const user = await dbGet("SELECT id, name, email, role FROM users WHERE id = ?", [topUp.userId]);
                    await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [topUp.baseAmount, user.id]);
                    if (user.role !== 'reseller' && topUp.baseAmount >= 50000) {
                        await dbRun("UPDATE users SET role = 'reseller', upgradedToResellerAt = ? WHERE id = ?", [new Date().toISOString(), user.id]);
                        sseSend(user.id, 'role_change', { newRole: 'reseller', reason: 'Upgrade otomatis ke Reseller.' });
                    }
                    await dbRun("COMMIT");
                    const updatedUser = await dbGet("SELECT balance FROM users WHERE id = ?", [user.id]);
                    sseSend(user.id, 'balance_update', { balance: updatedUser.balance, source: 'gopay_topup' });
                    sseSend(user.id, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up via GoPay berhasil!' });
                    sendTelegramNotification(`<b>💰 Top Up Berhasil (GoPay)!</b>\n<b>User:</b> ${user.name}\n<b>Jumlah:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}\n<b>TRX:</b> <code>${gopayTrxId}</code>`);
                } else {
                    await dbRun("ROLLBACK");
                }
                qrisPollingTimeouts.delete(topUpId);
                return;
            }
        } catch (error) {
            console.error(`[GOPAY_POLL_ERROR] ${topUpId}:`, error.message);
        }
        const timeoutId = setTimeout(pollingLoop, interval);
        qrisPollingTimeouts.set(topUpId, timeoutId);
    };
    if (!qrisPollingTimeouts.has(topUpId)) {
        qrisPollingTimeouts.set(topUpId, setTimeout(pollingLoop, 5000));
    }
}

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
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

            if (response.data && Array.isArray(response.data.data)) {
                const paymentFound = response.data.data.find(item =>
                    (item.type === 'CR' || item.tipe === 'CR') && parseFloat(item.nominal || item.amount) === parseFloat(uniqueAmount)
                );

                if (paymentFound) {
                    await dbRun("BEGIN TRANSACTION");
                    const result = await dbRun("UPDATE topups SET status = 'completed' WHERE id = ? AND status = 'pending'", [topUpId]);

                    if (result.changes > 0) {
                        // Ambil data user yang lebih lengkap
                        const user = await dbGet("SELECT id, name, email, role, upgradedToResellerAt FROM users WHERE id = ?", [topUp.userId]);

                        // Tambah saldo user
                        await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [topUp.baseAmount, user.id]);

                        // --- LOGIKA BARU: Cek untuk upgrade ke Reseller ---
                        const firstTopUpAmount = 50000;
                        // Cek jika: saat ini bukan reseller dan jumlah top up memenuhi syarat
                        // (izinkan re-upgrade jika sebelumnya sudah pernah diturunkan)
                        if (user.role !== 'reseller' && topUp.baseAmount >= firstTopUpAmount) {
                            await dbRun("UPDATE users SET role = 'reseller', upgradedToResellerAt = ? WHERE id = ?", [new Date().toISOString(), user.id]);
                            await sendTelegramNotification(
                                `<b>🎉 Selamat! Akun Anda Telah Di-upgrade! 🎉</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Status Baru:</b> Reseller
──────────────────────
Anda telah berhasil melakukan top up pertama sebesar <b>Rp ${topUp.baseAmount.toLocaleString('id-ID')}</b> dan kini mendapatkan harga spesial reseller.`, 'group'
                            );
                            // --- PERBAIKAN: Tambahkan notifikasi ke Admin ---
                            await sendTelegramNotification(
                                `<b>📈 Pengguna Menjadi Reseller 📈</b>
──────────────────────
<b>Pengguna:</b> ${user.name} (${user.email})
<b>Pemicu:</b> Top up Rp ${topUp.baseAmount.toLocaleString('id-ID')}
──────────────────────
Akun telah di-upgrade secara otomatis.`, 'admin'
                            );
                            sseSend(user.id, 'role_change', { newRole: 'reseller', reason: 'Selamat! Anda berhasil upgrade menjadi Reseller.' });
                            console.log(`[UPGRADE] Pengguna ${user.name} telah di-upgrade menjadi reseller.`);
                        }
                        // --- AKHIR LOGIKA BARU ---

                        await dbRun("COMMIT");

                        // Notifikasi top up berhasil (seperti sebelumnya)
                        await sendTelegramNotification(
                            `<b>──────────────────────</b>
<b>💰 Top Up Berhasil (ORKUT)!</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user.name}
<b>Jumlah Masuk:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}
<b>ID Transaksi:</b> <code>${topUpId}</code>
<b>──────────────────────</b>
<b>Notif:ry-itsolutionts.web.id</b>`
                        );
                        console.log(`[ORKUT_POLL] Saldo dan notifikasi untuk ${user.name} berhasil diproses.`);

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

    if (!baseAmount || baseAmount < 10000) {
        return res.status(400).json({ status: false, message: 'Jumlah top-up minimal adalah Rp 10.000.' });
    }

    try {
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        }

        // Batalkan top-up lama yang masih pending
        await dbRun("UPDATE topups SET status = 'canceled' WHERE userId = ? AND status = 'pending'", [userId]);

        const topUpId = `TU-${Date.now()}`;
        // Baca gateway aktif dari setting admin
        const gwRow = await dbGet("SELECT value FROM settings WHERE key = 'paymentGateway'");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        const useGopayGw = activeGateway === 'gopay' && process.env.GOPAY_GATEWAY_URL && process.env.GOPAY_GATEWAY_API_KEY;

        if (useGopayGw) {
            // === GOPAY GATEWAY MODE ===
            const gopayData = await generateGopayQris(baseAmount);
            const qrisBase64Image = await qrcode.toDataURL(gopayData.qris_code);

            // Kirim start_time (ISO string) saat topup dibuat agar gateway hanya cek mutasi baru
            const topUpStartTime = new Date().toISOString();

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image, gopayTrxId, gopayQrisId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, baseAmount, 'pending', topUpStartTime, qrisBase64Image, gopayData.trx_id, gopayData.qris_id]
            );

            checkGopayPaymentStatus(topUpId, baseAmount, gopayData.trx_id, topUpStartTime);

            res.status(200).json({
                status: true,
                message: 'Silakan scan QRIS GoPay dan bayar sesuai nominal.',
                topUpId,
                qrisData: {
                    base64Image: qrisBase64Image,
                    uniqueAmount: baseAmount,
                    qrisUrl: gopayData.qris_url,
                    expiresAt: Math.floor(new Date(gopayData.expires_at).getTime() / 1000)
                }
            });
        } else {
            // === LEGACY ORKUT MODE ===
            const uniqueCode = Math.floor(Math.random() * 900) + 100;
            const uniqueAmount = baseAmount + uniqueCode;
            const qrisBase64Image = await generateDynamicQris(uniqueAmount);

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, uniqueAmount, 'pending', new Date().toISOString(), qrisBase64Image]
            );

            checkOrkutPaymentStatus(topUpId, uniqueAmount);

            res.status(200).json({
                status: true,
                message: 'Silakan scan QRIS dan transfer sesuai jumlah unik.',
                topUpId,
                qrisData: { base64Image: qrisBase64Image, uniqueAmount, expiresAt: Math.floor((Date.now() + 15 * 60 * 1000) / 1000) }
            });
        }

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

app.post('/api/admin/update-user-role', isAuthenticated, isAdmin, async (req, res) => {
    const { userId, newRole } = req.body;
    if (!userId || !['user', 'reseller', 'admin'].includes(newRole)) {
        return res.status(400).json({ status: false, message: 'User ID atau Peran tidak valid.' });
    }
    try {
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        }
        await dbRun("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);

        sseSend(userId, 'role_change', { newRole, reason: 'Peran diubah oleh Admin.' });
        sendTelegramNotification(`Peran untuk pengguna <b>${user.name}</b> telah diubah menjadi <b>${newRole.toUpperCase()}</b> oleh admin.`, 'admin');

        res.json({ status: true, message: `Peran untuk ${user.name} berhasil diubah menjadi ${newRole}.` });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ status: false, message: 'Gagal mengubah peran pengguna.' });
    }
});

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

        const targetUser = await dbGet('SELECT name, balance FROM users WHERE id = ?', [userId]);
        if (!targetUser) {
            return res.status(404).json({ status: false, message: "Pengguna target tidak ditemukan." });
        }
        const adminUser = await dbGet('SELECT name FROM users WHERE id = ?', [req.session.userId]);

        const result = await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [parsedAmount, userId]);
        if (result.changes === 0) {
            return res.status(404).json({ status: false, message: "Gagal update, pengguna tidak ditemukan." });
        }

        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [userId]);

        // === LOGIKA BARU: HANYA JIKA SALDO DITAMBAH (TOP UP) ===
        if (parsedAmount > 0) {
            const topUpId = `TU-ADMIN-${Date.now()}`;
            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, targetUser.name, parsedAmount, parsedAmount, 'completed', new Date().toISOString()]
            );

            const notifMessage = `<b>✅ Top Up Manual Berhasil</b>
──────────────────────
👨‍💼 <b>Oleh Admin:</b> ${adminUser.name}
👤 <b>Untuk Pengguna:</b> ${targetUser.name}
💰 <b>Jumlah:</b> Rp ${parsedAmount.toLocaleString('id-ID')}
📈 <b>Saldo Baru:</b> Rp ${updatedUser.balance.toLocaleString('id-ID')}
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`;
            sendTelegramNotification(notifMessage, 'group');

            // ⬇️ Tambahkan 2 baris SSE ini
            sseSend(userId, 'balance_update', { balance: updatedUser.balance, source: 'admin' });
            sseSend(userId, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up manual berhasil' });
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
        if (!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
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
    } catch (e) { res.status(500).json({ status: false, message: "Gagal menghapus pengguna." }); }
});

app.delete('/api/admin/delete-zero-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await dbRun("DELETE FROM users WHERE balance = 0 AND role != 'admin'");
        if (result.changes > 0) {
            // Optional: Log or notify about deleted accounts
            sendTelegramNotification(`🗑️ <b>${result.changes} Akun Saldo 0 Telah Dihapus</b>\nOleh Admin: ${req.session.userId}`, 'admin');
            res.json({ status: true, message: `${result.changes} akun dengan saldo 0 berhasil dihapus.` });
        } else {
            res.json({ status: true, message: "Tidak ada akun dengan saldo 0 yang ditemukan untuk dihapus." });
        }
    } catch (e) {
        console.error("Error deleting zero balance accounts:", e);
        res.status(500).json({ status: false, message: "Gagal menghapus akun saldo 0." });
    }
});

// === SSE ENDPOINT ===
app.get('/api/stream', isAuthenticated, (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    // kirim header sekarang
    res.flushHeaders?.();

    const userId = req.session.userId;
    sseAddClient(userId, res);

    // salam + heartbeat
    res.write(`event: hello\ndata: {"ok":true}\n\n`);
    const hb = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);

    req.on('close', () => {
        clearInterval(hb);
        sseRemoveClient(userId, res);
        try { res.end(); } catch { }
    });
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
            return res.status(500).json({ status: false, message: "Gagal menutup database saat ini." });
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
        if (transaction.platformFee > 0) await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [transaction.platformFee, transaction.userId]);
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
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);

        const successfulTransactions = await dbAll("SELECT platformFee, originalPrice FROM transactions WHERE status = 'success' AND createdAt >= ? AND createdAt <= ?", [start.toISOString(), end.toISOString()]);

        const totalNetRevenue = successfulTransactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const totalGrossRevenue = successfulTransactions.reduce((sum, t) => sum + (t.originalPrice || 0), 0);

        res.json({
            status: true, data: {
                totalSuccessfulTransactions: successfulTransactions.length,
                totalNetRevenue,
                totalGrossRevenue,
                totalRevenue: totalGrossRevenue + totalNetRevenue,
                avgNetRevenuePerTrx: successfulTransactions.length > 0 ? totalNetRevenue / successfulTransactions.length : 0,
            }
        });
    } catch (error) { console.error("Error fetching detailed stats:", error); res.status(500).json({ status: false, message: "Gagal mengambil statistik." }); }
});

app.get('/api/admin/download-report', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).send('Tanggal tidak lengkap');
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
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
                        <td data-label="Tanggal">${new Date(item.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
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
    } catch (e) { res.status(500).json({ status: false, message: 'Gagal membaca status.' }) }
});

app.post('/api/admin/maintenance', isAuthenticated, isAdmin, async (req, res) => {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') return res.status(400).json({ status: false, message: 'Input harus boolean.' });
    try {
        await dbRun("UPDATE settings SET value = ? WHERE key = ?", [JSON.stringify(enable), 'maintenanceMode']);

        // --- LOGIKA NOTIFIKASI BARU ---
        if (enable) {
            await sendTelegramNotification(
                `<b>🔧 MAINTENANCE MANUAL DIAKTIFKAN</b>
──────────────────────
Admin telah mengaktifkan mode pemeliharaan. 
Layanan tidak akan dapat diakses untuk sementara waktu.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'group');
            await dbRun("UPDATE settings SET value = 'manual_on' WHERE key = 'maintenanceNotificationSent'");
        } else {
            // Cek dulu apakah ada maintenance lain yang masih aktif
            const otherMaintenanceActive = await getEffectiveMaintenanceStatus();
            if (!otherMaintenanceActive) {
                await sendTelegramNotification(
                    `<b>✅ MAINTENANCE SELESAI</b>
──────────────────────
Layanan kini telah kembali normal dan dapat diakses.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'group');
                await dbRun("UPDATE settings SET value = 'none' WHERE key = 'maintenanceNotificationSent'");
            }
        }
        // --- AKHIR LOGIKA NOTIFIKASI ---

        res.status(200).json({ status: true, message: `Mode pemeliharaan diatur ke: ${enable ? 'AKTIF' : 'NONAKTIF'}` });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal memperbarui status.' });
    }
});

app.post('/api/admin/sync-packages', isAuthenticated, isAdmin, async (req, res) => {
    let transactionStarted = false;
    try {
        const response = await fetch(`https://golang-openapi-packagelist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`, { timeout: 15000 }); // Tambah timeout 15 detik
        const kmspData = await response.json();
        if (!kmspData.status || !Array.isArray(kmspData.data)) throw new Error(kmspData.message || "Gagal mengambil data dari KMSP.");

        const kmspPackages = new Map(kmspData.data.map(p => [p.package_code, p]));
        const localPackages = await dbAll('SELECT package_code FROM packages');
        const localPackageCodes = new Set(localPackages.map(p => p.package_code));
        let added = 0, updated = 0, removed = 0;

        await dbRun("BEGIN TRANSACTION");
        transactionStarted = true;
        for (const [code, pkg] of kmspPackages.entries()) {
            // PERBAIKAN: Harga dari KMSP kemungkinan dalam satuan sen, perlu dibagi 100 untuk Rupiah.
            const price = (parseInt(String(pkg.package_harga).replace(/\D/g, '')) || 0) / 100;
            const methods = JSON.stringify(pkg.available_payment_methods || []);
            if (localPackageCodes.has(code)) {
                await dbRun('UPDATE packages SET name = ?, description = ?, original_price = ?, payment_methods = ? WHERE package_code = ?', [pkg.package_name, pkg.package_description || '', price, methods, code]);
                updated++;
            } else {
                // PERBAIKAN 2: Gunakan query INSERT yang lebih eksplisit dan aman.
                await dbRun(`
                    INSERT INTO packages (package_code, name, description, original_price, platform_fee, reseller_fee, isVisible, category, isMultiPurchase, payment_methods, position) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        code, pkg.package_name, pkg.package_description || '', price,
                        0, // default platform_fee
                        0, // default reseller_fee
                        0, // default isVisible
                        'reguler', // default category
                        0, // default isMultiPurchase
                        methods,
                        0 // default position
                    ]);
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
        if (transactionStarted) {
            await dbRun("ROLLBACK");
        }
        console.error("Sync packages error:", error);
        res.status(500).json({ status: false, message: error.message || "Gagal sinkronisasi paket." });
    }
});

app.get('/api/admin/packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Order packages by position set by admin, then name
        const packages = await dbAll('SELECT * FROM packages ORDER BY position ASC, name ASC');
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
            // --- PERBAIKAN: Tambahkan isResellerOnly dan position ke query UPDATE ---
            await dbRun(`UPDATE packages SET platform_fee = ?, reseller_fee = ?, isVisible = ?, isMultiPurchase = ?, category = ?, isResellerOnly = ?, position = ? WHERE package_code = ?`,
                [
                    update.platform_fee || 0,
                    update.reseller_fee || 0, // Tambahkan ini
                    update.isVisible ? 1 : 0,
                    update.isMultiPurchase ? 1 : 0,
                    ['reguler', 'non-otp'].includes(update.category) ? update.category : 'reguler',
                    update.isResellerOnly ? 1 : 0, // Tambahkan ini
                    Number.isFinite(Number(update.position)) ? Number(update.position) : 0,
                    update.package_code
                ]
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

app.put('/api/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { bgColor } = req.body;
        if (bgColor) {
            const result = await dbRun("UPDATE settings SET value = ? WHERE key = 'announcementBgColor'", [bgColor]);
            if (result.changes === 0) {
                // Tidak ada baris yang diubah, kemungkinan key belum ada
                return res.status(400).json({ status: false, message: "Gagal menyimpan warna: key belum ada di database." });
            }
            res.json({ status: true, message: "Warna banner berhasil disimpan." });
        } else {
            res.status(400).json({ status: false, message: "Parameter warna tidak valid." });
        }
    } catch (error) {
        console.error("Error updating banner color:", error);
        res.status(500).json({ status: false, message: "Gagal update warna banner." });
    }
});
app.post('/api/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim() === '') return res.status(400).json({ status: false, message: 'Pesan tidak boleh kosong.' });
    try {
        await dbRun("DELETE FROM announcements"); // Hanya simpan 1 pengumuman
        await dbRun("INSERT INTO announcements (id, message, createdAt) VALUES (?, ?, ?)", [`ann_${Date.now()}`, message.trim(), new Date().toISOString()]);
        await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('announcementBgColor', '#dc2626')`);
        // TAMBAHAN: Konten info publik yang bisa diedit admin (format markdown)
        await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('publicInfoBox', ? )`, [
            `**REKOMENDASI TRIK INJECT SSH/VPN (BISA DIUPDATE OLEH ADMIN)**\n\n1. XCP 10GB Unli Apps (bagi yang sudah punya paketnya): Mohon sebaiknya dirawat saja, sediakan Pulsa 65 ribu untuk perpanjangan otomatis tiap bulannya.\n\n2. Vip double youtube 69K an unli no fup dan stabil. Paket ada di panel ini (tembak menggunakan saldo panel).\n\n3. Biz Lite/E-Commerce bukan yang biz tayo/starter ya saat ini masih aman UNTUK TKP JABAR, BANTEN, JAKARTA, DAN SUMATERA saja.\n\n**REKOMENDASI: PILIH NO 2.**\n\n(Anda bisa mengubah teks ini di Panel Admin)`
        ]);
        res.json({ status: true, message: 'Pengumuman berhasil dikirim.' });
    } catch (e) { res.status(500).json({ status: false, message: "Gagal mengirim pengumuman." }) }
});

app.get('/api/user/announcement', isAuthenticated, async (req, res) => {
    try {
        const announcement = await dbGet("SELECT * FROM announcements ORDER BY createdAt DESC LIMIT 1");
        const bgColorRow = await dbGet("SELECT value FROM settings WHERE key = 'announcementBgColor'");
        res.json({
            status: true,
            data: {
                ...announcement,
                bgColor: bgColorRow ? bgColorRow.value : '#dc2626' // fallback ke merah jika belum ada
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal memuat pengumuman." });
    }
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
        if (tutorial.content) tutorial.content = JSON.parse(tutorial.content);
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
    // PERUBAHAN DI SINI: Susun parameter API dengan menyertakan ewalletNumber dari DB
    const params = {
        api_key: KMSP_API_KEY,
        package_code: trx.packageId,
        phone: trx.targetPhone,
        payment_method: trx.paymentMethod || 'balance',
        price_or_fee: trx.originalPrice,
        ewallet_number: '' // Default ke string kosong
    };
    if (isOtp) params.access_token = trx.accessToken;
    // Tambahkan ewallet_number jika metodenya OVO dan datanya ada di transaksi
    if (params.payment_method.toUpperCase() === 'OVO' && trx.ewalletNumber) {
        params.ewallet_number = trx.ewalletNumber;
    }
    // AKHIR PERUBAHAN

    const url = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${new URLSearchParams(params).toString()}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const success = response.ok && data.status;
        let paymentDetails = null;

        if (success && data.data && (data.data.is_qris || data.data.have_deeplink)) {
            if (data.data.is_qris && data.data.qris_data?.qr_code) {
                data.data.qris_data.qr_code_base64 = await qrcode.toDataURL(data.data.qris_data.qr_code);
            }
            paymentDetails = JSON.stringify(data.data);
        }

        const finalStatus = success ? 'success' : 'failed';
        const finalMessage = data.message || (success ? 'Sukses diproses dari antrean' : 'Gagal');
        const kmspTrxId = data.data?.trx_id || trx.kmspTrxId;

        await dbRun(
            "UPDATE transactions SET status = ?, api_response = ?, kmspTrxId = ?, paymentDetails = ? WHERE id = ?",
            [finalStatus, finalMessage, kmspTrxId, paymentDetails, trx.id]
        );

    } catch (error) {
        await dbRun("UPDATE transactions SET status = ?, api_response = ? WHERE id = ?", ['failed', `Scheduler Error: ${error.message}`, trx.id]);
    }
}
const executeOtpPurchase = (trx) => executePurchase(trx, true);
const executeNonOtpPurchase = (trx) => executePurchase(trx, false);

// --- SCHEDULER UNTUK CEK SALDO DAN PROSES TRANSAKSI (Setiap 5 Menit) ---
// GANTI SELURUH BLOK CRON JOB LAMA ANDA DENGAN INI
cron.schedule('*/1 * * * *', async () => {
    console.log(`[Scheduler] Menjalankan tugas pengecekan pada ${new Date().toLocaleString()}`);
    try {
        // --- LOGIKA NOTIFIKASI MAINTENANCE BARU (STATE-BASED) ---
        const currentBalance = await getKmspAdminBalance();
        await dbRun("UPDATE settings SET value = ? WHERE key = 'lastKmspBalance'", [currentBalance.toString()]);

        const isCurrentlyMaintenance = await getEffectiveMaintenanceStatus();
        const settingsRows = await dbAll("SELECT key, value FROM settings");
        const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        const lastNotifSent = settings.maintenanceNotificationSent;

        // Kondisi 1: Maintenance BARU SAJA AKTIF (sebelumnya tidak, sekarang iya)
        if (isCurrentlyMaintenance && lastNotifSent === 'none') {
            // Cek penyebab maintenance
            if (currentBalance < 1500) {
                // Notif karena saldo rendah
                await sendTelegramNotification(
                    `<b>🚨 MAINTENANCE OTOMATIS AKTIF (SALDO RENDAH) 🚨</b>
──────────────────────
Saldo KMSP Anda saat ini adalah <b>Rp ${currentBalance.toLocaleString('id-ID')}</b>. 
Sistem mengaktifkan mode pemeliharaan. Mohon segera isi ulang.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'admin');
                await sendTelegramNotification(
                    `<b>🔧 MAINTENANCE INTERNAL</b>
──────────────────────
Layanan sedang mengalami pemeliharaan internal singkat.
Mohon coba kembali dalam beberapa saat.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'group');
                await dbRun("UPDATE settings SET value = 'low_balance' WHERE key = 'maintenanceNotificationSent'");

            } else if (settings.maintenanceScheduleEnabled === 'true') {
                // Notif karena jadwal
                await sendTelegramNotification(
                    `<b>🔧 MAINTENANCE TERJADWAL AKTIF</b>
──────────────────────
Sistem sedang dalam mode pemeliharaan terjadwal dari pukul <b>${settings.maintenanceStartTime}</b> hingga <b>${settings.maintenanceEndTime}</b> WIB.
Layanan akan kembali normal setelahnya.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'group');
                await dbRun("UPDATE settings SET value = 'scheduled' WHERE key = 'maintenanceNotificationSent'");
            }
        }
        // Kondisi 2: Maintenance BARU SAJA SELESAI (sebelumnya aktif, sekarang tidak)
        else if (!isCurrentlyMaintenance && lastNotifSent !== 'none' && lastNotifSent !== 'manual_on') {
            await sendTelegramNotification(
                `<b>✅ MAINTENANCE SELESAI</b>
──────────────────────
Layanan kini telah kembali normal dan dapat diakses.
──────────────────────
<b>Notif:ry-itsolutionts.web.id</b>`, 'group');
            await dbRun("UPDATE settings SET value = 'none' WHERE key = 'maintenanceNotificationSent'");
        }

        // --- PROSES ANTRIAN TRANSAKSI ---
        // Hanya proses antrean jika TIDAK sedang maintenance
        const pendingTransactions = await dbAll("SELECT * FROM transactions WHERE status = 'menunggu_saldo_provider'");
        if (pendingTransactions.length > 0 && !isCurrentlyMaintenance) {
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
<b>Notif:ry-itsolutionts.web.id</b>`;
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
<b>Notif:ry-itsolutionts.web.id</b>`;
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

// --- Reseller retention check function (can be scheduled or triggered on-demand) ---
async function runResellerRetentionCheck() {
    console.log('[Scheduler][ResellerRetention] Menjalankan cek retention reseller pada', new Date().toISOString());
    const downgraded = [];
    try {
        // Hitung periode: previous calendar month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        const resellers = await dbAll("SELECT id, name, email, upgradedToResellerAt FROM users WHERE role = 'reseller'");
        // Use calendar-month windows anchored to upgradedToResellerAt (fair per-user)
        for (const r of resellers) {
            if (!r.upgradedToResellerAt) {
                console.log(`[Scheduler][ResellerRetention] Skipping ${r.id} (${r.name}) - no upgradedToResellerAt`);
                continue;
            }
            const upgradedAt = new Date(r.upgradedToResellerAt);
            const nowDate = new Date();
            // compute how many whole months have passed since upgradedAt
            const monthsDiff = (nowDate.getFullYear() - upgradedAt.getFullYear()) * 12 + (nowDate.getMonth() - upgradedAt.getMonth());
            if (monthsDiff < 0) {
                console.log(`[Scheduler][ResellerRetention] Skipping ${r.id} (${r.name}) - upgradedAt in future?`);
                continue;
            }

            // helper to compute window start for a given month offset from upgradedAt
            const getWindowStartForOffset = (offset) => {
                const baseMonth = upgradedAt.getMonth() + offset;
                const year = upgradedAt.getFullYear() + Math.floor(baseMonth / 12);
                const month = ((baseMonth % 12) + 12) % 12;
                const desiredDay = upgradedAt.getDate();
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                const day = Math.min(desiredDay, lastDayOfMonth);
                return new Date(year, month, day, upgradedAt.getHours(), upgradedAt.getMinutes(), upgradedAt.getSeconds(), upgradedAt.getMilliseconds());
            };

            const windowStart = getWindowStartForOffset(monthsDiff);
            const windowEnd = getWindowStartForOffset(monthsDiff + 1);
            const windowStartISO = windowStart.toISOString();
            const windowEndISO = windowEnd.toISOString();

            // Count successful purchases in this calendar-window (anchored to upgrade date)
            const row = await dbGet("SELECT COUNT(*) as cnt FROM transactions WHERE userId = ? AND status = 'success' AND createdAt >= ? AND createdAt < ?", [r.id, windowStartISO, windowEndISO]);
            const cnt = row?.cnt || 0;
            console.log(`[Scheduler][ResellerRetention] User ${r.id} (${r.name}) - purchases in window ${windowStartISO}..${windowEndISO}: ${cnt}`);
            if (cnt < 5) {
                await dbRun("UPDATE users SET role = 'user', upgradedToResellerAt = NULL WHERE id = ?", [r.id]);
                downgraded.push({
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    purchasesInWindow: cnt,
                    windowStart: windowStartISO,
                    windowEnd: windowEndISO
                });

                const startFmt = windowStart.toLocaleDateString('id-ID');
                const endFmt = windowEnd.toLocaleDateString('id-ID');
                const nowFmt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

                // Notifikasi singkat dan rapi ke grup/user
                await sendTelegramNotification(
                    `<b>⚠️ Reseller Diturunkan</b>
                ──────────────────────
                Halo <b>${r.name}</b>,
                Peran <b>Reseller</b> Anda dikembalikan menjadi <b>User</b>.
                Alasan: Hanya <b>${cnt}</b> pembelian pada periode <b>${startFmt}</b> — <b>${endFmt}</b> (dibutuhkan ≥ 5).
                Untuk kembali menjadi Reseller, lakukan top up minimal Rp 50.000 atau capai 5 pembelian.
                Waktu: ${nowFmt}`, 'group');

                // Notifikasi rinci untuk admin
                await sendTelegramNotification(
                    `<b>ℹ️ Reseller Diturunkan — Detail</b>
                ──────────────────────
                Pengguna: <b>${r.name}</b> (${r.email})
                Periode: <b>${startFmt}</b> — <b>${endFmt}</b>
                Jumlah pembelian: <b>${cnt}</b>
                Aksi: Peran diubah menjadi <b>User</b>
                Waktu eksekusi: ${nowFmt}`, 'admin');
                sseSend(r.id, 'role_change', { newRole: 'user', reason: 'Jumlah pembelian kurang dari 5 pada periode retensi.' });
                console.log(`[Scheduler][ResellerRetention] Downgraded ${r.name} due to insufficient purchases (${cnt}) in window.`);
            }
        }
    } catch (err) {
        console.error('[Scheduler][ResellerRetention] Error:', err && err.message ? err.message : err);
        throw err;
    }
    return { downgraded, checkedAt: new Date().toISOString() };
}

// Schedule monthly (1st of month at 00:05)
cron.schedule('5 0 1 * *', async () => {
    try { await runResellerRetentionCheck(); } catch (e) { console.error('Monthly retention job failed:', e); }
}, { scheduled: true, timezone: 'Asia/Jakarta' });

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


// --- MANUAL SERVICES (UNBLOCK IMEI & CEIR) ---
const manualOrderStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public', 'uploads', 'manual_orders');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});
const manualOrderUpload = multer({ storage: manualOrderStorage, limits: { fileSize: 10 * 1024 * 1024 } }).fields([{ name: 'image', maxCount: 20 }, { name: 'ceir_image', maxCount: 20 }]);

app.get('/api/admin/ceirgo-services', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (!CEIRGO_API_KEY) return res.status(200).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi' });

        const response = await axios.get(`${CEIRGO_BASE_URL}/api/services?limit=50`, {
            headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}` }
        });

        if (response.data?.data?.page?.items) {
            const services = response.data.data.page.items;
            const detailedServices = await Promise.all(services.map(async (svc) => {
                try {
                    const detailRes = await axios.get(`${CEIRGO_BASE_URL}/api/services/${svc.code}`, {
                        headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}` }
                    });
                    return {
                        code: svc.code,
                        name: svc.name,
                        modalPrice: detailRes.data?.data?.rule?.unit_price || 0
                    };
                } catch (e) {
                    return { code: svc.code, name: svc.name, modalPrice: 0 };
                }
            }));
            res.json({ status: true, data: detailedServices });
        } else {
            res.json({ status: false, message: 'Gagal mengambil layanan CEIRGO' });
        }
    } catch (e) { res.status(500).json({ status: false, message: 'Kesalahan CEIRGO' }); }
});

app.get('/api/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const rows = await dbAll("SELECT key, value FROM settings WHERE key IN ('ceirgo_visible_cek_ceir', 'ceirgo_visible_barcode')");
        const data = { cekCeir: [], barcode: [] };
        for (const row of rows) {
            if (row.key === 'ceirgo_visible_cek_ceir') data.cekCeir = row.value ? JSON.parse(row.value) : [];
            if (row.key === 'ceirgo_visible_barcode') data.barcode = row.value ? JSON.parse(row.value) : [];
        }
        res.json({ status: true, data });
    } catch (error) {
        console.error('[API] Error fetching CeirGO display settings:', error.message);
        res.status(500).json({ status: false, message: 'Gagal mengambil pengaturan tampil CeirGO.' });
    }
});

app.put('/api/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { cekCeir = [], barcode = [] } = req.body || {};
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['ceirgo_visible_cek_ceir', JSON.stringify(Array.isArray(cekCeir) ? cekCeir : [])]);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['ceirgo_visible_barcode', JSON.stringify(Array.isArray(barcode) ? barcode : [])]);
        res.json({ status: true, message: 'Pengaturan tampil CeirGO disimpan.' });
    } catch (error) {
        console.error('[API] Error saving CeirGO display settings:', error.message);
        res.status(500).json({ status: false, message: 'Gagal menyimpan pengaturan tampil CeirGO.' });
    }
});

app.post('/api/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { cekCeir = [], barcode = [] } = req.body || {};
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['ceirgo_visible_cek_ceir', JSON.stringify(Array.isArray(cekCeir) ? cekCeir : [])]);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['ceirgo_visible_barcode', JSON.stringify(Array.isArray(barcode) ? barcode : [])]);
        res.json({ status: true, message: 'Pengaturan tampil CeirGO disimpan.' });
    } catch (error) {
        console.error('[API] Error saving CeirGO display settings:', error.message);
        res.status(500).json({ status: false, message: 'Gagal menyimpan pengaturan tampil CeirGO.' });
    }
});

app.post('/api/admin/ceirgo-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        await dbRun("BEGIN TRANSACTION");
        for (const [code, price] of Object.entries(pricing)) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [`ceirgo_price_${code}`, price.toString()]);
        }
        await dbRun("COMMIT");
        const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'ceirgo_price_%'");
        const savedPricing = rows.reduce((acc, row) => {
            acc[row.key.replace('ceirgo_price_', '')] = parseInt(row.value) || 0;
            return acc;
        }, {});
        res.json({ status: true, message: 'Harga berhasil disimpan!', data: savedPricing });
    } catch (error) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: error.message });
    }
});

app.put('/api/admin/ceirgo-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        await dbRun("BEGIN TRANSACTION");
        for (const [code, price] of Object.entries(pricing)) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [`ceirgo_price_${code}`, price.toString()]);
        }
        await dbRun("COMMIT");
        const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'ceirgo_price_%'");
        const savedPricing = rows.reduce((acc, row) => {
            acc[row.key.replace('ceirgo_price_', '')] = parseInt(row.value) || 0;
            return acc;
        }, {});
        res.json({ status: true, message: 'Harga berhasil disimpan!', data: savedPricing });
    } catch (error) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: error.message });
    }
});

// ponytail: /api/ceirgo-pricing moved to ceirgoRoutes.js (returns admin prices from DB)

// Endpoint untuk membaca menu aktif
app.get('/api/admin/menu-settings', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'show_beli_paket'");
        // Default: false (hidden) jika belum diset
        res.json({ status: true, data: { showBeliPaket: row ? row.value === 'true' : false } });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

// Endpoint untuk Admin menyimpan status menu
app.put('/api/admin/menu-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { showBeliPaket } = req.body;
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('show_beli_paket', ?)", [showBeliPaket ? 'true' : 'false']);
        res.json({ status: true, message: 'Pengaturan menu berhasil disimpan' });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.get('/api/manual-services-pricing', async (req, res) => {
    try {
        const defaults = {
            imei_speed_fast_status: 'hidden',
            imei_speed_semi_status: 'hidden',
            imei_speed_slow_status: 'hidden'
        };
        for (const [key, value] of Object.entries(defaults)) {
            await dbRun("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
        }
        const rows = await dbAll("SELECT key, value FROM settings WHERE key IN ('price_ceir_history', 'price_ceir_register', 'imei_speed_fast', 'imei_speed_semi', 'imei_speed_slow', 'imei_speed_fast_status', 'imei_speed_semi_status', 'imei_speed_slow_status')");
        const pricing = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        for (const [key, value] of Object.entries(defaults)) {
            if (!(key in pricing)) pricing[key] = value;
        }
        res.json({ status: true, data: pricing });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/admin/manual-services-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        for (const [key, value] of Object.entries(pricing)) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value.toString()]);
        }
        res.json({ status: true, message: 'Harga layanan CEIR berhasil diperbarui' });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.get('/api/imei-packages', async (req, res) => {
    try {
        const showAll = req.query.all === 'true';
        const packages = await dbAll(showAll ? "SELECT * FROM imei_packages" : "SELECT * FROM imei_packages WHERE isVisible = 1 OR isVisible IS NULL");
        res.json({ status: true, data: packages });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.put('/api/admin/imei-packages/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { isVisible } = req.body;
        await dbRun("UPDATE imei_packages SET isVisible = ? WHERE id = ?", [isVisible ? 1 : 0, req.params.id]);
        res.json({ status: true, message: "Status paket berhasil diubah" });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/admin/imei-packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { duration, price } = req.body;
        if (!duration || !price) return res.status(400).json({ status: false, message: "Isi durasi dan harga" });
        const id = `imei_${Date.now()}`;
        await dbRun("INSERT INTO imei_packages (id, duration, price) VALUES (?, ?, ?)", [id, duration, price]);
        res.json({ status: true, message: "Paket berhasil ditambahkan" });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.get('/api/imei-service-status', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'imei_service_status'");
        const noteRow = await dbGet("SELECT value FROM settings WHERE key = 'imei_service_note'");
        res.json({ status: true, isOpen: row ? row.value === 'true' : true, note: noteRow ? noteRow.value : '' });
    } catch (e) { res.status(500).json({ status: false }); }
});

app.post('/api/admin/imei-service-status', isAuthenticated, isAdmin, async (req, res) => {
    const { isOpen, note } = req.body;
    try {
        const isServiceOpen = (isOpen === true || isOpen === 'true');
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('imei_service_status', ?)", [isServiceOpen ? 'true' : 'false']);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('imei_service_note', ?)", [note || '']);

        const statusText = isServiceOpen ? 'OPEN / BUKA 🔓' : 'CLOSE / TUTUP 🔒';
        let msg = `Layanan Unblock IMEI sekarang statusnya: ${statusText}.`;
        if (!isServiceOpen && note) msg += ` Info: ${note}`;

        await dbRun("DELETE FROM announcements");
        await dbRun("INSERT INTO announcements (id, message, createdAt) VALUES (?, ?, ?)", [`ann_${Date.now()}`, msg, new Date().toISOString()]);

        res.json({ status: true, message: 'Status IMEI berhasil diupdate.' });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.delete('/api/admin/imei-packages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("DELETE FROM imei_packages WHERE id = ?", [req.params.id]);
        res.json({ status: true, message: "Paket berhasil dihapus" });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.put('/api/admin/imei-packages/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { isVisible } = req.body;
        await dbRun("UPDATE imei_packages SET isVisible = ? WHERE id = ?", [isVisible ? 1 : 0, req.params.id]);
        res.json({ status: true, message: "Status paket berhasil diubah" });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

// Alias: frontend cek-ceir & barcode submit to /api/order/ceir
app.post('/api/order/ceir', isAuthenticated, (req, res) => {
    // Rewrite path and re-dispatch through Express router
    req.url = '/api/order/manual';
    app.handle(req, res);
});

app.post('/api/order/manual', isAuthenticated, (req, res) => {
    manualOrderUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ status: false, message: err.message });
        try {
            const { service_type, imei, duration, price_key, speed_option } = req.body;
            if (!['imei', 'ceir'].includes(service_type)) return res.status(400).json({ status: false, message: "Tipe layanan tidak valid" });
            if (!imei) return res.status(400).json({ status: false, message: "IMEI harus diisi" });

            // Parsing multi-IMEI
            const imeiList = imei.split(/[\n,]+/).map(i => i.replace(/\s+/g, '').trim()).filter(i => i.length >= 15);
            if (imeiList.length === 0) return res.status(400).json({ status: false, message: "Tidak ada IMEI valid yang dimasukkan" });
            const imeiCount = imeiList.length;
            const cleanImei = imeiList.join(', ');

            if (service_type === 'ceir' && imeiCount > 1) {
                return res.status(400).json({ status: false, message: "Layanan Cek CEIR hanya bisa 1 IMEI per transaksi." });
            }

            let price = 0;
            if (service_type === 'imei') {
                const pkg = await dbGet("SELECT price FROM imei_packages WHERE id = ?", [price_key]);
                if (!pkg) return res.status(400).json({ status: false, message: "Paket IMEI tidak ditemukan" });
                price = pkg.price;

                // Tambah harga speed jika ada
                if (speed_option) {
                    const speedPriceRow = await dbGet("SELECT value FROM settings WHERE key = ?", [`imei_speed_${speed_option}`]);
                    if (speedPriceRow && speedPriceRow.value !== 'disabled') {
                        price += parseInt(speedPriceRow.value) || 0;
                    }
                }
            } else {
                const canonicalKey = price_key.replace(/^ceirgo_price_/, '');
                const priceKeys = [
                    `ceirgo_price_${canonicalKey}`,
                    canonicalKey,
                    price_key
                ];
                let priceRow = null;
                for (const key of priceKeys) {
                    priceRow = await dbGet("SELECT value FROM settings WHERE key = ?", [key]);
                    if (priceRow && Number(priceRow.value) > 0) break;
                }
                if (!priceRow) return res.status(400).json({ status: false, message: "Harga CEIR tidak ditemukan" });
                price = parseInt(priceRow.value) || 0;
            }

            const totalPrice = price * imeiCount;

            const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
            if (user.balance < totalPrice) return res.status(402).json({ status: false, message: `Saldo tidak mencukupi untuk ${imeiCount} IMEI` });

            await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [totalPrice, req.session.userId]);

            const trxId = `trx_m_${Date.now()}`;
            const packageName = service_type === 'imei' ? `Unblock IMEI (${duration}) x${imeiCount}` : `Cek CEIR (${duration})`;

            let imagePaths = [];
            if (req.files && req.files['image']) {
                imagePaths = req.files['image'].map(f => `/public/uploads/manual_orders/${f.filename}`);
            }
            const imagePath = imagePaths.length > 0 ? imagePaths.join(',') : null;

            let ceirImagePaths = [];
            if (req.files && req.files['ceir_image']) {
                ceirImagePaths = req.files['ceir_image'].map(f => `/public/uploads/manual_orders/${f.filename}`);
            }
            const ceirImagePath = ceirImagePaths.length > 0 ? ceirImagePaths.join(',') : null;

            let finalStatus = 'pending';
            let apiResponse = 'Selesai / Sedang Diproses Admin';
            let adminNote = null;
            let adminImagePath = null;
            let refId = null;

            // Jika layanan CEIR, otomatis tembak ke Ceirgo API
            async function orderCeirgo(serviceCode, payload) {
                if (!CEIRGO_API_KEY) throw new Error("CEIRGO_API_KEY tidak dikonfigurasi.");
                const res = await fetch(`${CEIRGO_BASE_URL}/api/order`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        code: serviceCode,
                        data: payload
                    })
                });
                if (!res.ok) { const err = await res.text(); throw new Error(`CeirGO API Error ${res.status}: ${err}`); }
                return await res.json();
            }

            if (service_type === 'ceir') {
                try {
                    // Mapping service code langsung dari frontend price_key
                    let ceirgoServiceCode = price_key;
                    if (price_key === 'price_ceir_register') ceirgoServiceCode = 'cek_imei_beacukai';
                    if (price_key === 'price_ceir_history') ceirgoServiceCode = 'cek_history_imei';

                    let payloadData = {};
                    const isBarcode = ceirgoServiceCode.includes('barcode');

                    if (isBarcode) {
                        payloadData = {
                            items: [{
                                primary_imei: cleanImei,
                                secondary_imei: req.body.imei2 || cleanImei,
                                theme: req.body.theme || "dark"
                            }]
                        };
                    } else {
                        payloadData = { imeis: [cleanImei] };
                    }

                    const ceirResponse = await orderCeirgo(ceirgoServiceCode, payloadData);
                    refId = ceirResponse.reference_id || ceirResponse.order_id?.toString();

                    if (ceirResponse.status === 'success') {
                        finalStatus = 'success';
                        const resultObj = ceirResponse.result;

                        if (ceirgoServiceCode === 'cek_imei_beacukai' && Array.isArray(resultObj)) {
                            const resultItem = resultObj.find(r => r.imei === cleanImei);
                            adminNote = `Status Beacukai: ${resultItem?.status || 'UNKNOWN'}`;
                        } else if (ceirgoServiceCode === 'cek_history_imei' && Array.isArray(resultObj)) {
                            const resultItem = resultObj.find(r => r.imei === cleanImei);
                            adminNote = `Ditemukan ${resultItem?.history?.length || 0} riwayat CEIR.`;
                        } else if (ceirgoServiceCode === 'cek_validity' && Array.isArray(resultObj)) {
                            const resultItem = resultObj.find(r => r.imei === cleanImei);
                            adminNote = `Status: ${resultItem?.status || 'UNKNOWN'} | Valid Until: ${resultItem?.valid_until || 'N/A'}`;
                        } else if (isBarcode && resultObj && resultObj.items && Array.isArray(resultObj.items)) {
                            // Untuk layanan barcode
                            const item = resultObj.items[0];
                            if (item && item.url) {
                                adminImagePath = item.url;
                                adminNote = `Barcode berhasil di-generate. Silakan lihat gambar.`;
                            } else {
                                adminNote = "Sedang diproses manual oleh Admin.";
                            }
                        } else {
                            // Untuk SF, DIGI, dll (model bucket array di dalam object)
                            let foundBucket = 'UNKNOWN';
                            if (resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj)) {
                                for (const [bucketName, imeiArray] of Object.entries(resultObj)) {
                                    if (Array.isArray(imeiArray) && imeiArray.includes(cleanImei)) {
                                        foundBucket = bucketName;
                                        break;
                                    }
                                }
                            }
                            adminNote = `Status Terdeteksi: ${foundBucket}`;
                        }
                        apiResponse = 'Berhasil otomatis dari CEIRGO';

                    } else if (ceirResponse.status === 'pending') {
                        finalStatus = 'processing';
                        adminNote = "Pesanan sedang diproses oleh API CEIRGO...";
                    }
                } catch (e) {
                    console.error("[AUTO_CEIR_ERROR]", e);
                    adminNote = "Sedang diproses manual oleh Admin.";
                }
            }

            await dbRun(`
                INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, status, api_response, admin_note, admin_image, kmspTrxId, createdAt, service_type, imei, user_image, user_image_ceir, speed_option)
                VALUES (?, ?, (SELECT name FROM users WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [trxId, req.session.userId, req.session.userId, price_key, packageName, totalPrice, totalPrice, '', 'balance', finalStatus, apiResponse, adminNote, typeof adminImagePath !== 'undefined' ? adminImagePath : null, refId, new Date().toISOString(), service_type, cleanImei, imagePath, ceirImagePath, speed_option]);


            if (finalStatus !== 'success') {
                const tMsg = `📦 <b>Ada Pesanan Manual Baru</b>
Layanan: ${packageName}
Harga: Rp ${totalPrice.toLocaleString('id-ID')}
IMEI: ${cleanImei}
Status: ${finalStatus}

Segera cek di Panel Admin!`;
                // Kirim gambar pertama ke Telegram jika ada
                const localImagePath = req.files && req.files['image'] && req.files['image'][0] ? req.files['image'][0].path : null;
                sendManualOrderNotification(tMsg, trxId, localImagePath);
            }
            res.json({
                status: true,
                message: finalStatus === 'success' ? "Pesanan otomatis berhasil diproses!" : "Pesanan berhasil dibuat, sedang diproses.",
                data: {
                    adminNote: adminNote,
                    adminImage: typeof adminImagePath !== 'undefined' ? adminImagePath : null
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, message: "Terjadi kesalahan server" });
        }
    });
});

app.get('/api/admin/manual-orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const orders = await dbAll("SELECT * FROM transactions WHERE service_type IN ('imei', 'ceir') ORDER BY createdAt DESC");
        res.json({ status: true, data: orders });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

app.put('/api/admin/manual-orders/:id', isAuthenticated, isAdmin, (req, res) => {
    manualOrderUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ status: false, message: err.message });
        try {
            const trxId = req.params.id;
            const { status, admin_note } = req.body;

            const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
            if (!trx) return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan" });

            let adminImagePath = trx.admin_image;
            if (req.files && req.files['image']) adminImagePath = `/public/uploads/manual_orders/${req.files['image'][0].filename}`;

            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, admin_image = ?, api_response = ? WHERE id = ?",
                [status, admin_note, adminImagePath, status === 'failed' ? 'Gagal / Ditolak Admin' : 'Selesai / Sedang Diproses Admin', trxId]);

            // Refund if failed and previously was pending/processing
            if (status === 'failed' && (trx.status === 'pending' || trx.status === 'processing')) {
                await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [trx.platformFee, trx.userId]);
            }

            res.json({ status: true, message: "Pesanan berhasil diupdate" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, message: "Terjadi kesalahan server" });
        }
    });
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

cron.schedule('0 1 1 * *', async () => { // Berjalan jam 01:00 pada hari pertama setiap bulan
    console.log(`[Reseller Check] Memulai pengecekan status reseller bulanan...`);

    try {
        const resellers = await dbAll("SELECT id, name FROM users WHERE role = 'reseller'");
        if (resellers.length === 0) {
            console.log('[Reseller Check] Tidak ada reseller aktif untuk diperiksa.');
            return;
        }

        const today = new Date();
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

        let demotedCount = 0;
        const requiredPurchases = 5;

        for (const reseller of resellers) {
            const purchaseCount = await dbGet(
                "SELECT COUNT(id) as total FROM transactions WHERE userId = ? AND status = 'success' AND createdAt >= ? AND createdAt <= ?",
                [reseller.id, firstDayOfLastMonth.toISOString(), lastDayOfLastMonth.toISOString()]
            );

            const totalPurchases = purchaseCount.total || 0;

            if (totalPurchases < requiredPurchases) {
                // Turunkan peran menjadi 'user'
                await dbRun("UPDATE users SET role = 'user' WHERE id = ?", [reseller.id]);
                demotedCount++;

                // Kirim notifikasi
                const message = `
<b>📉 Peringkat Diturunkan 📉</b>
──────────────────────
<b>Pengguna:</b> ${reseller.name}
<b>Peringkat Lama:</b> Reseller
<b>Peringkat Baru:</b> User
──────────────────────
<b>Alasan:</b> Anda melakukan <b>${totalPurchases} dari ${requiredPurchases}</b> pembelian yang disyaratkan pada bulan lalu. Anda dapat menjadi reseller lagi dengan top up minimal Rp 50.000.`;

                sendTelegramNotification(message, 'group');
                sseSend(reseller.id, 'role_change', { newRole: 'user', reason: 'Aktivitas pembelian bulanan tidak terpenuhi.' });
                console.log(`[Reseller Check] Pengguna ${reseller.name} diturunkan menjadi user.`);
            }
        }

        if (demotedCount > 0) {
            sendTelegramNotification(`<b>[Laporan Bulanan]</b> Sistem telah menurunkan peringkat <b>${demotedCount}</b> reseller karena tidak memenuhi syarat aktivitas.`, 'admin');
        }
        console.log('[Reseller Check] Pengecekan status reseller selesai.');

    } catch (error) {
        console.error('[Reseller Check] Terjadi error saat pengecekan status reseller:', error);
        sendTelegramNotification(`<b>[ERROR]</b> Gagal menjalankan cron job pengecekan status reseller. Detail: ${error.message}`, 'admin');
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});


// --- TELEGRAM INTERACTIVE NOTIFICATION ---
let tgLastUpdateId = 0;

function getInlineKeyboard(trxId) {
    return {
        inline_keyboard: [
            [
                { text: "⏳ Pending", callback_data: `manual_pending_${trxId}` },
                { text: "⚙️ Proses", callback_data: `manual_processing_${trxId}` }
            ],
            [
                { text: "✅ Sukses", callback_data: `manual_success_${trxId}` },
                { text: "❌ Gagal", callback_data: `manual_failed_${trxId}` }
            ]
        ]
    };
}

async function sendManualOrderNotification(message, trxId, imageLocalPath) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

    try {
        if (imageLocalPath && fs.existsSync(imageLocalPath)) {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
            form.append('photo', fs.createReadStream(imageLocalPath));
            form.append('caption', message);
            form.append('parse_mode', 'HTML');
            form.append('reply_markup', JSON.stringify(getInlineKeyboard(trxId)));

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: form
            });
        } else {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            const body = {
                chat_id: TELEGRAM_ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                reply_markup: getInlineKeyboard(trxId)
            };
            await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
        }
    } catch (e) { console.error('Error sendManualOrderNotification', e); }
}

async function pollTelegramUpdates() {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${tgLastUpdateId + 1}&timeout=30`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    tgLastUpdateId = update.update_id;
                    if (update.callback_query) {
                        await handleTelegramCallbackQuery(update.callback_query);
                    }
                }
            }
        }
    } catch (e) { }
    setTimeout(pollTelegramUpdates, 2000);
}

async function handleTelegramCallbackQuery(cb) {
    const data = cb.data;
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;
    const cbId = cb.id;

    if (data.startsWith('manual_')) {
        const parts = data.split('_');
        const status = parts[1];
        const trxId = parts.slice(2).join('_');

        try {
            const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
            if (!trx) {
                await answerCallback(cbId, "Transaksi tidak ditemukan.");
                return;
            }
            if (trx.status === 'success' || trx.status === 'failed') {
                // If it's already final, prevent changes to prevent double refund bugs
                if (trx.status !== status) {
                    await answerCallback(cbId, `Transaksi sudah final (${trx.status}). Tidak bisa diubah lagi via bot.`);
                    return;
                }
            }

            let apiRes = 'Pesanan diproses';
            if (status === 'success') apiRes = 'Pesanan berhasil diselesaikan';
            if (status === 'failed') apiRes = 'Pesanan dibatalkan/ditolak';
            if (status === 'pending') apiRes = 'Menunggu Proses';
            if (status === 'processing') apiRes = 'Sedang diproses';

            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, api_response = ? WHERE id = ?",
                [status, `Status diperbarui menjadi ${status.toUpperCase()}`, apiRes, trxId]);

            // Only refund if it is transitioning to failed from pending/processing
            if (status === 'failed' && (trx.status === 'pending' || trx.status === 'processing')) {
                await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [trx.platformFee, trx.userId]);
            }

            await answerCallback(cbId, `Pesanan ${trxId} diubah menjadi ${status}!`);

            const originalText = cb.message.text.split('\n\n<b>Status Diupdate:')[0];
            const isFinal = (status === 'success' || status === 'failed');
            const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
            await fetch(editUrl, {
                method: 'POST',
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: originalText + `\n\n<b>Status Diupdate: ${status.toUpperCase()}</b>`,
                    parse_mode: 'HTML',
                    reply_markup: isFinal ? { inline_keyboard: [] } : getInlineKeyboard(trxId)
                }),
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (e) {
            console.error('Callback error', e);
            await answerCallback(cbId, "Terjadi kesalahan server.");
        }
    }
}

async function answerCallback(callbackQueryId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
        headers: { 'Content-Type': 'application/json' }
    });
}
// =======================================================
// RUTE PUSAT BANTUAN (TIKET)
// =======================================================

// User: Ambil semua tiket milik user
app.get('/api/user/tickets', isAuthenticated, async (req, res) => {
    try {
        const tickets = await dbAll("SELECT * FROM tickets WHERE userId = ? ORDER BY updatedAt DESC", [req.session.userId]);
        res.json({ status: true, data: tickets });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil daftar tiket.' });
    }
});

// User: Buat tiket baru
app.post('/api/user/tickets', isAuthenticated, async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) return res.status(400).json({ status: false, message: 'Subjek dan pesan wajib diisi.' });

        const ticketId = `TKT-${Date.now()}`;
        const messageId = `MSG-${Date.now()}`;
        const now = new Date().toISOString();

        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO tickets (id, userId, subject, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [ticketId, req.session.userId, subject, 'open', now, now]);
        await dbRun("INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [messageId, ticketId, req.session.userId, 'user', message, now]);
        await dbRun("COMMIT");

        const user = await dbGet("SELECT name FROM users WHERE id = ?", [req.session.userId]);
        sendTelegramNotification(`<b>💬 TIKET BANTUAN BARU</b>\n──────────────────────\n<b>User:</b> ${user.name}\n<b>Subjek:</b> ${subject}\n<b>Pesan:</b>\n<i>${message}</i>\n──────────────────────\nSegera balas di Panel Admin!`, 'admin');

        res.json({ status: true, message: 'Tiket berhasil dibuat.' });
    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: 'Gagal membuat tiket.' });
    }
});

// General: Ambil detail tiket & pesannya
app.get('/api/tickets/:id', isAuthenticated, async (req, res) => {
    try {
        const ticket = await dbGet("SELECT tickets.*, users.name as userName FROM tickets JOIN users ON tickets.userId = users.id WHERE tickets.id = ?", [req.params.id]);
        if (!ticket) return res.status(404).json({ status: false, message: 'Tiket tidak ditemukan.' });

        const currentUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (currentUser.role !== 'admin' && ticket.userId !== req.session.userId) {
            return res.status(403).json({ status: false, message: 'Anda tidak berhak melihat tiket ini.' });
        }

        const messages = await dbAll("SELECT ticket_messages.*, users.name as senderName FROM ticket_messages JOIN users ON ticket_messages.senderId = users.id WHERE ticketId = ? ORDER BY ticket_messages.createdAt ASC", [req.params.id]);
        res.json({ status: true, data: { ticket, messages } });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil detail tiket.' });
    }
});

// General: Balas tiket
app.post('/api/tickets/:id/messages', isAuthenticated, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ status: false, message: 'Pesan wajib diisi.' });

        const ticket = await dbGet("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
        if (!ticket) return res.status(404).json({ status: false, message: 'Tiket tidak ditemukan.' });

        const currentUser = await dbGet('SELECT role, name FROM users WHERE id = ?', [req.session.userId]);
        const isAdminUser = currentUser.role === 'admin';

        if (!isAdminUser && ticket.userId !== req.session.userId) {
            return res.status(403).json({ status: false, message: 'Anda tidak berhak membalas tiket ini.' });
        }

        if (ticket.status === 'closed') {
            return res.status(400).json({ status: false, message: 'Tiket sudah ditutup, tidak bisa dibalas lagi.' });
        }

        const messageId = `MSG-${Date.now()}`;
        const now = new Date().toISOString();
        const newStatus = isAdminUser ? 'answered' : 'open';

        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [messageId, req.params.id, req.session.userId, isAdminUser ? 'admin' : 'user', message, now]);
        await dbRun("UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?", [newStatus, now, req.params.id]);
        await dbRun("COMMIT");

        if (isAdminUser) {
            sseSend(ticket.userId, 'announcement', { title: 'Balasan Tiket', message: `Admin telah membalas tiket Anda: ${ticket.subject}` });
        } else {
            sendTelegramNotification(`<b>💬 BALASAN TIKET</b>\n──────────────────────\n<b>User:</b> ${currentUser.name}\n<b>Subjek:</b> ${ticket.subject}\n<b>Pesan:</b>\n<i>${message}</i>`, 'admin');
        }

        res.json({ status: true, message: 'Balasan terkirim.' });
    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: 'Gagal membalas tiket.' });
    }
});

// Admin: Ambil semua tiket
app.get('/api/admin/tickets', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tickets = await dbAll("SELECT tickets.*, users.name as userName FROM tickets JOIN users ON tickets.userId = users.id ORDER BY tickets.updatedAt DESC");
        res.json({ status: true, data: tickets });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil semua tiket.' });
    }
});

// Admin: Tutup tiket
app.put('/api/admin/tickets/:id/close', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("UPDATE tickets SET status = 'closed', updatedAt = ? WHERE id = ?", [new Date().toISOString(), req.params.id]);
        res.json({ status: true, message: 'Tiket berhasil ditutup.' });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal menutup tiket.' });
    }
});

// Admin: Hapus tiket
app.delete('/api/admin/tickets/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("DELETE FROM ticket_messages WHERE ticketId = ?", [req.params.id]);
        await dbRun("DELETE FROM tickets WHERE id = ?", [req.params.id]);
        await dbRun("COMMIT");
        res.json({ status: true, message: 'Tiket beserta percakapannya berhasil dihapus.' });
    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: 'Gagal menghapus tiket.' });
    }
});
app.listen(PORT, () => {
    pollTelegramUpdates();
    console.log(`🚀 Server 100% Lengkap dengan SQLite3 berjalan di http://localhost:${PORT}`);
});
