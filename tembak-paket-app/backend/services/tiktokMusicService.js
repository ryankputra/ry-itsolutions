const fs = require('fs');
const path = require('path');
const https = require('https');

const AUDIO_DIR = path.resolve(__dirname, '../../frontend-v2/public/audio/tiktok');
const TRACKS_FILE = path.join(AUDIO_DIR, 'tracks.json');
const BACKUP_TRACKS_FILE = path.resolve(__dirname, '../public/tracks.json');

// Curated top Indonesian & regional hits (stored locally on server)
const LOCAL_HIT_REGISTRY = [
    {
        id: "track-1",
        title: "Komang",
        artist: "Raim Laode",
        category: "indo",
        categoryLabel: "Pop & R&B Indo",
        filename: "komang.mp3",
        streamsCount: "48.2M streams",
        tags: ["#tophits", "#rytoneindo", "#komang", "#akustik"],
        coverGradient: "from-rose-500 via-pink-600 to-amber-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-2",
        title: "Sial (Speed Up Version)",
        artist: "Mahalini",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "sial.mp3",
        streamsCount: "41.6M streams",
        tags: ["#mahalinisial", "#speedup", "#galauvibes"],
        coverGradient: "from-purple-600 via-pink-500 to-indigo-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-3",
        title: "Cikini Ke Gondangdia (Remix)",
        artist: "Duo Anggrek",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "cikini.mp3",
        streamsCount: "38.9M streams",
        tags: ["#cikinikegondangdia", "#djindonesia", "#remix"],
        coverGradient: "from-amber-500 via-red-500 to-rose-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-4",
        title: "Malam Pagi",
        artist: "Saixse ft. MK",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "malampagi.mp3",
        streamsCount: "29.4M streams",
        tags: ["#malampagi", "#soundviral", "#hiphop"],
        coverGradient: "from-cyan-500 via-blue-600 to-indigo-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-5",
        title: "Rayuan Perempuan Gila",
        artist: "Nadin Amizah",
        category: "indo",
        categoryLabel: "Pop & R&B Indo",
        filename: "nadinamizah.mp3",
        streamsCount: "35.1M streams",
        tags: ["#nadinamizah", "#rayuanperempuangila", "#chill"],
        coverGradient: "from-teal-500 via-emerald-600 to-cyan-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-6",
        title: "Gala Bunga Matahari",
        artist: "Sal Priadi",
        category: "indo",
        categoryLabel: "Pop & R&B Indo",
        filename: "galabungamatahari.mp3",
        streamsCount: "44.7M streams",
        tags: ["#galabungamatahari", "#salpriadi", "#indieindo"],
        coverGradient: "from-yellow-400 via-amber-500 to-orange-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-7",
        title: "Cupid (Twin Ver - Speed Up)",
        artist: "Fifty Fifty",
        category: "global",
        categoryLabel: "Top Hits Global",
        filename: "cupid.mp3",
        streamsCount: "52.3M streams",
        tags: ["#cupid", "#fiftyfifty", "#globalsound"],
        coverGradient: "from-teal-400 via-cyan-500 to-blue-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-8",
        title: "Stecu Stecu (Full Bass)",
        artist: "Indo Hits Project",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "stecustecu.mp3",
        streamsCount: "21.8M streams",
        tags: ["#stecustecu", "#fullbass", "#remix"],
        coverGradient: "from-violet-600 via-purple-700 to-pink-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-9",
        title: "Bohongi Hati",
        artist: "Ghea Indrawari",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "bohongihati.mp3",
        streamsCount: "27.5M streams",
        tags: ["#bohongihati", "#gheaindrawari", "#popindo"],
        coverGradient: "from-pink-500 via-rose-500 to-amber-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-10",
        title: "Tabrak Tabrak Masuk",
        artist: "Indo Remix Hits",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "tabraktabrak.mp3",
        streamsCount: "23.6M streams",
        tags: ["#tabraktabrakmasuk", "#remixindo", "#bassboost"],
        coverGradient: "from-red-500 via-rose-600 to-amber-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-11",
        title: "Alay Gaya Kaya Artis",
        artist: "Indo Sound Project",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "djalay.mp3",
        streamsCount: "19.8M streams",
        tags: ["#djalay", "#remix2026", "#dance"],
        coverGradient: "from-fuchsia-600 via-pink-600 to-rose-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-12",
        title: "Karna Su Sayang",
        artist: "Near ft. Dian Sorowea",
        category: "indo",
        categoryLabel: "Pop & R&B Indo",
        filename: "karnasusayang.mp3",
        streamsCount: "33.2M streams",
        tags: ["#karnasusayang", "#nostalgia", "#akustik"],
        coverGradient: "from-emerald-500 via-teal-600 to-blue-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-13",
        title: "Satu Bulan",
        artist: "Bernadya",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "satubulan.mp3",
        streamsCount: "58.4M streams",
        tags: ["#satubulan", "#bernadya", "#galau"],
        coverGradient: "from-purple-600 via-indigo-600 to-blue-700",
        accentColor: "#1ed760"
    },
    {
        id: "track-14",
        title: "Untungnya, Hidup Harus Tetap Berjalan",
        artist: "Bernadya",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "untungnya.mp3",
        streamsCount: "47.1M streams",
        tags: ["#untungnya", "#bernadya", "#chill"],
        coverGradient: "from-teal-500 via-emerald-600 to-cyan-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-15",
        title: "Penjaga Hati",
        artist: "Nadhif Basalamah",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "penjagahati.mp3",
        streamsCount: "63.8M streams",
        tags: ["#penjagahati", "#nadhifbasalamah", "#akustik"],
        coverGradient: "from-rose-500 via-pink-600 to-amber-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-16",
        title: "Tak Segampang Itu",
        artist: "Anggi Marito",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "taksegampangitu.mp3",
        streamsCount: "51.2M streams",
        tags: ["#taksegampangitu", "#anggimarito", "#galau"],
        coverGradient: "from-blue-600 via-indigo-700 to-purple-800",
        accentColor: "#1ed760"
    },
    {
        id: "track-17",
        title: "Jiwa Yang Bersedih",
        artist: "Ghea Indrawari",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "jiwayangbersedih.mp3",
        streamsCount: "69.4M streams",
        tags: ["#jiwayangbersedih", "#gheaindrawari", "#healing"],
        coverGradient: "from-amber-500 via-orange-600 to-rose-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-18",
        title: "Mati-Matian",
        artist: "Mahalini",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "matimatian.mp3",
        streamsCount: "42.7M streams",
        tags: ["#matimatian", "#mahalini", "#galauvibes"],
        coverGradient: "from-red-600 via-rose-600 to-pink-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-19",
        title: "Lantas",
        artist: "Juicy Luicy",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "lantas.mp3",
        streamsCount: "55.3M streams",
        tags: ["#lantas", "#juicyluicy", "#popindo"],
        coverGradient: "from-cyan-500 via-blue-600 to-indigo-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-20",
        title: "Tampar",
        artist: "Juicy Luicy",
        category: "galau",
        categoryLabel: "Lagu Galau",
        filename: "tampar.mp3",
        streamsCount: "39.8M streams",
        tags: ["#tampar", "#juicyluicy", "#vibes"],
        coverGradient: "from-yellow-500 via-amber-600 to-red-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-21",
        title: "Semua Aku Dirayakan",
        artist: "Nadin Amizah",
        category: "indo",
        categoryLabel: "Pop & R&B Indo",
        filename: "semuaakudirayakan.mp3",
        streamsCount: "48.9M streams",
        tags: ["#semuaakudirayakan", "#nadinamizah", "#romantic"],
        coverGradient: "from-pink-400 via-rose-500 to-amber-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-22",
        title: "APT.",
        artist: "ROSÉ & Bruno Mars",
        category: "global",
        categoryLabel: "Top Hits Global",
        filename: "apt.mp3",
        streamsCount: "145.2M streams",
        tags: ["#apt", "#rosé", "#brunomars", "#viral"],
        coverGradient: "from-rose-500 via-red-600 to-pink-500",
        accentColor: "#1ed760"
    },
    {
        id: "track-23",
        title: "Die With A Smile",
        artist: "Lady Gaga & Bruno Mars",
        category: "global",
        categoryLabel: "Top Hits Global",
        filename: "diewithasmile.mp3",
        streamsCount: "162.5M streams",
        tags: ["#diewithasmile", "#ladygaga", "#brunomars"],
        coverGradient: "from-blue-600 via-indigo-600 to-purple-700",
        accentColor: "#1ed760"
    },
    {
        id: "track-24",
        title: "Sigar",
        artist: "Denny Caknan",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "sigar.mp3",
        streamsCount: "37.6M streams",
        tags: ["#sigar", "#dennycaknan", "#koplo"],
        coverGradient: "from-emerald-500 via-teal-600 to-cyan-700",
        accentColor: "#1ed760"
    },
    {
        id: "track-25",
        title: "Cundamani",
        artist: "Denny Caknan",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "cundamani.mp3",
        streamsCount: "44.1M streams",
        tags: ["#cundamani", "#dennycaknan", "#jawa"],
        coverGradient: "from-amber-400 via-yellow-500 to-orange-600",
        accentColor: "#1ed760"
    },
    {
        id: "track-26",
        title: "Wirang",
        artist: "Denny Caknan",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "wirang.mp3",
        streamsCount: "40.9M streams",
        tags: ["#wirang", "#dennycaknan", "#koplogalau"],
        coverGradient: "from-violet-600 via-purple-700 to-indigo-800",
        accentColor: "#1ed760"
    },
    {
        id: "track-27",
        title: "Garam & Madu",
        artist: "Tenxi & Asmara",
        category: "dance",
        categoryLabel: "Koplo & EDM",
        filename: "garammadu.mp3",
        streamsCount: "25.3M streams",
        tags: ["#garammadu", "#tenxi", "#asmara", "#tiktokviral"],
        coverGradient: "from-fuchsia-500 via-pink-600 to-amber-500",
        accentColor: "#1ed760"
    }
];

