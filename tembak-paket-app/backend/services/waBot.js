const { calculateTransactionWarranty } = require("../utils/warrantyHelper");
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
let consecutiveLoggedOutCount = 0;

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
    if (!currentVer || currentVer.startsWith("6.7.") || isAutoUpgrading) return;
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
    const str = String(raw).trim();
    if (str.includes("@")) return ""; // Email addresses are not phone numbers
    let p = str.replace(/\D/g, "");
    if (!p || p.length < 8) return ""; // Require at least 8 digits for valid mobile number
    if (p.startsWith("0")) p = "62" + p.substring(1);
    else if (!p.startsWith("62")) p = "62" + p;
    return p;
}

function isValidIndonesianMobile(phone) {
    if (!phone) return false;
    const clean = cleanPhone(phone);
    return /^628\d{7,11}$/.test(clean);
}

async function getCustomerPhoneForTransaction(trx) {
    if (!trx) return null;
    const candidate = trx.targetPhone || trx.customerPhone;
    if (candidate && isValidIndonesianMobile(candidate)) {
        return cleanPhone(candidate);
    }
    if (trx.userId) {
        try {
            const userRow = await dbGet("SELECT verifiedPhone, savedPhones FROM users WHERE id = ?", [trx.userId]);
            if (userRow && userRow.verifiedPhone && isValidIndonesianMobile(userRow.verifiedPhone)) {
                return cleanPhone(userRow.verifiedPhone);
            }
            if (userRow && userRow.savedPhones) {
                try {
                    const sp = JSON.parse(userRow.savedPhones);
                    if (Array.isArray(sp) && sp.length > 0) {
                        for (const p of sp) {
                            if (isValidIndonesianMobile(p)) return cleanPhone(p);
                        }
                    }
                } catch (e) {}
            }
            const prev = await dbGet("SELECT targetPhone FROM transactions WHERE userId = ? AND targetPhone IS NOT NULL AND targetPhone != '' AND targetPhone NOT LIKE '%@%' ORDER BY createdAt DESC LIMIT 1", [trx.userId]);
            if (prev && prev.targetPhone && isValidIndonesianMobile(prev.targetPhone)) {
                return cleanPhone(prev.targetPhone);
            }
        } catch (e) {}
    }
    if (candidate && !candidate.includes('@') && cleanPhone(candidate).length >= 9 && cleanPhone(candidate).length <= 15 && cleanPhone(candidate) !== cleanPhone(trx.imei)) {
        return cleanPhone(candidate);
    }
    return null;
}

/**
 * Get list of authorized admin phone numbers
 */
async function getAdminPhoneNumbers() {
    const adminPhones = new Set();

    // 0. Primary Administrator Numbers (Guaranteed Delivery)
    // 6287767287284: Bot number that also acts as Admin (sends to self)
    // 6288706611370: Second Administrator phone number
    const primaryAdmins = ["6287767287284", "6288706611370"];
    primaryAdmins.forEach(num => {
        const cp = cleanPhone(num);
        if (cp) adminPhones.add(cp);
    });

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
/**
 * Cleanly close socket on PM2 restart or graceful shutdown to prevent 401 conflict
 */
async function closeWABot() {
    clearConnectingTimer();
    try {
        if (sock) {
            console.log("[WABot] Menutup koneksi socket secara bersih sebelum restart...");
            sock.ev.removeAllListeners();
            sock.end(undefined);
            sock = null;
        }
    } catch (e) {}
    connectionState = "disconnected";
    global.baileysStatus = "disconnected";
    isInitializing = false;
}

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
        // Session preservation: Do NOT purge peer sessions on startup to keep Signal ratchet keys intact
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
                consecutiveLoggedOutCount = 0;
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
                const err = lastDisconnect?.error;
                const statusCode = err?.output?.statusCode || err?.statusCode;
                const errMsg = (err?.message || "").toLowerCase();
                const isConflict = errMsg.includes("conflict") || errMsg.includes("stream errored") || statusCode === 440;
                const isRestart = statusCode === DisconnectReason.restartRequired || statusCode === 515;
                const isLoggedOut = (statusCode === DisconnectReason.loggedOut || statusCode === 401) && !isConflict;

                logWABot(`Koneksi socket terputus (Status: ${statusCode || "unknown"}). Error: ${err?.message || "None"}`, "warn");

                // Penanganan khusus jika terjadi konflik socket saat PM2 restart (bukan logout asli dari HP)
                if (isConflict) {
                    logWABot("⚠️ Konflik koneksi terdeteksi (proses restart/overlap). Menunggu 5 detik sebelum reconnect tanpa menghapus sesi...", "warn");
                    connectionState = "connecting";
                    global.baileysStatus = "connecting";
                    isInitializing = false;
                    setTimeout(() => initWABot(false), 5000);
                    return;
                }

                // Jika terputus karena LoggedOut (401)
                if (isLoggedOut) {
                    consecutiveLoggedOutCount++;
                    // Jika baru 1x terdeteksi 401 dan sesi lokal masih ada, beri kesempatan reconnect 1x
                    const hasLocalCreds = fs.existsSync(path.join(SESSIONS_DIR, "creds.json"));
                    if (consecutiveLoggedOutCount < 2 && hasLocalCreds) {
                        logWABot(`⚠️ Sinyal 401 terdeteksi (percobaan 1/2). Melakukan reconnect pengujian sebelum mereset sesi...`, "warn");
                        connectionState = "connecting";
                        global.baileysStatus = "connecting";
                        isInitializing = false;
                        setTimeout(() => initWABot(false), 3000);
                        return;
                    }

                    logWABot("Sesi WhatsApp Logged Out dari HP (401 terkonfirmasi). Menyiapkan sesi & QR baru...", "warn");
                    consecutiveLoggedOutCount = 0;
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
                // Ignore empty JID, group chats (@g.us), broadcast channels, and newsletters
                if (!remoteJid || remoteJid.includes("@g.us") || remoteJid.includes("@broadcast") || remoteJid.includes("@newsletter")) continue;

                // Determine sender phone number cleanly
                const cleanRemotePhone = cleanPhone(remoteJid.replace("@s.whatsapp.net", "").split(":")[0]);
                const adminPhones = await getAdminPhoneNumbers();
                const cleanAdminList = adminPhones.map(p => cleanPhone(p)).filter(Boolean);

                // STRICT ADMIN CHECK:
                // Only authorized if message was sent from the bot's own account (fromMe)
                // OR the sender's phone number is explicitly in the admin list.
                const isSenderAdmin = Boolean(
                    msg.key.fromMe ||
                    (cleanRemotePhone && cleanAdminList.includes(cleanRemotePhone))
                );

                // IF SENDER IS NOT AN ADMIN:
                // SILENTLY IGNORE! NO REPLY, NO COMMANDS, NO MESSAGES WHATSOEVER!
                if (!isSenderAdmin) {
                    // Do not respond to regular users under any circumstances
                    continue;
                }

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

                logWABot(`[WABot Command] Memproses perintah Admin "${messageText}" dari ${cleanRemotePhone || remoteJid}`, "info");
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
/**
 * Optional Gateway Fallback (e.g. Fonnte) when Baileys socket is temporarily offline
 */
async function sendGatewayFallbackMessage(targetPhone, text) {
    try {
        const tokenRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_token' OR key = 'whatsapp_gateway_token'");
        if (tokenRow && tokenRow.value) {
            const urlRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_url' OR key = 'whatsapp_gateway_url'");
            const endpoint = (urlRow && urlRow.value) ? urlRow.value : "https://api.fonnte.com/send";
            const clean = cleanPhone(targetPhone);
            if (!clean || clean.length < 8) return false;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": tokenRow.value,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    target: clean,
                    message: text
                })
            });
            const d = await res.json();
            if (d && (d.status === true || d.status === "success" || d.status === 200)) {
                logWABot(`✅ Pesan terkirim via WhatsApp Gateway API ke ${clean}`, "info");
                return true;
            }
        }
    } catch (e) {
        console.warn("[WABot] Gateway fallback notice:", e.message);
    }
    return false;
}

