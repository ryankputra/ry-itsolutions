const axios = require('axios');

async function testEndpoints() {
    console.log("=== TESTING BACKEND PROXY & SERVICES ENDPOINTS ===");
    const BASE_URL = 'http://127.0.0.1:3001/api';

    // 1. Test /services/status
    try {
        const res = await axios.get(`${BASE_URL}/services/status`);
        console.log("✓ GET /api/services/status:", {
            status: res.data.status,
            hasActiveBarcode: res.data.hasActiveBarcode,
            barcodeSample: res.data.barcode?.create_barcode
        });
        if (res.data.status && typeof res.data.hasActiveBarcode === 'boolean') {
            console.log("  [PASS] /services/status is working and returns barcode status!");
        } else {
            console.error("  [FAIL] Unexpected response structure for /services/status");
        }
    } catch (e) {
        console.error("  [FAIL] /services/status error:", e.message);
    }

    // 2. Test /admin/gopay/status (without auth header, should return 401 or response)
    try {
        const res = await axios.get(`${BASE_URL}/admin/gopay/status`, {
            headers: { 'x-internal-test-key': 'test' },
            validateStatus: () => true
        });
        console.log("✓ GET /api/admin/gopay/status (status code):", res.status, "content-type:", res.headers['content-type']);
        if (typeof res.data === 'object') {
            console.log("  [PASS] Returns JSON payload, not HTML!");
        } else {
            console.error("  [FAIL] Did not return JSON:", res.data);
        }
    } catch (e) {
        console.error("  [FAIL] error:", e.message);
    }

    console.log("=== TEST FINISHED ===");
}

testEndpoints();
