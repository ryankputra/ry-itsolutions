const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const BOTS_MAP = {
  BUDI: { name: 'BudiProjectManager_bot', role: 'Budi (Project Manager)', token: bots.budi },
  DHANI: { name: 'DhaniFrontend_bot', role: 'Dhani (Frontend Developer)', token: bots.dhani },
  EKO: { name: 'EkoBackend_bot', role: 'Eko (Backend & Infrastructure)', token: bots.eko },
  RINA: { name: 'Rina - QA Tester Specialist_bot', role: 'Rina (QA Tester)', token: bots.rina },
  RIKO: { name: 'RikoBugHunter_bot', role: 'Riko (Bug Hunter Specialist)', token: bots.riko },
  SITI: { name: 'Siti - UI/UX Designer_bot', role: 'Siti (UI/UX Designer)', token: bots.siti },
  IRFAN: { name: 'Irfan - Cybersecurity Specialist_bot', role: 'Irfan (Cybersecurity Specialist)', token: bots.irfan },
  DONI: { name: 'DoniCustomerSimulator_bot', role: 'Doni (Customer Simulator)', token: bots.doni },
  FIKRI: { name: 'FikriProductIdeator_bot', role: 'Fikri (Product Ideator)', token: bots.fikri }
};

const HERMES_CLI = '/Users/ryankptr/.hermes/installs/62de9e8f225c40f0/environments/c0bc2375b3d747f6b1524cd7b800374a/venv/bin/hermes';
const WORKSPACE = '/Users/ryankptr/tembak-paket-app/tembak-paket-app';
const processedUpdates = new Set();
let lastUpdateId = 0;

function sendTelegramMessage(token, chatId, text) {
  if (!token || !text || !text.trim()) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = JSON.stringify({ chat_id: chatId || groupChatId, text: text.trim() });
  
  const req = https.request(url, {
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {});
  });
  req.on('error', (err) => console.error('Telegram Send Error:', err.message));
  req.write(payload);
  req.end();
}

function askHermes(prompt, callback) {
  console.log(`[HERMES AGENT THINKING] Prompt: ${prompt.substring(0, 100)}...`);
  
  execFile(HERMES_CLI, ['-z', prompt], { cwd: WORKSPACE, timeout: 120000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[HERMES CLI ERROR]:', error.message);
      callback(null);
      return;
    }
    const result = stdout.trim();
    console.log(`[HERMES AGENT RESPONSE]: ${result}`);
    callback(result);
  });
}

function pollTelegram() {
  const token = bots.budi;
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;

  https.get(url, { family: 4 }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.ok && Array.isArray(json.result)) {
          for (const update of json.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            if (processedUpdates.has(update.update_id)) continue;
            processedUpdates.add(update.update_id);

            const msg = update.message;
            if (!msg) continue;
            if (msg.from && msg.from.is_bot) continue;

            const text = msg.text || msg.caption;
            if (!text) continue;

            const chatId = msg.chat.id;
            console.log(`\n[TELEGRAM INCOMING from ${msg.from?.first_name || 'Owner'}]: ${text}`);

            const prompt = `Anda adalah Otak Utama (Hermes AI Agent) yang mengendalikan 9 bot Telegram tim dev Ry-ITSolutions (BUDI, DHANI, EKO, SITI, RINA, RIKO, IRFAN, DONI, FIKRI).
Owner (Mas Ryan) mengirimkan pesan berikut di grup Telegram:
"${text}"

Tugas Anda:
1. Analisa pesan Mas Ryan secara mendalam sebagai AI Agent yang cerdas.
2. Hasilkan balasan percakapan tim yang REALISTIS, CERDAS, ORGANIK, dan TANPA TEMPLATE STATIS dalam Bahasa Indonesia.
3. Format output Wajib JSON murni berupa array dari pesan yang dikirim oleh masing-masing bot:
[
  {"bot": "BUDI", "text": "Siap Mas Ryan! Pesan Anda sudah dicatat."},
  {"bot": "DHANI", "text": "Langsung kami cek komponen terkait."}
]

PENTING: Hanya kirimkan array JSON murni tanpa markdown fence backticks dan tanpa teks pembuka/penutup!`;

            askHermes(prompt, (response) => {
              if (!response) return;
              try {
                const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                const messages = JSON.parse(cleanJson);
                if (Array.isArray(messages)) {
                  for (const item of messages) {
                    const botKey = item.bot ? item.bot.toUpperCase() : 'BUDI';
                    const targetBot = BOTS_MAP[botKey] || BOTS_MAP.BUDI;
                    if (targetBot && item.text) {
                      sendTelegramMessage(targetBot.token, chatId, item.text);
                    }
                  }
                } else {
                  sendTelegramMessage(BOTS_MAP.BUDI.token, chatId, response);
                }
              } catch (err) {
                console.error('Failed to parse Hermes response as JSON:', err.message);
                sendTelegramMessage(BOTS_MAP.BUDI.token, chatId, response);
              }
            });
          }
        }
      } catch (e) {
        console.error('Poll parse error:', e.message);
      }
      setTimeout(pollTelegram, 2000);
    });
  }).on('error', (err) => {
    console.error('Poll connection error:', err.message);
    setTimeout(pollTelegram, 5000);
  });
}

console.log('--- HERMES AI AGENT TELEGRAM TEAM ENGINE STARTED ON LAPTOP ---');
pollTelegram();
