const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const os = require('os');

const ipv4Agent = new https.Agent({ family: 4 });
const SESSION_FILE = path.join(__dirname, '..', 'sessions', 'ig_session.json');
const AUDIO_DIR = path.resolve(__dirname, '..', '..', 'frontend-v2', 'public', 'audio', 'tiktok');

const FFMPEG_BIN = process.env.FFMPEG_PATH || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'add_roamer_logo.png');
let cachedLogoDataUri = null;
function getAddRoamerLogoUri() {
    if (cachedLogoDataUri) return cachedLogoDataUri;
    try {
        if (fs.existsSync(LOGO_PATH)) {
            const buf = fs.readFileSync(LOGO_PATH);
            cachedLogoDataUri = 'data:image/png;base64,' + buf.toString('base64');
            return cachedLogoDataUri;
        }
    } catch (e) {
        console.warn('[IGDirect] Gagal membaca add_roamer_logo.png:', e.message);
    }
    return '';
}

// Katalog lagu khusus viral TikTok & TikTok Remix untuk Story Video & Feed IG (dengan offset reff/drop bass aman)
const TRENDING_TRACKS = [
    { title: 'DJ Alay Gaya Kaya Artis (Viral TikTok Remix)', artist: 'DJ Desa', filename: 'djalay.mp3', reffSec: 18 },
    { title: 'Stecu Stecu (Jedag Jedug TikTok Remix)', artist: 'Faris Adam', filename: 'stecustecu.mp3', reffSec: 15 },
    { title: 'Tabrak Tabrak Masuk (Remix TikTok Full Bass)', artist: 'Richard Jersey', filename: 'tabraktabrak.mp3', reffSec: 20 },
    { title: 'Malam Pagi (Remix Jedag Jedug TikTok)', artist: 'Saixse ft. MK', filename: 'malampagi.mp3', reffSec: 20 },
    { title: 'Cikini Ke Gondangdia (DJ Koplo Remix TikTok)', artist: 'Duo Anggrek Remix', filename: 'cikini.mp3', reffSec: 16 },
    { title: 'Karna Su Sayang (DJ Remix TikTok Viral)', artist: 'Near feat. Dian Sorowea', filename: 'karnasusayang.mp3', reffSec: 20 },
    { title: 'Sial (DJ Speed Up Jedag Jedug TikTok)', artist: 'Mahalini Remix', filename: 'sial.mp3', reffSec: 20 },
    { title: 'Garam & Madu (DJ Remix TikTok Bass)', artist: 'Tenxi & Asmara', filename: 'garammadu.mp3', reffSec: 10 },
    { title: 'Cupid (Speed Up Twin Ver TikTok Remix)', artist: 'FIFTY FIFTY', filename: 'cupid.mp3', reffSec: 15 },
    { title: 'Sigar (DJ Jedag Jedug Koplo TikTok)', artist: 'Denny Caknan Remix', filename: 'sigar.mp3', reffSec: 10 },
    { title: 'Cundamani (DJ Slow Bass Remix TikTok)', artist: 'Denny Caknan Remix', filename: 'cundamani.mp3', reffSec: 10 },
    { title: 'Wirang (DJ Remix Full Bass TikTok)', artist: 'Denny Caknan Remix', filename: 'wirang.mp3', reffSec: 10 },
    { title: 'APT. (DJ TikTok Viral Remix)', artist: 'ROSÉ & Bruno Mars', filename: 'apt.mp3', reffSec: 10 },
    { title: 'Die With A Smile (DJ Slow TikTok Remix)', artist: 'Lady Gaga & Bruno Mars', filename: 'diewithasmile.mp3', reffSec: 10 },
    { title: 'Komang (DJ Santuy Remix TikTok)', artist: 'Raim Laode', filename: 'komang.mp3', reffSec: 20 },
    { title: 'Lantas (DJ Remix TikTok Viral)', artist: 'Juicy Luicy', filename: 'lantas.mp3', reffSec: 10 },
    { title: 'Bohongi Hati (DJ Remix Full Bass)', artist: 'Mahalini Remix', filename: 'bohongihati.mp3', reffSec: 20 },
    { title: 'Gala Bunga Matahari (DJ TikTok Remix)', artist: 'Sal Priadi Remix', filename: 'galabungamatahari.mp3', reffSec: 20 },
    { title: 'Jiwa Yang Bersedih (DJ Slow Bass)', artist: 'Ghea Indrawari Remix', filename: 'jiwayangbersedih.mp3', reffSec: 10 },
    { title: 'Mati-matian (DJ Remix Jedag Jedug)', artist: 'Mahalini Remix', filename: 'matimatian.mp3', reffSec: 10 },
    { title: 'Penjaga Hati (DJ Viral TikTok Remix)', artist: 'Nadhif Basalamah', filename: 'penjagahati.mp3', reffSec: 10 },
    { title: 'Satu Bulan (DJ Remix Koplo Bass)', artist: 'Bernadya Remix', filename: 'satubulan.mp3', reffSec: 10 },
    { title: 'Semua Aku Dirayakan (DJ Remix)', artist: 'Nadin Amizah Remix', filename: 'semuaakudirayakan.mp3', reffSec: 10 },
    { title: 'Tak Segampang Itu (DJ Remix TikTok)', artist: 'Anggi Marito Remix', filename: 'taksegampangitu.mp3', reffSec: 10 },
    { title: 'Tampar (DJ Full Bass Remix TikTok)', artist: 'Juicy Luicy Remix', filename: 'tampar.mp3', reffSec: 10 },
    { title: 'Untungnya Hidup Tetap Berjalan (DJ Remix)', artist: 'Bernadya Remix', filename: 'untungnya.mp3', reffSec: 10 }
];

const { getRandomDJTrack, getUniqueDJTracks, getActiveDJTracks } = require('./tiktokDJService');

function getRandomTrack() {
    try {
        const djTrack = getRandomDJTrack();
        if (djTrack) return djTrack;
    } catch {}
    return TRENDING_TRACKS[Math.floor(Math.random() * TRENDING_TRACKS.length)];
}

function getUniqueTracks(count) {
    try {
        const djTracks = getUniqueDJTracks(count);
        if (djTracks && djTracks.length > 0) return djTracks;
    } catch {}
    const shuffled = [...TRENDING_TRACKS].sort(() => 0.5 - Math.random());
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(shuffled[i % shuffled.length]);
    }
    return result;
}

/**
 * Mengambil atau merefresh kredensial sesi Instagram aktif
 */
function getSessionCredentials() {
    let sessionId = process.env.IG_SESSIONID;
    let dsUserId = process.env.IG_DS_USER_ID || '3501066702';

    if (fs.existsSync(SESSION_FILE)) {
        try {
            const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
            if (raw.sessionId) sessionId = raw.sessionId;
            if (raw.dsUserId) dsUserId = raw.dsUserId;
        } catch (e) {}
    }

    if (!sessionId) {
        // Default dari cookie akun @unlocksinyalsolo yang diberikan
        sessionId = '3501066702%3Aetn7kTIhtVppCc%3A5%3AAYnosL0hbAOlqUQbO2w3cS4DDjmfMZIOVt_BZCwnDg';
    }

    // Pastikan sessionid di URL-encode jika belum
    const cleanSession = sessionId.trim().replace(/^sessionid=/, '');
    const decoded = decodeURIComponent(cleanSession);
    const encoded = encodeURIComponent(decoded);

    const userMatch = decoded.match(/^(\d+):/);
    if (userMatch) dsUserId = userMatch[1];

    return { sessionId: encoded, dsUserId };
}

/**
 * Simpan dan perbarui sesi Instagram dari input admin
 */
async function saveSessionFromCookie(sessionId, customUsername) {
    if (!sessionId) throw new Error('Session ID kosong.');

    const clean = sessionId.trim().replace(/^sessionid=/, '');
    const decoded = decodeURIComponent(clean);
    const encoded = encodeURIComponent(decoded);
    const userMatch = decoded.match(/^(\d+):/);
    const dsUserId = userMatch ? userMatch[1] : '3501066702';

    const sessionData = {
        sessionId: encoded,
        dsUserId,
        username: (customUsername || 'unlocksinyalsolo').replace('@', '').trim(),
        savedAt: new Date().toISOString()
    };

    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

    console.log(`[IGDirect] ✅ Berhasil menyimpan sesi baru untuk ID: ${dsUserId}`);
    return {
        success: true,
        username: sessionData.username,
        pk: dsUserId
    };
}

let lastAlertTime = 0;
function triggerIgSessionExpiredAlert(reason = 'login_required') {
    const now = Date.now();
    if (now - lastAlertTime < 30 * 60 * 1000) {
        return;
    }
    lastAlertTime = now;

    console.warn(`[IGDirect] ⚠️ Sesi Instagram terdeteksi kedaluwarsa (${reason}). Memicu notifikasi ke WhatsApp Admin...`);
    try {
        const { notifyAdminIgSessionExpired } = require('./waBot');
        if (typeof notifyAdminIgSessionExpired === 'function') {
            notifyAdminIgSessionExpired(reason);
        }
    } catch (e) {
        console.warn('[IGDirect] Gagal memicu notifyAdminIgSessionExpired:', e.message);
    }
}

function checkAndNotifyIfSessionExpired(err) {
    if (!err) return;
    const msg = (err?.response?.data?.message || err?.message || '').toLowerCase();
    const status = err?.response?.status;
    const dataStr = typeof err?.response?.data === 'string' ? err.response.data.toLowerCase() : '';

    const isExpired =
        msg.includes('login_required') ||
        msg.includes('checkpoint_required') ||
        msg.includes('feedback_required') ||
        status === 401 ||
        status === 403 ||
        dataStr.includes('login_required') ||
        dataStr.includes('/accounts/login') ||
        err?.code === 'ERR_TOO_MANY_REDIRECTS';

    if (isExpired) {
        const detail = err?.response?.data?.message || (status ? `HTTP ${status}` : (err.message || 'login_required'));
        triggerIgSessionExpiredAlert(detail);
    }
}

/**
 * Dapatkan CSRF Token segar dari instagram.com
 */
async function fetchCsrfToken(sessionId, dsUserId) {
    try {
        const res = await axios.get('https://www.instagram.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}`
            },
            httpsAgent: ipv4Agent,
            maxRedirects: 3,
            validateStatus: () => true
        });

        const cookies = res.headers['set-cookie'] || [];
        const isSessionDeleted = cookies.some(c => c.includes('sessionid=deleted') || c.includes('sessionid=""'));
        if (isSessionDeleted) {
            console.warn('[IGDirect] ⚠️ Cookie sessionid Instagram kedaluwarsa / dihapus oleh Instagram!');
            triggerIgSessionExpiredAlert('sessionid=deleted (Cookie kedaluwarsa)');
        }

        let csrf = '';
        for (const c of cookies) {
            if (c.includes('csrftoken=')) {
                csrf = c.split('csrftoken=')[1].split(';')[0];
                break;
            }
        }
        return csrf || 'SKgFS6EFz6dpdUJJTBrQBGf5tHIUGVDG';
    } catch (e) {
        console.warn('[IGDirect] fetchCsrfToken warning, using fallback token:', e.message);
        return 'SKgFS6EFz6dpdUJJTBrQBGf5tHIUGVDG';
    }
}

