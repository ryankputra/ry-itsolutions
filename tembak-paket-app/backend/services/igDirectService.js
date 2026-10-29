const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch(e) {}
const { IgApiClient } = require('instagram-private-api');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '..', 'sessions', 'ig_session.json');
let igClient = null;

/**
 * Simpan dan validasi sesi Instagram menggunakan cookie sessionid
 */
async function saveSessionFromCookie(sessionId, customUsername) {
    const username = (customUsername || process.env.IG_USERNAME || 'unlocksinyalsolo').replace('@', '').trim();
    if (!sessionId) {
        throw new Error('Session ID kosong.');
    }

    const cleanSession = sessionId.trim().replace(/^sessionid=/, '');
    const decoded = decodeURIComponent(cleanSession);
    const userIdMatch = decoded.match(/^(\d+):/);
    const dsUserId = userIdMatch ? userIdMatch[1] : '';

    const ig = new IgApiClient();
    ig.request.defaults = { family: 4, timeout: 25000 };
    ig.state.generateDevice(username);

    const cookies = [
        `sessionid=${encodeURIComponent(decoded)}; Domain=.instagram.com; Path=/; Secure; HttpOnly`,
        `csrftoken=missing; Domain=.instagram.com; Path=/; Secure`
    ];
    if (dsUserId) {
        cookies.push(`ds_user_id=${dsUserId}; Domain=.instagram.com; Path=/; Secure`);
    }

    for (const c of cookies) {
        await ig.state.cookieJar.setCookie(c, 'https://i.instagram.com/');
    }

    let activeUser = null;
    try {
        activeUser = await ig.account.currentUser();
        console.log(`[IGDirect] ✅ Berhasil otentikasi via Cookie untuk @${activeUser.username} (PK: ${activeUser.pk})`);
    } catch (e) {
        if (dsUserId) {
            try {
                activeUser = await ig.user.info(dsUserId);
            } catch (e2) {
                throw new Error(`Sesi Cookie tidak valid atau ditolak Instagram: ${e.message}`);
            }
        } else {
            throw new Error(`Sesi Cookie tidak valid atau ditolak Instagram: ${e.message}`);
        }
    }

    // Simpan ke disk
    const serialized = await ig.state.serialize();
    delete serialized.constants;
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));

    igClient = ig;
    return {
        success: true,
        username: activeUser?.username || username,
        pk: activeUser?.pk || dsUserId
    };
}

/**
 * Inisialisasi dan Login ke Instagram dengan Session Reuse
 */
async function getInstagramClient() {
    const username = (process.env.IG_USERNAME || 'unlocksinyalsolo').replace('@', '').trim();
    const password = process.env.IG_PASSWORD;
    const envSessionId = process.env.IG_SESSIONID;

    if (igClient) {
        return igClient;
    }

    const ig = new IgApiClient();
    ig.request.defaults = { family: 4, timeout: 25000 };
    ig.state.generateDevice(username);

    // 1. Coba restore session jika file sesi sudah tersimpan
    if (fs.existsSync(SESSION_FILE)) {
        try {
            const rawSession = fs.readFileSync(SESSION_FILE, 'utf-8');
            const sessionData = JSON.parse(rawSession);
            await ig.state.deserialize(sessionData);
            console.log('[IGDirect] Berhasil memuat sesi login tersimpan untuk @' + username);
            igClient = ig;
            return igClient;
        } catch (e) {
            console.warn('[IGDirect] Gagal me-restore sesi IG lama:', e.message);
        }
    }

    // 2. Coba login menggunakan IG_SESSIONID jika tersedia di .env
    if (envSessionId) {
        console.log('[IGDirect] Menghubungkan menggunakan IG_SESSIONID dari .env...');
        try {
            await saveSessionFromCookie(envSessionId, username);
            return igClient;
        } catch (eCookie) {
            console.warn('[IGDirect] IG_SESSIONID di .env gagal digunakan:', eCookie.message);
        }
    }

    // 3. Fallback: Login via Password jika ada
    if (!password) {
        throw new Error('IG_PASSWORD atau IG_SESSIONID belum dikonfigurasi di file .env');
    }

    console.log(`[IGDirect] Melakukan login ke Instagram sebagai @${username}...`);
    try {
        await ig.launcher.preLoginSync().catch(() => {});
        const loggedInUser = await ig.account.login(username, password);

        // Simpan sesi ke disk
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
        fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));

        console.log(`[IGDirect] ✅ Berhasil login ke Instagram: @${loggedInUser.username} (PK: ${loggedInUser.pk})`);
        igClient = ig;
        return igClient;
    } catch (err) {
        console.error('[IGDirect] ❌ Gagal login ke Instagram:', err.message);
        if (err.message?.includes('needs_upgrade') || err.message?.includes('checkpoint')) {
            throw new Error(
                `Instagram memerlukan verifikasi / checkpoint untuk perangkat/IP ini.\n` +
                `Silakan login via browser di handphone/laptop ke akun @${username}, lalu salin nilai cookie 'sessionid' dan kirim ke WhatsApp bot:\n` +
                `👉 *.igsession <sessionid>*`
            );
        }
        throw err;
    }
}

/**
 * Format gambar agar sesuai rasio Instagram (Story: 9:16, Feed: 4:5 s/d 1:1)
 */
async function prepareImageForStory(imageBuffer) {
    // Rasio standar Story 1080x1920
    const metadata = await sharp(imageBuffer).metadata();
    const targetW = 1080;
    const targetH = 1920;

    // Buat latar belakang gelap blur dari gambar asli, lalu tempel gambar di tengah
    const blurredBg = await sharp(imageBuffer)
        .resize(targetW, targetH, { fit: 'cover' })
        .blur(40)
        .modulate({ brightness: 0.4 })
        .toBuffer();

    // Resize gambar asli agar pas di tengah tanpa terpotong
    const foreground = await sharp(imageBuffer)
        .resize({ width: 980, height: 1600, fit: 'inside' })
        .toBuffer();

    return await sharp(blurredBg)
        .composite([{ input: foreground, gravity: 'center' }])
        .jpeg({ quality: 92 })
        .toBuffer();
}

