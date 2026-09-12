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

const STORAGE_KEY = 'ry_ai_chat_history_v7';

const QUICK_PROMPTS = [
  { label: 'Info Buka IMEI (3 Bulan)', query: 'Berapa harga dan ketentuan buka blokir IMEI 3 Bulan?' },
  { label: 'Unblock IMEI Jalur Fast?', query: 'Apakah ada unblock IMEI yang fast atau kilat?' },
  { label: 'Gateway GoPay & QRIS', query: 'Jelaskan fitur Payment Gateway GoPay & QRIS SaaS serta biaya aktivasinya' },
  { label: 'Voucher & Promo Aktif', query: 'Apakah ada kode kupon diskon atau voucher promo yang aktif saat ini?' },
  { label: 'Cek Garansi Apple & CEIR', query: 'Bagaimana cara cek garansi Apple dan status CEIR gratis?' },
  { label: 'Top Up Saldo RyPay', query: 'Bagaimana cara isi saldo RyPay otomatis via QRIS tanpa admin?' },
];

function formatRupiah(val: number): string {
  if (isNaN(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message (clean and accurate with active services)
  const getWelcomeMessage = (k?: LiveKnowledge | null): Message => {
    const imei3Bln = k?.imeiPackages?.find((p) => p.duration?.includes('3'))?.price || 155000;
    const activeCoupon = k?.coupons?.[0]?.code ? ` (Promo: \`${k.coupons[0].code}\`)` : '';

    return {
      id: 'welcome_init',
      sender: 'ai',
      text: `Halo! Saya **Ry-AI**, asisten cerdas resmi dari **Ry-ITSolutions**.\n\nSaya terhubung langsung ke **database sistem** secara *real-time*. Anda dapat menanyakan informasi terkini seputar:\n\n• **Buka Blokir IMEI All Operator** (Mulai ${formatRupiah(imei3Bln)}, garansi aktif 3 bulan)\n• **Payment Gateway GoPay & Dynamic QRIS SaaS** (Aktivasi Rp 35.000, 0% Fee Transaksi)\n• **Cek Status Garansi Apple & Database CEIR** (100% Gratis)\n• **Top Up Saldo RyPay Otomatis 24 Jam** (QRIS bebas biaya admin)\n• **Kupon Diskon & Koin RyPoints Reward**${activeCoupon}\n• **Bantuan CS Admin WhatsApp**\n\nSilakan pilih topik cepat di bawah atau ketik langsung pertanyaan Anda!`,
      timestamp: formatTime(new Date()),
      actions: [
        { label: 'Buka Menu IMEI', href: '/unblock-imei' },
        { label: 'Gateway GoPay', href: '/gateway' },
        { label: 'Cek Garansi', href: '/cek-garansi' },
        { label: 'Top Up Saldo', href: '/topup' },
      ],
    };
  };

  // 1. Fetch Real-time Database Knowledge on Mount
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

  // 2. Load chat history from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('ry_ai_chat_history');
      localStorage.removeItem('ry_ai_chat_history_v2');
      localStorage.removeItem('ry_ai_chat_history_v3');
      localStorage.removeItem('ry_ai_chat_history_v5');
      localStorage.removeItem('ry_ai_chat_history_v6');

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    setMessages([getWelcomeMessage(knowledge)]);
  }, [knowledge]);

  // 3. Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // 4. Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // =========================================================================
  // DYNAMIC SELF-LEARNING INTELLIGENCE & INTENT ENGINE
  // =========================================================================
  const generateAiResponse = (userText: string): { reply: string; actions?: Message['actions'] } => {
    const q = userText.toLowerCase().trim();
    const k = knowledge;

    // Fallback constants if knowledge is still loading
    const gwActivationFee = k?.gateway?.activationFee || 35000;
    const gwRenewalFee = k?.gateway?.renewalFee || 10000;
    const topupMin = k?.topup?.minDeposit || 10000;
    const csAdmin1 = k?.cs?.admin1 || '088706611370';
    const csAdmin2 = k?.cs?.admin2 || '087767287284';

    // -------------------------------------------------------------
    // INTENT SCORING
    // -------------------------------------------------------------
    const scores = {
      product: 0,
      gateway: 0,
      topup: 0,
      voucher: 0,
      rypoints: 0,
      ceir: 0,
      apple: 0,
      imei: 0,
      cs: 0,
      announcement: 0,
      reseller: 0,
      greetings: 0,
    };

    // PRODUCT / PACKAGES KEYWORDS (HANDLED ACCORDING TO SHOW_BELI_PAKET)
    if (q.includes('paket data') || q.includes('kuota') || q.includes('beli paket') || q.includes('tembak paket')) scores.product += 15;
    if (q.includes('masa aktif') || q.includes('perpanjang masa aktif') || q.includes('tambah masa aktif')) scores.product += 20;
    if (q.includes('akrab') || q.includes('super mini') || q.includes('jumbo') || q.includes('mega big') || q.includes('big extra')) scores.product += 20;
    if (q.includes('telkomsel') || q.includes('tsel') || q.includes('tri') || q.includes('three') || q.includes('indosat') || q.includes('isat') || q.includes('im3')) {
      if (!q.includes('unblock') && !q.includes('imei')) scores.product += 15;
    }
    if (q.includes('edukasi') || q.includes('conference') || q.includes('freedom') || q.includes('hifi') || q.includes('flexmax') || q.includes('xtra on') || q.includes('iflix')) {
      scores.product += 20;
    }

    // PAYMENT GATEWAY KEYWORDS
    if (q.includes('gateway') || q.includes('payment gateway') || q.includes('gobiz') || q.includes('merchant')) scores.gateway += 20;
    if (q.includes('saas')) scores.gateway += 10;
    if (q.includes('webhook') || q.includes('api key') || q.includes('integrasi') || q.includes('rest api')) scores.gateway += 10;
    if (q.includes('gopay') && !q.includes('topup') && !q.includes('saldo')) scores.gateway += 15;
    if (q.includes('qris') && !q.includes('isi saldo') && !q.includes('topup') && !q.includes('deposit')) scores.gateway += 6;
    if (scores.gateway > 0 && (q.includes('biaya') || q.includes('aktivasi') || q.includes('perpanjang') || q.includes('tarif') || q.includes('harga'))) {
      scores.gateway += 10;
    }

    // TOPUP & RYPAY KEYWORDS
    if (q.includes('topup') || q.includes('top up') || q.includes('isi saldo') || q.includes('deposit') || q.includes('tambah saldo')) scores.topup += 18;
    if (q.includes('rypay') && !q.includes('potong')) scores.topup += 10;
    if (q.includes('saldo') && !q.includes('gopay') && !q.includes('gateway')) scores.topup += 8;

    // VOUCHER KEYWORDS
    if (q.includes('voucher') || q.includes('kupon') || q.includes('diskon') || q.includes('promo') || q.includes('promoopening') || q.includes('septembercerah')) scores.voucher += 18;

    // ANNOUNCEMENTS
    if (q.includes('pengumuman') || q.includes('broadcast') || q.includes('berita') || q.includes('info web') || q.includes('update')) scores.announcement += 15;

    // RYPOINTS & KOIN
    if (q.includes('rypoints') || q.includes('koin') || q.includes('roda hoki') || q.includes('spin') || q.includes('trivia') || q.includes('tukar poin') || q.includes('poin')) scores.rypoints += 15;

    // CEIR
    if (q.includes('ceir') || q.includes('kemenperin') || q.includes('database ceir') || q.includes('blacklist')) scores.ceir += 15;

    // APPLE GARANSI
    if (q.includes('garansi apple') || q.includes('apple coverage') || q.includes('serial number') || q.includes('applecare') || q.includes('cek garansi')) scores.apple += 15;

    // IMEI & SINYAL
    if (q.includes('unblock imei') || q.includes('buka imei') || q.includes('paket imei') || q.includes('buka blokir')) scores.imei += 18;
    if (q.includes('imei') || q.includes('sinyal') || q.includes('no service') || q.includes('tidak ada layanan') || q.includes('baseband') || q.includes('begal')) scores.imei += 12;

    // CS & BANTUAN
    if (q.includes('cs') || q.includes('admin') || q.includes('customer support') || q.includes('whatsapp') || q.includes('wa admin') || q.includes('hubungi')) scores.cs += 12;

    // RESELLER
    if (q.includes('reseller') || q.includes('mitra') || q.includes('agen') || q.includes('grosir') || q.includes('bulk')) scores.reseller += 15;

    // GREETINGS
    if (/^(halo|hai|hi|pagi|siang|sore|malam|assalamualaikum|ping|p)$/i.test(q) || /^(halo|hai|hi|pagi|siang|sore|malam) /i.test(q)) scores.greetings += 10;

    // FIND HIGHEST SCORING DOMAIN
    let bestDomain = 'default';
    let maxScore = 0;
    for (const [dom, sc] of Object.entries(scores)) {
      if (sc > maxScore) {
        maxScore = sc;
        bestDomain = dom;
      }
    }

    // -------------------------------------------------------------
    // DOMAIN 1: PRODUCT / PACKAGE INQUIRY
    // -------------------------------------------------------------
    if (bestDomain === 'product') {
      // Respect the hide/show toggle: if showBeliPaket is not true, inform that it is temporarily in maintenance
      if (!k?.showBeliPaket) {
        return {
          reply: `### Layanan Paket Data Sedang Dinonaktifkan\n\nMohon maaf, saat ini menu pembelian/tembak paket data dan masa aktif kartu sedang **dinonaktifkan sementara (dalam pemeliharaan)** sampai waktu yang belum ditentukan.\n\nLayanan utama kami yang aktif dan siap melayani Anda 24 jam nonstop:\n1. **Buka Blokir IMEI All Operator** (Garansi 3 bulan penuh)\n2. **Payment Gateway GoPay & Dynamic QRIS SaaS** (Aktivasi Rp 35.000, 0% Fee Transaksi)\n3. **Cek Status Garansi Apple & Database CEIR** (100% Gratis)\n4. **Top Up Saldo RyPay Otomatis 24 Jam**\n\nSilakan gunakan menu layanan aktif yang tersedia di bawah!`,
          actions: [
            { label: 'Buka Menu IMEI', href: '/unblock-imei' },
            { label: 'Gateway GoPay', href: '/gateway' },
            { label: 'Cek Garansi Apple', href: '/cek-garansi' },
            { label: 'Top Up Saldo RyPay', href: '/topup' },
          ],
        };
      }

      // If showBeliPaket is true (enabled in future):
      const allPkgs: LivePackage[] = k?.packages || [];
      let filterCarrier: string | null = null;
      if (q.includes('xl') || q.includes('axiata')) filterCarrier = 'XL';
      else if (q.includes('telkomsel') || q.includes('tsel')) filterCarrier = 'Telkomsel';
      else if (q.includes('tri') || q.includes('three') || q.includes(' 3 ')) filterCarrier = 'Tri';
      else if (q.includes('indosat') || q.includes('isat') || q.includes('im3')) filterCarrier = 'Indosat';

      const isMasaAktif = q.includes('masa aktif') || q.includes('perpanjang');
      const isAkrab = q.includes('akrab');

      let matches = allPkgs.filter((pkg) => {
        if (filterCarrier && pkg.carrier !== filterCarrier) return false;
        if (isMasaAktif && pkg.type !== 'masa_aktif' && !pkg.name.toLowerCase().includes('masa aktif')) return false;
        if (isAkrab && pkg.type !== 'akrab' && !pkg.name.toLowerCase().includes('akrab')) return false;
        return true;
      });

      const topMatches = (matches.length > 0 ? matches : allPkgs).slice(0, 6);
      const pkgListText = topMatches.map((pkg) => {
        const cleanName = pkg.name.replace(/\[.*?\]/g, '').trim();
        return `• **${cleanName || pkg.name}**\n  - Provider: **${pkg.carrier}**\n  - Harga: **${formatRupiah(pkg.price)}**`;
      }).join('\n\n');

      return {
        reply: `### Hasil Pencarian Paket Real-Time\n\nBerikut daftar harga paket yang terhubung langsung dengan sistem database:\n\n${pkgListText}`,
        actions: [
          { label: 'Buka Halaman Beli Paket', href: '/beli-paket' },
          { label: 'Isi Saldo RyPay', href: '/topup' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 2: DYNAMIC UNBLOCK IMEI
    // -------------------------------------------------------------
    if (bestDomain === 'imei') {
      const imeiPkgs: LiveImeiPackage[] = k?.imeiPackages || [];
      const slowRange = k?.speeds?.slow?.range || 'Max kirim 14:00 WIB, selesai max 00:00 WIB';
      const fastStatus = k?.speeds?.fast?.status || 'hidden';

      const isSpeed = q.includes('fast') || q.includes('kilat') || q.includes('cepat') || q.includes('express') || q.includes('berapa lama') || q.includes('selesai kapan');
      const isPermanent = q.includes('permanen') || q.includes('permanent') || q.includes('resmi') || q.includes('bea cukai');

      if (isSpeed) {
        return {
          reply: `### Kecepatan & Estimasi Pengerjaan Unblock IMEI\n\n• **Jalur Reguler (Aktif)**:\n  - Ketentuan: ${slowRange}.\n  - Estimasi pengerjaan: Selesai di hari yang sama maksimal pukul 00:00 WIB untuk pesanan sebelum batas kirim.\n• **Jalur Fast / Kilat**: Status saat ini **${fastStatus === 'active' ? 'TERSEDIA' : 'NONAKTIF'}** demi menjaga kestabilan antrean jaringan.`,
          actions: [
            { label: 'Form Order IMEI', href: '/unblock-imei' },
            { label: 'Hubungi Admin CS', href: `https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}`, isExternal: true },
          ],
        };
      }

      if (isPermanent) {
        return {
          reply: `### Transparansi Layanan IMEI Ry-ITSolutions\n\n• Kami **TIDAK MENYEDIAKAN paket permanen ataupun bea cukai**.\n• Layanan yang aktif di sistem adalah paket tergaransi resmi selama masa aktif.\n• Selama masa aktif paket, jika sinyal sempat terputus maka **DIGARANSI proses ulang GRATIS** hingga aktif kembali.\n• Mendukung seluruh kartu: Telkomsel, Indosat, XL, Tri, dan Smartfren.`,
          actions: [
            { label: 'Buka Form IMEI', href: '/unblock-imei' },
            { label: 'Cek Status CEIR', href: '/cek-ceir' },
          ],
        };
      }

      // Build live package list
      let imeiListText = '';
      if (imeiPkgs.length > 0) {
        imeiListText = imeiPkgs.map((p) => `• **Paket ${p.duration}**: **${formatRupiah(p.price)}** / IMEI (Garansi Penuh ${p.duration})`).join('\n');
      } else {
        imeiListText = '• **Paket 3 Bulan**: **Rp 155.000** / IMEI (Garansi Penuh 3 Bulan)';
      }

      return {
        reply: `### Daftar Paket & Tarif Unblock IMEI Real-Time\n\nBerikut paket buka blokir sinyal IMEI yang aktif di database sistem:\n\n${imeiListText}\n\n**Spesifikasi & Ketentuan:**\n• All Operator (Telkomsel, Indosat Ooredoo, XL Axiata, Tri, Smartfren)\n• Garansi penuh selama durasi paket 3 bulan\n• Syarat wajib: IC Baseband normal (muncul status \"Tidak Ada Layanan / No Service\", bukan \"Tidak Ada SIM\")\n• Estimasi pengerjaan: ${slowRange}`,
        actions: [
          { label: 'Order Unblock IMEI', href: '/unblock-imei' },
          { label: 'Isi Saldo RyPay', href: '/topup' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 3: DYNAMIC VOUCHERS & PROMOS
    // -------------------------------------------------------------
    if (bestDomain === 'voucher') {
      const liveCoupons: LiveCoupon[] = k?.coupons || [];

      if (liveCoupons.length > 0) {
        const couponList = liveCoupons.map((c) => {
          const pot = c.discountType === 'percent' ? `${c.discountValue}%` : formatRupiah(c.discountValue);
          return `• Kode Kupon: **\`${c.code}\`**\n  - Potongan: **${pot}**\n  - Minimal Transaksi: **${formatRupiah(c.minOrder)}**`;
        }).join('\n\n');

        return {
          reply: `### Kode Voucher & Promo Diskon Aktif\n\nBerikut kode promo yang sedang **AKTIF** di database sistem Ry-ITSolutions:\n\n${couponList}\n\n*Masukkan kode kupon di atas pada kolom Voucher saat melakukan checkout pesanan!*`,
          actions: [
            { label: 'Klaim di Menu Voucher', href: '/vouchers' },
            { label: 'Order Layanan Sekarang', href: '/unblock-imei' },
          ],
        };
      }

      return {
        reply: `### Informasi Promo & Voucher Diskon\n\nSaat ini belum ada kode kupon voucher publik yang aktif di sistem. Pantau terus halaman **Voucher** atau pengumuman dashboard untuk promo berikutnya!`,
        actions: [
          { label: 'Buka Halaman Voucher', href: '/vouchers' },
          { label: 'Main Games RyPoints', href: '/games' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 4: PAYMENT GATEWAY (GOPAY & DYNAMIC QRIS SAAS)
    // -------------------------------------------------------------
    if (bestDomain === 'gateway') {
      const isPricing = q.includes('biaya') || q.includes('harga') || q.includes('tarif') || q.includes('aktivasi') || q.includes('perpanjang') || q.includes('berapa');
      const isApi = q.includes('api') || q.includes('webhook') || q.includes('curl') || q.includes('php') || q.includes('node') || q.includes('integrasi');

      if (isPricing) {
        return {
          reply: `### Biaya & Ketentuan Payment Gateway GoPay & QRIS SaaS\n\nSolusi gateway pembayaran QRIS otomatis untuk website toko online, bot Telegram/WhatsApp, dan aplikasi Anda:\n\n• **Biaya Aktivasi Perdana**: **${formatRupiah(gwActivationFee)}** (Sudah termasuk lisensi aktif 30 hari penuh).\n• **Perpanjangan Bulanan**: Sangat terjangkau, hanya **${formatRupiah(gwRenewalFee)} / bulan** (bisa perpanjang manual atau potong saldo RyPay otomatis).\n• **Fee Transaksi 0% (GRATIS)**: Tanpa potongan persenan per transaksi. 100% uang pembayaran masuk utuh ke rekening GoPay/GoBiz Anda.\n• **Direct Settlement Instan**: Uang langsung masuk detik itu juga ke akun GoPay pemilik tanpa perlu withdraw pihak ketiga.\n• **Pairing Tanpa Ribet**: Cukup masukkan nomor HP GoBiz & verifikasi OTP tanpa berkas legalitas PT/CV.`,
          actions: [
            { label: `Aktivasi Gateway (${formatRupiah(gwActivationFee)})`, href: '/gateway' },
            { label: 'Dokumentasi API', href: '/gateway' },
          ],
        };
      }

      if (isApi) {
        return {
          reply: `### Integrasi REST API & Webhook Callback Gateway\n\nRy-ITSolutions menyediakan REST API berkecepatan tinggi untuk menghubungkan pembayaran otomatis ke sistem Anda:\n\n• **Endpoint Buat QRIS**: \`POST /api/v1/gateway/create-qris\`\n• **Webhook Notification**: Mengirim notifikasi webhook secara real-time (\`0.2 - 0.5 detik\`) saat pembayaran sukses (\`payment.success\`).\n• **Keamanan Tinggi**: Dilengkapi HMAC-SHA256 signature verification.\n• **Sampel Integrasi**: Tersedia kode siap pakai untuk cURL, PHP (Laravel/CI), Node.js, dan Python.\n\nKunjungi menu **Gateway** untuk mengaktifkan lisensi dan mengelola API Key Anda!`,
          actions: [
            { label: 'Kelola API Key Gateway', href: '/gateway' },
          ],
        };
      }

      return {
        reply: `### Fitur & Keunggulan Payment Gateway GoPay & QRIS SaaS\n\n1. **Aktivasi Terjangkau**: Biaya perdana **${formatRupiah(gwActivationFee)}** (30 hari), perpanjangan hanya **${formatRupiah(gwRenewalFee)} / bulan**.\n2. **0% Fee Transaksi**: Uang pembayaran masuk 100% utuh tanpa potongan komisi.\n3. **Direct Settlement**: Dana langsung detik itu juga masuk ke saldo GoPay/GoBiz pemilik.\n4. **Webhook Super Cepat**: Callback webhook 0.2 - 0.5 detik untuk eksekusi pesanan otomatis.\n5. **Dynamic QRIS**: Generate kode QRIS otomatis sesuai nominal unik transaksi.`,
        actions: [
          { label: 'Buka Menu Gateway', href: '/gateway' },
          { label: 'Dokumentasi API', href: '/gateway' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 5: TOP UP SALDO & RYPAY
    // -------------------------------------------------------------
    if (bestDomain === 'topup') {
      const isFee = q.includes('biaya') || q.includes('admin') || q.includes('fee') || q.includes('gratis') || q.includes('potongan');

      if (isFee) {
        return {
          reply: `### Biaya & Ketentuan Top Up RyPay\n\n• **Biaya Admin: Rp 0 (BEBAS BIAYA ADMIN)**.\n• **Minimal Top Up**: Mulai dari **${formatRupiah(topupMin)}**.\n• **Metode Pembayaran**: Menggunakan **Dynamic QRIS Otomatis** yang mendukung seluruh Bank (BCA, Mandiri, BRI, BNI, BSI) & E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).\n• **Kecepatan Masuk**: Saldo RyPay otomatis bertambah dalam **2 - 5 detik** setelah QRIS dibayar (sistem aktif 24 jam nonstop).`,
          actions: [
            { label: 'Top Up RyPay Sekarang', href: '/topup' },
            { label: 'Cek Riwayat Saldo', href: '/history' },
          ],
        };
      }

      return {
        reply: `### Panduan Isi Saldo RyPay Otomatis (QRIS 24 Jam)\n\nRyPay adalah saldo dompet digital Anda di Ry-ITSolutions untuk memesan Unblock IMEI, aktivasi Gateway, dan layanan digital lainnya secara instan.\n\n**Cara Top Up:**\n1. Buka menu **Top Up** (\`/topup\`).\n2. Masukkan nominal deposit yang diinginkan (minimal ${formatRupiah(topupMin)}).\n3. Klik **Lanjut Pembayaran** untuk menampilkan kode QRIS dinamis.\n4. Scan QRIS dengan m-Banking atau e-Wallet pilihan Anda.\n5. Selesai! Saldo otomatis masuk dalam 2-5 detik tanpa perlu konfirmasi manual ke admin.`,
        actions: [
          { label: 'Isi Saldo RyPay', href: '/topup' },
          { label: 'Riwayat Transaksi', href: '/history' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 6: ANNOUNCEMENTS & UPDATES
    // -------------------------------------------------------------
    if (bestDomain === 'announcement') {
      const anns = k?.announcements || [];
      if (anns.length > 0) {
        const annList = anns.map((a, idx) => `${idx + 1}. \"${a.message}\"`).join('\n');
        return {
          reply: `### Pengumuman & Update Website Terkini\n\nBerikut pengumuman aktif dari admin yang sedang berjalan di website:\n\n${annList}`,
          actions: [
            { label: 'Lihat Dashboard', href: '/dashboard' },
            { label: 'Buka Form IMEI', href: '/unblock-imei' },
          ],
        };
      }
      return {
        reply: `### Informasi & Berita Website\n\nSaat ini seluruh sistem berjalan normal (100% Operational) tanpa pengumuman khusus. Pemesanan unblock IMEI dan gateway aktif 24 jam!`,
        actions: [
          { label: 'Buka Dashboard', href: '/dashboard' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 7: RYPOINTS & REWARD
    // -------------------------------------------------------------
    if (bestDomain === 'rypoints') {
      return {
        reply: `### Fitur Koin RyPoints & Roda Hoki (Games)\n\nRyPoints adalah koin reward loyalitas pengguna di Ry-ITSolutions:\n\n• **Cara Mendapatkan**: Mainkan **Roda Hoki (Spin Wheel)** harian dan jawab kuis trivia di menu Games setiap hari.\n• **Kegunaan**: Koin RyPoints dapat ditukarkan langsung menjadi saldo RyPay untuk bertransaksi hemat!\n• **Bebas Syarat**: Setiap user terdaftar berhak memutar spin wheel harian secara gratis.`,
        actions: [
          { label: 'Main Games RyPoints', href: '/games' },
          { label: 'Cek Saldo RyPay', href: '/dashboard' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 8: CEIR DATABASE CHECK
    // -------------------------------------------------------------
    if (bestDomain === 'ceir') {
      return {
        reply: `### Layanan Cek Status Database CEIR\n\nLayanan untuk mengetahui apakah 15 digit nomor IMEI perangkat Anda terdaftar di database CEIR (Kemenperin / Bea Cukai / Kominfo):\n\n• **Akses Layanan**: Kunjungi menu **Cek CEIR** (\`/cek-ceir\`).\n• **Input IMEI**: Masukkan 15 digit IMEI iPhone / Android Anda.\n• **Hasil Cepat**: Menampilkan status keabsahan sinyal perangkat dalam hitungan detik.`,
        actions: [
          { label: 'Cek Status CEIR Sekarang', href: '/cek-ceir' },
          { label: 'Buka Blokir IMEI', href: '/unblock-imei' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 9: APPLE WARRANTY CHECK
    // -------------------------------------------------------------
    if (bestDomain === 'apple') {
      return {
        reply: `### Layanan Cek Garansi Apple Resmi (100% Gratis)\n\nCek keaslian perangkat, model iPhone/iPad/Mac, dan masa garansi AppleCare langsung dari basis data resmi Apple:\n\n• **Biaya**: **100% GRATIS** tanpa potong saldo.\n• **Data Ditampilkan**: Model perangkat, warna, kapasitas penyimpanan, tanggal pembelian, estimasi garansi aktif, dan cakupan perbaikan AppleCare.\n• **Cara Cek**: Masukkan Serial Number perangkat Anda di menu **Cek Garansi** (\`/cek-garansi\`).`,
        actions: [
          { label: 'Cek Garansi Apple Gratis', href: '/cek-garansi' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 10: RESELLER & MITRA
    // -------------------------------------------------------------
    if (bestDomain === 'reseller') {
      return {
        reply: `### Program Kemitraan & Reseller Grosir\n\nBagi Anda pemilik konter HP, toko handphone, atau pelaku usaha yang membutuhkan transaksi dalam jumlah banyak (Bulk IMEI atau Gateway Payment):\n\n• Kami menyediakan **penawaran harga khusus mitra grosir**.\n• Prioritas pemrosesan pesanan dan jalur support khusus.\n• Silakan hubungi langsung WhatsApp Admin Kemitraan kami untuk berdiskusi lebih lanjut!`,
        actions: [
          { label: 'Hubungi Admin Kemitraan', href: `https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}`, isExternal: true },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 11: CS & WHATSAPP ADMIN
    // -------------------------------------------------------------
    if (bestDomain === 'cs') {
      return {
        reply: `### Kontak Layanan Pelanggan (CS Admin)\n\nTim Customer Support Ry-ITSolutions siap membantu kendala transaksi atau pertanyaan teknis Anda:\n\n• **Admin 1**: [${csAdmin1}](https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}) *(Layanan IMEI & Gateway)*\n• **Admin 2**: [${csAdmin2}](https://wa.me/${csAdmin2.replace(/[^0-9]/g, '')}) *(Bantuan Transaksi & Deposit)*\n\nJam Operasional CS: Setiap hari pukul **${k?.cs?.hours || '08.00 - 23.00 WIB'}**.\n*Sistem deposit dan pemesanan di website tetap aktif 24 jam nonstop.*`,
        actions: [
          { label: 'Chat WhatsApp Admin 1', href: `https://wa.me/${csAdmin1.replace(/[^0-9]/g, '')}`, isExternal: true },
          { label: 'Chat WhatsApp Admin 2', href: `https://wa.me/${csAdmin2.replace(/[^0-9]/g, '')}`, isExternal: true },
        ],
      };
    }

    // -------------------------------------------------------------
    // DOMAIN 12: GREETINGS
    // -------------------------------------------------------------
    if (bestDomain === 'greetings') {
      return {
        reply: `Halo! Senang bisa menyapa Anda. Saya **Ry-AI**, asisten virtual cerdas resmi dari **Ry-ITSolutions**.\n\nSaya selalu tersinkronisasi otomatis dengan database sistem:\n• **Buka Blokir IMEI All Operator** (Garansi aktif 3 bulan)\n• **Payment Gateway GoPay & Dynamic QRIS SaaS** (Aktivasi Rp 35.000, Fee 0%)\n• **Top Up Saldo RyPay Otomatis 24 Jam** (QRIS bebas biaya admin)\n• **Voucher Promo Diskon & Koin RyPoints**\n• **Cek Garansi Apple & Database CEIR** (Gratis)\n\nAda layanan yang ingin Anda tanyakan?`,
        actions: [
          { label: 'Buka Blokir IMEI', href: '/unblock-imei' },
          { label: 'Gateway GoPay', href: '/gateway' },
          { label: 'Top Up RyPay', href: '/topup' },
        ],
      };
    }

    // -------------------------------------------------------------
    // DEFAULT FALLBACK
    // -------------------------------------------------------------
    return {
      reply: `Terima kasih atas pertanyaan Anda seputar: **\"${userText}\"**.\n\nSebagai asisten cerdas **Ry-ITSolutions** yang terhubung langsung ke database sistem, saya siap memandu Anda untuk:\n\n1. **Aktivasi & Buka Blokir IMEI All Operator** (Garansi 3 bulan penuh).\n2. **SaaS Payment Gateway GoPay & QRIS Dinamis** (Aktivasi Rp 35.000, 0% fee).\n3. **Top Up Saldo RyPay Otomatis 24 Jam** (QRIS bebas biaya admin).\n4. **Kupon Promo & Koin RyPoints Reward**.\n5. **Cek Garansi Apple & Database CEIR Gratis**.\n\nSilakan pilih menu di bawah atau ketik topik yang ingin Anda tanyakan!`,
      actions: [
        { label: 'Layanan Unblock IMEI', href: '/unblock-imei' },
        { label: 'Gateway GoPay & QRIS', href: '/gateway' },
        { label: 'Top Up Saldo RyPay', href: '/topup' },
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

    // AI thinking
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
    }, 350);
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
        setMessages([getWelcomeMessage(knowledge)]);
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

      if (/^\\d+\\.\\s/.test(line)) {
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
                Live Sync
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span>{isKnowledgeReady ? 'Tersinkron Database Real-Time' : 'Menghubungkan ke Database...'}</span>
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
            placeholder="Tanyakan info layanan, unblock IMEI, gateway GoPay, promo..."
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
