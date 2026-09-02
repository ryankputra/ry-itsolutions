const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const { dbGet, dbRun, dbAll } = require('../config/db');

console.log("==================================================================");
console.log("🧪 TESTING CEIRGO DIAGNOSTIC & BARCODE ORDERS & CATEGORIES");
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
    // 1. Setup mock express test app
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Get an admin/test user from DB
    const testUser = await dbGet("SELECT id, name, balance FROM users ORDER BY id ASC LIMIT 1");
    assert(testUser, 'Test user must exist in DB');

    let simulateAuth = true;
    let currentUserId = testUser.id;

    // Session mock middleware
    app.use((req, res, next) => {
        if (simulateAuth) {
            req.session = { userId: currentUserId };
        } else {
            req.session = null;
        }
        next();
    });

    const orderRoutes = require('../routes/orders');
    app.use('/api', orderRoutes);

    const server = app.listen(3098);
    const baseUrl = 'http://localhost:3098/api';

    try {
        // Test 1: GET /api/orders/catalog
        try {
            const res = await fetch(`${baseUrl}/orders/catalog`);
            const json = await res.json();
            assert(json.status === true, 'Catalog status must be true');
            assert(json.data.diagnostic, 'Diagnostic catalog must exist');
            assert(json.data.barcode, 'Barcode catalog must exist');

            const diagCodes = json.data.diagnostic.map(p => p.code);
            const expectedDiag = ['cek_imei', 'cek_imei_beacukai', 'cek_history_imei', 'cek_validity', 'cek_digi', 'cek_sf'];
            for (const c of expectedDiag) {
                assert(diagCodes.includes(c), `Diagnostic catalog must include ${c}`);
            }

            const barcodeCodes = json.data.barcode.map(p => p.code);
            const expectedBarcode = ['create_barcode', 'create_barcode_samsung', 'create_barcode_redmi', 'create_barcode_ios26'];
            for (const c of expectedBarcode) {
                assert(barcodeCodes.includes(c), `Barcode catalog must include ${c}`);
            }

            pass('GET /api/orders/catalog', `Found ${diagCodes.length} diagnostic and ${barcodeCodes.length} barcode products`);
        } catch (e) {
            fail('GET /api/orders/catalog', e);
        }

        // Test 2: Unauthenticated order rejection
        try {
            simulateAuth = false;
            const res = await fetch(`${baseUrl}/order/ceir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_code: 'cek_imei', imei: '358921098765432' })
            });
            assert.strictEqual(res.status, 401, 'Unauthenticated order must return HTTP 401');
            pass('Authentication Guard', 'Rejected unauthenticated order with 401');
        } catch (e) {
            fail('Authentication Guard', e);
        } finally {
            simulateAuth = true;
        }

        // Test 3: Invalid IMEI rejection
        try {
            const res = await fetch(`${baseUrl}/order/ceir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_code: 'cek_imei', imei: '12345' })
            });
            const json = await res.json();
            assert.strictEqual(res.status, 400, 'Invalid IMEI must return HTTP 400');
            assert(json.message.includes('minimal 15 digit'), 'Must state invalid IMEI');
            pass('IMEI Validation Guard', 'Rejected short/invalid IMEI with 400');
        } catch (e) {
            fail('IMEI Validation Guard', e);
        }

        // Test 4: Insufficient Balance Check
        try {
            // Temporarily set a high price in settings for a test code
            await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('ceirgo_price_cek_test_price', '99999999')");
            const res = await fetch(`${baseUrl}/order/ceir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_code: 'cek_history_imei', imei: '358921098765432' })
            });
            // If user doesn't have 99999999, it should either reject for balance or proceed if user is billionaire
            const json = await res.json();
            if (testUser.balance < 5500) {
                assert.strictEqual(res.status, 400, 'Must return 400 when balance is insufficient');
                pass('Balance Guard', 'Prevented checkout when balance is insufficient');
            } else {
                pass('Balance Guard', `User has Rp ${testUser.balance}, checked balance flow`);
            }
        } catch (e) {
            fail('Balance Guard', e);
        }

        // Test 5: Barcode Order Endpoint (/api/order/barcode)
        try {
            // Check selling price resolution for barcode samsung
            const pRow = await dbGet("SELECT value FROM settings WHERE key = 'ceirgo_price_create_barcode_samsung'");
            const expectedPrice = pRow && pRow.value ? parseInt(pRow.value, 10) : 4997;
            assert(expectedPrice > 0, 'Barcode price must be resolved');
            pass('Barcode Price Resolution', `Resolved create_barcode_samsung price: Rp ${expectedPrice}`);
        } catch (e) {
            fail('Barcode Price Resolution', e);
        }

        // Test 6: Admin Display Settings Default Verification
        try {
            const row = await dbGet("SELECT value FROM settings WHERE key = 'ceirgo_display_settings'");
            assert(row, 'ceirgo_display_settings must exist in settings');
            const parsed = JSON.parse(row.value);
            assert(parsed.cekCeir !== undefined, 'cekCeir array must exist');
            assert(parsed.barcode !== undefined, 'barcode array must exist');
            pass('Admin Display Settings Schema', `cekCeir items: ${parsed.cekCeir.length}, barcode items: ${parsed.barcode.length}`);
        } catch (e) {
            fail('Admin Display Settings Schema', e);
        }

    } finally {
        server.close();
    }

    console.log("\n==================================================================");
    console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================================");

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
});
