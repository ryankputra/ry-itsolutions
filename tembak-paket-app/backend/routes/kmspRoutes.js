const express = require('express');
const axios = require('axios');

const kmspRoutes = express.Router();

let dbGet = null;
let isAuthenticated = null;
let isAdmin = null;

const cache = new Map();

function setCache(key, value, ttlMs) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setDependencies(deps = {}) {
    dbGet = deps.dbGet || null;
    isAuthenticated = deps.isAuthenticated || null;
    isAdmin = deps.isAdmin || null;
}

function ensureAuth(req, res, next) {
    if (typeof isAuthenticated !== 'function') {
        return res.status(500).json({ status: false, message: 'Middleware autentikasi belum di-inject.' });
    }
    return isAuthenticated(req, res, next);
}

function ensureAdmin(req, res, next) {
    if (typeof isAdmin !== 'function') {
        return res.status(500).json({ status: false, message: 'Middleware admin belum di-inject.' });
    }
    return isAdmin(req, res, next);
}

async function getKmspConfig() {
    if (typeof dbGet !== 'function') {
        throw new Error('dbGet belum di-inject ke kmspRoutes.');
    }

    const [apiUrlRow, apiKeyRow] = await Promise.all([
        dbGet("SELECT value FROM settings WHERE key = 'kmsp_api_url'"),
        dbGet("SELECT value FROM settings WHERE key = 'kmsp_api_key'")
    ]);

    return {
        apiUrl: apiUrlRow ? apiUrlRow.value : null,
        apiKey: apiKeyRow ? apiKeyRow.value : null,
    };
}

async function requestKmsp(cmd, extra = {}, timeout = 8000) {
    const kmspConfig = await getKmspConfig();
    if (!kmspConfig.apiUrl || !kmspConfig.apiKey) {
        return { status: false, message: 'KMSP API config not found.' };
    }

    return axios.post(kmspConfig.apiUrl, {
        cmd,
        key: kmspConfig.apiKey,
        ...extra,
    }, { timeout });
}

kmspRoutes.get('/kmsp-balance', ensureAuth, async (req, res) => {
    try {
        const response = await requestKmsp('balance', {}, 8000);
        if (response.data && response.data.status && typeof response.data.data?.balance !== 'undefined') {
            return res.json({ status: true, balance: Number(response.data.data.balance) });
        }

        return res.status(502).json({
            status: false,
            message: response.data?.message || 'Gagal mengambil saldo KMSP.',
            balance: null,
        });
    } catch (error) {
        console.error('[KMSP ERROR] Gagal mengambil saldo KMSP:', error.message);
        return res.status(500).json({ status: false, message: 'Gagal mengambil saldo KMSP karena kesalahan server.', balance: null });
    }
});

kmspRoutes.get('/admin/kmsp-balance', ensureAuth, ensureAdmin, async (req, res) => {
    try {
        const response = await requestKmsp('balance', {}, 8000);
        if (response.data && response.data.status && typeof response.data.data?.balance !== 'undefined') {
            return res.json({ status: true, data: { balance: Number(response.data.data.balance) } });
        }

        return res.status(502).json({ status: false, message: response.data?.message || 'Gagal terhubung ke KMSP.', data: null });
    } catch (error) {
        console.error('[KMSP ERROR] Gagal mengambil saldo admin KMSP:', error.message);
        return res.status(500).json({ status: false, message: 'Gagal terhubung ke KMSP.', data: null });
    }
});

kmspRoutes.get('/kmsp-pricelist', ensureAuth, async (req, res) => {
    try {
        const cachedPricelist = getCache('kmspPricelist');
        if (cachedPricelist !== null) {
            return res.json({ status: true, data: cachedPricelist });
        }

        const response = await requestKmsp('services', {}, 15000);
        if (response.data && response.data.status) {
            const pricelist = response.data.data;
            setCache('kmspPricelist', pricelist, 3600000);
            return res.json({ status: true, data: pricelist });
        }

        return res.json({ status: false, message: response.data?.message || 'Gagal mengambil pricelist KMSP.' });
    } catch (error) {
        console.error('[KMSP ERROR] Gagal mengambil pricelist KMSP:', error.message);
        return res.status(500).json({ status: false, message: 'Gagal mengambil pricelist KMSP karena kesalahan server.' });
    }
});

kmspRoutes.post('/kmsp-order', ensureAuth, async (req, res) => {
    const { service_id, target, amount } = req.body;
    if (!service_id || !target || !amount) {
        return res.status(400).json({ status: false, message: 'Service ID, target, dan amount diperlukan.' });
    }

    try {
        const response = await requestKmsp('order', {
            service: service_id,
            target,
            quantity: amount,
        }, 10000);

        if (response.data && response.data.status) {
            return res.json({ status: true, data: response.data.data });
        }

        return res.json({ status: false, message: response.data?.message || 'Gagal membuat pesanan KMSP.' });
    } catch (error) {
        console.error('[KMSP ERROR] Gagal membuat pesanan KMSP:', error.message);
        return res.status(500).json({ status: false, message: 'Gagal membuat pesanan KMSP karena kesalahan server.' });
    }
});

kmspRoutes.post('/kmsp-status', ensureAuth, async (req, res) => {
    const { trx_id } = req.body;
    if (!trx_id) {
        return res.status(400).json({ status: false, message: 'Transaction ID diperlukan.' });
    }

    try {
        const response = await requestKmsp('status', { trxid: trx_id }, 8000);
        if (response.data && response.data.status) {
            return res.json({ status: true, data: response.data.data });
        }

        return res.json({ status: false, message: response.data?.message || 'Gagal mengambil status pesanan KMSP.' });
    } catch (error) {
        console.error('[KMSP ERROR] Gagal mengambil status pesanan KMSP:', error.message);
        return res.status(500).json({ status: false, message: 'Gagal mengambil status pesanan KMSP karena kesalahan server.' });
    }
});

module.exports = { kmspRoutes, setDependencies };
