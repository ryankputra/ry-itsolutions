'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

// Types
interface ProductVideo {
  id: string;
  title: string;
  productName: string;
  productSlug: string;
  category: string;
  price: string;
  originalPrice?: string;
  badge: string;
  videoUrl: string;
  posterUrl?: string;
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
  songTitle: string;
  productFeatures: string[];
  ctaText: string;
  ctaLink: string;
  sampleComments: {
    id: string;
    user: string;
    avatar: string;
    text: string;
    timeAgo: string;
    likes: number;
  }[];
}

const PRODUCT_VIDEOS: ProductVideo[] = [
  {
    id: 'video-gateway',
    title: 'Payment Gateway GoPay & Dynamic QRIS Otomatis',
    productName: 'GoPay & QRIS Gateway SaaS',
    productSlug: 'gateway',
    category: 'Developer API & Payment',
    price: 'Rp 10.000',
    originalPrice: 'Rp 50.000',
    badge: '🔥 PALING LARIS',
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    posterUrl: '/banners/banner_gopay.jpg',
    themeColor: '#00AA13',
    accentGradient: 'from-emerald-500/30 via-teal-900/40 to-black',
    likes: 18420,
    commentsCount: 384,
    shares: 2410,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true
    },
    caption: 'Solusi Payment Gateway GoPay & Dynamic QRIS otomatis untuk website toko online, bot Telegram/WA, & aplikasi! Biaya langganan cuma 10rb/bulan, dana langsung masuk rekening tanpa perantara 🚀',
    hashtags: ['#paymentgateway', '#qrisotomatis', '#gopay', '#coding', '#apisolution', '#fyp'],
    songTitle: 'Ry-ITSolutions • Tech Beats vol. 1',
    productFeatures: [
      'Biaya Langganan Rp 10.000 / 30 Hari',
      'Fee Transaksi 0% (Tanpa Potongan Pihak Ke-3)',
      'Uang Langsung Masuk ke Akun GoPay Merchant',
      'Webhook Callback Real-Time Cepat 0.5 Detik',
      'Dokumentasi API Lengkap (PHP, Node.js, Python, Curl)'
    ],
    ctaText: 'Coba Gateway Sekarang',
    ctaLink: '/gateway',
    sampleComments: [
      { id: 'c1', user: 'Dimas Kurniawan', avatar: '👨‍💻', text: 'Mantap banget bang! Udah integrasi ke web topup ku, QRIS langsung auto approve hitungan detik!', timeAgo: '2 jam lalu', likes: 142 },
      { id: 'c2', user: 'Fikri Store', avatar: '🏪', text: 'Langganan 10rb sebulan murah parah, biasanya gateway lain minta fee per transaksi 0.7%', timeAgo: '5 jam lalu', likes: 89 },
      { id: 'c3', user: 'Alif Tech', avatar: '⚡', text: 'Cara pairing GoBiz nya gampang banget cuma masukin OTP beres 👍', timeAgo: '1 hari lalu', likes: 34 }
    ]
  },
  {
    id: 'video-imei',
    title: 'Buka Blokir IMEI All Operator Resmi & Bergaransi',
    productName: 'Layanan Buka IMEI All Operator',
    productSlug: 'unblock-imei',
    category: 'Telekomunikasi & Jaringan',
    price: 'Rp 60.000',
    originalPrice: 'Rp 150.000',
    badge: '⭐ GARANSI RESMI',
    videoUrl: 'https://filesamples.com/samples/video/mp4/sample_960x540.mp4',
    posterUrl: '/banners/banner_imei.jpg',
    themeColor: '#2563EB',
    accentGradient: 'from-blue-600/30 via-indigo-950/40 to-black',
    likes: 24390,
    commentsCount: 612,
    shares: 4120,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true
    },
    caption: 'iPhone atau Android kamu sinyal hilang kena begal Bea Cukai/Kemenperin? Buka blokir IMEI All Operator (Telkomsel, Indosat, XL, Tri, Smartfren) proses kilat 10-30 menit bergaransi permanen! 📶',
    hashtags: ['#bukaimei', '#unblockimei', '#sinyaliphone', '#kemenperin', '#beacukai', '#alloperator'],
    songTitle: 'Ry-ITSolutions • Cellular Wave Trend',
    productFeatures: [
      'Mendukung Semua Tipe iPhone & Android',
      'All Operator: Telkomsel, Indosat Ooredoo, XL, Tri, Smartfren',
      'Proses Cepat 15 - 45 Menit Langsung ON',
      'Garansi Resmi & Terverifikasi Database CEIR',
      'Bisa Bayar via QRIS / Saldo Akun'
    ],
    ctaText: 'Buka Sinyal Sekarang',
    ctaLink: '/unblock-imei',
    sampleComments: [
      { id: 'c4', user: 'Rian Pratama', avatar: '📱', text: 'iPhone 13 Pro inter ku sempet no service sebulan, order disini 20 menit sinyal Telkomsel langsung muncul 4 bar!', timeAgo: '30 menit lalu', likes: 219 },
      { id: 'c5', user: 'Salsa Bila', avatar: '✨', text: 'Garansinya beneran aman ga min? | Admin: Bergaransi resmi kak, ada refund jika gagal!', timeAgo: '3 jam lalu', likes: 76 },
      { id: 'c6', user: 'Gerry Wijaya', avatar: '🔥', text: 'Langganan buat toko konter HP ku, rekomen banget!', timeAgo: '6 jam lalu', likes: 45 }
    ]
  },
  {
    id: 'video-kuota',
    title: 'Tembak Paket Kuota Internet Jumbo Murah All Operator',
    productName: 'Tembak Paket Kuota Murah',
    productSlug: 'beli-paket',
    category: 'Paket Data & Pulsa',
    price: 'Rp 5.000',
    originalPrice: 'Rp 35.000',
    badge: '💥 DISKON S/D 70%',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    posterUrl: '/banners/banner_voucher.jpg',
    themeColor: '#EA580C',
    accentGradient: 'from-orange-500/30 via-red-950/40 to-black',
    likes: 31200,
    commentsCount: 945,
    shares: 8900,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true
    },
    caption: 'Kuota internet menipis? Tembak paket kuota data jumbo murah meriah Telkomsel, XL Xtra Combo, Indosat Freedom, & Axis kuota gede harga grosir distributor! Masuk detik itu juga ⚡',
    hashtags: ['#tembakpaket', '#kuotamurah', '#telkomsel', '#xlaxiata', '#indosat', '#kuotajumbo'],
    songTitle: 'Ry-ITSolutions • Speed Data Remix',
    productFeatures: [
      'Harga Kuota Mulai Rp 5.000 per Transaksi',
      'Telkomsel, Indosat, XL, Axis, Tri & Smartfren',
      'Proses Transaksi Otomatis 24 Jam Nonstop',
      'Masa Aktif Panjang & Kuota Utama 24 Jam',
      'Support Transaksi Massal & Pembayaran QRIS'
    ],
    ctaText: 'Beli Paket Kuota',
    ctaLink: '/dashboard',
    sampleComments: [
      { id: 'c7', user: 'Bayu Saputra', avatar: '🎮', text: 'Paket 50GB Telkomsel harganya miring banget dibanding beli di MyTelkomsel, mantul!', timeAgo: '1 jam lalu', likes: 312 },
      { id: 'c8', user: 'Nadia Putri', avatar: '🌸', text: 'Langsung masuk hitungan 3 detik, makasih Ry-ITSolutions!', timeAgo: '4 jam lalu', likes: 104 }
    ]
  },
  {
    id: 'video-garansi',
    title: 'Cek Status Garansi Apple Coverage & CEIR Kemenperin Gratis',
    productName: 'Cek Garansi & IMEI CEIR',
    productSlug: 'cek-garansi',
    category: 'Tool & Pemeriksaan Gadget',
    price: 'GRATIS',
    badge: '✅ 100% FREE',
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    posterUrl: '/banners/banner_rewards.jpg',
    themeColor: '#8B5CF6',
    accentGradient: 'from-purple-600/30 via-violet-950/40 to-black',
    likes: 15800,
    commentsCount: 290,
    shares: 1800,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true
    },
    caption: 'Mau beli iPhone bekas tapi takut kena blokir atau garansi palsu? Cek status garansi Apple Coverage, serial number, aktivasi CEIR, dan status blacklist di sini secara instan dan GRATIS! 🔍',
    hashtags: ['#cekgaransi', '#applecoverage', '#ceir', '#cekimei', '#tipsgadget', '#iphonebekas'],
    songTitle: 'Ry-ITSolutions • Apple Clean Vibe',
    productFeatures: [
      'Pengecekan Serial Number & IMEI Resmi',
      'Status Apple Coverage (Aktif / Expired)',
      'Status Pendaftaran di Database CEIR Kemenperin',
      'Hasil Instan dalam 3 Detik Tanpa Antre',
      'Gratis Tanpa Biaya Sepeserpun'
    ],
    ctaText: 'Cek Garansi Sekarang',
    ctaLink: '/cek-garansi',
    sampleComments: [
      { id: 'c9', user: 'Kevin Sanjaya', avatar: '🍏', text: 'Bermanfaat banget fitur ini pas lagi COD iPhone bekas, ketauan semua riwayat garansinya!', timeAgo: '2 jam lalu', likes: 167 },
      { id: 'c10', user: 'Dewi Lestari', avatar: '📱', text: 'Bagus min, cepat dan akurat hasilnya.', timeAgo: '7 jam lalu', likes: 42 }
    ]
  },
  {
    id: 'video-topup',
    title: 'Top Up Saldo Akun QRIS Otomatis 24 Jam Tanpa Admin',
    productName: 'Top Up Saldo Ry-ITSolutions',
    productSlug: 'topup',
    category: 'Keuangan & Dompet Digital',
    price: 'Bebas Admin',
    badge: '⚡ AUTO APPROVE',
    videoUrl: 'https://filesamples.com/samples/video/mp4/sample_960x540.mp4',
    posterUrl: '/banners/banner_gopay.jpg',
    themeColor: '#0EA5E9',
    accentGradient: 'from-sky-500/30 via-cyan-950/40 to-black',
    likes: 21900,
    commentsCount: 420,
    shares: 2900,
    creator: {
      name: 'Ry-ITSolutions Official',
      handle: 'ry_itsolutions',
      avatar: '/app-logo.svg',
      isVerified: true
    },
    caption: 'Isi saldo akun Ry-ITSolutions kamu kapan saja tanpa ribet! Scan QRIS dari GoPay, Dana, OVO, ShopeePay, BCA, BRI, Mandiri otomatis masuk dalam 2 detik, aktif 24 jam nonstop tanpa biaya admin 💳',
    hashtags: ['#topupsaldo', '#qrisotomatis', '#fintech', '#tanpabiayaadmin', '#cashless'],
    songTitle: 'Ry-ITSolutions • Fast Cash Pulse',
    productFeatures: [
      'Bebas Biaya Admin (0 Rupiah)',
      'Scan QRIS Semua Bank & E-Wallet Nasional',
      'Saldo Masuk Otomatis dalam 2 Detik',
      'Sistem Aktif 24 Jam Nonstop Tanpa Libur',
      'Riwayat Saldo Transparan & Notifikasi WA'
    ],
    ctaText: 'Isi Saldo Akun',
    ctaLink: '/topup',
    sampleComments: [
      { id: 'c11', user: 'Hendra Setiawan', avatar: '💰', text: 'Topup jam 2 malem tetep langsung masuk 2 detik via QRIS BCA, mantap pelayanannya!', timeAgo: '45 menit lalu', likes: 231 },
      { id: 'c12', user: 'Toko Pulsa Jaya', avatar: '💳', text: 'Enak banget gapake biaya admin, jadi modal ga kemakan fee.', timeAgo: '4 jam lalu', likes: 88 }
    ]
  }
];

