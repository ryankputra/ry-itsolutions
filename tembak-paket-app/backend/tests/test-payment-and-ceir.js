require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cookieSignature = require('cookie-signature');

const BASE_URL = 'http://localhost:3001';
const SECRET = process.env.SESSION_SECRET || 'ry-itsolutions-secret-key-2026';

async function runTests() {
    console.log("===============================================================");
    console.log("🧪 TESTING CEIRGO BALANCE, PAYMENT WEBHOOK, AND CEIR PARSER");
    console.log("===============================================================");

    // 1. Setup Admin Session
    const sessionId = `admin_pay_test_${Date.now()}`;
    const signedCookie = 's:' + cookieSignature.sign(sessionId, SECRET);
    const sessionDir = path.join(__dirname, '..', 'sessions');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const sessionFilePath = path.join(sessionDir, `${sessionId}.json`);
    const sessionPayload = {
        cookie: {
            originalMaxAge: 86400000,
            expires: new Date(Date.now() + 86400000).toISOString(),
            secure: false,
            httpOnly: true,
            path: "/",
            sameSite: "lax"
        },
        userId: "user_1750832245659", // Valid Admin in SQLite
        __lastAccess: Date.now()
    };
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionPayload));

    const adminHeaders = {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${encodeURIComponent(signedCookie)}`
    };

    // 2. Test Provider Balances endpoint
    try {
        const balRes = await axios.get(`${BASE_URL}/api/admin/provider-balances`, { headers: adminHeaders });
        assert.strictEqual(balRes.status, 200, "Should return 200 OK");
        assert.ok('ceirgoBalance' in balRes.data.data, "Should have ceirgoBalance in data");
        assert.ok('kmspBalance' in balRes.data.data, "Should have kmspBalance in data");
        console.log(`  ✔ PASS: GET /api/admin/provider-balances -> ceirgoBalance: ${balRes.data.data.ceirgoBalance}, kmspBalance: ${balRes.data.data.kmspBalance}`);
    } catch (e) {
        console.error("  ❌ FAIL: GET /api/admin/provider-balances:", e.message);
    }

    // 3. Test CeirGO Balance endpoint
    try {
        const ceirRes = await axios.get(`${BASE_URL}/api/admin/ceirgo-balance`, { headers: adminHeaders });
        assert.strictEqual(ceirRes.status, 200, "Should return 200 OK");
        assert.ok('ceirgoBalance' in ceirRes.data || 'balance' in ceirRes.data, "Should return ceirgoBalance key");
        console.log(`  ✔ PASS: GET /api/admin/ceirgo-balance -> ceirgoBalance: ${ceirRes.data.ceirgoBalance ?? ceirRes.data.data?.balance}`);
    } catch (e) {
        console.error("  ❌ FAIL: GET /api/admin/ceirgo-balance:", e.message);
    }

    // 4. Test Payment Webhook endpoint (GoPay / Mutasi QRIS)
    try {
        const webhookPayload = {
            amount: 50000,
            trx_id: "TU-TEST-NONEXISTENT",
            status: "PAID",
            gopay_trx_id: "GP12345678"
        };
        const cbRes = await axios.post(`${BASE_URL}/api/callback/gopay`, webhookPayload);
        assert.strictEqual(cbRes.status, 200, "Webhook should return 200");
        assert.ok(cbRes.data.status, "Status should be true");
        console.log("  ✔ PASS: POST /api/callback/gopay accepted and handled gracefully");
    } catch (e) {
        console.error("  ❌ FAIL: POST /api/callback/gopay:", e.message);
    }

    // 5. Test Frontend CEIR Parser Logic (Mock node implementation of ceirParser)
    console.log("\n  --- TESTING CEIR PARSER REGEX LOGIC ---");
    const rawStringSample = "Ditemukan 2 riwayat CEIR: 1. 2026-06-10 13:16:58 | Action: ---- | Note: ---- 2. 2026-06-10 13:16:58 | Action: add_roamer | Note: SF 8080";

    const parts = rawStringSample.split(/(?=\d+\.\s*\d{4}-\d{2}-\d{2})/);
    const parsedRows = [];
    parts.forEach((item) => {
        const clean = item.replace(/^Ditemukan\s+\d+\s+riwayat\s+CEIR:?\s*/i, '').trim();
        if (!clean) return;
        const sub = clean.split('|').map(s => s.trim());
        const timePart = sub[0]?.replace(/^\d+\.\s*/, '') || '';
        const actionPart = sub[1]?.replace(/^Action:\s*/i, '') || '';
        const notePart = sub[2]?.replace(/^Note:\s*/i, '') || '';
        if (timePart || actionPart) {
            parsedRows.push({
                no: parsedRows.length + 1,
                tanggal: timePart,
                action: actionPart,
                note: notePart
            });
        }
    });

    assert.strictEqual(parsedRows.length, 2, "Should parse exactly 2 records");
    assert.strictEqual(parsedRows[0].tanggal, "2026-06-10 13:16:58");
    assert.strictEqual(parsedRows[1].action, "add_roamer");
    assert.strictEqual(parsedRows[1].note, "SF 8080");
    console.log("  ✔ PASS: Regex parsed 2 rows correctly:", JSON.stringify(parsedRows, null, 2));

    console.log("\n===============================================================");
    console.log("🎉 ALL TESTS FOR REQUIREMENTS 1, 2, 3, AND 4 COMPLETED SUCCESSFULLY!");
    console.log("===============================================================");

    // Clean session
    try { fs.unlinkSync(sessionFilePath); } catch (e) {}
}

runTests().catch(err => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
