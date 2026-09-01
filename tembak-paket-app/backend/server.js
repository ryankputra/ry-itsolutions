/**
 * Ry-ITSolutions Main Backend Server Entrypoint
 * Modularized architecture: Clean, lightweight, scalable
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');

const { db, dbAll, initializeDatabase } = require('./config/db');
const { isAuthenticated, isAdmin, isReseller, handleSseStream } = require('./middleware/auth');
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

const app = express();
const PORT = process.env.PORT || 3001;
const CEIRGO_API_KEY = process.env.CEIRGO_API_KEY;
const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';

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

// 2. Core Middlewares
const allowedOrigins = [
    'http://localhost:3005',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3005',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://192.168.') || origin.includes('telegram.org')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data', 'x-telegram-bot-api-secret-token', 'X-Requested-With', 'Accept', 'Cache-Control'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.options('*', cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 3. Session Store Configuration
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
app.use('/api', transactionRoutes.router);
app.use('/api', serviceRoutes);
app.use('/api', adminRoutes);
app.use('/api', reviewRoutes);
app.use('/api', gameRoutes);
app.use('/api', telegramRoutes.router);

// 9. Initialize Cron Schedulers
initSchedulers();

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
