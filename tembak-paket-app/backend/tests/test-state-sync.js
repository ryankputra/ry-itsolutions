require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cookieSignature = require('cookie-signature');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const SECRET = process.env.SESSION_SECRET || 'ry-itsolutions-secret-key-2026';

async function runStateSyncTests() {
    console.log(`\n======================================================`);
    console.log(`🚀 RUNNING E2E STATE & DATABASE SYNC TESTS ON: ${BASE_URL}`);
    console.log(`======================================================\n`);

    let passed = 0;
    let failed = 0;

    // 0. Setup Real Admin Session File
    const sessionId = `testadminsession${Date.now()}`;
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

    const adminSessionHeaders = {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${encodeURIComponent(signedCookie)}`
    };

    // Helper: Make HTTP request
    async function request(path, options = {}) {
        const url = `${BASE_URL}${path}`;
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const json = await res.json().catch(() => ({}));
        return { status: res.status, data: json };
    }

    try {
        // 1. TEST: IMEI Service Status Toggle (OPEN -> CLOSED -> OPEN)
        console.log(`[TEST 1] Testing IMEI Service Status Synchronization...`);
        
        // a. Admin sets OPEN
        const setOpen = await request('/api/admin/imei-service-status', {
            method: 'POST',
            body: JSON.stringify({ isOpen: true, note: 'Layanan Buka Kilat 24 Jam' }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setOpen.status, 200, `Admin POST returned status ${setOpen.status}`);
        
        // b. User checks status
        const userCheck1 = await request('/api/imei-service-status');
        assert.strictEqual(userCheck1.data.status, true, "User GET status should be true");
        assert.strictEqual(userCheck1.data.isOpen, true, "User GET isOpen should be true when Admin set open");
        assert.strictEqual(userCheck1.data.service_status, 'open', "User GET service_status should be 'open'");
        console.log(`  ✓ Setting OPEN verified: isOpen = ${userCheck1.data.isOpen}`);

        // c. Admin sets CLOSED
        const setClosed = await request('/api/admin/imei-service-status', {
            method: 'POST',
            body: JSON.stringify({ isOpen: false, note: 'Server sedang maintenance' }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setClosed.status, 200, `Admin POST returned status ${setClosed.status}`);

        // d. User checks status
        const userCheck2 = await request('/api/imei-service-status');
        assert.strictEqual(userCheck2.data.isOpen, false, "User GET isOpen should be false when Admin set closed");
        assert.strictEqual(userCheck2.data.service_status, 'closed', "User GET service_status should be 'closed'");
        assert.strictEqual(userCheck2.data.note, 'Server sedang maintenance', "User GET note matches admin note");
        console.log(`  ✓ Setting CLOSED verified: isOpen = ${userCheck2.data.isOpen}, note = "${userCheck2.data.note}"`);

        // e. Revert back to OPEN
        await request('/api/admin/imei-service-status', {
            method: 'POST',
            body: JSON.stringify({ isOpen: true, note: '' }),
            headers: adminSessionHeaders
        });
        console.log(`  ✓ Reverted to default OPEN state.`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 1 FAILED:`, e.message);
        failed++;
    }

    // 2. TEST: Menu Settings Sync (showBeliPaket toggle)
    try {
        console.log(`\n[TEST 2] Testing Menu Settings (showBeliPaket) Synchronization...`);
        
        // a. Admin sets true
        const setMenu1 = await request('/api/admin/menu-settings', {
            method: 'PUT',
            body: JSON.stringify({ showBeliPaket: true }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setMenu1.status, 200);
        const menuCheck1 = await request('/api/admin/menu-settings');
        assert.strictEqual(menuCheck1.data.data.showBeliPaket, true, "showBeliPaket should be true");
        console.log(`  ✓ showBeliPaket = true verified.`);

        // b. Admin sets false
        const setMenu2 = await request('/api/admin/menu-settings', {
            method: 'PUT',
            body: JSON.stringify({ showBeliPaket: false }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setMenu2.status, 200);
        const menuCheck2 = await request('/api/admin/menu-settings');
        assert.strictEqual(menuCheck2.data.data.showBeliPaket, false, "showBeliPaket should be false");
        console.log(`  ✓ showBeliPaket = false verified.`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 2 FAILED:`, e.message);
        failed++;
    }

    // 3. TEST: Payment Gateway Settings Sync
    try {
        console.log(`\n[TEST 3] Testing Payment Gateway Selection Synchronization...`);
        
        // a. Admin sets orkut
        const setGw = await request('/api/admin/payment-gateway', {
            method: 'PUT',
            body: JSON.stringify({ gateway: 'orkut' }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setGw.status, 200);
        const gwCheck1 = await request('/api/admin/payment-gateway');
        assert.strictEqual(gwCheck1.data.data.gateway, 'orkut', "Payment gateway should be orkut");
        console.log(`  ✓ Payment gateway = orkut verified.`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 3 FAILED:`, e.message);
        failed++;
    }

    // 4. TEST: CeirGO Pricing & Display Settings Sync
    try {
        console.log(`\n[TEST 4] Testing CeirGO Pricing & Display Settings Sync...`);
        
        // a. Admin updates price
        const setPrc = await request('/api/admin/ceirgo-pricing', {
            method: 'POST',
            body: JSON.stringify({ cek_history_imei: 5500, cek_imei_beacukai: 2000 }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setPrc.status, 200);
        
        // b. Public checks price
        const pricingCheck = await request('/api/ceirgo-pricing');
        assert.strictEqual(pricingCheck.data.status, true, "Ceirgo pricing endpoint should return status true");
        assert.strictEqual(pricingCheck.data.data.cek_history_imei, 5500, "Price should match admin set value (5500)");
        assert.strictEqual(pricingCheck.data.data.cek_imei_beacukai, 2000, "Price should match admin set value (2000)");
        console.log(`  ✓ CeirGO public pricing verified: cek_history_imei = Rp ${pricingCheck.data.data.cek_history_imei}`);

        // c. Admin updates display codes
        const setDisp = await request('/api/admin/ceirgo-display-settings', {
            method: 'PUT',
            body: JSON.stringify({ cekCeir: ['cek_history_imei', 'cek_imei_beacukai'] }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setDisp.status, 200);
        const displayCheck = await request('/api/admin/ceirgo-display-settings', { headers: adminSessionHeaders });
        assert.strictEqual(displayCheck.data.status, true);
        assert(Array.isArray(displayCheck.data.data.cekCeir), "cekCeir should be an array");
        console.log(`  ✓ CeirGO display codes verified: [${displayCheck.data.data.cekCeir.join(', ')}]`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 4 FAILED:`, e.message);
        failed++;
    }

    // 5. TEST: Public Coupons & Announcement Sync
    try {
        console.log(`\n[TEST 5] Testing Public Coupons & Announcement Sync...`);
        
        // a. Announcement sync
        const setAnn = await request('/api/admin/announcement', {
            method: 'POST',
            body: JSON.stringify({ message: 'Promo Kilat Hari Ini!', bgColor: '#16a34a' }),
            headers: adminSessionHeaders
        });
        assert.strictEqual(setAnn.status, 200);
        const annCheck = await request('/api/user/announcement');
        assert.strictEqual(annCheck.data.status, true);
        assert.strictEqual(annCheck.data.data.message, 'Promo Kilat Hari Ini!');
        assert.strictEqual(annCheck.data.data.bgColor, '#16a34a');
        console.log(`  ✓ Announcement sync verified: "${annCheck.data.data.message}" (${annCheck.data.data.bgColor})`);

        // b. Public coupons check
        const couponCheck = await request('/api/coupons/public');
        assert.strictEqual(couponCheck.data.status, true);
        assert(Array.isArray(couponCheck.data.data), "Coupons data should be an array");
        console.log(`  ✓ Public coupons array verified (count: ${couponCheck.data.data.length})`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 5 FAILED:`, e.message);
        failed++;
    }

    // Cleanup session
    try { fs.unlinkSync(sessionFilePath); } catch (e) { }

    console.log(`\n======================================================`);
    console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runStateSyncTests();
