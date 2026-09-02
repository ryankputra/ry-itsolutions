const express = require('express');
const ceirgoClient = require('./ceirgoClient');

const ceirgoRoutes = express.Router();

let dbAll, isAuthenticated, isAdmin;

function setDependencies(deps) {
    ({ dbAll, isAuthenticated, isAdmin } = deps);
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
    return payload?.data?.page?.items || payload?.data?.items || payload?.data || [];
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
            const ceirgoRes = await ceirgoClient.getServices({ limit: 50 });
            if (!ceirgoRes.status) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const services = normalizeServices(ceirgoRes);
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

    // Admin endpoint with full service details (input_schema, result_schema, unit_price, min_items, max_items)
    ceirgoRoutes.get('/admin/ceirgo-services', isAuthenticated, isAdmin, async (req, res) => {
        try {
            const ceirgoRes = await ceirgoClient.getServices({ limit: 50 });
            if (!ceirgoRes.status) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const services = normalizeServices(ceirgoRes);
            if (!Array.isArray(services) || services.length === 0) {
                return res.json({ status: true, data: DEFAULT_FALLBACK_SERVICES, fallback: true });
            }

            const detailedServices = await Promise.all(
                services.map(async (svc) => {
                    if (!svc?.code) return null;
                    try {
                        const detailRes = await ceirgoClient.getServiceDetail(svc.code);
                        let detail = detailRes.status ? detailRes.data : null;
                        const modalPrice = readModalPrice(detail, svc);

                        return {
                            code: svc.code,
                            name: svc.name,
                            description: svc.description || detail?.description || '',
                            modalPrice,
                            unit_price: modalPrice,
                            input_schema: detail?.input_schema || svc.input_schema || null,
                            result_schema: detail?.result_schema || svc.result_schema || null,
                            min_items: detail?.min_items || svc.min_items || 1,
                            max_items: detail?.max_items || svc.max_items || 1
                        };
                    } catch (e) {
                        return {
                            code: svc.code,
                            name: svc.name,
                            modalPrice: readModalPrice(null, svc),
                            unit_price: readModalPrice(null, svc)
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
