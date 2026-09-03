const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
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
                console.error("[Baileys] Error resetting session:", err);
            }
        }

        let waVersion = [2, 3000, 1043857760];
        try {
            const v = await fetchLatestBaileysVersion();
            if (v && v.version) {
                waVersion = v.version;
            }
        } catch (e) {
            console.warn("[Baileys] Using default version fallback:", e.message);
        }

        const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

        connectionState = "connecting";

        sock = makeWASocket({
            version: waVersion,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["Mac OS", "Chrome", "121.0.0"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Stop QR rotation if currently in the middle of pairing, connecting, or already open
            if (qr) {
                const isConnectingOrOpen = connectionState === "connecting" || connectionState === "open" || global.baileysStatus === "connecting" || global.baileysStatus === "open";
                if (isConnectingOrOpen) {
                    console.log("[Baileys] Sedang dalam proses pairing / connecting. Rotasi QR dihentikan.");
                } else {
                    try {
                        qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                        connectionState = "qr_ready";
                        global.baileysStatus = "qr_ready";
                        global.qrCode = qrCodeDataUrl;
                        isInitializing = false;
                        console.log("[Baileys] New QR Code generated ready for scan.");
                    } catch (e) {
                        console.error("[Baileys] QR generation error:", e);
                    }
                }
            }

            if (connection === "connecting") {
                connectionState = "connecting";
                global.baileysStatus = "connecting";
                console.log("[Baileys] Status koneksi: connecting...");
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515 || statusCode === 428;

                console.log(`[Baileys] Connection closed (statusCode: ${statusCode}). Error: ${lastDisconnect?.error?.message}`);

                // Jika terputus karena LoggedOut (401), hapus sesi
                if (isLoggedOut) {
                    console.log("[Baileys] Sesi WhatsApp telah Logged Out. Membersihkan sesi...");
                    connectionState = "disconnected";
                    global.baileysStatus = "disconnected";
                    qrCodeDataUrl = null;
                    global.qrCode = null;
                    connectedPhone = null;
                    try {
                        fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
                    } catch (e) {}
                    isInitializing = false;
                    return;
                }

                // Jika restartRequired (515) atau 428:
                // JANGAN hapus folder auth/session. Cukup panggil ulang initBaileys() tanpa mengosongkan kredensial.
                // Set global.baileysStatus = 'connecting' saat pairing diproses.
                if (isRestartRequired) {
                    console.log(`[Baileys] Restart required / pairing (Status: ${statusCode}). Menyambung ulang tanpa menghapus kredensial...`);
                    connectionState = "connecting";
                    global.baileysStatus = "connecting";
                    isInitializing = false;
                    setTimeout(() => initWhatsApp(false), 1500);
                    return;
                }

                // Drop koneksi lainnya
                connectionState = "disconnected";
                global.baileysStatus = "disconnected";
                isInitializing = false;
                setTimeout(() => initWhatsApp(false), 3000);
            } else if (connection === "open") {
                connectionState = "open";
                global.baileysStatus = "open";
                global.qrCode = null;
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
        isInitializing = false;
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
    initBaileys: initWhatsApp,
    logoutWhatsApp,
    logoutBaileys: logoutWhatsApp,
    getStatus,
    sendTextMessage
};