/**
 * Notify customer via WhatsApp on order status changes (processing, success, failed)
 * Can be called from WA Bot admin commands OR from Web Admin Dashboard
 */
async function notifyCustomerOnStatusChange(trxOrId, newStatus, customNote = '') {
    try {
        let trx = trxOrId;
        if (typeof trx === 'string') {
            trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxOrId]);
        }
        if (!trx) {
            console.warn(`[WABot] notifyCustomerOnStatusChange: Transaksi ${trxOrId} tidak ditemukan.`);
            return;
        }

        const customerPhone = await getCustomerPhoneForTransaction(trx);
        if (!customerPhone) {
            console.log(`[WABot] Transaksi ${trx.id} tidak memiliki nomor WhatsApp pelanggan yang valid.`);
            return;
        }

        const custJid = `${customerPhone}@s.whatsapp.net`;
        const userName = trx.userName || "Pelanggan";
        let custMsg = "";

        const warranty = calculateTransactionWarranty(trx);
        const serviceKind = warranty?.serviceKind || "imei";

        if (serviceKind === "gateway") {
            if (newStatus === "processing") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN LANGGANAN GATEWAY SEDANG DIPROSES*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `*Status:* Sedang Diaktivasi Admin\n` +
                    (customNote ? `*Catatan Admin:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `Aktivasi API Key sedang disiapkan oleh tim kami.\n\n` +
                    `Pantau status: https://ry-itsolutionts.web.id/history?tab=processing`;
            } else if (newStatus === "success" || newStatus === "completed") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN LANGGANAN GATEWAY TELAH AKTIF (SUKSES)*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `*Masa Aktif:* 30 Hari\n` +
                    `*Status:* Aktif\n` +
                    (customNote ? `*Catatan Admin:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `API Key Anda telah aktif selama 30 hari. Silakan gunakan untuk integrasi pembayaran QRIS otomatis di website / bot Anda.\n\n` +
                    `Kelola Gateway: https://ry-itsolutionts.web.id/gateway\n` +
                    `Cetak Nota Pembayaran: https://ry-itsolutionts.web.id/history?tab=completed\n\n` +
                    `_Terima kasih telah berlangganan di Ry-ITSolutions._`;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PESANAN GATEWAY*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `*Status:* Dibatalkan / Gagal\n` +
                    `*Alasan:* ${customNote || "Pesanan tidak dapat diproses oleh admin."}\n` +
                    `──────────────────────\n` +
                    `Silakan periksa akun Anda di website atau hubungi admin: https://ry-itsolutionts.web.id/history`;
            } else {
                return;
            }
        } else if (serviceKind === "ceir") {
            if (newStatus === "processing") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PENGECEKAN CEIR SEDANG DIPROSES*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `*Status:* Sedang Dikerjakan Sistem\n` +
                    (customNote ? `*Catatan Admin:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `Pengecekan database CEIR sedang berjalan. Mohon ditunggu ya Kak.\n\n` +
                    `Pantau status: https://ry-itsolutionts.web.id/history?tab=processing`;
            } else if (newStatus === "success" || newStatus === "completed") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PENGECEKAN CEIR TELAH SELESAI (SUKSES)*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `*Status:* Selesai / Terverifikasi\n` +
                    (customNote ? `*Catatan:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `Data IMEI Anda telah selesai diperiksa di database CEIR.\n\n` +
                    `Lihat Laporan: https://ry-itsolutionts.web.id/history?tab=completed\n\n` +
                    `_Terima kasih telah menggunakan layanan Ry-ITSolutions._`;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PENGECEKAN CEIR*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `*Status:* Gagal\n` +
                    `*Alasan:* ${customNote || "Pengecekan gagal diproses."}\n` +
                    `──────────────────────\n` +
                    `Silakan periksa akun Anda: https://ry-itsolutionts.web.id/history`;
            } else {
                return;
            }
        } else {
            // Default: IMEI Service
            const durLabel = warranty?.durationLabel || "Sesuai Paket";
            if (newStatus === "processing") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN UNBLOCK IMEI SEDANG DIPROSES*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Unblock IMEI"}\n` +
                    `*Status:* Sedang Dikerjakan Admin\n` +
                    (customNote ? `*Catatan Admin:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `Tim teknis kami sedang memproses dan mengaktivasi sinyal perangkat Anda. Mohon ditunggu ya Kak.\n\n` +
                    `Pantau status pesanan: https://ry-itsolutionts.web.id/history?tab=processing`;
            } else if (newStatus === "success" || newStatus === "completed") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN UNBLOCK IMEI TELAH SELESAI (SUKSES)*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Unblock IMEI"}\n` +
                    `*Garansi Sinyal:* ${durLabel} (Aktif)\n` +
                    `*Status:* Selesai / Sinyal Aktif\n` +
                    (customNote ? `*Catatan Admin:* ${customNote}\n` : "") +
                    `──────────────────────\n` +
                    `Silakan restart HP Anda atau lepas-pasang kartu SIM untuk mengaktifkan jaringan sinyal.\n\n` +
                    `Cetak Nota & Kartu Garansi: https://ry-itsolutionts.web.id/history?tab=completed\n\n` +
                    `_Terima kasih telah mempercayakan layanan kepada Ry-ITSolutions._`;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PESANAN UNBLOCK IMEI*\n` +
                    `──────────────────────\n` +
                    `*Order ID:* #${trx.id}\n` +
                    `*IMEI:* ${trx.imei || "-"}\n` +
                    `*Layanan:* ${trx.packageName || "Unblock IMEI"}\n` +
                    `*Status:* Dibatalkan / Gagal\n` +
                    `*Alasan:* ${customNote || "Pesanan tidak dapat diproses oleh admin."}\n` +
                    `──────────────────────\n` +
                    `Silakan cek saldo akun Anda di website atau hubungi admin jika ada pertanyaan: https://ry-itsolutionts.web.id/history`;
            } else {
                return;
            }
        }

        await sendAndStoreMessage(custJid, { text: custMsg });
        logWABot(`✅ Notifikasi status '${newStatus}' pesanan ${trx.id} berhasil terkirim ke WhatsApp pelanggan (${customerPhone})`, "info");
        console.log(`[WABot] Notifikasi status '${newStatus}' berhasil dikirim ke pelanggan (${customerPhone}).`);
    } catch (err) {
        logWABot(`❌ Gagal kirim notifikasi status ke pelanggan: ${err.message}`, "error");
        console.error(`[WABot] Gagal kirim notifikasi status ke pelanggan:`, err.message);
    }
}

