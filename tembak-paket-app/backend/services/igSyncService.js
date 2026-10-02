/**
 * Instagram Feed Sync
 * Tarik media testimoni IG terbaru ke public/ig-testi via Graph API.
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
 * Media yang diambil otomatis difilter hanya yang berisi testimoni.
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

    const url = `https://graph.facebook.com/v21.0/${userId}/media`;
    const { data } = await axios.get(url, {
        params: {
            fields: 'id,media_type,media_url,permalink,caption,timestamp',
            limit: 25,
            access_token: token,
        },
        timeout: 15000,
    });

    const media = (data?.data || [])
        .filter((m) => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM')
        .slice(0, MAX_MEDIA);

    if (!media.length) return;

    fs.mkdirSync(IG_DIR, { recursive: true });

    // Tulis metadata supaya frontend tahu caption + permalink asli.
    fs.writeFileSync(
        path.join(IG_DIR, '_meta.json'),
        JSON.stringify(media.map((m) => ({
            id: m.id,
            url: `/ig-testi/${m.id}.jpg`,
            caption: String(m.caption || '').slice(0, 220),
            permalink: m.permalink,
            timestamp: m.timestamp,
        })), null, 2)
    );

    // Download gambar ke folder (timpa yang lama).
    for (const [index, m] of media.entries()) {
        const target = path.join(IG_DIR, `ig-testi-${index}.jpg`);
        try {
            const img = await axios.get(m.media_url, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(target, Buffer.from(img.data));
        } catch (e) {
            console.error(`[IgSync] gagal unduh ${m.id}:`, e.message);
        }
    }

    // Hapus file sisa kalau jumlah media baru < jumlah lama.
    const remaining = fs.readdirSync(IG_DIR).filter((f) => /^ig-testi-\d+\.jpg$/.test(f));
    for (const f of remaining) {
        const n = parseInt(f.match(/\d+/)[0], 10);
        if (n >= media.length) fs.unlinkSync(path.join(IG_DIR, f));
    }

    // Salin profile picture dari media pertama kalau belum ada.
    const profilePath = path.join(IG_DIR, 'ig-profile.jpg');
    if (!fs.existsSync(profilePath) && media[0]?.media_url) {
        try {
            const img = await axios.get(media[0].media_url, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(profilePath, Buffer.from(img.data));
        } catch (e) {
            console.error('[IgSync] gagal simpan profile:', e.message);
        }
    }

    console.log(`[IgSync] ${media.length} testimoni tersinkron.`);
}

module.exports = { syncInstagramFeed };