const SPOTIFY_GRADIENTS = [
    "from-emerald-500 via-green-600 to-teal-700",
    "from-indigo-600 via-purple-600 to-pink-500",
    "from-rose-500 via-pink-600 to-red-500",
    "from-amber-500 via-orange-600 to-red-600",
    "from-cyan-500 via-blue-600 to-indigo-600",
    "from-fuchsia-600 via-purple-600 to-indigo-700",
    "from-teal-500 via-emerald-600 to-green-600",
    "from-violet-600 via-purple-700 to-fuchsia-600"
];

class TikTokMusicService {
    constructor() {
        this.cache = null;
        this.lastChecked = 0;
        this.isSyncing = false;
        this.init();
    }

    init() {
        if (!fs.existsSync(AUDIO_DIR)) {
            try {
                fs.mkdirSync(AUDIO_DIR, { recursive: true });
            } catch (e) {
                console.error('[MusicService] Failed to create audio dir:', e.message);
            }
        }
        this.loadCatalog();
        this.startAutoUpdateCron();
    }

    /**
     * Load current catalog from tracks.json or seed from backup
     */
    loadCatalog() {
        try {
            if (fs.existsSync(TRACKS_FILE)) {
                const raw = fs.readFileSync(TRACKS_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
                    this.cache = parsed;
                    return this.cache;
                }
            }
            if (fs.existsSync(BACKUP_TRACKS_FILE)) {
                const rawBackup = fs.readFileSync(BACKUP_TRACKS_FILE, 'utf8');
                const parsedBackup = JSON.parse(rawBackup);
                if (parsedBackup && Array.isArray(parsedBackup.tracks) && parsedBackup.tracks.length > 0) {
                    this.cache = parsedBackup;
                    try { fs.writeFileSync(TRACKS_FILE, rawBackup, 'utf8'); } catch {}
                    return this.cache;
                }
            }
            this.cache = this.buildAndSaveCatalogSync();
        } catch (err) {
            console.error('[MusicService] Error loading catalog:', err.message);
            if (!this.cache) {
                this.cache = this.buildAndSaveCatalogSync();
            }
        }
        return this.cache;
    }