function escapeXml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const SOFT_BLUE_THEMES = [
    {
        dayIndex: 0,
        dayName: 'Minggu',
        themeName: 'Clean Azure',
        badgeText: 'SUNDAY EDITION • RESMI',
        bgGradient: { from: '#f8fafc', mid: '#f0f7ff', to: '#e0f2fe' },
        ambientLight1: 'rgba(2, 132, 199, 0.08)',
        ambientLight2: 'rgba(56, 189, 248, 0.06)',
        primaryColor: '#0284c7',
        secondaryColor: '#0369a1',
        accentBadgeBg: '#e0f2fe',
        accentBadgeBorder: '#bae6fd',
        accentBadgeText: '#0369a1',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 1,
        dayName: 'Senin',
        themeName: 'Royal Cobalt',
        badgeText: 'CYBER EDITION • SENIN',
        bgGradient: { from: '#ffffff', mid: '#f4f8fe', to: '#e8f1fc' },
        ambientLight1: 'rgba(37, 99, 235, 0.08)',
        ambientLight2: 'rgba(96, 165, 250, 0.06)',
        primaryColor: '#2563eb',
        secondaryColor: '#1d4ed8',
        accentBadgeBg: '#eff6ff',
        accentBadgeBorder: '#bfdbfe',
        accentBadgeText: '#1d4ed8',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 2,
        dayName: 'Selasa',
        themeName: 'Sapphire Fintech',
        badgeText: 'SAPPHIRE PRO • SELASA',
        bgGradient: { from: '#f8fafc', mid: '#eff6ff', to: '#dbeafe' },
        ambientLight1: 'rgba(29, 78, 216, 0.08)',
        ambientLight2: 'rgba(59, 130, 246, 0.06)',
        primaryColor: '#1d4ed8',
        secondaryColor: '#2563eb',
        accentBadgeBg: '#e0f2fe',
        accentBadgeBorder: '#93c5fd',
        accentBadgeText: '#1e40af',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 3,
        dayName: 'Rabu',
        themeName: 'Ice Ocean',
        badgeText: 'VERIFIED SHIELD • RABU',
        bgGradient: { from: '#ffffff', mid: '#f0fdfa', to: '#e0f2fe' },
        ambientLight1: 'rgba(14, 165, 233, 0.08)',
        ambientLight2: 'rgba(6, 182, 212, 0.06)',
        primaryColor: '#0284c7',
        secondaryColor: '#0891b2',
        accentBadgeBg: '#e0f2fe',
        accentBadgeBorder: '#bae6fd',
        accentBadgeText: '#0369a1',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 4,
        dayName: 'Kamis',
        themeName: 'Navy Minimalist',
        badgeText: 'VIP EXCLUSIVE • KAMIS',
        bgGradient: { from: '#f8fafc', mid: '#f1f5f9', to: '#e2e8f0' },
        ambientLight1: 'rgba(30, 58, 138, 0.08)',
        ambientLight2: 'rgba(59, 130, 246, 0.06)',
        primaryColor: '#1e3a8a',
        secondaryColor: '#2563eb',
        accentBadgeBg: '#eff6ff',
        accentBadgeBorder: '#cbd5e1',
        accentBadgeText: '#1e3a8a',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 5,
        dayName: 'Jumat',
        themeName: 'Pearl Cerulean',
        badgeText: 'GOLDEN STANDARD • JUMAT',
        bgGradient: { from: '#ffffff', mid: '#f0f9ff', to: '#e0f2fe' },
        ambientLight1: 'rgba(2, 132, 199, 0.09)',
        ambientLight2: 'rgba(37, 99, 235, 0.06)',
        primaryColor: '#0284c7',
        secondaryColor: '#1d4ed8',
        accentBadgeBg: '#e0f2fe',
        accentBadgeBorder: '#bae6fd',
        accentBadgeText: '#0369a1',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    },
    {
        dayIndex: 6,
        dayName: 'Sabtu',
        themeName: 'Electric Ice',
        badgeText: 'WEEKEND EXPRESS • SABTU',
        bgGradient: { from: '#ffffff', mid: '#f4f8fe', to: '#dbeafe' },
        ambientLight1: 'rgba(37, 99, 235, 0.09)',
        ambientLight2: 'rgba(14, 165, 233, 0.07)',
        primaryColor: '#2563eb',
        secondaryColor: '#0284c7',
        accentBadgeBg: '#eff6ff',
        accentBadgeBorder: '#bfdbfe',
        accentBadgeText: '#1d4ed8',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1'
    }
];

function getSoftDailyTheme(dayIndex = new Date().getDay()) {
    return SOFT_BLUE_THEMES[dayIndex % 7];
}

/**
 * Format gambar Story (1080x1920) dengan Soft White & Blue Theme, Vektor Presisi, & Visual Music Sticker
 */
