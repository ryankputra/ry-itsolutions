const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// 1. Alter table imei_packages
c = c.replace(
    'try { await dbRun("ALTER TABLE topups ADD COLUMN ceirgoDepositId TEXT"); } catch (e) {}',
    'try { await dbRun("ALTER TABLE topups ADD COLUMN ceirgoDepositId TEXT"); } catch (e) {}\r\n            try { await dbRun("ALTER TABLE imei_packages ADD COLUMN isVisible INTEGER DEFAULT 1"); } catch (e) {}'
);

// 2. Remove default "Permanen" insert (we won't delete existing one in case admin wants it, but we stop creating it by default)
c = c.replace(
    /await dbRun\(`INSERT OR IGNORE INTO imei_packages \(id, duration, price\) VALUES \('imei_permanen', 'Permanen', 500000\)`\);/,
    '// Removed imei_permanen default'
);

// 3. Update GET /api/imei-packages to only return visible packages for NON-ADMIN
const oldGetImeiPackages = `app.get('/api/imei-packages', async (req, res) => {
    try {
        const packages = await dbAll("SELECT * FROM imei_packages");
        res.json({ status: true, data: packages });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});`;

const newGetImeiPackages = `app.get('/api/imei-packages', async (req, res) => {
    try {
        // Jika ada query param ?all=true (dipakai admin), tampilkan semua. Jika tidak, hanya yang isVisible = 1
        const showAll = req.query.all === 'true';
        const packages = await dbAll(showAll ? "SELECT * FROM imei_packages" : "SELECT * FROM imei_packages WHERE isVisible = 1 OR isVisible IS NULL");
        res.json({ status: true, data: packages });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});`;

c = c.replace(oldGetImeiPackages, newGetImeiPackages);

// 4. Tambah route PUT /api/admin/imei-packages/:id/toggle untuk meng-hide paket
const putToggleImei = `app.put('/api/admin/imei-packages/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { isVisible } = req.body;
        await dbRun("UPDATE imei_packages SET isVisible = ? WHERE id = ?", [isVisible ? 1 : 0, req.params.id]);
        res.json({ status: true, message: "Status paket berhasil diubah" });
    } catch (error) { res.status(500).json({ status: false, message: error.message }); }
});

app.post('/api/order/manual'`;

c = c.replace("app.post('/api/order/manual'", putToggleImei);

fs.writeFileSync('server.js', c);
console.log('Backend IMEI visibility patched');
