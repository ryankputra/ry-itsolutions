require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Fallback defaults for critical environment variables
process.env.PORT = process.env.PORT || '3001';
process.env.CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.id';
process.env.QRIS_NOBU_STATIS_STRING = process.env.QRIS_NOBU_STATIS_STRING || process.env.QRIS_STATIS_STRING || "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214550177920473550303UMI51440014ID.CO.QRIS.WWW0215ID20253782970190303UMI5204541153033605802ID5918RYYSTORE OK22859056009SURAKARTA61055712462070703A016304774D";
process.env.QRIS_GOPAY_STATIS_STRING = process.env.QRIS_GOPAY_STATIS_STRING || "00020101021126610014COM.GO-JEK.WWW01189360091432137105260210G2137105260303UMI51440014ID.CO.QRIS.WWW0215ID10264985528880303UMI5204737953033605802ID5921RyyStore IT Solutions6011KARANGANYAR61055773162070703A016304F027";
process.env.QRIS_STATIS_STRING = process.env.QRIS_NOBU_STATIS_STRING;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'ryystore_secure_session_secret_2026';

console.log(`[CEIRGO_INIT] API Key Loaded: ${process.env.CEIRGO_API_KEY ? 'YES' : 'NO'}`);
console.log(`[QRIS_INIT] Nobu/Orkut String: ${process.env.QRIS_NOBU_STATIS_STRING ? 'CONFIGURED' : 'MISSING'} | GoPay String: ${process.env.QRIS_GOPAY_STATIS_STRING ? 'CONFIGURED' : 'MISSING'}`);

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const helmet = require('helmet');

const { db, dbAll, initializeDatabase } = require('./config/db');
const { isAuthenticated, isAdmin, isReseller, handleSseStream } = require('./middleware/auth');
const { inputSanitizer, globalRateLimiter, sensitiveRateLimiter } = require('./middleware/security');
const { initSchedulers } = require('./cron/schedulers');
const { pollTelegramUpdates } = require('./routes/telegram');
const { ceirgoRoutes, initCeirgoRoutes, setDependencies } = require('./ceirgoRoutes');

// Route Modules
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const gameRoutes = require('./routes/games');
const telegramRoutes = require('./routes/telegram');
const orderRoutes = require('./routes/orders');
const waBot = require('./services/waBot');

const app = express();
const PORT = process.env.PORT || 3001;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';

// Trust reverse proxy headers (Nginx / Cloudflare on STB/VPS)
app.set('trust proxy', 1);

// 1. Ensure required public/upload directories exist
const uploadDirs = [
    path.join(__dirname, 'public', 'uploads', 'avatars'),
    path.join(__dirname, 'public', 'uploads', 'manual_orders'),
    path.join(__dirname, 'public', 'uploads', 'reviews'),
    path.join(__dirname, 'backups'),
    path.join(__dirname, 'sessions')
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: 'deny' }
}));

// 3. Strict CORS Enforcement
const allowedOrigins = [
    'http://localhost:3005',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3005',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://ry-itsolutions.web.id',
    'http://ry-itsolutions.web.id',
    'https://www.ry-itsolutions.web.id',
    'http://www.ry-itsolutions.web.id',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('http://192.168.') ||
            origin.includes('telegram.org') ||
            origin.includes('ry-itsolutions.web.id') ||
            origin.endsWith('.web.id')
        ) {
            return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy: Origin unauthorized'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data', 'x-telegram-bot-api-secret-token', 'X-Requested-With', 'Accept', 'Cache-Control', 'x-internal-test-key'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.options('*', cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 4. Rate Limiting & Input Sanitization
app.use('/api', globalRateLimiter);
app.use(inputSanitizer);
app.use(['/api/auth/login', '/api/auth/register', '/api/coupons/claim'], sensitiveRateLimiter);

// 5. Session Store Configuration
const sessionConfig = {
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 86400 * 7,
        retries: 2
    }),
    secret: process.env.SESSION_SECRET || 'ry-itsolutions-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if behind HTTPS reverse proxy with trust proxy
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
};
app.use(session(sessionConfig));

// 4. Static Asset Hosting
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// 5. Database Initialization
initializeDatabase();

// 6. Mount Realtime SSE Stream Endpoint
app.get('/api/stream', handleSseStream);

// 7. Mount CeirGO Module
setDependencies({ dbAll, isAuthenticated, isAdmin, CEIRGO_API_KEY, CEIRGO_BASE_URL });
initCeirgoRoutes();
app.use('/api', ceirgoRoutes);

// 8. Mount All Modular API Routers
app.use('/api', authRoutes.router);
app.use('/api', orderRoutes);
app.use('/api', transactionRoutes.router);
app.use('/api', serviceRoutes);
app.use('/api', adminRoutes);
app.use('/api', reviewRoutes);
app.use('/api', gameRoutes);
app.use('/api', telegramRoutes.router);

// WhatsApp Admin Bot Control Endpoints
app.get('/api/admin/whatsapp/status', isAuthenticated, isAdmin, (req, res) => {
    res.json({ status: true, data: waBot.getWAStatus() });
});
app.post('/api/admin/whatsapp/init', isAuthenticated, isAdmin, (req, res) => {
    waBot.initWABot(req.body.forceNew === true);
    res.json({ status: true, message: "Inisialisasi WhatsApp Bot dimulai. Silakan cek terminal/QR." });
});
app.post('/api/admin/whatsapp/logout', isAuthenticated, isAdmin, async (req, res) => {
    const ok = await waBot.logoutWABot();
    res.json({ status: ok, message: ok ? "WhatsApp Bot berhasil logout dan sesi dihapus." : "Gagal logout WhatsApp." });
});

// 9. Initialize Cron Schedulers
initSchedulers();

// Auto-start WhatsApp Bot if session exists
waBot.initWABot(false);

// 10. Start Server
app.listen(PORT, () => {
    if (process.env.TELEGRAM_USE_POLLING === 'true') {
        pollTelegramUpdates();
        console.log(`[Telegram] Polling updates mode active.`);
    } else {
        console.log(`[Telegram] Webhook mode active on /api/telegram/webhook`);
    }
    console.log(`🚀 Ry-ITSolutions Modular Backend Running on http://localhost:${PORT}`);
});

module.exports = app;
