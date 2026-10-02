const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const IG_DIR = path.join(__dirname, '..', 'public', 'ig-testi');
const CACHE_TTL = 5 * 60 * 1000;
let cache = { at: 0, data: null };

// ponytail: manual upload dulu (taruh file di public/ig-testi).
// Cron igSyncService yang isi folder ini saat IG_GRAPH_TOKEN ter-set:
// - ig-testi-N.jpg  = cover highlight (judul TESTI/ULASAN/REVIEW)
// - ig-story-<id>.jpg = story 24 jam (diarsip permanen, cap 40)
// Feed post biasa TIDAK ditarik.

function scanDir() {
    try {
        const profile = fs.existsSync(path.join(IG_DIR, 'ig-profile.jpg'));

        // Cover highlight: ig-testi-N.jpg (index-based, isi cron).
        const covers = fs.readdirSync(IG_DIR)
            .filter((f) => /^ig-testi-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0], 10);
                const nb = parseInt(b.match(/\d+/)[0], 10);
                return na - nb;
            });

        // Stories: ig-story-<id>.jpg, urut termuda.
        const stories = fs.readdirSync(IG_DIR)
            .filter((f) => /^ig-story-.*\.jpg$/i.test(f))
            .map((f) => {
                const st = fs.statSync(path.join(IG_DIR, f));
                return { url: `/ig-testi/${f}`, timestamp: st.mtime.toISOString() };
            })
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // Metadata cron (judul highlight + story terarsip).
        let meta = null;
        try { meta = JSON.parse(fs.readFileSync(path.join(IG_DIR, '_meta.json'), 'utf8')); } catch {}

        const highlights = Array.isArray(meta?.highlights) && meta.highlights.length
            ? meta.highlights
            : covers.map((f, i) => ({ title: `TESTI ${i + 1}`, cover: `/ig-testi/${f}` }));

        return {
            profile,
            count: covers.length + stories.length,
            images: covers.map((f) => `/ig-testi/${f}`),
            highlights,
            stories: Array.isArray(meta?.stories) && meta.stories.length
                ? meta.stories.slice(0, 12)
                : stories.slice(0, 12)
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

module.exports = router;
