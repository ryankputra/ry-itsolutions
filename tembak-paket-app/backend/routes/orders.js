/**
 * Dedicated CeirGO Order Routing & Fulfillment Router
 * Handles automated order placement for:
 * - Cek Status & Diagnostik IMEI (cek_imei, cek_imei_beacukai, cek_history_imei, cek_validity, cek_digi, cek_sf)
 * - Generator Barcode Device (create_barcode, create_barcode_samsung, create_barcode_redmi, create_barcode_ios26)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const { dbGet, dbRun, dbAll } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');
const ceirgoClient = require('../ceirgoClient');
const { sendTelegramNotification } = require('../telegramService');

// Categorized service codes mapping
const DIAGNOSTIC_SERVICE_CODES = new Set([
    'cek_imei',
    'cek_imei_beacukai',
    'cek_history_imei',
    'cek_validity',
    'cek_digi',
    'cek_sf',
    'cek_icloud',
    'cek_simlock'
]);

const BARCODE_SERVICE_CODES = new Set([
    'create_barcode',
    'create_barcode_samsung',
    'create_barcode_redmi',
    'create_barcode_ios26'
]);

const SERVICE_NAMES = {
    'cek_imei': 'Cek Status IMEI',
    'cek_imei_beacukai': 'Cek IMEI Beacukai',
    'cek_history_imei': 'Cek Riwayat Database CEIR',
    'cek_validity': 'Cek Masa Aktif Sinyal',
    'cek_digi': 'Cek DIGI',
    'cek_sf': 'Cek Smartfren',
    'cek_icloud': 'Cek iCloud & FMI',
    'cek_simlock': 'Cek Carrier / Simlock',
    'create_barcode': 'Create Barcode',
    'create_barcode_samsung': 'Barcode Samsung',
    'create_barcode_redmi': 'Barcode Redmi',
    'create_barcode_ios26': 'Barcode iOS 26'
};

/**
 * Helper: Check if a service code is enabled in Admin Settings
 */
async function isServiceActiveInSettings(serviceCode) {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'ceirgo_display_settings'");
        if (!row || !row.value) {
            // Default active if not configured yet
            return true;
        }
        const settings = JSON.parse(row.value);
        const activeList = [
            ...(Array.isArray(settings.cekCeir) ? settings.cekCeir : []),
            ...(Array.isArray(settings.barcode) ? settings.barcode : [])
        ];
        // If settings array exists but is non-empty, enforce active check
        if (activeList.length > 0) {
            return activeList.includes(serviceCode);
        }
        return true;
    } catch (e) {
        return true;
    }
}

/**
 * Helper: Fetch selling price from SQLite settings
 */
async function getSellingPrice(serviceCode) {
    const keysToCheck = [
        `ceirgo_price_${serviceCode}`,
        `ceirgo_price_ceirgo_price_${serviceCode}`,
        serviceCode
    ];

    for (const key of keysToCheck) {
        const row = await dbGet("SELECT value FROM settings WHERE key = ?", [key]);
        if (row && row.value != null) {
            const num = parseInt(row.value, 10);
            if (!isNaN(num) && num > 0) {
                return num;
            }
        }
    }

    // Fallback to official service detail modal price if available
    try {
        const detail = await ceirgoClient.getServiceDetail(serviceCode);
        const modal = Number(detail.data?.rule?.unit_price || detail.data?.price || 0);
        if (!isNaN(modal) && modal > 0) return modal;
    } catch (e) {}

    return 5000; // Default safety fallback
}

/**
 * Common handler for processing CeirGO diagnostic and barcode orders
 */
