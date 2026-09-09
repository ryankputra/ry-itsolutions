"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { analyzeImei } from "@/lib/imeiHelper";
import { useRouter } from "next/navigation";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import { CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { safeJson } from "@/lib/api";
import Link from "next/link";
import Swal from "@/lib/sweetalert";

export default function DashboardPage() {
  const { user } = useApp();
  const router = useRouter();

  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [allTrx, setAllTrx] = useState<any[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);

  // Hero Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  // Hero Promo Carousel Slides (Signature Ry-ITSolutions Blue Identity & Talent Posters)
  const heroSlides = [
    {
      title: "INSTANT DEALS BUKA SINYAL KILAT",
      subtitle: "Aktivasi IMEI All Operator kilat 24 jam dengan garansi digital resmi & nota transaksi.",
      badge: "LAYANAN UTAMA",
      ctaText: "BELI SEKARANG >",
      ctaLink: "/unblock-imei",
      bgGradient: "from-blue-950/90 via-blue-900/80 to-transparent",
      image: "/banners/banner_imei.jpg",
    },
    {
      title: "VOUCHER DISKON TRANSAKSI",
      subtitle: "Klaim kupon diskon tambahan sebelum checkout untuk hemat belanja maksimal.",
      badge: "PROMO SPESIAL",
      ctaText: "KLAIM VOUCHER >",
      ctaLink: "/vouchers",
      bgGradient: "from-indigo-950/90 via-purple-900/80 to-transparent",
      image: "/banners/banner_voucher.jpg",
    },
    {
      title: "CHECK-IN HARIAN & PUTAR RODA HOKI",
      subtitle: "Kumpulkan Koin Ry gratis setiap hari untuk potongan harga saat order.",
      badge: "REWARD KOIN",
      ctaText: "MAIN SEKARANG >",
      ctaLink: "/games",
      bgGradient: "from-cyan-950/90 via-blue-950/80 to-transparent",
      image: "/banners/banner_rewards.jpg",
    },
    {
      title: "PAYMENT GATEWAY GOPAY & QRIS",
      subtitle: "Terima pembayaran QRIS otomatis di web & bot toko Anda. Uang langsung masuk rekening GoPay.",
      badge: "UNOFFICIAL SAAS",
      ctaText: "MULAI INTEGRASI >",
      ctaLink: "/gateway",
      bgGradient: "from-slate-950/90 via-blue-950/65 to-transparent",
      image: "/banners/banner_gopay.jpg",
    },
  ];

  // Auto-rotate Hero Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Sync Show Balance preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedBalance = localStorage.getItem("ry_show_balance");
      if (savedBalance !== null) {
        setShowBalance(savedBalance === "true");
      }
    }

    const handleBalanceVisibility = (e: any) => {
      if (e.detail !== undefined) setShowBalance(e.detail);
    };
    window.addEventListener("balance_visibility_changed", handleBalanceVisibility);

    return () => {
      window.removeEventListener("balance_visibility_changed", handleBalanceVisibility);
    };
  }, []);

  const toggleShowBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  useEffect(() => {
    fetch("/api/user/transactions", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && data?.data && Array.isArray(data.data)) {
          const sorted = [...data.data].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || 0).getTime() || 0;
            return timeB - timeA;
          });
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
      {/* 1. FLOATING WALLET STRIP (Linear/Apple Minimalist)          */}
      {/* ============================================================ */}
      <div data-tour="wallet-card" className="rounded-3xl bg-white dark:bg-[#161617] border border-black/[0.05] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 sm:p-5 transition-all">
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 items-center text-center">
          {/* Section 1: Saldo Dompet */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Saldo Ry</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                {showBalance ? `Rp ${(user?.balance || 0).toLocaleString("id-ID")}` : "Rp ••••••"}
              </span>
              <button
                type="button"
                onClick={toggleShowBalance}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5"
                title={showBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
              >
                {showBalance ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              + Isi Saldo
            </span>
          </div>

          {/* Section 2: Koin Ry */}
          <div
            onClick={() => router.push("/games")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs">
              <span className="w-6 h-6 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M14.5 9h-5v6h5"/>
                  <path d="M12 7v10"/>
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Koin Ry</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mt-1 tracking-tight">
              {userCoins.toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Klaim Koin
            </span>
          </div>

          {/* Section 3: Voucher Promo */}
          <div
            onClick={() => router.push("/vouchers")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs">
              <span className="w-6 h-6 rounded-full bg-[#FF2D55]/10 text-[#FF2D55] flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Voucher</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mt-1 tracking-tight">
              {vouchers.length > 0 ? `${vouchers.length} Kupon` : "Klaim"}
            </span>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Cek Promo
            </span>
          </div>

          {/* Section 4: Instant Top Up Button */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center px-1.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-xs transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              Top Up
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. 6-COLUMN FEATURE SERVICE GRID (Clean & Professional)     */}
      {/* ============================================================ */}
      <div className="bg-white dark:bg-[#161617] border border-black/[0.05] dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {[
            {
              name: "Buka IMEI",
              href: "/unblock-imei",
              tourKey: "service-unblock",
              iconBg: "bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary dark:text-primary group-hover:bg-primary/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              ),
            },
            {
              name: "Diagnostik",
              href: "/cek-ceir",
              tourKey: "service-ceir",
              iconBg: "bg-[#34C759]/10 dark:bg-[#34C759]/20 border border-[#34C759]/20 dark:border-[#34C759]/30 text-[#34C759] dark:text-[#30D158] group-hover:bg-[#34C759]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
            },
            {
              name: "Cek Garansi",
              href: "/cek-garansi",
              tourKey: "service-garansi",
              iconBg: "bg-[#5856D6]/10 dark:bg-[#5856D6]/20 border border-[#5856D6]/20 dark:border-[#5856D6]/30 text-[#5856D6] dark:text-[#5E5CE6] group-hover:bg-[#5856D6]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
            },
            {
              name: "Voucher",
              href: "/vouchers",
              tourKey: "service-voucher",
              iconBg: "bg-[#FF2D55]/10 dark:bg-[#FF2D55]/20 border border-[#FF2D55]/20 dark:border-[#FF2D55]/30 text-[#FF2D55] dark:text-[#FF375F] group-hover:bg-[#FF2D55]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              ),
            },
            {
              name: "Game Koin",
              href: "/games",
              tourKey: "service-games",
              iconBg: "bg-[#FF9500]/10 dark:bg-[#FF9500]/20 border border-[#FF9500]/20 dark:border-[#FF9500]/30 text-[#FF9500] dark:text-[#FF9F0A] group-hover:bg-[#FF9500]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 016.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m0 0a6 6 0 017.38-5.84v4.8m-7.38 1.04a14.98 14.98 0 00-6.16 12.12A14.98 14.98 0 0014.369 15.59m-5.96-5.96a14.926 14.926 0 015.841-2.58" />
                </svg>
              ),
            },
            {
              name: "Gateway GoPay",
              badge: "Unoff",
              href: "/gateway",
              tourKey: "service-gateway",
              iconBg: "bg-[#30B0C7]/10 dark:bg-[#30B0C7]/20 border border-[#30B0C7]/20 dark:border-[#30B0C7]/30 text-[#30B0C7] dark:text-[#64D2FF] group-hover:bg-[#30B0C7]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 0v3.75m0-3.75l-3.75 3.75" />
                </svg>
              ),
            },
            {
              name: "Panduan",
              onClick: () => window.dispatchEvent(new Event("open_app_tour")),
              tourKey: "service-panduan",
              iconBg: "bg-[#AF52DE]/10 dark:bg-[#AF52DE]/20 border border-[#AF52DE]/20 dark:border-[#AF52DE]/30 text-[#AF52DE] dark:text-[#BF5AF2] group-hover:bg-[#AF52DE]/20",
              icon: (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              data-tour={item.tourKey}
              onClick={item.onClick || (() => router.push(item.href!))}
              className="flex flex-col items-center justify-start group p-0.5 focus:outline-none"
            >
              <div className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform ${item.iconBg}`}>
                {item.icon}
                {(item as any).badge && (
                  <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-[#1D1D1F] text-white font-semibold text-[7px] rounded-full uppercase tracking-wider shadow-xs border border-white/40">
                    {(item as any).badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors mt-2 text-center tracking-tight leading-tight line-clamp-1">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2.5 DEDICATED PAYMENT GATEWAY SAAS CARD ON DASHBOARD        */}
      {/* ============================================================ */}
      <div
        onClick={() => router.push("/gateway")}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-400/40 p-4 sm:p-5 text-white flex items-center justify-between cursor-pointer shadow-lg hover:shadow-xl transition-all group min-h-[105px] sm:min-h-[120px]"
      >
        {/* Background Real Commercial Talent Image - Bright & Clear */}
        <img
          src="/banners/banner_gopay.jpg"
          alt="Payment Gateway GoPay & QRIS"
          className="absolute inset-0 w-full h-full object-cover object-[65%_center] sm:object-[60%_35%] group-hover:scale-105 transition-transform duration-700"
        />

        {/* Dynamic Dark Gradient Overlay for Maximum Text Clarity */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 sm:via-slate-950/50 to-transparent" />

        {/* Left Content */}
        <div className="relative z-10 flex items-center gap-3 sm:gap-4 max-w-sm sm:max-w-lg">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md group-hover:rotate-6 transition-transform">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 0v3.75m0-3.75l-3.75 3.75" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-black text-xs sm:text-sm text-white drop-shadow-md">
                Payment Gateway GoPay &amp; QRIS
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                Unofficial
              </span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/80 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider border border-white/20">
                Rp 10rb/bln
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-200 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none drop-shadow-sm">
              Terima pembayaran QRIS otomatis di website &amp; bot toko Anda. Uang langsung masuk rekening GoPay.
            </p>
          </div>
        </div>

        {/* Right CTA Button */}
        <span className="relative z-10 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider shrink-0 border border-white/25 flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform">
          <span>Kelola</span>
          <span>&gt;</span>
        </span>
      </div>

      {/* ============================================================ */}
      {/* 3. HERO PROMO DEALS BANNER SLIDER                           */}
      {/* ============================================================ */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-hairline group">
        <div className="relative min-h-[165px] sm:min-h-[195px] flex flex-col justify-between p-4 sm:p-6 text-white transition-all duration-700">
          {/* Background Talent Poster Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSlides[currentSlide].image}
            alt={heroSlides[currentSlide].title}
            className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 transform group-hover:scale-105"
          />

          {/* Gradient Overlay for Text Legibility */}
          <div className={`absolute inset-0 bg-gradient-to-r ${heroSlides[currentSlide].bgGradient} transition-all duration-700`} />

          {/* Banner Content */}
          <div className="relative z-10 space-y-1.5 max-w-sm sm:max-w-md">
            <div className="inline-block bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-white/20">
              {heroSlides[currentSlide].badge}
            </div>
            <h2 className="text-base sm:text-xl font-black tracking-tight leading-tight drop-shadow-md text-white">
              {heroSlides[currentSlide].title}
            </h2>
            <p className="text-[11px] sm:text-xs text-white/95 leading-relaxed line-clamp-2 drop-shadow-sm font-medium">
              {heroSlides[currentSlide].subtitle}
            </p>
          </div>

          <div className="relative z-10 pt-3 flex items-center justify-between">
            <button
              onClick={() => router.push(heroSlides[currentSlide].ctaLink)}
              className="px-4 py-1.5 rounded-xl bg-white text-primary hover:bg-white/90 text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-1 border border-white/40"
            >
              <span>{heroSlides[currentSlide].ctaText}</span>
            </button>

            {/* Slide Indicators */}
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${currentSlide === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. 2-COLUMN DISCOVERY SECTION                               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Discovery: Sinyal Live & Layanan */}
        <div
          onClick={() => router.push("/unblock-imei")}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:border-gray-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-ink flex items-center gap-1">
              <span>Sinyal Live</span>
              <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[8px] uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              24 JAM
            </span>
          </div>

          <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-primary/20 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-ink truncate">BUKA SINYAL IMEI</p>
              <p className="text-[9px] text-ink-muted truncate">Semua Operator</p>
            </div>
          </div>
        </div>

        {/* Right Discovery: Status Garansi & Lacak Nota */}
        <div
          onClick={() => router.push("/cek-garansi")}
          className="p-3 sm:p-4 rounded-2xl bg-canvas border border-hairline shadow-2xs flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-ink flex items-center gap-1">
              <span>Garansi &amp; Nota</span>
              <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold text-[8px] uppercase">
              RESMI
            </span>
          </div>

          <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-ink truncate">LACAK MASA AKTIF</p>
              <p className="text-[9px] text-ink-muted truncate">Cetak Nota Digital</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. VOUCHER & BEST SELLER PRODUCT SECTION                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Column: VOUCHER CARD (Clean Obsidian Accent) */}
        <div
          onClick={() => router.push("/vouchers")}
          className="rounded-xl p-4 bg-gray-900 text-white border border-gray-800 shadow-xs flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:bg-gray-800 transition-colors"
        >
                    <div className="space-y-1 relative z-10">
            <span className="inline-block bg-white text-primary text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
              VOUCHER DISKON
            </span>
            <h3 className="text-sm sm:text-base font-black leading-tight drop-shadow-xs">
              KLAIM KUPON HEMAT
            </h3>
            <p className="text-[10px] text-white/90">Gunakan saat checkout pesanan</p>
          </div>

          <div className="mt-3">
            <button className="w-full py-1.5 rounded-xl bg-white text-primary font-bold text-[10px] sm:text-xs shadow-xs group-hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
              <span>LIHAT KUPON</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Column: BEST-SELLER PRODUCT CARD */}
        <div
          onClick={() => router.push("/unblock-imei")}
          className="rounded-2xl p-3 bg-canvas border border-hairline shadow-sm flex flex-col justify-between cursor-pointer group hover:border-primary/40 transition-all"
        >
          <div className="space-y-1">
            <div className="w-full h-14 sm:h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <span className="inline-block bg-blue-600 text-white text-[7px] font-bold px-1.5 py-0.2 rounded uppercase">
              POPULER
            </span>
            <p className="text-[11px] sm:text-xs font-bold text-ink line-clamp-1 group-hover:text-primary transition-colors">
              Paket Buka IMEI All Operator
            </p>
            <div className="flex items-center gap-1 text-[9px] text-ink-muted">
              <span className="text-amber-500 font-bold">4.9/5.0</span>
              <span>•</span>
              <span>1 Bulan / Garansi Resmi</span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-black text-primary">
              Mulai Rp 155RB
            </span>
          </div>
        </div>
      </div>

      {/* Referral Program Banner */}
      <div
        data-tour="service-referral"
        onClick={() => router.push("/referral")}
        className="rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between cursor-pointer group hover:opacity-95 transition-opacity relative overflow-hidden"
      >
                <div className="space-y-0.5 relative z-10">
          <span className="inline-block bg-white text-amber-900 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
            BONUS REFERRAL
          </span>
          <h4 className="text-xs sm:text-sm font-black text-white">Ajak Teman &amp; Dapatkan Komisi Saldo</h4>
          <p className="text-[10px] text-amber-100 font-medium">Bagikan link referral dan peroleh bonus komisi tiap transaksi</p>
        </div>
        <span className="relative z-10 px-3 py-1.5 rounded-xl bg-white text-amber-950 font-black text-xs shrink-0 shadow-sm border border-white/40 group-hover:scale-105 transition-transform">
          Klaim Cuan &gt;
        </span>
      </div>

      {/* ============================================================ */}
      {/* 6. INSTANT SEARCH BAR / IMEI SCANNER                        */}
      {/* ============================================================ */}
      <div className="relative z-20">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari cepat: Ketik/Paste IMEI (15 digit) atau ID Transaksi..."
            className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all"
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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Live Search Quick Results Dropdown */}
        {cleanSearch.length >= 3 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-canvas border border-hairline rounded-2xl shadow-2xl p-3 text-xs space-y-2.5 backdrop-blur-md z-30 max-h-[340px] overflow-y-auto">
            {detectedDevice?.brand && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
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
                    className="px-2.5 py-1 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors"
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
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <span>Riwayat Transaksi Terakhir</span>
          </h2>
          <Link href="/history" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <span>Lihat Semua</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {recentTrx.length === 0 ? (
          <div className="text-center py-6 bg-canvas border border-hairline rounded-2xl">
            <p className="text-xs text-ink-muted">Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrx.map((trx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 rounded-xl hover:border-gray-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900 dark:text-white line-clamp-1">{trx.packageName || "Layanan IMEI"}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                      {trx.imei ? (trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1})` : trx.imei) : trx.targetPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-xs text-gray-900 dark:text-white">Rp {(trx.amount || trx.price || trx.totalAmount || trx.originalPrice || trx.baseAmount || 0).toLocaleString('id-ID')}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 text-[9px] font-medium rounded ${
                    trx.status === 'success' || trx.status === 'completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200/60' :
                    trx.status === 'failed' || trx.status === 'canceled' ? 'bg-red-50 text-red-700 border border-red-200/50' :
                    'bg-amber-50 text-amber-700 border border-amber-200/50'
                  }`}>
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
