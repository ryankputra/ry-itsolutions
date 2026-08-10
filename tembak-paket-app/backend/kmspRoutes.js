const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const kmspRoutes = express.Router();

// Ini akan diinject dari server.js
let dbGet, dbRun, isAuthenticated, KMSP_API_KEY, kmspBalanceCache, CACHE_DURATION_MS, sendTelegramNotification, getEffectiveMaintenanceStatus;

function setDependencies(deps) {
    ({ dbGet, dbRun, isAuthenticated, KMSP_API_KEY, kmspBalanceCache, CACHE_DURATION_MS, sendTelegramNotification, getEffectiveMaintenanceStatus } = deps);
}

// MODIFIKASI: Menggunakan sistem cache untuk mengurangi panggilan API
async function getKmspAdminBalanceInternal() {
    const now = Date.now();

    // 1. Cek apakah cache masih valid (belum kedaluwarsa)
    if (kmspBalanceCache.balance !== null && (now - kmspBalanceCache.lastChecked < CACHE_DURATION_MS)) {
        console.log("[CACHE] Menggunakan saldo KMSP dari cache.");
        return kmspBalanceCache.balance;
    }

    // 2. Jika cache tidak valid, lakukan panggilan API
    console.log("[API] Cache kedaluwarsa, mengambil saldo KMSP baru...");
    const url = `https://golang-openapi-panelaccountbalance-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`;
    try {
        const response = await fetch(url, { timeout: 15000 }); // Tambahkan timeout
        if (!response.ok) {
            // Jika status HTTP bukan 2xx, lempar error
            throw new Error(`KMSP API returned status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status && typeof data.data?.balance !== 'undefined') {
            const newBalance = parseFloat(data.data.balance);
            // 3. Simpan hasil baru ke cache
            kmspBalanceCache = {
                balance: newBalance,
                lastChecked: now
            };
            console.log(`[API] Saldo KMSP berhasil diperbarui: ${newBalance}`);
            return newBalance;
        } else {
            // Jika respons API tidak sesuai format, kembalikan nilai cache lama (jika ada) atau 0
            console.warn("Respons saldo KMSP tidak valid, menggunakan nilai lama (jika ada).");
            return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
        }
    } catch (error) {
        console.error("Error fetching KMSP balance:", error.message);
        // Jika gagal, kembalikan nilai cache terakhir agar aplikasi tidak crash
        return kmspBalanceCache.balance !== null ? kmspBalanceCache.balance : 0;
    }
}

// =======================================================
// RUTE KMSP
// =======================================================
kmspRoutes.get('/auth/me', isAuthenticated, async (req, res) => {
    try {
        const maintenanceMode = await getEffectiveMaintenanceStatus();
        if (!req.session.userId) return res.status(200).json({ status: true, user: null, maintenanceMode });

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        if (!user) {
            req.session.destroy(); res.clearCookie('connect.sid');
            return res.status(200).json({ status: true, user: null, maintenanceMode });
        }
        const providerBalance = await getKmspAdminBalanceInternal();
        const { password: _, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
        res.status(200).json({ status: true, user: userWithoutPassword, maintenanceMode, providerBalance });
    } catch (error) { console.error("Error in /api/auth/me:", error); res.status(500).json({ status: false, message: "Gagal mengambil data sesi." }); }
});


kmspRoutes.post('/auth/extend-session', isAuthenticated, async (req, res) => {
    const { phone, auth_id } = req.body;
    if (!phone || !auth_id) return res.status(400).json({ status: false, message: "Phone dan auth_id diperlukan." });
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terasosiasi dengan akun Anda." });

        const response = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=LOGIN_BY_ACCESS_TOKEN&auth_id=${auth_id}`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal memperpanjang sesi dari KMSP.');
        res.status(200).json({ status: true, message: "Sesi berhasil diperpanjang.", data: data.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

kmspRoutes.get('/auth/token-list', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || !user.verifiedPhone) return res.status(200).json({ status: true, data: [] });

        const response = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const data = await response.json();
        if (!response.ok || !data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Gagal mengambil daftar token dari KMSP.');
        const filteredTokens = data.data.filter(token => token.msisdn === user.verifiedPhone);
        res.status(200).json({ status: true, message: "Daftar token berhasil diambil.", data: filteredTokens });
    } catch (error) { console.error("Error fetching token list:", error); res.status(500).json({ status: false, message: error.message }); }
});

kmspRoutes.post('/phone/request-otp', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Parameter 'phone' diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-reqotp-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal meminta OTP dari provider.');
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

kmspRoutes.post('/phone/verify-otp', isAuthenticated, async (req, res) => {
    const { phone, auth_id, otp } = req.body;
    if (!phone || !auth_id || !otp) return res.status(400).json({ status: false, message: "Phone, auth_id, dan OTP diperlukan." });
    try {
        const user = await dbGet('SELECT savedPhones FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });

        const loginResponse = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP&auth_id=${auth_id}&otp=${otp}`);
        const loginData = await loginResponse.json();
        if (!loginResponse.ok || !loginData.status) throw new Error(loginData.message || 'Verifikasi OTP Gagal.');
        if (!loginData.data?.access_token) throw new Error('Gagal mendapatkan access token dari provider.');

        const savedPhones = user.savedPhones ? JSON.parse(user.savedPhones) : [];
        let updatedPhones = savedPhones.filter(p => p !== phone);
        updatedPhones.unshift(phone);
        updatedPhones = updatedPhones.slice(0, 5);

        await dbRun('UPDATE users SET verifiedPhone = ?, savedPhones = ? WHERE id = ?', [phone, JSON.stringify(updatedPhones), req.session.userId]);
        res.status(200).json({ status: true, message: "Nomor berhasil diverifikasi!", data: loginData.data });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

kmspRoutes.post('/phone/check-token', isAuthenticated, async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ status: false, message: "Token diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-quotadetails-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&access_token=${access_token}`);
        const data = await response.json();
        if (!response.ok || !data.status) {
            return res.status(200).json({ status: false, message: data.message || "Token tidak valid." });
        }
        res.status(200).json({ status: true, message: "Token valid." });
    } catch (error) { res.status(500).json({ status: false, message: "Gagal mengecek token." }); }
});

kmspRoutes.post('/purchase', isAuthenticated, async (req, res) => {
    const { packageId, phone, access_token, paymentMethod, ewallet_number, purchaseContext = 'paket-satuan' } = req.body;

    if (!packageId || !phone || !access_token || !paymentMethod) {
        return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });
    }

    let user;
    let pkg;
    let effectiveFee;
    const trxId = `trx_${Date.now()}_${uuidv4().slice(0, 4)}`;

    try {
        user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        pkg = await dbGet('SELECT * FROM packages WHERE package_code = ?', [packageId]);

        if (!user || user.verifiedPhone !== phone) return res.status(403).json({ status: false, message: "Nomor telepon ini tidak terverifikasi untuk akun Anda." });
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        const isBalancePayment = paymentMethod === 'balance';
        const fee = user.role === 'reseller' ? (pkg.reseller_fee || 0) : (pkg.platform_fee || 0);
        effectiveFee = isBalancePayment ? (pkg.original_price + fee) : fee;
        const platformFeeOnly = fee;

        if (user.balance < effectiveFee) {
            return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk membayar biaya Rp ${effectiveFee.toLocaleString()}.` });
        }

        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [effectiveFee, user.id]);

        const adminBalance = await getKmspAdminBalanceInternal();
        const packagePrice = pkg.original_price || 0;

        if (adminBalance < packagePrice) {
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, effectiveFee, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);

            sendTelegramNotification(
                `<b>⚠️ Saldo KMSP Kurang! (Paket OTP) ⚠️</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Meminta Paket:</b> ${pkg.name}
<b>Harga Provider:</b> Rp ${packagePrice.toLocaleString('id-ID')}
<b>Saldo KMSP Saat Ini:</b> Rp ${adminBalance.toLocaleString('id-ID')}
──────────────────────
Transaksi diantrekan. Mohon segera top up saldo KMSP Anda.`, 'admin');

            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan masuk antrean, akan diproses otomatis.", newBalance: updatedUser.balance });
        }

        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [trxId, user.id, user.name, packageId, pkg.name, platformFeeOnly, packagePrice, phone, access_token, paymentMethod, ewallet_number || null, new Date().toISOString(), 'processing', 'Menghubungi provider...']);

        const purchaseParams = {
            api_key: KMSP_API_KEY,
            package_code: pkg.package_code,
            phone,
            access_token,
            payment_method: paymentMethod,
            price_or_fee: pkg.original_price,
            ewallet_number: (paymentMethod.toUpperCase() === 'OVO' && ewallet_number) ? ewallet_number : ''
        };

        const purchaseResponse = await fetch(`https://golang-openapi-packagepurchase-xltembakservice.kmsp-store.com/v1?${new URLSearchParams(purchaseParams).toString()}`);
        const purchaseData = await purchaseResponse.json();

        const isIpaasSuccessCase = (purchaseData.message || '').includes("422 -> Failed call ipaas purchase") && purchaseContext === 'multi-paket';
        const isDorUlangFailure = purchaseContext === 'multi-paket' && (purchaseData.message || '').includes("Paket berhasil dibeli. Silakan cek kuotanya");
        const isProviderSuccess = ((purchaseResponse.ok && purchaseData.status) || isIpaasSuccessCase) && !isDorUlangFailure;

        if (isProviderSuccess) {
            let paymentDetails = null;
            if (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) {
                if (purchaseData.data.is_qris && purchaseData.data.qris_data?.qr_code) {
                    purchaseData.data.qris_data.qr_code_base64 = await qrcode.toDataURL(purchaseData.data.qris_data.qr_code);
                }
                paymentDetails = JSON.stringify(purchaseData.data);
            }

            await dbRun("UPDATE transactions SET status = ?, api_response = ?, kmspTrxId = ?, paymentDetails = ? WHERE id = ?", ['success', purchaseData.message || 'Sukses', purchaseData.data?.trx_id || null, paymentDetails, trxId]);

            const maskedPhone = phone.slice(0, 4) + '****' + phone.slice(-3);
            sendTelegramNotification(`<b>✅ Transaksi Paket Baru!</b>\n──────────────────────\n<b>Pengguna:</b> ${user.name}\n<b>Paket:</b> ${pkg.name}\n<b>Nomor:</b> ${maskedPhone}\n<b>Status: Sukses</b>`);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const successMessage = isIpaasSuccessCase ? "Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)" : (purchaseData.message || "Pembelian berhasil!");

            if (purchaseData.data && (purchaseData.data.is_qris || purchaseData.data.have_deeplink)) {
                return res.status(202).json({ status: true, message: "Pembayaran eksternal diperlukan.", payment_data: purchaseData.data, newBalance: finalUser.balance });
            }
            return res.status(200).json({ status: true, message: successMessage, newBalance: finalUser.balance });

        } else {
            await dbRun("UPDATE transactions SET status = 'failed', api_response = ? WHERE id = ?", [purchaseData.message || 'Gagal dari provider', trxId]);
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);

            sendTelegramNotification(
                `<b>❌ Transaksi Gagal (Fee Dikembalikan)</b>
──────────────────────
<b>Pengguna:</b> ${user.name}
<b>Paket:</b> ${pkg.name}
<b>Error:</b> <pre>${purchaseData.message || 'Unknown Error'}</pre>
──────────────────────
Saldo fee Rp ${effectiveFee.toLocaleString('id-ID')} telah dikembalikan.`);

            const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            const errorMessage = isDorUlangFailure ? "Gagal (Dor Ulang): Coba lagi setelah 10 menit." : (purchaseData.message || 'Pembelian gagal.');
            return res.status(500).json({ status: false, message: errorMessage, newBalance: finalUser.balance });
        }
    } catch (error) {
        console.error("Purchase route error:", error);
        if (user && pkg && typeof effectiveFee === 'number' && effectiveFee > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);
        }
        const finalUser = await dbGet('SELECT balance FROM users WHERE id = ?', [req.session.userId]);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan internal.", newBalance: finalUser?.balance });
    }
});

kmspRoutes.post('/purchase/non-otp', isAuthenticated, async (req, res) => {
    const { packageId, phone: targetPhone } = req.body;
    if (!packageId || !targetPhone) return res.status(400).json({ status: false, message: "Parameter tidak lengkap." });

    try {
        const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.session.userId]);
        const pkg = await dbGet("SELECT * FROM packages WHERE package_code = ?", [packageId]);
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        const isBalancePayment = req.body.paymentMethod === 'balance';
        const fee = user.role === 'reseller' ? (pkg.reseller_fee || 0) : (pkg.platform_fee || 0);
        const effectiveFee = isBalancePayment ? (pkg.original_price + fee) : fee;

        if (user.balance < effectiveFee) {
            return res.status(402).json({ status: false, message: `Saldo Anda (Rp ${user.balance.toLocaleString()}) tidak cukup untuk membayar biaya Rp ${effectiveFee.toLocaleString()}.` });
        }

        await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [effectiveFee, user.id]);

        const baseTransaction = { id: `trx_${Date.now()}`, userId: user.id, userName: user.name, packageId, packageName: pkg.name, platformFee: fee, originalPrice: pkg.original_price, targetPhone, paymentMethod: req.body.paymentMethod, ewalletNumber: req.body.ewallet_number || '', createdAt: new Date().toISOString() };
        const adminBalance = await getKmspAdminBalanceInternal();

        if (adminBalance < pkg.original_price) {
            await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'menunggu_saldo_provider', 'Menunggu Saldo Provider']);
            sendTelegramNotification(`<b>⚠️ Saldo KMSP Kurang! (Non-OTP)</b>\nPengguna: ${user.name}\nPaket: ${pkg.name}\nTransaksi diantrekan.`, 'admin');
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(202).json({ status: true, message: "Permintaan Anda masuk antrean.", newBalance: updatedUser.balance });
        }

        await dbRun('INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, ewalletNumber, createdAt, status, api_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...Object.values(baseTransaction), 'processing', 'Processing...']);
        const trxFromDb = await dbGet("SELECT * FROM transactions WHERE id = ?", [baseTransaction.id]);

        await executeNonOtpPurchase(trxFromDb);
        const finalTrx = await dbGet("SELECT status, api_response FROM transactions WHERE id = ?", [baseTransaction.id]);

        if (finalTrx.status !== 'success') {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, user.id]);
            const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
            return res.status(500).json({ status: false, message: finalTrx.api_response, newBalance: updatedUser.balance });
        }
        const updatedUser = await dbGet('SELECT balance FROM users WHERE id = ?', [user.id]);
        return res.status(200).json({ status: true, message: "Pembelian berhasil!", newBalance: updatedUser.balance });
    } catch (error) {
        console.error("Non-OTP Purchase route error:", error);
        if (user && typeof effectiveFee === 'number' && effectiveFee > 0) {
            await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [effectiveFee, req.session.userId]);
        }
        const updatedUser = await dbGet('SELECT balance FROM users WHERE users id = ?', [req.session.userId]);
        return res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan internal.", newBalance: updatedUser.balance });
    }
});

