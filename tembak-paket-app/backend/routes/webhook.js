const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const WEBHOOK_SECRET = process.env.AUTO_DEPLOY_SECRET || 'RyITSolutionsAutoDeploy2026';

function findRepoRoot() {
    const candidates = [
        path.resolve(__dirname, '../../../'),
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../'),
        process.cwd(),
        path.resolve(process.cwd(), '../')
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, '.git'))) {
            return dir;
        }
    }
    return process.cwd();
}

/**
 * POST /api/webhook/deploy
 * Public webhook endpoint for automated GitHub CI/CD deployments.
 * Authentication is enforced via secret query param: ?secret=RyITSolutionsAutoDeploy2026
 */
router.post(['/deploy', '/webhook/deploy'], (req, res) => {
    const providedSecret = req.query.secret || req.body?.secret || req.headers['x-webhook-secret'];

    if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
        return res.status(403).json({
            success: false,
            status: false,
            message: 'Forbidden: Secret token tidak valid atau tidak disertakan.'
        });
    }

    const repoRoot = findRepoRoot();

    // 1. Immediately return HTTP 200 JSON so GitHub webhook does not time out
    res.status(200).json({
        success: true,
        status: true,
        message: "Auto deploy triggered successfully!",
        repo_root: repoRoot,
        timestamp: new Date().toISOString()
    });

    // 2. Asynchronously execute git fetch, git reset, and pm2 restart
    setImmediate(() => {
        console.log(`\n==================================================`);
        console.log(`[WEBHOOK_DEPLOY] Auto deploy triggered by GitHub Webhook.`);
        console.log(`[WEBHOOK_DEPLOY] Working Directory: ${repoRoot}`);
        console.log(`==================================================`);

        const deployCmd = `git fetch --all && git reset --hard origin/main && (npm --prefix tembak-paket-app/backend install --omit=dev --no-audit || npm --prefix backend install --omit=dev --no-audit || true) && (pm2 restart all || pm2 restart frontend backend)`;

        exec(deployCmd, { cwd: repoRoot, shell: true }, (err, stdout, stderr) => {
            if (err) {
                console.error(`[WEBHOOK_DEPLOY] Deploy failed with error:`, err.message);
                if (stderr) console.error(`[WEBHOOK_DEPLOY] stderr:\n`, stderr);
                return;
            }
            console.log(`[WEBHOOK_DEPLOY] Deploy output:\n`, stdout);
            console.log(`[WEBHOOK_DEPLOY] Deploy Berhasil Tanpa Rebuild! Server telah diperbarui.`);
        });
    });
});

/**
 * GET /api/webhook/deploy
 * Health check / ping test endpoint for GitHub Webhook verification
 */
router.get(['/deploy', '/webhook/deploy'], (req, res) => {
    const providedSecret = req.query.secret || req.headers['x-webhook-secret'];
    if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Gunakan parameter ?secret=' + WEBHOOK_SECRET
        });
    }
    res.json({
        success: true,
        message: 'Webhook Auto Deploy endpoint aktif dan siap menerima payload POST dari GitHub.',
        repo_root: findRepoRoot(),
        configured_secret: WEBHOOK_SECRET
    });
});


/**
 * POST or GET /api/webhook/test-admin-wa
 * Test sending all admin notification types to both admin phone numbers
 */
router.all(["/test-admin-wa", "/webhook/test-admin-wa"], async (req, res) => {
    const providedSecret = req.query.secret || req.body?.secret || req.headers["x-webhook-secret"];
    if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
        return res.status(403).json({ success: false, message: "Forbidden: Invalid secret." });
    }

    try {
        const { getAdminPhoneNumbers, sendTextMessage } = require("../services/waBot");
        const adminPhones = await getAdminPhoneNumbers();
        const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

        const testMessages = [
            `*TEST 1: NOTIFIKASI PENGGUNA BARU (GOOGLE)*\n──────────────────────\n*Nama:* Ryan Test (Google)\n*Email:* test.google@ry-itsolutions.web.id\n*Metode:* Login via Google (Otomatis Aktif)\n*Waktu:* ${timeStr}\n──────────────────────\nPanel Admin: https://ry-itsolutionts.web.id/admin`,

            `*TEST 2: REGISTRASI PENGGUNA BARU (PENDING)*\n──────────────────────\n*Nama:* Pelanggan Test (Manual)\n*Email:* test.manual@ry-itsolutions.web.id\n*Metode:* Form Registrasi Web\n*Waktu:* ${timeStr}\n──────────────────────\nHarap tinjau & setujui akun ini di Panel Admin:\nhttps://ry-itsolutionts.web.id/admin`,

            `*TEST 3: PESANAN BARU MASUK*\n──────────────────────\n*Order ID:* \`RY-TEST-2026\`\n*Pelanggan:* Toko Ryan Pratama\n*Layanan:* Unblock IMEI 3 Bulan (All Operator)\n*IMEI:* \`354892018492019\`\n*Total Biaya:* Rp 150.000\n*Kecepatan:* Fast (1-3 Jam)\n──────────────────────\n*CARA CEPAT PROSES (BALAS PESAN INI):*\n• Ketik *1* atau *.proses* -> Mulai proses\n• Ketik *2* atau *.sukses* -> Selesaikan\n• Ketik *3* atau *.gagal* -> Tolak & refund\n──────────────────────`
        ];

        const results = [];
        for (const phone of adminPhones) {
            for (let i = 0; i < testMessages.length; i++) {
                const msg = testMessages[i];
                const sendRes = await sendTextMessage(phone, msg);
                results.push({ phone, testIndex: i + 1, result: sendRes });
                await new Promise(r => setTimeout(r, 600));
            }
        }

        res.json({
            success: true,
            timestamp: timeStr,
            adminPhones,
            results
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
