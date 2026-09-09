/**
 * Theme Engine Service
 * Evaluates active theme dynamically using Indonesian cultural & religious calendar schedules,
 * buffer windows (H-X s.d H+X), and manual admin override.
 */

const { dbGet, dbAll, dbRun } = require('../config/db');

let cachedActiveTheme = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

// Formats date to YYYY-MM-DD in Asia/Jakarta (WIB) timezone
function getWibDate(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}

const ThemeEngineService = {
    clearCache() {
        cachedActiveTheme = null;
        lastCacheTime = 0;
    },

    async getThemeById(themeId) {
        const row = await dbGet(
            `SELECT t.id, t.name, t.category, t.description, c.tokens, c.assets, c.ornaments
             FROM themes t
             JOIN theme_configs c ON t.id = c.theme_id
             WHERE t.id = ?`,
            [themeId]
        );

        if (!row) return null;

        return {
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description,
            tokens: JSON.parse(row.tokens || '{}'),
            assets: JSON.parse(row.assets || '{}'),
            ornaments: JSON.parse(row.ornaments || '{}')
        };
    },

    async getActiveTheme() {
        const now = Date.now();
        if (cachedActiveTheme && (now - lastCacheTime < CACHE_TTL_MS)) {
            return cachedActiveTheme;
        }

        try {
            const settings = await dbGet('SELECT * FROM theme_settings WHERE id = 1');
            const autoSchedule = settings ? settings.auto_schedule_enabled === 1 : true;
            const manualThemeId = settings ? settings.manual_override_theme_id : null;

            // 1. Manual Override Active
            if (!autoSchedule && manualThemeId) {
                const theme = await this.getThemeById(manualThemeId);
                if (theme) {
                    cachedActiveTheme = {
                        ...theme,
                        meta: {
                            mode: 'manual_override',
                            auto_schedule_enabled: false,
                            event_name: null,
                            active_momentum: null
                        }
                    };
                    lastCacheTime = now;
                    return cachedActiveTheme;
                }
            }

            // 2. Auto-Schedule Matcher
            const todayStr = getWibDate();
            const currentYear = parseInt(todayStr.substring(0, 4), 10);

            // Fetch active schedules & lunar lookups for current year
            const schedules = await dbAll(
                `SELECT s.*, l.gregorian_start_date, l.gregorian_end_date, l.description as lunar_description
                 FROM theme_schedules s
                 LEFT JOIN holiday_lunar_lookups l 
                   ON s.lunar_event_key = l.event_key AND l.year = ?
                 WHERE s.is_enabled = 1`,
                [currentYear]
            );

            const todayDate = new Date(`${todayStr}T00:00:00+07:00`);
            const matches = [];

            for (const s of schedules) {
                let peakStartDate = null;
                let peakEndDate = null;

                if (s.calendar_type === 'SOLAR_FIXED' && s.solar_month && s.solar_day) {
                    const mStr = String(s.solar_month).padStart(2, '0');
                    const dStr = String(s.solar_day).padStart(2, '0');
                    peakStartDate = new Date(`${currentYear}-${mStr}-${dStr}T00:00:00+07:00`);
                    peakEndDate = new Date(`${currentYear}-${mStr}-${dStr}T00:00:00+07:00`);
                } else if (s.calendar_type === 'LUNAR_LOOKUP' && s.gregorian_start_date) {
                    peakStartDate = new Date(`${s.gregorian_start_date}T00:00:00+07:00`);
                    peakEndDate = new Date(`${s.gregorian_end_date || s.gregorian_start_date}T00:00:00+07:00`);
                }

                if (!peakStartDate || isNaN(peakStartDate.getTime())) continue;

                // Calculate buffer boundaries
                const effectiveStart = new Date(peakStartDate);
                effectiveStart.setDate(effectiveStart.getDate() - (s.buffer_days_before || 0));

                const effectiveEnd = new Date(peakEndDate);
                effectiveEnd.setDate(effectiveEnd.getDate() + (s.buffer_days_after || 0));
                effectiveEnd.setHours(23, 59, 59, 999);

                if (todayDate >= effectiveStart && todayDate <= effectiveEnd) {
                    // Proximity score: closer to peak date = bonus points
                    const diffDays = Math.min(
                        Math.abs((todayDate.getTime() - peakStartDate.getTime()) / (1000 * 60 * 60 * 24)),
                        Math.abs((todayDate.getTime() - peakEndDate.getTime()) / (1000 * 60 * 60 * 24))
                    );
                    const proximityBonus = Math.max(0, 30 - Math.round(diffDays * 5));
                    const totalScore = (s.priority_score || 100) + proximityBonus;

                    matches.push({
                        schedule: s,
                        score: totalScore,
                        peakStartDate,
                        peakEndDate
                    });
                }
            }

            if (matches.length > 0) {
                matches.sort((a, b) => b.score - a.score);
                const bestMatch = matches[0];
                const theme = await this.getThemeById(bestMatch.schedule.theme_id);

                if (theme) {
                    cachedActiveTheme = {
                        ...theme,
                        meta: {
                            mode: 'auto_scheduled',
                            auto_schedule_enabled: true,
                            event_name: bestMatch.schedule.event_name,
                            active_momentum: bestMatch.schedule.theme_id,
                            score: bestMatch.score
                        }
                    };
                    lastCacheTime = now;
                    return cachedActiveTheme;
                }
            }

            // 3. Fallback to Default Theme
            const fallback = await this.getThemeById('default-obsidian');
            cachedActiveTheme = {
                ...(fallback || {
                    id: 'default-obsidian',
                    name: 'Apple Obsidian (Default)',
                    category: 'default',
                    tokens: {
                        '--theme-primary': '#0071E3',
                        '--theme-primary-hover': '#0077ED',
                        '--theme-accent': '#34C759',
                        '--theme-header-bg': '#1D1D1F',
                        '--theme-header-text': '#FFFFFF'
                    },
                    assets: {},
                    ornaments: { enabled: false }
                }),
                meta: {
                    mode: 'default_fallback',
                    auto_schedule_enabled: autoSchedule,
                    event_name: null,
                    active_momentum: null
                }
            };
            lastCacheTime = now;
            return cachedActiveTheme;
        } catch (err) {
            console.error('Error resolving active theme:', err);
            return {
                id: 'default-obsidian',
                name: 'Apple Obsidian (Default)',
                category: 'default',
                tokens: {
                    '--theme-primary': '#0071E3',
                    '--theme-primary-hover': '#0077ED',
                    '--theme-accent': '#34C759',
                    '--theme-header-bg': '#1D1D1F',
                    '--theme-header-text': '#FFFFFF'
                },
                assets: {},
                ornaments: { enabled: false },
                meta: { mode: 'error_fallback', auto_schedule_enabled: true }
            };
        }
    },

    async getAllThemes() {
        const rows = await dbAll(
            `SELECT t.id, t.name, t.category, t.description, t.is_system_preset,
                    c.tokens, c.assets, c.ornaments
             FROM themes t
             JOIN theme_configs c ON t.id = c.theme_id
             ORDER BY t.is_system_preset DESC, t.id ASC`
        );

        return rows.map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            description: r.description,
            is_system_preset: r.is_system_preset === 1,
            tokens: JSON.parse(r.tokens || '{}'),
            assets: JSON.parse(r.assets || '{}'),
            ornaments: JSON.parse(r.ornaments || '{}')
        }));
    },

    async getAdminOverview() {
        const activeTheme = await this.getActiveTheme();
        const settings = await dbGet('SELECT * FROM theme_settings WHERE id = 1');
        const themes = await this.getAllThemes();
        const schedules = await dbAll(`SELECT * FROM theme_schedules ORDER BY priority_score DESC`);
        const currentYear = parseInt(getWibDate().substring(0, 4), 10);
        const lookups = await dbAll(
            `SELECT * FROM holiday_lunar_lookups WHERE year >= ? ORDER BY year ASC, gregorian_start_date ASC`,
            [currentYear]
        );

        return {
            activeTheme,
            settings: {
                autoScheduleEnabled: settings ? settings.auto_schedule_enabled === 1 : true,
                manualOverrideThemeId: settings ? settings.manual_override_theme_id : null,
                updatedAt: settings ? settings.updated_at : null
            },
            themes,
            schedules,
            lookups
        };
    },

    async updateSettings({ autoScheduleEnabled, manualOverrideThemeId, updatedBy }) {
        await dbRun(
            `UPDATE theme_settings
             SET auto_schedule_enabled = ?, manual_override_theme_id = ?, updated_by = ?, updated_at = datetime('now')
             WHERE id = 1`,
            [autoScheduleEnabled ? 1 : 0, manualOverrideThemeId || null, updatedBy || 'admin']
        );
        this.clearCache();
        return this.getAdminOverview();
    },

    async updateSchedule(scheduleId, { bufferDaysBefore, bufferDaysAfter, isEnabled, priorityScore }) {
        await dbRun(
            `UPDATE theme_schedules
             SET buffer_days_before = COALESCE(?, buffer_days_before),
                 buffer_days_after = COALESCE(?, buffer_days_after),
                 is_enabled = COALESCE(?, is_enabled),
                 priority_score = COALESCE(?, priority_score)
             WHERE id = ?`,
            [bufferDaysBefore, bufferDaysAfter, isEnabled !== undefined ? (isEnabled ? 1 : 0) : null, priorityScore, scheduleId]
        );
        this.clearCache();
        return dbGet(`SELECT * FROM theme_schedules WHERE id = ?`, [scheduleId]);
    }
};

module.exports = ThemeEngineService;
