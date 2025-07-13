// migrasi.js - VERSI FINAL PALING LENGKAP (SESUAI DENGAN db.json ANDA)

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbJsonPath = './db.json';
const dbSqlitePath = './database.sqlite';

// Hapus file database lama jika ada, untuk memastikan migrasi yang bersih
if (fs.existsSync(dbSqlitePath)) {
    fs.unlinkSync(dbSqlitePath);
    console.log('🗑️ File database.sqlite lama dihapus untuk memulai dari awal.');
}

if (!fs.existsSync(dbJsonPath)) {
    console.error('❌ Error: File db.json tidak ditemukan. Tidak ada yang bisa dimigrasi.');
    process.exit(1);
}

// 1. Baca data dari db.json
console.log('📖 Membaca data dari db.json...');
const oldDbData = JSON.parse(fs.readFileSync(dbJsonPath));
console.log(`👍 Berhasil membaca data.`);

// 2. Hubungkan ke database SQLite
const db = new sqlite3.Database(dbSqlitePath, (err) => {
    if (err) {
        console.error('❌ Error menghubungkan ke database.sqlite:', err.message);
        process.exit(1);
    }
    console.log('✅ Terhubung ke database.sqlite.');
    runMigration();
});

// 3. Fungsi utama untuk migrasi
function runMigration() {
    db.serialize(() => {
        console.log('\n🚀 Memulai proses migrasi...');
        db.run("BEGIN TRANSACTION;");

        // Tahap 1: Membuat semua tabel
        console.log('--- Tahap 1: Membuat struktur tabel (schema)... ---');
        db.run("PRAGMA foreign_keys = ON;");
        db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, balance REAL DEFAULT 0, role TEXT DEFAULT 'user', verifiedPhone TEXT, savedPhones TEXT, status TEXT DEFAULT 'pending', createdAt TEXT NOT NULL, resetPasswordToken TEXT, resetPasswordExpires INTEGER)`);
        db.run(`CREATE TABLE IF NOT EXISTS packages (package_code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, original_price REAL DEFAULT 0, platform_fee REAL DEFAULT 0, isVisible INTEGER DEFAULT 0, category TEXT DEFAULT 'reguler', isMultiPurchase INTEGER DEFAULT 0, payment_methods TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, packageId TEXT, packageName TEXT, platformFee REAL, originalPrice REAL, targetPhone TEXT, accessToken TEXT, paymentMethod TEXT, kmspTrxId TEXT, status TEXT NOT NULL, api_response TEXT, createdAt TEXT NOT NULL, paymentDetails TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
        db.run(`CREATE TABLE IF NOT EXISTS topups (id TEXT PRIMARY KEY, userId TEXT NOT NULL, userName TEXT, baseAmount REAL NOT NULL, uniqueAmount REAL NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL, qrisBase64Image TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
        db.run(`CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, message TEXT NOT NULL, createdAt TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS tutorialContent (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, content TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, position INTEGER DEFAULT 0)`);
        db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
        console.log('✅ Struktur tabel berhasil dibuat.');

        // Tahap 2: Memasukkan data
        console.log('\n--- Tahap 2: Memasukkan data... ---');

        if (oldDbData.users?.length) {
            const stmt = db.prepare("INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt, resetPasswordToken, resetPasswordExpires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            oldDbData.users.forEach(user => stmt.run(user.id, user.name, user.email, user.password, user.balance || 0, user.role || 'user', user.verifiedPhone || null, JSON.stringify(user.savedPhones || []), user.status || 'approved', user.createdAt || new Date().toISOString(), user.resetPasswordToken || null, user.resetPasswordExpires || null));
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.users.length} pengguna berhasil dimigrasi.`));
        }

        if (oldDbData.packages?.length) {
            const stmt = db.prepare("INSERT INTO packages (package_code, name, description, original_price, platform_fee, isVisible, category, isMultiPurchase, payment_methods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            oldDbData.packages.forEach(pkg => stmt.run(pkg.package_code, pkg.name, pkg.description || '', pkg.original_price || 0, pkg.platform_fee || 0, pkg.isVisible ? 1 : 0, pkg.category || 'reguler', pkg.isMultiPurchase ? 1 : 0, JSON.stringify(pkg.payment_methods || [])));
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.packages.length} paket berhasil dimigrasi.`));
        }
        
        if (oldDbData.transactions?.length) {
            const stmt = db.prepare("INSERT INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, targetPhone, accessToken, paymentMethod, kmspTrxId, status, api_response, createdAt, paymentDetails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            oldDbData.transactions.forEach(trx => {
                let safePaymentDetails = null;
                // --- PERBAIKAN: Jangan hapus data qr_code_base64 ---
                // Langsung salin objek paymentDetails apa adanya dari db.json
                if (trx.paymentDetails) safePaymentDetails = trx.paymentDetails;
                 stmt.run(trx.id, trx.userId, trx.userName, trx.packageId, trx.packageName, trx.platformFee, trx.originalPrice, trx.targetPhone, trx.accessToken, trx.paymentMethod, trx.kmspTrxId, trx.status, trx.api_response, trx.createdAt, JSON.stringify(safePaymentDetails));
            });
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.transactions.length} transaksi berhasil dimigrasi.`));
        }
        
        if (oldDbData.topups?.length) {
            const stmt = db.prepare("INSERT INTO topups (id, userId, userName, baseAmount, uniqueAmount, status, createdAt, qrisBase64Image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            oldDbData.topups.forEach(topup => stmt.run(topup.id, topup.userId, topup.userName, topup.baseAmount || 0, topup.uniqueAmount || 0, topup.status, topup.createdAt, topup.qrisBase64Image || null));
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.topups.length} top up berhasil dimigrasi.`));
        }
        
        if (oldDbData.announcements?.length) {
            const stmt = db.prepare("INSERT INTO announcements (id, message, createdAt) VALUES (?, ?, ?)");
            oldDbData.announcements.forEach(ann => stmt.run(ann.id, ann.message, ann.createdAt));
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.announcements.length} pengumuman berhasil dimigrasi.`));
        }
        if (oldDbData.tutorialContent?.length) {
            const stmt = db.prepare("INSERT INTO tutorialContent (id, title, description, content, createdAt, updatedAt, position) VALUES (?, ?, ?, ?, ?, ?, ?)");
            oldDbData.tutorialContent.forEach((tutorial, index) => stmt.run(tutorial.id, tutorial.title, tutorial.description || '', JSON.stringify(tutorial.content || []), tutorial.createdAt, tutorial.updatedAt, tutorial.position || index));
            stmt.finalize(() => console.log(`  -> ✅ ${oldDbData.tutorialContent.length} tutorial berhasil dimigrasi.`));
        }
        if (oldDbData.settings) {
            const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
            for (const key in oldDbData.settings) {
                stmt.run(key, typeof oldDbData.settings[key] !== 'string' ? JSON.stringify(oldDbData.settings[key]) : oldDbData.settings[key]);
            }
            // --- PERBAIKAN: Migrasi data maintenanceMode yang terlewat ---
            if (typeof oldDbData.maintenanceMode === 'boolean') {
                stmt.run('maintenanceMode', JSON.stringify(oldDbData.maintenanceMode));
            }
            stmt.finalize(() => console.log(`  -> ✅ Pengaturan berhasil dimigrasi.`));
        }
        
        db.run("COMMIT;", (err) => {
            if (err) {
                console.error("❌ Gagal melakukan COMMIT.", err.message);
                db.run("ROLLBACK;");
            } else {
                console.log('\n🎉 Migrasi data selesai sepenuhnya!');
            }
            
            db.close((err) => {
                if (err) return console.error(err.message);
                console.log('🔌 Koneksi ke database ditutup.');
            });
        });
    });
}