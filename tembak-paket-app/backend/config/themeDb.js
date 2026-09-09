/**
 * Theme Engine Database Schema & Seed Presets
 * Covers Indonesian cultural, national & religious momentums with FULL aesthetic transformation
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

        // Seed Full Aesthetic Preset Themes
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
                    '--theme-canvas': '#F5F5F7',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(0, 0, 0, 0.08)',
                    '--theme-header-bg': '#1D1D1F',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(0, 113, 227, 0.08)',
                    '--theme-card-border': 'rgba(0, 0, 0, 0.08)',
                    '--theme-dark-canvas': '#000000',
                    '--theme-dark-parchment': '#161617',
                    '--theme-dark-header-bg': '#1C1C1E',
                    '--theme-dark-hairline': 'rgba(255, 255, 255, 0.08)'
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
                id: 'national-ri',
                name: 'HUT RI (17 Agustus)',
                category: 'national',
                description: 'Transformasi penuh nuansa merah-putih kemerdekaan: background lembut berhawa patriotik, kartu marun kenegaraan, dan aksen dwiwarna.',
                tokens: {
                    '--theme-primary': '#E11900',
                    '--theme-primary-hover': '#BA1400',
                    '--theme-accent': '#FFFFFF',
                    '--theme-canvas': '#FCF6F6',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(225, 25, 0, 0.14)',
                    '--theme-header-bg': '#8B0000',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(225, 25, 0, 0.18)',
                    '--theme-card-border': 'rgba(225, 25, 0, 0.22)',
                    '--theme-dark-canvas': '#140505',
                    '--theme-dark-parchment': '#1C0A0A',
                    '--theme-dark-header-bg': '#2E0606',
                    '--theme-dark-hairline': 'rgba(225, 25, 0, 0.25)'
                },
                assets: {
                    pattern_svg_url: 'none',
                    theme_badge_text: 'HUT RI'
                },
                ornaments: {
                    enabled: true,
                    particle_svgs: ['/assets/themes/flag-ribbon.svg', '/assets/themes/red-white-petal.svg'],
                    particle_count_desktop: 14,
                    particle_count_mobile: 6,
                    speed: 'medium'
                }
            },
            {
                id: 'islam-eid',
                name: 'Idulfitri & Nuansa Islami',
                category: 'islam',
                description: 'Transformasi sejuk damai: background sage/zamrud lembut, kartu hijau beludru dengan aksen emas royal, dan partikel ketupat suci.',
                tokens: {
                    '--theme-primary': '#0D5C3A',
                    '--theme-primary-hover': '#08442A',
                    '--theme-accent': '#D4AF37',
                    '--theme-canvas': '#F4F9F5',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(13, 92, 58, 0.14)',
                    '--theme-header-bg': '#0A3D27',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(212, 175, 55, 0.20)',
                    '--theme-card-border': 'rgba(13, 92, 58, 0.24)',
                    '--theme-dark-canvas': '#05140D',
                    '--theme-dark-parchment': '#0B2117',
                    '--theme-dark-header-bg': '#072114',
                    '--theme-dark-hairline': 'rgba(212, 175, 55, 0.22)'
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
                id: 'chinese-cny',
                name: 'Tahun Baru Imlek & Cap Go Meh',
                category: 'chinese',
                description: 'Transformasi meriah bernuansa hoki: background gading hangat, kartu merah anggur istana dengan sentuhan lampion emas.',
                tokens: {
                    '--theme-primary': '#C0392B',
                    '--theme-primary-hover': '#A93226',
                    '--theme-accent': '#F1C40F',
                    '--theme-canvas': '#FDF7F5',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(192, 57, 43, 0.14)',
                    '--theme-header-bg': '#5C1D16',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(241, 196, 15, 0.22)',
                    '--theme-card-border': 'rgba(192, 57, 43, 0.24)',
                    '--theme-dark-canvas': '#140504',
                    '--theme-dark-parchment': '#220908',
                    '--theme-dark-header-bg': '#2E0A08',
                    '--theme-dark-hairline': 'rgba(241, 196, 15, 0.22)'
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
                description: 'Transformasi nuansa musim dingin: sejuknya salju, hijau pinus abadi, dan merah rubi pesta natal.',
                tokens: {
                    '--theme-primary': '#C41E3A',
                    '--theme-primary-hover': '#A01830',
                    '--theme-accent': '#D4AF37',
                    '--theme-canvas': '#F5F8F6',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(196, 30, 58, 0.14)',
                    '--theme-header-bg': '#1A3828',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(196, 30, 58, 0.18)',
                    '--theme-card-border': 'rgba(196, 30, 58, 0.22)',
                    '--theme-dark-canvas': '#07140D',
                    '--theme-dark-parchment': '#0F2418',
                    '--theme-dark-header-bg': '#0B2919',
                    '--theme-dark-hairline': 'rgba(212, 175, 55, 0.22)'
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
                description: 'Transformasi khidmat dan damai: latar lavender halus dengan kartu ungu keagungan dan ornamen merpati.',
                tokens: {
                    '--theme-primary': '#5B2C6F',
                    '--theme-primary-hover': '#4A235A',
                    '--theme-accent': '#D4AF37',
                    '--theme-canvas': '#F9F6FB',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(91, 44, 111, 0.14)',
                    '--theme-header-bg': '#3E1F4C',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(91, 44, 111, 0.16)',
                    '--theme-card-border': 'rgba(91, 44, 111, 0.22)',
                    '--theme-dark-canvas': '#100615',
                    '--theme-dark-parchment': '#1B0B23',
                    '--theme-dark-header-bg': '#260B33',
                    '--theme-dark-hairline': 'rgba(212, 175, 55, 0.2)'
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
                description: 'Transformasi keheningan teratai: kehangatan terakota dan jingga saffron suci.',
                tokens: {
                    '--theme-primary': '#C0392B',
                    '--theme-primary-hover': '#A93226',
                    '--theme-accent': '#F39C12',
                    '--theme-canvas': '#FDF9F4',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(192, 57, 43, 0.14)',
                    '--theme-header-bg': '#4A1E17',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(243, 156, 18, 0.18)',
                    '--theme-card-border': 'rgba(192, 57, 43, 0.22)',
                    '--theme-dark-canvas': '#140A07',
                    '--theme-dark-parchment': '#21100B',
                    '--theme-dark-header-bg': '#2B1109',
                    '--theme-dark-hairline': 'rgba(243, 156, 18, 0.2)'
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
                description: 'Transformasi keheningan Catur Brata: hitam obsidian hening dan aksen kuning keemasan khas Bali.',
                tokens: {
                    '--theme-primary': '#1A1A1D',
                    '--theme-primary-hover': '#2C2C2E',
                    '--theme-accent': '#D4AF37',
                    '--theme-canvas': '#F5F5F7',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(212, 175, 55, 0.18)',
                    '--theme-header-bg': '#171719',
                    '--theme-header-text': '#F5F5F7',
                    '--theme-surface-glow': 'rgba(212, 175, 55, 0.18)',
                    '--theme-card-border': 'rgba(212, 175, 55, 0.25)',
                    '--theme-dark-canvas': '#0A0A0C',
                    '--theme-dark-parchment': '#141417',
                    '--theme-dark-header-bg': '#1A1A1E',
                    '--theme-dark-hairline': 'rgba(212, 175, 55, 0.25)'
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
                description: 'Transformasi mahakarya nusantara: cokelat sogan klasik parang dan kehangatan kayu jati.',
                tokens: {
                    '--theme-primary': '#6E473B',
                    '--theme-primary-hover': '#5A372D',
                    '--theme-accent': '#C5A059',
                    '--theme-canvas': '#F9F5F0',
                    '--theme-parchment': '#FFFFFF',
                    '--theme-hairline': 'rgba(110, 71, 59, 0.14)',
                    '--theme-header-bg': '#38221B',
                    '--theme-header-text': '#FFFFFF',
                    '--theme-surface-glow': 'rgba(197, 160, 89, 0.18)',
                    '--theme-card-border': 'rgba(110, 71, 59, 0.22)',
                    '--theme-dark-canvas': '#120B08',
                    '--theme-dark-parchment': '#1C120D',
                    '--theme-dark-header-bg': '#24140D',
                    '--theme-dark-hairline': 'rgba(197, 160, 89, 0.22)'
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

        console.log("✅ Full Aesthetic Momentum Presets initialized successfully.");
    } catch (err) {
        console.error("❌ Failed to initialize Theme Engine database:", err);
    }
}

module.exports = {
    initThemeDb
};
