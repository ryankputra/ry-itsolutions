const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// 1. Tambah kolom ceirgoDepositId
c = c.replace(
    'try { await dbRun("ALTER TABLE topups ADD COLUMN gopayQrisId TEXT"); } catch (e) {}',
    'try { await dbRun("ALTER TABLE topups ADD COLUMN gopayQrisId TEXT"); } catch (e) {}\r\n            try { await dbRun("ALTER TABLE topups ADD COLUMN ceirgoDepositId TEXT"); } catch (e) {}'
);

// 2. Tambahkan Fungsi Ceirgo
const ceirgoFunctions = `// --- CEIRGO GATEWAY ---
async function createCeirgoDeposit(amount) {
    if (!CEIRGO_API_KEY) throw new Error("CEIRGO_API_KEY tidak dikonfigurasi.");
    try {
        const response = await axios.post(\`\${CEIRGO_BASE_URL}/api/deposit\`, {
            amount: amount,
            provider_code: "qris" // Default ke QRIS, bisa diganti gopay/ovo/dana sesuai provider list Ceirgo
        }, {
            headers: { 'Authorization': \`Bearer \${CEIRGO_API_KEY}\`, 'Content-Type': 'application/json' },
            timeout: 15000
        });
        if (response.data && response.data.id) {
            return response.data; // { id, amounts: {total_pay}, qr_url, qr_string, expires_at }
        }
        throw new Error('Respons API Ceirgo tidak valid.');
    } catch (error) {
        console.error(\`[CEIRGO_CREATE_ERROR]\`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Gagal membuat deposit Ceirgo.');
    }
}

async function checkCeirgoPaymentStatus(topUpId, ceirgoDepositId) {
    if (!CEIRGO_API_KEY) return;
    const maxDurationMs = 15 * 60 * 1000;
    const interval = 10000; // 10 detik

    const pollingLoop = async () => {
        try {
            const topUp = await dbGet("SELECT * FROM topups WHERE id = ?", [topUpId]);
            if (!topUp || topUp.status !== 'pending') { qrisPollingTimeouts.delete(topUpId); return; }
            
            const timeElapsed = Date.now() - new Date(topUp.createdAt).getTime();
            if (timeElapsed >= maxDurationMs) {
                await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [topUpId]);
                qrisPollingTimeouts.delete(topUpId);
                return;
            }

            console.log(\`[CEIRGO_POLL] Cek status deposit ID: \${ceirgoDepositId}\`);
            const response = await axios.get(\`\${CEIRGO_BASE_URL}/api/deposit/\${ceirgoDepositId}\`, {
                headers: { 'Authorization': \`Bearer \${CEIRGO_API_KEY}\` },
                timeout: 10000
            });

            if (response.data?.data?.status === 'succeeded') {
                await dbRun("BEGIN TRANSACTION");
                const result = await dbRun("UPDATE topups SET status = 'completed' WHERE id = ? AND status = 'pending'", [topUpId]);
                
                if (result.changes > 0) {
                    const user = await dbGet("SELECT id, name, email, role FROM users WHERE id = ?", [topUp.userId]);
                    await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [topUp.baseAmount, user.id]);
                    
                    if (user.role !== 'reseller' && topUp.baseAmount >= 50000) {
                        await dbRun("UPDATE users SET role = 'reseller', upgradedToResellerAt = ? WHERE id = ?", [new Date().toISOString(), user.id]);
                        sseSend(user.id, 'role_change', { newRole: 'reseller', reason: 'Upgrade otomatis ke Reseller.' });
                    }
                    await dbRun("COMMIT");
                    
                    const updatedUser = await dbGet("SELECT balance FROM users WHERE id = ?", [user.id]);
                    sseSend(user.id, 'balance_update', { balance: updatedUser.balance, source: 'ceirgo_topup' });
                    sseSend(user.id, 'transaction_status', { id: topUpId, type: 'topup', status: 'completed', message: 'Top up via Ceirgo berhasil!' });
                    
                    sendTelegramNotification(\`<b>💰 Top Up Berhasil (Ceirgo)!</b>\\n<b>User:</b> \${user.name}\\n<b>Jumlah:</b> Rp \${topUp.baseAmount.toLocaleString('id-ID')}\\n<b>Deposit ID:</b> <code>\${ceirgoDepositId}</code>\`);
                } else {
                    await dbRun("ROLLBACK");
                }
                qrisPollingTimeouts.delete(topUpId);
                return;
            } else if (response.data?.data?.status === 'failed' || response.data?.data?.status === 'cancelled' || response.data?.data?.status === 'expired') {
                await dbRun("UPDATE topups SET status = 'expired' WHERE id = ?", [topUpId]);
                qrisPollingTimeouts.delete(topUpId);
                return;
            }

        } catch (error) {
            console.error(\`[CEIRGO_POLL_ERROR] \${topUpId}:\`, error.message);
        }
        qrisPollingTimeouts.set(topUpId, setTimeout(pollingLoop, interval));
    };
    if (!qrisPollingTimeouts.has(topUpId)) qrisPollingTimeouts.set(topUpId, setTimeout(pollingLoop, 5000));
}

async function generateDynamicQris`;

c = c.replace('async function generateDynamicQris', ceirgoFunctions);

// 3. Tambahkan ke endpoint request-qris
const requestQrisRegex = /if \(useGopayGw\) \{[\s\S]*?\} else \{/m;
const ceirgoIfStatement = \`if (activeGateway === 'ceirgo' && CEIRGO_API_KEY) {
            // === CEIRGO GATEWAY MODE ===
            const ceirgoData = await createCeirgoDeposit(baseAmount);
            
            // Ceirgo mengembalikan URL QR dan String, jika ada string kita jadikan base64 agar seragam dengan UI frontend lama
            let finalQrisBase64 = "";
            if (ceirgoData.qr_string) {
                finalQrisBase64 = await qrcode.toDataURL(ceirgoData.qr_string);
            } else if (ceirgoData.qr_url) {
                finalQrisBase64 = ceirgoData.qr_url; // Kalau ini URL eksternal, frontend kita asumsikan img src bisa baca
            }

            await dbRun(
                "INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image, ceirgoDepositId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [topUpId, userId, user.name, baseAmount, ceirgoData.amounts.total_pay, 'pending', new Date().toISOString(), finalQrisBase64, ceirgoData.id]
            );

            checkCeirgoPaymentStatus(topUpId, ceirgoData.id);

            res.status(200).json({
                status: true,
                message: 'Silakan scan QRIS Ceirgo dan bayar sesuai nominal tepat.',
                topUpId,
                qrisData: {
                    base64Image: finalQrisBase64,
                    uniqueAmount: ceirgoData.amounts.total_pay,
                    expiresAt: ceirgoData.expires_at ? Math.floor(new Date(ceirgoData.expires_at).getTime() / 1000) : Math.floor((Date.now() + 15 * 60 * 1000) / 1000)
                }
            });

        } else if (useGopayGw) {\`;

c = c.replace(/if \(useGopayGw\) \{/m, ceirgoIfStatement);

fs.writeFileSync('server.js', c);
console.log('Ceirgo TopUp successfully added.');
