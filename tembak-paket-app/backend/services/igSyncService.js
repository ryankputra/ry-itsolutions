/**
 * Instagram Highlight Sync (Testimoni) — PUBLIC, no login.
 *
 * IG internal API (highlights_tray) & GraphQL doc_id butuh login. Tapi HTML
 * profile publik (instagram.com/<username>/) mengandung RelayPreloader JSON
 * dengan lox_highlights_connection: id + title + cover URL. Cookie tidak
 * dipakai; header sec-fetch-* dokumen wajib, kalau tidak IG kasih shell JS
 * tanpa data.
 *
 * Cover URL signature (oh/oe) segar per request server — download di mesin
 * yang sama yang fetch HTML, langsung.
 *
 * Ponytail: hanya cover highlight (judul + foto). Isi story per highlight
 * butuh GraphQL doc_id login-gated; tambah kalau sudah ada token Graph API.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IG_DIR = path.join(__dirname, '..', '..', 'frontend-v2', 'public', 'ig-testi');
const MAX_HIGHLIGHTS = 8;

// User-agent desktop; IG menolak request tanpa UA yang masuk akal.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function syncInstagramFeed() {
    const username = process.env.IG_USERNAME || 'unlocksinyalsolo';
    if (!process.env.IG_SYNC_ENABLED) return;

    fs.mkdirSync(IG_DIR, { recursive: true });

    // 1. HTML profile publik.
    const res = await axios.get(`https://www.instagram.com/${username}/`, {
        timeout: 30000,
        responseType: 'text',
        headers: {
            'User-Agent': UA,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
        },
    });
    const html = res.data;
    if (!/lox_highlights_connection/.test(html)) {
        console.error('[IgSync] profile HTML tidak berisi data highlight (shell JS only).');
        return;
    }

    // 2. Ambil embedded JSON blob terbesar yang memuat highlights.
    let blob = null;
    for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
        if (/lox_highlights_connection/.test(m[1]) && (!blob || m[1].length > blob.length)) {
            blob = m[1];
        }
    }
    if (!blob) return;

    const data = JSON.parse(blob);
    const conn = (function walk(o) {
        if (!o || typeof o !== 'object') return null;
        if (Array.isArray(o)) {
            for (const v of o) { const r = walk(v); if (r) return r; }
            return null;
        }
        if (o.lox_highlights_connection) return o.lox_highlights_connection;
        for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
        return null;
    })(data);
    const edges = conn?.edges || [];

    // 3. Filter judul testimoni.
    const highlights = edges
        .map((e) => e.node)
        .filter((n) => n.title && /testi|ulasan|review/i.test(n.title))
        .slice(0, MAX_HIGHLIGHTS);

    if (!highlights.length) {
        console.log('[IgSync] tidak ada highlight testimoni.');
        return;
    }

    // 4. Hapus cover skema lama (hl-*.jpg) sebelum tulis ulang.
    for (const f of fs.readdirSync(IG_DIR)) {
        if (/^hl-.*\.(jpg|jpeg|png|webp)$/i.test(f)) {
            fs.unlinkSync(path.join(IG_DIR, f));
        }
    }

    // 5. Download cover + tulis meta.
    const metaHighlights = [];
    for (const [index, n] of highlights.entries()) {
        const file = `hl-${String(index).padStart(2, '0')}.jpg`;
        const target = path.join(IG_DIR, file);
        let ok = false;
        try {
            const img = await axios.get(n.cover_media_cropped_thumbnail_url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': UA, accept: 'image/*' },
            });
            fs.writeFileSync(target, Buffer.from(img.data));
            ok = true;
        } catch (e) {
            console.error(`[IgSync] cover gagal ${n.id}:`, e.message);
        }
        metaHighlights.push({
            id: n.id,
            title: String(n.title).slice(0, 40),
            cover: ok ? `/ig-testi/${file}` : null,
            url: `https://www.instagram.com/stories/highlights/${n.id}/`,
        });
    }

    const meta = { syncedAt: new Date().toISOString(), highlights: metaHighlights, stories: [] };
    fs.writeFileSync(path.join(IG_DIR, '_meta.json'), JSON.stringify(meta, null, 2));

    const okCount = metaHighlights.filter((h) => h.cover).length;
    console.log(`[IgSync] ${okCount}/${metaHighlights.length} highlight testimoni tersinkron.`);
}

module.exports = { syncInstagramFeed };
