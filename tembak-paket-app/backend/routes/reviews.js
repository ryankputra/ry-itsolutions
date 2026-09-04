/**
 * Customer Reviews & Ratings Routes
 */

const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

// 1. GET /api/reviews
router.get('/reviews', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const productId = req.query.productId || req.query.serviceType || 'unblock-imei';
        let query = "SELECT * FROM reviews WHERE 1=1";
        const params = [];
        if (productId && productId !== 'all') {
            if (productId === 'unblock-imei' || productId === 'imei') {
                query += " AND (productId IN ('unblock-imei', 'imei') OR serviceType IN ('unblock-imei', 'imei'))";
            } else {
                query += " AND (productId = ? OR serviceType = ?)";
                params.push(productId, productId);
            }
        }
        // Show real customer reviews FIRST (non-seed first), then newest first
        query += " ORDER BY (CASE WHEN id LIKE 'rev_seed_%' THEN 1 ELSE 0 END) ASC, createdAt DESC";

        const reviewsList = await dbAll(query, params);

        let sumRating = 0;
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let withPhotosCount = 0;

        const formattedReviews = (reviewsList || []).map(r => {
            sumRating += Number(r.rating) || 5;
            const star = Math.min(5, Math.max(1, Math.round(r.rating)));
            ratingCounts[star] = (ratingCounts[star] || 0) + 1;
            let imgs = [];
            try { imgs = JSON.parse(r.images || '[]'); } catch(e){}
            if (imgs && imgs.length > 0) withPhotosCount++;
            return {
                ...r,
                images: imgs
            };
        });

        const total = formattedReviews.length;
        const avgRating = total > 0 ? (sumRating / total).toFixed(1) : "0.0";

        res.json({
            status: true,
            summary: {
                averageRating: Number(avgRating),
                totalReviews: total,
                ratingCounts: {
                    5: ratingCounts[5] || 0,
                    4: ratingCounts[4] || 0,
                    3: ratingCounts[3] || 0,
                    2: ratingCounts[2] || 0,
                    1: ratingCounts[1] || 0,
                },
                withPhotosCount
            },
            reviews: formattedReviews
        });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).json({ status: false, message: "Gagal memuat ulasan." });
    }
});

// 2. GET /api/reviews/check-eligibility
router.get('/reviews/check-eligibility', isAuthenticated, async (req, res) => {
    try {
        const userTrx = await dbAll(
            `SELECT id, packageName, service_type, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt DESC`,
            [req.session.userId]
        );

        res.json({
            status: true,
            canReview: true,
            completedOrders: userTrx || []
        });
    } catch (err) {
        res.status(500).json({ status: false, canReview: false });
    }
});

// 3. POST /api/reviews
router.post('/reviews', isAuthenticated, async (req, res) => {
    try {
        const { orderId, productId, rating, comment, variation, images } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ status: false, message: "Rating bintang 1-5 wajib diisi." });
        }
        if (!comment || comment.trim().length < 2) {
            return res.status(400).json({ status: false, message: "Tulis ulasan minimal 2 karakter." });
        }

        const userObj = await dbGet("SELECT id, name, email, avatar, role, verifiedPhone, createdAt FROM users WHERE id = ?", [req.session.userId]);
        if (!userObj) {
            return res.status(401).json({ status: false, message: "User tidak ditemukan. Silakan login ulang." });
        }

        const latestTrx = await dbGet(
            `SELECT id, packageName, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`,
            [req.session.userId]
        );

        const orderCount = await dbGet("SELECT COUNT(*) AS total FROM transactions WHERE userId = ?", [req.session.userId]);
        const userName = userObj.name || userObj.email?.split('@')[0] || 'Pembeli Terverifikasi';
        const userAvatar = userObj.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;
        const userTotalOrders = Number(orderCount?.total) || 1;
        const accountRole = String(userObj.role || '').toLowerCase();
        const userRole = accountRole.includes('admin') ? 'Official Admin' : (accountRole.includes('konter') || accountRole.includes('mitra') ? 'Konter Mitra' : userTotalOrders >= 5 ? 'Reseller VIP' : 'Pembeli Terverifikasi');
        const joinedAt = new Date(userObj.createdAt || '2026-01-02T00:00:00.000Z');
        const userJoinedAt = joinedAt.toISOString();
        const transactionDate = latestTrx?.createdAt || new Date().toISOString();

        const reviewId = `rev_${Date.now()}`;
        const imagesJson = JSON.stringify(Array.isArray(images) ? images : []);

        const finalVariation = variation || latestTrx?.packageName || 'GARANSI 3 BULAN (MASA AKTIF SINYAL)';

        await dbRun(
            `INSERT INTO reviews (id, userId, userName, userAvatar, orderId, productId, serviceType, variation, rating, comment, images, likesCount, transactionDate, userJoinedAt, userTotalOrders, userRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
            [reviewId, req.session.userId, userName, userAvatar, orderId || latestTrx?.id || 'order_direct', productId || 'unblock-imei', 'imei', finalVariation, Number(rating), comment.trim(), imagesJson, transactionDate, userJoinedAt, userTotalOrders, userRole, new Date().toISOString()]
        );

        // Bonus Reward +500 Koin Ry
        try {
            await dbRun("UPDATE users SET coins = coins + 500 WHERE id = ?", [req.session.userId]);
            await dbRun("INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, claimed_at) VALUES (?, ?, 'review_bonus', 500, ?)", [`clm_${Date.now()}`, req.session.userId, new Date().toISOString()]);
        } catch (e) {}

        const newReviewObj = {
            id: reviewId,
            userId: req.session.userId,
            userName,
            userAvatar,
            orderId: orderId || latestTrx?.id || 'order_direct',
            productId: productId || 'unblock-imei',
            serviceType: 'imei',
            variation: finalVariation,
            rating: Number(rating),
            comment: comment.trim(),
            images: Array.isArray(images) ? images : [],
            likesCount: 0,
            transactionDate,
            userJoinedAt,
            userTotalOrders,
            userRole,
            createdAt: new Date().toISOString()
        };

        res.json({
            status: true,
            message: "Ulasan Anda berhasil dikirim dan ditampilkan! Bonus +500 Koin Ry telah masuk ke akun Anda.",
            reviewId,
            review: newReviewObj
        });
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).json({ status: false, message: "Gagal menyimpan ulasan: " + err.message });
    }
});

// 4. POST /api/reviews/:id/like
router.post('/reviews/:id/like', async (req, res) => {
    try {
        await dbRun("UPDATE reviews SET likesCount = likesCount + 1 WHERE id = ?", [req.params.id]);
        res.json({ status: true });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

module.exports = router;
