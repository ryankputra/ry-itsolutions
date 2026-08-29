"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import TelegramPopup from "@/components/ui/TelegramPopup";
import { analyzeImei } from "@/lib/imeiHelper";
import { useRouter } from "next/navigation";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import InteractiveTour from "@/components/ui/InteractiveTour";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { safeJson } from "@/lib/api";
import Swal from "sweetalert2";

export default function DashboardPage() {
  const { user, setUser, menuSettings } = useApp();
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<any>(null);
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [allTrx, setAllTrx] = useState<any[]>([]);
  const [selectedQris, setSelectedQris] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Hero Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  // Tutorial / Onboarding State
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [activeTutorialTab, setActiveTutorialTab] = useState<number>(0);
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(false);

  // Hero Promo Carousel Slides
  const heroSlides = [
    {
      title: "INSTANT DEALS BUKA SINYAL KILAT",
      subtitle: "Aktivasi IMEI All Operator kilat 24 jam dengan garansi digital resmi & nota WA otomatis.",
      badge: "⚡ PROMO SPESIAL",
      ctaText: "BELI SEKARANG >",
      ctaLink: "/unblock-imei",
      bgGradient: "from-amber-500 via-orange-500 to-rose-500",
    },
    {
      title: "VOUCHER MANIA DISKON S.D 25RB",
      subtitle: "Ambil kupon diskon tambahan sebelum checkout untuk hemat belanja maksimal.",
      badge: "🎟️ DISKON KILAT",
      ctaText: "KLAIM SEKARANG >",
      ctaLink: "/vouchers",
      bgGradient: "from-orange-600 via-rose-600 to-purple-600",
    },
    {
      title: "PUTAR RODA HOKI DAPAT KOIN",
      subtitle: "Check-in harian dan menangkan hingga 2.500 Koin Ry untuk potongan belanja.",
      badge: "🎮 GAME KOIN",
      ctaText: "PUTAR SEKARANG >",
      ctaLink: "/games",
      bgGradient: "from-purple-600 via-indigo-600 to-blue-600",
    },
  ];

  // Auto-rotate Hero Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Auto Dismiss Quick Guide & Sync Show Balance preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTutorialDismissed(localStorage.getItem("ry_hide_quick_guide") === "true");
      const savedBalance = localStorage.getItem("ry_show_balance");
      if (savedBalance !== null) {
        setShowBalance(savedBalance === "true");
      }
    }

    const handleBalanceVisibility = (e: any) => {
      if (e.detail !== undefined) setShowBalance(e.detail);
    };
    window.addEventListener("balance_visibility_changed", handleBalanceVisibility);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => {
      window.removeEventListener("balance_visibility_changed", handleBalanceVisibility);
    };
  }, []);

  const toggleShowBalance = () => {
    const nextState = !showBalance;
    setShowBalance(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("ry_show_balance", String(nextState));
    }
  };

  const fetchVouchers = async () => {
    try {
      const res = await fetch("/api/coupons/public", { credentials: "include" });
      const data = await safeJson(res);
      if (data && data.status && Array.isArray(data.data)) {
        setVouchers(data.data);
      }
    } catch (e) {}
  };

  const handleClaimCoupon = async (coupon: CouponItem) => {
    setClaimingId(coupon.id);
    try {
      const res = await fetch("/api/user/claim-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: coupon.code }),
      });
      const data = await safeJson(res);
      if (data && data.status) {
        Swal.fire({
          icon: "success",
          title: "Voucher Diklaim!",
          text: `Voucher ${coupon.code} berhasil diklaim.`,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchVouchers();
      } else {
        Swal.fire({
          icon: "info",
          title: "Informasi",
          text: data.message || "Gagal mengklaim voucher.",
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan jaringan saat mengklaim voucher.",
      });
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    fetch("/api/user/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (data.status && data.data?.message) {
          setAnnouncement(data.data);
        }
      })
      .catch(() => {});

    fetch("/api/user/transactions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status && data.data) {
          const sorted = [...data.data].reverse();
          setAllTrx(sorted);
          setRecentTrx(sorted.slice(0, 5));
        }
      })
      .catch(() => {});

    fetchVouchers();
  }, []);

  // Universal Search Filter
  const cleanSearch = searchQuery.trim().toLowerCase();
  const detectedDevice = cleanSearch.length >= 8 ? analyzeImei(cleanSearch) : null;
  const filteredTrx = cleanSearch.length >= 3
    ? allTrx.filter((t) => {
        const matchId = t.id && t.id.toLowerCase().includes(cleanSearch);
        const matchImei = t.imei && t.imei.toLowerCase().includes(cleanSearch);
        const matchPhone = t.targetPhone && t.targetPhone.toLowerCase().includes(cleanSearch);
        return matchId || matchImei || matchPhone;
      }).slice(0, 5)
    : [];

  const userCoins = user?.coins || 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* ============================================================ */}
      {/* 1. FLOATING SHOPEEPAY & WALLET STRIP (Persis Shopee App)    */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline shadow-md p-3 sm:p-4 -mt-1 sm:mt-0 transition-all">
        <div className="grid grid-cols-4 divide-x divide-hairline items-center text-center">
          {/* Section 1: Saldo Dompet (ShopeePay style) */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1 text-orange-600 font-bold text-xs">
              <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM14.625 3.75h4.5a1.125 1.125 0 011.125 1.125v4.5a1.125 1.125 0 01-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5a1.125 1.125 0 011.125-1.125zM14.625 14.625h4.5a1.125 1.125 0 011.125 1.125v4.5a1.125 1.125 0 01-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5a1.125 1.125 0 011.125-1.125z" />
              </svg>
              <span className="font-extrabold text-[11px] sm:text-xs">Saldo Ry</span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
              <span className="text-[10px] text-ink-muted">Rp</span>
              <span className="text-xs sm:text-sm font-black text-ink">
                {showBalance ? (user?.balance || 0).toLocaleString("id-ID") : "••••"}
              </span>
            </div>
            <span className="text-[9px] text-orange-600 font-bold mt-0.5 block">
              + Isi Saldo
            </span>
          </div>

          {/* Section 2: Koin Ry (Shopee Coins style) */}
          <div
            onClick={() => router.push("/games")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1 text-amber-600 font-bold text-xs">
              <span className="text-xs">🪙</span>
              <span className="font-extrabold text-[11px] sm:text-xs text-amber-700">Koin Ry</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-ink mt-0.5">
              {userCoins.toLocaleString("id-ID")}
            </span>
            <span className="text-[9px] text-amber-600 font-bold mt-0.5 block">
              Cek Bonus Koin
            </span>
          </div>

          {/* Section 3: Voucher / SPayLater style */}
          <div
            onClick={() => router.push("/vouchers")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1 text-rose-600 font-bold text-xs">
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
              <span className="font-extrabold text-[11px] sm:text-xs">Voucher</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-rose-600 mt-0.5">
              Diskon 25RB
            </span>
            <span className="text-[9px] text-rose-500 font-bold mt-0.5 block">
              Klaim Kupon
            </span>
          </div>

          {/* Section 4: Instant Transfer / Top Up Button (Rp circle button) */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 text-white flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
              Rp
            </div>
            <span className="text-[9px] font-extrabold text-ink mt-1">
              Top Up Cepat
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SHOPEE 5-COLUMN FEATURE CIRCULAR LAUNCHER ICONS          */}
      {/* ============================================================ */}
      <div className="bg-canvas border border-hairline rounded-2xl p-3 shadow-2xs">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-4 text-center">
          {[
            {
              name: "Buka IMEI",
              sub: "All Operator",
              badge: "RP1",
              badgeBg: "bg-rose-500",
              href: "/unblock-imei",
              iconBg: "bg-blue-50 border-blue-200 text-blue-600",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              ),
            },
            {
              name: "Cek CEIR",
              sub: "Bea Cukai",
              badge: "PROMO",
              badgeBg: "bg-orange-500",
              href: "/cek-ceir",
              iconBg: "bg-orange-50 border-orange-200 text-orange-600",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
            },
            {
              name: "Cek Garansi",
              sub: "Lacak IMEI",
              badge: "VIP+",
              badgeBg: "bg-purple-600",
              href: "/cek-garansi",
              iconBg: "bg-purple-50 border-purple-200 text-purple-600",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
            },
            {
              name: "Bagi Voucher",
              sub: "Diskon Belanja",
              badge: "HEMAT",
              badgeBg: "bg-rose-500",
              href: "/vouchers",
              iconBg: "bg-rose-50 border-rose-200 text-rose-600",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              ),
            },
            {
              name: "Game Koin",
              sub: "Putar Hoki",
              badge: "BONUS",
              badgeBg: "bg-amber-500",
              href: "/games",
              iconBg: "bg-amber-50 border-amber-200 text-amber-600",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m0 0a6 6 0 017.38-5.84v4.8m-7.38 1.04a14.98 14.98 0 00-6.16 12.12A14.98 14.98 0 0014.369 15.59m-5.96-5.96a14.926 14.926 0 015.841-2.58" />
                </svg>
              ),
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-start group p-1 focus:outline-none"
            >
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center relative shadow-2xs group-hover:scale-105 transition-transform ${item.iconBg}`}>
                {item.icon}
                {item.badge && (
                  <span className={`absolute -top-1 -right-1 px-1 py-0.2 rounded-full ${item.badgeBg} text-white font-black text-[7px] tracking-tight uppercase shadow-xs`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-ink group-hover:text-orange-600 transition-colors mt-1.5 leading-tight line-clamp-1">
                {item.name}
              </span>
              <span className="text-[8px] sm:text-[10px] text-ink-muted leading-none hidden sm:block mt-0.5">
                {item.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Shopee Pager Pill Dot */}
        <div className="flex items-center justify-center gap-1 mt-2.5 pt-1">
          <span className="w-4 h-1 rounded-full bg-orange-500"></span>
          <span className="w-1.5 h-1 rounded-full bg-slate-300"></span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. HERO PROMO DEALS BANNER SLIDER (Shopee Hero Deals Style) */}
      {/* ============================================================ */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-hairline group">
        <div className={`p-4 sm:p-7 bg-gradient-to-r ${heroSlides[currentSlide].bgGradient} text-white transition-all duration-700 min-h-[140px] sm:min-h-[160px] flex flex-col justify-between relative`}>
          <div className="relative z-10 space-y-1.5 max-w-lg">
            <div className="inline-block bg-black/25 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-white/20">
              {heroSlides[currentSlide].badge}
            </div>
            <h2 className="text-base sm:text-2xl font-black tracking-tight leading-tight drop-shadow-sm">
              {heroSlides[currentSlide].title}
            </h2>
            <p className="text-[11px] sm:text-xs text-white/90 leading-relaxed max-w-md line-clamp-2">
              {heroSlides[currentSlide].subtitle}
            </p>
          </div>

          <div className="relative z-10 pt-2 flex items-center justify-between">
            <button
              onClick={() => router.push(heroSlides[currentSlide].ctaLink)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-orange-600 hover:bg-white/90 text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              <span>{heroSlides[currentSlide].ctaText}</span>
            </button>

            {/* Slide Indicators */}
            <div className="flex items-center gap-1.5">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${currentSlide === idx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. 2-COLUMN DISCOVERY SECTION (Shopee Live & Shopee Video)  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Discovery: Live Aktivitas Server */}
        <div
          onClick={() => router.push("/unblock-imei")}
          className="p-3 sm:p-4 rounded-2xl bg-canvas border border-hairline shadow-2xs flex flex-col justify-between cursor-pointer hover:border-orange-500/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-ink flex items-center gap-1">
              <span>Sinyal Live</span>
              <span className="text-orange-500">➔</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[8px] uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              LIVE
            </span>
          </div>

          <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20">
            <p className="text-[10px] font-bold text-ink truncate">🔥 DISKON BUKA SINYAL</p>
            <p className="text-[9px] text-ink-muted mt-0.5">Semua Operator 24 Jam</p>
          </div>
        </div>

        {/* Right Discovery: Status Server & Uptime */}
        <div
          onClick={() => router.push("/cek-garansi")}
          className="p-3 sm:p-4 rounded-2xl bg-canvas border border-hairline shadow-2xs flex flex-col justify-between cursor-pointer hover:border-emerald-500/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-ink flex items-center gap-1">
              <span>Garansi Resmi</span>
              <span className="text-emerald-500">➔</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-black text-[8px] uppercase">
              ONLINE
            </span>
          </div>

          <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <p className="text-[10px] font-bold text-ink truncate">🛡️ LACAK NOTA &amp; IMEI</p>
            <p className="text-[9px] text-ink-muted mt-0.5">Uptime 99.9% Bea Cukai</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. VOUCHER MANIA & BEST SELLER PRODUCT GRID (Shopee Style)   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Column: VOUCHER MANIA CARD */}
        <div
          onClick={() => router.push("/vouchers")}
          className="rounded-2xl p-3.5 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white shadow-md flex flex-col justify-between relative overflow-hidden cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="inline-block bg-white text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
              VOUCHER MANIA
            </span>
            <h3 className="text-sm sm:text-base font-black leading-tight drop-shadow-xs">
              PASTI DAPAT VOUCHER
            </h3>
            <p className="text-[10px] text-white/90">Diskon s.d Rp 25.000</p>
          </div>

          <div className="mt-4">
            <button className="w-full py-1.5 rounded-xl bg-white text-orange-600 font-black text-[10px] sm:text-xs shadow-sm group-hover:bg-amber-100 transition-colors">
              KLAIM AKU
            </button>
          </div>
        </div>

        {/* Right Column: BEST-SELLER PRODUCT CARD */}
        <div
          onClick={() => router.push("/unblock-imei")}
          className="rounded-2xl p-3 bg-canvas border border-hairline shadow-md flex flex-col justify-between cursor-pointer group hover:border-orange-500/40 transition-all relative"
        >
          <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[8px]">
            -25%
          </span>

          <div className="space-y-1">
            <div className="w-full h-16 sm:h-20 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl">
              📱
            </div>
            <span className="inline-block bg-amber-400 text-amber-950 text-[7px] font-black px-1 py-0.2 rounded uppercase">
              PROMO XTRA
            </span>
            <p className="text-[11px] sm:text-xs font-bold text-ink line-clamp-1 group-hover:text-orange-600 transition-colors">
              Paket Buka IMEI All Operator
            </p>
            <div className="flex items-center gap-1 text-[9px] text-ink-muted">
              <span className="text-amber-500 font-bold">⭐ 4.9</span>
              <span>•</span>
              <span>1RB+ Terjual</span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-black text-orange-600">
              Rp 155.000
            </span>
            <span className="text-[9px] text-ink-muted line-through">
              Rp 185.000
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. INSTANT SEARCH BAR / IMEI SCANNER                        */}
      {/* ============================================================ */}
      <div data-tour="search-bar" className="relative z-20">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari cepat: Ketik/Paste IMEI (15 digit) atau ID Transaksi..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-canvas border border-hairline shadow-sm text-xs sm:text-sm text-ink placeholder:text-ink-muted outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-parchment flex items-center justify-center text-[10px] text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Quick Results Dropdown */}
        {cleanSearch.length >= 3 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-canvas border border-hairline rounded-2xl shadow-2xl p-3 text-xs space-y-2.5 backdrop-blur-md z-30 max-h-[340px] overflow-y-auto">
            {detectedDevice?.brand && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-ink block">{detectedDevice.brand} {detectedDevice.model}</span>
                    <span className="text-[10px] text-ink-muted font-mono">IMEI: {cleanSearch}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => router.push(`/cek-garansi?imei=${cleanSearch}`)}
                    className="px-2.5 py-1 rounded-lg bg-canvas border border-hairline font-bold text-xs hover:bg-parchment transition-colors"
                  >
                    Cek Garansi
                  </button>
                  <button
                    onClick={() => router.push(`/unblock-imei?imei=${cleanSearch}`)}
                    className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              </div>
            )}

            {filteredTrx.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-1">Riwayat Transaksi Ditemukan:</p>
                {filteredTrx.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-2.5 rounded-xl bg-parchment hover:bg-slate-200/60 border border-hairline flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{trx.packageName || "Unblock IMEI"}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          trx.status === "success" ? "bg-emerald-100 text-emerald-800" :
                          trx.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {trx.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-ink-muted mt-0.5">IMEI: {trx.imei} • #{trx.id.substring(0, 12)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedInvoiceTrx(trx)}
                      className="px-2.5 py-1 rounded-lg bg-canvas border border-hairline font-bold text-[11px] text-ink hover:bg-parchment transition-colors shrink-0"
                    >
                      Nota
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 7. RIWAYAT TRANSAKSI TERAKHIR                               */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
            <span>📋 Riwayat Transaksi Terakhir</span>
          </h2>
          <a href="/history" className="text-xs font-bold text-orange-600 hover:underline">Lihat Semua ➔</a>
        </div>

        {recentTrx.length === 0 ? (
          <div className="text-center py-6 bg-canvas border border-hairline rounded-2xl">
            <p className="text-xs text-ink-muted">Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrx.map((trx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-canvas border border-hairline rounded-2xl hover:border-orange-500/30 transition-all shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                    📱
                  </div>
                  <div>
                    <p className="font-bold text-xs text-ink line-clamp-1">{trx.packageName || "Layanan IMEI"}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5 font-mono">
                      {trx.imei ? (trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1})` : trx.imei) : trx.targetPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-ink">Rp {(trx.originalPrice || trx.baseAmount || 0).toLocaleString('id-ID')}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 text-[8px] font-bold rounded-md uppercase ${trx.status === 'success' || trx.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : trx.status === 'failed' || trx.status === 'canceled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {trx.status === 'completed' ? 'success' : trx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Modal for Universal Search */}
      <InvoiceModal
        isOpen={!!selectedInvoiceTrx}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={selectedInvoiceTrx ? {
          trxId: selectedInvoiceTrx.id,
          imei: selectedInvoiceTrx.imei,
          packageName: selectedInvoiceTrx.packageName,
          serviceType: selectedInvoiceTrx.service_type || selectedInvoiceTrx.serviceType,
          createdAt: selectedInvoiceTrx.createdAt,
          amount: selectedInvoiceTrx.amount,
          status: selectedInvoiceTrx.status,
          warranty: selectedInvoiceTrx.warranty || {
            hasWarranty: !selectedInvoiceTrx.service_type?.includes('ceir'),
            remainingDays: selectedInvoiceTrx.remainingDays
          },
          adminNote: selectedInvoiceTrx.admin_note || selectedInvoiceTrx.adminNote
        } : null}
      />
    </div>
  );
}
