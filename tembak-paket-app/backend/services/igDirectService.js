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

// Katalog lagu khusus viral TikTok & TikTok Remix untuk Story Video & Feed IG
const TRENDING_TRACKS = [
    { title: 'DJ Alay Gaya Kaya Artis (Viral TikTok Remix)', artist: 'DJ Desa', filename: 'djalay.mp3' },
    { title: 'Stecu Stecu (Jedag Jedug TikTok Remix)', artist: 'Faris Adam', filename: 'stecustecu.mp3' },
    { title: 'Tabrak Tabrak Masuk (Remix TikTok Full Bass)', artist: 'Richard Jersey', filename: 'tabraktabrak.mp3' },
    { title: 'Malam Pagi (Remix Jedag Jedug TikTok)', artist: 'Saixse ft. MK', filename: 'malampagi.mp3' },
    { title: 'Cikini Ke Gondangdia (DJ Koplo Remix TikTok)', artist: 'Duo Anggrek Remix', filename: 'cikini.mp3' },
    { title: 'Karna Su Sayang (DJ Remix TikTok Viral)', artist: 'Near feat. Dian Sorowea', filename: 'karnasusayang.mp3' },
    { title: 'Sial (DJ Speed Up Jedag Jedug TikTok)', artist: 'Mahalini Remix', filename: 'sial.mp3' },
    { title: 'Garam & Madu (DJ Remix TikTok Bass)', artist: 'Tenxi & Asmara', filename: 'garammadu.mp3' },
    { title: 'Cupid (Speed Up Twin Ver TikTok Remix)', artist: 'FIFTY FIFTY', filename: 'cupid.mp3' },
    { title: 'Sigar (DJ Jedag Jedug Koplo TikTok)', artist: 'Denny Caknan Remix', filename: 'sigar.mp3' },
    { title: 'Cundamani (DJ Slow Bass Remix TikTok)', artist: 'Denny Caknan Remix', filename: 'cundamani.mp3' },
    { title: 'Wirang (DJ Remix Full Bass TikTok)', artist: 'Denny Caknan Remix', filename: 'wirang.mp3' },
    { title: 'APT. (DJ TikTok Viral Remix)', artist: 'ROSÉ & Bruno Mars', filename: 'apt.mp3' },
    { title: 'Die With A Smile (DJ Slow TikTok Remix)', artist: 'Lady Gaga & Bruno Mars', filename: 'diewithasmile.mp3' },
    { title: 'Komang (DJ Santuy Remix TikTok)', artist: 'Raim Laode', filename: 'komang.mp3' }
];

function getRandomTrack() {
    return TRENDING_TRACKS[Math.floor(Math.random() * TRENDING_TRACKS.length)];
}

function getUniqueTracks(count) {
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

/**
 * Dapatkan CSRF Token segar dari instagram.com
 */
async function fetchCsrfToken(sessionId, dsUserId) {
    const res = await axios.get('https://www.instagram.com/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Cookie': `sessionid=${sessionId}; ds_user_id=${dsUserId}`
        },
        httpsAgent: ipv4Agent
    });

    let csrf = '';
    const cookies = res.headers['set-cookie'] || [];
    for (const c of cookies) {
        if (c.includes('csrftoken=')) {
            csrf = c.split('csrftoken=')[1].split(';')[0];
            break;
        }
    }
    return csrf || 'SKgFS6EFz6dpdUJJTBrQBGf5tHIUGVDG';
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

/**
 * Format gambar Story (1080x1920) dengan Ambient Background Blur & Visual Music Sticker
 */
