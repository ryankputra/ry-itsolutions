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
const { sendTelegramNotification } = require('../telegramService');
const { sendManualOrderNotification } = require('./telegram');

const KMSP_API_KEY = process.env.KMSP_API_KEY;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';
const ORKUT_MERCHANT_ID = process.env.ORKUT_MERCHANT_ID;
const ORKUT_USERNAME = process.env.ORKUT_USERNAME;
const ORKUT_TOKEN = process.env.ORKUT_TOKEN;
const QRIS_STATIS_STRING = process.env.QRIS_STATIS_STRING;

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

// Gopay QRIS Helpers
async function generateGopayQris(amount) {
    const URL = process.env.GOPAY_GATEWAY_URL;
    const API_KEY = process.env.GOPAY_GATEWAY_API_KEY;
    if (!URL || !API_KEY) throw new Error("GOPAY_GATEWAY_URL belum dikonfigurasi.");
    const response = await axios.get(`${URL}/create-qris`, {
        params: { amount, api_key: API_KEY },
        timeout: 15000
    });
    if (response.data?.success && response.data.data) {
        return response.data.data;
    }
    throw new Error(response.data?.message || 'Gagal membuat QRIS.');
}

function checkGopayPaymentStatus(topUpId, amount, gopayTrxId, startTime) {
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

            const response = await axios.get(`${URL}/check-payment`, {
                params: { amount, trx_id: gopayTrxId, api_key: API_KEY, start_time: startTime },
                timeout: 15000
            });
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

// Orkut Dynamic QRIS Helpers
async function generateDynamicQris(amount) {
    if (!QRIS_STATIS_STRING) throw new Error("QRIS_STATIS_STRING tidak dikonfigurasi.");
    const response = await axios.post('https://qrisku.my.id/api', { amount: amount.toString(), qris_statis: QRIS_STATIS_STRING }, { timeout: 15000 });
    if (response.data?.status === 'success' && response.data.qris_base64) return `data:image/png;base64,${response.data.qris_base64}`;
    throw new Error(response.data?.message || 'Gagal menghasilkan QRIS.');
}

function checkOrkutPaymentStatus(topUpId, uniqueAmount) {
    if (!ORKUT_MERCHANT_ID || !ORKUT_USERNAME || !ORKUT_TOKEN) return;
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
                return;
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
                        sseSend(user.id, 'balance_update', { balance: updatedUser.balance, source: 'orkut_topup' });
                        sseSend(user.id, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up via QRIS berhasil!' });

                        await sendTelegramNotification(
                            `<b>──────────────────────</b>\n<b>💰 Top Up Berhasil (ORKUT)!</b>\n<b>──────────────────────</b>\n<b>Nama Pengguna:</b> ${user.name}\n<b>Jumlah Masuk:</b> Rp ${topUp.baseAmount.toLocaleString('id-ID')}\n<b>ID Transaksi:</b> <code>${topUpId}</code>`
                        );
                    } else {
                        await dbRun("ROLLBACK");
                    }
                    qrisPollingTimeouts.delete(topUpId);
                    return;
                }
            }
        } catch (error) {
            console.error(`[ORKUT_POLL_ERROR]`, error.message);
        }

        const timeoutId = setTimeout(pollingLoop, interval);
        qrisPollingTimeouts.set(topUpId, timeoutId);
    };

    if (!qrisPollingTimeouts.has(topUpId)) {
        qrisPollingTimeouts.set(topUpId, setTimeout(pollingLoop, 5000));
    }
}

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

            const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
            if (user.balance < finalPriceToPay) return res.status(402).json({ status: false, message: `Saldo tidak mencukupi untuk pembayaran sebesar Rp ${finalPriceToPay.toLocaleString('id-ID')}` });

            await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [finalPriceToPay, req.session.userId]);

            if (coinsToDeduct > 0) {
                try {
                    await dbRun("UPDATE users SET coins = coins - ? WHERE id = ?", [coinsToDeduct, req.session.userId]);
                } catch (e) {}
            }

            const trxId = `trx_m_${Date.now()}`;
            const packageName = service_type === 'imei' ? `Unblock IMEI (${duration}) x${imeiCount}` : `Cek CEIR (${duration})`;

            if (appliedCoupon) {
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

            let finalStatus = 'pending';
            let apiResponse = 'Selesai / Sedang Diproses Admin';
            let adminNote = null;
            let adminImagePath = null;
            let refId = null;

            const targetPhone = req.body.target_phone ? String(req.body.target_phone).trim() : '';

            // AUTOMATIC ORDER PROCESSING FOR CEIRGO SERVICES
            const isCeirgoService = service_type === 'ceir' || (price_key && (price_key.startsWith('cek_') || price_key.startsWith('create_') || price_key.startsWith('ceirgo_')));

            if (isCeirgoService) {
                const canonicalServiceCode = (price_key || 'cek_history_imei').replace(/^ceirgo_price_/, '');
                const apiKey = process.env.CEIRGO_API_KEY || CEIRGO_API_KEY;
                const baseUrl = process.env.CEIRGO_BASE_URL || CEIRGO_BASE_URL || 'https://ceirgo.my.id';
                const accountId = process.env.CEIRGO_ACCOUNT_ID || '';

                if (apiKey) {
                    console.log(`[CeirGO Auto-Order] Memproses pesanan otomatis ke CeirGO (${canonicalServiceCode}) untuk Transaksi ${trxId}...`);
                    try {
                        const headers = {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        };
                        if (accountId) headers['x-account-id'] = accountId;

                        const ceirResp = await fetch(`${baseUrl}/api/order`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                service: canonicalServiceCode,
                                service_code: canonicalServiceCode,
                                imei: cleanImei,
                                phone: targetPhone,
                                target_phone: targetPhone,
                                custom_ref: trxId
                            }),
                            timeout: 10000
                        });

                        const ceirData = await ceirResp.json().catch(() => null);

                        if (ceirResp.ok && ceirData && (ceirData.status === true || ceirData.status === 'success' || ceirData.success === true || ceirData.data)) {
                            refId = ceirData?.data?.order_id || ceirData?.data?.trx_id || ceirData?.order_id || ceirData?.trx_id || ceirData?.ref_id || `CRG_${Date.now()}`;
                            const ceirStatus = ceirData?.data?.status || ceirData?.status || 'processing';
                            finalStatus = ceirStatus === 'success' ? 'success' : 'processing';
                            adminNote = ceirData?.data?.result || ceirData?.result || ceirData?.message || 'Pesanan otomatis CeirGO berhasil diterima server.';
                            apiResponse = typeof ceirData === 'object' ? JSON.stringify(ceirData) : String(ceirData);

                            console.log(`[CeirGO Auto-Order] Sukses diterima server! Ref ID: ${refId}, Status: ${finalStatus}`);
                        } else {
                            const errorMsg = ceirData?.message || ceirData?.error || `HTTP ${ceirResp.status}`;
                            console.warn(`[CeirGO Auto-Order] Respon gagal dari CeirGO (${errorMsg}), dialihkan ke antrean manual.`);
                            adminNote = `CeirGO Auto-Submit: ${errorMsg}. Dialihkan ke antrean manual.`;
                            apiResponse = typeof ceirData === 'object' ? JSON.stringify(ceirData) : errorMsg;
                        }
                    } catch (ceirErr) {
                        console.error(`[CeirGO Auto-Order Network Error]`, ceirErr.message);
                        adminNote = `CeirGO Koneksi Timeout: ${ceirErr.message}. Dialihkan ke antrean manual.`;
                        apiResponse = ceirErr.message;
                    }
                } else {
                    console.warn(`[CeirGO Auto-Order] CEIRGO_API_KEY tidak dikonfigurasi. Pesanan dialihkan ke antrean manual.`);
                    adminNote = 'CEIRGO_API_KEY belum dikonfigurasi di server. Memerlukan penanganan manual.';
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
                const notifMsg = `<b>📦 Pesanan Manual Baru!</b>\n──────────────────────\n<b>User:</b> ${user.name}\n<b>Layanan:</b> ${packageName}\n<b>IMEI:</b> <code>${cleanImei}</code>\n<b>Biaya:</b> Rp ${finalPriceToPay.toLocaleString('id-ID')}\n<b>Status:</b> <b>${finalStatus.toUpperCase()}</b>${adminNote ? `\n<b>Catatan:</b> ${adminNote}` : ''}`;
                const firstImg = imgFiles[0] ? path.join(__dirname, '..', 'public', 'uploads', 'manual_orders', imgFiles[0].filename) : null;
                sendManualOrderNotification(notifMsg, trxId, firstImg);
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

        const allActivities = [...purchases, ...topups].map(item => {
            if (item.type === 'topup') {
                let topupDescription = item.id && item.id.startsWith('TU-ADMIN-') ? 'Top Up Saldo oleh Admin' : 'Top Up via QRIS';
                const base = Number(item.baseAmount) || Number(item.amount) || 0;
                const unique = Number(item.uniqueAmount) || 0;
                const totalVal = (unique >= base && unique > 0) ? unique : (base > 0 ? base : (Number(item.amount) || 0));

                return {
                    id: item.id,
                    userId: item.userId,
                    type: 'topup',
                    serviceType: 'topup_qris',
                    status: item.status,
                    createdAt: item.createdAt,
                    amount: totalVal,
                    baseAmount: base > 0 ? base : totalVal,
                    originalPrice: totalVal,
                    price: totalVal,
                    uniqueAmount: (unique > base) ? (unique - base) : 0,
                    packageName: topupDescription,
                    qrisData: item.qrisBase64Image ? { base64Image: item.qrisBase64Image, uniqueAmount: totalVal } : undefined,
                    api_response: `Top up ${item.status}`
                };
            }

            const purchaseVal = Number(item.platformFee || item.originalPrice || item.price || 0);

            return {
                ...item,
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
        const gwRow = await dbGet("SELECT value FROM settings WHERE key = 'paymentGateway'");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        const isReady = activeGateway === 'orkut'
            ? !!(process.env.ORKUT_MERCHANT_ID && process.env.ORKUT_TOKEN)
            : !!(process.env.GOPAY_GATEWAY_URL && process.env.GOPAY_GATEWAY_API_KEY);

        res.json({
            status: true,
            data: {
                active_gateway: activeGateway,
                is_ready: isReady,
                message: isReady
                    ? `Gateway ${activeGateway.toUpperCase()} aktif & siap menerima transaksi.`
                    : `Gateway ${activeGateway.toUpperCase()} sedang dalam konfigurasi.`
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 5. POST /api/topup/request-qris
router.post('/topup/request-qris', isAuthenticated, async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.userId;
        const baseAmount = parseInt(amount, 10);

        if (isNaN(baseAmount) || baseAmount < 5000) {
            return res.status(400).json({ status: false, message: 'Jumlah top up minimal Rp 5.000' });
        }

        const user = await dbGet("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ status: false, message: 'User tidak ditemukan.' });

        const gwRow = await dbGet("SELECT value FROM settings WHERE key = 'paymentGateway'");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        const useGopayGw = activeGateway === 'gopay' && process.env.GOPAY_GATEWAY_URL && process.env.GOPAY_GATEWAY_API_KEY;

        if (useGopayGw) {
            const gopayData = await generateGopayQris(baseAmount);
            const topUpId = `TU-GP-${Date.now()}`;
            const expiresAtSec = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, baseAmount, 'pending', new Date().toISOString(), gopayData.qr_image || gopayData.qr_url]
            );

            checkGopayPaymentStatus(topUpId, baseAmount, gopayData.trx_id, new Date().toISOString());

            return res.status(200).json({
                status: true,
                message: 'QRIS GoPay berhasil dibuat.',
                topUpId,
                gateway: 'gopay',
                data: {
                    qris_image: gopayData.qr_image || gopayData.qr_url,
                    unique_amount: baseAmount,
                    topup_id: topUpId,
                    trx_id: gopayData.trx_id,
                    expires_at: expiresAtSec
                },
                qrisData: { base64Image: gopayData.qr_image || gopayData.qr_url, uniqueAmount: baseAmount, expiresAt: expiresAtSec }
            });
        } else {
            const uniqueCode = Math.floor(Math.random() * 900) + 100;
            const uniqueAmount = baseAmount + uniqueCode;
            const topUpId = `TU-${Date.now()}`;
            const qrisBase64Image = await generateDynamicQris(uniqueAmount);
            const expiresAtSec = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, uniqueAmount, 'pending', new Date().toISOString(), qrisBase64Image]
            );

            checkOrkutPaymentStatus(topUpId, uniqueAmount);

            return res.status(200).json({
                status: true,
                message: 'Silakan scan QRIS dan transfer sesuai jumlah unik.',
                topUpId,
                data: {
                    qris_image: qrisBase64Image,
                    qris_code: qrisBase64Image,
                    unique_amount: uniqueAmount,
                    topup_id: topUpId,
                    expires_at: expiresAtSec
                },
                qrisData: { base64Image: qrisBase64Image, uniqueAmount, expiresAt: expiresAtSec }
            });
        }
    } catch (error) {
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