/**
 * Handle Admin WhatsApp Commands
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
        const match = quotedText.match(/Order ID:\s*[\`\*#]*([a-zA-Z0-9_\-]+)/i) ||
                      quotedText.match(/(?:#|ID:\s*)([a-zA-Z0-9_\-]+)/i);
        if (match && match[1]) {
            orderIdArg = match[1].trim();
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
        await replyWhatsApp(replyJid, `*ENKRIPSI DIPERBARUI*\n──────────────────────\nBerhasil membersihkan ${cleaned} sesi kontak lama.\nKunci Signal telah disinkronkan ulang tanpa perlu logout.`);
        return;
    }

    if (command === ".bantuan" || command === ".help" || command === ".menu") {
        const helpMsg = `*PANDUAN PERINTAH BOT ADMIN Ry-ITSolutions*\n` +
            `──────────────────────━━━━\n` +
            `• *.proses <ID_ORDER>*\n` +
            `  Mengubah status pesanan menjadi PROCESSING.\n\n` +
            `• *.sukses <ID_ORDER> <CATATAN>*\n` +
            `  Menyelesaikan pesanan (status SUCCESS) dan menyimpan catatan.\n\n` +
            `• *.gagal <ID_ORDER> <ALASAN>*\n` +
            `  Membatalkan pesanan (status FAILED) & refund saldo user otomatis.\n\n` +
            `• *.status <ID_ORDER>*\n` +
            `  Mengecek status & rincian pesanan saat ini.\n` +
            `──────────────────────━━━━`;
        await replyWhatsApp(replyJid, helpMsg);
        return;
    }

    if (!orderIdArg) {
        await replyWhatsApp(replyJid, `*Format salah!*\nGunakan: \`${command} <ID_ORDER>\`\nKetik \`.help\` untuk panduan.`);
        return;
    }

    // Search transaction by exact ID or prefix match
    const cleanId = orderIdArg.trim();
    const trx = await dbGet(
        "SELECT * FROM transactions WHERE id = ? OR id LIKE ? ORDER BY createdAt DESC LIMIT 1",
        [cleanId, `%${cleanId}%`]
    );

    if (!trx) {
        await replyWhatsApp(replyJid, `*Pesanan Tidak Ditemukan!*\nOrder ID \`${cleanId}\` tidak ada di database.`);
        return;
    }

    const currentStatus = trx.status;

    // 1. Command .proses (or 1)
    if (command === ".proses") {
        const customNote = notesArg ? notesArg.trim() : "";
        if (customNote) {
            await dbRun(
                "UPDATE transactions SET status = 'processing', admin_note = ?, updatedAt = ? WHERE id = ?",
                [customNote, new Date().toISOString(), trx.id]
            );
        } else {
            await dbRun(
                "UPDATE transactions SET status = 'processing', updatedAt = ? WHERE id = ?",
                [new Date().toISOString(), trx.id]
            );
        }
        if (trx.userId) {
            sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'processing', message: customNote || "Pesanan sedang diproses admin." });
            sseSend(trx.userId, 'transaction_update', { id: trx.id, status: 'processing', note: customNote || null });
        }
        if (typeof sseBroadcast === 'function') sseBroadcast('transaction_status', { id: trx.id, status: 'processing' });

        const reply = `*STATUS ORDER DIPERBARUI*\n` +
            `──────────────────────\n` +
            `*Order ID:* \`${trx.id}\`\n` +
            `*User:* ${trx.userName || "User"}\n` +
            `*Layanan:* ${trx.packageName}\n` +
            `*IMEI:* \`${trx.imei}\`\n` +
            `*Status Baru:* *PROCESSING (Diproses)*\n` +
            (customNote ? `*Catatan:* ${customNote}\n` : "") +
            `──────────────────────\n` +
            `*Selesaikan:* Balas pesan ini ketik *2* atau *.sukses*`;
        await replyWhatsApp(replyJid, reply);

        // Notify customer via WhatsApp that order has started processing
        await notifyCustomerOnStatusChange(trx, 'processing', customNote);
        return;
    }

    // 2. Command .sukses
    if (command === ".sukses") {
        const warranty = calculateTransactionWarranty(trx);
        const finalNote = notesArg || (warranty?.defaultSuccessNote || "Pesanan berhasil diselesaikan oleh admin.");
        const nowIso = new Date().toISOString();
        await dbRun(
            "UPDATE transactions SET status = 'success', admin_note = ?, updatedAt = ? WHERE id = ?",
            [finalNote, nowIso, trx.id]
        );
        if (trx.userId) {
            sseSend(trx.userId, 'transaction_status', { id: trx.id, status: 'success', message: finalNote });
            sseSend(trx.userId, 'transaction_update', { id: trx.id, status: 'success', note: finalNote });
        }
        if (typeof sseBroadcast === 'function') sseBroadcast('transaction_status', { id: trx.id, status: 'success' });
        const reply = `*PESANAN SELESAI (SUCCESS)*\n` +
            `──────────────────────\n` +
            `*Order ID:* \`${trx.id}\`\n` +
            `*User:* ${trx.userName || "User"}\n` +
            `*Layanan:* ${trx.packageName}\n` +
            (trx.imei ? `*IMEI:* \`${trx.imei}\`\n` : "") +
            (warranty?.durationLabel ? `*Masa Aktif / Garansi:* ${warranty.durationLabel}\n` : "") +
            `*Nominal:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `*Status:* SUCCESS\n` +
            `*Catatan:* ${finalNote}\n` +
            `──────────────────────`;
        await replyWhatsApp(replyJid, reply);

        // Notify customer if phone number is available
        await notifyCustomerOnStatusChange({ ...trx, updatedAt: nowIso }, 'success', finalNote);
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

        const nowIsoFail = new Date().toISOString();
        await dbRun(
            "UPDATE transactions SET status = 'failed', admin_note = ?, updatedAt = ? WHERE id = ?",
            [failReason, nowIsoFail, trx.id]
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

        const reply = `*PESANAN DITOLAK / GAGAL (FAILED)*\n` +
            `──────────────────────\n` +
            `*Order ID:* \`${trx.id}\`\n` +
            `*User:* ${trx.userName || "User"}\n` +
            `*Layanan:* ${trx.packageName}\n` +
            `*IMEI:* \`${trx.imei}\`\n` +
            `*Status:* *FAILED*\n` +
            `*Alasan:* ${failReason}\n` +
            `*Refund:* ${refundNote}\n` +
            `──────────────────────`;
        await replyWhatsApp(replyJid, reply);

        await notifyCustomerOnStatusChange({ ...trx, updatedAt: nowIsoFail }, 'failed', `${failReason}. ${refundNote}`);
        return;
    }

    // 4. Command .status
    if (command === ".status") {
        const reply = `*INFORMASI STATUS PESANAN*\n` +
            `──────────────────────\n` +
            `*Order ID:* \`${trx.id}\`\n` +
            `*User:* ${trx.userName || "User"}\n` +
            `*Layanan:* ${trx.packageName}\n` +
            `*IMEI:* \`${trx.imei}\`\n` +
            `*Harga:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `*Status:* *(${(trx.status || "PENDING").toUpperCase()})*\n` +
            `*Catatan:* ${trx.admin_note || "-"}\n` +
            `*Waktu:* ${new Date(trx.createdAt).toLocaleString("id-ID")}\n` +
            `──────────────────────`;
        await replyWhatsApp(replyJid, reply);
        return;
    }

    await replyWhatsApp(replyJid, `Perintah tidak dikenali: \`${command}\`\nKetik \`.help\` untuk melihat daftar perintah.`);
}

/**
 * Internal wrapper to send a message via Baileys and cache it in messageStore & DB
 */
