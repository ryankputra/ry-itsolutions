'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { playPopSound, playDingSound } from '@/lib/soundFx';

// Product Video Model
interface ProductVideo {
  id: string;
  title: string;
  productName: string;
  productSlug: string;
  category: string;
  price: string;
  originalPrice?: string;
  badge: string;
  imageUrl: string;
  themeColor: string;
  accentGradient: string;
  likes: number;
  commentsCount: number;
  shares: number;
  creator: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
  };
  caption: string;
  hashtags: string[];
  productFeatures: string[];
  ctaText: string;
  ctaLink: string;
  liveTagText: string;
  liveStatusText: string;
  sampleComments: {
    id: string;
    user: string;
    avatar: string;
    text: string;
    timeAgo: string;
    likes: number;
  }[];
}

// 4 Active Real Products (Beli Paket Kuota is removed as requested)
const PRODUCT_VIDEOS: ProductVideo[] = [
  {
    id: 'video-gateway',
    title: 'Payment Gateway GoPay & Dynamic QRIS Otomatis',
    productName: 'GoPay & QRIS Gateway SaaS',
    productSlug: 'gateway',
    category: 'Developer API & Payment',
    price: 'Rp 10.000',
    originalPrice: 'Rp 50.000',
    badge: 'PALING LARIS',
    imageUrl: '/videos/video_gopay.jpg',
    themeColor: '#00AA13',
    accentGradient: 'from-emerald-600/30 via-teal-950/40 to-black',
    likes: 18420,
    commentsCount: 384,
    shares: 2410,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true,
    },
    caption: 'Solusi Payment Gateway GoPay & Dynamic QRIS otomatis untuk toko online, bot WA/Telegram, & aplikasi! Biaya langganan cuma 10rb/bulan, dana langsung masuk rekening tanpa perantara 🚀',
    hashtags: ['#paymentgateway', '#qrisotomatis', '#gopay', '#coding', '#apisolution'],
    liveTagText: '[POST 200 OK] Webhook Auto-Callback • 0.2s',
    liveStatusText: '● GoBiz & QRIS Dynamic Active • 0% Fee',
    productFeatures: [
      'Biaya Langganan Rp 10.000 / 30 Hari',
      'Fee Transaksi 0% (Tanpa Potongan Pihak Ke-3)',
      'Uang Langsung Masuk ke Akun GoPay Merchant',
      'Webhook Callback Real-Time Cepat 0.2 Detik',
      'Dokumentasi API Lengkap (PHP, Node.js, Python, Curl)',
    ],
    ctaText: 'Buka Layanan Gateway',
    ctaLink: '/gateway',
    sampleComments: [
      { id: 'c1', user: 'Dimas Kurniawan', avatar: '👨‍💻', text: 'Mantap banget! Udah integrasi ke web topup ku, QRIS langsung auto approve hitungan detik!', timeAgo: '2 jam lalu', likes: 142 },
      { id: 'c2', user: 'Fikri Store', avatar: '🏪', text: 'Langganan 10rb sebulan murah parah, biasanya gateway lain potong fee per transaksi.', timeAgo: '5 jam lalu', likes: 89 },
      { id: 'c3', user: 'Alif Tech', avatar: '⚡', text: 'Cara pairing GoBiz nya gampang banget cuma masukin OTP beres 👍', timeAgo: '1 hari lalu', likes: 34 },
    ],
  },
  {
    id: 'video-imei',
    title: 'Layanan Buka Blokir IMEI All Operator Resmi',
    productName: 'Layanan Buka IMEI All Operator',
    productSlug: 'unblock-imei',
    category: 'Telekomunikasi & Jaringan',
    price: 'Rp 60.000',
    originalPrice: 'Rp 150.000',
    badge: 'GARANSI RESMI',
    imageUrl: '/videos/video_imei.jpg',
    themeColor: '#2563EB',
    accentGradient: 'from-blue-600/30 via-indigo-950/40 to-black',
    likes: 24390,
    commentsCount: 612,
    shares: 4120,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true,
    },
    caption: 'iPhone atau Android kamu sinyal hilang kena begal Bea Cukai / Kemenperin? Buka blokir IMEI All Operator (Telkomsel, Indosat, XL, Tri, Smartfren) proses kilat 15-45 menit bergaransi resmi! 📶',
    hashtags: ['#bukaimei', '#unblockimei', '#sinyaliphone', '#kemenperin', '#alloperator'],
    liveTagText: 'Telkomsel 5G [IIIII] • Sinyal Aktif Permanen',
    liveStatusText: '✓ CEIR Database Terverifikasi Kemenperin',
    productFeatures: [
      'Mendukung Semua Tipe iPhone & Android',
      'All Operator: Telkomsel, Indosat Ooredoo, XL, Tri, Smartfren',
      'Proses Cepat 15 - 45 Menit Langsung ON',
      'Garansi Resmi & Terverifikasi Database CEIR',
      'Bisa Bayar via QRIS / Saldo Akun',
    ],
    ctaText: 'Buka Sinyal Sekarang',
    ctaLink: '/unblock-imei',
    sampleComments: [
      { id: 'c4', user: 'Rian Pratama', avatar: '📱', text: 'iPhone 13 Pro inter ku sempet no service sebulan, order disini 20 menit sinyal Telkomsel langsung muncul 4 bar!', timeAgo: '30 menit lalu', likes: 219 },
      { id: 'c5', user: 'Salsa Bila', avatar: '✨', text: 'Garansinya beneran aman kak, sinyal langsung on tanpa kendala 👍', timeAgo: '3 jam lalu', likes: 76 },
      { id: 'c6', user: 'Gerry Wijaya', avatar: '🔥', text: 'Langganan buat toko konter HP ku, rekomen banget!', timeAgo: '6 jam lalu', likes: 45 },
    ],
  },
  {
    id: 'video-garansi',
    title: 'Cek Status Garansi Apple Coverage & CEIR Kemenperin Gratis',
    productName: 'Cek Garansi & IMEI CEIR',
    productSlug: 'cek-garansi',
    category: 'Pemeriksaan Gadget & Keamanan',
    price: 'GRATIS',
    badge: '100% FREE',
    imageUrl: '/videos/video_garansi.jpg',
    themeColor: '#8B5CF6',
    accentGradient: 'from-purple-600/30 via-violet-950/40 to-black',
    likes: 15800,
    commentsCount: 290,
    shares: 1800,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true,
    },
    caption: 'Mau beli iPhone bekas tapi takut kena blokir atau garansi palsu? Cek status garansi Apple Coverage, serial number, aktivasi CEIR, dan status blacklist di sini secara instan dan GRATIS! 🔍',
    hashtags: ['#cekgaransi', '#applecoverage', '#ceir', '#cekimei', '#tipsgadget'],
    liveTagText: 'Status: AppleCare+ Coverage Valid (Active)',
    liveStatusText: '✓ Database CEIR: Registered & Whitelisted',
    productFeatures: [
      'Pengecekan Serial Number & IMEI Resmi',
      'Status Apple Coverage (Aktif / Expired)',
      'Status Pendaftaran di Database CEIR Kemenperin',
      'Hasil Instan dalam 3 Detik Tanpa Antre',
      'Gratis Tanpa Biaya Sepeserpun',
    ],
    ctaText: 'Cek Garansi Sekarang',
    ctaLink: '/cek-garansi',
    sampleComments: [
      { id: 'c9', user: 'Kevin Sanjaya', avatar: '🍏', text: 'Bermanfaat banget fitur ini pas lagi COD iPhone bekas, ketauan semua riwayat garansinya!', timeAgo: '2 jam lalu', likes: 167 },
      { id: 'c10', user: 'Dewi Lestari', avatar: '📱', text: 'Bagus min, cepat dan akurat hasilnya.', timeAgo: '7 jam lalu', likes: 42 },
    ],
  },
  {
    id: 'video-topup',
    title: 'Top Up Saldo Akun QRIS Otomatis 24 Jam Tanpa Admin',
    productName: 'Top Up Saldo Otomatis',
    productSlug: 'topup',
    category: 'Keuangan & Dompet Digital',
    price: 'Bebas Admin',
    badge: 'AUTO APPROVE',
    imageUrl: '/videos/video_topup.jpg',
    themeColor: '#0EA5E9',
    accentGradient: 'from-sky-500/30 via-cyan-950/40 to-black',
    likes: 21900,
    commentsCount: 420,
    shares: 2900,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true,
    },
    caption: 'Isi saldo akun Ry-ITSolutions kapan saja tanpa ribet! Scan QRIS dari GoPay, Dana, OVO, ShopeePay, BCA, BRI, Mandiri otomatis masuk dalam 2 detik, aktif 24 jam nonstop tanpa potongan admin 💳',
    hashtags: ['#topupsaldo', '#qrisotomatis', '#fintech', '#tanpabiayaadmin', '#cashless'],
    liveTagText: 'Deposit QRIS Instant • Saldo Otomatis Masuk',
    liveStatusText: '⚡ Scan QRIS Semua Bank & E-Wallet Nasional',
    productFeatures: [
      'Bebas Biaya Admin (0 Rupiah Tanpa Potongan)',
      'Scan QRIS Semua Bank & E-Wallet Nasional',
      'Saldo Masuk Otomatis dalam 2 Detik',
      'Sistem Aktif 24 Jam Nonstop Tanpa Libur',
      'Riwayat Saldo Transparan & Notifikasi WA',
    ],
    ctaText: 'Isi Saldo Sekarang',
    ctaLink: '/topup',
    sampleComments: [
      { id: 'c11', user: 'Hendra Setiawan', avatar: '💰', text: 'Topup jam 2 malem tetep langsung masuk 2 detik via QRIS BCA, mantap pelayanannya!', timeAgo: '45 menit lalu', likes: 231 },
      { id: 'c12', user: 'Toko Pulsa Jaya', avatar: '💳', text: 'Enak banget gapake biaya admin, jadi modal ga kemakan fee.', timeAgo: '4 jam lalu', likes: 88 },
    ],
  },
];

