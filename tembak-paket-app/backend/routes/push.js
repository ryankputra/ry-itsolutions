/**
 * Web Push Notification Routes
 */

const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../config/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { getClientIp, parseDevice } = require('../utils/presenceManager');
const { getVapidPublicKey, sendPushNotification, broadcastPushNotification } = require('../services/webPushService');

/**
 * GET /api/push/vapid-public-key
 * Returns the public key needed by the browser to register PushManager
 */
router.get('/push/vapid-public-key', async (req, res) => {
    try {
        const key = await getVapidPublicKey();
        res.json({ status: true, publicKey: key });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil VAPID public key.' });
    }
});

/**
 * POST /api/push/subscribe
 * Registers a new browser PushSubscription
 */
router.post('/push/subscribe', async (req, res) => {
    try {
        const { subscription } = req.body || {};
        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return res.status(400).json({ status: false, message: 'Payload subscription tidak lengkap.' });
        }

        const userId = req.session?.userId || req.headers['x-user-id'] || null;
        const ip = getClientIp(req);
        const userAgent = parseDevice(req.headers['user-agent']);

        await dbRun(
            `INSERT INTO push_subscriptions (userId, endpoint, keys_p256dh, keys_auth, userAgent, ip)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(endpoint) DO UPDATE SET
                userId = excluded.userId,
                keys_p256dh = excluded.keys_p256dh,
                keys_auth = excluded.keys_auth,
                userAgent = excluded.userAgent,
                ip = excluded.ip,
                createdAt = CURRENT_TIMESTAMP`,
            [
                userId ? String(userId) : null,
                subscription.endpoint,
                subscription.keys.p256dh,
                subscription.keys.auth,
                userAgent,
                ip
            ]
        );

        // Send a friendly confirmation push to the device
        sendPushNotification(subscription, {
            title: '🔔 Notifikasi Status Bar Aktif!',
            body: 'Selamat! Anda akan menerima update langsung di status bar HP saat ada layanan & promo baru di Ry-ITSolutions.',
            icon: '/logo.png',
            badge: '/icon.svg',
            url: '/unblock-imei',
            tag: 'welcome-push'
        }).catch(() => {});

        res.json({
            status: true,
            message: 'Perangkat berhasil terdaftar untuk menerima notifikasi status bar HP.'
        });
    } catch (e) {
        console.error('[WebPush] Error registering subscription:', e);
        res.status(500).json({ status: false, message: 'Gagal mendaftarkan langganan notifikasi.' });
    }
});

/**
 * POST /api/push/unsubscribe
 * Removes a PushSubscription when permission is revoked
 */
router.post('/push/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (endpoint) {
            await dbRun("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
        }
        res.json({ status: true, message: 'Langganan notifikasi berhasil dicabut.' });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mencabut notifikasi.' });
    }
});

/**
 * GET /api/admin/push/stats
 * Get total connected subscribers count (Admin only)
 */
router.get('/admin/push/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const countRow = await dbGet("SELECT COUNT(*) as total FROM push_subscriptions");
        res.json({
            status: true,
            totalSubscribers: countRow ? countRow.total : 0
        });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Gagal mengambil statistik subscriber.' });
    }
});

/**
 * POST /api/admin/push/broadcast
 * Broadcast a custom push notification to all subscribers (Admin only)
 */
router.post('/admin/push/broadcast', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { title, body, url, icon, tag } = req.body || {};
        if (!title || !body) {
            return res.status(400).json({ status: false, message: 'Judul dan pesan notifikasi wajib diisi.' });
        }

        const result = await broadcastPushNotification({
            title: title.trim(),
            body: body.trim(),
            url: (url || '/').trim(),
            icon: icon || '/logo.png',
            tag: tag || `broadcast-${Date.now()}`
        });

        res.json({
            status: true,
            message: result.message || 'Push notification berhasil dikirim.',
            result
        });
    } catch (e) {
        console.error('[WebPush] Broadcast error:', e);
        res.status(500).json({ status: false, message: 'Gagal mengirim broadcast push notification.' });
    }
});

module.exports = router;
