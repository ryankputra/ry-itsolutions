'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { playPopSound, playDingSound } from '@/lib/soundFx';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: {
    label: string;
    href?: string;
    isExternal?: boolean;
    icon?: string;
  }[];
}

interface LivePackage {
  code: string;
  name: string;
  description: string;
  price: number;
  carrier: string;
  type: string;
  category: string;
}

interface LiveImeiPackage {
  id: string;
  duration: string;
  price: number;
  allowedSpeeds: string[];
}

interface LiveCoupon {
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  maxDiscount: number;
}

interface LiveKnowledge {
  updatedAt: string;
  showBeliPaket?: boolean;
  packages: LivePackage[];
  imeiPackages: LiveImeiPackage[];
  coupons: LiveCoupon[];
  announcements: { id: string; message: string; bgColor?: string; createdAt?: string }[];
  gateway: {
    name: string;
    activationFee: number;
    renewalFee: number;
    transactionFee: number;
    settlement: string;
    features: string[];
  };
  topup: {
    minDeposit: number;
    adminFee: number;
    methods: string;
    speed: string;
  };
  speeds: {
    fast: { status: string; range: string };
    semi: { status: string; range: string };
    slow: { status: string; range: string };
  };
  cs: {
    admin1: string;
    admin2: string;
    hours: string;
  };
}

interface UserAnalyticsData {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    balance: number;
    coins: number;
    memberSince?: string;
  };
  stats: {
    totalSpent: number;
    totalOrders: number;
    successfulOrders: number;
    pendingOrders: number;
    failedOrders: number;
    totalTopup: number;
    topupCount: number;
    recentOrders: {
      id: string;
      name: string;
      amount: number;
      status: string;
      date: string;
    }[];
  };
}

const STORAGE_KEY = 'ry_ai_chat_history_v8';

const QUICK_PROMPTS = [
  { label: '📊 Berapa Pengeluaran Saya?', query: 'Berapa total pengeluaran saya selama ini dan riwayat pesanan saya?' },
  { label: '📦 Total Order Saya', query: 'Berapa total order yang sudah saya lakukan dan berapa yang sukses?' },
  { label: '📡 Kenapa Sinyal HP Hilang?', query: 'Jelaskan kenapa sinyal iPhone atau smartphone luar negeri bisa hilang atau terkena begal?' },
  { label: '📱 Info Buka IMEI (3 Bulan)', query: 'Berapa harga dan ketentuan buka blokir IMEI 3 Bulan?' },
  { label: '⚡ Gateway GoPay & QRIS', query: 'Jelaskan fitur Payment Gateway GoPay & QRIS SaaS serta biaya aktivasinya' },
  { label: '🎟️ Voucher & Promo Aktif', query: 'Apakah ada kode kupon diskon atau voucher promo yang aktif saat ini?' },
  { label: '🔋 Tips Rawat Battery Health', query: 'Bagaimana tips merawat kesehatan baterai (battery health) iPhone agar awet?' },
];

