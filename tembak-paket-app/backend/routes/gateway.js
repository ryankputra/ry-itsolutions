/**
 * GoPay Payment Gateway SaaS Controller & Routes
 * Multi-tenant merchant gateway management, subscription fee (Rp 10.000/month),
 * GoBiz OTP pairing proxy per API Key, and developer documentation endpoints.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated, sseSend } = require('../middleware/auth');

const GOPAY_GATEWAY_URL = process.env.GOPAY_GATEWAY_URL || 'http://localhost:3002';
const GOPAY_GATEWAY_API_KEY = process.env.GOPAY_GATEWAY_API_KEY || 'ryy-gopay-secret-key-2026';
const SUBSCRIPTION_PRICE_PER_MONTH = 10000;

// Path to sessions folder inside gopay-gateway
const GOPAY_SESSIONS_DIR = path.join(__dirname, '..', '..', 'gopay-gateway', 'sessions');
if (!fs.existsSync(GOPAY_SESSIONS_DIR)) {
    try { fs.mkdirSync(GOPAY_SESSIONS_DIR, { recursive: true }); } catch (e) {}
}

/**
 * Helper to calculate remaining days
 */
function getDaysRemaining(expiresAtStr) {
    if (!expiresAtStr) return 0;
    const diff = new Date(expiresAtStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * GET /api/gateway/keys
 * List all merchant API keys for the current user
 */
router.get('/gateway/keys', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await dbGet("SELECT balance FROM users WHERE id = ?", [userId]);
        const keys = await dbAll(
            "SELECT * FROM merchant_gateway_keys WHERE userId = ? ORDER BY createdAt DESC",
            [userId]
        );

        const now = Date.now();
        const formattedKeys = [];

        for (const k of keys) {
            const expTime = new Date(k.expiresAt).getTime();
            let currentStatus = k.status;
            
            // Auto update expired status if time has passed
            if (expTime <= now && currentStatus === 'active') {
                currentStatus = 'expired';
                await dbRun("UPDATE merchant_gateway_keys SET status = 'expired' WHERE id = ?", [k.id]);
            }

            formattedKeys.push({
                id: k.id,
                name: k.name,
                apiKey: k.apiKey,
                status: currentStatus,
                pricePerMonth: k.pricePerMonth || SUBSCRIPTION_PRICE_PER_MONTH,
                createdAt: k.createdAt,
                expiresAt: k.expiresAt,
                daysRemaining: getDaysRemaining(k.expiresAt),
                isExpired: expTime <= now,
                autoRenew: Boolean(k.autoRenew),
                gopayPhone: k.gopayPhone,
                merchantId: k.merchantId,
                outletName: k.outletName,
                isGopayConnected: Boolean(k.merchantId && k.gopayPhone),
                qrisTemplate: k.qrisTemplate || '',
                webhookUrl: k.webhookUrl || '',
                totalRequests: k.totalRequests || 0,
                lastUsedAt: k.lastUsedAt || null
            });
        }

        res.json({
            status: true,
            userBalance: user?.balance || 0,
            subscriptionPrice: SUBSCRIPTION_PRICE_PER_MONTH,
            data: formattedKeys
        });
    } catch (error) {
        console.error("[Gateway API] Error fetching keys:", error);
        res.status(500).json({ status: false, message: "Gagal memuat data API Key: " + error.message });
    }
});

/**
 * POST /api/gateway/keys
 * Create a new Merchant API Key (Costs Rp 10.000 / month, valid for 30 days)
 */
