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

const STORAGE_KEY = 'ry_ai_chat_history_v5';

const QUICK_PROMPTS = [
  { label: 'Info Buka IMEI (3 Bulan)', query: 'Berapa harga dan syarat buka blokir IMEI 3 Bulan?' },
  { label: 'Unblock IMEI yang Fast ada?', query: 'Apakah ada unblock IMEI yang fast atau kilat?' },
  { label: 'Gateway GoPay & QRIS', query: 'Jelaskan tentang fitur Payment Gateway GoPay & QRIS SaaS serta biaya aktivasinya' },
  { label: 'Cek Garansi Apple & CEIR', query: 'Bagaimana cara cek garansi Apple dan status CEIR gratis?' },
  { label: 'Cara Topup Saldo QRIS', query: 'Bagaimana cara isi saldo akun otomatis via QRIS tanpa admin?' },
  { label: 'Hubungi CS Admin WhatsApp', query: 'Saya butuh bantuan customer support WhatsApp admin' },
];

export default function AiChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live data from backend
  const [livePackages, setLivePackages] = useState<any[]>([]);
  const [livePricing, setLivePricing] = useState<any>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message (Accurate and truthful)
  const getWelcomeMessage = (): Message => ({
    id: 'welcome_init',
    sender: 'ai',
    text: 'Halo! Saya **Ry-AI**, asisten cerdas resmi dari **Ry-ITSolutions**.\n\nAda yang bisa saya bantu hari ini? Anda dapat menanyakan seputar:\n• **Buka Blokir IMEI All Operator** (Tersedia Paket 3 Bulan, garansi aktif)\n• **Payment Gateway GoPay & Dynamic QRIS SaaS** (Aktivasi Rp 35.000, Perpanjang Rp 10.000/bln, Fee 0%)\n• **Cek Status Garansi Apple & Database CEIR** (100% Gratis)\n• **Top Up Saldo Akun Otomatis 24 Jam** (QRIS bebas biaya admin)\n• **Bantuan CS Admin WhatsApp**\n\nSilakan pilih topik cepat di bawah atau ketik langsung pertanyaan Anda!',
    timestamp: formatTime(new Date()),
    actions: [
      { label: 'Buka Menu IMEI', href: '/unblock-imei'},
      { label: 'Gateway GoPay', href: '/gateway'},
      { label: 'Cek Garansi', href: '/cek-garansi'},
      { label: 'Top Up Saldo', href: '/topup'},
    ],
  });

  // Fetch live package and pricing data
  useEffect(() => {
    fetch('/api/imei-packages', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          setLivePackages(data.data.filter((p: any) => p && p.isVisible !== false));
        }
      })
      .catch(() => {});

    fetch('/api/manual-services-pricing', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status && data.data) {
          setLivePricing(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Load chat history from localStorage (and purge old obsolete hallucinated history)
  useEffect(() => {
    try {
      // Purge previous keys that held hallucinated answers
      localStorage.removeItem('ry_ai_chat_history');
      localStorage.removeItem('ry_ai_chat_history_v2');
      localStorage.removeItem('ry_ai_chat_history_v3');

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if any old message still has hallucinated text like "Rp 60.000" or "Permanen"
          const hasHallucination = parsed.some((m: Message) => 
            (m.text || '').includes('60.000') || 
            (m.text || '').includes('15 - 45 Menit') ||
            (m.text || '').includes('Paket Garansi Resmi Permanen') ||
            (m.text || '').includes('Hanya **Rp 10.000 / 30 Hari**')
          );

          if (!hasHallucination) {
            setMessages(parsed);
            return;
          }
        }
      }
    } catch {}

    setMessages([getWelcomeMessage()]);
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // Generate Accurate, Domain-First AI Response (Weighted Multi-Intent Classifier)
  const generateAiResponse = (userText: string): { reply: string; actions?: Message['actions'] } => {
    const q = userText.toLowerCase().trim();

    // Get live price for 3-month package if available
    const pkg3Bulan = livePackages.find((p) => (p.name || p.duration || "").toLowerCase().includes("3 bulan"));
    const price3Bulan = pkg3Bulan ? Number(pkg3Bulan.price || 155000) : 155000;
    const formattedPrice3Bln = `Rp ${price3Bulan.toLocaleString("id-ID")}`;

    // -------------------------------------------------------------
    // 1. CALCULATE WEIGHTED TOPIC SCORES
    // -------------------------------------------------------------
    const scores = {
      gateway: 0,
      imei: 0,
      topup: 0,
      voucher: 0,
      rypoints: 0,
      ceir: 0,
      apple: 0,
      cs: 0,
      reseller: 0,
      greetings: 0
    };

    // GATEWAY KEYWORDS
    if (q.includes("payment gateway") || q.includes("gateway")) scores.gateway += 15;
    if (q.includes("gopay") || q.includes("gobiz")) scores.gateway += 15;
    if (q.includes("qris dinamis") || q.includes("dynamic qris")) scores.gateway += 14;
    if (q.includes("saas")) scores.gateway += 10;
    if (q.includes("webhook") || q.includes("api key") || q.includes("integrasi")) scores.gateway += 8;
    if (q.includes("qris") && !q.includes("isi saldo") && !q.includes("topup") && !q.includes("deposit")) scores.gateway += 6;
    if (scores.gateway > 0 && (q.includes("biaya") || q.includes("aktivasi") || q.includes("perpanjang") || q.includes("tarif") || q.includes("harga"))) {
      scores.gateway += 10;
    }

    // TOPUP & RYPAY KEYWORDS
    if (q.includes("topup") || q.includes("top up") || q.includes("isi saldo") || q.includes("deposit") || q.includes("tambah saldo")) scores.topup += 15;
    if (q.includes("rypay") && !q.includes("potong")) scores.topup += 10;
    if (q.includes("saldo") && !q.includes("gopay") && !q.includes("gateway")) scores.topup += 8;

    // VOUCHER KEYWORDS
    if (q.includes("voucher") || q.includes("kupon") || q.includes("diskon") || q.includes("promo") || q.includes("septembercerah")) scores.voucher += 15;

    // RYPOINTS & KOIN KEYWORDS
    if (q.includes("rypoints") || q.includes("koin") || q.includes("roda hoki") || q.includes("spin") || q.includes("trivia") || q.includes("tukar poin") || q.includes("poin")) scores.rypoints += 15;

    // CEIR KEYWORDS
    if (q.includes("ceir") || q.includes("kemenperin") || q.includes("database ceir") || q.includes("blacklist")) scores.ceir += 15;

    // APPLE GARANSI KEYWORDS
    if (q.includes("garansi apple") || q.includes("apple coverage") || q.includes("serial number") || q.includes("applecare") || q.includes("cek garansi")) scores.apple += 15;

    // IMEI & SINYAL KEYWORDS
    if (q.includes("unblock imei") || q.includes("buka imei") || q.includes("paket imei") || q.includes("buka blokir")) scores.imei += 15;
    if (q.includes("imei") || q.includes("sinyal") || q.includes("no service") || q.includes("tidak ada layanan") || q.includes("baseband") || q.includes("begal")) scores.imei += 12;
    if (q.includes("fast") || q.includes("kilat") || q.includes("permanen") || q.includes("bea cukai")) scores.imei += 8;

    // CS & BANTUAN KEYWORDS
    if (q.includes("cs") || q.includes("admin") || q.includes("customer support") || q.includes("whatsapp") || q.includes("wa admin") || q.includes("bantuan cs")) scores.cs += 12;

    // RESELLER KEYWORDS
    if (q.includes("reseller") || q.includes("mitra") || q.includes("agen") || q.includes("grosir") || q.includes("bulk")) scores.reseller += 15;

    // GREETINGS
    if (/^(halo|hai|hi|pagi|siang|sore|malam|assalamualaikum|ping|p)/i.test(q)) scores.greetings += 10;

    // FIND HIGHEST SCORING DOMAIN
    let bestDomain = "default";
    let maxScore = 0;
    for (const [dom, sc] of Object.entries(scores)) {
      if (sc > maxScore) {
        maxScore = sc;
        bestDomain = dom;
      }
    }

    // -------------------------------------------------------------
    // 2. DISPATCH ACCORDING TO DETERMINED DOMAIN & SUB-INTENT
    // -------------------------------------------------------------

    // DOMAIN A: PAYMENT GATEWAY (GoPay & Dynamic QRIS SaaS)
    if (bestDomain === "gateway") {
      const isPricing = q.includes("biaya") || q.includes("harga") || q.includes("tarif") || q.includes("aktivasi") || q.includes("perpanjang") || q.includes("berapa");
      const isApi = q.includes("api") || q.includes("webhook") || q.includes("curl") || q.includes("php") || q.includes("node") || q.includes("integrasi");

      if (isPricing) {
        return {
          reply: `### Biaya & Ketentuan Payment Gateway GoPay & QRIS SaaS\n\nSolusi gateway pembayaran QRIS otomatis untuk website toko online, bot Telegram/WhatsApp, dan aplikasi Anda:\n\n• **Biaya Aktivasi Perdana**: **Rp 35.000** (Langsung aktif dan sudah termasuk masa aktif lisensi 30 hari penuh).\n• **Perpanjangan Bulanan**: Sangat terjangkau, hanya **Rp 10.000 / bulan** (bisa perpanjang manual atau auto-renew potong saldo RyPay).\n• **Fee Transaksi 0% (GRATIS)**: Tanpa potongan persenan per transaksi. 100% uang pembayaran pembeli masuk utuh ke rekening GoPay/GoBiz Anda.\n• **Direct Settlement Instan**: Uang langsung masuk detik itu juga ke akun GoPay pemilik tanpa perlu withdraw / mengendap di pihak ketiga.\n• **Pairing Tanpa Ribet**: Cukup masukkan nomor HP GoBiz & verifikasi OTP tanpa berkas legalitas PT/CV.`,
          actions: [
            { label: "Aktivasi Gateway (Rp 35.000)", href: "/gateway" },
            { label: "Lihat Dokumentasi API", href: "/gateway" },
          ],
        };
      }

      if (isApi) {
        return {
          reply: `### Integrasi API & Webhook Callback Gateway\n\nRy-ITSolutions menyediakan REST API berkecepatan tinggi untuk menghubungkan pembayaran otomatis ke sistem Anda:\n\n• **Endpoint Buat QRIS**: \`POST /api/v1/gateway/create-qris\`\n• **Webhook Notification**: Mengirim notifikasi webhook secara real-time (\`0.2 - 0.5 detik\`) saat pembayaran sukses (\`payment.success\`).\n• **Keamanan Tinggi**: Dilengkapi HMAC-SHA256 signature verification.\n• **Contoh Kode**: Tersedia dokumentasi dan sampel integrasi siap pakai untuk cURL, PHP (Laravel/CI), Node.js, dan Python.\n\nSilakan kunjungi menu **Gateway** untuk mengaktifkan API Key Anda!`,
          actions: [
            { label: "Kelola API Key & Webhook", href: "/gateway" },
          ],
        };
      }

      return {
        reply: `### Fitur & Keunggulan Payment Gateway GoPay & QRIS\n\nSolusi otomatisasi transaksi digital tanpa biaya admin transaksi (0% Fee):\n\n1. **Aktivasi Terjangkau**: Biaya perdana **Rp 35.000** (aktif 30 hari), perpanjangan hanya **Rp 10.000 / bulan**.\n2. **Direct Settlement**: Pembayaran langsung masuk ke akun GoPay Merchant/GoBiz Anda secara real-time.\n3. **Webhook Super Cepat**: Callback webhook 0.2 - 0.5 detik untuk memproses order secara instan.\n4. **Dynamic QRIS**: Generate QRIS otomatis sesuai nominal unik transaksi.\n5. **Setup Cepat**: Tanpa persyaratan dokumen perusahaan PT/CV yang rumit.`,
        actions: [
          { label: "Buka Menu Gateway", href: "/gateway" },
          { label: "Dokumentasi API", href: "/gateway" },
        ],
      };
    }

    // DOMAIN B: TOP UP SALDO & RYPAY
    if (bestDomain === "topup") {
      const isFee = q.includes("biaya") || q.includes("admin") || q.includes("fee") || q.includes("gratis") || q.includes("potongan");

      if (isFee) {
        return {
          reply: `### Biaya & Ketentuan Top Up RyPay\n\n• **Biaya Admin: Rp 0 (BEBAS BIAYA ADMIN)**.\n• **Minimal Top Up**: Mulai dari **Rp 10.000**.\n• **Metode Pembayaran**: Menggunakan **Dynamic QRIS Otomatis** yang mendukung seluruh Bank (BCA, Mandiri, BRI, BNI, BSI) & E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).\n• **Kecepatan Masuk**: Saldo RyPay otomatis bertambah dalam **2 - 5 detik** setelah QRIS dibayar (sistem aktif 24 jam nonstop).`,
          actions: [
            { label: "Top Up RyPay Sekarang", href: "/topup" },
            { label: "Cek Riwayat Saldo", href: "/history" },
          ],
        };
      }

      return {
        reply: `### Panduan Isi Saldo RyPay Otomatis (QRIS 24 Jam)\n\nRyPay adalah saldo dompet digital Anda di Ry-ITSolutions untuk memesan Unblock IMEI, aktivasi Gateway, dan layanan digital lainnya secara instan.\n\n**Cara Top Up:**\n1. Buka menu **Top Up** (\`/topup\`).\n2. Masukkan nominal deposit yang diinginkan (minimal Rp 10.000).\n3. Klik **Lanjut Pembayaran** untuk menampilkan kode QRIS dinamis.\n4. Scan QRIS dengan aplikasi m-Banking atau e-Wallet pilihan Anda.\n5. Selesai! Saldo otomatis masuk dalam 2-5 detik tanpa perlu konfirmasi manual ke admin.`,
        actions: [
          { label: "Isi Saldo RyPay", href: "/topup" },
          { label: "Lihat Riwayat Transaksi", href: "/history" },
        ],
      };
    }

    // DOMAIN C: VOUCHER & KODE KUPON PROMO
    if (bestDomain === "voucher") {
      return {
        reply: `### Kupon Promo & Voucher Diskon Aktif\n\nDapatkan potongan harga khusus untuk pesanan Anda di Ry-ITSolutions!\n\n🎟️ **KODE VOUCHER: \`SEPTEMBERCERAH\`**\n• **Besar Diskon**: Potongan langsung **Rp 5.000**.\n• **Syarat Belanja**: Minimal transaksi Rp 155.000.\n• **Ketersediaan**: Kuota promo terbatas per hari.\n\n**Cara Menggunakan:**\n1. Buka menu **Voucher** (\`/vouchers\`) lalu klik tombol **Klaim Voucher**.\n2. Atau masukkan kode \`SEPTEMBERCERAH\` langsung di kolom voucher saat checkout di halaman **Unblock IMEI** (\`/unblock-imei\`).`,
        actions: [
          { label: "Klaim Voucher di Menu", href: "/vouchers" },
          { label: "Gunakan Saat Order IMEI", href: "/unblock-imei" },
        ],
      };
    }

    // DOMAIN D: RYPOINTS & KOIN REWARD
    if (bestDomain === "rypoints") {
      return {
        reply: `### RyPoints (Koin Reward Loyalitas)\n\nRyPoints adalah program poin loyalitas dari Ry-ITSolutions yang bisa Anda tukarkan langsung menjadi potongan harga belanja saat checkout!\n\n💰 **Nilai Tukar**: **1 RyPoints = Rp 1** (Potong langsung ke total tagihan pesanan).\n\n**Cara Mengumpulkan RyPoints Gratis Setiap Hari:**\n1. **Check-In Harian**: Buka menu Game Koin (\`/games\`) dan klaim poin login harian.\n2. **Putar Roda Hoki**: Mainkan spin roda keberuntungan untuk memenangkan hingga ribuan RyPoints.\n3. **Kuis Trivia Harian**: Jawab pertanyaan seputar teknologi untuk mendapatkan bonus poin harian.\n4. **Ulasan Produk Bintang 5**: Berikan ulasan di halaman ulasan produk dan dapatkan bonus **+500 RyPoints** instan!`,
        actions: [
          { label: "Main Game & Koin", href: "/games" },
          { label: "Belanja dengan RyPoints", href: "/unblock-imei" },
        ],
      };
    }

    // DOMAIN E: CEIR & GARANSI APPLE
    if (bestDomain === "ceir" || bestDomain === "apple") {
      if (bestDomain === "ceir" || q.includes("ceir") || q.includes("kemenperin")) {
        return {
          reply: `### Cek Status Database CEIR Kemenperin (100% Gratis)\n\nFitur diagnostik mandiri untuk mengecek apakah nomor IMEI HP Anda terdaftar resmi di basis data CEIR Kemenperin atau berstatus blokir (No Service):\n\n• **Biaya**: **100% GRATIS** tanpa biaya apapun.\n• **Proses**: Instan dalam 3 detik.\n• **Cara Cek**: Buka menu **Cek CEIR** (\`/cek-ceir\`), masukkan 15 digit nomor IMEI perangkat Anda, lalu klik Periksa.`,
          actions: [
            { label: "Cek Status CEIR Sekarang", href: "/cek-ceir" },
            { label: "Buka Blokir IMEI", href: "/unblock-imei" },
          ],
        };
      }

      return {
        reply: `### Cek Status Garansi AppleCare & Serial Number\n\nLayanan diagnostik resmi untuk memeriksa data garansi perangkat Apple Anda (iPhone, iPad, Mac, Apple Watch):\n\n• **Yang Diperiksa**: Masa aktif perlindungan AppleCare+, tanggal aktivasi perangkat, dan keaslian unit.\n• **Biaya**: **100% GRATIS**.\n• **Cara Cek**: Buka menu **Cek Garansi** (\`/cek-garansi\`), ketik Serial Number perangkat Anda, dan hasil laporan diagnostik langsung tampil.`,
        actions: [
          { label: "Cek Garansi Apple Sekarang", href: "/cek-garansi" },
          { label: "Cek Status CEIR", href: "/cek-ceir" },
        ],
      };
    }

    // DOMAIN F: UNBLOCK IMEI & SINYAL
    if (bestDomain === "imei") {
      const isSpeed = q.includes("fast") || q.includes("kilat") || q.includes("cepat") || q.includes("express") || q.includes("berapa lama") || q.includes("selesai kapan") || q.includes("estimasi") || q.includes("jam berapa");
      const isPermanent = q.includes("permanen") || q.includes("permanent") || q.includes("resmi") || q.includes("bea cukai") || q.includes("pajak");
      const isPrice = q.includes("harga") || q.includes("tarif") || q.includes("biaya") || q.includes("berapa") || q.includes("paket imei") || q.includes("pricelist");

      if (isSpeed) {
        return {
          reply: `### Ketentuan Kecepatan & Estimasi Selesai Unblock IMEI\n\n• **Opsi Fast / Kilat**: Untuk saat ini sedang **NONAKTIF (TIDAK TERSEDIA)** demi menjaga kestabilan sistem antrean.\n• **Jalur Reguler (Aktif)**:\n  - **Batas Pengiriman Order**: Maksimal pukul **14:00 WIB** setiap hari.\n  - **Estimasi Selesai**: Selesai di hari yang sama, maksimal pukul **00:00 WIB** (tengah malam).\n  - Pesanan yang masuk di atas pukul 14:00 WIB akan diproses dalam antrean hari berikutnya.`,
          actions: [
            { label: "Buka Form Order IMEI", href: "/unblock-imei" },
            { label: "Tanya CS WhatsApp", href: "https://wa.me/6288706611370", isExternal: true },
          ],
        };
      }

      if (isPermanent) {
        return {
          reply: `### Transparansi Layanan: Tidak Ada Paket Permanen / Bea Cukai\n\nDi Ry-ITSolutions kami selalu transparan:\n• Kami **TIDAK MENYEDIAKAN paket permanen ataupun paket resmi Bea Cukai**.\n• Layanan yang tersedia adalah **Paket 3 Bulan** (mulai ${formattedPrice3Bln} per IMEI) dengan **Garansi Penuh 3 Bulan**.\n• Jika sinyal hilang dalam masa aktif 3 bulan, kami garansi proses ulang secara gratis hingga sinyal aktif kembali.\n• Mendukung **All Operator**: Telkomsel, Indosat Ooredoo, XL Axiata, Tri, dan Smartfren.`,
          actions: [
            { label: "Order Paket 3 Bulan", href: "/unblock-imei" },
            { label: "Cek Status CEIR", href: "/cek-ceir" },
          ],
        };
      }

      if (isPrice) {
        return {
          reply: `### Daftar Paket & Tarif Unblock IMEI\n\nPaket buka blokir IMEI yang tersedia di Ry-ITSolutions:\n\n• **Paket 3 Bulan**: **${formattedPrice3Bln}** / IMEI\n\n*(Catatan: Kami TIDAK menyediakan paket 1 bulan ataupun paket permanen/resmi).*\n\n**Spesifikasi Layanan:**\n• All Operator (Telkomsel, Indosat Ooredoo, XL Axiata, Tri, Smartfren)\n• Garansi penuh selama masa paket 3 bulan\n• Syarat wajib: IC Baseband normal (muncul \"Tidak Ada Layanan / No Service\", bukan \"Tidak Ada SIM\")\n• Estimasi pengerjaan: Kirim sebelum 14:00 WIB, selesai maksimal 00:00 WIB (jalur reguler)`,
          actions: [
            { label: "Buka Form IMEI", href: "/unblock-imei" },
            { label: "Isi Saldo RyPay", href: "/topup" },
          ],
        };
      }

      return {
        reply: `### Layanan Buka Blokir IMEI All Operator\n\nLayanan unblock IMEI Ry-ITSolutions memulihkan sinyal HP (iPhone / Android) yang hilang (*No Service*) akibat pemblokiran jaringan seluler.\n\n**Ketentuan & Paket Saat Ini:**\n• **Paket Tersedia**: Paket **3 Bulan** (**${formattedPrice3Bln}** per IMEI).\n• **Jalur Kecepatan**: Jalur **Reguler** (Kirim sebelum jam 14:00 WIB, selesai max jam 00:00 WIB).\n• **All Operator**: Telkomsel, Indosat, XL, Tri, Smartfren.\n• **Garansi**: Garansi 3 bulan penuh.\n• **Syarat Wajib**: Pastikan IC Baseband normal (muncul status \"Tidak Ada Layanan / No Service\", bukan \"Tidak Ada SIM\").`,
        actions: [
          { label: "Buka Form IMEI Sekarang", href: "/unblock-imei" },
          { label: "Cek Status CEIR", href: "/cek-ceir" },
        ],
      };
    }

    // DOMAIN G: RESELLER / MITRA
    if (bestDomain === "reseller") {
      return {
        reply: `### Program Kemitraan & Reseller Grosir\n\nBagi Anda pemilik konter HP, toko handphone, atau pelaku usaha yang membutuhkan transaksi dalam jumlah banyak (Bulk IMEI / Gateway Payment):\n\n• Kami menyediakan **penawaran harga khusus mitra grosir**.\n• Prioritas pemrosesan pesanan dan jalur support khusus.\n• Silakan hubungi langsung WhatsApp Admin Kemitraan kami untuk berdiskusi lebih lanjut!`,
        actions: [
          { label: "Hubungi Admin Kemitraan", href: "https://wa.me/6288706611370", isExternal: true },
        ],
      };
    }

    // DOMAIN H: CS & WHATSAPP ADMIN
    if (bestDomain === "cs") {
      return {
        reply: `### Kontak Layanan Pelanggan (CS Admin)\n\nTim Customer Support Ry-ITSolutions siap membantu kendala transaksi atau pertanyaan teknis Anda:\n\n• **Admin 1**: [088706611370](https://wa.me/6288706611370) *(Layanan IMEI & Gateway)*\n• **Admin 2**: [087767287284](https://wa.me/6287767287284) *(Bantuan Transaksi & Deposit)*\n\nJam Operasional CS: Setiap hari pukul **08.00 - 23.00 WIB**.\n*Sistem deposit dan pemesanan di website tetap aktif 24 jam nonstop.*`,
        actions: [
          { label: "Chat WhatsApp Admin 1", href: "https://wa.me/6288706611370", isExternal: true },
          { label: "Chat WhatsApp Admin 2", href: "https://wa.me/6287767287284", isExternal: true },
        ],
      };
    }

    // DOMAIN I: GREETINGS
    if (bestDomain === "greetings") {
      return {
        reply: `Halo! Senang bisa menyapa Anda. Saya **Ry-AI**, asisten virtual cerdas dari **Ry-ITSolutions**.\n\nSaya siap memberikan informasi akurat mengenai:\n• **Buka Blokir IMEI All Operator** (Paket 3 Bulan: ${formattedPrice3Bln})\n• **Payment Gateway GoPay & Dynamic QRIS SaaS** (Aktivasi Rp 35.000, Perpanjang Rp 10.000/bln)\n• **Top Up Saldo RyPay Otomatis 24 Jam** (QRIS bebas biaya admin)\n• **Voucher Diskon & RyPoints Koin Reward**\n• **Cek Status Garansi Apple & Database CEIR** (Gratis)\n\nAda layanan spesifik yang ingin Anda tanyakan?`,
        actions: [
          { label: "Buka Blokir IMEI", href: "/unblock-imei" },
          { label: "Payment Gateway GoPay", href: "/gateway" },
          { label: "Top Up RyPay", href: "/topup" },
        ],
      };
    }

    // DEFAULT FALLBACK
    return {
      reply: `Terima kasih atas pertanyaan Anda seputar: **\"${userText}\"**.\n\nSebagai asisten cerdas **Ry-ITSolutions**, saya siap memberikan panduan akurat untuk:\n1. **Aktivasi & Buka Blokir IMEI All Operator** (Paket 3 Bulan, garansi penuh).\n2. **SaaS Payment Gateway GoPay & QRIS Dinamis** (Aktivasi Rp 35.000, perpanjang Rp 10.000/bln, 0% fee).\n3. **Top Up Saldo RyPay Otomatis** (QRIS bebas biaya admin 24 jam).\n4. **Voucher Diskon & Koin RyPoints Reward**.\n5. **Cek Garansi Apple & Database CEIR Gratis**.\n\nSilakan pilih menu di bawah atau tanyakan hal spesifik lainnya!`,
      actions: [
        { label: "Layanan Unblock IMEI", href: "/unblock-imei" },
        { label: "Gateway GoPay & QRIS", href: "/gateway" },
        { label: "Top Up Saldo RyPay", href: "/topup" },
      ],
    };
  };

  // Handle Send Message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!text || isTyping) return;

    try { playPopSound(); } catch {}

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking
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
    }, 400);
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
        setMessages([getWelcomeMessage()]);
      }
    });
  };

  // Render markdown-like formatted text with high-contrast, crystal-clear readability
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
    const parts = text.split(/(\**.*?\**)/g);
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
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-sky-300">v3.0</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Online • Data Akurat 100%</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Bersihkan riwayat percakapan"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. MESSAGES SCROLL VIEWPORT                                  */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3.5 no-scrollbar">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';

          if (!isAi) {
            // User bubble
            return (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[82%] sm:max-w-[75%] text-[13px] leading-relaxed shadow-xs">
                  <div>{msg.text}</div>
                  <div className="text-[9.5px] text-blue-200 text-right mt-1 font-normal">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          }

          // AI bubble
          return (
            <div key={msg.id} className="flex items-start gap-2.5 animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                <svg className="w-4 h-4 text-primary shrink-0 inline mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
              </div>

              <div className="flex-1 max-w-[88%] sm:max-w-[82%] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 text-[13px] shadow-xs leading-relaxed group">
                {/* Content */}
                <div className="space-y-1">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Direct Action Chips */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    {msg.actions.map((act, i) => {
                      if (act.isExternal) {
                        return (
                          <a
                            key={i}
                            href={act.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold shadow-2xs transition-all active:scale-95"
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
            placeholder="Tanyakan info layanan, aktivasi IMEI, gateway..."
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