async function prepareImageForStory(imageBuffer, trackInfo = null, options = {}) {
    const targetW = 1080;
    const targetH = 1920;
    const track = trackInfo || getRandomTrack();
    const safeTitle = escapeXml(track.title);
    const safeArtist = escapeXml(track.artist);
    const theme = getSoftDailyTheme();

    const meta = await sharp(imageBuffer).metadata();

    // 1. Jika gambar sudah berukuran 1080x1920 (Banner Penuh SVG Open / Disclaimer / Rivera) atau eksplisit full screen:
    if ((meta.width === targetW && meta.height === targetH) || options.isFullScreen) {
        if (options.hasMusicSticker) {
            // Sudah memiliki music sticker langsung di kanvas
            return await sharp(imageBuffer).jpeg({ quality: 95 }).toBuffer();
        }

        // Overlay music sticker saja di safe zone y=150 tanpa mengubah ukuran atau memperkecil gambar dasar
        const musicBarSvg = `
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="musicShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.08"/>
                </filter>
            </defs>
            <g transform="translate(150, 150)" filter="url(#musicShadow)">
                <rect width="780" height="66" rx="33" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="1.8" />
                <circle cx="38" cy="33" r="19" fill="#eff6ff" stroke="${theme.primaryColor}" stroke-width="1.5"/>
                <path d="M35 40V27l8-2v11" fill="none" stroke="${theme.primaryColor}" stroke-width="2" stroke-linecap="round"/>
                <circle cx="33" cy="39" r="2.8" fill="${theme.primaryColor}"/>
                <circle cx="41" cy="37" r="2.8" fill="${theme.primaryColor}"/>
                <text x="74" y="30" font-family="Arial, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#0f172a">${safeTitle.slice(0, 32)}</text>
                <text x="74" y="50" font-family="Arial, -apple-system, sans-serif" font-size="15" fill="#64748b">${safeArtist.slice(0, 36)}</text>
                <g transform="translate(680, 18)">
                    <rect x="0" y="10" width="4" height="18" rx="2" fill="${theme.primaryColor}" />
                    <rect x="8" y="4" width="4" height="24" rx="2" fill="${theme.secondaryColor}" />
                    <rect x="16" y="14" width="4" height="14" rx="2" fill="${theme.primaryColor}" />
                    <rect x="24" y="2" width="4" height="26" rx="2" fill="${theme.secondaryColor}" />
                    <rect x="32" y="8" width="4" height="20" rx="2" fill="${theme.primaryColor}" />
                    <rect x="40" y="16" width="4" height="12" rx="2" fill="${theme.secondaryColor}" />
                </g>
            </g>
        </svg>
        `;
        return await sharp(imageBuffer)
            .composite([{ input: Buffer.from(musicBarSvg), top: 0, left: 0 }])
            .jpeg({ quality: 95 })
            .toBuffer();
    }

    // 2. Mode Screenshot Testimoni Pelanggan:
    // Gunakan kanvas Soft White & Blue 100% Full Canvas Edge-to-Edge (Bukan Dark Blur / AI Slop!)
    const bgSvg = `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="softBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${theme.bgGradient.from}"/>
                <stop offset="50%" stop-color="${theme.bgGradient.mid}"/>
                <stop offset="100%" stop-color="${theme.bgGradient.to}"/>
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="90"/>
            </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#softBg)"/>
        <circle cx="540" cy="380" r="380" fill="${theme.ambientLight1}" filter="url(#softGlow)"/>
        <circle cx="540" cy="1200" r="420" fill="${theme.ambientLight2}" filter="url(#softGlow)"/>
    </svg>
    `;

    // Pastikan ukuran screenshot muat LEBIH FULL (lebar 1020px, sisa margin 30px samping) & safe zone (y: 145 s/d 1680)
    const maxContentW = 1020;
    const maxContentH = 1450;

    const resizedScreenshot = await sharp(imageBuffer)
        .resize(maxContentW, maxContentH, { fit: 'inside' })
        .toBuffer();

    const resizedMeta = await sharp(resizedScreenshot).metadata();

    // Mask rounded corners 20px agar presisi, rapi dan modern
    const roundedCornersSvg = Buffer.from(`
        <svg width="${resizedMeta.width}" height="${resizedMeta.height}">
            <rect x="0" y="0" width="${resizedMeta.width}" height="${resizedMeta.height}" rx="20" fill="#ffffff"/>
        </svg>
    `);

    const framedScreenshot = await sharp(resizedScreenshot)
        .composite([{ input: roundedCornersSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

    const cardX = Math.round((targetW - resizedMeta.width) / 2);
    const cardY = Math.round(225 + (maxContentH - resizedMeta.height) / 2);

    const overlaySvg = `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.08"/>
            </filter>
        </defs>

        <!-- Music Player Bar (Safe Zone y=145, height=66) -->
        <g transform="translate(140, 145)" filter="url(#cardShadow)">
            <rect width="800" height="66" rx="33" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="1.8" />
            <circle cx="40" cy="33" r="20" fill="#eff6ff" stroke="${theme.primaryColor}" stroke-width="1.5"/>
            <path d="M37 40V27l8-2v11" fill="none" stroke="${theme.primaryColor}" stroke-width="2" stroke-linecap="round"/>
            <circle cx="35" cy="39" r="2.8" fill="${theme.primaryColor}"/>
            <circle cx="43" cy="37" r="2.8" fill="${theme.primaryColor}"/>
            <text x="74" y="30" font-family="Arial, -apple-system, sans-serif" font-size="19" font-weight="bold" fill="#0f172a">${safeTitle.slice(0, 32)}</text>
            <text x="74" y="50" font-family="Arial, -apple-system, sans-serif" font-size="15" fill="#64748b">${safeArtist.slice(0, 36)}</text>
            <g transform="translate(700, 18)">
                <rect x="0" y="10" width="4" height="18" rx="2" fill="${theme.primaryColor}" />
                <rect x="8" y="4" width="4" height="24" rx="2" fill="${theme.secondaryColor}" />
                <rect x="16" y="14" width="4" height="14" rx="2" fill="${theme.primaryColor}" />
                <rect x="24" y="2" width="4" height="26" rx="2" fill="${theme.secondaryColor}" />
                <rect x="32" y="8" width="4" height="20" rx="2" fill="${theme.primaryColor}" />
                <rect x="40" y="16" width="4" height="12" rx="2" fill="${theme.secondaryColor}" />
            </g>
        </g>

        <!-- Bingkai Luar & Bayangan Halus Screenshot -->
        <rect x="${cardX - 3}" y="${cardY - 3}" width="${resizedMeta.width + 6}" height="${resizedMeta.height + 6}" rx="23" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8" filter="url(#cardShadow)"/>
    </svg>
    `;

    return await sharp(Buffer.from(bgSvg))
        .composite([
            { input: Buffer.from(overlaySvg), top: 0, left: 0 },
            { input: framedScreenshot, top: cardY, left: cardX }
        ])
        .jpeg({ quality: 95 })
        .toBuffer();
}

/**
 * Format gambar Feed (1080x1350)
 */
async function prepareImageForFeed(imageBuffer, trackInfo = null) {
    const track = trackInfo || getRandomTrack();
    const safeTitle = escapeXml(track.title);
    const safeArtist = escapeXml(track.artist);
    const targetW = 1080;
    const targetH = 1350;

    const formattedBase = await sharp(imageBuffer)
        .resize(targetW, targetH, { fit: 'contain', background: '#090d16' })
        .toBuffer();

    const musicStickerSvg = `
        <svg width="${targetW}" height="${targetH}">
            <g transform="translate(40, 40)">
                <rect width="480" height="56" rx="28" fill="#090d16" fill-opacity="0.88" stroke="#38bdf8" stroke-width="1.5" />
                <text x="24" y="35" font-family="Arial, sans-serif" font-size="18" fill="#38bdf8">🎵</text>
                <text x="50" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">${safeTitle} • <tspan fill="#94a3b8" font-weight="normal">${safeArtist}</tspan></text>
            </g>
        </svg>
    `;

    return await sharp(formattedBase)
        .composite([{ input: Buffer.from(musicStickerSvg), top: 0, left: 0 }])
        .jpeg({ quality: 92 })
        .toBuffer();
}

/**
 * Mengonversi gambar 1080x1920 dan file lagu MP3 menjadi video MP4 berdurasi 15 detik (dimulai dari reff/drop bass)
 */
async function generateStoryVideo(formattedImageBuffer, track) {
    try {
        let audioPath = track?.filename ? path.join(AUDIO_DIR, track.filename) : null;
        if (!audioPath || !fs.existsSync(audioPath)) {
            const files = fs.existsSync(AUDIO_DIR) ? fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')) : [];
            if (files.length > 0) {
                audioPath = path.join(AUDIO_DIR, files[0]);
            }
        }

        if (!audioPath || !fs.existsSync(audioPath)) {
            console.warn('[IGDirect] Audio MP3 tidak ditemukan, fallback ke unggah foto biasa.');
            return null;
        }

        const tempDir = path.join(os.tmpdir(), 'ig_story_video');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const randId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const tempImg = path.join(tempDir, `img_${randId}.jpg`);
        const tempVid = path.join(tempDir, `vid_${randId}.mp4`);

        // Resize ke 720x1280 (HD 9:16) agar encoding FFmpeg di server sangat cepat (~2-3 detik di STB) dan hemat resource
        const scaledImgBuffer = await sharp(formattedImageBuffer)
            .resize(720, 1280, { fit: 'fill' })
            .jpeg({ quality: 90 })
            .toBuffer();

        fs.writeFileSync(tempImg, scaledImgBuffer);

        const rawStartSec = track?.reffSec || 10;
        const startSec = Math.max(0, Math.min(rawStartSec, 14));

        // Encode video tepat 15 detik dengan libx264 ultrafast + aac stereo 44.1kHz
        // -stream_loop -1 menjamin musik TIDAK PERNAH terputus di tengah jalan meskipun file sampel pendek
        await execFileAsync(FFMPEG_BIN, [
            '-y',
            '-loop', '1',
            '-i', tempImg,
            '-ss', String(startSec),
            '-stream_loop', '-1',
            '-i', audioPath,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'stillimage',
            '-t', '15',
            '-pix_fmt', 'yuv420p',
            '-r', '15',
            '-crf', '26',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-shortest',
            '-movflags', '+faststart',
            tempVid
        ], { timeout: 90000 });

        if (fs.existsSync(tempVid)) {
            const videoBuffer = fs.readFileSync(tempVid);
            try { fs.unlinkSync(tempImg); } catch (e) {}
            try { fs.unlinkSync(tempVid); } catch (e) {}
            return {
                videoBuffer,
                durationMs: 15000,
                width: 720,
                height: 1280
            };
        }
    } catch (e) {
        console.warn('[IGDirect] Peringatan: Gagal merender video FFmpeg (fallback ke foto):', e.message);
    }
    return null;
}

/**
 * Mengonversi gambar 1080x1350 (4:5) dan file lagu MP3 menjadi video Feed berdurasi 15 detik
 */
async function generateFeedVideo(formattedImageBuffer, track) {
    try {
        let audioPath = track?.filename ? path.join(AUDIO_DIR, track.filename) : null;
        if (!audioPath || !fs.existsSync(audioPath)) {
            const files = fs.existsSync(AUDIO_DIR) ? fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')) : [];
            if (files.length > 0) {
                audioPath = path.join(AUDIO_DIR, files[0]);
            }
        }

        if (!audioPath || !fs.existsSync(audioPath)) return null;

        const tempDir = path.join(os.tmpdir(), 'ig_feed_video');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const randId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const tempImg = path.join(tempDir, `feed_img_${randId}.jpg`);
        const tempVid = path.join(tempDir, `feed_vid_${randId}.mp4`);

        // Resize ke 720x900 (aspek 4:5 standar Feed Instagram)
        const scaledImgBuffer = await sharp(formattedImageBuffer)
            .resize(720, 900, { fit: 'fill' })
            .jpeg({ quality: 90 })
            .toBuffer();

        fs.writeFileSync(tempImg, scaledImgBuffer);

        const rawStartSec = track?.reffSec || 10;
        const startSec = Math.max(0, Math.min(rawStartSec, 14));

        await execFileAsync(FFMPEG_BIN, [
            '-y',
            '-loop', '1',
            '-i', tempImg,
            '-ss', String(startSec),
            '-stream_loop', '-1',
            '-i', audioPath,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'stillimage',
            '-t', '15',
            '-pix_fmt', 'yuv420p',
            '-r', '15',
            '-crf', '26',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-shortest',
            '-movflags', '+faststart',
            tempVid
        ], { timeout: 90000 });

        if (fs.existsSync(tempVid)) {
            const videoBuffer = fs.readFileSync(tempVid);
            try { fs.unlinkSync(tempImg); } catch (e) {}
            try { fs.unlinkSync(tempVid); } catch (e) {}
            return {
                videoBuffer,
                durationMs: 15000,
                width: 720,
                height: 900
            };
        }
    } catch (e) {
        console.warn('[IGDirect] Gagal render Feed Video FFmpeg:', e.message);
    }
    return null;
}

/**
 * Publikasikan konten ke Instagram Story (Video bersuara lagu atau Foto fallback)
 */
async function publishToStory(imageBuffer, customTrack = null, options = {}) {
    const { sessionId, dsUserId } = getSessionCredentials();
    const track = customTrack || getRandomTrack();
    const formattedBuffer = await prepareImageForStory(imageBuffer, track, options);

    const csrf = await fetchCsrfToken(sessionId, dsUserId);
    const uploadId = Date.now().toString();
    const entityName = `fb_uploader_${uploadId}`;

    console.log(`[IGDirect] Menyiapkan konten Instagram Story dengan musik [${track.title} - ${track.artist}]...`);

    // Render video MP4 15 detik bersuara lagu nyata (Option B)
    const videoData = await generateStoryVideo(formattedBuffer, track);

    try {
        if (!sessionId) {
            triggerIgSessionExpiredAlert('Sesi Instagram kosong');
            throw new Error('Sesi Instagram belum dikonfigurasi.');
        }

        if (videoData && videoData.videoBuffer) {
            console.log(`[IGDirect] Mengunggah Story Video (MP4 bersuara musik nyata, size: ${videoData.videoBuffer.length} bytes)...`);

            // 1. Upload file binary video ke rupload_igvideo (720x1280)
            await axios.post(`https://www.instagram.com/rupload_igvideo/${entityName}`, videoData.videoBuffer, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'X-Instagram-Rupload-Params': JSON.stringify({
                        media_type: 2,
                        upload_id: uploadId,
                        upload_media_height: 1280,
                        upload_media_width: 720,
                        upload_media_duration_ms: videoData.durationMs
                    }),
                    'X-Entity-Name': entityName,
                    'X-Entity-Length': videoData.videoBuffer.length,
                    'X-Entity-Type': 'video/mp4',
                    'Offset': 0,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'video/mp4',
                    'Content-Length': videoData.videoBuffer.length
                },
                httpsAgent: ipv4Agent
            });

            // 2. Upload cover photo ke rupload_igphoto (wajib 720x1280 cocok dengan video)
            const coverBuffer = await sharp(formattedBuffer)
                .resize(720, 1280, { fit: 'fill' })
                .jpeg({ quality: 90 })
                .toBuffer();

            await axios.post(`https://www.instagram.com/rupload_igphoto/${entityName}`, coverBuffer, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'X-Instagram-Rupload-Params': JSON.stringify({
                        media_type: 2,
                        upload_id: uploadId,
                        upload_media_height: 1280,
                        upload_media_width: 720
                    }),
                    'X-Entity-Name': entityName,
                    'X-Entity-Length': coverBuffer.length,
                    'X-Entity-Type': 'image/jpeg',
                    'Offset': 0,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'image/jpeg',
                    'Content-Length': coverBuffer.length
                },
                httpsAgent: ipv4Agent
            });

            // Jeda 2.5 detik agar transcode server Instagram siap
            await new Promise(r => setTimeout(r, 2500));

            // 3. Konfigurasi penerbitan video ke Story
            const body = new URLSearchParams({
                upload_id: uploadId,
                source_type: '4',
                configure_mode: '1',
                video_result: ''
            }).toString();

            const configRes = await axios.post('https://www.instagram.com/api/v1/media/configure_to_story/?video=1', body, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                httpsAgent: ipv4Agent
            });

            const publishedMediaId = configRes.data?.media?.id || configRes.data?.media?.pk || uploadId;
            console.log(`[IGDirect] ✅ Berhasil terbit di Instagram Story (Video dengan Musik [${track.title}])! Media ID:`, publishedMediaId);
            return {
                success: true,
                mediaId: publishedMediaId,
                isVideo: true,
                videoBuffer: videoData.videoBuffer,
                imageBuffer: formattedBuffer,
                track
            };
        } else {
            // Fallback Foto Statis jika ffmpeg tidak tersedia
            console.log(`[IGDirect] Mengunggah konten ke Instagram Story (Mode Foto)...`);
            await axios.post(`https://www.instagram.com/rupload_igphoto/${entityName}`, formattedBuffer, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'X-Instagram-Rupload-Params': JSON.stringify({
                        media_type: 1,
                        upload_id: uploadId,
                        upload_media_height: 1920,
                        upload_media_width: 1080
                    }),
                    'X-Entity-Name': entityName,
                    'X-Entity-Length': formattedBuffer.length,
                    'X-Entity-Type': 'image/jpeg',
                    'Offset': 0,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'image/jpeg',
                    'Content-Length': formattedBuffer.length
                },
                httpsAgent: ipv4Agent
            });

            const body = new URLSearchParams({
                upload_id: uploadId,
                source_type: '4',
                configure_mode: '1'
            }).toString();

            const configRes = await axios.post('https://www.instagram.com/api/v1/media/configure_to_story/', body, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                httpsAgent: ipv4Agent
            });

            const publishedMediaId = configRes.data?.media?.id || configRes.data?.media?.pk || uploadId;
            console.log('[IGDirect] ✅ Berhasil terbit di Instagram Story (Foto)! Media ID:', publishedMediaId);
            return {
                success: true,
                mediaId: publishedMediaId,
                isVideo: false,
                videoBuffer: null,
                imageBuffer: formattedBuffer,
                track
            };
        }
    } catch (err) {
        checkAndNotifyIfSessionExpired(err);
        console.error('[IGDirect] ❌ Gagal menerbitkan Instagram Story:', err.response?.data || err.message);
        return {
            success: false,
            error: err.response?.data?.message || err.message,
            mediaId: null,
            isVideo: Boolean(videoData?.videoBuffer),
            videoBuffer: videoData?.videoBuffer || null,
            imageBuffer: formattedBuffer,
            track
        };
    }
}

/**
 * Hapus Story / Media di Instagram via Private API
 */