router.post('/gateway/keys', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name, qrisTemplate, webhookUrl, autoRenew } = req.body;

        const trimmedName = String(name || '').trim();
        if (!trimmedName || trimmedName.length < 3) {
            return res.status(400).json({ status: false, message: "Nama label API Key minimal 3 karakter (contoh: Toko Online Saya)." });
        }

        const user = await dbGet("SELECT id, name, balance FROM users WHERE id = ?", [userId]);
        if (!user || user.balance < SUBSCRIPTION_PRICE_PER_MONTH) {
            return res.status(400).json({
                status: false,
                message: `Saldo akun tidak mencukupi untuk membuat API Key. Dibutuhkan Rp ${SUBSCRIPTION_PRICE_PER_MONTH.toLocaleString('id-ID')}, saldo Anda saat ini Rp ${(user?.balance || 0).toLocaleString('id-ID')}. Silakan isi saldo terlebih dahulu.`
            });
        }

        const keyId = `gwk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const apiKey = `ry_live_${crypto.randomBytes(24).toString('hex')}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Deduct subscription fee from user balance
        await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [SUBSCRIPTION_PRICE_PER_MONTH, userId]);

        // Record transaction log for transparent finance history
        const trxId = `gw_sub_${Date.now()}`;
        await dbRun(`
            INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, status, api_response, createdAt)
            VALUES (?, ?, ?, 'gateway_apikey_monthly', ?, ?, ?, 'completed', 'Langganan API Key Payment Gateway 30 Hari', ?)
        `, [
            trxId,
            userId,
            user.name,
            `Langganan API Key Gateway (${trimmedName})`,
            SUBSCRIPTION_PRICE_PER_MONTH,
            SUBSCRIPTION_PRICE_PER_MONTH,
            now.toISOString()
        ]);

        // Insert API Key record
        await dbRun(`
            INSERT INTO merchant_gateway_keys (
                id, userId, apiKey, name, status, pricePerMonth, createdAt, expiresAt, autoRenew,
                qrisTemplate, webhookUrl, totalRequests
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, 0)
        `, [
            keyId,
            userId,
            apiKey,
            trimmedName,
            SUBSCRIPTION_PRICE_PER_MONTH,
            now.toISOString(),
            expiresAt.toISOString(),
            autoRenew === false || autoRenew === 0 ? 0 : 1,
            qrisTemplate ? String(qrisTemplate).trim() : null,
            webhookUrl ? String(webhookUrl).trim() : null
        ]);

        const updatedUser = await dbGet("SELECT id, balance, name, email, verifiedPhone FROM users WHERE id = ?", [userId]);
        sseSend(userId, 'balance_update', { balance: updatedUser.balance, source: 'gateway_subscription' });

        // Trigger multi-channel notifications (WA Admin, Telegram Admin, WA User)
        notifyGatewaySubscription(updatedUser, {
            name: trimmedName,
            apiKey,
            expiresAt: expiresAt.toISOString()
        }, false).catch(err => console.error('[Gateway Notify Error]', err));

        res.json({
            status: true,
            message: `API Key '${trimmedName}' berhasil dibuat! Masa aktif berlaku 30 hari ke depan. Saldo terpotong Rp ${SUBSCRIPTION_PRICE_PER_MONTH.toLocaleString('id-ID')}.`,
            newBalance: updatedUser.balance,
            data: {
                id: keyId,
                name: trimmedName,
                apiKey,
                status: 'active',
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                daysRemaining: 30,
                autoRenew: true
            }
        });
    } catch (error) {
        console.error("[Gateway API] Error creating key:", error);
        res.status(500).json({ status: false, message: "Gagal membuat API Key: " + error.message });
    }
});

/**
 * POST /api/gateway/keys/:id/renew
 * Extend/renew subscription by 30 days (Costs Rp 10.000)
 */
