// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// --- KONFIGURASI KUNCI API ---
const KMSP_API_KEY = process.env.KMSP_API_KEY;
const QRIS_STATIS_STRING = process.env.QRIS_STATIS_STRING;
const OKE_API_KEY = process.env.OKE_API_KEY;
const OKE_API_BASE = process.env.OKE_API_BASE;

if (!KMSP_API_KEY) {
    console.error("FATAL ERROR: KMSP_API_KEY tidak diset di file .env.");
    process.exit(1);
}

// --- Inisialisasi Database dan Middleware ---
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = {
    users: [],
    packages: [],
    transactions: [],
    topups: [],
    announcements: [],
    maintenanceMode: false // <-- TAMBAHKAN INI
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
    // Pastikan properti baru ada
    db.data.maintenanceMode = db.data.maintenanceMode !== undefined ? db.data.maintenanceMode : false; // <-- PASTIKAN ADA

    db.data.users = db.data.users.map(user => ({
        ...user,
        verifiedPhone: user.verifiedPhone || null
    }));
    await db.write();
    console.log("Database initialized successfully.");
}
initializeDatabase();


app.use(express.json());
app.use(cors({ origin: `http://localhost:3001`, credentials: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'ganti-dengan-string-acak-yang-super-aman-dan-panjang',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname);
    },
    filename: function (req, file, cb) {
        cb(null, 'db.json'); 
    }
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
        // Tambahkan verifiedPhone: null secara default saat registrasi
        const newUser = { id: `user_${Date.now()}`, name, email, password: hashedPassword, balance: 0, role: 'user', verifiedPhone: null, createdAt: new Date().toISOString() };
        db.data.users.push(newUser);
        await db.write();
        res.status(201).json({ status: true, message: "Registrasi berhasil! Silakan login." });
    } catch (error) { console.error("Register error:", error); res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.data.users.find(u => u.email === email);
        if (!user) return res.status(401).json({ status: false, message: "Email atau password salah." });
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(401).json({ status: false, message: "Email atau password salah." });
        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ status: true, message: "Login berhasil!", user: userWithoutPassword });
    } catch (error) { console.error("Login error:", error); res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." }); }
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
        // Setelah restore, pastikan field verifiedPhone ada untuk semua user lama
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
    const maintenanceMode = db.data.maintenanceMode; // <-- AMBIL STATUS MAINTENANCE DARI DB

    if (!user) {
        if(req.session) req.session.destroy();
        res.clearCookie('connect.sid');
        // Kirim juga status maintenance jika user tidak login
        return res.status(200).json({ status: true, user: null, message: "Pengguna tidak login.", maintenanceMode: maintenanceMode }); // <-- KIRIM MAINTENANCE MODE
    }
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ status: true, user: userWithoutPassword, maintenanceMode: maintenanceMode }); // <-- KIRIM MAINTENANCE MODE
});

app.post('/api/auth/extend-session', isAuthenticated, async (req, res) => {
    const { phone, auth_id } = req.body;
    const user = db.data.users.find(u => u.id === req.session.userId);

    // Keamanan: Hanya izinkan extend sesi untuk verifiedPhone milik user yang login
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

// MODIFIKASI: Filter daftar token berdasarkan nomor telepon pengguna yang login
app.get('/api/auth/token-list', isAuthenticated, async (req, res) => {
    const user = db.data.users.find(u => u.id === req.session.userId);
    if (!user) {
        return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }
    // Jika pengguna belum punya nomor telepon terverifikasi, tidak ada token untuk ditampilkan
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

        // Filter token agar hanya mengembalikan token yang cocok dengan verifiedPhone pengguna
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
    } catch(error) { res.status(500).json({ status: false, message: error.message }); }
});

// MODIFIKASI: Simpan nomor telepon yang diverifikasi ke user di database
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
        
        // Simpan nomor telepon yang berhasil diverifikasi ke objek user di database
        user.verifiedPhone = phone;
        await db.write();

        res.status(200).json({ status: true, message: "Nomor berhasil diverifikasi dan disimpan!", data: loginData.data });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});


