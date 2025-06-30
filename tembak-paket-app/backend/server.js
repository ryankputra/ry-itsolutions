// backend/server.js - VERSI LENGKAP FINAL (TERMASUK FITUR PAKET NON-OTP)

require('dotenv').config();
const express = require('express');
const cors =require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Ini sudah ada
const FileStore = require('session-file-store')(session);
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const multer = require('multer');
const excel = require('exceljs'); 

const app = express();
const PORT = process.env.PORT || 3001;
const fileStoreOptions = {
    // --- PERUBAHAN DI BARIS INI ---
    path: path.join(__dirname, 'sessions'), 
    ttl: 86400,
    retries: 0
};
// --- KONFIGURASI KUNCI API ---
const KMSP_API_KEY = process.env.KMSP_API_KEY;
const QRIS_STATIS_STRING = process.env.QRIS_STATIS_STRING;
const OKE_API_KEY = process.env.OKE_API_KEY;
const OKE_API_BASE = process.env.OKE_API_BASE;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!KMSP_API_KEY) {
    console.error("FATAL ERROR: KMSP_API_KEY tidak diset di file .env.");
    process.exit(1);
}

// --- FUNGSI HELPER NOTIFIKASI TELEGRAM ---
async function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("Notifikasi Telegram dinonaktifkan (token atau chat ID tidak diset).");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            console.log("Notifikasi Telegram terkirim.");
        } else {
            const responseJson = await response.json();
            console.error("Gagal mengirim notifikasi Telegram:", responseJson);
        }
    } catch (error) {
        console.error("Error saat mengirim notifikasi Telegram:", error.message);
    }
}

// --- Inisiaalisasi Database dan Middleware ---
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = {
    users: [],
    packages: [],
    transactions: [],
    topups: [],
    announcements: [],
    settings: { maintenanceMode: false }
};
const db = new Low(adapter, defaultData);

async function initializeDatabase() {
    await db.read();
    db.data = db.data || defaultData;
    db.data.users = db.data.users || [];
    db.data.packages = db.data.packages || [];
    db.data.transactions = db.data.transactions || [];
    db.data.topups = db.data.topups || [];
    db.data.announcements = db.data.announcements || [];
    db.data.settings = db.data.settings || { maintenanceMode: false };
    db.data.users = db.data.users.map(user => ({
        ...user,
        verifiedPhone: user.verifiedPhone || null
    }));
    await db.write();
    console.log("Database initialized successfully.");
}
initializeDatabase();

app.use(express.json());
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
app.use(session({
    store: new FileStore(fileStoreOptions), // <-- BARIS BARU: Memberitahu session untuk menggunakan FileStore
    secret: process.env.SESSION_SECRET || 'ganti-dengan-string-acak-yang-super-aman-dan-panjang',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
}));

app.use((req, res, next) => {
    console.log(`[LOGGER] Request Masuk: Method=${req.method}, URL=${req.originalUrl}`);
    next();
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, __dirname); },
    filename: function (req, file, cb) { cb(null, 'db.json'); }
});
const upload = multer({ storage: storage });

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ status: false, message: 'Unauthorized: Anda harus login.' });
};

const isAdmin = (req, res, next) => {
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (user && user.role === 'admin') return next();
    res.status(403).json({ status: false, message: 'Forbidden: Akses ditolak. Anda bukan Admin.' });
};

// --- RUTE AUTENTIKASI PENGGUNA ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ status: false, message: "Nama, email, dan password wajib diisi." });
        const existingUser = db.data.users.find(u => u.email === email);
        if (existingUser) return res.status(409).json({ status: false, message: "Email sudah terdaftar." });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // --- PERUBAHAN DI SINI ---
        // Pengguna baru akan memiliki status 'pending' secara default
        const newUser = { 
            id: `user_${Date.now()}`, 
            name, 
            email, 
            password: hashedPassword, 
            balance: 0, 
            role: 'user', 
            verifiedPhone: null, 
            createdAt: new Date().toISOString(),
            status: 'pending' // Status default untuk persetujuan admin
        };
        // --- AKHIR PERUBAHAN ---

        db.data.users.push(newUser);
        await db.write();
        
        // Mengirim notifikasi ke admin bahwa ada pengguna baru yang mendaftar
        sendTelegramNotification(
`<b>──────────────────────</b>
<b>👤 Registrasi Baru Menunggu Persetujuan</b>
<b>──────────────────────</b>
<b>Nama:</b> ${name}
<b>Email:</b> ${email}
<b>──────────────────────</b>
<b>Harap setujui akun ini di Panel Admin.</b>
<b>Notif:tembak.cloudrystore.xyz</b>`
        );

        res.status(201).json({ status: true, message: "Registrasi berhasil! Akun Anda sedang menunggu persetujuan dari Admin. Silakan hubungi admin untuk aktivasi." });
    } catch (error) { 
        console.error("Register error:", error); 
        res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); 
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.data.users.find(u => u.email === email);
        if (!user) return res.status(401).json({ status: false, message: "Email atau password salah." });
        
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(401).json({ status: false, message: "Email atau password salah." });

        // --- PERUBAHAN DI SINI ---
        // Periksa status persetujuan jika pengguna bukan admin
        if (user.role !== 'admin' && user.status !== 'approved') {
            return res.status(403).json({ status: false, message: "Akun Anda belum disetujui oleh Admin. Silakan hubungi Admin untuk aktivasi." });
        }
        // --- AKHIR PERUBAHAN ---

        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ status: true, message: "Login berhasil!", user: userWithoutPassword });
    } catch (error) { 
        console.error("Login error:", error); 
        res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); 
    }
});


