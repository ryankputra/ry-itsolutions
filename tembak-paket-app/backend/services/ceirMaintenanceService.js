/**
 * ceirMaintenanceService.js
 * Centralized service to evaluate CEIR maintenance status and manage admin mode settings.
 */

const ceirgoClient = require('../ceirgoClient');

let externalDb = null;

function setDatabase(dbInstance) {
    externalDb = dbInstance;
}

function getDb() {
    if (externalDb) return externalDb;
    try {
        const configDb = require('../config/db');
        return configDb;
    } catch (e) {
        return null;
    }
}

async function safeDbGet(query, params = []) {
    const db = getDb();
    if (!db || !db.dbGet) return null;
    try {
        return await db.dbGet(query, params);
    } catch (e) {
        return null;
    }
}

async function safeDbRun(query, params = []) {
    const db = getDb();
    if (!db || !db.dbRun) return null;
    return await db.dbRun(query, params);
}

const DEFAULT_FALLBACK_SERVICES = [
    { code: 'cek_history_imei', name: 'Cek Riwayat Database CEIR', modalPrice: 5100 },
    { code: 'cek_imei_beacukai', name: 'Cek IMEI Bea Cukai', modalPrice: 1500 },
    { code: 'cek_validity', name: 'Cek Masa Aktif Sinyal', modalPrice: 1000 },
    { code: 'cek_icloud', name: 'Cek iCloud & FMI (Clean / Lost)', modalPrice: 1500 },
    { code: 'cek_simlock', name: 'Cek Carrier Simlock (Operator Asal)', modalPrice: 2000 },
    { code: 'cek_digi', name: 'Cek DIGI', modalPrice: 1000 },
    { code: 'cek_sf', name: 'Cek Smartfren', modalPrice: 1000 },
    { code: 'cek_imei', name: 'Cek Status IMEI', modalPrice: 2000 },
    { code: 'create_barcode', name: 'Generator Barcode Universal', modalPrice: 3000 },
    { code: 'create_barcode_samsung', name: 'Generator Barcode Samsung', modalPrice: 3000 },
    { code: 'create_barcode_redmi', name: 'Generator Barcode Redmi / Xiaomi', modalPrice: 3000 },
    { code: 'create_barcode_ios26', name: 'Generator Barcode iOS (iPhone)', modalPrice: 3500 }
];

function readModalPrice(detail, svc) {
    const candidates = [
        detail?.data?.rule?.unit_price,
        detail?.data?.rule?.unitPrice,
        detail?.data?.price,
        detail?.data?.unit_price,
        detail?.data?.modalPrice,
        detail?.rule?.unit_price,
        detail?.rule?.unitPrice,
        detail?.price,
        detail?.unit_price,
        detail?.modalPrice,
        svc?.unit_price,
        svc?.unitPrice,
        svc?.price,
        svc?.modalPrice,
    ];
    return candidates.map(v => Number(v)).find(n => Number.isFinite(n) && n > 0) || 0;
}

/**
 * Get current CeirGO balance (live from CeirGO API or fallback to cached balance in DB)
 */
async function getCeirgoBalance() {
    try {
        const profileRes = await ceirgoClient.getProfile();
        let bal = profileRes?.balance;

        if (bal == null || isNaN(bal) || !profileRes?.hasLiveBalance) {
            const cachedRow = await safeDbGet(
                "SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1"
            );
            if (cachedRow && cachedRow.value != null) {
                const cachedVal = Number(cachedRow.value);
                if (!isNaN(cachedVal) && cachedVal >= 0) {
                    bal = cachedVal;
                }
            }
        }
        return Number(bal || 0);
    } catch (e) {
        const cachedRow = await safeDbGet(
            "SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1"
        );
        const cachedVal = cachedRow && cachedRow.value ? Number(cachedRow.value) : 0;
        return isNaN(cachedVal) ? 0 : cachedVal;
    }
}

/**
 * Get min modal price among active services configured in ceirgo_display_settings
 */
