/**
 * Instagram Highlight Sync (Testimoni) — via session cookie
 *
 * Tarik highlight ASLI IG (judul + cover + SEMUA isi story) lewat internal
 * web API yang dipakai situs viewer. Feed post biasa TIDAK disentuh.
 *
 * Kenapa bukan Graph API: Graph Meta tidak punya endpoint /highlights.
 * Yang ada cuma /stories (24 jam) + /media (feed). Highlight asli hanya
 * lewat instagram.com/api/v1/highlights/{uid}/highlights_tray/.
 *
 * Setup:
 * 1. Login instagram.com di browser (Chrome/Firefox), profil unlocksinyalsolo.
 * 2. DevTools (F12) -> Application/Storage -> Cookies -> https://www.instagram.com
 * 3. Copy nilai "sessionid" (string panjang).
 * 4. Cari IG user id: buka https://www.instagram.com/unlocksinyalsolo/?__a=1
 *    saat login, atau cari "logging_page_id" / "user_id" di source profile.
 * 5. Simpan di backend/.env: IG_SESSION=..., IG_USER_ID=...
 *
 * Cookie kadaluarsa. Kalau sync mulai gagal (401/login_required), ulangi
 * langkah 1-3 dan ganti IG_SESSION.
 *
 * Rate limit: sync tiap 30 menit aman. IG internal API batas kasar ~200
 * request/jam per session.
 *
 * Keamanan: IG_SESSION = kredensial. Folder backend/.env harus 600 dan
 * JANGAN pernah di-commit (sudah di .gitignore).
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IG_DIR = path.join(__dirname, '..', 'public', 'ig-testi');
const MAX_HIGHLIGHTS = 8;
const MAX_ITEMS_PER_HIGHLIGHT = 30;
const MAX_STORY_ARCHIVE = 40;

// User-agent desktop; IG menolak request tanpa UA yang masuk akal.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function client(cookie) {
    return axios.create({
        baseURL: 'https://www.instagram.com/api/v1',
        timeout: 20000,
        headers: {
            'User-Agent': UA,
            'x-ig-app-id': '936619743392459', // web app id publik IG
            cookie: `sessionid=${cookie}`,
            accept: 'application/json',
        },
    });
}

// Ambil URL gambar kualitas terbaik dari item story.
function imageUrl(item) {
    const v2 = item.image_versions2?.candidates || [];
    const best = v2
        .filter((c) => c.width && c.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    return best?.url || item.thumbnail_url || null;
}

async function download(url, target) {
    if (fs.existsSync(target)) return true;
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': UA },
            maxRedirects: 5,
        });
        fs.writeFileSync(target, Buffer.from(res.data));
        return true;
    } catch (e) {
        console.error(`[IgSync] gagal unduh ${path.basename(target)}:`, e.message);
        return false;
    }
}

function tsToISO(ts) {
    const n = Number(ts);
    return Number.isFinite(n) ? new Date(n * 1000).toISOString() : null;
}

async function syncInstagramFeed() {
    const cookie = process.env.IG_SESSION;
    const userId = process.env.IG_USER_ID;
    if (!cookie || !userId) return;

    fs.mkdirSync(IG_DIR, { recursive: true });
    const api = client(cookie);

    // 1. Highlight tray: judul asli + cover + id album.
    let tray = [];
    try {
        const res = await api.get(`/highlights/${userId}/highlights_tray/`, {
            params: { include_avatars: true },
        });
        tray = res.data?.items || [];
    } catch (e) {
        const code = e.response?.status;
        const body = e.response?.data && JSON.stringify(e.response.data).slice(0, 140);
        console.error(`[IgSync] highlights_tray gagal (${code}):`, e.message, body);
        return; // cookie kadaluarsa atau IP diblok — jangan lanjut
    }

    // Hanya highlight testimoni (judul mengandung testi/ulasan/review).
    const highlights = tray
        .filter((h) => h.title && /testi|ulasan|review/i.test(String(h.title)))
        .slice(0, MAX_HIGHLIGHTS);

    if (!highlights.length) {
        console.log('[IgSync] tidak ada highlight testimoni, sync dihentikan.');
        return;
    }

    // Bersihkan highlight lama: file ig-hl-*.jpg + ig-testi-*.jpg (skema lama).
    for (const f of fs.readdirSync(IG_DIR)) {
        if (/^ig-(hl|testi)-/.test(f)) fs.unlinkSync(path.join(IG_DIR, f));
    }

    // 2. Untuk tiap highlight, tarik ISI story lengkap (bisa untuk lightbox).
    const metaHighlights = [];
    for (const [index, h] of highlights.entries()) {
        const hid = String(h.id).replace('highlight:', '');
        const prefix = `ig-hl-${index}`;

        const coverUrl = h.cover_media?.cropped_image_version?.url
            || h.cover_media?.image_version?.url
            || null;

        const entry = {
            id: hid,
            title: String(h.title).slice(0, 40),
            cover: coverUrl ? `/ig-testi/${prefix}-cover.jpg` : null,
            mediaCount: h.media_count || 0,
            items: [],
        };

        if (coverUrl) {
            await download(coverUrl, path.join(IG_DIR, `${prefix}-cover.jpg`));
        }

        // Isi highlight: /highlights/{hid}/feed.
        try {
            const res = await api.get(`/highlights/${hid}/feed/`, {
                params: { count: MAX_ITEMS_PER_HIGHLIGHT },
            });
            const items = res.data?.items || [];

            for (const [i, item] of items.entries()) {
                // Lewati video: hanya simpan screenshot/thumbnail.
                if (item.media_type === 2) continue;
                const url = imageUrl(item);
                if (!url) continue;

                const file = `${prefix}-${String(i).padStart(2, '0')}.jpg`;
                const ok = await download(url, path.join(IG_DIR, file));
                if (ok) {
                    entry.items.push({
                        url: `/ig-testi/${file}`,
                        takenAt: tsToISO(item.taken_at),
                    });
                }
            }
        } catch (e) {
            console.error(`[IgSync] feed highlight ${hid} gagal:`, e.message);
        }

        metaHighlights.push(entry);
    }

    // 3. Stories aktif (24 jam), supaya testimoni terbaru tetap tampil walau
    //    belum dipinning ke highlight.
    const storyEntries = [];
    try {
        const res = await api.get(`/feed/user/${userId}/story/`);
        const items = res.data?.reel?.items || res.data?.items || [];

        for (const item of items) {
            if (item.media_type === 2) continue; // video
            const url = imageUrl(item);
            if (!url) continue;

            const file = `ig-story-${item.id}.jpg`;
            const ok = await download(url, path.join(IG_DIR, file));
            if (ok) {
                storyEntries.push({
                    url: `/ig-testi/${file}`,
                    takenAt: tsToISO(item.taken_at),
                });
            }
        }
    } catch (e) {
        // Story 24 jam opsional — jangan gagalkan sync highlight.
        console.error('[IgSync] story feed gagal:', e.message);
    }

    // Hapus story arsip di luar cap (termuda dipertahankan).
    const allStories = fs.readdirSync(IG_DIR)
        .filter((f) => /^ig-story-.*\.jpg$/.test(f))
        .map((f) => ({ f, at: fs.statSync(path.join(IG_DIR, f)).mtime.toISOString() }))
        .sort((a, b) => b.at.localeCompare(a.at));

    for (const s of allStories.slice(MAX_STORY_ARCHIVE)) {
        fs.unlinkSync(path.join(IG_DIR, s.f));
    }

    // 4. Tulis metadata: judul asli + cover + item penuh tiap highlight.
    const meta = {
        syncedAt: new Date().toISOString(),
        highlights: metaHighlights,
        stories: storyEntries
            .concat(allStories.slice(0, MAX_STORY_ARCHIVE).map((s) => ({
                url: `/ig-testi/${s.f}`,
                takenAt: null, // mtime, bukan taken_at asli
            })))
            .filter((v, i, arr) => arr.findIndex((x) => x.url === v.url) === i)
            .slice(0, MAX_STORY_ARCHIVE),
    };

    fs.writeFileSync(path.join(IG_DIR, '_meta.json'), JSON.stringify(meta, null, 2));

    const totalItems = metaHighlights.reduce((n, h) => n + h.items.length, 0);
    console.log(`[IgSync] ${metaHighlights.length} highlight (${totalItems} item) + `
        + `${meta.stories.length} story tersinkron.`);
}

module.exports = { syncInstagramFeed };