async function deleteInstagramStory(mediaId) {
    try {
        const { sessionId, dsUserId } = getSessionCredentials();
        if (!sessionId || !dsUserId) {
            console.warn('[IGDirect] Tidak ada credentials Instagram untuk menghapus story.');
            return { success: false, message: 'Tidak ada session Instagram.' };
        }
        const csrf = await fetchCsrfToken(sessionId, dsUserId);
        const cleanMediaId = String(mediaId).split('_')[0];

        const endpoints = [
            `https://www.instagram.com/api/v1/media/${cleanMediaId}/delete/?media_type=VIDEO`,
            `https://www.instagram.com/api/v1/media/${cleanMediaId}/delete/?media_type=PHOTO`,
            `https://i.instagram.com/api/v1/media/${cleanMediaId}/delete/`
        ];

        for (const url of endpoints) {
            try {
                const body = new URLSearchParams({
                    media_id: cleanMediaId,
                    _csrftoken: csrf,
                    _uid: dsUserId
                }).toString();

                const res = await axios.post(url, body, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'X-IG-App-ID': '936619743392459',
                        'X-CSRFToken': csrf,
                        'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    httpsAgent: ipv4Agent
                });

                if (res.data?.did_delete || res.data?.status === 'ok') {
                    console.log(`[IGDirect] ✅ Berhasil menghapus story IG (Media ID: ${cleanMediaId})`);
                    return { success: true, data: res.data };
                }
            } catch (err) {
                console.warn(`[IGDirect] Percobaan hapus di ${url}:`, err.response?.data?.message || err.message);
            }
        }
        return { success: false, message: 'Instagram menolak request hapus media.' };
    } catch (e) {
        console.error('[IGDirect] Error deleteInstagramStory:', e.message);
        return { success: false, message: e.message };
    }
}

/**
 * Publikasikan konten ke Instagram Feed (Video dengan Musik Reff atau Foto fallback)
 */
async function publishToFeed(imageBuffer, caption = '', customTrack = null) {
    const { sessionId, dsUserId } = getSessionCredentials();
    const track = customTrack || getRandomTrack();
    const formattedBuffer = await prepareImageForFeed(imageBuffer, track);

    const csrf = await fetchCsrfToken(sessionId, dsUserId);
    const uploadId = Date.now().toString();
    const entityName = `fb_uploader_${uploadId}`;

    const fullCaption = (caption || 'Testimoni Pembayaran & Layanan Prioritas Ry-ITSolutions') + 
        `\n\n🎵 Musik: ${track.title} - ${track.artist}` +
        '\n\n---\n🌐 Website: https://ry-itsolutionts.web.id\n⚡ Unlock Sinyal • Tembak Paket • Cek CEIR\n#ryitsolutions #unlocksinyalsolo #testimoni #unlocksinyal';

    console.log(`[IGDirect] Mengunggah konten ke Instagram Feed dengan musik [${track.title}]...`);

    // Coba render Video MP4 15 detik dengan musik reff / jedag-jedug
    const videoData = await generateFeedVideo(formattedBuffer, track);

    if (videoData && videoData.videoBuffer) {
        try {
            console.log(`[IGDirect] Mengunggah Feed Video (MP4 bersuara musik nyata, size: ${videoData.videoBuffer.length} bytes)...`);

            // 1. Upload file binary video ke rupload_igvideo
            await axios.post(`https://www.instagram.com/rupload_igvideo/${entityName}`, videoData.videoBuffer, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'X-Instagram-Rupload-Params': JSON.stringify({
                        media_type: 2,
                        upload_id: uploadId,
                        upload_media_height: 900,
                        upload_media_width: 720,
                        upload_media_duration_ms: videoData.durationMs
                    }),
                    'X-Entity-Name': entityName,
                    'X-Entity-Length': videoData.videoBuffer.length,
                    'X-Entity-Type': 'video/mp4',
                    'Offset': 0,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'video/mp4',
                    'Content-Length': videoData.videoBuffer.length
                },
                httpsAgent: ipv4Agent
            });

            // 2. Upload cover photo ke rupload_igphoto
            const coverBuffer = await sharp(formattedBuffer)
                .resize(720, 900, { fit: 'fill' })
                .jpeg({ quality: 90 })
                .toBuffer();

            await axios.post(`https://www.instagram.com/rupload_igphoto/${entityName}`, coverBuffer, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'X-Instagram-Rupload-Params': JSON.stringify({
                        media_type: 2,
                        upload_id: uploadId,
                        upload_media_height: 900,
                        upload_media_width: 720
                    }),
                    'X-Entity-Name': entityName,
                    'X-Entity-Length': coverBuffer.length,
                    'X-Entity-Type': 'image/jpeg',
                    'Offset': 0,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'image/jpeg',
                    'Content-Length': coverBuffer.length
                },
                httpsAgent: ipv4Agent
            });

            await new Promise(r => setTimeout(r, 2500));

            // 3. Konfigurasi penerbitan video ke Feed
            const body = new URLSearchParams({
                upload_id: uploadId,
                caption: fullCaption,
                source_type: '4',
                video_result: '',
                clips_share_preview_to_feed: '1'
            }).toString();

            const configRes = await axios.post('https://www.instagram.com/api/v1/media/configure/?video=1', body, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                httpsAgent: ipv4Agent
            });

            const publishedMediaId = configRes.data?.media?.id || configRes.data?.media?.pk || uploadId;
            console.log(`[IGDirect] ✅ Berhasil terbit di Instagram Feed (Video dengan Musik [${track.title}])! Media ID:`, publishedMediaId);
            return {
                success: true,
                mediaId: publishedMediaId,
                isVideo: true,
                videoBuffer: videoData.videoBuffer,
                track
            };
        } catch (vidErr) {
            console.warn('[IGDirect] Upload feed video gagal, fallback ke posting foto feed:', vidErr.message);
        }
    }

    try {
        // Fallback Foto Statis ke Feed
        console.log(`[IGDirect] Mengunggah konten ke Instagram Feed (Mode Foto)...`);
        await axios.post(`https://www.instagram.com/rupload_igphoto/${entityName}`, formattedBuffer, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'X-IG-App-ID': '936619743392459',
                'X-CSRFToken': csrf,
                'X-Instagram-Rupload-Params': JSON.stringify({
                    media_type: 1,
                    upload_id: uploadId,
                    upload_media_height: 1350,
                    upload_media_width: 1080
                }),
                'X-Entity-Name': entityName,
                'X-Entity-Length': formattedBuffer.length,
                'X-Entity-Type': 'image/jpeg',
                'Offset': 0,
                'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                'Content-Type': 'image/jpeg',
                'Content-Length': formattedBuffer.length
            },
            httpsAgent: ipv4Agent
        });

        const body = new URLSearchParams({
            upload_id: uploadId,
            caption: fullCaption,
            source_type: '4'
        }).toString();

        const configRes = await axios.post('https://www.instagram.com/api/v1/media/configure/', body, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'X-IG-App-ID': '936619743392459',
                'X-CSRFToken': csrf,
                'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrf}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: ipv4Agent
        });

        const publishedMediaId = configRes.data?.media?.id || configRes.data?.media?.pk || uploadId;
        console.log('[IGDirect] ✅ Berhasil terbit di Instagram Feed (Foto)! Media ID:', publishedMediaId);
        return {
            success: true,
            mediaId: publishedMediaId,
            isVideo: false,
            track
        };
    } catch (err) {
        checkAndNotifyIfSessionExpired(err);
        console.error('[IGDirect] ❌ Gagal menerbitkan Instagram Feed:', err.response?.data || err.message);
        return {
            success: false,
            error: err.response?.data?.message || err.message,
            mediaId: null,
            isVideo: false,
            track
        };
    }
}

function generateSoftOpenSvg(theme, timestampWIB, dateWIB) {
    const targetW = 1080;
    const targetH = 1920;

    return `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="softOpenBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${theme.bgGradient.from}"/>
                <stop offset="50%" stop-color="${theme.bgGradient.mid}"/>
                <stop offset="100%" stop-color="${theme.bgGradient.to}"/>
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="90"/>
            </filter>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.04"/>
            </filter>
        </defs>

        <!-- 100% Full Canvas Edge-to-Edge Background -->
        <rect width="100%" height="100%" fill="url(#softOpenBg)"/>

        <!-- Subtle Ambient Light -->
        <circle cx="540" cy="380" r="380" fill="${theme.ambientLight1}" filter="url(#softGlow)"/>
        <circle cx="540" cy="1200" r="420" fill="${theme.ambientLight2}" filter="url(#softGlow)"/>

        <!-- Top Branding Logo (y=220) -->
        <g transform="translate(475, 220)" filter="url(#cardShadow)">
            <rect width="130" height="130" rx="28" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="2.5"/>
            <image href="${getAddRoamerLogoUri()}" x="8" y="8" width="114" height="114" preserveAspectRatio="xMidYMid meet"/>
        </g>

        <!-- Status Pill Badge -->
        <rect x="365" y="380" width="350" height="46" rx="23" fill="#dcfce7" stroke="#86efac" stroke-width="1.8"/>
        <circle cx="395" cy="403" r="7" fill="#16a34a"/>
        <text x="545" y="411" font-family="Arial, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#15803d" text-anchor="middle">ONLINE &amp; READY</text>

        <!-- Main Headlines -->
        <text x="540" y="500" font-family="Arial, -apple-system, sans-serif" font-size="74" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">WE ARE OPEN!</text>
        <text x="540" y="555" font-family="Arial, -apple-system, sans-serif" font-size="32" font-weight="900" fill="${theme.primaryColor}" text-anchor="middle">${theme.badgeText}</text>
        <text x="540" y="600" font-family="Arial, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#64748b" text-anchor="middle">${dateWIB} • Jam Operasional Aktif</text>

        <!-- Priority Services Card (y=645, height=520) -->
        <g transform="translate(70, 645)" filter="url(#cardShadow)">
            <rect width="940" height="520" rx="30" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
            
            <text x="470" y="62" font-family="Arial, -apple-system, sans-serif" font-size="30" font-weight="bold" fill="#0f172a" text-anchor="middle">LAYANAN PRIORITAS HARI INI</text>
            <line x1="60" y1="92" x2="880" y2="92" stroke="#e2e8f0" stroke-width="1.5"/>

            <!-- Item 1: Add Roamer -->
            <rect x="50" y="125" width="56" height="56" rx="14" fill="#eff6ff"/>
            <text x="78" y="162" font-family="Arial, sans-serif" font-size="28" fill="${theme.primaryColor}" text-anchor="middle">⚡</text>
            <text x="130" y="150" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0f172a">Layanan Add Roamer (Unlock Sinyal)</text>
            <text x="130" y="184" font-family="Arial, -apple-system, sans-serif" font-size="21" fill="#475569">Paket Resmi Durasi 1 Bulan &amp; 3 Bulan All Operator</text>
            <text x="130" y="214" font-family="Arial, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="${theme.primaryColor}">Mendukung: Telkomsel, Indosat, XL, Tri, SF</text>

            <!-- Item 2: Cek CEIR & Garansi -->
            <rect x="50" y="260" width="56" height="56" rx="14" fill="#f0fdf4"/>
            <text x="78" y="297" font-family="Arial, sans-serif" font-size="28" fill="#16a34a" text-anchor="middle">🔍</text>
            <text x="130" y="285" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0f172a">Cek Status CEIR &amp; Klaim Garansi</text>
            <text x="130" y="320" font-family="Arial, -apple-system, sans-serif" font-size="21" fill="#475569">Diagnostik legalitas database Bea Cukai &amp; Kemenperin terpercaya</text>

            <!-- Item 3: Transaksi Digital -->
            <rect x="50" y="380" width="56" height="56" rx="14" fill="#eff6ff"/>
            <text x="78" y="417" font-family="Arial, sans-serif" font-size="28" fill="${theme.secondaryColor}" text-anchor="middle">🛡️</text>
            <text x="130" y="405" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0f172a">Transaksi Aman, Transparan &amp; Bergaransi</text>
            <text x="130" y="440" font-family="Arial, -apple-system, sans-serif" font-size="21" font-weight="bold" fill="#059669">Tercatat otomatis ke dalam sistem nota digital web resmi</text>
        </g>

        <!-- Contact & Web Portal Card (y=1200, height=270) -->
        <g transform="translate(70, 1200)" filter="url(#cardShadow)">
            <rect width="940" height="270" rx="28" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="2"/>
            <text x="470" y="62" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0f172a" text-anchor="middle">Fast Response via WhatsApp &amp; Web</text>
            
            <g transform="translate(320, 122)">
                <circle cx="0" cy="0" r="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2.5"/>
                <ellipse cx="0" cy="0" rx="6" ry="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2"/>
                <line x1="-14" y1="0" x2="14" y2="0" stroke="${theme.primaryColor}" stroke-width="2"/>
            </g>
            <text x="350" y="131" font-family="Arial, -apple-system, sans-serif" font-size="34" font-weight="bold" fill="${theme.primaryColor}">ry-itsolutionts.web.id</text>

            <rect x="270" y="175" width="400" height="48" rx="24" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.2"/>
            <text x="470" y="206" font-family="Arial, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="${theme.primaryColor}" text-anchor="middle">Buka Mulai: ${timestampWIB} WIB</text>
        </g>
    </svg>
    `;
}

