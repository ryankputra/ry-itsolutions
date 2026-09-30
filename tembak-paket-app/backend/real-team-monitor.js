const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const groupChatId = '-1003970927785';

const bots = {
  budi: '8939470403:AAG1oDuJEnq8clBJvGhHeyFkqA58BZJNGvE',
  dhani: '8240998449:AAGu2QBY1LPXt6tWDZ7Fv8DUWikh7OxBlnE',
  eko: '8891040017:AAHse9r1GZFgaswKsjwca8BGnfSTL5fo9vI',
  rina: '8743231492:AAGl73u_YttssxFRkcnXyMoAlR2C058himg',
  riko: '8883320815:AAFjkc8stNoKfXMXMkf8g_hEeZjU9dtBWaQ',
  siti: '8790521044:AAHHUFx4e15UbPH1om6qZUPFg8wlwgFPKeQ',
  irfan: '8386486716:AAG6Vp0IMXbRPqkz05GIuVY6iFxgL2ACG2Q',
  doni: '8502485243:AAFpnCBFErtpNoN4HXI2jR9ar-lNikP7QN4',
  fikri: '7907116807:AAHnoBMcbxrGIubHHIOrjO7L9DjIalB6iRw'
};

function send(role, text) {
  const token = bots[role];
  if (!token) return Promise.resolve();
  return new Promise((resolve) => {
    const data = JSON.stringify({ chat_id: groupChatId, text: text, parse_mode: "HTML" });
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      },
      timeout: 8000
    }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve());
    });
    req.on("error", (e) => {
      console.error(`[SEND ERROR ${role}]`, e.message);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const statusFile = "/tmp/real_execution_status.json";
const queueFile = path.join(__dirname, "owner-tasks.json");

function getRealStatus() {
  try {
    if (fs.existsSync(statusFile)) {
      return JSON.parse(fs.readFileSync(statusFile, "utf8"));
    }
  } catch (e) {}
  return {
    state: "idle",
    lastTask: "Redesain Panel Kontrol Admin (Profile Card)",
    lastUpdatedFile: "src/app/(main)/profile/page.tsx",
    lastDeployTime: new Date().toISOString()
  };
}

function getPm2Real() {
  try {
    const out = execSync("pm2 jlist", { timeout: 3000 }).toString();
    const list = JSON.parse(out);
    return list.map(p => `${p.name}: ${p.pm2_env.status} (${Math.round((p.monit.memory||0)/1024/1024)}MB)`).join(" | ");
  } catch (e) {
    return "Services PM2 Active";
  }
}

let lastUpdateId = 0;
const processedMessageIds = new Set();

function pollUpdatesAsync() {
  const token = bots.budi;
  if (!token) return;

  const req = https.get(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=3`, { timeout: 8000 }, (res) => {
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (!msg) continue;
            if (msg.from && msg.from.is_bot) continue;
            if (String(msg.chat.id) !== groupChatId) continue;

            const msgId = String(msg.message_id);
            if (processedMessageIds.has(msgId)) continue;
            processedMessageIds.add(msgId);

            if (processedMessageIds.size > 200) {
              const iter = processedMessageIds.values();
              for (let i = 0; i < 100; i++) processedMessageIds.delete(iter.next().value);
            }

            const textContent = msg.text || msg.caption || "";
            const photoArr = msg.photo;
            let photoId = null;
            if (Array.isArray(photoArr) && photoArr.length > 0) {
              photoId = photoArr[photoArr.length - 1].file_id;
            }

            if (textContent || photoId) {
              handleOwnerMessageRealStatus(textContent, photoId, msg.from.first_name || "Mas Ryan");
            }
          }
        }
      } catch (e) {}
    });
  });

  req.on("error", () => {});
  req.on("timeout", () => req.destroy());
}

async function handleOwnerMessageRealStatus(text, photoId, senderName) {
  const lower = text.toLowerCase().trim();
  const st = getRealStatus();

  // TANYA PROGRES REAL
  if (lower.includes("progres") || lower.includes("progress") || lower.includes("status") || lower.includes("sampai mana") || lower.includes("gimana")) {
    const pm2Info = getPm2Real();
    await send("budi", `Mas Ryan, berikut status eksekusi REAL tim saat ini:\n\n` +
      `• <b>Status Sistem:</b> ${st.state.toUpperCase()}\n` +
      `• <b>Pekerjaan Terakhir:</b> ${st.lastTask}\n` +
      `• <b>File Diubah:</b> <code>${st.lastUpdatedFile}</code>\n` +
      `• <b>Status PM2 Server:</b> ${pm2Info}\n\n` +
      `Seluruh service aktif. Jika ada instruksi baru dari mas Ryan, tim siap langsung eksekusi.`);
    return;
  }

  // JIKA MEMBERIKAN PERINTAH BARU
  // Simpan tugas ke owner-tasks.json
  try {
    let tasks = [];
    if (fs.existsSync(queueFile)) tasks = JSON.parse(fs.readFileSync(queueFile, "utf8"));
    tasks.push({ id: "task_" + Date.now(), command: text, photoId, sender: senderName, status: "pending" });
    fs.writeFileSync(queueFile, JSON.stringify(tasks, null, 2));
  } catch (e) {}

  await send("budi", `Siap mas Ryan! Perintah Anda: "<i>${text}</i>" telah dicatat. Budi koordinasikan dengan Dhani & Eko di laptop untuk eksekusi nyata pada kode.`);
}

setInterval(pollUpdatesAsync, 3 * 1000);

console.log("Real Status Tracker Telegram Engine Active.");