async function prepareImageForFeed(imageBuffer) {
    // Feed membutuhkan rasio antara 4:5 hingga 1.91:1
    return await sharp(imageBuffer)
        .resize(1080, 1350, { fit: 'contain', background: '#090d16' })
        .jpeg({ quality: 92 })
        .toBuffer();
}

/**
 * Publikasikan gambar ke Instagram Story
 */
async function publishToStory(imageBuffer) {
    const ig = await getInstagramClient();
    const formattedBuffer = await prepareImageForStory(imageBuffer);
    
    console.log('[IGDirect] Mengunggah konten ke Instagram Story...');
    const result = await ig.publish.story({
        file: formattedBuffer
    });

    console.log('[IGDirect] ✅ Berhasil terbit di Instagram Story!');
    return { success: true, result };
}

/**
 * Publikasikan gambar ke Instagram Feed
 */
async function publishToFeed(imageBuffer, caption = '') {
    const ig = await getInstagramClient();
    const formattedBuffer = await prepareImageForFeed(imageBuffer);

    const fullCaption = (caption || 'Testimoni Pembayaran & Layanan Ry-ITSolutions') + 
        '\n\n---\n🌐 Website: https://ry-itsolutionts.web.id\n⚡ Unlock Sinyal • Tembak Paket • Cek CEIR\n#ryitsolutions #unlocksinyalsolo #testimoni #unlocksinyal';

    console.log('[IGDirect] Mengunggah konten ke Instagram Feed...');
    const result = await ig.publish.photo({
        file: formattedBuffer,
        caption: fullCaption
    });

    console.log('[IGDirect] ✅ Berhasil terbit di Instagram Feed!');
    return { success: true, result };
}

/**
 * Buat dan Publikasikan Banner "OPEN TODAY" ke Story
 */
async function publishOpenStory() {
    const targetW = 1080;
    const targetH = 1920;
    const timestampWIB = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
    const dateWIB = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const openSvg = `
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#090d16"/>
                    <stop offset="50%" stop-color="#0f172a"/>
                    <stop offset="100%" stop-color="#1e1b4b"/>
                </linearGradient>
                <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="100%" stop-color="#818cf8"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
            
            <!-- Ornamen Cahaya Ambient -->
            <circle cx="540" cy="400" r="300" fill="#38bdf8" fill-opacity="0.12" filter="blur(60px)"/>
            <circle cx="540" cy="1100" r="350" fill="#6366f1" fill-opacity="0.12" filter="blur(80px)"/>

            <!-- Badge Logo -->
            <g transform="translate(440, 320)">
                <circle cx="100" cy="100" r="85" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
                <circle cx="100" cy="100" r="70" fill="url(#neonGrad)" fill-opacity="0.2"/>
                <text x="100" y="112" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#38bdf8" text-anchor="middle">RY</text>
            </g>

            <!-- Teks Status -->
            <rect x="390" y="550" width="300" height="48" rx="24" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
            <circle cx="420" cy="574" r="8" fill="#10b981"/>
            <text x="440" y="582" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#34d399">ONLINE &amp; READY</text>

            <text x="540" y="690" font-family="Arial, sans-serif" font-size="76" font-weight="900" fill="#ffffff" text-anchor="middle">WE ARE OPEN!</text>
            <text x="540" y="750" font-family="Arial, sans-serif" font-size="32" font-weight="500" fill="#94a3b8" text-anchor="middle">${dateWIB}</text>

            <!-- Card Layanan -->
            <g transform="translate(140, 830)">
                <rect width="800" height="480" rx="32" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
                
                <text x="400" y="70" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#f8fafc" text-anchor="middle">LAYANAN PRIORITAS HARI INI</text>
                <line x1="80" y1="100" x2="720" y2="100" stroke="#334155" stroke-width="2"/>

                <text x="100" y="170" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#38bdf8">⚡ Unlock Sinyal &amp; Roamer</text>
                <text x="100" y="210" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Bypass jaringan permanen &amp; temporary all operator</text>

                <text x="100" y="275" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#818cf8">📦 Tembak Paket Kuota Murah</text>
                <text x="100" y="315" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Telkomsel, XL, Axis, Indosat, Tri</text>

                <text x="100" y="380" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#34d399">🔍 Cek Status CEIR &amp; Garansi</text>
                <text x="100" y="420" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Diagnostik legalitas Kemenperin &amp; Bea Cukai</text>
            </g>

            <!-- Footer Kontak -->
            <g transform="translate(140, 1420)">
                <rect width="800" height="240" rx="28" fill="#1e293b" fill-opacity="0.6" stroke="#475569" stroke-width="1.5"/>
                <text x="400" y="70" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">Fast Response via WhatsApp &amp; Web</text>
                
                <text x="400" y="130" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#38bdf8" text-anchor="middle">🌐 ry-itsolutionts.web.id</text>
                <text x="400" y="180" font-family="Arial, sans-serif" font-size="26" fill="#cbd5e1" text-anchor="middle">Buka mulai: ${timestampWIB} WIB</text>
            </g>
        </svg>
    `;

    const openBuffer = await sharp(Buffer.from(openSvg))
        .jpeg({ quality: 94 })
        .toBuffer();

    return await publishToStory(openBuffer);
}

module.exports = {
    getInstagramClient,
    saveSessionFromCookie,
    publishToStory,
    publishToFeed,
    publishOpenStory
};

