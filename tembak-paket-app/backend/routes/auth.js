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
const { validateEmailActive, sendRegistrationOtpEmail, sendPasswordResetOtpEmail } = require('../services/emailService');

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
        const { credential, referral_code } = req.body;
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
            const cleanName = (name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'RYY';
            const generatedRefCode = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;

            let referredById = null;
            let referrerName = null;
            if (referral_code && typeof referral_code === 'string') {
                const referrer = await dbGet('SELECT id, name FROM users WHERE UPPER(referral_code) = ?', [referral_code.trim().toUpperCase()]);
                if (referrer) {
                    referredById = referrer.id;
                    referrerName = referrer.name;
                }
            }

            await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, name, email, defaultPassword, 0, 'user', null, '[]', 'approved', new Date().toISOString(), generatedRefCode, referredById]);

            user = await dbGet('SELECT * FROM users WHERE id = ?', [newId]);
            sendTelegramNotification(`<b>🎉 User Baru Mendaftar</b>\n<b>Metode:</b> 🌐 Login via Google\n<b>Nama:</b> ${name}\n<b>Email:</b> ${email}${referrerName ? `\n<b>Referral Dari:</b> ${referrerName} (ID: ${referredById})` : ''}`, 'admin');

            // WhatsApp Notification to Admin
            try {
                const { getAdminPhoneNumbers, sendTextMessage } = require('../services/waBot');
                const adminPhones = await getAdminPhoneNumbers();
                const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                const waAdminMsg = `*NOTIFIKASI PENGGUNA BARU (GOOGLE)*\n──────────────────────\n` +
                    `*Nama:* ${name}\n` +
                    `*Email:* ${email}\n` +
                    `*Metode:* Login via Google (Otomatis Aktif)\n` +
                    `*Waktu:* ${timeStr}\n──────────────────────\n` +
                    `Panel Admin: https://ry-itsolutionts.web.id/admin`;
                for (const admPhone of (adminPhones || [])) {
                    sendTextMessage(admPhone, waAdminMsg).catch(e => console.error('[WA Admin Notify Google Error]', e.message));
                }
            } catch (waErr) {
                console.error('[WA Admin Notify Google Error]', waErr.message);
            }
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

// 2a. Request Registration OTP (Option 1)
router.post('/auth/register-request-otp', async (req, res) => {
    try {
        const { name, email, password, referral_code } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ status: false, message: "Nama, email, dan password wajib diisi." });
        }
        if (password.length < 6) {
            return res.status(400).json({ status: false, message: "Password minimal 6 karakter." });
        }

        // Validasi domain aktif & tolak disposable mail
        const emailCheck = await validateEmailActive(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ status: false, message: emailCheck.message });
        }

        const validEmail = emailCheck.trimmedEmail;
        if (await dbGet('SELECT id FROM users WHERE email = ?', [validEmail])) {
            return res.status(409).json({ status: false, message: "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain." });
        }

        let referredById = null;
        let referrerName = null;
        if (referral_code) {
            const referrer = await dbGet('SELECT id, name FROM users WHERE UPPER(referral_code) = ?', [referral_code.trim().toUpperCase()]);
            if (referrer) {
                referredById = referrer.id;
                referrerName = referrer.name;
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 menit
        const payload = JSON.stringify({
            name,
            email: validEmail,
            hashedPassword,
            referral_code: referral_code ? referral_code.trim().toUpperCase() : null,
            referredById,
            referrerName
        });

        await dbRun(
            'INSERT OR REPLACE INTO email_verifications (email, otp, type, payload, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [validEmail, otp, 'register', payload, expiresAt, new Date().toISOString()]
        );

        const emailSent = await sendRegistrationOtpEmail(validEmail, otp, name);
        if (!emailSent.success) {
            console.error('[Register OTP Send Failed]', emailSent.error);
            return res.status(500).json({ status: false, message: "Gagal mengirimkan kode OTP ke email. Pastikan email valid." });
        }

        res.status(200).json({
            status: true,
            message: `Kode verifikasi 6 digit telah dikirim ke ${validEmail}. Silakan cek kotak masuk atau folder spam Anda.`,
            email: validEmail
        });
    } catch (error) {
        console.error("[Register Request OTP Error]:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan pada server saat memproses kode verifikasi." });
    }
});