router.post('/gateway/keys/:id/renew', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;

        const key = await dbGet("SELECT * FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        const user = await dbGet("SELECT id, name, balance FROM users WHERE id = ?", [userId]);
        if (!user || user.balance < SUBSCRIPTION_PRICE_PER_MONTH) {
            return res.status(400).json({
                status: false,
                message: `Saldo tidak mencukupi untuk perpanjangan. Dibutuhkan Rp ${SUBSCRIPTION_PRICE_PER_MONTH.toLocaleString('id-ID')}. Saldo Anda: Rp ${(user?.balance || 0).toLocaleString('id-ID')}.`
            });
        }

        const currentExp = new Date(key.expiresAt).getTime();
        const now = Date.now();
        const baseTime = currentExp > now ? currentExp : now;
        const newExpiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);

        // Deduct balance
        await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [SUBSCRIPTION_PRICE_PER_MONTH, userId]);

        // Record transaction
        const trxId = `gw_ren_${Date.now()}`;
        await dbRun(`
            INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, status, api_response, createdAt)
            VALUES (?, ?, ?, 'gateway_apikey_renew', ?, ?, ?, 'completed', 'Perpanjangan API Key Payment Gateway 30 Hari', ?)
        `, [
            trxId,
            userId,
            user.name,
            `Perpanjangan API Key (${key.name})`,
            SUBSCRIPTION_PRICE_PER_MONTH,
            SUBSCRIPTION_PRICE_PER_MONTH,
            new Date().toISOString()
        ]);

        // Update key status & expiry
        await dbRun("UPDATE merchant_gateway_keys SET expiresAt = ?, status = 'active' WHERE id = ?", [
            newExpiresAt.toISOString(),
            keyId
        ]);

        const updatedUser = await dbGet("SELECT id, balance, name, email, verifiedPhone FROM users WHERE id = ?", [userId]);
        sseSend(userId, 'balance_update', { balance: updatedUser.balance, source: 'gateway_renewal' });

        // Trigger multi-channel notifications (WA Admin, Telegram Admin, WA User)
        notifyGatewaySubscription(updatedUser, {
            name: key.name,
            apiKey: key.apiKey,
            expiresAt: newExpiresAt.toISOString()
        }, true).catch(err => console.error('[Gateway Notify Error]', err));

        res.json({
            status: true,
            message: `API Key '${key.name}' berhasil diperpanjang 30 hari! Berlaku hingga ${newExpiresAt.toLocaleDateString('id-ID', { dateStyle: 'long' })}.`,
            newExpiresAt: newExpiresAt.toISOString(),
            daysRemaining: getDaysRemaining(newExpiresAt.toISOString()),
            newBalance: updatedUser.balance
        });
    } catch (error) {
        console.error("[Gateway API] Error renewing key:", error);
        res.status(500).json({ status: false, message: "Gagal memperpanjang API Key: " + error.message });
    }
});

/**
 * PATCH /api/gateway/keys/:id
 * Update API Key configuration (Name, QRIS Template, Webhook URL, Auto Renew)
 */
