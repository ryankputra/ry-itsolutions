const fetch = globalThis.fetch || require('node-fetch');

const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.id';
console.log(`[CEIRGO_INIT] API Key Loaded: ${process.env.CEIRGO_API_KEY ? 'YES' : 'NO'}`);

/**
 * Standard HTTP request wrapper for CeirGO Official API
 * Enforces headers:
 * - Authorization: Bearer <CEIRGO_API_KEY>
 * - Accept: application/json
 * - Content-Type: application/json (for POST/PUT)
 */
async function ceirgoRequest(endpoint, options = {}) {
    const apiKey = process.env.CEIRGO_API_KEY;
    const baseUrl = process.env.CEIRGO_BASE_URL || CEIRGO_BASE_URL;
    const accountId = process.env.CEIRGO_ACCOUNT_ID || '';

    if (!apiKey) {
        console.warn('[CeirGO Warning] CEIRGO_API_KEY belum dikonfigurasi di environment.');
        return {
            status: false,
            fallback: true,
            message: 'CEIRGO_API_KEY belum dikonfigurasi.'
        };
    }

    const method = (options.method || 'GET').toUpperCase();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        ...(options.headers || {})
    };

    if (accountId && !headers['x-account-id']) {
        headers['x-account-id'] = accountId;
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
        method,
        headers
    };

    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        fetchOptions.signal = AbortSignal.timeout(options.timeout || 15000);
    } else {
        fetchOptions.timeout = options.timeout || 15000;
    }

    if (options.body) {
        fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        let data = {};

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { raw: text };
            }
        }

        if (!response.ok) {
            const errMsg = data.message || data.error || `HTTP ${response.status} ${response.statusText}`;
            return {
                status: false,
                statusCode: response.status,
                message: errMsg,
                data: null,
                raw: data,
                fullResponse: data
            };
        }

        // Return standardized object
        return {
            status: true,
            statusCode: response.status,
            data: data.data || data,
            fullResponse: data,
            raw: data
        };
    } catch (err) {
        console.error(`[CeirGO Connection Error] Gagal menghubungi ${url}:`, err.message);
        return {
            status: false,
            statusCode: 500,
            error: err.name,
            message: err.message,
            fallback: true
        };
    }
}

/**
 * 1. Account & Profile Verification & Real-time Balance
 * Logic:
 * 1. HEALTH CHECK: Call GET https://ceirgo.id/api/me. If HTTP 200, mark connected = true.
 * 2. REAL-TIME BALANCE: Fetch remaining_balance from latest order via GET https://ceirgo.id/api/order?limit=1.
 * 3. CACHE FALLBACK: If order does not return balance, read from SQLite settings.lastCeirgoBalance.
 */