app.post('/api/admin/approve-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ status: false, message: "User ID diperlukan." });
        }

        const userToApprove = db.data.users.find(u => u.id === userId);
        if (!userToApprove) {
            return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        }

        userToApprove.status = 'approved';

        // --- BLOK NOTIFIKASI BARU DIMULAI DI SINI ---
        // Dapatkan info admin yang sedang login untuk dicatat di log
        const adminUser = db.data.users.find(u => u.id === req.session.userId);
        const adminName = adminUser ? adminUser.name : 'Sistem';

        // Buat pesan notifikasi untuk grup log
        const logMessage = `<b>✅ Persetujuan Pengguna Berhasil</b>\n` +
                           `──────────────────────\n` +
                           `👤 <b>Pengguna:</b> ${userToApprove.name} (${userToApprove.email})\n` +
                           `👨‍💼 <b>Disetujui oleh:</b> Admin ${adminName}\n` +
                           `⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
        
        // Panggil fungsi notifikasi (ini tidak akan menunda respons ke frontend)
        sendTelegramNotification(logMessage)
            .catch(err => console.error("[APPROVE_USER_NOTIF] Gagal mengirim notifikasi:", err));
        // --- AKHIR BLOK NOTIFIKASI ---

        await db.write();

        res.status(200).json({ status: true, message: `Pengguna ${userToApprove.name} berhasil disetujui.` });
    } catch (error) {
        console.error("Error approving user:", error);
        res.status(500).json({ status: false, message: "Gagal menyetujui pengguna." });
    }
});

app.post('/api/admin/reject-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ status: false, message: "User ID diperlukan." });
        }

        const userIndex = db.data.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        }

        // Hapus pengguna dari array users
        const rejectedUser = db.data.users.splice(userIndex, 1);
        
        await db.write();

        res.status(200).json({ status: true, message: `Pengguna ${rejectedUser[0].name} berhasil ditolak dan dihapus.` });

    } catch (error) {
        console.error("Error rejecting user:", error);
        res.status(500).json({ status: false, message: "Gagal menolak pengguna." });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ status: false, message: "Gagal logout." });
        res.clearCookie('connect.sid');
        res.status(200).json({ status: true, message: "Logout berhasil." });
    });
});

app.get('/api/admin/backup-database', isAuthenticated, isAdmin, (req, res) => {
    const file = path.join(__dirname, 'db.json');
    res.download(file, 'backup-db.json', (err) => {
        if (err) {
            console.error("Error downloading database:", err);
            res.status(500).json({ status: false, message: "Tidak dapat mengunduh database." });
        }
    });
});

app.post('/api/admin/restore-database', isAuthenticated, isAdmin, upload.single('dbFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: false, message: 'Tidak ada file yang diunggah.' });
    }
    try {
        await db.read();
        db.data.users = db.data.users.map(user => ({
            ...user,
            verifiedPhone: user.verifiedPhone || null
        }));
        await db.write();
        res.json({ status: true, message: 'Database berhasil di-restore! Aplikasi mungkin perlu di-restart untuk menerapkan semua perubahan.' });
    } catch (error) {
        console.error("Error restoring database:", error);
        res.status(500).json({ status: false, message: `Gagal me-restore database. Error: ${error.message}` });
    }
});

app.get('/api/auth/me', (req, res) => {
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (!user) {
        if (req.session) req.session.destroy();
        res.clearCookie('connect.sid');
        return res.status(200).json({ status: true, user: null, maintenanceMode: db.data.settings.maintenanceMode });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ status: true, user: userWithoutPassword, maintenanceMode: db.data.settings.maintenanceMode });
});

app.post('/api/auth/extend-session', isAuthenticated, async (req, res) => {
    const { phone, auth_id } = req.body;
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (!user || user.verifiedPhone !== phone) {
        return res.status(403).json({ status: false, message: "Nomor telepon tidak terasosiasi dengan akun Anda." });
    }
    if (!phone || !auth_id) {
        return res.status(400).json({ status: false, message: "Phone dan auth_id diperlukan." });
    }
    try {
        const kmspUrl = `https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`;
        const response = await fetch(kmspUrl);
        const data = await response.json();
        if (!response.ok || !data.status) {
            throw new Error(data.message || 'Gagal memperpanjang sesi dari KMSP.');
        }
        res.status(200).json({ status: true, message: "Sesi berhasil diperpanjang.", data: data.data });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

app.get('/api/auth/token-list', isAuthenticated, async (req, res) => {
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (!user) {
        return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }
    if (!user.verifiedPhone) {
        return res.status(200).json({ status: true, message: "Tidak ada nomor terverifikasi yang terdaftar untuk akun Anda.", data: [] });
    }
    try {
        const kmspUrl = `https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
        const response = await fetch(kmspUrl);
        const data = await response.json();
        if (!response.ok || !data.status || !Array.isArray(data.data)) {
            throw new Error(data.message || 'Gagal mengambil daftar token dari KMSP atau respons tidak valid.');
        }
        const filteredTokens = data.data.filter(token => token.msisdn === user.verifiedPhone);
        res.status(200).json({ status: true, message: "Daftar token berhasil diambil.", data: filteredTokens });
    } catch (error) {
        console.error("Error fetching token list:", error);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan saat mengambil daftar token." });
    }
});

