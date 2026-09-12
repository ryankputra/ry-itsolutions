const { calculateTransactionWarranty } = require('../utils/warrantyHelper');
const { notifyWarrantyClaim } = require('../services/waBot');
/**
 * Public Services, Packages, Coupons, and Warranty Endpoints
 */

const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');
const { getEffectiveMaintenanceStatus } = require('./auth');

const APP_START_TIME = Date.now();

// 1. GET /api/system-version
router.get('/system-version', (req, res) => {
    res.json({ status: true, version: APP_START_TIME });
});

// GET /api/ai/knowledge (Autonomous Live Knowledge Engine for Ry-AI)
router.get('/ai/knowledge', async (req, res) => {
    try {
        // 1. Live Packages (data, masa aktif, etc.)
        const rawPackages = await dbAll(
            "SELECT package_code, name, description, original_price, platform_fee, category, isVisible, payment_methods, isResellerOnly FROM packages WHERE isVisible = 1 ORDER BY position ASC, rowid ASC"
        );
        const packages = (rawPackages || []).map(pkg => {
            const platformFee = pkg.platform_fee || 0;
            const totalPrice = (pkg.original_price || 0) + platformFee;
            
            let carrier = 'Lainnya';
            const upperName = (pkg.name || '').toUpperCase();
            const upperCode = (pkg.package_code || '').toUpperCase();
            if (upperName.includes('XL') || upperCode.startsWith('XL')) carrier = 'XL';
            else if (upperName.includes('TELKOMSEL') || upperName.includes('TSEL') || upperCode.startsWith('TSEL')) carrier = 'Telkomsel';
            else if (upperName.includes('TRI') || upperName.includes('THREE') || upperCode.startsWith('TRI')) carrier = 'Tri';
            else if (upperName.includes('INDOSAT') || upperName.includes('ISAT') || upperCode.startsWith('ISAT')) carrier = 'Indosat';
            else if (upperName.includes('AXIS') || upperCode.startsWith('AXIS')) carrier = 'Axis';
            else if (upperName.includes('SMARTFREN') || upperCode.startsWith('SF')) carrier = 'Smartfren';

            let type = 'data';
            if (upperName.includes('MASA AKTIF')) type = 'masa_aktif';
            else if (upperName.includes('AKRAB')) type = 'akrab';
            else if (upperName.includes('EDUKASI') || upperName.includes('CONFERENCE') || upperName.includes('BELAJAR')) type = 'kuota_belajar';
            else if (upperName.includes('BONUS')) type = 'bonus';

            return {
                code: pkg.package_code,
                name: pkg.name,
                description: pkg.description || '',
                price: totalPrice,
                carrier,
                type,
                category: pkg.category || 'reguler'
            };
        });

        // 2. Live IMEI Packages
        const rawImei = await dbAll(
            "SELECT id, duration, price, isVisible, allowed_speeds FROM imei_packages WHERE isVisible = 1 OR isVisible IS NULL ORDER BY price ASC"
        );
        const imeiPackages = (rawImei || []).map(ip => {
            let allowedSpeeds = ['slow'];
            if (ip.allowed_speeds) {
                try {
                    const parsed = typeof ip.allowed_speeds === 'string' ? JSON.parse(ip.allowed_speeds) : ip.allowed_speeds;
                    if (Array.isArray(parsed) && parsed.length > 0) allowedSpeeds = parsed;
                } catch (e) {}
            }
            return {
                id: ip.id,
                duration: ip.duration,
                price: ip.price || 0,
                allowedSpeeds
            };
        });

        // 3. Live Active Coupons
        const rawCoupons = await dbAll(
            "SELECT code, discount_type, discount_value, min_order_amount, max_discount_amount FROM coupons WHERE is_active = 1"
        );
        const coupons = (rawCoupons || []).map(c => ({
            code: c.code,
            discountType: c.discount_type,
            discountValue: c.discount_value,
            minOrder: c.min_order_amount || 0,
            maxDiscount: c.max_discount_amount || 0
        }));

        // 4. Live Announcements
        const rawAnnouncements = await dbAll(
            "SELECT id, message, bgColor, createdAt FROM announcements WHERE is_active = 1 ORDER BY createdAt DESC LIMIT 5"
        );

        // 5. Relevant Settings
        const rawSettings = await dbAll(
            "SELECT key, value FROM settings WHERE key IN ('wa_admin_number', 'imei_speed_fast_status', 'imei_speed_semi_status', 'imei_speed_slow_status', 'imei_speed_fast_range', 'imei_speed_semi_range', 'imei_speed_slow_range', 'price_imei_1_bln', 'price_imei_3_bln', 'price_imei_permanen', 'topupOptions')"
        );
        const settingsMap = {};
        (rawSettings || []).forEach(s => { settingsMap[s.key] = s.value; });

        res.setHeader('Cache-Control', 'public, max-age=30');
        return res.json({
            status: true,
            updatedAt: new Date().toISOString(),
            packages,
            imeiPackages,
            coupons,
            announcements: rawAnnouncements || [],
            gateway: {
                name: 'Payment Gateway GoPay & Dynamic QRIS SaaS',
                activationFee: 35000,
                renewalFee: 10000,
                transactionFee: 0,
                settlement: 'Direct Settlement Instan ke Rekening GoPay/GoBiz Pemilik',
                features: ['Dynamic QRIS', 'Webhook Real-time (0.2-0.5s)', 'HMAC Security', 'No PT/CV Required']
            },
            topup: {
                minDeposit: 10000,
                adminFee: 0,
                methods: 'Dynamic QRIS Otomatis 24 Jam (Semua Bank & E-Wallet)',
                speed: '2 - 5 Detik Otomatis Masuk'
            },
            speeds: {
                fast: { status: settingsMap['imei_speed_fast_status'] || 'hidden', range: settingsMap['imei_speed_fast_range'] || 'menitan' },
                semi: { status: settingsMap['imei_speed_semi_status'] || 'hidden', range: settingsMap['imei_speed_semi_range'] || '1-12 Jam' },
                slow: { status: settingsMap['imei_speed_slow_status'] || 'active', range: settingsMap['imei_speed_slow_range'] || 'Max kirim 14:00 WIB, selesai max 00:00 WIB' }
            },
            cs: {
                admin1: '088706611370',
                admin2: settingsMap['wa_admin_number'] || '087767287284',
                hours: '08.00 - 23.00 WIB'
            }
        });
    } catch (error) {
        console.error('Error fetching AI knowledge:', error);
        return res.status(500).json({ status: false, message: 'Gagal mengambil data knowledge base AI' });
    }
});