async function sendAndStoreMessage(targetJid, content, options = {}) {
    const isConnected = (connectionState === "open" || global.baileysStatus === "open" || Boolean(sock?.user?.id));
    if (!sock || !isConnected) {
        throw new Error("WhatsApp Bot belum terhubung / open");
    }

    let finalJid = targetJid;
    if (finalJid && !finalJid.includes("@g.us") && !finalJid.includes("@lid")) {
        const rawNumber = finalJid.split("@")[0].split(":")[0];
        const clean = cleanPhone(rawNumber);
        if (clean && clean.length >= 8) {
            finalJid = `${clean}@s.whatsapp.net`;
        } else {
            throw new Error(`Nomor telepon tujuan tidak valid: ${targetJid}`);
        }
    }

    // Explicitly enforce viewOnce: false for media payloads to allow viewing on WhatsApp Web
    const finalContent = { ...content };
    if (finalContent.image || finalContent.video || finalContent.document) {
        if (!('viewOnce' in finalContent)) {
            finalContent.viewOnce = false;
        }
    }

    try {
        const sent = await sock.sendMessage(finalJid, finalContent, options);
        if (sent?.key?.id && sent?.message) {
            await storeMessage(sent.key.id, finalJid, sent.message);
        }
        return sent;
    } catch (sendErr) {
        // Self-healing: if session ratchet error occurs, purge stale session for this contact & retry once
        const targetNumber = finalJid.split("@")[0].split(":")[0];
        if (targetNumber && targetNumber.length >= 8 && fs.existsSync(SESSIONS_DIR)) {
            try {
                const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith(`session-${targetNumber}`));
                if (files.length > 0) {
                    console.warn(`[WABot] Purging stale sessions for ${targetNumber} due to send error: ${sendErr.message}`);
                    files.forEach(f => {
                        try { fs.unlinkSync(path.join(SESSIONS_DIR, f)); } catch (e) {}
                    });
                    const retried = await sock.sendMessage(finalJid, finalContent, options);
                    if (retried?.key?.id && retried?.message) {
                        await storeMessage(retried.key.id, finalJid, retried.message);
                    }
                    return retried;
                }
            } catch (retryErr) {
                console.warn(`[WABot] Retry send after session purge failed for ${finalJid}: ${retryErr.message}`);
            }
        }
        throw sendErr;
    }
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
        let isConnected = (connectionState === "open" || global.baileysStatus === "open" || Boolean(sock?.user?.id));
        if (!isConnected && sock) {
            // Reconnect grace period up to 2.5s if socket is momentarily reconnecting
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 500));
                if (connectionState === "open" || global.baileysStatus === "open" || Boolean(sock?.user?.id)) {
                    isConnected = true;
                    break;
                }
            }
        }
        if (!sock || !isConnected) {
            console.warn(`[WABot] Socket Baileys belum terhubung (status: ${connectionState || "offline"}). Memeriksa Gateway Fallback...`);
            // Check if gateway token is available in settings as fallback
            try {
                const tokenRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_token' OR key = 'whatsapp_gateway_token'");
                if (tokenRow && tokenRow.value) {
                    const urlRow = await dbGet("SELECT value FROM settings WHERE key = 'whatsapp_url' OR key = 'whatsapp_gateway_url'");
                    const endpoint = (urlRow && urlRow.value) ? urlRow.value : "https://api.fonnte.com/send";

                    for (const phone of adminPhones) {
                        const cleanAdmin = cleanPhone(phone);
                        if (!cleanAdmin || cleanAdmin.length < 8) continue;
                        fetch(endpoint, {
                            method: "POST",
                            headers: { "Authorization": tokenRow.value, "Content-Type": "application/json" },
                            body: JSON.stringify({ target: cleanAdmin, message: messageBody })
                        }).catch(() => {});
                    }

                    let custTgt = customerPhone || targetPhone;
                    if (custTgt) {
                        const cleanCust = cleanPhone(custTgt);
                        if (cleanCust && cleanCust.length >= 8) {
                                            const customerMsg =
                    `Halo Kak *${userName || "Pelanggan"}*!
` +
                    `Terima kasih telah memesan layanan di *Ry-ITSolutions*.

` +
                    custProductLines +
                    `*Order ID:* #${id}
` +
                    `*Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}
` +
                    `*Status:* Sedang Diproses Admin

` +
                    `Pesanan Anda sedang dalam antrean pengerjaan oleh tim operasional kami.
` +
                    `Anda dapat memantau status pengerjaan kapan saja di website: https://ry-itsolutionts.web.id/history

` +
                    `_Pesan otomatis ini dikirim resmi oleh sistem Ry-ITSolutions._`;
                            fetch(endpoint, {
                                method: "POST",
                                headers: { "Authorization": tokenRow.value, "Content-Type": "application/json" },
                                body: JSON.stringify({ target: cleanCust, message: customerMsg })
                            }).catch(() => {});
                        }
                    }
                    logWABot(`✅ Pesanan #${id} diteruskan melalui WhatsApp Gateway (Fonnte Fallback).`, "info");
                    return;
                }
            } catch (gwErr) {
                console.warn("[WABot] Gateway fallback error:", gwErr.message);
            }

            logWABot(`⚠️ Notifikasi pesanan #${id} tertunda: WhatsApp Bot Baileys belum terhubung di server. Silakan scan QR / tautkan perangkat di menu Admin > WhatsApp Bot.`, "warn");
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

                const isGateway = serviceType === "gateway" || serviceType === "apikey" || (packageName || "").toLowerCase().includes("gateway") || (packageName || "").toLowerCase().includes("api key");
        const isTopUp = serviceType === "topup" || serviceType === "topup_qris" || (packageName || "").toLowerCase().includes("top up") || (packageName || "").toLowerCase().includes("topup");
        const isCeir = serviceType === "ceir" || serviceType === "barcode" || (packageName || "").toLowerCase().includes("ceir") || (packageName || "").toLowerCase().includes("barcode");
        const isAutomated = isCeir;
        const speedDisplay = isAutomated 
            ? "Instant (Otomatis Sistem)" 
            : `${optTitle} (${speedRangeText})`;

        let serviceDetailLines = `*Layanan:* ${packageName || "Layanan"}
`;
        let custProductLines = `*Layanan:* ${packageName || "Layanan"}
`;

        if (isGateway) {
            serviceDetailLines += `*Masa Aktif:* 30 Hari (QRIS Otomatis)
`;
            custProductLines += `*Masa Aktif:* 30 Hari
`;
        } else if (isTopUp) {
            serviceDetailLines += `*Metode:* Top Up Deposit Digital
`;
            custProductLines += `*Metode:* Top Up Deposit Digital
`;
        } else if (isCeir) {
            serviceDetailLines += `*IMEI:* \`${imei || "-"}\`
*Waktu:* Instant (Otomatis Sistem)
`;
            custProductLines += `*IMEI:* ${imei || "-"}
*Waktu:* Instant (Otomatis Sistem)
`;
        } else {
            serviceDetailLines += `*IMEI:* \`${imei || "-"}\`
*Kecepatan:* ${speedDisplay}
`;
            custProductLines += `*IMEI:* ${imei || "-"}
*Kecepatan:* ${speedDisplay}
`;
        }

        const shortId = id.slice(-4);
        const photoPath = (userImage || userImageCeir || "").split(",")[0].trim();
        const webProofUrl = photoPath ? `https://ry-itsolutionts.web.id${photoPath.startsWith('/') ? '' : '/'}${photoPath}` : null;
        let proofTextLine = "";
        if (webProofUrl) {
            proofTextLine = `*Bukti Struk/IMEI:* ${webProofUrl}\n`;
        }

        const messageBody = 
            `*PESANAN BARU MASUK*\n` +
            `──────────────────────━━━━\n` +
            `*Order ID:* \`${id}\`\n` +
            `*Pelanggan:* ${userName || "Pelanggan"}\n` +
            serviceDetailLines +
            proofTextLine +
            `*Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n` +
            `──────────────────────━━━━\n` +
            `*CARA CEPAT PROSES (BALAS PESAN INI):*\n` +
            `• Ketik *1* atau *.proses* : Mulai proses\n` +
            `• Ketik *2* atau *.sukses* : Selesaikan\n` +
            `• Ketik *3* atau *.gagal* : Tolak & refund\n` +
            `_(Bisa juga manual: \`.proses ${shortId}\` atau \`.sukses ${shortId}\`)_\n` +
            `──────────────────────━━━━`;

        // 1. Send text notification to all admin numbers immediately (instant delivery)
        for (const phone of adminPhones) {
            const cleanAdmin = cleanPhone(phone);
            if (!cleanAdmin || cleanAdmin.length < 8) continue;
            const adminJid = `${cleanAdmin}@s.whatsapp.net`;

            try {
                await sendAndStoreMessage(adminJid, { text: messageBody });
                logWABot(`✅ Notifikasi pesanan ${id} berhasil dikirim ke admin (${cleanAdmin})`, "info");
                console.log(`[WABot] Notifikasi pesanan ${id} berhasil dikirim ke admin (${cleanAdmin}).`);
            } catch (adminErr) {
                logWABot(`❌ Gagal mengirim notifikasi ke admin ${cleanAdmin}: ${adminErr.message}`, "warn");
                console.warn(`[WABot] Gagal mengirim pesan ke admin ${cleanAdmin}:`, adminErr.message);
            }

            // If user attached screenshot photo, send in background non-blocking promise with viewOnce: false & proof link
            if (photoPath) {
                const fullPath = path.join(__dirname, "..", photoPath);
                if (fs.existsSync(fullPath)) {
                    (async () => {
                        try {
                            await sendAndStoreMessage(adminJid, {
                                image: fs.readFileSync(fullPath),
                                caption: `*Lampiran Bukti Pesanan #${id}*\nLayanan: ${packageName || "Layanan"}\nIMEI: \`${imei || "-"}\`${webProofUrl ? `\n\nTautan Bukti: ${webProofUrl}` : ""}`,
                                viewOnce: false
                            });
                        } catch (imgErr) {
                            console.warn("[WABot] Notice: Gagal mengirim lampiran gambar:", imgErr.message);
                        }
                    })();
                }
            }
        }

        // 2. Resolve customer phone number robustly from all available sources
        let customerTarget = customerPhone || targetPhone;
        if (!customerTarget || customerTarget.includes("@") || cleanPhone(customerTarget).length < 8) {
            try {
                const trxRow = await dbGet("SELECT userId, targetPhone FROM transactions WHERE id = ?", [id]);
                if (trxRow) {
                    const dbPhone = await getCustomerPhoneForTransaction(trxRow);
                    if (dbPhone) customerTarget = dbPhone;
                }
            } catch (e) {}
        }
        if (!customerTarget && id) {
            try {
                const trxRow = await dbGet("SELECT userId FROM transactions WHERE id = ?", [id]);
                if (trxRow && trxRow.userId) {
                    const pastTrx = await dbGet("SELECT targetPhone FROM transactions WHERE userId = ? AND targetPhone IS NOT NULL AND targetPhone != '' AND targetPhone NOT LIKE '%@%' ORDER BY createdAt DESC LIMIT 1", [trxRow.userId]);
                    if (pastTrx && pastTrx.targetPhone && isValidIndonesianMobile(pastTrx.targetPhone)) {
                        customerTarget = cleanPhone(pastTrx.targetPhone);
                    }
                }
            } catch (e) {}
        }

        if (customerTarget) {
            const cleanCust = cleanPhone(customerTarget);
            if (cleanCust && cleanCust.length >= 8) {
                const custJid = `${cleanCust}@s.whatsapp.net`;
                                const customerMsg =
                    `Halo Kak *${userName || "Pelanggan"}*!
` +
                    `Terima kasih telah memesan layanan di *Ry-ITSolutions*.

` +
                    custProductLines +
                    `*Order ID:* #${id}
` +
                    `*Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}
` +
                    `*Status:* Sedang Diproses Admin

` +
                    `Pesanan Anda sedang dalam antrean pengerjaan oleh tim operasional kami.
` +
                    `Anda dapat memantau status pengerjaan kapan saja di website: https://ry-itsolutionts.web.id/history

` +
                    `_Pesan otomatis ini dikirim resmi oleh sistem Ry-ITSolutions._`;
                try {
                    await sendAndStoreMessage(custJid, { text: customerMsg });
                    logWABot(`✅ Notifikasi pesanan ${id} berhasil dikirim ke pelanggan (${cleanCust})`, "info");
                    console.log(`[WABot] Notifikasi pesanan ${id} berhasil dikirim ke pelanggan (${cleanCust}).`);
                } catch (custErr) {
                    logWABot(`❌ Gagal mengirim notifikasi ke pelanggan ${cleanCust}: ${custErr.message}`, "error");
                    console.warn(`[WABot] Gagal mengirim notifikasi ke pelanggan ${cleanCust}:`, custErr.message);
                }
            }
        } else {
            console.log(`[WABot] Info: Transaksi #${id} tidak memiliki nomor WhatsApp pelanggan yang valid untuk notifikasi.`);
        }
    } catch (e) {
        console.error("[WABot] Error sending order notification:", e.message);
    }
}

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