async function getMinRequiredBalance() {
    try {
        let activeCodes = null;
        const displayRow = await safeDbGet("SELECT value FROM settings WHERE key = 'ceirgo_display_settings'");
        if (displayRow && displayRow.value) {
            try {
                const parsed = JSON.parse(displayRow.value);
                const allActive = [
                    ...(Array.isArray(parsed.cekCeir) ? parsed.cekCeir : []),
                    ...(Array.isArray(parsed.barcode) ? parsed.barcode : [])
                ];
                if (allActive.length > 0) {
                    activeCodes = new Set(allActive);
                }
            } catch (e) {}
        }

        const ceirgoRes = await ceirgoClient.getServices({ limit: 50 }).catch(() => ({ status: false }));
        let services = [];
        if (ceirgoRes && ceirgoRes.status && ceirgoRes.data) {
            services = ceirgoRes.data?.page?.items || ceirgoRes.data?.items || ceirgoRes.data || [];
        }
        if (!Array.isArray(services) || services.length === 0) {
            services = DEFAULT_FALLBACK_SERVICES;
        }

        let minPrice = Infinity;
        for (const svc of services) {
            if (!svc || !svc.code) continue;
            if (activeCodes && !activeCodes.has(svc.code)) continue;

            const modal = readModalPrice(null, svc) || Number(svc.modalPrice || 0);
            if (modal > 0 && modal < minPrice) {
                minPrice = modal;
            }
        }

        if (minPrice === Infinity) {
            for (const svc of DEFAULT_FALLBACK_SERVICES) {
                if (activeCodes && !activeCodes.has(svc.code)) continue;
                if (svc.modalPrice > 0 && svc.modalPrice < minPrice) {
                    minPrice = svc.modalPrice;
                }
            }
        }

        return minPrice === Infinity ? 1000 : minPrice;
    } catch (e) {
        return 1000;
    }
}

/**
 * Get the current maintenance mode setting ('auto' | 'manual_on' | 'manual_off')
 */
async function getCeirMaintenanceMode() {
    try {
        const row = await safeDbGet("SELECT value FROM settings WHERE key = 'ceir_maintenance_mode'");
        const mode = (row?.value || 'auto').trim().toLowerCase();
        if (['auto', 'manual_on', 'manual_off'].includes(mode)) {
            return mode;
        }
        return 'auto';
    } catch (e) {
        return 'auto';
    }
}

/**
 * Check full CEIR system status & maintenance decision
 * 
 * Logic:
 * - mode === 'manual_on'  => isMaintenance = true (Alasan: "Pemeliharaan Manual oleh Admin")
 * - mode === 'manual_off' => isMaintenance = false
 * - mode === 'auto'       => if (ceirgoBalance < minRequiredBalance) => isMaintenance = true
 *                            else => isMaintenance = false
 */
async function getCeirSystemStatus() {
    const mode = await getCeirMaintenanceMode();
    const [ceirgoBalance, minRequiredBalance] = await Promise.all([
        getCeirgoBalance(),
        getMinRequiredBalance()
    ]);

    let isMaintenance = false;
    let reason = "Layanan beroperasi normal.";

    if (mode === 'manual_on') {
        isMaintenance = true;
        reason = "Pemeliharaan Manual oleh Admin";
    } else if (mode === 'manual_off') {
        isMaintenance = false;
        reason = "Layanan dibuka secara manual oleh Admin.";
    } else {
        // Auto mode
        if (ceirgoBalance < minRequiredBalance) {
            isMaintenance = true;
            reason = `Saldo server pusat di bawah batas minimal pemrosesan (Saldo: Rp ${Number(ceirgoBalance).toLocaleString('id-ID')}, Minimal: Rp ${Number(minRequiredBalance).toLocaleString('id-ID')})`;
        } else {
            isMaintenance = false;
            reason = "Layanan beroperasi normal (Saldo mencukupi).";
        }
    }

    return {
        isMaintenance,
        mode,
        ceirgoBalance,
        minRequiredBalance,
        reason
    };
}

/**
 * Set CEIR maintenance mode in settings table
 */
async function setCeirMaintenanceMode(newMode) {
    const validModes = ['auto', 'manual_on', 'manual_off'];
    const cleanMode = String(newMode || '').trim().toLowerCase();
    if (!validModes.includes(cleanMode)) {
        throw new Error(`Mode tidak valid. Pilihan yang tersedia: ${validModes.join(', ')}`);
    }

    await safeDbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('ceir_maintenance_mode', ?)", [cleanMode]);
    return cleanMode;
}

module.exports = {
    setDatabase,
    getCeirgoBalance,
    getMinRequiredBalance,
    getCeirMaintenanceMode,
    getCeirSystemStatus,
    setCeirMaintenanceMode
};