// 2. GET /api/services/status
router.get('/services/status', async (req, res) => {
    try {
        const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'ceirgo_display_%' OR key LIKE 'imei_speed_%' OR key LIKE 'service_%'");
        const settings = {};
        rows.forEach(r => {
            settings[r.key] = r.value;
        });

        const barcodeKeys = ['create_barcode', 'create_barcode_samsung', 'create_barcode_redmi', 'create_barcode_ios26'];
        const barcodeStatuses = {};
        let hasActiveBarcode = false;

        barcodeKeys.forEach(k => {
            const val = settings[`ceirgo_display_${k}`];
            const isActive = val === undefined || val === null || val === 'true' || val === '1' || val === 1 || val === true;
            barcodeStatuses[k] = isActive;
            if (isActive) hasActiveBarcode = true;
        });

        res.json({
            status: true,
            hasActiveBarcode,
            barcode: barcodeStatuses,
            settings
        });
    } catch (e) {
        res.json({
            status: true,
            hasActiveBarcode: true,
            barcode: {
                create_barcode: true,
                create_barcode_samsung: true,
                create_barcode_redmi: true,
                create_barcode_ios26: true
            }
        });
    }
});

// 2. GET /api/status
router.get('/status', isAuthenticated, async (req, res) => {
    try {
        const maintenanceMode = await getEffectiveMaintenanceStatus();
        const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.session.userId]);
        res.status(200).json({ status: true, maintenanceMode, currentBalance: user ? user.balance : null });
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil status." });
    }
});

