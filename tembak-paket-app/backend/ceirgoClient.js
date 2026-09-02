/**
 * Official CeirGO API Client Implementation
 * Strictly verified and compliant with CeirGO API Documentation (https://ceirgo.id/docs)
 * Audit Reference: backend/ceirgo_api_map.json
 */

const fetch = globalThis.fetch || require('node-fetch');
const crypto = require('crypto');

const CEIRGO_BASE_URL = process.env.CEIRGO_BASE_URL || 'https://ceirgo.id';
console.log(`[CEIRGO_INIT] API Key Loaded: ${process.env.CEIRGO_API_KEY ? 'YES' : 'NO'} | Base URL: ${CEIRGO_BASE_URL}`);

/**
 * Standard HTTP request wrapper for CeirGO Official API
 * Official doc: https://ceirgo.id/docs/references/request-format
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
            data: data.data !== undefined ? data.data : data,
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
 * 1. Account & Profile Verification (GET /api/me)
 * Official doc: https://ceirgo.id/docs/authentication/verify-access
 * Permission: user.me.read
 * Returns profile, roles, permissions, and combines with live wallet balance from GET /api/wallet/snap.
 */
async function getProfile() {
    const meRes = await ceirgoRequest('/api/me');
    console.log("[CEIRGO_ME_DEBUG] Response from /api/me:", JSON.stringify(meRes.fullResponse || meRes.data || meRes));

    const isConnected = Boolean(meRes.status && meRes.statusCode === 200);
    let liveBalance = null;
    let reserved = 0;
    let walletId = null;

    if (isConnected) {
        // Query official wallet balance endpoint
        const wbRes = await getWalletBalance().catch(() => null);
        if (wbRes && wbRes.status && typeof wbRes.balance === 'number') {
            liveBalance = wbRes.balance;
            reserved = wbRes.reserved;
            walletId = wbRes.wallet_id;
        }
    }

    // Fallback to SQLite settings.lastCeirgoBalance if live balance is unavailable
    let finalBalance = liveBalance;
    let isFromCache = false;

    if (finalBalance == null) {
        try {
            const { dbGet } = require('./config/db');
            const cachedRow = await dbGet("SELECT value FROM settings WHERE key IN ('lastCeirgoBalance', 'ceirgo_balance', 'ceirgoBalance') AND value IS NOT NULL AND value != '' ORDER BY ROWID DESC LIMIT 1");
            if (cachedRow && cachedRow.value != null) {
                const num = Number(cachedRow.value);
                if (!isNaN(num) && num >= 0) {
                    finalBalance = num;
                    isFromCache = true;
                }
            }
        } catch (e) {}
    }

    const meData = meRes.data || {};
    const balNum = finalBalance != null ? finalBalance : 0;

    return {
        status: isConnected,
        connected: isConnected,
        statusCode: meRes.statusCode || (isConnected ? 200 : 500),
        balance: balNum,
        ceirgoBalance: balNum,
        reserved,
        wallet_id: walletId,
        hasLiveBalance: liveBalance != null,
        isFromCache,
        role: meData.role || meData.roles || 'user',
        permissions: meData.permissions || [],
        profile: meData,
        message: isConnected ? 'Terkoneksi ke Server Pusat CeirGO' : (meRes.message || 'Gagal terhubung ke API CeirGO'),
        raw: meRes.fullResponse
    };
}

/**
 * 1.1 Wallet Balance (GET /api/wallet/snap)
 * Official doc: https://ceirgo.id/docs/transactions/wallet-balance
 * Permission: wallet.balance.read
 * Returns: { balance: number, reserved: number, wallet_id: number }
 */
async function getWalletBalance() {
    const res = await ceirgoRequest('/api/wallet/snap');
    if (res.status && res.data) {
        const bal = Number(res.data.balance ?? res.data.wallet_balance ?? 0);
        const reserved = Number(res.data.reserved ?? 0);
        const walletId = res.data.wallet_id ?? null;

        // Auto-update SQLite cache
        if (!isNaN(bal) && bal >= 0) {
            try {
                const { dbRun } = require('./config/db');
                dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastCeirgoBalance', ?)", [String(bal)]).catch(() => {});
            } catch (e) {}
        }

        return {
            status: true,
            balance: bal,
            ceirgoBalance: bal,
            reserved,
            wallet_id: walletId,
            data: res.data
        };
    }
    return res;
}

/**
 * 2.1 List Deposit Providers (GET /api/deposit/provider)
 * Official doc: https://ceirgo.id/docs/deposits/providers
 * Permission: deposit.provider.list
 */