export default function VideosPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [currentVideoComments, setCurrentVideoComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showPlayIconOverlay, setShowPlayIconOverlay] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef<number>(0);

  // Initialize likes map
  useEffect(() => {
    const initialLikes: Record<string, number> = {};
    PRODUCT_VIDEOS.forEach(v => {
      initialLikes[v.id] = v.likes;
    });
    setLikesCountMap(initialLikes);
  }, []);

  // Update current comments when index changes
  useEffect(() => {
    const curVid = PRODUCT_VIDEOS[currentIndex];
    if (curVid) {
      setCurrentVideoComments(curVid.sampleComments);
    }
  }, [currentIndex]);

  // Handle Scroll Snap / IntersectionObserver
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollPos = containerRef.current.scrollTop;
      const cardHeight = containerRef.current.clientHeight;
      const index = Math.round(scrollPos / cardHeight);
      if (index >= 0 && index < PRODUCT_VIDEOS.length && index !== currentIndex) {
        setCurrentIndex(index);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentIndex]);

  // Play / Pause video based on current visible index
  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === currentIndex) {
        if (isPlaying) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, [currentIndex, isPlaying]);

  // Handle Like Toggle
  const handleToggleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyLiked = likedMap[id] || false;
    setLikedMap(prev => ({ ...prev, [id]: !isCurrentlyLiked }));
    setLikesCountMap(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + (isCurrentlyLiked ? -1 : 1)
    }));
  };

  // Double Tap Video to Like
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const curVid = PRODUCT_VIDEOS[currentIndex];

    // Double tap detected (<300ms)
    if (now - lastTapRef.current < 300) {
      // Spawn floating heart
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const heartId = Date.now();
      setFloatingHearts(prev => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
      }, 900);

      // Force like
      if (!likedMap[curVid.id]) {
        handleToggleLike(curVid.id);
      }
    } else {
      // Single tap: toggle play / pause
      setIsPlaying(prev => !prev);
      setShowPlayIconOverlay(true);
      setTimeout(() => setShowPlayIconOverlay(false), 500);
    }
    lastTapRef.current = now;
  };

  // Toggle Mute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
  };

  // Handle Share
  const handleShare = async (e: React.MouseEvent, vid: ProductVideo) => {
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${vid.ctaLink}` : vid.ctaLink;
    if (navigator.share) {
      try {
        await navigator.share({
          title: vid.title,
          text: `Cek promo ${vid.productName} di Ry-ITSolutions: ${vid.price}`,
          url: shareUrl
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      Swal.fire({
        title: 'Tautan Disalin!',
        text: `Link produk ${vid.productName} berhasil disalin ke clipboard.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  // Submit New Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `comm_${Date.now()}`,
      user: 'Anda',
      avatar: '👤',
      text: newCommentText.trim(),
      timeAgo: 'Baru saja',
      likes: 0
    };

    setCurrentVideoComments(prev => [newComment, ...prev]);
    setNewCommentText('');
  };

  const currentVideo = PRODUCT_VIDEOS[currentIndex] || PRODUCT_VIDEOS[0];

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Background Ambient Glow matching current video */}
      <div
        className={`hidden lg:block absolute inset-0 bg-gradient-to-br ${currentVideo.accentGradient} opacity-50 blur-3xl transition-all duration-700 pointer-events-none`}
      />

      {/* Main TikTok Container (Centered Smartphone view on Desktop, Fullscreen on Mobile) */}
      <div className="relative w-full h-full max-w-[440px] bg-zinc-950 sm:border-x border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* TOP BAR OVERLAY */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
          {/* Back to Dashboard */}
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 transition-all border border-white/10"
            title="Kembali ke Beranda"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>

          {/* Feeds Tabs (Mengikuti / Untuk Anda) */}
          <div className="flex items-center gap-4 text-xs font-bold text-white/70">
            <span className="hover:text-white cursor-pointer transition-colors">Mengikuti</span>
            <div className="relative text-white font-black text-sm cursor-pointer">
              <span>Untuk Anda</span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full"></div>
            </div>
            <span className="hover:text-white cursor-pointer transition-colors">Produk</span>
          </div>

          {/* Sound Mute / Unmute Button */}
          <button
            onClick={handleToggleMute}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 transition-all border border-white/10"
            title={isMuted ? "Aktifkan Suara" : "Bisukan"}
          >
            {isMuted ? (
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V8.25c0-.414.336-.75.75-.75h4.24Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V8.25c0-.414.336-.75.75-.75h2.24Z" />
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
            const isFollowed = followedMap[vid.creator.handle] || false;

            return (
              <div
                key={vid.id}
                className="w-full h-[100dvh] snap-start relative flex items-center justify-center bg-black overflow-hidden"
                onClick={handleVideoTap}
              >
                {/* VIDEO ELEMENT */}
                <video
                  ref={el => { videoRefs.current[idx] = el; }}
                  src={vid.videoUrl}
                  poster={vid.posterUrl}
                  className="w-full h-full object-cover pointer-events-none"
                  loop
                  playsInline
                  muted={isMuted}
                />

                {/* HIGH-TECH AMBIENT CANVAS OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />

                {/* Subtle tech grid lines overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

                {/* PLAY / PAUSE ICON OVERLAY */}
                {showPlayIconOverlay && idx === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 animate-fade-in shadow-2xl">
                      {isPlaying ? (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* FLOATING HEART ANIMATIONS (ON DOUBLE TAP) */}
                {floatingHearts.map(h => (
                  <div
                    key={h.id}
                    style={{ left: h.x - 36, top: h.y - 36 }}
                    className="absolute pointer-events-none z-30 animate-ping text-5xl select-none"
                  >
                    ❤️
                  </div>
                ))}

                {/* RIGHT SIDEBAR ACTIONS (LIKE, COMMENT, SHARE, DISC) */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-4 pointer-events-auto">
                  
                  {/* Creator Avatar with Follow button */}
                  <div className="relative mb-1 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-900 shadow-md p-1">
                      <Image
                        src={vid.creator.avatar}
                        alt={vid.creator.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {!isFollowed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFollowedMap(prev => ({ ...prev, [vid.creator.handle]: true }));
                        }}
                        className="absolute -bottom-1.5 w-5 h-5 rounded-full bg-[#FE2C55] text-white flex items-center justify-center text-xs font-black shadow-md hover:scale-110 transition-transform"
                        title="Ikuti"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* LIKE BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => handleToggleLike(vid.id, e)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 active:scale-75 ${
                        isLiked
                          ? 'bg-[#FE2C55]/20 text-[#FE2C55]'
                          : 'bg-black/40 text-white/90 hover:text-white'
                      }`}
                      title={isLiked ? "Batal Suka" : "Suka"}
                    >
                      <svg
                        className={`w-7 h-7 transition-transform duration-200 ${isLiked ? 'scale-110 fill-[#FE2C55]' : 'fill-none'}`}
                        stroke="currentColor"
                        strokeWidth={1.8}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-bold text-white drop-shadow mt-1">
                      {likesCount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* COMMENT BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsDrawerOpen(true);
                      }}
                      className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-transform active:scale-75"
                      title="Lihat Komentar"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .444 1.223ZM8.25 10.5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-bold text-white drop-shadow mt-1">
                      {vid.commentsCount}
                    </span>
                  </div>

                  {/* SHARE BUTTON */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={(e) => handleShare(e, vid)}
                      className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-transform active:scale-75"
                      title="Bagikan"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-bold text-white drop-shadow mt-1">
                      Bagikan
                    </span>
                  </div>

                  {/* ROTATING MUSIC DISC */}
                  <div className="w-10 h-10 rounded-full border-3 border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden p-1 mt-2 animate-spin duration-3000">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 flex items-center justify-center border border-zinc-700">
                      <span className="text-[9px]">🎵</span>
                    </div>
                  </div>

                </div>

                {/* BOTTOM LEFT OVERLAY: KERANJANG KUNING & PRODUCT INFO */}
                <div className="absolute left-3 right-16 bottom-6 z-20 flex flex-col gap-2.5 pointer-events-auto text-white">
                  
                  {/* 🟡 KERANJANG KUNING (YELLOW CART FLOATING BADGE) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductModalOpen(true);
                    }}
                    className="w-fit max-w-[85%] bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-2xl px-3 py-1.5 shadow-xl flex items-center gap-2 cursor-pointer transition-all transform hover:scale-105 active:scale-95 border border-amber-300/80 animate-bounce duration-1000"
                  >
                    <div className="w-6 h-6 rounded-lg bg-zinc-950 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">
                      🛒
                    </div>
                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-950/10 px-1 rounded">
                          {vid.badge}
                        </span>
                        <span className="text-xs font-black truncate">{vid.productName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold">
                        <span className="text-zinc-950 font-black">{vid.price}</span>
                        {vid.originalPrice && (
                          <span className="text-[10px] text-zinc-700 line-through">{vid.originalPrice}</span>
                        )}
                        <span className="text-[10px] text-zinc-800 font-normal ml-0.5">• Beli &gt;</span>
                      </div>
                    </div>
                  </div>

                  {/* Creator Handle & Verified */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm drop-shadow-md">@{vid.creator.handle}</span>
                    {vid.creator.isVerified && (
                      <span className="text-blue-400 text-xs" title="Terverifikasi">✓</span>
                    )}
                    <span className="text-[10px] text-white/70 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-full font-semibold">
                      {vid.category}
                    </span>
                  </div>

                  {/* Caption & Hashtags */}
                  <p className="text-xs text-white/90 drop-shadow line-clamp-2 leading-relaxed">
                    {vid.caption}
                  </p>

                  <div className="flex flex-wrap gap-1 text-[11px] font-bold text-white/80">
                    {vid.hashtags.map((h, hi) => (
                      <span key={hi} className="hover:underline cursor-pointer">{h}</span>
                    ))}
                  </div>

                  {/* Music Track Marquee */}
                  <div className="flex items-center gap-1.5 text-[11px] text-white/80 mt-0.5">
                    <span>🎵</span>
                    <span className="truncate font-medium">{vid.songTitle}</span>
                  </div>

                </div>

                {/* BOTTOM PROGRESS BAR */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${((idx + 1) / PRODUCT_VIDEOS.length) * 100}%` }}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* BOTTOM SHEET: COMMENTS DRAWER */}
        {commentsDrawerOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end transition-opacity animate-fade-in"
            onClick={() => setCommentsDrawerOpen(false)}
          >
            <div
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[70%] h-[70%] flex flex-col overflow-hidden text-white animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {currentVideoComments.length} Komentar
                </span>
                <button
                  onClick={() => setCommentsDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentVideoComments.map(c => (
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
                    <button className="flex flex-col items-center text-zinc-500 hover:text-rose-400 text-[10px] shrink-0 pt-1">
                      <span>🤍</span>
                      <span>{c.likes || 0}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950">
                <input
                  type="text"
                  placeholder="Tulis ulasan / komentar..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold disabled:opacity-40 transition-opacity"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KERANJANG KUNING PRODUCT DETAIL */}
        {productModalOpen && (
          <div
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 animate-fade-in"
            onClick={() => setProductModalOpen(false)}
          >
            <div
              className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center text-2xl font-black shadow-lg">
                    🛒
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {currentVideo.badge}
                    </span>
                    <h3 className="text-base font-black text-white mt-0.5">{currentVideo.productName}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold mt-0.5">
                      <span className="text-amber-400 text-sm font-black">{currentVideo.price}</span>
                      {currentVideo.originalPrice && (
                        <span className="text-zinc-500 line-through text-[11px]">{currentVideo.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Rating & Trust Badges */}
              <div className="flex items-center gap-3 py-2 border-y border-zinc-800 text-[11px] text-zinc-400">
                <span>⭐ <b>4.9</b> (1.4K+ Pembeli)</span>
                <span>•</span>
                <span>🛡️ Garansi Transaksi 100%</span>
                <span>•</span>
                <span>⚡ Proses Instan</span>
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Keunggulan Layanan:</p>
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
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductModalOpen(false);
                    router.push(currentVideo.ctaLink);
                  }}
                  className="flex-2 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{currentVideo.ctaText}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
