/**
 * WhatsApp Admin Notifier & Controller Service (Self-Hosted via Baileys)
 * Free, zero third-party API costs.
 * 
 * Features:
 * 1. Persistent Auth: Sessions saved locally in /sessions/baileys_auth (survives PM2 restart).
 * 2. High-speed In-Memory Signal Key Store caching via makeCacheableSignalKeyStore.
 * 3. Instant synchronous creds sync to prevent pairing loss on slow ARM/STB storage.
 * 4. Dual Pairing Modes: Web QR Code (Chrome) + 8-Digit Pairing Code (Phone Number).
 * 5. Automated Order Notification with Embedded Command Guides.
 * 6. Two-way WhatsApp Remote Admin Controller (.proses, .sukses, .gagal, .status, .help).
 */

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    Browsers, 
    makeCacheableSignalKeyStore,
    BufferJSON 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { dbGet, dbRun, dbAll } = require("../config/db");

const SESSIONS_DIR = path.join(__dirname, "..", "sessions", "baileys_auth");

let sock = null;
let currentQrCode = null;
let qrCodeDataUrl = null;
let connectionState = "disconnected"; // "disconnected" | "connecting" | "scan_ready" | "pairing" | "open"
let connectedPhone = null;
let isInitializing = false;
let connectingTimer = null;
let inMemoryCreds = null;

global.baileysStatus = "disconnected";
global.qrCode = null;

const WA_LOGS_MAX = 50;
const waLogsBuffer = [];

function addWALog(msg) { logWABot(msg, "info"); }
function logWABot(msg, level = "info") {
    const timestamp = new Date().toLocaleTimeString("id-ID");
    const entry = `[${timestamp}] [${level.toUpperCase()}] ${msg}`;
    waLogsBuffer.push(entry);
    if (waLogsBuffer.length > WA_LOGS_MAX) waLogsBuffer.shift();
    if (level === "error") console.error(`[WABot] ${msg}`);
    else if (level === "warn") console.warn(`[WABot] ${msg}`);
    else console.log(`[WABot] ${msg}`);
}

function getWALogs() {
    return waLogsBuffer.slice();
}

function clearConnectingTimer() {
    if (connectingTimer) {
        clearTimeout(connectingTimer);
        connectingTimer = null;
    }
}

function applyBaileysPatches() {
    try {
        const candidates = [
            path.join(__dirname, "..", "node_modules", "@whiskeysockets", "baileys", "lib", "Utils", "validate-connection.js"),
            path.resolve(process.cwd(), "node_modules", "@whiskeysockets", "baileys", "lib", "Utils", "validate-connection.js")
        ];
        for (const targetPath of candidates) {
            if (!fs.existsSync(targetPath)) continue;
            let fileCode = fs.readFileSync(targetPath, "utf8");
            if (fileCode.includes("/* PATCH_BIZ_SIGNATURE_APPLIED */")) continue;

            const targetStr = "if (Buffer.compare(hmac, advSign) !== 0) {\n        throw new Boom('Invalid account signature');\n    }";
            if (fileCode.includes(targetStr)) {
                const patchedStr = `/* PATCH_BIZ_SIGNATURE_APPLIED */\n    if (Buffer.compare(hmac, advSign) !== 0) {\n        const altPrefix = isHostedAccount ? Buffer.alloc(0) : Buffer.from([6, 5]);\n        const altSign = hmacSign(Buffer.concat([altPrefix, details]), Buffer.from(advSecretKey, 'base64'));\n        if (Buffer.compare(hmac, altSign) === 0) {\n            isHostedAccount = !isHostedAccount;\n            hmacPrefix = altPrefix;\n            advSign = altSign;\n        } else {\n            throw new Boom('Invalid account signature');\n        }\n    }`;
                fileCode = fileCode.replace(targetStr, patchedStr);

                const curveTarget = "if (!Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {\n        throw new Boom('Failed to verify account signature');\n    }";
                const curvePatched = `if (!Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {\n        const altMsg = Buffer.concat([isHostedAccount ? Buffer.from([6, 0]) : Buffer.from([6, 5]), deviceDetails, signedIdentityKey.public]);\n        if (!Curve.verify(accountSignatureKey, altMsg, accountSignature)) {\n            throw new Boom('Failed to verify account signature');\n        }\n    }`;
                if (fileCode.includes(curveTarget)) {
                    fileCode = fileCode.replace(curveTarget, curvePatched);
                }

                fs.writeFileSync(targetPath, fileCode, "utf8");
                logWABot("✅ Patch validasi signature WhatsApp (Business & Standard) berhasil diterapkan.", "info");
                break;
            }
        }
    } catch (e) {
        console.warn("[WABot] Notice: signature patch check:", e.message);
    }
}