// --- RUTE VERIFIKASI & PEMBELIAN ---
app.post('/api/phone/request-otp', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Parameter 'phone' diperlukan." });
    try {
        const kmspUrl = `https://golang-openapi-reqotp-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP`;
        const response = await fetch(kmspUrl);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal meminta OTP dari provider.');
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/phone/verify-otp', isAuthenticated, async (req, res) => {
    const { phone, auth_id, otp } = req.body;
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (!user) {
        return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }
    if (!phone || !auth_id || !otp) return res.status(400).json({ status: false, message: "Phone, auth_id, dan OTP diperlukan." });
    try {
        const loginUrl = `https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP&auth_id=${auth_id}&otp=${otp}`;
        const loginResponse = await fetch(loginUrl);
        const loginData = await loginResponse.json();
        if (!loginResponse.ok || !loginData.status) throw new Error(loginData.message || 'Verifikasi OTP Gagal.');
        if (!loginData.data?.access_token) throw new Error('Gagal mendapatkan access token dari provider.');
        user.verifiedPhone = phone;
        await db.write();
        res.status(200).json({ status: true, message: "Nomor berhasil diverifikasi dan disimpan!", data: loginData.data });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

app.post('/api/purchase', isAuthenticated, async (req, res) => {
    const { packageId, phone, accessToken, paymentMethod } = req.body;
    const userId = req.session.userId;
    const user = db.data.users.find(u => u.id === userId);
    if (!user || user.verifiedPhone !== phone) {
        return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda atau tidak cocok." });
    }
    if (!packageId || !phone || !accessToken || !paymentMethod) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });
    }
    const pkg = db.data.packages.find(p => p.package_code === packageId);
    if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });
    const platformFee = pkg.platform_fee || 0;
    if (user.balance < platformFee) {
        return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk membayar biaya layanan sebesar Rp ${platformFee.toLocaleString()}.` });
    }
    user.balance -= platformFee;
    await db.write();

    try {
        const pkgNameLower = (pkg.name || '').toLowerCase();
        const isPulsaMethod = pkgNameLower.includes('[method pulsa]');
        const purchaseParams = new URLSearchParams({ api_key: KMSP_API_KEY, package_code: pkg.package_code, phone, access_token: accessToken, payment_method: paymentMethod });
        const purchaseUrl = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${purchaseParams.toString()}`;
        const purchaseResponse = await fetch(purchaseUrl);
        const purchaseData = await purchaseResponse.json();
        const transactionSucceeded = purchaseResponse.ok && purchaseData.status;
        const newTransaction = {
            id: `trx_${Date.now()}`, userId, userName: user.name,
            packageId, packageName: pkg.name, platformFee,
            originalPrice: pkg.original_price,
            kmspTrxId: purchaseData.data?.trx_id || null,
            status: transactionSucceeded ? 'success' : 'failed',
            api_response: purchaseData.message || (transactionSucceeded ? 'Success' : 'Failed'),
            paymentMethod, createdAt: new Date().toISOString(),
            paymentDetails: (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) ? purchaseData.data : null
            
        };
        db.data.transactions.push(newTransaction);
        await db.write();

        const maskedPhone = phone.length > 7 ? phone.slice(0, 4) + '****' + phone.slice(-3) : '*******';
        let notifMessage = `<b>──────────────────────</b>
<b>✅Transaksi Paket Baru!</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user.name}
<b>Nama Paket:</b> ${pkg.name}
<b>Nomor Tujuan:</b> ${maskedPhone}`;
        if (platformFee > 0) {
            notifMessage += `\n<b>Biaya Layanan:</b> Rp ${platformFee.toLocaleString('id-ID')}`;
        }
        notifMessage += `
<b>Status:Sukses</b>
<b>──────────────────────</b>
<b>Notif:tembak.cloudrystore.xyz</b>`;
        sendTelegramNotification(notifMessage);

        if (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) {
            return res.status(202).json({ status: true, message: "Pembayaran eksternal diperlukan.", payment_data: purchaseData.data, newBalance: user.balance });
        }
        if (transactionSucceeded) {
            return res.status(200).json({ status: true, message: purchaseData.message || "Pembelian berhasil!", newBalance: user.balance });
        } else {
            if (!isPulsaMethod) {
                user.balance += platformFee;
                await db.write();
                return res.status(500).json({ status: false, message: purchaseData.message || 'Pembelian ke provider gagal.' });
            } else {
                return res.status(200).json({ status: true, message: `Transaksi pulsa diproses. (API Response: ${purchaseData.message})`, newBalance: user.balance });
            }
        }
    } catch (error) {
        user.balance += platformFee;
        await db.write();
        console.error("Error saat pembelian:", error);
        return res.status(500).json({ status: false, message: error.message || 'Terjadi kesalahan internal saat pembelian.' });
    }
});


// RUTE BARU UNTUK PEMBELIAN NON-OTP (PAKET AKRAB)
app.post('/api/purchase/non-otp', isAuthenticated, async (req, res) => {
    // Hanya butuh packageId dan phone dari frontend
    const { packageId, phone } = req.body; 
    const userId = req.session.userId;
    const user = db.data.users.find(u => u.id === userId);

    if (!packageId || !phone) {
        return res.status(400).json({ status: false, message: "Parameter paket dan nomor telepon tidak lengkap." });
    }

    const pkg = db.data.packages.find(p => p.package_code === packageId);
    if (!pkg) {
        return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });
    }

    if (pkg.category !== 'non-otp') {
        return res.status(403).json({ status: false, message: "Paket ini bukan kategori Non-OTP. Silakan beli melalui halaman Beli Paket biasa." });
    }

    const platformFee = pkg.platform_fee || 0;
    if (user.balance < platformFee) {
        return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk biaya layanan.` });
    }

    user.balance -= platformFee;
    await db.write();

    try {
        const purchaseParams = new URLSearchParams({
            api_key: KMSP_API_KEY,
            package_code: pkg.package_code,
            phone: phone,
            payment_method: 'balance'
        });
        const purchaseUrl = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${purchaseParams.toString()}`;
        
        const purchaseResponse = await fetch(purchaseUrl);
        const purchaseData = await purchaseResponse.json();
        const transactionSucceeded = purchaseResponse.ok && purchaseData.status;

        const newTransaction = { 
            id: `trx_${Date.now()}`, userId, userName: user.name, packageId, packageName: pkg.name, platformFee,
            originalPrice: pkg.original_price,
            status: transactionSucceeded ? 'success' : 'failed',
            api_response: purchaseData.message || (transactionSucceeded ? 'Success' : 'Failed'),
            paymentMethod: 'balance', createdAt: new Date().toISOString()
        };
        db.data.transactions.push(newTransaction);
        await db.write();
        
        // --- BLOK NOTIFIKASI TELEGRAM YANG DITAMBAHKAN ---
        const maskedPhone = phone.length > 7 ? phone.slice(0, 4) + '****' + phone.slice(-3) : '*******';
        let notifMessage = `<b>──────────────────────</b>
<b>✅ Transaksi Baru! (Non-OTP)</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user.name}
<b>Nama Paket:</b> ${pkg.name}
<b>Nomor Tujuan:</b> ${maskedPhone}`;
        if (platformFee > 0) {
            notifMessage += `\n<b>Biaya Layanan:</b> Rp ${platformFee.toLocaleString('id-ID')}`;
        }
        notifMessage += `
<b>Status:</b> ${transactionSucceeded ? 'Sukses' : 'Gagal'}
<b>Pesan API:</b> ${purchaseData.message || 'N/A'}
<b>──────────────────────</b>
<b>Notif:tembak.cloudrystore.xyz</b>`;
        sendTelegramNotification(notifMessage);
        // --- AKHIR BLOK NOTIFIKASI ---

        if (transactionSucceeded) {
            return res.status(200).json({ status: true, message: purchaseData.message || "Pembelian berhasil!", newBalance: user.balance });
        } else {
            user.balance += platformFee;
            await db.write();
            return res.status(500).json({ status: false, message: purchaseData.message || 'Pembelian ke provider gagal.' });
        }
    } catch (error) {
        user.balance += platformFee;
        await db.write();
        console.error("Error pembelian non-otp:", error);
        return res.status(500).json({ status: false, message: 'Terjadi kesalahan internal.' });
    }
});

