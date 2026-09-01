/**
 * Database Configuration & Initialization
 * SQLite3 with robust Promise wrappers (dbRun, dbGet, dbAll)
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("❌ Database connection error:", err.message);
    } else {
        console.log("✅ Successfully connected to SQLite database.");
    }
});

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

async function initializeDatabase() {
    db.serialize(async () => {
        try {
            await dbRun("PRAGMA foreign_keys = ON;");
            await dbRun(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, balance REAL DEFAULT 0, role TEXT DEFAULT 'user', upgradedToResellerAt TEXT, verifiedPhone TEXT, savedPhones TEXT, status TEXT DEFAULT 'pending', createdAt TEXT NOT NULL, resetPasswordToken TEXT, resetPasswordExpires INTEGER)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS packages (package_code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, original_price REAL DEFAULT 0, platform_fee REAL DEFAULT 0, reseller_fee REAL DEFAULT 0, isVisible INTEGER DEFAULT 0, category TEXT DEFAULT 'reguler', isMultiPurchase INTEGER DEFAULT 0, payment_methods TEXT, position INTEGER DEFAULT 0)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, packageId TEXT, packageName TEXT, platformFee REAL, originalPrice REAL, targetPhone TEXT, accessToken TEXT, paymentMethod TEXT, ewalletNumber TEXT, kmspTrxId TEXT, status TEXT NOT NULL, api_response TEXT, createdAt TEXT NOT NULL, paymentDetails TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS topups (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, baseAmount REAL NOT NULL, uniqueAmount REAL NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL, qrisBase64Image TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, message TEXT NOT NULL, createdAt TEXT NOT NULL)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS tutorialContent (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, content TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, position INTEGER DEFAULT 0)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

            // Default Settings
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceMode', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lowBalanceNotified', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('topupOptions', '[]')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lastKmspBalance', '0')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceScheduleEnabled', 'false')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceStartTime', '01:00')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceEndTime', '04:00')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('announcementBgColor', '#dc2626')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceNotificationSent', 'none')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('paymentGateway', 'orkut')`);

            // Manual & IMEI Columns
            try { await dbRun("ALTER TABLE transactions ADD COLUMN service_type TEXT DEFAULT 'reguler'"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN imei TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN user_image TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN admin_image TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN admin_note TEXT"); } catch (e) { }
            await dbRun(`CREATE TABLE IF NOT EXISTS imei_packages (id TEXT PRIMARY KEY, duration TEXT NOT NULL, price REAL NOT NULL)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, userId INTEGER, subject TEXT, status TEXT, createdAt TEXT, updatedAt TEXT)`);
            await dbRun(`CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticketId TEXT, senderId INTEGER, senderRole TEXT, message TEXT, createdAt TEXT)`);
            try { await dbRun("ALTER TABLE transactions ADD COLUMN user_image_ceir TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN speed_option TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN coupon_code TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE transactions ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (e) { }

            // Promo Coupons & Usages
            await dbRun(`CREATE TABLE IF NOT EXISTS coupons (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                discount_type TEXT NOT NULL,
                discount_value REAL NOT NULL,
                min_order_amount REAL DEFAULT 0,
                max_discount_amount REAL DEFAULT 0,
                max_usage_limit INTEGER DEFAULT 100,
                max_claim_limit INTEGER DEFAULT 100,
                used_count INTEGER DEFAULT 0,
                start_date TEXT,
                end_date TEXT,
                is_active INTEGER DEFAULT 1,
                is_public INTEGER DEFAULT 1,
                max_per_user INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )`);
            try { await dbRun("ALTER TABLE coupons ADD COLUMN is_public INTEGER DEFAULT 1"); } catch (e) { }
            try { await dbRun("ALTER TABLE coupons ADD COLUMN max_per_user INTEGER DEFAULT 1"); } catch (e) { }
            try { await dbRun("ALTER TABLE coupons ADD COLUMN max_claim_limit INTEGER DEFAULT 100"); } catch (e) { }
            await dbRun(`CREATE TABLE IF NOT EXISTS user_claimed_coupons (
                id TEXT PRIMARY KEY,
                coupon_id TEXT NOT NULL,
                userId TEXT NOT NULL,
                claimed_at TEXT NOT NULL
            )`);
            await dbRun(`CREATE TABLE IF NOT EXISTS coupon_usages (
                id TEXT PRIMARY KEY,
                coupon_id TEXT NOT NULL,
                userId TEXT NOT NULL,
                trxId TEXT,
                discount_amount REAL NOT NULL,
                used_at TEXT NOT NULL
            )`);

            // Referral System
            try { await dbRun("ALTER TABLE users ADD COLUMN referral_code TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE users ADD COLUMN referred_by TEXT"); } catch (e) { }
            try { await dbRun("ALTER TABLE users ADD COLUMN avatar TEXT"); } catch (e) { }
            await dbRun(`CREATE TABLE IF NOT EXISTS referral_rewards (
                id TEXT PRIMARY KEY,
                referrer_id TEXT NOT NULL,
                referee_id TEXT NOT NULL,
                trx_id TEXT,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'completed',
                created_at TEXT NOT NULL
            )`);

            // Ry Coins & Game Rewards
            try { await dbRun("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0"); } catch (e) { }
            await dbRun(`CREATE TABLE IF NOT EXISTS user_coin_claims (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                claim_type TEXT NOT NULL,
                coins_amount INTEGER NOT NULL,
                streak_count INTEGER DEFAULT 1,
                claim_date TEXT,
                claimed_at TEXT NOT NULL
            )`);
            try { await dbRun("ALTER TABLE user_coin_claims ADD COLUMN claim_date TEXT"); } catch (e) { }
            try { await dbRun("CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_claims_daily ON user_coin_claims(userId, claim_type, claim_date)"); } catch (e) { }
            try { await dbRun("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_coupon_unique ON user_claimed_coupons(coupon_id, userId)"); } catch (e) { }

            // Dynamic Referral Settings
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('referral_enabled', 'true')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('referral_commission_type', 'fixed')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('referral_commission_value', '5000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('referral_new_user_discount', '5000')`);

            // Pricing defaults
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ceir_history', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ceir_register', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ceirgo_price_cek_imei_beacukai', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ceirgo_price_cek_history_imei', '50000')`);
            await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('imei_speed_fast', '50000')`);

            // Reviews Table
            await dbRun(`CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                userName TEXT,
                userAvatar TEXT,
                orderId TEXT,
                productId TEXT NOT NULL,
                serviceType TEXT,
                variation TEXT,
                rating REAL NOT NULL,
                comment TEXT,
                images TEXT,
                likesCount INTEGER DEFAULT 0,
                transactionDate TEXT,
                userJoinedAt TEXT,
                userTotalOrders INTEGER DEFAULT 1,
                userRole TEXT DEFAULT 'buyer',
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`);

            try { await dbRun("ALTER TABLE reviews ADD COLUMN transactionDate TEXT"); } catch(e){}
            try { await dbRun("ALTER TABLE reviews ADD COLUMN userJoinedAt TEXT"); } catch(e){}
            try { await dbRun("ALTER TABLE reviews ADD COLUMN userTotalOrders INTEGER DEFAULT 1"); } catch(e){}
            try { await dbRun("ALTER TABLE reviews ADD COLUMN userRole TEXT DEFAULT 'buyer'"); } catch(e){}

            // Seed Reviews safely
            try {
                const seedReviews = [
                    ["Rahul Pramudia", 14, "Reseller VIP", 5, "Proses kurang dari 3 jam, sinyal Telkomsel 4G langsung aktif di iPhone 13 Pro Inter. CS juga responsif.", 8, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Dika Store Official", 28, "Reseller VIP", 5, "Sudah beberapa unit untuk stok konter, semua masuk jaringan dengan aman. Prosesnya jelas dan mudah dipantau.", 5, "GARANSI 2 BULAN (MASA AKTIF SINYAL)"],
                    ["Bintang Cellular Surabaya", 35, "Konter Mitra", 5, "Unit pelanggan kembali dapat sinyal 5G tanpa pengaturan tambahan. Cocok untuk kebutuhan konter.", 12, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Hendra Wijaya", 9, "Pembeli Terverifikasi", 5, "iPhone 14 Pro Max saya langsung mendeteksi Telkomsel 5G. Detail garansi juga diterima dengan rapi.", 3, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Rizky Maulana", 4, "Pembeli Terverifikasi", 5, "Sinyal XL aktif setelah proses selesai. Admin menjelaskan estimasi dari awal sehingga tidak bingung.", 4, "GARANSI 1 BULAN (MASA AKTIF SINYAL)"],
                    ["Nadia Putri", 7, "Pembeli Terverifikasi", 5, "Samsung Inter berhasil dapat jaringan Indosat. Bukti transaksi dan masa garansi sudah sesuai pesanan.", 6, "GARANSI 2 BULAN (MASA AKTIF SINYAL)"],
                    ["Amanah Phone", 18, "Reseller VIP", 5, "Untuk unit iPhone eks luar negeri, jaringan langsung terbaca setelah selesai. Pelayanan stabil untuk reseller.", 9, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Fajar Setiawan", 2, "Pembeli Terverifikasi", 5, "Order pertama aman, SIM Telkomsel langsung terdaftar dan panggilan normal.", 2, "GARANSI 1 BULAN (MASA AKTIF SINYAL)"],
                    ["Laras Mobile", 23, "Konter Mitra", 5, "Pengerjaan beberapa unit rapi dan statusnya mudah dicek. Sinyal operator lokal langsung muncul.", 11, "GARANSI 2 BULAN (MASA AKTIF SINYAL)"],
                    ["Yoga Pratama", 8, "Pembeli Terverifikasi", 5, "Tidak perlu setting APN, kartu XL dan Axis langsung bisa dipakai seperti biasa.", 5, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Kirana Cell", 12, "Reseller VIP", 5, "Layanan membantu untuk stok iPhone Inter. Estimasi sesuai dan sinyal kembali aktif.", 7, "GARANSI 2 BULAN (MASA AKTIF SINYAL)"],
                    ["Bagas Putra", 3, "Pembeli Terverifikasi", 5, "Prosesnya jelas dan hasilnya sesuai. Kartu Telkomsel bisa internet dan telepon normal.", 3, "GARANSI 1 BULAN (MASA AKTIF SINYAL)"],
                    ["Sumber Jaya Gadget", 31, "Konter Mitra", 5, "Sudah cocok untuk kebutuhan konter, update pengerjaan konsisten dan tidak ada kendala sinyal setelah aktif.", 10, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                    ["Dewi Anggraini", 5, "Pembeli Terverifikasi", 4, "Proses agak lama dikit jam 8 malam tp sinyal tetep aman. Setelah selesai Telkomsel langsung aktif.", 4, "GARANSI 2 BULAN (MASA AKTIF SINYAL)"],
                    ["Rama Cellular", 16, "Reseller VIP", 4.5, "Hasil sinyal aman dan sesuai pesanan. Waktu proses sedikit melewati perkiraan, tetapi admin tetap memberi pembaruan.", 6, "GARANSI 3 BULAN (MASA AKTIF SINYAL)"],
                ];
                const sampleReviews = seedReviews.map(([userName, userTotalOrders, userRole, rating, comment, likesCount, variation], index) => {
                    const date = new Date(Date.now() - 86400000 * (index + 1)).toISOString();
                    return {
                        id: `rev_seed_${index + 1}`,
                        userId: `usr_seed_${index + 1}`,
                        userName,
                        userAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=2563eb&textColor=ffffff`,
                        orderId: `trx_seed_${index + 1}`,
                        productId: "unblock-imei",
                        serviceType: "imei",
                        variation,
                        rating,
                        comment,
                        images: JSON.stringify([]),
                        likesCount,
                        transactionDate: date,
                        userJoinedAt: new Date(Date.UTC(2026, 0, index + 2)).toISOString(),
                        userTotalOrders,
                        userRole,
                        createdAt: date,
                    };
                });
                await dbRun("DELETE FROM reviews WHERE userId LIKE 'usr_seed%'");
                for (const r of sampleReviews) {
                    await dbRun("INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
                        [r.userId, r.userName, `${r.userId}@customer.local`, 'seed_pass', 'user', r.userJoinedAt]);
                    await dbRun(
                        `INSERT OR REPLACE INTO reviews (id, userId, userName, userAvatar, orderId, productId, serviceType, variation, rating, comment, images, likesCount, transactionDate, userJoinedAt, userTotalOrders, userRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [r.id, r.userId, r.userName, r.userAvatar, r.orderId, r.productId, r.serviceType, r.variation, r.rating, r.comment, r.images, r.likesCount, r.transactionDate, r.userJoinedAt, r.userTotalOrders, r.userRole, r.createdAt]
                    );
                }
            } catch (e) { console.error("Error seeding reviews:", e); }

            try {
                await dbRun(`ALTER TABLE packages ADD COLUMN position INTEGER DEFAULT 0`);
            } catch (err) { }

            console.log("✅ Database schema initialized successfully.");
        } catch (error) {
            console.error("Database initialization failed:", error);
            process.exit(1);
        }
    });
}

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll,
    initializeDatabase
};
