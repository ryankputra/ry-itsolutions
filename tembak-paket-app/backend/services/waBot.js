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
    jidNormalizedUser,
    proto,
    BufferJSON,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");
const { censorScreenshot } = require("./censorService");
const { publishToStory, publishToFeed, publishOpenStory, saveSessionFromCookie, getUniqueTracks } = require("./igDirectService");

// Pending admin testimonial sessions: remoteJid -> { items: [ { buffer, track, caption, boxesCount } ], timestamp }
const pendingTestimonials = new Map();
// Pending admin image upload batches (for multi-image send): remoteJid -> { timer, rawMsgs: [] }
const adminImageBatches = new Map();
// Cache IDs sent by the bot to prevent self-triggering loops
const botSentMsgIds = new Set();
const processedMessageIds = new Set();
function isMsgDuplicate(id) {
    if (!id) return false;
    if (processedMessageIds.has(id)) return true;
    processedMessageIds.add(id);
    if (processedMessageIds.size > 3000) {
        const first = processedMessageIds.values().next().value;
        processedMessageIds.delete(first);
    }
    return false;
}
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
const BOT_FOOTER = "\n\n🤖 _Pesan ini dikirim otomatis oleh Sistem Bot Ry-ITSolutions._";

// Ensure SQLite persistent store table exists
dbRun(`
    CREATE TABLE IF NOT EXISTS wa_contacts (
        jid TEXT PRIMARY KEY,
        phone TEXT,
        name TEXT,
        notify TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).catch(() => {});

function normalizePhone(p) {
    if (!p) return '';
    let digits = String(p).replace(/\D/g, '');
    if (digits.startsWith('08')) {
        digits = '628' + digits.slice(2);
    } else if (digits.startsWith('8') && digits.length >= 10 && !digits.startsWith('628')) {
        digits = '628' + digits.slice(1);
    }
    return digits;
}

async function saveWAContacts(contactsList) {
    if (!Array.isArray(contactsList) || contactsList.length === 0) return;
    for (const c of contactsList) {
        if (!c.id || c.id.includes('@g.us') || c.id.includes('@broadcast') || c.id.includes('@newsletter')) continue;
        const jid = c.id;
        const rawPhone = (jid.replace('@s.whatsapp.net', '').split(':')[0] || '').replace(/\D/g, '');
        const phone = normalizePhone(rawPhone);
        const name = c.name || c.verifiedName || null;
        const notify = c.notify || null;

        if (name || notify) {
            try {
                const existing = await dbGet("SELECT name, notify FROM wa_contacts WHERE jid = ?", [jid]);
                const newName = name || existing?.name || null;
                const newNotify = notify || existing?.notify || null;

                await dbRun(`
                    INSERT INTO wa_contacts (jid, phone, name, notify, updatedAt)
                    VALUES (?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(jid) DO UPDATE SET
                        phone = excluded.phone,
                        name = COALESCE(excluded.name, wa_contacts.name),
                        notify = COALESCE(excluded.notify, wa_contacts.notify),
                        updatedAt = datetime('now')
                `, [jid, phone, newName, newNotify]);

                const displayName = newName || newNotify;
                if (displayName) {
                    await dbRun(
                        "UPDATE wa_chat_history SET pushName = ? WHERE remoteJid = ? OR senderPhone = ? OR senderPhone = ?",
                        [displayName, jid, rawPhone, phone]
                    );
                }
            } catch (e) {}
        }
    }
}

async function recordChatMessage(msgId, remoteJid, pushName, fromMe, body, messageType = 'text', timestamp = Date.now()) {
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast') || remoteJid.includes('@newsletter')) return;
    const cleanPhoneNum = (remoteJid.replace('@s.whatsapp.net', '').split(':')[0] || '').replace(/\D/g, '');
    const isReadVal = fromMe ? 1 : 0;
    const safeMsgId = msgId || `MSG_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
    try {
        await dbRun(`
            INSERT OR REPLACE INTO wa_chat_history (msg_id, remoteJid, senderPhone, pushName, fromMe, messageType, body, timestamp, isRead)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            safeMsgId,
            remoteJid,
            cleanPhoneNum,
            pushName || cleanPhoneNum,
            fromMe ? 1 : 0,
            messageType,
            body || '',
            timestamp,
            isReadVal
        ]);
    } catch (err) {}
}

function extractMessageTextAndDetails(rawObj) {
    if (!rawObj) return null;
    const content = rawObj.message || rawObj;
    if (!content || typeof content !== 'object') return null;

    let text = "";
    let type = "text";

    if (content.conversation) {
        text = content.conversation;
    } else if (content.extendedTextMessage?.text) {
        text = content.extendedTextMessage.text;
    } else if (content.imageMessage) {
        text = content.imageMessage.caption || "[Foto]";
        type = "image";
    } else if (content.documentMessage) {
        text = content.documentMessage.caption || content.documentMessage.fileName || "[Dokumen]";
        type = "document";
    } else if (content.audioMessage) {
        text = "[Pesan Suara]";
        type = "audio";
    } else if (content.videoMessage) {
        text = content.videoMessage.caption || "[Video]";
        type = "video";
    } else if (content.stickerMessage) {
        text = "[Stiker]";
        type = "sticker";
    } else if (content.contactMessage || content.contactsArrayMessage) {
        text = "[Kontak]";
        type = "contact";
    } else if (content.locationMessage || content.liveLocationMessage) {
        text = "[Lokasi]";
        type = "location";
    } else if (content.protocolMessage) {
        return null;
    }

    if (!text) return null;
    return { text: text.trim(), type };
}

let isBackfilling = false;
let hasBackfilled = false;
async function backfillStoreToHistory() {
    if (isBackfilling || hasBackfilled) return 0;
    isBackfilling = true;
    try {
        const historyCount = await dbGet("SELECT COUNT(*) as cnt FROM wa_chat_history").catch(() => null);
        if (historyCount && historyCount.cnt > 0) {
            hasBackfilled = true;
            isBackfilling = false;
            return 0;
        }

        const rows = await dbAll("SELECT id, remoteJid, messageContent, createdAt FROM wa_message_store ORDER BY createdAt ASC").catch(() => []);
        if (!rows || rows.length === 0) {
            hasBackfilled = true;
            isBackfilling = false;
            return 0;
        }
        let count = 0;
        for (const row of rows) {
            const remoteJid = row.remoteJid;
            if (!remoteJid || remoteJid.includes("@g.us") || remoteJid.includes("@broadcast") || remoteJid.includes("@newsletter")) continue;
            try {
                const parsed = typeof row.messageContent === 'string' ? JSON.parse(row.messageContent) : row.messageContent;
                const details = extractMessageTextAndDetails(parsed);
                if (!details || !details.text) continue;

                const cleanPhoneNum = (remoteJid.replace('@s.whatsapp.net', '').split(':')[0] || '').replace(/\D/g, '');
                const keyFromMe = parsed.key?.fromMe;
                const fromMe = keyFromMe !== undefined ? (keyFromMe ? 1 : 0) : (row.id.startsWith("3EB0") || row.id.startsWith("BAE5") || row.id.startsWith("RYY") ? 1 : 0);
                const pushName = parsed.pushName || cleanPhoneNum;
                const ts = row.createdAt ? Number(row.createdAt) : Date.now();

                await recordChatMessage(row.id, remoteJid, pushName, fromMe, details.text, details.type, ts);
                count++;
            } catch (e) {}
        }
        if (count > 0) {
            logWABot(`[WA Hydration] Berhasil mengimpor ${count} riwayat pesan dari wa_message_store.`, "info");
        }
        hasBackfilled = true;
        isBackfilling = false;
        return count;
    } catch (e) {
        isBackfilling = false;
        return 0;
    }
}

// Trigger initial backfill shortly after startup
setTimeout(() => {
    backfillStoreToHistory().catch(() => {});
}, 3000);

function normalizeProtoMessage(msgObj) {
    if (!msgObj) return null;
    let m = msgObj.message || msgObj;
    if (typeof m.toJSON === 'function') {
        m = m.toJSON();
    }
    // Unwrap nested wrappers recursively if any
    let depth = 0;
    while (m && typeof m === 'object' && depth < 5) {
        depth++;
        if (m.deviceSentMessage?.message) {
            m = m.deviceSentMessage.message;
        } else if (m.ephemeralMessage?.message) {
            m = m.ephemeralMessage.message;
        } else if (m.viewOnceMessage?.message) {
            m = m.viewOnceMessage.message;
        } else if (m.viewOnceMessageV2?.message) {
            m = m.viewOnceMessageV2.message;
        } else if (m.documentWithCaptionMessage?.message) {
            m = m.documentWithCaptionMessage.message;
        } else {
            break;
        }
        if (m && typeof m.toJSON === 'function') {
            m = m.toJSON();
        }
    }

    if (typeof m === 'string') {
        return { conversation: m };
    }
    if (m?.text && typeof m.text === 'string' && !m.conversation && !m.extendedTextMessage) {
        return { conversation: m.text };
    }
    return m;
}

async function storeMessage(id, remoteJid, messageObj) {
    if (!id || !messageObj) return;
    try {
        const plainMsg = normalizeProtoMessage(messageObj);
        if (!plainMsg) return;

        messageStore.set(id, plainMsg);
        const serialized = JSON.stringify(plainMsg);
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

    // 1. Try memory cache first by exact ID or case variants
    const candidateIds = [key.id, key.id.toUpperCase(), key.id.toLowerCase()];
    for (const kId of candidateIds) {
        const inMem = messageStore.get(kId);
        if (inMem) {
            try {
                const plain = normalizeProtoMessage(inMem);
                if (plain) return proto.Message.fromObject(plain);
            } catch (e) {
                if (inMem) return inMem;
            }
        }
    }

    // 2. Try SQLite DB store by exact key.id or case-insensitive match
    try {
        const row = await dbGet("SELECT messageContent FROM wa_message_store WHERE id = ? OR LOWER(id) = LOWER(?)", [key.id, key.id]);
        if (row?.messageContent) {
            const parsed = JSON.parse(row.messageContent);
            const plain = normalizeProtoMessage(parsed);
            if (plain) {
                try {
                    return proto.Message.fromObject(plain);
                } catch (e) {
                    return plain;
                }
            }
        }
    } catch (e) {}

    // 3. Fallback: try finding recent sent message for same remoteJid in DB
    if (key.remoteJid) {
        try {
            const cleanPhoneNum = (key.remoteJid.replace('@s.whatsapp.net', '').split(':')[0] || '').replace(/\D/g, '');
            const recentRow = await dbGet(
                "SELECT body FROM wa_chat_history WHERE remoteJid = ? OR senderPhone = ? ORDER BY timestamp DESC LIMIT 1",
                [key.remoteJid, cleanPhoneNum]
            );
            if (recentRow?.body) {
                return proto.Message.fromObject({ conversation: recentRow.body });
            }
        } catch (e) {}
    }

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

/**
 * Get active bot WhatsApp phone number
 */
function getBotPhoneNumber() {
    try {
        if (sock?.user?.id) {
            return cleanPhone(sock.user.id.split('@')[0].split(':')[0]);
        }
        if (connectedPhone && connectedPhone !== 'Connected') {
            return cleanPhone(connectedPhone.split('@')[0].split(':')[0]);
        }
        if (inMemoryCreds?.me?.id) {
            return cleanPhone(inMemoryCreds.me.id.split('@')[0].split(':')[0]);
        }
        const credsPath = path.join(SESSIONS_DIR, 'creds.json');
        if (fs.existsSync(credsPath)) {
            const raw = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            if (raw?.me?.id) {
                return cleanPhone(raw.me.id.split('@')[0].split(':')[0]);
            }
        }
    } catch (e) {}
    return "6287767287284"; // Default fallback bot WhatsApp number
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
async function getAdminPhoneNumbers(paymentMethod = '') {
    const adminPhones = new Set();
    const pm = String(paymentMethod || '').toLowerCase();

    // Specific routing based on payment method
    const primaryGoPayAdmin = "6285156692166";
    const primaryShopeeAdmin = "6288706611370";

    if (pm.includes('shopee')) {
        adminPhones.add(primaryShopeeAdmin);
    } else if (pm.includes('gopay') || pm.includes('balance') || pm.includes('qris')) {
        adminPhones.add(primaryGoPayAdmin);
    } else {
        adminPhones.add(primaryGoPayAdmin);
        adminPhones.add(primaryShopeeAdmin);
    }

    // 0. Additional Primary Administrator Numbers & Known Admin LIDs
    const primaryAdmins = [primaryGoPayAdmin, primaryShopeeAdmin, "217489191489706", "15062853009567"];
    primaryAdmins.forEach(num => {
        const cp = cleanPhone(num);
        if (cp) adminPhones.add(cp);
    });

    // 1. From environment variables
    const envAdmin = process.env.WA_ADMIN_NUMBER || process.env.ADMIN_WHATSAPP || "6285156692166,6288706611370";
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

    // CRITICAL: Keluarkan nomor bot WhatsApp itu sendiri agar tidak pernah mengirim notifikasi ke diri sendiri
    // Pengiriman ke nomor bot sendiri memicu "Menunggu pesan ini. Tindakan ini mungkin membutuhkan waktu beberapa saat."
    const botPhone = getBotPhoneNumber();
    if (botPhone) {
        adminPhones.delete(botPhone);
    }

    // Pastikan setidaknya admin utama selalu ada jika kosong
    if (adminPhones.size === 0) {
        adminPhones.add(primaryGoPayAdmin);
    }

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
            generateHighQualityLinkPreview: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            }
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

        // --- CONTACTS & HISTORY SYNC CONTROLLER ---
        sock.ev.on("contacts.set", async ({ contacts }) => {
            logWABot(`[WA Sync] Menerima sync kontak WhatsApp: ${contacts?.length || 0} kontak.`, "info");
            await saveWAContacts(contacts);
        });

        sock.ev.on("contacts.upsert", async (contacts) => {
            await saveWAContacts(contacts);
        });

        sock.ev.on("contacts.update", async (updates) => {
            await saveWAContacts(updates);
        });

        sock.ev.on("messaging-history.set", async ({ messages, contacts }) => {
            logWABot(`[WA Sync] Menerima sync riwayat dari WhatsApp: ${messages?.length || 0} pesan, ${contacts?.length || 0} kontak.`, "info");
            if (contacts && Array.isArray(contacts)) {
                await saveWAContacts(contacts);
            }
            if (messages && Array.isArray(messages)) {
                for (const msg of messages) {
                    try {
                        if (msg.key?.id && msg.message) {
                            await storeMessage(msg.key.id, msg.key.remoteJid, msg.message);
                        }
                        const remoteJid = msg.key?.remoteJid;
                        if (remoteJid && !remoteJid.includes("@g.us") && !remoteJid.includes("@broadcast") && !remoteJid.includes("@newsletter")) {
                            const details = extractMessageTextAndDetails(msg.message);
                            if (details && details.text) {
                                const pushName = msg.pushName || "";
                                const fromMe = msg.key?.fromMe ? 1 : 0;
                                const msgId = msg.key?.id;
                                const ts = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();
                                await recordChatMessage(msgId, remoteJid, pushName, fromMe, details.text, details.type, ts);
                            }
                        }
                    } catch (e) {}
                }
            }
        });

        // --- INCOMING MESSAGE CONTROLLER (ADMIN COMMANDS & SHORTCUTS) ---
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            for (const msg of messages) {
                if (msg.key?.id && msg.message) {
                    await storeMessage(msg.key.id, msg.key.remoteJid, msg.message);
                }

                const remoteJid = msg.key?.remoteJid;
                if (remoteJid && !remoteJid.includes("@g.us") && !remoteJid.includes("@broadcast") && !remoteJid.includes("@newsletter")) {
                    const messageText = (
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        (msg.message?.imageMessage ? "[Foto]" : msg.message?.documentMessage ? "[Dokumen]" : "")
                    ).trim();
                    const pushName = msg.pushName || "";
                    const fromMe = msg.key?.fromMe ? 1 : 0;
                    const msgId = msg.key?.id;
                    const ts = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();

                    if (messageText || msg.message?.imageMessage || msg.message?.documentMessage) {
                        await recordChatMessage(msgId, remoteJid, pushName, fromMe, messageText, msg.message?.imageMessage ? 'image' : 'text', ts);
                    }
                }
            }

            for (const msg of messages) {
                if (!msg.message) continue;

                const msgId = msg.key?.id;
                // Ignore messages sent by the bot itself or already processed
                if (msgId && botSentMsgIds.has(msgId)) continue;
                if (isMsgDuplicate(msgId)) continue;

                const remoteJid = msg.key.remoteJid;
                // Ignore empty JID, group chats (@g.us), broadcast channels, and newsletters
                if (!remoteJid || remoteJid.includes("@g.us") || remoteJid.includes("@broadcast") || remoteJid.includes("@newsletter")) continue;

                // Determine sender phone number / LID cleanly
                const rawSender = msg.key.participant || msg.participant || remoteJid;
                const cleanSenderPhone = cleanPhone(rawSender.replace(/@(s\.whatsapp\.net|lid)/g, "").split(":")[0]);
                const cleanRemotePhone = cleanPhone(remoteJid.replace(/@(s\.whatsapp\.net|lid)/g, "").split(":")[0]);
                const adminPhones = await getAdminPhoneNumbers();
                const cleanAdminList = adminPhones.map(p => cleanPhone(p)).filter(Boolean);

                // STRICT ADMIN CHECK:
                // Only authorized if message was sent from the bot's own account (fromMe)
                // OR the sender's phone / LID is explicitly in the admin list.
                const isSenderAdmin = Boolean(
                    msg.key.fromMe ||
                    (cleanSenderPhone && cleanAdminList.includes(cleanSenderPhone)) ||
                    (cleanRemotePhone && cleanAdminList.includes(cleanRemotePhone)) ||
                    (remoteJid && cleanAdminList.some(admin => remoteJid.includes(admin)))
                );

                // IF SENDER IS NOT AN ADMIN:
                // SILENTLY IGNORE! NO REPLY, NO COMMANDS, NO MESSAGES WHATSOEVER!
                if (!isSenderAdmin) {
                    // Do not respond to regular users under any circumstances
                    continue;
                }

/**
 * Memproses sekumpulan (batch) foto testimoni yang dikirim admin sekaligus
 */
async function processAdminImageBatch(remoteJid) {
    const batch = adminImageBatches.get(remoteJid);
    if (!batch || batch.rawMsgs.length === 0) return;
    adminImageBatches.delete(remoteJid);

    const msgsToProcess = [...batch.rawMsgs];
    const totalCount = msgsToProcess.length;

    logWABot(`[WABot Testi] Memproses batch ${totalCount} gambar testimoni dari ${remoteJid}...`, "info");

    const processedItems = [];
    // Dapatkan lagu unik yang berbeda-beda satu sama lain untuk setiap gambar
    const tracks = getUniqueTracks(totalCount);

    for (let i = 0; i < msgsToProcess.length; i++) {
        const msg = msgsToProcess[i];
        try {
            const mediaBuffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            const { censoredBuffer, boxesCount, detectedTypes } = await censorScreenshot(mediaBuffer);
            const rawCaption = (msg.message?.imageMessage?.caption || '').trim();

            processedItems.push({
                buffer: censoredBuffer,
                boxesCount,
                detectedTypes,
                caption: rawCaption,
                track: tracks[i]
            });
        } catch (errImg) {
            console.error(`[WABot Testi] Gagal memproses gambar ke-${i + 1}:`, errImg.message);
        }
    }

    if (processedItems.length === 0) {
        await replyWhatsApp(remoteJid, "❌ *Gagal memproses gambar testimoni yang dikirim.*" + BOT_FOOTER);
        return;
    }

    // Simpan batch ke pendingTestimonials
    pendingTestimonials.set(remoteJid, {
        items: processedItems,
        timestamp: Date.now()
    });

    // Kirim setiap gambar yang telah disensor kembali ke WhatsApp admin
    for (let i = 0; i < processedItems.length; i++) {
        const itm = processedItems[i];
        await sendAdminMediaReply(remoteJid, {
            image: itm.buffer,
            caption: `📸 *HASIL BLUR FOTO ${i + 1}/${processedItems.length}*\n🎵 *Musik:* ${itm.track.title} - ${itm.track.artist}\n🔒 *Area Blur:* ${itm.boxesCount} area aman disensor`
        });
        if (i < processedItems.length - 1) {
            await new Promise(r => setTimeout(r, 600));
        }
    }

    // Tampilkan rangkuman lagu yang berbeda-beda dan opsi posting terpisah
    const trackLines = processedItems.map((itm, idx) => 
        `• Foto ${idx + 1}: 🎵 *${itm.track.title}* (${itm.track.artist})`
    ).join("\n");

    const reviewPrompt = 
        `📸 *SELESAI MENYENSOR ${processedItems.length} FOTO TESTIMONI*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎶 *Setiap foto disematkan musik viral berbeda:*\n` +
        trackLines + `\n\n` +
        `🎯 *Target Akun:* *@unlocksinyalsolo*\n\n` +
        `Silakan balas angka untuk mempublikasikan:\n` +
        `1️⃣ Balas *1* ➔ Post ke *Instagram Story* (Video 15s bersuara musik nyata 🔊, terbit terpisah)\n` +
        `2️⃣ Balas *2* ➔ Post ke *Instagram Feed* (masing-masing terbit sendiri terpisah)\n` +
        `3️⃣ Balas *3* ➔ Post ke *Story & Feed*\n` +
        `0️⃣ Balas *0* ➔ Batalkan\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Sesi konfirmasi berlaku selama 15 menit._` +
        BOT_FOOTER;

    await replyWhatsApp(remoteJid, reviewPrompt);
}

                // 1. ADMIN IMAGE HANDLING: Testimoni auto-censor & publish IG
                if (msg.message?.imageMessage) {
                    // NEVER process outgoing image messages sent by the bot
                    if (msg.key.fromMe) continue;

                    const rawCaption = (msg.message.imageMessage.caption || '').trim();
                    // Double safety: ignore bot result messages
                    if (rawCaption.includes('HASIL BLUR FOTO') || rawCaption.includes('HASIL SENSOR BUKTI') || rawCaption.includes('Ry-ITSolutions')) {
                        continue;
                    }

                    // Multi-screenshot batch collector dengan debounce 2.2s
                    let batch = adminImageBatches.get(remoteJid);
                    if (!batch) {
                        batch = { rawMsgs: [], timer: null };
                        adminImageBatches.set(remoteJid, batch);
                        await replyWhatsApp(remoteJid, "⏳ *Menerima foto testimoni...*\nSedang memproses & menerapkan efek blur data sensitif...");
                    }

                    batch.rawMsgs.push(msg);

                    if (batch.timer) clearTimeout(batch.timer);
                    batch.timer = setTimeout(() => {
                        processAdminImageBatch(remoteJid).catch(err => {
                            console.error("[WABot Testi] Error processing image batch:", err);
                        });
                    }, 2200);

                    continue;
                }

                const messageText = (
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    ""
                ).trim();

                if (!messageText) continue;

                // Check if message is a command or quick shortcut (e.g. .proses, 1, 2, 3, p, s, g, proses, open, igsession)
                const isCommand = (
                    messageText.startsWith(".") ||
                    messageText.startsWith("#") ||
                    /^(0|1|2|3|p|s|g|proses|sukses|gagal|status|bantuan|help|menu|open|igsession)\b/i.test(messageText)
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
                    `*PESANAN LANGGANAN GATEWAY SEDANG DIPROSES*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `• *Status:* Sedang Diaktivasi Admin\n` +
                    (customNote ? `• *Catatan Admin:* ${customNote}\n` : "") +
                    `\nAktivasi API Key sedang disiapkan oleh tim kami.\n\n` +
                    `Pantau status: https://ry-itsolutionts.web.id/history?tab=processing` +
                    BOT_FOOTER;
            } else if (newStatus === "success" || newStatus === "completed") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN LANGGANAN GATEWAY TELAH AKTIF (SUKSES)*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `• *Masa Aktif:* 30 Hari\n` +
                    `• *Status:* Aktif\n` +
                    (customNote ? `• *Catatan Admin:* ${customNote}\n` : "") +
                    `\nAPI Key Anda telah aktif selama 30 hari. Silakan gunakan untuk integrasi pembayaran QRIS otomatis di website / bot Anda.\n\n` +
                    `Kelola Gateway: https://ry-itsolutionts.web.id/gateway\n` +
                    `Cetak Nota Pembayaran: https://ry-itsolutionts.web.id/history?tab=completed` +
                    BOT_FOOTER;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PESANAN GATEWAY*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *Layanan:* ${trx.packageName || "Langganan API Key Gateway"}\n` +
                    `• *Status:* Dibatalkan / Gagal\n` +
                    `• *Alasan:* ${customNote || "Pesanan tidak dapat diproses oleh admin."}\n\n` +
                    `Silakan periksa akun Anda di website atau hubungi admin: https://ry-itsolutionts.web.id/history` +
                    BOT_FOOTER;
            } else {
                return;
            }
        } else if (serviceKind === "ceir") {
            if (newStatus === "processing") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PENGECEKAN CEIR SEDANG DIPROSES*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    `• *Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `• *Status:* Sedang Dikerjakan Sistem\n` +
                    (customNote ? `• *Catatan Admin:* ${customNote}\n` : "") +
                    `\nPengecekan database CEIR sedang berjalan. Mohon ditunggu ya Kak.\n\n` +
                    `Pantau status: https://ry-itsolutionts.web.id/history?tab=processing` +
                    BOT_FOOTER;
            } else if (newStatus === "success" || newStatus === "completed") {
                let resultDetails = "";
                if (trx.api_response) {
                    try {
                        let parsed = typeof trx.api_response === "string" ? JSON.parse(trx.api_response) : trx.api_response;
                        if (Array.isArray(parsed) && parsed[0]) {
                            const item = parsed[0];
                            if (item.valid_until) resultDetails += `• *Masa Berlaku:* ${item.valid_until}\n`;
                            if (item.status) resultDetails += `• *Status CEIR:* ${item.status}\n`;
                            if (item.brand) resultDetails += `• *Brand / Model:* ${item.brand}${item.model ? ' ' + item.model : ''}\n`;
                            if (item.barcode_url) resultDetails += `• *Link Barcode:* ${item.barcode_url}\n`;
                        } else if (typeof parsed === "object" && parsed !== null) {
                            if (parsed.valid_until) resultDetails += `• *Masa Berlaku:* ${parsed.valid_until}\n`;
                            if (parsed.status && typeof parsed.status === "string") resultDetails += `• *Status CEIR:* ${parsed.status}\n`;
                            if (parsed.brand) resultDetails += `• *Brand / Model:* ${parsed.brand}${parsed.model ? ' ' + parsed.model : ''}\n`;
                            if (parsed.barcode_url) resultDetails += `• *Link Barcode:* ${parsed.barcode_url}\n`;
                        }
                    } catch (e) {}
                }

                custMsg = `Halo Kak *${userName}*! 👋\n\n` +
                    `*HASIL PENGECEKAN CEIR TELAH SELESAI (SUKSES)*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    resultDetails +
                    `• *Status:* Selesai / Terverifikasi Resmi\n` +
                    (customNote && !customNote.includes("Pesanan-mu telah berhasil") ? `• *Catatan:* ${customNote}\n` : "") +
                    `\nData IMEI Anda telah berhasil diperiksa dan diverifikasi oleh Server Pusat CEIR.\n\n` +
                    `Lihat Rincian & Riwayat:\nhttps://ry-itsolutionts.web.id/history?tab=completed` +
                    BOT_FOOTER;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PENGECEKAN CEIR*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    `• *Layanan:* ${trx.packageName || "Cek Status CEIR"}\n` +
                    `• *Status:* Gagal\n` +
                    `• *Alasan:* ${customNote || "Pengecekan gagal diproses."}\n\n` +
                    `Silakan periksa akun Anda: https://ry-itsolutionts.web.id/history` +
                    BOT_FOOTER;
            } else {
                return;
            }
        } else {
            // Default: IMEI Service
            const durLabel = warranty?.durationLabel || "Sesuai Paket";
            if (newStatus === "processing") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN ADD ROAMER SEDANG DIPROSES*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    `• *Layanan:* ${trx.packageName || "Add Roamer"}\n` +
                    `• *Status:* Sedang Dikerjakan Admin\n` +
                    (customNote ? `• *Catatan Admin:* ${customNote}\n` : "") +
                    `\nTim teknis kami sedang memproses dan mengaktivasi sinyal perangkat Anda. Mohon ditunggu ya Kak.\n\n` +
                    `Pantau status pesanan: https://ry-itsolutionts.web.id/history?tab=processing` +
                    BOT_FOOTER;
            } else if (newStatus === "success" || newStatus === "completed") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PESANAN ADD ROAMER TELAH SELESAI (SUKSES)*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    `• *Layanan:* ${trx.packageName || "Add Roamer"}\n` +
                    `• *Garansi Sinyal:* ${durLabel} (Aktif)\n` +
                    `• *Status:* Selesai / Sinyal Aktif\n` +
                    (customNote ? `• *Catatan Admin:* ${customNote}\n` : "") +
                    `\nSilakan restart HP Anda atau lepas-pasang kartu SIM untuk mengaktifkan jaringan sinyal.\n\n` +
                    `Cetak Nota & Kartu Garansi: https://ry-itsolutionts.web.id/history?tab=completed` +
                    BOT_FOOTER;
            } else if (newStatus === "failed" || newStatus === "cancelled") {
                custMsg = `Halo Kak *${userName}*!\n\n` +
                    `*PEMBERITAHUAN PESANAN ADD ROAMER*\n\n` +
                    `• *Order ID:* #${trx.id}\n` +
                    `• *IMEI:* ${trx.imei || "-"}\n` +
                    `• *Layanan:* ${trx.packageName || "Add Roamer"}\n` +
                    `• *Status:* Dibatalkan / Gagal\n` +
                    `• *Alasan:* ${customNote || "Pesanan tidak dapat diproses oleh admin."}\n\n` +
                    `Silakan cek saldo akun Anda di website atau hubungi admin jika ada pertanyaan: https://ry-itsolutionts.web.id/history` +
                    BOT_FOOTER;
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
    const rawCleanText = text.trim().toLowerCase();

    // Command Khusus: Simpan / Bind Session ID Instagram (.igsession <sessionid>)
    if (rawCleanText.startsWith(".igsession") || rawCleanText.startsWith("#igsession") || rawCleanText.startsWith("igsession")) {
        const sessionArg = text.trim().replace(/^(\.igsession|#igsession|igsession)\s*/i, '').trim();
        if (!sessionArg) {
            await replyWhatsApp(replyJid, 
                "ℹ️ *CARA BIND SESI INSTAGRAM:*\n\n" +
                "Ketik: *.igsession <sessionid_anda>*\n\n" +
                "_Tips: Buka instagram.com di browser -> Inspect/F12 -> Application -> Cookies -> salin nilai 'sessionid'._" + BOT_FOOTER
            );
            return;
        }

        await replyWhatsApp(replyJid, "⏳ *Memverifikasi & mengaitkan sesi Instagram @unlocksinyalsolo...*");
        try {
            const res = await saveSessionFromCookie(sessionArg, "unlocksinyalsolo");
            await replyWhatsApp(replyJid, 
                `✅ *AKUN INSTAGRAM BERHASIL TERHUBUNG!*\n\n` +
                `👤 *Akun:* @${res.username}\n` +
                `🆔 *ID:* ${res.pk}\n` +
                `🚀 *Status:* Siap untuk Auto-Post Story & Feed testimoni!` + BOT_FOOTER
            );
        } catch(e) {
            await replyWhatsApp(replyJid, `❌ *Gagal menghubungkan sesi:* ${e.message}` + BOT_FOOTER);
        }
        return;
    }

    // Command Khusus: Auto Story Open Toko (#open / .open / open)
    if (rawCleanText === "#open" || rawCleanText === ".open" || rawCleanText === "open") {
        await replyWhatsApp(replyJid, "⏳ *Sedang menyiapkan banner & mempublikasikan Story 'Ry-ITSolutions BUKA HARI INI' ke @unlocksinyalsolo...*");
        try {
            await publishOpenStory();
            await replyWhatsApp(replyJid, "✅ *BERHASIL!*\n\nInstagram Story 'WE ARE OPEN' telah terbit di akun *@unlocksinyalsolo*! 🎉" + BOT_FOOTER);
        } catch (errOpen) {
            await replyWhatsApp(replyJid, `❌ *Gagal posting Story Open:* ${errOpen.message}` + BOT_FOOTER);
        }
        return;
    }

    // Command Khusus: Interaksi Publikasi Testimoni Instagram
    const pendingTesti = pendingTestimonials.get(replyJid);
    if (pendingTesti && (Date.now() - pendingTesti.timestamp < 15 * 60 * 1000)) {
        const items = pendingTesti.items || (pendingTesti.buffer ? [pendingTesti] : []);
        if (items.length === 0) return;

        if (rawCleanText === "1" || rawCleanText === ".1") {
            await replyWhatsApp(replyJid, `⏳ *Sedang merender video 15 detik & mempublikasikan ${items.length} postingan ke Instagram Story (@unlocksinyalsolo)...*\nMohon tunggu sebentar.`);
            try {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    await publishToStory(item.buffer, item.track);
                    if (i < items.length - 1) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                pendingTestimonials.delete(replyJid);
                await replyWhatsApp(replyJid, `✅ *BERHASIL!*\n\nSemua (${items.length}) bukti testimoni telah terbit terpisah di *Instagram Story* *@unlocksinyalsolo* sebagai Video 15 detik dengan musik bersuara nyata! 🔊🎶` + BOT_FOOTER);
            } catch (errStory) {
                await replyWhatsApp(replyJid, `❌ *Gagal posting ke Story:* ${errStory.message}` + BOT_FOOTER);
            }
            return;
        } else if (rawCleanText === "2" || rawCleanText === ".2") {
            await replyWhatsApp(replyJid, `⏳ *Sedang mempublikasikan ${items.length} postingan ke Instagram Feed satu per satu (@unlocksinyalsolo)...*\nMohon tunggu sebentar.`);
            try {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    await publishToFeed(item.buffer, item.caption, item.track);
                    if (i < items.length - 1) {
                        await new Promise(r => setTimeout(r, 2500));
                    }
                }
                pendingTestimonials.delete(replyJid);
                await replyWhatsApp(replyJid, `✅ *BERHASIL!*\n\nSemua (${items.length}) bukti testimoni telah terbit terpisah di *Instagram Feed* *@unlocksinyalsolo* masing-masing dengan lagu berbeda! 📸` + BOT_FOOTER);
            } catch (errFeed) {
                await replyWhatsApp(replyJid, `❌ *Gagal posting ke Feed:* ${errFeed.message}` + BOT_FOOTER);
            }
            return;
        } else if (rawCleanText === "3" || rawCleanText === ".3") {
            await replyWhatsApp(replyJid, `⏳ *Sedang mempublikasikan ${items.length} postingan ke Instagram Story & Feed (@unlocksinyalsolo)...*`);
            try {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    await publishToStory(item.buffer, item.track);
                    await new Promise(r => setTimeout(r, 1500));
                    await publishToFeed(item.buffer, item.caption, item.track);
                    if (i < items.length - 1) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                pendingTestimonials.delete(replyJid);
                await replyWhatsApp(replyJid, `✅ *BERHASIL!*\n\nSemua (${items.length}) postingan telah terbit di *Story & Feed Instagram* *@unlocksinyalsolo*! 🎉` + BOT_FOOTER);
            } catch (errBoth) {
                await replyWhatsApp(replyJid, `❌ *Gagal posting:* ${errBoth.message}` + BOT_FOOTER);
            }
            return;
        } else if (rawCleanText === "0" || rawCleanText === ".0" || rawCleanText === "batal") {
            pendingTestimonials.delete(replyJid);
            await replyWhatsApp(replyJid, "🚫 *Publikasi testimoni ke Instagram telah dibatalkan.*" + BOT_FOOTER);
            return;
        }
    }

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
        const match = quotedText.match(/Order ID:\s*[\`\*#]*\s*[\`\*#]*([a-zA-Z0-9_\-]+)/i) ||
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
        await replyWhatsApp(replyJid, `*ENKRIPSI DIPERBARUI*\n\nBerhasil membersihkan ${cleaned} sesi kontak lama.\nKunci Signal telah disinkronkan ulang tanpa perlu logout.` + BOT_FOOTER);
        return;
    }

    if (command === ".bantuan" || command === ".help" || command === ".menu") {
        const helpMsg = `*PANDUAN PERINTAH BOT ADMIN Ry-ITSolutions*\n\n` +
            `• *.proses <ID_ORDER>*\n` +
            `  Mengubah status pesanan menjadi PROCESSING.\n\n` +
            `• *.sukses <ID_ORDER> <CATATAN>*\n` +
            `  Menyelesaikan pesanan (status SUCCESS) dan menyimpan catatan.\n\n` +
            `• *.gagal <ID_ORDER> <ALASAN>*\n` +
            `  Membatalkan pesanan (status FAILED) & refund saldo user otomatis.\n\n` +
            `• *.status <ID_ORDER>*\n` +
            `  Mengecek status & rincian pesanan saat ini.` +
            BOT_FOOTER;
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

        const reply = `*STATUS ORDER DIPERBARUI*\n\n` +
            `• *Order ID:* \`${trx.id}\`\n` +
            `• *User:* ${trx.userName || "User"}\n` +
            `• *Layanan:* ${trx.packageName}\n` +
            `• *IMEI:* \`${trx.imei}\`\n` +
            `• *Status Baru:* *PROCESSING (Diproses)*\n` +
            (customNote ? `• *Catatan:* ${customNote}\n` : "") +
            `\nSelesaikan: Balas pesan ini ketik *2* atau *.sukses*` +
            BOT_FOOTER;
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
        const reply = `*PESANAN SELESAI (SUCCESS)*\n\n` +
            `• *Order ID:* \`${trx.id}\`\n` +
            `• *User:* ${trx.userName || "User"}\n` +
            `• *Layanan:* ${trx.packageName}\n` +
            (trx.imei ? `• *IMEI:* \`${trx.imei}\`\n` : "") +
            (warranty?.durationLabel ? `• *Masa Aktif / Garansi:* ${warranty.durationLabel}\n` : "") +
            `• *Nominal:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `• *Status:* SUCCESS\n` +
            `• *Catatan:* ${finalNote}` +
            BOT_FOOTER;
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

        const reply = `*PESANAN DITOLAK / GAGAL (FAILED)*\n\n` +
            `• *Order ID:* \`${trx.id}\`\n` +
            `• *User:* ${trx.userName || "User"}\n` +
            `• *Layanan:* ${trx.packageName}\n` +
            `• *IMEI:* \`${trx.imei}\`\n` +
            `• *Status:* *FAILED*\n` +
            `• *Alasan:* ${failReason}\n` +
            `• *Refund:* ${refundNote}` +
            BOT_FOOTER;
        await replyWhatsApp(replyJid, reply);

        await notifyCustomerOnStatusChange({ ...trx, updatedAt: nowIsoFail }, 'failed', `${failReason}. ${refundNote}`);
        return;
    }

    // 4. Command .status
    if (command === ".status") {
        const reply = `*INFORMASI STATUS PESANAN*\n\n` +
            `• *Order ID:* \`${trx.id}\`\n` +
            `• *User:* ${trx.userName || "User"}\n` +
            `• *Layanan:* ${trx.packageName}\n` +
            `• *IMEI:* \`${trx.imei}\`\n` +
            `• *Harga:* Rp ${(trx.platformFee || trx.originalPrice || 0).toLocaleString("id-ID")}\n` +
            `• *Status:* *(${(trx.status || "PENDING").toUpperCase()})*\n` +
            `• *Catatan:* ${trx.admin_note || "-"}\n` +
            `• *Waktu:* ${new Date(trx.createdAt).toLocaleString("id-ID")}` +
            BOT_FOOTER;
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
    const myPhone = getBotPhoneNumber();

    if (finalJid && !finalJid.includes("@g.us") && !finalJid.includes("@lid")) {
        const rawNumber = finalJid.split("@")[0].split(":")[0];
        const clean = cleanPhone(rawNumber);
        if (clean && myPhone && clean === myPhone) {
            console.log(`[WABot] sendAndStoreMessage: Menolak pengiriman ke nomor bot sendiri (${clean}) untuk mencegah self-chat & 'Menunggu pesan ini'.`);
            return null;
        } else if (clean && clean.length >= 8) {
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

    // Standard options (JANGAN inject custom non-standard messageId agar tidak memicu 'Menunggu pesan ini')
    const sendOpts = { ...options };

    // Explicitly sync prekeys & presence with contact to prevent 'Menunggu pesan ini'
    try {
        if (sock.onWhatsApp && !finalJid.includes("@g.us") && !finalJid.includes("@lid")) {
            const rawNumber = finalJid.split("@")[0].split(":")[0];
            await sock.onWhatsApp(rawNumber).catch(() => {});
        }
        if (sock.presenceSubscribe) {
            await sock.presenceSubscribe(finalJid).catch(() => {});
        }
    } catch (e) {}

    try {
        const sent = await sock.sendMessage(finalJid, finalContent, sendOpts);
        const actualId = sent?.key?.id;
        if (actualId) {
            botSentMsgIds.add(actualId);
            await storeMessage(actualId, finalJid, sent.message || finalContent);
        }
        const textBody = finalContent.text || finalContent.caption || (finalContent.image ? "[Foto]" : "[Pesan]");
        await recordChatMessage(actualId || `MSG_${Date.now()}`, finalJid, "Admin", 1, textBody, finalContent.image ? 'image' : 'text', Date.now());
        return sent;
    } catch (sendErr) {
        // Self-healing: if session ratchet error occurs, purge stale session for this contact & retry once
        const targetNumber = cleanPhone(finalJid.split("@")[0].split(":")[0]);
        if (targetNumber && targetNumber.length >= 8 && fs.existsSync(SESSIONS_DIR)) {
            try {
                const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith(`session-${targetNumber}`));
                if (files.length > 0) {
                    console.warn(`[WABot] Purging stale sessions for ${targetNumber} due to send error: ${sendErr.message}`);
                    files.forEach(f => {
                        try { fs.unlinkSync(path.join(SESSIONS_DIR, f)); } catch (e) {}
                    });
                    const retried = await sock.sendMessage(finalJid, finalContent, sendOpts);
                    if (retried?.key?.id) {
                        await storeMessage(retried.key.id, finalJid, retried.message || finalContent);
                    }
                    return retried;
                }
            } catch (eRetry) {
                console.warn(`[WABot] Retry send after session purge failed for ${finalJid}: ${eRetry.message}`);
            }
        }
        throw sendErr;
    }
}

function purgePeerSession(phone) {
    const rawNumber = cleanPhone(phone);
    if (!rawNumber || rawNumber.length < 8) return 0;
    try {
        if (!fs.existsSync(SESSIONS_DIR)) return 0;
        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith(`session-${rawNumber}`));
        let removed = 0;
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(SESSIONS_DIR, file));
                removed++;
            } catch (e) {}
        }
        if (removed > 0) {
            logWABot(`[WABot] Purged ${removed} stale session file(s) for ${rawNumber} to ensure clean Signal prekey exchange`, "info");
        }
        return removed;
    } catch (e) {
        return 0;
    }
}