// RUTE BARU UNTUK PEMBELIAN MULTI PAKET PULSA
app.post('/api/purchase/multi-pulsa', isAuthenticated, async (req, res) => {
    const { packageIds, phone, accessToken } = req.body;
    const userId = req.session.userId;
    const user = db.data.users.find(u => u.id === userId);

    if (!user || user.verifiedPhone !== phone) {
        return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda." });
    }
    if (!Array.isArray(packageIds) || packageIds.length === 0 || !phone || !accessToken) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap atau format paket salah." });
    }

    const successResults = [];
    const failedResults = [];
    const KMSP_API_DELAY_MS = 12000; // Jeda 12 detik untuk keamanan

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const [index, packageId] of packageIds.entries()) {
        const pkg = db.data.packages.find(p => p.package_code === packageId);
        if (!pkg) {
            failedResults.push({ name: `ID: ${packageId}`, reason: "Paket tidak ditemukan di database." });
            continue;
        }

        const platformFee = pkg.platform_fee || 0;
        if (user.balance < platformFee) {
            failedResults.push({ name: pkg.name, reason: `Saldo tidak cukup (Butuh Rp ${platformFee.toLocaleString()})` });
            continue;
        }

        user.balance -= platformFee;
        await db.write();

        try {
            const purchaseParams = new URLSearchParams({
                api_key: KMSP_API_KEY,
                package_code: pkg.package_code,
                phone,
                access_token: accessToken,
                payment_method: 'balance'
            });
            const purchaseUrl = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${purchaseParams.toString()}`;

            const purchaseResponse = await fetch(purchaseUrl);
            const purchaseData = await purchaseResponse.json();

            const transactionSucceeded = (purchaseResponse.ok && purchaseData.status) || (purchaseData.message && purchaseData.message.toLowerCase().includes("diproses"));

            const newTransaction = {
                id: `trx_${Date.now()}_${index}`, userId, userName: user.name, packageId, packageName: pkg.name, platformFee,
                originalPrice: pkg.original_price,
                status: transactionSucceeded ? 'success' : 'failed',
                api_response: purchaseData.message || (transactionSucceeded ? 'Success' : 'Gagal'),
                paymentMethod: 'balance', createdAt: new Date().toISOString()
            };
            db.data.transactions.push(newTransaction);
            await db.write();

            if (transactionSucceeded) {
                successResults.push({ name: pkg.name, message: purchaseData.message || "Sukses" });
            } else {
                user.balance += platformFee;
                await db.write();
                failedResults.push({ name: pkg.name, reason: purchaseData.message || 'Gagal dari provider.' });
            }

        } catch (error) {
            user.balance += platformFee;
            await db.write();
            failedResults.push({ name: pkg.name, reason: `Error server: ${error.message}` });
        }

        if (index < packageIds.length - 1) {
            await delay(KMSP_API_DELAY_MS);
        }
    }

    const finalUser = db.data.users.find(u => u.id === userId);

    res.status(200).json({
        status: true,
        message: "Proses eksekusi semua paket selesai.",
        data: {
            successes: successResults,
            failures: failedResults,
            newBalance: finalUser.balance
        }
    });
});

app.get('/api/purchase/status/:kmspTrxId', isAuthenticated, async (req, res) => {
    const { kmspTrxId } = req.params;
    const userId = req.session.userId;
    
    try {
        const transaction = db.data.transactions.find(t => t.kmspTrxId === kmspTrxId && t.userId === userId);
        if (!transaction) {
            return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan." });
        }

        // Jika status lokal sudah sukses, tidak perlu cek ke KMSP lagi
        if (transaction.status === 'success') {
            return res.json({ 
                status: true, 
                data: { status: 'success', message: 'Transaksi ini sudah dikonfirmasi berhasil.' } 
            });
        }

        // Lakukan pengecekan ke KMSP
        const kmspUrl = `https://golang-openapi-checktransaction-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&trx_id=${kmspTrxId}`;
        const response = await fetch(kmspUrl);
        const data = await response.json();

        if (!response.ok) {
            // Jika KMSP sendiri mengembalikan error (misal: 500), teruskan pesannya
            throw new Error(data.message || 'Gagal menghubungi provider untuk cek status.');
        }

        // Jika status dari KMSP adalah sukses DAN status lokal kita masih pending/failed, update database kita
        if (data.status && data.data?.status === 'success' && transaction.status !== 'success') {
            transaction.status = 'success';
            transaction.api_response = data.data.message || 'Success (dikofirmasi manual)';
            await db.write();
        }

        // Kirim kembali respons apa adanya dari KMSP ke frontend
        res.json(data);

    } catch (error) {
        console.error("Error checking purchase status:", error);
        res.status(500).json({ status: false, message: error.message || 'Terjadi kesalahan saat memeriksa status pembelian.' });
    }
});