    /**
     * Verify that a local audio file exists and has size > 100KB
     */
    verifyTrackAudio(filename) {
        try {
            const filePath = path.join(AUDIO_DIR, filename);
            if (!fs.existsSync(filePath)) return false;
            const stats = fs.statSync(filePath);
            return stats.size > 100000;
        } catch {
            return false;
        }
    }

    /**
     * Helper to fetch JSON via IPv4 with timeout
     */
    fetchJson(url) {
        return new Promise((resolve) => {
            const req = https.get(url, { family: 4, timeout: 6000 }, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    try { resolve(JSON.parse(data)); } catch { resolve(null); }
                });
            });
            req.on("error", () => resolve(null));
            req.on("timeout", () => { req.destroy(); resolve(null); });
        });
    }

    /**
     * Resolve YouTube video ID for a song via fast search
     */
    resolveYouTubeId(title, artist) {
        return new Promise((resolve) => {
            const query = `${artist} - ${title} official audio`;
            const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 3500 }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                    resolve(match ? match[1] : null);
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        });
    }

    /**
     * Detect Spotify genre category matching the 5 frontend filter tabs:
     * - global (Top Hits Global)
     * - kpop (K-Pop Hits)
     * - indo (Pop & R&B Indo)
     * - galau (Lagu Galau)
     * - dance (Koplo & EDM)
     */
    detectCategory(title, artist, rawGenre = "", origin = "indo") {
        const text = (title + " " + artist).toLowerCase();
        const genre = (rawGenre || "").toLowerCase();

        // 1. K-Pop Hits
        if (
            genre.includes("k-pop") || genre.includes("kpop") || genre.includes("korean") ||
            text.includes("aespa") || text.includes("newjeans") || text.includes("blackpink") ||
            text.includes("bts") || text.includes("jungkook") || text.includes("jung kook") ||
            text.includes("twice") || text.includes("stray kids") || text.includes("illit") ||
            text.includes("le sserafim") || text.includes("babymonster") || text.includes("enhypen") ||
            text.includes("seventeen") || text.includes("itzy") || text.includes("ive") ||
            (text.includes("rosé") && !text.includes("bruno mars")) || text.includes("jennie") ||
            text.includes("lisa") || text.includes("supernova") || text.includes("whiplash")
        ) {
            return { category: "kpop", categoryLabel: "K-Pop Hits" };
        }

        // 2. Koplo, Jawa, Dangdut & EDM / Remix
        if (
            genre.includes("dance") || genre.includes("electronic") || genre.includes("remix") ||
            genre.includes("house") || genre.includes("club") || genre.includes("dangdut") ||
            text.includes("koplo") || text.includes("dangdut") || text.includes("campursari") ||
            text.includes("denny caknan") || text.includes("guyon waton") || text.includes("gilga sahid") ||
            text.includes("happy asmara") || text.includes("ndarboy") || text.includes("aftershine") ||
            text.includes("dike sabrina") || text.includes("shinta arsinta") || text.includes("tenxi") ||
            text.includes("sigar") || text.includes("wirang") || text.includes("cundamani") ||
            text.includes("pelanggaran") || text.includes("klebus") || text.includes("negoro angin") ||
            text.includes("garam") || text.includes("remix") || text.includes("dj ") ||
            text.includes("full bass") || text.includes("jedag") || text.includes("alan walker") ||
            text.includes("marshmello") || text.includes("chainsmokers") || text.includes("tiesto")
        ) {
            return { category: "dance", categoryLabel: "Koplo & EDM" };
        }

        // 3. Lagu Galau
        if (
            text.includes("bernadya") || text.includes("satu bulan") || text.includes("kata mereka ini berlebihan") ||
            text.includes("untungnya") || text.includes("kini mereka tahu") || text.includes("sial") ||
            text.includes("mahalini") || text.includes("mati-matian") || text.includes("sisa rasa") ||
            text.includes("bohongi") || text.includes("lantas") || text.includes("tampar") ||
            text.includes("asing") || text.includes("juicy luicy") || text.includes("anggi marito") ||
            text.includes("tak segampang itu") || text.includes("ghea indrawari") || text.includes("jiwa yang bersedih") ||
            text.includes("nadhif basalamah") || text.includes("penjaga hati") || text.includes("fabio asher") ||
            text.includes("rumah singgah") || text.includes("lara") || text.includes("trauma") ||
            text.includes("galau") || text.includes("putus") || text.includes("kecewa") ||
            text.includes("tanpa bicara") || text.includes("lampu kuning") || text.includes("takut") ||
            text.includes("takkan berpaling") || text.includes("tak lagi sama") || text.includes("usai") ||
            text.includes("bawa dia kembali") || text.includes("bukan cinta biasa") || text.includes("komang")
        ) {
            return { category: "galau", categoryLabel: "Lagu Galau" };
        }

        // 4. Pop & R&B Indo
        if (
            origin === "indo" ||
            text.includes("rizky febian") || text.includes("adrian khalif") || text.includes("rizwan fadilah") ||
            text.includes("njan") || text.includes("tiara andini") || text.includes("sal priadi") ||
            text.includes("bunga matahari") || text.includes("planet lain") || text.includes("nadin amizah") ||
            text.includes("rayuan perempuan gila") || text.includes("semua aku dirayakan") || text.includes("hindia") ||
            text.includes("evaluasi") || text.includes("cincin") || text.includes("secukupnya") ||
            text.includes("bilal indrajaya") || text.includes("sheila on 7") || text.includes("dewa 19") ||
            text.includes("tulus") || text.includes("yura yunita") || text.includes("judika") ||
            text.includes("lyodra") || text.includes("pamungkas") || text.includes("fourtwnty") ||
            text.includes("fiersa besari") || text.includes("feby putri") || text.includes("raisa") ||
            text.includes("afgan") || text.includes("bermuara") || text.includes("cuek") ||
            text.includes("hingga tua bersama") || text.includes("cerita kita singkat") || text.includes("sialan") ||
            text.includes("sekilas cinta") || text.includes("menawan") || text.includes("2001x") ||
            text.includes("karna su sayang") || text.includes("near") || text.includes("dian sorowea") ||
            text.includes("stecu stecu") || text.includes("faris adam") || text.includes("cikini") ||
            text.includes("duo anggrek") || text.includes("duo anggun") || text.includes("tabrak tabrak") ||
            text.includes("richard jersey") || text.includes("saixse") || text.includes("malam pagi")
        ) {
            return { category: "indo", categoryLabel: "Pop & R&B Indo" };
        }

        return { category: "global", categoryLabel: "Top Hits Global" };
    }

    /**
     * Fetch Live Multi-Genre Songs across Indonesia & Global RSS feeds and target artists
     */
    async fetchLiveCharts() {
        const targetSearches = [
            // Koplo & Jawa
            { query: "Denny Caknan", origin: "indo" },
            { query: "Guyon Waton", origin: "indo" },
            { query: "Gilga Sahid", origin: "indo" },
            { query: "Happy Asmara", origin: "indo" },
            { query: "Tenxi Asmara Garam Madu", origin: "indo" },
            // Galau
            { query: "Bernadya", origin: "indo" },
            { query: "Mahalini", origin: "indo" },
            { query: "Juicy Luicy", origin: "indo" },
            { query: "Anggi Marito", origin: "indo" },
            { query: "Ghea Indrawari", origin: "indo" },
            { query: "Nadhif Basalamah", origin: "indo" },
            // Pop Indo
            { query: "Rizky Febian", origin: "indo" },
            { query: "Adrian Khalif", origin: "indo" },
            { query: "Rizwan Fadilah", origin: "indo" },
            { query: "Sal Priadi", origin: "indo" },
            { query: "Tiara Andini", origin: "indo" },
            { query: "Nadin Amizah", origin: "indo" },
            { query: "Hindia", origin: "indo" },
            // K-Pop
            { query: "ROSÉ Bruno Mars", origin: "kpop" },
            { query: "aespa", origin: "kpop" },
            { query: "NewJeans", origin: "kpop" },
            { query: "BLACKPINK", origin: "kpop" },
            { query: "Jung Kook", origin: "kpop" },
            { query: "ILLIT", origin: "kpop" },
            // Global
            { query: "Sabrina Carpenter", origin: "global" },
            { query: "Billie Eilish", origin: "global" },
            { query: "Bruno Mars Lady Gaga", origin: "global" },
            { query: "Coldplay", origin: "global" },
            // EDM / Remix
            { query: "Alan Walker", origin: "global" },
            { query: "DJ Remix Indonesia", origin: "indo" }
        ];

        try {
            console.log('[MusicService] Fetching multi-genre live charts (RSS Indo, RSS Global, and artist searches)...');
            const searchPromises = targetSearches.map(s =>
                this.fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(s.query)}&country=${s.origin === 'global' ? 'us' : 'id'}&media=music&limit=6`)
                    .then(res => ({ type: 'search', meta: s, data: res }))
                    .catch(() => null)
            );

            const rssPromises = [
                this.fetchJson("https://itunes.apple.com/id/rss/topsongs/limit=100/json")
                    .then(res => ({ type: 'rss_indo', data: res }))
                    .catch(() => null),
                this.fetchJson("https://itunes.apple.com/us/rss/topsongs/limit=100/json")
                    .then(res => ({ type: 'rss_us', data: res }))
                    .catch(() => null)
            ];

            const settled = await Promise.all([...searchPromises, ...rssPromises]);
            const seen = new Set();
            const collectedTracks = [];

            // 1. Process Artist Searches
            for (const item of settled) {
                if (item?.type === 'search' && item.data?.results) {
                    for (const r of item.data.results) {
                        if (!r.trackName || !r.artistName) continue;
                        const normKey = `${r.trackName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${r.artistName.toLowerCase().slice(0, 5)}`;
                        if (seen.has(normKey)) continue;
                        seen.add(normKey);

                        const rawImg = r.artworkUrl100 || "";
                        const coverImage = rawImg.replace(/\/\d+x\d+bb\.(png|jpg)/, "/400x400bb.jpg");
                        const catInfo = this.detectCategory(r.trackName, r.artistName, r.primaryGenreName || "", item.meta.origin);
                        const streamsValue = Math.floor(Math.random() * 38) + 16;
                        const streamsCount = `${streamsValue}.${Math.floor(Math.random() * 9)}M streams`;

                        collectedTracks.push({
                            id: `track-${r.trackId || Math.random().toString(36).substr(2, 9)}`,
                            title: r.trackName,
                            artist: r.artistName,
                            category: catInfo.category,
                            categoryLabel: catInfo.categoryLabel,
                            durationSec: Math.round((r.trackTimeMillis || 210000) / 1000),
                            audioUrl: r.previewUrl || "",
                            streamsCount: streamsCount,
                            tiktokUsage: streamsCount,
                            tags: ["#tophits", "#rytoneindo", `#${item.meta.query.toLowerCase().replace(/[^a-z0-9]/g, "")}`],
                            coverImage: coverImage,
                            coverGradient: SPOTIFY_GRADIENTS[collectedTracks.length % SPOTIFY_GRADIENTS.length],
                            accentColor: "#1ed760",
                            verifiedOriginal: true
                        });
                    }
                }
            }

            // 2. Process RSS Feeds
            for (const item of settled) {
                if ((item?.type === 'rss_indo' || item?.type === 'rss_us') && item.data?.feed?.entry) {
                    const isIndo = item.type === 'rss_indo';
                    for (const e of item.data.feed.entry) {
                        const title = e["im:name"]?.label || "";
                        const artist = e["im:artist"]?.label || "";
                        const rawImg = e["im:image"]?.[2]?.label || e["im:image"]?.[1]?.label || "";
                        const coverImage = rawImg.replace(/\/\d+x\d+bb\.(png|jpg)/, "/400x400bb.jpg");
                        const audioLink = e.link?.find(l => l.attributes?.type?.includes("audio") || l.attributes?.rel === "enclosure");
                        const audioUrl = audioLink?.attributes?.href || "";
                        const rawGenre = e.category?.attributes?.label || "";
                        if (!title || !artist) continue;

                        const normKey = `${title.toLowerCase().replace(/[^a-z0-9]/g, "")}-${artist.toLowerCase().slice(0, 5)}`;
                        if (seen.has(normKey)) continue;
                        seen.add(normKey);

                        const catInfo = this.detectCategory(title, artist, rawGenre, isIndo ? "indo" : "global");
                        const streamsValue = Math.max(14, Math.round(75 - collectedTracks.length * 0.25));
                        const streamsCount = `${streamsValue}.${Math.floor(Math.random() * 9)}M streams`;
                        const variedDuration = 175 + ((title.length * 13 + artist.length * 19 + collectedTracks.length * 7) % 80);

                        collectedTracks.push({
                            id: `live-${collectedTracks.length + 1}-${Math.random().toString(36).substring(2, 7)}`,
                            title: title,
                            artist: artist,
                            category: catInfo.category,
                            categoryLabel: catInfo.categoryLabel,
                            durationSec: variedDuration,
                            audioUrl: audioUrl,
                            streamsCount: streamsCount,
                            tiktokUsage: streamsCount,
                            tags: ["#tophits", isIndo ? "#rytoneindo" : "#rytoneglobal", `#${catInfo.category}`],
                            coverImage: coverImage,
                            coverGradient: SPOTIFY_GRADIENTS[collectedTracks.length % SPOTIFY_GRADIENTS.length],
                            accentColor: "#1ed760",
                            verifiedOriginal: true
                        });
                    }
                }
            }

            console.log(`[MusicService] Successfully gathered ${collectedTracks.length} live tracks across multiple genres!`);
            return collectedTracks;
        } catch (err) {
            console.error('[MusicService] Failed to fetch multi-genre live charts:', err.message);
            return [];
        }
    }

    /**
     * Get active tracks catalog
     */
    getTracks() {
        if (!this.cache || Date.now() - this.lastChecked > 300000) {
            this.loadCatalog();
            this.lastChecked = Date.now();
        }
        return this.cache || this.buildAndSaveCatalogSync();
    }

    /**
     * Synchronous fallback catalog builder
     */
    buildAndSaveCatalogSync() {
        const combinedTracks = LOCAL_HIT_REGISTRY.map((item, idx) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            category: item.category,
            categoryLabel: item.categoryLabel,
            durationSec: 240,
            audioUrl: `/audio/tiktok/${item.filename}`,
            streamsCount: item.streamsCount,
            tiktokUsage: item.streamsCount,
            rank: idx + 1,
            tags: item.tags,
            coverGradient: item.coverGradient,
            accentColor: item.accentColor,
            verifiedOriginal: true
        }));

        const data = {
            lastUpdated: new Date().toISOString(),
            version: "3.5.0",
            totalTracks: combinedTracks.length,
            autoUpdateEnabled: true,
            status: "active",
            tracks: combinedTracks
        };

        try {
            fs.writeFileSync(TRACKS_FILE, JSON.stringify(data, null, 2), 'utf8');
            this.cache = data;
        } catch {}

        return data;
    }

    /**
     * Live sync: Actively fetches live charts across all genres and adds newest songs into catalog
     */
    async syncTrendingMusic() {
        if (this.isSyncing) {
            return {
                success: true,
                message: "Sinkronisasi lagu sedang berjalan di latar belakang...",
                data: this.getTracks()
            };
        }

        this.isSyncing = true;
        console.log('[MusicService] Starting full sync: Fetching latest trending music across all genres...');

        try {
            this.loadCatalog();
            const currentCatalog = this.cache || { tracks: [] };
            const existingTracks = Array.isArray(currentCatalog.tracks) ? currentCatalog.tracks : [];

            // Fetch live tracks from iTunes & Apple RSS
            const liveTracks = await this.fetchLiveCharts();

            // Build map of existing tracks by normalized key
            const existingMap = new Map();
            for (const t of existingTracks) {
                const k = `${(t.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}-${(t.artist || "").toLowerCase().slice(0, 5)}`;
                existingMap.set(k, t);
            }

            // Also map local hit registry
            const localMap = new Map();
            for (const item of LOCAL_HIT_REGISTRY) {
                const k = `${(item.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}-${(item.artist || "").toLowerCase().slice(0, 5)}`;
                localMap.set(k, item);
            }

            const newlyAdded = [];
            for (const lt of liveTracks) {
                const k = `${(lt.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}-${(lt.artist || "").toLowerCase().slice(0, 5)}`;
                if (!existingMap.has(k)) {
                    newlyAdded.push(lt);
                    existingMap.set(k, lt); // mark seen
                }
            }

            console.log(`[MusicService] Found ${newlyAdded.length} new tracks to add to catalog.`);

            // Resolve YouTube IDs for top newly added tracks in parallel batches
            const resolveLimit = Math.min(newlyAdded.length, 25);
            if (resolveLimit > 0) {
                console.log(`[MusicService] Resolving YouTube IDs for top ${resolveLimit} newly discovered songs...`);
                const toResolve = newlyAdded.slice(0, resolveLimit);
                const ytIds = await Promise.all(toResolve.map(t => this.resolveYouTubeId(t.title, t.artist)));
                toResolve.forEach((t, i) => {
                    if (ytIds[i]) {
                        t.youtubeId = ytIds[i];
                        if (!t.audioUrl) {
                            t.audioUrl = `https://www.youtube.com/watch?v=${ytIds[i]}`;
                        }
                    }
                });
            }

            // Ensure all 27 local hit registry tracks are in the catalog with correct local audioUrl
            for (const [k, item] of localMap.entries()) {
                const existing = existingMap.get(k);
                if (existing) {
                    existing.audioUrl = `/audio/tiktok/${item.filename}`;
                    existing.category = item.category;
                    existing.categoryLabel = item.categoryLabel;
                    existing.verifiedOriginal = true;
                } else {
                    const newLocalTrack = {
                        id: item.id,
                        title: item.title,
                        artist: item.artist,
                        category: item.category,
                        categoryLabel: item.categoryLabel,
                        durationSec: 240,
                        audioUrl: `/audio/tiktok/${item.filename}`,
                        streamsCount: item.streamsCount,
                        tiktokUsage: item.streamsCount,
                        tags: item.tags,
                        coverGradient: item.coverGradient,
                        accentColor: item.accentColor,
                        verifiedOriginal: true
                    };
                    existingMap.set(k, newLocalTrack);
                    newlyAdded.push(newLocalTrack);
                }
            }

            // Reconstruct combined list: existing tracks first + new tracks appended
            const combinedTracks = [...existingTracks];
            for (const nt of newlyAdded) {
                if (!combinedTracks.some(ct => ct.id === nt.id)) {
                    combinedTracks.push(nt);
                }
            }

            // Re-assign ranks 1..N
            combinedTracks.forEach((t, idx) => {
                t.rank = idx + 1;
            });

            const updatedData = {
                lastUpdated: new Date().toISOString(),
                version: "3.5.0",
                totalTracks: combinedTracks.length,
                autoUpdateEnabled: true,
                status: "active",
                tracks: combinedTracks
            };

            try {
                fs.writeFileSync(TRACKS_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
                fs.writeFileSync(BACKUP_TRACKS_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
            } catch (writeErr) {
                console.warn('[MusicService] File write warning during sync:', writeErr.message);
            }

            this.cache = updatedData;
            this.isSyncing = false;
            console.log(`[MusicService] Sync complete! Total tracks in catalog: ${combinedTracks.length} (${newlyAdded.length} new songs added).`);

            return {
                success: true,
                message: `Berhasil memperbarui tangga lagu! ${newlyAdded.length} lagu baru ditambahkan (Total ${combinedTracks.length} lagu aktif).`,
                addedCount: newlyAdded.length,
                totalTracks: combinedTracks.length,
                lastUpdated: updatedData.lastUpdated,
                data: updatedData
            };
        } catch (err) {
            this.isSyncing = false;
            console.error('[MusicService] Sync failed:', err);
            return {
                success: false,
                message: `Sinkronisasi gagal: ${err.message}`,
                data: this.getTracks()
            };
        }
    }

    /**
     * Recurring auto-update job (every 24 hours)
     */
    startAutoUpdateCron() {
        setInterval(() => {
            console.log('[MusicService] Periodic 24h cron: Updating Spotify charts...');
            this.syncTrendingMusic().catch((err) => console.error('[MusicService] Cron error:', err.message));
        }, 24 * 60 * 60 * 1000);
    }
}

module.exports = new TikTokMusicService();
