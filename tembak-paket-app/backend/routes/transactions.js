/**
 * Transactions, Orders, Top-ups, and Payment Gateway Handlers
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fetch = require('node-fetch');
const qrcode = require('qrcode');

const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated, sseSend } = require('../middleware/auth');
const { escapeHtml, sendTelegramNotification } = require('../telegramService');
const { sendManualOrderNotification } = require('./telegram');
const { notifyNewOrder } = require('../services/waBot');
const ceirgoClient = require('../ceirgoClient');
const { DEFAULT_QRIS_NOBU, DEFAULT_QRIS_GOPAY, generateDynamicQRIS, generateQrisDataUrl } = require('../config/qrisGenerator');

const KMSP_API_KEY = process.env.KMSP_API_KEY;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';
const ORKUT_MERCHANT_ID = process.env.ORKUT_MERCHANT_ID;
const ORKUT_USERNAME = process.env.ORKUT_USERNAME;
const ORKUT_TOKEN = process.env.ORKUT_TOKEN;
const QRIS_NOBU_STATIS_STRING = process.env.QRIS_NOBU_STATIS_STRING || process.env.QRIS_STATIS_STRING || DEFAULT_QRIS_NOBU;
const QRIS_GOPAY_STATIS_STRING = process.env.QRIS_GOPAY_STATIS_STRING || DEFAULT_QRIS_GOPAY;
const QRIS_STATIS_STRING = QRIS_NOBU_STATIS_STRING;

// Setup Multer for Manual Orders
const manualOrderStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'manual_orders'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const uid = req.session?.userId || 'usr';
        cb(null, `manual_${uid}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`);
    }
});
const manualOrderUpload = multer({
    storage: manualOrderStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
    { name: 'image', maxCount: 5 },
    { name: 'screenshot', maxCount: 5 },
    { name: 'ceir_image', maxCount: 5 },
    { name: 'ceir_screenshot', maxCount: 5 }
]);

const qrisPollingTimeouts = new Map();

// Helper to get KMSP Balance
let kmspBalanceCache = { balance: null, lastChecked: 0 };
async function getKmspAdminBalance() {
    const CACHE_DURATION_MS = 60 * 1000;
    const now = Date.now();
    if (kmspBalanceCache.balance !== null && (now - kmspBalanceCache.lastChecked) < CACHE_DURATION_MS) {
        return kmspBalanceCache.balance;
    }
    try {
        const response = await fetch(`https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`, { timeout: 8000 });
        if (!response.ok) return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
        const data = await response.json();
        if (data.status && typeof data.data?.balance !== 'undefined') {
            const newBalance = parseFloat(data.data.balance);
            kmspBalanceCache = { balance: newBalance, lastChecked: now };
            return newBalance;
        }
        return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
    } catch (error) {
        return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
    }
}

// Gopay QRIS Helpers (Direct Gateway with Standalone Fallback)
async function generateGopayQris(amount) {
    const URL = process.env.GOPAY_GATEWAY_URL;
    const API_KEY = process.env.GOPAY_GATEWAY_API_KEY;

    if (URL && API_KEY) {
        try {
            const response = await axios.get(`${URL}/create-qris`, {
                params: { amount, api_key: API_KEY },
                timeout: 8000
            });
            if (response.data?.success && response.data.data) {
                const gData = response.data.data;
                const rawCode = gData.qris_code || gData.data;
                let dataUrl = gData.qr_image || null;
                if (!dataUrl && rawCode) {
                    try {
                        const qrcodeLib = require('qrcode');
                        dataUrl = await qrcodeLib.toDataURL(rawCode, {
                            errorCorrectionLevel: 'H',
                            margin: 4,
                            width: 480,
                            color: { dark: '#000000', light: '#ffffff' }
                        });
                    } catch (errConv) {
                        console.error("[QR_DATAURL_CONV_ERR]", errConv.message);
                    }
                }
                return {
                    ...gData,
                    qr_image: dataUrl || gData.qr_image,
                    qris_image: dataUrl || gData.qris_image,
                    qris_url: dataUrl || gData.qris_url,
                    qris_code: rawCode,
                    merchant: 'RyyStore IT Solutions'
                };
            }
        } catch (gwErr) {
            console.warn("[GOPAY_GW_WARN] Gateway port 3002 offline/unreachable, generating direct dynamic GoPay QRIS:", gwErr.message);
        }
    }

    // Direct standalone dynamic GoPay generation
    const template = process.env.QRIS_GOPAY_STATIS_STRING || QRIS_GOPAY_STATIS_STRING;
    const genRes = await generateQrisDataUrl(template, amount);
    const trxId = 'TRX-GP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const qrisId = Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
        qris_id: qrisId,
        trx_id: trxId,
        qris_url: genRes.dataUrl,
        qr_image: genRes.dataUrl,
        qris_image: genRes.dataUrl,
        qris_code: genRes.dynamicCode,
        amount: parseInt(amount, 10),
        expires_at: expiresAt.toISOString(),
        expires_in: '10 menit',
        merchant: 'RyyStore IT Solutions'
    };
}

// Unified Topup Completion
async function completeTopup(topUpId, gopayTrxId = '') {
    const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [topUpId]);
    if (!topUp || topUp.status !== 'pending') return false;

    await dbRun("BEGIN TRANSACTION");
    const result = await dbRun("UPDATE topups SET status = 'completed' WHERE id = ? AND status = 'pending'", [topUpId]);
    if (result.changes > 0) {
        const user = await dbGet("SELECT id, name, email, role, upgradedToResellerAt FROM users WHERE id = ?", [topUp.userId]);
        await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [topUp.baseAmount, user.id]);

        if (user.role !== 'reseller' && topUp.baseAmount >= 50000) {
            await dbRun("UPDATE users SET role = 'reseller', upgradedToResellerAt = ? WHERE id = ?", [new Date().toISOString(), user.id]);
            sseSend(user.id, 'role_change', { newRole: 'reseller', reason: 'Selamat! Anda berhasil upgrade menjadi Reseller.' });
        }

        await dbRun("COMMIT");

        const updatedUser = await dbGet("SELECT balance FROM users WHERE id = ?", [user.id]);
        sseSend(user.id, 'balance_update', { balance: updatedUser.balance, source: 'qris_topup' });
        sseSend(user.id, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up via QRIS berhasil!' });

        sendTelegramNotification(
            `<b>──────────────────────</b>\n<b>💰 Top Up Berhasil (QRIS)!</b>\n<b>──────────────────────</b>\n<b>Nama Pengguna:</b> ${user.name}\n<b>Jumlah Masuk:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}\n<b>ID Transaksi:</b> <code>${topUpId}</code>${gopayTrxId ? `\n<b>Ref:</b> <code>${gopayTrxId}</code>` : ''}`
        );
        return true;
    } else {
        await dbRun("ROLLBACK");
        return false;
    }
}

// Unified Direct Order Fulfillment when QRIS is paid
async function fulfillPaidTransaction(trxId, refTag = '') {
    const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
    if (!trx || (trx.status !== 'pending_payment' && trx.status !== 'unpaid')) return false;

    console.log(`[FulfillPaidTransaction] Memproses transaksi direct ${trxId} yang telah terbayar...`);

    const isCeirgo = trx.service_type === 'ceir' || (trx.packageId && (trx.packageId.startsWith('cek_') || trx.packageId.startsWith('create_') || trx.packageId.startsWith('ceirgo_')));

    if (isCeirgo) {
        const canonicalServiceCode = (trx.packageId || 'cek_history_imei').replace(/^ceirgo_price_/, '');
        const targetImei = (trx.imei || '').split(/[\n,]+/)[0].trim().replace(/\D/g, '');

        let finalStatus = 'processing';
        let refId = null;
        let adminNote = 'Pembayaran QRIS Berhasil. Sedang diproses otomatis oleh server CeirGO.';
        let apiResponse = 'Processing';

        try {
            const orderRes = await ceirgoClient.createOrder({
                code: canonicalServiceCode,
                data: {
                    imeis: [targetImei || trx.imei]
                }
            });

            if (orderRes.status && orderRes.data) {
                const ceirData = orderRes.data;
                refId = ceirData.reference_id || ceirData.order_id || ceirData.trx_id || `CRG_${Date.now()}`;
                const ceirStatus = (ceirData.status || ceirData.order_status || 'processing').toLowerCase();
                finalStatus = (ceirStatus === 'success' || ceirStatus === 'completed') ? 'success' : 'processing';
                adminNote = typeof ceirData.result === 'string' ? ceirData.result : (ceirData.message || 'Pesanan otomatis CeirGO berhasil diterima server.');
                apiResponse = JSON.stringify(ceirData.result || ceirData);
                if (ceirData.remaining_balance != null) {
                    const rb = Number(ceirData.remaining_balance);
                    if (!isNaN(rb) && rb >= 0) {
                        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(rb)]).catch(() => {});
                    }
                }
                console.log(`[CeirGO Auto-Order] Sukses diterima server! Ref ID: ${refId}, Status: ${finalStatus}`);
            } else {
                const err = orderRes.message || orderRes.error || 'Respon gagal dari CeirGO';
                finalStatus = 'pending';
                adminNote = `CeirGO Auto-Submit: ${err}. Menunggu verifikasi admin.`;
                apiResponse = JSON.stringify(orderRes);
            }
        } catch (ceirErr) {
            console.error(`[CeirGO Auto-Order Error]`, ceirErr.message);
            finalStatus = 'pending';
            adminNote = `CeirGO Timeout: ${ceirErr.message}. Menunggu verifikasi admin.`;
            apiResponse = ceirErr.message;
        }

        await dbRun("UPDATE transactions SET status = ?, accessToken = ?, admin_note = ?, api_response = ? WHERE id = ?",
            [finalStatus, refId, adminNote, apiResponse, trx.id]);

        sseSend(trx.userId, 'transaction_status', { id: trx.id, status: finalStatus, message: adminNote });
        sseSend(trx.userId, 'transaction_update', { id: trx.id, status: finalStatus, note: adminNote });
        sendTelegramNotification(`<b>⚡ Direct QRIS Paid & Auto CeirGO!</b>\n<b>Layanan:</b> ${trx.packageName}\n<b>IMEI:</b> <code>${trx.imei}</code>\n<b>Status:</b> <b>${finalStatus.toUpperCase()}</b>`, 'group');
    } else {
        // Manual IMEI or other service: Status in_queue (Menunggu Konfirmasi Admin)
        await dbRun("UPDATE transactions SET status = 'in_queue', api_response = 'Pembayaran QRIS Terverifikasi. Menunggu Konfirmasi Admin.', admin_note = 'Pembayaran QRIS terverifikasi. Menunggu konfirmasi & pengerjaan oleh Admin.' WHERE id = ?", [trx.id]);
        sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'in_queue', message: 'Pembayaran terverifikasi! Pesanan masuk dalam antrean menunggu konfirmasi admin.' });
        const notifMsg = 
            `🔔 <b>PEMBAYARAN QRIS MANUAL BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 <b>Order ID:</b> <code>${trx.id}</code>\n` +
            `👤 <b>Pelanggan:</b> ${escapeHtml(trx.userName || 'Pelanggan')}\n` +
            `📞 <b>No. WhatsApp:</b> <code>${trx.targetPhone || '-'}</code>\n` +
            `📦 <b>Layanan:</b> ${escapeHtml(trx.packageName)}\n` +
            `📱 <b>IMEI:</b> <code>${trx.imei}</code>\n` +
            `💰 <b>Nominal:</b> Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString('id-ID')}\n` +
            `⏳ <b>Status:</b> <b>DALAM ANTREAN</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 <i>Gunakan tombol aksi di bawah untuk memproses pesanan:</i>`;
        sendManualOrderNotification(notifMsg, trx.id, null);

        // Send WhatsApp Admin & Customer Notification on QRIS payment
        try {
            const { notifyNewOrder, getCustomerPhoneForTransaction } = require('../services/waBot');
            getCustomerPhoneForTransaction(trx).then(custPhone => {
                notifyNewOrder({
                    id: trx.id,
                    userName: trx.userName,
                    packageName: trx.packageName,
                    serviceType: trx.service_type,
                    imei: trx.imei,
                    price: trx.platformFee || trx.originalPrice || 0,
                    speedOption: trx.speed_option || 'slow',
                    userImage: trx.user_image,
                    userImageCeir: trx.user_image_ceir,
                    customerPhone: custPhone
                }).catch(waErr => console.error('[WABot QRIS Error]', waErr.message));
            }).catch(() => {});
        } catch (e) {}
    }
    return true;
}

// Gopay QRIS Polling
function checkGopayPaymentStatus(id, amount, gopayTrxId, startTime) {
    const URL = process.env.GOPAY_GATEWAY_URL;
    const API_KEY = process.env.GOPAY_GATEWAY_API_KEY;
    if (!URL || !API_KEY) return;
    const maxDurationMs = 10 * 60 * 1000;
    const interval = 8000;

    const isTopup = id.startsWith('TU-');

    const pollingLoop = async () => {
        try {
            if (isTopup) {
                const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [id]);
                if (!topUp || topUp.status !== 'pending') { qrisPollingTimeouts.delete(id); return; }
                const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
                if (timeElapsed >= maxDurationMs) {
                    await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [id]);
                    qrisPollingTimeouts.delete(id);
                    return;
                }
            } else {
                const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [id]);
                if (!trx || trx.status !== 'pending_payment') { qrisPollingTimeouts.delete(id); return; }
                const timeElapsed = Date.now() - new Date(trx.createdAt).getTime();
                if (timeElapsed >= maxDurationMs) {
                    await dbRun("UPDATE transactions SET status = 'failed', api_response = 'Waktu pembayaran QRIS habis (Expired).' WHERE id = ?", [id]);
                    qrisPollingTimeouts.delete(id);
                    return;
                }
            }

            const response = await axios.get(`${URL}/check-payment`, {
                params: { amount, trx_id: gopayTrxId, api_key: API_KEY, start_time: startTime },
                timeout: 15000
            });
            if (response.data?.success && response.data.paid) {
                if (isTopup) {
                    await completeTopup(id, gopayTrxId);
                } else {
                    await fulfillPaidTransaction(id, gopayTrxId);
                }
                qrisPollingTimeouts.delete(id);
                return;
            }
        } catch (error) {
            console.error(`[GOPAY_POLL_ERROR] ${id}:`, error.message);
        }
        const timeoutId = setTimeout(pollingLoop, interval);
        qrisPollingTimeouts.set(id, timeoutId);
    };
    if (!qrisPollingTimeouts.has(id)) {
        qrisPollingTimeouts.set(id, setTimeout(pollingLoop, 5000));
    }
}

// Dynamic QRIS Generator (Supports Nobu Bank / Orkut & GoPay Direct)
async function generateDynamicQris(amount, provider = 'nobu') {
    const isGopay = String(provider).toLowerCase().includes('gopay');
    const template = isGopay ? (process.env.QRIS_GOPAY_STATIS_STRING || QRIS_GOPAY_STATIS_STRING) : (process.env.QRIS_NOBU_STATIS_STRING || QRIS_NOBU_STATIS_STRING || QRIS_STATIS_STRING);
    if (!template) throw new Error("Template QRIS statis belum dikonfigurasi.");

    // 1. Instant local EMVCo generator with CRC16 (0ms latency, bulletproof)
    try {
        const genRes = await generateQrisDataUrl(template, amount);
        if (genRes && genRes.dataUrl) {
            return {
                dataUrl: genRes.dataUrl,
                dynamicCode: genRes.dynamicCode
            };
        }
    } catch (localErr) {
        console.warn("[QRIS_GEN] Local generator warning:", localErr.message);
    }

    // 2. Fallback to external API if available
    try {
        const response = await axios.post('https://qrisku.my.id/api', { amount: amount.toString(), qris_statis: template }, { timeout: 8000 });
        if (response.data?.status === 'success' && response.data.qris_base64) {
            return {
                dataUrl: `data:image/png;base64,${response.data.qris_base64}`,
                dynamicCode: response.data.qris_code || response.data.qris_data || ''
            };
        }
    } catch (extErr) {}

    throw new Error('Gagal menghasilkan QRIS dinamis.');
}

function checkOrkutPaymentStatus(id, uniqueAmount) {
    if (!ORKUT_MERCHANT_ID || !ORKUT_USERNAME || !ORKUT_TOKEN) return;
    const url = `https://qris.payment.web.id/payment/qris/${ORKUT_MERCHANT_ID}`;
    const maxDurationMs = 15 * 60 * 1000;
    const interval = 15000;

    const isTopup = id.startsWith('TU-');

    const pollingLoop = async () => {
        try {
            if (isTopup) {
                const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [id]);
                if (!topUp || topUp.status !== 'pending') {
                    qrisPollingTimeouts.delete(id);
                    return;
                }
                const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
                if (timeElapsed >= maxDurationMs) {
                    await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [id]);
                    qrisPollingTimeouts.delete(id);
                    return;
                }
            } else {
                const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [id]);
                if (!trx || trx.status !== 'pending_payment') {
                    qrisPollingTimeouts.delete(id);
                    return;
                }
                const timeElapsed = Date.now() - new Date(trx.createdAt).getTime();
                if (timeElapsed >= maxDurationMs) {
                    await dbRun("UPDATE transactions SET status = 'failed', api_response = 'Waktu pembayaran QRIS habis (Expired).' WHERE id = ?", [id]);
                    qrisPollingTimeouts.delete(id);
                    return;
                }
            }

            const response = await axios.post(url, {
                username: ORKUT_USERNAME,
                token: ORKUT_TOKEN
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

            if (response.data && Array.isArray(response.data.data)) {
                const paymentFound = response.data.data.find(item =>
                    (item.type === 'CR' || item.tipe === 'CR') && parseFloat(item.nominal || item.amount) === parseFloat(uniqueAmount)
                );

                if (paymentFound) {
                    if (isTopup) {
                        await completeTopup(id, 'ORKUT');
                    } else {
                        await fulfillPaidTransaction(id, 'ORKUT');
                    }
                    qrisPollingTimeouts.delete(id);
                    return;
                }
            }
        } catch (error) {
            console.error(`[ORKUT_POLL_ERROR]`, error.message);
        }

        const timeoutId = setTimeout(pollingLoop, interval);
        qrisPollingTimeouts.set(id, timeoutId);
    };

    if (!qrisPollingTimeouts.has(id)) {
        qrisPollingTimeouts.set(id, setTimeout(pollingLoop, 5000));
    }
}

// Payment Gateways Webhook (GoPay & QRIS Mutasi)
router.post(['/gopay/webhook', '/payment/callback', '/callback/gopay', '/callback/qris'], async (req, res) => {
    try {
        console.log('[Payment Webhook Callback Received]', JSON.stringify(req.body));
        const body = req.body || {};
        
        const rawAmount = body.amount || body.nominal || body.total_amount || body.gross_amount || body.data?.amount || body.data?.nominal;
        const amount = rawAmount ? parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) : null;
        const trxId = body.trx_id || body.order_id || body.custom_ref || body.transaction_id || body.data?.trx_id;
        const gopayTrxId = body.gopay_trx_id || body.reference_id || trxId || `CALLBACK_${Date.now()}`;
        const status = (body.status || body.transaction_status || body.data?.status || 'PAID').toUpperCase();

        const isPaid = status === 'PAID' || status === 'SUCCESS' || status === 'SETTLEMENT' || status === 'COMPLETED';
        if (!isPaid) {
            return res.json({ status: true, message: `Status ${status} diabaikan (bukan pembayaran sukses).` });
        }

        let handled = false;

        // 1. Match Topup by ID
        if (trxId && trxId.startsWith('TU-')) {
            const topUp = await dbGet("SELECT * FROM topups WHERE id = ? AND status = 'pending'", [trxId]);
            if (topUp) {
                await completeTopup(topUp.id, gopayTrxId);
                handled = true;
            }
        }

        // 2. Match Direct Order Transaction by ID
        if (!handled && trxId && trxId.startsWith('trx_')) {
            const trx = await dbGet("SELECT * FROM transactions WHERE id = ? AND status = 'pending_payment'", [trxId]);
            if (trx) {
                await fulfillPaidTransaction(trx.id, gopayTrxId);
                handled = true;
            }
        }

        // 3. Match by exact nominal if ID not explicit
        if (!handled && amount) {
            const topUp = await dbGet("SELECT * FROM topups WHERE status = 'pending' AND (uniqueAmount = ? OR baseAmount = ?) ORDER BY createdAt DESC LIMIT 1", [amount, amount]);
            if (topUp) {
                await completeTopup(topUp.id, gopayTrxId);
                handled = true;
            } else {
                const trx = await dbGet("SELECT * FROM transactions WHERE status = 'pending_payment' AND (uniqueAmount = ? OR platformFee = ?) ORDER BY createdAt DESC LIMIT 1", [amount, amount]);
                if (trx) {
                    await fulfillPaidTransaction(trx.id, gopayTrxId);
                    handled = true;
                }
            }
        }

        if (handled) {
            console.log(`[Payment Webhook] Sukses diverifikasi dan diproses untuk amount: ${amount}, trxId: ${trxId}`);
            return res.status(200).json({ status: true, message: 'Pembayaran berhasil diverifikasi dan pesanan diproses otomatis.' });
        } else {
            console.warn(`[Payment Webhook Warning] Transaksi pending tidak ditemukan untuk amount: ${amount}, trxId: ${trxId}`);
            return res.status(200).json({ status: true, message: 'Webhook diterima tetapi transaksi tidak ditemukan atau sudah selesai.' });
        }
    } catch (err) {
        console.error('[Payment Webhook Fatal Error]', err.message);
        res.status(500).json({ status: false, message: `Gagal memproses webhook: ${err.message}` });
    }
});

// 1. POST /api/purchase & /api/purchase/non-otp
router.post(['/purchase', '/purchase/non-otp'], isAuthenticated, async (req, res) => {
    const { packageId, phone, paymentMethod, ewallet_number, purchaseContext = 'paket-satuan' } = req.body;
    let access_token = req.body.access_token || 'non_otp';
    if (!packageId || !phone || !paymentMethod) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });
    }

    let user;
    let pkg;
    let effectiveFee;
    const trxId = `trx_${Date.now()}_${uuidv4().slice(0, 4)}`;

    try {
        user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        pkg = await dbGet('SELECT * FROM packages WHERE package_code = ?', [packageId]);

        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda." });
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

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
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, effectiveFee, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);

            sendTelegramNotification(
                `<b>⚠️ Saldo KMSP Kurang! (Paket OTP) ⚠️</b>\n──────────────────────\n<b>Pengguna:</b> ${user.name}\n<b>Meminta Paket:</b> ${pkg.name}\n<b>Harga Provider:</b> Rp ${packagePrice.toLocaleString('id-ID')}\n<b>Saldo KMSP Saat Ini:</b> Rp ${adminBalance.toLocaleString('id-ID')}\n──────────────────────\nTransaksi diantrekan.`, 'admin');

            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan masuk antrean, akan diproses otomatis.", newBalance: updatedUser.balance });
        }

        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, platformFeeOnly, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'processing', 'Menghubungi provider...']);

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
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const errorMessage = isDorUlangFailure ? "Gagal (Dor Ulang): Coba lagi setelah 10 menit." : (purchaseData.message || 'Pembelian gagal.');
            return res.status(500).json({ status: false, message: errorMessage, newBalance: finalUser.balance });
        }
    } catch (error) {
        if (user && pkg && typeof effectiveFee === 'number' && effectiveFee > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);
        }
        const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [req.session.userId]);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan internal.", newBalance: finalUser?.balance });
    }
});

// 2. POST /api/order/manual & /api/order/ceir
router.post(['/transactions/manual', '/order/ceir', '/order/manual'], isAuthenticated, (req, res) => {
    manualOrderUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ status: false, message: err.message });
        try {
            const { service_type, imei, duration, price_key, speed_option } = req.body;
            if (!['imei', 'ceir'].includes(service_type)) return res.status(400).json({ status: false, message: "Tipe layanan tidak valid" });
            if (!imei) return res.status(400).json({ status: false, message: "IMEI harus diisi" });

            const imeiList = imei.split(/[\n,]+/).map(i => i.replace(/\s+/g, '').trim()).filter(i => i.length >= 15);
            if (imeiList.length === 0) return res.status(400).json({ status: false, message: "Tidak ada IMEI valid yang dimasukkan" });
            const imeiCount = imeiList.length;
            const cleanImei = imeiList.join(', ');

            if (service_type === 'ceir' && imeiCount > 1) {
                return res.status(400).json({ status: false, message: "Layanan Cek CEIR hanya bisa 1 IMEI per transaksi." });
            }

            let price = 0;
            if (service_type === 'imei') {
                const targetPkgId = price_key || req.body.package_id || req.body.packageId;
                let pkg = targetPkgId ? await dbGet("SELECT price FROM imei_packages WHERE id = ?", [targetPkgId]) : null;
                if (pkg) {
                    price = pkg.price;
                    const spOpt = speed_option || req.body.speed;
                    if (spOpt) {
                        const speedPriceRow = await dbGet("SELECT value FROM settings WHERE key = ?", [`imei_speed_${spOpt}`]);
                        if (speedPriceRow && speedPriceRow.value !== 'disabled') {
                            price += parseInt(speedPriceRow.value) || 0;
                        }
                    }
                } else if (req.body.amount) {
                    price = Math.round(Number(req.body.amount) / imeiCount);
                } else {
                    return res.status(400).json({ status: false, message: "Paket IMEI tidak ditemukan" });
                }
            } else {
                const canonicalKey = price_key.replace(/^ceirgo_price_/, '');
                const priceKeys = [`ceirgo_price_${canonicalKey}`, canonicalKey, price_key];
                let priceRow = null;
                for (const key of priceKeys) {
                    priceRow = await dbGet("SELECT value FROM settings WHERE key = ?", [key]);
                    if (priceRow && Number(priceRow.value) > 0) break;
                }
                if (!priceRow) return res.status(400).json({ status: false, message: "Harga CEIR tidak ditemukan" });
                price = parseInt(priceRow.value) || 0;
            }

            const totalPrice = price * imeiCount;

            let discountAmount = 0;
            let appliedCoupon = null;
            if (req.body.coupon_code) {
                const cleanCode = req.body.coupon_code.trim().toUpperCase();
                const coupon = await dbGet("SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1", [cleanCode]);
                if (coupon) {
                    const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
                    const validStart = !coupon.start_date || !coupon.start_date.trim() || coupon.start_date.trim().split('T')[0] <= todayWIB;
                    const validEnd = !coupon.end_date || !coupon.end_date.trim() || coupon.end_date.trim().split('T')[0] >= todayWIB;
                    const validDate = validStart && validEnd;
                    const validQuota = coupon.used_count < coupon.max_usage_limit;
                    const effectiveOrderAmount = Math.max(totalPrice, Number(req.body.cart_subtotal) || 0);
                    const validMin = effectiveOrderAmount >= coupon.min_order_amount;
                    const maxPerUser = coupon.max_per_user || 1;
                    const userUsage = await dbGet("SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ? AND userId = ?", [coupon.id, req.session.userId]);
                    const validUserUsage = !userUsage || userUsage.count < maxPerUser;

                    if (validDate && validQuota && validMin && validUserUsage) {
                        if (coupon.discount_type === 'percent') {
                            discountAmount = (coupon.discount_value / 100) * totalPrice;
                            if (coupon.max_discount_amount > 0 && discountAmount > coupon.max_discount_amount) {
                                discountAmount = coupon.max_discount_amount;
                            }
                        } else {
                            discountAmount = Math.min(coupon.discount_value, totalPrice);
                        }
                        discountAmount = Math.round(discountAmount);
                        appliedCoupon = coupon;
                    }
                }
            }

            let coinsDiscount = 0;
            let coinsToDeduct = 0;
            const useCoins = req.body.use_coins === 'true' || req.body.use_coins === true;
            if (useCoins) {
                const userObj = await dbGet("SELECT coins FROM users WHERE id = ?", [req.session.userId]);
                const userCoins = userObj?.coins || 0;
                const priceAfterCoupon = Math.max(0, totalPrice - discountAmount);
                if (priceAfterCoupon >= 50000 && userCoins > 0) {
                    const maxCoinByPercent = Math.floor(priceAfterCoupon * 0.1);
                    const maxCoinHardCap = 5000;
                    const maxCoinDeductible = Math.min(maxCoinByPercent, maxCoinHardCap);
                    coinsToDeduct = Math.min(userCoins, maxCoinDeductible, priceAfterCoupon);
                    if (coinsToDeduct > 0) {
                        coinsDiscount = coinsToDeduct;
                    }
                }
            }

            const finalPriceToPay = Math.max(0, totalPrice - discountAmount - coinsDiscount);
            const isQrisPayment = (req.body.payment_method || req.body.paymentMethod) === 'qris';

            const user = await dbGet("SELECT id, name, balance, verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
            if (!isQrisPayment && user.balance < finalPriceToPay) {
                return res.status(402).json({ status: false, message: `Saldo tidak mencukupi untuk pembayaran sebesar Rp ${finalPriceToPay.toLocaleString('id-ID')}` });
            }

            if (!isQrisPayment) {
                await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [finalPriceToPay, req.session.userId]);
            }

            if (coinsToDeduct > 0 && !isQrisPayment) {
                try {
                    await dbRun("UPDATE users SET coins = coins - ? WHERE id = ?", [coinsToDeduct, req.session.userId]);
                } catch (e) {}
            }

            const trxId = `trx_m_${Date.now()}`;
            const packageName = service_type === 'imei' ? `Unblock IMEI (${duration}) x${imeiCount}` : `Cek CEIR (${duration})`;

            if (appliedCoupon && !isQrisPayment) {
                try {
                    await dbRun("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [appliedCoupon.id]);
                    await dbRun("INSERT INTO coupon_usages (id, coupon_id, userId, trxId, discount_amount, used_at) VALUES (?, ?, ?, ?, ?, ?)", [`usg_${Date.now()}`, appliedCoupon.id, req.session.userId, trxId, discountAmount, new Date().toISOString()]);
                    await dbRun("DELETE FROM user_claimed_coupons WHERE coupon_id = ? AND userId = ?", [appliedCoupon.id, req.session.userId]);
                } catch (e) {}
            }

            let imagePaths = [];
            const imgFiles = [
                ...(req.files && req.files['image'] ? req.files['image'] : []),
                ...(req.files && req.files['screenshot'] ? req.files['screenshot'] : [])
            ];
            if (imgFiles.length > 0) {
                imagePaths = imgFiles.map(f => `/public/uploads/manual_orders/${f.filename}`);
            }
            const imagePath = imagePaths.length > 0 ? imagePaths.join(',') : null;

            let ceirImagePaths = [];
            const ceirFilesList = [
                ...(req.files && req.files['ceir_image'] ? req.files['ceir_image'] : []),
                ...(req.files && req.files['ceir_screenshot'] ? req.files['ceir_screenshot'] : [])
            ];
            if (ceirFilesList.length > 0) {
                ceirImagePaths = ceirFilesList.map(f => `/public/uploads/manual_orders/${f.filename}`);
            }
            const ceirImagePath = ceirImagePaths.length > 0 ? ceirImagePaths.join(',') : null;

            const targetPhone = String(req.body.target_phone || req.body.targetPhone || user?.verifiedPhone || '').trim();
            if (targetPhone && !user?.verifiedPhone) {
                const cleanUserP = targetPhone.replace(/\D/g, '');
                if (cleanUserP.length >= 9) {
                    const formattedP = cleanUserP.startsWith('0') ? '62' + cleanUserP.slice(1) : (cleanUserP.startsWith('62') ? cleanUserP : '62' + cleanUserP);
                    dbRun("UPDATE users SET verifiedPhone = ? WHERE id = ? AND (verifiedPhone IS NULL OR verifiedPhone = '')", [formattedP, req.session.userId]).catch(() => {});
                }
            }

            // Handle Direct QRIS Purchase
            if (isQrisPayment) {
                const gwRow = await dbGet("SELECT value FROM settings WHERE key IN ('payment_gateway', 'paymentGateway') ORDER BY key DESC");
                const activeGateway = gwRow ? gwRow.value : 'orkut';
                const requestedGw = String(req.body.gateway || req.body.provider || req.body.paymentMethod || req.body.payment_method || '').toLowerCase();
                const isGopay = (requestedGw === 'gopay') || (activeGateway === 'gopay' && requestedGw !== 'nobu' && requestedGw !== 'orkut');

                let qrisImage = null;
                let dynamicRawCode = '';
                let uniqueAmt = finalPriceToPay;
                let expiresAtSec = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);
                let gopayTrxId = null;
                let merchantName = 'RYYSTORE OK2285905';

                if (isGopay) {
                    merchantName = 'RyyStore IT Solutions';
                    const gopayData = await generateGopayQris(finalPriceToPay);
                    qrisImage = gopayData.qris_image || gopayData.qr_image || gopayData.qris_url || gopayData.qr_url;
                    dynamicRawCode = gopayData.qris_code || '';
                    if (qrisImage && !qrisImage.startsWith('data:image') && gopayData.qris_code) {
                        try {
                            const qrcodeLib = require('qrcode');
                            qrisImage = await qrcodeLib.toDataURL(gopayData.qris_code, { errorCorrectionLevel: 'H', margin: 4, width: 480 });
                        } catch (e) {}
                    }
                    gopayTrxId = gopayData.trx_id;
                    expiresAtSec = Math.floor((Date.now() + 10 * 60 * 1000) / 1000);
                } else {
                    const uniqueCode = Math.floor(Math.random() * 900) + 100;
                    uniqueAmt = finalPriceToPay + uniqueCode;
                    const nobuGen = await generateDynamicQris(uniqueAmt, 'nobu');
                    qrisImage = typeof nobuGen === 'string' ? nobuGen : (nobuGen?.dataUrl || '');
                    dynamicRawCode = typeof nobuGen === 'string' ? '' : (nobuGen?.dynamicCode || '');
                }

                await dbRun(`
                    INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, status, api_response, createdAt, service_type, imei, user_image, user_image_ceir, admin_image, admin_note, speed_option, coupon_code, discount_amount, qrisBase64Image, uniqueAmount)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, null, 'qris', 'pending_payment', 'Menunggu Pembayaran QRIS', ?, ?, ?, ?, ?, null, 'Menunggu Pembayaran QRIS', ?, ?, ?, ?, ?)
                `, [
                    trxId,
                    req.session.userId,
                    user.name,
                    price_key || (service_type === 'ceir' ? 'ceirgo_auto' : 'manual'),
                    packageName,
                    finalPriceToPay,
                    totalPrice,
                    targetPhone,
                    new Date().toISOString(),
                    service_type,
                    cleanImei,
                    imagePath,
                    ceirImagePath,
                    speed_option || 'slow',
                    appliedCoupon ? appliedCoupon.code : null,
                    discountAmount + coinsDiscount,
                    qrisImage,
                    uniqueAmt
                ]);

                // Start polling
                if (isGopay && gopayTrxId) {
                    checkGopayPaymentStatus(trxId, finalPriceToPay, gopayTrxId, new Date().toISOString());
                } else {
                    checkOrkutPaymentStatus(trxId, uniqueAmt);
                }

                return res.status(200).json({
                    status: true,
                    message: "Silakan scan QRIS untuk menyelesaikan pembayaran pesanan Anda.",
                    trxId,
                    paymentMethod: 'qris',
                    merchant: merchantName,
                    gateway: isGopay ? 'gopay' : 'orkut',
                    data: {
                        id: trxId,
                        status: 'pending_payment',
                        amount: finalPriceToPay,
                        unique_amount: uniqueAmt,
                        qris_image: qrisImage,
                        qris_code: dynamicRawCode || qrisImage,
                        merchant: merchantName,
                        expires_at: expiresAtSec
                    },
                    qrisData: {
                        base64Image: qrisImage,
                        qrisCode: dynamicRawCode,
                        uniqueAmount: uniqueAmt,
                        expiresAt: expiresAtSec,
                        merchant: merchantName
                    }
                });
            }

            // Pesanan via saldo telah terbayar lunas (saldo user telah terpotong):
            // Status awal adalah 'in_queue' (Menunggu Konfirmasi Admin / Dalam Antrean), kecuali CeirGO instan yang otomatis 'processing'/'success'
            let finalStatus = 'in_queue';
            let apiResponse = 'Pembayaran Saldo Berhasil. Menunggu Konfirmasi Admin.';
            let adminNote = 'Pesanan terbayar dengan saldo akun. Menunggu konfirmasi & pengerjaan oleh Admin.';
            let adminImagePath = null;
            let refId = null;

            // AUTOMATIC ORDER PROCESSING FOR CEIRGO SERVICES
            const isCeirgoService = service_type === 'ceir' || (price_key && (price_key.startsWith('cek_') || price_key.startsWith('create_') || price_key.startsWith('ceirgo_')));

            if (isCeirgoService) {
                const canonicalServiceCode = (price_key || 'cek_history_imei').replace(/^ceirgo_price_/, '');
                const targetImeisArray = cleanImei.split(',').map(i => i.trim().replace(/\D/g, '')).filter(Boolean);

                console.log(`[CeirGO Auto-Order] Memproses pesanan otomatis ke CeirGO (${canonicalServiceCode}) untuk Transaksi ${trxId}...`);
                try {
                    const orderRes = await ceirgoClient.createOrder({
                        code: canonicalServiceCode,
                        data: {
                            imeis: targetImeisArray.length > 0 ? targetImeisArray : [cleanImei]
                        }
                    });

                    if (orderRes.status && orderRes.data) {
                        const ceirData = orderRes.data;
                        refId = ceirData.reference_id || ceirData.order_id || ceirData.trx_id || `CRG_${Date.now()}`;
                        const ceirStatus = (ceirData.status || ceirData.order_status || 'processing').toLowerCase();
                        finalStatus = (ceirStatus === 'success' || ceirStatus === 'completed') ? 'success' : 'processing';
                        adminNote = typeof ceirData.result === 'string' ? ceirData.result : (ceirData.message || 'Pesanan otomatis CeirGO berhasil diterima server.');
                        apiResponse = JSON.stringify(ceirData.result || ceirData);

                        if (ceirData.remaining_balance != null) {
                            const rb = Number(ceirData.remaining_balance);
                            if (!isNaN(rb) && rb >= 0) {
                                await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(rb)]).catch(() => {});
                            }
                        }

                        console.log(`[CeirGO Auto-Order] Sukses diterima server! Ref ID: ${refId}, Status: ${finalStatus}`);
                    } else {
                        const errorMsg = orderRes.message || orderRes.error || 'Respon gagal dari CeirGO';
                        console.warn(`[CeirGO Auto-Order] Respon gagal dari CeirGO (${errorMsg}), dialihkan ke antrean manual.`);
                        adminNote = `CeirGO Auto-Submit: ${errorMsg}. Dialihkan ke antrean manual.`;
                        apiResponse = JSON.stringify(orderRes);
                    }
                } catch (ceirErr) {
                    console.error(`[CeirGO Auto-Order Network Error]`, ceirErr.message);
                    adminNote = `CeirGO Koneksi Timeout: ${ceirErr.message}. Dialihkan ke antrean manual.`;
                    apiResponse = ceirErr.message;
                }
            }

            await dbRun(`
                INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, status, api_response, createdAt, service_type, imei, user_image, user_image_ceir, admin_image, admin_note, speed_option, coupon_code, discount_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'balance', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                trxId,
                req.session.userId,
                user.name,
                price_key || (isCeirgoService ? 'ceirgo_auto' : 'manual'),
                packageName,
                finalPriceToPay,
                totalPrice,
                targetPhone,
                refId || null,
                finalStatus,
                apiResponse,
                new Date().toISOString(),
                service_type,
                cleanImei,
                imagePath,
                ceirImagePath,
                adminImagePath,
                adminNote,
                speed_option || 'slow',
                appliedCoupon ? appliedCoupon.code : null,
                discountAmount + coinsDiscount
            ]);

            if (isCeirgoService && (finalStatus === 'processing' || finalStatus === 'success')) {
                const autoNotifMsg = `<b>⚡ Pesanan Otomatis CeirGO Diterima!</b>\n──────────────────────\n<b>User:</b> ${user.name}\n<b>Layanan:</b> ${packageName}\n<b>IMEI:</b> <code>${cleanImei}</code>\n<b>Ref ID:</b> <code>${refId || trxId}</code>\n<b>Status:</b> <b>${finalStatus.toUpperCase()}</b>`;
                sendTelegramNotification(autoNotifMsg, 'group');
            } else {
                const speedText = speed_option === 'fast' ? 'Fast (1-3 Jam)' : (speed_option === 'semi' ? 'Semi Fast (1-12 Jam)' : (speed_option === 'instant' ? 'Instant' : 'Slow'));
                const notifMsg = 
                    `🔔 <b>PESANAN MANUAL BARU MASUK!</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🆔 <b>Order ID:</b> <code>${trxId}</code>\n` +
                    `👤 <b>Pelanggan:</b> ${escapeHtml(user.name)}\n` +
                    `📞 <b>No. WhatsApp:</b> <code>${targetPhone || '-'}</code>\n` +
                    `📦 <b>Layanan:</b> ${escapeHtml(packageName)}\n` +
                    `📱 <b>IMEI:</b> <code>${cleanImei}</code>\n` +
                    `💰 <b>Total Biaya:</b> Rp ${finalPriceToPay.toLocaleString('id-ID')}\n` +
                    `⚡ <b>Kecepatan:</b> ${speedText}\n` +
                    `⏳ <b>Status:</b> <b>${finalStatus.toUpperCase()}</b>\n` +
                    (adminNote ? `📝 <b>Catatan:</b> ${escapeHtml(adminNote)}\n` : '') +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💡 <i>Gunakan tombol aksi di bawah untuk memproses pesanan:</i>`;
                const firstImg = imgFiles[0] ? path.join(__dirname, '..', 'public', 'uploads', 'manual_orders', imgFiles[0].filename) : null;
                sendManualOrderNotification(notifMsg, trxId, firstImg);
            }

            // Send WhatsApp Admin & Customer Notification
            try {
                notifyNewOrder({
                    id: trxId,
                    userName: user.name,
                    packageName: packageName,
                    serviceType: service_type,
                    imei: cleanImei,
                    price: finalPriceToPay,
                    speedOption: speed_option || 'slow',
                    userImage: imagePath,
                    customerPhone: targetPhone || user.phone || user.verifiedPhone
                }).catch((err) => console.error("[WABot] Error sending manual order notification:", err.message));
            } catch (waErr) {
                console.error("[WABot] Exception in notifyNewOrder:", waErr.message);
            }

            res.json({
                status: true,
                message: isCeirgoService && (finalStatus === 'processing' || finalStatus === 'success')
                    ? "Pesanan CeirGO berhasil diproses otomatis oleh server!"
                    : "Pesanan Anda berhasil dikirim!",
                trxId,
                newBalance: user.balance - finalPriceToPay,
                data: {
                    id: trxId,
                    status: finalStatus,
                    ref_id: refId,
                    admin_note: adminNote,
                    admin_image: adminImagePath
                }
            });
        } catch (e) {
            console.error("Error creating manual order:", e);
            res.status(500).json({ status: false, message: e.message || "Gagal membuat pesanan." });
        }
    });
});

// 3. GET /api/user/transactions
router.get('/user/transactions', isAuthenticated, async (req, res) => {
    try {
        const purchases = await dbAll('SELECT *, "purchase" as type FROM transactions WHERE userId = ?', [req.session.userId]);
        const topups = await dbAll('SELECT *, "topup" as type FROM topups WHERE userId = ?', [req.session.userId]);

        const speedRanges = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'imei_speed_%_range'");
        const speedRangeMap = {
            fast: '1-3 Jam',
            semi: '1-12 Jam',
            slow: 'Max kirim jam 14:00, selesai max jam 00:00 WIB'
        };
        speedRanges.forEach(r => {
            const m = r.key.match(/^imei_speed_(.*)_range$/);
            if (m && r.value) speedRangeMap[m[1]] = r.value;
        });

        const allActivities = [...purchases, ...topups].map(item => {
            if (item.type === 'topup') {
                let topupDescription = item.id && item.id.startsWith('TU-ADMIN-') ? 'Top Up Saldo oleh Admin' : 'Top Up via QRIS';
                const base = Number(item.baseAmount) || Number(item.amount) || 0;
                const unique = Number(item.uniqueAmount) || 0;
                const totalVal = (unique >= base && unique > 0) ? unique : (base > 0 ? base : (Number(item.amount) || 0));

                const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
                const expiresAtSec = Math.floor((createdTime + 15 * 60 * 1000) / 1000);
                return {
                    id: item.id,
                    userId: item.userId,
                    type: 'topup',
                    serviceType: 'topup_qris',
                    status: item.status,
                    createdAt: item.createdAt,
                    expiresAt: expiresAtSec,
                    expired_at: expiresAtSec,
                    amount: totalVal,
                    baseAmount: base > 0 ? base : totalVal,
                    originalPrice: totalVal,
                    price: totalVal,
                    uniqueAmount: (unique > base) ? (unique - base) : 0,
                    packageName: topupDescription,
                    qrisBase64Image: item.qrisBase64Image,
                    qris_image: item.qrisBase64Image,
                    qrisData: item.qrisBase64Image ? { base64Image: item.qrisBase64Image, uniqueAmount: totalVal, createdAt: item.createdAt, expiresAt: expiresAtSec } : undefined,
                    api_response: `Top up ${item.status}`
                };
            }

            const purchaseVal = Number(item.platformFee || item.originalPrice || item.price || 0);

            // Error Masking: Prevent provider terms leaking to end-user
            let cleanAdminNote = item.admin_note;
            const isAutomatedService = item.service_type === 'ceir' || item.service_type === 'barcode' || (item.packageId && (item.packageId.startsWith('cek_') || item.packageId.startsWith('create_')));

            if (cleanAdminNote && /ceirgo|balance|upps|provider|api|sqlite|exception|auto-submit|antrean manual/i.test(cleanAdminNote)) {
                cleanAdminNote = "Pesanan sedang dalam antrean proses verifikasi oleh sistem/admin.";
            }

            let cleanApiResponse = item.api_response;
            if (cleanApiResponse && /ceirgo|balance|upps|provider|api|sqlite|exception/i.test(cleanApiResponse)) {
                cleanApiResponse = "Sedang Diproses";
            }

            // Duration cleanup: Automated services are always instant
            const cleanSpeedOption = isAutomatedService ? 'instant' : item.speed_option;

            // Balance purchases are paid immediately upon checkout: normalize to in_queue if pending/unpaid or still waiting in queue
            let effectiveStatus = item.status;
            const noteLower = (item.admin_note || "").toLowerCase();
            if (item.payment_method === 'balance' || item.paymentMethod === 'balance') {
                if (effectiveStatus === 'pending' || effectiveStatus === 'unpaid' || (effectiveStatus === 'processing' && noteLower.includes("menunggu"))) {
                    effectiveStatus = 'in_queue';
                }
            }

            let speedLabel = null;
            if (cleanSpeedOption && cleanSpeedOption !== 'instant') {
                const optKey = cleanSpeedOption.toLowerCase();
                const rangeStr = speedRangeMap[optKey] || speedRangeMap['slow'];
                const optName = optKey === 'slow' ? 'Slow' : optKey === 'fast' ? 'Fast' : optKey === 'semi' ? 'Semi Fast' : optKey;
                speedLabel = `${optName} (${rangeStr})`;
            }

            return {
                ...item,
                status: effectiveStatus,
                admin_note: cleanAdminNote,
                adminNote: cleanAdminNote,
                api_response: cleanApiResponse,
                speed_option: cleanSpeedOption,
                speedOption: cleanSpeedOption,
                speed_label: speedLabel,
                speedLabel: speedLabel,
                speed_range: speedRangeMap[(cleanSpeedOption || 'slow').toLowerCase()] || speedRangeMap['slow'],
                amount: purchaseVal,
                originalPrice: purchaseVal,
                baseAmount: purchaseVal,
                price: purchaseVal
            };
        }).sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || 0).getTime() || 0;
            return timeB - timeA;
        });

        res.status(200).json({ status: true, data: allActivities });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengambil riwayat aktivitas.' });
    }
});

// 4. POST /api/user/transactions/:id/cancel
router.post('/user/transactions/:id/cancel', isAuthenticated, async (req, res) => {
    try {
        const trxId = req.params.id;
        const trx = await dbGet("SELECT * FROM transactions WHERE id = ? AND userId = ?", [trxId, req.session.userId]);
        if (!trx) return res.status(404).json({ status: false, message: 'Transaksi tidak ditemukan.' });
        if (['success', 'completed', 'failed', 'cancelled'].includes(trx.status)) {
            return res.status(400).json({ status: false, message: `Transaksi sudah berstatus ${trx.status} dan tidak dapat dibatalkan.` });
        }

        const refundAmount = Number(trx.platformFee || trx.originalPrice || 0);
        await dbRun("BEGIN TRANSACTION");
        await dbRun("UPDATE transactions SET status = 'cancelled', admin_note = 'Dibatalkan oleh pengguna' WHERE id = ?", [trxId]);
        if (refundAmount > 0) {
            await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, req.session.userId]);
        }
        await dbRun("COMMIT");

        const updatedUser = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
        sseSend(req.session.userId, 'balance_update', { balance: updatedUser.balance, source: 'transaction_cancelled' });

        res.json({ status: true, message: 'Transaksi berhasil dibatalkan dan saldo telah dikembalikan.', newBalance: updatedUser.balance });
    } catch (err) {
        await dbRun("ROLLBACK");
        res.status(500).json({ status: false, message: 'Gagal membatalkan transaksi.' });
    }
});

// 4.5 GET /api/topup/gateway-info
router.get('/topup/gateway-info', async (req, res) => {
    try {
        const gwRow = await dbGet("SELECT value FROM settings WHERE key IN ('payment_gateway', 'paymentGateway') ORDER BY key DESC");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        const isOrkutReady = !!(process.env.ORKUT_MERCHANT_ID && process.env.ORKUT_TOKEN && QRIS_NOBU_STATIS_STRING);
        const isGopayReady = !!(QRIS_GOPAY_STATIS_STRING);

        res.json({
            status: true,
            data: {
                active_gateway: activeGateway,
                is_ready: activeGateway === 'gopay' ? isGopayReady : isOrkutReady,
                message: `Gateway ${activeGateway.toUpperCase()} aktif & siap menerima transaksi.`,
                available_gateways: [
                    {
                        id: 'orkut',
                        code: 'qris_nobu',
                        name: 'QRIS Nobu Bank (Semua E-Wallet / BCA / Mandiri)',
                        merchant: 'RYYSTORE OK2285905',
                        is_ready: isOrkutReady
                    },
                    {
                        id: 'gopay',
                        code: 'qris_gopay',
                        name: 'QRIS GoPay Direct (Realtime)',
                        merchant: 'RyyStore IT Solutions',
                        is_ready: isGopayReady
                    }
                ],
                merchants: {
                    orkut: 'RYYSTORE OK2285905',
                    nobu: 'RYYSTORE OK2285905',
                    gopay: 'RyyStore IT Solutions'
                }
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 5. POST /api/topup/request-qris
router.post('/topup/request-qris', isAuthenticated, async (req, res) => {
    try {
        const { amount, gateway, provider, paymentMethod } = req.body;
        const userId = req.session.userId;
        const baseAmount = parseInt(amount, 10);

        if (isNaN(baseAmount) || baseAmount < 5000) {
            return res.status(400).json({ status: false, message: 'Jumlah top up minimal Rp 5.000' });
        }

        const user = await dbGet("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ status: false, message: 'User tidak ditemukan.' });

        const gwRow = await dbGet("SELECT value FROM settings WHERE key IN ('payment_gateway', 'paymentGateway') ORDER BY key DESC");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        const requestedGw = String(gateway || provider || paymentMethod || '').toLowerCase();
        const isGopay = (requestedGw === 'gopay') || (activeGateway === 'gopay' && requestedGw !== 'nobu' && requestedGw !== 'orkut');

        if (isGopay) {
            const gopayData = await generateGopayQris(baseAmount);
            const topUpId = `TU-GP-${Date.now()}`;
            const expiresAtSec = Math.floor((Date.now() + 10 * 60 * 1000) / 1000);
            let qrisImg = gopayData.qris_image || gopayData.qr_image || gopayData.qris_url || gopayData.qr_url;
            if (qrisImg && !qrisImg.startsWith('data:image') && gopayData.qris_code) {
                try {
                    const qrcodeLib = require('qrcode');
                    qrisImg = await qrcodeLib.toDataURL(gopayData.qris_code, { errorCorrectionLevel: 'H', margin: 4, width: 480 });
                } catch (e) {}
            }

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, baseAmount, 'pending', new Date().toISOString(), qrisImg]
            );

            checkGopayPaymentStatus(topUpId, baseAmount, gopayData.trx_id, new Date().toISOString());

            return res.status(200).json({
                status: true,
                message: 'QRIS GoPay Direct berhasil dibuat.',
                topUpId,
                gateway: 'gopay',
                merchant: 'RyyStore IT Solutions',
                data: {
                    qris_image: qrisImg,
                    qris_code: gopayData.qris_code || qrisImg,
                    unique_amount: baseAmount,
                    topup_id: topUpId,
                    trx_id: gopayData.trx_id,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAtSec,
                    merchant: 'RyyStore IT Solutions'
                },
                qrisData: {
                    base64Image: qrisImg,
                    qrisCode: gopayData.qris_code,
                    uniqueAmount: baseAmount,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAtSec,
                    merchant: 'RyyStore IT Solutions'
                }
            });
        } else {
            const uniqueCode = Math.floor(Math.random() * 900) + 100;
            const uniqueAmount = baseAmount + uniqueCode;
            const topUpId = `TU-${Date.now()}`;
            const nobuGen = await generateDynamicQris(uniqueAmount, 'nobu');
            const qrisBase64Image = typeof nobuGen === 'string' ? nobuGen : (nobuGen?.dataUrl || '');
            const dynamicRawCode = typeof nobuGen === 'string' ? '' : (nobuGen?.dynamicCode || '');
            const expiresAtSec = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, uniqueAmount, 'pending', new Date().toISOString(), qrisBase64Image]
            );

            checkOrkutPaymentStatus(topUpId, uniqueAmount);

            return res.status(200).json({
                status: true,
                message: 'QRIS Nobu / Orkut berhasil dibuat.',
                topUpId,
                gateway: 'orkut',
                merchant: 'RYYSTORE OK2285905',
                data: {
                    qris_image: qrisBase64Image,
                    qris_code: dynamicRawCode || qrisBase64Image,
                    unique_amount: uniqueAmount,
                    topup_id: topUpId,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAtSec,
                    merchant: 'RYYSTORE OK2285905'
                },
                qrisData: {
                    base64Image: qrisBase64Image,
                    qrisCode: dynamicRawCode,
                    uniqueAmount,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAtSec,
                    merchant: 'RYYSTORE OK2285905'
                }
            });
        }
    } catch (error) {
        console.error("[TOPUP_QRIS_ERROR]", error);
        res.status(500).json({ status: false, message: error.message || 'Gagal membuat permintaan top-up.' });
    }
});

// 6. POST /api/topup/cancel
router.post('/topup/cancel', isAuthenticated, async (req, res) => {
    try {
        const topupId = req.body?.topupId || req.body?.topup_id;
        let pendingTopUp = null;
        if (topupId) {
            pendingTopUp = await dbGet("SELECT id FROM topups WHERE id = ? AND userId = ? AND status = 'pending'", [topupId, req.session.userId]);
        } else {
            pendingTopUp = await dbGet("SELECT id FROM topups WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1", [req.session.userId]);
        }

        if (pendingTopUp) {
            const timeoutId = qrisPollingTimeouts.get(pendingTopUp.id);
            if (timeoutId) { clearTimeout(timeoutId); qrisPollingTimeouts.delete(pendingTopUp.id); }
            await dbRun("UPDATE topups SET status = 'canceled' WHERE id = ?", [pendingTopUp.id]);
        } else {
            await dbRun("UPDATE topups SET status = 'canceled' WHERE userId = ? AND status = 'pending'", [req.session.userId]);
        }

        res.status(200).json({ status: true, message: 'Permintaan top-up berhasil dibatalkan.' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal membatalkan transaksi.' });
    }
});

// 7. GET /api/topup/status/:topUpId
router.get('/topup/status/:topUpId', isAuthenticated, async (req, res) => {
    try {
        const { topUpId } = req.params;
        const topUp = await dbGet("SELECT * FROM topups WHERE id = ? AND userId = ?", [topUpId, req.session.userId]);
        if (!topUp) return res.status(404).json({ status: false, message: 'Transaksi top-up tidak ditemukan.' });
        res.status(200).json({ status: true, transactionStatus: topUp.status, topUp });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal memeriksa status top-up.' });
    }
});

// 8. GET /api/user/financial-summary
router.get('/user/financial-summary', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { startDate, endDate } = req.query;

        let dateFilter = "";
        const params = [userId];

        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            dateFilter = "AND createdAt >= ? AND createdAt <= ?";
            params.push(start.toISOString(), end.toISOString());
        }

        const summaryTopup = await dbGet(`SELECT SUM(baseAmount) as total FROM topups WHERE userId = ? AND status = 'completed' ${dateFilter}`, params);
        const summarySpending = await dbGet(`SELECT SUM(platformFee) as total FROM transactions WHERE userId = ? AND status = 'success' ${dateFilter}`, params);

        const topupsDetails = await dbAll(`SELECT id, createdAt, baseAmount, status FROM topups WHERE userId = ? AND status = 'completed' ${dateFilter}`, params);
        const purchasesDetails = await dbAll(`SELECT id, createdAt, packageName, platformFee, status FROM transactions WHERE userId = ? AND status = 'success' ${dateFilter}`, params);

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
                    totalTopup: summaryTopup?.total || 0,
                    totalSpending: summarySpending?.total || 0,
                },
                details: combinedDetails
            }
        });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengambil data laporan.' });
    }
});

module.exports = {
    router,
    getKmspAdminBalance
};