async function handleCeirgoOrderExecution(req, res, forcedType = null) {
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ status: false, message: "Sesi telah berakhir, silakan login kembali." });
    }

    const {
        service_code,
        price_key,
        code,
        imei,
        imei2,
        theme,
        duration,
        coupon_code
    } = req.body;

    // Resolve canonical service code
    const rawCode = (service_code || price_key || code || '').trim().replace(/^ceirgo_price_/, '');
    if (!rawCode) {
        return res.status(400).json({ status: false, message: "Kode layanan (service_code / price_key) wajib diisi." });
    }

    const isBarcode = BARCODE_SERVICE_CODES.has(rawCode) || forcedType === 'barcode' || rawCode.startsWith('create_');
    const isDiagnostic = DIAGNOSTIC_SERVICE_CODES.has(rawCode) || forcedType === 'ceir' || rawCode.startsWith('cek_');

    if (!isBarcode && !isDiagnostic) {
        return res.status(400).json({ status: false, message: `Layanan '${rawCode}' tidak dikenali sebagai layanan CeirGO.` });
    }

    // Validate IMEI (clean non-digits)
    const cleanImei = (imei || '').replace(/\D/g, '');
    if (!cleanImei || cleanImei.length < 15) {
        return res.status(400).json({ status: false, message: "IMEI Utama tidak valid (minimal 15 digit angka)." });
    }

    const cleanImei2 = imei2 ? imei2.replace(/\D/g, '') : null;
    if (cleanImei2 && cleanImei2.length < 15) {
        return res.status(400).json({ status: false, message: "IMEI Kedua tidak valid (minimal 15 digit angka)." });
    }

    // Check if the service is currently enabled in Admin Settings
    const isActive = await isServiceActiveInSettings(rawCode);
    if (!isActive) {
        return res.status(403).json({
            status: false,
            message: `Layanan '${SERVICE_NAMES[rawCode] || rawCode}' sedang dinonaktifkan oleh Admin.`
        });
    }

    // Retrieve Selling Price from SQLite settings
    const baseSellingPrice = await getSellingPrice(rawCode);

    // Apply coupon discount if provided
    let finalPrice = baseSellingPrice;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
        const cleanCoupon = coupon_code.trim().toUpperCase();
        const coupon = await dbGet("SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1", [cleanCoupon]);
        if (coupon) {
            const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
            const validStart = !coupon.start_date || !coupon.start_date.trim() || coupon.start_date.trim().split('T')[0] <= todayWIB;
            const validEnd = !coupon.end_date || !coupon.end_date.trim() || coupon.end_date.trim().split('T')[0] >= todayWIB;
            const validQuota = coupon.used_count < coupon.max_usage_limit;

            if (validStart && validEnd && validQuota && baseSellingPrice >= (coupon.min_order_amount || 0)) {
                if (coupon.discount_type === 'percentage') {
                    discountAmount = Math.round((baseSellingPrice * coupon.discount_value) / 100);
                    if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
                        discountAmount = coupon.max_discount_amount;
                    }
                } else {
                    discountAmount = Math.min(coupon.discount_value, baseSellingPrice);
                }
                finalPrice = Math.max(0, baseSellingPrice - discountAmount);
                appliedCoupon = coupon;
            }
        }
    }

    // Check User Balance
    const user = await dbGet("SELECT id, name, balance, email FROM users WHERE id = ?", [userId]);
    if (!user) {
        return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    if (user.balance < finalPrice) {
        return res.status(400).json({
            status: false,
            message: `Saldo tidak mencukupi (Saldo: Rp ${Number(user.balance).toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(finalPrice).toLocaleString('id-ID')}). Silakan top up terlebih dahulu.`
        });
    }

    // Generate Transaction ID
    const trxId = `TRX_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Deduct User Balance atomically
    await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [finalPrice, userId]);
    const updatedUser = await dbGet("SELECT balance FROM users WHERE id = ?", [userId]);

    // Record Coupon usage if applied
    if (appliedCoupon) {
        await dbRun("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [appliedCoupon.id]).catch(() => {});
    }

    // Dispatch Order to CeirGO API
    const targetImeis = cleanImei2 ? [cleanImei, cleanImei2] : [cleanImei];
    let ceirRes = null;
    let refId = null;
    let orderStatus = 'processing';
    let adminNote = 'Pesanan otomatis CeirGO sedang diproses oleh server pusat.';
    let apiResponse = 'Processing';

    try {
        console.log(`[CeirGO Order Router] Mengirim pesanan ${rawCode} untuk IMEI ${cleanImei} (Trx: ${trxId})...`);
        ceirRes = await ceirgoClient.createOrder({
            code: rawCode,
            data: {
                imeis: targetImeis
            }
        });

        if (ceirRes.status && ceirRes.data) {
            const cd = ceirRes.data;
            refId = cd.reference_id || cd.order_id || cd.trx_id || `CRG_${Date.now()}`;
            const serverStatus = (cd.status || cd.order_status || 'processing').toLowerCase();
            orderStatus = (serverStatus === 'success' || serverStatus === 'completed') ? 'success' : 'processing';
            adminNote = typeof cd.result === 'string' ? cd.result : (cd.message || 'Pesanan otomatis CeirGO berhasil diterima server.');
            apiResponse = JSON.stringify(cd.result || cd);

            // Auto-sync wallet balance if returned
            if (cd.remaining_balance != null) {
                const rb = Number(cd.remaining_balance);
                if (!isNaN(rb) && rb >= 0) {
                    await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(rb)]).catch(() => {});
                }
            }
            console.log(`[CeirGO Order Router] Sukses! Ref ID: ${refId}, Status: ${orderStatus}`);
        } else {
            const errMsg = ceirRes.message || ceirRes.error || 'Respon gagal dari CeirGO';
            console.warn(`[CeirGO Order Router] Respon gagal: ${errMsg}. Masuk antrean manual.`);
            orderStatus = 'pending';
            adminNote = `CeirGO Auto-Submit: ${errMsg}. Menunggu verifikasi manual admin.`;
            apiResponse = JSON.stringify(ceirRes);
        }
    } catch (dispatchErr) {
        console.error(`[CeirGO Order Router Exception]`, dispatchErr.message);
        orderStatus = 'pending';
        adminNote = `CeirGO Exception: ${dispatchErr.message}. Menunggu verifikasi manual admin.`;
        apiResponse = JSON.stringify({ error: dispatchErr.message });
    }

    // Insert Transaction Record in SQLite
    const serviceType = isBarcode ? 'barcode' : 'ceir';
    const serviceDuration = duration || SERVICE_NAMES[rawCode] || (isBarcode ? 'Cetak Barcode' : 'Cek CEIR');

    try {
        await dbRun(
            `INSERT INTO transactions (
                id, userId, userName, packageId, packageName, originalPrice,
                targetPhone, paymentMethod, status, api_response, admin_note,
                admin_image, service_type, imei, speed_option, coupon_code,
                discount_amount, kmspTrxId, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                trxId,
                userId,
                user.name || 'User',
                rawCode,
                serviceDuration,
                finalPrice,
                user.email || '',
                'balance',
                orderStatus,
                apiResponse,
                adminNote,
                null,
                serviceType,
                cleanImei2 ? `${cleanImei}, ${cleanImei2}` : cleanImei,
                theme || 'dark',
                appliedCoupon ? appliedCoupon.code : null,
                discountAmount,
                refId,
                new Date().toISOString()
            ]
        );
    } catch (insertErr) {
        console.error("[CeirGO Order Router] Gagal menyimpan transaksi SQLite:", insertErr.message);
    }

    // Send Telegram Admin Notification asynchronously
    try {
        const notifMsg = `🔔 <b>PESANAN BARU (${isBarcode ? 'BARCODE' : 'DIAGNOSTIK CEIR'})</b>\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 <b>Trx ID:</b> <code>${trxId}</code>\n` +
            `👤 <b>User:</b> ${user.name || user.email || '-'} (${user.email || '-'})\n` +
            `📦 <b>Layanan:</b> ${SERVICE_NAMES[rawCode] || rawCode}\n` +
            `📱 <b>IMEI:</b> <code>${cleanImei}</code>\n` +
            `💰 <b>Harga:</b> Rp ${finalPrice.toLocaleString('id-ID')}\n` +
            `⚡ <b>Status:</b> ${orderStatus.toUpperCase()}\n` +
            (refId ? `🔗 <b>Ref ID:</b> <code>${refId}</code>\n` : '');
        sendTelegramNotification(notifMsg);
    } catch (tgErr) {}

    // Parse result payload if possible
    let parsedResult = null;
    try {
        parsedResult = JSON.parse(apiResponse);
    } catch (e) {
        parsedResult = apiResponse;
    }

    return res.json({
        status: true,
        message: orderStatus === 'success' ? 'Pesanan berhasil diselesaikan!' : 'Pesanan berhasil dikirim dan sedang diproses!',
        data: {
            trxId,
            id: trxId,
            reference_id: refId,
            service_code: rawCode,
            service_name: SERVICE_NAMES[rawCode] || rawCode,
            imei: cleanImei,
            imei2: cleanImei2,
            status: orderStatus,
            amount: finalPrice,
            result: parsedResult,
            newBalance: updatedUser?.balance ?? (user.balance - finalPrice)
        }
    });
}

