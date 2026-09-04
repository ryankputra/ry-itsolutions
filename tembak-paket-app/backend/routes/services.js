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

// GET /api/services/status (Dynamic feature/service toggles)
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
            const platformFee = user && user.role === 'reseller' ? (pkg.reseller_fee || 0) : (pkg.platform_fee || 0);
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
        const rows = await dbAll("SELECT * FROM imei_packages ORDER BY price ASC");
        res.json({ status: true, data: rows || [] });
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

// 7. GET /api/user/announcement & /api/admin/config/public
router.get('/user/announcement', async (req, res) => {
    try {
        const announcement = await dbGet('SELECT * FROM announcements ORDER BY datetime(createdAt) DESC LIMIT 1');
        const bgRow = await dbGet("SELECT value FROM settings WHERE key = 'announcementBgColor'");
        res.status(200).json({
            status: true,
            data: announcement ? { message: announcement.message, bgColor: bgRow ? bgRow.value : '#dc2626' } : null
        });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal mengambil pengumuman." });
    }
});

router.get(['/admin/config/public', '/config/public'], async (req, res) => {
    try {
        const announcement = await dbGet('SELECT * FROM announcements ORDER BY datetime(createdAt) DESC LIMIT 1');
        const bgRow = await dbGet("SELECT value FROM settings WHERE key = 'announcementBgColor'");
        const maintenanceRow = await dbGet("SELECT value FROM settings WHERE key = 'maintenanceMode'");
        res.status(200).json({
            status: true,
            data: {
                announcement: announcement ? { message: announcement.message, bgColor: bgRow ? bgRow.value : '#dc2626' } : null,
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
            SELECT id, userId, packageName, platformFee, status, createdAt, service_type, imei, admin_note, speed_option
            FROM transactions
            WHERE imei LIKE ? AND service_type IN ('imei', 'ceir')
            ORDER BY datetime(createdAt) DESC
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
            warranty
        };

        res.json({ status: true, data });
    } catch (e) {
        console.error("[CHECK_WARRANTY_ERR]", e.message);
        res.status(500).json({ status: false, message: "Gagal memeriksa garansi." });
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

            return {
                id: c.id,
                code: c.code,
                discount_type: c.discount_type,
                discount_value: c.discount_value,
                min_order_amount: c.min_order_amount,
                max_discount_amount: c.max_discount_amount,
                max_usage_limit: c.max_usage_limit,
                used_count: c.used_count,
                start_date: c.start_date,
                end_date: c.end_date,
                max_per_user: maxPerUser,
                is_claimed: !!userClaimedMap[c.id],
                user_used_count: currentUsage,
                is_usable: !isUserQuotaExhausted && (c.used_count < c.max_usage_limit)
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
        const { coupon_id } = req.body;
        const userId = req.session.userId;

        if (!coupon_id) return res.status(400).json({ status: false, message: "Coupon ID diperlukan." });

        const coupon = await dbGet("SELECT * FROM coupons WHERE id = ? OR code = ?", [coupon_id, coupon_id]);
        if (!coupon) return res.status(400).json({ status: false, message: "Voucher promo tidak ditemukan." });
        if (coupon.is_active !== 1) return res.status(400).json({ status: false, message: "Voucher promo ini sedang tidak aktif." });

        const existingClaim = await dbGet("SELECT id FROM user_claimed_coupons WHERE coupon_id = ? AND userId = ?", [coupon.id, userId]);
        if (existingClaim) {
            return res.json({ status: true, message: "Voucher sudah ada di koleksi akun Anda!" });
        }

        const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun("INSERT INTO user_claimed_coupons (id, coupon_id, userId, claimed_at) VALUES (?, ?, ?, ?)", [claimId, coupon.id, userId, new Date().toISOString()]);

        res.json({
            status: true,
            message: `Voucher ${coupon.code} berhasil diklaim! Gunakan saat checkout.`,
            coupon_id: coupon.id
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
                totalEarned: rewardSum ? rewardSum.total : 0,
                totalDownlines: referees.length,
                downlines: referees,
                settings: refSettings
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: "Gagal mengambil pengaturan referral." });
    }
});

module.exports = router;
