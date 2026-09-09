/**
 * Theme Engine Database Schema & Seed Presets
 * Covers Indonesian cultural, national & religious momentums
 */

const { dbRun, dbGet, dbAll } = require('./db');

async function initThemeDb() {
    try {
        // 1. Table: themes
        await dbRun(`
            CREATE TABLE IF NOT EXISTS themes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                is_system_preset INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // 2. Table: theme_configs
        await dbRun(`
            CREATE TABLE IF NOT EXISTS theme_configs (
                theme_id TEXT PRIMARY KEY,
                tokens TEXT NOT NULL,
                assets TEXT NOT NULL,
                ornaments TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
            )
        `);

        // 3. Table: holiday_lunar_lookups
        await dbRun(`
            CREATE TABLE IF NOT EXISTS holiday_lunar_lookups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT NOT NULL,
                year INTEGER NOT NULL,
                gregorian_start_date TEXT NOT NULL,
                gregorian_end_date TEXT NOT NULL,
                description TEXT,
                UNIQUE(event_key, year)
            )
        `);

        // 4. Table: theme_schedules
        await dbRun(`
            CREATE TABLE IF NOT EXISTS theme_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                theme_id TEXT NOT NULL,
                event_name TEXT NOT NULL,
                calendar_type TEXT NOT NULL,
                solar_month INTEGER,
                solar_day INTEGER,
                lunar_event_key TEXT,
                buffer_days_before INTEGER DEFAULT 3,
                buffer_days_after INTEGER DEFAULT 3,
                priority_score INTEGER DEFAULT 100,
                is_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
            )
        `);

        // 5. Table: theme_settings (Single row)
        await dbRun(`
            CREATE TABLE IF NOT EXISTS theme_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                auto_schedule_enabled INTEGER DEFAULT 1,
                manual_override_theme_id TEXT,
                updated_by TEXT,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await dbRun(`
            INSERT OR IGNORE INTO theme_settings (id, auto_schedule_enabled, manual_override_theme_id)
            VALUES (1, 1, NULL)
        `);

        // Seed Preset Themes
        const presets = [
            {
                id: 'default-obsidian',
                name: 'Apple Obsidian (Default)',
                category: 'default',
                description: 'Desain minimalis modern dengan kartu obsidian dan kontras tinggi khas Apple Design System.',
                tokens: {
                    '--theme-primary': '#0071E3',
                    '--theme-primary-hover': '#0077ED',
                    '--theme-accent': '#34C759',
                    '--theme-surface-glow': 'rgba(0, 113, 227, 0.08)',
                    '--theme-card-border': 'rgba(0, 0, 0, 0.08)',
                    '--theme-header-bg': '#1D1D1F',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#1D1D1F',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Default'
                },
                ornaments: {
                    enabled: false,
                    particle_svgs: [],
                    particle_count_desktop: 0,
                    particle_count_mobile: 0,
                    speed: 'slow'
                }
            },
            {
                id: 'islam-eid',
                name: 'Idulfitri & Nuansa Islami',
                category: 'islam',
                description: 'Nuansa hijau zamrud dan emas dengan ornamen ketupat & bulan sabit suci.',
                tokens: {
                    '--theme-primary': '#0D5C3A',
                    '--theme-primary-hover': '#0A462C',
                    '--theme-accent': '#D4AF37',
                    '--theme-surface-glow': 'rgba(212, 175, 55, 0.14)',
                    '--theme-card-border': 'rgba(13, 92, 58, 0.22)',
                    '--theme-header-bg': '#0A3D27',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#0D5C3A',
                    '--theme-badge-text': '#F5F5F7'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Idul Fitri'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/ketupat.svg', '/assets/themes/crescent.svg'],
                    particle_count_desktop: 12,
                    particle_count_mobile: 5,
                    speed: 'slow'
                }
            },
            {
                id: 'national-ri',
                name: 'HUT RI (17 Agustus)',
                category: 'national',
                description: 'Nuansa merah bendera berani dan putih suci kemerdekaan Indonesia.',
                tokens: {
                    '--theme-primary': '#E11900',
                    '--theme-primary-hover': '#BA1400',
                    '--theme-accent': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(225, 25, 0, 0.12)',
                    '--theme-card-border': 'rgba(225, 25, 0, 0.22)',
                    '--theme-header-bg': '#8B0000',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#E11900',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'HUT RI'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/flag-ribbon.svg', '/assets/themes/red-white-petal.svg'],
                    particle_count_desktop: 14,
                    particle_count_mobile: 5,
                    speed: 'medium'
                }
            },
            {
                id: 'chinese-cny',
                name: 'Tahun Baru Imlek & Cap Go Meh',
                category: 'chinese',
                description: 'Nuansa merah keberuntungan, emas cerah, dan ornamen lampion.',
                tokens: {
                    '--theme-primary': '#C0392B',
                    '--theme-primary-hover': '#A93226',
                    '--theme-accent': '#F1C40F',
                    '--theme-surface-glow': 'rgba(241, 196, 15, 0.16)',
                    '--theme-card-border': 'rgba(192, 57, 43, 0.22)',
                    '--theme-header-bg': '#641E16',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#C0392B',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Imlek'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/lantern-red.svg', '/assets/themes/gold-coin.svg'],
                    particle_count_desktop: 14,
                    particle_count_mobile: 5,
                    speed: 'slow'
                }
            },
            {
                id: 'christian-christmas',
                name: 'Natal & Tahun Baru',
                category: 'christian',
                description: 'Nuansa merah rubi, hijau pinus, dan sentuhan salju emas kristal.',
                tokens: {
                    '--theme-primary': '#C41E3A',
                    '--theme-primary-hover': '#A01830',
                    '--theme-accent': '#D4AF37',
                    '--theme-surface-glow': 'rgba(196, 30, 58, 0.12)',
                    '--theme-card-border': 'rgba(196, 30, 58, 0.2)',
                    '--theme-header-bg': '#1E3A2B',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#C41E3A',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Natal'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/snowflake.svg', '/assets/themes/star.svg'],
                    particle_count_desktop: 14,
                    particle_count_mobile: 6,
                    speed: 'slow'
                }
            },
            {
                id: 'christian-easter',
                name: 'Paskah & Jumat Agung',
                category: 'christian',
                description: 'Nuansa ungu khidmat dan putih keemasan yang damai.',
                tokens: {
                    '--theme-primary': '#5B2C6F',
                    '--theme-primary-hover': '#4A235A',
                    '--theme-accent': '#D4AF37',
                    '--theme-surface-glow': 'rgba(91, 44, 111, 0.12)',
                    '--theme-card-border': 'rgba(91, 44, 111, 0.2)',
                    '--theme-header-bg': '#3A1C49',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#5B2C6F',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Paskah'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/dove.svg', '/assets/themes/star.svg'],
                    particle_count_desktop: 10,
                    particle_count_mobile: 4,
                    speed: 'slow'
                }
            },
            {
                id: 'buddha-waisak',
                name: 'Hari Raya Waisak',
                category: 'buddha',
                description: 'Nuansa terakota, jingga saffron, dan keheningan teratai suci.',
                tokens: {
                    '--theme-primary': '#C0392B',
                    '--theme-primary-hover': '#A93226',
                    '--theme-accent': '#F39C12',
                    '--theme-surface-glow': 'rgba(243, 156, 18, 0.14)',
                    '--theme-card-border': 'rgba(192, 57, 43, 0.2)',
                    '--theme-header-bg': '#5C1D16',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#C0392B',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Waisak'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/lotus.svg'],
                    particle_count_desktop: 10,
                    particle_count_mobile: 4,
                    speed: 'slow'
                }
            },
            {
                id: 'hindu-nyepi',
                name: 'Hari Raya Nyepi',
                category: 'hindu',
                description: 'Nuansa obsidian hening dan kuning keemasan khas ornamen Bali.',
                tokens: {
                    '--theme-primary': '#1A1A1D',
                    '--theme-primary-hover': '#2C2C2E',
                    '--theme-accent': '#D4AF37',
                    '--theme-surface-glow': 'rgba(212, 175, 55, 0.15)',
                    '--theme-card-border': 'rgba(212, 175, 55, 0.25)',
                    '--theme-header-bg': '#121214',
                    '--theme-header-text': '#F5F5F7',
                    '--theme-badge-bg': '#D4AF37',
                    '--theme-badge-text': '#1A1A1D'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Nyepi'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/flower-frangipani.svg'],
                    particle_count_desktop: 10,
                    particle_count_mobile: 4,
                    speed: 'slow'
                }
            },
            {
                id: 'national-batik',
                name: 'Hari Batik Nasional',
                category: 'national',
                description: 'Nuansa cokelat sogan klasik, aksen kayu nusantara, dan motif batik modern.',
                tokens: {
                    '--theme-primary': '#6E473B',
                    '--theme-primary-hover': '#5A372D',
                    '--theme-accent': '#C5A059',
                    '--theme-surface-glow': 'rgba(197, 160, 89, 0.14)',
                    '--theme-card-border': 'rgba(110, 71, 59, 0.22)',
                    '--theme-header-bg': '#3B231C',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-badge-bg': '#6E473B',
                    '--theme-badge-text': '#FFFFFF'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'Batik'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/batik-pattern-leaf.svg'],
                    particle_count_desktop: 8,
                    particle_count_mobile: 3,
                    speed: 'slow'
                }
            }
        ];

        for (const p of presets) {
            await dbRun(
                `INSERT OR REPLACE INTO themes (id, name, category, description, is_system_preset)
                 VALUES (?, ?, ?, ?, 1)`,
                [p.id, p.name, p.category, p.description]
            );

            await dbRun(
                `INSERT OR REPLACE INTO theme_configs (theme_id, tokens, assets, ornaments)
                 VALUES (?, ?, ?, ?)`,
                [p.id, JSON.stringify(p.tokens), JSON.stringify(p.assets), JSON.stringify(p.ornaments)]
            );
        }

        // Seed Lunar Lookups for 2026-2028
        const lookups = [
            // 2026
            { event_key: 'idul-fitri', year: 2026, gregorian_start_date: '2026-03-20', gregorian_end_date: '2026-03-21', description: 'Hari Raya Idul Fitri 1447 H' },
            { event_key: 'idul-adha', year: 2026, gregorian_start_date: '2026-05-27', gregorian_end_date: '2026-05-27', description: 'Hari Raya Idul Adha 1447 H' },
            { event_key: 'imlek', year: 2026, gregorian_start_date: '2026-02-17', gregorian_end_date: '2026-02-17', description: 'Tahun Baru Imlek 2577 Kongzili' },
            { event_key: 'nyepi', year: 2026, gregorian_start_date: '2026-03-19', gregorian_end_date: '2026-03-19', description: 'Hari Suci Nyepi Tahun Baru Saka 1948' },
            { event_key: 'waisak', year: 2026, gregorian_start_date: '2026-05-31', gregorian_end_date: '2026-05-31', description: 'Hari Raya Waisak 2570 BE' },
            { event_key: 'paskah', year: 2026, gregorian_start_date: '2026-04-03', gregorian_end_date: '2026-04-05', description: 'Wafat Isa Almasih & Paskah 2026' },

            // 2027
            { event_key: 'idul-fitri', year: 2027, gregorian_start_date: '2027-03-10', gregorian_end_date: '2027-03-11', description: 'Hari Raya Idul Fitri 1448 H' },
            { event_key: 'imlek', year: 2027, gregorian_start_date: '2027-02-06', gregorian_end_date: '2027-02-06', description: 'Tahun Baru Imlek 2578 Kongzili' },
            { event_key: 'nyepi', year: 2027, gregorian_start_date: '2027-03-09', gregorian_end_date: '2027-03-09', description: 'Hari Suci Nyepi Tahun Baru Saka 1949' },
            { event_key: 'waisak', year: 2027, gregorian_start_date: '2027-05-20', gregorian_end_date: '2027-05-20', description: 'Hari Raya Waisak 2571 BE' },
            { event_key: 'paskah', year: 2027, gregorian_start_date: '2027-03-26', gregorian_end_date: '2027-03-28', description: 'Wafat Isa Almasih & Paskah 2027' }
        ];

        for (const l of lookups) {
            await dbRun(
                `INSERT OR REPLACE INTO holiday_lunar_lookups (event_key, year, gregorian_start_date, gregorian_end_date, description)
                 VALUES (?, ?, ?, ?, ?)`,
                [l.event_key, l.year, l.gregorian_start_date, l.gregorian_end_date, l.description]
            );
        }

        // Seed Schedules
        const existingSchedules = await dbAll(`SELECT COUNT(*) as count FROM theme_schedules`);
        if (!existingSchedules || existingSchedules[0].count === 0) {
            const schedules = [
                {
                    theme_id: 'national-ri',
                    event_name: 'HUT Kemerdekaan RI 17 Agustus',
                    calendar_type: 'SOLAR_FIXED',
                    solar_month: 8,
                    solar_day: 17,
                    lunar_event_key: null,
                    buffer_days_before: 5,
                    buffer_days_after: 3,
                    priority_score: 900
                },
                {
                    theme_id: 'christian-christmas',
                    event_name: 'Hari Raya Natal & Tahun Baru',
                    calendar_type: 'SOLAR_FIXED',
                    solar_month: 12,
                    solar_day: 25,
                    lunar_event_key: null,
                    buffer_days_before: 5,
                    buffer_days_after: 6,
                    priority_score: 850
                },
                {
                    theme_id: 'national-batik',
                    event_name: 'Hari Batik Nasional',
                    calendar_type: 'SOLAR_FIXED',
                    solar_month: 10,
                    solar_day: 2,
                    lunar_event_key: null,
                    buffer_days_before: 1,
                    buffer_days_after: 2,
                    priority_score: 500
                },
                {
                    theme_id: 'islam-eid',
                    event_name: 'Hari Raya Idul Fitri',
                    calendar_type: 'LUNAR_LOOKUP',
                    solar_month: null,
                    solar_day: null,
                    lunar_event_key: 'idul-fitri',
                    buffer_days_before: 4,
                    buffer_days_after: 4,
                    priority_score: 880
                },
                {
                    theme_id: 'chinese-cny',
                    event_name: 'Tahun Baru Imlek',
                    calendar_type: 'LUNAR_LOOKUP',
                    solar_month: null,
                    solar_day: null,
                    lunar_event_key: 'imlek',
                    buffer_days_before: 3,
                    buffer_days_after: 3,
                    priority_score: 800
                },
                {
                    theme_id: 'hindu-nyepi',
                    event_name: 'Hari Suci Nyepi',
                    calendar_type: 'LUNAR_LOOKUP',
                    solar_month: null,
                    solar_day: null,
                    lunar_event_key: 'nyepi',
                    buffer_days_before: 2,
                    buffer_days_after: 2,
                    priority_score: 750
                },
                {
                    theme_id: 'buddha-waisak',
                    event_name: 'Hari Raya Waisak',
                    calendar_type: 'LUNAR_LOOKUP',
                    solar_month: null,
                    solar_day: null,
                    lunar_event_key: 'waisak',
                    buffer_days_before: 2,
                    buffer_days_after: 2,
                    priority_score: 750
                },
                {
                    theme_id: 'christian-easter',
                    event_name: 'Paskah & Jumat Agung',
                    calendar_type: 'LUNAR_LOOKUP',
                    solar_month: null,
                    solar_day: null,
                    lunar_event_key: 'paskah',
                    buffer_days_before: 2,
                    buffer_days_after: 2,
                    priority_score: 750
                }
            ];

            for (const s of schedules) {
                await dbRun(
                    `INSERT INTO theme_schedules 
                     (theme_id, event_name, calendar_type, solar_month, solar_day, lunar_event_key, buffer_days_before, buffer_days_after, priority_score, is_enabled)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [s.theme_id, s.event_name, s.calendar_type, s.solar_month, s.solar_day, s.lunar_event_key, s.buffer_days_before, s.buffer_days_after, s.priority_score]
                );
            }
        }

        console.log("✅ Theme Engine schema & momentum presets initialized successfully.");
    } catch (err) {
        console.error("❌ Failed to initialize Theme Engine database:", err);
    }
}

module.exports = {
    initThemeDb
};