async function getProfile() {
    // 1. HEALTH CHECK via GET /api/me
    const res = await ceirgoRequest('/api/me');
    console.log("[CEIRGO_ME_DEBUG] Response from /api/me:", JSON.stringify(res.fullResponse || res.data || res));

    let detectedBalance = null;
    let meData = {};
    const isConnected = Boolean(res.status && res.statusCode === 200);

    if (isConnected) {
        meData = res.data || {};
        const candidates = [
            meData.remaining_balance,
            meData.balance,
            meData.wallet_balance,
            meData.saldo,
            meData.wallet?.remaining_balance,
            meData.wallet?.balance,
            meData.user?.remaining_balance,
            meData.user?.balance
        ];
        for (const val of candidates) {
            const num = Number(val);
            if (val != null && !isNaN(num) && num >= 0) {
                detectedBalance = num;
                break;
            }
        }
    } else {
        if (res.statusCode === 401) {
            console.error(`[CEIRGO_AUTH_ERROR_401] Unauthorized / Invalid API Key at /api/me: ${JSON.stringify(res.raw || res.message)}`);
        } else if (res.statusCode === 403) {
            console.error(`[CEIRGO_FORBIDDEN_ERROR_403] Forbidden / Missing Permission at /api/me: ${JSON.stringify(res.raw || res.message)}`);
        }
    }

    // 2. RETRIEVAL SALDO REAL-TIME via GET /api/order?limit=1
    if (detectedBalance == null) {
        try {
            const ordersRes = await ceirgoRequest('/api/order?limit=1');
            console.log("[CEIRGO_ORDERS_BALANCE_DEBUG]", JSON.stringify(ordersRes));
            if (ordersRes.status && ordersRes.data) {
                const items = Array.isArray(ordersRes.data)
                    ? ordersRes.data
                    : (ordersRes.data.page?.items || ordersRes.data.items || ordersRes.data.data || []);
                const latestOrder = items[0] || ordersRes.data;
                const cand = [
                    latestOrder?.remaining_balance,
                    latestOrder?.remainingBalance,
                    latestOrder?.balance,
                    latestOrder?.saldo
                ];
                for (const c of cand) {
                    const num = Number(c);
                    if (c != null && !isNaN(num) && num >= 0) {
                        detectedBalance = num;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn("[CEIRGO_ORDER_FETCH_WARN] Gagal fetch order untuk remaining_balance:", e.message);
        }
    }

    // 3. CACHE FALLBACK (SQLite settings.lastCeirgoBalance)
    let isFromCache = false;
    if (detectedBalance != null) {
        // Live balance found, persist to SQLite
        try {
            const { dbRun } = require('./config/db');
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(detectedBalance)]);
        } catch (e) {}
    } else {
        // Fallback to SQLite settings.lastCeirgoBalance
        try {
            const { dbGet } = require('./config/db');
            const cachedRow = await dbGet("SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1");
            if (cachedRow && cachedRow.value != null) {
                const cachedNum = Number(cachedRow.value);
                if (!isNaN(cachedNum) && cachedNum >= 0) {
                    detectedBalance = cachedNum;
                    isFromCache = true;
                }
            }
        } catch (e) {}
    }

    const finalBalance = detectedBalance != null ? detectedBalance : 0;

    return {
        status: isConnected,
        connected: isConnected,
        statusCode: res.statusCode || (isConnected ? 200 : 500),
        balance: finalBalance,
        ceirgoBalance: finalBalance,
        hasLiveBalance: detectedBalance != null && !isFromCache,
        isFromCache,
        role: meData.role || meData.roles || 'user',
        permissions: meData.permissions || [],
        profile: meData,
        message: isConnected ? 'Terkoneksi ke Server Pusat CeirGO' : (res.message || 'Gagal terhubung ke API CeirGO'),
        raw: res.fullResponse
    };
}

/**
 * 2. Deposit API (GET /api/deposit/provider)
 * Lists active deposit providers.
 */
async function getDepositProviders() {
    let res = await ceirgoRequest('/api/deposit/provider');
    if (res.status && Array.isArray(res.data)) {
        return res;
    }
    // Fallback to plural /api/deposit/providers if standard single route returns 404
    const altRes = await ceirgoRequest('/api/deposit/providers');
    if (altRes.status) return altRes;

    return res;
}

/**
 * 2.1 Provider Detail (GET /api/deposit/provider/{code})
 * Fetches limits, fees, and instructions for a specific provider.
 */
async function getDepositProviderDetail(providerCode) {
    if (!providerCode) throw new Error("Provider code diperlukan.");
    return await ceirgoRequest(`/api/deposit/provider/${encodeURIComponent(providerCode)}`);
}

/**
 * 2.2 Create Deposit (POST /api/deposit)
 * Payload: { "amount": number, "provider_code": string }
 * Returns: amounts.total_pay (total tagihan bayar mutlak), qr_string, qr_url
 */
async function createDeposit({ amount, provider_code, providerCode }) {
    const code = provider_code || providerCode;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Nominal deposit tidak valid.");
    }
    if (!code) {
        throw new Error("Kode provider deposit diperlukan.");
    }

    const payload = {
        amount: numAmount,
        provider_code: code
    };

    const res = await ceirgoRequest('/api/deposit', {
        method: 'POST',
        body: payload
    });

    if (res.status && res.data) {
        const d = res.data;
        // Parse amounts.total_pay, qr_string, qr_url
        const totalPay = Number(
            d.amounts?.total_pay ??
            d.total_pay ??
            d.amount ??
            numAmount
        );
        const qrString = d.qr_string || d.qr_code || d.qr || '';
        const qrUrl = d.qr_url || d.qris_url || d.qr_image || '';
        const depositId = d.id || d.deposit_id || d.trx_id || `DEP_${Date.now()}`;
        const depositStatus = (d.status || 'pending').toLowerCase();

        return {
            status: true,
            data: {
                ...d,
                id: depositId,
                deposit_id: depositId,
                total_pay: totalPay,
                totalPay,
                qr_string: qrString,
                qr_url: qrUrl,
                status: depositStatus
            },
            fullResponse: res.fullResponse
        };
    }

    return res;
}