app.get('/api/purchase/status/:kmspTrxId', isAuthenticated, async (req, res) => {
    const { kmspTrxId } = req.params;
    const userId = req.session.userId;

    // Log untuk debugging awal: apa yang diterima dari frontend
    console.log(`[STATUS_POLLING] Incoming polling request for kmspTrxId: ${kmspTrxId} by userId: ${userId} at ${new Date().toISOString()}`);

    // Cari transaksi di database lokal berdasarkan kmspTrxId dan userId
    const transaction = db.data.transactions.find(t => t.kmspTrxId === kmspTrxId && t.userId === userId);

    // Jika transaksi tidak ditemukan
    if (!transaction) {
        console.warn(`[STATUS_POLLING] Transaction NOT FOUND in DB for kmspTrxId: ${kmspTrxId} and userId: ${userId}. Returning 404.`);
        return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan." });
    }

    // Jika status transaksi di database lokal sudah final (sukses atau gagal/dikembalikan)
    // Langsung berikan respons tanpa perlu memanggil API KMSP lagi
    if (transaction.status === 'success' || transaction.status.startsWith('failed')) {
        console.log(`[STATUS_POLLING] Transaction ${kmspTrxId} already in final status: ${transaction.status}. Returning current status from DB.`);
        return res.status(200).json({
            status: true, // Status respons dari server lokal (berhasil mengirim data)
            data: {
                status: transaction.status, // Status sebenarnya dari transaksi di DB
                message: transaction.api_response || `Status: ${transaction.status}`
            }
        });
    }

    // Jika status masih 'pending', lakukan polling ke KMSP API
    try {
        const kmspUrl = `https://golang-openapi-checktransaction-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&trx_id=${kmspTrxId}`;
        const response = await fetch(kmspUrl);
        const kmspResponseData = await response.json(); // Mengganti 'data' menjadi 'kmspResponseData' untuk kejelasan

        // Log respons mentah dari KMSP
        console.log(`[STATUS_POLLING] KMSP API Raw Response for ${kmspTrxId}: ${JSON.stringify(kmspResponseData, null, 2)}`);

        // Jika respons dari KMSP tidak OK (misal HTTP error) atau KMSP mengembalikan status: false
        if (!response.ok || !kmspResponseData.status) {
            console.warn(`[STATUS_POLLING] KMSP returned non-success for ${kmspTrxId}: ${kmspResponseData.message || 'No specific message.'}`);
            // Kembalikan status 'pending' ke frontend agar polling terus berjalan
            return res.status(200).json({
                status: true, // Respons dari server lokal sukses (informasi dikirim)
                data: {
                    status: 'pending', // Status transaksi di KMSP masih belum final/sukses
                    message: kmspResponseData.message || 'Menunggu konfirmasi pembayaran dari provider.'
                }
            });
        }

        // Jika KMSP mengembalikan status sukses (dan status KMSP-nya juga 'success')
        if (kmspResponseData.status && kmspResponseData.data?.status === 'success') {
            // Update status transaksi di database lokal menjadi 'success'
            transaction.status = 'success';
            transaction.api_response = 'Pembelian Berhasil Dikonfirmasi';
            // PENTING: Jangan hapus paymentDetails karena Anda ingin tombol tetap ada di riwayat
            // delete transaction.paymentDetails; // BARIS INI TIDAK LAGI DIGUNAKAN
            await db.write(); // Simpan perubahan ke database
            console.log(`[STATUS_POLLING] Transaction ${kmspTrxId} updated to SUCCESS in DB.`);
        }
        // Jika KMSP mengembalikan status gagal, kadaluarsa, atau dibatalkan
        else if (kmspResponseData.status && (kmspResponseData.data?.status === 'failed' || kmspResponseData.data?.status === 'expired' || kmspResponseData.data?.status === 'cancelled')) {
             // Hanya proses jika status transaksi lokal masih 'pending'
             if (transaction.status === 'pending') {
                 transaction.status = 'failed'; // Set status lokal menjadi 'failed'
                 transaction.api_response = kmspResponseData.data.message || `Transaksi ${kmspResponseData.data.status}`;
                 // PENTING: Jangan hapus paymentDetails
                 // delete transaction.paymentDetails; // BARIS INI TIDAK LAGI DIGUNAKAN

                 // Logika pengembalian saldo (refund) jika transaksi gagal dan biaya layanan sudah terpotong
                 // Pastikan belum pernah direfund untuk transaksi ini (status 'failed_refunded')
                 if (transaction.platformFee > 0 && transaction.status !== 'failed_refunded') {
                     const user = db.data.users.find(u => u.id === userId);
                     if (user) {
                         user.balance += transaction.platformFee; // Kembalikan saldo
                         transaction.status = 'failed_refunded'; // Tandai transaksi sebagai gagal & sudah direfund
                         transaction.api_response += ' (Saldo dikembalikan)';
                         await db.write(); // Simpan perubahan saldo dan status
                         console.log(`[STATUS_POLLING][REFUND] Saldo ${user.name} dikembalikan sebesar Rp ${transaction.platformFee} for TRX ${transaction.id}.`);
                     }
                 }
                 await db.write(); // Simpan perubahan transaksi (status dan pesan)
                 console.log(`[STATUS_POLLING] Transaction ${kmspTrxId} updated to FAILED/EXPIRED/CANCELLED in DB.`);
             }
        }

        // Setelah memproses respons dari KMSP (dan mungkin memperbarui DB),
        // kirim status terbaru transaksi dari database lokal ke frontend
        return res.status(200).json({
            status: true, // Status respons dari server lokal (berhasil mengirim data)
            data: {
                status: transaction.status, // Status transaksi yang paling update dari DB
                message: transaction.api_response
            }
        });

    } catch (error) {
        // Tangani error yang terjadi saat memanggil/memproses respons dari KMSP API
        console.error(`[STATUS_POLLING] Error in try-catch block for ${kmspTrxId}:`, error);
        return res.status(500).json({
            status: false, // Status respons dari server lokal (ada error)
            message: error.message || 'Terjadi kesalahan saat memeriksa status pembelian.'
        });
    }
});


