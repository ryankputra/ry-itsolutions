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
            message: "Berhasil memuat katalog lagu Spotify Top Hits",
            data: catalog
        });
    } catch (err) {
        console.error('[Route: /api/music] Error:', err);
        res.status(500).json({
            success: false,
            status: false,
            message: "Gagal memuat katalog lagu Spotify",
            error: err.message
        });
    }
});

/**
 * POST /api/tiktok-music/sync or /api/music/sync
 * Endpoint to trigger automated update / verification of real Spotify Top Hits
 */
router.post('/sync', async (req, res) => {
    try {
        const result = await tiktokMusicService.syncTrendingMusic();
        res.json(result);
    } catch (err) {
        console.error('[Route: /api/music/sync] Error:', err);
        res.status(500).json({
            success: false,
            status: false,
            message: "Gagal memperbarui tangga lagu Spotify",
            error: err.message
        });
    }
});

module.exports = router;
