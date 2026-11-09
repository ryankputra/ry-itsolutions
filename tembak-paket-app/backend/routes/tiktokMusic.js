const express = require('express');
const router = express.Router();
const tiktokMusicService = require('../services/tiktokMusicService');

/**
 * GET /api/music/feed or /api/music or /api/tiktok-music/feed or /api/tiktok-music
 * Public endpoint to fetch active trending TikTok/RyTone music catalog
 */
router.get(['/', '/feed'], (req, res) => {
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

/**
 * GET /api/music/search or /api/tiktok-music/search
 * Global live search endpoint for RyTone music catalog
 */
router.get('/search', async (req, res) => {
    try {
        const query = (req.query.q || req.query.query || '').trim().toLowerCase();
        const catalog = tiktokMusicService.getTracks();
        const tracks = catalog.tracks || [];
        if (!query) {
            return res.json({
                success: true,
                status: true,
                message: "Hasil pencarian musik RyTone",
                data: { tracks, total: tracks.length }
            });
        }
        let filtered = tracks.filter(t => 
            (t.title && t.title.toLowerCase().includes(query)) ||
            (t.artist && t.artist.toLowerCase().includes(query)) ||
            (t.category && t.category.toLowerCase().includes(query)) ||
            (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(query)))
        );

        // Live global search via iTunes API to discover any song in the world
        if (typeof tiktokMusicService.searchMusic === 'function') {
            try {
                const liveTracks = await tiktokMusicService.searchMusic(query, 25);
                if (Array.isArray(liveTracks) && liveTracks.length > 0) {
                    const seenKeys = new Set(filtered.map(t => `${(t.title || '').toLowerCase()}-${(t.artist || '').toLowerCase()}`));
                    for (const lt of liveTracks) {
                        const key = `${(lt.title || '').toLowerCase()}-${(lt.artist || '').toLowerCase()}`;
                        if (!seenKeys.has(key)) {
                            filtered.push(lt);
                            seenKeys.add(key);
                        }
                    }
                }
            } catch (searchErr) {
                console.warn('[Route: /api/music/search] Live search fallback warning:', searchErr.message);
            }
        }

        res.json({
            success: true,
            status: true,
            message: `Ditemukan ${filtered.length} lagu untuk kata kunci '${query}'`,
            total: filtered.length,
            tracks: filtered,
            data: filtered
        });
    } catch (err) {
        console.error('[Route: /api/music/search] Error:', err);
        res.status(500).json({
            success: false,
            status: false,
            message: "Gagal mencari musik RyTone",
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
    let rawId = (req.query.id || req.query.youtubeId || "").trim();
    if (!rawId) {
        return res.status(400).json({ success: false, message: "Parameter id lagu diperlukan." });
    }

    // 1. Cek apakah ini file lokal di folder audio (misal komang.mp3, djalay.mp3, dll)
    const localFilename = rawId.endsWith('.mp3') ? rawId : `${rawId}.mp3`;
    const localPath = path.join(AUDIO_DIR, localFilename);
    if (fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        // BUG FIX: Hanya layani file lokal jika ukurannya >= 1MB (lagu full durasi 3-5 menit).
        // File berukuran ~470KB adalah cuplikan iTunes preview 29 detik yang harus dialihkan ke full YouTube audio.
        if (stat.size >= 1000000) {
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
        } else {
            console.warn(`[Stream] File lokal ${localFilename} terdeteksi sebagai preview/cuplikan pendek (${stat.size} bytes). Mengalihkan ke YouTube audio full via yt-dlp...`);
            if (rawId.endsWith('.mp3')) {
                rawId = rawId.slice(0, -4);
            }
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

        // Helper untuk stream file lokal dengan dukungan HTTP Range (206 Partial Content)
        const streamLocalFile = (filePath) => {
            const stat = fs.statSync(filePath);
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, { start, end });
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
                return fs.createReadStream(filePath).pipe(res);
            }
        };

        if (!streamUrl || !streamUrl.startsWith('http')) {
            const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
            if (fs.existsSync(fallbackFile)) {
                return streamLocalFile(fallbackFile);
            }
            return res.status(404).json({ success: false, message: "Audio stream tidak ditemukan." });
        }

        // Proxy audio stream dari GoogleVideo langsung ke client dengan dukungan Range & User-Agent & Redirects
        const upstreamHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
        };
        if (req.headers.range) {
            upstreamHeaders['Range'] = req.headers.range;
        }

        const fetchStream = (targetUrl, redirectCount = 0) => {
            if (redirectCount > 4) {
                const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
                if (fs.existsSync(fallbackFile) && !res.headersSent) {
                    return fs.createReadStream(fallbackFile).pipe(res);
                }
                return res.status(502).json({ success: false, message: "Terlalu banyak redirect dari upstream audio." });
            }

            const clientReq = (targetUrl.startsWith('https') ? https : http).get(targetUrl, { headers: upstreamHeaders }, (upstreamRes) => {
                // Jika upstream redirect (301, 302, 307, 308), ikuti lokasi baru
                if ([301, 302, 307, 308].includes(upstreamRes.statusCode) && upstreamRes.headers.location) {
                    let nextUrl = upstreamRes.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        const parsed = new URL(targetUrl);
                        nextUrl = new URL(nextUrl, parsed.origin).href;
                    }
                    return fetchStream(nextUrl, redirectCount + 1);
                }

                if (upstreamRes.statusCode === 403 || upstreamRes.statusCode === 410) {
                    streamUrlCache.delete(rawId);
                    streamUrlCache.delete(`${rawId}_time`);
                    const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
                    if (fs.existsSync(fallbackFile) && !res.headersSent) {
                        return fs.createReadStream(fallbackFile).pipe(res);
                    }
                }

                const rawType = upstreamRes.headers['content-type'] || 'audio/mp4';
                const contentType = rawType.includes('webm') ? 'audio/webm' : (rawType.includes('mp4') || rawType.includes('m4a') ? 'audio/mp4' : 'audio/mpeg');
                const resHeaders = {
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=3600'
                };
                if (upstreamRes.headers['content-length']) {
                    resHeaders['Content-Length'] = upstreamRes.headers['content-length'];
                }
                if (upstreamRes.headers['content-range']) {
                    resHeaders['Content-Range'] = upstreamRes.headers['content-range'];
                }

                res.writeHead(upstreamRes.statusCode || 200, resHeaders);
                if (req.method !== 'HEAD') {
                    upstreamRes.pipe(res);
                } else {
                    res.end();
                }
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
        };

        fetchStream(streamUrl);
    } catch (err) {
        console.error('[Route: /api/music/stream] Extract error:', err.message);
        const fallbackFile = path.join(AUDIO_DIR, 'djalay.mp3');
        if (fs.existsSync(fallbackFile) && !res.headersSent) {
            const stat = fs.statSync(fallbackFile);
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(fallbackFile, { start, end });
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
                return fs.createReadStream(fallbackFile).pipe(res);
            }
        }
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Gagal mengekstrak audio." });
        }
    }
});

/**
 * POST /api/music/refresh, /api/music/sync, /api/tiktok-music/refresh, /api/tiktok-music/sync
 * Endpoint sinkronisasi manual tangga lagu Top Hits RyTone (Admin/User)
 */
router.post(['/refresh', '/sync'], async (req, res) => {
    try {
        const syncResult = await tiktokMusicService.syncTrendingMusic();
        res.json(syncResult);
    } catch (err) {
        console.error('[Route: /api/music/refresh] Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui tangga lagu', error: err.message });
    }
});

router.get(['/refresh', '/sync'], async (req, res) => {
    try {
        const syncResult = await tiktokMusicService.syncTrendingMusic();
        res.json(syncResult);
    } catch (err) {
        console.error('[Route: /api/music/refresh] Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui tangga lagu', error: err.message });
    }
});

module.exports = router;