app.post('/api/purchase', isAuthenticated, async (req, res) => {
    const { packageId, phone, accessToken, paymentMethod } = req.body;
    const userId = req.session.userId;

    // Keamanan: Pastikan phone yang digunakan untuk pembelian adalah verifiedPhone milik user yang login
    const user = db.data.users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }
    if (user.verifiedPhone !== phone) {
        return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda atau tidak cocok. Mohon verifikasi nomor HP Anda di halaman utama." });
    }

    if (!packageId || !phone || !accessToken || !paymentMethod) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap (packageId, phone, accessToken, atau paymentMethod missing)." });
    }

    const pkg = db.data.packages.find(p => p.package_code === packageId);

    if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

    const platformFee = pkg.platform_fee || 0;
    if (user.balance < platformFee) {
        return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString('id-ID')}) tidak cukup untuk membayar biaya layanan sebesar Rp ${platformFee.toLocaleString('id-ID')}.` });
    }

    // --- PENTING: Saldo dipotong di sini, sebelum memanggil API KMSP ---
    user.balance -= platformFee;
    await db.write(); // Simpan perubahan saldo segera ke database

    try {
        const pkgNameLower = (pkg.name || '').toLowerCase();
        const isPulsaMethod = pkgNameLower.includes('[method pulsa]');

        const purchaseParams = new URLSearchParams({
            api_key: KMSP_API_KEY,
            package_code: pkg.package_code,
            phone,
            access_token: accessToken,
            payment_method: paymentMethod
        });
        const purchaseUrl = `https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${purchaseParams.toString()}`;

        const purchaseResponse = await fetch(purchaseUrl);
        const purchaseData = await purchaseResponse.json();

        console.log(`KMSP Purchase API Response for package ${packageId} and method ${paymentMethod}:`, JSON.stringify(purchaseData, null, 2));

        const transactionSucceededFromKMSP = purchaseResponse.ok && purchaseData.status;

        let paymentDetails = null;
        let kmspTransactionId = null;

        if (purchaseData.data) {
            kmspTransactionId = purchaseData.data.trx_id || null;
            if (purchaseData.data.is_qris || purchaseData.data.have_deeplink) {
                paymentDetails = {
                    amount: purchaseData.data.amount,
                    payment_method: purchaseData.data.payment_method,
                    is_qris: purchaseData.data.is_qris || false,
                    qris_data: purchaseData.data.qris_data || null,
                    have_deeplink: purchaseData.data.have_deeplink || false,
                    deeplink_data: purchaseData.data.deeplink_data || null
                };
            }
        }

        const newTransaction = {
            id: `trx_${Date.now()}_${uuidv4().substring(0, 8)}`,
            userId, userName: user.name,
            packageId, packageName: pkg.name, platformFee,
            kmspTrxId: kmspTransactionId,
            status: transactionSucceededFromKMSP ? 'success' : 'failed', // Default status
            api_response: purchaseData.message || (transactionSucceededFromKMSP ? 'Success' : 'Failed'),
            paymentMethod,
            createdAt: new Date().toISOString(),
            paymentDetails: paymentDetails // <<< PENTING: TETAP SIMPAN paymentDetails
        };

        // Jika KMSP mengembalikan Deeplink/QRIS, itu berarti transaksi SUDAH berhasil di sisi KMSP.
        // Kita set status lokal menjadi 'success', namun tetap simpan paymentDetails untuk tampilan di riwayat.
        if (paymentDetails) {
            newTransaction.status = 'success'; // <<< TETAP SET KE SUKSES
            newTransaction.api_response = 'PEMBELIAN BERHASIL. SILAKAN SELESAIKAN PEMBAYARAN DI APLIKASI EKSTERNAL.';
            // JANGAN HAPUS newTransaction.paymentDetails di sini
        }

        db.data.transactions.push(newTransaction);
        await db.write();

        if (paymentDetails) {
            // Jika ada paymentDetails, kirim respons 202 (Accepted)
            const responsePaymentData = {
                ...newTransaction.paymentDetails, // Ambil semua detail yang sudah disimpan
                trx_id: newTransaction.kmspTrxId // Tetap kirim trx_id untuk referensi
            };
            return res.status(202).json({
                status: true,
                message: "Transaksi berhasil dibuat. Silakan selesaikan pembayaran di aplikasi eksternal.",
                payment_data: responsePaymentData,
                newBalance: user.balance
            });
        }

        if (transactionSucceededFromKMSP) {
            return res.status(200).json({
                status: true,
                message: purchaseData.message || "Pembelian berhasil!",
                newBalance: user.balance
            });
        } else {
            if (!isPulsaMethod) {
                user.balance += platformFee;
                await db.write();
                return res.status(500).json({ status: false, message: purchaseData.message || 'Pembelian ke provider gagal.' });
            } else {
                return res.status(200).json({
                    status: true,
                    message: `Transaksi pulsa diproses. (API Response: ${purchaseData.message || 'Tidak ada pesan spesifik dari provider.'})`,
                    newBalance: user.balance
                });
            }
        }
    } catch (error) {
        user.balance += platformFee;
        await db.write();
        console.error("Error saat memproses pembelian:", error);
        return res.status(500).json({ status: false, message: error.message || 'Terjadi kesalahan internal pada server saat memproses pembelian.' });
    }
});

// --- RUTE PENGGUNA ---
app.get('/api/user/packages', isAuthenticated, (req, res) => {
    const visiblePackages = db.data.packages.filter(p => p.isVisible);
    res.status(200).json({ status: true, data: visiblePackages });
});


app.get('/api/user/transactions', isAuthenticated, (req, res) => {
    const userTransactions = db.data.transactions
        .filter(t => t.userId === req.session.userId)
        .map(t => ({
            ...t,
            type: 'purchase' // Pastikan type ada untuk konsistensi
            // paymentDetails akan otomatis disertakan karena sudah ada di objek transaksi 't'
        }));

    const userTopups = db.data.topups
        .filter(tu => tu.userId === req.session.userId)
        .map(tu => ({
            id: tu.id,
            userId: tu.userId,
            type: 'topup',
            status: tu.status,
            createdAt: tu.createdAt,
            baseAmount: tu.baseAmount,
            uniqueAmount: tu.uniqueAmount,
            qrisData: tu.qrisBase64Image && typeof tu.uniqueAmount === 'number' ? { base64Image: tu.qrisBase64Image, uniqueAmount: tu.uniqueAmount } : undefined,
            api_response: tu.status === 'pending' ? 'Menunggu Pembayaran' :
                          (tu.status === 'completed' ? 'Selesai' :
                           (tu.status === 'expired' ? 'Kadaluarsa' :
                            (tu.status === 'canceled' ? 'Dibatalkan' : 'Unknown'))),
        }));

    const allUserActivities = [...userTransactions, ...userTopups];

    allUserActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ status: true, data: allUserActivities });
});

// --- RUTE ADMIN ---
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
            const packagePrice = parseFloat(pkg.package_harga.replace(/[^0-9.,]+/g,"").replace(',', '.')) || 0;
            
            if (existingPackage) {
                Object.assign(existingPackage, { 
                    name: pkg.package_name, 
                    description: pkg.package_description, 
                    original_price: packagePrice,
                    payment_methods: pkg.available_payment_methods || []
                });
                updatedCount++;
            } else {
                db.data.packages.push({
                    package_code: pkg.package_code,
                    name: pkg.package_name,
                    description: pkg.package_description,
                    original_price: packagePrice,
                    platform_fee: 0,
                    isVisible: false,
                    payment_methods: pkg.available_payment_methods || []
                });
                addedCount++;
            }
        }
        await db.write();
        res.status(200).json({ status: true, message: `Sinkronisasi berhasil! ${addedCount} paket baru ditambahkan, ${updatedCount} paket diperbarui.` });
    } catch (error) { 
        console.error("Sync packages error:", error);
        res.status(500).json({ status: false, message: error.message || "Gagal sinkronisasi paket." }); 
    }
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
                const oldFee = packageToUpdate.platform_fee;
                const oldVisibility = packageToUpdate.isVisible;

                packageToUpdate.platform_fee = typeof update.platform_fee === 'number' ? update.platform_fee : 0;
                packageToUpdate.isVisible = typeof update.isVisible === 'boolean' ? update.isVisible : false;

                if (oldFee !== packageToUpdate.platform_fee || oldVisibility !== packageToUpdate.isVisible) {
                    changesMade++;
                }
            }
        });
        await db.write();
        res.status(200).json({ status: true, message: `${changesMade} perubahan paket berhasil disimpan!` });
    } catch (error) { console.error("Error bulk updating packages:", error); res.status(500).json({ status: false, message: "Gagal menyimpan perubahan." }); }
});

app.get('/api/admin/kmsp-balance', isAuthenticated, isAdmin, (req, res) => {
    // KMSP_API_KEY sudah didefinisikan di awal file
    const kmspUrl = `https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
    // Fetch API dari KMSP
    fetch(kmspUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status) {
                // Berhasil mendapatkan saldo, kirim ke frontend
                res.status(200).json({ status: true, data: { balance: parseFloat(data.data.balance) } });
            } else {
                // KMSP mengembalikan status false
                res.status(500).json({ status: false, message: data.message || "Gagal mengambil saldo dari KMSP." });
            }
        })
        .catch(error => {
            // Error saat fetch atau parsing JSON
            console.error("Error fetching KMSP balance:", error);
            res.status(500).json({ status: false, message: "Gagal terhubung ke KMSP atau terjadi kesalahan server." });
        });
});