// 2b. Verify Registration OTP & Complete Registration
router.post('/auth/register-verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ status: false, message: "Email dan kode OTP wajib diisi." });
        }

        const validEmail = email.trim().toLowerCase();
        const record = await dbGet(
            'SELECT * FROM email_verifications WHERE email = ? AND type = ?',
            [validEmail, 'register']
        );

        if (!record) {
            return res.status(400).json({ status: false, message: "Permintaan verifikasi tidak ditemukan. Silakan kirim ulang kode OTP." });
        }

        if (Number(record.expires_at) < Date.now()) {
            await dbRun('DELETE FROM email_verifications WHERE email = ? AND type = ?', [validEmail, 'register']);
            return res.status(400).json({ status: false, message: "Kode verifikasi telah kedaluwarsa. Silakan minta kode baru." });
        }

        if (record.otp !== otp.trim()) {
            return res.status(400).json({ status: false, message: "Kode verifikasi OTP salah. Silakan periksa kembali email Anda." });
        }

        const data = JSON.parse(record.payload);
        if (await dbGet('SELECT id FROM users WHERE email = ?', [validEmail])) {
            await dbRun('DELETE FROM email_verifications WHERE email = ? AND type = ?', [validEmail, 'register']);
            return res.status(409).json({ status: false, message: "Email sudah terdaftar. Silakan login." });
        }

        const cleanName = (data.name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'RYY';
        const generatedRefCode = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;
        const newUserId = `user_${Date.now()}`;

        const newUser = {
            id: newUserId,
            name: data.name,
            email: validEmail,
            password: data.hashedPassword,
            balance: 0,
            role: 'user',
            verifiedPhone: null,
            savedPhones: '[]',
            status: 'approved',
            createdAt: new Date().toISOString(),
            referral_code: generatedRefCode,
            referred_by: data.referredById
        };

        await dbRun(
            'INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            Object.values(newUser)
        );

        await dbRun('DELETE FROM email_verifications WHERE email = ? AND type = ?', [validEmail, 'register']);

        req.session.userId = newUserId;

        sendTelegramNotification(
            `<b>──────────────────────</b>\n` +
            `<b>🎉 Registrasi Pengguna Baru (Terverifikasi OTP)</b>\n` +
            `<b>──────────────────────</b>\n` +
            `<b>Metode:</b> 📝 Form Registrasi Web (Email OTP)\n` +
            `<b>Nama:</b> ${data.name}\n` +
            `<b>Email:</b> ${validEmail}\n` +
            `<b>Status:</b> ✅ Otomatis Aktif (Terverifikasi)\n` +
            (data.referrerName ? `<b>Referral Dari:</b> ${data.referrerName} (ID: ${data.referredById})\n` : '') +
            `<b>──────────────────────</b>`, 'admin'
        );

        try {
            const { getAdminPhoneNumbers, sendTextMessage } = require('../services/waBot');
            const adminPhones = await getAdminPhoneNumbers();
            const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const waAdminMsg = `*NOTIFIKASI PENGGUNA BARU (OTP AKTIF)*\n──────────────────────\n` +
                `*Nama:* ${data.name}\n` +
                `*Email:* ${validEmail}\n` +
                `*Status:* Otomatis Aktif (Terverifikasi OTP)\n` +
                `*Metode:* Form Registrasi Web\n` +
                (data.referrerName ? `*Referral:* ${data.referrerName}\n` : '') +
                `*Waktu:* ${timeStr}\n──────────────────────\n` +
                `Panel Admin: https://ry-itsolutionts.web.id/admin`;
            for (const admPhone of (adminPhones || [])) {
                sendTextMessage(admPhone, waAdminMsg).catch(e => console.error('[WA Admin Notify Register Error]', e.message));
            }
        } catch (waErr) {
            console.error('[WA Admin Notify Register Error]', waErr.message);
        }

        const { password: _, ...userWithoutPassword } = newUser;
        userWithoutPassword.savedPhones = [];

        res.status(201).json({
            status: true,
            message: "Registrasi dan verifikasi email berhasil! Selamat datang di Ry-ITSolutions.",
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("[Register Verify OTP Error]:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan saat memverifikasi kode OTP." });
    }
});

// 2c. Direct Fallback Registration

