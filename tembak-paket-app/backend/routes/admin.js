/**
 * Admin Panel Management, Settings, Orders, and Support Tickets
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
        const orders = await dbAll("SELECT * FROM transactions WHERE service_type IN ('imei', 'ceir') ORDER BY createdAt DESC");
        res.json({ status: true, data: orders });
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

            await dbRun("BEGIN TRANSACTION");
            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, admin_image = ? WHERE id = ?",
                [status || existingTrx.status, admin_note !== undefined ? admin_note : existingTrx.admin_note, adminImagePath, trxId]);

            if (status === 'failed' && (existingTrx.status === 'pending' || existingTrx.status === 'processing')) {
                const refundAmount = Number(existingTrx.platformFee || existingTrx.originalPrice || 0);
                if (refundAmount > 0) {
                    await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, existingTrx.userId]);
                }
            }
            await dbRun("COMMIT");

            res.json({ status: true, message: "Pesanan berhasil diperbarui" });
        } catch (e) {
            await dbRun("ROLLBACK");
            res.status(500).json({ status: false, message: e.message });
        }
    });
});

// 7. GET & POST /api/admin/menu-settings
router.get('/admin/menu-settings', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'show_beli_paket'");
        res.json({ status: true, data: { showBeliPaket: row ? row.value === 'true' : false } });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// 8. Admin Balances
router.get('/admin/kmsp-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const balance = await getKmspAdminBalance();
        res.status(200).json({ status: true, data: { balance } });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal terhubung ke KMSP." });
    }
});

router.get('/admin/ceirgo-balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (!CEIRGO_API_KEY) return res.status(200).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi' });
        const response = await axios.get(`${CEIRGO_BASE_URL}/api/wallet/snap`, {
            headers: { 'Authorization': `Bearer ${CEIRGO_API_KEY}` }
        });
        if (response.data && typeof response.data.balance !== 'undefined') {
            res.status(200).json({ status: true, data: { balance: response.data.balance, reserved: response.data.reserved } });
        } else {
            res.status(500).json({ status: false, message: 'Gagal membaca respons saldo CEIRGO' });
        }
    } catch (e) {
        res.status(500).json({ status: false, message: e.response?.data?.message || 'Gagal memuat saldo Ceirgo' });
    }
});

// 9. Admin Support Tickets
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

        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO tickets (id, userId, subject, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [ticketId, req.session.userId, subject, 'open', now, now]);
        await dbRun("INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [messageId, ticketId, req.session.userId, 'user', message, now]);
        await dbRun("COMMIT");

        const user = await dbGet("SELECT name FROM users WHERE id = ?", [req.session.userId]);
        sendTelegramNotification(`<b>💬 TIKET BANTUAN BARU</b>\n──────────────────────\n<b>User:</b> ${user.name}\n<b>Subjek:</b> ${subject}\n<b>Pesan:</b>\n<i>${message}</i>`, 'admin');

        res.json({ status: true, message: 'Tiket berhasil dibuat.' });
    } catch (e) {
        await dbRun("ROLLBACK");
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

router.get('/admin/tickets', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tickets = await dbAll("SELECT tickets.*, users.name as userName FROM tickets JOIN users ON tickets.userId = users.id ORDER BY tickets.updatedAt DESC");
        res.json({ status: true, data: tickets });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil semua tiket.' });
    }
});

// 10. Admin Auto Deploy Log
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

module.exports = router;
