/**
 * Authentication Middleware & Server-Sent Events (SSE) Manager
 */

const { dbGet } = require('../config/db');

// SSE Client Connection Pool
const sseClients = new Map(); // userId -> Set<Response>

function sseAddClient(userId, res) {
    let set = sseClients.get(userId);
    if (!set) {
        set = new Set();
        sseClients.set(userId, set);
    }
    set.add(res);
}

function sseRemoveClient(userId, res) {
    const set = sseClients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) sseClients.delete(userId);
}

function sseSend(userId, event, payload) {
    const set = sseClients.get(userId);
    if (!set) return;
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const res of set) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${data}\n\n`);
    }
}

function sseBroadcast(event, payload) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const [, set] of sseClients) {
        for (const res of set) {
            res.write(`event: ${event}\n`);
            res.write(`data: ${data}\n\n`);
        }
    }
}

// Authentication Check Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    res.status(401).json({ status: false, message: 'Unauthorized: Anda harus login.' });
};

// Admin Authorization Check Middleware
const isAdmin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ status: false, message: 'Unauthorized: Sesi tidak ditemukan.' });
    }
    try {
        const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (user && user.role === 'admin') return next();
        res.status(403).json({ status: false, message: 'Forbidden: Akses ditolak. Anda bukan Admin.' });
    } catch (error) {
        console.error("isAdmin middleware error:", error);
        res.status(500).json({ status: false, message: 'Server error saat memeriksa peran admin.' });
    }
};

// Reseller / VIP Role Check Middleware
const isReseller = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ status: false, message: 'Unauthorized: Sesi tidak ditemukan.' });
    }
    try {
        const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
        if (user && (user.role === 'reseller' || user.role === 'admin')) return next();
        res.status(403).json({ status: false, message: 'Forbidden: Hanya untuk Reseller VIP.' });
    } catch (error) {
        console.error("isReseller middleware error:", error);
        res.status(500).json({ status: false, message: 'Server error saat memeriksa peran reseller.' });
    }
};

// Handle SSE Connection Endpoint (/api/stream)
function handleSseStream(req, res) {
    if (!req.session || !req.session.userId) {
        return res.status(401).end();
    }
    const userId = req.session.userId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseAddClient(userId, res);

    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ status: 'ok', userId })}\n\n`);

    const keepAliveInterval = setInterval(() => {
        res.write(`: keep-alive\n\n`);
    }, 25000);

    req.on('close', () => {
        clearInterval(keepAliveInterval);
        sseRemoveClient(userId, res);
    });
}

module.exports = {
    isAuthenticated,
    isAdmin,
    isReseller,
    sseAddClient,
    sseRemoveClient,
    sseSend,
    sseBroadcast,
    handleSseStream
};
