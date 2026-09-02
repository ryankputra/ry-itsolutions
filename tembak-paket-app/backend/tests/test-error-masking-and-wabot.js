const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const { dbGet, dbRun, dbAll } = require('../config/db');

console.log("==================================================================");
console.log("🧪 TESTING ERROR MASKING, WA BOT COMMANDS & ADMIN RETRY");
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
    // 1. Get test user
    const testUser = await dbGet("SELECT id, name, balance, email FROM users ORDER BY id ASC LIMIT 1");
    assert(testUser, 'Test user must exist');

    // Setup Mock Express App
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mock Session
    app.use((req, res, next) => {
        req.session = { userId: testUser.id, role: 'admin' };
        req.user = { id: testUser.id, role: 'admin' };
        next();
    });

    const orderRoutes = require('../routes/orders');
    const transactionRoutes = require('../routes/transactions');
    const adminRoutes = require('../routes/admin');
    const waBot = require('../services/waBot');

    app.use('/api', orderRoutes);
    app.use('/api', transactionRoutes.router);
    app.use('/api', adminRoutes);

    const server = app.listen(3099);
    const baseUrl = 'http://localhost:3099/api';

    try {
        // --- TEST 1: Strict User-Facing Error Masking on CeirGO Order ---
        try {
            const res = await fetch(`${baseUrl}/order/ceir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_code: 'cek_history_imei', imei: '358921098765432' })
            });
            const json = await res.json();
            assert(json.status === true, 'Response status must be true (handled gracefully)');

            // Check response message and result
            const rawOutput = JSON.stringify(json).toLowerCase();
            const forbiddenKeywords = ['ceirgo', 'upps', 'balance-mu', 'tidak mencukupi'];
            for (const kw of forbiddenKeywords) {
                assert(!rawOutput.includes(kw), `User response must NOT leak technical keyword "${kw}"`);
            }

            assert(
                json.message === "Pesanan sedang dalam antrean proses verifikasi oleh sistem/admin." ||
                json.message === "Pesanan berhasil diselesaikan!",
                'User-facing message must be professional and neutral'
            );

            pass('Zero Leakage Error Masking on /order/ceir', `Masked message: "${json.message}"`);
        } catch (e) {
            fail('Zero Leakage Error Masking on /order/ceir', e);
        }

        // --- TEST 2: Error Masking in User Transactions History ---
        try {
            const mockTrxId = `trx_test_masking_${Date.now()}`;
            await dbRun(
                `INSERT INTO transactions (
                    id, userId, userName, packageId, packageName, originalPrice,
                    targetPhone, paymentMethod, status, api_response, admin_note,
                    service_type, imei, speed_option, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    mockTrxId,
                    testUser.id,
                    testUser.name,
                    'cek_history_imei',
                    'Cek Riwayat Database CEIR',
                    5500,
                    testUser.email,
                    'balance',
                    'pending',
                    '{"error":"CeirGO Provider balance insufficient"}',
                    '[CeirGO Internal Error] Upps, Balance-mu tidak mencukupi untuk transaksi ini',
                    'ceir',
                    '358921098765432',
                    null,
                    new Date().toISOString()
                ]
            );

            const res = await fetch(`${baseUrl}/user/transactions`);
            const json = await res.json();
            assert(json.status === true, 'Transactions fetch must succeed');

            const inserted = json.data.find(t => t.id === mockTrxId);
            assert(inserted, 'Inserted transaction must be returned in user transactions');

            assert.strictEqual(
                inserted.admin_note,
                "Pesanan sedang dalam antrean proses verifikasi oleh sistem/admin.",
                'admin_note must be sanitized for customer view'
            );
            assert.strictEqual(
                inserted.speed_option,
                'instant',
                'speed_option for automated service must be enforced to instant'
            );

            pass('Customer Transactions History Sanitization', 'Masked provider error to neutral queue note & set instant speed');
        } catch (e) {
            fail('Customer Transactions History Sanitization', e);
        }

        // --- TEST 3: Admin Retry Endpoint (/api/admin/orders/:id/retry-ceirgo) ---
        try {
            const testRetryId = `trx_test_retry_${Date.now()}`;
            await dbRun(
                `INSERT INTO transactions (
                    id, userId, userName, packageId, packageName, originalPrice,
                    targetPhone, paymentMethod, status, api_response, admin_note,
                    service_type, imei, speed_option, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    testRetryId,
                    testUser.id,
                    testUser.name,
                    'cek_validity',
                    'Cek Masa Aktif Sinyal',
                    4500,
                    testUser.email,
                    'balance',
                    'pending',
                    '{}',
                    'Initial error',
                    'ceir',
                    '358921098765432',
                    null,
                    new Date().toISOString()
                ]
            );

            const res = await fetch(`${baseUrl}/admin/orders/${testRetryId}/retry-ceirgo`, {
                method: 'POST'
            });
            const json = await res.json();
            // Since CeirGO balance might be depleted, it returns 400 with technical error for admin, OR 200 if success
            if (res.status === 200) {
                assert(json.status === true, 'Retry succeeded');
                pass('Admin CeirGO Retry Endpoint', `Success: ${json.message}`);
            } else {
                assert(json.status === false, 'Retry failed with clear message');
                assert(json.message.includes('Gagal submit ulang ke CeirGO'), 'Provides admin with clear technical feedback');
                pass('Admin CeirGO Retry Endpoint', `Admin received technical log: ${json.message}`);
            }
        } catch (e) {
            fail('Admin CeirGO Retry Endpoint', e);
        }

        // --- TEST 4: WhatsApp Bot Service Module & Functionality ---
        try {
            assert(typeof waBot.initWABot === 'function', 'initWABot must be a function');
            assert(typeof waBot.notifyNewOrder === 'function', 'notifyNewOrder must be a function');
            assert(typeof waBot.getWAStatus === 'function', 'getWAStatus must be a function');
            assert(typeof waBot.sendTextMessage === 'function', 'sendTextMessage must be a function');
            assert(typeof waBot.logoutWABot === 'function', 'logoutWABot must be a function');

            const status = waBot.getWAStatus();
            assert(status !== undefined, 'getWAStatus must return status object');
            assert(status.isConnected !== undefined, 'status must have isConnected');

            pass('WhatsApp Bot Service Exports', 'All 5 core WhatsApp service methods verified');
        } catch (e) {
            fail('WhatsApp Bot Service Exports', e);
        }

        // --- TEST 5: Automatic Refund on Failed Order Simulation ---
        try {
            const userBefore = await dbGet("SELECT balance FROM users WHERE id = ?", [testUser.id]);
            const testRefundTrxId = `trx_test_refund_${Date.now()}`;
            const testPrice = 25000;

            await dbRun(
                `INSERT INTO transactions (
                    id, userId, userName, packageId, packageName, originalPrice,
                    platformFee, targetPhone, paymentMethod, status, api_response,
                    admin_note, service_type, imei, speed_option, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    testRefundTrxId,
                    testUser.id,
                    testUser.name,
                    'imei_manual_3bln',
                    'Buka Blokir IMEI 3 Bulan',
                    testPrice,
                    testPrice,
                    testUser.email,
                    'balance',
                    'pending',
                    '{}',
                    'Menunggu proses',
                    'imei',
                    '358921098765432',
                    'fast',
                    new Date().toISOString()
                ]
            );

            // Simulate updating status to failed via PUT /api/admin/manual-orders/:id
            const res = await fetch(`${baseUrl}/admin/manual-orders/${testRefundTrxId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'failed', admin_note: 'IMEI tidak memenuhi syarat' })
            });
            const json = await res.json();
            assert(json.status === true, 'Update to failed must succeed');

            const userAfter = await dbGet("SELECT balance FROM users WHERE id = ?", [testUser.id]);
            assert.strictEqual(
                userAfter.balance,
                userBefore.balance + testPrice,
                `Balance must be refunded (+${testPrice}) upon order cancellation/failure`
            );

            pass('Automatic Balance Refund on Failed Order', `Refunded Rp ${testPrice.toLocaleString('id-ID')} to user`);
        } catch (e) {
            fail('Automatic Balance Refund on Failed Order', e);
        }

    } finally {
        server.close();
    }

    console.log("\n==================================================================");
    console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================================");

    if (failedCount > 0) process.exit(1);
}

runTests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
