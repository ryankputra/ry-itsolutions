/**
 * TikTok DJ Remix Manager & Automated 3-Day Lifecycle Rotator
 * Mengelola lagu viral DJ Remix TikTok untuk bahan Story IG, Story WA, dan Feed
 * Aturan:
 * 1. Khusus lagu DJ Remix viral di TikTok (Jedag-Jedug, Full Bass, Koplo, Slow Bass).
 * 2. Lagu otomatis dimulai langsung dari reff / drop bass jedag-jedug.
 * 3. Retensi ketat 3 HARI (72 JAM): Lagu > 3 hari otomatis dihapus dari database & disk.
 * 4. Pembaruan otomatis setiap hari pukul 03:30 WIB atau on-demand via bot WhatsApp (#refreshlagu).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const DATA_FILE = path.resolve(__dirname, '../data/tiktok_dj_tracks.json');
const AUDIO_DIR = path.resolve(__dirname, '../../frontend-v2/public/audio/tiktok');
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // Tepat 3 Hari (72 Jam)

const FFMPEG_BIN = process.env.FFMPEG_PATH || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg');

// Starter Katalog DJ Remix Viral TikTok dengan Drop Bass & Reff Cepat
const BASE_CORE_DJ_TRACKS = [
    { title: 'DJ Alay Gaya Kaya Artis (Viral TikTok Remix)', artist: 'DJ Desa', filename: 'djalay.mp3', reffSec: 18, isCore: true },
    { title: 'Stecu Stecu (Jedag Jedug TikTok Remix)', artist: 'Faris Adam', filename: 'stecustecu.mp3', reffSec: 15, isCore: true },
    { title: 'Tabrak Tabrak Masuk (Remix TikTok Full Bass)', artist: 'Richard Jersey', filename: 'tabraktabrak.mp3', reffSec: 20, isCore: true },
    { title: 'Malam Pagi (Remix Jedag Jedug TikTok)', artist: 'Saixse ft. MK', filename: 'malampagi.mp3', reffSec: 25, isCore: true },
    { title: 'Cikini Ke Gondangdia (DJ Koplo Remix TikTok)', artist: 'Duo Anggrek Remix', filename: 'cikini.mp3', reffSec: 16, isCore: true },
    { title: 'Karna Su Sayang (DJ Remix TikTok Viral)', artist: 'Near ft. Dian Sorowea', filename: 'karnasusayang.mp3', reffSec: 22, isCore: true },
    { title: 'Sial (DJ Speed Up Jedag Jedug TikTok)', artist: 'Mahalini Remix', filename: 'sial.mp3', reffSec: 30, isCore: true },
    { title: 'Garam & Madu (DJ Remix TikTok Bass)', artist: 'Tenxi & Asmara', filename: 'garammadu.mp3', reffSec: 18, isCore: true },
    { title: 'Cupid (Speed Up Twin Ver TikTok Remix)', artist: 'FIFTY FIFTY', filename: 'cupid.mp3', reffSec: 15, isCore: true },
    { title: 'Sigar (DJ Jedag Jedug Koplo TikTok)', artist: 'Denny Caknan Remix', filename: 'sigar.mp3', reffSec: 28, isCore: true },
    { title: 'Cundamani (DJ Slow Bass Remix TikTok)', artist: 'Denny Caknan Remix', filename: 'cundamani.mp3', reffSec: 25, isCore: true },
    { title: 'Wirang (DJ Remix Full Bass TikTok)', artist: 'Denny Caknan Remix', filename: 'wirang.mp3', reffSec: 20, isCore: true },
    { title: 'APT. (DJ TikTok Viral Remix)', artist: 'ROSÉ & Bruno Mars', filename: 'apt.mp3', reffSec: 12, isCore: true },
    { title: 'Die With A Smile (DJ Slow TikTok Remix)', artist: 'Lady Gaga & Bruno Mars', filename: 'diewithasmile.mp3', reffSec: 42, isCore: true },
    { title: 'Komang (DJ Santuy Remix TikTok)', artist: 'Raim Laode', filename: 'komang.mp3', reffSec: 24, isCore: true }
];

class TikTokDJService {
    constructor() {
        this.tracks = [];
        this.lastRotated = 0;
        this.init();
    }

    init() {
        if (!fs.existsSync(AUDIO_DIR)) {
            try { fs.mkdirSync(AUDIO_DIR, { recursive: true }); } catch {}
        }
        this.loadRegistry();
        this.cleanExpiredTracks();
    }

    loadRegistry() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                if (Array.isArray(raw.tracks) && raw.tracks.length > 0) {
                    this.tracks = raw.tracks;
                    this.lastRotated = raw.lastRotated || 0;
                    return;
                }
            }
        } catch (e) {
            console.warn('[TikTokDJService] Load registry error:', e.message);
        }

        // Inisialisasi awal dengan base core tracks (dengan timestamp sekarang)
        const now = Date.now();
        this.tracks = BASE_CORE_DJ_TRACKS.map((t, idx) => ({
            id: `dj-core-${idx + 1}`,
            ...t,
            addedAt: now,
            isCore: true
        }));
        this.saveRegistry();
    }

    saveRegistry() {
        try {
            const dataDir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            fs.writeFileSync(DATA_FILE, JSON.stringify({
                lastRotated: this.lastRotated || Date.now(),
                retentionDays: 3,
                retentionHours: 72,
                totalActive: this.tracks.length,
                tracks: this.tracks
            }, null, 2), 'utf8');
        } catch (e) {
            console.error('[TikTokDJService] Gagal menyimpan registry:', e.message);
        }
    }

    /**
     * Hapus lagu yang berusia > 3 hari (72 jam) secara otomatis
     * File audio fisik yang tidak lagi dipakai juga dihapus dari disk
     */
    cleanExpiredTracks() {
        const now = Date.now();
        const initialCount = this.tracks.length;
        const remaining = [];
        let deletedFiles = 0;

        for (const track of this.tracks) {
            const ageMs = now - (track.addedAt || 0);
            const isExpired = ageMs > RETENTION_MS;

            if (isExpired) {
                // Hapus file fisik jika file merupakan hasil download dinamis
                if (track.isDynamic && track.filename) {
                    const filePath = path.join(AUDIO_DIR, track.filename);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            deletedFiles++;
                        } catch {}
                    }
                }
                console.log(`[TikTokDJService] 🗑️ Menghapus lagu kedaluwarsa (> 3 hari): ${track.title}`);
            } else {
                remaining.push(track);
            }
        }

        // Jika semua lagu habis terhapus karena lewat 3 hari, hidupkan kembali starter pool agar sistem tidak kosong
        if (remaining.length === 0) {
            console.log('[TikTokDJService] 🔄 Semua lagu melewati masa 3 hari, me-refresh starter pool dengan siklus baru...');
            this.tracks = BASE_CORE_DJ_TRACKS.map((t, idx) => ({
                id: `dj-core-${idx + 1}-${Date.now()}`,
                ...t,
                addedAt: now,
                isCore: true
            }));
            this.saveRegistry();
            return;
        }

        this.tracks = remaining;
        if (this.tracks.length !== initialCount) {
            console.log(`[TikTokDJService] Pembersihan 3 hari selesai: ${initialCount - this.tracks.length} lagu kedaluwarsa dibersihkan (${deletedFiles} file dihapus). Sisa aktif: ${this.tracks.length} lagu.`);
            this.saveRegistry();
        }
    }

    /**
     * Ambil daftar lagu DJ Remix aktif untuk Story & Feed (selalu valid < 3 hari)
     */
    getActiveTracks() {
        this.cleanExpiredTracks();
        if (this.tracks.length === 0) {
            this.loadRegistry();
        }
        return this.tracks;
    }

    /**
     * Pilih 1 lagu acak yang masih fresh (< 3 hari)
     */
    getRandomDJTrack() {
        const active = this.getActiveTracks();
        return active[Math.floor(Math.random() * active.length)];
    }

    /**
     * Ambil n lagu acak tanpa duplikasi
     */
    getUniqueDJTracks(count) {
        const active = [...this.getActiveTracks()];
        const shuffled = active.sort(() => 0.5 - Math.random());
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(shuffled[i % shuffled.length]);
        }
        return result;
    }

    /**
     * Cari lagu DJ Remix TikTok yang sedang viral hari ini via iTunes API
     * Menggunakan filter ketat kata kunci jedag-jedug, remix, koplo, slow bass
     */
    async searchViralDJRemixes() {
        const queries = [
            "DJ Jedag Jedug TikTok Viral",
            "DJ Remix TikTok Full Bass",
            "DJ Koplo TikTok Viral",
            "DJ TikTok Mengkane",
            "DJ Slow Bass TikTok",
            "DJ FYP TikTok Terpopuler",
            "DJ Remix Jedug Jedug"
        ];

        const isDJRemix = (trackName, artistName) => {
            const pattern = /(dj|remix|jedag|jedug|koplo|slow bass|mengkane|full bass|kane)/i;
            return pattern.test(trackName || '') || pattern.test(artistName || '');
        };

        const discovered = [];
        const seenTitles = new Set();

        for (const q of queries) {
            try {
                const res = await new Promise((resolve) => {
                    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=id&media=music&entity=song&limit=10`;
                    https.get(url, { timeout: 6000 }, (r) => {
                        let d = '';
                        r.on('data', c => d += c);
                        r.on('end', () => {
                            try { resolve(JSON.parse(d)); } catch { resolve(null); }
                        });
                    }).on('error', () => resolve(null));
                });

                if (res?.results) {
                    for (const item of res.results) {
                        if (item.trackName && item.artistName && item.previewUrl) {
                            if (isDJRemix(item.trackName, item.artistName)) {
                                const cleanKey = item.trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (!seenTitles.has(cleanKey)) {
                                    seenTitles.add(cleanKey);
                                    discovered.push({
                                        title: item.trackName,
                                        artist: item.artistName,
                                        previewUrl: item.previewUrl,
                                        durationSec: Math.round((item.trackTimeMillis || 30000) / 1000),
                                        reffSec: 0 // Preview klip iTunes sudah tepat di drop beat / reff
                                    });
                                }
                            }
                        }
                    }
                }
            } catch {}
        }
        return discovered;
    }

    /**
     * Download dan konversi audio preview menjadi file MP3 lokal
     */
    async downloadAudioToLocal(previewUrl, targetFilename) {
        return new Promise((resolve) => {
            try {
                const tempDir = os.tmpdir();
                const tempExt = path.extname(previewUrl.split('?')[0]) || '.m4a';
                const tempInput = path.join(tempDir, `preview_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${tempExt}`);
                const finalOutput = path.join(AUDIO_DIR, targetFilename);

                const fileStream = fs.createWriteStream(tempInput);
                const req = https.get(previewUrl, { timeout: 15000 }, (res) => {
                    if (res.statusCode !== 200) {
                        fileStream.close();
                        try { fs.unlinkSync(tempInput); } catch {}
                        return resolve(false);
                    }
                    res.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        // Konversi ke MP3 berkualitas standar untuk Instagram
                        execFile(FFMPEG_BIN, ['-y', '-i', tempInput, '-c:a', 'libmp3lame', '-b:a', '128k', finalOutput], (err) => {
                            try { fs.unlinkSync(tempInput); } catch {}
                            if (err) {
                                console.warn('[TikTokDJService] FFmpeg conversion failed, trying direct copy:', err.message);
                                try {
                                    fs.copyFileSync(tempInput, finalOutput);
                                    return resolve(true);
                                } catch {
                                    return resolve(false);
                                }
                            }
                            resolve(true);
                        });
                    });
                });

                req.on('error', () => {
                    try { fs.unlinkSync(tempInput); } catch {}
                    resolve(false);
                });
            } catch {
                resolve(false);
            }
        });
    }

    /**
     * Rotasi harian: Hapus lagu > 3 hari & perbarui dengan DJ Remix baru
     */
    async rotateAndRefreshDJTracks() {
        console.log('[TikTokDJService] 🔄 Menjalankan rotasi lagu DJ Remix TikTok (Retensi 3 Hari)...');
        this.cleanExpiredTracks();

        try {
            const discovered = await this.searchViralDJRemixes();
            const now = Date.now();
            let addedCount = 0;

            for (const item of discovered) {
                // Hindari duplikasi judul
                const exists = this.tracks.some(t => t.title.toLowerCase() === item.title.toLowerCase());
                if (!exists && addedCount < 8) {
                    const randId = Math.random().toString(36).substring(2, 8);
                    const filename = `dj_remix_${randId}.mp3`;

                    // Download audio langsung dari previewUrl
                    const downloaded = await this.downloadAudioToLocal(item.previewUrl, filename);
                    if (downloaded) {
                        const newTrack = {
                            id: `dj-viral-${randId}`,
                            title: item.title,
                            artist: item.artist,
                            filename: filename,
                            reffSec: 0, // Audio preview langsung di bagian drop bass jedag-jedug
                            addedAt: now,
                            isCore: false,
                            isDynamic: true
                        };
                        this.tracks.unshift(newTrack); // Lagu terbaru ditaruh paling depan
                        addedCount++;
                    }
                }
            }

            this.lastRotated = now;
            this.saveRegistry();
            console.log(`[TikTokDJService] ✅ Rotasi sukses: ${addedCount} lagu DJ Remix TikTok baru berhasil diunduh. Total aktif (< 3 hari): ${this.tracks.length} lagu.`);
            return {
                success: true,
                addedCount,
                totalActive: this.tracks.length,
                tracks: this.tracks.slice(0, 5).map(t => ({ title: t.title, artist: t.artist }))
            };
        } catch (err) {
            console.error('[TikTokDJService] Gagal menjalankan rotasi lagu DJ:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Rangkuman status lagu untuk notifikasi / bot WhatsApp
     */
    getStatusSummary() {
        this.cleanExpiredTracks();
        const now = Date.now();
        const items = this.tracks.map((t, idx) => {
            const ageMs = now - (t.addedAt || 0);
            const remainingHours = Math.max(0, Math.round((RETENTION_MS - ageMs) / (60 * 60 * 1000)));
            const ageHours = Math.round(ageMs / (60 * 60 * 1000));
            return {
                index: idx + 1,
                title: t.title,
                artist: t.artist,
                ageHours,
                remainingHours,
                isDynamic: Boolean(t.isDynamic)
            };
        });

        return {
            total: this.tracks.length,
            retentionDays: 3,
            lastRotated: this.lastRotated,
            items
        };
    }
}

const djServiceInstance = new TikTokDJService();

module.exports = {
    TikTokDJService,
    djService: djServiceInstance,
    getActiveDJTracks: () => djServiceInstance.getActiveTracks(),
    getRandomDJTrack: () => djServiceInstance.getRandomDJTrack(),
    getUniqueDJTracks: (count) => djServiceInstance.getUniqueDJTracks(count),
    rotateAndRefreshDJTracks: () => djServiceInstance.rotateAndRefreshDJTracks(),
    getDJTracksStatusSummary: () => djServiceInstance.getStatusSummary()
};