/**
 * Send test message to all registered admin phone numbers
 */
async function testAdminNotification(customMessage) {
    const adminPhones = await getAdminPhoneNumbers();
    const results = [];
    const timestampWIB = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const message = customMessage || (
        `*TEST NOTIFIKASI BOT SISTEM RY-ITSOLUTIONS*\n` +
        `──────────────────────━━━━\n` +
        `*Waktu:* ${timestampWIB} WIB\n` +
        `*Status:* Enkripsi E2EE Signal Terverifikasi\n` +
        `*Mode:* Pesan Teks Standar (Tanpa View-Once)\n` +
        `──────────────────────━━━━\n` +
        `Pesan ini dikirim resmi dari server untuk memastikan bahwa kedua nomor WhatsApp admin menerima notifikasi secara lancar tanpa tulisan 'Menunggu pesan ini' atau 'Pesan sekali lihat'.\n\n` +
        `_Ry-ITSolutions Automated Operational Engine_`
    );

    for (const phone of adminPhones) {
        const clean = cleanPhone(phone);
        if (!clean || clean.length < 8) continue;
        const jid = `${clean}@s.whatsapp.net`;
        try {
            const sent = await sendAndStoreMessage(jid, { text: message });
            results.push({ phone: clean, success: true, id: sent?.key?.id });
            console.log(`[WABot Test] Berhasil mengirim pesan uji ke ${clean} (ID: ${sent?.key?.id})`);
        } catch (e) {
            results.push({ phone: clean, success: false, error: e.message });
            console.error(`[WABot Test] Gagal mengirim pesan uji ke ${clean}:`, e.message);
        }
    }
    return results;
}


