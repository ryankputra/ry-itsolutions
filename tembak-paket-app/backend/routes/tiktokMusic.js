const express = require('express');
const router = express.Router();
const tiktokMusicService = require('../services/tiktokMusicService');

/**
 * GET /api/tiktok-music
 * Public endpoint to fetch active trending TikTok music catalog
 */
router.get('/', (req, res) => {
    try {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        const catalog = tiktokMusicService.getTracks();
        res.json({
            success: true,
            status: true,
            message: "Berhasil memuat katalog lagu RyTone Top Hits",
            data: catalog
        });
    } catch (err) {
        console.error('[Route: /api/music] Error:', err);
        res.status(500).json({
            success: false,
            status: false,
            message: "Gagal memuat katalog lagu RyTone",
            error: err.message
        });
    }
});

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const AUDIO_DIR = path.resolve(__dirname, '../../frontend-v2/public/audio/tiktok');
const YTDLP_BIN = process.env.YTDLP_PATH || (fs.existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp');

const streamUrlCache = new Map();

/**
 * GET /api/music/stream or /api/tiktok-music/stream
 * Streaming audio murni untuk pemutaran di latar belakang (background audio mobile saat layar mati/keluar web)
 */
router.get('/stream', async (req, res) => {
    const rawId = (req.query.id || req.query.youtubeId || "").trim();
    if (!rawId) {
        return res.status(400).json({ success: false, message: "Parameter id lagu diperlukan." });
    }

    // 1. Cek apakah ini file lokal di folder audio (misal komang.mp3, djalay.mp3, dll)
    const localFilename = rawId.endsWith('.mp3') ? rawId : `${rawId}.mp3`;
    const localPath = path.join(AUDIO_DIR, localFilename);
    if (fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(localPath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            });
            return file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'bytes'
            });
            return fs.createReadStream(localPath).pipe(res);
        }
    }
    // 2. Ekstraksi audio stream YouTube via yt-dlp (Mendukung ID YouTube langsung maupun pencarian judul lagu)
    try {
        let streamUrl = streamUrlCache.get(rawId);
        const cachedAt = streamUrlCache.get(`${rawId}_time`) || 0;

        if (!streamUrl || (Date.now() - cachedAt > 3 * 60 * 60 * 1000)) {
            const isYoutubeId = /^[a-zA-Z0-9_-]{11}$/.test(rawId);
            const queryTarget = isYoutubeId ? `https://www.youtube.com/watch?v=${rawId}` : `ytsearch1:${rawId}`;

            const { stdout } = await execFileAsync(YTDLP_BIN, [
                '--js-runtimes', 'node:/usr/bin/node',
                '-g',
                '-f', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
                queryTarget
            ], { timeout: 18000 });

            streamUrl = (stdout || '').trim().split('\n')[0];
            if (streamUrl && streamUrl.startsWith('http')) {
                streamUrlCache.set(rawId, streamUrl);
                streamUrlCache.set(`${rawId}_time`, Date.now());
            }
        }

        if (!streamUrl || !streamUrl.startsWith('http')) {
            const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
            if (fs.existsSync(fallbackFile)) {
                return fs.createReadStream(fallbackFile).pipe(res);
            }
            return res.status(404).json({ success: false, message: "Audio stream tidak ditemukan." });
        }

        // Proxy audio stream dari GoogleVideo langsung ke client
        const clientReq = (streamUrl.startsWith('https') ? https : http).get(streamUrl, (upstreamRes) => {
            const rawType = upstreamRes.headers['content-type'] || 'audio/mp4';
            const contentType = rawType.includes('webm') ? 'audio/webm' : (rawType.includes('mp4') || rawType.includes('m4a') ? 'audio/mp4' : 'audio/mpeg');
            res.writeHead(upstreamRes.statusCode || 200, {
                'Content-Type': contentType,
                'Content-Length': upstreamRes.headers['content-length'],
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600'
            });
            upstreamRes.pipe(res);
        });

        clientReq.on('error', (err) => {
            console.warn('[Route: /api/music/stream] Proxy error:', err.message);
            if (!res.headersSent) {
                res.status(502).json({ success: false, message: "Gagal mem-proxy audio stream." });
            }
        });

        req.on('close', () => {
            clientReq.destroy();
        });
    } catch (err) {
        console.error('[Route: /api/music/stream] Extract error:', err.message);
        const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
        if (fs.existsSync(fallbackFile) && !res.headersSent) {
            return fs.createReadStream(fallbackFile).pipe(res);
        }
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Gagal mengekstrak audio." });
        }
    }
});

/**
 * POST /api/music/refresh or /api/tiktok-music/refresh
 * Endpoint sinkronisasi manual tangga lagu Top Hits RyTone (Admin/User)
 */
router.post('/refresh', async (req, res) => {
    try {
        const syncResult = await tiktokMusicService.syncTrendingMusic();
        res.json(syncResult);
    } catch (err) {
        console.error('[Route: /api/music/refresh] Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui tangga lagu', error: err.message });
    }
});

router.get('/refresh', async (req, res) => {
    try {
        const syncResult = await tiktokMusicService.syncTrendingMusic();
        res.json(syncResult);
    } catch (err) {
        console.error('[Route: /api/music/refresh] Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui tangga lagu', error: err.message });
    }
});

module.exports = router;
