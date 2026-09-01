const express = require('express');
const fetch = require('node-fetch');

const ceirgoRoutes = express.Router();

let dbAll, isAuthenticated, isAdmin, CEIRGO_API_KEY, CEIRGO_BASE_URL;

function setDependencies(deps) {
    ({ dbAll, isAuthenticated, isAdmin, CEIRGO_API_KEY, CEIRGO_BASE_URL } = deps);
}

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

function normalizeServices(payload) {
    return payload?.data?.page?.items || payload?.data || [];
}

const DEFAULT_FALLBACK_SERVICES = [
    { code: 'cek_history_imei', name: 'Cek Riwayat Database CEIR', modalPrice: 5100 },
    { code: 'cek_imei_beacukai', name: 'Cek IMEI Bea Cukai', modalPrice: 1500 },
    { code: 'cek_validity', name: 'Cek Masa Aktif Sinyal', modalPrice: 1000 },
    { code: 'cek_icloud', name: 'Cek iCloud & FMI (Clean / Lost)', modalPrice: 1500 },
    { code: 'cek_simlock', name: 'Cek Carrier Simlock (Operator Asal)', modalPrice: 2000 },
    { code: 'cek_digi', name: 'Cek DIGI', modalPrice: 1000 },
    { code: 'cek_sf', name: 'Cek Smartfren', modalPrice: 1000 },
    { code: 'cek_imei', name: 'Cek Status IMEI', modalPrice: 2000 }
];

function initCeirgoRoutes() {
    // Public list for user pages (filtered client-side by display settings)
    ceirgoRoutes.get('/ceirgo-services', async (req, res) => {
        try {
            if (!CEIRGO_API_KEY) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const ceirgoRes = await fetch(`${CEIRGO_BASE_URL}/api/services?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            if (!ceirgoRes.ok) {
                const errorText = await ceirgoRes.text();
                throw new Error(`CeirGO API responded with status ${ceirgoRes.status}: ${errorText}`);
            }

            const servicesPayload = await ceirgoRes.json();
            const services = normalizeServices(servicesPayload);
            const finalServices = Array.isArray(services) && services.length > 0 ? services : DEFAULT_FALLBACK_SERVICES;

            res.json({ status: true, data: finalServices });
        } catch (error) {
            console.warn("[API Warning] CeirGO live server offline/timed out. Using fallback diagnostic catalog:", error.message);
            res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
        }
    });

    // Return admin-set prices from DB (not modal prices from API)
    ceirgoRoutes.get('/ceirgo-pricing', async (req, res) => {
        try {
            const rows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'ceirgo_price_%'");
            const pricing = rows.reduce((acc, row) => {
                const normalizedKey = row.key.replace(/^ceirgo_price_ceirgo_price_/, 'ceirgo_price_').replace('ceirgo_price_', '');
                acc[normalizedKey] = parseInt(row.value) || 0;
                return acc;
            }, {});
            res.json({ status: true, data: pricing });
        } catch (error) {
            console.error("[API] Error fetching CeirGO pricing:", error.message);
            res.status(500).json({ status: false, message: 'Gagal mengambil harga layanan CeirGO.' });
        }
    });

    ceirgoRoutes.get('/admin/ceirgo-services', isAuthenticated, isAdmin, async (req, res) => {
        try {
            if (!CEIRGO_API_KEY) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const ceirgoRes = await fetch(`${CEIRGO_BASE_URL}/api/services?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            if (!ceirgoRes.ok) {
                const errorText = await ceirgoRes.text();
                throw new Error(`CeirGO API responded with status ${ceirgoRes.status}: ${errorText}`);
            }

            const servicesPayload = await ceirgoRes.json();
            const services = normalizeServices(servicesPayload);
            
            if (!Array.isArray(services) || services.length === 0) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const detailedServices = await Promise.all(
                services.map(async (svc) => {
                    if (!svc?.code) return null;
                    try {
                        const detailRes = await fetch(`${CEIRGO_BASE_URL}/api/services/${svc.code}`, {
                            headers: {
                                'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                                'Accept': 'application/json'
                            },
                            timeout: 5000
                        });

                        let detail = null;
                        if (detailRes.ok) {
                            detail = await detailRes.json();
                        }
                        return {
                            code: svc.code,
                            name: svc.name,
                            modalPrice: readModalPrice(detail, svc),
                        };
                    } catch (e) {
                        return {
                            code: svc.code,
                            name: svc.name,
                            modalPrice: readModalPrice(null, svc),
                        };
                    }
                })
            );

            res.json({ status: true, data: detailedServices.filter(Boolean) });
        } catch (error) {
            console.warn("[API Warning] CeirGO admin server offline/timed out. Serving fallback catalog:", error.message);
            res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
        }
    });
}

module.exports = { ceirgoRoutes, setDependencies, initCeirgoRoutes };
