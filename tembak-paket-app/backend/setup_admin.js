const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('database.sqlite');

(async () => {
    // get admin
    db.get("SELECT * FROM users WHERE role='admin'", async (err, row) => {
        if (!row) {
            console.log("No admin found. Creating one...");
            const hash = await bcrypt.hash("admin123", 10);
            db.run("INSERT INTO users (id, name, email, password, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                ['admin_1', 'Super Admin', 'admin@ryystore.com', hash, 'admin', 'approved', new Date().toISOString()]);
            console.log("Admin created: admin@ryystore.com / admin123");
        } else {
            console.log("Found admin: " + row.email);
            console.log("Setting password to admin123...");
            const hash = await bcrypt.hash("admin123", 10);
            db.run("UPDATE users SET password = ? WHERE email = ?", [hash, row.email], () => {
                console.log("Password updated! You can now login with: " + row.email + " / admin123");
            });
        }
    });
})();