let isAutoUpgrading = false;
function checkAndAutoUpgradeBaileys(currentVer) {
    if (!currentVer || currentVer === "6.7.24" || isAutoUpgrading) return;
    isAutoUpgrading = true;
    logWABot(`[Auto-Upgrade STB] Baileys v${currentVer} terdeteksi. Memperbarui ke v6.7.24 secara otomatis...`, "warn");
    const cmd = "npm --prefix tembak-paket-app/backend install @whiskeysockets/baileys@6.7.24 --no-audit --ignore-scripts || npm install @whiskeysockets/baileys@6.7.24 --no-audit --ignore-scripts";
    exec(cmd, (err, stdout) => {
        isAutoUpgrading = false;
        if (!err) {
            logWABot("[Auto-Upgrade STB] Berhasil memperbarui Baileys ke v6.7.24! Memuat ulang backend...", "info");
            setTimeout(() => {
                exec("pm2 restart backend || pm2 restart all");
            }, 1000);
        } else {
            logWABot("[Auto-Upgrade STB] Gagal memperbarui: " + err.message, "error");
        }
    });
}

function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function syncSaveCreds(creds) {
    if (!creds) return;
    try {
        ensureDirExists(SESSIONS_DIR);
        const credsFile = path.join(SESSIONS_DIR, "creds.json");
        fs.writeFileSync(credsFile, JSON.stringify(creds, BufferJSON.replacer, 2), "utf-8");
    } catch (e) {
        console.error("[WABot] Error writing creds.json synchronously:", e.message);
    }
}

function cleanPhone(raw) {
    if (!raw) return "";
    let p = String(raw).replace(/\D/g, "");
    if (p.startsWith("0")) p = "62" + p.substring(1);
    else if (!p.startsWith("62")) p = "62" + p;
    return p;
}

/**
 * Get list of authorized admin phone numbers
 */
