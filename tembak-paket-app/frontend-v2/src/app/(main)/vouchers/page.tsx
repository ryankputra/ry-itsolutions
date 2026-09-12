"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { useRouter, useSearchParams } from "next/navigation";
import { safeJson } from "@/lib/api";
import Swal from "@/lib/sweetalert";

function VouchersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "claimed">("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const autoClaimedRef = useRef(false);

  const loadVouchers = async () => {
    try {
      const res = await fetch("/api/coupons/public", { credentials: "include" });
      const data = await safeJson(res);
      if (data && data.status && Array.isArray(data.data)) {
        setVouchers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  // 1-Click Auto Claim Listener from WhatsApp Broadcast Link (?claim=CODE)
  useEffect(() => {
    const claimCode = searchParams ? (searchParams.get("claim") || searchParams.get("coupon") || searchParams.get("code")) : null;
    if (claimCode && !autoClaimedRef.current) {
      autoClaimedRef.current = true;
      const clean = claimCode.trim().toUpperCase();
      (async () => {
        try {
          const res = await fetch("/api/coupons/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ code: clean }),
          });
          const data = await safeJson(res);
          if (res.ok && data?.status) {
            Swal.fire({
              title: "🎉 Voucher Berhasil Diklaim!",
              text: data.message || `Kode voucher ${clean} telah masuk ke akun Anda. Siap dipakai saat checkout!`,
              icon: "success",
              timer: 3000,
              showConfirmButton: true,
              confirmButtonText: "Lihat Voucher Saya",
            });
            setActiveTab("claimed");
          } else if (data?.message && (data.message.includes("sudah") || data.message.includes("klaim"))) {
            Swal.fire({
              title: "Voucher Sudah Anda Klaim",
              text: data.message || `Kode ${clean} sudah aktif di akun Anda dan siap digunakan saat checkout.`,
              icon: "info",
              timer: 2500,
            });
            setActiveTab("claimed");
          } else {
            Swal.fire({
              title: "Info Klaim Voucher",
              text: data?.message || "Tidak dapat mengklaim voucher ini saat ini.",
              icon: "warning",
            });
          }
          loadVouchers();
          router.replace("/vouchers");
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [searchParams, router]);

  const handleClaim = async (coupon: CouponItem) => {
    setClaimingId(coupon.id);
    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coupon_id: coupon.id, code: coupon.code }),
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({
          title: "Voucher Berhasil Diklaim!",
          text: data.message || `Voucher ${coupon.code} siap digunakan saat checkout order.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        setVouchers((prev) =>
          prev.map((c) =>
            c.id === coupon.id
              ? { ...c, is_claimed: true, total_claimed_count: (c.total_claimed_count || 0) + 1 }
              : c
          )
        );
      } else {
        Swal.fire({
          title: "Gagal Mengklaim",
          text: data?.message || "Voucher tidak dapat diklaim saat ini.",
          icon: "error",
        });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    } finally {
      setClaimingId(null);
    }
  };

  const claimedList = vouchers.filter((c) => c.is_claimed === 1 || c.is_claimed === true);
  const displayedList = activeTab === "claimed" ? claimedList : vouchers;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-16 px-1 sm:px-0">
      {/* Header Banner Voucher Center (Modern Apple Glass Style) */}
      <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-[#1D1D1F] dark:bg-[#161617] text-white border border-black/10 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 blur-2xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-white/15 text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Promo &amp; Diskon Spesial
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Pusat Klaim Voucher
            </h1>
            <p className="text-white/75 text-xs sm:text-sm mt-1 max-w-md leading-relaxed">
              Klaim voucher diskon spesial Anda dan nikmati potongan harga langsung saat checkout transaksi!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl flex sm:flex-col items-center justify-between sm:justify-center shrink-0 w-full sm:w-auto gap-2 sm:gap-0">
            <p className="text-[10px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider">Voucher Terklaim</p>
            <p className="text-lg sm:text-2xl font-black text-white">
              {claimedList.length} <span className="text-xs font-normal text-white/70">Voucher</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Filter (Apple Segmented Control Style) */}
      <div className="flex border border-hairline bg-slate-100/80 dark:bg-white/5 rounded-xl sm:rounded-2xl p-1 shadow-2xs gap-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 select-none min-h-[36px] ${
            activeTab === "all"
              ? "bg-white dark:bg-[#2C2C2E] text-ink dark:text-white shadow-xs border border-black/5 dark:border-white/10"
              : "text-ink-muted hover:text-ink hover:bg-white/40 dark:hover:bg-white/5"
          }`}
        >
          <span className="hidden sm:inline">Semua Voucher Promo</span>
          <span className="sm:hidden">Semua Voucher</span>
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
            activeTab === "all" ? "bg-black/10 dark:bg-white/15 text-ink dark:text-white" : "bg-black/5 dark:bg-white/5 text-ink-muted"
          }`}>
            {vouchers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("claimed")}
          className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 select-none min-h-[36px] ${
            activeTab === "claimed"
              ? "bg-white dark:bg-[#2C2C2E] text-ink dark:text-white shadow-xs border border-black/5 dark:border-white/10"
              : "text-ink-muted hover:text-ink hover:bg-white/40 dark:hover:bg-white/5"
          }`}
        >
          <span className="hidden sm:inline">Voucher Saya (Terklaim)</span>
          <span className="sm:hidden">Voucher Saya</span>
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
            activeTab === "claimed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-black/5 dark:bg-white/5 text-ink-muted"
          }`}>
            {claimedList.length}
          </span>
        </button>
      </div>

      {/* Grid Voucher List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 sm:h-28 rounded-2xl bg-parchment/60 animate-pulse border border-hairline" />
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <Card glass className="text-center py-12 sm:py-16 px-4 sm:px-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-ink">
            {activeTab === "claimed" ? "Belum Ada Voucher yang Diklaim" : "Belum Ada Voucher Promo"}
          </h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
            {activeTab === "claimed"
              ? "Silakan buka tab 'Semua Voucher' dan klik tombol Klaim pada voucher yang tersedia."
              : "Pantau terus halaman ini untuk mendapatkan info voucher event diskon terbaru."}
          </p>
          {activeTab === "claimed" && (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="mt-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
            >
              Lihat Voucher Tersedia
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {displayedList.map((coupon) => (
            <ShopeeVoucherCard
              key={coupon.id}
              coupon={coupon}
              isClaiming={claimingId === coupon.id}
              onClaim={handleClaim}
              onUse={() => router.push("/unblock-imei")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VouchersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-ink-muted">Memuat Voucher...</div>}>
      <VouchersContent />
    </Suspense>
  );
}
