/**
 * Database Cleanup Script:
 * 1. Backup database.sqlite
 * 2. Clear verifiedPhone & savedPhones for non-admin users created before 2026-01-01 (legacy pre-website users)
 * 3. Clear targetPhone in transactions created before 2026-01-01
 * 4. Sync verifiedPhone for active 2026 customers who placed orders
 * 5. Verify and display the clean recipient list
 */
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const dbPath = process.argv[2] || path.join(__dirname, "../database.sqlite");
console.log("Using DB:", dbPath);

if (!fs.existsSync(dbPath)) {
    console.error("Database not found:", dbPath);
    process.exit(1);
}

// 1. Backup
const backupPath = `${dbPath}.bak_clean_${Date.now()}`;
fs.copyFileSync(dbPath, backupPath);
console.log("✅ Database backed up to:", backupPath);

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function cleanPhone(raw) {
    if (!raw) return "";
    const str = String(raw).trim();
    if (str.includes("@")) return "";
    let p = str.replace(/\D/g, "");
    if (!p || p.length < 8) return "";
    if (p.startsWith("0")) p = "62" + p.substring(1);
    else if (!p.startsWith("62")) p = "62" + p;
    return p;
}

function isValidIndonesianMobile(phone) {
    if (!phone) return false;
    const clean = cleanPhone(phone);
    return /^628\d{7,11}$/.test(clean);
}

async function clean() {
    console.log("--- Starting Cleanup ---");

    // 2. Count before
    const usersBefore = await all("SELECT count(*) as cnt FROM users WHERE verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ''");
    console.log("Users with verifiedPhone before:", usersBefore[0].cnt);

    // 3. Clear legacy 2025 non-admin users
    const resUsers = await run(
        "UPDATE users SET verifiedPhone = NULL, savedPhones = '[]' WHERE createdAt < '2026-01-01' AND role != 'admin' AND id != 'user_1750832245659'"
    );
    console.log(`✅ Cleared ${resUsers.changes} legacy pre-2026 users.`);

    // 4. Clear legacy 2025 transaction phone numbers
    const resTrx = await run(
        "UPDATE transactions SET targetPhone = NULL WHERE createdAt < '2026-01-01'"
    );
    console.log(`✅ Cleared ${resTrx.changes} legacy pre-2026 transaction targetPhones.`);

    // 5. Backfill/Sync 2026 customers who ordered
    const orders2026 = await all(
        "SELECT DISTINCT userId, targetPhone FROM transactions WHERE createdAt >= '2026-01-01' AND targetPhone IS NOT NULL AND TRIM(targetPhone) != '' ORDER BY createdAt DESC"
    );
    console.log("Active 2026 customer orders found:", orders2026.length);

    for (const order of orders2026) {
        const c = cleanPhone(order.targetPhone);
        if (c && isValidIndonesianMobile(c) && order.userId) {
            await run(
                "UPDATE users SET verifiedPhone = ? WHERE id = ? AND (verifiedPhone IS NULL OR verifiedPhone = '')",
                [c, order.userId]
            );
            console.log(`   → Synced customer ${order.userId} phone: ${c}`);
        }
    }

    // Explicitly check NOORA STORE and Aloysiawan
    await run("UPDATE users SET verifiedPhone = '6285746820272' WHERE id = 'user_1789182127441'");
    await run("UPDATE users SET verifiedPhone = '6285156692166' WHERE id = 'user_1785735054293'");

    // 6. Verification
    const activeUsers = await all(
        "SELECT id, name, email, verifiedPhone, createdAt FROM users WHERE verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ''"
    );
    console.log("\n=== ACTIVE VERIFIED USERS AFTER CLEANUP ===");
    console.table(activeUsers);

    // Test recipient resolution
    const targetPhones = new Set();
    const admins = await all("SELECT verifiedPhone FROM users WHERE role = 'admin'");
    admins.forEach(a => {
        const c = cleanPhone(a.verifiedPhone);
        if (c && isValidIndonesianMobile(c)) targetPhones.add(c);
    });

    const activeTrxPhones = await all(
        "SELECT DISTINCT targetPhone FROM transactions WHERE createdAt >= '2026-01-01' AND targetPhone IS NOT NULL AND TRIM(targetPhone) != ''"
    );
    activeTrxPhones.forEach(t => {
        const c = cleanPhone(t.targetPhone);
        if (c && isValidIndonesianMobile(c)) targetPhones.add(c);
    });

    activeUsers.forEach(u => {
        const c = cleanPhone(u.verifiedPhone);
        if (c && isValidIndonesianMobile(c)) targetPhones.add(c);
    });

    console.log("\n=== CLEAN BROADCAST RECIPIENTS ===");
    console.log("Total Clean Recipients:", targetPhones.size);
    console.log(Array.from(targetPhones));

    db.close();
}

clean().catch(err => {
    console.error("Cleanup error:", err);
    process.exit(1);
});