async function getAdminPhoneNumbers() {
    const adminPhones = new Set();

    // 1. From environment variables
    const envAdmin = process.env.WA_ADMIN_NUMBER || process.env.ADMIN_WHATSAPP || "6287767287284";
    envAdmin.split(",").forEach(num => {
        const cp = cleanPhone(num.trim());
        if (cp) adminPhones.add(cp);
    });

    // 2. From database settings
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'wa_admin_number'");
        if (row && row.value) {
            row.value.split(",").forEach(num => {
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
    if (isInitializing) {
        console.log("[WABot] Inisialisasi sedang berlangsung, melewati panggilan ganda.");
        return;
    }
    isInitializing = true;

    // 1. Force cleanup old socket
    try {
        if (sock) {
            console.log("[WABot] Membersihkan socket Baileys lama sebelum inisialisasi baru...");
            try { sock.ev.removeAllListeners(); } catch (e) {}
            try { sock.end(undefined); } catch (e) {}
            sock = null;
        }
    } catch (err) {
        console.warn("[WABot] Warning membersihkan socket:", err.message);
    }

    clearConnectingTimer();

    try {
        ensureDirExists(SESSIONS_DIR);

        if (forceNew) {
            try {
                fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
                ensureDirExists(SESSIONS_DIR);
                qrCodeDataUrl = null;
                currentQrCode = null;
                global.qrCode = null;
                connectedPhone = null;
                inMemoryCreds = null;
                connectionState = "disconnected";
                global.baileysStatus = "disconnected";
                logWABot("Folder auth session berhasil direset.", "info");
            } catch (err) {
                console.error("[WABot] Error resetting session:", err.message);
            }
        }

        // Baileys library info & Multi-Device versioning
        let baileysLibVer = "unknown";
        try {
            baileysLibVer = require("@whiskeysockets/baileys/package.json").version;
        } catch (e) {}

        let waVersion = [2, 3000, 1043857760];
        try {
            const v = await fetchLatestBaileysVersion();
            if (v && v.version) {
                waVersion = v.version;
            }
        } catch (e) {
            console.warn("[WABot] Using default version fallback:", e.message);
        }
        logWABot(`Baileys Library v${baileysLibVer} | MD Version: ${waVersion.join(".")}`, "info");
        applyBaileysPatches();
        checkAndAutoUpgradeBaileys(baileysLibVer);

        const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

        // Flash Memory Protection: Pulihkan creds jika di in-memory sudah ada tapi disk belum sinkron
        if (inMemoryCreds?.me?.id && !state.creds?.me?.id) {
            logWABot(`Memulihkan kredensial me dari in-memory cache (${inMemoryCreds.me.id})...`, "info");
            Object.assign(state.creds, inMemoryCreds);
            syncSaveCreds(state.creds);
            try { await saveCreds(); } catch (e) {}
        } else if (state.creds?.me?.id) {
            inMemoryCreds = { ...state.creds };
        }

        if (connectionState !== "pairing") {
            connectionState = "connecting";
            global.baileysStatus = "connecting";
        }

        // Custom stream logger to pipe Baileys internal warnings & pairing events directly to UI
        const pinoStream = {
            write: (str) => {
                try {
                    const p = JSON.parse(str);
                    const msg = p.msg || p.message || str;
                    // Abaikan pesan background history-sync lama yang wajar saat awal login
                    if (
                        msg.includes("handling message") ||
                        msg.includes("Bad MAC") ||
                        msg.includes("decrypt")
                    ) {
                        return;
                    }
                    if (p.level >= 40) {
                        logWABot(`[Baileys ${p.level >= 50 ? "ERR" : "WARN"}] ${msg}`, p.level >= 50 ? "error" : "warn");
                    } else if (p.level === 30 && (msg.includes("pair") || msg.includes("login") || msg.includes("open") || msg.includes("restart"))) {
                        logWABot(`[Baileys] ${msg}`, "info");
                    }
                } catch (e) {}
            }
        };
        const customLogger = pino({ level: "info" }, pinoStream);

        sock = makeWASocket({
            version: waVersion,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            printQRInTerminal: false,
            logger: customLogger,
            browser: Browsers.macOS("Chrome"),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            qrTimeout: 60000,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            generateHighQualityLinkPreview: false
        });

        // Simpan kredensial langsung & pertahankan di memory state & disk secara sinkron
        sock.ev.on("creds.update", async (update) => {
            if (update) {
                Object.assign(state.creds, update);
                if (inMemoryCreds) {
                    Object.assign(inMemoryCreds, update);
                } else {
                    inMemoryCreds = { ...state.creds };
                }
            }
            syncSaveCreds(state.creds);
            try {
                await saveCreds();
            } catch (err) {
                console.error("[WABot] Error saving credentials:", err.message);
            }
            if (update?.me?.id) {
                logWABot(`Kredensial pairing me berhasil diterima: ${update.me.id}`, "info");
            }
        });

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;

            if (isNewLogin) {
                logWABot("✅ Perangkat WhatsApp berhasil dipasangkan dari HP! Mengamankan sesi...", "info");
                connectionState = "pairing";
                global.baileysStatus = "pairing";
                currentQrCode = null;
                qrCodeDataUrl = null;
                global.qrCode = null;
                syncSaveCreds(state.creds);
                try { await saveCreds(); } catch (e) {}
            }

            // 1. Tangani QR Code baru
            if (qr) {
                const isOpen = connectionState === "open" || global.baileysStatus === "open";
                const isPairing = connectionState === "pairing" || global.baileysStatus === "pairing";
                const hasMe = Boolean(state?.creds?.me?.id || inMemoryCreds?.me?.id);

                if (isOpen || isPairing || hasMe) {
                    logWABot("QR diabaikan karena socket sedang proses pairing / sudah memiliki login.", "info");
                    return;
                }

                try {
                    currentQrCode = qr;
                    qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                    connectionState = "scan_ready";
                    global.baileysStatus = "scan_ready";
                    global.qrCode = qrCodeDataUrl;
                    isInitializing = false;
                    clearConnectingTimer();

                    logWABot("Kode QR baru siap di-scan (aktif 60 detik)", "info");
                    console.log("\n==================================================================");
                    console.log("📲 SCAN QR CODE WHATSAPP BOT ADMIN (Ry-ITSolutions)");
                    console.log("==================================================================");
                    QRCode.toString(qr, { type: "terminal", small: true }, (err, terminalQR) => {
                        if (!err && terminalQR) console.log(terminalQR);
                    });
                    console.log("Buka WhatsApp di HP Anda > Perangkat Tertaut > Tautkan Perangkat.");
                    console.log("==================================================================\n");
                } catch (e) {
                    console.error("[WABot] QR generation error:", e);
                }
            }

            // 2. Status connecting
            if (connection === "connecting") {
                if (connectionState !== "scan_ready" && connectionState !== "open" && connectionState !== "pairing") {
                    connectionState = "connecting";
                    global.baileysStatus = "connecting";
                }
                console.log("[WABot] Status koneksi: connecting...");

                clearConnectingTimer();
                connectingTimer = setTimeout(() => {
                    if (connectionState === "connecting" || global.baileysStatus === "connecting") {
                        console.warn("[WABot] Status connecting timeout (>50s). Re-init socket...");
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
                        initWABot(false);
                    }
                }, 50000);
            }

            // 3. Status open (Berhasil Terhubung)
            if (connection === "open") {
                clearConnectingTimer();
                syncSaveCreds(state.creds);
                try { await saveCreds(); } catch (e) {}
                connectionState = "open";
                global.baileysStatus = "open";
                currentQrCode = null;
                qrCodeDataUrl = null;
                global.qrCode = null;
                connectedPhone = sock.user?.id ? sock.user.id.split(":")[0] : (sock.user?.phone || "Connected");
                logWABot(`🚀 WhatsApp Bot Terhubung sebagai: ${connectedPhone}`, "info");
                console.log(`[WABot] 🚀 WhatsApp Bot Admin Terhubung sebagai: ${connectedPhone}`);
                isInitializing = false;
            }

            // 4. Status close (Koneksi terputus / QR discan memicu 515 restart)
            if (connection === "close") {
                clearConnectingTimer();
                const statusCode = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                const isRestart = statusCode === DisconnectReason.restartRequired || statusCode === 515;

                logWABot(`Koneksi socket terputus (Status: ${statusCode || "unknown"}). Error: ${lastDisconnect?.error?.message || "None"}`, "warn");

                // Jika terputus karena LoggedOut (401), bersihkan sesi & siapkan QR baru otomatis
                if (isLoggedOut) {
                    logWABot("Sesi WhatsApp Logged Out (401). Membersihkan sesi & menyiapkan QR baru...", "warn");
                    connectionState = "disconnected";
                    global.baileysStatus = "disconnected";
                    currentQrCode = null;
                    qrCodeDataUrl = null;
                    global.qrCode = null;
                    connectedPhone = null;
                    inMemoryCreds = null;
                    isInitializing = false;
                    try { fs.rmSync(SESSIONS_DIR, { recursive: true, force: true }); } catch (e) {}
                    setTimeout(() => initWABot(false), 2000);
                    return;
                }

                // Jika terputus karena 515 atau socket close setelah pairing/scan
                if (isRestart || connectionState === "pairing" || global.baileysStatus === "pairing") {
                    logWABot("✅ QR / Pairing berhasil dipindai! Menghubungkan ulang sesi terautentikasi (515)...", "info");
                    connectionState = "pairing";
                    global.baileysStatus = "pairing";
                    currentQrCode = null;
                    qrCodeDataUrl = null;
                    global.qrCode = null;
                    isInitializing = false;
                    syncSaveCreds(state.creds);
                    try { await saveCreds(); } catch (e) {}
                    // Jeda 1200ms agar flush I/O di storage STB tuntas & server WA siap menerima koneksi companion
                    setTimeout(() => initWABot(false), 1200);
                    return;
                }

                // Reconnect untuk status kode lainnya (network drop / keepalive / 408 / 428)
                if (state?.creds?.me?.id || inMemoryCreds?.me?.id) {
                    connectionState = "connecting";
                    global.baileysStatus = "connecting";
                } else {
                    connectionState = "connecting";
                    global.baileysStatus = "connecting";
                }
                isInitializing = false;
                setTimeout(() => initWABot(false), 2000);
            }
        });

        // --- INCOMING MESSAGE CONTROLLER (ADMIN COMMANDS) ---
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;

            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || remoteJid.includes("@g.us")) continue; // Ignore groups for command execution

                const senderPhone = cleanPhone(remoteJid.replace("@s.whatsapp.net", ""));
                const messageText = (
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    ""
                ).trim();

                if (!messageText.startsWith(".")) continue;

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
 * Request an 8-Digit Pairing Code for Linking WhatsApp
 */
async function requestPairingCode(phoneNumber) {
    try {
        const clean = cleanPhone(phoneNumber);
        if (!clean) {
            return { status: false, message: "Nomor WhatsApp tidak valid. Format contoh: 087767287284" };
        }

        if (!sock) {
            await initWABot(false);
        }

        // Tunggu socket siap
        for (let i = 0; i < 25; i++) {
            if (sock && typeof sock.requestPairingCode === "function" && sock.ws?.isOpen) break;
            await new Promise(r => setTimeout(r, 200));
        }

        if (!sock || typeof sock.requestPairingCode !== "function") {
            return { status: false, message: "Socket WhatsApp belum siap. Silakan klik Reset Sesi WA lalu coba lagi." };
        }

        logWABot(`Meminta kode pairing 8 digit untuk nomor: ${clean}...`, "info");
        const rawCode = await sock.requestPairingCode(clean);
        const code = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
        logWABot(`✅ KODE PAIRING 8 DIGIT: ${code}. Masukkan kode ini di WhatsApp HP Anda.`, "info");
        return { status: true, code: code, phone: clean };
    } catch (e) {
        logWABot(`Gagal membuat kode pairing: ${e.message}`, "error");
        return { status: false, message: e.message };
    }
}

/**
 * Command Processor for WhatsApp Admin Remote Control
 */
async function handleAdminCommand(replyJid, text) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();
    const orderIdArg = parts[1];
    const notesArg = parts.slice(2).join(" ");

    console.log(`[WABot Command] Received: ${command} ${orderIdArg || ""} from ${replyJid}`);

    if (command === ".bantuan" || command === ".help" || command === ".menu") {
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
    if (command === ".proses") {
        await dbRun(
            "UPDATE transactions SET status = 'processing', admin_note = ? WHERE id = ?",
            [notesArg || "Sedang diproses oleh admin via WA", trx.id]
        );
        const reply = `✅ *STATUS ORDER DIPERBARUI!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || "User"}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `⚡ *Status Baru:* *PROCESSING (Diproses)*\n` +
            `📝 *Catatan:* ${notesArg || "Sedang dikerjakan admin"}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    // 2. Command .sukses
    if (command === ".sukses") {
        const finalNote = notesArg || "Pesanan berhasil diselesaikan oleh admin. Sinyal aktif.";
        await dbRun(
            "UPDATE transactions SET status = 'success', admin_note = ? WHERE id = ?",
            [finalNote, trx.id]
        );
        const reply = `🎉 *PESANAN SELESAI (SUCCESS)!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || "User"}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `💰 *Nominal:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `✅ *Status:* *SUCCESS*\n` +
            `📝 *Hasil:* ${finalNote}\n` +
            `━━━━━━━━━━━━━━━━━━`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    // 3. Command .gagal (with automatic balance refund)
    if (command === ".gagal") {
        const failReason = notesArg || "Pesanan dibatalkan oleh admin.";
        const refundAmount = Number(trx.platformFee || trx.originalPrice || 0);
        let refundNote = "Tidak ada pengembalian dana.";

        if (refundAmount > 0 && (currentStatus === "pending" || currentStatus === "processing")) {
            await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, trx.userId]);
            refundNote = `Saldo Rp ${refundAmount.toLocaleString("id-ID")} telah dikembalikan ke user.`;
        }

        await dbRun(
            "UPDATE transactions SET status = 'failed', admin_note = ? WHERE id = ?",
            [failReason, trx.id]
        );

        const reply = `⚠️ *PESANAN DITOLAK / GAGAL (FAILED)*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || "User"}\n` +
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
    if (command === ".status") {
        const reply = `ℹ️ *INFORMASI STATUS PESANAN*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || "User"}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `💰 *Harga:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `⚡ *Status:* *(${(trx.status || "PENDING").toUpperCase()})*\n` +
            `📝 *Catatan:* ${trx.admin_note || "-"}\n` +
            `🕒 *Waktu:* ${new Date(trx.createdAt).toLocaleString("id-ID")}\n` +
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
    if (!sock || connectionState !== "open") return;
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
        if (!sock || connectionState !== "open") {
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

        const isAutomated = serviceType === "ceir" || serviceType === "barcode";
        const speedDisplay = isAutomated 
            ? "⚡ Instant (Otomatis System)" 
            : (speedOption === "fast" ? "Fast (1-3 Jam)" : speedOption === "semi" ? "Semi Fast (1-12 Jam)" : "Standar (1-3 Hari)");

        const messageBody = 
            `🔔 *PESANAN BARU MASUK!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${id}\`\n` +
            `👤 *Pelanggan:* ${userName || "Pelanggan"}\n` +
            `📦 *Layanan:* ${packageName || "Layanan"}\n` +
            `📱 *IMEI:* \`${imei || "-"}\`\n` +
            `💰 *Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n` +
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
            const photoPath = (userImage || userImageCeir || "").split(",")[0].trim();

            if (photoPath) {
                const fullPath = path.join(__dirname, "..", photoPath);
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
            try { sock.ev.removeAllListeners(); } catch (e) {}
            try { sock.end(); } catch (e) {}
            sock = null;
        }
        if (fs.existsSync(SESSIONS_DIR)) {
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        }
        qrCodeDataUrl = null;
        currentQrCode = null;
        global.qrCode = null;
        connectedPhone = null;
        inMemoryCreds = null;
        connectionState = "disconnected";
        global.baileysStatus = "disconnected";
        isInitializing = false;
        logWABot("Sesi WhatsApp berhasil dibersihkan / logout.", "info");
        return true;
    } catch (e) {
        console.error("[WABot] Logout error:", e.message);
        return false;
    }
}

function getWAStatus() {
    const isConnected = connectionState === "open" || global.baileysStatus === "open";
    const currentState = isConnected ? "open" : (global.baileysStatus || connectionState);
    const isPairing = currentState === "pairing";
    const hasQr = !isConnected && !isPairing && Boolean(global.qrCode || qrCodeDataUrl || currentQrCode);
    const activeQr = hasQr ? (global.qrCode || qrCodeDataUrl || currentQrCode) : null;

    let statusText = "Terputus";
    if (isConnected) {
        statusText = `Terhubung (${connectedPhone || "Admin"})`;
    } else if (isPairing) {
        statusText = "Sedang Menautkan Perangkat WhatsApp...";
    } else if (hasQr) {
        statusText = "Menunggu Scan QR Code";
    } else if (currentState === "connecting") {
        statusText = "Menyiapkan QR Code WhatsApp...";
    }

    return {
        success: true,
        connected: isConnected,
        isConnected: isConnected,
        status: isConnected ? "open" : currentState,
        state: isConnected ? "open" : currentState,
        connectedPhone: connectedPhone,
        currentQrCode: activeQr,
        qrCode: activeQr,
        qr: activeQr,
        statusText: statusText,
        baileysVersion: (() => { try { return require("@whiskeysockets/baileys/package.json").version; } catch(e) { return "unknown"; } })(),
        logs: waLogsBuffer.slice(-20)
    };
}

// Auto start handled exclusively by server.js

module.exports = {
    getWALogs,
    initWABot,
    logoutWABot,
    getWAStatus,
    sendTextMessage,
    notifyNewOrder,
    requestPairingCode
};
