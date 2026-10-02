const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const IG_DIR = path.join(__dirname, '..', '..', 'frontend-v2', 'public', 'ig-testi');
const CACHE_TTL = 5 * 60 * 1000;
let cache = { at: 0, data: null };

/**
 * GET /api/ig-feed
 * Daftar highlight testimoni IG + isinya (untuk lightbox) + stories.
 *
 * Sumber: cron igSyncService (session cookie IG). Tanpa IG_SESSION, cron
 * no-op dan endpoint ini mengembalikan apa adanya di folder ig-testi.
 *
 * _meta.json (ditulis cron):
 * {
 *   syncedAt,
 *   highlights: [{ id, title, cover, mediaCount, items: [{url, takenAt}] }],
 *   stories:    [{ url, takenAt }]
 * }
 */

function readMeta() {
    try {
        const raw = fs.readFileSync(path.join(IG_DIR, '_meta.json'), 'utf8');
        const m = JSON.parse(raw);
        return m && Array.isArray(m.highlights) ? m : null;
    } catch {
        return null;
    }
}

function scanDir() {
    try {
        const meta = readMeta();
        const profile = fs.existsSync(path.join(IG_DIR, 'ig-profile.jpg'));

        // Skema baru (cron cookie): highlight + item penuh dari _meta.json.
        if (meta) {
            const highlights = meta.highlights.slice(0, 8);
            const stories = (meta.stories || []).slice(0, 12);
            return {
                profile,
                syncedAt: meta.syncedAt || null,
                count: highlights.reduce((n, h) => n + (h.items?.length || 0), 0),
                images: highlights.flatMap((h) => (h.items || []).map((i) => i.url)),
                highlights,
                stories,
            };
        }

        // Fallback skema lama (upload manual ig-testi-N.jpg).
        const files = fs.readdirSync(IG_DIR)
            .filter((f) => /^ig-testi-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0], 10);
                const nb = parseInt(b.match(/\d+/)[0], 10);
                return na - nb;
            });

        return {
            profile,
            syncedAt: null,
            count: files.length,
            images: files.map((f) => `/ig-testi/${f}`),
            highlights: files.map((f, i) => ({
                title: `TESTI ${i + 1}`,
                cover: `/ig-testi/${f}`,
                items: [{ url: `/ig-testi/${f}` }],
            })),
            stories: [],
        };
    } catch {
        return { profile: false, count: 0, images: [], highlights: [], stories: [] };
    }
}

// GET /api/ig-feed -- daftar testimoni IG yang tersedia
router.get('/ig-feed', async (req, res) => {
    try {
        if (cache.data && Date.now() - cache.at < CACHE_TTL) {
            return res.json({ status: true, ...cache.data });
        }
        const data = scanDir();
        cache = { at: Date.now(), data };
        return res.json({ status: true, ...data });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
});

// POST /api/ig-feed/sync -- jalankan sync sekarang (admin manual).
// ponytail: tanpa auth karena belum punya skema admin global; endpoint hanya
// memicu sync (baca-only ke IG). Tambah middleware auth kalau sudah ada.
router.post('/ig-feed/sync', async (req, res) => {
    try {
        cache = { at: 0, data: null };
        const { syncInstagramFeed } = require('../services/igSyncService');
        await syncInstagramFeed();
        return res.json({ status: true, data: scanDir() });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