app.get('/api/admin/users', isAuthenticated, isAdmin, (req, res) => {
    const users = db.data.users.map(u => ({ id: u.id, name: u.name, email: u.email, balance: u.balance, role: u.role }));
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

// --- RUTE TOP UP SALDO ---
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

const qrisPollingTimeouts = new Map();

async function checkPaymentStatus(topUpId, uniqueAmount) {
    if (!OKE_API_KEY || !OKE_API_BASE) {
        console.error("[PAYMENT_CHECK] OKE_API_KEY atau OKE_API_BASE tidak dikonfigurasi. Polling tidak akan bekerja.");
        const topUp = db.data.topups.find(t => t.id === topUpId);
        if (topUp && topUp.status === 'pending') {
            topUp.status = 'failed_config';
            await db.write();
        }
        return;
    }
    const url = `https://gateway.okeconnect.com/api/mutasi/qris/${OKE_API_BASE}/${OKE_API_KEY}`;
    const maxDurationMs = 5 * 60 * 1000; // 5 menit dalam milidetik
    const interval = 10000; // 10 detik

    const pollingLoop = async () => {
        try {
            const topUp = db.data.topups.find(t => t.id === topUpId);
            
            if (!topUp || topUp.status !== 'pending') { 
                console.log(`[PAYMENT_CHECK] Polling for ${topUpId} stopped: status is ${topUp?.status || 'not found'}`);
                qrisPollingTimeouts.delete(topUpId);
                return; 
            }
            
            const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                console.log(`[PAYMENT_CHECK] Polling for ${topUpId} expired.`);
                topUp.status = 'expired';
                await db.write();
                qrisPollingTimeouts.delete(topUpId);
                return;
            }

            const response = await axios.get(url, { timeout: 8000 });
            if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
                const transaction = response.data.data.find(item =>
                    item.type === 'CR' && parseFloat(item.amount) === parseFloat(uniqueAmount)
                );
                if (transaction) {
                    console.log(`[PAYMENT_CHECK] Payment for ${topUpId} completed!`);
                    topUp.status = 'completed';
                    const user = db.data.users.find(u => u.id === topUp.userId);
                    if (user) user.balance += topUp.baseAmount;
                    await db.write();
                    qrisPollingTimeouts.delete(topUpId);
                    return;
                }
            }
            // Jadwalkan polling berikutnya
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
    if (!amount || amount < 10000) {
        return res.status(400).json({ status: false, message: 'Jumlah top-up minimal adalah Rp 10.000.' });
    }
    if (!QRIS_STATIS_STRING || !OKE_API_KEY || !OKE_API_BASE) {
         return res.status(500).json({ status: false, message: 'Fitur pembayaran QRIS tidak dikonfigurasi dengan benar di server (cek .env).' });
    }
    try {
        const existingPendingTopup = db.data.topups.find(t => t.userId === userId && t.status === 'pending');
        if (existingPendingTopup) {
            // Periksa apakah transaksi pending sudah kadaluarsa secara waktu
            const maxDurationMs = 5 * 60 * 1000;
            const timeElapsed = Date.now() - new Date(existingPendingTopup.createdAt).getTime();

            if (timeElapsed >= maxDurationMs) {
                // Tandai sebagai kadaluarsa jika sudah lewat waktu
                existingPendingTopup.status = 'expired';
                await db.write();
                // Lanjutkan untuk membuat transaksi baru (tidak mengembalikan existingPendingTopup lagi)
            } else {
                // Jika masih dalam batas waktu, kembalikan transaksi pending yang ada
                return res.status(200).json({ 
                    status: false, 
                    message: 'Anda memiliki transaksi top-up yang masih tertunda. Harap selesaikan atau batalkan.',
                    topUpId: existingPendingTopup.id,
                    base64Image: existingPendingTopup.qrisBase64Image,
                    uniqueAmount: existingPendingTopup.uniqueAmount,
                    createdAt: existingPendingTopup.createdAt
                });
            }
        }

        const uniqueAmount = amount + Math.floor(Math.random() * 999) + 1; 
        const topUpId = uuidv4();
        const base64Image = await generateDynamicQris(uniqueAmount);
        const newTopUp = {
            id: topUpId, userId, baseAmount: amount, uniqueAmount,
            status: 'pending', createdAt: new Date().toISOString(),
            qrisBase64Image: base64Image // Simpan base64Image di db
        };
        db.data.topups.push(newTopUp);
        await db.write();
        
        checkPaymentStatus(topUpId, uniqueAmount); 
        res.status(200).json({
            status: true, message: 'Silakan lakukan pembayaran.',
            topUpId, base64Image, uniqueAmount, createdAt: newTopUp.createdAt
        });
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
        // Hentikan polling jika ada
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
                           createdAt: topUp.createdAt // PENTING: Kirim createdAt
    });
});