function generateSoftDisclaimerSvg(theme, musicTrack) {
    const targetW = 1080;
    const targetH = 1920;
    const track = musicTrack || getRandomTrack();
    const safeTitle = escapeXml(track.title);
    const safeArtist = escapeXml(track.artist);

    return `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="softDisclaimerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${theme.bgGradient.from}"/>
                <stop offset="50%" stop-color="${theme.bgGradient.mid}"/>
                <stop offset="100%" stop-color="${theme.bgGradient.to}"/>
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="90"/>
            </filter>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.04"/>
            </filter>
        </defs>

        <!-- 100% Full Canvas Edge-to-Edge Background -->
        <rect width="100%" height="100%" fill="url(#softDisclaimerBg)"/>

        <!-- Subtle Ambient Light -->
        <circle cx="540" cy="400" r="380" fill="${theme.ambientLight1}" filter="url(#softGlow)"/>
        <circle cx="540" cy="1250" r="420" fill="${theme.ambientLight2}" filter="url(#softGlow)"/>

        <!-- 1. Music Player Bar (In Safe Zone y=185) -->
        <g transform="translate(150, 185)" filter="url(#cardShadow)">
            <rect width="780" height="74" rx="37" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="1.8" />
            <circle cx="44" cy="37" r="22" fill="#eff6ff" stroke="${theme.primaryColor}" stroke-width="1.5"/>
            <!-- Music Vector Icon -->
            <path d="M41 45V31l8-2v11" fill="none" stroke="${theme.primaryColor}" stroke-width="2" stroke-linecap="round"/>
            <circle cx="39" cy="44" r="3" fill="${theme.primaryColor}"/>
            <circle cx="47" cy="42" r="3" fill="${theme.primaryColor}"/>
            <text x="82" y="34" font-family="Arial, -apple-system, sans-serif" font-size="21" font-weight="bold" fill="#0f172a">${safeTitle.slice(0, 32)}</text>
            <text x="82" y="56" font-family="Arial, -apple-system, sans-serif" font-size="16" fill="#64748b">${safeArtist.slice(0, 36)}</text>
            <g transform="translate(680, 22)">
                <rect x="0" y="10" width="4" height="20" rx="2" fill="${theme.primaryColor}" />
                <rect x="8" y="4" width="4" height="26" rx="2" fill="${theme.secondaryColor}" />
                <rect x="16" y="14" width="4" height="16" rx="2" fill="${theme.primaryColor}" />
                <rect x="24" y="2" width="4" height="28" rx="2" fill="${theme.secondaryColor}" />
                <rect x="32" y="8" width="4" height="22" rx="2" fill="${theme.primaryColor}" />
                <rect x="40" y="16" width="4" height="14" rx="2" fill="${theme.secondaryColor}" />
            </g>
        </g>

        <!-- 2. Header Branding & ADD ROAMER Emblem -->
        <g transform="translate(480, 285)" filter="url(#cardShadow)">
            <rect width="120" height="120" rx="26" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="2.5"/>
            <image href="${getAddRoamerLogoUri()}" x="6" y="6" width="108" height="108" preserveAspectRatio="xMidYMid meet"/>
        </g>

        <!-- Pill Badge -->
        <rect x="330" y="425" width="420" height="42" rx="21" fill="${theme.accentBadgeBg}" stroke="${theme.accentBadgeBorder}" stroke-width="1.6"/>
        <circle cx="355" cy="446" r="6" fill="${theme.primaryColor}"/>
        <text x="545" y="454" font-family="Arial, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="${theme.accentBadgeText}" text-anchor="middle">EDUKASI &amp; TRANSPARANSI • RESMI</text>

        <!-- Main Title -->
        <text x="540" y="535" font-family="Arial, -apple-system, sans-serif" font-size="58" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">DISCLAIMER</text>
        <text x="540" y="590" font-family="Arial, -apple-system, sans-serif" font-size="38" font-weight="900" fill="${theme.primaryColor}" text-anchor="middle" letter-spacing="1">LAYANAN ADD ROAMER</text>
        <text x="540" y="632" font-family="Arial, -apple-system, sans-serif" font-size="22" font-weight="500" fill="#64748b" text-anchor="middle">Wajib Dibaca Demi Keamanan &amp; Kenyamanan Bersama</text>

        <!-- 3. Card 1: Alert Tidak Ada Permanen (Clean Soft Rose) -->
        <g transform="translate(70, 665)" filter="url(#cardShadow)">
            <rect width="940" height="305" rx="26" fill="#fff1f2" stroke="#f43f5e" stroke-width="2"/>
            <rect x="30" y="24" width="48" height="48" rx="12" fill="#ffe4e6"/>
            <text x="54" y="56" font-family="Arial, sans-serif" font-size="26" text-anchor="middle" fill="#e11d48" font-weight="bold">✕</text>
            <text x="96" y="57" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#9f1239">TIDAK ADA ADD ROAMER PERMANEN</text>
            <line x1="30" y1="88" x2="910" y2="88" stroke="#fecdd3" stroke-width="1.2"/>

            <text x="35" y="132" font-family="Arial, -apple-system, sans-serif" font-size="22" fill="#4c0519">• Waspada penipuan oknum yang menjanjikan unblock permanen via Add Roamer.</text>
            <text x="35" y="174" font-family="Arial, -apple-system, sans-serif" font-size="22" fill="#4c0519">• Secara teknis arsitektur operator seluler, Add Roamer bersifat berjangka.</text>
            <text x="35" y="216" font-family="Arial, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#be123c">• Tidak ada bypass Add Roamer yang bisa aktif seumur hidup.</text>
            <text x="35" y="258" font-family="Arial, -apple-system, sans-serif" font-size="21" fill="#881337">  (Patuhi aturan resmi agar IMEI &amp; perangkat Anda selalu aman terlindungi).</text>
        </g>

        <!-- 4. Card 2: Durasi Resmi Yang Tersedia (Clean Soft Emerald) -->
        <g transform="translate(70, 995)" filter="url(#cardShadow)">
            <rect width="940" height="360" rx="26" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/>
            <rect x="30" y="24" width="48" height="48" rx="12" fill="#dcfce7"/>
            <text x="54" y="56" font-family="Arial, sans-serif" font-size="26" text-anchor="middle" fill="#059669" font-weight="bold">✓</text>
            <text x="96" y="57" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#065f46">HANYA TERSEDIA OPSI 1 BULAN &amp; 3 BULAN</text>
            <line x1="30" y1="88" x2="910" y2="88" stroke="#bbf7d0" stroke-width="1.2"/>

            <text x="35" y="132" font-family="Arial, -apple-system, sans-serif" font-size="22" fill="#064e3b">• Ry-ITSolutions hanya melayani paket resmi aktivasi 1 Bulan &amp; 3 Bulan.</text>
            <text x="35" y="174" font-family="Arial, -apple-system, sans-serif" font-size="22" fill="#064e3b">• Mendukung All Operator Indonesia: Telkomsel, Indosat, XL, Tri, SF.</text>
            <text x="35" y="216" font-family="Arial, -apple-system, sans-serif" font-size="22" fill="#064e3b">• Seluruh pengerjaan bergaransi penuh sesuai masa aktif yang dipilih.</text>
            <text x="35" y="258" font-family="Arial, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#047857">• Transaksi 100% transparan, aman &amp; tercatat otomatis</text>
            <text x="52" y="294" font-family="Arial, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#065f46">  ke dalam nota invoice digital resmi.</text>
        </g>

        <!-- 5. Card 3: Footer Kontak Resmi & Web (Clean Soft White-Blue) -->
        <g transform="translate(70, 1380)" filter="url(#cardShadow)">
            <rect width="940" height="200" rx="24" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="2"/>
            <text x="470" y="54" font-family="Arial, -apple-system, sans-serif" font-size="26" font-weight="bold" fill="#0f172a" text-anchor="middle">Konsultasi Resmi &amp; Cek IMEI</text>
            
            <!-- Clean Vector Globe -->
            <g transform="translate(320, 104)">
                <circle cx="0" cy="0" r="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2.5"/>
                <ellipse cx="0" cy="0" rx="6" ry="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2"/>
                <line x1="-14" y1="0" x2="14" y2="0" stroke="${theme.primaryColor}" stroke-width="2"/>
            </g>
            <text x="350" y="113" font-family="Arial, -apple-system, sans-serif" font-size="32" font-weight="bold" fill="${theme.primaryColor}">ry-itsolutionts.web.id</text>
            <text x="470" y="156" font-family="Arial, -apple-system, sans-serif" font-size="20" fill="#64748b" text-anchor="middle">Ry-ITSolutions • Solusi Digital &amp; Jaringan Terpercaya</text>
        </g>
    </svg>
    `;
}

/**
 * Buat dan Publikasikan Banner "OPEN TODAY" & "DISCLAIMER" ke Story
 */
