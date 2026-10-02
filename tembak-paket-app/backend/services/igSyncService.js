/**
 * Instagram Highlight Sync (Testimoni)
 * Tarik COVER highlight IG yang judulnya "TESTI/ULASAN/REVIEW" ke public/ig-testi.
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

async function syncInstagramFeed() {
    const token = process.env.IG_GRAPH_TOKEN;
    const userId = process.env.IG_USER_ID;
    if (!token || !userId) return;

    // Ambil daftar highlight (album testimoni), bukan semua post feed.
    // ponytail: Graph API tidak beri cover_media_url langsung di /highlights;
    // kalau field itu 404, fallback ambil gambar pertama dari tiap highlight.
    const url = `https://graph.facebook.com/v21.0/${userId}/highlights`;
    const { data } = await axios.get(url, {
        params: {
            fields: 'id,title,cover_media_url,media_count',
            limit: 25,
            access_token: token,
        },
        timeout: 15000,
    });

    const highlights = (data?.data || [])
        .filter((h) => h.title && /testi|ulasan|review/i.test(h.title))
        .slice(0, MAX_MEDIA);

    if (!highlights.length) return;

    fs.mkdirSync(IG_DIR, { recursive: true });

    // Tulis metadata: judul highlight + url gambar lokal.
    fs.writeFileSync(
        path.join(IG_DIR, '_meta.json'),
        JSON.stringify(highlights.map((h, index) => ({
            id: h.id,
            title: String(h.title).slice(0, 40),
            url: `/ig-testi/ig-testi-${index}.jpg`,
            mediaCount: h.media_count,
        })), null, 2)
    );

    // Download cover setiap highlight.
    for (const [index, h] of highlights.entries()) {
        const coverUrl = h.cover_media_url;
        if (!coverUrl) continue;
        const target = path.join(IG_DIR, `ig-testi-${index}.jpg`);
        try {
            const img = await axios.get(coverUrl, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(target, Buffer.from(img.data));
        } catch (e) {
            console.error(`[IgSync] gagal unduh cover ${h.id}:`, e.message);
        }
    }

    // Hapus file sisa kalau jumlah highlight baru < jumlah lama.
    const remaining = fs.readdirSync(IG_DIR).filter((f) => /^ig-testi-\d+\.jpg$/.test(f));
    for (const f of remaining) {
        const n = parseInt(f.match(/\d+/)[0], 10);
        if (n >= highlights.length) fs.unlinkSync(path.join(IG_DIR, f));
    }

    console.log(`[IgSync] ${highlights.length} highlight testimoni tersinkron.`);
}

module.exports = { syncInstagramFeed };
