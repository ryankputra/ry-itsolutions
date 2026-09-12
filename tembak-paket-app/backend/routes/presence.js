/**
 * Online Presence & Heartbeat Routes
 */

const express = require('express');
const router = express.Router();
const { dbGet } = require('../config/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { updatePresence, getOnlineStats } = require('../utils/presenceManager');
const { logUserActivity } = require('../utils/activityLogger');

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

module.exports = router;