// --- RUTE PENGGUNA ---
app.get('/api/user/packages', isAuthenticated, (req, res) => {
    const visiblePackages = db.data.packages.filter(p => p.isVisible);
    res.status(200).json({ status: true, data: visiblePackages });
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
            throw new Error(data.message || 'Gagal mengambil data stok.');
        }

        // --- LOGIKA BARU ---
        // Kita simpulkan stok berdasarkan is_out_of_stock terlebih dahulu
        const stockValue = data.data.is_out_of_stock ? 0 : (data.data.real_stock_from_suppliers || data.data.real_stock || 0);

        // Kirim kembali format yang sudah disederhanakan
        res.status(200).json({
            status: true,
            message: "Success",
            data: {
                stock: stockValue
            }
        });

    } catch (error) {
        console.error("Error checking package stock:", error.message);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan." });
    }
});


app.get('/api/user/transactions', isAuthenticated, (req, res) => {
    const userTransactions = db.data.transactions.filter(t => t.userId === req.session.userId).map(t => ({ ...t, type: 'purchase' }));
    const userTopups = db.data.topups.filter(tu => tu.userId === req.session.userId).map(tu => ({
        id: tu.id, userId: tu.userId, type: 'topup', status: tu.status, createdAt: tu.createdAt,
        baseAmount: tu.baseAmount, uniqueAmount: tu.uniqueAmount,
        qrisData: tu.qrisBase64Image && typeof tu.uniqueAmount === 'number' ? { base64Image: tu.qrisBase64Image, uniqueAmount: tu.uniqueAmount } : undefined,
        api_response: tu.status === 'pending' ? 'Menunggu Pembayaran' : (tu.status === 'completed' ? 'Selesai' : (tu.status === 'expired' ? 'Kadaluarsa' : (tu.status === 'canceled' ? 'Dibatalkan' : 'Unknown'))),
    }));
    const allUserActivities = [...userTransactions, ...userTopups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ status: true, data: allUserActivities });
});

app.post('/api/user/change-password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ status: false, message: 'Password saat ini dan password baru (minimal 6 karakter) wajib diisi.' });
    }
    try {
        const user = db.data.users.find(u => u.id === req.session.userId);
        if (!user) return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatch) return res.status(401).json({ status: false, message: 'Password saat ini yang Anda masukkan salah.' });
        user.password = await bcrypt.hash(newPassword, 10);
        await db.write();
        res.status(200).json({ status: true, message: 'Password berhasil diubah. Silakan login kembali.' });
    } catch (error) { console.error("Change password error:", error); res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server.' }); }
});

app.post('/api/user/update-profile', isAuthenticated, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ status: false, message: 'Nama tidak boleh kosong.' });
    try {
        const user = db.data.users.find(u => u.id === req.session.userId);
        if (!user) return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        user.name = name.trim();
        await db.write();
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ status: true, message: 'Nama berhasil diperbarui.', user: userWithoutPassword });
    } catch (error) { console.error("Update profile error:", error); res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server.' }); }
});

