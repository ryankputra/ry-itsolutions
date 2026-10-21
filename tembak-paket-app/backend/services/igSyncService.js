/**
 * Instagram Highlight Sync (Testimoni) — PUBLIC, no login.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IG_DIR = path.join(__dirname, '..', '..', 'frontend-v2', 'public', 'ig-testi');
const MAX_HIGHLIGHTS = 8;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function syncInstagramFeed() {
    const username = process.env.IG_USERNAME || 'unlocksinyalsolo';
    if (!process.env.IG_SYNC_ENABLED) return;

    fs.mkdirSync(IG_DIR, { recursive: true });

    try {
        const res = await axios.get(`https://www.instagram.com/${username}/`, {
            timeout: 20000,
            responseType: 'text',
            headers: {
                'User-Agent': UA,
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9',
            },
        });
        const html = res.data;

        let blob = null;
        for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
            if (/edge_highlight_to_media|xdt_users__su_profile|highlights|lox_highlights_connection/i.test(m[1]) && (!blob || m[1].length > blob.length)) {
                blob = m[1];
            }
        }

        if (blob) {
            const data = JSON.parse(blob);
            const foundHighlights = (function walk(o) {
                if (!o || typeof o !== 'object') return [];
                if (Array.isArray(o)) {
                    for (const v of o) {
                        const r = walk(v);
                        if (r.length) return r;
                    }
                }
                if (o.edge_highlight_to_media?.edges || o.highlights || Array.isArray(o.edges)) {
                    const edges = o.edge_highlight_to_media?.edges || o.highlights || o.edges;
                    if (Array.isArray(edges) && edges.length > 0) {
                        return edges.map((e) => e.node || e);
                    }
                }
                for (const v of Object.values(o)) {
                    const r = walk(v);
                    if (r.length) return r;
                }
                return [];
            })(data);

            if (foundHighlights.length > 0) {
                const metaHighlights = [];
                for (const [index, n] of foundHighlights.slice(0, MAX_HIGHLIGHTS).entries()) {
                    const file = `hl-${String(index).padStart(2, '0')}.jpg`;
                    const target = path.join(IG_DIR, file);
                    const coverUrl = n.cover_media_cropped_thumbnail_url || n.cover_media?.thumbnail_src || n.thumbnail_src || n.cover;
                    let ok = false;
                    if (coverUrl) {
                        try {
                            const img = await axios.get(coverUrl, {
                                responseType: 'arraybuffer',
                                timeout: 15000,
                                headers: { 'User-Agent': UA },
                            });
                            fs.writeFileSync(target, Buffer.from(img.data));
                            ok = true;
                        } catch (e) {}
                    }
                    metaHighlights.push({
                        id: n.id || String(index),
                        title: String(n.title || `Testi ${index + 1}`).slice(0, 40),
                        cover: ok ? `/ig-testi/${file}` : (coverUrl || null),
                        url: `https://www.instagram.com/stories/highlights/${n.id || ''}/`,
                    });
                }
                const meta = { syncedAt: new Date().toISOString(), highlights: metaHighlights, stories: [] };
                fs.writeFileSync(path.join(IG_DIR, '_meta.json'), JSON.stringify(meta, null, 2));
                return;
            }
        }
    } catch (e) {}
}

module.exports = { syncInstagramFeed };
