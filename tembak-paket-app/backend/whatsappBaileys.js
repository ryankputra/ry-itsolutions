const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const SESSIONS_DIR = path.join(__dirname, "sessions", "baileys_auth");

let sock = null;
let qrCodeDataUrl = null;
let connectionState = "disconnected"; // 'disconnected' | 'connecting' | 'scan_ready' | 'open'
let connectedPhone = null;
let isInitializing = false;
let connectingTimer = null;

global.baileysStatus = "disconnected";
global.qrCode = null;

function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function clearConnectingTimer() {
    if (connectingTimer) {
        clearTimeout(connectingTimer);
        connectingTimer = null;
    }
}

async function initWhatsApp(forceNew = false) {
    if (forceNew) {
        isInitializing = false;
    }
    if (isInitializing) {
        console.log("[Baileys] Inisialisasi sedang berlangsung, melewati panggilan ganda.");
        return;
    }
    isInitializing = true;

    // 1. FORCE CLEANUP ON NEW INITIALIZATION
    try {
        if (sock) {
            console.log("[Baileys] Membersihkan socket Baileys lama sebelum inisialisasi baru...");
            try { sock.ev.removeAllListeners(); } catch (e) {}
            try { sock.end(undefined); } catch (e) {}
            sock = null;
        }
    } catch (err) {
        console.warn("[Baileys] Warning membersihkan socket:", err.message);
    }

    clearConnectingTimer();
    global.baileysStatus = "disconnected";
    connectionState = "disconnected";

    try {
        ensureDirExists(SESSIONS_DIR);

        if (forceNew) {
            try {
                fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
                ensureDirExists(SESSIONS_DIR);
                qrCodeDataUrl = null;
                global.qrCode = null;
                connectedPhone = null;
                connectionState = "disconnected";
                global.baileysStatus = "disconnected";
                console.log("[Baileys] Folder auth session berhasil direset.");
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

        // Buat instance socket baru
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

            // 2. LOGIKA GENERATE QR CODE: Izinkan jika status BUKAN 'open'
            if (qr) {
                const isOpen = connectionState === "open" || global.baileysStatus === "open";
                if (!isOpen) {
                    try {
                        qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                        connectionState = "scan_ready";
                        global.baileysStatus = "scan_ready";
                        global.qrCode = qrCodeDataUrl;
                        isInitializing = false;
                        clearConnectingTimer();
                        console.log("[Baileys] QR Code baru siap di-scan (scan_ready).");
                    } catch (e) {
                        console.error("[Baileys] QR generation error:", e);
                    }
                }
            }

            if (connection === "connecting") {
                connectionState = "connecting";
                global.baileysStatus = "connecting";
                console.log("[Baileys] Status koneksi: connecting...");

                // 3. TIMEOUT CONNECTING SAFETY:
                // Jika status 'connecting' bertahan > 15 detik tanpa menjadi 'open', paksa reset dan re-init
                clearConnectingTimer();
                connectingTimer = setTimeout(() => {
                    if (connectionState === "connecting" || global.baileysStatus === "connecting") {
                        console.warn("[Baileys] Status 'connecting' timeout (>15s). Memaksa reset & re-init Baileys socket...");
                        clearConnectingTimer();
                        try {
                            if (sock) {
                                sock.ev.removeAllListeners();
                                sock.end(undefined);
                                sock = null;
                            }
                        } catch (e) {}
                        global.baileysStatus = "disconnected";
                        connectionState = "disconnected";
                        isInitializing = false;
                        initWhatsApp(false);
                    }
                }, 15000);
            }

            if (connection === "close") {
                clearConnectingTimer();
                const statusCode = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515 || statusCode === 428;

                console.log(`[Baileys] Connection closed (statusCode: ${statusCode}). Error: ${lastDisconnect?.error?.message}`);

                // Terputus karena LoggedOut (401), bersihkan sesi
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

                // Jika restartRequired (515) atau 428 (Pairing Handshake)
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
                clearConnectingTimer();
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
        clearConnectingTimer();
        console.error("[Baileys] Init error:", error);
        connectionState = "disconnected";
        global.baileysStatus = "disconnected";
        isInitializing = false;
    }
}

async function logoutWhatsApp() {
    clearConnectingTimer();
    try {
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {}
            sock.ev.removeAllListeners();
            sock.end(undefined);
            sock = null;
        }
        if (fs.existsSync(SESSIONS_DIR)) {
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        }
        qrCodeDataUrl = null;
        global.qrCode = null;
        connectedPhone = null;
        connectionState = "disconnected";
        global.baileysStatus = "disconnected";
        isInitializing = false;
        console.log("[Baileys] Logged out and session cleared.");
        return true;
    } catch (e) {
        console.error("[Baileys] Logout error:", e);
        return false;
    }
}

function getStatus() {
    const isConn = connectionState === "open" || global.baileysStatus === "open";
    const currentQr = global.qrCode || qrCodeDataUrl;
    const currentState = isConn ? "open" : (global.baileysStatus || connectionState);
    return {
        isConnected: isConn,
        connected: isConn,
        state: currentState,
        status: currentState,
        connectedPhone: connectedPhone,
        currentQrCode: currentQr,
        qrCode: currentQr,
        qr: currentQr,
        statusText: isConn
            ? `Terhubung (${connectedPhone || 'Admin'})`
            : (currentState === 'scan_ready' || currentQr ? 'Scan QR Code' : (currentState === 'connecting' ? 'Menghubungkan...' : 'Sedang menyiapkan QR Code...'))
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
