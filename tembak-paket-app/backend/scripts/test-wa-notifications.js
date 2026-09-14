/**
 * Script for Testing All WhatsApp Bot Messages
 * 
 * Target Customer: 085156692166
 * Target Admin: Admin numbers in database EXCLUDING numbers ending with 70 (e.g. excluding 6288706611370)
 */

const { dbAll, dbGet } = require("../config/db");
const { 
    sendTextMessage, 
    notifyNewOrder, 
    notifyCustomerOnStatusChange,
    getAdminPhoneNumbers
} = require("../services/waBot");

function cleanPhone(raw) {
    if (!raw) return "";
    let p = String(raw).replace(/\D/g, "");
    if (p.startsWith("0")) p = "62" + p.substring(1);
    else if (!p.startsWith("62")) p = "62" + p;
    return p;
}

async function runWaTest() {
    console.log("=================================================");
    console.log("🧪 MENJALANKAN UJI COBA PENGIRIMAN PESAN WHATSAPP");
    console.log("=================================================");

    const targetCustomerPhone = "085156692166";
    const cleanCustomer = cleanPhone(targetCustomerPhone);

    console.log(`📱 Nomor HP Pelanggan Target: ${cleanCustomer}`);

    // Get admin numbers from database and filter out numbers ending with '70'
    const rawAdmins = await getAdminPhoneNumbers();
    const testAdminPhones = rawAdmins.filter(num => {
        const cp = cleanPhone(num);
        return cp && !cp.endsWith("70");
    });

    console.log("👑 Nomor Admin Target (Pengecualian nomor berakhiran 70):", testAdminPhones);

    if (testAdminPhones.length === 0) {
        console.error("❌ Tidak ada nomor admin yang memenuhi syarat untuk testing.");
    }

    const testTimeStr = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const dummyOrderNumber = Math.floor(1000 + Math.random() * 9000);
    const mockOrderData = {
        id: `TEST-ORD-${dummyOrderNumber}`,
        userName: "Budi (Testing Pelanggan)",
        packageName: "Unblock IMEI 3 Bulan Garansi (Star Seller)",
        serviceType: "imei",
        imei: "351234161234567",
        price: 250000,
        speedOption: "fast",
        customerPhone: cleanCustomer,
        targetPhone: cleanCustomer
    };

    console.log("\n--- TEST 1: Pesan Selamat Datang & Status Bot ---");
    const testMsg1 = `*TESTING PESAN BOT RY-ITSOLUTIONS*\n` +
        `──────────────────────\n` +
        `Waktu Pengujian: ${testTimeStr} WIB\n` +
        `Target Pelanggan: ${cleanCustomer}\n` +
        `Status: Koneksi WhatsApp Bot Aktif & Terverifikasi.\n` +
        `──────────────────────\n` +
        `_Pesan pengujian ini dikirim untuk memastikan pesan diterima jernih tanpa kendala "Menunggu pesan ini"._`;

    console.log(`[Pelanggan] Mengirim Test 1 ke ${cleanCustomer}...`);
    const r1Cust = await sendTextMessage(cleanCustomer, testMsg1);
    console.log("Hasil Pelanggan Test 1:", r1Cust);

    for (const adminPhone of testAdminPhones) {
        console.log(`[Admin] Mengirim Test 1 ke Admin ${adminPhone}...`);
        const r1Admin = await sendTextMessage(adminPhone, testMsg1);
        console.log(`Hasil Admin (${adminPhone}) Test 1:`, r1Admin);
    }

    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- TEST 2: Notifikasi Pesanan Baru (Order Baru Masuk) ---");
    console.log("Mengirim notifikasi order baru ke Admin & Pelanggan...");
    try {
        await notifyNewOrder(mockOrderData);
        console.log("✅ Test 2: notifyNewOrder berhasil dieksekusi.");
    } catch (e) {
        console.error("❌ Test 2 Gagal:", e.message);
    }

    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- TEST 3: Notifikasi Status Order: Sedang Diproses (Processing) ---");
    const mockTrxProcessing = {
        id: mockOrderData.id,
        userName: mockOrderData.userName,
        packageName: mockOrderData.packageName,
        imei: mockOrderData.imei,
        targetPhone: cleanCustomer,
        customerPhone: cleanCustomer,
        userId: "user_test_123"
    };
    try {
        await notifyCustomerOnStatusChange(mockTrxProcessing, "processing", "Pesanan sedang dikerjakan server teknisi.");
        console.log("✅ Test 3: notifyCustomerOnStatusChange (processing) berhasil dieksekusi.");
    } catch (e) {
        console.error("❌ Test 3 Gagal:", e.message);
    }

    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- TEST 4: Notifikasi Status Order: Sukses / Sinyal On (Success) ---");
    const mockTrxSuccess = {
        ...mockTrxProcessing,
        platformFee: 250000,
        originalPrice: 250000
    };
    try {
        await notifyCustomerOnStatusChange(mockTrxSuccess, "success", "Sinyal telah aktif All Operator. Silakan restart HP Kakak!");
        console.log("✅ Test 4: notifyCustomerOnStatusChange (success) berhasil dieksekusi.");
    } catch (e) {
        console.error("❌ Test 4 Gagal:", e.message);
    }

    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- TEST 5: Notifikasi Status Order: Gateway API Key Subscription ---");
    const mockTrxGateway = {
        id: `TEST-GW-${dummyOrderNumber}`,
        userName: mockOrderData.userName,
        packageName: "Langganan QRIS Auto Gateway (30 Hari)",
        targetPhone: cleanCustomer,
        customerPhone: cleanCustomer,
        userId: "user_test_123"
    };
    try {
        await notifyCustomerOnStatusChange(mockTrxGateway, "success", "API Key Gateway QRIS telah aktif selama 30 hari.");
        console.log("✅ Test 5: Notifikasi Gateway (success) berhasil dieksekusi.");
    } catch (e) {
        console.error("❌ Test 5 Gagal:", e.message);
    }

    console.log("\n=================================================");
    console.log("🏁 PENGUJIAN PESAN BOT WHATSAPP SELESAI");
    console.log("=================================================");
    process.exit(0);
}

runWaTest().catch(err => {
    console.error("FATAL TEST ERROR:", err);
    process.exit(1);
});
