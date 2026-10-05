const { execSync } = require("child_process");

const groupChatId = "-1003970927785";

const bots = {
  budi: "8939470403:AAG1oDuJEnq8clBJvGhHeyFkqA58BZJNGvE",
  dhani: "8240998449:AAGu2QBY1LPXt6tWDZ7Fv8DUWikh7OxBlnE",
  eko: "8891040017:AAHse9r1GZFgaswKsjwca8BGnfSTL5fo9vI",
  rina: "8743231492:AAGl73u_YttssxFRkcnXyMoAlR2C058himg",
  riko: "8883320815:AAFjkc8stNoKfXMXMkf8g_hEeZjU9dtBWaQ",
  siti: "8790521044:AAHHUFx4e15UbPH1om6qZUPFg8wlwgFPKeQ",
  irfan: "8386486716:AAG6Vp0IMXbRPqkz05GIuVY6iFxgL2ACG2Q",
  doni: "8502485243:AAFpnCBFErtpNoN4HXI2jR9ar-lNikP7QN4",
  fikri: "7907116807:AAHnoBMcbxrGIubHHIOrjO7L9DjIalB6iRw"
};

function send(role, text) {
  const token = bots[role];
  if (!token) return;
  try {
    const payload = JSON.stringify({ chat_id: groupChatId, text, parse_mode: "HTML" });
    execSync(`curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" -H "Content-Type: application/json" -d ${JSON.stringify(payload)}`, { timeout: 10000 });
  } catch (e) {
    console.error(`[SEND ERROR ${role}]`, e.message);
  }
}

