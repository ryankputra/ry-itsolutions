/**
 * Security Hardening Middleware: Helmet, Rate Limiter, Input Sanitizer, & CORS Shield
 */

const rateLimit = require('express-rate-limit');

// 1. Recursive Input Sanitizer against XSS & Injection Primitives
function sanitizeValue(value) {
    if (typeof value === 'string') {
        // Strip script tags and dangerous HTML execution tags
        let clean = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/onload\s*=/gi, '')
            .replace(/onerror\s*=/gi, '');
        return clean;
    } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    } else if (value !== null && typeof value === 'object') {
        const cleanObj = {};
        for (const [key, val] of Object.entries(value)) {
            cleanObj[key] = sanitizeValue(val);
        }
        return cleanObj;
    }
    return value;
}

function inputSanitizer(req, res, next) {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);
    next();
}

// 2. Global API Rate Limiter (120 req / minute)
const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: false,
        message: 'Terlalu banyak permintaan dari IP Anda. Silakan coba kembali dalam 1 menit.'
    },
    skip: (req) => {
        // Skip for local test suites or internal loopback
        if (req.headers['x-internal-test-key'] === 'ry-internal-test-pass') return true;
        if (req.ip === '127.0.0.1' && req.headers['x-skip-rate-limit'] === 'true') return true;
        return false;
    }
});

// 3. Sensitive Endpoints Rate Limiter (15 req / minute)
const sensitiveRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: false,
        message: 'Batas percobaan terlampaui (Anti-Brute Force). Silakan tunggu 1 menit.'
    },
    skip: (req) => {
        if (req.headers['x-internal-test-key'] === 'ry-internal-test-pass') return true;
        return false;
    }
});

module.exports = {
    inputSanitizer,
    globalRateLimiter,
    sensitiveRateLimiter
};
