/**
 * Instagram Highlight & Story Sync (Testimoni)
 * Tarik COVER highlight + story IG yang judulnya "TESTI/ULASAN/REVIEW"
 * ke public/ig-testi. Feed post biasa TIDAK disentuh.
 *
 * Kenapa highlight, bukan feed: testimoni order via WA diposting sebagai
 * story lalu dipinning ke highlight. Post feed biasa bukan testimoni.
 *
 * Setup (semua dari Meta for Developers):
 * 1. Buat app di https://developers.facebook.com -> tipe "Business".
 * 2. Tambah produk "Instagram Graph API".
 * 3. Dapatkan IG_USER_ID: buka Graph API Explorer, pilih aplikasi, lalu
 *    GET /me/accounts -> ambil id milik akun IG bisnis (bukan page id).
 * 4. Buat long-lived token: GET /oauth/access_token?grant_type=fb_exchange_token
 *    &client_token=<APP_TOKEN> (60 hari, perlu diperpanjang).
 * 5. Simpan di backend/.env: IG_GRAPH_TOKEN, IG_USER_ID.
 *
 * Limit: IG Graph API hanya untuk akun IG Business/Creator, bukan personal.
 * Field cover_media_url perlu izin instagram_manage_insights — kalau 404,
 * ganti field jadi 'media{id,media_url}' lalu ambil elemen pertama.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IG_DIR = path.join(__dirname, '..', 'public', 'ig-testi');
const MAX_MEDIA = 12;
const MAX_STORY_ARCHIVE = 40;

async function syncInstagramFeed() {
    const token = process.env.IG_GRAPH_TOKEN;
    const userId = process.env.IG_USER_ID;
    if (!token || !userId) return;

    fs.mkdirSync(IG_DIR, { recursive: true });

    // 1. Highlight (album story yang di-pin). Filter judul testimoni.
    // ponytail: Graph API tidak beri cover_media_url langsung di /highlights;
    // kalau field itu 404, fallback ambil gambar pertama dari tiap highlight.
    const hlRes = await axios.get(`https://graph.facebook.com/v21.0/${userId}/highlights`, {
        params: { fields: 'id,title,cover_media_url,media_count', limit: 25, access_token: token },
        timeout: 15000,
    }).catch((e) => {
        console.error('[IgSync] /highlights gagal:', e.message);
        return { data: { data: [] } };
    });

    const highlights = (hlRes.data?.data || [])
        .filter((h) => h.title && /testi|ulasan|review/i.test(h.title))
        .slice(0, MAX_MEDIA);

    for (const [index, h] of highlights.entries()) {
        if (!h.cover_media_url) continue;
        try {
            const img = await axios.get(h.cover_media_url, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(path.join(IG_DIR, `ig-testi-${index}.jpg`), Buffer.from(img.data));
        } catch (e) {
            console.error(`[IgSync] gagal unduh cover ${h.id}:`, e.message);
        }
    }

    // Hapus cover highlight sisa kalau jumlah baru < jumlah lama.
    const remainingHl = fs.readdirSync(IG_DIR).filter((f) => /^ig-testi-\d+\.jpg$/.test(f));
    for (const f of remainingHl) {
        const n = parseInt(f.match(/\d+/)[0], 10);
        if (n >= highlights.length) fs.unlinkSync(path.join(IG_DIR, f));
    }

    // 2. Stories aktif (24 jam). Disimpan permanen, id media jadi nama file
    // supaya story lama tidak hilang saat sinkron ulang. Cap MAX_MEDIA terbaru.
    const stRes = await axios.get(`https://graph.facebook.com/v21.0/${userId}/stories`, {
        params: { fields: 'id,media_type,media_url,timestamp', limit: 50, access_token: token },
        timeout: 15000,
    }).catch((e) => {
        console.error('[IgSync] /stories gagal:', e.message);
        return { data: { data: [] } };
    });

    const stories = (stRes.data?.data || [])
        .filter((s) => s.media_type === 'IMAGE' && s.media_url)
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
        .slice(0, MAX_MEDIA);

    for (const s of stories) {
        const target = path.join(IG_DIR, `ig-story-${s.id}.jpg`);
        if (fs.existsSync(target)) continue; // sudah pernah diunduh
        try {
            const img = await axios.get(s.media_url, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(target, Buffer.from(img.data));
        } catch (e) {
            console.error(`[IgSync] gagal unduh story ${s.id}:`, e.message);
        }
    }

    // Bentrok nama file lama (index-based) — hapus pola ig-story-NN.jpg lawas.
    for (const f of fs.readdirSync(IG_DIR)) {
        if (/^ig-story-\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(IG_DIR, f));
    }

    // Tulus metadata: judul highlight + daftar story (nama file + umur).
    const storyFiles = fs.readdirSync(IG_DIR)
        .filter((f) => /^ig-story-.*\.jpg$/.test(f))
        .map((f) => {
            const st = fs.statSync(path.join(IG_DIR, f));
            return { url: `/ig-testi/${f}`, at: st.mtime.toISOString() };
        })
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, MAX_STORY_ARCHIVE);

    // Hapus story arsip lama di luar cap.
    for (const f of fs.readdirSync(IG_DIR)) {
        if (!/^ig-story-.*\.jpg$/.test(f)) continue;
        const keep = storyFiles.some((s) => s.url === `/ig-testi/${f}`);
        if (!keep) fs.unlinkSync(path.join(IG_DIR, f));
    }

    fs.writeFileSync(
        path.join(IG_DIR, '_meta.json'),
        JSON.stringify({
            highlights: highlights.map((h, index) => ({
                title: String(h.title).slice(0, 40),
                cover: `/ig-testi/ig-testi-${index}.jpg`,
                mediaCount: h.media_count,
            })),
            stories: storyFiles.map((s) => ({ url: s.url, timestamp: s.at })),
        }, null, 2)
    );

    console.log(`[IgSync] ${highlights.length} highlight + ${storyFiles.length} story tesinkron.`);
}

module.exports = { syncInstagramFeed };