// Endpoint untuk admin mengirim pengumuman
app.post('/api/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ status: false, message: 'Pesan pengumuman tidak boleh kosong dan harus berupa teks.' });
    }
    db.data.announcements = [{ message: message.trim(), createdAt: new Date().toISOString(), id: `ann_${Date.now()}` }];
    await db.write();
    res.json({ status: true, message: 'Pengumuman berhasil dikirim dan diperbarui.' });
});

// Endpoint untuk pengguna mengambil pengumuman
app.get('/api/user/announcement', isAuthenticated, (req, res) => { // MODIFIKASI: Hapus isAdmin di sini
    const announcement = db.data.announcements && db.data.announcements.length > 0 
        ? db.data.announcements[0] 
        : null;
    res.json({ status: true, data: announcement });
});

app.post('/api/admin/maintenance', isAuthenticated, isAdmin, async (req, res) => {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
        return res.status(400).json({ status: false, message: 'Parameter "enable" harus boolean.' });
    }
    db.data.maintenanceMode = enable;
    await db.write();
    res.status(200).json({ status: true, message: `Mode maintenance berhasil ${enable ? 'diaktifkan' : 'dinonaktifkan'}.` });
});

// Endpoint untuk admin mendapatkan status mode maintenance
app.get('/api/admin/maintenance', isAuthenticated, isAdmin, (req, res) => {
    res.status(200).json({ status: true, data: { enabled: db.data.maintenanceMode } });
});

// Endpoint untuk admin menghapus akun pengguna
app.post('/api/admin/delete-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });

    // Tidak boleh hapus diri sendiri (opsional, keamanan)
    if (req.session.userId === userId) {
        return res.status(400).json({ status: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
    }

    // Hapus user dari database
    const userIndex = db.data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });

    db.data.users.splice(userIndex, 1);

    // Hapus semua transaksi & topup terkait user
    db.data.transactions = db.data.transactions.filter(t => t.userId !== userId);
    db.data.topups = db.data.topups.filter(t => t.userId !== userId);

    await db.write();
    res.json({ status: true, message: "Akun pengguna dan seluruh data terkait berhasil dihapus." });
});

// --- SAJIKAN FRONTEND & CATCH-ALL ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// PENTING: Pindahkan catch-all route ini KE PALING BAWAH SETELAH SEMUA ENDPOINT API
app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(PORT, () => { console.log(`Server BARU dengan alur dinamis berjalan di http://localhost:${PORT}`); });