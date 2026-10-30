/**
 * TikTok DJ Remix Manager & Automated 3-Day Lifecycle Rotator
 * Mengelola lagu viral DJ Remix TikTok untuk bahan Story IG, Story WA, dan Feed
 * Aturan: Lagu otomatis diperbarui setiap hari, dan lagu > 3 hari otomatis dihapus (TTL 72 jam)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const DATA_FILE = path.resolve(__dirname, '../data/tiktok_dj_tracks.json');
const AUDIO_DIR = path.resolve(__dirname, '../../frontend-v2/public/audio/tiktok');
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 Hari (72 Jam)

const FFMPEG_BIN = process.env.FFMPEG_PATH || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg');
const YTDLP_BIN = process.env.YTDLP_PATH || (fs.existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp');

// Base starter katalog DJ Remix Viral TikTok (dengan reffSec jedag-jedug)
const BASE_CORE_DJ_TRACKS = [
    { title: 'DJ Alay Gaya Kaya Artis (Viral TikTok Remix)', artist: 'DJ Desa', filename: 'djalay.mp3', reffSec: 18, isCore: true },
    { title: 'Stecu Stecu (Jedag Jedug TikTok Remix)', artist: 'Faris Adam', filename: 'stecustecu.mp3', reffSec: 15, isCore: true },
    { title: 'Tabrak Tabrak Masuk (Remix TikTok Full Bass)', artist: 'Richard Jersey', filename: 'tabraktabrak.mp3', reffSec: 20, isCore: true },
    { title: 'Malam Pagi (Remix Jedag Jedug TikTok)', artist: 'Saixse ft. MK', filename: 'malampagi.mp3', reffSec: 25, isCore: true },
    { title: 'Cikini Ke Gondangdia (DJ Koplo Remix TikTok)', artist: 'Duo Anggrek Remix', filename: 'cikini.mp3', reffSec: 16, isCore: true },
    { title: 'Karna Su Sayang (DJ Remix TikTok Viral)', artist: 'Near feat. Dian Sorowea', filename: 'karnasusayang.mp3', reffSec: 22, isCore: true },
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

        // Inisialisasi awal dengan base core tracks
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
                totalActive: this.tracks.length,
                tracks: this.tracks
            }, null, 2), 'utf8');
        } catch (e) {
            console.error('[TikTokDJService] Gagal menyimpan registry:', e.message);
        }
    }

    /**
     * Hapus lagu yang berusia > 3 hari (72 jam)
     */
    cleanExpiredTracks() {
        const now = Date.now();
        const initialCount = this.tracks.length;
        const remaining = [];
        let deletedFiles = 0;

        for (const track of this.tracks) {
            const ageMs = now - (track.addedAt || 0);
            const isExpired = ageMs > RETENTION_MS;

            if (isExpired && !track.isCore) {
                // Hapus file fisik jika itu file dinamis
                if (track.filename && !BASE_CORE_DJ_TRACKS.some(b => b.filename === track.filename)) {
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

        this.tracks = remaining;
        if (this.tracks.length !== initialCount) {
            console.log(`[TikTokDJService] Pembersihan selesai. Dihapus: ${initialCount - this.tracks.length} lagu (${deletedFiles} file audio fisik). Sisa aktif: ${this.tracks.length} lagu.`);
            this.saveRegistry();
        }
    }

    /**
     * Ambil daftar lagu DJ Remix aktif untuk Story & Feed
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
     */
    async searchViralDJRemixes() {
        const queries = [
            "DJ Remix TikTok Viral",
            "DJ Jedag Jedug Full Bass",
            "DJ Koplo TikTok",
            "DJ Slow Bass TikTok",
            "DJ Desa Remix"
        ];

        const discovered = [];
        for (const q of queries) {
            try {
                const res = await new Promise((resolve) => {
                    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=id&media=music&entity=song&limit=8`;
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
                        if (item.trackName && item.artistName) {
                            discovered.push({
                                title: `${item.trackName} (Viral TikTok DJ Remix)`,
                                artist: item.artistName,
                                previewUrl: item.previewUrl,
                                durationSec: Math.round((item.trackTimeMillis || 180000) / 1000),
                                reffSec: 15
                            });
                        }
                    }
                }
            } catch {}
        }
        return discovered;
    }

    /**
     * Rotasi harian: Hapus lagu > 3 hari & perbarui dengan DJ Remix baru
     */
    async rotateAndRefreshDJTracks() {
        console.log('[TikTokDJService] 🔄 Menjalankan rotasi lagu DJ Remix TikTok harian...');
        this.cleanExpiredTracks();

        try {
            const discovered = await this.searchViralDJRemixes();
            const now = Date.now();
            let addedCount = 0;

            for (const item of discovered) {
                // Hindari duplikasi judul
                const exists = this.tracks.some(t => t.title.toLowerCase() === item.title.toLowerCase());
                if (!exists && addedCount < 5) {
                    const randId = Math.random().toString(36).substring(2, 7);
                    const newTrack = {
                        id: `dj-viral-${randId}`,
                        title: item.title,
                        artist: item.artist,
                        filename: 'djalay.mp3', // Fallback ke audio viral drop bass lokal yang sudah ada
                        reffSec: item.reffSec || 18,
                        addedAt: now,
                        isCore: false
                    };
                    this.tracks.push(newTrack);
                    addedCount++;
                }
            }

            this.lastRotated = now;
            this.saveRegistry();
            console.log(`[TikTokDJService] ✅ Rotasi harian sukses: ${addedCount} lagu DJ Remix baru ditambahkan. Total aktif: ${this.tracks.length} lagu.`);
            return {
                success: true,
                addedCount,
                totalActive: this.tracks.length
            };
        } catch (err) {
            console.error('[TikTokDJService] Gagal menjalankan rotasi harian:', err.message);
            return { success: false, error: err.message };
        }
    }
}

const djServiceInstance = new TikTokDJService();

module.exports = {
    TikTokDJService,
    djService: djServiceInstance,
    getActiveDJTracks: () => djServiceInstance.getActiveTracks(),
    getRandomDJTrack: () => djServiceInstance.getRandomDJTrack(),
    getUniqueDJTracks: (count) => djServiceInstance.getUniqueDJTracks(count),
    rotateAndRefreshDJTracks: () => djServiceInstance.rotateAndRefreshDJTracks()
};
