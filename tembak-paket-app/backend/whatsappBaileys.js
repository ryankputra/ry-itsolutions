const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const SESSIONS_DIR = path.join(__dirname, "sessions", "baileys_auth");

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

async function initWhatsApp(forceNew = false) {
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
                console.error("[Baileys] Error resetting session:", err);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

        connectionState = "connecting";

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["Ry-ITSolutions Bot", "Chrome", "1.0.0"],
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
                    console.log("[Baileys] New QR Code generated ready for scan.");
                } catch (e) {
                    console.error("[Baileys] QR generation error:", e);
                }
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[Baileys] Connection closed due to: ${lastDisconnect?.error?.message}, reconnecting: ${shouldReconnect}`);

                connectionState = "disconnected";
                qrCodeDataUrl = null;
                connectedPhone = null;

                if (shouldReconnect) {
                    isInitializing = false;
                    setTimeout(() => initWhatsApp(false), 3000);
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
                console.log(`[Baileys] WhatsApp Connected Successfully as ${connectedPhone}! 🚀`);
                isInitializing = false;
            }
        });

    } catch (error) {
        console.error("[Baileys] Init error:", error);
        connectionState = "disconnected";
        isInitializing = false;
    }
}

async function logoutWhatsApp() {
    try {
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {}
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
        console.log("[Baileys] Logged out and session cleared.");
        return true;
    } catch (e) {
        console.error("[Baileys] Logout error:", e);
        return false;
    }
}

function getStatus() {
    return {
        isConnected: connectionState === "open",
        state: connectionState,
        connectedPhone: connectedPhone,
        qrCode: qrCodeDataUrl
    };
}

async function sendTextMessage(targetPhone, message) {
    try {
        if (connectionState !== "open" || !sock) {
            return { status: false, message: "WhatsApp Baileys bot belum terhubung / belum login." };
        }

        let cleanPhone = String(targetPhone).replace(/\D/g, "");
        if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
        else if (!cleanPhone.startsWith("62")) cleanPhone = "62" + cleanPhone;

        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Check if number is on WhatsApp
        const [result] = await sock.onWhatsApp(jid);
        if (!result?.exists) {
            console.warn(`[Baileys] Number ${cleanPhone} is not registered on WhatsApp.`);
            return { status: false, message: `Nomor ${cleanPhone} tidak terdaftar di WhatsApp.` };
        }

        await sock.sendMessage(jid, { text: message });
        console.log(`[Baileys] Message sent successfully to ${cleanPhone}`);
        return { status: true, message: `Pesan berhasil dikirim ke ${cleanPhone}` };
    } catch (error) {
        console.error("[Baileys] Send message error:", error);
        return { status: false, message: error.message };
    }
}

// Auto start if session exists on boot
try {
    if (fs.existsSync(SESSIONS_DIR) && fs.readdirSync(SESSIONS_DIR).length > 0) {
        initWhatsApp(false);
    }
} catch (e) {}

module.exports = {
    initWhatsApp,
    logoutWhatsApp,
    getStatus,
    sendTextMessage
};
