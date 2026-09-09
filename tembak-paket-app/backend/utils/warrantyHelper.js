/**
 * Warranty & Product Duration Helper
 * Accurately determines service type, duration, start date, expiry date,
 * and remaining warranty days calculated from the completion date (done date).
 */

function calculateTransactionWarranty(trx) {
    if (!trx) return null;

    const pkg = (trx.packageName || trx.package_name || "").toLowerCase();
    const serviceType = (trx.service_type || trx.serviceType || "").toLowerCase();

    const isTopUp = serviceType.includes("topup") || pkg.includes("top up") || pkg.includes("topup");
    const isGateway = serviceType === "gateway" || serviceType === "apikey" || pkg.includes("gateway") || pkg.includes("api key");
    const isCeir = serviceType === "ceir" || serviceType === "barcode" || pkg.includes("ceir") || pkg.includes("barcode") || (trx.packageId && (String(trx.packageId).startsWith("cek_") || String(trx.packageId).startsWith("create_")));
    const isImei = !isTopUp && !isGateway && !isCeir;

    // 1. TOP UP
    if (isTopUp) {
        return {
            hasWarranty: false,
            serviceKind: "topup",
            isPermanent: false,
            durationDays: null,
            durationLabel: "Saldo Akun",
            statusLabel: "Selesai (Saldo Masuk)",
            defaultSuccessNote: "Saldo berhasil ditambahkan ke akun Anda.",
            remainingDays: null
        };
    }

    // 2. PAYMENT GATEWAY / API KEY SUBSCRIPTION
    if (isGateway) {
        const doneDate = new Date(trx.updatedAt || trx.completedAt || trx.createdAt || Date.now());
        const expiryDate = new Date(doneDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const diffMs = expiryDate.getTime() - Date.now();
        const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const isActive = remainingDays > 0;

        return {
            hasWarranty: true,
            serviceKind: "gateway",
            isPermanent: false,
            durationDays: 30,
            durationMonths: 1,
            durationLabel: "30 Hari",
            startDate: doneDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            remainingDays,
            warrantyStatus: isActive ? "active" : "expired",
            statusLabel: isActive ? "Selesai (Langganan Aktif)" : "Selesai (Kedaluwarsa)",
            defaultSuccessNote: "Langganan API Key Gateway aktif (Masa aktif 30 hari)."
        };
    }

    // 3. CEIR / BARCODE CHECKING
    if (isCeir) {
        return {
            hasWarranty: false,
            serviceKind: "ceir",
            isPermanent: false,
            durationDays: null,
            durationLabel: "Non-Garansi (Pengecekan Data)",
            statusLabel: "Selesai (Verifikasi Sukses)",
            defaultSuccessNote: "Pengecekan CEIR / Barcode berhasil diselesaikan.",
            remainingDays: null
        };
    }

    // 4. UNBLOCK IMEI (WARRANTY DYNAMICALLY MATCHES PRODUCT DURATION)
    let durationMonths = 0;
    let isPermanent = false;

    if (pkg.includes("permanen") || pkg.includes("permanent") || pkg.includes("lifetime") || pkg.includes("seumur hidup")) {
        isPermanent = true;
    } else if (pkg.includes("12 bulan") || pkg.includes("1 tahun") || pkg.includes("12month") || pkg.includes("1year")) {
        durationMonths = 12;
    } else if (pkg.includes("6 bulan") || pkg.includes("6 month") || pkg.includes("6m")) {
        durationMonths = 6;
    } else if (pkg.includes("3 bulan") || pkg.includes("3 month") || pkg.includes("3m")) {
        durationMonths = 3;
    } else if (pkg.includes("2 bulan") || pkg.includes("2 month") || pkg.includes("2m")) {
        durationMonths = 2;
    } else if (pkg.includes("1 bulan") || pkg.includes("1 month") || pkg.includes("1m")) {
        durationMonths = 1;
    } else {
        const match = pkg.match(/(\d+)\s*bulan/i);
        if (match) {
            durationMonths = parseInt(match[1], 10);
        } else {
            durationMonths = 1;
        }
    }

    // Start date is strictly counted when order is done (completed/updatedAt)
    const doneDate = new Date(trx.updatedAt || trx.completedAt || trx.createdAt || Date.now());
    let expiryDate = null;
    let remainingDays = 0;
    let durationDays = 30;

    if (isPermanent) {
        durationDays = 9999;
        remainingDays = "Permanen";
    } else {
        durationDays = durationMonths * 30;
        expiryDate = new Date(doneDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const diffMs = expiryDate.getTime() - Date.now();
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const isActive = isPermanent || (typeof remainingDays === "number" && remainingDays > 0);
    const durText = isPermanent ? "Permanen" : `${durationMonths} Bulan (${durationDays} Hari)`;

    return {
        hasWarranty: true,
        serviceKind: "imei",
        isPermanent,
        durationDays,
        durationMonths,
        durationLabel: durText,
        startDate: doneDate.toISOString(),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        remainingDays,
        warrantyStatus: isActive ? "active" : "expired",
        statusLabel: isActive ? "Selesai (Garansi Sinyal Aktif)" : "Selesai (Garansi Habis)",
        defaultSuccessNote: `Pesanan berhasil diselesaikan oleh admin. Sinyal aktif. Garansi ${durText} terhitung sejak status selesai.`
    };
}

module.exports = {
    calculateTransactionWarranty
};