/**
 * Send Warranty Claim Notification to Admin WhatsApp numbers
 */
async function notifyWarrantyClaim({ imei, packageName, customerName, customerPhone, issueDescription, warrantyText, ticketId, trxId }) {
    const adminPhones = await getAdminPhoneNumbers();
    const results = [];
    const timestampWIB = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const cleanCustPhone = cleanPhone(customerPhone);
    const waCustLink = cleanCustPhone ? `https://wa.me/${cleanCustPhone}` : '-';

    const message = 
        `🚨 *KLAIM GARANSI SINYAL MASUK (PRIORITAS)*
` +
        `──────────────────────━━━━
` +
        `Halo Admin, seorang pelanggan baru saja mengajukan klaim garansi karena sinyal perangkatnya terputus/hilang.

` +
        `📱 *Nomor IMEI:* ${imei}
` +
        `📦 *Paket Layanan:* ${packageName || 'Unblock IMEI'}
` +
        `🛡️ *Status Garansi:* ${warrantyText || 'Garansi Aktif'}
` +
        `👤 *Nama Pelanggan:* ${customerName || 'Pelanggan'}
` +
        `📞 *WhatsApp Pelanggan:* ${cleanCustPhone || '-'}
` +
        `📝 *Kendala:* ${issueDescription || 'Sinyal hilang / Tidak ada layanan'}
` +
        `🆔 *ID Ref Transaksi:* ${trxId || '-'}
` +
        `🎫 *ID Tiket Antrean:* #${ticketId || '-'}
` +
        `⏱️ *Waktu Klaim:* ${timestampWIB} WIB
` +
        `──────────────────────━━━━
` +
        `*Instruksi Tindakan Admin:*
` +
        `1. Cek status IMEI di server pusat CeirGO / KMSP.
` +
        `2. Lakukan tembak ulang sinyal (garansi).
` +
        `3. Hubungi pembeli jika sinyal sudah aktif kembali:
👉 ${waCustLink}

` +
        `_Ry-ITSolutions Automated Operational Engine_`;

    for (const phone of adminPhones) {
        const clean = cleanPhone(phone);
        if (!clean || clean.length < 8) continue;
        const jid = `${clean}@s.whatsapp.net`;
        try {
            const sent = await sendAndStoreMessage(jid, { text: message });
            results.push({ phone: clean, success: true, id: sent?.key?.id });
            console.log(`[WABot Warranty] Berhasil mengirim notifikasi garansi ke ${clean} (ID: ${sent?.key?.id})`);
        } catch (e) {
            results.push({ phone: clean, success: false, error: e.message });
            console.error(`[WABot Warranty] Gagal mengirim notifikasi garansi ke ${clean}:`, e.message);
        }
    }
    return results;
}


/**
 * Broadcast Promo / Voucher Diskon to WhatsApp (Admin & Users)
 * Features rich formatting, banner image attachment, and 1-click auto claim & apply links.
 */
/**
 * Dapatkan daftar nomor WhatsApp penerima broadcast secara akurat & aman:
 * - Admin selalu disertakan
 * - Jika targetMode === "all":
 *    1. Ambil nomor dari pelanggan riil yang pernah melakukan order di sistem aktif (2026 ke atas):
 *       SELECT DISTINCT targetPhone FROM transactions WHERE createdAt >= "2026-01-01" AND targetPhone IS NOT NULL AND TRIM(targetPhone) != ""
 *    2. Ambil nomor dari user aktif yang terdaftar di sistem (2026 ke atas) dengan nomor WhatsApp terverifikasi:
 *       SELECT verifiedPhone FROM users WHERE createdAt >= "2026-01-01" AND verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ""
 *    3. Exclude semua data/nomor legacy 2025 (dari sistem lama sebelum website ini ada).
 *    4. Exclude nomor bot sendiri agar tidak looping.
 *    5. Validasi format nomor HP Indonesia (628...).
 */