app.get('/api/user/active-packages', isAuthenticated, async (req, res) => {
    const { accessToken } = req.query; // Ambil accessToken dari query URL

    if (!accessToken) {
        return res.status(400).json({ status: false, message: "Parameter accessToken diperlukan." });
    }

    try {
        const url = `https://golang-openapi-quotadetails-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&access_token=${accessToken}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.status) {
            throw new Error(data.message || 'Gagal mengambil data paket aktif dari provider.');
        }

        // Kirim kembali data ke frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Error checking active packages:", error.message);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan pada server." });
    }
});

// --- RUTE ADMIN ---
app.get('/api/admin/detailed-stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ status: false, message: 'Parameter startDate dan endDate diperlukan.' });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filter transaksi berdasarkan rentang tanggal dan yang statusnya berhasil
        const successfulTransactions = db.data.transactions.filter(t => {
            const trxDate = new Date(t.createdAt);
            return t.status === 'success' && trxDate >= start && trxDate <= end;
        });

        const totalNetRevenue = successfulTransactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const totalGrossRevenue = successfulTransactions.reduce((sum, t) => sum + (t.originalPrice || 0), 0);
        const totalRevenue = totalGrossRevenue + totalNetRevenue;

        const stats = {
            totalSuccessfulTransactions: successfulTransactions.length,
            totalNetRevenue,      // Pendapatan Bersih (Laba dari Fee)
            totalGrossRevenue,    // Pendapatan Kotor (Harga Pokok)
            totalRevenue,         // Total Uang yang dibayar Pengguna
            avgNetRevenuePerTrx: successfulTransactions.length > 0 ? totalNetRevenue / successfulTransactions.length : 0,
        };

        res.json({ status: true, data: stats });

    } catch (error) {
        console.error("Error fetching detailed stats:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil statistik." });
    }
});


// RUTE BARU UNTUK MENGUNDUH LAPORAN EXCEL
app.get('/api/admin/download-report', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).send('Tanggal tidak lengkap');
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const transactionsToExport = db.data.transactions.filter(t => {
            const trxDate = new Date(t.createdAt);
            return t.status === 'success' && trxDate >= start && trxDate <= end;
        });

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet(`Laporan ${startDate} - ${endDate}`);

        worksheet.columns = [
            { header: 'Tanggal', key: 'createdAt', width: 20 },
            { header: 'Nama Pengguna', key: 'userName', width: 30 },
            { header: 'Nama Paket', key: 'packageName', width: 40 },
            { header: 'Harga Pokok (Rp)', key: 'originalPrice', width: 20, style: { numFmt: '#,##0' } },
            { header: 'Laba/Fee (Rp)', key: 'platformFee', width: 20, style: { numFmt: '#,##0' } },
            { header: 'Total (Rp)', key: 'total', width: 20, style: { numFmt: '#,##0' } },
        ];

        let totalPokok = 0;
        let totalLaba = 0;

        transactionsToExport.forEach(trx => {
            const hargaPokok = trx.originalPrice || 0;
            const laba = trx.platformFee || 0;
            totalPokok += hargaPokok;
            totalLaba += laba;
            worksheet.addRow({
                createdAt: new Date(trx.createdAt).toLocaleString('id-ID'),
                userName: trx.userName,
                packageName: trx.packageName,
                originalPrice: hargaPokok,
                platformFee: laba,
                total: hargaPokok + laba,
            });
        });

        // Tambahkan baris total
        worksheet.addRow({}); // Baris kosong
        const totalRow = worksheet.addRow(['TOTAL', '', '', totalPokok, totalLaba, totalPokok + totalLaba]);
        totalRow.font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Laporan-RyyStore-${startDate}-sd-${endDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).send("Gagal membuat laporan");
    }
});

app.get('/api/admin/statistics', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await db.read(); // Pastikan membaca data terbaru
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const successfulTransactions = db.data.transactions.filter(t => t.status === 'success');

        // 1. Kalkulasi Pendapatan (dari platform_fee)
        const revenueToday = successfulTransactions
            .filter(t => new Date(t.createdAt) >= todayStart)
            .reduce((sum, t) => sum + (t.platformFee || 0), 0);

        // 2. Jumlah Transaksi Hari Ini
        const transactionsTodayCount = db.data.transactions.filter(t => new Date(t.createdAt) >= todayStart).length;

        // 3. Pengguna Baru Minggu Ini
        const newUsersThisWeek = db.data.users.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;

        // 4. Paket Terlaris
        const packageCounts = successfulTransactions.reduce((counts, t) => {
            counts[t.packageName] = (counts[t.packageName] || 0) + 1;
            return counts;
        }, {});
        
        const topPackages = Object.entries(packageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        res.status(200).json({
            status: true,
            data: {
                revenueToday,
                transactionsTodayCount,
                newUsersThisWeek,
                topPackages
            }
        });

    } catch (error) {
        console.error("Error fetching statistics:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil data statistik." });
    }
});

app.get('/api/admin/maintenance', isAuthenticated, isAdmin, (req, res) => {
    res.status(200).json({ status: true, data: { enabled: db.data.settings.maintenanceMode } });
});

app.post('/api/admin/maintenance', isAuthenticated, isAdmin, async (req, res) => {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
        return res.status(400).json({ status: false, message: 'Input "enable" harus boolean (true/false).' });
    }
    try {
        db.data.settings.maintenanceMode = enable;
        await db.write();
        res.status(200).json({ status: true, message: `Mode pemeliharaan diatur ke: ${enable ? 'AKTIF' : 'NONAKTIF'}` });
    } catch (error) { console.error("Error updating maintenance mode:", error); res.status(500).json({ status: false, message: 'Gagal memperbarui status.' }); }
});

app.post('/api/admin/sync-packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const kmspUrl = `https://golang-openapi-packagelist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
        const response = await fetch(kmspUrl);
        const kmspData = await response.json();
        if (!kmspData.status || !Array.isArray(kmspData.data)) throw new Error(kmspData.message || "Gagal mengambil data dari KMSP.");
        let addedCount = 0;
        let updatedCount = 0;
        for (const pkg of kmspData.data) {
            const existingPackage = db.data.packages.find(p => p.package_code === pkg.package_code);
            const packagePrice = (parseInt(String(pkg.package_harga).replace(/\D/g, '')) || 0) / 100;
            
            if (existingPackage) {
                // GANTI BAGIAN Object.assign INI
                Object.assign(existingPackage, { 
                    name: pkg.package_name, 
                    description: pkg.package_description || '', // Tambahkan '|| ""'
                    original_price: packagePrice,
                    payment_methods: pkg.available_payment_methods || []
                });
                updatedCount++;
            } else {
                // GANTI BAGIAN db.data.packages.push INI
                db.data.packages.push({
                    package_code: pkg.package_code,
                    name: pkg.package_name,
                    description: pkg.package_description || '', // Tambahkan '|| ""'
                    original_price: packagePrice,
                    platform_fee: 0,
                    isVisible: false,
                    category: 'reguler',
                    payment_methods: pkg.available_payment_methods || []
                });
                addedCount++;
            }
        }
        await db.write();
        res.status(200).json({ status: true, message: `Sinkronisasi berhasil! ${addedCount} paket baru ditambahkan, ${updatedCount} paket diperbarui.` });
    } catch (error) { console.error("Sync packages error:", error); res.status(500).json({ status: false, message: error.message || "Gagal sinkronisasi paket." }); }
});

app.get('/api/admin/packages', isAuthenticated, isAdmin, (req, res) => {
    res.status(200).json({ status: true, data: db.data.packages });
});