function formatRupiah(val: number): string {
  if (isNaN(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Smart Math & Calculator Evaluator
function tryCalculateMath(rawQuery: string): { expression: string; result: string; details?: string } | null {
  const q = rawQuery.toLowerCase().replace(/,/g, '.');

  // Percentage discount: e.g. "diskon 10% dari 155000" or "potongan 10% dari 150.000"
  const discMatch = q.match(/(?:diskon|potongan|hemat)\s*(\d+(?:\.\d+)?)\s*%\s*(?:dari|of)?\s*(\d+[\d\.]*)/i);
  if (discMatch) {
    const percent = parseFloat(discMatch[1]);
    const amount = parseFloat(discMatch[2].replace(/\./g, ''));
    if (!isNaN(percent) && !isNaN(amount) && amount > 0) {
      const discountVal = (percent / 100) * amount;
      const finalVal = amount - discountVal;
      return {
        expression: `Diskon ${percent}% dari ${formatRupiah(amount)}`,
        result: formatRupiah(finalVal),
        details: `Potongan hemat: **${formatRupiah(discountVal)}** (Harga setelah diskon: **${formatRupiah(finalVal)}**)`
      };
    }
  }

  // Arithmetic matching: e.g. "25000 + 35000", "155.000 - 10.000", "50000 * 3", "155000 x 2", "300000 / 2"
  // Normalize words to operators
  let cleaned = q
    .replace(/(?:berapa|hitung|hasil|total)\s*/gi, '')
    .replace(/\s*tambah\s*/gi, ' + ')
    .replace(/\s*plus\s*/gi, ' + ')
    .replace(/\s*kurang\s*/gi, ' - ')
    .replace(/\s*minus\s*/gi, ' - ')
    .replace(/\s*kali\s*/gi, ' * ')
    .replace(/\s*x\s*/gi, ' * ')
    .replace(/\s*bagi\s*/gi, ' / ')
    .replace(/rp\.?\s*/gi, '')
    .trim();

  // Check if string consists of valid math tokens (digits, dots, operators, parentheses)
  if (/^[0-9\.\s\+\-\*\/\(\)]+$/.test(cleaned) && /[0-9]/.test(cleaned) && /[\+\-\*\/]/.test(cleaned)) {
    try {
      // Normalize dots used as thousand separators vs decimals
      // If dot followed by 3 digits at end or before operator, treat as thousand separator
      const sanitized = cleaned.replace(/\.(?=\d{3}(?:[\s\+\-\*\/\)]|$))/g, '');
      // Evaluate using Function (safe given strict regex validation above)
      const resVal = Function(`'use strict'; return (${sanitized});`)();
      if (typeof resVal === 'number' && !isNaN(resVal) && isFinite(resVal)) {
        return {
          expression: cleaned,
          result: formatRupiah(resVal),
          details: `Angka murni: **${resVal.toLocaleString('id-ID')}**`
        };
      }
    } catch {}
  }

  return null;
}

export default function AiChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Autonomous Live Knowledge from Database
  const [knowledge, setKnowledge] = useState<LiveKnowledge | null>(null);
  const [isKnowledgeReady, setIsKnowledgeReady] = useState(false);

  // Live User Analytics & Spending Data
  const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsData | null>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message
  const getWelcomeMessage = (k?: LiveKnowledge | null, u?: UserAnalyticsData | null): Message => {
    const imei3Bln = k?.imeiPackages?.find((p) => p.duration?.includes('3'))?.price || 155000;
    const activeCoupon = k?.coupons?.[0]?.code ? ` (Promo: \`${k.coupons[0].code}\`)` : '';
    const userName = u?.user?.name ? ` **${u.user.name}**` : '';

    return {
      id: 'welcome_init',
      sender: 'ai',
      text: `Halo${userName}! Saya **Ry-AI**, asisten kecerdasan buatan resmi dari **Ry-ITSolutions**.

Saya dilengkapi kemampuan cerdas dan terhubung langsung ke **database sistem** secara *real-time*. Anda dapat menanyakan apapun kepada saya:

• 📊 **Statistik Akun Anda**: Menghitung total pengeluaran belanja, jumlah order sukses, saldo RyPay, dan poin.
• 📱 **Layanan Unblock IMEI All Operator**: Tarif paket 3 Bulan (mulai ${formatRupiah(imei3Bln)}), cek garansi, dan syarat teknis.
• ⚡ **Payment Gateway GoPay & Dynamic QRIS SaaS**: Biaya aktivasi Rp 35.000, 0% fee, dan integrasi API webhook.
• 💡 **Wawasan Teknologi & Smartphone**: Cara rawat battery health, penyebab sinyal hilang/begal, cek IMEI, dan tips beli HP second.
• 🧮 **Kalkulator Cerdas**: Hitung cepat biaya, diskon promo, atau operasi matematika.
• 🎟️ **Promo & Diskon Aktif**${activeCoupon}

Silakan pilih topik cepat di bawah atau tanyakan apapun yang ingin Anda ketahui!`,
      timestamp: formatTime(new Date()),
      actions: [
        { label: '📊 Cek Pengeluaran Saya', href: '/history' },
        { label: '📱 Layanan IMEI', href: '/unblock-imei' },
        { label: '⚡ Gateway GoPay', href: '/gateway' },
        { label: '💳 Top Up Saldo', href: '/topup' },
      ],
    };
  };

  // 1. Fetch Live Database Knowledge
  useEffect(() => {
    const fetchLiveKnowledge = async () => {
      try {
        const res = await fetch('/api/ai/knowledge', { credentials: 'include' });
        const json = await res.json();
        if (json?.status) {
          setKnowledge(json);
          setIsKnowledgeReady(true);
        }
      } catch (err) {
        console.error('Gagal memuat live knowledge AI:', err);
      }
    };
    fetchLiveKnowledge();
  }, []);

  // 2. Fetch User Analytics & Spending History
  useEffect(() => {
    const fetchUserAnalytics = async () => {
      try {
        const res = await fetch('/api/user/analytics', { credentials: 'include' });
        const json = await res.json();
        if (json?.status && json.isLoggedIn && json.data) {
          setUserAnalytics(json.data);
          setIsUserLoaded(true);
        }
      } catch (err) {
        console.error('Gagal memuat user analytics AI:', err);
      }
    };
    fetchUserAnalytics();
  }, []);

  // 3. Load chat history from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('ry_ai_chat_history');
      localStorage.removeItem('ry_ai_chat_history_v2');
      localStorage.removeItem('ry_ai_chat_history_v3');
      localStorage.removeItem('ry_ai_chat_history_v5');
      localStorage.removeItem('ry_ai_chat_history_v6');
      localStorage.removeItem('ry_ai_chat_history_v7');

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    setMessages([getWelcomeMessage(knowledge, userAnalytics)]);
  }, [knowledge, userAnalytics]);

  // 4. Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // =========================================================================
  // DYNAMIC INTELLIGENCE, USER ANALYTICS, & OUT-OF-CONTEXT QA ENGINE
  // =========================================================================
  const generateAiResponse = (userText: string): { reply: string; actions?: Message['actions'] } => {
    const q = userText.toLowerCase().trim();
    const k = knowledge;
    const ua = userAnalytics;

    // Fallback constants
    const gwActivationFee = k?.gateway?.activationFee || 35000;
    const gwRenewalFee = k?.gateway?.renewalFee || 10000;
    const topupMin = k?.topup?.minDeposit || 10000;
    const csAdmin1 = k?.cs?.admin1 || '088706611370';
    const csAdmin2 = k?.cs?.admin2 || '087767287284';

    // -------------------------------------------------------------
    // 1. SMART MATH & CALCULATION ENGINE
    // -------------------------------------------------------------
    const mathResult = tryCalculateMath(q);
    if (mathResult) {
      return {
        reply: `### 🧮 Hasil Perhitungan Cerdas

• **Perhitungan**: \`${mathResult.expression}\`
• **Hasil**: **${mathResult.result}**
${mathResult.details ? `• **Keterangan**: ${mathResult.details}
` : ''}
*Apakah ada nominal atau estimasi biaya pesanan lainnya yang ingin Anda hitung?*`,
        actions: [
          { label: 'Isi Saldo RyPay', href: '/topup' },
          { label: 'Layanan Unblock IMEI', href: '/unblock-imei' },
        ],
      };
    }

    // -------------------------------------------------------------
    // 2. USER ANALYTICS: PENGELUARAN, TOTAL ORDER & DATA PENGGUNA
    // -------------------------------------------------------------
    const isSpendingQuery = q.includes('pengeluaran') || q.includes('total belanja') || q.includes('habis berapa') || q.includes('biaya belanja') || q.includes('uang keluar') || q.includes('riwayat belanja');
    const isOrderQuery = q.includes('total order') || q.includes('berapa order') || q.includes('berapa kali order') || q.includes('pesanan saya') || q.includes('order saya') || q.includes('transaksi saya');
    const isUserAccountQuery = q.includes('saldo saya') || q.includes('sisa saldo') || q.includes('koin saya') || q.includes('poin saya') || q.includes('akun saya') || q.includes('profil saya');
    const isRecentTrxQuery = q.includes('transaksi terakhir') || q.includes('order terakhir') || q.includes('pesanan terakhir');

    if (isSpendingQuery || isOrderQuery || isUserAccountQuery || isRecentTrxQuery) {
      if (!ua || !ua.user) {
        return {
          reply: `### 🔒 Akses Riwayat Pengeluaran & Pesanan

Untuk menghitung total pengeluaran, jumlah order yang berhasil, serta status saldo Anda secara otomatis, Anda perlu **login** terlebih dahulu ke akun Ry-ITSolutions.

Setelah login, saya dapat langsung menganalisis seluruh data transaksi Anda secara real-time!`,
          actions: [
            { label: 'Login ke Akun', href: '/login' },
            { label: 'Daftar Akun Baru', href: '/register' },
          ],
        };
      }

      const u = ua.user;
      const s = ua.stats;
      const recentList = s.recentOrders && s.recentOrders.length > 0
        ? s.recentOrders.map((ro, i) => `${i + 1}. **${ro.name}** - ${formatRupiah(ro.amount)} (${ro.status.toUpperCase()})`).join('\n')
        : 'Belum ada catatan pesanan.';

      // A. SPENDING FOCUS
      if (isSpendingQuery) {
        return {
          reply: `### 📊 Laporan Total Pengeluaran Akun Anda

Halo **${u.name}**! Berikut audit pengeluaran yang tercatat di database Ry-ITSolutions:

• **Total Pengeluaran Selesai**: **${formatRupiah(s.totalSpent)}**
• **Total Transaksi Berhasil**: **${s.successfulOrders} pesanan**
• **Pesanan Sedang Diproses**: **${s.pendingOrders} order**
• **Saldo RyPay Saat Ini**: **${formatRupiah(u.balance)}**
• **Koin RyPoints**: **${u.coins} Koin**
• **Total Deposit/Top Up**: **${formatRupiah(s.totalTopup)}** (${s.topupCount}x deposit sukses)

**3 Pesanan Terakhir Anda:**
${recentList}`,
          actions: [
            { label: 'Lihat Semua Riwayat', href: '/history' },
            { label: 'Top Up Saldo RyPay', href: '/topup' },
          ],
        };
      }

      // B. ORDER COUNT FOCUS
      if (isOrderQuery || isRecentTrxQuery) {
        return {
          reply: `### 📦 Statistik Total Pesanan Anda

Halo **${u.name}**! Berikut rincian seluruh pesanan yang pernah Anda lakukan:

• **Total Seluruh Pesanan**: **${s.totalOrders} Order**
• **Pesanan Sukses Selesai**: **${s.successfulOrders} Order**
• **Pesanan Sedang Diproses**: **${s.pendingOrders} Order**
• **Pesanan Gagal / Dibatalkan**: **${s.failedOrders} Order**
• **Akumulasi Belanja Sukses**: **${formatRupiah(s.totalSpent)}**

**Pesanan Terbaru:**
${recentList}`,
          actions: [
            { label: 'Buka Menu Riwayat Order', href: '/history' },
            { label: 'Pesan Layanan Baru', href: '/unblock-imei' },
          ],
        };
      }

      // C. ACCOUNT & BALANCE FOCUS
      return {
        reply: `### 👤 Informasi Akun & Saldo Anda

• **Nama Pengguna**: **${u.name}**
• **Status Keanggotaan**: **${u.role === 'admin' ? '👑 Administrator' : u.role === 'reseller' ? '💎 Reseller Mitra' : '👤 Pengguna Terverifikasi'}**
• **Saldo Dompet RyPay**: **${formatRupiah(u.balance)}**
• **Koin Reward RyPoints**: **${u.coins} Poin**
• **Total Pengeluaran**: **${formatRupiah(s.totalSpent)}** (dari ${s.successfulOrders} order sukses)`,
        actions: [
          { label: 'Top Up Saldo RyPay', href: '/topup' },
          { label: 'Klaim Koin (Games)', href: '/games' },
          { label: 'Riwayat Transaksi', href: '/history' },
        ],
      };
    }

    // -------------------------------------------------------------
    // 3. OUT-OF-CONTEXT TECH & SMARTPHONE EDUCATION
    // -------------------------------------------------------------

    // A0. PERTANYAAN DI LUAR KONTEKS
    if (q.includes('luar konteks') || q.includes('bisa ditanya apa') || q.includes('bisa tanya apa') || q.includes('bisa apa saja')) {
      return {
        reply: `Tentu saja bisa! Saya adalah **Ry-AI**, asisten kecerdasan buatan serba bisa dari Ry-ITSolutions. Anda dapat menanyakan topik apa pun kepada saya, baik itu:\n\n1. 🧠 **Pertanyaan Umum & Sains**: Penjelasan seputar teknologi, pemrograman, sains, tips kehidupan, hingga cara kerja sistem komputer.\n2. 📊 **Analitik & Pengeluaran Akun**: Menghitung total uang yang sudah Anda belanjakan selama ini di Ry-ITSolutions, statistik order sukses, dan sisa saldo dompet RyPay Anda.\n3. 📱 **Dunia Gadget & Smartphone**: Tips merawat Battery Health iPhone, penyebab sinyal hilang/begal, perbedaan unit resmi iBox vs Inter, hingga cara cek IMEI.\n4. 🧮 **Kalkulator & Perhitungan Cepat**: Menghitung rumus, operasi matematika, atau kalkulasi persen diskon.\n5. 💬 **Diskusi & Obrolan Santai**: Tanya jawab santai, meminta rekomendasi, atau berdiskusi seputar ide bisnis digital.\n\nSilakan tanyakan hal apa pun yang ada di pikiran Anda, saya siap menjawabnya!`,
        actions: [
          { label: '📊 Cek Pengeluaran Saya', href: '/history' },
          { label: '📱 Layanan Unblock IMEI', href: '/unblock-imei' },
          { label: '⚡ Gateway GoPay & QRIS', href: '/gateway' },
        ],
      };
    }

    // A. APA ITU IMEI & CARA CEK
    if (q.includes('apa itu imei') || q.includes('arti imei') || q.includes('fungsi imei') || q.includes('pengertian imei')) {
      return {
        reply: `### 📱 Apa Itu Nomor IMEI & Fungsinya?

**IMEI** (*International Mobile Equipment Identity*) adalah kode unik 15 digit yang menjadi identitas resmi setiap perangkat telepon seluler di dunia (seperti nomor KTP bagi smartphone).

**Fungsi Utama IMEI:**
1. **Identifikasi Perangkat ke BTS**: Mengidentifikasi tipe, merk, dan negara asal smartphone saat tersambung ke pemancar jaringan seluler operator.
2. **Pengendalian Legalitas (CEIR)**: Di Indonesia, sistem CEIR (*Central Equipment Identity Register*) mencocokkan IMEI HP dengan database Kemenperin/Bea Cukai.
3. **Keamanan & Pelacakan**: Membantu memblokir akses jaringan ponsel yang hilang atau dicuri.

*Cara Cek IMEI Cepat:* Buka dial telepon dan tekan \`*#06#\`.`,
        actions: [
          { label: 'Cek Status Database CEIR', href: '/cek-ceir' },
          { label: 'Layanan Unblock IMEI', href: '/unblock-imei' },
        ],
      };
    }

    // B. KENAPA SINYAL HILANG / BEGAL
    if (q.includes('kenapa sinyal hilang') || q.includes('sinyal begal') || q.includes('kenapa no service') || q.includes('hilang sinyal') || q.includes('kenapa iphone hilang sinyal') || q.includes('kenapa sinyal keblokir')) {
      return {
        reply: `### 📶 Penyebab Sinyal Smartphone Hilang (No Service)

Ada dua kemungkinan utama mengapa sinyal HP (khususnya iPhone/Android) hilang:

1. **Pemblokiran Regulasi IMEI (CEIR)**:
   - Sejak **15 September 2020**, pemerintah Indonesia memberlakukan aturan validasi IMEI.
   - HP unit luar negeri (Inter) yang tidak didaftarkan pajaknya melalui Bea Cukai akan diblokir akses sinyalnya oleh seluruh operator seluler (Telkomsel, Indosat, XL, Tri, Smartfren).
   - *Ciri khas:* Muncul nama operator beberapa detik lalu berubah menjadi **"Tidak Ada Layanan / No Service"**.

2. **Kerusakan Komponen IC Baseband (Hardware)**:
   - Jika chip IC Baseband di motherboard rusak, HP tidak dapat membaca kartu SIM sama sekali.
   - *Ciri khas:* Muncul status "Tidak Ada SIM" padahal SIM terpasang, atau dial \`*#06#\` kosong tidak memunculkan nomor.

*Solusi:* Jika saat dial \`*#06#\` nomor IMEI 15 digit Anda tetap muncul jelas, berarti mesin HP Anda sehat dan sinyal dapat dipulihkan dengan layanan **Unblock IMEI** kami!`,
        actions: [
          { label: 'Pulihkan Sinyal (Unblock IMEI)', href: '/unblock-imei' },
          { label: 'Cek Status CEIR Gratis', href: '/cek-ceir' },
        ],
      };
    }

    // C. BEDA IBOX vs INTER
    if (q.includes('ibox') || q.includes('unit inter') || q.includes('beda inter dan ibox') || q.includes('perbedaan ibox')) {
      return {
        reply: `### ⚖️ Perbedaan iPhone Unit Resmi (iBox/Digimap) vs Unit Inter

• **Unit Resmi Indonesia (iBox, Digimap, Erafone, GDN)**:
  - Memiliki kode model negara: **PA/A, ID/A, atau SA/A**.
  - Pajak PPN & PPh impor telah dilunasi oleh distributor resmi.
  - IMEI terdaftar permanen seumur hidup di database Kemenperin/Bea Cukai (bebas risiko pemblokiran sinyal).

• **Unit Inter (Impor Luar Negeri)**:
  - Memiliki kode model luar negeri seperti **LL/A (USA), J/A (Jepang), ZP/A (Singapura)**.
  - Biasanya masuk tanpa deklarasi pabean resmi, sehingga rentan mengalami pemblokiran sinyal sewaktu-waktu jika regulasi jaringan diperketat.
  - Harga belinya lebih terjangkau dibanding unit resmi.

*Jika Anda memiliki unit Inter yang hilang sinyal, Ry-ITSolutions menyediakan aktivasi Unblock IMEI All Operator bergaransi penuh.*`,
        actions: [
          { label: 'Buka Blokir Sinyal Inter', href: '/unblock-imei' },
          { label: 'Cek Garansi Apple', href: '/cek-garansi' },
        ],
      };
    }

    // D. TIPS RAWAT BATTERY HEALTH
    if (q.includes('battery health') || q.includes('baterai') || q.includes('merawat baterai') || q.includes('awet baterai') || q.includes('kesehatan baterai')) {
      return {
        reply: `### 🔋 Tips Efektif Merawat Battery Health Smartphone

Kesehatan baterai lithium-ion dipengaruhi oleh suhu panas dan siklus pengisian daya. Berikut tips praktis agar Battery Health awet:

1. **Gunakan Rule 20% - 80%**: Usahakan mulai mengisi daya saat baterai menyentuh 20%, dan cabut di kisaran 80%-85%. Siklus pengisian 0-100% terus-menerus lebih cepat mengikis kapasitas maksimal.
2. **Hindari Panas Berlebih (Musuh Utama Baterai)**: Lepaskan casing tebal saat mengecas jika HP terasa hangat, dan hindari bermain game berat saat HP sedang dicolok charger.
3. **Gunakan Charger Berkualitas**: Selalu gunakan adaptor dan kabel bersertifikasi resmi MFi (*Made for iPhone*) atau charger original yang memiliki proteksi arus stabil.
4. **Aktifkan Pengisian Daya Optimal**: Buka *Pengaturan > Baterai > Kesehatan Baterai* dan aktifkan **Optimized Battery Charging**.`,
        actions: [
          { label: 'Cek Garansi Apple', href: '/cek-garansi' },
          { label: 'Kembali ke Menu Utama', href: '/dashboard' },
        ],
      };
    }

    // E. CARA CEK IMEI
    if (q.includes('cara cek imei') || q.includes('cek nomor imei') || q.includes('melihat imei')) {
      return {
        reply: `### 🔍 Cara Mudah Mengecek 15 Digit Nomor IMEI

1. **Melalui Dial Telepon (Paling Cepat)**:
   - Buka aplikasi **Telepon**.
   - Ketik kode: \`*#06#\`
   - Nomor IMEI 15 digit (IMEI 1 dan IMEI 2) akan langsung muncul otomatis di layar.

2. **Melalui Menu Pengaturan**:
   - **iPhone (iOS)**: Buka *Pengaturan > Umum > Mengenai* lalu gulir ke bawah pada kolom IMEI.
   - **Android**: Buka *Pengaturan > Tentang Ponsel > Status Informasi IMEI*.

3. **Fisik Smartphone**:
   - Cek tulisan kecil pada tray kartu SIM (SIM tray slot).
   - Cek stiker barcode di bagian belakang kotak kemasan box asli HP.`,
        actions: [
          { label: 'Cek Database CEIR', href: '/cek-ceir' },
          { label: 'Layanan Unblock IMEI', href: '/unblock-imei' },
        ],
      };
    }

    // F. TIPS BELI HP BEKAS / SECOND
    if (q.includes('beli hp bekas') || q.includes('hp second') || q.includes('tips beli hp') || q.includes('beli iphone bekas')) {
      return {
        reply: `### 🛡️ Panduan Aman Membeli Smartphone Second / Bekas

1. **Uji Sinyal dengan 2 Kartu Berbeda**: Masukkan kartu SIM dari 2 provider berbeda (misal Telkomsel & XL) untuk memastikan sinyal muncul lancar dan bukan unit bypass jaringan.
2. **Cek Hardware dengan 3uTools**: Hubungkan iPhone ke laptop menggunakan 3uTools untuk memeriksa keaslian layar, kamera, baterai, dan apakah ada sparepart yang pernah diganti.
3. **Cek Fitur Kunci**: Pastikan Face ID / Touch ID berfungsi, True Tone aktif, kamera tidak bergetar (OIS normal), serta speaker atas dan bawah jernih.
4. **Wajib Reset Pabrik di Depan Penjual**: Lakukan *Hapus Semua Konten & Pengaturan* untuk memastikan akun iCloud / Google bersih dan perangkat bukan unit curian/terkunci bypass.`,
        actions: [
          { label: 'Cek Status IMEI di CEIR', href: '/cek-ceir' },
          { label: 'Cek Garansi Apple', href: '/cek-garansi' },
        ],
      };
    }

    // G. TEKNOLOGI QRIS DINAMIS
    if (q.includes('apa itu qris') || q.includes('qris dinamis') || q.includes('beda qris')) {
      return {
        reply: `### 💳 Mengenal QRIS Dinamis & Keunggulannya

**QRIS Dinamis** adalah teknologi pembayaran digital Bank Indonesia yang otomatis membuat barcode QR unik untuk setiap transaksi:

• **Nominal Otomatis**: Pembeli tidak perlu mengetik nominal pembayaran secara manual. Saat discan, jumlah tagihan sudah terisi otomatis.
• **Kode Unik Verifikasi**: Dilengkapi dengan nominal acak (misal Rp 50.124) sehingga server toko online dapat langsung mengenali siapa yang membayar dalam 0.5 detik.
• **Tanpa Struk Manual**: Transaksi diproses instan 24 jam nonstop tanpa perlu kirim bukti screenshot transfer ke admin.

*Ry-ITSolutions menyediakan integrasi Payment Gateway GoPay & QRIS Dinamis SaaS untuk website dan bot toko Anda.*`,
        actions: [
          { label: 'Info Gateway GoPay & QRIS', href: '/gateway' },
          { label: 'Coba Top Up QRIS', href: '/topup' },
        ],
      };
    }

    // H. CHIT-CHAT, PUJIAN & TERIMA KASIH
    if (q.includes('makasih') || q.includes('terima kasih') || q.includes('thanks') || q.includes('tengkyu') || q.includes('matur nuwun')) {
      return {
        reply: `Sama-sama! Senang sekali bisa membantu Anda. 😊

Jika masih ada yang ingin Anda tanyakan seputar layanan IMEI, gateway pembayaran, saldo akun, atau panduan smartphone, jangan ragu untuk bertanya lagi ya!`,
        actions: [
          { label: 'Buka Menu IMEI', href: '/unblock-imei' },
          { label: 'Gateway GoPay', href: '/gateway' },
        ],
      };
    }

    if (q.includes('kamu pintar') || q.includes('hebat') || q.includes('keren') || q.includes('mantap') || q.includes('top markotop') || q.includes('cerdas')) {
      return {
        reply: `Terima kasih banyak atas apresiasinya! 🚀

Saya terus belajar mandiri dan tersinkronisasi langsung dengan sistem Ry-ITSolutions agar selalu dapat memberikan jawaban yang akurat, cepat, dan bermanfaat bagi Anda. Ada hal lain yang bisa saya bantu hari ini?`,
        actions: [
          { label: 'Cek Pengeluaran Saya', href: '/history' },
          { label: 'Buka Menu IMEI', href: '/unblock-imei' },
        ],
      };
    }

    if (q.includes('siapa kamu') || q.includes('siapa namamu') || q.includes('kamu siapa') || q.includes('siapa yang buat kamu')) {
      return {
        reply: `Saya adalah **Ry-AI**, asisten kecerdasan buatan resmi dari **Ry-ITSolutions**.

Saya dirancang untuk:
1. Memberikan informasi real-time seputar layanan Unblock IMEI, Payment Gateway GoPay & QRIS, dan cek garansi.
2. Menghitung pengeluaran belanja dan rekap riwayat pesanan akun Anda secara instan.
3. Menjawab pertanyaan teknis seputar smartphone, teknologi seluler, dan perhitungan matematika.

Ada yang ingin Anda diskusikan bersama saya?`,
        actions: [
          { label: 'Cek Pengeluaran Saya', href: '/history' },
          { label: 'Layanan Unblock IMEI', href: '/unblock-imei' },
        ],
      };
    }

    // -------------------------------------------------------------
    // 4. CORE SERVICES: IMEI, GATEWAY, TOPUP, VOUCHER, CS, RESELLER
    // -------------------------------------------------------------

    // DOMAIN: UNBLOCK IMEI
    if (q.includes('imei') || q.includes('sinyal') || q.includes('unblock') || q.includes('buka blokir')) {
      const imeiPkgs: LiveImeiPackage[] = k?.imeiPackages || [];
      const slowRange = k?.speeds?.slow?.range || 'Max kirim 14:00 WIB, selesai max 00:00 WIB';
      const fastStatus = k?.speeds?.fast?.status || 'hidden';

      let imeiListText = '';
      if (imeiPkgs.length > 0) {
        imeiListText = imeiPkgs.map((p) => `• **Paket ${p.duration}**: **${formatRupiah(p.price)}** / IMEI (Garansi Penuh ${p.duration})`).join('\n');
      } else {
        imeiListText = '• **Paket 3 Bulan**: **Rp 155.000** / IMEI (Garansi Penuh 3 Bulan)';
      }

      return {
        reply: `### Daftar Paket & Tarif Unblock IMEI Real-Time

Berikut paket buka blokir sinyal IMEI yang aktif di database sistem:

${imeiListText}

**Spesifikasi & Ketentuan:**
• All Operator (Telkomsel, Indosat Ooredoo, XL Axiata, Tri, Smartfren)
• Garansi penuh selama masa aktif paket
• Syarat wajib: IC Baseband normal (muncul "Tidak Ada Layanan / No Service", bukan "Tidak Ada SIM")
• Estimasi pengerjaan reguler: ${slowRange}`,
        actions: [
          { label: 'Order Unblock IMEI', href: '/unblock-imei' },
          { label: 'Isi Saldo RyPay', href: '/topup' },
        ],
      };
    }

    // DOMAIN: PAYMENT GATEWAY GOPAY & QRIS
    if (q.includes('gateway') || q.includes('gopay') || q.includes('gobiz') || q.includes('saas') || (q.includes('qris') && !q.includes('topup'))) {
      return {
        reply: `### Biaya & Fitur Payment Gateway GoPay & QRIS SaaS

Solusi gateway pembayaran QRIS otomatis untuk website toko online, bot Telegram/WhatsApp, dan aplikasi Anda:

• **Biaya Aktivasi Perdana**: **${formatRupiah(gwActivationFee)}** (Termasuk lisensi 30 hari penuh).
• **Perpanjangan Bulanan**: Sangat hemat, hanya **${formatRupiah(gwRenewalFee)} / bulan**.
• **0% Fee Transaksi (GRATIS)**: Tanpa potongan persenan per transaksi. 100% pembayaran masuk utuh ke rekening GoPay/GoBiz Anda.
• **Direct Settlement**: Dana langsung detik itu juga masuk ke saldo pemilik tanpa perlu withdraw pihak ketiga.
• **Webhook Super Cepat**: Notifikasi pembayaran otomatis 0.2 - 0.5 detik.`,
        actions: [
          { label: `Aktivasi Gateway (${formatRupiah(gwActivationFee)})`, href: '/gateway' },
          { label: 'Dokumentasi API', href: '/gateway' },
        ],
      };
    }

    // DOMAIN: TOP UP SALDO RYPAY
    if (q.includes('topup') || q.includes('top up') || q.includes('isi saldo') || q.includes('deposit') || q.includes('rypay')) {
      return {
        reply: `### Panduan & Ketentuan Top Up Saldo RyPay

• **Biaya Admin: Rp 0 (BEBAS BIAYA ADMIN)**.
• **Minimal Top Up**: Mulai dari **${formatRupiah(topupMin)}**.
• **Metode Pembayaran**: Menggunakan **Dynamic QRIS Otomatis 24 Jam** yang mendukung seluruh Bank (BCA, Mandiri, BRI, BNI, BSI) & E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).
• **Kecepatan Masuk**: Saldo RyPay otomatis bertambah dalam **2 - 5 detik** setelah pembayaran sukses.`,
        actions: [
          { label: 'Top Up RyPay Sekarang', href: '/topup' },
          { label: 'Cek Riwayat Saldo', href: '/history' },
        ],
      };
    }

    // DOMAIN: VOUCHER & PROMO
    if (q.includes('voucher') || q.includes('kupon') || q.includes('diskon') || q.includes('promo')) {
      const liveCoupons: LiveCoupon[] = k?.coupons || [];
      if (liveCoupons.length > 0) {
        const couponList = liveCoupons.map((c) => {
          const pot = c.discountType === 'percent' ? `${c.discountValue}%` : formatRupiah(c.discountValue);
          return `• Kode Kupon: **\`${c.code}\`**\n  - Potongan: **${pot}**\n  - Minimal Transaksi: **${formatRupiah(c.minOrder)}**`;
        }).join('\n\n');

        return {
          reply: `### Kode Voucher & Promo Diskon Aktif\n\nBerikut kode promo yang sedang **AKTIF** di sistem database kami:\n\n${couponList}\n\n*Masukkan kode kupon di atas pada kolom Voucher saat melakukan checkout!*`,
          actions: [
            { label: 'Klaim di Menu Voucher', href: '/vouchers' },
            { label: 'Order Layanan Sekarang', href: '/unblock-imei' },
          ],
        };
      }
      return {
        reply: `### Informasi Promo & Voucher Diskon\n\nSaat ini belum ada kode voucher publik yang aktif di sistem. Pantau terus halaman **Voucher** atau pengumuman dashboard untuk promo berikutnya!`,
        actions: [
          { label: 'Buka Halaman Voucher', href: '/vouchers' },
        ],
      };
    }

    // DOMAIN: CS & ADMIN WHATSAPP
    if (q.includes('cs') || q.includes('admin') || q.includes('customer support') || q.includes('whatsapp') || q.includes('wa admin')) {
      return {
        reply: `### Kontak Layanan Pelanggan (CS Admin)\n\nTim Customer Support Ry-ITSolutions siap membantu kendala transaksi atau pertanyaan teknis Anda:\n\n• **Admin 1**: [${csAdmin1}](https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}) *(Layanan IMEI & Gateway)*\n• **Admin 2**: [${csAdmin2}](https://wa.me/${csAdmin2.replace(/[^0-9]/g, '')}) *(Bantuan Transaksi & Deposit)*\n\nJam Operasional CS: Setiap hari pukul **${k?.cs?.hours || '08.00 - 23.00 WIB'}**.\n*Sistem pemesanan dan deposit di website aktif 24 jam nonstop.*`,
        actions: [
          { label: 'Chat WhatsApp Admin 1', href: `https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}`, isExternal: true },
          { label: 'Chat WhatsApp Admin 2', href: `https://wa.me/${csAdmin2.replace(/[^0-9]/g, '')}`, isExternal: true },
        ],
      };
    }

    // DOMAIN: GREETINGS
    if (/^(halo|hai|hi|pagi|siang|sore|malam|assalamualaikum|ping|p)$/i.test(q) || /^(halo|hai|hi|pagi|siang|sore|malam) /i.test(q)) {
      return {
        reply: `Halo! Senang bisa menyapa Anda. Saya **Ry-AI**, asisten cerdas resmi dari **Ry-ITSolutions**.\n\nSaya dapat membantu Anda untuk:\n• 📊 **Menghitung Pengeluaran & Riwayat Pesanan Akun Anda**\n• 📱 **Layanan Buka Blokir IMEI All Operator (Garansi 3 Bulan)**\n• ⚡ **SaaS Payment Gateway GoPay & Dynamic QRIS (Fee 0%)**\n• 💡 **Pertanyaan Seputar Teknologi Smartphone & Cek Garansi**\n• 🧮 **Perhitungan Matematika & Biaya Layanan**\n\nAda yang ingin Anda tanyakan atau hitung?`,
        actions: [
          { label: 'Cek Pengeluaran Saya', href: '/history' },
          { label: 'Buka Menu IMEI', href: '/unblock-imei' },
          { label: 'Gateway GoPay', href: '/gateway' },
          { label: 'Top Up RyPay', href: '/topup' },
        ],
      };
    }

    // -------------------------------------------------------------
    // 5. INTELLIGENT ADAPTIVE FALLBACK (RAMAH & MULTI-KONTEKS)
    // -------------------------------------------------------------
    return {
      reply: `Terima kasih atas pertanyaan Anda seputar: **"${userText}"**.\n\nSebagai asisten cerdas **Ry-ITSolutions**, saya dapat membantu menjawab pertanyaan teknis, menghitung transaksi Anda, atau mengarahkan Anda ke solusi terbaik:\n\n1. **Statistik Pengeluaran & Pesanan**: Ketik *"Berapa pengeluaran saya?"* untuk melihat audit belanja akun Anda.\n2. **Aktivasi & Buka Blokir IMEI All Operator**: Pemulihan sinyal HP No Service dengan garansi penuh 3 bulan.\n3. **Payment Gateway GoPay & QRIS SaaS**: Automasi pembayaran toko online dengan fee 0% dan settlement instan.\n4. **Wawasan Teknologi & Gadget**: Edukasi seputar baterai, baseband, aturan CEIR, dan tips membeli smartphone.\n\nSilakan ketik pertanyaan Anda lebih detail atau pilih menu layanan di bawah!`,
      actions: [
        { label: '📊 Cek Pengeluaran Saya', href: '/history' },
        { label: '📱 Layanan Unblock IMEI', href: '/unblock-imei' },
        { label: '⚡ Gateway GoPay & QRIS', href: '/gateway' },
        { label: '💳 Top Up Saldo RyPay', href: '/topup' },
      ],
    };
  };

  // Handle Send Message (Calls Backend OpenAI ChatGPT Integration with Live Fallback)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!text || isTyping) return;

    try { playPopSound(); } catch {}

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: formatTime(new Date()),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, history: historyPayload }),
      });

      const data = await res.json();
      if (data?.status && data.reply) {
        const defaultActions = generateAiResponse(text).actions;
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.reply,
          timestamp: formatTime(new Date()),
          actions: defaultActions,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
        try { playDingSound(); } catch {}
        return;
      }
    } catch (err) {
      console.warn('Backend AI chat fallback triggered:', err);
    }

    // Client-side fallback
    setTimeout(() => {
      const aiResponseData = generateAiResponse(text);
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiResponseData.reply,
        timestamp: formatTime(new Date()),
        actions: aiResponseData.actions,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      try { playDingSound(); } catch {}
    }, 300);
  };

  // Handle Copy Message Text
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Reset Chat
  const handleResetChat = () => {
    Swal.fire({
      title: 'Reset Percakapan?',
      text: 'Riwayat percakapan dengan Ry-AI akan dihapus dan dimulai dari awal.',
      showCancelButton: true,
      confirmButtonColor: '#0066cc',
      cancelButtonColor: '#7a7a7a',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([getWelcomeMessage(knowledge, userAnalytics)]);
      }
    });
  };

  // Render markdown-like formatted text with crystal-clear readability
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-[13.5px] sm:text-[14px] text-blue-600 dark:text-sky-400 mt-1 mb-1.5 tracking-tight flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }

      if (line.startsWith('• ')) {
        const content = line.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 leading-relaxed text-slate-700 dark:text-slate-200">
            <span className="text-blue-500 dark:text-sky-400 font-bold shrink-0 mt-0.5">•</span>
            <span>{parseBold(content)}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={idx} className="my-0.5 leading-relaxed pl-2 text-slate-700 dark:text-slate-200">
            {parseBold(line)}
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="leading-relaxed my-0.5 text-slate-700 dark:text-slate-200">
          {parseBold(line)}
        </p>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-600 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-sky-300 rounded text-[11px] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950 select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP CHAT HEADER BAR                                       */}
      {/* ============================================================ */}
      <div className="h-12 px-3.5 sm:px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className="text-[13px] font-bold text-slate-900 dark:text-white">Ry-AI Assistant</h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span>{isKnowledgeReady ? (isUserLoaded && userAnalytics?.user ? `Terhubung: ${userAnalytics.user.name}` : 'Tersinkron Database Real-Time') : 'Menghubungkan ke Database...'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Reset percakapan chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CHAT MESSAGES CONTAINER                                   */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-3.5 py-2.5 bg-blue-600 text-white shadow-xs">
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[9.5px] text-blue-200 mt-1 text-right">{msg.timestamp}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[82%] group animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>

              <div className="flex-1 rounded-2xl rounded-tl-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs text-[12.5px] sm:text-[13px]">
                {renderFormattedText(msg.text)}

                {/* Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {msg.actions.map((act, i) => {
                      if (act.isExternal) {
                        return (
                          <a
                            key={i}
                            href={act.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-600 dark:text-emerald-300 dark:hover:text-white dark:border-emerald-800 text-[11px] font-semibold transition-all active:scale-95"
                          >
                            <span>{act.label}</span>
                          </a>
                        );
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => act.href && router.push(act.href)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-600 dark:text-sky-300 dark:hover:text-white dark:border-blue-800 text-[11px] font-semibold transition-all active:scale-95"
                        >
                          <span>{act.label}</span>
                          <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/></svg>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Footer time & copy */}
                <div className="flex items-center justify-between mt-2 pt-1 text-[9.5px] text-slate-400 dark:text-slate-500">
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.text)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600 dark:hover:text-sky-400 flex items-center gap-0.5"
                    title="Salin teks pesan"
                  >
                    {copiedId === msg.id ? (
                      <span className="text-emerald-500 font-semibold">Tersalin!</span>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
              <svg className="w-4 h-4 text-primary shrink-0 inline mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shadow-2xs">
              <span>Ry-AI sedang memproses</span>
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK SUGGESTION CHIPS                                    */}
      {/* ============================================================ */}
      <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider shrink-0 uppercase mr-1">
            PILIHAN:
          </span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt.query)}
              disabled={isTyping}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. CHAT INPUT BAR                                            */}
      {/* ============================================================ */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-xs"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Tanyakan pengeluaran Anda, unblock IMEI, kalkulator, info HP..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            className="flex-1 bg-transparent text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none py-1.5"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Kirim Pertanyaan"
          >
            <svg className="w-4 h-4 translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}
