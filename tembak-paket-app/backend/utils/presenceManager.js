/**
 * In-Memory Real-Time Online Presence Manager
 * Tracks active online users with high performance without disk IO bottlenecks.
 */

const { dbRun } = require('../config/db');

// Map: userId -> PresenceObject
const activeUsers = new Map();

// Last DB write tracker to debounce updating DB lastSeen column
const lastDbUpdateMap = new Map();

/**
 * Extract clean client IP address
 */
function getClientIp(req) {
    if (!req) return '127.0.0.1';
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return String(cf).trim();

    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const first = String(forwarded).split(',')[0].trim();
        if (first) return first;
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) return String(realIp).trim();

    const remote = req.socket?.remoteAddress || req.ip || '127.0.0.1';
    return String(remote).replace(/^::ffff:/, '').trim();
}

/**
 * Parse User Agent into concise human-readable device and browser summary
 */
function parseDevice(uaString) {
    if (!uaString) return 'Perangkat Tidak Dikenal';
    const ua = String(uaString);

    let os = 'Unknown OS';
    if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac OS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

    return `${browser} on ${os}`;
}

/**
 * Update user presence
 */
function updatePresence(user, req, path = '/') {
    if (!user || !user.id) return;

    const now = Date.now();
    const userId = String(user.id);
    const ip = req ? getClientIp(req) : '127.0.0.1';
    const rawUa = req?.headers ? req.headers['user-agent'] : '';
    const device = parseDevice(rawUa);

    const existing = activeUsers.get(userId);
    const firstSeen = existing ? existing.firstSeen : now;

    activeUsers.set(userId, {
        userId,
        name: user.name || 'Pengguna',
        email: user.email || '',
        role: user.role || 'user',
        avatar: user.avatar || '',
        phone: user.phone || user.verifiedPhone || '',
        ip,
        device,
        userAgent: rawUa,
        currentPage: path || existing?.currentPage || '/',
        firstSeen,
        lastSeen: now
    });

    // Debounce DB lastSeen write to once per 3 minutes
    const lastDbUpdate = lastDbUpdateMap.get(userId) || 0;
    if (now - lastDbUpdate > 180000) {
        lastDbUpdateMap.set(userId, now);
        try {
            dbRun(
                'UPDATE users SET lastSeen = datetime("now", "localtime") WHERE id = ?',
                [userId]
            ).catch(() => {});
        } catch (e) {}
    }
}

/**
 * Remove user from presence (e.g. on logout)
 */
function removePresence(userId) {
    if (!userId) return;
    activeUsers.delete(String(userId));
    lastDbUpdateMap.delete(String(userId));
}

/**
 * Get online statistics (users active within the last 60 seconds)
 */
function getOnlineStats(timeoutMs = 60000) {
    const now = Date.now();
    const list = [];

    for (const [userId, data] of activeUsers.entries()) {
        if (now - data.lastSeen <= timeoutMs) {
            list.push({
                ...data,
                onlineDurationSeconds: Math.max(0, Math.floor((now - data.firstSeen) / 1000)),
                lastSeenSecondsAgo: Math.max(0, Math.floor((now - data.lastSeen) / 1000))
            });
        } else {
            // Stale beyond 5 minutes: prune memory
            if (now - data.lastSeen > 300000) {
                activeUsers.delete(userId);
                lastDbUpdateMap.delete(userId);
            }
        }
    }

    // Sort newest activity first
    list.sort((a, b) => b.lastSeen - a.lastSeen);

    return {
        totalOnline: list.length,
        onlineUsers: list
    };
}

/**
 * Check if a specific user is currently online
 */
function isUserOnline(userId, timeoutMs = 60000) {
    if (!userId) return false;
    const user = activeUsers.get(String(userId));
    if (!user) return false;
    return (Date.now() - user.lastSeen) <= timeoutMs;
}

module.exports = {
    updatePresence,
    removePresence,
    getOnlineStats,
    isUserOnline,
    getClientIp,
    parseDevice
};