// 1. Dedicated routes for Frontend menus
router.post('/order/ceir', isAuthenticated, upload.none(), (req, res) => {
    return handleCeirgoOrderExecution(req, res, 'ceir');
});

router.post('/order/barcode', isAuthenticated, upload.none(), (req, res) => {
    return handleCeirgoOrderExecution(req, res, 'barcode');
});

router.post('/order', isAuthenticated, upload.none(), (req, res) => {
    return handleCeirgoOrderExecution(req, res);
});

router.post('/orders/create', isAuthenticated, upload.none(), (req, res) => {
    return handleCeirgoOrderExecution(req, res);
});

// 2. Public endpoint to get categorized active services for frontend menus
router.get('/orders/catalog', async (req, res) => {
    try {
        const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'ceirgo_%'");
        const settings = rows.reduce((acc, r) => {
            acc[r.key] = r.value;
            return acc;
        }, {});

        let displaySettings = { cekCeir: [], barcode: [] };
        if (settings.ceirgo_display_settings) {
            try {
                displaySettings = JSON.parse(settings.ceirgo_display_settings);
            } catch (e) {}
        }

        const activeCekCeir = new Set(Array.isArray(displaySettings.cekCeir) ? displaySettings.cekCeir : Array.from(DIAGNOSTIC_SERVICE_CODES));
        const activeBarcode = new Set(Array.isArray(displaySettings.barcode) ? displaySettings.barcode : Array.from(BARCODE_SERVICE_CODES));

        const pricing = {};
        for (const [k, v] of Object.entries(settings)) {
            if (k.startsWith('ceirgo_price_')) {
                const code = k.replace(/^ceirgo_price_ceirgo_price_/, '').replace(/^ceirgo_price_/, '');
                pricing[code] = parseInt(v, 10) || 0;
            }
        }

        const diagnosticProducts = Array.from(DIAGNOSTIC_SERVICE_CODES).map(code => ({
            code,
            name: SERVICE_NAMES[code] || code,
            price: pricing[code] || 5000,
            active: activeCekCeir.has(code)
        }));

        const barcodeProducts = Array.from(BARCODE_SERVICE_CODES).map(code => ({
            code,
            name: SERVICE_NAMES[code] || code,
            price: pricing[code] || 5000,
            active: activeBarcode.has(code)
        }));

        res.json({
            status: true,
            data: {
                diagnostic: diagnosticProducts,
                barcode: barcodeProducts
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

module.exports = router;