async function publishOpenStory(options = {}) {
    const theme = getSoftDailyTheme();
    const timestampWIB = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
    const dateWIB = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const openTrack = getRandomTrack();
    const disclaimerTrack = getRandomTrack();

    const openSvg = generateSoftOpenSvg(theme, timestampWIB, dateWIB);
    const disclaimerSvg = generateSoftDisclaimerSvg(theme, disclaimerTrack);

    const [openBuffer, disclaimerBuffer] = await Promise.all([
        sharp(Buffer.from(openSvg)).jpeg({ quality: 95 }).toBuffer(),
        sharp(Buffer.from(disclaimerSvg)).jpeg({ quality: 95 }).toBuffer()
    ]);

    const results = {
        openStory: { instagram: null, whatsapp: null },
        disclaimerStory: { instagram: null, whatsapp: null }
    };

    // 1. Publikasi Story 1: "WE ARE OPEN!"
    try {
        results.openStory.instagram = await publishToStory(openBuffer, openTrack, { isFullScreen: true, hasMusicSticker: false });
    } catch (igErr) {
        console.error('[publishOpenStory] Gagal publish IG Story 1 (Open):', igErr.message);
        results.openStory.instagramError = igErr.message;
    }

    if (!options.igOnly) {
        try {
            const { publishWhatsAppStory } = require('./waBot');
            if (typeof publishWhatsAppStory === 'function') {
                const captionStory1 = `📢 *Ry-ITSolutions BUKA HARI INI!*\n\n` +
                    `⚡ Layanan Add Roamer (1 Bulan & 3 Bulan)\n` +
                    `🔍 Cek Status CEIR & Garansi\n\n` +
                    `🗓️ ${dateWIB}\n` +
                    `⏰ Buka: ${timestampWIB} WIB\n\n` +
                    `🌐 https://ry-itsolutionts.web.id`;
                const mediaToSend1 = results.openStory.instagram?.videoBuffer || openBuffer;
                const isVid1 = Boolean(results.openStory.instagram?.videoBuffer);
                results.openStory.whatsapp = await publishWhatsAppStory(mediaToSend1, captionStory1, isVid1);
            }
        } catch (waErr) {
            console.warn('[publishOpenStory] Warning saat posting WA Story 1 (Open):', waErr.message);
            results.openStory.whatsappError = waErr.message;
        }
    }

    // Jeda 2 detik sebelum mempublikasikan Story 2 (Disclaimer)
    await new Promise(r => setTimeout(r, 2000));

    // 2. Publikasi Story 2: "DISCLAIMER ADD ROAMER"
    try {
        results.disclaimerStory.instagram = await publishToStory(disclaimerBuffer, disclaimerTrack, { isFullScreen: true, hasMusicSticker: true });
    } catch (igErr2) {
        console.error('[publishOpenStory] Gagal publish IG Story 2 (Disclaimer):', igErr2.message);
        results.disclaimerStory.instagramError = igErr2.message;
    }

    if (!options.igOnly) {
        try {
            const { publishWhatsAppStory } = require('./waBot');
            if (typeof publishWhatsAppStory === 'function') {
                const captionStory2 = `⚠️ *DISCLAIMER RESMI ADD ROAMER*\n\n` +
                    `❌ *Tidak ada Add Roamer yang permanen.* Waspada penipuan!\n` +
                    `✅ *Hanya tersedia opsi 1 Bulan & 3 Bulan* (All Operator).\n\n` +
                    `🛡️ Garansi penuh & nota transaksi digital resmi.\n` +
                    `🌐 https://ry-itsolutionts.web.id`;
                const mediaToSend2 = results.disclaimerStory.instagram?.videoBuffer || disclaimerBuffer;
                const isVid2 = Boolean(results.disclaimerStory.instagram?.videoBuffer);
                results.disclaimerStory.whatsapp = await publishWhatsAppStory(mediaToSend2, captionStory2, isVid2);
            }
        } catch (waErr2) {
            console.warn('[publishOpenStory] Warning saat posting WA Story 2 (Disclaimer):', waErr2.message);
            results.disclaimerStory.whatsappError = waErr2.message;
        }
    }

    const anySuccess = results.openStory.instagram || results.openStory.whatsapp ||
        results.disclaimerStory.instagram || results.disclaimerStory.whatsapp;

    if (!anySuccess) {
        throw new Error('Gagal memposting Story Open & Disclaimer ke Instagram maupun WhatsApp Story.');
    }

    return results;
}

/**
 * Parser Pesan Rivera Group menggunakan Gemini 3.5 Flash dengan Fallback Heuristik Lokal
 */
async function parseRiveraMessage(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    // 1. Deteksi Cepat untuk Pesan Penyelesaian Antrean (DONE / DONE SLOW 3B / DONE ALL)
    if (/(\bdone\s*all\b|\b(done|selesai)\s*(slow|3b|fast)\b|\b(slow|3b|fast)\s*(done|selesai)\b|\b(3b|slow)\s*done\b|\bselesai\s*semua\b)/i.test(rawText)) {
        const upper = rawText.toUpperCase();
        const isFast = upper.includes("FAST");
        const isSlow = upper.includes("SLOW") || upper.includes("3B") || !isFast;

        let doneTitle = "DONE 3B SLOW";
        let services = [];

        if (isSlow && !isFast) {
            doneTitle = "DONE 3B SLOW";
            services = [
                { name: "3B SF SLOW", status: "DONE", desc: "Antrean Kloter Ini Sudah Selesai Diproses" }
            ];
        } else if (isFast && !isSlow) {
            doneTitle = "DONE 3B FAST";
            services = [
                { name: "3B SF FAST", status: "DONE", desc: "Antrean Fast Sudah Selesai Diproses" }
            ];
        } else {
            doneTitle = "DONE ALL";
            services = [
                { name: "3B SF SLOW", status: "DONE", desc: "Antrean Selesai Diproses" },
                { name: "3B SF FAST", status: "DONE", desc: "Antrean Selesai Diproses" }
            ];
        }

        return {
            type: "DONE_NOTIFICATION",
            title: doneTitle,
            badge: "BATCH COMPLETED • SELESAI",
            services: services,
            note: "3B SF Slow Selesai Diproses • Cek Status Resmi di Web"
        };
    }

    // 2. Coba Analisa dengan Google Gemini 3.5 Flash
    try {
        const { dbGet } = require('../config/db');
        const row = await dbGet("SELECT value FROM settings WHERE key = 'gemini_api_key'");
        const geminiApiKey = row?.value || process.env.GEMINI_API_KEY;

        if (geminiApiKey) {
            const prompt = `Kamu adalah AI parser pesan server provider sinyal/roamer Rivera Group.
Tugasmu adalah menganalisis pesan update status/slot berikut dan mengonversinya menjadi data JSON terstruktur.

ATURAN WAJIB (SANGAT KETAT):
1. DILARANG KERAS menyebutkan nama "Smartfren". Gunakan SELALU istilah "SF" (contoh: "3B SF Slow", "3B SF Fast").
2. DILARANG KERAS menyertakan nominal harga, angka rupiah (Rp/k/rb/ribu). Hapus total semua info harga!
3. Tentukan type pesan:
   - "SLOT_UPDATE": jika ada layanan yang buka/on/ready.
   - "PARTIAL_CLOSE": jika salah satu layanan full/off sementara layanan lain masih open.
   - "FULL_CLOSE": jika semua layanan ditutup/off/selesai.
   - "DONE_NOTIFICATION": jika berisi pengumuman done all/selesai.
   - "IRRELEVANT": jika hanya obrolan umum tanpa info status layanan.
4. Ekstrak daftar layanan (services):
   - "name": nama layanan (contoh: "3B SF SLOW", "3B SF FAST", "1B DIGIPOS").
   - "status": "READY" atau "FULL_SLOT" atau "CLOSED".
   - "desc": deskripsi singkat status/waktu pengerjaan tanpa harga (contoh: "Done Malam • Sent s/d Sore", "Proses Cepat < 15 Menit", "Ready Jalur Khusus Promo").
5. Output HANYA JSON murni tanpa blok markdown/backticks:
{
  "type": "SLOT_UPDATE",
  "title": "READY",
  "badge": "LIVE UPDATE",
  "services": [
    { "name": "3B SF SLOW", "status": "READY", "desc": "Done Malam • Sent s/d Sore" }
  ],
  "note": "Semua Bergaransi Tanpa Drama"
}

Pesan:
${rawText}`;

            for (const model of ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    const data = await res.json();
                    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                        const parsed = JSON.parse(text);
                        if (parsed && parsed.type) {
                            if (Array.isArray(parsed.services)) {
                                parsed.services.forEach(s => {
                                    if (s.name) s.name = s.name.replace(/smartfren/gi, 'SF').trim();
                                    if (s.desc) s.desc = s.desc.replace(/smartfren/gi, 'SF').replace(/rp\s*\d+[\d.,]*/gi, '').trim();
                                });
                            }
                            if (parsed.type === "SLOT_UPDATE" || parsed.type === "PARTIAL_CLOSE" || parsed.type === "FULL_CLOSE") {
                                const isCloseAll = parsed.type === "FULL_CLOSE";
                                const syncd = syncRiveraDailyServices(parsed.services || [], isCloseAll);
                                parsed.services = syncd;
                                const hasAnyReady = syncd.some(s => s.status === "READY");
                                const hasAnyClosed = syncd.some(s => s.status !== "READY");
                                if (syncd.length > 0 && !hasAnyReady) {
                                    parsed.type = "FULL_CLOSE";
                                    parsed.title = "CLOSED";
                                    parsed.badge = "ORDERAN KLOTER CLOSED";
                                } else if (hasAnyClosed && hasAnyReady) {
                                    parsed.type = "PARTIAL_CLOSE";
                                    parsed.title = "UPDATE SLOT";
                                    parsed.badge = "UPDATE STATUS LAYANAN";
                                    parsed.note = "Sebagian Jalur Tutup • Jalur Lain Ready";
                                } else {
                                    parsed.type = "SLOT_UPDATE";
                                    parsed.title = "READY";
                                    parsed.badge = "LIVE SERVER UPDATE";
                                }
                            }
                            return parsed;
                        }
                    }
                } catch (mErr) {
                    // Coba model berikutnya
                }
            }
        }
    } catch (e) {
        console.warn('[parseRiveraMessage] Gemini parsing fallback:', e.message);
    }

    // 3. Fallback Heuristik Lokal Lengkap (Zero failure risk)
    const upper = rawText.toUpperCase();
    const isCloseAll = /(CLOSE\s*ALL|OFF\s*SEMUA|TUTUP\s*SEMUA|FULL\s*SEMUA|STOP\s*ORDER|KLOTER\s*CLOSED|SEMUA\s*OFF)/i.test(upper);
    const services = [];

    // Deteksi SLOW (ON vs CLOSED)
    if (upper.includes("3B SF SLOW") || upper.includes("SLOW") || upper.includes("3B SLOW")) {
        const isClosed = /(SLOW.*(OFF|FULL|TUTUP|CLOSE|STOP|PENDING)|(OFF|FULL|TUTUP|CLOSE|STOP|PENDING).*SLOW)/i.test(upper);
        services.push({
            name: "3B SF SLOW",
            status: isClosed ? "CLOSED" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Done Malam • Sent s/d Sore"
        });
    }

    // Deteksi FAST (ON vs CLOSED)
    if (upper.includes("3B SF FAST") || upper.includes("FAST") || upper.includes("3B FAST")) {
        const isClosed = /(FAST.*(OFF|FULL|TUTUP|CLOSE|STOP|PENDING)|(OFF|FULL|TUTUP|CLOSE|STOP|PENDING).*FAST)/i.test(upper);
        services.push({
            name: "3B SF FAST",
            status: isClosed ? "CLOSED" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Proses Cepat Under 15 Menit"
        });
    }

    // Deteksi 1B / DIGIPOS
    if (upper.includes("1B") || upper.includes("DIGIPOS")) {
        const isClosed = /(DIGIPOS.*(OFF|FULL|TUTUP|CLOSE|STOP|PENDING)|(OFF|FULL|TUTUP|CLOSE|STOP|PENDING).*DIGIPOS|1B.*(OFF|FULL|TUTUP|CLOSE)|(OFF|FULL|TUTUP|CLOSE).*1B)/i.test(upper);
        services.push({
            name: "1B DIGIPOS",
            status: isClosed ? "CLOSED" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Ready Jalur Khusus Promo"
        });
    }

    // Jika ada kata umum 3B tanpa sebut fast/slow, tapi ada indikasi open
    if (services.length === 0 && (upper.includes("3B") || upper.includes("KLOTER") || upper.includes("SLOT"))) {
        const isClosed = /(OFF|FULL|TUTUP|CLOSE|STOP)/i.test(upper);
        services.push({
            name: "3B SF",
            status: isClosed ? "CLOSED" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Slot Tersedia Hari Ini"
        });
    }

    if (services.length === 0 && !isCloseAll) {
        return { type: "IRRELEVANT" };
    }

    // Sinkronkan status dengan catatan layanan aktif hari ini (Daily State)
    const synchronizedServices = syncRiveraDailyServices(services, isCloseAll);

    const hasAnyReady = synchronizedServices.some(s => s.status === "READY");
    const hasAnyClosed = synchronizedServices.some(s => s.status !== "READY");
    const isReallyAllClosed = isCloseAll || (synchronizedServices.length > 0 && !hasAnyReady);

    let finalType = "SLOT_UPDATE";
    let finalTitle = "READY";
    let finalBadge = "LIVE SERVER UPDATE";

    if (isReallyAllClosed) {
        finalType = "FULL_CLOSE";
        finalTitle = "CLOSED";
        finalBadge = "ORDERAN KLOTER CLOSED";
    } else if (hasAnyClosed && hasAnyReady) {
        finalType = "PARTIAL_CLOSE";
        finalTitle = "UPDATE SLOT";
        finalBadge = "UPDATE STATUS LAYANAN";
    } else {
        finalType = "SLOT_UPDATE";
        finalTitle = "READY";
        finalBadge = "LIVE SERVER UPDATE";
    }

    return {
        type: finalType,
        title: finalTitle,
        badge: finalBadge,
        services: synchronizedServices,
        note: (hasAnyClosed && hasAnyReady) ? "Sebagian Jalur Tutup • Jalur Lain Ready" : "Semua Bergaransi Tanpa Drama"
    };
}