async function getBroadcastRecipients(targetMode = "admin_only") {
    const targetPhones = new Set();

    // Nomor bot sendiri (agar tidak mengirim pesan broadcast ke nomor bot sendiri)
    const myBotPhone = sock?.user?.id ? cleanPhone(sock.user.id.split(":")[0]) : null;

    // 1. Admin Phone Numbers
    const adminPhones = await getAdminPhoneNumbers();
    adminPhones.forEach(p => {
        const c = cleanPhone(p);
        if (c && isValidIndonesianMobile(c) && c !== myBotPhone) {
            targetPhones.add(c);
        }
    });

    if (targetMode === "all") {
        // 2. Real Customers who placed orders in 2026+
        try {
            const trxRows = await dbAll(
                "SELECT DISTINCT targetPhone FROM transactions WHERE createdAt >= '2026-01-01' AND targetPhone IS NOT NULL AND TRIM(targetPhone) != ''"
            );
            if (trxRows && trxRows.length > 0) {
                trxRows.forEach(t => {
                    const c = cleanPhone(t.targetPhone);
                    if (c && isValidIndonesianMobile(c) && c !== myBotPhone) {
                        targetPhones.add(c);
                    }
                });
            }
        } catch (e) {
            console.error("[getBroadcastRecipients] Gagal query transactions:", e.message);
        }

        // 3. Registered Users from 2026+ with verified phone
        try {
            const userRows = await dbAll(
                "SELECT verifiedPhone FROM users WHERE createdAt >= '2026-01-01' AND verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ''"
            );
            if (userRows && userRows.length > 0) {
                userRows.forEach(u => {
                    const c = cleanPhone(u.verifiedPhone);
                    if (c && isValidIndonesianMobile(c) && c !== myBotPhone) {
                        targetPhones.add(c);
                    }
                });
            }
        } catch (e) {
            console.error("[getBroadcastRecipients] Gagal query users:", e.message);
        }
    }

    const list = Array.from(targetPhones);
    console.log(`[getBroadcastRecipients] Target mode '${targetMode}': ${list.length} penerima terdeteksi:`, list);
    return list;
}

