/**
 * Background Schedulers & Cron Jobs
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const { dbGet, dbAll, dbRun } = require('../config/db');
const { sseSend } = require('../middleware/auth');
const { sendTelegramNotification } = require('../telegramService');
const { getKmspAdminBalance } = require('../routes/transactions');
const { getEffectiveMaintenanceStatus } = require('../routes/auth');
const ceirgoClient = require('../ceirgoClient');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Reseller Retention Check
async function runResellerRetentionCheck() {
    // [RESELLER_FEATURE_FLAG: TEMPORARILY DISABLED AS A FUTURE PILLAR]
    const ENABLE_RESELLER_RETENTION = false;
    if (!ENABLE_RESELLER_RETENTION) return;

    console.log('[Scheduler][ResellerRetention] Menjalankan cek retention reseller pada', new Date().toISOString());
    const downgraded = [];
    try {
        const resellers = await dbAll("SELECT id, name, email, upgradedToResellerAt FROM users WHERE role = 'reseller'");
        for (const r of resellers) {
            if (!r.upgradedToResellerAt) continue;
            const upgradedAt = new Date(r.upgradedToResellerAt);
            const nowDate = new Date();
            const monthsDiff = (nowDate.getFullYear() - upgradedAt.getFullYear()) * 12 + (nowDate.getMonth() - upgradedAt.getMonth());
            if (monthsDiff < 0) continue;

            const getWindowStartForOffset = (offset) => {
                const baseMonth = upgradedAt.getMonth() + offset;
                const year = upgradedAt.getFullYear() + Math.floor(baseMonth / 12);
                const month = ((baseMonth % 12) + 12) % 12;
                const desiredDay = upgradedAt.getDate();
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                const day = Math.min(desiredDay, lastDayOfMonth);
                return new Date(year, month, day, upgradedAt.getHours(), upgradedAt.getMinutes(), upgradedAt.getSeconds(), upgradedAt.getMilliseconds());
            };

            const windowStart = getWindowStartForOffset(monthsDiff);
            const windowEnd = getWindowStartForOffset(monthsDiff + 1);
            const windowStartISO = windowStart.toISOString();
            const windowEndISO = windowEnd.toISOString();

            const row = await dbGet("SELECT COUNT(*) as cnt FROM transactions WHERE userId = ? AND status = 'success' AND createdAt >= ? AND createdAt < ?", [r.id, windowStartISO, windowEndISO]);
            const cnt = row?.cnt || 0;

            if (cnt < 5) {
                await dbRun("UPDATE users SET role = 'user', upgradedToResellerAt = NULL WHERE id = ?", [r.id]);
                downgraded.push({
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    purchasesInWindow: cnt,
                    windowStart: windowStartISO,
                    windowEnd: windowEndISO
                });

                const startFmt = windowStart.toLocaleDateString('id-ID');
                const endFmt = windowEnd.toLocaleDateString('id-ID');
                const nowFmt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

                await sendTelegramNotification(
                    `<b>⚠️ Reseller Diturunkan</b>\n──────────────────────\nHalo <b>${r.name}</b>,\nPeran <b>Reseller</b> Anda dikembalikan menjadi <b>User</b>.\nAlasan: Hanya <b>${cnt}</b> pembelian pada periode <b>${startFmt}</b> — <b>${endFmt}</b> (dibutuhkan ≥ 5).\nUntuk kembali menjadi Reseller, lakukan top up minimal Rp 50.000 atau capai 5 pembelian.\nWaktu: ${nowFmt}`, 'group');

                sseSend(r.id, 'role_change', { newRole: 'user', reason: 'Jumlah pembelian kurang dari 5 pada periode retensi.' });
            }
        }
    } catch (err) {
        console.error('[Scheduler][ResellerRetention] Error:', err);
    }
    return { downgraded, checkedAt: new Date().toISOString() };
}


// Gopay Merchant Partner Health Watchdog (Monitors GoPay session status every 10 minutes)
let lastGopayAlertTime = 0;
const GOPAY_ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between alerts

async function checkAdminGopayHealthWatchdog() {
    try {
        const gwRow = await dbGet("SELECT value FROM settings WHERE key IN ('payment_gateway', 'paymentGateway') ORDER BY key DESC");
        const activeGateway = gwRow ? gwRow.value : 'orkut';
        if (activeGateway !== 'gopay') return; // Only alert if admin chose GoPay as active gateway

        const gopayGatewayUrl = process.env.GOPAY_GATEWAY_URL || 'http://127.0.0.1:3002';
        const apiKey = process.env.GOPAY_GATEWAY_API_KEY || 'ryy-gopay-secret-key-2026';

        const res = await fetch(`${gopayGatewayUrl}/api/session-info`, {
            headers: { 'x-api-key': apiKey },
            timeout: 8000
        });
        const data = await res.json();
        const isHealthy = data && data.success && data.data?.token_status === 'valid';

        if (!isHealthy) {
            const now = Date.now();
            if (now - lastGopayAlertTime > GOPAY_ALERT_COOLDOWN_MS) {
                lastGopayAlertTime = now;
                const statusMsg = data?.data?.message || 'Sesi belum login / Server habis reboot';
                console.warn(`[Watchdog] Sesi GoPay Merchant Admin terputus (${statusMsg})! Mengirim alert ke Telegram & WA Admin...`);

                // 1. Alert to Telegram Admin
                const alertHtml = 
                    `⚠️ <b>PERINGATAN DARURAT: SESI GOPAY MERCHANT TERPUTUS!</b>
` +
                    `━━━━━━━━━━━━━━━━━━━━━━
` +
                    `Status Sesi: <b>${statusMsg}</b>
` +
                    `Pelanggan tidak bisa melakukan top-up otomatis via GoPay saat ini.

` +
                    `👉 <b>Tindakan:</b> Silakan buka Admin Panel di bawah untuk login OTP instan:
` +
                    `https://ry-itsolutionts.web.id/admin`;

                try {
                    await sendTelegramNotification(alertHtml);
                } catch (tgErr) {
                    console.error('[Watchdog TG Error]', tgErr.message);
                }

                // 2. Alert to WhatsApp Admin
                try {
                    const waBot = require('../services/waBot');
                    const adminPhones = await waBot.getAdminPhoneNumbers();
                    const waMsg = 
                        `⚠️ *PERINGATAN DARURAT: SESI GOPAY TERPUTUS*

` +
                        `Status: *${statusMsg}*
` +
                        `Pelanggan tidak dapat top-up saldo via GoPay saat ini.

` +
                        `Silakan segera buka Dashboard Admin Panel untuk kirim OTP login GoBiz:
` +
                        `👉 https://ry-itsolutionts.web.id/admin`;

                    for (const p of adminPhones) {
                        await waBot.sendTextMessage(p, waMsg);
                    }
                } catch (waErr) {
                    console.error('[Watchdog WA Error]', waErr.message);
                }
            }
        }
    } catch (e) {
        // gopay-gateway service might be unreachable
        const now = Date.now();
        if (now - lastGopayAlertTime > GOPAY_ALERT_COOLDOWN_MS) {
            lastGopayAlertTime = now;
            console.error('[Watchdog Gopay Gateway Unreachable]', e.message);
            try {
                await sendTelegramNotification(
                    `⚠️ <b>PERINGATAN: SERVICE GOPAY GATEWAY (PORT 3002) TIDAK MERESPON!</b>
` +
                    `Penyebab: <code>${e.message}</code>
` +
                    `Silakan periksa service di VPS via <code>pm2 status</code>.`
                );
            } catch (tgErr) {}
        }
    }
}

function initSchedulers() {
    // Watchdog GoPay Health (Tiap 10 Menit)
    cron.schedule('*/10 * * * *', async () => {
        await checkAdminGopayHealthWatchdog();
    });

    // 1. Check Balance & Process Queue every minute
    cron.schedule('*/1 * * * *', async () => {
        try {
            const currentBalance = await getKmspAdminBalance();
            await dbRun("UPDATE settings SET value = ? WHERE key = 'lastKmspBalance'", [currentBalance.toString()]);
            const isCurrentlyMaintenance = await getEffectiveMaintenanceStatus();

            const pendingTransactions = await dbAll("SELECT * FROM transactions WHERE status = 'menunggu_saldo_provider'");
            if (pendingTransactions.length > 0 && !isCurrentlyMaintenance) {
                console.log(`[Scheduler] Ditemukan ${pendingTransactions.length} transaksi tertunda untuk diproses.`);
            }
        } catch (error) {
            console.error('[Scheduler] Error:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    // 2. Schedule monthly reseller retention check (1st of month at 00:05)
    cron.schedule('5 0 1 * *', async () => {
        try { await runResellerRetentionCheck(); } catch (e) { console.error('Monthly retention job failed:', e); }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });

    // 3. Auto database backup (every 3 hours)
    cron.schedule('0 6,9,12,15,18,21,0,3 * * *', async () => {
        const backupDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const date = new Date();
        const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
        const backupFileName = `webRyyStoreBackup-${timestamp}.sqlite`;
        const backupFilePath = path.join(backupDir, backupFileName);

        try {
            fs.copyFileSync(DB_PATH, backupFilePath);
            console.log(`[Backup] Database berhasil di-backup secara lokal ke: ${backupFileName}`);

            if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID) {
                const form = new FormData();
                form.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
                form.append('document', fs.createReadStream(backupFilePath), backupFileName);
                form.append('caption', `✅ Backup Database Otomatis Berhasil\nFile: ${backupFileName}\nWaktu: ${date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
                    method: 'POST',
                    body: form,
                    timeout: 30000
                });
            }
        } catch (error) {
            console.error('[Backup] Gagal saat membuat backup database:', error.message);
        }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });

    // 4. Auto-poll processing CeirGO transactions (every 2 minutes)
    cron.schedule('*/2 * * * *', async () => {
        try {
            const apiKey = process.env.CEIRGO_API_KEY;
            if (!apiKey) return;

            const processingOrders = await dbAll("SELECT * FROM transactions WHERE service_type = 'ceir' AND status = 'processing' AND accessToken IS NOT NULL LIMIT 10");
            for (const order of processingOrders) {
                try {
                    const ceirRes = await ceirgoClient.getOrderDetail(order.accessToken || order.id);
                    if (ceirRes.status && ceirRes.data) {
                        const ceirData = ceirRes.data;
                        const remoteStatus = (ceirData.status || ceirData.order_status || '').toLowerCase();

                        if (remoteStatus === 'success' || remoteStatus === 'completed' || remoteStatus === 'succeeded') {
                            const note = typeof ceirData.result === 'string' ? ceirData.result : (ceirData.note || 'Sukses diverifikasi dari CeirGO');
                            await dbRun("UPDATE transactions SET status = 'success', admin_note = ?, api_response = ? WHERE id = ?",
                                [note, JSON.stringify(ceirData.result || ceirData), order.id]);
                            sseSend(order.userId, 'transaction_update', { id: order.id, status: 'success', note });
                            try {
                                const { processReferralReward } = require('../services/referralService');
                                processReferralReward(order.id).catch(() => {});
                            } catch (e) {}
                        } else if (remoteStatus === 'failed' || remoteStatus === 'cancelled' || remoteStatus === 'rejected') {
                            const reason = ceirData.reason || ceirData.error || 'Gagal dari server CeirGO';
                            await dbRun("UPDATE transactions SET status = 'failed', admin_note = ?, api_response = ? WHERE id = ?",
                                [reason, JSON.stringify(ceirData.result || ceirData), order.id]);
                            // Auto-refund user balance
                            const refundAmount = Number(order.platformFee || order.originalPrice || 0);
                            if (refundAmount > 0) {
                                await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, order.userId]);
                            }
                            sseSend(order.userId, 'transaction_update', { id: order.id, status: 'failed', reason, refunded: refundAmount });
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.error('[Scheduler][CeirgoPoll] Error:', e.message);
        }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });
}

module.exports = {
    initSchedulers,
    runResellerRetentionCheck
};
