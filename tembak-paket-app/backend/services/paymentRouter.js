// Dual Payment Gateway Router (GoPay & ShopeePay) with Auto-Rotation & Fallback
const axios = require('axios');

async function getPaymentGatewaySelection(dbGet, dbRun) {
    try {
        const modeRow = await dbGet("SELECT value FROM settings WHERE key = 'payment_gateway_mode'").catch(() => null);
        const mode = modeRow ? modeRow.value : 'rotate'; // 'rotate', 'gopay', 'shoppepay'

        if (mode === 'gopay') return 'gopay';
        if (mode === 'shoppepay') return 'shoppepay';

        // Rotate mode (odd = gopay, even = shoppepay)
        const counterRow = await dbGet("SELECT value FROM settings WHERE key = 'payment_counter'").catch(() => null);
        let counter = counterRow ? parseInt(counterRow.value || '0', 10) : 0;
        counter = (counter + 1) % 1000000;
        
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('payment_counter', ?)", [String(counter)]).catch(() => {});

        return (counter % 2 !== 0) ? 'gopay' : 'shoppepay';
    } catch (err) {
        return 'gopay'; // Default fallback
    }
}

async function proxyCreateQris(req, res, dbGet, dbRun) {
    const gopayUrl = process.env.GOPAY_GATEWAY_URL || 'http://localhost:3002';
    const shoppepayUrl = process.env.SHOPPEPAY_GATEWAY_URL || process.env.SHOPPEPAY_URL || 'http://localhost:3003';

    const chosenGateway = await getPaymentGatewaySelection(dbGet, dbRun);
    const targetUrl = chosenGateway === 'shoppepay' ? shoppepayUrl : gopayUrl;

    try {
        const response = await axios({
            method: req.method,
            url: `${targetUrl}/create-qris`,
            params: { ...req.query, gateway_used: chosenGateway },
            data: { ...req.body, gateway_used: chosenGateway },
            headers: {
                'x-api-key': req.headers['x-api-key'] || req.query.api_key || 'ryy-gateway-key',
                'content-type': req.headers['content-type'] || 'application/json'
            },
            timeout: 15000
        });
        
        const responseData = response.data;
        if (typeof responseData === 'object' && responseData !== null) {
            responseData.active_gateway = chosenGateway;
        }
        return res.status(response.status).json(responseData);
    } catch (err) {
        // Fallback to secondary gateway if primary fails
        const fallbackUrl = chosenGateway === 'shoppepay' ? gopayUrl : shoppepayUrl;
        const fallbackGateway = chosenGateway === 'shoppepay' ? 'gopay' : 'shoppepay';
        try {
            const fallbackResponse = await axios({
                method: req.method,
                url: `${fallbackUrl}/create-qris`,
                params: { ...req.query, gateway_used: fallbackGateway },
                data: { ...req.body, gateway_used: fallbackGateway },
                headers: {
                    'x-api-key': req.headers['x-api-key'] || req.query.api_key || 'ryy-gateway-key',
                    'content-type': req.headers['content-type'] || 'application/json'
                },
                timeout: 15000
            });
            const fbData = fallbackResponse.data;
            if (typeof fbData === 'object' && fbData !== null) {
                fbData.active_gateway = fallbackGateway;
                fbData.fallback_used = true;
            }
            return res.status(fallbackResponse.status).json(fbData);
        } catch (fallbackErr) {
            if (err.response) return res.status(err.response.status).json(err.response.data);
            return res.status(502).json({ success: false, message: "Both payment gateways unreachable: " + err.message });
        }
    }
}

async function proxyCheckPayment(req, res, dbGet) {
    const gopayUrl = process.env.GOPAY_GATEWAY_URL || 'http://localhost:3002';
    const shoppepayUrl = process.env.SHOPPEPAY_GATEWAY_URL || process.env.SHOPPEPAY_URL || 'http://localhost:3003';

    // Check both or check gopay then shoppepay
    try {
        const response = await axios({
            method: req.method,
            url: `${gopayUrl}/check-payment`,
            params: req.query,
            data: req.body,
            headers: {
                'x-api-key': req.headers['x-api-key'] || req.query.api_key || 'ryy-gateway-key',
                'content-type': req.headers['content-type'] || 'application/json'
            },
            timeout: 10000
        });
        if (response.data && (response.data.success || response.data.status === 'completed' || response.data.paid)) {
            return res.status(response.status).json(response.data);
        }
    } catch (e) {}

    try {
        const response2 = await axios({
            method: req.method,
            url: `${shoppepayUrl}/check-payment`,
            params: req.query,
            data: req.body,
            headers: {
                'x-api-key': req.headers['x-api-key'] || req.query.api_key || 'ryy-gateway-key',
                'content-type': req.headers['content-type'] || 'application/json'
            },
            timeout: 10000
        });
        return res.status(response2.status).json(response2.data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        return res.status(200).json({ success: false, status: 'pending', message: 'Waiting for payment confirmation...' });
    }
}

module.exports = {
    getPaymentGatewaySelection,
    proxyCreateQris,
    proxyCheckPayment
};
