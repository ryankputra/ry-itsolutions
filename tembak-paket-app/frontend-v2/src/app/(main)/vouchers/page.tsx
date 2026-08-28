"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function VouchersPage() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "claimed">("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadVouchers = async () => {
    try {
      const res = await fetch("/api/coupons/public", { credentials: "include" });
      const data = await res.json();
      if (data.status && Array.isArray(data.data)) {
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
      const data = await res.json();
      if (res.ok && data.status) {
        Swal.fire({
          title: "Voucher Berhasil Diklaim! 🎉",
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
          text: data.message || "Voucher tidak dapat diklaim saat ini.",
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
      {/* Header Banner Ala Shopee Voucher Center */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500 via-primary to-orange-600 text-white shadow-xl shadow-primary/20 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 blur-2xl rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-400/20 blur-xl rounded-full"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-block bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/20">
              ⚡ Zona Promo & Voucher Cuan
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
              Pusat Klaim Voucher
            </h1>
            <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-md">
              Klaim voucher potongan harga sekarang sebelum kuota habis dan gunakan langsung saat checkout!
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center shrink-0 w-full sm:w-auto">
            <p className="text-[11px] font-semibold text-white/80 uppercase">Voucher Terklaim Anda</p>
            <p className="text-2xl font-black">{claimedList.length} <span className="text-xs font-normal">Voucher</span></p>
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-hairline bg-canvas rounded-2xl p-1.5 shadow-2xs gap-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "all"
              ? "bg-primary text-white shadow-xs"
              : "text-ink-muted hover:text-ink hover:bg-parchment/60"
          }`}
        >
          <span>Semua Voucher Promo</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          }`}>
            {vouchers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("claimed")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "claimed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-ink-muted hover:text-ink hover:bg-parchment/60"
          }`}
        >
          <span>Voucher Saya (Terklaim)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "claimed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
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
          <p className="text-4xl">🎫</p>
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
              Klaim Voucher Sekarang ➔
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
