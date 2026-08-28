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
  const [publicInfo, setPublicInfo] = useState<string>("");
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [allTrx, setAllTrx] = useState<any[]>([]);
  const [selectedQris, setSelectedQris] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  // Tutorial / Onboarding State
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [activeTutorialTab, setActiveTutorialTab] = useState<number>(0);
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(false);

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

    // Meminta Izin Push Notification
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("Notifikasi Aktif!", {
              body: "Anda akan menerima update transaksi dan pengumuman di sini.",
              icon: "/icon-192.png"
            });
          }
        });
      }
    }

    async function loadDashboardData() {
      try {
        const [annRes, trxRes, cpnRes] = await Promise.all([
          fetch("/api/user/announcement", { credentials: 'include' }).catch(() => null),
          fetch("/api/user/transactions", { credentials: 'include' }).catch(() => null),
          fetch("/api/coupons/public", { credentials: 'include' }).catch(() => null)
        ]);

        if (annRes?.ok) {
          const data = await safeJson(annRes);
          if (data?.status && data?.data?.message) setAnnouncement(data.data);
        }
        if (trxRes?.ok) {
          const data = await safeJson(trxRes);
          if (data?.status && data?.data) {
            setAllTrx(data.data);
            setRecentTrx(data.data.slice(0, 3));
          }
        }
        if (cpnRes?.ok) {
          const data = await safeJson(cpnRes);
          if (data?.status && Array.isArray(data?.data)) {
            setVouchers(data.data);
          }
        }
      } catch (err) { console.error(err); }
    }
    loadDashboardData();

    return () => {
      window.removeEventListener("balance_visibility_changed", handleBalanceVisibility);
    };
  }, []);

  const toggleShowBalance = () => {
    const next = !showBalance;
    setShowBalance(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("ry_show_balance", next.toString());
      window.dispatchEvent(new CustomEvent("balance_visibility_changed", { detail: next }));
    }
  };

  const handleClaimCoupon = async (coupon: CouponItem) => {
    setClaimingId(coupon.id);
    try {
      const res = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ coupon_id: coupon.id })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({
          title: "Voucher Berhasil Diklaim!",
          text: data.message,
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
        setVouchers(prev =>
          prev.map(c =>
            c.id === coupon.id
              ? { ...c, is_claimed: true, total_claimed_count: (c.total_claimed_count || 0) + 1 }
              : c
          )
        );
      } else {
        Swal.fire({
          title: "Gagal Mengklaim",
          text: data.message || "Voucher tidak dapat diklaim saat ini.",
          icon: "error"
        });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    } finally {
      setClaimingId(null);
    }
  };

  // Universal Search Filter
  const cleanSearch = searchQuery.trim();
  const detectedDevice = cleanSearch.length >= 8 ? analyzeImei(cleanSearch) : null;
  const filteredTrx = cleanSearch.length >= 3 
    ? allTrx.filter(t => 
        (t.imei && t.imei.includes(cleanSearch)) || 
        (t.id && t.id.toLowerCase().includes(cleanSearch.toLowerCase())) ||
        (t.packageName && t.packageName.toLowerCase().includes(cleanSearch.toLowerCase()))
      ).slice(0, 4)
    : [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Header Profile */}
      <TelegramPopup />
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Wassup, {user?.name?.split(' ')[0] || "Bestie"} ✨</h1>
          <p className="text-sm text-ink-muted">Welcome back to Ry-ITSolutions</p>
        </div>
      </div>

      {/* Universal Instant Search Bar */}
      <div data-tour="search-bar" className="relative z-20">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari cepat: Ketik/Paste IMEI (15 digit) atau ID Transaksi..."
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-canvas border border-hairline shadow-sm text-sm text-ink placeholder:text-ink-muted outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-xs text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Quick Results Dropdown */}
        {cleanSearch.length >= 3 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-canvas border border-hairline rounded-2xl shadow-2xl p-3 text-xs space-y-2.5 backdrop-blur-md z-30 max-h-[340px] overflow-y-auto">
            {/* Live IMEI Detection Card */}
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

            {/* Matched Transactions */}
            {filteredTrx.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-1">Riwayat Transaksi Ditemukan:</p>
                {filteredTrx.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-2.5 rounded-xl bg-parchment/60 hover:bg-parchment border border-hairline flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{trx.packageName || "Unblock IMEI"}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          trx.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                          trx.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
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

            {cleanSearch.length >= 8 && !detectedDevice?.brand && filteredTrx.length === 0 && (
              <div className="p-3 text-center text-ink-muted">
                <p>Tidak ada transaksi yang cocok. Tekan untuk cek IMEI langsung:</p>
                <div className="flex justify-center gap-2 mt-2">
                  <button
                    onClick={() => router.push(`/cek-garansi?imei=${cleanSearch}`)}
                    className="px-3 py-1 rounded-lg bg-primary text-white font-bold text-xs"
                  >
                    Cek Garansi IMEI #{cleanSearch}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Announcement Banner */}
      {announcement && (
        <div
          className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden"
          style={{ backgroundColor: announcement.bgColor || '#dc2626' }}
        >
          <div className="absolute -right-4 -top-4 text-white/10">
            <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-sm mb-1">📢 Info Penting Nih!</h3>
            <p className="text-sm opacity-90">{announcement.message}</p>
          </div>
        </div>
      )}

      {/* Wallet Card Premium PPOB Style */}
      <div data-tour="wallet-card" className="relative rounded-[24px] p-6 text-white overflow-hidden shadow-xl shadow-primary/20 bg-gradient-to-br from-[#0066cc] via-[#005bb5] to-[#004080] hover:scale-[1.02] transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg width="120" height="120" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">Cuan Aktif 💰</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">Rp</span>
                    <span className="text-4xl font-black tracking-tight">
                      {showBalance ? (user?.balance?.toLocaleString('id-ID') || "0") : "******"}
                    </span>
                    <button onClick={toggleShowBalance} className="ml-2 text-white/80 hover:text-white transition-colors">
                      {showBalance ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold capitalize border border-white/10">
              {user?.role}
            </div>
          </div>

          <div className="flex gap-3">
            <a href="/topup" className="flex-1 bg-white text-[#005bb5] hover:bg-white/90 transition-colors py-2.5 rounded-full font-bold text-sm shadow-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Top Up Cuan
            </a>
            <a href="/history" className="flex-1 bg-[#004080]/50 hover:bg-[#004080]/80 transition-colors border border-white/20 py-2.5 rounded-full font-bold text-sm text-center flex items-center justify-center gap-2">
              History
            </a>
          </div>
        </div>
      </div>

      {/* Tutorial & Quick Start Guide Hub (Smooth Animated Expand/Collapse) */}
      <Card glass className="overflow-hidden border-primary/20 bg-gradient-to-br from-canvas via-canvas to-primary/5 shadow-sm transition-all duration-500">
        <div className="p-4 sm:p-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div 
              onClick={() => {
                const next = !tutorialDismissed;
                setTutorialDismissed(next);
                if (typeof window !== "undefined") {
                  if (next) localStorage.setItem("ry_hide_quick_guide", "true");
                  else localStorage.removeItem("ry_hide_quick_guide");
                }
              }}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary/20 to-blue-500/20 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 group-hover:scale-105 transition-transform duration-300 shadow-xs">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-ink group-hover:text-primary transition-colors">
                    Panduan Cepat Penggunaan
                  </h2>
                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    5 Langkah
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-ink-muted">
                  {tutorialDismissed ? "Klik untuk membuka alur langkah mudah transaksi" : "Cara mudah & cepat menggunakan layanan Ry-ITSolutions"}
                </p>
              </div>
            </div>

            {/* Actions & Collapse Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!tutorialDismissed && (
                <>
                  <button
                    onClick={() => setShowGuidedTour(true)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    title="Mulai Tur Petunjuk Interaktif dengan Suara AI"
                  >
                    <svg className="w-3.5 h-3.5 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                    <span>Tur Audio AI</span>
                  </button>
                  <button
                    onClick={() => setShowTutorialModal(true)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-xs hover:shadow-primary/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Detail Panduan</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  const next = !tutorialDismissed;
                  setTutorialDismissed(next);
                  if (typeof window !== "undefined") {
                    if (next) localStorage.setItem("ry_hide_quick_guide", "true");
                    else localStorage.removeItem("ry_hide_quick_guide");
                  }
                }}
                className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  tutorialDismissed 
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 shadow-2xs" 
                    : "bg-canvas border-hairline text-ink-muted hover:text-ink hover:bg-parchment"
                }`}
                title={tutorialDismissed ? "Tampilkan Panduan Cepat" : "Sembunyikan Panduan Cepat"}
              >
                <span className="text-[11px] sm:inline hidden">{tutorialDismissed ? "Tampilkan" : "Sembunyikan"}</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${tutorialDismissed ? "" : "rotate-180"}`} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={2.5} 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collapsible Content Body with Smooth CSS Grid Animation */}
          <div
            className={`grid transition-all duration-500 ease-in-out overflow-hidden ${
              tutorialDismissed ? "grid-rows-[0fr] opacity-0 mt-0" : "grid-rows-[1fr] opacity-100 mt-4 pt-3 border-t border-hairline/60"
            }`}
          >
            <div className="overflow-hidden">
              {/* Quick Steps: Horizontal Swipeable Carousel on Mobile, Clean Grid on Desktop */}
              <div className="flex sm:grid sm:grid-cols-5 gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar snap-x snap-mandatory">
                {[
                  { 
                    step: "1", 
                    title: "Top Up Saldo", 
                    desc: "Scan QRIS 24 jam", 
                    href: "/topup",
                    svg: (
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    )
                  },
                  { 
                    step: "2", 
                    title: "Cek Database", 
                    desc: "Histori CEIR & Bea Cukai", 
                    href: "/cek-ceir",
                    svg: (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    )
                  },
                  { 
                    step: "3", 
                    title: "Buka Sinyal", 
                    desc: "Input IMEI & durasi", 
                    href: "/unblock-imei",
                    svg: (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                      </svg>
                    )
                  },
                  { 
                    step: "4", 
                    title: "Notif WhatsApp", 
                    desc: "Nota otomatis ke WA", 
                    href: "/history",
                    svg: (
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.84-.945 4.47 4.47 0 00.743-1.807C3.916 16.71 3 14.473 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    )
                  },
                  { 
                    step: "5", 
                    title: "Garansi Digital", 
                    desc: "Pantau aktif & klaim", 
                    href: "/cek-garansi",
                    svg: (
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    )
                  }
                ].map((s, idx) => (
                  <a
                    key={idx}
                    href={s.href}
                    className="w-[135px] sm:w-auto shrink-0 snap-start p-3 rounded-2xl bg-canvas border border-hairline hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col justify-between shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                        {s.step}
                      </span>
                      <span className="p-1 rounded-lg bg-parchment/60 group-hover:scale-110 transition-transform flex items-center justify-center">
                        {s.svg}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-ink group-hover:text-primary transition-colors line-clamp-1">{s.title}</h4>
                      <p className="text-[10px] text-ink-muted leading-tight mt-0.5 line-clamp-1">{s.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Zona Voucher & Promo Diskon (Shopee Style E-Commerce Experience) */}
      {vouchers.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h2 className="text-base font-bold text-ink flex items-center gap-1.5">
                Voucher & Promo Diskon Spesial
              </h2>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full">
                Klaim Sekarang
              </span>
            </div>
            <p className="text-xs text-ink-muted hidden sm:block">Klaim kupon & pakai saat checkout</p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar snap-x snap-mandatory">
            {vouchers.map((coupon) => (
              <div key={coupon.id} className="snap-start shrink-0">
                <ShopeeVoucherCard
                  coupon={coupon}
                  compact
                  isClaiming={claimingId === coupon.id}
                  onClaim={handleClaimCoupon}
                  onUse={() => router.push("/unblock-imei")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div>
        <h2 className="text-lg font-bold text-ink mb-4">Layanan Utama</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {[
            { 
              name: "Buka IMEI", 
              tourId: "service-unblock",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 12.75v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ), 
              href: "/unblock-imei", 
              color: "bg-rose-50 text-rose-600 border border-rose-100" 
            },
            { 
              name: "Cek CEIR", 
              tourId: "service-ceir",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              ), 
              href: "/cek-ceir", 
              color: "bg-emerald-50 text-emerald-600 border border-emerald-100" 
            },
            { 
              name: "Cek Garansi", 
              tourId: "service-garansi",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ), 
              href: "/cek-garansi", 
              color: "bg-blue-50 text-blue-600 border border-blue-100" 
            },
            { 
              name: "Program Referral", 
              tourId: "service-referral",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              ), 
              href: "/referral", 
              color: "bg-amber-50 text-amber-600 border border-amber-100" 
            },
            { 
              name: "Klaim Voucher", 
              tourId: "service-voucher",
              badge: "PROMO",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              ), 
              href: "/vouchers", 
              color: "bg-orange-50 text-orange-600 border border-orange-200" 
            },
            { 
              name: "Cetak Barcode", 
              tourId: "service-barcode",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                </svg>
              ), 
              href: "/barcode", 
              color: "bg-teal-50 text-teal-600 border border-teal-100" 
            },
            ...(menuSettings?.showBeliPaket ? [{ 
              name: "Suntik Kuota", 
              tourId: "service-kuota",
              svg: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              ), 
              href: "/beli-paket", 
              color: "bg-purple-50 text-purple-600 border border-purple-100" 
            }] : [])
          ].map(item => (
            <a 
              key={item.name} 
              href={item.href} 
              data-tour={item.tourId}
              className="flex flex-col items-center gap-2 group relative"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-md relative ${item.color}`}>
                {item.svg}
                {(item as any).badge && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-[8px] shadow-xs">
                    {(item as any).badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-center text-ink/80">{item.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4 mt-6">
          <h2 className="text-lg font-bold text-ink">Jejak Transaksi</h2>
          <a href="/history" className="text-sm font-semibold text-primary">Lihat Semua</a>
        </div>

        {recentTrx.length === 0 ? (
          <div className="text-center py-8 bg-canvas border border-hairline rounded-2xl">
            <p className="text-sm text-ink-muted">Belum ada pergerakan transaksi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrx.map((trx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-canvas border border-hairline rounded-[18px] hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-ink line-clamp-1">{trx.packageName || "Layanan IMEI"}</p>
                    <p className="text-xs text-ink-muted mt-0.5 font-mono">
                      {trx.imei ? (trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1})` : trx.imei) : trx.targetPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-ink">Rp {(trx.originalPrice || trx.baseAmount || 0).toLocaleString('id-ID')}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase ${trx.status === 'success' || trx.status === 'completed' ? 'bg-green-100 text-green-700' : trx.status === 'failed' || trx.status === 'canceled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {trx.status === 'completed' ? 'success' : trx.status}
                  </span>
                  {trx.type === 'topup' && trx.status === 'pending' && trx.qrisData && (
                    <button
                      onClick={() => setSelectedQris(trx.qrisData)}
                      className="block mt-2 px-2 py-1 text-xs bg-primary text-white font-bold rounded"
                    >
                      Lihat QRIS
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QRIS Modal */}
      {selectedQris && (() => {
        const createdAt = selectedQris.createdAt ? new Date(selectedQris.createdAt).getTime() : Date.now();
        const expiresAt = Math.floor((createdAt + 15 * 60 * 1000) / 1000);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="max-w-xs w-full p-6 text-center space-y-4 relative">
              <button onClick={() => setSelectedQris(null)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="font-bold text-lg">Bayar Top Up</h3>
              <p className="text-primary font-black text-2xl">Rp {selectedQris.uniqueAmount?.toLocaleString('id-ID')}</p>

              <div className="relative mx-auto border-2 border-hairline p-2 rounded-xl">
                <div className="absolute -top-3 -right-3 bg-rose-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-md flex items-center gap-1.5 animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <CountdownTimer expiresAt={expiresAt} onExpire={() => setSelectedQris(null)} />
                </div>
                <img src={selectedQris.base64Image || selectedQris.qrisData?.base64Image} alt="QRIS" className="w-full h-auto" />
              </div>
              <p className="text-xs text-ink-muted">Scan QRIS ini di aplikasi e-Wallet atau m-Banking Anda sebelum waktu habis.</p>
            </Card>
          </div>
        );
      })()}

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

      {/* Interactive Tutorial & Onboarding Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <Card className="w-full max-w-xl bg-canvas border border-hairline p-0 overflow-hidden flex flex-col shadow-2xl rounded-3xl max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 bg-gradient-to-r from-primary to-blue-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Panduan Lengkap Ry-ITSolutions</h3>
                  <p className="text-xs text-white/80">Ikuti 5 langkah mudah berikut untuk menggunakan web</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-sm text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Steps Carousel / Tabs */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Step Tab Buttons */}
              <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
                {[
                  { 
                    label: "1. Top Up", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    ) 
                  },
                  { 
                    label: "2. Cek IMEI", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    ) 
                  },
                  { 
                    label: "3. Buka Sinyal", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                      </svg>
                    ) 
                  },
                  { 
                    label: "4. Notif WA", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.84-.945 4.47 4.47 0 00.743-1.807C3.916 16.71 3 14.473 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    )
                  },
                  {
                    label: "5. Garansi", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    ) 
                  },
                  { 
                    label: "6. Klaim Voucher", 
                    svg: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                    ) 
                  },
                ].map((tab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTutorialTab(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTutorialTab === idx
                        ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                        : 'bg-canvas border border-hairline text-ink-muted hover:bg-parchment'
                    }`}
                  >
                    <span>{tab.svg}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Step Content */}
              {activeTutorialTab === 0 && (
                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <span>Langkah 1: Top Up Saldo Otomatis</span>
                  </div>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    Sistem menggunakan <b>QRIS Dinamis 24 Jam</b>. Masukkan nominal top up yang Anda inginkan di menu Top Up, scan QRIS menggunakan GoPay, OVO, DANA, BCA, atau M-Banking mana pun. Saldo akan otomatis bertambah detik itu juga tanpa perlu konfirmasi admin.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" onClick={() => { setShowTutorialModal(false); router.push('/topup'); }}>
                      Menuju Menu Top Up ➔
                    </Button>
                  </div>
                </div>
              )}

              {activeTutorialTab === 1 && (
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <span>Langkah 2: Cek Status Database IMEI</span>
                  </div>
                  <p className="text-xs text-emerald-950 leading-relaxed">
                    Sebelum melakukan order aktivasi sinyal, Anda disarankan mengecek status IMEI perangkat melalui menu <b>Cek Database CEIR</b> atau <b>Cek Bea Cukai</b> untuk mengetahui histori dan status registrasi perangkat sebelumnya.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowTutorialModal(false); router.push('/cek-ceir'); }}>
                      Menuju Menu Cek CEIR ➔
                    </Button>
                  </div>
                </div>
              )}

              {activeTutorialTab === 2 && (
                <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <span>Langkah 3: Order Buka Sinyal IMEI</span>
                  </div>
                  <p className="text-xs text-rose-950 leading-relaxed">
                    Masuk ke menu <b>Buka IMEI</b>, ketik 15 digit nomor IMEI HP Anda (bisa banyak IMEI sekaligus), upload screenshot *#06#, masukkan nomor WhatsApp Anda, lalu pilih paket durasi & kecepatan yang diinginkan.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => { setShowTutorialModal(false); router.push('/unblock-imei'); }}>
                      Menuju Form Buka IMEI ➔
                    </Button>
                  </div>
                </div>
              )}

              {activeTutorialTab === 3 && (
                <div className="p-5 rounded-2xl bg-green-50/60 border border-green-200 space-y-3">
                  <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                    <span>Langkah 4: Terima Nota Resmi via WhatsApp</span>
                  </div>
                  <p className="text-xs text-green-950 leading-relaxed">
                    Begitu admin atau server menyelesaikan proses aktivasi (status <b>Sukses</b>), Bot Toko resmi kami akan <b>otomatis mengirimkan nota digital & link garansi</b> langsung ke nomor WhatsApp Anda. Anda juga bisa meneruskan nota ke customer jika Anda adalah Reseller.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setShowTutorialModal(false); router.push('/history'); }}>
                      Lihat Riwayat Transaksi ➔
                    </Button>
                  </div>
                </div>
              )}

              {activeTutorialTab === 4 && (
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <span>Langkah 5: Cek & Klaim Garansi Digital</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    Setiap transaksi dilengkapi garansi digital. Cukup masukkan nomor IMEI di menu <b>Cek Garansi</b> untuk melihat sisa masa aktif garansi, mengunduh ulang nota PDF, atau mengajukan bantuan teknis secara instan.
                  </p>
                  <div className="pt-2">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setShowTutorialModal(false); router.push('/cek-garansi'); }}>
                      Menuju Cek Garansi ➔
                    </Button>
                  </div>
                </div>
              )}

              {activeTutorialTab === 5 && (
                <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-3">
                  <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                    <span>Langkah 6: Klaim & Gunakan Voucher Diskon</span>
                  </div>
                  <p className="text-xs text-orange-950 leading-relaxed">
                    Mau hemat biaya order? Buka menu <b>Klaim Voucher</b> di dashboard atau sidebar, klik tombol <b>Klaim</b> pada voucher diskon yang Anda inginkan. Saat checkout di formulir Buka IMEI, klik <b>Voucher Ry-ITSolutions</b> untuk memasang voucher dan dapatkan potongan harga langsung!
                  </p>
                  <div className="pt-2">
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { setShowTutorialModal(false); router.push('/vouchers'); }}>
                      Buka Pusat Klaim Voucher ➔
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-hairline">
                <button
                  disabled={activeTutorialTab === 0}
                  onClick={() => setActiveTutorialTab(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-hairline disabled:opacity-30 hover:bg-parchment flex items-center gap-1"
                >
                  <span>&larr;</span> Sebelumnya
                </button>

                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map(idx => (
                    <span
                      key={idx}
                      onClick={() => setActiveTutorialTab(idx)}
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                        activeTutorialTab === idx ? 'w-6 bg-primary' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {activeTutorialTab < 5 ? (
                  <button
                    onClick={() => setActiveTutorialTab(prev => Math.min(5, prev + 1))}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-1"
                  >
                    Selanjutnya <span>&rarr;</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowTutorialModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    Saya Sudah Paham
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Interactive Guided Tour Component */}
      <InteractiveTour
        isOpen={showGuidedTour}
        onClose={() => setShowGuidedTour(false)}
      />

    </div>
  );
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: number, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  return <span>{m}:{s}</span>;
}
