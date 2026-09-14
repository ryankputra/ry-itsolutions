const dns = require('dns').promises;

const DISPOSABLE_DOMAINS = new Set([
    'tempmail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com',
    'throwawaymail.com', 'yopmail.com', 'sharklasers.com', 'dispostable.com',
    'trashmail.com', 'temp-mail.org', 'fakemailgenerator.com', 'getnada.com',
    'mohmal.com', 'inboxkitten.com', 'crazymailing.com', 'generator.email'
]);

/**
 * Memvalidasi apakah format email valid, bukan domain sampah/disposable,
 * dan domainnya memiliki Mail Exchange (MX) server aktif di DNS.
 */
async function validateEmailActive(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email tidak boleh kosong.' };
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, message: 'Format alamat email tidak valid.' };
    }

    const parts = trimmed.split('@');
    const domain = parts[1];
    if (!domain) {
        return { valid: false, message: 'Domain email tidak ditemukan.' };
    }

    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { valid: false, message: 'Email sementara (temp/disposable mail) tidak diizinkan. Gunakan email pribadi yang aktif.' };
    }

    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return { valid: false, message: 'Domain email tidak memiliki server surat (MX) aktif. Pastikan email Anda benar.' };
        }
        return { valid: true, domain, trimmedEmail: trimmed };
    } catch (err) {
        console.warn(`[EmailValidation] Gagal resolve MX untuk ${domain}:`, err.code || err.message);
        return { valid: false, message: 'Domain email tidak valid atau tidak dapat menerima surat masuk.' };
    }
}

/**
 * Mengirim email menggunakan Resend API
 */
async function sendEmail({ to, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[Resend] RESEND_API_KEY belum dikonfigurasi.');
        return { success: false, message: 'RESEND_API_KEY belum disetel.' };
    }

    const fromAddress = process.env.EMAIL_FROM || 'Ry-ITSolutions <noreply@ry-itsolutionts.web.id>';
    const recipients = Array.isArray(to) ? to : [to];

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromAddress,
                to: recipients,
                subject: subject,
                html: html,
                text: text
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[Resend Error]', data);
            return { success: false, error: data };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[Resend Exception]', err.message);
        return { success: false, error: err.message };
    }
}

function cleanName(name) {
    if (!name || typeof name !== 'string') return 'Pengguna';
    const stripped = name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F170}-\u{1F251}]/gu, '').trim();
    return stripped || 'Pengguna';
}

/**
 * Template pengiriman OTP Verifikasi Pendaftaran Akun
 */
async function sendRegistrationOtpEmail(email, otpCode, userName = 'Pengguna') {
    const safeName = cleanName(userName);
    const subject = `Kode Verifikasi Pendaftaran: ${otpCode}`;
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifikasi Pendaftaran</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Ry-ITSolutions</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Verifikasi Akun Baru</p>
            </div>
            <div style="padding: 28px 24px;">
                <p style="font-size: 15px; margin: 0 0 14px 0; color: #1e293b;">Halo <strong>${safeName}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    Terima kasih telah mendaftar. Gunakan kode verifikasi 6 digit di bawah ini untuk mengaktifkan akun Anda:
                </p>
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 0 0 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${otpCode}</span>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Kode berlaku selama 5 menit.</p>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                    PENTING: Jangan berikan kode ini kepada siapa pun, termasuk staf Ry-ITSolutions.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Kode Verifikasi Pendaftaran Ry-ITSolutions Anda adalah: ${otpCode}. Kode berlaku selama 5 menit. Jangan berikan kepada siapa pun.`;

    return sendEmail({ to: email, subject, html, text });
}


/**
 * Template pengiriman OTP Lupa / Reset Password
 */
async function sendPasswordResetOtpEmail(email, otpCode, userName = 'Pengguna') {
    const safeName = cleanName(userName);
    const subject = `Kode Verifikasi Reset Password: ${otpCode}`;
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Ry-ITSolutions</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Permintaan Reset Password</p>
            </div>
            <div style="padding: 28px 24px;">
                <p style="font-size: 15px; margin: 0 0 14px 0; color: #1e293b;">Halo <strong>${safeName}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    Kami menerima permintaan untuk mengatur ulang kata sandi akun Ry-ITSolutions Anda. Gunakan kode verifikasi 6 digit berikut:
                </p>
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 0 0 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${otpCode}</span>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Kode berlaku selama 5 menit.</p>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                    PENTING: Jangan berikan kode ini kepada siapa pun. Jika Anda tidak merasa meminta reset password, abaikan email ini.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Kode Reset Password Ry-ITSolutions Anda adalah: ${otpCode}. Kode berlaku selama 5 menit. Jika Anda tidak memintanya, abaikan email ini.`;

    return sendEmail({ to: email, subject, html, text });
}


/**
 * Mengirimkan email OTP untuk perubahan alamat email akun
 */
async function sendEmailChangeOtpEmail(newEmail, otpCode, userName = 'Pengguna') {
    const safeName = cleanName(userName);
    const subject = `Kode Verifikasi Perubahan Email: ${otpCode}`;
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Perubahan Email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Ry-ITSolutions</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Verifikasi Perubahan Alamat Email</p>
            </div>
            <div style="padding: 28px 24px;">
                <p style="font-size: 15px; margin: 0 0 14px 0; color: #1e293b;">Halo <strong>${safeName}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    Kami menerima permintaan untuk mengganti alamat email akun Ry-ITSolutions Anda. Masukkan kode verifikasi 6 digit berikut:
                </p>
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 0 0 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${otpCode}</span>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Kode berlaku selama 5 menit.</p>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                    PENTING: Jika Anda tidak pernah meminta perubahan alamat email, abaikan email ini dan akun Anda akan tetap aman.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Kode Verifikasi Perubahan Email Ry-ITSolutions Anda adalah: ${otpCode}. Kode berlaku selama 5 menit. Jika Anda tidak memintanya, abaikan email ini.`;

    return sendEmail({ to: newEmail, subject, html, text });
}

module.exports = {
    validateEmailActive,
    sendEmail,
    sendRegistrationOtpEmail,
    sendPasswordResetOtpEmail,
    sendEmailChangeOtpEmail
};
