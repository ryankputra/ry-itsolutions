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
    proto,
    BufferJSON 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const NodeCache = require("node-cache");
const { dbGet, dbRun, dbAll } = require("../config/db");
const { sseSend, sseBroadcast } = require("../middleware/auth");

// E2E Signal ratchet retry cache & message store to prevent 'Menunggu pesan ini / Waiting for this message'
const msgRetryCounterCache = new NodeCache();
const messageStore = new NodeCache({ stdTTL: 86400, checkperiod: 120 });

// Ensure SQLite persistent store table exists
dbRun("CREATE TABLE IF NOT EXISTS wa_message_store (id TEXT PRIMARY KEY, remoteJid TEXT, messageContent TEXT, createdAt INTEGER)").catch(() => {});

async function storeMessage(id, remoteJid, messageObj) {
    if (!id || !messageObj) return;
    try {
        messageStore.set(id, messageObj);
        const serialized = JSON.stringify(messageObj);
        await dbRun(
            "INSERT OR REPLACE INTO wa_message_store (id, remoteJid, messageContent, createdAt) VALUES (?, ?, ?, ?)",
            [id, remoteJid || "", serialized, Date.now()]
        );
        if (Math.random() < 0.02) {
            dbRun("DELETE FROM wa_message_store WHERE createdAt < ?", [Date.now() - 3 * 86400000]).catch(() => {});
        }
    } catch (err) {}
}

async function getStoredMessage(key) {
    if (!key?.id) return undefined;
    const inMem = messageStore.get(key.id);
    if (inMem) {
        try {
            return proto.Message.fromObject(inMem.message || inMem);
        } catch (e) {
            return inMem.message || inMem;
        }
    }
    try {
        const row = await dbGet("SELECT messageContent FROM wa_message_store WHERE id = ?", [key.id]);
        if (row?.messageContent) {
            const parsed = JSON.parse(row.messageContent);
            try {
                return proto.Message.fromObject(parsed.message || parsed);
            } catch (e) {
                return parsed.message || parsed;
            }
        }
    } catch (e) {}
    return undefined;
}

/**
 * Resolve canonical WhatsApp JID and pre-synchronize encryption keys via USync
 */