// 3. GET /api/user/packages
router.get('/user/packages', async (req, res) => {
    try {
        const user = req.session?.userId ? await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]) : null;
        const packages = await dbAll('SELECT * FROM packages WHERE isVisible = 1 ORDER BY position ASC, rowid ASC');

        const packagesWithCustomFee = packages.map(pkg => {
            // Reseller fee differentiation bypassed for now (preserved for future)
            const platformFee = pkg.platform_fee || 0;
            return {
                ...pkg,
                platform_fee: platformFee,
                total_price: (pkg.original_price || 0) + platformFee
            };
        });

        res.status(200).json({ status: true, data: packagesWithCustomFee });
    } catch (error) {
        console.error("Error fetching user packages:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil daftar paket." });
    }
});

// 4. GET /api/imei-packages
router.get('/imei-packages', async (req, res) => {
    try {
        const isAll = req.query.all === 'true';
        const query = isAll
            ? "SELECT * FROM imei_packages ORDER BY price ASC"
            : "SELECT * FROM imei_packages WHERE isVisible = 1 OR isVisible IS NULL ORDER BY price ASC";
        const rows = await dbAll(query);
        const data = (rows || []).map(r => {
            let allowed_speeds = ['fast', 'semi', 'slow'];
            if (r.allowed_speeds) {
                try {
                    const parsed = typeof r.allowed_speeds === 'string' ? JSON.parse(r.allowed_speeds) : r.allowed_speeds;
                    if (Array.isArray(parsed) && parsed.length > 0) allowed_speeds = parsed;
                } catch (e) {}
            }
            return {
                ...r,
                isVisible: r.isVisible === undefined || r.isVisible === null ? 1 : Number(r.isVisible),
                allowed_speeds
            };
        });
        res.json({ status: true, data });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// 5. GET /api/imei-service-status
router.get('/imei-service-status', async (req, res) => {
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

// 6. GET /api/manual-services-pricing & /api/speed-pricing
router.get('/manual-services-pricing', async (req, res) => {
    try {
        const defaults = {
            imei_speed_fast_status: 'hidden',
            imei_speed_semi_status: 'hidden',
            imei_speed_slow_status: 'visible',
            imei_speed_fast_range: '1-3 Jam',
            imei_speed_semi_range: '1-12 Jam',
            imei_speed_slow_range: 'Max kirim jam 14:00, selesai jam 00:00 WIB'
        };
        for (const [key, value] of Object.entries(defaults)) {
            await dbRun("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
        }
        const rows = await dbAll("SELECT key, value FROM settings WHERE key IN ('price_ceir_history', 'price_ceir_register', 'imei_speed_fast', 'imei_speed_semi', 'imei_speed_slow', 'imei_speed_fast_status', 'imei_speed_semi_status', 'imei_speed_slow_status', 'imei_speed_fast_range', 'imei_speed_semi_range', 'imei_speed_slow_range')");
        const pricing = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        for (const [key, value] of Object.entries(defaults)) {
            if (!(key in pricing)) pricing[key] = value;
        }
        res.json({ status: true, data: pricing });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

router.get('/speed-pricing', async (req, res) => {
    res.redirect('/api/manual-services-pricing');
});

// 7. GET /api/user/announcement & /api/user/announcements & /api/admin/config/public
router.get(['/user/announcement', '/user/announcements'], async (req, res) => {
    try {
        const announcements = await dbAll('SELECT * FROM announcements WHERE is_active IS NULL OR is_active = 1 ORDER BY datetime(createdAt) DESC LIMIT 10');
        const bgRow = await dbGet("SELECT value FROM settings WHERE key = 'announcementBgColor'");
        const defaultBg = bgRow && bgRow.value ? bgRow.value : '#0066cc';

        const list = (announcements || []).map(a => ({
            id: a.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            message: a.message,
            bgColor: a.bgColor || defaultBg,
            createdAt: a.createdAt
        }));

        res.status(200).json({
            status: true,
            data: list.length > 0 ? list[0] : null,
            announcements: list,
            items: list
        });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal mengambil pengumuman." });
    }
});

router.get(['/admin/config/public', '/config/public'], async (req, res) => {
    try {
        const announcements = await dbAll('SELECT * FROM announcements WHERE is_active IS NULL OR is_active = 1 ORDER BY datetime(createdAt) DESC LIMIT 10');
        const bgRow = await dbGet("SELECT value FROM settings WHERE key = 'announcementBgColor'");
        const maintenanceRow = await dbGet("SELECT value FROM settings WHERE key = 'maintenanceMode'");
        const defaultBg = bgRow && bgRow.value ? bgRow.value : '#0066cc';

        const list = (announcements || []).map(a => ({
            id: a.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            message: a.message,
            bgColor: a.bgColor || defaultBg,
            createdAt: a.createdAt
        }));

        res.status(200).json({
            status: true,
            data: {
                announcement: list.length > 0 ? list[0] : null,
                announcements: list,
                maintenance: maintenanceRow ? maintenanceRow.value === 'true' : false
            }
        });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// 8. GET /api/public/check-warranty
router.get('/public/check-warranty', async (req, res) => {
    try {
        const queryImei = (req.query.imei || req.query.query || req.query.q || '').trim().replace(/\D/g, '');
        if (!queryImei || queryImei.length < 8) {
            return res.status(400).json({ status: false, message: 'Nomor IMEI minimal 8 digit valid.' });
        }

        const trx = await dbGet(`
            SELECT id, userId, userName, packageName, platformFee, status, createdAt, service_type, imei, admin_note, speed_option, user_image, user_image_ceir, admin_image
            FROM transactions
            WHERE imei LIKE ? AND service_type IN ('imei', 'ceir')
            ORDER BY 
                (CASE WHEN status IN ('in_queue', 'processing', 'pending') THEN 0 ELSE 1 END) ASC,
                datetime(createdAt) DESC
            LIMIT 1
        `, [`%${queryImei}%`]);

        if (!trx) {
            return res.status(200).json({
                status: false,
                message: `Tidak ditemukan data pelacakan / garansi untuk IMEI ${queryImei}.`
            });
        }

        // Fetch dynamic speed ranges configured by admin in settings
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

        const optKey = (trx.speed_option || 'slow').toLowerCase();
        const rangeText = speedRangeMap[optKey] || speedRangeMap['slow'];
        const optTitle = optKey === 'slow' ? 'Slow' : optKey === 'fast' ? 'Fast' : optKey === 'semi' ? 'Semi Fast' : optKey;
        const speedLabel = `${optTitle} (${rangeText})`;

        // Build robust warranty structure
        const isCeir = trx.service_type === 'ceir' || (trx.packageName || '').toLowerCase().includes('ceir');
        let warranty = null;
        if (!isCeir) {
            const isPermanent = (trx.packageName || '').toLowerCase().includes('permanen');
            let durationMonths = 3;
            if ((trx.packageName || '').includes('1 Bulan') || (trx.packageName || '').includes('1 bulan')) durationMonths = 1;
            else if ((trx.packageName || '').includes('2 Bulan') || (trx.packageName || '').includes('2 bulan')) durationMonths = 2;
            else if ((trx.packageName || '').includes('3 Bulan') || (trx.packageName || '').includes('3 bulan')) durationMonths = 3;
            else if ((trx.packageName || '').includes('6 Bulan') || (trx.packageName || '').includes('6 bulan')) durationMonths = 6;
            else if ((trx.packageName || '').includes('12 Bulan') || (trx.packageName || '').includes('12 bulan') || (trx.packageName || '').includes('1 Tahun')) durationMonths = 12;

            const orderDate = new Date(trx.createdAt || Date.now());
            const expiryDate = new Date(orderDate);
            expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

            const now = new Date();
            const diffDays = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            warranty = {
                isPermanent,
                warrantyStatus: trx.status === 'success' || trx.status === 'completed' ? (isPermanent ? 'permanent' : 'active') : 'in_progress',
                expiryDate: expiryDate.toISOString(),
                remainingDays: diffDays,
                hasWarranty: true
            };
        }

        const data = {
            ...trx,
            trxId: trx.id,
            orderStatus: trx.status,
            serviceType: trx.service_type,
            speed_option: trx.speed_option || 'slow',
            speed_label: speedLabel,
            speed_range: rangeText,
            user_image: trx.user_image || null,
            user_image_ceir: trx.user_image_ceir || null,
            admin_image: trx.admin_image || null,
            warranty
        };

        res.json({ status: true, data });
    } catch (e) {
        console.error("[CHECK_WARRANTY_ERR]", e.message);
        res.status(500).json({ status: false, message: "Gagal memeriksa garansi." });
    }
});


// 8b. POST /api/public/claim-warranty
router.post('/public/claim-warranty', async (req, res) => {
    try {
        const { imei, customerName, customerPhone, issueDescription } = req.body;
        const cleanImei = (imei || '').trim().replace(/\D/g, '');
        if (!cleanImei || cleanImei.length < 8) {
            return res.status(400).json({ status: false, message: 'Nomor IMEI minimal 8 digit valid.' });
        }
        if (!customerName || !customerName.trim()) {
            return res.status(400).json({ status: false, message: 'Mohon cantumkan nama lengkap Anda.' });
        }
        const cleanCustPhone = (customerPhone || '').trim().replace(/\D/g, '');
        if (!cleanCustPhone || cleanCustPhone.length < 9) {
            return res.status(400).json({ status: false, message: 'Mohon cantumkan nomor WhatsApp yang aktif untuk konfirmasi.' });
        }

        // 1. Find the latest completed transaction for this IMEI
        const trx = await dbGet(`
            SELECT id, userId, userName, packageName, status, createdAt, updatedAt, service_type, imei
            FROM transactions
            WHERE imei LIKE ? AND service_type = 'imei'
            ORDER BY datetime(createdAt) DESC
            LIMIT 1
        `, [`%${cleanImei}%`]);

        if (!trx) {
            return res.status(404).json({
                status: false,
                message: `Tidak ditemukan riwayat pesanan unblock IMEI untuk nomor ${cleanImei}. Pastikan nomor IMEI telah benar.`
            });
        }

        if (trx.status !== 'success' && trx.status !== 'completed') {
            return res.status(400).json({
                status: false,
                message: `Pesanan IMEI ini saat ini masih berstatus '${trx.status}', belum selesai. Klaim garansi hanya berlaku untuk pesanan yang sudah berhasil diproses.`
            });
        }

        // 2. Calculate warranty
        const warranty = calculateTransactionWarranty(trx);
        if (!warranty || !warranty.hasWarranty) {
            return res.status(400).json({
                status: false,
                message: 'Layanan ini tidak memiliki cakupan garansi sinyal.'
            });
        }

        if (warranty.warrantyStatus !== 'active') {
            return res.status(400).json({
                status: false,
                message: `Masa garansi untuk IMEI ini telah berakhir pada tanggal ${warranty.expiryDate ? new Date(warranty.expiryDate).toLocaleDateString('id-ID') : '-'}.`
            });
        }

        // 3. Prevent duplicate active ticket
        const existingTicket = await dbGet(`
            SELECT id, status, createdAt FROM tickets
            WHERE subject LIKE ? AND status IN ('open', 'in_progress')
            ORDER BY datetime(createdAt) DESC
            LIMIT 1
        `, [`%${cleanImei}%`]);

        if (existingTicket) {
            return res.status(400).json({
                status: false,
                message: `Klaim garansi untuk IMEI ${cleanImei} sudah ada dalam antrean tiket (#${existingTicket.id}) dan sedang diproses oleh admin.`
            });
        }

        // 4. Create support ticket in DB
        const ticketId = `GRS-${Date.now().toString().slice(-6)}`;
        const nowIso = new Date().toISOString();
        const subject = `[Klaim Garansi Sinyal] IMEI: ${cleanImei} - ${trx.packageName || 'Unblock IMEI'}`;
        const detailMsg = `Klaim Garansi Sinyal Diajukan:\n` +
            `- Nama Pelanggan: ${customerName.trim()}\n` +
            `- WhatsApp: ${cleanCustPhone}\n` +
            `- IMEI: ${cleanImei}\n` +
            `- Layanan: ${trx.packageName || 'Unblock IMEI'}\n` +
            `- ID Transaksi: ${trx.id}\n` +
            `- Kendala: ${issueDescription || 'Sinyal hilang / Tidak ada layanan'}\n` +
            `- Status Garansi: ${warranty.durationLabel} (${warranty.isPermanent ? 'Permanen' : 'Sisa ' + warranty.remainingDays + ' Hari'})`;

        await dbRun(
            "INSERT INTO tickets (id, userId, subject, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
            [ticketId, trx.userId || 0, subject, 'open', nowIso, nowIso]
        );
        await dbRun(
            "INSERT INTO ticket_messages (id, ticketId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            [`MSG-${Date.now()}`, ticketId, trx.userId || 0, 'user', detailMsg, nowIso]
        );

        // 5. Real-time SSE to admin panel
        try {
            const { sseBroadcast } = require('../middleware/auth');
            if (typeof sseBroadcast === 'function') {
                sseBroadcast('ticket_status', { id: ticketId, subject, status: 'open', type: 'warranty_claim' });
            }
        } catch (e) {}

        // 6. WhatsApp Notification to BOTH Admins
        const warrantyText = warranty.isPermanent 
            ? 'Garansi Permanen Seumur Hidup' 
            : `${warranty.durationLabel} (Sisa ${warranty.remainingDays} Hari)`;

        let waResults = [];
        try {
            if (typeof notifyWarrantyClaim === 'function') {
                waResults = await notifyWarrantyClaim({
                    imei: cleanImei,
                    packageName: trx.packageName,
                    customerName: customerName.trim(),
                    customerPhone: cleanCustPhone,
                    issueDescription: issueDescription || 'Sinyal hilang / Tidak ada layanan',
                    warrantyText,
                    ticketId,
                    trxId: trx.id
                });
            }
        } catch (e) {
            console.error('[Warranty Claim] Error sending WhatsApp notification:', e);
        }

        res.status(200).json({
            status: true,
            message: 'Klaim garansi berhasil diajukan! Notifikasi prioritas telah dikirimkan ke WhatsApp Admin untuk segera dilakukan tembak ulang sinyal.',
            ticketId,
            waResults
        });
    } catch (error) {
        console.error('Error claiming warranty:', error);
        res.status(500).json({ status: false, message: 'Terjadi kesalahan sistem saat memproses klaim garansi.' });
    }
});

// 9. GET /api/public-info
router.get('/public-info', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'publicInfoBox'");
        res.json({ status: true, data: row ? row.value : '' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Gagal mengambil info publik.' });
    }
});

// 10. GET /api/coupons/public
router.get('/coupons/public', async (req, res) => {
    try {
        const userId = req.session?.userId;
        const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

        const coupons = await dbAll(`
            SELECT * FROM coupons 
            WHERE is_active = 1 AND is_public = 1 
              AND (start_date IS NULL OR start_date = '' OR start_date <= ?)
              AND (end_date IS NULL OR end_date = '' OR end_date >= ?)
              AND (used_count < max_usage_limit)
            ORDER BY created_at DESC
        `, [todayWIB, todayWIB]);

        const claimCounts = await dbAll("SELECT coupon_id, COUNT(*) as count FROM user_claimed_coupons GROUP BY coupon_id");
        const totalClaimedMap = {};
        claimCounts.forEach(c => { totalClaimedMap[c.coupon_id] = c.count; });

        let userClaimedMap = {};
        let userUsageMap = {};

        if (userId) {
            const claimed = await dbAll("SELECT coupon_id FROM user_claimed_coupons WHERE userId = ?", [userId]);
            claimed.forEach(c => { userClaimedMap[c.coupon_id] = true; });

            const usages = await dbAll("SELECT coupon_id, COUNT(*) as count FROM coupon_usages WHERE userId = ? GROUP BY coupon_id", [userId]);
            usages.forEach(u => { userUsageMap[u.coupon_id] = u.count; });
        }

        const data = coupons.map(c => {
            const maxPerUser = c.max_per_user || 1;
            const currentUsage = userUsageMap[c.id] || 0;
            const isUserQuotaExhausted = currentUsage >= maxPerUser;
            const maxClaimLimit = c.max_claim_limit || c.max_usage_limit || 100;
            const totalClaims = totalClaimedMap[c.id] || 0;

            return {
                id: c.id,
                code: c.code,
                discount_type: c.discount_type,
                discount_value: c.discount_value,
                min_order_amount: c.min_order_amount,
                max_discount_amount: c.max_discount_amount,
                max_usage_limit: c.max_usage_limit,
                max_claim_limit: maxClaimLimit,
                total_claimed_count: totalClaims,
                used_count: c.used_count,
                start_date: c.start_date,
                end_date: c.end_date,
                max_per_user: maxPerUser,
                is_claimed: !!userClaimedMap[c.id],
                user_used_count: currentUsage,
                is_usable: !isUserQuotaExhausted && (c.used_count < c.max_usage_limit) && (totalClaims < maxClaimLimit || !!userClaimedMap[c.id])
            };
        });

        res.json({ status: true, data });
    } catch (e) {
        console.error("Error fetching public coupons:", e);
        res.status(500).json({ status: false, message: "Gagal mengambil daftar voucher promo." });
    }
});

// 11. POST /api/coupons/claim & /api/coupon/claim
router.post(['/coupons/claim', '/coupon/claim'], isAuthenticated, async (req, res) => {
    try {
        const { coupon_id, couponId, code } = req.body;
        const identifier = coupon_id || couponId || code;
        const userId = req.session.userId;

        if (!identifier) return res.status(400).json({ status: false, message: "ID atau Kode Voucher diperlukan." });

        const coupon = await dbGet("SELECT * FROM coupons WHERE id = ? OR UPPER(code) = UPPER(?)", [identifier, String(identifier).trim()]);
        if (!coupon) return res.status(400).json({ status: false, message: "Voucher promo tidak ditemukan." });
        if (coupon.is_active !== 1) return res.status(400).json({ status: false, message: "Voucher promo ini sedang tidak aktif." });

        const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
        if (coupon.end_date && coupon.end_date.trim() && coupon.end_date.trim().split('T')[0] < todayWIB) {
            return res.status(400).json({ status: false, message: "Voucher promo telah kedaluwarsa." });
        }
        if (coupon.start_date && coupon.start_date.trim() && coupon.start_date.trim().split('T')[0] > todayWIB) {
            return res.status(400).json({ status: false, message: `Voucher promo baru dapat diklaim mulai ${coupon.start_date.trim().split('T')[0]}.` });
        }
        if (coupon.used_count >= coupon.max_usage_limit) {
            return res.status(400).json({ status: false, message: "Kuota pemakaian voucher promo ini sudah habis." });
        }

        const existingClaim = await dbGet("SELECT id FROM user_claimed_coupons WHERE coupon_id = ? AND userId = ?", [coupon.id, userId]);
        if (existingClaim) {
            return res.json({ status: true, message: "Voucher sudah ada di koleksi akun Anda!", coupon_id: coupon.id, code: coupon.code });
        }

        const maxClaimLimit = coupon.max_claim_limit || coupon.max_usage_limit || 100;
        const claimCountRow = await dbGet("SELECT COUNT(*) as count FROM user_claimed_coupons WHERE coupon_id = ?", [coupon.id]);
        if (claimCountRow && claimCountRow.count >= maxClaimLimit) {
            return res.status(400).json({ status: false, message: "Kuota klaim voucher promo ini sudah penuh/habis." });
        }

        const maxPerUser = coupon.max_per_user || 1;
        const userUsage = await dbGet("SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ? AND userId = ?", [coupon.id, userId]);
        if (userUsage && userUsage.count >= maxPerUser) {
            return res.status(400).json({ status: false, message: `Anda sudah mencapai batas penggunaan kupon ini (${maxPerUser}x per akun).` });
        }

        const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun("INSERT INTO user_claimed_coupons (id, coupon_id, userId, claimed_at) VALUES (?, ?, ?, ?)", [claimId, coupon.id, userId, new Date().toISOString()]);

        res.json({
            status: true,
            message: `Voucher ${coupon.code} berhasil diklaim! Gunakan saat checkout.`,
            coupon_id: coupon.id,
            code: coupon.code
        });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal mengklaim voucher promo." });
    }
});

// 12. POST /api/coupon/validate & /api/coupons/validate
router.post(['/coupon/validate', '/coupons/validate'], isAuthenticated, async (req, res) => {
    try {
        const { code, order_amount } = req.body;
        const userId = req.session.userId;

        if (!code) return res.status(400).json({ status: false, message: "Kode kupon wajib diisi." });
        const cleanCode = code.trim().toUpperCase();
        const orderAmt = Number(order_amount) || 0;

        const coupon = await dbGet("SELECT * FROM coupons WHERE UPPER(code) = ?", [cleanCode]);
        if (!coupon) return res.status(400).json({ status: false, message: "Kode kupon tidak ditemukan atau salah." });
        if (coupon.is_active !== 1) return res.status(400).json({ status: false, message: "Kupon ini sedang tidak aktif." });

        const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
        if (coupon.start_date && coupon.start_date.trim() && coupon.start_date.trim().split('T')[0] > todayWIB) {
            return res.status(400).json({ status: false, message: `Kupon promo baru dapat digunakan mulai ${coupon.start_date.trim().split('T')[0]}.` });
        }
        if (coupon.end_date && coupon.end_date.trim() && coupon.end_date.trim().split('T')[0] < todayWIB) {
            return res.status(400).json({ status: false, message: "Kupon promo telah kedaluwarsa." });
        }
        if (coupon.used_count >= coupon.max_usage_limit) {
            return res.status(400).json({ status: false, message: "Kuota kupon promo ini sudah habis." });
        }
        if (orderAmt < coupon.min_order_amount) {
            return res.status(400).json({ status: false, message: `Minimal pembelian untuk kupon ini adalah Rp ${coupon.min_order_amount.toLocaleString('id-ID')}.` });
        }

        if (coupon.is_public === 1 || coupon.is_public === '1') {
            const isClaimed = await dbGet("SELECT id FROM user_claimed_coupons WHERE coupon_id = ? AND userId = ?", [coupon.id, userId]);
            if (!isClaimed) {
                return res.status(400).json({
                    status: false,
                    require_claim: true,
                    coupon_id: coupon.id,
                    message: `Voucher ${coupon.code} wajib diklaim terlebih dahulu sebelum digunakan! Silakan klik Klaim pada Voucher.`
                });
            }
        }

        const maxPerUser = coupon.max_per_user || 1;
        const userUsage = await dbGet("SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ? AND userId = ?", [coupon.id, userId]);
        if (userUsage && userUsage.count >= maxPerUser) {
            return res.status(400).json({ status: false, message: `Anda sudah mencapai batas maksimal penggunaan kupon ini (${maxPerUser}x per akun).` });
        }

        let discount = 0;
        if (coupon.discount_type === 'percent') {
            discount = (coupon.discount_value / 100) * orderAmt;
            if (coupon.max_discount_amount > 0 && discount > coupon.max_discount_amount) {
                discount = coupon.max_discount_amount;
            }
        } else {
            discount = Math.min(coupon.discount_value, orderAmt);
        }

        const finalDiscount = Math.round(discount);
        res.json({
            status: true,
            data: {
                couponId: coupon.id,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                discount_amount: finalDiscount,
                is_public: coupon.is_public,
                max_per_user: maxPerUser,
                remaining_quota: Math.max(0, coupon.max_usage_limit - coupon.used_count),
                final_amount: Math.max(0, orderAmt - finalDiscount)
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: "Terjadi kesalahan saat memvalidasi kupon." });
    }
});

// 13. GET /api/user/referral-info
router.get('/user/referral-info', isAuthenticated, async (req, res) => {
    try {
        let user = await dbGet("SELECT id, name, referral_code FROM users WHERE id = ?", [req.session.userId]);
        if (!user) return res.status(404).json({ status: false, message: "User tidak ditemukan." });

        if (!user.referral_code) {
            const cleanName = (user.name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'RYY';
            const generatedCode = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;
            await dbRun("UPDATE users SET referral_code = ? WHERE id = ?", [generatedCode, user.id]);
            user.referral_code = generatedCode;
        }

        const rewardSum = await dbGet("SELECT COALESCE(SUM(amount), 0) as total FROM referral_rewards WHERE referrer_id = ?", [user.id]);
        const referees = await dbAll("SELECT id, name, email, createdAt FROM users WHERE referred_by = ? ORDER BY datetime(createdAt) DESC", [user.id]);
        const settingsRows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'referral_%'");
        const refSettings = settingsRows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

        res.json({
            status: true,
            data: {
                referralCode: user.referral_code,
                referral_code: user.referral_code,
                totalEarned: rewardSum ? rewardSum.total : 0,
                totalEarnings: rewardSum ? rewardSum.total : 0,
                totalDownlines: referees.length,
                referredUsersCount: referees.length,
                downlines: referees,
                referredUsers: referees,
                commissionValue: Number(refSettings.referral_commission_value || 5000),
                settings: refSettings
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal mengambil pengaturan referral." });
    }
});

module.exports = router;
