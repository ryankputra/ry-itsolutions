/**
 * Admin Panel Management, Settings, Orders, CeirGO & KMSP Integration, Support Tickets
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const excel = require('exceljs');
const fetch = require('node-fetch');
const axios = require('axios');

const { db, dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated, isAdmin, sseSend, sseBroadcast } = require('../middleware/auth');
const { sendTelegramNotification } = require('../telegramService');
const { getKmspAdminBalance } = require('./transactions');
const ceirgoClient = require('../ceirgoClient');
const waBot = require('../services/waBot');

const KMSP_API_KEY = process.env.KMSP_API_KEY;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const dbBackupUpload = multer({ dest: path.join(__dirname, '..', 'scratch') });

// Setup Multer for Manual Orders Updates
const manualOrderStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'manual_orders'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `admin_reply_${Date.now()}${ext}`);
    }
});
const manualOrderUpload = multer({
    storage: manualOrderStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
    { name: 'admin_image', maxCount: 1 }
]);

// 1. GET /api/admin/users
router.get('/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, name, email, balance, role, status, createdAt, verifiedPhone FROM users ORDER BY createdAt DESC');
        res.status(200).json({ status: true, data: users });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal mengambil data pengguna." });
    }
});

// 2. POST /api/admin/update-balance
router.post('/admin/update-balance', isAuthenticated, isAdmin, async (req, res) => {
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

        await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [parsedAmount, userId]);
        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [userId]);

        if (parsedAmount > 0) {
            const topUpId = `TU-ADMIN-${Date.now()}`;
            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, targetUser.name, parsedAmount, parsedAmount, 'completed', new Date().toISOString()]
            );

            const notifMessage = `<b>✅ Top Up Manual Berhasil</b>\n──────────────────────\n👨‍💼 <b>Oleh Admin:</b> ${adminUser?.name || 'Admin'}\n👤 <b>Untuk Pengguna:</b> ${targetUser.name}\n💰 <b>Jumlah:</b> Rp ${parsedAmount.toLocaleString('id-ID')}\n📈 <b>Saldo Baru:</b> Rp ${updatedUser.balance.toLocaleString('id-ID')}`;
            sendTelegramNotification(notifMessage, 'group');

            sseSend(userId, 'balance_update', { balance: updatedUser.balance, source: 'admin' });
            sseSend(userId, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up manual berhasil' });
        }

        res.status(200).json({ status: true, message: `Saldo ${targetUser.name} berhasil diubah. Saldo baru: Rp ${updatedUser.balance.toLocaleString('id-ID')}` });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal memperbarui saldo." });
    }
});

// 3. POST /api/admin/update-user-role
router.post('/admin/update-user-role', isAuthenticated, isAdmin, async (req, res) => {
    const { userId, newRole } = req.body;
    if (!userId || !['user', 'reseller', 'admin'].includes(newRole)) {
        return res.status(400).json({ status: false, message: 'User ID atau Peran tidak valid.' });
    }
    try {
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });

        await dbRun("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);
        sseSend(userId, 'role_change', { newRole, reason: 'Peran diubah oleh Admin.' });
        sendTelegramNotification(`Peran untuk pengguna <b>${user.name}</b> telah diubah menjadi <b>${newRole.toUpperCase()}</b> oleh admin.`, 'admin');

        res.json({ status: true, message: `Peran untuk ${user.name} berhasil diubah menjadi ${newRole}.` });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengubah peran pengguna.' });
    }
});

// 4. POST /api/admin/approve-user & reject-user & delete-user
router.post('/admin/approve-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
    try {
        const userToApprove = await dbGet("SELECT email, name FROM users WHERE id = ?", [userId]);
        if (!userToApprove) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });

        const result = await dbRun('UPDATE users SET status = ? WHERE id = ? AND status = ?', ['approved', userId, 'pending']);
        if (result.changes === 0) return res.status(404).json({ status: false, message: "Pengguna sudah disetujui." });

        const adminUser = await dbGet("SELECT name FROM users WHERE id = ?", [req.session.userId]);
        sendTelegramNotification(
            `<b>✅ Persetujuan Pengguna Berhasil</b>\n──────────────────────\n👤 <b>Pengguna:</b> ${userToApprove.name} (${userToApprove.email})\n👨‍💼 <b>Disetujui oleh:</b> Admin ${adminUser?.name || 'Sistem'}`
        );

        res.status(200).json({ status: true, message: `Pengguna ${userToApprove.name} berhasil disetujui.` });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal menyetujui pengguna." });
    }
});

router.post('/admin/reject-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
        const user = await dbGet("SELECT name FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        await dbRun('DELETE FROM users WHERE id = ?', [userId]);
        res.status(200).json({ status: true, message: `Pengguna ${user.name} berhasil ditolak dan dihapus.` });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal menolak pengguna." });
    }
});

router.post('/admin/delete-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: false, message: "User ID diperlukan." });
    if (req.session.userId === userId) return res.status(400).json({ status: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
    try {
        const result = await dbRun("DELETE FROM users WHERE id = ?", [userId]);
        if (result.changes === 0) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        res.json({ status: true, message: "Akun pengguna berhasil dihapus." });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal menghapus pengguna." });
    }
});

router.delete('/admin/delete-zero-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await dbRun("DELETE FROM users WHERE balance = 0 AND role != 'admin'");
        res.json({ status: true, message: `${result.changes} akun dengan saldo 0 berhasil dihapus.` });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal menghapus akun saldo 0." });
    }
});

// 5. GET /api/admin/manual-orders
router.get('/admin/manual-orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { type } = req.query; // 'manual' | 'automated' | undefined
        
        const orders = await dbAll(
            `SELECT * FROM transactions 
             WHERE service_type IN ('imei', 'ceir', 'barcode') 
                OR packageId LIKE 'cek_%' 
                OR packageId LIKE 'create_%' 
             ORDER BY createdAt DESC`
        );

        const automatedCodes = new Set([
            'cek_imei', 'cek_imei_beacukai', 'cek_history_imei', 'cek_validity', 'cek_digi', 'cek_sf',
            'create_barcode', 'create_barcode_samsung', 'create_barcode_redmi', 'create_barcode_ios26'
        ]);

        let categorizedOrders = orders.map(o => {
            const pkgId = (o.packageId || '').toLowerCase();
            const sType = (o.service_type || '').toLowerCase();
            const isAuto = sType === 'ceir' || sType === 'barcode' || automatedCodes.has(pkgId) || pkgId.startsWith('cek_') || pkgId.startsWith('create_');
            return {
                ...o,
                is_automated: isAuto,
                queue_type: isAuto ? 'automated' : 'manual'
            };
        });

        if (type === 'manual') {
            categorizedOrders = categorizedOrders.filter(o => !o.is_automated);
        } else if (type === 'automated') {
            categorizedOrders = categorizedOrders.filter(o => o.is_automated);
        }

        res.json({ status: true, data: categorizedOrders });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 6. PUT /api/admin/manual-orders/:id
router.put('/admin/manual-orders/:id', isAuthenticated, isAdmin, (req, res) => {
    manualOrderUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ status: false, message: err.message });
        try {
            const trxId = req.params.id;
            const { status, admin_note } = req.body;

            const existingTrx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
            if (!existingTrx) return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan" });

            let adminImagePath = existingTrx.admin_image;
            if (req.files && req.files['admin_image'] && req.files['admin_image'][0]) {
                adminImagePath = `/uploads/manual_orders/${req.files['admin_image'][0].filename}`;
            }

            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, admin_image = ? WHERE id = ?",
                [status || existingTrx.status, admin_note !== undefined ? admin_note : existingTrx.admin_note, adminImagePath, trxId]);

            if (status === 'failed' && (existingTrx.status === 'pending' || existingTrx.status === 'processing')) {
                const refundAmount = Number(existingTrx.platformFee || existingTrx.originalPrice || 0);
                if (refundAmount > 0) {
                    await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, existingTrx.userId]);
                }
            }

            res.json({ status: true, message: "Pesanan berhasil diperbarui" });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
});

// 7. POST /api/admin/manual-orders/:id/recheck (CeirGO Re-check Order Status)
router.post('/admin/manual-orders/:id/recheck', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const trxId = req.params.id;
        const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
        if (!trx) return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan." });

        if (!CEIRGO_API_KEY) {
            return res.status(500).json({ status: false, message: "CEIRGO_API_KEY tidak dikonfigurasi." });
        }

        const ceirRef = trx.accessToken || trx.id;
        const ceirRes = await ceirgoClient.getOrderDetail(ceirRef);

        if (!ceirRes.status) {
            return res.status(502).json({ status: false, message: `CeirGO API error: ${ceirRes.message || 'Gagal mengecek order'}` });
        }

        const ceirData = ceirRes.data || ceirRes.fullResponse || {};
        let newStatus = trx.status;
        let note = trx.admin_note || '';

        const remoteStatus = (ceirData.status || ceirData.order_status || '').toLowerCase();
        if (remoteStatus === 'success' || remoteStatus === 'completed' || remoteStatus === 'succeeded') {
            newStatus = 'success';
            note = ceirData.result || ceirData.note || 'Sukses diverifikasi dari CeirGO';
        } else if (remoteStatus === 'failed' || remoteStatus === 'cancelled' || remoteStatus === 'rejected') {
            newStatus = 'failed';
            note = ceirData.reason || ceirData.error || 'Gagal dari CeirGO';
        } else if (remoteStatus === 'processing' || remoteStatus === 'paid') {
            newStatus = 'processing';
        }

        await dbRun("UPDATE transactions SET status = ?, admin_note = ?, api_response = ? WHERE id = ?",
            [newStatus, note, JSON.stringify(ceirData), trxId]);

        res.json({ status: true, message: "Status pesanan berhasil disinkronkan dengan CeirGO.", data: { status: newStatus, note, ceirData } });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message || "Gagal melakukan recheck CeirGO." });
    }
});

// 7b. POST /api/admin/orders/:id/retry-ceirgo (Retry CeirGO Order Execution from Admin Queue)
router.post('/admin/orders/:id/retry-ceirgo', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const trxId = req.params.id;
        const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
        if (!trx) return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan." });

        const canonicalCode = (trx.packageId || trx.service_type || '').replace(/^ceirgo_price_/, '');
        const cleanImei = (trx.imei || '').split(/[\n,]+/)[0].trim().replace(/\D/g, '');

        if (!canonicalCode || !cleanImei) {
            return res.status(400).json({ status: false, message: "Data kode layanan atau IMEI tidak lengkap untuk disubmit ulang." });
        }

        console.log(`[Admin CeirGO Retry] Menjalankan submit ulang ${trxId} (${canonicalCode} -> ${cleanImei})...`);
        const ceirRes = await ceirgoClient.createOrder({
            code: canonicalCode,
            data: { imeis: [cleanImei] }
        });

        if (ceirRes.status && ceirRes.data) {
            const cd = ceirRes.data;
            const refId = cd.reference_id || cd.order_id || cd.trx_id || `CRG_${Date.now()}`;
            const serverStatus = (cd.status || cd.order_status || 'processing').toLowerCase();
            const finalStatus = (serverStatus === 'success' || serverStatus === 'completed') ? 'success' : 'processing';
            const note = typeof cd.result === 'string' ? cd.result : (cd.message || 'Sukses disubmit ulang ke CeirGO.');

            if (cd.remaining_balance != null) {
                const rb = Number(cd.remaining_balance);
                if (!isNaN(rb) && rb >= 0) {
                    await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(rb)]).catch(() => {});
                }
            }

            await dbRun(
                "UPDATE transactions SET status = ?, admin_note = ?, api_response = ?, kmspTrxId = ? WHERE id = ?",
                [finalStatus, note, JSON.stringify(cd.result || cd), refId, trxId]
            );

            return res.json({
                status: true,
                message: `Pesanan berhasil dikirim ulang ke CeirGO! Status: ${finalStatus.toUpperCase()}`,
                data: { status: finalStatus, refId, result: cd.result }
            });
        } else {
            const errMsg = ceirRes.message || ceirRes.error || 'Respon gagal dari CeirGO';
            console.error(`[Admin CeirGO Retry Error] ${trxId}:`, errMsg);
            await dbRun(
                "UPDATE transactions SET admin_note = ?, api_response = ? WHERE id = ?",
                [`[CeirGO Retry Error] ${errMsg}`, JSON.stringify(ceirRes), trxId]
            );
            return res.status(400).json({
                status: false,
                message: `Gagal submit ulang ke CeirGO: ${errMsg}`
            });
        }
    } catch (e) {
        console.error("[Admin CeirGO Retry Exception]", e.message);
        res.status(500).json({ status: false, message: `Terjadi kendala: ${e.message}` });
    }
});

router.get('/admin/ceirgo-display-settings', async (req, res) => {
    try {
        const DEFAULT_CEK_CEIR = ['cek_imei', 'cek_imei_beacukai', 'cek_history_imei', 'cek_validity', 'cek_digi', 'cek_sf'];
        const DEFAULT_BARCODE = ['create_barcode', 'create_barcode_samsung', 'create_barcode_redmi', 'create_barcode_ios26'];

        const row = await dbGet("SELECT value FROM settings WHERE key = 'ceirgo_display_settings'");
        if (row && row.value) {
            const parsed = JSON.parse(row.value);
            const cekCeir = Array.isArray(parsed.cekCeir) && parsed.cekCeir.length > 0 ? parsed.cekCeir : DEFAULT_CEK_CEIR;
            const barcode = Array.isArray(parsed.barcode) && parsed.barcode.length > 0 ? parsed.barcode : DEFAULT_BARCODE;
            return res.json({ status: true, data: { cekCeir, barcode } });
        }
        res.json({ status: true, data: { cekCeir: DEFAULT_CEK_CEIR, barcode: DEFAULT_BARCODE } });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { cekCeir, barcode } = req.body;
        const val = JSON.stringify({
            cekCeir: Array.isArray(cekCeir) ? cekCeir : [],
            barcode: Array.isArray(barcode) ? barcode : []
        });
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('ceirgo_display_settings', ?)", [val]);
        res.json({ status: true, message: "Pengaturan tampilan CeirGO berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/ceirgo-display-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { cekCeir, barcode } = req.body;
        const val = JSON.stringify({
            cekCeir: Array.isArray(cekCeir) ? cekCeir : [],
            barcode: Array.isArray(barcode) ? barcode : []
        });
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('ceirgo_display_settings', ?)", [val]);
        res.json({ status: true, message: "Pengaturan tampilan CeirGO berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 9. CeirGO Pricing Configuration (POST & PUT)
router.post('/admin/ceirgo-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        for (const [key, value] of Object.entries(pricing)) {
            const normalizedKey = key.startsWith('ceirgo_price_') ? key : `ceirgo_price_${key}`;
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [normalizedKey, String(value)]);
        }
        res.json({ status: true, message: "Harga layanan CeirGO berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/ceirgo-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        for (const [key, value] of Object.entries(pricing)) {
            const normalizedKey = key.startsWith('ceirgo_price_') ? key : `ceirgo_price_${key}`;
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [normalizedKey, String(value)]);
        }
        res.json({ status: true, message: "Harga layanan CeirGO berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 10. CeirGO Deposit & Providers
const DEFAULT_FALLBACK_PROVIDERS = [
    { id: 'qris', code: 'qris', name: 'QRIS Realtime 24 Jam', min: 10000, fee: 0, type: 'qris' },
    { id: 'bca', code: 'bca', name: 'Transfer Bank BCA', min: 50000, fee: 0, type: 'bank' },
    { id: 'mandiri', code: 'mandiri', name: 'Transfer Bank Mandiri', min: 50000, fee: 0, type: 'bank' }
];

router.get('/admin/ceirgo-deposit-providers', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.getDepositProviders();
        if (resp.status && Array.isArray(resp.data)) {
            return res.json({ status: true, data: resp.data });
        }
        res.json({ status: true, data: DEFAULT_FALLBACK_PROVIDERS, fallback: true });
    } catch (e) {
        console.warn("[API Warning] CeirGO deposit providers fetch failed:", e.message);
        res.json({ status: true, data: DEFAULT_FALLBACK_PROVIDERS, fallback: true });
    }
});

router.get('/admin/ceirgo-deposit-provider/:code', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.getDepositProviderDetail(req.params.code);
        res.json(resp);
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/ceirgo-deposit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.createDeposit(req.body);
        res.json(resp);
    } catch (e) {
        res.status(500).json({ status: false, message: e.message || "Gagal menghubungi server CeirGO" });
    }
});

router.get('/admin/ceirgo-deposits', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.getDeposits(req.query);
        res.json(resp);
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.get('/admin/ceirgo-deposit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.getDepositDetail(req.params.id);
        res.json(resp);
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.get('/admin/ceirgo-orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const resp = await ceirgoClient.getOrders(req.query);
        res.json(resp);
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 11. KMSP Packages Management & Sync
router.post('/admin/sync-packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (!KMSP_API_KEY) return res.status(400).json({ status: false, message: "KMSP_API_KEY belum dikonfigurasi." });

        const response = await fetch(`https://golang-openapi-packagelist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`, { timeout: 15000 });
        const kmspData = await response.json();

        if (!kmspData.status || !Array.isArray(kmspData.data)) {
            throw new Error(kmspData.message || "Gagal mengambil data dari KMSP.");
        }

        const kmspPackages = new Map(kmspData.data.map(p => [p.package_code, p]));
        const localPackages = await dbAll('SELECT package_code FROM packages');
        const localPackageCodes = new Set(localPackages.map(p => p.package_code));
        let added = 0, updated = 0;

        for (const [code, pkg] of kmspPackages.entries()) {
            const price = (parseInt(String(pkg.package_harga).replace(/\D/g, '')) || 0) / 100;
            const methods = JSON.stringify(pkg.available_payment_methods || []);
            if (localPackageCodes.has(code)) {
                await dbRun('UPDATE packages SET name = ?, description = ?, original_price = ?, payment_methods = ? WHERE package_code = ?',
                    [pkg.package_name, pkg.package_description || '', price, methods, code]);
                updated++;
            } else {
                await dbRun(`
                    INSERT INTO packages (package_code, name, description, original_price, platform_fee, reseller_fee, isVisible, category, isMultiPurchase, payment_methods, position) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [code, pkg.package_name, pkg.package_description || '', price, 0, 0, 0, 'reguler', 0, methods, 0]);
                added++;
            }
        }

        res.json({ status: true, message: `Sinkronisasi selesai. Ditambahkan: ${added}, Diperbarui: ${updated}.` });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.get('/admin/packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const packages = await dbAll('SELECT * FROM packages ORDER BY position ASC, rowid ASC');
        res.json({ status: true, data: packages });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/packages/bulk-update', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { packages } = req.body;
        if (!Array.isArray(packages)) return res.status(400).json({ status: false, message: "Invalid packages array" });

        for (const pkg of packages) {
            await dbRun(`
                UPDATE packages SET 
                    platform_fee = ?,
                    reseller_fee = ?,
                    isVisible = ?,
                    category = ?,
                    isMultiPurchase = ?,
                    position = ?
                WHERE package_code = ?
            `, [pkg.platform_fee, pkg.reseller_fee, pkg.isVisible, pkg.category, pkg.isMultiPurchase, pkg.position, pkg.package_code]);
        }
        res.json({ status: true, message: "Paket berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 12. Manual Services Pricing Settings & IMEI Service Status
router.get('/admin/imei-service-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'imei_service_status'");
        const noteRow = await dbGet("SELECT value FROM settings WHERE key = 'imei_service_note'");
        const statusVal = row && row.value ? row.value : 'open';
        const isOpen = statusVal === 'open' || statusVal === 'true' || statusVal === '1';
        const note = noteRow && noteRow.value ? noteRow.value : '';
        res.json({
            status: true,
            isOpen: isOpen,
            service_status: statusVal,
            note: note
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/imei-service-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { isOpen, service_status, note } = req.body;
        const statusVal = (typeof isOpen !== 'undefined') ? (isOpen ? 'open' : 'closed') : (service_status || 'open');
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('imei_service_status', ?)", [statusVal]);
        if (typeof note !== 'undefined') {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('imei_service_note', ?)", [note]);
        }
        res.json({
            status: true,
            message: `Status layanan IMEI berhasil diperbarui menjadi ${statusVal}.`,
            isOpen: statusVal === 'open',
            service_status: statusVal,
            note: note || ''
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/manual-services-pricing', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pricing = req.body;
        for (const [key, value] of Object.entries(pricing)) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, String(value)]);
        }
        res.json({ status: true, message: "Pengaturan harga layanan manual berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 13. Menu & Announcement Settings
router.get('/admin/menu-settings', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'show_beli_paket'");
        res.json({ status: true, data: { showBeliPaket: row ? row.value === 'true' : false } });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

router.put('/admin/menu-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { showBeliPaket } = req.body;
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('show_beli_paket', ?)", [String(showBeliPaket)]);
        res.json({ status: true, message: "Pengaturan menu berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/announcement', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { message, bgColor, isEnabled } = req.body;
        if (message !== undefined) {
            await dbRun("INSERT INTO announcements (message, createdAt) VALUES (?, ?)", [message, new Date().toISOString()]);
        }
        if (bgColor) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('announcementBgColor', ?)", [bgColor]);
        }
        res.json({ status: true, message: "Pengumuman berhasil diperbarui." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Helper function to fetch live CeirGO profile and balance via GET /api/me & ledger fallbacks
async function getCeirgoAdminBalance() {
    try {
        const profileRes = await ceirgoClient.getProfile();
        console.log("[CEIRGO_ME_DEBUG] Balance check summary:", JSON.stringify({
            status: profileRes.status,
            connected: profileRes.connected,
            statusCode: profileRes.statusCode,
            balance: profileRes.balance,
            hasLiveBalance: profileRes.hasLiveBalance,
            isFromCache: profileRes.isFromCache,
            message: profileRes.message
        }));

        let bal = profileRes.balance;

        if (bal == null || isNaN(bal)) {
            const cachedRow = await dbGet("SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1").catch(() => null);
            if (cachedRow && cachedRow.value != null) {
                const cachedVal = Number(cachedRow.value);
                if (!isNaN(cachedVal) && cachedVal >= 0) {
                    bal = cachedVal;
                }
            }
        }

        const isConnected = Boolean(profileRes.connected || profileRes.status);
        const finalBal = Number(bal || 0);

        return {
            balance: finalBal,
            connected: isConnected,
            live: Boolean(profileRes.hasLiveBalance),
            isFromCache: Boolean(profileRes.isFromCache),
            error: isConnected ? null : profileRes.message,
            profile: profileRes
        };
    } catch (e) {
        console.error("[API Error] getCeirgoAdminBalance failed:", e.message);
        const cachedRow = await dbGet("SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1").catch(() => null);
        const cachedVal = cachedRow && cachedRow.value ? Number(cachedRow.value) : 0;
        return { balance: isNaN(cachedVal) ? 0 : cachedVal, connected: false, live: false, isFromCache: true, error: e.message, profile: {} };
    }
}

// 14. Admin Balances
router.get('/admin/kmsp-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const balance = await getKmspAdminBalance();
        res.status(200).json({ status: true, data: { balance, kmspBalance: balance }, kmspBalance: balance });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal terhubung ke KMSP." });
    }
});

router.get('/admin/ceirgo-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const ceirgoInfo = await getCeirgoAdminBalance();
        const bal = Number(ceirgoInfo.balance || 0);
        const isConnected = Boolean(ceirgoInfo.connected || ceirgoInfo.live || bal > 0);

        return res.status(200).json({
            status: isConnected,
            connected: isConnected,
            live: Boolean(ceirgoInfo.live),
            ceirgoBalance: bal,
            balance: bal,
            error: isConnected ? null : ceirgoInfo.error,
            data: {
                ceirgoBalance: bal,
                balance: bal,
                connected: isConnected,
                live: Boolean(ceirgoInfo.live),
                error: isConnected ? null : ceirgoInfo.error,
                reserved: 0,
                profile: ceirgoInfo.profile?.profile || null,
                role: ceirgoInfo.profile?.role || null,
                permissions: ceirgoInfo.profile?.permissions || []
            }
        });
    } catch (e) {
        console.error("[API Error] CeirGO balance fetch failed:", e.message);
        res.status(200).json({
            status: false,
            connected: false,
            live: false,
            ceirgoBalance: 0,
            balance: 0,
            error: e.message,
            data: {
                balance: 0,
                ceirgoBalance: 0,
                connected: false,
                live: false,
                reserved: 0,
                error: e.message
            },
            fallback: true
        });
    }
});

router.post('/admin/ceirgo-balance/set', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { balance } = req.body;
        const num = Number(balance);
        if (isNaN(num)) return res.status(400).json({ status: false, message: "Nominal tidak valid" });
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(num)]);
        return res.status(200).json({ status: true, message: `Saldo CeirGO berhasil disimpan ke cache: Rp ${num.toLocaleString('id-ID')}`, balance: num, ceirgoBalance: num });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.get('/admin/provider-balances', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const kmspBal = await getKmspAdminBalance();
        const ceirgoInfo = await getCeirgoAdminBalance();
        const ceirgoBal = Number(ceirgoInfo.balance || 0);
        const isConnected = Boolean(ceirgoInfo.connected || ceirgoInfo.live || ceirgoBal > 0);

        return res.status(200).json({
            status: true,
            ceirgoBalance: ceirgoBal,
            kmspBalance: Number(kmspBal || 0),
            balance: ceirgoBal,
            connected: isConnected,
            ceirgoConnected: isConnected,
            ceirgoLive: Boolean(ceirgoInfo.live),
            ceirgoError: isConnected ? null : ceirgoInfo.error,
            data: {
                ceirgoBalance: ceirgoBal,
                kmspBalance: Number(kmspBal || 0),
                kmsp: Number(kmspBal || 0),
                ceirgo: ceirgoBal,
                balance: ceirgoBal,
                connected: isConnected,
                ceirgoConnected: isConnected,
                ceirgoLive: Boolean(ceirgoInfo.live),
                ceirgoError: isConnected ? null : ceirgoInfo.error,
                profile: ceirgoInfo.profile?.profile || null,
                role: ceirgoInfo.profile?.role || null,
                permissions: ceirgoInfo.profile?.permissions || []
            }
        });
    } catch (e) {
        console.error("[API Error] provider-balances failed:", e.message);
        res.status(500).json({ status: false, message: e.message || "Gagal mengambil saldo provider." });
    }
});

// 15. Broadcast System
router.post('/admin/broadcast', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { title, message, voucherCode, targetTelegram, targetInApp, bgColor } = req.body;
        if (!message) return res.status(400).json({ status: false, message: "Pesan broadcast wajib diisi." });

        if (targetInApp) {
            await dbRun("INSERT INTO announcements (message, createdAt) VALUES (?, ?)", [message, new Date().toISOString()]);
            if (bgColor) await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('announcementBgColor', ?)", [bgColor]);
            sseBroadcast('announcement', { message, bgColor });
        }

        if (targetTelegram) {
            let tgMsg = `<b>📢 ${title || 'INFORMASI TERBARU'}</b>\n──────────────────────\n${message}`;
            if (voucherCode) tgMsg += `\n\n🎟️ <b>KODE VOUCHER:</b> <code>${voucherCode}</code>`;
            sendTelegramNotification(tgMsg, 'group');
        }

        res.json({ status: true, message: "Pesan broadcast berhasil dikirimkan!" });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 16. Coupons Management (GET, POST, PUT, DELETE)
router.get('/admin/coupons', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const coupons = await dbAll("SELECT * FROM coupons ORDER BY created_at DESC");
        res.json({ status: true, data: coupons });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/coupons', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { code, discount_type, discount_value, min_order_amount, max_discount_amount, max_usage_limit, is_public, start_date, end_date, max_per_user } = req.body;
        if (!code || !discount_value) return res.status(400).json({ status: false, message: "Kode dan nilai diskon wajib diisi." });

        const couponId = `cpn_${Date.now()}`;
        await dbRun(`
            INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, max_usage_limit, used_count, is_active, is_public, start_date, end_date, max_per_user, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
        `, [couponId, code.trim().toUpperCase(), discount_type || 'fixed', Number(discount_value), Number(min_order_amount) || 0, Number(max_discount_amount) || 0, Number(max_usage_limit) || 100, is_public !== undefined ? Number(is_public) : 1, start_date || null, end_date || null, Number(max_per_user) || 1, new Date().toISOString()]);

        res.json({ status: true, message: "Kupon promo berhasil dibuat." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/coupons/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { is_active } = req.body;
        await dbRun("UPDATE coupons SET is_active = ? WHERE id = ?", [is_active, req.params.id]);
        res.json({ status: true, message: "Status kupon berhasil diubah." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.delete('/admin/coupons/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("DELETE FROM coupons WHERE id = ?", [req.params.id]);
        res.json({ status: true, message: "Kupon berhasil dihapus." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 17. Referral Settings (GET & POST)
router.get('/admin/referral-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'referral_%'");
        const data = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
        res.json({ status: true, data });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.post('/admin/referral-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, String(value)]);
        }
        res.json({ status: true, message: "Pengaturan referral berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 18. Admin Reviews Management (POST & DELETE)
router.post('/admin/reviews', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userName, userAvatar, productId, serviceType, variation, rating, comment, images, likesCount, userRole, userTotalOrders, userJoinedAt, transactionDate } = req.body;
        const reviewId = `rev_adm_${Date.now()}`;
        const dummyUserId = `usr_adm_${Date.now()}`;
        const avatarClean = userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName || 'User')}&backgroundColor=0066cc&textColor=ffffff`;

        await dbRun(`
            INSERT INTO reviews (id, userId, userName, userAvatar, orderId, productId, serviceType, variation, rating, comment, images, likesCount, transactionDate, userJoinedAt, userTotalOrders, userRole, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            reviewId, dummyUserId, userName, avatarClean, `trx_adm_${Date.now()}`, productId || 'unblock-imei', serviceType || 'imei',
            variation || 'GARANSI 3 BULAN', Number(rating) || 5, comment, JSON.stringify(images || []), Number(likesCount) || 5,
            transactionDate || new Date().toISOString().substring(0, 10), userJoinedAt || '2026-01-15T08:30:00.000Z', Number(userTotalOrders) || 12, userRole || 'Pembeli Terverifikasi', new Date().toISOString()
        ]);

        res.json({ status: true, message: "Ulasan dummy berhasil ditambahkan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.delete('/admin/reviews/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("DELETE FROM reviews WHERE id = ?", [req.params.id]);
        res.json({ status: true, message: "Ulasan berhasil dihapus." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 19. Payment Gateway Configuration
router.get('/admin/payment-gateway', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key IN ('payment_gateway', 'paymentGateway') ORDER BY key DESC");
        const activeGw = row ? row.value : 'orkut';
        res.json({
            status: true,
            data: {
                gateway: activeGw,
                merchants: {
                    nobu: 'RYYSTORE OK2285905',
                    gopay: 'RyyStore IT Solutions'
                }
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/payment-gateway', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { gateway } = req.body;
        const selected = gateway || 'orkut';
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('payment_gateway', ?)", [selected]);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('paymentGateway', ?)", [selected]);
        res.json({ status: true, message: `Gateway pembayaran berhasil diubah ke ${selected.toUpperCase()}.` });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 20. WhatsApp & Fonnte Settings
router.get('/admin/whatsapp-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tokenRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_token'");
        const urlRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_url'");
        const autoRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_auto_send'");
        res.json({
            status: true,
            data: {
                token: tokenRow ? tokenRow.value : '',
                url: urlRow ? urlRow.value : 'https://api.fonnte.com/send',
                autoSend: autoRow ? autoRow.value === 'true' : false
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

router.put('/admin/whatsapp-settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { token, url, autoSend } = req.body;
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_token', ?)", [token || '']);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_url', ?)", [url || 'https://api.fonnte.com/send']);
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_auto_send', ?)", [String(autoSend)]);
        res.json({ status: true, message: "Pengaturan WhatsApp berhasil disimpan." });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 21. Admin Support Tickets
router.get('/user/tickets', isAuthenticated, async (req, res) => {
    try {
        const tickets = await dbAll("SELECT * FROM tickets WHERE userId = ? ORDER BY updatedAt DESC", [req.session.userId]);
        res.json({ status: true, data: tickets });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil daftar tiket.' });
    }
});

router.post('/user/tickets', isAuthenticated, async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) return res.status(400).json({ status: false, message: 'Subjek dan pesan wajib diisi.' });

        const ticketId = `TKT-${Date.now()}`;
        const messageId = `MSG-${Date.now()}`;
        const now = new Date().toISOString();

        await dbRun("INSERT INTO tickets (id, userId, subject, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [ticketId, req.session.userId, subject, 'open', now, now]);
        await dbRun("INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [messageId, ticketId, req.session.userId, 'user', message, now]);

        const user = await dbGet("SELECT name FROM users WHERE id = ?", [req.session.userId]);
        sendTelegramNotification(`<b>💬 TIKET BANTUAN BARU</b>\n──────────────────────\n<b>User:</b> ${user.name}\n<b>Subjek:</b> ${subject}\n<b>Pesan:</b>\n<i>${message}</i>`, 'admin');

        res.json({ status: true, message: 'Tiket berhasil dibuat.' });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal membuat tiket.' });
    }
});

router.get('/tickets/:id', isAuthenticated, async (req, res) => {
    try {
        const ticket = await dbGet("SELECT tickets.*, users.name as userName FROM tickets JOIN users ON tickets.userId = users.id WHERE tickets.id = ?", [req.params.id]);
        if (!ticket) return res.status(404).json({ status: false, message: 'Tiket tidak ditemukan.' });

        const currentUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (currentUser.role !== 'admin' && ticket.userId !== req.session.userId) {
            return res.status(403).json({ status: false, message: 'Akses ditolak.' });
        }

        const messages = await dbAll("SELECT ticket_messages.*, users.name as senderName FROM ticket_messages JOIN users ON ticket_messages.senderId = users.id WHERE ticketId = ? ORDER BY ticket_messages.createdAt ASC", [req.params.id]);
        res.json({ status: true, data: { ticket, messages } });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil detail tiket.' });
    }
});

router.post('/tickets/:id/messages', isAuthenticated, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ status: false, message: 'Pesan wajib diisi.' });

        const ticket = await dbGet("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
        if (!ticket) return res.status(404).json({ status: false, message: 'Tiket tidak ditemukan.' });

        const currentUser = await dbGet('SELECT role, name FROM users WHERE id = ?', [req.session.userId]);
        const isAdminUser = currentUser.role === 'admin';

        if (!isAdminUser && ticket.userId !== req.session.userId) {
            return res.status(403).json({ status: false, message: 'Akses ditolak.' });
        }

        const messageId = `MSG-${Date.now()}`;
        const now = new Date().toISOString();
        const newStatus = isAdminUser ? 'answered' : 'open';

        await dbRun("INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [messageId, req.params.id, req.session.userId, isAdminUser ? 'admin' : 'user', message, now]);
        await dbRun("UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?", [newStatus, now, req.params.id]);

        if (isAdminUser) {
            sseSend(ticket.userId, 'announcement', { title: 'Balasan Tiket', message: `Admin telah membalas tiket Anda: ${ticket.subject}` });
        } else {
            sendTelegramNotification(`<b>💬 BALASAN TIKET</b>\n──────────────────────\n<b>User:</b> ${currentUser.name}\n<b>Subjek:</b> ${ticket.subject}\n<b>Pesan:</b>\n<i>${message}</i>`, 'admin');
        }

        res.json({ status: true, message: 'Balasan terkirim.' });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal membalas tiket.' });
    }
});

router.get('/admin/tickets', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tickets = await dbAll("SELECT tickets.*, users.name as userName FROM tickets JOIN users ON tickets.userId = users.id ORDER BY tickets.updatedAt DESC");
        res.json({ status: true, data: tickets });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil semua tiket.' });
    }
});

router.put(['/admin/tickets/:id/status', '/admin/tickets/:id/close'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const finalStatus = status || 'closed';
        await dbRun("UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?", [finalStatus, new Date().toISOString(), req.params.id]);
        res.json({ status: true, message: `Tiket berhasil diubah menjadi ${finalStatus}.` });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengubah status tiket.' });
    }
});

router.delete('/admin/tickets/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await dbRun("DELETE FROM ticket_messages WHERE ticketId = ?", [req.params.id]);
        await dbRun("DELETE FROM tickets WHERE id = ?", [req.params.id]);
        res.json({ status: true, message: "Tiket berhasil dihapus." });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal menghapus tiket." });
    }
});

// 22. Admin Auto Deploy Log
router.get('/admin/deploy-status', isAuthenticated, isAdmin, (req, res) => {
    const logPath = path.join(__dirname, '..', 'deploy.log');
    if (!fs.existsSync(logPath)) {
        return res.json({ status: false, log: 'Belum ada log deployment.' });
    }
    try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        res.json({ status: true, log: logContent });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal membaca log.' });
    }
});

// 23. WhatsApp Bot Status & Web-Based QR Code Endpoints (Universal Baileys / WABot Support)
router.get(['/admin/baileys/status', '/admin/wabot/status', '/admin/whatsapp/status'], isAuthenticated, isAdmin, (req, res) => {
    let waStatus = waBot.getWAStatus();
    // Auto-trigger initialization if completely disconnected and not initializing
    if (!waStatus.connected && !waStatus.isConnected && waStatus.state === 'disconnected') {
        waBot.initWABot(false).catch(() => {});
        waStatus = waBot.getWAStatus();
    }
    const isConn = Boolean(waStatus.connected || waStatus.isConnected);
    const data = {
        connected: isConn,
        isConnected: isConn,
        state: waStatus.state,
        connectedPhone: waStatus.connectedPhone,
        qrCode: waStatus.qrCode,
        qr: waStatus.qrCode,
        statusText: waStatus.statusText
    };
    res.json({
        status: true,
        success: true,
        data: data,
        ...data
    });
});

router.post(['/admin/baileys/init', '/admin/wabot/init', '/admin/whatsapp/init'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        const forceNew = req.body?.forceNew === true;
        await waBot.initWABot(forceNew);
        res.json({ status: true, success: true, message: "Inisialisasi WhatsApp Bot berhasil dipicu. Kode QR akan muncul dalam beberapa detik." });
    } catch (err) {
        res.status(500).json({ status: false, success: false, message: "Gagal inisialisasi WhatsApp: " + err.message });
    }
});

router.post(['/admin/baileys/reset', '/admin/wabot/reset', '/admin/whatsapp/reset'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        await waBot.initWABot(true);
        res.json({
            status: true,
            success: true,
            message: "Sesi WhatsApp berhasil direset. Menghasilkan QR Code baru dalam beberapa detik..."
        });
    } catch (err) {
        res.status(500).json({ status: false, success: false, message: "Gagal mereset sesi WhatsApp: " + err.message });
    }
});

router.post(['/admin/baileys/logout', '/admin/wabot/logout', '/admin/whatsapp/logout'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        const ok = await waBot.logoutWABot();
        res.json({ status: true, success: true, message: ok ? "Berhasil logout WhatsApp." : "Sesi WhatsApp telah dihapus." });
    } catch (err) {
        res.status(500).json({ status: false, success: false, message: "Gagal logout: " + err.message });
    }
});

router.post(['/admin/baileys/test', '/admin/wabot/test', '/admin/whatsapp/test'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        const phone = req.body?.targetPhone || req.body?.phone;
        if (!phone) {
            return res.status(400).json({ status: false, success: false, message: "Nomor WhatsApp tujuan wajib diisi." });
        }
        const text = "Halo! Ini adalah pesan tes notifikasi otomatis dari WhatsApp Bot Toko (Ry-ITSolutions). Bot WhatsApp Toko berfungsi normal dan aktif!";
        const sent = await waBot.sendTextMessage(phone, text);
        if (sent) {
            res.json({ status: true, success: true, message: "Pesan tes berhasil dikirim ke +" + phone });
        } else {
            res.status(400).json({ status: false, success: false, message: "Gagal mengirim pesan tes. Pastikan WhatsApp bot berstatus terhubung (scan QR)." });
        }
    } catch (err) {
        res.status(500).json({ status: false, success: false, message: "Error kirim pesan tes: " + err.message });
    }
});

// 24. GoPay Merchant Gateway Proxy Endpoints (Port 3002)
const GOPAY_GW_URL = process.env.GOPAY_GATEWAY_URL || 'http://127.0.0.1:3002';
const GOPAY_GW_KEY = process.env.GOPAY_GATEWAY_API_KEY || 'ryy-gopay-secret-key-2026';

router.get('/admin/gopay/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${GOPAY_GW_URL}/token-status`, {
            headers: { 'x-api-key': GOPAY_GW_KEY },
            timeout: 5000
        });
        const d = response.data;
        res.json({
            status: Boolean(d?.success),
            success: Boolean(d?.success),
            data: d?.data || d
        });
    } catch (err) {
        res.json({
            status: true,
            success: false,
            data: {
                token_status: 'invalid',
                connected: false,
                message: "GoPay Gateway Port 3002 tidak merespon. Pastikan service aktif."
            }
        });
    }
});

router.post(['/admin/gopay/send-otp', '/admin/gopay/request-otp'], isAuthenticated, isAdmin, async (req, res) => {
    const phone = req.body?.phone || req.body?.phone_number;
    if (!phone) {
        return res.status(400).json({ status: false, success: false, message: "Nomor HP GoBiz/GoFood wajib diisi." });
    }
    try {
        let response;
        try {
            response = await axios.post(`${GOPAY_GW_URL}/api/otp/request`, { phone }, {
                headers: { 'x-api-key': GOPAY_GW_KEY, 'Content-Type': 'application/json' },
                timeout: 30000
            });
        } catch (postErr) {
            if (postErr.response?.status === 404) {
                response = await axios.post(`${GOPAY_GW_URL}/send-otp`, { phone }, {
                    headers: { 'x-api-key': GOPAY_GW_KEY, 'Content-Type': 'application/json' },
                    timeout: 30000
                });
            } else {
                throw postErr;
            }
        }
        const d = response.data;
        res.json({
            status: Boolean(d?.success || d?.status),
            success: Boolean(d?.success || d?.status),
            message: d?.message || "Kode OTP berhasil dikirim via SMS."
        });
    } catch (err) {
        console.warn("[GOPAY_PROXY_ERROR] Send OTP failed:", err.message);
        const errorMsg = err.response?.data?.message || (err.code === 'ECONNREFUSED' || err.message.includes('timeout')
            ? "GoPay Gateway Port 3002 tidak merespon. Pastikan service aktif."
            : `Gagal mengirim OTP: ${err.message}`);
        res.status(200).json({
            status: false,
            success: false,
            message: errorMsg
        });
    }
});

router.post('/admin/gopay/verify-otp', isAuthenticated, isAdmin, async (req, res) => {
    const otp = req.body?.otp || req.body?.code;
    if (!otp) {
        return res.status(400).json({ status: false, success: false, message: "Kode OTP 4 digit wajib diisi." });
    }
    try {
        let response;
        try {
            response = await axios.post(`${GOPAY_GW_URL}/api/otp/verify`, { otp }, {
                headers: { 'x-api-key': GOPAY_GW_KEY, 'Content-Type': 'application/json' },
                timeout: 30000
            });
        } catch (postErr) {
            if (postErr.response?.status === 404) {
                response = await axios.post(`${GOPAY_GW_URL}/verify-otp`, { otp }, {
                    headers: { 'x-api-key': GOPAY_GW_KEY, 'Content-Type': 'application/json' },
                    timeout: 30000
                });
            } else {
                throw postErr;
            }
        }
        const d = response.data;
        res.json({
            status: Boolean(d?.success || d?.status),
            success: Boolean(d?.success || d?.status),
            message: d?.message || "Verifikasi OTP GoPay berhasil!",
            data: d?.data
        });
    } catch (err) {
        console.warn("[GOPAY_PROXY_ERROR] Verify OTP failed:", err.message);
        const errorMsg = err.response?.data?.message || (err.code === 'ECONNREFUSED' || err.message.includes('timeout')
            ? "GoPay Gateway Port 3002 tidak merespon. Pastikan service aktif."
            : `Gagal verifikasi OTP: ${err.message}`);
        res.status(200).json({
            status: false,
            success: false,
            message: errorMsg
        });
    }
});

router.post(['/admin/gopay/cancel-otp', '/admin/gopay/cancel'], isAuthenticated, isAdmin, async (req, res) => {
    try {
        const response = await axios.post(`${GOPAY_GW_URL}/api/otp/cancel`, {}, {
            headers: { 'x-api-key': GOPAY_GW_KEY },
            timeout: 8000
        });
        res.json({ status: true, success: true, message: response.data?.message || "Permintaan OTP dibatalkan." });
    } catch (err) {
        res.json({ status: true, success: true, message: "Permintaan OTP dibatalkan." });
    }
});

router.post('/admin/gopay/logout', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await axios.post(`${GOPAY_GW_URL}/api/otp/logout`, {}, {
            headers: { 'x-api-key': GOPAY_GW_KEY },
            timeout: 4000
        }).catch(() => {});
    } catch (err) {}

    // Direct deletion of session files across possible paths
    const sessionCandidates = [
        path.join(__dirname, '../../gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json'),
        path.join(__dirname, '../gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json'),
        path.resolve(process.cwd(), 'gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json'),
        path.resolve(process.cwd(), '../gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json')
    ];

    let removed = false;
    for (const p of sessionCandidates) {
        if (fs.existsSync(p)) {
            try {
                fs.unlinkSync(p);
                removed = true;
                console.log(`[GOPAY_LOGOUT] Removed session file: ${p}`);
            } catch (e) {
                console.error(`[GOPAY_LOGOUT] Failed to remove ${p}:`, e.message);
            }
        }
    }

    res.json({ 
        status: true, 
        success: true, 
        message: "Sesi GoPay Merchant Partner berhasil diputus (Logout)." 
    });
});

module.exports = router;
