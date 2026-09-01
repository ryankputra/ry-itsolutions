require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

async function runSecurityTests() {
    console.log(`\n========================================================================`);
    console.log(`🛡️  RUNNING AUTOMATED SECURITY HARDENING & WEB PROTECTION TESTS ON: ${BASE_URL}`);
    console.log(`========================================================================\n`);

    let passed = 0;
    let failed = 0;

    // 0. Setup Real Admin Session File
    const sessionId = `admin_sec_test_${Date.now()}`;
    const SECRET = process.env.SESSION_SECRET || 'ry-itsolutions-secret-key-2026';
    const cookieSignature = require('cookie-signature');
    const signedCookie = 's:' + cookieSignature.sign(sessionId, SECRET);
    const sessionDir = path.join(__dirname, '..', 'sessions');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const sessionFilePath = path.join(sessionDir, `${sessionId}.json`);
    const sessionPayload = {
        cookie: { originalMaxAge: 86400000, expires: new Date(Date.now() + 86400000).toISOString(), httpOnly: true, path: '/', sameSite: 'lax' },
        userId: 'user_1750832245659',
        __lastAccess: Date.now()
    };
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionPayload));

    // 1. TEST: Security Headers (Helmet Verification)
    try {
        console.log(`[TEST 1] Testing Security Headers (Helmet)...`);
        const res = await fetch(`${BASE_URL}/api/system-version`);
        const xFrameOptions = res.headers.get('x-frame-options');
        const xContentTypeOptions = res.headers.get('x-content-type-options');

        assert(xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN', `X-Frame-Options should be set (Got: ${xFrameOptions})`);
        assert.strictEqual(xContentTypeOptions, 'nosniff', `X-Content-Type-Options should be nosniff`);
        console.log(`  ✔ PASS - Helmet active: X-Frame-Options: ${xFrameOptions}, X-Content-Type-Options: ${xContentTypeOptions}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 1 FAILED:`, e.message);
        failed++;
    }

    // 2. TEST: Input Sanitization (XSS Stripping)
    try {
        console.log(`\n[TEST 2] Testing Input Sanitization (XSS Stripping)...`);
        const dirtyPayload = {
            code: "PROMO<script>alert('XSS')</script>",
            order_amount: 100000
        };
        const res = await fetch(`${BASE_URL}/api/coupon/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `connect.sid=${encodeURIComponent(signedCookie)}`,
                'x-internal-test-key': 'ry-internal-test-pass'
            },
            body: JSON.stringify(dirtyPayload)
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400, "Validation should reject invalid promo code with 400");
        assert(!JSON.stringify(data).includes('<script>'), "Response should never reflect script tags");
        console.log(`  ✔ PASS - Malicious XSS tag sanitized safely`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 2 FAILED:`, e.message);
        failed++;
    }

    // 3. TEST: Sensitive Endpoint Rate Limiting (Anti-Brute Force on /api/auth/login)
    try {
        console.log(`\n[TEST 3] Testing Rate Limiting (Brute Force Simulation on /api/auth/login)...`);
        let got429 = false;

        for (let i = 1; i <= 18; i++) {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Notice: NO x-internal-test-key so rate limiter triggers!
                },
                body: JSON.stringify({ email: `attacker_${i}@test.com`, password: 'wrong' })
            });

            if (res.status === 429) {
                got429 = true;
                console.log(`  ✔ PASS - Rate limit triggered at request #${i} -> HTTP 429 Too Many Requests`);
                break;
            }
        }

        assert(got429, "Rate limiter should have returned 429 Too Many Requests after burst login attempts");
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 3 FAILED:`, e.message);
        failed++;
    }

    // 4. TEST: CORS Origin Enforcement
    try {
        console.log(`\n[TEST 4] Testing Strict CORS Policy (Blocking Unauthorized Origins)...`);
        const unauthorizedOrigin = 'http://malicious-attacker-domain.xyz';
        const res = await fetch(`${BASE_URL}/api/system-version`, {
            headers: {
                'Origin': unauthorizedOrigin
            }
        });

        // Express CORS middleware either drops Access-Control-Allow-Origin or returns error
        const allowOriginHeader = res.headers.get('access-control-allow-origin');
        assert.notStrictEqual(allowOriginHeader, unauthorizedOrigin, "Unauthorized origin must NOT receive Access-Control-Allow-Origin permission");
        console.log(`  ✔ PASS - Unauthorized origin ${unauthorizedOrigin} blocked from CORS permissions`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 4 FAILED:`, e.message);
        failed++;
    }

    // 5. TEST: Sensitive Frontend Environment Keys Leakage Check
    try {
        console.log(`\n[TEST 5] Scanning Frontend for NEXT_PUBLIC_ Sensitive Key Leaks...`);
        const frontendDir = path.join(__dirname, '..', '..', 'frontend-v2');
        let leakedKeys = [];

        function scanDir(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.next') continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.startsWith('.env'))) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('NEXT_PUBLIC_TELEGRAM_BOT_TOKEN')) leakedKeys.push('NEXT_PUBLIC_TELEGRAM_BOT_TOKEN');
                    if (content.includes('NEXT_PUBLIC_CEIRGO_API_KEY')) leakedKeys.push('NEXT_PUBLIC_CEIRGO_API_KEY');
                    if (content.includes('NEXT_PUBLIC_KMSP_API_KEY')) leakedKeys.push('NEXT_PUBLIC_KMSP_API_KEY');
                    if (content.includes('NEXT_PUBLIC_BREVO_API_KEY')) leakedKeys.push('NEXT_PUBLIC_BREVO_API_KEY');
                }
            }
        }

        if (fs.existsSync(frontendDir)) {
            scanDir(frontendDir);
        }

        assert.strictEqual(leakedKeys.length, 0, `Detected sensitive keys leaked as NEXT_PUBLIC_: ${leakedKeys.join(', ')}`);
        console.log(`  ✔ PASS - Zero sensitive provider tokens exposed in frontend codebase`);
        passed++;
    } catch (e) {
        console.error(`  ❌ TEST 5 FAILED:`, e.message);
        failed++;
    }

    console.log(`\n========================================================================`);
    console.log(`📊 SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runSecurityTests();
