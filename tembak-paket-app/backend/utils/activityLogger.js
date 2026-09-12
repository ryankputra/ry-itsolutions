/**
 * User Activity Audit Logger
 * Asynchronously records user activity logs in SQLite without blocking API requests.
 */

const { dbRun, dbGet } = require('../config/db');
const { getClientIp, parseDevice } = require('./presenceManager');

// Memory cache for user names/emails to avoid frequent DB lookups
const userProfileCache = new Map();

// Debounce tracker for rapid identical actions (e.g. PAGE_VIEW on same path)
const debounceActionMap = new Map();

/**
 * Log user activity
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.userName]
 * @param {string} [params.userEmail]
 * @param {string} params.action - e.g. LOGIN, LOGOUT, PAGE_VIEW, ORDER, TOPUP, AI_CHAT, PROFILE_UPDATE
 * @param {string} params.description
 * @param {string} [params.path]
 * @param {Object} [params.req] - Express request object
 */
async function logUserActivity({ userId, userName, userEmail, action, description, path, req }) {
    try {
        if (!action) return;

        const cleanUserId = userId ? String(userId) : null;
        const cleanPath = path || (req ? req.originalUrl || req.path : '/');

        // Debounce PAGE_VIEW on same path within 10 seconds per user
        if (action === 'PAGE_VIEW' && cleanUserId) {
            const debounceKey = `${cleanUserId}_${cleanPath}`;
            const lastLog = debounceActionMap.get(debounceKey) || 0;
            if (Date.now() - lastLog < 10000) {
                return;
            }
            debounceActionMap.set(debounceKey, Date.now());
        }

        let resolvedName = userName || '';
        let resolvedEmail = userEmail || '';

        // Resolve user name and email from cache or DB if missing
        if (cleanUserId && (!resolvedName || !resolvedEmail)) {
            const cached = userProfileCache.get(cleanUserId);
            if (cached && (Date.now() - cached.cachedAt < 300000)) {
                resolvedName = cached.name || '';
                resolvedEmail = cached.email || '';
            } else {
                try {
                    const u = await dbGet('SELECT name, email FROM users WHERE id = ?', [cleanUserId]);
                    if (u) {
                        resolvedName = u.name || '';
                        resolvedEmail = u.email || '';
                        userProfileCache.set(cleanUserId, { name: resolvedName, email: resolvedEmail, cachedAt: Date.now() });
                    }
                } catch (e) {}
            }
        }

        const ip = req ? getClientIp(req) : '127.0.0.1';
        const rawUa = req?.headers ? req.headers['user-agent'] : '';
        const deviceSummary = parseDevice(rawUa);

        await dbRun(
            `INSERT INTO user_activity_logs (userId, userName, userEmail, action, description, path, ip, userAgent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cleanUserId,
                resolvedName || 'Tamu',
                resolvedEmail || '-',
                String(action).toUpperCase().trim(),
                String(description || '').trim(),
                cleanPath,
                ip,
                deviceSummary
            ]
        );
    } catch (err) {
        console.error('[ActivityLogger] Error inserting log:', err.message);
    }
}

module.exports = {
    logUserActivity
};