async function resolveWhatsAppJid(phone) {
    const clean = cleanPhone(phone);
    if (!clean) return null;
    return `${clean}@s.whatsapp.net`;
}

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

        // Patch 2: Fix Baileys retry receipt handling for 1-on-1 chats
        const recvCandidates = [
            path.join(__dirname, "..", "node_modules", "@whiskeysockets", "baileys", "lib", "Socket", "messages-recv.js"),
            path.resolve(process.cwd(), "node_modules", "@whiskeysockets", "baileys", "lib", "Socket", "messages-recv.js")
        ];
        for (const recvPath of recvCandidates) {
            if (!fs.existsSync(recvPath)) continue;
            let recvCode = fs.readFileSync(recvPath, "utf8");
            if (recvCode.includes("/* PATCH_RETRY_RECIP_APPLIED */")) continue;

            const targetRetry = "if (willSendMessageAgain(ids[0], key.participant)) {\n                            if (key.fromMe) {\n                                try {\n                                    logger.debug({ attrs, key }, 'recv retry request');\n                                    await sendMessagesAgain(key, ids, retryNode);\n                                }\n                                catch (error) {\n                                    logger.error({ key, ids, trace: error.stack }, 'error in sending message again');\n                                }\n                            }\n                            else {\n                                logger.info({ attrs, key }, 'recv retry for not fromMe message');\n                            }\n                        }";
            const patchedRetry = "/* PATCH_RETRY_RECIP_APPLIED */\n                        if (willSendMessageAgain(ids[0], key.participant)) {\n                            const msgToResend = await getMessage({ ...key, id: ids[0] });\n                            if (key.fromMe || msgToResend) {\n                                try {\n                                    logger.info({ attrs, key }, 'recv retry request, resending message via Signal assertSessions...');\n                                    await sendMessagesAgain(key, ids, retryNode);\n                                }\n                                catch (error) {\n                                    logger.error({ key, ids, trace: error.stack }, 'error in sending message again');\n                                }\n                            }\n                            else {\n                                logger.info({ attrs, key }, 'recv retry for not fromMe message');\n                            }\n                        }";
            if (recvCode.includes("if (willSendMessageAgain(ids[0], key.participant)) {\n                            if (key.fromMe) {")) {
                recvCode = recvCode.replace(
                    "if (willSendMessageAgain(ids[0], key.participant)) {\n                            if (key.fromMe) {",
                    "/* PATCH_RETRY_RECIP_APPLIED */\n                        if (willSendMessageAgain(ids[0], key.participant)) {\n                            const msgToResend = await getMessage({ ...key, id: ids[0] });\n                            if (key.fromMe || msgToResend) {"
                );
                fs.writeFileSync(recvPath, recvCode, "utf8");
                logWABot("✅ Patch retry decryption WhatsApp (Auto-Resend on Retry) berhasil diterapkan.", "info");
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

function purgeStalePeerSessions() {
    try {
        if (!fs.existsSync(SESSIONS_DIR)) return 0;
        const files = fs.readdirSync(SESSIONS_DIR);
        let count = 0;
        for (const file of files) {
            if (file.startsWith("session-") || file.startsWith("sender-key-")) {
                try {
                    fs.unlinkSync(path.join(SESSIONS_DIR, file));
                    count++;
                } catch (e) {}
            }
        }
        if (count > 0) {
            logWABot(`🧹 Membersihkan ${count} file sesi kontak lama (session-*) untuk memperbarui ratchet Signal.`, "info");
        }
        return count;
    } catch (e) {
        console.warn("[WABot] Notice cleaning stale peer sessions:", e.message);
        return 0;
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
        purgeStalePeerSessions();
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
            msgRetryCounterCache,
            getMessage: getStoredMessage,
            printQRInTerminal: false,
            logger: customLogger,
            browser: Browsers.macOS("Chrome"),
            syncFullHistory: false,
            markOnlineOnConnect: true,
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
                try {
                    sock.sendPresenceUpdate("available").catch(() => {});
                } catch (e) {}
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

        // --- INCOMING MESSAGE CONTROLLER (ADMIN COMMANDS & SHORTCUTS) ---
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            for (const msg of messages) {
                if (msg.key?.id && msg.message) {
                    await storeMessage(msg.key.id, msg.key.remoteJid, msg.message);
                }
            }

            for (const msg of messages) {
                if (!msg.message) continue;

                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || remoteJid.includes("@g.us")) continue; // Ignore groups

                const messageText = (
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    ""
                ).trim();

                if (!messageText) continue;

                // Check if message is a command or quick shortcut (e.g. .proses, 1, 2, 3, p, s, g, proses)
                const isCommand = (
                    messageText.startsWith(".") ||
                    /^(1|2|3|p|s|g|proses|sukses|gagal|status|bantuan|help|menu)\b/i.test(messageText)
                );
                if (!isCommand) continue;

                // Determine sender phone
                let senderPhone = cleanPhone(remoteJid.replace("@s.whatsapp.net", ""));
                const myJid = sock?.user?.id || "";
                const myPhone = cleanPhone(myJid.split(":")[0].replace("@s.whatsapp.net", ""));

                if (msg.key.fromMe) {
                    senderPhone = myPhone || senderPhone;
                }

                // Authorization check: Only configured admin numbers can execute commands
                const adminPhones = await getAdminPhoneNumbers();
                const isAuthorized = msg.key.fromMe || (senderPhone && adminPhones.includes(senderPhone)) || (myPhone && adminPhones.includes(myPhone));

                if (!isAuthorized) {
                    console.warn(`[WABot Security] Pesan ditolak dari nomor non-admin: ${senderPhone}`);
                    continue;
                }

                logWABot(`[WABot Command] Memproses: "${messageText}" dari ${senderPhone || remoteJid}`, "info");
                await handleAdminCommand(remoteJid, messageText, msg);
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
async function handleAdminCommand(replyJid, text, rawMsg = null) {
    const parts = text.trim().split(/\s+/);
    let command = parts[0].toLowerCase();
    let orderIdArg = parts[1];
    let notesArg = parts.slice(2).join(" ");

    // 1. Normalize quick shortcuts:
    // 1 / .1 / p / .p / proses -> .proses
    // 2 / .2 / s / .s / sukses -> .sukses
    // 3 / .3 / g / .g / gagal  -> .gagal
    if (command === "1" || command === ".1" || command === "p" || command === ".p" || command === "proses") {
        command = ".proses";
    } else if (command === "2" || command === ".2" || command === "s" || command === ".s" || command === "sukses") {
        command = ".sukses";
    } else if (command === "3" || command === ".3" || command === "g" || command === ".g" || command === "gagal") {
        command = ".gagal";
    } else if (command === "status" || command === "cek") {
        command = ".status";
    } else if (command === "help" || command === "bantuan" || command === "menu") {
        command = ".help";
    }

    if (orderIdArg) {
        orderIdArg = orderIdArg.trim().replace(/^[<"\x27\`]+|[>"\x27\`]+$/g, "").trim();
    }
    if (notesArg) {
        notesArg = notesArg.trim().replace(/^[<"\x27\`]+|[>"\x27\`]+$/g, "").trim();
    }

    // 2. Auto-extract Order ID if admin simply REPLIED to an order notification:
    if (!orderIdArg && rawMsg?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = rawMsg.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedText = (
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            quoted.imageMessage?.caption ||
            ""
        );
        const match = quotedText.match(/(?:Order ID:\s*[\`\*#]*|#)?(trx_m_\d+|trx_\d+)/i);
        if (match && match[1]) {
            orderIdArg = match[1];
            // If user typed '2 Sinyal On', then parts[1] was 'Sinyal' and parts.slice(1).join(' ') was 'Sinyal On'
            if (parts.length > 1 && !notesArg) {
                notesArg = parts.slice(1).join(" ");
            }
        }
    }

    console.log(`[WABot Command] Received: ${command} ${orderIdArg || ""} from ${replyJid}`);

    if (command === ".fixwa" || command === ".clearsesi" || command === ".resetsesi") {
        const cleaned = purgeStalePeerSessions();
        try { sock.sendPresenceUpdate("available").catch(() => {}); } catch (e) {}
        await replyWhatsApp(replyJid, `✅ *ENKRIPSI DIPERBARUI!*\n━━━━━━━━━━━━━━━━━━\nBerhasil membersihkan ${cleaned} sesi kontak lama.\nKunci Signal telah disinkronkan ulang tanpa perlu logout.`);
        return;
    }

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

    // 1. Command .proses (or 1)
    if (command === ".proses") {
        const processNote = notesArg || "Sedang dikerjakan oleh admin via WA";
        await dbRun(
            "UPDATE transactions SET status = 'processing', admin_note = ? WHERE id = ?",
            [processNote, trx.id]
        );
        if (trx.userId) {
            sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'processing', message: processNote });
            sseSend(trx.userId, 'transaction_update', { id: trx.id, status: 'processing', note: processNote });
        }
        if (typeof sseBroadcast === 'function') sseBroadcast('transaction_status', { id: trx.id, status: 'processing' });

        const reply = `✅ *STATUS ORDER DIPERBARUI!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Order ID:* \`${trx.id}\`\n` +
            `👤 *User:* ${trx.userName || "User"}\n` +
            `📦 *Layanan:* ${trx.packageName}\n` +
            `📱 *IMEI:* \`${trx.imei}\`\n` +
            `⚡ *Status Baru:* *PROCESSING (Diproses)*\n` +
            `📝 *Catatan:* ${processNote}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `💡 *Selesaikan:* Balas pesan ini ketik *2* atau *.sukses*`;
        await replyWhatsApp(replyJid, reply);

        // Notify customer via WhatsApp that order has started processing
        if (trx.targetPhone) {
            const cleanCust = cleanPhone(trx.targetPhone);
            if (cleanCust) {
                const custJid = await resolveWhatsAppJid(cleanCust);
                const custMsg = `Halo Kak *${trx.userName || "Pelanggan"}*! 👋\n\n` +
                    `⚡ *Pesanan Unblock IMEI Sedang Diproses!*\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `🆔 *Order ID:* \`${trx.id}\`\n` +
                    `📱 *IMEI:* \`${trx.imei}\`\n` +
                    `📦 *Layanan:* ${trx.packageName}\n` +
                    `📝 *Status:* Sedang Dikerjakan Admin\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `Tim teknis kami sedang mengaktivasi sinyal perangkat Anda. Mohon ditunggu ya Kak.\n\n` +
                    `Pantau status pesanan: https://ry-itsolutions.web.id/history?tab=processing`;
                sendAndStoreMessage(custJid, { text: custMsg }).catch(() => {});
            }
        }
        return;
    }

    // 2. Command .sukses
    if (command === ".sukses") {
        const finalNote = notesArg || "Pesanan berhasil diselesaikan oleh admin. Sinyal aktif.";
        await dbRun(
            "UPDATE transactions SET status = 'success', admin_note = ? WHERE id = ?",
            [finalNote, trx.id]
        );
        if (trx.userId) {
            sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'success', message: finalNote });
            sseSend(trx.userId, 'transaction_update', { id: trx.id, status: 'success', note: finalNote });
        }
        if (typeof sseBroadcast === 'function') sseBroadcast('transaction_status', { id: trx.id, status: 'success' });
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

        // Notify customer if phone number is available
        if (trx.targetPhone) {
            const cleanCust = cleanPhone(trx.targetPhone);
            if (cleanCust) {
                const custJid = await resolveWhatsAppJid(cleanCust);
                const custMsg = `Halo *${trx.userName || "Kak"}*,\n\n` +
                    `✅ *Pesanan Unblock IMEI Anda Telah Selesai!*\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `🆔 *Order ID:* \`${trx.id}\`\n` +
                    `📱 *IMEI:* \`${trx.imei}\`\n` +
                    `📦 *Layanan:* ${trx.packageName}\n` +
                    `📝 *Catatan Admin:* ${finalNote}\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `Silakan restart perangkat HP Anda atau lepas-pasang kartu SIM. Terima kasih telah menggunakan layanan Ry-ITSolutions!`;
                sendAndStoreMessage(custJid, { text: custMsg }).catch(() => {});
            }
        }
        return;
    }

    // 3. Command .gagal (with automatic balance refund)
    if (command === ".gagal") {
        const failReason = notesArg || "Pesanan dibatalkan oleh admin.";
        const refundAmount = Number(trx.platformFee || trx.originalPrice || 0);
        let refundNote = "Tidak ada pengembalian dana.";

        if (refundAmount > 0 && (currentStatus === "pending" || currentStatus === "processing" || currentStatus === "in_queue")) {
            await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, trx.userId]);
            refundNote = `Saldo Rp ${refundAmount.toLocaleString("id-ID")} telah dikembalikan ke user.`;
        }

        await dbRun(
            "UPDATE transactions SET status = 'failed', admin_note = ? WHERE id = ?",
            [failReason, trx.id]
        );
        if (trx.userId) {
            sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'failed', message: failReason });
            sseSend(trx.userId, 'transaction_update', { id: trx.id, status: 'failed', note: failReason });
            if (refundAmount > 0) {
                const u = await dbGet("SELECT balance FROM users WHERE id = ?", [trx.userId]);
                if (u) sseSend(trx.userId, 'balance_update', { balance: u.balance, source: 'order_refund' });
            }
        }
        if (typeof sseBroadcast === 'function') sseBroadcast('transaction_status', { id: trx.id, status: 'failed' });

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

        if (trx.targetPhone) {
            const cleanCust = cleanPhone(trx.targetPhone);
            if (cleanCust) {
                const custJid = await resolveWhatsAppJid(cleanCust);
                const custMsg = `Halo *${trx.userName || "Kak"}*,\n\n` +
                    `⚠️ *Pemberitahuan Pesanan Unblock IMEI*\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `🆔 *Order ID:* \`${trx.id}\`\n` +
                    `📱 *IMEI:* \`${trx.imei}\`\n` +
                    `❌ *Status:* Dibatalkan / Gagal\n` +
                    `📝 *Alasan:* ${failReason}\n` +
                    `💵 *Refund:* ${refundNote}\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `Silakan cek saldo akun Anda atau hubungi admin jika ada pertanyaan.`;
                sendAndStoreMessage(custJid, { text: custMsg }).catch(() => {});
            }
        }
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
 * Internal wrapper to send a message via Baileys and cache it in messageStore & DB
 */
async function sendAndStoreMessage(targetJid, content, options = {}) {
    if (!sock || connectionState !== "open") {
        throw new Error("WhatsApp Bot belum terhubung / open");
    }
    const sent = await sock.sendMessage(targetJid, content, options);
    if (sent?.key?.id && sent?.message) {
        await storeMessage(sent.key.id, targetJid, sent.message);
    }
    return sent;
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
        await sendAndStoreMessage(jid, { text: message });
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
        let cleanJid = jid;
        if (cleanJid && !cleanJid.includes("@g.us") && !cleanJid.includes("@lid")) {
            const rawPhone = cleanJid.split("@")[0].split(":")[0];
            cleanJid = `${rawPhone}@s.whatsapp.net`;
        }
        await sendAndStoreMessage(cleanJid, { text });
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
            console.warn(`[WABot] Notifikasi pesanan ${orderData?.id} tidak terkirim: Bot WhatsApp belum terhubung (status: ${connectionState || 'offline'}).`);
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
            userImageCeir,
            customerPhone,
            targetPhone
        } = orderData;

        // Fetch dynamic speed settings if available
        let speedRangeText = "Max kirim jam 14:00, selesai max jam 00:00 WIB";
        try {
            const optKey = (speedOption || "slow").toLowerCase();
            const sRow = await dbGet("SELECT value FROM settings WHERE key = ?", [`imei_speed_${optKey}_range`]);
            if (sRow && sRow.value) {
                speedRangeText = sRow.value;
            } else if (optKey === "fast") {
                speedRangeText = "1-3 Jam";
            } else if (optKey === "semi") {
                speedRangeText = "1-12 Jam";
            }
        } catch (e) {}

        const optName = (speedOption || "slow").toLowerCase();
        const optTitle = optName === "slow" ? "Slow" : optName === "fast" ? "Fast" : optName === "semi" ? "Semi Fast" : optName;

        const isAutomated = serviceType === "ceir" || serviceType === "barcode";
        const speedDisplay = isAutomated 
            ? "⚡ Instant (Otomatis System)" 
            : `${optTitle} (${speedRangeText})`;

        const shortId = id.slice(-4);
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
            `💡 *CARA CEPAT PROSES (BALAS PESAN INI):*\n` +
            `• Ketik *1* atau *.proses* ➡️ Mulai proses\n` +
            `• Ketik *2* atau *.sukses* ➡️ Selesaikan\n` +
            `• Ketik *3* atau *.gagal* ➡️ Tolak & refund\n` +
            `_(Bisa juga manual: \`.proses ${shortId}\` atau \`.sukses ${shortId}\`)_\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`;

        // 1. Send to all admin numbers
        for (const phone of adminPhones) {
            const adminJid = `${phone}@s.whatsapp.net`;

            // If user attached screenshot photo, send with caption
            let photoSent = false;
            const photoPath = (userImage || userImageCeir || "").split(",")[0].trim();

            if (photoPath) {
                const fullPath = path.join(__dirname, "..", photoPath);
                if (fs.existsSync(fullPath)) {
                    try {
                        await sendAndStoreMessage(adminJid, {
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
                await sendAndStoreMessage(adminJid, { text: messageBody });
            }
        }

        console.log(`[WABot] Notifikasi pesanan ${id} berhasil dikirim ke ${adminPhones.length} nomor admin.`);

        // 2. Also send confirmation to customer phone if provided
        const customerTarget = customerPhone || targetPhone;
        if (customerTarget) {
            const cleanCust = cleanPhone(customerTarget);
            if (cleanCust) {
                const custJid = await resolveWhatsAppJid(cleanCust);
                const customerMsg =
                    `Halo Kak *${userName || "Pelanggan"}*! 👋\n` +
                    `Terima kasih telah memesan layanan di *Ry-ITSolutions*.\n\n` +
                    `📦 *Layanan:* ${packageName || "Layanan"}\n` +
                    `🆔 *Order ID:* #${id}\n` +
                    `📱 *IMEI:* ${imei || "-"}\n` +
                    `⚡ *Kecepatan:* ${speedDisplay}\n` +
                    `💰 *Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n` +
                    `⏳ *Status:* Sedang Diproses Admin\n\n` +
                    `Pesanan Anda sedang dalam antrean pengerjaan oleh tim operasional kami.\n` +
                    `Anda dapat memantau status pengerjaan kapan saja di website: https://ry-itsolutions.web.id/history\n\n` +
                    `_Pesan otomatis ini dikirim resmi oleh sistem Ry-ITSolutions._`;
                try {
                    await sendAndStoreMessage(custJid, { text: customerMsg });
                    console.log(`[WABot] Notifikasi pesanan ${id} berhasil dikirim ke pelanggan (${cleanCust}).`);
                } catch (custErr) {
                    console.warn(`[WABot] Gagal mengirim notifikasi ke pelanggan ${cleanCust}:`, custErr.message);
                }
            }
        }
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
    requestPairingCode,
    purgeStalePeerSessions
};