app.put('/api/admin/packages/bulk-update', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { packages } = req.body;
        if (!Array.isArray(packages)) return res.status(400).json({ status: false, message: "Format data tidak valid." });
        let changesMade = 0;
        packages.forEach(update => {
            const packageToUpdate = db.data.packages.find(p => p.package_code === update.package_code);
            if (packageToUpdate) {
                packageToUpdate.platform_fee = typeof update.platform_fee === 'number' ? update.platform_fee : 0;
                packageToUpdate.isVisible = typeof update.isVisible === 'boolean' ? update.isVisible : false;
                
                // TAMBAHKAN INI
                packageToUpdate.isMultiPurchase = typeof update.isMultiPurchase === 'boolean' ? update.isMultiPurchase : false;

                if (update.category === 'reguler' || update.category === 'non-otp') {
                    packageToUpdate.category = update.category;
                }
                changesMade++;
            }
        });
        await db.write();
        res.status(200).json({ status: true, message: `${changesMade} perubahan paket berhasil disimpan!` });
    } catch (error) { console.error("Error bulk updating packages:", error); res.status(500).json({ status: false, message: "Gagal menyimpan perubahan." }); }
});
app.get('/api/admin/kmsp-balance', isAuthenticated, isAdmin, (req, res) => {
    const kmspUrl = `https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
    fetch(kmspUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status) {
                res.status(200).json({ status: true, data: { balance: parseFloat(data.data.balance) } });
            } else {
                res.status(500).json({ status: false, message: data.message || "Gagal mengambil saldo dari KMSP." });
            }
        })
        .catch(error => {
            console.error("Error fetching KMSP balance:", error);
            res.status(500).json({ status: false, message: "Gagal terhubung ke KMSP atau terjadi kesalahan server." });
        });
});

app.get('/api/admin/users', isAuthenticated, isAdmin, (req, res) => {
    const users = db.data.users.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email, 
        balance: u.balance, 
        role: u.role,
        // --- PERUBAHAN DI SINI ---
        // Tambahkan fallback untuk pengguna lama yang mungkin belum punya status
        status: u.status || (u.role === 'admin' ? 'approved' : 'pending') 
        // --- AKHIR PERUBAHAN ---
    }));
    res.status(200).json({ status: true, data: users });
});

app.post('/api/admin/update-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount) || parsedAmount === 0) return res.status(400).json({ status: false, message: "User ID dan jumlah saldo numerik yang valid diperlukan." });
        const userToUpdate = db.data.users.find(u => u.id === userId);
        if (!userToUpdate) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        userToUpdate.balance += parsedAmount;
        await db.write();
        res.status(200).json({ status: true, message: `Saldo untuk ${userToUpdate.name} berhasil diubah. Saldo baru: Rp ${userToUpdate.balance.toLocaleString('id-ID')}` });
    } catch (error) { console.error("Error updating balance:", error); res.status(500).json({ status: false, message: "Gagal memperbarui saldo." }); }
});

app.get('/api/admin/user-logs/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = db.data.users.find(u => u.id === userId);

        if (!user) {
            return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        }

        // Ambil semua transaksi yang cocok dengan userId
        const userTransactions = db.data.transactions
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Urutkan dari yang terbaru

        // Jangan kirim password ke frontend
        const { password, ...userWithoutPassword } = user; 

        res.status(200).json({
            status: true,
            data: {
                user: userWithoutPassword,
                logs: userTransactions
            }
        });
    } catch (error) {
        console.error("Error fetching user logs:", error);
        res.status(500).json({ status: false, message: 'Gagal mengambil log pengguna.' });
    }
});

app.get('/api/status', (req, res) => {
    res.status(200).json({
        status: true,
        maintenanceMode: db.data.settings.maintenanceMode
    });
});
// --- RUTE TOP UP SALDO ---
const qrisPollingTimeouts = new Map();
async function generateDynamicQris(amount) {
    const apiUrl = 'https://qrisku.my.id/api';
    try {
        if (!QRIS_STATIS_STRING) throw new Error("QRIS_STATIS_STRING tidak dikonfigurasi di server.");
        const response = await axios.post(apiUrl, {
            amount: amount.toString(),
            qris_statis: QRIS_STATIS_STRING
        }, { timeout: 15000 });
        if (response.data && response.data.status === 'success' && response.data.qris_base64) {
            return `data:image/png;base64,${response.data.qris_base64}`;
        } else {
            throw new Error(response.data?.message || 'Gagal menghasilkan QRIS dari API.');
        }
    } catch (error) {
        console.error(`[QRIS_GEN] Error calling QRIS API: ${error.message}`);
        throw new Error(error.response?.data?.message || 'Gagal menghubungi layanan pembuat QRIS.');
    }
}

async function checkPaymentStatus(topUpId, uniqueAmount) {
    if (!OKE_API_KEY || !OKE_API_BASE) {
        console.error("[PAYMENT_CHECK] OKE_API_KEY atau OKE_API_BASE tidak dikonfigurasi.");
        const topUp = db.data.topups.find(t => t.id === topUpId);
        if (topUp && topUp.status === 'pending') {
            topUp.status = 'failed_config';
            await db.write();
        }
        return;
    }
    const url = `https://gateway.okeconnect.com/api/mutasi/qris/${OKE_API_BASE}/${OKE_API_KEY}`;
    const maxDurationMs = 5 * 60 * 1000;
    const interval = 10000;
    const pollingLoop = async () => {
        try {
            const topUp = db.data.topups.find(t => t.id === topUpId);
            if (!topUp || topUp.status !== 'pending') {
                qrisPollingTimeouts.delete(topUpId);
                return;
            }
            const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                topUp.status = 'expired';
                await db.write();
                qrisPollingTimeouts.delete(topUpId);
                return;
            }
            const response = await axios.get(url, { timeout: 8000 });
            if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
                const transaction = response.data.data.find(item => item.type === 'CR' && parseFloat(item.amount) === parseFloat(uniqueAmount));
                if (transaction) {
                    topUp.status = 'completed';
                    const user = db.data.users.find(u => u.id === topUp.userId);
                    if (user) user.balance += topUp.baseAmount;
                    await db.write();
                    qrisPollingTimeouts.delete(topUpId);
                    
                    await sendTelegramNotification(
`<b>──────────────────────</b>
<b>💰 Top Up Berhasil!</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user ? user.name : 'N/A'}
<b>Jumlah Masuk:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}
<b>ID Transaksi:</b> <code>${topUpId}</code>
<b>──────────────────────</b>
<b>Notif:tembak.cloudrystore.xyz</b>`.trim()
                    );
                    return;
                }
            }
            const timeoutId = setTimeout(pollingLoop, interval);
            qrisPollingTimeouts.set(topUpId, timeoutId);
        } catch (error) {
            console.error(`[PAYMENT_CHECK] Error polling payment for ${topUpId}: ${error.message}`);
            const timeoutId = setTimeout(pollingLoop, interval);
            qrisPollingTimeouts.set(topUpId, timeoutId);
        }
    };
    if (!qrisPollingTimeouts.has(topUpId)) {
        const initialTimeoutId = setTimeout(pollingLoop, 0);
        qrisPollingTimeouts.set(topUpId, initialTimeoutId);
    }
}