const RIVERA_STATUS_FILE = path.resolve(__dirname, '../data/rivera_daily_status.json');

function getTodayWIBDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function loadRiveraDailyServices() {
    try {
        if (fs.existsSync(RIVERA_STATUS_FILE)) {
            const raw = JSON.parse(fs.readFileSync(RIVERA_STATUS_FILE, 'utf-8'));
            if (raw && raw.date === getTodayWIBDate() && Array.isArray(raw.services)) {
                return raw.services;
            }
        }
    } catch {}
    return [];
}

function saveRiveraDailyServices(services) {
    try {
        const dir = path.dirname(RIVERA_STATUS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(RIVERA_STATUS_FILE, JSON.stringify({
            date: getTodayWIBDate(),
            updatedAt: Date.now(),
            services
        }, null, 2));
    } catch (e) {
        console.warn('[RiveraStatus] Gagal simpan status harian:', e.message);
    }
}

/**
 * Sinkronisasi layanan Rivera berdasarkan riwayat hari berjalan:
 * - Layanan yang open (READY) ditambahkan ke daftar aktif hari ini.
 * - Layanan yang close diperbarui statusnya JIKA memang pernah open hari ini.
 * - Jika close all, semua layanan hari ini ditandai CLOSED.
 */
function syncRiveraDailyServices(incomingServices = [], isFullClose = false) {
    let currentServices = loadRiveraDailyServices();

    if (isFullClose) {
        if (currentServices.length > 0) {
            currentServices = currentServices.map(s => ({
                ...s,
                status: "CLOSED",
                desc: "Ditutup Sementara"
            }));
        } else {
            currentServices = [
                { name: "3B SF SLOW", status: "CLOSED", desc: "Ditutup Sementara" },
                { name: "3B SF FAST", status: "CLOSED", desc: "Ditutup Sementara" }
            ];
        }
        saveRiveraDailyServices(currentServices);
        return currentServices;
    }

    if (!Array.isArray(incomingServices) || incomingServices.length === 0) {
        return currentServices;
    }

    const norm = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    for (const inc of incomingServices) {
        const incNorm = norm(inc.name);
        const existingIdx = currentServices.findIndex(s => norm(s.name) === incNorm);

        if (existingIdx !== -1) {
            currentServices[existingIdx].status = inc.status;
            if (inc.desc) currentServices[existingIdx].desc = inc.desc;
        } else {
            // Sesuai aturan: hanya tambahkan jika statusnya READY (pernah dibuka hari ini)
            // Jika belum ada rekaman sama sekali hari ini, catat sebagai referensi awal
            if (inc.status === "READY" || currentServices.length === 0) {
                currentServices.push(inc);
            }
        }
    }

    saveRiveraDailyServices(currentServices);
    return currentServices;
}

/**
 * Generate Story 3 Graphic (1080x1920) untuk Update Slot & Status Rivera
 */
async function generateRiveraUpdateGraphic(parsedData) {
    const targetW = 1080;
    const targetH = 1920;
    const theme = getSoftDailyTheme();
    const dateWIB = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timestampWIB = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

    const isFullClose = parsedData.type === "FULL_CLOSE";
    const isPartialClose = parsedData.type === "PARTIAL_CLOSE";
    const isDone = parsedData.type === "DONE_NOTIFICATION";
    const isCloseListSlow = parsedData.type === "CLOSE_LIST_SLOW";

    const services = Array.isArray(parsedData.services) && parsedData.services.length > 0
        ? parsedData.services
        : [
            { name: "3B SF SLOW", status: isDone ? "DONE" : (isFullClose ? "CLOSED" : "READY"), desc: isDone ? "Antrean Kloter Selesai Diproses" : (isFullClose ? "Ditutup Sementara" : "Done Malam • Sent s/d Sore") },
            { name: "3B SF FAST", status: isDone ? "DONE" : (isFullClose ? "CLOSED" : "READY"), desc: isDone ? "Antrean Fast Selesai Diproses" : (isFullClose ? "Ditutup Sementara" : "Proses Cepat Under 15 Menit") }
        ];

    const cardsSvg = services.map((s, idx) => {
        const yPos = 595 + (idx * 155);
        const isCardDoneTonight = s.status === "DONE_TONIGHT";
        const isCardNextBatch = s.status === "NEXT_BATCH";
        const isCardDone = s.status === "DONE" || isDone;
        const isCardReady = s.status === "READY" && !isCardDone && !isCardDoneTonight && !isCardNextBatch;

        let badgeColor = "#059669";
        let badgeBg = "#dcfce7";
        let badgeBorder = "#86efac";
        let badgeText = "READY";
        let cardBg = "#ffffff";
        let cardBorder = "#cbd5e1";

        if (isCardDoneTonight) {
            badgeColor = "#059669";
            badgeBg = "#dcfce7";
            badgeBorder = "#86efac";
            badgeText = "DONE MALAM INI";
            cardBg = "#f0fdf4";
            cardBorder = "#bbf7d0";
        } else if (isCardNextBatch) {
            badgeColor = "#2563eb";
            badgeBg = "#eff6ff";
            badgeBorder = "#bfdbfe";
            badgeText = "KLOTER BESOK";
            cardBg = "#ffffff";
            cardBorder = "#cbd5e1";
        } else if (isCardDone) {
            badgeColor = "#059669";
            badgeBg = "#dcfce7";
            badgeBorder = "#86efac";
            badgeText = "SELESAI";
            cardBg = "#f0fdf4";
            cardBorder = "#bbf7d0";
        } else if (!isCardReady) {
            badgeColor = "#e11d48";
            badgeBg = "#ffe4e6";
            badgeBorder = "#fca5a5";
            badgeText = s.status === "FULL_SLOT" ? "FULL SLOT" : "CLOSED";
            cardBg = "#fff1f2";
            cardBorder = "#fecdd3";
        }

        const cleanName = escapeXml(s.name ? s.name.replace(/smartfren/gi, 'SF').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '') : '');
        const cleanDesc = escapeXml(s.desc ? s.desc.replace(/smartfren/gi, 'SF').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '') : '');

        return `
            <g transform="translate(80, ${yPos})">
                <rect width="920" height="135" rx="24" fill="${cardBg}" stroke="${cardBorder}" stroke-width="2"/>
                <text x="40" y="58" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#0f172a">${cleanName}</text>
                <text x="40" y="98" font-family="Arial, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#475569">${cleanDesc}</text>
                
                <!-- Status Pill -->
                <rect x="690" y="44" width="190" height="46" rx="23" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.6"/>
                <circle cx="715" cy="67" r="6" fill="${badgeColor}"/>
                <text x="785" y="74" font-family="Arial, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="${badgeColor}" text-anchor="middle">${badgeText}</text>
            </g>
        `;
    }).join("\n");

    // 5 Tampilan Desain Berbeda: ALL READY vs PARTIAL CLOSE vs FULL CLOSE vs DONE vs CLOSE_LIST_SLOW
    let badgeBgTop = "#dcfce7";
    let badgeStrokeTop = "#86efac";
    let badgeTextTop = "LIVE SERVER UPDATE";
    let badgeTextColorTop = "#15803d";
    let dotColorTop = "#16a34a";
    let mainTitle = "READY";
    let mainTitleFontSize = 76;
    let mainTitleLetterSpacing = 6;
    let mainTitleColor = "#0f172a";
    let mainSubTitle = "SLOT &amp; JALUR ON HARI INI";
    let mainSubTitleColor = theme.primaryColor;

    if (isCloseListSlow) {
        badgeBgTop = "#eff6ff";
        badgeStrokeTop = "#bfdbfe";
        badgeTextTop = "CUT-OFF KLOTER HARI INI";
        badgeTextColorTop = "#1e3a8a";
        dotColorTop = "#2563eb";
        mainTitle = "CLOSE LIST 3B SLOW";
        mainTitleFontSize = 52;
        mainTitleLetterSpacing = 3;
        mainTitleColor = "#1e3a8a";
        const cutoffLabel = parsedData.cutoffTime ? `${parsedData.cutoffTime} WIB` : "14.00 WIB";
        mainSubTitle = `ORDER SEBELUM ${cutoffLabel} SELESAI MALAM INI`;
        mainSubTitleColor = "#2563eb";
    } else if (isDone) {
        badgeBgTop = "#d1fae5";
        badgeStrokeTop = "#6ee7b7";
        badgeTextTop = "BATCH COMPLETED • SELESAI";
        badgeTextColorTop = "#047857";
        dotColorTop = "#059669";
        mainTitle = parsedData.title || "DONE 3B SLOW";
        mainTitleFontSize = 56;
        mainTitleLetterSpacing = 3;
        mainTitleColor = "#047857";
        mainSubTitle = "ANTREAN BERHASIL SELESAI DIPROSES";
        mainSubTitleColor = "#059669";
    } else if (isFullClose) {
        badgeBgTop = "#ffe4e6";
        badgeStrokeTop = "#fca5a5";
        badgeTextTop = "ORDERAN KLOTER CLOSED";
        badgeTextColorTop = "#be123c";
        dotColorTop = "#e11d48";
        mainTitle = "CLOSED";
        mainTitleFontSize = 68;
        mainTitleLetterSpacing = 5;
        mainTitleColor = "#e11d48";
        mainSubTitle = "ORDERAN KLOTER DITUTUP";
        mainSubTitleColor = "#be123c";
    } else if (isPartialClose) {
        badgeBgTop = "#fef3c7";
        badgeStrokeTop = "#fcd34d";
        badgeTextTop = "UPDATE STATUS LAYANAN";
        badgeTextColorTop = "#b45309";
        dotColorTop = "#f59e0b";
        mainTitle = "UPDATE SLOT";
        mainTitleFontSize = 58;
        mainTitleLetterSpacing = 3;
        mainTitleColor = "#0f172a";
        mainSubTitle = "SEBAGIAN TUTUP • JALUR LAIN TETAP READY";
        mainSubTitleColor = "#d97706";
    }

    // Catatan slogan rapi & profesional (tidak menggunakan teks mentah chat berantakan)
    let displayNote = "Semua Bergaransi Tanpa Drama";
    let noteCardBg = "#eff6ff";
    let noteCardBorder = theme.primaryColor;
    let noteTextColor = theme.primaryColor;

    if (isCloseListSlow) {
        displayNote = "Pemesanan Web & WhatsApp Buka 24 Jam • Antrean Otomatis";
        noteCardBg = "#eff6ff";
        noteCardBorder = "#3b82f6";
        noteTextColor = "#1d4ed8";
    } else if (isDone) {
        displayNote = "3B SF Slow Selesai Diproses • Cek Status Resmi di Web";
        noteCardBg = "#f0fdf4";
        noteCardBorder = "#86efac";
        noteTextColor = "#15803d";
    } else if (isFullClose) {
        displayNote = "Orderan Kloter Ditutup • Sampai Jumpa di Kloter Berikutnya";
        noteCardBg = "#fff1f2";
        noteCardBorder = "#fda4af";
        noteTextColor = "#e11d48";
    } else if (isPartialClose) {
        displayNote = "Sebagian Jalur Tutup • Jalur Lain Tetap Ready";
        noteCardBg = "#fffbeb";
        noteCardBorder = "#fde68a";
        noteTextColor = "#b45309";
    }

    const svg = `
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="softRiveraBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${theme.bgGradient.from}"/>
                    <stop offset="50%" stop-color="${theme.bgGradient.mid}"/>
                    <stop offset="100%" stop-color="${theme.bgGradient.to}"/>
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="90"/>
                </filter>
                <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.04"/>
                </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#softRiveraBg)"/>

            <!-- Ambient Glow Accents -->
            <circle cx="540" cy="380" r="380" fill="${theme.ambientLight1}" filter="url(#softGlow)"/>
            <circle cx="540" cy="1200" r="420" fill="${theme.ambientLight2}" filter="url(#softGlow)"/>

            <!-- Logo Seal ADD ROAMER ALL PROVIDER (y=224, proporsional dan rapi) -->
            <g transform="translate(485, 224)" filter="url(#cardShadow)">
                <rect width="110" height="110" rx="24" fill="#ffffff" stroke="${theme.primaryColor}" stroke-width="2.5"/>
                <image href="${getAddRoamerLogoUri()}" x="5" y="5" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>
            </g>

            <!-- Pill Badge (y=350, lega dan terpisah jelas dari Headline) -->
            <rect x="325" y="350" width="430" height="40" rx="20" fill="${badgeBgTop}" stroke="${badgeStrokeTop}" stroke-width="1.8"/>
            <circle cx="352" cy="370" r="6" fill="${dotColorTop}"/>
            <text x="548" y="376" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="16" font-weight="bold" fill="${badgeTextColorTop}" text-anchor="middle">${badgeTextTop}</text>

            <!-- Main Headline (y=462, lega tanpa tabrakan dengan badge di atasnya) -->
            <text x="540" y="462" font-family="'Plus Jakarta Sans', 'Montserrat', 'Inter', -apple-system, sans-serif" font-size="${mainTitleFontSize}" font-weight="900" fill="${mainTitleColor}" text-anchor="middle" letter-spacing="${mainTitleLetterSpacing}">${mainTitle}</text>
            <text x="540" y="508" font-family="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" font-size="25" font-weight="800" fill="${mainSubTitleColor}" text-anchor="middle" letter-spacing="1">${mainSubTitle}</text>
            <text x="540" y="544" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="500" fill="#64748b" text-anchor="middle">Update Pukul ${timestampWIB} WIB • ${dateWIB}</text>

            <!-- Dynamic Service Cards -->
            <g filter="url(#cardShadow)">
                ${cardsSvg}
            </g>

            <!-- Slogan Guarantee Card (Bebas emoji rusak, tema warna dinamis & anti overflow) -->
            <g transform="translate(80, 1100)" filter="url(#cardShadow)">
                <rect width="920" height="88" rx="22" fill="${noteCardBg}" stroke="${noteCardBorder}" stroke-width="2"/>
                <text x="460" y="54" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="23" font-weight="900" fill="${noteTextColor}" text-anchor="middle">${displayNote}</text>
            </g>

            <!-- Footer Info Card -->
            <g transform="translate(80, 1215)" filter="url(#cardShadow)">
                <rect width="920" height="200" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
                <text x="460" y="52" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="25" font-weight="bold" fill="#0f172a" text-anchor="middle">Pemesanan &amp; Antrean Via Web / WhatsApp</text>
                
                <g transform="translate(310, 104)">
                    <circle cx="0" cy="0" r="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2.5"/>
                    <ellipse cx="0" cy="0" rx="6" ry="14" fill="none" stroke="${theme.primaryColor}" stroke-width="2"/>
                    <line x1="-14" y1="0" x2="14" y2="0" stroke="${theme.primaryColor}" stroke-width="2"/>
                </g>
                <text x="340" y="113" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="bold" fill="${theme.primaryColor}">ry-itsolutionts.web.id</text>
                <text x="460" y="160" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" fill="#64748b" text-anchor="middle">Slot terbatas per kloter • Pengerjaan otomatis sesuai antrean</text>
            </g>
        </svg>
    `;

    return await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

