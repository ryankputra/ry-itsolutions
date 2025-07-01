// create_schema.js (Versi Lengkap)
// File ini dijalankan SATU KALI untuk membuat struktur database SQLite Anda.

const Database = require('better-sqlite3');
// Membuat file database baru bernama 'ryystore.db'
const db = new Database('ryystore.db', { verbose: console.log });

/**
 * Fungsi untuk membuat semua tabel yang diperlukan dalam database.
 */
function createSchema() {
    console.log('Membuat skema database untuk RyyStore...');

    // Menggunakan db.exec() untuk menjalankan beberapa perintah SQL sekaligus.
    db.exec(`
        -- Tabel untuk menyimpan data pengguna
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            email         TEXT NOT NULL UNIQUE,
            password      TEXT NOT NULL,
            balance       REAL DEFAULT 0,
            role          TEXT DEFAULT 'user',
            verifiedPhone TEXT,
            createdAt     TEXT NOT NULL,
            status        TEXT DEFAULT 'pending'
        );

        -- Tabel untuk menyimpan daftar paket yang tersedia
        CREATE TABLE IF NOT EXISTS packages (
            package_code    TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            description     TEXT,
            original_price  REAL DEFAULT 0,
            platform_fee    REAL DEFAULT 0,
            isVisible       INTEGER DEFAULT 0, -- 0 untuk false, 1 untuk true
            category        TEXT DEFAULT 'reguler',
            isMultiPurchase INTEGER DEFAULT 0, -- 0 untuk false, 1 untuk true
            payment_methods TEXT -- Akan disimpan sebagai string JSON
        );

        -- Tabel untuk mencatat semua riwayat transaksi pembelian
        CREATE TABLE IF NOT EXISTS transactions (
            id              TEXT PRIMARY KEY,
            userId          TEXT NOT NULL,
            userName        TEXT,
            packageId       TEXT,
            packageName     TEXT,
            platformFee     REAL,
            originalPrice   REAL,
            status          TEXT,
            api_response    TEXT,
            paymentMethod   TEXT,
            createdAt       TEXT NOT NULL,
            kmspTrxId       TEXT,
            paymentDetails  TEXT, -- Akan disimpan sebagai string JSON
            targetPhone     TEXT
        );

        -- Tabel BARU untuk mencatat riwayat top up saldo
        CREATE TABLE IF NOT EXISTS topups (
            id              TEXT PRIMARY KEY,
            userId          TEXT NOT NULL,
            baseAmount      REAL NOT NULL,
            uniqueAmount    REAL NOT NULL,
            status          TEXT NOT NULL, -- pending, completed, expired, canceled
            createdAt       TEXT NOT NULL,
            qrisBase64Image TEXT
        );

        -- Tabel BARU untuk menyimpan pengumuman
        CREATE TABLE IF NOT EXISTS announcements (
            id          TEXT PRIMARY KEY,
            message     TEXT NOT NULL,
            createdAt   TEXT NOT NULL
        );

        -- Tabel BARU untuk menyimpan pengaturan aplikasi
        CREATE TABLE IF NOT EXISTS settings (
            key     TEXT PRIMARY KEY,
            value   TEXT
        );
    `);

    // Inisialisasi pengaturan awal jika belum ada
    const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenanceMode', 'false')");
    stmt.run();

    console.log('Skema database berhasil dibuat atau sudah ada.');
}

// Jalankan fungsi untuk membuat skema
try {
    createSchema();
} catch (error) {
    console.error('Gagal membuat skema:', error);
} finally {
    // Selalu tutup koneksi database setelah selesai
    db.close();
    console.log('Koneksi database ditutup.');
}