app.post('/api/topup/request-qris', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const userId = req.session.userId;
    const user = db.data.users.find(u => u.id === userId);
    if (!amount || amount < 10000) {
        return res.status(400).json({ status: false, message: 'Jumlah top-up minimal adalah Rp 10.000.' });
    }
    if (!QRIS_STATIS_STRING || !OKE_API_KEY || !OKE_API_BASE) {
         return res.status(500).json({ status: false, message: 'Fitur pembayaran QRIS tidak dikonfigurasi dengan benar di server (cek .env).' });
    }
    try {
        const existingPendingTopup = db.data.topups.find(t => t.userId === userId && t.status === 'pending');
        if (existingPendingTopup) {
            const maxDurationMs = 5 * 60 * 1000;
            const timeElapsed = Date.now() - new Date(existingPendingTopup.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                existingPendingTopup.status = 'expired';
                await db.write();
            } else {
                return res.status(200).json({ status: false, message: 'Anda memiliki transaksi top-up yang masih tertunda.', topUpId: existingPendingTopup.id, base64Image: existingPendingTopup.qrisBase64Image, uniqueAmount: existingPendingTopup.uniqueAmount, createdAt: existingPendingTopup.createdAt });
            }
        }
        const uniqueAmount = amount + Math.floor(Math.random() * 999) + 1;
        const topUpId = uuidv4();
        const base64Image = await generateDynamicQris(uniqueAmount);
        const newTopUp = { id: topUpId, userId, baseAmount: amount, uniqueAmount, status: 'pending', createdAt: new Date().toISOString(), qrisBase64Image: base64Image };
        db.data.topups.push(newTopUp);
        await db.write();
        
        sendTelegramNotification(
`<b>──────────────────────</b>     
⏳ <b>Permintaan Top Up Baru!</b>
<b>──────────────────────</b>
<b>Nama Pengguna:</b> ${user.name}
<b>Jumlah:</b> Rp ${amount.toLocaleString('id-ID')}
<b>Jumlah Unik Bayar:</b> Rp ${uniqueAmount.toLocaleString('id-ID')}
<b>Status:</b> Menunggu Pembayaran
<b>──────────────────────</b>
<b>Notif:tembak.cloudrystore.xyz</b>`.trim()
        );

        checkPaymentStatus(topUpId, uniqueAmount);
        res.status(200).json({ status: true, message: 'Silakan lakukan pembayaran.', topUpId, base64Image, uniqueAmount, createdAt: newTopUp.createdAt });
    } catch (error) {
        console.error("QRIS request error:", error);
        res.status(500).json({ status: false, message: error.message || 'Gagal memproses permintaan top-up.' });
    }
});

app.post('/api/topup/cancel/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    const userId = req.session.userId;
    const topUp = db.data.topups.find(t => t.id === topUpId && t.userId === userId);
    if (!topUp) {
        return res.status(404).json({ status: false, message: 'Transaksi top-up tidak ditemukan.' });
    }
    if (topUp.status !== 'pending') {
        return res.status(400).json({ status: false, message: `Transaksi sudah berstatus ${topUp.status}. Tidak dapat dibatalkan.` });
    }
    try {
        topUp.status = 'canceled';
        await db.write();
        if (qrisPollingTimeouts.has(topUpId)) {
            clearTimeout(qrisPollingTimeouts.get(topUpId));
            qrisPollingTimeouts.delete(topUpId);
            console.log(`[PAYMENT_CANCEL] Polling for ${topUpId} cleared.`);
        }
        res.status(200).json({ status: true, message: 'Transaksi top-up berhasil dibatalkan.' });
    } catch (error) {
        console.error("Error canceling top-up:", error);
        res.status(500).json({ status: false, message: 'Gagal membatalkan transaksi top-up.' });
    }
});

app.get('/api/topup/status/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    const topUp = db.data.topups.find(t => t.id === topUpId && t.userId === req.session.userId);
    if (!topUp) {
        return res.status(404).json({ status: false, message: 'Sesi top-up tidak ditemukan.' });
    }
    res.status(200).json({ status: topUp.status, message: "Status top-up berhasil diambil.", 
                           qrisData: {base64Image: topUp.qrisBase64Image, uniqueAmount: topUp.uniqueAmount },
                           createdAt: topUp.createdAt
    });
});

app.post('/api/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ status: false, message: 'Pesan pengumuman tidak boleh kosong dan harus berupa teks.' });
    }
    db.data.announcements = [{ message: message.trim(), createdAt: new Date().toISOString(), id: `ann_${Date.now()}` }];
    await db.write();
    res.json({ status: true, message: 'Pengumuman berhasil dikirim dan diperbarui.' });
});

app.get('/api/user/announcement', isAuthenticated, (req, res) => {
    const announcement = db.data.announcements && db.data.announcements.length > 0 
        ? db.data.announcements[0] 
        : null;
    res.json({ status: true, data: announcement });
});

app.post('/api/admin/delete-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
    if (req.session.userId === userId) {
        return res.status(400).json({ status: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
    }
    const userIndex = db.data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    db.data.users.splice(userIndex, 1);
    db.data.transactions = db.data.transactions.filter(t => t.userId !== userId);
    db.data.topups = db.data.topups.filter(t => t.userId !== userId);
    await db.write();
    res.json({ status: true, message: "Akun pengguna dan seluruh data terkait berhasil dihapus." });
});

// --- SAJIKAN FRONTEND & CATCH-ALL ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(PORT, () => { console.log(`Server final dengan semua fitur berjalan di http://localhost:${PORT}`); });