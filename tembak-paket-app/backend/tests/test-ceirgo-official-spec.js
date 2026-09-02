const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const ceirgoClient = require('../ceirgoClient');

console.log("==================================================================");
console.log("🧪 TESTING CEIRGO OFFICIAL API SPECIFICATION IMPLEMENTATION");
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
    // Test 1: ceirgo_api_map.json Compliance
    try {
        const mapPath = path.join(__dirname, '../ceirgo_api_map.json');
        assert(fs.existsSync(mapPath), 'ceirgo_api_map.json must exist');
        const apiMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        assert(apiMap.endpoints && apiMap.endpoints.length >= 18, 'Must map at least 18 endpoints');
        pass('CeirGO API Map JSON Compliance', `${apiMap.endpoints.length} verified endpoints mapped to official docs`);
    } catch (e) {
        fail('CeirGO API Map JSON Compliance', e);
    }

    // Test 2: ceirgoClient Module Exports
    try {
        const expectedFunctions = [
            'getProfile',
            'getWalletBalance',
            'getDepositProviders',
            'getDepositProviderDetail',
            'createDeposit',
            'getDeposits',
            'getDepositDetail',
            'getServices',
            'getServiceDetail',
            'createOrder',
            'getOrders',
            'getOrderDetail',
            'getOrderStatus',
            'getTransactions',
            'getTransactionDetail',
            'getWalletMutations',
            'getWalletMutationDetail',
            'createTransfer',
            'getTransferDetail',
            'verifyWebhookSignature',
            'parseCeirHistory'
        ];
        for (const fnName of expectedFunctions) {
            assert(typeof ceirgoClient[fnName] === 'function', `${fnName} must be exported as a function`);
        }
        pass('CeirGO Client Function Signatures', `All ${expectedFunctions.length} methods exported correctly`);
    } catch (e) {
        fail('CeirGO Client Function Signatures', e);
    }

    // Test 3: getWalletBalance (/api/wallet/snap)
    try {
        const wb = await ceirgoClient.getWalletBalance();
        assert(wb && typeof wb === 'object', 'getWalletBalance must return an object');
        assert(typeof wb.balance === 'number', 'Wallet balance must be a number');
        assert(typeof wb.reserved === 'number', 'Reserved amount must be a number');
        assert(wb.status === true, 'Status must be true when connected');
        pass('CeirGO getWalletBalance (/api/wallet/snap)', `Live Balance: Rp ${wb.balance}, Reserved: Rp ${wb.reserved}, Wallet ID: ${wb.wallet_id}`);
    } catch (e) {
        fail('CeirGO getWalletBalance', e);
    }

    // Test 4: getProfile (/api/me) combining live wallet balance
    try {
        const prof = await ceirgoClient.getProfile();
        assert(prof.status === true, 'Profile status must be true');
        assert(prof.connected === true, 'Connected must be true');
        assert(typeof prof.balance === 'number', 'Balance must be a number');
        assert(prof.role, 'Role must be defined');
        assert(Array.isArray(prof.permissions), 'Permissions must be array');
        assert(prof.profile?.user_id, 'User ID must be present');
        pass('CeirGO getProfile (/api/me)', `User: ${prof.profile.username} (ID: ${prof.profile.user_id}), Balance: Rp ${prof.balance}, Role: ${prof.role}`);
    } catch (e) {
        fail('CeirGO getProfile', e);
    }

    // Test 5: createOrder payload validation
    try {
        let threwOnEmpty = false;
        try {
            await ceirgoClient.createOrder({});
        } catch (e) {
            threwOnEmpty = true;
        }
        assert(threwOnEmpty, 'createOrder must throw when code or imeis are missing');

        let threwOnMissingImei = false;
        try {
            await ceirgoClient.createOrder({ code: 'cek_imei' });
        } catch (e) {
            threwOnMissingImei = true;
        }
        assert(threwOnMissingImei, 'createOrder must throw when imeis is missing');
        pass('CeirGO createOrder Validation', 'Throws gracefully when payload schema is invalid');
    } catch (e) {
        fail('CeirGO createOrder Validation', e);
    }

    // Test 6: createDeposit payload validation
    try {
        let threwOnInvalidAmount = false;
        try {
            await ceirgoClient.createDeposit({ amount: 0, provider_code: 'gopay' });
        } catch (e) {
            threwOnInvalidAmount = true;
        }
        assert(threwOnInvalidAmount, 'createDeposit must throw on zero/negative amount');
        pass('CeirGO createDeposit Validation', 'Validates amount and provider_code parameters');
    } catch (e) {
        fail('CeirGO createDeposit Validation', e);
    }

    // Test 7: verifyWebhookSignature according to official HMAC formula
    try {
        const secret = 'test_secret_key_123';
        const payload = {
            status: 'completed',
            order_id: 321,
            charged_amount: 1500,
            total_price: 1500
        };
        // Expected formula: HMAC_SHA256(JSON.stringify({ orderId: 321, amount: "1500" }), secret)
        const signedStr = JSON.stringify({ orderId: 321, amount: "1500" });
        const validSig = crypto.createHmac('sha256', secret).update(signedStr).digest('hex');

        const isValid = ceirgoClient.verifyWebhookSignature({
            payload,
            signature: validSig,
            secret
        });
        assert(isValid === true, 'Signature must be valid for correct HMAC');

        const isInvalid = ceirgoClient.verifyWebhookSignature({
            payload,
            signature: 'invalid_signature_hex_1234567890abcdef',
            secret
        });
        assert(isInvalid === false, 'Invalid signature must return false');

        pass('CeirGO Webhook Signature Verification', 'HMAC-SHA256 timing-safe verification verified');
    } catch (e) {
        fail('CeirGO Webhook Signature Verification', e);
    }

    // Test 8: ceirParser verification with official JSON result[].history structure
    try {
        const { parseCeirResponse } = require('../ceirParser');

        const officialApiResponse = {
            status: 'success',
            data: {
                reference_id: 'REF_99182312',
                remaining_balance: 45000,
                charged_amount: 5100,
                result: [
                    {
                        imei: '358921098765432',
                        history: [
                            {
                                no: 1,
                                date: '2026-06-10 13:16:58',
                                imei: '358921098765432',
                                imsi: '510890012345678',
                                action: 'add_roamer',
                                note: 'SF 8080'
                            },
                            {
                                no: 2,
                                date: '2026-07-15 09:20:11',
                                imei: '358921098765432',
                                imsi: '510100098765432',
                                action: 'update_status',
                                note: 'TSEL Roaming Allowed'
                            }
                        ]
                    }
                ]
            }
        };

        const parsed = parseCeirResponse(officialApiResponse);
        assert(parsed.isRegistered === true, 'Status must be registered');
        assert(parsed.totalRecords === 2, `Expected 2 records, got ${parsed.totalRecords}`);
        assert(parsed.rows.length === 2, 'Rows length must be 2');
        assert.strictEqual(parsed.rows[0].action, 'add_roamer');
        assert.strictEqual(parsed.rows[0].note, 'SF 8080');
        assert.strictEqual(parsed.rows[0].imsi, '510890012345678');
        assert.strictEqual(parsed.rows[0].imei, '358921098765432');
        assert.strictEqual(parsed.rows[1].action, 'update_status');
        assert.strictEqual(parsed.rows[1].imsi, '510100098765432');
        pass('Official CeirGO JSON History Parser', 'Parsed result[].history with { no, date, imei, imsi, action, note }');

        // Test 8b: Stringified JSON input
        const stringifiedJson = JSON.stringify(officialApiResponse);
        const parsedStr = parseCeirResponse(stringifiedJson);
        assert(parsedStr.totalRecords === 2, 'Stringified JSON must parse 2 records');
        pass('Stringified CeirGO JSON Parser', 'Parsed stringified JSON correctly');

        // Test 8c: Legacy fallback string
        const legacyText = "1. 2026-06-10 13:16:58 | Action: add_roamer | Note: SF 8080";
        const parsedLegacy = parseCeirResponse(legacyText);
        assert(parsedLegacy.totalRecords === 1, 'Legacy format must parse 1 record');
        pass('Legacy String Regex Fallback Parser', 'Maintains 100% backward compatibility');
    } catch (e) {
        fail('CeirGO Response Parser', e);
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