async function getDepositProviders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/deposit/provider${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 2.2 Deposit Provider Detail (GET /api/deposit/provider/{code})
 * Official doc: https://ceirgo.id/docs/deposits/provider-detail
 * Permission: deposit.provider.list
 */
async function getDepositProviderDetail(providerCode) {
    if (!providerCode) throw new Error("Provider code diperlukan.");
    return await ceirgoRequest(`/api/deposit/provider/${encodeURIComponent(providerCode)}`);
}

/**
 * 2.3 Create Deposit (POST /api/deposit)
 * Official doc: https://ceirgo.id/docs/deposits/create-deposit
 * Permission: deposit.create
 * Payload: { "amount": number, "provider_code": string }
 * Returns: amounts.total_pay, qr_string, qr_url, expires_at
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
 * 2.4 List Deposits (GET /api/deposit)
 * Official doc: https://ceirgo.id/docs/deposits/list-deposits
 * Permission: deposit.read
 */
async function getDeposits(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/deposit${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 2.5 Deposit Detail (GET /api/deposit/{deposit_id})
 * Official doc: https://ceirgo.id/docs/deposits/deposit-detail
 * Permission: deposit.read
 */
async function getDepositDetail(depositId) {
    if (!depositId) throw new Error("Deposit ID diperlukan.");
    return await ceirgoRequest(`/api/deposit/${encodeURIComponent(depositId)}`);
}

/**
 * 3.1 List Services (GET /api/services)
 * Official doc: https://ceirgo.id/docs/orders/services
 * Permission: service.list
 */
async function getServices(params = { limit: 50 }) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/services${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 3.2 Service Detail (GET /api/services/{idOrCode})
 * Official doc: https://ceirgo.id/docs/orders/service-detail
 * Permission: service.read_detail
 */
async function getServiceDetail(idOrCode) {
    if (!idOrCode) throw new Error("ID atau Kode layanan diperlukan.");
    return await ceirgoRequest(`/api/services/${encodeURIComponent(idOrCode)}`);
}

/**
 * 4.1 Create Order (POST /api/order)
 * Official doc: https://ceirgo.id/docs/orders/create-order
 * Permission: order.create
 * Payload: { "code": string, "data": { "imeis": string[] } }
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
 * 4.2 List Orders (GET /api/order)
 * Official doc: https://ceirgo.id/docs/orders/list-orders
 * Permission: order.list
 */
async function getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/order${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 4.3 Order Detail & Status (GET /api/order/{id})
 * Official doc: https://ceirgo.id/docs/orders/order-detail and https://ceirgo.id/docs/orders/order-status
 * Permission: order.read
 */
async function getOrderDetail(idOrRef) {
    if (!idOrRef) throw new Error("ID Order / Reference ID diperlukan.");

    const res = await ceirgoRequest(`/api/order/${encodeURIComponent(idOrRef)}`);
    if (res.status) return res;

    return await ceirgoRequest(`/api/order?trx_id=${encodeURIComponent(idOrRef)}`);
}

/**
 * 4.4 Check Order Status (Alias for getOrderDetail)
 * Official doc: https://ceirgo.id/docs/orders/order-status
 * Permission: order.read
 */
async function getOrderStatus(idOrRef) {
    return await getOrderDetail(idOrRef);
}

/**
 * 5.1 List Transactions (GET /api/transactions)
 * Official doc: https://ceirgo.id/docs/transactions/list-transactions
 * Permission: transaction.read
 */
async function getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/transactions${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 5.2 Transaction Detail (GET /api/transactions/{id})
 * Official doc: https://ceirgo.id/docs/transactions/transaction-detail
 * Permission: transaction.read
 */
async function getTransactionDetail(id) {
    if (!id) throw new Error("Transaction ID diperlukan.");
    return await ceirgoRequest(`/api/transactions/${encodeURIComponent(id)}`);
}

/**
 * 5.3 List Wallet Mutations (GET /api/mutation)
 * Official doc: https://ceirgo.id/docs/transactions/list-mutations
 * Permission: wallet.ledger.read
 */
async function getWalletMutations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/mutation${queryString ? `?${queryString}` : ''}`;
    return await ceirgoRequest(endpoint);
}

/**
 * 5.4 Wallet Mutation Detail (GET /api/mutation/{id})
 * Official doc: https://ceirgo.id/docs/transactions/mutation-detail
 * Permission: wallet.ledger.read
 */
async function getWalletMutationDetail(id) {
    if (!id) throw new Error("Mutation ID diperlukan.");
    return await ceirgoRequest(`/api/mutation/${encodeURIComponent(id)}`);
}

/**
 * 6.1 Create Transfer (POST /api/transfer)
 * Official doc: https://ceirgo.id/docs/transfers/create-transfer
 * Permission: transfer.create
 */
async function createTransfer({ receiver, amount, description, idempotencyKey }) {
    if (!receiver || !amount) throw new Error("Receiver user ID dan nominal transfer wajib disertakan.");
    const headers = {};
    if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
    }
    return await ceirgoRequest('/api/transfer', {
        method: 'POST',
        headers,
        body: {
            receiver: Number(receiver),
            amount: Number(amount),
            description: description || ''
        }
    });
}

/**
 * 6.2 Transfer Detail (GET /api/transfer/{id})
 * Official doc: https://ceirgo.id/docs/transfers/transfer-detail
 * Permission: transfer.read
 */
async function getTransferDetail(id) {
    if (!id) throw new Error("Transfer ID diperlukan.");
    return await ceirgoRequest(`/api/transfer/${encodeURIComponent(id)}`);
}

/**
 * 7. Webhook Signature Verification
 * Official doc: https://ceirgo.id/docs/webhooks/order-webhooks
 * Formula: HMAC_SHA256(JSON.stringify({ orderId, amount }), api_key_secret)
 * Uses timing-safe equality comparison.
 */
function verifyWebhookSignature({ payload, signature, secret }) {
    if (!signature || !payload) return false;

    const hmacKey = secret || 
        process.env.CEIRGO_API_KEY_SECRET || 
        (process.env.CEIRGO_API_KEY && process.env.CEIRGO_API_KEY.includes('.') ? process.env.CEIRGO_API_KEY.split('.')[1] : process.env.CEIRGO_API_KEY) || 
        '';

    if (!hmacKey) {
        console.warn('[CeirGO Webhook] Tidak dapat memverifikasi signature: secret belum dikonfigurasi.');
        return false;
    }

    const status = payload.status || '';
    const amount = status === 'pending'
        ? String(payload.total_price ?? payload.total ?? 0)
        : (status === 'failed' || status === 'cancelled')
            ? '0'
            : String(payload.charged_amount ?? payload.amount ?? 0);

    const orderId = Number(payload.order_id || payload.id);
    const signed = JSON.stringify({ orderId, amount });
    const expected = crypto.createHmac('sha256', hmacKey).update(signed).digest('hex');

    try {
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch (e) {
        return false;
    }
}

/**
 * Robust JSON & Legacy History Parser for CEIR IMEI results
 */
function parseCeirHistory(rawResponse) {
    if (!rawResponse) return [];

    let parsed = rawResponse;
    if (typeof rawResponse === 'string') {
        try {
            parsed = JSON.parse(rawResponse);
        } catch (e) {
            parsed = null;
        }
    }

    if (parsed) {
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]?.history)) {
            return parsed[0].history;
        }
        if (parsed.result && Array.isArray(parsed.result) && Array.isArray(parsed.result[0]?.history)) {
            return parsed.result[0].history;
        }
        if (Array.isArray(parsed.history)) {
            return parsed.history;
        }
        if (parsed.data && Array.isArray(parsed.data) && Array.isArray(parsed.data[0]?.history)) {
            return parsed.data[0].history;
        }
    }

    // Legacy regex fallback for table strings
    if (typeof rawResponse === 'string') {
        const rows = [];
        const lines = rawResponse.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const match = line.match(/^(\d+)\s+([\d-]+\s+[\d:]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/);
            if (match) {
                rows.push({
                    no: parseInt(match[1], 10),
                    date: match[2],
                    imei: match[3],
                    imsi: match[4],
                    action: match[5],
                    note: match[6]
                });
            }
        }
        if (rows.length > 0) return rows;
    }

    return [];
}

module.exports = {
    ceirgoRequest,
    getProfile,
    getWalletBalance,
    getDepositProviders,
    getDepositProviderDetail,
    createDeposit,
    getDeposits,
    getDepositDetail,
    getServices,
    getServiceDetail,
    createOrder,
    getOrders,
    getOrderDetail,
    getOrderStatus,
    getTransactions,
    getTransactionDetail,
    getWalletMutations,
    getWalletMutationDetail,
    createTransfer,
    getTransferDetail,
    verifyWebhookSignature,
    parseCeirHistory
};