// Admin routes for non-OTP services
kmspRoutes.post('/admin/manual-service-order', isAuthenticated, isAdmin, async (req, res) => {
    const { userId, packageId, targetPhone, userImage, adminNote } = req.body;
    if (!userId || !packageId || !targetPhone) {
        return res.status(400).json({ status: false, message: "User ID, Package ID, dan Target Phone diperlukan." });
    }
    const trxId = `trx_${Date.now()}_ADMIN_${uuidv4().slice(0, 4)}`;

    try {
        const user = await dbGet("SELECT id, name FROM users WHERE id = ?", [userId]);
        const pkg = await dbGet("SELECT * FROM packages WHERE package_code = ?", [packageId]);

        if (!user) return res.status(404).json({ status: false, message: "Pengguna target tidak ditemukan." });
        if (!pkg) return res.status(404).json({ status: false, message: "Paket tidak ditemukan." });

        await dbRun(`INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, service_type, user_image, admin_note, createdAt, status, paymentMethod) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [trxId, user.id, user.name, packageId, pkg.name, 0, 0, targetPhone, 'manual', userImage || null, adminNote || null, new Date().toISOString(), 'processing', 'admin_manual']
        );
        sendTelegramNotification(`<b>🛠️ Admin Membuat Pesanan Manual</b>\n──────────────────────\n<b>Admin:</b> ${req.session.userName || 'Admin'}\n<b>Untuk User:</b> ${user.name}\n<b>Paket:</b> ${pkg.name}\n<b>Nomor/Target:</b> ${targetPhone}`);
        res.json({ status: true, message: "Pesanan manual berhasil dibuat.", transactionId: trxId });
    } catch (error) {
        console.error("Admin Manual Service Order Error:", error);
        res.status(500).json({ status: false, message: "Gagal membuat pesanan manual." });
    }
});

kmspRoutes.post('/admin/update-manual-service-status', isAuthenticated, isAdmin, async (req, res) => {
    const { transactionId, status, adminNote, adminImage, userImageCeir, speedOption } = req.body;
    if (!transactionId || !status) {
        return res.status(400).json({ status: false, message: "Transaction ID dan Status diperlukan." });
    }

    try {
        const transaction = await dbGet("SELECT id, userId, userName, packageName, targetPhone FROM transactions WHERE id = ?", [transactionId]);
        if (!transaction) return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan." });

        let updateQuery = "UPDATE transactions SET status = ?";
        const updateParams = [status];

        if (adminNote) { updateQuery += ", admin_note = ?"; updateParams.push(adminNote); }
        if (adminImage) { updateQuery += ", admin_image = ?"; updateParams.push(adminImage); }
        if (userImageCeir) { updateQuery += ", user_image_ceir = ?"; updateParams.push(userImageCeir); }
        if (speedOption) { updateQuery += ", speed_option = ?"; updateParams.push(speedOption); }

        updateQuery += " WHERE id = ?";
        updateParams.push(transactionId);

        await dbRun(updateQuery, updateParams);

        if (status === 'success') {
            sendTelegramNotification(`<b>✅ Status Pesanan Manual Diperbarui</b>\n──────────────────────\n<b>Admin:</b> ${req.session.userName || 'Admin'}\n<b>Untuk User:</b> ${transaction.userName}\n<b>Paket:</b> ${transaction.packageName}\n<b>Target:</b> ${transaction.targetPhone}\n<b>Status: SUKSES</b>`);
        } else if (status === 'failed') {
            sendTelegramNotification(`<b>❌ Status Pesanan Manual Diperbarui</b>\n──────────────────────\n<b>Admin:</b> ${req.session.userName || 'Admin'}\n<b>Untuk User:</b> ${transaction.userName}\n<b>Paket:</b> ${transaction.packageName}\n<b>Target:</b> ${transaction.targetPhone}\n<b>Status: GAGAL</b>`);
        }

        res.json({ status: true, message: "Status pesanan manual berhasil diperbarui." });
    } catch (error) {
        console.error("Admin Update Manual Service Status Error:", error);
        res.status(500).json({ status: false, message: "Gagal memperbarui status pesanan manual." });
    }
});

module.exports = { kmspRoutes, setDependencies, getKmspAdminBalanceInternal };