async function notifyPromoBroadcast({ coupon, customMessage, targetMode = 'admin_only' }) {
    if (!coupon || !coupon.code) throw new Error("Data kupon tidak valid");

    const code = String(coupon.code).toUpperCase();
    const isPercent = coupon.discount_type === 'percent';
    const discountStr = isPercent
        ? `${coupon.discount_value}%` + (coupon.max_discount_amount ? ` (Maks. Rp ${Number(coupon.max_discount_amount).toLocaleString('id-ID')})` : '')
        : `Rp ${Number(coupon.discount_value).toLocaleString('id-ID')}`;
    const minOrderStr = coupon.min_order_amount && Number(coupon.min_order_amount) > 0
        ? `Rp ${Number(coupon.min_order_amount).toLocaleString('id-ID')}`
        : 'Tanpa Minimal Belanja';
    
    let expiredStr = 'Promo Terbatas';
    if (coupon.end_date) {
        try {
            expiredStr = new Date(coupon.end_date).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        } catch (e) {
            expiredStr = String(coupon.end_date);
        }
    }

    const claimLimit = coupon.max_claim_limit ? Number(coupon.max_claim_limit) : null;
    const claimedCount = coupon.total_claimed_count ? Number(coupon.total_claimed_count) : (coupon.used_count || 0);
    const quotaStr = claimLimit ? `${Math.max(0, claimLimit - claimedCount)} Kuota Tersisa` : 'Kuota Terbuka';

    const claimUrl = `https://ry-itsolutionts.web.id/vouchers?claim=${encodeURIComponent(code)}`;
    const orderUrl = `https://ry-itsolutionts.web.id/unblock-imei?coupon=${encodeURIComponent(code)}`;

    const caption = 
`*Ry-IT Solutions Official*
_Pemberitahuan Voucher & Potongan Khusus_

Halo Kak,

Sebagai bentuk apresiasi bagi pelanggan setia Ry-IT Solutions, kami menyediakan voucher potongan biaya layanan untuk aktivasi sinyal IMEI dan solusi digital Anda.

*Detail Penawaran:*
• Kode Voucher : *${code}*
• Nilai Diskon : *${discountStr}*
• Minimal Transaksi : ${minOrderStr}
• Masa Berlaku : s/d ${expiredStr}
• Ketersediaan : ${quotaStr}
${customMessage ? `\n*Catatan Khusus:*\n${customMessage}\n` : ''}
Voucher dapat langsung Anda simpan ke akun atau otomatis diaplikasikan saat checkout melalui tautan resmi berikut:

🔗 *Klaim Voucher:*
${claimUrl}

🔗 *Pemesanan Layanan:*
${orderUrl}

_Petunjuk: Buka salah satu tautan di atas, voucher akan otomatis terklaim dan terpasang pada halaman checkout pesanan Anda._

Terima kasih telah mempercayakan kebutuhan layanan Anda kepada Ry-IT Solutions.

Salam hangat,
*Customer Care Ry-IT Solutions*
https://ry-itsolutionts.web.id`;

    const bannerPath = path.resolve(__dirname, '../../frontend-v2/public/banners/banner_voucher.jpg');
    let imageBuffer = null;
    if (fs.existsSync(bannerPath)) {
        try {
            imageBuffer = fs.readFileSync(bannerPath);
        } catch (e) {
            console.warn('[notifyPromoBroadcast] Gagal membaca banner image:', e.message);
        }
    }

    const payload = imageBuffer 
        ? { image: imageBuffer, caption, viewOnce: false }
        : { text: caption };

    const adminPhones = await getAdminPhoneNumbers();
    const targetPhones = new Set();
    
    adminPhones.forEach(p => {
        const c = cleanPhone(p);
        if (c && c.length >= 8) targetPhones.add(c);
    });

    if (targetMode === 'all') {
        const userRows = await dbAll("SELECT verifiedPhone FROM users WHERE verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ''");
        userRows.forEach(u => {
            const c = cleanPhone(u.verifiedPhone);
            if (c && c.length >= 8) targetPhones.add(c);
        });
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of targetPhones) {
        const jid = `${phone}@s.whatsapp.net`;
        try {
            const sent = await sendAndStoreMessage(jid, payload);
            results.push({ phone, success: true, id: sent?.key?.id });
            sentCount++;
            console.log(`[WABot Promo] Berhasil kirim promo voucher ${code} ke ${phone}`);
        } catch (err) {
            results.push({ phone, success: false, error: err.message });
            failedCount++;
            console.error(`[WABot Promo] Gagal kirim promo voucher ${code} ke ${phone}:`, err.message);
        }

        if (targetPhones.length > 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return {
        success: sentCount > 0,
        totalTarget: targetPhones.length,
        totalSent: sentCount,
        totalFailed: failedCount,
        details: results
    };
}

/**
 * Broadcast New Product Notification to WhatsApp (Admin & Users)
 * Dynamically tailored message based on product category/type.
 */
async function notifyNewProductBroadcast({ product, customMessage, targetMode = 'admin_only' }) {
    if (!product || !product.name) throw new Error("Data produk tidak valid");

    const pType = (product.type || 'imei').toLowerCase();
    const priceStr = `Rp ${Number(product.price || 0).toLocaleString('id-ID')}`;

    let bannerFileName = 'banner_imei.jpg';
    let headerTitle = '🚀 *PRODUK BARU TERSEDIA DI RY-ITSOLUTIONS* 🚀';
    let detailSection = '';
    let directLink = 'https://ry-itsolutionts.web.id/unblock-imei';

    if (pType === 'imei') {
        bannerFileName = 'banner_imei.jpg';
        headerTitle = '📱 *LAYANAN BARU: UNBLOCK IMEI RESMI* 📱';
        directLink = product.link || 'https://ry-itsolutionts.web.id/unblock-imei';
        
        let speedList = ['Instant (Fast)', 'Semi-Fast', 'Hemat'];
        if (Array.isArray(product.speeds) && product.speeds.length > 0) {
            speedList = product.speeds.map(s => String(s).toUpperCase());
        }
        
        detailSection = 
`📦 *Nama Paket:* *${product.duration || product.name}*
💰 *Harga Spesial:* *${priceStr}*
📶 *Jaringan:* All Operator (Telkomsel, Indosat, XL, Tri, Smartfren)
🛡️ *Jaminan Garansi:* Resmi Anti Begal Sinyal / Hilang Sinyal
⚡ *Pilihan Server:* ${speedList.join(' • ')}
━━━━━━━━━━━━━━━━━━━━━━━
📝 *Informasi Layanan:*
${product.description || "Solusi aktivasi sinyal bypass CEIR & Bea Cukai untuk iPhone & Android Inter. Sinyal langsung aktif stabil tanpa takut hilang!"}`;
    } else if (pType === 'package') {
        bannerFileName = 'banner_voucher.jpg';
        headerTitle = '⚡ *PRODUK BARU: PAKET DATA & KUOTA INTERNET* ⚡';
        directLink = product.link || 'https://ry-itsolutionts.web.id/beli-paket';
        detailSection = 
`📦 *Nama Paket:* *${product.name}*
💰 *Harga:* *${priceStr}*
📂 *Kategori:* ${product.category || 'Paket Internet'}
⚡ *Metode Masuk:* Otomatis Masuk / Inject No-OTP
━━━━━━━━━━━━━━━━━━━━━━━
📝 *Deskripsi:*
${product.description || "Paket data kuota internet super hemat langsung aktif masuk ke nomor Anda."}`;
    } else if (pType === 'gateway') {
        bannerFileName = 'banner_gopay.jpg';
        headerTitle = '💳 *FITUR BARU: PAYMENT GATEWAY & MERCHANT* 💳';
        directLink = product.link || 'https://ry-itsolutionts.web.id/gateway';
        detailSection = 
`🛠️ *Layanan:* *${product.name}*
💰 *Biaya / Fee:* *${priceStr}*
━━━━━━━━━━━━━━━━━━━━━━━
📝 *Deskripsi:*
${product.description || "Terima pembayaran QRIS & GoPay otomatis untuk website atau bot Anda dengan integrasi API mudah!"}`;
    } else {
        bannerFileName = 'banner_voucher.jpg';
        headerTitle = '✨ *PRODUK TERBARU RY-ITSOLUTIONS* ✨';
        directLink = product.link || 'https://ry-itsolutionts.web.id/dashboard';
        detailSection = 
`📦 *Produk:* *${product.name}*
💰 *Harga:* *${priceStr}*
━━━━━━━━━━━━━━━━━━━━━━━
📝 *Deskripsi:*
${product.description || "Layanan digital terbaru dari Ry-ITSolutions kini siap dipesan!"}`;
    }

    const caption = 
`${headerTitle}
━━━━━━━━━━━━━━━━━━━━━━━
${detailSection}
${customMessage ? `\n━━━━━━━━━━━━━━━━━━━━━━━\n📢 *Pesan Tambahan:* ${customMessage}\n` : ''}
👉 *PESAN & CEK DETAIL SEKARANG:*
${directLink}
━━━━━━━━━━━━━━━━━━━━━━━
_Ry-ITSolutions Official Support & Store_`;

    const bannerPath = path.resolve(__dirname, `../../frontend-v2/public/banners/${bannerFileName}`);
    let imageBuffer = null;
    if (fs.existsSync(bannerPath)) {
        try {
            imageBuffer = fs.readFileSync(bannerPath);
        } catch (e) {
            console.warn('[notifyNewProductBroadcast] Gagal membaca banner image:', e.message);
        }
    }

    const payload = imageBuffer 
        ? { image: imageBuffer, caption, viewOnce: false }
        : { text: caption };

    const adminPhones = await getAdminPhoneNumbers();
    const targetPhones = new Set();
    
    adminPhones.forEach(p => {
        const c = cleanPhone(p);
        if (c && c.length >= 8) targetPhones.add(c);
    });

    if (targetMode === 'all') {
        const userRows = await dbAll("SELECT verifiedPhone FROM users WHERE verifiedPhone IS NOT NULL AND TRIM(verifiedPhone) != ''");
        userRows.forEach(u => {
            const c = cleanPhone(u.verifiedPhone);
            if (c && c.length >= 8) targetPhones.add(c);
        });
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of targetPhones) {
        const jid = `${phone}@s.whatsapp.net`;
        try {
            const sent = await sendAndStoreMessage(jid, payload);
            results.push({ phone, success: true, id: sent?.key?.id });
            sentCount++;
            console.log(`[WABot Product] Berhasil kirim info produk '${product.name}' ke ${phone}`);
        } catch (err) {
            results.push({ phone, success: false, error: err.message });
            failedCount++;
            console.error(`[WABot Product] Gagal kirim info produk '${product.name}' ke ${phone}:`, err.message);
        }

        if (targetPhones.length > 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return {
        success: sentCount > 0,
        totalTarget: targetPhones.length,
        totalSent: sentCount,
        totalFailed: failedCount,
        details: results
    };
}

module.exports = {
    notifyPromoBroadcast,
    getBroadcastRecipients,
    notifyNewProductBroadcast,

    getWALogs,
    initWABot,
    logoutWABot,
    closeWABot,
    getWAStatus,
    sendTextMessage,
    notifyNewOrder,
    notifyCustomerOnStatusChange,
    getCustomerPhoneForTransaction,
    isValidIndonesianMobile,
    requestPairingCode,
    purgeStalePeerSessions,
    getAdminPhoneNumbers,
    testAdminNotification,
    notifyWarrantyClaim
};
