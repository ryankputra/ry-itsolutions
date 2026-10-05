/**
 * Online Presence & Heartbeat Routes
 */

const express = require('express');
const router = express.Router();
const { dbGet } = require('../config/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { updatePresence, getOnlineStats, forceKillPresence } = require('../utils/presenceManager');
const { logUserActivity } = require('../utils/activityLogger');
const { sseSend } = require('../middleware/auth');

/**
 * POST /api/presence/heartbeat
 * Lightweight heartbeat ping sent by clients every ~25 seconds
 */
router.post('/presence/heartbeat', async (req, res) => {
    try {
        const userId = req.session?.userId || req.headers['x-user-id'] || null;
        const currentPath = (req.body?.path || '').trim() || '/';

        if (!userId) {
            return res.json({ status: true, isOnline: false });
        }

        const user = await dbGet('SELECT id, name, email, role, avatar, verifiedPhone FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.json({ status: true, isOnline: false });
        }

        updatePresence(user, req, currentPath);

        // Record page navigation log (debounced automatically in activityLogger)
        if (currentPath && currentPath !== '/') {
            logUserActivity({
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                action: 'PAGE_VIEW',
                description: `Membuka halaman ${currentPath}`,
                path: currentPath,
                req
            });
        }

        return res.json({
            status: true,
            isOnline: true,
            userId: user.id
        });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Heartbeat error' });
    }
});

/**
 * GET /api/presence/stats
 * Get real-time count & list of online users (Admin only)
 */
router.get('/presence/stats', isAuthenticated, isAdmin, (req, res) => {
    try {
        const stats = getOnlineStats();
        return res.json({
            status: true,
            ...stats
        });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Failed to retrieve presence stats' });
    }
});

/**
 * DELETE /api/presence/kill/:userId
 * Admin memutuskan sesi pengguna secara manual (logout paksa + keluarkan dari daftar online)
 */
router.delete('/presence/kill/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const targetId = String(req.params.userId || '');
        const adminId = req.session.userId;

        if (!targetId) {
            return res.status(400).json({ status: false, message: 'ID pengguna wajib diisi.' });
        }

        const target = await dbGet('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
        if (!target) {
            return res.status(404).json({ status: false, message: 'Pengguna tidak ditemukan.' });
        }

        const deletedSessions = forceKillPresence(targetId);

        // Beri tahu klien target via SSE agar redirect ke login
        try {
            sseSend(targetId, 'force_logout', { reason: 'Sesi Anda diputus oleh Admin. Silakan login kembali.' });
        } catch (e) {}

        await logUserActivity({
            userId: adminId,
            action: 'ADMIN_KILL_SESSION',
            description: `Memutus sesi pengguna ${target.name} (${target.email}) secara manual`,
            req
        });

        const stats = getOnlineStats();
        return res.json({
            status: true,
            message: `Sesi ${target.name} berhasil diputus. ${deletedSessions} file sesi dihapus.`,
            killedUserId: targetId,
            deletedSessions,
            ...stats
        });
    } catch (e) {
        console.error('Error killing session:', e);
        return res.status(500).json({ status: false, message: e.message || 'Gagal memutus sesi.' });
    }
});

module.exports = router;
