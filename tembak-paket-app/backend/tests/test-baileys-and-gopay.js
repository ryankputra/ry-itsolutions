const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const { dbGet } = require('../config/db');
const adminRoutes = require('../routes/admin');
const waBot = require('../services/waBot');

console.log("==================================================================");
console.log("🧪 TESTING BAILEYS / WABOT & GOPAY LOGOUT ROUTES");
console.log("==================================================================");

let passedCount = 0;
let failedCount = 0;

function pass(name, detail = '') {
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
    passedCount++;
}

function fail(name, error) {
    console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${name}`);
    console.error(`  Reason: ${error?.message || error}`);
    failedCount++;
}

async function runTests() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Find admin user
    const adminUser = await dbGet("SELECT id, role FROM users WHERE role = 'admin' LIMIT 1");
    assert(adminUser, "Admin user must exist in DB");

    // Mock admin session
    app.use((req, res, next) => {
        req.session = { userId: adminUser.id };
        next();
    });

    app.use('/api', adminRoutes);

    const server = app.listen(0);
    const port = server.address().port;
    const axios = require('axios');
    const client = axios.create({
        baseURL: `http://127.0.0.1:${port}`,
        validateStatus: () => true
    });

    // TEST 1: GET /api/admin/baileys/status
    try {
        const res = await client.get('/api/admin/baileys/status');
        assert.strictEqual(res.status, 200, "Should return HTTP 200");
        assert.strictEqual(res.data.status, true, "res.data.status should be true");
        assert.ok(res.data.data, "res.data.data should exist");
        assert.ok('isConnected' in res.data.data, "res.data.data should have isConnected");
        assert.ok('qrCode' in res.data.data, "res.data.data should have qrCode property");
        pass("GET /api/admin/baileys/status", `state: ${res.data.data.state}, hasQr: ${Boolean(res.data.data.qrCode)}`);
    } catch (e) {
        fail("GET /api/admin/baileys/status", e);
    }

    // TEST 2: GET /api/admin/wabot/status (alias check)
    try {
        const res = await client.get('/api/admin/wabot/status');
        assert.strictEqual(res.status, 200, "Should return HTTP 200");
        assert.strictEqual(res.data.status, true, "res.data.status should be true");
        pass("GET /api/admin/wabot/status (alias works)", `connected: ${res.data.connected}`);
    } catch (e) {
        fail("GET /api/admin/wabot/status", e);
    }

    // TEST 3: POST /api/admin/gopay/logout
    try {
        const res = await client.post('/api/admin/gopay/logout');
        assert.strictEqual(res.status, 200, "Should return HTTP 200");
        assert.strictEqual(res.data.status, true, "status should be true");
        assert.strictEqual(res.data.success, true, "success should be true");
        assert.ok(res.data.message.includes("GoPay"), "Message should mention GoPay");
        pass("POST /api/admin/gopay/logout", res.data.message);
    } catch (e) {
        fail("POST /api/admin/gopay/logout", e);
    }

    // TEST 4: GET /api/admin/gopay/status
    try {
        const res = await client.get('/api/admin/gopay/status');
        assert.strictEqual(res.status, 200, "Should return HTTP 200");
        assert.ok(res.data.data, "res.data.data should exist");
        assert.ok('token_status' in res.data.data, "Should have token_status");
        pass("GET /api/admin/gopay/status", `token_status: ${res.data.data.token_status}`);
    } catch (e) {
        fail("GET /api/admin/gopay/status", e);
    }

    // TEST 5: POST /api/admin/baileys/init
    try {
        const res = await client.post('/api/admin/baileys/init', { forceNew: false });
        assert.strictEqual(res.status, 200, "Should return HTTP 200");
        assert.strictEqual(res.data.status, true, "status should be true");
        pass("POST /api/admin/baileys/init", res.data.message);
    } catch (e) {
        fail("POST /api/admin/baileys/init", e);
    }

    server.close();

    console.log("==================================================================");
    console.log(`🏁 RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("==================================================================");
    if (failedCount > 0) process.exit(1);
}

runTests().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});
