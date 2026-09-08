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

const QUICK_PROMPTS = [
  { label: '⚡ Buka Blokir IMEI', query: 'Bagaimana cara buka blokir IMEI All Operator dan berapa harganya?' },
  { label: '💳 Payment Gateway GoPay', query: 'Jelaskan tentang fitur Payment Gateway GoPay & QRIS SaaS 10rb/bulan' },
  { label: '🔍 Cek Garansi Apple & CEIR', query: 'Bagaimana cara cek garansi Apple dan status CEIR gratis?' },
  { label: '💰 Cara Topup Saldo QRIS', query: 'Bagaimana cara isi saldo akun otomatis via QRIS tanpa admin?' },
  { label: '🛠️ Integrasi API & Webhook', query: 'Bagaimana dokumentasi integrasi API webhook Ry-ITSolutions?' },
  { label: '💬 Hubungi CS Admin WhatsApp', query: 'Saya butuh bantuan customer support WhatsApp admin' },
];

export default function AiChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ry_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    // Initial welcome message
    const welcomeMsg: Message = {
      id: 'welcome_1',
      sender: 'ai',
      text: 'Halo! Saya **Ry-AI**, asisten virtual cerdas resmi **Ry-ITSolutions**.\n\nAda yang bisa saya bantu hari ini? Tanyakan apa saja seputar:\n• **Buka Blokir IMEI All Operator** (iPhone & Android)\n• **Payment Gateway GoPay & Dynamic QRIS SaaS** (Langganan 10rb/bln, Fee 0%)\n• **Cek Status Garansi Apple & Database CEIR** (Gratis)\n• **Top Up Saldo Akun Otomatis 24 Jam** (QRIS Bebas Admin)\n• **Integrasi API, Webhook, & Solusi IT**\n\nSilakan pilih topik cepat di bawah atau ketik langsung pertanyaan Anda!',
      timestamp: formatTime(new Date()),
      actions: [
        { label: 'Buka Menu IMEI', href: '/unblock-imei', icon: '⚡' },
        { label: 'Gateway GoPay', href: '/gateway', icon: '💳' },
        { label: 'Cek Garansi', href: '/cek-garansi', icon: '🔍' },
        { label: 'Top Up Saldo', href: '/topup', icon: '💰' },
      ],
    };
    setMessages([welcomeMsg]);
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('ry_ai_chat_history', JSON.stringify(messages));
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

  // Generate Intelligent Contextual AI Response
  const generateAiResponse = (userText: string): { reply: string; actions?: Message['actions'] } => {
    const q = userText.toLowerCase();

    // 1. IMEI & Signal Unblock
    if (q.includes('imei') || q.includes('sinyal') || q.includes('begal') || q.includes('kemenperin') || q.includes('unblock')) {
      return {
        reply: '### 📶 Layanan Buka Blokir IMEI All Operator\n\nLayanan buka blokir IMEI di Ry-ITSolutions ditujukan untuk **iPhone (Inter / All Series) & Android** yang mengalami hilang sinyal (*No Service* / Terblokir Bea Cukai & Kemenperin).\n\n**Keunggulan Layanan:**\n• Mendukung **All Operator**: Telkomsel, Indosat Ooredoo, XL Axiata, Tri, dan Smartfren.\n• **Proses Kilat**: 15 - 45 Menit langsung ON.\n• **Terverifikasi Resmi Database CEIR** Kemenperin & Bea Cukai.\n• **Garansi 100%**: Jika sinyal gagal aktif, dana akan dikembalikan / diproses ulang.\n\n**Pilihan Durasi & Estimasi Tarif:**\n1. **Paket 1 Bulan**: Mulai Rp 60.000\n2. **Paket 3 Bulan**: Mulai Rp 120.000\n3. **Paket Garansi Resmi Permanen**: Mulai Rp 250.000\n\nAnda bisa langsung mendaftarkan 15 digit IMEI perangkat Anda di menu **Buka IMEI**.',
        actions: [
          { label: 'Buka Form IMEI', href: '/unblock-imei', icon: '⚡' },
          { label: 'Cek Status CEIR', href: '/cek-ceir', icon: '🔍' },
        ],
      };
    }

    // 2. GoPay Payment Gateway & QRIS
    if (q.includes('gateway') || q.includes('gopay') || q.includes('qris') || q.includes('gobiz') || q.includes('pembayaran') || q.includes('saas')) {
      return {
        reply: '### 💳 Payment Gateway GoPay & Dynamic QRIS SaaS\n\nSolusi Payment Gateway otomatis yang dirancang khusus untuk pemilik website toko online, bot Telegram/WhatsApp, dan aplikasi digital.\n\n**Fitur Utama:**\n• **Biaya Langganan Super Murah**: Hanya **Rp 10.000 / 30 Hari**.\n• **Fee Transaksi 0%**: Bebas potongan pihak ketiga. 100% uang pembayaran masuk utuh ke akun GoPay Merchant / GoBiz Anda.\n• **Direct Settlement**: Uang langsung masuk ke GoPay Anda secara instan tanpa tertahan.\n• **Real-Time Webhook Callback**: Respon super cepat **0.2 - 0.5 detik** untuk approve pesanan otomatis.\n• **Pairing Sangat Mudah**: Cukup masukkan nomor HP GoBiz & OTP tanpa perlu ribet urus berkas legalitas PT/CV.\n• **Dokumentasi Lengkap**: Tersedia contoh integrasi cURL, PHP, Node.js, dan Python.',
        actions: [
          { label: 'Coba Gateway GoPay', href: '/gateway', icon: '💳' },
          { label: 'Dokumentasi API', href: '/gateway', icon: '📚' },
        ],
      };
    }

    // 3. Cek Garansi Apple & CEIR
    if (q.includes('garansi') || q.includes('apple') || q.includes('coverage') || q.includes('serial') || q.includes('cek')) {
      return {
        reply: '### 🔍 Cek Status Garansi Apple & CEIR Gratis\n\nFitur diagnostik mandiri untuk memeriksa keaslian dan status legalitas perangkat gadget Anda secara instan dalam 3 detik.\n\n**Yang Dapat Diperiksa:**\n• **Apple Coverage Status**: Mengetahui apakah iPhone/iPad/Mac masih terlindungi garansi resmi AppleCare+ atau sudah expired.\n• **Validasi Serial Number**: Memastikan nomor seri terdaftar resmi di basis data Apple.\n• **Status Database CEIR**: Memastikan apakah nomor IMEI perangkat terdaftar resmi di Kemenperin atau berstatus blacklist.\n\n**Biaya**: **100% GRATIS** tanpa dipungut biaya sepeserpun.',
        actions: [
          { label: 'Cek Garansi Sekarang', href: '/cek-garansi', icon: '🔍' },
          { label: 'Cek Database CEIR', href: '/cek-ceir', icon: '📱' },
        ],
      };
    }

    // 4. Top Up Saldo Akun
    if (q.includes('topup') || q.includes('saldo') || q.includes('isi saldo') || q.includes('deposit')) {
      return {
        reply: '### 💰 Top Up Saldo Akun Ry-ITSolutions\n\nIsi saldo akun Anda untuk bertransaksi berbagai layanan IT secara otomatis 24 jam nonstop.\n\n**Keunggulan Top Up:**\n• **Bebas Biaya Admin (0 Rupiah)**.\n• **Metode Pembayaran Lengkap via QRIS**: Mendukung semua Bank (BCA, Mandiri, BRI, BNI, BSI) & E-Wallet (GoPay, OVO, Dana, ShopeePay, LinkAja).\n• **Auto Approve Instan**: Saldo otomatis masuk ke akun Anda dalam 2 - 5 detik setelah pembayaran berhasil.\n• **Aktif 24 Jam Nonstop**: Bisa deposit kapan saja bahkan di tengah malam.',
        actions: [
          { label: 'Isi Saldo Akun', href: '/topup', icon: '💰' },
          { label: 'Riwayat Transaksi', href: '/history', icon: '📜' },
        ],
      };
    }

    // 5. API & Developer Integration
    if (q.includes('api') || q.includes('webhook') || q.includes('developer') || q.includes('coding') || q.includes('bot')) {
      return {
        reply: '### 🛠️ Integrasi API & Webhook Callback\n\nRy-ITSolutions menyediakan REST API berkecepatan tinggi untuk menghubungkan sistem transaksi Anda:\n\n• **Endpoint Pembuatan QRIS**: `POST /api/v1/gateway/create-qris`\n• **Webhook Event**: Menerima notifikasi instan saat pembayaran lunas `payment.success`\n• **Keamanan**: Dilengkapi HMAC-SHA256 signature verification untuk memastikan validitas data.\n• **Library**: Kompatibel dengan semua bahasa pemrograman (PHP Laravel/CodeIgniter, Node.js Express/Nest, Python Django/FastAPI, Go, dll).\n\nSilakan kunjungi halaman **Gateway** untuk mengaktifkan lisensi dan mengunduh sampel kode integrasi!',
        actions: [
          { label: 'Kelola API Key & Lisensi', href: '/gateway', icon: '🔑' },
        ],
      };
    }

    // 6. Customer Support / WhatsApp
    if (q.includes('cs') || q.includes('admin') || q.includes('wa') || q.includes('whatsapp') || q.includes('bantuan') || q.includes('hubungi') || q.includes('kontak')) {
      return {
        reply: '### 📞 Hubungi Layanan Pelanggan (CS Admin)\n\nTim Customer Support Ry-ITSolutions siap membantu kendala transaksi atau pertanyaan teknis Anda:\n\n• **Admin 1**: [088706611370](https://wa.me/6288706611370) *(Layanan IMEI & Gateway)*\n• **Admin 2**: [087767287284](https://wa.me/6287767287284) *(Bantuan Transaksi & Deposit)*\n\nJam Operasional CS: Setiap hari pukul **08.00 - 23.00 WIB**. Sistem pembayaran dan pemrosesan otomatis tetap aktif 24 jam nonstop.',
        actions: [
          { label: 'Chat WhatsApp Admin 1', href: 'https://wa.me/6288706611370', isExternal: true, icon: '💬' },
          { label: 'Chat WhatsApp Admin 2', href: 'https://wa.me/6287767287284', isExternal: true, icon: '💬' },
        ],
      };
    }

    // 7. Reseller / Kemitraan
    if (q.includes('reseller') || q.includes('mitra') || q.includes('agen')) {
      return {
        reply: '### 🤝 Kemitraan & Reseller\n\nSaat ini fitur pendaftaran reseller otomatis sedang kami optimasi untuk pembaruan sistem yang lebih baik.\n\nNamun, jika Anda memiliki konter HP, toko online, atau kebutuhan transaksi dalam volume besar (Grosir/Bulk IMEI/Gateway), Anda bisa langsung menghubungi CS Admin kami di WhatsApp untuk mendapatkan penawaran harga khusus mitra!',
        actions: [
          { label: 'Hubungi Admin Kemitraan', href: 'https://wa.me/6288706611370', isExternal: true, icon: '💬' },
        ],
      };
    }

    // 8. Greetings
    if (q.includes('halo') || q.includes('hai') || q.includes('hi') || q.includes('pagi') || q.includes('siang') || q.includes('malam')) {
      return {
        reply: 'Halo! Senang bisa menyapa Anda. Saya **Ry-AI**, asisten virtual cerdas dari **Ry-ITSolutions**.\n\nSaya siap membantu Anda memberikan informasi tarif, panduan aktivasi IMEI, integrasi payment gateway GoPay, cara cek garansi, hingga bantuan deposit saldo.\n\nAda layanan spesifik yang ingin Anda tanyakan?',
        actions: [
          { label: 'Buka Blokir IMEI', href: '/unblock-imei', icon: '⚡' },
          { label: 'Payment Gateway GoPay', href: '/gateway', icon: '💳' },
        ],
      };
    }

    // 9. Default Intelligent Fallback
    return {
      reply: `Terima kasih atas pertanyaannya mengenai: **"${userText}"**.\n\nSebagai asisten cerdas **Ry-ITSolutions**, saya dapat membantu Anda seputar:\n1. **Aktivasi & Buka Blokir IMEI All Operator** (iPhone/Android hilang sinyal).\n2. **SaaS Payment Gateway GoPay & QRIS Dinamis** (Langganan 10rb/bulan, fee 0%).\n3. **Cek Garansi Apple & Database CEIR** (Gratis dan instan).\n4. **Top Up Saldo Akun Otomatis** (QRIS bebas biaya admin 24 jam).\n\nSilakan klik salah satu menu di bawah atau jelaskan lebih detail kendala yang sedang Anda hadapi!`,
      actions: [
        { label: 'Lihat Layanan IMEI', href: '/unblock-imei', icon: '⚡' },
        { label: 'Lihat Gateway GoPay', href: '/gateway', icon: '💳' },
        { label: 'Chat WhatsApp CS', href: 'https://wa.me/6288706611370', isExternal: true, icon: '💬' },
      ],
    };
  };

  // Handle Send Message
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    try { playPopSound(); } catch {}

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate natural AI thinking & response
    setTimeout(() => {
      const { reply, actions } = generateAiResponse(query);
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: formatTime(new Date()),
        actions,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      try { playDingSound(); } catch {}
    }, 500);
  };

  // Handle Copy Message Text
  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Clear Chat History
  const handleClearChat = () => {
    Swal.fire({
      title: 'Reset Percakapan?',
      text: 'Riwayat percakapan dengan Ry-AI akan dibersihkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066cc',
      cancelButtonColor: '#71717A',
      confirmButtonText: 'Ya, Bersihkan',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('ry_ai_chat_history');
        const welcomeMsg: Message = {
          id: `welcome_${Date.now()}`,
          sender: 'ai',
          text: 'Riwayat percakapan telah dibersihkan. Ada yang bisa **Ry-AI** bantu kembali?',
          timestamp: formatTime(new Date()),
          actions: [
            { label: 'Buka Menu IMEI', href: '/unblock-imei', icon: '⚡' },
            { label: 'Gateway GoPay', href: '/gateway', icon: '💳' },
          ],
        };
        setMessages([welcomeMsg]);
      }
    });
  };

  // Render Markdown-like Formatted Text
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-sm text-primary dark:text-primary mt-1 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }

      if (line.startsWith('• ')) {
        const content = line.substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 leading-relaxed">
            <span className="text-primary font-bold">•</span>
            <span>{parseBold(content)}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={idx} className="my-0.5 leading-relaxed pl-2">
            {parseBold(line)}
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="leading-relaxed my-0.5">
          {parseBold(line)}
        </p>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-canvas select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP CHAT HEADER BAR (Pinned under top navigation)         */}
      {/* ============================================================ */}
      <div className="h-12 px-3.5 sm:px-4 flex items-center justify-between border-b border-hairline bg-canvas/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          {/* AI Avatar with subtle pulse dot */}
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center shadow-xs">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="absolute 0 bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-canvas" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-ink">Ry-AI Assistant</h2>
              <span className="text-[9px] font-bold px-1 rounded bg-primary/10 text-primary">v2.5</span>
            </div>
            <p className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Online • Konsultan IT 24/7</span>
            </p>
          </div>
        </div>

        {/* Clear Conversation Button */}
        <button
          onClick={handleClearChat}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 border border-hairline text-[11px] font-medium transition-all active:scale-95"
          title="Bersihkan Percakapan"
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
            // User message bubble (sleek modern right aligned)
            return (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="bg-primary text-white rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[82%] sm:max-w-[75%] text-[13px] leading-relaxed shadow-xs">
                  <div>{msg.text}</div>
                  <div className="text-[9.5px] text-white/70 text-right mt-1 font-normal">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          }

          // AI message bubble (clean modern card left aligned)
          return (
            <div key={msg.id} className="flex items-start gap-2.5 animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                ✨
              </div>

              <div className="flex-1 max-w-[88%] sm:max-w-[82%] bg-surface-pearl dark:bg-surface-tile border border-hairline rounded-2xl rounded-tl-xs p-3.5 text-[13px] text-ink shadow-2xs leading-relaxed group">
                {/* Content */}
                <div className="space-y-1">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Direct Action Chips */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-hairline">
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
                            <span>{act.icon || '💬'}</span>
                            <span>{act.label}</span>
                          </a>
                        );
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => act.href && router.push(act.href)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 text-[11px] font-semibold transition-all active:scale-95"
                        >
                          <span>{act.icon || '⚡'}</span>
                          <span>{act.label}</span>
                          <span className="text-[9px]">↗</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Footer (Timestamp & Copy) */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-ink-muted">
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    title="Salin Teks"
                  >
                    {copiedId === msg.id ? (
                      <span className="text-emerald-500 font-bold">Tersalin ✓</span>
                    ) : (
                      <span>Salin</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing State Indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
              ✨
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-surface-pearl dark:bg-surface-tile border border-hairline text-xs text-ink-muted flex items-center gap-1.5 shadow-2xs">
              <span>Ry-AI sedang mengetik</span>
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK SUGGESTIONS BAR (Pilihan Cepat)                      */}
      {/* ============================================================ */}
      <div className="px-3 py-1.5 border-t border-hairline bg-canvas flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0 pl-0.5">
          Pilihan:
        </span>
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query)}
            disabled={isTyping}
            className="px-2.5 py-1 rounded-full bg-surface-pearl dark:bg-surface-tile hover:bg-primary/10 text-ink-muted hover:text-primary border border-hairline text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 active:scale-95 disabled:opacity-50 shadow-2xs"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 4. PINNED CHAT INPUT BAR                                      */}
      {/* ============================================================ */}
      <div className="p-2 sm:p-2.5 px-3 bg-canvas/95 backdrop-blur-md border-t border-hairline shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-surface-pearl dark:bg-surface-tile border border-hairline rounded-full px-3.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-xs"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Tanyakan layanan IT, aktivasi IMEI, gateway..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            className="flex-1 bg-transparent text-[13px] text-ink placeholder-ink-muted focus:outline-none py-1.5"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="w-8 h-8 rounded-full bg-primary hover:bg-primary-focus text-white flex items-center justify-center shadow-xs transition-transform active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
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
