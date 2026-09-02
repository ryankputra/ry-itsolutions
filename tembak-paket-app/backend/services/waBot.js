/**
 * WhatsApp Admin Notifier & Controller Service (Self-Hosted via Baileys)
 * Free, zero third-party API costs.
 * 
 * Features:
 * 1. Persistent Auth: Sessions saved locally in /sessions/baileys_auth (survives PM2 restart).
 * 2. Terminal QR code display via qrcode library for easy STB terminal scanning.
 * 3. Automated Order Notification with Embedded Command Guides.
 * 4. Two-way WhatsApp Remote Admin Controller (.proses, .sukses, .gagal, .status, .help).
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { dbGet, dbRun, dbAll } = require("../config/db");

const SESSIONS_DIR = path.join(__dirname, "..", "sessions", "baileys_auth");

let sock = null;
let qrCodeDataUrl = null;
let connectionState = "disconnected"; // 'disconnected' | 'connecting' | 'open' | 'qr_ready'
let connectedPhone = null;
let isInitializing = false;

function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function cleanPhone(raw) {
    if (!raw) return '';
    let p = String(raw).replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.substring(1);
    else if (!p.startsWith('62')) p = '62' + p;
    return p;
}

/**
 * Get list of authorized admin phone numbers
 */
async function getAdminPhoneNumbers() {
    const adminPhones = new Set();

    // 1. From environment variables
    const envAdmin = process.env.WA_ADMIN_NUMBER || process.env.ADMIN_WHATSAPP || '6287767287284';
    envAdmin.split(',').forEach(num => {
        const cp = cleanPhone(num.trim());
        if (cp) adminPhones.add(cp);
    });

    // 2. From database settings
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'wa_admin_number'");
        if (row && row.value) {
            row.value.split(',').forEach(num => {
                const cp = cleanPhone(num.trim());
                if (cp) adminPhones.add(cp);
            });
        }
    } catch (e) {}

    // 3. From admin users in DB
    try {
        const admins = await dbAll("SELECT verifiedPhone FROM users WHERE role = 'admin'");
        if (admins && admins.length > 0) {
            admins.forEach(a => {
                const cp = cleanPhone(a.verifiedPhone);
                if (cp) adminPhones.add(cp);
            });
        }
    } catch (e) {}

    return Array.from(adminPhones);
}

/**
 * Initialize Baileys WhatsApp Client
 */
