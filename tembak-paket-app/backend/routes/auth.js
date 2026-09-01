/**
 * User Authentication, Profile, and Phone OTP Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch');
const { OAuth2Client } = require('google-auth-library');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const { dbGet, dbRun, dbAll } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');
const { sendTelegramNotification } = require('../telegramService');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const KMSP_API_KEY = process.env.KMSP_API_KEY;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Avatar Storage Configuration
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const uid = req.session?.userId || 'user';
        cb(null, `avatar_${uid}_${Date.now()}${ext}`);
    }
});
const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper for effective maintenance
async function getEffectiveMaintenanceStatus() {
    try {
        const settingsRows = await dbAll("SELECT key, value FROM settings WHERE key IN ('maintenanceMode', 'maintenanceScheduleEnabled', 'maintenanceStartTime', 'maintenanceEndTime', 'lastKmspBalance')");
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        if (settings.maintenanceMode === 'true') {
            return true;
        }

        if (settings.maintenanceScheduleEnabled === 'true') {
            const now = new Date();
            const timeZone = 'Asia/Jakarta';
            const currentTime = now.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' });

            const startTime = settings.maintenanceStartTime || '00:00';
            const endTime = settings.maintenanceEndTime || '00:00';

            if (startTime > endTime) {
                if (currentTime >= startTime || currentTime < endTime) return true;
            } else {
                if (currentTime >= startTime && currentTime < endTime) return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

// 1. Google OAuth
router.post('/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ status: false, message: 'Google Token diperlukan.' });
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'GANTI_DENGAN_GOOGLE_CLIENT_ID_ANDA') {
            return res.status(500).json({ status: false, message: 'Google Login belum dikonfigurasi oleh Admin.' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) return res.status(400).json({ status: false, message: 'Gagal mendapatkan data Google.' });

        const email = payload.email;
        const name = payload.name || 'User Google';

        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            const defaultPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);
            const newId = `user_${Date.now()}`;
            await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, name, email, defaultPassword, 0, 'user', null, '[]', 'approved', new Date().toISOString()]);

            user = await dbGet('SELECT * FROM users WHERE id = ?', [newId]);
            sendTelegramNotification(`<b>🎉 User Baru Mendaftar</b>\n<b>Metode:</b> 🌐 Login via Google\n<b>Nama:</b> ${name}\n<b>Email:</b> ${email}`, 'admin');
        } else {
            if (user.status === 'pending') {
                await dbRun('UPDATE users SET status = ? WHERE id = ?', ['approved', user.id]);
                user.status = 'approved';
            }
        }

        if (user.status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ status: false, message: 'Akun Anda diblokir.' });
        }

        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);

        res.status(200).json({ status: true, message: 'Login Google Berhasil!', user: userWithoutPassword });
    } catch (error) {
        console.error("Google Login Error:", error.message);
        res.status(500).json({ status: false, message: 'Verifikasi Google gagal.' });
    }
});

// 2. User Registration
router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, referral_code } = req.body;
        if (!name || !email || !password) return res.status(400).json({ status: false, message: "Nama, email, dan password wajib diisi." });
        if (await dbGet('SELECT id FROM users WHERE email = ?', [email])) return res.status(409).json({ status: false, message: "Email sudah terdaftar." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const cleanName = (name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'RYY';
        const generatedRefCode = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;

        let referredById = null;
        if (referral_code) {
            const referrer = await dbGet('SELECT id FROM users WHERE UPPER(referral_code) = ?', [referral_code.trim().toUpperCase()]);
            if (referrer) referredById = referrer.id;
        }

        const newUser = { id: `user_${Date.now()}`, name, email, password: hashedPassword, balance: 0, role: 'user', verifiedPhone: null, savedPhones: '[]', status: 'pending', createdAt: new Date().toISOString(), referral_code: generatedRefCode, referred_by: referredById };
        await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Object.values(newUser));

        sendTelegramNotification(
            `<b>──────────────────────</b>\n<b>👤 Registrasi Baru Menunggu Persetujuan</b>\n<b>──────────────────────</b>\n<b>Metode:</b> 📝 Manual (Form Web)\n<b>Nama:</b> ${name}\n<b>Email:</b> ${email}\n<b>──────────────────────</b>\n<b>Harap setujui akun ini di Panel Admin.</b>`, 'admin'
        );

        res.status(201).json({ status: true, message: "Registrasi berhasil! Akun Anda sedang menunggu persetujuan dari Admin." });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." });
    }
});

// 3. User Login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ status: false, message: "Email atau password salah." });
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(401).json({ status: false, message: "Email atau password salah." });
        if (user.role !== 'admin' && user.status !== 'approved') return res.status(403).json({ status: false, message: "Akun Anda belum disetujui oleh Admin." });

        req.session.userId = user.id;
        const { password: _, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
        res.status(200).json({ status: true, message: "Login berhasil!", user: userWithoutPassword });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." });
    }
});

// 4. Forgot Password
router.post('/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await dbGet('SELECT id, email, name FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.json({ status: true, message: 'Jika email Anda terdaftar, Anda akan menerima link reset.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const oneHour = Date.now() + 3600000;
        await dbRun('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?', [token, oneHour, user.id]);

        const resetUrl = `https://ry-itsolutionts.web.id/#reset-password?token=${token}`;
        const htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Permintaan Reset Password</h2><p>Klik link di bawah ini untuk mereset password Anda:</p><p style="margin: 20px 0;"><a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Reset Password Saya</a></p><p>Link ini kedaluwarsa dalam 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p></div>`;
        const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
        await tranEmailApi.sendTransacEmail({ sender: { email: 'no-reply@ry-itsolutionts.web.id', name: 'Ry-ITSolutions' }, to: [{ email: user.email }], subject: 'Reset Password Akun Ry-ITSolutions Anda', htmlContent });
        res.json({ status: true, message: 'Jika email Anda terdaftar, Anda akan menerima link reset.' });
    } catch (error) {
        console.error("[FORGOT_PASSWORD_ERROR]", error);
        res.status(500).json({ status: false, message: 'Gagal mengirim email reset.' });
    }
});

// 5. Reset Password
router.post('/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ status: false, message: 'Token dan password baru diperlukan.' });
        const user = await dbGet('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()]);
        if (!user) return res.status(400).json({ status: false, message: 'Token reset tidak valid atau telah kedaluwarsa.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', [hashedPassword, user.id]);
        sendTelegramNotification(`🔑 Password untuk pengguna <b>${user.name} (${user.email})</b> telah berhasil di-reset.`);
        res.json({ status: true, message: 'Password berhasil direset! Silakan login kembali.' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Terjadi kesalahan saat mereset password.' });
    }
});

// 6. User Logout
router.post('/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ status: false, message: "Gagal logout." });
        res.clearCookie('connect.sid');
        res.status(200).json({ status: true, message: "Logout berhasil." });
    });
});

// 7. Get Current Session (/api/auth/me)
router.get('/auth/me', async (req, res) => {
    try {
        const maintenanceMode = await getEffectiveMaintenanceStatus();
        if (!req.session || !req.session.userId) {
            return res.status(200).json({ status: true, user: null, maintenanceMode });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        if (!user) {
            req.session.destroy();
            res.clearCookie('connect.sid');
            return res.status(200).json({ status: true, user: null, maintenanceMode });
        }

        const { password, ...userWithoutPassword } = user;
        if (userWithoutPassword.savedPhones) userWithoutPassword.savedPhones = JSON.parse(userWithoutPassword.savedPhones);
        res.status(200).json({ status: true, user: userWithoutPassword, maintenanceMode });
    } catch (error) {
        console.error("Error in /api/auth/me:", error);
        res.status(500).json({ status: false, message: "Gagal mengambil data sesi." });
    }
});

// 8. User Avatar Upload
router.post('/user/avatar', isAuthenticated, avatarUpload.single('avatar'), async (req, res) => {
    try {
        const userId = req.session.userId;
        let avatarUrl = '';
        if (req.file) {
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
        } else if (req.body.avatarBase64) {
            avatarUrl = req.body.avatarBase64;
        } else {
            return res.status(400).json({ status: false, message: "File foto tidak ditemukan." });
        }

        await dbRun("UPDATE users SET avatar = ? WHERE id = ?", [avatarUrl, userId]);
        const updatedUser = await dbGet("SELECT id, name, email, role, balance, coins, avatar FROM users WHERE id = ?", [userId]);
        res.json({ status: true, message: "Foto profil berhasil diperbarui!", avatar: avatarUrl, user: updatedUser });
    } catch (e) {
        console.error("Error updating avatar:", e);
        res.status(500).json({ status: false, message: "Gagal memperbarui foto profil." });
    }
});

// 9. Phone OTP Request
router.post('/phone/request-otp', isAuthenticated, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: "Parameter 'phone' diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-reqotp-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP`);
        const data = await response.json();
        if (!response.ok || !data.status) throw new Error(data.message || 'Gagal meminta OTP dari provider.');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// 10. Phone OTP Verify
router.post('/phone/verify-otp', isAuthenticated, async (req, res) => {
    const { phone, auth_id, otp } = req.body;
    if (!phone || !auth_id || !otp) return res.status(400).json({ status: false, message: "Phone, auth_id, dan OTP diperlukan." });
    try {
        const user = await dbGet('SELECT savedPhones FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });

        const loginResponse = await fetch(`https://golang-openapi-login-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&phone=${phone}&method=OTP&auth_id=${auth_id}&otp=${otp}`);
        const loginData = await loginResponse.json();
        if (!loginResponse.ok || !loginData.status) throw new Error(loginData.message || 'Verifikasi OTP Gagal.');
        if (!loginData.data?.access_token) throw new Error('Gagal mendapatkan access token dari provider.');

        const savedPhones = user.savedPhones ? JSON.parse(user.savedPhones) : [];
        let updatedPhones = savedPhones.filter(p => p !== phone);
        updatedPhones.unshift(phone);
        updatedPhones = updatedPhones.slice(0, 5);

        await dbRun('UPDATE users SET verifiedPhone = ?, savedPhones = ? WHERE id = ?', [phone, JSON.stringify(updatedPhones), req.session.userId]);
        res.status(200).json({ status: true, message: "Nomor berhasil diverifikasi!", data: loginData.data });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// 11. Phone Check Token
router.post('/phone/check-token', isAuthenticated, async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ status: false, message: "Token diperlukan." });
    try {
        const response = await fetch(`https://golang-openapi-quotadetails-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}&access_token=${access_token}`);
        const data = await response.json();
        if (!response.ok || !data.status) {
            return res.status(200).json({ status: false, message: data.message || "Token tidak valid." });
        }
        res.status(200).json({ status: true, message: "Token valid." });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal mengecek token." });
    }
});

// 12. Token List
router.get('/auth/token-list', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet("SELECT verifiedPhone FROM users WHERE id = ?", [req.session.userId]);
        if (!user || !user.verifiedPhone) return res.status(200).json({ status: true, data: [] });

        const response = await fetch(`https://golang-openapi-accesstokenlist-xltembakservice.kmsp-store.com/v1?api_key=${KMSP_API_KEY}`);
        const data = await response.json();
        if (!response.ok || !data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Gagal mengambil daftar token dari KMSP.');
        const filteredTokens = data.data.filter(token => token.msisdn === user.verifiedPhone);
        res.status(200).json({ status: true, message: "Daftar token berhasil diambil.", data: filteredTokens });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

module.exports = {
    router,
    getEffectiveMaintenanceStatus
};
