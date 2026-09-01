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

function initCeirgoRoutes() {
    // ponytail: /manual-services-pricing moved to server.js (returns all keys including imei_speed_*)

    // Public list for user pages (filtered client-side by display settings)
    ceirgoRoutes.get('/ceirgo-services', async (req, res) => {
        try {
            if (!CEIRGO_API_KEY) {
                return res.status(500).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi.' });
            }

            const ceirgoRes = await fetch(`${CEIRGO_BASE_URL}/api/services?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!ceirgoRes.ok) {
                const errorText = await ceirgoRes.text();
                throw new Error(`CeirGO API responded with status ${ceirgoRes.status}: ${errorText}`);
            }

            const servicesPayload = await ceirgoRes.json();
            const services = normalizeServices(servicesPayload);

            res.json({ status: true, data: services });
        } catch (error) {
            console.error("[API] Error fetching public CeirGO services:", error.message);
            res.status(500).json({ status: false, message: 'Gagal mengambil daftar layanan CeirGO.' });
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
                return res.status(500).json({ status: false, message: 'CEIRGO_API_KEY tidak dikonfigurasi.' });
            }

            const ceirgoRes = await fetch(`${CEIRGO_BASE_URL}/api/services?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!ceirgoRes.ok) {
                const errorText = await ceirgoRes.text();
                throw new Error(`CeirGO API responded with status ${ceirgoRes.status}: ${errorText}`);
            }

            const servicesPayload = await ceirgoRes.json();
            const services = normalizeServices(servicesPayload);
            const detailedServices = await Promise.all(
                services.map(async (svc) => {
                    if (!svc?.code) return null;
                    try {
                        const detailRes = await fetch(`${CEIRGO_BASE_URL}/api/services/${svc.code}`, {
                            headers: {
                                'Authorization': `Bearer ${CEIRGO_API_KEY}`,
                                'Accept': 'application/json'
                            },
                            timeout: 8000
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
            console.error("[API] Error fetching admin CeirGO services:", error.message);
            res.status(500).json({ status: false, message: 'Gagal mengambil daftar layanan CeirGO untuk admin.' });
        }
    });
}

module.exports = { ceirgoRoutes, setDependencies, initCeirgoRoutes };
