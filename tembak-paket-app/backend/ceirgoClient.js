const fetch = require('node-fetch');

const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.my.id';

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
        headers,
        timeout: options.timeout || 12000
    };

    if (options.body) {
        fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, fetchOptions);

        if (response.status === 401) {
            console.error(`[CeirGO Auth Error 401] Unauthorized / Invalid or expired API Key at ${url}`);
            const errData = await response.json().catch(() => null);
            return {
                status: false,
                statusCode: 401,
                error: 'Unauthorized',
                message: errData?.message || 'API Key CeirGO tidak valid atau telah kadaluarsa.',
                raw: errData
            };
        }

        if (response.status === 403) {
            console.error(`[CeirGO Forbidden Error 403] Forbidden / Missing Permission for ${url}`);
            const errData = await response.json().catch(() => null);
            return {
                status: false,
                statusCode: 403,
                error: 'Forbidden',
                message: errData?.message || 'Akun CeirGO tidak memiliki izin (permission) untuk mengakses fitur ini.',
                raw: errData
            };
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const errorMsg = data?.message || data?.error || `HTTP ${response.status}`;
            console.warn(`[CeirGO API Warning] Request to ${url} returned ${response.status}: ${errorMsg}`);
            return {
                status: false,
                statusCode: response.status,
                message: errorMsg,
                data
            };
        }

        return {
            status: true,
            statusCode: response.status,
            data: data?.data !== undefined ? data.data : data,
            fullResponse: data
        };
    } catch (err) {
        console.error(`[CeirGO Connection Error] Gagal menghubungi ${url}:`, err.message);
        return {
            status: false,
            error: err.name || 'NetworkError',
            message: err.message,
            fallback: true
        };
    }
}

/**
 * 1. Account & Profile Verification (GET /api/me)
 * Checks profile, RBAC roles, permissions, and central wallet balance.
 * Implements fallback ledger discovery (/api/wallet/balance, /api/balance, /api/wallet, /api/order)
 */
async function getProfile() {
    const res = await ceirgoRequest('/api/me');
    console.log("[CEIRGO_ME_DEBUG] Response from /api/me:", JSON.stringify(res.fullResponse || res.data || res));

    let detectedBalance = null;
    let meData = {};

    if (res.status) {
        meData = res.data || {};
        const candidates = [
            meData.balance,
            meData.remaining_balance,
            meData.wallet_balance,
            meData.saldo,
            meData.credit,
            meData.credits,
            meData.wallet?.balance,
            meData.wallet?.remaining_balance,
            meData.wallet?.saldo,
            meData.account?.balance,
            meData.account?.remaining_balance,
            meData.user?.balance,
            meData.user?.remaining_balance,
            meData.user?.saldo
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
            console.error(`[CEIRGO_AUTH_ERROR_401] Unauthorized / Invalid or expired API Key at /api/me: ${JSON.stringify(res.raw || res.message)}`);
        } else if (res.statusCode === 403) {
            console.error(`[CEIRGO_FORBIDDEN_ERROR_403] Forbidden / Missing Permission at /api/me: ${JSON.stringify(res.raw || res.message)}`);
        }
    }

    // If balance is still not found in /api/me, query dedicated ledger & wallet endpoints
    if (detectedBalance == null) {
        // Try /api/wallet/balance
        try {
            const wbRes = await ceirgoRequest('/api/wallet/balance');
            console.log("[CEIRGO_WALLET_BALANCE_DEBUG]", JSON.stringify(wbRes));
            if (wbRes.status && wbRes.data) {
                const b = Number(wbRes.data.balance ?? wbRes.data.remaining_balance ?? wbRes.data.saldo ?? wbRes.data);
                if (!isNaN(b) && b >= 0) detectedBalance = b;
            }
        } catch (e) {}
    }

    if (detectedBalance == null) {
        // Try /api/balance
        try {
            const bRes = await ceirgoRequest('/api/balance');
            console.log("[CEIRGO_BALANCE_DEBUG]", JSON.stringify(bRes));
            if (bRes.status && bRes.data) {
                const b = Number(bRes.data.balance ?? bRes.data.remaining_balance ?? bRes.data.saldo ?? bRes.data);
                if (!isNaN(b) && b >= 0) detectedBalance = b;
            }
        } catch (e) {}
    }

    if (detectedBalance == null) {
        // Try /api/wallet
        try {
            const wRes = await ceirgoRequest('/api/wallet');
            console.log("[CEIRGO_WALLET_DEBUG]", JSON.stringify(wRes));
            if (wRes.status && wRes.data) {
                const b = Number(wRes.data.balance ?? wRes.data.remaining_balance ?? wRes.data.saldo ?? wRes.data);
                if (!isNaN(b) && b >= 0) detectedBalance = b;
            }
        } catch (e) {}
    }

    if (detectedBalance == null) {
        // Try fetching latest order which always returns remaining_balance in CeirGO Orders API
        try {
            const ordersRes = await ceirgoRequest('/api/order?limit=1');
            console.log("[CEIRGO_ORDERS_BALANCE_DEBUG]", JSON.stringify(ordersRes));
            if (ordersRes.status && ordersRes.data) {
                const items = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.items || ordersRes.data.data || []);
                const latestOrder = items[0] || ordersRes.data;
                const b = Number(latestOrder.remaining_balance ?? latestOrder.balance ?? null);
                if (!isNaN(b) && b >= 0) detectedBalance = b;
            }
        } catch (e) {}
    }

    const finalBalance = detectedBalance != null ? detectedBalance : 0;

    return {
        status: res.status || detectedBalance != null,
        statusCode: res.statusCode,
        balance: finalBalance,
        ceirgoBalance: finalBalance,
        hasLiveBalance: detectedBalance != null,
        role: meData.role || meData.roles || 'user',
        permissions: meData.permissions || [],
        profile: meData,
        message: res.message,
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
        const remainingBalance = d.remaining_balance ?? d.balance ?? null;
        const chargedAmount = d.charged_amount ?? d.price ?? d.amount ?? 0;
        const result = d.result ?? d.history ?? d;

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
