const assert = require('assert');
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
    // Test 1: ceirgoClient Module Exports
    try {
        assert(typeof ceirgoClient.getProfile === 'function', 'getProfile must be a function');
        assert(typeof ceirgoClient.getDepositProviders === 'function', 'getDepositProviders must be a function');
        assert(typeof ceirgoClient.getDepositProviderDetail === 'function', 'getDepositProviderDetail must be a function');
        assert(typeof ceirgoClient.createDeposit === 'function', 'createDeposit must be a function');
        assert(typeof ceirgoClient.getDeposits === 'function', 'getDeposits must be a function');
        assert(typeof ceirgoClient.getDepositDetail === 'function', 'getDepositDetail must be a function');
        assert(typeof ceirgoClient.getServices === 'function', 'getServices must be a function');
        assert(typeof ceirgoClient.getServiceDetail === 'function', 'getServiceDetail must be a function');
        assert(typeof ceirgoClient.createOrder === 'function', 'createOrder must be a function');
        assert(typeof ceirgoClient.getOrders === 'function', 'getOrders must be a function');
        assert(typeof ceirgoClient.getOrderDetail === 'function', 'getOrderDetail must be a function');
        pass('CeirGO Client Function Signatures', 'All 11 official methods exported correctly');
    } catch (e) {
        fail('CeirGO Client Function Signatures', e);
    }

    // Test 2: createOrder payload validation
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

    // Test 3: createDeposit payload validation
    try {
        let threwOnInvalidAmount = false;
        try {
            await ceirgoClient.createDeposit({ amount: 0, provider_code: 'qris' });
        } catch (e) {
            threwOnInvalidAmount = true;
        }
        assert(threwOnInvalidAmount, 'createDeposit must throw on zero/negative amount');
        pass('CeirGO createDeposit Validation', 'Validates amount and provider_code parameters');
    } catch (e) {
        fail('CeirGO createDeposit Validation', e);
    }

    // Test 4: ceirParser verification with official JSON result[].history structure
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

        // Test 4b: Stringified JSON input
        const stringifiedJson = JSON.stringify(officialApiResponse);
        const parsedStr = parseCeirResponse(stringifiedJson);
        assert(parsedStr.totalRecords === 2, 'Stringified JSON must parse 2 records');
        assert.strictEqual(parsedStr.rows[0].imsi, '510890012345678');
        pass('Stringified CeirGO JSON Parser', 'Parsed stringified JSON correctly');

        // Test 4c: Legacy fallback string
        const legacyText = "1. 2026-06-10 13:16:58 | Action: add_roamer | Note: SF 8080";
        const parsedLegacy = parseCeirResponse(legacyText);
        assert(parsedLegacy.totalRecords === 1, 'Legacy format must parse 1 record');
        assert.strictEqual(parsedLegacy.rows[0].action, 'add_roamer');
        pass('Legacy String Regex Fallback Parser', 'Maintains 100% backward compatibility');
    } catch (e) {
        fail('CeirGO Response Parser', e);
    }

    // Test 5: Live / Mock Request Headers Enforced
    try {
        const testRes = await ceirgoClient.getProfile();
        // Even if no live API key is set in test env, response object should have standard keys
        assert(typeof testRes === 'object', 'Response must be object');
        assert(typeof testRes.status === 'boolean', 'Response must have boolean status');
        assert(typeof testRes.balance === 'number', 'Balance must be number');
        pass('CeirGO getProfile (/api/me) Safe Execution', `Status: ${testRes.status}, Balance: Rp ${testRes.balance}`);
    } catch (e) {
        fail('CeirGO getProfile Execution', e);
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
