const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// 1. Remove Ceirgo Deposit functions and add Ceirgo Order function
const startIdx = c.indexOf('// --- CEIRGO GATEWAY ---');
const endIdx = c.indexOf('async function generateDynamicQris');

if (startIdx !== -1 && endIdx !== -1) {
    const ceirgoOrderFunc = `// --- CEIRGO GATEWAY API (UNTUK ORDER, BUKAN DEPOSIT) ---
async function orderCeirgo(serviceCode, imei) {
    if (!CEIRGO_API_KEY) throw new Error("CEIRGO_API_KEY tidak dikonfigurasi di .env");
    
    try {
        const response = await axios.post(\`\${CEIRGO_BASE_URL}/api/order\`, {
            code: serviceCode,
            data: { imeis: [imei] }
        }, {
            headers: { 
                'Authorization': \`Bearer \${CEIRGO_API_KEY}\`, 
                'Content-Type': 'application/json' 
            },
            timeout: 20000
        });

        if (response.data?.status === 'success' || response.data?.status === 'pending') {
            return response.data; // Kembalikan response lengkap
        }
        
        throw new Error(response.data?.message || 'Gagal memproses order CEIRGO.');
    } catch (error) {
        console.error(\`[CEIRGO_ORDER_ERROR]\`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Gagal menghubungi server CEIRGO.');
    }
}

`;
    c = c.substring(0, startIdx) + ceirgoOrderFunc + c.substring(endIdx);
}

// 2. Rollback the request-qris route to use only ORKUT and GoPay (remove ceirgo deposit option)
const requestQrisStart = c.indexOf('const ceirgoIfStatement');
if (requestQrisStart !== -1) {
    // We don't need to do this manually if we just find the actual router logic
    const reqQrisRouteStart = c.indexOf("if (activeGateway === 'ceirgo' && CEIRGO_API_KEY) {");
    const reqQrisRouteEnd = c.indexOf("} else if (useGopayGw) {");
    if (reqQrisRouteStart !== -1 && reqQrisRouteEnd !== -1) {
        c = c.substring(0, reqQrisRouteStart) + "if (useGopayGw) {" + c.substring(reqQrisRouteEnd + "} else if (useGopayGw) {".length);
    }
}

// 3. Modifikasi /api/order/manual agar hit CEIRGO API
const orderManualRegex = /const trxId = \`trx_m_\$\{Date\.now\(\)\}\`;[\s\S]*?res\.json\(\{ status: true, message: "Pesanan berhasil dibuat, menunggu proses admin\." \}\);/m;
const newOrderManual = `const trxId = \`trx_m_\${Date.now()}\`;
            const packageName = service_type === 'imei' ? \`Unblock IMEI (\${duration})\` : \`Cek CEIR (\${duration})\`;
            
            const imagePath = req.files && req.files['image'] ? \`/public/uploads/manual_orders/\${req.files['image'][0].filename}\` : null;
            const ceirImagePath = req.files && req.files['ceir_image'] ? \`/public/uploads/manual_orders/\${req.files['ceir_image'][0].filename}\` : null;

            let finalStatus = 'pending';
            let apiResponse = 'Selesai / Sedang Diproses Admin';
            let adminNote = null;
            let refId = null;

            // Jika layanan CEIR, otomatis tembak ke Ceirgo API
            if (service_type === 'ceir') {
                try {
                    const ceirgoServiceCode = price_key === 'price_ceir_register' ? 'cek_imei_beacukai' : 'cek_history_imei';
                    const ceirResponse = await orderCeirgo(ceirgoServiceCode, imei);
                    
                    refId = ceirResponse.reference_id || ceirResponse.order_id?.toString();
                    
                    if (ceirResponse.status === 'success') {
                        finalStatus = 'success';
                        
                        // Parse hasil
                        if (ceirgoServiceCode === 'cek_imei_beacukai') {
                            const resultItem = Array.isArray(ceirResponse.result) ? ceirResponse.result.find(r => r.imei === imei) : null;
                            const statusBeacukai = resultItem?.status || 'UNKNOWN';
                            adminNote = \`Status Beacukai: \${statusBeacukai}\`;
                            apiResponse = 'Berhasil otomatis dari CEIRGO';
                        } else {
                            // History CEIR
                            const resultItem = Array.isArray(ceirResponse.result) ? ceirResponse.result.find(r => r.imei === imei) : null;
                            if (resultItem && resultItem.history && resultItem.history.length > 0) {
                                adminNote = \`Ditemukan \${resultItem.history.length} riwayat CEIR.\`;
                            } else {
                                adminNote = "Tidak ada riwayat CEIR ditemukan.";
                            }
                            apiResponse = 'Berhasil otomatis dari CEIRGO';
                        }
                        
                    } else if (ceirResponse.status === 'pending') {
                        finalStatus = 'processing';
                        adminNote = "Pesanan sedang diproses oleh API CEIRGO...";
                    }
                } catch (e) {
                    console.error("[AUTO_CEIR_ERROR]", e);
                    // Jika gagal hit API, biarkan status pending agar admin yang proses manual (fallback)
                    adminNote = "Gagal auto-cek via API. Admin akan mengecek manual.";
                }
            }

            await dbRun(\`
                INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, paymentMethod, status, api_response, admin_note, kmspTrxId, createdAt, service_type, imei, user_image, user_image_ceir, speed_option)
                VALUES (?, ?, (SELECT name FROM users WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`, [trxId, req.session.userId, req.session.userId, price_key, packageName, price, price, '', 'balance', finalStatus, apiResponse, adminNote, refId, new Date().toISOString(), service_type, imei, imagePath, ceirImagePath, speed_option]);

            res.json({ status: true, message: finalStatus === 'success' ? "Pesanan otomatis berhasil diproses!" : "Pesanan berhasil dibuat, sedang diproses." });`;

c = c.replace(orderManualRegex, newOrderManual);

fs.writeFileSync('server.js', c);
console.log('Order manual successfully updated to use CEIRGO');