/**
 * Send WhatsApp text message
 */
async function sendTextMessage(targetPhone, message, options = {}) {
    try {
        const phone = cleanPhone(targetPhone);
        if (!phone) return { status: false, message: "Nomor tujuan tidak valid." };

        const botPhone = getBotPhoneNumber();
        if (botPhone && phone === botPhone) {
            console.log(`[WABot] Lewati pengiriman pesan ke nomor bot sendiri (${phone}) untuk mencegah 'Menunggu pesan ini' / self-chat.`);
            return { status: false, skipped: true, message: "Pengiriman ke nomor bot sendiri dilewati untuk mencegah 'Menunggu pesan ini'." };
        }

        let isConnected = (connectionState === "open" || global.baileysStatus === "open" || Boolean(sock?.user?.id));
        if (!isConnected && sock) {
            for (let i = 0; i < 4; i++) {
                await new Promise(r => setTimeout(r, 500));
                if (connectionState === "open" || global.baileysStatus === "open" || Boolean(sock?.user?.id)) {
                    isConnected = true;
                    break;
                }
            }
        }

        if (!sock || !isConnected) {
            return { status: false, message: "WhatsApp Baileys bot belum terhubung / belum login." };
        }

        if (options && options.forceFreshSession) {
            purgePeerSession(phone);
        }

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
            const clean = cleanPhone(rawPhone);
            const myPhone = getBotPhoneNumber();
            if (clean && myPhone && clean === myPhone) {
                console.log(`[WABot] replyWhatsApp: Menolak membalas ke nomor bot sendiri (${clean}).`);
                return;
            }
            cleanJid = `${clean}@s.whatsapp.net`;
        }
        await sendAndStoreMessage(cleanJid, { text });
    } catch (e) {
        console.error(`[WABot] Gagal mengirim balasan ke ${jid}:`, e.message);
    }
}