async function prepareImageForStory(imageBuffer, trackInfo = null) {
    const targetW = 1080;
    const targetH = 1920;
    const track = trackInfo || getRandomTrack();
    const safeTitle = escapeXml(track.title);
    const safeArtist = escapeXml(track.artist);

    // 1. Buat latar belakang gelap blur dari gambar bukti
    const blurredBg = await sharp(imageBuffer)
        .resize(targetW, targetH, { fit: 'cover' })
        .blur(45)
        .modulate({ brightness: 0.35 })
        .toBuffer();

    // 2. Resize gambar bukti di tengah
    const foreground = await sharp(imageBuffer)
        .resize({ width: 920, height: 1480, fit: 'inside' })
        .toBuffer();

    // 3. Stiker Visual Pemutar Musik (Spotify/IG Music Style) di bagian atas/bawah
    const musicStickerSvg = `
        <svg width="${targetW}" height="${targetH}">
            <!-- Music Player Banner -->
            <g transform="translate(180, 110)">
                <rect width="720" height="74" rx="37" fill="#090d16" fill-opacity="0.92" stroke="#38bdf8" stroke-width="1.8" />
                
                <!-- Music Icon -->
                <circle cx="44" cy="37" r="22" fill="#0f172a" stroke="#06b6d4" stroke-width="1.5"/>
                <text x="44" y="44" font-family="Arial, sans-serif" font-size="20" fill="#38bdf8" text-anchor="middle">🎵</text>
                
                <!-- Track Title & Artist -->
                <text x="82" y="34" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#ffffff">${safeTitle}</text>
                <text x="82" y="56" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8">${safeArtist}</text>
                
                <!-- Equalizer Wave Bars -->
                <g transform="translate(620, 22)">
                    <rect x="0" y="10" width="4" height="20" rx="2" fill="#38bdf8" />
                    <rect x="8" y="4" width="4" height="26" rx="2" fill="#818cf8" />
                    <rect x="16" y="14" width="4" height="16" rx="2" fill="#38bdf8" />
                    <rect x="24" y="2" width="4" height="28" rx="2" fill="#06b6d4" />
                    <rect x="32" y="8" width="4" height="22" rx="2" fill="#818cf8" />
                    <rect x="40" y="16" width="4" height="14" rx="2" fill="#38bdf8" />
                </g>
            </g>
        </svg>
    `;

    return await sharp(blurredBg)
        .composite([
            { input: foreground, gravity: 'center' },
            { input: Buffer.from(musicStickerSvg), top: 0, left: 0 }
        ])
        .jpeg({ quality: 92 })
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
 * Mengonversi gambar 1080x1920 dan file lagu MP3 menjadi video MP4 berdurasi 15 detik (Option B)
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

        // Resize ke 720x1280 (HD 9:16) agar encoding FFmpeg di server sangat cepat (~18 detik) dan hemat resource
        const scaledImgBuffer = await sharp(formattedImageBuffer)
            .resize(720, 1280, { fit: 'fill' })
            .jpeg({ quality: 90 })
            .toBuffer();

        fs.writeFileSync(tempImg, scaledImgBuffer);

        // Encode video 15 detik dengan libx264 ultrafast + aac stereo 44.1kHz secara asynchronous non-blocking
        await execFileAsync('ffmpeg', [
            '-y',
            '-loop', '1',
            '-i', tempImg,
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
 * Publikasikan konten ke Instagram Story (Video bersuara lagu atau Foto fallback)
 */
async function publishToStory(imageBuffer, customTrack = null) {
    const { sessionId, dsUserId } = getSessionCredentials();
    const track = customTrack || getRandomTrack();
    const formattedBuffer = await prepareImageForStory(imageBuffer, track);

    const csrf = await fetchCsrfToken(sessionId, dsUserId);
    const uploadId = Date.now().toString();
    const entityName = `fb_uploader_${uploadId}`;

    console.log(`[IGDirect] Menyiapkan konten Instagram Story dengan musik [${track.title} - ${track.artist}]...`);

    // Render video MP4 15 detik bersuara lagu nyata (Option B)
    const videoData = await generateStoryVideo(formattedBuffer, track);

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
            track
        };
    }
}

/**
 * Publikasikan gambar ke Instagram Feed
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

    // 1. Upload file binary
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

    // 2. Konfigurasi penerbitan ke Feed
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

    console.log('[IGDirect] ✅ Berhasil terbit di Instagram Feed! Media ID:', configRes.data.media?.id);
    return {
        success: true,
        mediaId: configRes.data.media?.id,
        track
    };
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
            <g transform="translate(140, 840)">
                <rect width="800" height="370" rx="32" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="2"/>
                
                <text x="400" y="65" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#f8fafc" text-anchor="middle">LAYANAN PRIORITAS HARI INI</text>
                <line x1="80" y1="95" x2="720" y2="95" stroke="#334155" stroke-width="2"/>

                <text x="100" y="165" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#38bdf8">⚡ Layanan Add Roamer (Unlock Sinyal)</text>
                <text x="100" y="205" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Pilihan aktivasi 1 Bulan &amp; 3 Bulan All Operator</text>

                <text x="100" y="275" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#34d399">🔍 Cek Status CEIR &amp; Garansi</text>
                <text x="100" y="315" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8">Diagnostik legalitas Kemenperin &amp; Bea Cukai</text>
            </g>

            <!-- Footer Kontak -->
            <g transform="translate(140, 1280)">
                <rect width="800" height="240" rx="28" fill="#1e293b" fill-opacity="0.6" stroke="#475569" stroke-width="1.5"/>
                <text x="400" y="70" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">Fast Response via WhatsApp &amp; Web</text>
                
                <text x="400" y="130" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#38bdf8" text-anchor="middle">🌐 ry-itsolutionts.web.id</text>
                <text x="400" y="180" font-family="Arial, sans-serif" font-size="26" fill="#cbd5e1" text-anchor="middle">Buka mulai: ${timestampWIB} WIB</text>
            </g>
        </svg>
    `;

    // SVG Story Lanjutan (Story 2): Disclaimer Add Roamer (Anti AI Slop - Vektor Presisi Sharp)
    const disclaimerSvg = `
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="disclaimerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#070a12"/>
                    <stop offset="50%" stop-color="#0f172a"/>
                    <stop offset="100%" stop-color="#1c1917"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#disclaimerBg)"/>

            <!-- Ambient Lights -->
            <circle cx="540" cy="350" r="280" fill="#f59e0b" fill-opacity="0.12" filter="blur(60px)"/>
            <circle cx="540" cy="1150" r="320" fill="#38bdf8" fill-opacity="0.10" filter="blur(70px)"/>

            <!-- Logo Badge -->
            <g transform="translate(450, 240)">
                <circle cx="90" cy="90" r="75" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
                <text x="90" y="102" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="#f59e0b" text-anchor="middle">RY</text>
            </g>

            <!-- Tag -->
            <rect x="350" y="440" width="380" height="46" rx="23" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="1.5"/>
            <circle cx="380" cy="463" r="7" fill="#f59e0b"/>
            <text x="400" y="471" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#fbbf24">EDUKASI &amp; TRANSPARANSI</text>

            <!-- Header Titles -->
            <text x="540" y="555" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">DISCLAIMER</text>
            <text x="540" y="620" font-family="Arial, sans-serif" font-size="46" font-weight="900" fill="#f59e0b" text-anchor="middle">LAYANAN ADD ROAMER</text>
            <text x="540" y="668" font-family="Arial, sans-serif" font-size="24" font-weight="500" fill="#94a3b8" text-anchor="middle">Wajib Dibaca Demi Keamanan &amp; Kenyamanan Bersama</text>

            <!-- Card 1: Alert Tidak Ada Permanen -->
            <g transform="translate(120, 730)">
                <rect width="840" height="260" rx="28" fill="#18131b" fill-opacity="0.9" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
                <rect x="30" y="25" width="48" height="48" rx="12" fill="#ef4444" fill-opacity="0.2"/>
                <text x="54" y="57" font-family="Arial, sans-serif" font-size="26" text-anchor="middle" fill="#ef4444">✕</text>
                
                <text x="95" y="57" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#fca5a5">TIDAK ADA ADD ROAMER PERMANEN</text>
                <line x1="30" y1="90" x2="810" y2="90" stroke="#334155" stroke-width="1"/>

                <text x="35" y="135" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">• Waspada penipuan yang menjanjikan unblock permanen via Add Roamer.</text>
                <text x="35" y="178" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">• Secara teknis jaringan operator seluler, Add Roamer bersifat berjangka.</text>
                <text x="35" y="221" font-family="Arial, sans-serif" font-size="24" fill="#f87171">• Tidak ada bypass Add Roamer yang bisa aktif seumur hidup.</text>
            </g>

            <!-- Card 2: Durasi Resmi Yang Tersedia -->
            <g transform="translate(120, 1030)">
                <rect width="840" height="300" rx="28" fill="#0c1f1a" fill-opacity="0.9" stroke="#10b981" stroke-opacity="0.8" stroke-width="2"/>
                <rect x="30" y="25" width="48" height="48" rx="12" fill="#10b981" fill-opacity="0.2"/>
                <text x="54" y="57" font-family="Arial, sans-serif" font-size="26" text-anchor="middle" fill="#10b981">✓</text>

                <text x="95" y="57" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#6ee7b7">HANYA TERSEDIA 1 BULAN &amp; 3 BULAN</text>
                <line x1="30" y1="90" x2="810" y2="90" stroke="#334155" stroke-width="1"/>

                <text x="35" y="135" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">• Ry-ITSolutions hanya melayani paket resmi 1 Bulan &amp; 3 Bulan.</text>
                <text x="35" y="178" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">• Mendukung All Operator Indonesia (Telkomsel, Indosat, XL, Tri, SF).</text>
                <text x="35" y="221" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">• Seluruh pengerjaan bergaransi penuh sesuai masa aktif yang dipilih.</text>
                <text x="35" y="264" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#34d399">• Transaksi transparan, aman, dan tercatat otomatis dalam nota digital.</text>
            </g>

            <!-- Card 3: Footer Kontak & Web -->
            <g transform="translate(120, 1370)">
                <rect width="840" height="210" rx="26" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1.5"/>
                <text x="420" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Konsultasi &amp; Cek IMEI Resmi</text>
                <text x="420" y="115" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#38bdf8" text-anchor="middle">🌐 ry-itsolutionts.web.id</text>
                <text x="420" y="165" font-family="Arial, sans-serif" font-size="22" fill="#94a3b8" text-anchor="middle">Ry-ITSolutions • Solusi Digital &amp; Jaringan Terpercaya</text>
            </g>
        </svg>
    `;

    const [openBuffer, disclaimerBuffer] = await Promise.all([
        sharp(Buffer.from(openSvg)).jpeg({ quality: 94 }).toBuffer(),
        sharp(Buffer.from(disclaimerSvg)).jpeg({ quality: 94 }).toBuffer()
    ]);

    const results = {
        openStory: { instagram: null, whatsapp: null },
        disclaimerStory: { instagram: null, whatsapp: null }
    };

    // 1. Publikasi Story 1: "WE ARE OPEN!" ke Instagram & WhatsApp
    try {
        results.openStory.instagram = await publishToStory(openBuffer);
    } catch (igErr) {
        console.error('[publishOpenStory] Gagal publish IG Story 1 (Open):', igErr.message);
        results.openStory.instagramError = igErr.message;
    }

    try {
        const { publishWhatsAppStory } = require('./waBot');
        if (typeof publishWhatsAppStory === 'function') {
            const captionStory1 = `📢 *Ry-ITSolutions BUKA HARI INI!*\n\n` +
                `⚡ Layanan Add Roamer (1 Bulan & 3 Bulan)\n` +
                `🔍 Cek Status CEIR & Garansi\n\n` +
                `🗓️ ${dateWIB}\n` +
                `⏰ Buka: ${timestampWIB} WIB\n\n` +
                `🌐 https://ry-itsolutionts.web.id`;
            results.openStory.whatsapp = await publishWhatsAppStory(openBuffer, captionStory1);
        }
    } catch (waErr) {
        console.warn('[publishOpenStory] Warning saat posting WA Story 1 (Open):', waErr.message);
        results.openStory.whatsappError = waErr.message;
    }

    // Jeda 2 detik sebelum mempublikasikan Story 2 (Disclaimer)
    await new Promise(r => setTimeout(r, 2000));

    // 2. Publikasi Story 2: "DISCLAIMER ADD ROAMER" ke Instagram & WhatsApp
    try {
        results.disclaimerStory.instagram = await publishToStory(disclaimerBuffer);
    } catch (igErr2) {
        console.error('[publishOpenStory] Gagal publish IG Story 2 (Disclaimer):', igErr2.message);
        results.disclaimerStory.instagramError = igErr2.message;
    }

    try {
        const { publishWhatsAppStory } = require('./waBot');
        if (typeof publishWhatsAppStory === 'function') {
            const captionStory2 = `⚠️ *DISCLAIMER RESMI ADD ROAMER*\n\n` +
                `❌ *Tidak ada Add Roamer yang permanen.* Waspada penipuan!\n` +
                `✅ *Hanya tersedia opsi 1 Bulan & 3 Bulan* (All Operator).\n\n` +
                `🛡️ Garansi penuh & nota transaksi digital resmi.\n` +
                `🌐 https://ry-itsolutionts.web.id`;
            results.disclaimerStory.whatsapp = await publishWhatsAppStory(disclaimerBuffer, captionStory2);
        }
    } catch (waErr2) {
        console.warn('[publishOpenStory] Warning saat posting WA Story 2 (Disclaimer):', waErr2.message);
        results.disclaimerStory.whatsappError = waErr2.message;
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

    // 1. Deteksi Cepat untuk Pesan Penyelesaian Antrean (DONE ALL)
    if (/(\bdone\s*all\b|\bslow\s*3b\s*done\b|\bfast\s*done\b|\bselesai\s*semua\b)/i.test(rawText)) {
        return {
            type: "DONE_NOTIFICATION",
            title: "PESANAN SELESAI / DONE ALL",
            services: [],
            note: rawText.trim()
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
  "title": "STATUS KLOTER & SLOT HARI INI",
  "badge": "LIVE UPDATE",
  "services": [
    { "name": "3B SF SLOW", "status": "READY", "desc": "Done Malam • Sent s/d Sore" }
  ],
  "note": "Semua Bergaransi Tanpa Drama 🎭"
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

    // 3. Fallback Heuristik Lokal (Zero failure risk)
    const upper = rawText.toUpperCase();
    const isCloseAll = /(CLOSE\s*ALL|OFF\s*SEMUA|TUTUP\s*SEMUA|FULL\s*SEMUA)/i.test(upper);
    const services = [];

    if (upper.includes("3B SF SLOW") || upper.includes("SLOW")) {
        const isClosed = /(SLOW.*(OFF|FULL|TUTUP|CLOSE)|(OFF|FULL|TUTUP|CLOSE).*SLOW)/i.test(upper);
        services.push({
            name: "3B SF SLOW",
            status: isClosed ? "FULL_SLOT" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Done Malam • Sent s/d Sore"
        });
    }

    if (upper.includes("3B SF FAST") || upper.includes("FAST")) {
        const isClosed = /(FAST.*(OFF|FULL|TUTUP|CLOSE)|(OFF|FULL|TUTUP|CLOSE).*FAST)/i.test(upper);
        services.push({
            name: "3B SF FAST",
            status: isClosed ? "FULL_SLOT" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Proses Cepat (Under 15 Menit)"
        });
    }

    if (upper.includes("1B") || upper.includes("DIGIPOS")) {
        const isClosed = /(DIGIPOS.*(OFF|FULL|TUTUP|CLOSE)|(OFF|FULL|TUTUP|CLOSE).*DIGIPOS)/i.test(upper);
        services.push({
            name: "1B DIGIPOS",
            status: isClosed ? "FULL_SLOT" : "READY",
            desc: isClosed ? "Full Slot / Ditutup Sementara" : "Ready Jalur Khusus Promo"
        });
    }

    if (services.length === 0) {
        return { type: "IRRELEVANT" };
    }

    const allClosed = isCloseAll || services.every(s => s.status !== "READY");
    const anyClosed = services.some(s => s.status !== "READY");

    return {
        type: allClosed ? "FULL_CLOSE" : (anyClosed ? "PARTIAL_CLOSE" : "SLOT_UPDATE"),
        title: allClosed ? "ORDERAN KLOTER HARI INI DITUTUP" : "STATUS KLOTER & SLOT HARI INI",
        badge: allClosed ? "CLOSED" : (anyClosed ? "UPDATE SLOT" : "LIVE UPDATE"),
        services,
        note: upper.includes("DRAMA") ? "Semua Bergaransi Tanpa Drama 🎭" : "Pengerjaan Bergaransi Penuh Sesuai Antrean"
    };
}

/**
 * Generate Story 3 Graphic (1080x1920) untuk Update Slot & Status Rivera
 */
async function generateRiveraUpdateGraphic(parsedData) {
    const targetW = 1080;
    const targetH = 1920;
    const dateWIB = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timestampWIB = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

    const isFullClose = parsedData.type === "FULL_CLOSE";
    const services = Array.isArray(parsedData.services) && parsedData.services.length > 0
        ? parsedData.services
        : [
            { name: "3B SF SLOW", status: isFullClose ? "CLOSED" : "READY", desc: isFullClose ? "Ditutup Sementara" : "Done Malam • Sent s/d Sore" },
            { name: "3B SF FAST", status: isFullClose ? "CLOSED" : "READY", desc: isFullClose ? "Ditutup Sementara" : "Proses Cepat (Under 15 Menit)" },
            { name: "1B DIGIPOS", status: isFullClose ? "CLOSED" : "READY", desc: isFullClose ? "Ditutup Sementara" : "Ready Jalur Khusus Promo" }
        ];

    const cardsSvg = services.map((s, idx) => {
        const yPos = 780 + (idx * 165);
        const isReady = s.status === "READY";
        const badgeColor = isReady ? "#10b981" : "#ef4444";
        const badgeBg = isReady ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
        const badgeText = isReady ? "READY" : (s.status === "FULL_SLOT" ? "FULL SLOT" : "CLOSED");
        const textColor = isReady ? "#34d399" : "#fca5a5";

        return `
            <g transform="translate(100, ${yPos})">
                <rect width="880" height="145" rx="26" fill="#0f172a" fill-opacity="0.9" stroke="${isReady ? '#334155' : '#ef4444'}" stroke-opacity="${isReady ? '1' : '0.6'}" stroke-width="2"/>
                <text x="40" y="62" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff">${s.name.replace(/smartfren/gi, 'SF')}</text>
                <text x="40" y="105" font-family="Arial, sans-serif" font-size="22" font-weight="500" fill="#94a3b8">${s.desc.replace(/smartfren/gi, 'SF')}</text>
                
                <!-- Status Pill -->
                <rect x="680" y="42" width="160" height="48" rx="24" fill="${badgeBg}" stroke="${badgeColor}" stroke-width="2"/>
                <circle cx="705" cy="66" r="6" fill="${badgeColor}"/>
                <text x="765" y="74" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${textColor}" text-anchor="middle">${badgeText}</text>
            </g>
        `;
    }).join("\n");

    const badgeBgTop = isFullClose ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)";
    const badgeStrokeTop = isFullClose ? "#ef4444" : "#10b981";
    const badgeTextTop = isFullClose ? "ORDERAN KLOTER CLOSED" : (parsedData.badge || "LIVE SERVER &amp; SLOT UPDATE");
    const badgeTextColorTop = isFullClose ? "#fca5a5" : "#34d399";
    const mainTitle = isFullClose ? "ORDERAN KLOTER HARI INI" : "STATUS KLOTER &amp; SLOT";
    const mainSubTitle = isFullClose ? "DITUTUP SEMENTARA" : "HARI INI";
    const mainSubTitleColor = isFullClose ? "#ef4444" : "#38bdf8";

    const svg = `
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#070c18"/>
                    <stop offset="40%" stop-color="#0f172a"/>
                    <stop offset="100%" stop-color="#181326"/>
                </linearGradient>
                <linearGradient id="cyanNeon" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="100%" stop-color="#818cf8"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>

            <!-- Ambient Glow Accents -->
            <circle cx="540" cy="360" r="320" fill="${isFullClose ? '#ef4444' : '#38bdf8'}" fill-opacity="0.12" filter="blur(70px)"/>
            <circle cx="540" cy="1200" r="350" fill="#6366f1" fill-opacity="0.10" filter="blur(80px)"/>

            <!-- Logo Seal -->
            <g transform="translate(450, 220)">
                <circle cx="90" cy="90" r="80" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
                <circle cx="90" cy="90" r="66" fill="url(#cyanNeon)" fill-opacity="0.15"/>
                <text x="90" y="102" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#38bdf8" text-anchor="middle">RY</text>
            </g>

            <!-- Pill Badge -->
            <rect x="300" y="440" width="480" height="46" rx="23" fill="${badgeBgTop}" stroke="${badgeStrokeTop}" stroke-width="1.8"/>
            <circle cx="330" cy="463" r="7" fill="${badgeStrokeTop}"/>
            <text x="545" y="471" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${badgeTextColorTop}" text-anchor="middle">${badgeTextTop}</text>

            <!-- Main Headline -->
            <text x="540" y="565" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="#ffffff" text-anchor="middle">${mainTitle}</text>
            <text x="540" y="625" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="${mainSubTitleColor}" text-anchor="middle">${mainSubTitle}</text>
            <text x="540" y="675" font-family="Arial, sans-serif" font-size="24" font-weight="500" fill="#94a3b8" text-anchor="middle">Update Pukul ${timestampWIB} WIB • ${dateWIB}</text>

            <!-- Dynamic Cards -->
            ${cardsSvg}

            <!-- Slogan Guarantee Card -->
            <g transform="translate(100, 1340)">
                <rect width="880" height="110" rx="24" fill="#1e1b4b" fill-opacity="0.7" stroke="#6366f1" stroke-width="2"/>
                <text x="440" y="67" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#c7d2fe" text-anchor="middle">${parsedData.note || 'SEMUA BERGARANSI TANPA ADA DRAMA 🎭'}</text>
            </g>

            <!-- Footer Info Card -->
            <g transform="translate(100, 1490)">
                <rect width="880" height="230" rx="26" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1.5"/>
                <text x="440" y="65" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Pemesanan &amp; Antrean Via Web / WhatsApp</text>
                <text x="440" y="125" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#38bdf8" text-anchor="middle">🌐 ry-itsolutionts.web.id</text>
                <text x="440" y="175" font-family="Arial, sans-serif" font-size="22" fill="#94a3b8" text-anchor="middle">Slot terbatas per kloter • Pengerjaan otomatis sesuai antrean</text>
            </g>
        </svg>
    `;

    return await sharp(Buffer.from(svg)).jpeg({ quality: 94 }).toBuffer();
}