router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, referral_code } = req.body;
        if (!name || !email || !password) return res.status(400).json({ status: false, message: "Nama, email, dan password wajib diisi." });

        // Validasi format email, tolak domain disposable/palsu, dan pastikan MX server aktif
        const emailCheck = await validateEmailActive(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ status: false, message: emailCheck.message });
        }

        const validEmail = emailCheck.trimmedEmail;
        if (await dbGet('SELECT id FROM users WHERE email = ?', [validEmail])) {
            return res.status(409).json({ status: false, message: "Email sudah terdaftar." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const cleanName = (name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'RYY';
        const generatedRefCode = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;

        let referredById = null;
        let referrerName = null;
        if (referral_code) {
            const referrer = await dbGet('SELECT id, name FROM users WHERE UPPER(referral_code) = ?', [referral_code.trim().toUpperCase()]);
            if (referrer) {
                referredById = referrer.id;
                referrerName = referrer.name;
            }
        }

        // Pengguna baru via form langsung disetujui (status: 'approved')
        const newUser = { id: `user_${Date.now()}`, name, email: validEmail, password: hashedPassword, balance: 0, role: 'user', verifiedPhone: null, savedPhones: '[]', status: 'approved', createdAt: new Date().toISOString(), referral_code: generatedRefCode, referred_by: referredById };
        await dbRun('INSERT INTO users (id, name, email, password, balance, role, verifiedPhone, savedPhones, status, createdAt, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Object.values(newUser));

        sendTelegramNotification(
            `<b>──────────────────────</b>
` +
            `<b>🎉 Registrasi Pengguna Baru (Aktif)</b>
` +
            `<b>──────────────────────</b>
` +
            `<b>Metode:</b> 📝 Form Registrasi Web
` +
            `<b>Nama:</b> ${name}
` +
            `<b>Email:</b> ${validEmail}
` +
            `<b>Status:</b> ✅ Otomatis Aktif (Terverifikasi)
` +
            (referrerName ? `<b>Referral Dari:</b> ${referrerName} (ID: ${referredById})
` : '') +
            `<b>──────────────────────</b>`, 'admin'
        );

        // WhatsApp Notification to Admin
        try {
            const { getAdminPhoneNumbers, sendTextMessage } = require('../services/waBot');
            const adminPhones = await getAdminPhoneNumbers();
            const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const waAdminMsg = `*NOTIFIKASI PENGGUNA BARU (WEB FORM)*
──────────────────────
` +
                `*Nama:* ${name}
` +
                `*Email:* ${validEmail}
` +
                `*Status:* Otomatis Aktif (Terverifikasi)
` +
                `*Metode:* Form Registrasi Web
` +
                (referrerName ? `*Referral:* ${referrerName}
` : '') +
                `*Waktu:* ${timeStr}
──────────────────────
` +
                `Panel Admin: https://ry-itsolutionts.web.id/admin`;
            for (const admPhone of (adminPhones || [])) {
                sendTextMessage(admPhone, waAdminMsg).catch(e => console.error('[WA Admin Notify Register Error]', e.message));
            }
        } catch (waErr) {
            console.error('[WA Admin Notify Register Error]', waErr.message);
        }

        res.status(201).json({ status: true, message: "Registrasi berhasil! Akun Anda telah aktif dan siap digunakan." });
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

// 4a. Forgot Password Request (Kirim OTP ke Email)
router.post('/auth/forgot-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: false, message: "Alamat email wajib diisi." });

        const validEmail = email.trim().toLowerCase();
        const user = await dbGet('SELECT id, name, email FROM users WHERE email = ?', [validEmail]);
        if (!user) {
            return res.status(404).json({ status: false, message: "Alamat email tidak ditemukan dalam sistem kami." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 menit

        await dbRun(
            'INSERT OR REPLACE INTO email_verifications (email, otp, type, payload, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [validEmail, otp, 'forgot_password', JSON.stringify({ userId: user.id }), expiresAt, new Date().toISOString()]
        );

        const emailSent = await sendPasswordResetOtpEmail(validEmail, otp, user.name);
        if (!emailSent.success) {
            return res.status(500).json({ status: false, message: "Gagal mengirim kode reset ke email. Silakan coba beberapa saat lagi." });
        }

        res.status(200).json({
            status: true,
            message: `Kode verifikasi reset password telah dikirim ke ${validEmail}. Silakan cek kotak masuk Anda.`
        });
    } catch (error) {
        console.error("[Forgot Password Request Error]:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan saat memproses permintaan reset password." });
    }
});

// 4b. Forgot Password Verify & Set New Password
router.post('/auth/forgot-password-verify', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ status: false, message: "Email, kode OTP, dan password baru wajib diisi." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ status: false, message: "Password baru minimal 6 karakter." });
        }

        const validEmail = email.trim().toLowerCase();
        const record = await dbGet(
            'SELECT * FROM email_verifications WHERE email = ? AND type = ?',
            [validEmail, 'forgot_password']
        );

        if (!record) {
            return res.status(400).json({ status: false, message: "Permintaan reset password tidak ditemukan. Silakan minta kode baru." });
        }

        if (Number(record.expires_at) < Date.now()) {
            await dbRun('DELETE FROM email_verifications WHERE email = ? AND type = ?', [validEmail, 'forgot_password']);
            return res.status(400).json({ status: false, message: "Kode verifikasi telah kedaluwarsa. Silakan minta kode baru." });
        }

        if (record.otp !== otp.trim()) {
            return res.status(400).json({ status: false, message: "Kode verifikasi OTP salah." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbRun('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, validEmail]);
        await dbRun('DELETE FROM email_verifications WHERE email = ? AND type = ?', [validEmail, 'forgot_password']);

        sendTelegramNotification(`🔑 Password untuk akun <b>${validEmail}</b> telah berhasil diperbarui via sistem otomatis.`, 'admin');

        res.status(200).json({
            status: true,
            message: "Password berhasil diperbarui! Silakan masuk dengan password baru Anda."
        });
    } catch (error) {
        console.error("[Forgot Password Verify Error]:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan saat mereset password." });
    }
});

// 4. Legacy Forgot Password
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
        userWithoutPassword.phone = userWithoutPassword.verifiedPhone || '';
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
