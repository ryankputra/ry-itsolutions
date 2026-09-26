const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");

const SESSIONS_DIR = path.join(__dirname, "sessions", "baileys_auth");
const CODE_FILE = path.join(__dirname, "pairing_code.txt");

async function startPairing() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);
    const sock = makeWASocket({
        version: [2, 3000, 1043857760],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        logger: pino({ level: "silent" }),
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n================================================");
            console.log("✅ PAIRING SUCCESSFUL! WHATSAPP BOT IS LINKED!");
            console.log("================================================\n");
            fs.writeFileSync(CODE_FILE, "LINKED_SUCCESS");
            setTimeout(() => process.exit(0), 3000);
        } else if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log("Connection closed status:", statusCode);
        }
    });

    await new Promise(r => setTimeout(r, 3000));
    console.log("Meminta kode pairing 8 digit untuk 6287767287284...");
    const rawCode = await sock.requestPairingCode("6287767287284");
    const code = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
    console.log("\n================================================");
    console.log(`✅ KODE PAIRING 8 DIGIT (AKTIF): ${code}`);
    console.log("================================================\n");
    fs.writeFileSync(CODE_FILE, code);
}

startPairing();
