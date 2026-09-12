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

/**
 * Template pengiriman OTP Verifikasi Pendaftaran Akun
 */
async function sendRegistrationOtpEmail(email, otpCode, userName = 'Pengguna') {
    const subject = `${otpCode} adalah Kode Verifikasi Ry-ITSolutions Anda`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kode Verifikasi</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #161e2e; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 28px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Ry-ITSolutions</h1>
                <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 14px;">Verifikasi Akun Baru</p>
            </div>
            <div style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 16px 0;">Halo <strong>${userName}</strong>,</p>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
                    Terima kasih telah mendaftar. Gunakan kode verifikasi di bawah ini untuk mengaktifkan akun Anda:
                </p>
                <div style="background: #0f172a; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">${otpCode}</span>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Kode ini berlaku selama 10 menit</p>
                </div>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 8px 0;">
                    ⚠️ <strong>PENTING:</strong> Jangan pernah memberikan kode ini kepada siapapun, termasuk staf Ry-ITSolutions.
                </p>
            </div>
            <div style="background: #0f172a; padding: 16px 28px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">© ${new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Kode Verifikasi Ry-ITSolutions Anda adalah: ${otpCode}. Kode ini berlaku selama 10 menit. Jangan berikan kepada siapapun.`;

    return sendEmail({ to: email, subject, html, text });
}


/**
 * Template pengiriman OTP Lupa / Reset Password
 */
async function sendPasswordResetOtpEmail(email, otpCode, userName = 'Pengguna') {
    const subject = `${otpCode} adalah Kode Reset Password Ry-ITSolutions Anda`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #161e2e; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(135deg, #ef4444, #8b5cf6); padding: 28px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Ry-ITSolutions</h1>
                <p style="color: #fecdd3; margin: 6px 0 0 0; font-size: 14px;">Permintaan Reset Password</p>
            </div>
            <div style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 16px 0;">Halo <strong>${userName}</strong>,</p>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
                    Kami menerima permintaan untuk mengatur ulang kata sandi akun Ry-ITSolutions Anda. Gunakan kode verifikasi 6 digit di bawah ini untuk membuat password baru:
                </p>
                <div style="background: #0f172a; border: 2px dashed #ef4444; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f87171; font-family: monospace;">${otpCode}</span>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Kode berlaku selama 15 menit</p>
                </div>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 8px 0;">
                    🔒 Jika Anda tidak merasa meminta reset password, Anda dapat mengabaikan email ini dengan aman. Password Anda tidak akan berubah.
                </p>
            </div>
            <div style="background: #0f172a; padding: 16px 28px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">© ${new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Kode Reset Password Ry-ITSolutions Anda adalah: ${otpCode}. Kode ini berlaku selama 15 menit. Jika Anda tidak memintanya, abaikan email ini.`;

    return sendEmail({ to: email, subject, html, text });
}

module.exports = {
    validateEmailActive,
    sendEmail,
    sendRegistrationOtpEmail,
    sendPasswordResetOtpEmail
};
