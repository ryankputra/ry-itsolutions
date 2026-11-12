/**
 * TikTok DJ Remix Manager & Automated Daily Lifecycle Rotator
 * Mengelola lagu viral DJ Remix TikTok untuk bahan Story IG, Story WA, dan Feed
 * Aturan:
 * 1. Khusus lagu DJ Remix viral di TikTok (Jedag-Jedug, Full Bass, Koplo, Slow Bass).
 * 2. Lagu otomatis dimulai langsung dari reff / drop bass jedag-jedug.
 * 3. Rotasi Harian (24 JAM): Lagu berganti setiap hari dengan lagu baru & anti-ulang (history 14 hari).
 * 4. Pembaruan otomatis setiap hari pukul 03:30 WIB atau on-demand via bot WhatsApp (#refreshlagu).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execFile } = require('child_process');

const DATA_FILE = path.resolve(__dirname, '../data/tiktok_dj_tracks.json');
const AUDIO_DIR = path.resolve(__dirname, '../../frontend-v2/public/audio/tiktok');
const RETENTION_MS = 24 * 60 * 60 * 1000; // Rotasi Harian (24 Jam)
const HISTORY_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // Simpan riwayat 14 hari agar tidak berulang
const MAX_HISTORY_ITEMS = 120;
const TARGET_DAILY_TRACKS = 9; // 8-10 lagu baru per hari

const FFMPEG_BIN = process.env.FFMPEG_PATH || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg');

// Pool query yang luas & beragam untuk pencarian iTunes API
const DJ_SEARCH_QUERY_POOL = [
    "DJ Jedag Jedug TikTok Viral",
    "DJ Remix TikTok Full Bass",
    "DJ Koplo TikTok Viral",
    "DJ TikTok Mengkane",
    "DJ Slow Bass TikTok",
    "DJ FYP TikTok Terpopuler",
    "DJ Remix Jedug Jedug",
    "DJ Breakbeat TikTok",
    "DJ Remix Indo Viral 2025",
    "DJ Remix Indo Viral 2026",
    "DJ Phonk Speed Up TikTok",
    "DJ Funkot TikTok Remix",
    "DJ Bass Horeg Viral",
    "DJ Dugem TikTok Remix",
    "DJ Remix Santuy TikTok",
    "DJ Slowed Reverb TikTok",
    "DJ Remix Timur Viral",
    "DJ Dangdut Koplo Remix",
    "DJ Viral Sound TikTok",
    "DJ Party Remix Indonesia",
    "DJ Remix Galau TikTok",
    "DJ Trap Remix Indonesia",
    "DJ Clubbing TikTok Bass",
    "DJ Remix Barat Viral TikTok"
];

// Starter / Fallback Katalog DJ Remix Viral TikTok
const BASE_CORE_DJ_TRACKS = [
    { title: 'DJ Alay Gaya Kaya Artis (Viral TikTok Remix)', artist: 'DJ Desa', filename: 'djalay.mp3', reffSec: 40, isCore: true },
    { title: 'Stecu Stecu (Jedag Jedug TikTok Remix)', artist: 'Faris Adam', filename: 'stecustecu.mp3', reffSec: 15, isCore: true },
    { title: 'Tabrak Tabrak Masuk (Remix TikTok Full Bass)', artist: 'Richard Jersey', filename: 'tabraktabrak.mp3', reffSec: 25, isCore: true },
    { title: 'Malam Pagi (Remix Jedag Jedug TikTok)', artist: 'Saixse ft. MK', filename: 'malampagi.mp3', reffSec: 30, isCore: true },
    { title: 'Cikini Ke Gondangdia (DJ Koplo Remix TikTok)', artist: 'Duo Anggrek Remix', filename: 'cikini.mp3', reffSec: 28, isCore: true },
    { title: 'Karna Su Sayang (DJ Remix TikTok Viral)', artist: 'Near ft. Dian Sorowea', filename: 'karnasusayang.mp3', reffSec: 32, isCore: true },
    { title: 'Sial (DJ Speed Up Jedag Jedug TikTok)', artist: 'Mahalini Remix', filename: 'sial.mp3', reffSec: 68, isCore: true },
    { title: 'Garam & Madu (DJ Remix TikTok Bass)', artist: 'Tenxi & Asmara', filename: 'garammadu.mp3', reffSec: 0, isCore: true },
    { title: 'Cupid (Speed Up Twin Ver TikTok Remix)', artist: 'FIFTY FIFTY', filename: 'cupid.mp3', reffSec: 42, isCore: true },
    { title: 'Sigar (DJ Jedag Jedug Koplo TikTok)', artist: 'Denny Caknan Remix', filename: 'sigar.mp3', reffSec: 0, isCore: true },
    { title: 'Cundamani (DJ Slow Bass Remix TikTok)', artist: 'Denny Caknan Remix', filename: 'cundamani.mp3', reffSec: 0, isCore: true },
    { title: 'Wirang (DJ Remix Full Bass TikTok)', artist: 'Denny Caknan Remix', filename: 'wirang.mp3', reffSec: 0, isCore: true },
    { title: 'APT. (DJ TikTok Viral Remix)', artist: 'ROSÉ & Bruno Mars', filename: 'apt.mp3', reffSec: 0, isCore: true },
    { title: 'Die With A Smile (DJ Slow TikTok Remix)', artist: 'Lady Gaga & Bruno Mars', filename: 'diewithasmile.mp3', reffSec: 0, isCore: true },
    { title: 'Komang (DJ Santuy Remix TikTok)', artist: 'Raim Laode', filename: 'komang.mp3', reffSec: 55, isCore: true }
];

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function normalizeTrackKey(title, artist = '') {
    const cleanTitle = String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanArtist = String(artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanTitle || cleanArtist;
}

class TikTokDJService {
    constructor() {
        this.tracks = [];
        this.recentHistory = [];
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
                if (Array.isArray(raw.recentHistory)) {
                    const cutoff = Date.now() - HISTORY_RETENTION_MS;
                    this.recentHistory = raw.recentHistory
                        .filter(h => h && h.key && (!h.usedAt || h.usedAt >= cutoff))
                        .slice(0, MAX_HISTORY_ITEMS);
                }
                if (Array.isArray(raw.tracks) && raw.tracks.length > 0) {
                    const coreMap = new Map(BASE_CORE_DJ_TRACKS.map(t => [t.filename, t.reffSec]));
                    this.tracks = raw.tracks.map(t => {
                        if (coreMap.has(t.filename)) {
                            return { ...t, reffSec: coreMap.get(t.filename) };
                        }
                        return t;
                    });
                    this.lastRotated = raw.lastRotated || 0;
                    this.saveRegistry();
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

            const cutoff = Date.now() - HISTORY_RETENTION_MS;
            this.recentHistory = (this.recentHistory || [])
                .filter(h => h && h.key && (!h.usedAt || h.usedAt >= cutoff))
                .slice(0, MAX_HISTORY_ITEMS);

            fs.writeFileSync(DATA_FILE, JSON.stringify({
                lastRotated: this.lastRotated || Date.now(),
                retentionDays: 1,
                retentionHours: 24,
                totalActive: this.tracks.length,
                recentHistoryCount: this.recentHistory.length,
                recentHistory: this.recentHistory,
                tracks: this.tracks
            }, null, 2), 'utf8');
        } catch (e) {
            console.error('[TikTokDJService] Gagal menyimpan registry:', e.message);
        }
    }

    deletePhysicalFileIfDynamic(track) {
        if (track && track.isDynamic && track.filename) {
            const filePath = path.join(AUDIO_DIR, track.filename);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    return true;
                } catch {}
            }
        }
        return false;
    }

    /**
     * Hapus lagu yang berusia > 1 hari (24 jam) secara otomatis
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
                if (this.deletePhysicalFileIfDynamic(track)) {
                    deletedFiles++;
                }
                console.log(`[TikTokDJService] 🗑️ Menghapus lagu kedaluwarsa (> 24 jam): ${track.title}`);
            } else {
                remaining.push(track);
            }
        }

        // Jika semua lagu habis terhapus karena lewat 24 jam, hidupkan kembali fallback starter pool agar sistem tidak kosong
        if (remaining.length === 0) {
            console.log('[TikTokDJService] 🔄 Semua lagu melewati masa 24 jam, mengaktifkan fallback pool sementara...');
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
            console.log(`[TikTokDJService] Pembersihan 24 jam selesai: ${initialCount - this.tracks.length} lagu kedaluwarsa dibersihkan (${deletedFiles} file dihapus). Sisa aktif: ${this.tracks.length} lagu.`);
            this.saveRegistry();
        }
    }

    /**
     * Ambil daftar lagu DJ Remix aktif untuk Story & Feed (selalu valid < 24 jam)
     */
    getActiveTracks() {
        this.cleanExpiredTracks();
        if (this.tracks.length === 0) {
            this.loadRegistry();
        }
        return this.tracks;
    }

    /**
     * Pilih 1 lagu acak yang masih fresh (< 24 jam)
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
        const shuffled = shuffleArray(active);
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(shuffled[i % shuffled.length]);
        }
        return result;
    }

    /**
     * Cari lagu DJ Remix TikTok yang beragam via iTunes API
     * Memilih sebagian query secara acak + offset acak (0, 10, 20, 30) + limit=25, lalu mengacak hasilnya
     */
    async searchViralDJRemixes() {
        const selectedQueries = shuffleArray(DJ_SEARCH_QUERY_POOL).slice(0, 9);
        const offsetChoices = [0, 10, 20, 30];

        const isDJRemix = (trackName, artistName) => {
            const pattern = /(dj|remix|jedag|jedug|koplo|slow bass|mengkane|full bass|kane|breakbeat|phonk|speed up|funkot|horeg|dugem)/i;
            return pattern.test(trackName || '') || pattern.test(artistName || '');
        };

        const discovered = [];
        const seenTitles = new Set();

        for (const q of selectedQueries) {
            const randomOffset = offsetChoices[Math.floor(Math.random() * offsetChoices.length)];
            try {
                const res = await new Promise((resolve) => {
                    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=id&media=music&entity=song&limit=25&offset=${randomOffset}`;
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
                                const cleanKey = normalizeTrackKey(item.trackName, item.artistName);
                                if (cleanKey && !seenTitles.has(cleanKey)) {
                                    seenTitles.add(cleanKey);
                                    discovered.push({
                                        key: cleanKey,
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

        // Acak urutan hasil sebelum dipilih agar tidak selalu lagu teratas yang sama
        return shuffleArray(discovered);
    }

    /**
     * Download dan konversi audio preview menjadi file MP3 lokal
     * Memastikan file hasil konversi ada dan berukuran > 0 byte
     */
    async downloadAudioToLocal(previewUrl, targetFilename) {
        return new Promise((resolve) => {
            try {
                if (!fs.existsSync(AUDIO_DIR)) {
                    fs.mkdirSync(AUDIO_DIR, { recursive: true });
                }

                const tempDir = os.tmpdir();
                const tempExt = path.extname(previewUrl.split('?')[0]) || '.m4a';
                const tempInput = path.join(tempDir, `preview_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${tempExt}`);
                const finalOutput = path.join(AUDIO_DIR, targetFilename);

                const verifyOutputFile = () => {
                    try {
                        if (!fs.existsSync(finalOutput)) return false;
                        const stat = fs.statSync(finalOutput);
                        if (!stat || stat.size <= 0) {
                            try { fs.unlinkSync(finalOutput); } catch {}
                            return false;
                        }
                        return true;
                    } catch {
                        return false;
                    }
                };

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
                            if (err) {
                                console.warn('[TikTokDJService] FFmpeg conversion failed, trying direct copy:', err.message);
                                try {
                                    if (fs.existsSync(tempInput) && fs.statSync(tempInput).size > 0) {
                                        fs.copyFileSync(tempInput, finalOutput);
                                    }
                                } catch {}
                            }
                            try { fs.unlinkSync(tempInput); } catch {}
                            resolve(verifyOutputFile());
                        });
                    });
                });

                req.on('error', () => {
                    fileStream.close();
                    try { fs.unlinkSync(tempInput); } catch {}
                    resolve(false);
                });
            } catch {
                resolve(false);
            }
        });
    }

    /**
     * Rotasi harian: Cari lagu DJ Remix baru yang belum pernah dipakai,
     * lalu gantikan lagu lama (bersihkan file fisik lama) agar tiap hari lagunya berbeda-beda.
     */
    async rotateAndRefreshDJTracks(options = {}) {
        const { forceReplace = true } = options;
        console.log('[TikTokDJService] 🔄 Menjalankan rotasi harian lagu DJ Remix TikTok (Siklus 24 Jam & Anti-Ulang)...');

        const previousTracks = [...this.tracks];
        const previousKeys = new Set(previousTracks.map(t => normalizeTrackKey(t.title, t.artist)));
        const historyKeys = new Set((this.recentHistory || []).map(h => h.key));

        try {
            const discovered = await this.searchViralDJRemixes();
            const now = Date.now();

            // Prioritas 1: Belum ada di recentHistory DAN tidak dipakai kemarin
            let candidates = discovered.filter(item => {
                const key = item.key || normalizeTrackKey(item.title, item.artist);
                return !historyKeys.has(key) && !previousKeys.has(key);
            });

            // Prioritas 2 (jika kandidat fresh terlalu sedikit): minimal tidak dipakai kemarin
            if (candidates.length < TARGET_DAILY_TRACKS) {
                const extra = discovered.filter(item => {
                    const key = item.key || normalizeTrackKey(item.title, item.artist);
                    return !previousKeys.has(key) && !candidates.some(c => c.key === key);
                });
                candidates = [...candidates, ...extra];
            }

            const newTracks = [];
            for (const item of candidates) {
                if (newTracks.length >= TARGET_DAILY_TRACKS) break;

                const randId = Math.random().toString(36).substring(2, 8);
                const filename = `dj_remix_${Date.now()}_${randId}.mp3`;

                const downloaded = await this.downloadAudioToLocal(item.previewUrl, filename);
                if (downloaded) {
                    const key = item.key || normalizeTrackKey(item.title, item.artist);
                    newTracks.push({
                        id: `dj-viral-${randId}`,
                        key,
                        title: item.title,
                        artist: item.artist,
                        filename,
                        reffSec: 0,
                        addedAt: now,
                        isCore: false,
                        isDynamic: true
                    });
                }
            }

            let deletedOldFiles = 0;
            if (newTracks.length > 0) {
                if (forceReplace) {
                    // Bersihkan file fisik lagu lama agar disk STB tidak penuh
                    for (const oldTrack of previousTracks) {
                        if (this.deletePhysicalFileIfDynamic(oldTrack)) {
                            deletedOldFiles++;
                        }
                    }
                    this.tracks = newTracks;
                } else {
                    this.tracks = [...newTracks, ...this.tracks];
                }

                // Catat ke recentHistory agar tidak terulang di hari berikutnya
                const newHistoryEntries = newTracks.map(t => ({
                    key: t.key || normalizeTrackKey(t.title, t.artist),
                    title: t.title,
                    artist: t.artist,
                    usedAt: now
                }));
                const mergedHistory = [...newHistoryEntries, ...(this.recentHistory || [])];
                const dedupedHistory = [];
                const seenHistoryKeys = new Set();
                for (const h of mergedHistory) {
                    if (h.key && !seenHistoryKeys.has(h.key)) {
                        seenHistoryKeys.add(h.key);
                        dedupedHistory.push(h);
                    }
                }
                this.recentHistory = dedupedHistory.slice(0, MAX_HISTORY_ITEMS);
            } else {
                // Jika unduhan baru gagal total (0 lagu), pertahankan fallback agar bot tidak error kosong
                console.warn('[TikTokDJService] ⚠️ Tidak ada lagu baru yang berhasil diunduh, mempertahankan fallback minimal.');
                this.cleanExpiredTracks();
                if (this.tracks.length === 0) {
                    this.tracks = BASE_CORE_DJ_TRACKS.map((t, idx) => ({
                        id: `dj-core-${idx + 1}-${now}`,
                        ...t,
                        addedAt: now,
                        isCore: true
                    }));
                }
            }

            this.lastRotated = now;
            this.saveRegistry();
            console.log(`[TikTokDJService] ✅ Rotasi harian selesai: ${newTracks.length} lagu baru aktif (${deletedOldFiles} file lama dibersihkan). Total aktif: ${this.tracks.length} lagu.`);
            return {
                success: true,
                addedCount: newTracks.length,
                deletedOldFiles,
                replacedOld: forceReplace && newTracks.length > 0,
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
            retentionDays: 1,
            retentionHours: 24,
            historyCount: (this.recentHistory || []).length,
            lastRotated: this.lastRotated,
            items
        };
    }
}

const djServiceInstance = new TikTokDJService();

module.exports = {
    TikTokDJService,
    djService: djServiceInstance,
    DJ_SEARCH_QUERY_POOL,
    getActiveDJTracks: () => djServiceInstance.getActiveTracks(),
    getRandomDJTrack: () => djServiceInstance.getRandomDJTrack(),
    getUniqueDJTracks: (count) => djServiceInstance.getUniqueDJTracks(count),
    rotateAndRefreshDJTracks: (options) => djServiceInstance.rotateAndRefreshDJTracks(options),
    getDJTracksStatusSummary: () => djServiceInstance.getStatusSummary()
};