export default function VideosPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [currentComments, setCurrentComments] = useState<Record<string, any[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  // Initialize stored likes and comments
  useEffect(() => {
    try {
      const storedLikes = localStorage.getItem('ry_video_likes');
      if (storedLikes) {
        setLikedMap(JSON.parse(storedLikes));
      }
    } catch {}

    // Init initial comments per product
    const initialComments: Record<string, any[]> = {};
    PRODUCT_VIDEOS.forEach((p) => {
      initialComments[p.id] = [...p.sampleComments];
    });
    setCurrentComments(initialComments);
  }, []);

  // Update current index on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index >= 0 && index < PRODUCT_VIDEOS.length && index !== currentIndex) {
        setCurrentIndex(index);
        if (isSoundOn) {
          try {
            playPopSound();
          } catch {}
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, isSoundOn]);

  // Handle Like Toggle
  const handleToggleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyLiked = likedMap[id] || false;
    const nextLiked = !isCurrentlyLiked;

    const newMap = { ...likedMap, [id]: nextLiked };
    setLikedMap(newMap);

    const baseLikes = PRODUCT_VIDEOS.find((v) => v.id === id)?.likes || 0;
    const curLikes = likesCountMap[id] || baseLikes;
    setLikesCountMap((prev) => ({
      ...prev,
      [id]: curLikes + (nextLiked ? 1 : -1),
    }));

    try {
      localStorage.setItem('ry_video_likes', JSON.stringify(newMap));
      if (nextLiked) playDingSound();
    } catch {}
  };

  // Double Tap Video to Like
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const curVid = PRODUCT_VIDEOS[currentIndex];

    if (now - lastTapRef.current < 300) {
      // Double tap detected
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const heartId = Date.now();
      setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 900);

      if (!likedMap[curVid.id]) {
        handleToggleLike(curVid.id);
      }
    } else {
      if (isSoundOn) {
        try {
          playPopSound();
        } catch {}
      }
    }
    lastTapRef.current = now;
  };

  // Toggle Sound
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSound = !isSoundOn;
    setIsSoundOn(nextSound);
    if (nextSound) {
      try {
        playDingSound();
      } catch {}
    }
  };

  // Handle Share Link
  const handleShare = async (e: React.MouseEvent, vid: ProductVideo) => {
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${vid.ctaLink}` : vid.ctaLink;
    if (navigator.share) {
      try {
        await navigator.share({
          title: vid.title,
          text: `Cek promo ${vid.productName} di Ry-ITSolutions: ${vid.price}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      Swal.fire({
        title: 'Tautan Disalin!',
        text: `Link menuju ${vid.productName} berhasil disalin ke clipboard.`,
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });
    }
  };

  // Scroll to index
  const scrollToIndex = (idx: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: idx * containerRef.current.clientHeight,
        behavior: 'smooth',
      });
    }
  };

  // Submit New Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const curVid = PRODUCT_VIDEOS[currentIndex];
    const newComment = {
      id: `comm_${Date.now()}`,
      user: 'Anda',
      avatar: '👤',
      text: newCommentText.trim(),
      timeAgo: 'Baru saja',
      likes: 0,
    };

    setCurrentComments((prev) => ({
      ...prev,
      [curVid.id]: [newComment, ...(prev[curVid.id] || [])],
    }));

    setNewCommentText('');
    try {
      playDingSound();
    } catch {}
  };

  const currentVideo = PRODUCT_VIDEOS[currentIndex] || PRODUCT_VIDEOS[0];
  const videoComments = currentComments[currentVideo.id] || currentVideo.sampleComments;

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Dynamic Ambient Blur Background (Desktop) */}
      <div
        className={`hidden lg:block absolute inset-0 bg-gradient-to-br ${currentVideo.accentGradient} opacity-40 blur-3xl transition-all duration-700 pointer-events-none`}
      />

      {/* Main Video Viewport */}
      <div className="relative w-full h-full max-w-[440px] bg-zinc-950 sm:border-x border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* TOP BAR: Clean Minimalist Header (All functional, no fake tabs) */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
          {/* Back to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-full bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-zinc-800 transition-all border border-white/10 active:scale-95 shadow-lg"
            title="Kembali ke Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Clean Functional Title & Video Counter */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/75 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-tight">Video Layanan</span>
            <span className="text-zinc-500">•</span>
            <span className="text-[11px] text-zinc-400">{currentIndex + 1} / {PRODUCT_VIDEOS.length}</span>
          </div>

          {/* Sound Mute / Unmute Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-9 h-9 rounded-full bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-zinc-800 transition-all border border-white/10 active:scale-95 shadow-lg"
            title={isSoundOn ? "Suara Aktif" : "Suara Senyap"}
          >
            {isSoundOn ? (
              <svg className="w-5 h-5 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V8.25c0-.414.336-.75.75-.75h4.24Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V8.25c0-.414.336-.75.75-.75h4.24Z" />
              </svg>
            )}
          </button>
        </div>

        {/* VERTICAL SCROLL SNAP FEED */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          {PRODUCT_VIDEOS.map((vid, idx) => {
            const isLiked = likedMap[vid.id] || false;
            const likesCount = likesCountMap[vid.id] || vid.likes;
            const commentsCount = (currentComments[vid.id] || vid.sampleComments).length;

            return (
              <div
                key={vid.id}
                className="w-full h-[100dvh] snap-start relative flex items-center justify-center bg-black overflow-hidden"
                onClick={handleVideoTap}
              >
                {/* PRODUCT VISUAL SHOWCASE (Tailored to exact product) */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <Image
                    src={vid.imageUrl}
                    alt={vid.title}
                    fill
                    priority={idx === 0}
                    className="object-cover transition-transform duration-1000 scale-100 hover:scale-105"
                    sizes="(max-width: 440px) 100vw, 440px"
                  />

                  {/* High-tech Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/60 pointer-events-none" />

                  {/* Subtle Tech Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

                  {/* Dynamic Product Simulation Animations */}
                  {idx === currentIndex && (
                    <div className="absolute inset-x-4 top-24 pointer-events-none space-y-2 z-10 animate-in fade-in slide-in-from-top-3 duration-500">
                      {/* Live System Status Tag */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-medium text-emerald-300 shadow-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{vid.liveStatusText}</span>
                      </div>

                      {/* Live Terminal Log / Scan Notification */}
                      <div className="inline-block px-3 py-1 rounded-lg bg-zinc-950/75 backdrop-blur-md border border-emerald-500/20 text-[10px] font-mono text-zinc-300 shadow-lg">
                        {vid.liveTagText}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Laser Scanning Line across the product */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none animate-scan-laser shadow-[0_0_12px_#22d3ee]" />
                </div>

                {/* FLOATING HEARTS (Double Tap animation) */}
                {floatingHearts.map((h) => (
                  <div
                    key={h.id}
                    className="absolute z-40 pointer-events-none text-rose-500 animate-floating-heart"
                    style={{ left: `${h.x}px`, top: `${h.y}px` }}
                  >
                    <svg className="w-16 h-16 fill-current filter drop-shadow-xl" viewBox="0 0 24 24">
                      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                    </svg>
                  </div>
                ))}

                {/* RIGHT SIDEBAR ACTIONS (All 100% Functional) */}
                <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-4.5 pointer-events-auto">
                  
                  {/* CREATOR AVATAR (Clean official badge, no fake follow button) */}
                  <div className="relative mb-1">
                    <div className="w-11 h-11 rounded-full border-2 border-white/20 bg-zinc-900 overflow-hidden shadow-xl flex items-center justify-center">
                      <Image
                        src={vid.creator.avatar}
                        alt={vid.creator.name}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    {vid.creator.isVerified && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border border-zinc-950 shadow">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* LIKE BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => handleToggleLike(vid.id, e)}
                      className="w-11 h-11 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 border border-white/10 shadow-xl"
                      title="Suka Video"
                    >
                      <svg
                        className={`w-6 h-6 transition-transform duration-200 ${isLiked ? 'text-rose-500 fill-rose-500 scale-110' : 'text-white fill-none stroke-current stroke-2'}`}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-bold text-zinc-200 drop-shadow mt-1">
                      {likesCount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* COMMENTS BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsDrawerOpen(true);
                        try { playPopSound(); } catch {}
                      }}
                      className="w-11 h-11 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 border border-white/10 shadow-xl"
                      title="Lihat Ulasan / Komentar"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-bold text-zinc-200 drop-shadow mt-1">
                      {commentsCount}
                    </span>
                  </div>

                  {/* SHARE BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => handleShare(e, vid)}
                      className="w-11 h-11 rounded-full bg-zinc-950/60 hover:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 border border-white/10 shadow-xl"
                      title="Bagikan Link Produk"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-bold text-zinc-200 drop-shadow mt-1">
                      Bagikan
                    </span>
                  </div>

                  {/* QUICK UP / DOWN NAVIGATION BUTTONS */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    {idx > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToIndex(idx - 1);
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-800 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white border border-white/10 transition-all shadow"
                        title="Video Sebelumnya"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                    )}
                    {idx < PRODUCT_VIDEOS.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToIndex(idx + 1);
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-800 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white border border-white/10 transition-all shadow"
                        title="Video Selanjutnya"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    )}
                  </div>

                </div>

                {/* BOTTOM OVERLAY: REFINED MINIMALIST KERANJANG KUNING & PRODUCT INFO */}
                <div className="absolute left-3.5 right-16 bottom-6 z-20 flex flex-col gap-2 pointer-events-auto text-white">
                  
                  {/* 🛒 REFINED MINIMALIST KERANJANG KUNING (Clean, modern dark glass with golden accent) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductModalOpen(true);
                      try { playPopSound(); } catch {}
                    }}
                    className="group flex items-center gap-2.5 bg-zinc-950/80 hover:bg-zinc-900/95 active:scale-[0.98] backdrop-blur-xl border border-white/15 hover:border-amber-400/50 rounded-2xl p-2 pr-3.5 shadow-2xl transition-all duration-200 cursor-pointer max-w-[92%]"
                  >
                    {/* Sleek Minimalist Icon Box */}
                    <div className="relative w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                    </div>

                    {/* Product Text & Price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold tracking-wider uppercase text-amber-300 bg-amber-400/20 px-1 rounded border border-amber-400/30">
                          {vid.badge}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{vid.productName}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-extrabold text-amber-300">{vid.price}</span>
                        {vid.originalPrice && (
                          <span className="text-[10px] text-zinc-400 line-through">{vid.originalPrice}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Link Chevron */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 group-hover:text-amber-300 transition-colors shrink-0 pl-1">
                      <span>Beli</span>
                      <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Creator Handle & Category */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-extrabold text-sm drop-shadow">@{vid.creator.handle}</span>
                    <span className="text-[10px] text-zinc-300 bg-zinc-900/80 backdrop-blur-md px-2 py-0.5 rounded-full font-medium border border-white/10">
                      {vid.category}
                    </span>
                  </div>

                  {/* Caption & Hashtags */}
                  <p className="text-xs text-zinc-200 drop-shadow line-clamp-2 leading-relaxed">
                    {vid.caption}
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-blue-300">
                    {vid.hashtags.map((h, hi) => (
                      <span key={hi} className="hover:underline cursor-pointer">{h}</span>
                    ))}
                  </div>

                </div>

                {/* BOTTOM PROGRESS BAR */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15 z-30">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${((idx + 1) / PRODUCT_VIDEOS.length) * 100}%` }}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* BOTTOM SHEET: COMMENTS DRAWER (Real functional interaction) */}
        {commentsDrawerOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xs flex flex-col justify-end transition-opacity animate-in fade-in duration-200"
            onClick={() => setCommentsDrawerOpen(false)}
          >
            <div
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[70%] h-[70%] flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  {videoComments.length} Ulasan & Komentar
                </span>
                <button
                  onClick={() => setCommentsDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {videoComments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm shrink-0 border border-zinc-700">
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">{c.user}</span>
                        <span className="text-[10px] text-zinc-500">{c.timeAgo}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950">
                <input
                  type="text"
                  placeholder="Tulis ulasan atau tanggapan..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold disabled:opacity-40 transition-opacity"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: MINIMALIST PRODUCT DETAIL (Keranjang Kuning Modal) */}
        {productModalOpen && (
          <div
            className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3 animate-in fade-in duration-200"
            onClick={() => setProductModalOpen(false)}
          >
            <div
              className="w-full bg-zinc-950 border border-white/15 rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Product Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {currentVideo.badge}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1">{currentVideo.productName}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold mt-0.5">
                      <span className="text-amber-300 text-sm font-black">{currentVideo.price}</span>
                      {currentVideo.originalPrice && (
                        <span className="text-zinc-500 line-through text-[11px]">{currentVideo.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-around py-2 border-y border-zinc-800/80 text-[10px] text-zinc-400 font-medium">
                <span>⭐ <b>4.9</b> Rating Layanan</span>
                <span>•</span>
                <span>🛡️ Transaksi Aman</span>
                <span>•</span>
                <span>⚡ Proses Otomatis</span>
              </div>

              {/* Features List */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Keunggulan Layanan:</p>
                <div className="space-y-1">
                  {currentVideo.productFeatures.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 border border-white/10 transition-colors"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductModalOpen(false);
                    router.push(currentVideo.ctaLink);
                  }}
                  className="flex-2 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-400/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{currentVideo.ctaText}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes scanLaser {
          0% {
            top: 15%;
            opacity: 0.1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            top: 75%;
            opacity: 0.1;
          }
        }
        .animate-scan-laser {
          animation: scanLaser 3s ease-in-out infinite;
        }
        @keyframes floatingHeart {
          0% {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -120%) scale(1.3);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -200%) scale(1.6);
            opacity: 0;
          }
        }
        .animate-floating-heart {
          animation: floatingHeart 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
