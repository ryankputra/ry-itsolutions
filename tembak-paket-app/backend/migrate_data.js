// migrate_data.js
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('ryystore.db');
const oldDbData = JSON.parse(fs.readFileSync('db.json'));

function migrate() {
    console.log('Memulai migrasi data...');

    // Migrasi Users
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, password, balance, role, verifiedPhone, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const user of oldDbData.users) {
        insertUser.run(user.id, user.name, user.email, user.password, user.balance, user.role, user.verifiedPhone, user.createdAt, user.status);
    }
    console.log(`${oldDbData.users.length} data pengguna berhasil dimigrasi.`);

    // Migrasi Packages
    const insertPackage = db.prepare('INSERT OR IGNORE INTO packages (package_code, name, description, original_price, platform_fee, isVisible, category, isMultiPurchase, payment_methods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const pkg of oldDbData.packages) {
        insertPackage.run(pkg.package_code, pkg.name, pkg.description, pkg.original_price, pkg.platform_fee, pkg.isVisible ? 1 : 0, pkg.category, pkg.isMultiPurchase ? 1 : 0, JSON.stringify(pkg.payment_methods));
    }
    console.log(`${oldDbData.packages.length} data paket berhasil dimigrasi.`);

    // Migrasi Transactions
    const insertTransaction = db.prepare('INSERT OR IGNORE INTO transactions (id, userId, userName, packageId, packageName, platformFee, originalPrice, status, api_response, paymentMethod, createdAt, kmspTrxId, paymentDetails, targetPhone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const trx of oldDbData.transactions) {
        insertTransaction.run(trx.id, trx.userId, trx.userName, trx.packageId, trx.packageName, trx.platformFee, trx.originalPrice, trx.status, trx.api_response, trx.paymentMethod, trx.createdAt, trx.kmspTrxId, JSON.stringify(trx.paymentDetails), trx.targetPhone);
    }
    console.log(`${oldDbData.transactions.length} data transaksi berhasil dimigrasi.`);

    console.log('Migrasi selesai!');
}

// Jalankan dalam satu transaksi besar agar aman
const runMigration = db.transaction(migrate);
runMigration();

db.close();