function checkPort(port) {
  try {
    const c = execSync(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${port}`, { timeout: 3000 }).toString().trim();
    return c === "200" || c === "302" || c === "404";
  } catch { return false; }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const scenarios = [
  // Scenario 1: Standup pagi & debat frontend vs backend
  async () => {
    send("budi", "Pagi semua! Standup dimulai. Dhani, update progress frontend kemarin apa aja?");
    await delay(8000);
    send("dhani", "Pagi mas Budi. Kemarin saya patch InvoiceModal biar nggak crash pas user klik Cetak Nota. Masalahnya format tanggal SQLite nggak ISO-standard.");
    await delay(10000);
    send("eko", "Dhani, bukannya itu tanggung jawab backend ya? Harusnya saya yang normalize format tanggal sebelum kirim ke frontend.");
    await delay(9000);
    send("dhani", "Idealnya sih iya Eko. Tapi kalau nunggu kamu patch backend, user udah keburu kena error. Jadi saya tambahin safety net dulu di frontend.");
    await delay(7000);
    send("eko", "Hmm, fair point. Oke nanti saya juga normalize di backend biar konsisten dari sumber.");
    await delay(8000);
    send("rina", "Dari sisi QA, defense di dua layer itu malah lebih bagus. Double protection buat user.");
    await delay(6000);
    send("siti", "Setuju sama Rina. Dan dari sisi UX, yang penting user nggak pernah liat error page lagi.");
    await delay(5000);
    send("budi", "Bagus diskusinya. Eko, tambahin normalisasi tanggal di response API. Deadline hari ini jam 22.00 WIB.");
  },

  // Scenario 2: Riko nemuin bug, tim debat solusinya
  async () => {
    send("riko", "Tim, URGENT! Saya nemuin sesuatu. Di /history, kalau user punya transaksi dengan status kosong (empty string), transaksinya nggak muncul di tab manapun. Kayak hilang.");
    await delay(9000);
    send("dhani", "Wah serius Riko? Status empty string? Itu datanya dari mana?");
    await delay(7000);
    send("eko", "Mungkin dari transaksi lama yang belum ada status field-nya. Waktu migration dulu kayaknya ada yang ke-skip.");
    await delay(8000);
    send("riko", "Betul Eko. Saya cek di database ada 3 transaksi lama yang statusnya NULL. Frontend treat NULL jadi empty string.");
    await delay(7000);
    send("rina", "Ini bug valid. Dhani, tambahin fallback di filter: kalau status kosong masukkin ke tab Semua aja.");
    await delay(8000);
    send("siti", "Dari sisi UX, mending tambahin visual indicator juga buat transaksi yang statusnya nggak jelas. Biar user nggak bingung.");
    await delay(6000);
    send("dhani", "Oke noted. Good catch Riko! Saya handle sekarang.");
    await delay(5000);
    send("doni", "Sebagai user biasa, saya pernah bingung kok transaksi saya kayak ilang. Ternyata ini ya penyebabnya.");
    await delay(5000);
    send("budi", "Nice teamwork semua. Riko memang mata elang kita. Dhani eksekusi, Rina verifikasi ya.");
  },

  // Scenario 3: Health check server & banter ringan
  async () => {
    const fe = checkPort(3005);
    const be = checkPort(3001);
    send("eko", `Laporan health check server:\n- Frontend port 3005: ${fe ? "ONLINE" : "DOWN"}\n- Backend port 3001: ${be ? "ONLINE" : "DOWN"}\n- RAM usage STB masih aman di bawah 80%.`);
    await delay(8000);
    send("riko", "Eko, gateway port 3002 gimana? Jangan lupa dicek.");
    await delay(6000);
    send("eko", "Oh iya, bentar... Port 3002 juga online kok. Tenang Riko, nggak ada yang kelewat.");
    await delay(7000);
    send("irfan", "Dari sisi security, SSL/TLS Cloudflare Tunnel masih valid. Rate limiter aktif, nggak ada suspicious request terpantau.");
    await delay(8000);
    send("rina", "Saya confirm, semua endpoint responsif. Latency di bawah 3 detik.");
    await delay(6000);
    send("dhani", "Frontend juga nggak ada error di console. Clean.");
    await delay(5000);
    send("fikri", "Btw tim, kalau server STB-nya cuma 930MB RAM tapi bisa handle semua ini, berarti arsitektur kita udah efisien banget dong?");
    await delay(6000);
    send("budi", "Betul Fikri. Server kecil-kecil cabe rawit. Good job semua!");
  },

  // Scenario 4: Drama - Siti vs Dhani soal desain
  async () => {
    send("siti", "Dhani, saya perhatiin SuccessModal di Desktop kok masih kurang lebar ya? Di HP udah bagus tapi di layar besar agak kecil.");
    await delay(8000);
    send("dhani", "Siti, itu udah saya set max-width 480px. Kalau lebih lebar nanti proporsinya aneh di mobile.");
    await delay(9000);
    send("siti", "Tapi ini kan responsive design. Bisa pake media query, di desktop lebarkan jadi 560px, di mobile tetap 480px.");
    await delay(8000);
    send("dhani", "Hmm, bisa sih. Tapi nanti nambah complexity CSS-nya.");
    await delay(7000);
    send("rina", "Dari sisi testing, saya setuju sama Siti. Desktop user juga banyak, jadi UX mereka nggak boleh dikompromiin.");
    await delay(6000);
    send("doni", "Sebagai user, saya akses dari laptop. Modal yang agak kecil di layar besar itu emang kurang nyaman sih.");
    await delay(7000);
    send("dhani", "Oke oke, saya kalah suara haha. Siti, bikinin mockup-nya ya, nanti saya implementasi.");
    await delay(5000);
    send("siti", "Siap Dhani! Makasih ya, ini buat kebaikan user kok.");
    await delay(4000);
    send("budi", "Nah gitu dong. Debat sehat, hasilnya produk makin bagus. Saya suka!");
  },

  // Scenario 5: Fikri pitch ide & tim diskusi
  async () => {
    send("fikri", "Tim, saya ada ide baru nih. Gimana kalau kita tambahin fitur Notifikasi Pengingat Masa Aktif Sinyal? Jadi 3 hari sebelum garansi habis, user dapat WA otomatis.");
    await delay(9000);
    send("budi", "Ide menarik Fikri. Eko, dari sisi backend bisa di-handle?");
    await delay(7000);
    send("eko", "Bisa mas Budi. Tinggal bikin cron job yang query transaksi dengan garansi mendekati expired, terus trigger WA Bot.");
    await delay(8000);
    send("irfan", "Dari sisi security, pastiin WA Bot nggak nge-spam. Harus ada rate limit dan opt-out option buat user.");
    await delay(7000);
    send("doni", "Sebagai customer, fitur ini berguna banget! Saya pernah lupa perpanjang garansi gara-gara nggak ada reminder.");
    await delay(6000);
    send("siti", "Untuk notifikasi WA-nya, desainnya harus clean dan informatif. Jangan terlalu panjang.");
    await delay(7000);
    send("dhani", "Kalau butuh halaman baru di frontend buat manage reminder setting, saya bisa bikinin.");
    await delay(6000);
    send("rina", "Saya siap test flow-nya end-to-end nanti.");
    await delay(5000);
    send("budi", "Oke, ide ini saya masukkan ke roadmap Sprint berikutnya. Fikri, bikinin dokumen requirement-nya ya. Deadline besok.");
    await delay(4000);
    send("fikri", "Siap mas Budi!");
  },

  // Scenario 6: Night shift casual & motivasi
  async () => {
    send("eko", "Eh tim, udah malem nih masih pada aktif aja ya.");
    await delay(7000);
    send("dhani", "Namanya juga tim 24/7 Eko. Kita kan nggak kenal waktu.");
    await delay(6000);
    send("riko", "Bug juga nggak kenal waktu. Makanya kita harus standby terus.");
    await delay(5000);
    send("rina", "Lebay kamu Riko haha. Tapi bener sih.");
    await delay(6000);
    send("siti", "Yang penting kerjaan beres dan mas Ryan puas sama hasilnya.");
    await delay(5000);
    send("doni", "Dari sisi user, saya appreciate banget tim yang responsif kayak gini.");
    await delay(6000);
    send("irfan", "Saya juga tetap pantau. Nggak ada aktivitas mencurigakan malam ini. Aman.");
    await delay(5000);
    send("fikri", "Sambil nunggu, saya udah mulai draft requirement buat fitur reminder garansi nih.");
    await delay(6000);
    send("budi", "Mantap semuanya! Mas Ryan pasti seneng liat kita solid kayak gini. Lanjut pantau ya!");
  }
];

let scenarioIndex = 0;

async function runScenario() {
  try {
    await scenarios[scenarioIndex]();
    scenarioIndex = (scenarioIndex + 1) % scenarios.length;
  } catch (e) {
    console.error("Scenario error:", e.message);
  }
}

// Run a conversation scenario every 3 minutes
setInterval(runScenario, 3 * 60 * 1000);

// Start first scenario after 5 seconds
setTimeout(runScenario, 5000);

// =====================================================
// 2-WAY INTERACTIVE: Owner (mas Ryan) bisa chat di grup
// Poll semua bot untuk pesan masuk dari grup
// =====================================================
let lastUpdateIds = {};
const processedMessageIds = new Set();

function pollUpdates(roleKey) {
  const token = bots[roleKey];
  if (!token) return;
  const offset = lastUpdateIds[roleKey] || 0;
  try {
    const res = execSync(`curl -s "https://api.telegram.org/bot${token}/getUpdates?offset=${offset + 1}&timeout=2"`, { timeout: 5000 }).toString();
    const data = JSON.parse(res);
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateIds[roleKey] = update.update_id;
        const msg = update.message;
        if (!msg || !msg.text) continue;
        // Ignore messages from bots themselves
        if (msg.from && msg.from.is_bot) continue;
        // Only respond to messages in the group
        if (String(msg.chat.id) !== groupChatId) continue;
        // DEDUP: Only process each message_id once across all bots
        const msgId = String(msg.message_id);
        if (processedMessageIds.has(msgId)) continue;
        processedMessageIds.add(msgId);
        // Keep set small: remove old entries after 200
        if (processedMessageIds.size > 200) {
          const iter = processedMessageIds.values();
          for (let i = 0; i < 100; i++) processedMessageIds.delete(iter.next().value);
        }
        handleOwnerMessage(msg.text);
      }
    }
  } catch (e) {
    // Ignore polling errors
  }
}

function handleOwnerMessage(text) {
  const lower = text.toLowerCase();

  // Owner menyapa semua tim
  if (lower.includes("semua") || lower.includes("tim") || lower.includes("halo") || lower.includes("assalamualaikum") || lower.includes("selamat")) {
    setTimeout(() => send("budi", `Siap mas Ryan! Seluruh tim (9 anggota) hadir dan siap menerima perintah. Ada yang bisa kami bantu?`), 2000);
    setTimeout(() => send("dhani", `Halo mas Ryan! Dhani (Frontend) siap menerima instruksi.`), 5000);
    setTimeout(() => send("eko", `Halo mas Ryan! Eko (Backend) standby.`), 8000);
    setTimeout(() => send("rina", `Halo mas Ryan! Rina (QA) siap testing.`), 11000);
    setTimeout(() => send("riko", `Halo mas Ryan! Riko (Bug Hunter) on patrol.`), 14000);
    setTimeout(() => send("siti", `Halo mas Ryan! Siti (UI/UX) siap desain.`), 17000);
    setTimeout(() => send("irfan", `Halo mas Ryan! Irfan (CyberSec) monitoring keamanan.`), 20000);
    setTimeout(() => send("doni", `Halo mas Ryan! Doni (User Experience) standby.`), 23000);
    setTimeout(() => send("fikri", `Halo mas Ryan! Fikri (Ideator) siap brainstorming.`), 26000);
    return;
  }

  // Owner panggil Budi / PM
  if (lower.includes("budi") || lower.includes("manager") || lower.includes("pm")) {
    setTimeout(() => {
      send("budi", `Siap mas Ryan! Saya Budi (Project Manager). Pesan Anda: "${text}"\n\nSaya akan koordinasikan dengan tim terkait dan update progressnya di sini.`);
    }, 2000);
    setTimeout(() => send("budi", `Tim, mas Ryan baru kasih instruksi. Tolong yang terkait segera eksekusi ya.`), 8000);
    return;
  }

  // Owner panggil Dhani / Frontend
  if (lower.includes("dhani") || lower.includes("frontend") || lower.includes("tampilan") || lower.includes("nota") || lower.includes("modal")) {
    const is3005 = checkPort(3005);
    setTimeout(() => {
      send("dhani", `Siap mas Ryan! Saya Dhani (Frontend Lead).\n\nFrontend port 3005: ${is3005 ? "ONLINE & RESPONSIF" : "SEDANG RESTART"}.\n\nPesan Anda: "${text}"\nSaya akan segera kerjakan dan update progressnya di sini.`);
    }, 2000);
    return;
  }

  // Owner panggil Eko / Backend
  if (lower.includes("eko") || lower.includes("backend") || lower.includes("server") || lower.includes("database") || lower.includes("api")) {
    const is3001 = checkPort(3001);
    setTimeout(() => {
      send("eko", `Siap mas Ryan! Saya Eko (Backend Lead).\n\nBackend port 3001: ${is3001 ? "ONLINE" : "ATTENTION"}.\n\nPesan Anda: "${text}"\nSaya kerjakan sekarang.`);
    }, 2000);
    return;
  }

  // Owner panggil Rina / QA
  if (lower.includes("rina") || lower.includes("qa") || lower.includes("test") || lower.includes("testing")) {
    setTimeout(() => {
      send("rina", `Siap mas Ryan! Saya Rina (QA Tester).\n\nPesan Anda: "${text}"\nSaya akan langsung testing dan laporkan hasilnya di sini.`);
    }, 2000);
    return;
  }

  // Owner panggil Riko / Bug Hunter
  if (lower.includes("riko") || lower.includes("bug") || lower.includes("hunter") || lower.includes("error") || lower.includes("crash")) {
    setTimeout(() => {
      send("riko", `Siap mas Ryan! Saya Riko (Bug Hunter).\n\nPesan Anda: "${text}"\nSaya cek sekarang dan laporkan temuan di sini.\n\nCatatan: Seluruh pengujian CEIRGO menggunakan SIMULASI MOCK, saldo API Ceirgo AMAN!`);
    }, 2000);
    return;
  }

  // Owner panggil Siti / UI/UX
  if (lower.includes("siti") || lower.includes("design") || lower.includes("desain") || lower.includes("ui") || lower.includes("ux")) {
    setTimeout(() => {
      send("siti", `Siap mas Ryan! Saya Siti (UI/UX Designer).\n\nPesan Anda: "${text}"\nSaya buatkan mockup dan rancangan desainnya.`);
    }, 2000);
    return;
  }

  // Owner panggil Irfan / Security
  if (lower.includes("irfan") || lower.includes("security") || lower.includes("keamanan") || lower.includes("aman") || lower.includes("hack")) {
    setTimeout(() => {
      send("irfan", `Siap mas Ryan! Saya Irfan (Cybersecurity).\n\nPesan Anda: "${text}"\nSaya audit keamanannya sekarang.`);
    }, 2000);
    return;
  }

  // Owner panggil Doni / User
  if (lower.includes("doni") || lower.includes("user") || lower.includes("customer") || lower.includes("pembeli")) {
    setTimeout(() => {
      send("doni", `Siap mas Ryan! Saya Doni (Customer Experience).\n\nPesan Anda: "${text}"\nSaya coba simulasi dari sisi pembeli sekarang.`);
    }, 2000);
    return;
  }

  // Owner panggil Fikri / Ideator
  if (lower.includes("fikri") || lower.includes("ide") || lower.includes("fitur") || lower.includes("ideator")) {
    setTimeout(() => {
      send("fikri", `Siap mas Ryan! Saya Fikri (Product Ideator).\n\nPesan Anda: "${text}"\nSaya brainstorming dan buatkan proposal idenya.`);
    }, 2000);
    return;
  }

  // Pesan umum tanpa sebut nama -> Budi (PM) sebagai koordinator merespon
  setTimeout(() => {
    send("budi", `Siap mas Ryan! Pesan Anda: "${text}"\n\nSaya Budi (PM) akan koordinasikan ke tim terkait.`);
  }, 2000);
  setTimeout(() => {
    // Budi forward ke tim
    send("budi", `Tim, mas Ryan baru kasih pesan: "${text}"\nTolong yang terkait segera action ya. Update progress di sini.`);
  }, 7000);
}

// Poll all bots for incoming owner messages every 3 seconds
setInterval(() => {
  Object.keys(bots).forEach(role => pollUpdates(role));
}, 3 * 1000);

console.log("Full 9-Bot Realistic Team Chat Server Started (with 2-Way Owner Interaction).");
