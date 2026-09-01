require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cookieSignature = require('cookie-signature');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const SECRET = process.env.SESSION_SECRET || 'ry-itsolutions-secret-key-2026';

async function runRouteDistributionTests() {
    console.log(`\n===============================================================`);
    console.log(`🚀 RUNNING COMPLETE ROUTE DISTRIBUTION & INTEGRITY TESTS ON: ${BASE_URL}`);
    console.log(`===============================================================\n`);

    let passed = 0;
    let failed = 0;

    // 0. Setup Real Admin Session File
    const sessionId = `admin_route_test_${Date.now()}`;
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

    const publicHeaders = {
        'Content-Type': 'application/json'
    };

    // List of all registered Express routes to test for NON-404
    const routesToTest = [
        // --- 1. PUBLIC & SERVICE CATALOG ROUTES ---
        { path: '/api/system-version', method: 'GET', headers: publicHeaders, category: 'Core & Config' },
        { path: '/api/user/announcement', method: 'GET', headers: publicHeaders, category: 'Core & Config' },
        { path: '/api/admin/config/public', method: 'GET', headers: publicHeaders, category: 'Core & Config' },
        { path: '/api/user/packages', method: 'GET', headers: publicHeaders, category: 'Packages & Services' },
        { path: '/api/imei-packages', method: 'GET', headers: publicHeaders, category: 'Packages & Services' },
        { path: '/api/imei-service-status', method: 'GET', headers: publicHeaders, category: 'Packages & Services' },
        { path: '/api/manual-services-pricing', method: 'GET', headers: publicHeaders, category: 'Packages & Services' },
        { path: '/api/ceirgo-services', method: 'GET', headers: publicHeaders, category: 'CeirGO Integration' },
        { path: '/api/ceirgo-pricing', method: 'GET', headers: publicHeaders, category: 'CeirGO Integration' },
        { path: '/api/coupons/public', method: 'GET', headers: publicHeaders, category: 'Coupons & Vouchers' },
        { path: '/api/public/check-warranty?imei=860123456789012', method: 'GET', headers: publicHeaders, category: 'Warranty & Diagnostics' },
        { path: '/api/reviews?productId=unblock-imei', method: 'GET', headers: publicHeaders, category: 'Reviews & Social' },

        // --- 2. AUTHENTICATION & USER PROFILE ---
        { path: '/api/auth/me', method: 'GET', headers: adminHeaders, category: 'Auth & Profile' },
        { path: '/api/auth/token-list', method: 'GET', headers: adminHeaders, category: 'Auth & Profile' },
        { path: '/api/user/transactions', method: 'GET', headers: adminHeaders, category: 'Transactions & Orders' },
        { path: '/api/user/financial-summary', method: 'GET', headers: adminHeaders, category: 'Transactions & Orders' },
        { path: '/api/user/tickets', method: 'GET', headers: adminHeaders, category: 'Support Tickets' },
        { path: '/api/games/status', method: 'GET', headers: adminHeaders, category: 'Games & Gamification' },
        { path: '/api/games/history', method: 'GET', headers: adminHeaders, category: 'Games & Gamification' },

        // --- 3. ADMIN MANAGEMENT ROUTES ---
        { path: '/api/admin/users', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/manual-orders', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/packages', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/coupons', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/tickets', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/menu-settings', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/payment-gateway', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/whatsapp-settings', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/referral-settings', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/ceirgo-display-settings', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/ceirgo-balance', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/ceirgo-deposit-providers', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/ceirgo-services', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/kmsp-balance', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/imei-service-status', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },
        { path: '/api/admin/deploy-status', method: 'GET', headers: adminHeaders, category: 'Admin Panel' },

        // --- 4. ACTION POST ROUTES (Verification of endpoint existence) ---
        { path: '/api/coupon/validate', method: 'POST', body: JSON.stringify({ code: 'TEST' }), headers: adminHeaders, category: 'Actions' },
        { path: '/api/coupons/claim', method: 'POST', body: JSON.stringify({ coupon_id: 'dummy' }), headers: adminHeaders, category: 'Actions' },
        { path: '/api/games/daily-checkin', method: 'POST', headers: adminHeaders, category: 'Actions' },
        { path: '/api/games/lucky-spin', method: 'POST', headers: adminHeaders, category: 'Actions' },
        { path: '/api/telegram/webhook', method: 'POST', headers: publicHeaders, category: 'Telegram Webhook' }
    ];

    for (const route of routesToTest) {
        try {
            const url = `${BASE_URL}${route.path}`;
            const res = await fetch(url, {
                method: route.method,
                headers: route.headers,
                body: route.body
            });

            // Assert: Endpoint must NOT return 404 Not Found
            assert.notStrictEqual(res.status, 404, `Route ${route.method} ${route.path} returned 404 NOT FOUND!`);
            
            console.log(`  ✔ PASS [${route.category}] ${route.method} ${route.path.split('?')[0]} -> HTTP ${res.status}`);
            passed++;
        } catch (e) {
            console.error(`  ❌ FAIL [${route.category}] ${route.method} ${route.path} -> ${e.message}`);
            failed++;
        }
    }

    // Cleanup session file
    try { fs.unlinkSync(sessionFilePath); } catch (e) { }

    console.log(`\n===============================================================`);
    console.log(`📊 ROUTE INTEGRITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===============================================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runRouteDistributionTests();