/**
 * Publikasikan Story 3 (Live Status / Update Slot Rivera) ke Instagram & WhatsApp
 */
async function publishRiveraStory(parsedData, options = {}) {
    const buffer = await generateRiveraUpdateGraphic(parsedData);
    const dateWIB = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timestampWIB = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
    const track = getRandomTrack();

    const results = { instagram: null, whatsapp: null };

    // Pastikan video MP4 berlagu nyata di-render terlebih dahulu agar WA Story SELALU BERMUSIK 100%!
    let videoData = null;
    try {
        console.log(`[publishRiveraStory] Menyiapkan Video Story dengan musik [${track.title} - ${track.artist}]...`);
        videoData = await generateStoryVideo(buffer, track);
    } catch (vErr) {
        console.warn('[publishRiveraStory] Gagal generateStoryVideo:', vErr.message);
    }

    if (!options.igOnly) {
        // 1. Publikasikan ke WhatsApp Story (Prioritas utama: Video berlagu nyata)
        try {
            const { publishWhatsAppStory } = require('./waBot');
            if (typeof publishWhatsAppStory === 'function') {
                const isFullClose = parsedData.type === "FULL_CLOSE";
                const isDone = parsedData.type === "DONE_NOTIFICATION";
                const servicesText = (parsedData.services || [])
                    .map(s => `${s.status === 'READY' || s.status === 'DONE' ? '🟢' : '🔴'} *${s.name}*: ${s.status === 'READY' ? 'Ready' : (s.status === 'DONE' ? 'Done / Selesai' : 'Full Slot / Closed')} (${s.desc})`)
                    .join('\n');

                const isCloseListSlow = parsedData.type === "CLOSE_LIST_SLOW";
                let caption = '';
                if (isCloseListSlow) {
                    const cutoffLabel = parsedData.cutoffTime ? `${parsedData.cutoffTime} WIB` : "14.00 WIB";
                    caption = `⏳ *INFO SERVER RIVERA: CLOSE LIST 3B SF SLOW (KLOTER HARI INI)!*\n\n` +
                      `• Orderan yang masuk *sebelum ${cutoffLabel}* sedang diproses server dan estimasi *DONE malam ini*.\n` +
                      `• Pemesanan via Web & WhatsApp *tetap buka 24 jam*. Orderan yang masuk *setelah ${cutoffLabel}* otomatis diproses pada *kloter esok hari*.\n\n` +
                      `🛡️ *Pemesanan Web & WhatsApp Tetap Buka 24 Jam Tanpa Drama*\n` +
                      `🗓️ ${dateWIB} (${timestampWIB} WIB)\n\n` +
                      `🌐 Order via Web: https://ry-itsolutionts.web.id`;
                } else if (isDone) {
                    caption = `✅ *INFO SERVER RIVERA: ANTREAN SELESAI DIPROSES (DONE 3B SLOW)!*\n\n` +
                      `Pesanan 3B SF Slow kloter saat ini telah selesai diproses oleh server.\n` +
                      `Silakan periksa status sinyal & verifikasi garansi digital Anda di web.\n\n` +
                      `🗓️ ${dateWIB} (${timestampWIB} WIB)\n` +
                      `🌐 Cek Status: https://ry-itsolutionts.web.id`;
                } else if (isFullClose) {
                    caption = `🔴 *UPDATE SERVER RIVERA: ORDERAN KLOTER HARI INI DITUTUP!*\n\n` +
                      `Antrean kloter saat ini sedang diproses.\n` +
                      `Terima kasih dan nantikan pembukaan kloter berikutnya!\n\n` +
                      `🗓️ ${dateWIB} (${timestampWIB} WIB)\n` +
                      `🌐 https://ry-itsolutionts.web.id`;
                } else {
                    caption = `⚡ *LIVE STATUS &amp; SLOT UPDATE HARI INI!*\n\n` +
                      `${servicesText}\n\n` +
                      `🛡️ *Semua Bergaransi Tanpa Drama*\n` +
                      `⏰ Update: ${timestampWIB} WIB\n\n` +
                      `🌐 Order via Web: https://ry-itsolutionts.web.id`;
                }

                const mediaToSend = videoData?.videoBuffer || buffer;
                const isVid = Boolean(videoData?.videoBuffer);
                console.log(`[publishRiveraStory] Mengirim ke WhatsApp Story (isVideo: ${isVid}, size: ${mediaToSend.length} bytes)...`);
                results.whatsapp = await publishWhatsAppStory(mediaToSend, caption, isVid);
            }
        } catch (waErr) {
            console.warn('[publishRiveraStory] Warning saat posting WA Story 3:', waErr.message);
            results.whatsappError = waErr.message;
        }
    }

    // 2. Publikasikan ke Instagram Story
    try {
        results.instagram = await publishToStory(buffer, track, { isFullScreen: true, hasMusicSticker: false });
    } catch (igErr) {
        console.error('[publishRiveraStory] Gagal publish IG Story 3:', igErr.message);
        results.instagramError = igErr.message;
    }

    return { ...results, buffer, videoBuffer: videoData?.videoBuffer || null };
}

/**
 * Publikasikan Story Khusus Close List 3B Slow (Pukul 14.00 WIB atau Jam Rivera)
 */
async function publishCloseListSlowStory(cutoffTime = '14:00', options = {}) {
    const parsedData = {
        type: "CLOSE_LIST_SLOW",
        title: "CLOSE LIST 3B SLOW",
        badge: "CUT-OFF KLOTER HARI INI",
        cutoffTime: cutoffTime,
        services: [
            { name: `3B SF SLOW (< ${cutoffTime} WIB)`, status: "DONE_TONIGHT", desc: "Masuk antrean hari ini • Selesai malam ini" },
            { name: `3B SF SLOW (> ${cutoffTime} WIB)`, status: "NEXT_BATCH", desc: "Pemesanan tetap dibuka • Diproses kloter besok" }
        ],
        note: "Pemesanan Web & WhatsApp Buka 24 Jam • Antrean Otomatis"
    };
    return await publishRiveraStory(parsedData, options);
}

module.exports = {
    publishToStory,
    publishToFeed,
    publishOpenStory,
    parseRiveraMessage,
    generateRiveraUpdateGraphic,
    generateStoryVideo,
    publishRiveraStory,
    publishCloseListSlowStory,
    deleteInstagramStory,
    saveSessionFromCookie,
    getUniqueTracks,
    getRandomTrack,
    getActiveDJTracks,
    getSoftDailyTheme,
    SOFT_BLUE_THEMES,
    generateSoftOpenSvg,
    generateSoftDisclaimerSvg
};