/**
 * 2.3 List Deposits (GET /api/deposit)
 */
async function getDeposits(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/deposit${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 2.4 Deposit Detail (GET /api/deposit/{deposit_id})
 * Status: pending, processing, succeeded, failed, cancelled, expired
 */
async function getDepositDetail(depositId) {
    if (!depositId) throw new Error("Deposit ID diperlukan.");
    return await ceirgoRequest(`/api/deposit/${encodeURIComponent(depositId)}`);
}

/**
 * 3. Services API (GET /api/services)
 */
async function getServices(params = { limit: 50 }) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/services${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 3.1 Service Detail (GET /api/services/{idOrCode})
 * Reads input_schema, result_schema, unit_price, min_items, max_items
 */
async function getServiceDetail(idOrCode) {
    if (!idOrCode) throw new Error("ID atau Kode layanan diperlukan.");
    return await ceirgoRequest(`/api/services/${encodeURIComponent(idOrCode)}`);
}

/**
 * 4. Orders API (POST /api/order)
 * Official payload structure:
 * {
 *   "code": "<service_code>", // e.g. "cek_imei", "cek_history_imei"
 *   "data": {
 *     "imeis": ["<15_digit_imei>"]
 *   }
 * }
 * Response captures: reference_id, remaining_balance, charged_amount, result
 */
async function createOrder({ code, data, imeis }) {
    if (!code) throw new Error("Kode layanan CeirGO (code) diperlukan.");

    let targetImeis = [];
    if (Array.isArray(data?.imeis)) {
        targetImeis = data.imeis;
    } else if (Array.isArray(imeis)) {
        targetImeis = imeis;
    } else if (typeof data === 'string') {
        targetImeis = [data.trim()];
    } else if (typeof data?.imei === 'string') {
        targetImeis = [data.imei.trim()];
    }

    if (targetImeis.length === 0) {
        throw new Error("Daftar IMEI (data.imeis) wajib disertakan.");
    }

    const payload = {
        code,
        data: {
            imeis: targetImeis
        }
    };

    const res = await ceirgoRequest('/api/order', {
        method: 'POST',
        body: payload
    });

    if (res.status && res.data) {
        const d = res.data;
        const referenceId = d.reference_id || d.order_id || d.trx_id || `REF_${Date.now()}`;
        const remainingBalance = d.remaining_balance ?? d.balance ?? d.remainingBalance ?? null;
        const chargedAmount = d.charged_amount ?? d.price ?? d.amount ?? 0;
        const result = d.result ?? d.history ?? d;

        // Auto-sync remaining_balance to database settings if returned
        if (remainingBalance != null && !isNaN(Number(remainingBalance))) {
            try {
                const { dbRun } = require('./config/db');
                dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(Number(remainingBalance))]).catch(() => {});
                console.log("[CEIRGO_ORDER_SYNC] Updated settings.lastCeirgoBalance from order:", Number(remainingBalance));
            } catch (e) {}
        }

        return {
            status: true,
            data: {
                ...d,
                reference_id: referenceId,
                remaining_balance: remainingBalance,
                charged_amount: chargedAmount,
                result
            },
            fullResponse: res.fullResponse
        };
    }

    return res;
}

/**
 * 4.1 List Orders (GET /api/order)
 * Filters: status (draft, awaiting_payment, paid, processing, completed, partial, cancelled, refunded), date range
 */
async function getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/order${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 4.2 Order Detail (GET /api/order/{idOrRef})
 */
async function getOrderDetail(idOrRef) {
    if (!idOrRef) throw new Error("ID Order / Reference ID diperlukan.");

    // Try path-based detail
    const res = await ceirgoRequest(`/api/order/${encodeURIComponent(idOrRef)}`);
    if (res.status) return res;

    // Fallback to query param
    return await ceirgoRequest(`/api/order?trx_id=${encodeURIComponent(idOrRef)}`);
}

module.exports = {
    ceirgoRequest,
    getProfile,
    getDepositProviders,
    getDepositProviderDetail,
    createDeposit,
    getDeposits,
    getDepositDetail,
    getServices,
    getServiceDetail,
    createOrder,
    getOrders,
    getOrderDetail
};