/**
 * Helper khusus mengirim pesan media (gambar) balasan ke admin
 */
async function sendAdminMediaReply(jid, mediaPayload) {
    if (!sock || connectionState !== "open") return;
    try {
        let cleanJid = jid;
        if (cleanJid && !cleanJid.includes("@g.us") && !cleanJid.includes("@lid")) {
            const rawPhone = cleanJid.split("@")[0].split(":")[0];
            const clean = cleanPhone(rawPhone);
            cleanJid = `${clean}@s.whatsapp.net`;
        }
        const sent = await sock.sendMessage(cleanJid, mediaPayload);
        if (sent?.key?.id) {
            botSentMsgIds.add(sent.key.id);
        }
    } catch (e) {
        console.error(`[WABot] Gagal mengirim media balasan ke ${jid}:`, e.message);
    }
}

/**
 * Send New Order Notification to Admin with Embedded Command Guides
 * @param {Object} orderData
 */
async function notifyNewOrder(orderData) {
    try {
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
            targetPhone,
            paymentMethod
        } = orderData || {};

        const adminPhones = await getAdminPhoneNumbers(paymentMethod);

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
        const isCeir = serviceType === "ceir" || 
                       serviceType === "barcode" || 
                       (packageName || "").toLowerCase().includes("ceir") || 
                       (packageName || "").toLowerCase().includes("barcode") ||
                       (packageName || "").toLowerCase().includes("cek masa aktif") ||
                       (packageName || "").toLowerCase().includes("beacukai") ||
                       (packageName || "").toLowerCase().includes("cek imei");
        const isAutomated = isCeir;
        let speedDisplay = isAutomated 
            ? "Instant (Otomatis Sistem)" 
            : `${optTitle} (${optName === "slow" ? "1‑12 Jam" : optName === "fast" ? "1‑3 Jam" : "1‑12 Jam"})`;

        let serviceDetailLines = `*Layanan:* ${packageName || "Layanan"}\n`;
        let custProductLines = `• *Layanan:* ${packageName || "Layanan"}\n`;

        if (isGateway) {
            serviceDetailLines += `*Masa Aktif:* 30 Hari (QRIS Otomatis)\n`;
            custProductLines += `• *Masa Aktif:* 30 Hari\n`;
        } else if (isTopUp) {
            serviceDetailLines += `*Metode:* Top Up Deposit Digital\n`;
            custProductLines += `• *Metode:* Top Up Deposit Digital\n`;
        } else if (isCeir) {
            serviceDetailLines += `*IMEI:* \`${imei || "-"}\`\n*Waktu:* Instant (Otomatis Sistem)\n`;
            custProductLines += `• *IMEI:* \`${imei || "-"}\`\n• *Waktu:* Instant (Otomatis Server)\n`;
        } else {
            serviceDetailLines += `*IMEI:* \`${imei || "-"}\`\n*Kecepatan:* ${speedDisplay}\n`;
            custProductLines += `• *IMEI:* \`${imei || "-"}\`\n• *Kecepatan:* ${speedDisplay}\n`;
        }

        let orderStatusCustomer = "Sedang Diproses Admin";
        let orderDescCustomer = "Pesanan Anda sedang dalam antrean pengerjaan oleh tim operasional kami.\nAnda dapat memantau status pengerjaan kapan saja di website: https://ry-itsolutionts.web.id/history";

        if (isCeir) {
            orderStatusCustomer = "⚡ Diproses Otomatis oleh Server";
            orderDescCustomer = "Pesanan pengecekan CEIR Anda sedang diproses secara instan oleh server pusat.\nHasil laporan resmi akan otomatis dikirimkan ke WhatsApp ini dan tersimpan di akun Anda.";
        } else if (isGateway) {
            orderStatusCustomer = "⚡ Aktivasi Otomatis";
            orderDescCustomer = "Langganan API Key Gateway Anda sedang diaktivasi otomatis oleh sistem.";
        } else if (isTopUp) {
            orderStatusCustomer = "Menunggu Verifikasi Deposit";
            orderDescCustomer = "Saldo akan otomatis ditambahkan ke akun Anda setelah pembayaran terkonfirmasi.";
        }

        const shortId = (id || "").slice(-4);
        const photoPath = (userImage || userImageCeir || "").split(",")[0].trim();
        const webProofUrl = photoPath ? `https://ry-itsolutionts.web.id${photoPath.startsWith('/') ? '' : '/'}${photoPath}` : null;
        let proofTextLine = "";
        if (webProofUrl) {
            proofTextLine = `*Bukti Struk/IMEI:* ${webProofUrl}\n`;
        }

        const isManualRoamer = !isCeir && !isGateway && !isTopUp;

        const commandBlock = isManualRoamer ? (
            `*PERINTAH CEPAT PROSES (BALAS PESAN INI):*\n` +
            `• Balas *1* atau *.proses* : Mulai proses\n` +
            `• Balas *2* atau *.sukses* : Selesaikan\n` +
            `• Balas *3* atau *.gagal* : Tolak & refund\n` +
            `_(Manual: \`.proses ${shortId}\` atau \`.sukses ${shortId}\`)_`
        ) : isCeir ? (
            `⚡ *STATUS SISTEM: PROSES OTOMATIS CEIR*\n` +
            `• Pesanan ini diproses langsung secara instan oleh Server Pusat CeirGO.\n` +
            `• Tidak memerlukan pengerjaan manual oleh admin.`
        ) : isGateway ? (
            `⚡ *STATUS SISTEM: AKTIVASI OTOMATIS*\n` +
            `• Akses API Gateway diaktivasi langsung oleh sistem.`
        ) : (
            `⚡ *STATUS SISTEM: TOP UP SALDO*\n` +
            `• Verifikasi otomatis via Payment Gateway.`
        );

        const headerTitle = isCeir 
            ? `*LOG PESANAN CEIR MASUK (OTOMATIS)*\n\n`
            : `*PESANAN BARU MASUK*\n\n`;

        const messageBody = 
            headerTitle +
            `• *Order ID:* \`${id}\`\n` +
            `• *Pelanggan:* ${userName || "Pelanggan"}\n` +
            serviceDetailLines +
            proofTextLine +
            `• *Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n\n` +
            commandBlock +
            BOT_FOOTER;

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
                                `Halo Kak *${userName || "Pelanggan"}*! 👋\n\n` +
                                `Terima kasih telah memesan layanan di *Ry-ITSolutions*.\n\n` +
                                (isCeir ? `🔍 *DETAIL PESANAN CEIR*\n━━━━━━━━━━━━━━━━━━━━━━\n` : "") +
                                custProductLines +
                                `• *Order ID:* #${id}\n` +
                                `• *Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n` +
                                `• *Status:* ${orderStatusCustomer}\n` +
                                (isCeir ? `━━━━━━━━━━━━━━━━━━━━━━\n` : `\n`) +
                                `${orderDescCustomer}\n\n` +
                                `Pantau riwayat: https://ry-itsolutionts.web.id/history\n\n` +
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

        // 1. Send text notification to all admin numbers immediately (instant delivery)
        const myBotNumber = getBotPhoneNumber();
        for (const phone of adminPhones) {
            const cleanAdmin = cleanPhone(phone);
            if (!cleanAdmin || cleanAdmin.length < 8) continue;

            // Hindari mengirim pesan ke nomor bot itu sendiri secara mutlak untuk mencegah "Menunggu pesan ini"
            if (myBotNumber && cleanAdmin === myBotNumber) {
                console.log(`[WABot] Melewati notifikasi pesanan ke nomor bot sendiri (${cleanAdmin}) untuk mencegah 'Menunggu pesan ini'`);
                continue;
            }

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
                    `Halo Kak *${userName || "Pelanggan"}*! 👋\n\n` +
                    `Terima kasih telah memesan layanan di *Ry-ITSolutions*.\n\n` +
                    (isCeir ? `🔍 *DETAIL PESANAN CEIR*\n━━━━━━━━━━━━━━━━━━━━━━\n` : "") +
                    custProductLines +
                    `• *Order ID:* #${id}\n` +
                    `• *Total Biaya:* Rp ${Number(price || 0).toLocaleString("id-ID")}\n` +
                    `• *Status:* ${orderStatusCustomer}\n` +
                    (isCeir ? `━━━━━━━━━━━━━━━━━━━━━━\n` : `\n`) +
                    `${orderDescCustomer}\n\n` +
                    `Pantau riwayat: https://ry-itsolutionts.web.id/history` +
                    BOT_FOOTER;
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
        `*TEST NOTIFIKASI BOT SISTEM RY-ITSOLUTIONS*\n\n` +
        `• *Waktu:* ${timestampWIB} WIB\n` +
        `• *Status:* Enkripsi E2EE Signal Terverifikasi\n` +
        `• *Mode:* Pesan Teks Standar\n\n` +
        `Pesan ini dikirim resmi dari server untuk memastikan bahwa nomor WhatsApp admin menerima notifikasi secara lancar.` +
        BOT_FOOTER
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
        `🚨 *KLAIM GARANSI SINYAL MASUK (PRIORITAS)*\n\n` +
        `Halo Admin, seorang pelanggan baru saja mengajukan klaim garansi karena sinyal perangkatnya terputus/hilang.\n\n` +
        `• *Nomor IMEI:* ${imei}\n` +
        `• *Paket Layanan:* ${packageName || 'Add Roamer'}\n` +
        `• *Status Garansi:* ${warrantyText || 'Garansi Aktif'}\n` +
        `• *Nama Pelanggan:* ${customerName || 'Pelanggan'}\n` +
        `• *WhatsApp Pelanggan:* ${cleanCustPhone || '-'}\n` +
        `• *Kendala:* ${issueDescription || 'Sinyal hilang / Tidak ada layanan'}\n` +
        `• *ID Ref Transaksi:* ${trxId || '-'}\n` +
        `• *ID Tiket Antrean:* #${ticketId || '-'}\n` +
        `• *Waktu Klaim:* ${timestampWIB} WIB\n\n` +
        `*Instruksi Tindakan Admin:*\n` +
        `1. Cek status IMEI di server pusat CeirGO / KMSP.\n` +
        `2. Lakukan tembak ulang sinyal (garansi).\n` +
        `3. Hubungi pembeli jika sinyal sudah aktif kembali:\n` +
        `👉 ${waCustLink}` +
        BOT_FOOTER;

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
 * Notifikasi WhatsApp & Telegram ke Admin saat Pengguna Berhasil Melakukan Pembayaran
 * Menampilkan rincian lengkap: Nama/Kontak Pengguna, Nominal, dan Gateway Pembayaran
 * (GoPay Direct Gateway atau ShopeePay Partner Gateway) serta status giliran rolling berikutnya.
 */
async function notifyPaymentSuccessToAdmin({
    userName = 'Pelanggan',
    userContact = '-',
    amount = 0,
    trxId = '-',
    refTag = '',
    gatewayUsed = 'gopay',
    serviceOrItem = 'Pembayaran Layanan',
    nextGateway = ''
}) {
    const isShopee = String(gatewayUsed || '').toLowerCase().includes('shopee');
    const gatewayDisplayName = isShopee ? 'ShopeePay Gateway (Partner API)' : 'GoPay Gateway (Direct API)';
    const nextGatewayDisplayName = String(nextGateway).toLowerCase().includes('shopee') ? 'ShopeePay Gateway' : 'GoPay Gateway';
    const timestampWIB = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const formattedAmount = Number(amount || 0).toLocaleString('id-ID');

    // 1. Format Pesan WhatsApp Admin
    const waMessage = 
        `💰 *PEMBAYARAN QRIS BERHASIL DITERIMA!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Pengguna:* ${userName}\n` +
        `📞 *Kontak User:* ${userContact}\n` +
        `🏦 *Tujuan Gateway:* *${gatewayDisplayName}*\n` +
        `💵 *Nominal Masuk:* Rp ${formattedAmount}\n` +
        `📦 *Layanan / Jenis:* ${serviceOrItem}\n` +
        `🆔 *ID Invoice:* \`${trxId}\`\n` +
        (refTag ? `🔖 *Ref Transaksi:* \`${refTag}\`\n` : '') +
        (nextGateway ? `🔄 *Rolling Gateway:* Giliran berikutnya ke *${nextGatewayDisplayName}*\n` : '') +
        `⏰ *Waktu:* ${timestampWIB} WIB\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ _Pembayaran telah diverifikasi lunas & saldo/layanan otomatis diteruskan._` +
        BOT_FOOTER;

    // 2. Format Pesan Telegram Admin
    const tgMessage =
        `<b>──────────────────────</b>\n` +
        `💰 <b>PEMBAYARAN QRIS BERHASIL DITERIMA!</b>\n` +
        `<b>──────────────────────</b>\n` +
        `👤 <b>Pengguna:</b> ${userName}\n` +
        `📞 <b>Kontak:</b> <code>${userContact}</code>\n` +
        `🏦 <b>Tujuan Gateway:</b> <b>${gatewayDisplayName}</b>\n` +
        `💵 <b>Nominal Masuk:</b> Rp ${formattedAmount}\n` +
        `📦 <b>Layanan:</b> ${serviceOrItem}\n` +
        `🆔 <b>ID Invoice:</b> <code>${trxId}</code>\n` +
        (refTag ? `🔖 <b>Ref Transaksi:</b> <code>${refTag}</code>\n` : '') +
        (nextGateway ? `🔄 <b>Rolling Gateway:</b> Beralih ke <b>${nextGatewayDisplayName}</b>\n` : '') +
        `⏰ <b>Waktu:</b> ${timestampWIB} WIB\n` +
        `<b>──────────────────────</b>\n` +
        `✅ <i>Status transaksi telah lunas terverifikasi.</i>`;

    const results = { whatsapp: [], telegram: false };

    // Kirim ke WhatsApp Admin
    try {
        const adminPhones = await getAdminPhoneNumbers(gatewayUsed);
        for (const phone of adminPhones) {
            const clean = cleanPhone(phone);
            if (!clean || clean.length < 8) continue;
            const jid = `${clean}@s.whatsapp.net`;
            try {
                const sent = await sendAndStoreMessage(jid, { text: waMessage });
                results.whatsapp.push({ phone: clean, success: true, id: sent?.key?.id });
                console.log(`[WABot PaymentNotif] Notifikasi pembayaran sukses terkirim ke WA Admin ${clean}`);
            } catch (errWa) {
                results.whatsapp.push({ phone: clean, success: false, error: errWa.message });
                console.error(`[WABot PaymentNotif] Gagal kirim WA ke ${clean}:`, errWa.message);
            }
        }
    } catch (e) {
        console.error('[WABot PaymentNotif] Error getting admin phones:', e.message);
    }

    // Kirim ke Telegram Admin
    try {
        const { sendTelegramNotification } = require('../telegramService');
        sendTelegramNotification(tgMessage, 'admin');
        results.telegram = true;
    } catch (e) {
        console.error('[Telegram PaymentNotif] Error sending telegram notification:', e.message);
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
    const orderUrl = `https://ry-itsolutionts.web.id/add-roamer?coupon=${encodeURIComponent(code)}`;

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

function safeParseSpeedPrices(raw) {
    if (!raw) return {};
    try {
        if (typeof raw === 'string') {
            const v = JSON.parse(raw);
            return (v && typeof v === 'object') ? v : {};
        }
        if (typeof raw === 'object') return raw;
    } catch (e) { /* malformed json */ }
    return {};
}

/**
 * Broadcast Price Change Notification to WhatsApp (Admin & Users)
 * Triggered when admin edits IMEI package duration & price.
 */
async function notifyPriceChangeBroadcast({ packages, customMessage, targetMode = 'all', updatedPackage, onlyPhones }) {
    if (!Array.isArray(packages) || packages.length === 0) throw new Error("Data paket tidak valid");

    const speedLabels = { fast: 'Fast', semi: 'Semi', slow: 'Slow' };

    const priceList = packages.map(p => {
        const sp = typeof p.speed_prices === 'string' ? safeParseSpeedPrices(p.speed_prices) : (p.speed_prices || {});
        const allowed = Array.isArray(sp.allowed_speeds) && sp.allowed_speeds.length ? sp.allowed_speeds : ['fast', 'semi', 'slow'];
        const lines = [];
        for (const id of allowed) {
            const raw = sp[id];
            const price = Number(raw);
            if (!price) continue;
            let line = `• *${p.duration} ${speedLabels[id]}:* Rp ${price.toLocaleString('id-ID')}`;
            const ws = sp.wholesale_prices && sp.wholesale_prices[id];
            if (ws && Number(ws) > 0 && Number(ws) < price) {
                const wsQty = sp.wholesale_min_qty || 2;
                line += ` (Grosir ≥${wsQty}: Rp ${Number(ws).toLocaleString('id-ID')})`;
            }
            lines.push(line);
        }
        if (!lines.length) {
            lines.push(`• *${p.duration} Slow:* Rp ${Number(p.price || 0).toLocaleString('id-ID')}`);
        }
        return lines.join('\n');
    }).join('\n');

    const changedName = updatedPackage?.duration || packages[0]?.duration || 'Paket';

    const caption =
`📢 *UPDATE HARGA ADD ROAMER* 📢
━━━━━━━━━━━━━━━━━━━━━━━
Halo kak! Ada pembaruan tarif & harga layanan terbaru di Ry-ITSolutions:

📦 *Rincian Tarif Terbaru:*
${priceList}

━━━━━━━━━━━━━━━━━━━━━━━
💡 *Informasi Tambahan:*
Harga paket Add Roamer telah diperbarui! Nikmati juga diskon otomatis untuk order dengan jumlah tertentu.
${customMessage ? `\n${customMessage}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━
👉 *CEK & PESAN SEKARANG:*
https://ry-itsolutionts.web.id/add-roamer

_Ry-ITSolutions Official Support & Store_`;

    const { generatePriceBanner } = require('./bannerGenerator');
    let imageBuffer = null;
    try {
        imageBuffer = generatePriceBanner({ packages });
    } catch (e) {
        console.warn('[notifyPriceChangeBroadcast] Gagal generate banner:', e.message);
        const bannerPath = path.resolve(__dirname, '../../frontend-v2/public/banners/banner_imei.jpg');
        if (fs.existsSync(bannerPath)) imageBuffer = fs.readFileSync(bannerPath);
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

    const onlySet = Array.isArray(onlyPhones) && onlyPhones.length
        ? new Set(onlyPhones.map(cleanPhone).filter(c => c && c.length >= 8))
        : null;

    for (const phone of targetPhones) {
        if (onlySet && !onlySet.has(phone)) continue;
        const jid = `${phone}@s.whatsapp.net`;
        try {
            const sent = await sendAndStoreMessage(jid, payload);
            results.push({ phone, success: true, id: sent?.key?.id });
            sentCount++;
            console.log(`[WABot PriceUpdate] Berhasil kirim update harga ke ${phone}`);
        } catch (err) {
            results.push({ phone, success: false, error: err.message });
            failedCount++;
            console.error(`[WABot PriceUpdate] Gagal kirim update harga ke ${phone}:`, err.message);
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
    let directLink = 'https://ry-itsolutionts.web.id/add-roamer';

    if (pType === 'imei') {
        bannerFileName = 'banner_imei.jpg';
        headerTitle = '📱 *LAYANAN BARU: ADD ROAMER* 📱';
        directLink = product.link || 'https://ry-itsolutionts.web.id/add-roamer';
        
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
    notifyPriceChangeBroadcast,
    notifyNewProductBroadcast,
    getBroadcastRecipients,

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
    purgePeerSession,
    getBotPhoneNumber,
    getAdminPhoneNumbers,
    testAdminNotification,
    notifyPaymentSuccessToAdmin,
    notifyWarrantyClaim,
    recordChatMessage,
    backfillStoreToHistory,
    getStoredMessage,
    normalizeProtoMessage,
    storeMessage
};
