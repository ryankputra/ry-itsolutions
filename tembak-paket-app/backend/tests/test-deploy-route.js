const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const { dbGet } = require('../config/db');
const adminRoutes = require('../routes/admin');
const fs = require('fs');

console.log("==================================================================");
console.log("🧪 TESTING ADMIN AUTO DEPLOY ROUTE (/api/admin/deploy)");
console.log("==================================================================");

async function runTest() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const adminUser = await dbGet("SELECT id, role FROM users WHERE role = 'admin' LIMIT 1");
    assert(adminUser, "Admin user must exist");

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

    // TEST 1: POST /api/admin/deploy
    console.log("Testing POST /api/admin/deploy...");
    const deployRes = await client.post('/api/admin/deploy');
    console.log("Deploy POST status:", deployRes.status, deployRes.data);
    assert.strictEqual(deployRes.status, 200);
    assert.strictEqual(deployRes.data.status, true);

    // Wait a brief moment for file write
    await new Promise(r => setTimeout(r, 500));

    // TEST 2: GET /api/admin/deploy-status
    console.log("Testing GET /api/admin/deploy-status...");
    const statusRes = await client.get('/api/admin/deploy-status');
    console.log("Deploy status response:", statusRes.status, statusRes.data?.status);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.status, true);
    assert.ok(statusRes.data.log.includes("[DEPLOY]"));

    console.log("✔ Auto deploy routes verified successfully!");
    server.close();
}

runTest().then(() => {
    console.log("=== AUTO DEPLOY TEST PASSED ===");
    process.exit(0);
}).catch(err => {
    console.error("Auto deploy test failed:", err);
    process.exit(1);
});
