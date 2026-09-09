"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { useRouter } from "next/navigation";
import { safeJson } from "@/lib/api";
import Swal from "@/lib/sweetalert";

export default function VouchersPage() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "claimed">("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);

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

  const handleClaim = async (coupon: CouponItem) => {
    setClaimingId(coupon.id);
    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coupon_id: coupon.id }),
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
    <div className="space-y-6 max-w-4xl mx-auto pb-14">
      {/* Header Banner Voucher Center (Apple Design System Style) */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-[#1D1D1F] dark:bg-[#161617] text-white border border-black/10 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 blur-2xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-block bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/15 text-white/90">
              Promo &amp; Diskon Spesial
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Klaim Voucher
            </h1>
            <p className="text-white/75 text-xs sm:text-sm mt-1 max-w-md leading-relaxed">
              Klaim voucher diskon spesial Anda sekarang dan nikmati potongan harga langsung saat checkout transaksi!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-center shrink-0 w-full sm:w-auto">
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Voucher Terklaim Anda</p>
            <p className="text-2xl font-black text-white">{claimedList.length} <span className="text-xs font-normal text-white/70">Voucher</span></p>
          </div>
        </div>
      </div>

      {/* Tabs Filter (Apple Segmented Control Style) */}
      <div className="flex border border-hairline bg-slate-100/80 dark:bg-white/5 rounded-2xl p-1 shadow-2xs gap-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "all"
              ? "bg-white dark:bg-[#2C2C2E] text-ink dark:text-white shadow-xs border border-black/5 dark:border-white/10"
              : "text-ink-muted hover:text-ink hover:bg-white/40 dark:hover:bg-white/5"
          }`}
        >
          <span>Semua Voucher Promo</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
            activeTab === "all" ? "bg-black/10 dark:bg-white/15 text-ink dark:text-white" : "bg-black/5 dark:bg-white/5 text-ink-muted"
          }`}>
            {vouchers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("claimed")}
          className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "claimed"
              ? "bg-white dark:bg-[#2C2C2E] text-ink dark:text-white shadow-xs border border-black/5 dark:border-white/10"
              : "text-ink-muted hover:text-ink hover:bg-white/40 dark:hover:bg-white/5"
          }`}
        >
          <span>Voucher Saya (Terklaim)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
            activeTab === "claimed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-black/5 dark:bg-white/5 text-ink-muted"
          }`}>
            {claimedList.length}
          </span>
        </button>
      </div>

      {/* Grid Voucher List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-parchment/60 animate-pulse border border-hairline" />
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <Card glass className="text-center py-16 px-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>
          </div>
          <h3 className="text-base font-bold text-ink">
            {activeTab === "claimed" ? "Belum Ada Voucher yang Diklaim" : "Belum Ada Voucher Promo"}
          </h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            {activeTab === "claimed"
              ? "Silakan buka tab 'Semua Voucher Promo' dan klik tombol Klaim pada voucher yang tersedia."
              : "Pantau terus halaman ini untuk mendapatkan info voucher event diskon terbaru."}
          </p>
          {activeTab === "claimed" && (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs"
            >
              Klaim Voucher Sekarang
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
