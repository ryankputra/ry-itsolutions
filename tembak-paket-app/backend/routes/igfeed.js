const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const IG_DIR = path.join(__dirname, '..', 'public', 'ig-testi');
const CACHE_TTL = 5 * 60 * 1000;
let cache = { at: 0, data: null };

// ponytail: manual upload dulu (taruh file di public/ig-testi).
// Saat token IG Graph siap, ganti body scanDir() dgn fetch ke
// https://graph.facebook.com/v21.0/me/media?fields=media_url,caption,timestamp&access_token=...
// dan simpan hasilnya ke ig-testi/ + _meta.json oleh cron.

function scanDir() {
    try {
        const profile = fs.existsSync(path.join(IG_DIR, 'ig-profile.jpg'));
        const files = fs.readdirSync(IG_DIR)
            .filter((f) => /^ig-testi-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0], 10);
                const nb = parseInt(b.match(/\d+/)[0], 10);
                return na - nb;
            });

        // Judul highlight dari metadata cron (kalau ada).
        let highlights = [];
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(IG_DIR, '_meta.json'), 'utf8'));
            if (Array.isArray(meta)) {
                highlights = meta.map((m) => ({ title: String(m.title || 'TESTI'), count: Number(m.mediaCount) || 0 }));
            }
        } catch {}

        return {
            profile,
            count: files.length,
            images: files.map((f) => `/ig-testi/${f}`),
            highlights
        };
    } catch {
        return { profile: false, count: 0, images: [], highlights: [] };
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

module.exports = router;