/**
 * Publikasikan Story 3 (Live Status / Update Slot Rivera) ke Instagram & WhatsApp
 */
async function publishRiveraStory(parsedData) {
    const buffer = await generateRiveraUpdateGraphic(parsedData);
    const dateWIB = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timestampWIB = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

    const results = { instagram: null, whatsapp: null };

    // 1. Publikasikan ke Instagram Story
    try {
        results.instagram = await publishToStory(buffer);
    } catch (igErr) {
        console.error('[publishRiveraStory] Gagal publish IG Story 3:', igErr.message);
        results.instagramError = igErr.message;
    }

    // 2. Publikasikan ke WhatsApp Story
    try {
        const { publishWhatsAppStory } = require('./waBot');
        if (typeof publishWhatsAppStory === 'function') {
            const isFullClose = parsedData.type === "FULL_CLOSE";
            const servicesText = (parsedData.services || [])
                .map(s => `${s.status === 'READY' ? '🟢' : '🔴'} *${s.name}*: ${s.status === 'READY' ? 'Ready' : 'Full Slot / Closed'} (${s.desc})`)
                .join('\n');

            const caption = isFullClose
                ? `🔴 *UPDATE SERVER RIVERA: ORDERAN KLOTER HARI INI DITUTUP!*\n\n` +
                  `Antrean kloter saat ini sedang diproses.\n` +
                  `Terima kasih dan nantikan pembukaan kloter berikutnya!\n\n` +
                  `🗓️ ${dateWIB} (${timestampWIB} WIB)\n` +
                  `🌐 https://ry-itsolutionts.web.id`
                : `⚡ *LIVE STATUS & SLOT UPDATE HARI INI!*\n\n` +
                  `${servicesText}\n\n` +
                  `🛡️ *${parsedData.note || 'Semua Bergaransi Tanpa Drama 🎭'}*\n` +
                  `⏰ Update: ${timestampWIB} WIB\n\n` +
                  `🌐 Order via Web: https://ry-itsolutionts.web.id`;

            results.whatsapp = await publishWhatsAppStory(buffer, caption);
        }
    } catch (waErr) {
        console.warn('[publishRiveraStory] Warning saat posting WA Story 3:', waErr.message);
        results.whatsappError = waErr.message;
    }

    return { ...results, buffer };
}

module.exports = {
    publishToStory,
    publishToFeed,
    publishOpenStory,
    parseRiveraMessage,
    generateRiveraUpdateGraphic,
    publishRiveraStory,
    saveSessionFromCookie,
    getUniqueTracks
};