router.patch('/gateway/keys/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;
        const { name, qrisTemplate, webhookUrl, autoRenew } = req.body;

        const key = await dbGet("SELECT id FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            const trimmedName = String(name).trim();
            if (trimmedName.length < 3) {
                return res.status(400).json({ status: false, message: "Nama label minimal 3 karakter." });
            }
            updates.push("name = ?");
            params.push(trimmedName);
        }

        if (qrisTemplate !== undefined) {
            const cleanQris = String(qrisTemplate || '').trim();
            updates.push("qrisTemplate = ?");
            params.push(cleanQris || null);
        }

        if (webhookUrl !== undefined) {
            const cleanUrl = String(webhookUrl || '').trim();
            updates.push("webhookUrl = ?");
            params.push(cleanUrl || null);
        }

        if (autoRenew !== undefined) {
            updates.push("autoRenew = ?");
            params.push(autoRenew ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(keyId);
            await dbRun(`UPDATE merchant_gateway_keys SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        res.json({
            status: true,
            message: "Pengaturan API Key berhasil disimpan!"
        });
    } catch (error) {
        console.error("[Gateway API] Error updating key:", error);
        res.status(500).json({ status: false, message: "Gagal memperbarui pengaturan: " + error.message });
    }
});

/**
 * DELETE /api/gateway/keys/:id
 * Delete an API Key
 */
router.delete('/gateway/keys/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;

        const key = await dbGet("SELECT id, name FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        // Remove key and associated session file
        await dbRun("DELETE FROM merchant_gateway_keys WHERE id = ?", [keyId]);
        await dbRun("DELETE FROM merchant_gateway_logs WHERE keyId = ?", [keyId]);

        const keySessionFile = path.join(GOPAY_SESSIONS_DIR, `${keyId}.json`);
        if (fs.existsSync(keySessionFile)) {
            try { fs.unlinkSync(keySessionFile); } catch (e) {}
        }

        res.json({
            status: true,
            message: `API Key '${key.name}' berhasil dihapus.`
        });
    } catch (error) {
        console.error("[Gateway API] Error deleting key:", error);
        res.status(500).json({ status: false, message: "Gagal menghapus API Key: " + error.message });
    }
});

/**
 * POST /api/gateway/keys/:id/otp-request
 * Request GoBiz Login OTP for a specific Merchant API Key
 */
router.post('/gateway/keys/:id/otp-request', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;
        const { phone } = req.body;

        const key = await dbGet("SELECT id, name FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        if (!phone || String(phone).replace(/\D/g, '').length < 9) {
            return res.status(400).json({ status: false, message: "Masukkan nomor HP GoBiz yang valid (contoh: 08123456789)." });
        }

        // Call GoPay gateway OTP request endpoint with master API key
        const response = await axios.post(`${GOPAY_GATEWAY_URL}/api/otp/request`, {
            phone: String(phone).trim()
        }, {
            headers: {
                'x-api-key': GOPAY_GATEWAY_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.data && response.data.success) {
            // Save pending phone number
            await dbRun("UPDATE merchant_gateway_keys SET gopayPhone = ? WHERE id = ?", [phone, keyId]);
            return res.json({
                status: true,
                message: response.data.message || `Kode OTP berhasil dikirim via SMS ke nomor ${phone}. Silakan masukkan 4 digit kode OTP.`
            });
        } else {
            return res.status(400).json({
                status: false,
                message: response.data?.message || "Gagal meminta kode OTP dari GoJek."
            });
        }
    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error("[Gateway API] OTP Request error:", msg);
        res.status(500).json({ status: false, message: "Gagal menghubungkan ke layanan GoPay: " + msg });
    }
});

/**
 * POST /api/gateway/keys/:id/otp-verify
 * Submit 4-digit OTP, verify GoBiz session, and associate with this API Key
 */
router.post('/gateway/keys/:id/otp-verify', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;
        const { otp } = req.body;

        const key = await dbGet("SELECT * FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        const cleanOtp = String(otp || '').trim();
        if (cleanOtp.length !== 4 || !/^\d{4}$/.test(cleanOtp)) {
            return res.status(400).json({ status: false, message: "Kode OTP harus berupa 4 digit angka." });
        }

        // Call GoPay gateway OTP verify endpoint
        const response = await axios.post(`${GOPAY_GATEWAY_URL}/api/otp/verify`, {
            otp: cleanOtp
        }, {
            headers: {
                'x-api-key': GOPAY_GATEWAY_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.data && response.data.success) {
            const sessionData = response.data.data || {};
            const merchantId = sessionData.merchant_id || null;
            const outletName = sessionData.outlet_name || null;
            const phoneNumber = sessionData.phone_number || key.gopayPhone;

            // Copy generated session file to tenant-specific session file
            const masterSessionPath = path.join(__dirname, '..', '..', 'gopay-gateway', '.GOPAY_SESI_JANGAN_DIHAPUS.json');
            const tenantSessionPath = path.join(GOPAY_SESSIONS_DIR, `${keyId}.json`);

            if (fs.existsSync(masterSessionPath)) {
                try {
                    fs.copyFileSync(masterSessionPath, tenantSessionPath);
                } catch (cpErr) {
                    console.warn("[Gateway API] Error copying tenant session file:", cpErr.message);
                }
            }

            // Update database with merchant details
            await dbRun(`
                UPDATE merchant_gateway_keys 
                SET merchantId = ?, outletName = ?, gopayPhone = ? 
                WHERE id = ?
            `, [merchantId, outletName, phoneNumber, keyId]);

            return res.json({
                status: true,
                message: `Akun GoBiz (${outletName || phoneNumber || 'Merchant'}) berhasil terhubung! Gateway siap menerima pembayaran langsung ke rekening GoPay Anda.`,
                data: {
                    merchantId,
                    outletName,
                    phoneNumber
                }
            });
        } else {
            return res.status(400).json({
                status: false,
                message: response.data?.message || "Kode OTP salah atau telah kedaluwarsa."
            });
        }
    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error("[Gateway API] OTP Verify error:", msg);
        res.status(500).json({ status: false, message: "Gagal verifikasi OTP: " + msg });
    }
});

/**
 * POST /api/gateway/keys/:id/logout-gopay
 * Disconnect GoBiz merchant session for this API Key
 */
router.post('/gateway/keys/:id/logout-gopay', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;

        const key = await dbGet("SELECT id FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        // Delete session file
        const tenantSessionPath = path.join(GOPAY_SESSIONS_DIR, `${keyId}.json`);
        if (fs.existsSync(tenantSessionPath)) {
            try { fs.unlinkSync(tenantSessionPath); } catch (e) {}
        }

        // Clear merchant info in DB
        await dbRun(`
            UPDATE merchant_gateway_keys 
            SET merchantId = NULL, outletName = NULL, gopayPhone = NULL 
            WHERE id = ?
        `, [keyId]);

        res.json({
            status: true,
            message: "Koneksi akun GoBiz berhasil diputuskan."
        });
    } catch (error) {
        console.error("[Gateway API] Logout GoPay error:", error);
        res.status(500).json({ status: false, message: "Gagal memutuskan akun GoBiz: " + error.message });
    }
});

/**
 * GET /api/gateway/keys/:id/logs
 * View transaction logs for this specific API Key
 */
router.get('/gateway/keys/:id/logs', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const keyId = req.params.id;

        const key = await dbGet("SELECT id FROM merchant_gateway_keys WHERE id = ? AND userId = ?", [keyId, userId]);
        if (!key) {
            return res.status(404).json({ status: false, message: "API Key tidak ditemukan." });
        }

        const logs = await dbAll(
            "SELECT * FROM merchant_gateway_logs WHERE keyId = ? ORDER BY createdAt DESC LIMIT 50",
            [keyId]
        );

        res.json({ status: true, data: logs });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal memuat log: " + error.message });
    }
});

/**
 * Multi-channel notification for Gateway API Key Subscription / Renewal
 */
async function notifyGatewaySubscription(user, keyData, isRenewal = false) {
    try {
        const { sendTelegramNotification } = require('../telegramService');
        const { getAdminPhoneNumbers, sendTextMessage } = require('../services/waBot');

        const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
        const userPhone = user?.verifiedPhone || '';
        const actionType = isRenewal ? 'PERPANJANGAN' : 'ORDER BARU';
        const expDate = keyData.expiresAt ? new Date(keyData.expiresAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-';
        const maskedKey = keyData.apiKey ? `${keyData.apiKey.slice(0, 16)}••••••••` : '-';

        // 1. Telegram Admin Notification
        const tgMsg = `⚡ <b>GATEWAY SAAS: ${actionType} API KEY</b> ⚡\n\n` +
            `👤 <b>Pelanggan:</b> ${userName} (ID: ${user?.id || '-'})
` +
            `📱 <b>WhatsApp:</b> ${userPhone || '-'}
` +
            `🏷️ <b>Label API:</b> ${keyData.name || '-'}
` +
            `🔑 <b>API Key:</b> <code>${maskedKey}</code>
` +
            `📅 <b>Masa Aktif s/d:</b> ${expDate}
` +
            `💰 <b>Nominal:</b> Rp 10.000 (30 Hari)

` +
            `<i>Kelola lisensi di Admin Dashboard:</i> https://ry-itsolutionts.web.id/admin`;
        sendTelegramNotification(tgMsg, 'group');

        // 2. WhatsApp Admin Notification
        try {
            const adminPhones = await getAdminPhoneNumbers();
            const waAdminMsg = `⚡ *GATEWAY SAAS: ${actionType} API KEY* ⚡\n\n` +
                `👤 *Pelanggan:* ${userName}\n` +
                `📱 *WA:* ${userPhone || '-'}\n` +
                `🏷️ *Label:* ${keyData.name || '-'}\n` +
                `🔑 *Key:* ${maskedKey}\n` +
                `📅 *Masa Aktif:* ${expDate}\n` +
                `💰 *Biaya:* Rp 10.000\n\n` +
                `Dashboard: https://ry-itsolutionts.web.id/admin`;

            for (const admPhone of (adminPhones || [])) {
                sendTextMessage(admPhone, waAdminMsg).catch(e => console.error('[WA Admin Gateway Notify Error]', e.message));
            }
        } catch (waAdmErr) {
            console.error('[WA Admin Notify Error]', waAdmErr.message);
        }

        // 3. WhatsApp Customer Notification (if phone exists)
        if (userPhone && userPhone.length >= 8) {
            try {
                const waCustomerMsg = `🎉 *PEMBAYARAN LISENSI API KEY BERHASIL* ⚡\n\n` +
                    `Halo Kak *${userName}*! 👋\n\n` +
                    `Terima kasih, ${isRenewal ? 'perpanjangan' : 'langganan'} API Key Payment Gateway GoPay & QRIS Anda telah aktif:\n\n` +
                    `🏷️ *Nama Layanan:* ${keyData.name || 'Merchant Gateway'}\n` +
                    `🔑 *API Key:* ${maskedKey}\n` +
                    `📅 *Masa Aktif Hingga:* ${expDate} (30 Hari)\n` +
                    `💰 *Biaya Langganan:* Rp 10.000 / bulan\n\n` +
                    `Untuk panduan integrasi, webhook, dan testing sandbox, silakan akses:\n` +
                    `👉 https://ry-itsolutionts.web.id/gateway\n\n` +
                    `Salam,\n*Tim Ry-ITSolutions*`;

                sendTextMessage(userPhone, waCustomerMsg).catch(e => console.error('[WA Customer Gateway Notify Error]', e.message));
            } catch (waCustErr) {
                console.error('[WA Customer Notify Error]', waCustErr.message);
            }
        }
    } catch (err) {
        console.error('[notifyGatewaySubscription Exception]', err);
    }
}


// Cooldown tracker for tenant session expired notifications (max once per 2 hours per key)
const tenantAlertCooldowns = new Map();
const TENANT_ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/**
 * Send WhatsApp notification to tenant when their GoBiz session has expired
 */
async function notifyTenantSessionExpired(keyId) {
    try {
        const lastSent = tenantAlertCooldowns.get(keyId) || 0;
        if (Date.now() - lastSent < TENANT_ALERT_COOLDOWN_MS) {
            return; // In cooldown
        }

        const key = await dbGet(`
            SELECT k.*, u.name as userName, u.verifiedPhone 
            FROM merchant_gateway_keys k 
            JOIN users u ON k.userId = u.id 
            WHERE k.id = ?
        `, [keyId]);
        if (!key) return;

        const targetPhone = key.gopayPhone || key.verifiedPhone;
        if (!targetPhone) return;

        tenantAlertCooldowns.set(keyId, Date.now());

        const waBot = require('../services/waBot');
        const message = 
            `🔔 *Pemberitahuan Ry-ITSolutions Gateway*

` +
            `Halo *${key.userName || 'Merchant'}*,
` +
            `Sesi login GoBiz untuk API Key *${key.name}* Anda telah *kedaluwarsa* dari sistem GoJek.

` +
            `⚠️ *Dampak:* Website / toko online Anda saat ini tidak dapat memverifikasi pembayaran QRIS otomatis pembeli.

` +
            `👉 *Solusi Instan:* Silakan buka dashboard akun Anda untuk login ulang via OTP (hanya 10 detik):
` +
            `https://ry-itsolutionts.web.id/gateway

` +
            `Terima kasih! Tim Ry-ITSolutions`;

        const waRes = await waBot.sendTextMessage(targetPhone, message);
        console.log(`[Gateway Tenant WA Alert] Notifikasi sesi expired terkirim ke ${targetPhone}:`, waRes?.status);
    } catch (e) {
        console.error('[Gateway Tenant WA Alert Error]', e.message);
    }
}

/**
 * POST /api/gateway/internal/notify-expired
 * Internal endpoint called by gopay-gateway service when tenant session 401 is detected
 */
router.post('/gateway/internal/notify-expired', async (req, res) => {
    try {
        const { keyId, secret } = req.body;
        if (secret !== GOPAY_GATEWAY_API_KEY && secret !== 'ryy-gopay-secret-key-2026') {
            return res.status(403).json({ status: false, message: 'Unauthorized' });
        }
        if (!keyId) {
            return res.status(400).json({ status: false, message: 'keyId is required' });
        }
        await notifyTenantSessionExpired(keyId);
        res.json({ status: true, message: 'Notification queued/dispatched' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;

