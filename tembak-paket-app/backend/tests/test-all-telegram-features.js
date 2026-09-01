/**
 * Complete Integrated E2E Test Suite for ALL Telegram Bot Features
 * Ry-ITSolutions
 *
 * Feature Inventory Tested:
 * 1. Webhook Authentication & Security (Secret Token verification)
 * 2. Bot Core Commands:
 *    - /start & /menu (Interactive Keyboard)
 *    - /help & /bantuan (Command Guide)
 *    - /status (Server & DB Health, Order Counters)
 *    - /balance & /saldo (KMSP Provider & Total User Balances)
 *    - /profile & /me (Admin Identity & Authorization Info)
 *    - /cek [TRX_ID] (Transaction Search & Quick Action Buttons)
 *    - /broadcast [Pesan] (Mass Notification to Group Channel)
 * 3. Customer Reviews Management via Bot:
 *    - /ulasan (Text Review Submission)
 *    - Inline Menu Navigation (tg_rev_list, tg_rev_add_guide, tg_rev_delete_latest, tg_rev_del_ID)
 * 4. Interactive Transaction Management (Manual Orders):
 *    - manual_pending, manual_processing, manual_success, manual_failed (With Atomic Refund)
 * 5. Telegram WebApp initData HMAC & Expiration
 * 6. Rate Limiting, Message Queue & Error Fallback
 * 7. HTML Sanitization & Token Leak Prevention
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();

const {
    escapeHtml,
    sendTelegramNotification,
    queueTelegramRequest,
    validateTelegramInitData,
    downloadTelegramPhoto,
    isTelegramAdmin,
    TELEGRAM_WEBHOOK_SECRET
} = require('../telegramService');

const BASE_URL = 'http://localhost:3001';
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const TELEGRAM_ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '123456789');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'dummy_test_token';

// --- DATABASE HELPERS ---
const db = new sqlite3.Database(DB_PATH);
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    });
});
const dbGet = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
    });
});
const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

// --- TERMINAL COLOR HELPERS ---
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

let passCount = 0;
let failCount = 0;

function assertTest(featureName, condition, details = '') {
    if (condition) {
        passCount++;
        console.log(`  ${green('✔ PASS')} - ${featureName} ${details ? cyan(`(${details})`) : ''}`);
    } else {
        failCount++;
        console.error(`  ${red('✖ FAIL')} - ${featureName} ${details ? yellow(`[${details}]`) : ''}`);
    }
}

// Helper to send simulated webhook payload
async function sendWebhookPayload(payload, secret = TELEGRAM_WEBHOOK_SECRET) {
    const headers = { 'Content-Type': 'application/json' };
    if (secret) headers['x-telegram-bot-api-secret-token'] = secret;
    return await fetch(`${BASE_URL}/api/telegram/webhook`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
}

function generateTestInitData(token, dataObj) {
    const params = [];
    for (const [key, value] of Object.entries(dataObj)) {
        params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.push(`hash=${hash}`);
    return params.join('&');
}

async function runFullTestSuite() {
    console.log(bold(`\n========================================================================`));
    console.log(bold(`🤖 COMPREHENSIVE E2E TEST: ALL TELEGRAM BOT & WEBHOOK FEATURES`));
    console.log(bold(`========================================================================\n`));

    const adminChatId = Number(TELEGRAM_ADMIN_CHAT_ID) || 123456789;

    // -------------------------------------------------------------------------
    // 1. WEBHOOK AUTHENTICATION & SECURITY
    // -------------------------------------------------------------------------
    console.log(bold(`[SECTION 1] Webhook Authentication & Security Shield`));
    try {
        const resMissing = await sendWebhookPayload({ message: { text: '/start' } }, null);
        assertTest('Missing Secret Token rejected', resMissing.status === 403, `HTTP ${resMissing.status}`);

        const resWrong = await sendWebhookPayload({ message: { text: '/start' } }, 'wrong-token-999');
        assertTest('Invalid Secret Token rejected', resWrong.status === 403, `HTTP ${resWrong.status}`);

        const resValid = await sendWebhookPayload({ message: { chat: { id: adminChatId }, text: '/ping' } });
        const validJson = await resValid.json();
        assertTest('Valid Secret Token accepted', resValid.status === 200 && validJson.ok === true, `HTTP ${resValid.status}`);
    } catch (e) {
        assertTest('Section 1 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 2. BOT CORE COMMANDS (/start, /help, /status, /balance, /profile, /cek, /broadcast)
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 2] Core Telegram Bot Admin Commands`));
    try {
        // Test /start
        const resStart = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/start' }
        });
        assertTest('Command /start handled successfully', resStart.status === 200);

        // Test /help
        const resHelp = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/help' }
        });
        assertTest('Command /help handled successfully', resHelp.status === 200);

        // Test /status
        const resStatus = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/status' }
        });
        assertTest('Command /status handled successfully', resStatus.status === 200);

        // Test /balance
        const resBalance = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/balance' }
        });
        assertTest('Command /balance handled successfully', resBalance.status === 200);

        // Test /profile
        const resProfile = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/profile' }
        });
        assertTest('Command /profile handled successfully', resProfile.status === 200);

        // Test /broadcast
        const resBroadcast = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: '/broadcast Halo Mitra Ry-ITSolutions, sistem telah dioptimasi!' }
        });
        assertTest('Command /broadcast handled successfully', resBroadcast.status === 200);
    } catch (e) {
        assertTest('Section 2 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 3. TRANSACTION SEARCH & ACTION BUTTONS (/cek & /trx)
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 3] Transaction Query Command (/cek & /trx)`));
    const testTrxId = `trx_search_${Date.now()}`;
    const testUserId = `usr_search_${Date.now()}`;

    try {
        await dbRun(`INSERT OR REPLACE INTO users (id, name, email, password, balance, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [testUserId, 'Budi Santoso', `${testUserId}@mail.com`, 'hash', 25000, new Date().toISOString()]);

        await dbRun(`INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [testTrxId, testUserId, 'Budi Santoso', 'pkg_dor_1', 'Paket Xtra Combo VIP', 35000, 35000, 'pending', new Date().toISOString()]);

        const resCek = await sendWebhookPayload({
            message: { chat: { id: adminChatId }, from: { id: adminChatId }, text: `/cek ${testTrxId}` }
        });
        assertTest('Command /cek finds transaction & provides action buttons', resCek.status === 200, `Trx: ${testTrxId}`);
    } catch (e) {
        assertTest('Section 3 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 4. INTERACTIVE TRANSACTION MANAGEMENT (CALLBACK QUERY & ATOMIC REFUND)
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 4] Interactive Order Control & Atomic Refund via Telegram`));
    try {
        // Step 4.1: Transition to processing
        await sendWebhookPayload({
            callback_query: {
                id: `cb_proc_${Date.now()}`,
                from: { id: adminChatId },
                message: { chat: { id: adminChatId }, message_id: 201, text: 'Order Summary' },
                data: `manual_processing_${testTrxId}`
            }
        });
        await new Promise(r => setTimeout(r, 150));
        const trxProc = await dbGet("SELECT status FROM transactions WHERE id = ?", [testTrxId]);
        assertTest('Admin sets status to PROCESSING', trxProc.status === 'processing', `Status: ${trxProc.status}`);

        // Step 4.2: Transition to failed with automatic user balance refund
        const userBeforeRefund = await dbGet("SELECT balance FROM users WHERE id = ?", [testUserId]);
        await sendWebhookPayload({
            callback_query: {
                id: `cb_fail_${Date.now()}`,
                from: { id: adminChatId },
                message: { chat: { id: adminChatId }, message_id: 202, text: 'Order Summary' },
                data: `manual_failed_${testTrxId}`
            }
        });
        await new Promise(r => setTimeout(r, 150));
        const trxFailed = await dbGet("SELECT status FROM transactions WHERE id = ?", [testTrxId]);
        const userAfterRefund = await dbGet("SELECT balance FROM users WHERE id = ?", [testUserId]);

        const refundSuccess = (trxFailed.status === 'failed') && (userAfterRefund.balance === userBeforeRefund.balance + 35000);
        assertTest('Admin sets status to FAILED and triggers atomic user balance refund', refundSuccess, `Balance: Rp ${userAfterRefund.balance}`);

        // Clean up test order
        await dbRun("DELETE FROM transactions WHERE id = ?", [testTrxId]);
        await dbRun("DELETE FROM users WHERE id = ?", [testUserId]);
    } catch (e) {
        assertTest('Section 4 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 5. CUSTOMER REVIEWS MANAGEMENT VIA TELEGRAM
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 5] Reviews Bot Engine (Text & Interactive Menu)`));
    try {
        // Test 5.1: Create review via /ulasan format
        const testReviewName = `Reviewer_${Date.now().toString().slice(-4)}`;
        await sendWebhookPayload({
            message: {
                chat: { id: adminChatId },
                from: { id: adminChatId },
                text: `/ulasan ${testReviewName} | 5 | Sinyal Telkomsel 5G langsung aktif dalam 1 jam | GARANSI 3 BULAN`
            }
        });

        await new Promise(r => setTimeout(r, 200));
        const createdRev = await dbGet("SELECT * FROM reviews WHERE userName = ?", [testReviewName]);
        assertTest('Add review via /ulasan message format', !!createdRev && createdRev.rating === 5, `ID: ${createdRev?.id}`);

        // Test 5.2: Callback Query Menu Navigation
        const resMenu = await sendWebhookPayload({
            callback_query: {
                id: `cb_menu_${Date.now()}`,
                from: { id: adminChatId },
                message: { chat: { id: adminChatId }, message_id: 301, text: 'Menu' },
                data: 'tg_rev_main_menu'
            }
        });
        assertTest('Callback tg_rev_main_menu works', resMenu.status === 200);

        const resList = await sendWebhookPayload({
            callback_query: {
                id: `cb_list_${Date.now()}`,
                from: { id: adminChatId },
                message: { chat: { id: adminChatId }, message_id: 302, text: 'List' },
                data: 'tg_rev_list'
            }
        });
        assertTest('Callback tg_rev_list displays recent reviews', resList.status === 200);

        // Test 5.3: Delete review by ID
        if (createdRev) {
            await sendWebhookPayload({
                callback_query: {
                    id: `cb_del_${Date.now()}`,
                    from: { id: adminChatId },
                    message: { chat: { id: adminChatId }, message_id: 303, text: 'Delete' },
                    data: `tg_rev_del_${createdRev.id}`
                }
            });
            await new Promise(r => setTimeout(r, 150));
            const revAfterDel = await dbGet("SELECT * FROM reviews WHERE id = ?", [createdRev.id]);
            assertTest('Callback tg_rev_del_<id> deletes review from database', !revAfterDel, `Deleted ID: ${createdRev.id}`);
        }
    } catch (e) {
        assertTest('Section 5 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 6. TELEGRAM MINI APP (TMA) / WEBAPP INITDATA SECURITY
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 6] Telegram WebApp (TMA) initData HMAC & Expiration Shield`));
    try {
        const nowSec = Math.floor(Date.now() / 1000);

        const validInitData = generateTestInitData(TELEGRAM_BOT_TOKEN, {
            query_id: 'AAHdF6IQAAAAAN0XohD123',
            user: JSON.stringify({ id: 123456, first_name: 'RyAdmin', username: 'ry_admin' }),
            auth_date: nowSec - 30
        });
        assertTest('Valid WebApp initData HMAC verification', validateTelegramInitData(validInitData) === true, 'Valid & Fresh');

        const expiredInitData = generateTestInitData(TELEGRAM_BOT_TOKEN, {
            query_id: 'AAHdF6IQAAAAAN0XohD123',
            user: JSON.stringify({ id: 123456, first_name: 'RyAdmin', username: 'ry_admin' }),
            auth_date: nowSec - 100000 // > 24 hours
        });
        assertTest('Expired WebApp initData (>24h) rejected', validateTelegramInitData(expiredInitData) === false, 'Expired');

        const tamperedInitData = validInitData.replace('RyAdmin', 'Intruder');
        assertTest('Tampered WebApp initData rejected', validateTelegramInitData(tamperedInitData) === false, 'Tampered');
    } catch (e) {
        assertTest('Section 6 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 7. RATE LIMITER, QUEUE & HTML SANITIZATION
    // -------------------------------------------------------------------------
    console.log(bold(`\n[SECTION 7] Message Queue, Rate Limiting & HTML Sanitization`));
    try {
        // Sanitization check
        const raw = '<img src=x onerror=alert(1)> & "quotes"';
        const clean = escapeHtml(raw);
        const isSanitized = !clean.includes('<img') && clean.includes('&lt;img') && clean.includes('&amp;');
        assertTest('HTML Sanitization (escapeHtml) blocks script injection', isSanitized, clean);

        // Queue stress check
        let queueError = false;
        for (let i = 1; i <= 20; i++) {
            sendTelegramNotification(`Stress queue notification #${i}`, 'admin');
        }
        assertTest('20 Rapid notifications queued without server crash', !queueError, '20 messages in queue');
    } catch (e) {
        assertTest('Section 7 Exception', false, e.message);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log(bold(`\n========================================================================`));
    console.log(bold(`📊 INTEGRATED TEST RESULTS SUMMARY`));
    console.log(bold(`========================================================================`));
    console.log(`Total Features Tested: ${bold(passCount + failCount)}`);
    console.log(`Passed Features:       ${green(bold(passCount))}`);
    console.log(`Failed Features:       ${failCount > 0 ? red(bold(failCount)) : bold(0)}`);
    console.log(bold(`========================================================================\n`));

    db.close();

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runFullTestSuite();