async function initWABot(forceNew = false) {
    if (forceNew) {
        isInitializing = false;
    }
    if (isInitializing) return;
    isInitializing = true;

    try {
        ensureDirExists(SESSIONS_DIR);

        if (forceNew) {
            try {
                if (sock) {
                    sock.ev.removeAllListeners();
                    sock.end();
                    sock = null;
                }
                fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
                ensureDirExists(SESSIONS_DIR);
                qrCodeDataUrl = null;
                connectedPhone = null;
                connectionState = "disconnected";
            } catch (err) {
                console.error("[WABot] Error resetting session:", err.message);
            }
        }

        let waVersion = [2, 3000, 1043857760];
        try {
            const v = await fetchLatestBaileysVersion();
            if (v && v.version) waVersion = v.version;
        } catch (e) {
            console.warn("[WABot] Using default version fallback:", e.message);
        }

        const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

        connectionState = "connecting";

        sock = makeWASocket({
            version: waVersion,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["Ry-ITSolutions", "Chrome", "122.0.0"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                    connectionState = "qr_ready";
                    isInitializing = false;

                    console.log("\n==================================================================");
                    console.log("📲 SCAN QR CODE WHATSAPP BOT ADMIN (Ry-ITSolutions)");
                    console.log("==================================================================");
                    QRCode.toString(qr, { type: 'terminal', small: true }, (err, terminalQR) => {
                        if (!err && terminalQR) {
                            console.log(terminalQR);
                        }
                    });
                    console.log("Buka WhatsApp di HP Anda > Perangkat Tertaut > Tautkan Perangkat.");
                    console.log("==================================================================\n");
                } catch (e) {
                    console.error("[WABot] QR generation error:", e);
                }
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[WABot] Koneksi terputus: ${lastDisconnect?.error?.message}, auto-reconnect: ${shouldReconnect}`);

                connectionState = "disconnected";
                qrCodeDataUrl = null;
                connectedPhone = null;

                if (shouldReconnect) {
                    isInitializing = false;
                    setTimeout(() => initWABot(false), 4000);
                } else {
                    try {
                        fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
                    } catch (e) {}
                    isInitializing = false;
                }
            } else if (connection === "open") {
                connectionState = "open";
                qrCodeDataUrl = null;
                connectedPhone = sock.user?.id ? sock.user.id.split(":")[0] : "Connected";
                console.log(`[WABot] 🚀 WhatsApp Bot Admin Terhubung sebagai: ${connectedPhone}`);
                isInitializing = false;
            }
        });

        // --- INCOMING MESSAGE CONTROLLER (ADMIN COMMANDS) ---
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || remoteJid.includes('@g.us')) continue; // Ignore groups for command execution

                const senderPhone = cleanPhone(remoteJid.replace('@s.whatsapp.net', ''));
                const messageText = (
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    ''
                ).trim();

                if (!messageText.startsWith('.')) continue;

                // Authorization check: Only configured admin numbers can execute commands
                const adminPhones = await getAdminPhoneNumbers();
                const isAuthorized = adminPhones.includes(senderPhone);

                if (!isAuthorized) {
                    console.warn(`[WABot Security] Pesan ditolak dari nomor non-admin: ${senderPhone}`);
                    continue;
                }

                await handleAdminCommand(remoteJid, messageText);
            }
        });

    } catch (error) {
        console.error("[WABot] Init error:", error.message);
        connectionState = "disconnected";
        isInitializing = false;
    }
}

/**
 * Command Processor for WhatsApp Admin Remote Control
 */
async function handleAdminCommand(replyJid, text) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();
    const orderIdArg = parts[1];
    const notesArg = parts.slice(2).join(' ');

    console.log(`[WABot Command] Received: ${command} ${orderIdArg || ''} from ${replyJid}`);

    if (command === '.bantuan' || command === '.help' || command === '.menu') {
        const helpMsg = `🤖 *PANDUAN PERINTAH BOT ADMIN Ry-ITSolutions*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `• *.proses <ID_ORDER>*\n` +
            `  Mengubah status pesanan menjadi PROCESSING.\n\n` +
            `• *.sukses <ID_ORDER> <CATATAN>*\n` +
            `  Menyelesaikan pesanan (status SUCCESS) dan menyimpan catatan.\n\n` +
            `• *.gagal <ID_ORDER> <ALASAN>*\n` +
            `  Membatalkan pesanan (status FAILED) & refund saldo user otomatis.\n\n` +
            `• *.status <ID_ORDER>*\n` +
            `  Mengecek status & rincian pesanan saat ini.\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, helpMsg);
        return;
    }

    if (!orderIdArg) {
        await replyWhatsApp(replyJid, `⚠️ *Format salah!*\nGunakan: \`${command} <ID_ORDER>\`\nKetik \`.help\` untuk panduan.`);
        return;
    }

    // Search transaction by exact ID or prefix match
    const cleanId = orderIdArg.trim();
    const trx = await dbGet(
        "SELECT * FROM transactions WHERE id = ? OR id LIKE ? ORDER BY createdAt DESC LIMIT 1",
        [cleanId, `%${cleanId}%`]
    );

    if (!trx) {
        await replyWhatsApp(replyJid, `❌ *Pesanan Tidak Ditemukan!*\nOrder ID \`${cleanId}\` tidak ada di database.`);
        return;
    }

    const currentStatus = trx.status;

    // 1. Command .proses
    if (command === '.proses') {
        await dbRun(
            "UPDATE transactions SET status = 'processing', admin_note = ? WHERE id = ?",
            [notesArg || 'Sedang diproses oleh admin via WA', trx.id]
        );
        const reply = `✅ *STATUS ORDER DIPERBARUI!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || 'User'}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `⚡ *Status Baru:* *PROCESSING (Diproses)*\n` +
            `📝 *Catatan:* ${notesArg || 'Sedang dikerjakan admin'}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    // 2. Command .sukses
    if (command === '.sukses') {
        const finalNote = notesArg || 'Pesanan berhasil diselesaikan oleh admin. Sinyal aktif.';
        await dbRun(
            "UPDATE transactions SET status = 'success', admin_note = ? WHERE id = ?",
            [finalNote, trx.id]
        );
        const reply = `🎉 *PESANAN SELESAI (SUCCESS)!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || 'User'}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `💰 *Nominal:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString('id-ID')}\n` +
            `✅ *Status:* *SUCCESS*\n` +
            `📝 *Hasil:* ${finalNote}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    // 3. Command .gagal (with automatic balance refund)
    if (command === '.gagal') {
        const failReason = notesArg || 'Pesanan dibatalkan oleh admin.';
        const refundAmount = Number(trx.platformFee || trx.originalPrice || 0);
        let refundNote = 'Tidak ada pengembalian dana.';

        if (refundAmount > 0 && (currentStatus === 'pending' || currentStatus === 'processing')) {
            await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, trx.userId]);
            refundNote = `Saldo Rp ${refundAmount.toLocaleString('id-ID')} telah dikembalikan ke user.`;
        }

        await dbRun(
            "UPDATE transactions SET status = 'failed', admin_note = ? WHERE id = ?",
            [failReason, trx.id]
        );

        const reply = `⚠️ *PESANAN DITOLAK / GAGAL (FAILED)*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || 'User'}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `❌ *Status:* *FAILED*\n` +
            `📝 *Alasan:* ${failReason}\n` +
            `💵 *Refund:* ${refundNote}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    // 4. Command .status
    if (command === '.status') {
        const reply = `ℹ️ *INFORMASI STATUS PESANAN*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || 'User'}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `💰 *Harga:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString('id-ID')}\n` +
            `⚡ *Status:* *${(trx.status || 'PENDING').toUpperCase()}*\n` +
            `📝 *Catatan:* ${trx.admin_note || '-'}\n` +
            `🕒 *Waktu:* ${new Date(trx.createdAt).toLocaleString('id-ID')}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    await replyWhatsApp(replyJid, `❓ Perintah tidak dikenali: \`${command}\`\nKetik \`.help\` untuk melihat daftar perintah.`);
}

/**
 * Send WhatsApp text message
 */
async function sendTextMessage(targetPhone, message) {
    try {
        if (connectionState !== "open" || !sock) {
            return { status: false, message: "WhatsApp Baileys bot belum terhubung / belum login." };
        }

        const phone = cleanPhone(targetPhone);
        if (!phone) return { status: false, message: "Nomor tujuan tidak valid." };

        const jid = `${phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        console.log(`[WABot] Pesan terkirim ke: ${phone}`);
        return { status: true, message: `Pesan berhasil dikirim ke ${phone}` };
    } catch (error) {
        console.error("[WABot] Send message error:", error.message);
        return { status: false, message: error.message };
    }
}

/**
 * Helper to reply to a WhatsApp JID
 */
async function replyWhatsApp(jid, text) {
    if (!sock || connectionState !== 'open') return;
    try {
        await sock.sendMessage(jid, { text });
    } catch (e) {
        console.error(`[WABot] Gagal mengirim balasan ke ${jid}:`, e.message);
    }
}

/**
 * Send New Order Notification to Admin with Embedded Command Guides
 * @param {Object} orderData
 */
async function notifyNewOrder(orderData) {
    try {
        if (!sock || connectionState !== 'open') {
            return;
        }

        const adminPhones = await getAdminPhoneNumbers();
        if (adminPhones.length === 0) {
            console.warn("[WABot] Tidak ada nomor WhatsApp admin yang terkonfigurasi.");
            return;
        }

        const {
            id,
            userName,
            packageName,
            serviceType,
            imei,
            price,
            speedOption,
            userImage,
            userImageCeir
        } = orderData;

        const isAutomated = serviceType === 'ceir' || serviceType === 'barcode';
        const speedDisplay = isAutomated 
            ? '⚡ Instant (Otomatis System)' 
            : (speedOption === 'fast' ? 'Fast (1-3 Jam)' : speedOption === 'semi' ? 'Semi Fast (1-12 Jam)' : 'Standar (1-3 Hari)');

        const messageBody = 
            `🔔 *PESANAN BARU MASUK!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${id}\`\n` +
            `👤 *Pelanggan:* ${userName || 'Pelanggan'}\n` +
            `📦 *Layanan:* ${packageName || 'Layanan'}\n` +
            `📱 *IMEI:* \`${imei || '-'}\`\n` +
            `💰 *Total Biaya:* Rp ${Number(price || 0).toLocaleString('id-ID')}\n` +
            `⚡ *Kecepatan:* ${speedDisplay}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 *PANDUAN PERINTAH CEPAT ADMIN:*\n` +
            `Balas/Reply pesan ini langsung dengan:\n` +
            `• \`.proses ${id}\` (Proses pesanan)\n` +
            `• \`.sukses ${id} <CATATAN>\` (Selesaikan)\n` +
            `• \`.gagal ${id} <ALASAN>\` (Tolak & refund)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`;

        // Send to all admin numbers
        for (const phone of adminPhones) {
            const adminJid = `${phone}@s.whatsapp.net`;

            // If user attached screenshot photo, send with caption
            let photoSent = false;
            const photoPath = (userImage || userImageCeir || '').split(',')[0].trim();

            if (photoPath) {
                const fullPath = path.join(__dirname, '..', photoPath);
                if (fs.existsSync(fullPath)) {
                    try {
                        await sock.sendMessage(adminJid, {
                            image: fs.readFileSync(fullPath),
                            caption: messageBody
                        });
                        photoSent = true;
                    } catch (imgErr) {
                        console.warn("[WABot] Gagal mengirim lampiran gambar:", imgErr.message);
                    }
                }
            }

            if (!photoSent) {
                await sock.sendMessage(adminJid, { text: messageBody });
            }
        }

        console.log(`[WABot] Notifikasi pesanan ${id} berhasil dikirim ke ${adminPhones.length} nomor admin.`);
    } catch (e) {
        console.error("[WABot] Error sending order notification:", e.message);
    }
}

/**
 * Logout and clear session
 */
async function logoutWABot() {
    try {
        if (sock) {
            try { await sock.logout(); } catch (e) {}
            sock.ev.removeAllListeners();
            sock.end();
            sock = null;
        }
        if (fs.existsSync(SESSIONS_DIR)) {
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        }
        qrCodeDataUrl = null;
        connectedPhone = null;
        connectionState = "disconnected";
        isInitializing = false;
        console.log("[WABot] Session cleared.");
        return true;
    } catch (e) {
        console.error("[WABot] Logout error:", e.message);
        return false;
    }
}

function getWAStatus() {
    return {
        isConnected: connectionState === "open",
        state: connectionState,
        connectedPhone: connectedPhone,
        qrCode: qrCodeDataUrl
    };
}

// Auto start on backend boot if session already exists
try {
    if (fs.existsSync(SESSIONS_DIR) && fs.readdirSync(SESSIONS_DIR).length > 0) {
        initWABot(false);
    }
} catch (e) {}

module.exports = {
    initWABot,
    logoutWABot,
    getWAStatus,
    sendTextMessage,
    notifyNewOrder
};
