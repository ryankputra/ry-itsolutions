"use client";
import React from "react";

export interface CouponItem {
  id: string;
  code: string;
  discount_type: "fixed" | "percent" | string;
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  max_usage_limit?: number;
  max_claim_limit?: number;
  used_count?: number;
  total_claimed_count?: number;
  is_claimed?: boolean | number;
  start_date?: string;
  end_date?: string;
  is_public?: number | boolean;
}

interface ShopeeVoucherCardProps {
  coupon: CouponItem;
  onClaim?: (coupon: CouponItem) => void;
  onUse?: (coupon: CouponItem) => void;
  isClaiming?: boolean;
  compact?: boolean;
  selected?: boolean;
}

export function ShopeeVoucherCard({
  coupon,
  onClaim,
  onUse,
  isClaiming = false,
  compact = false,
  selected = false,
}: ShopeeVoucherCardProps) {
  const isClaimed = Boolean(coupon.is_claimed === 1 || coupon.is_claimed === true);
  const maxClaims = coupon.max_claim_limit || coupon.max_usage_limit || 100;
  const claimedCount = coupon.total_claimed_count || 0;
  const isOutOfStock = claimedCount >= maxClaims && !isClaimed;
  const percentage = Math.min(100, Math.round((claimedCount / maxClaims) * 100));

  const formattedDiscount =
    coupon.discount_type === "percent"
      ? `Diskon ${coupon.discount_value}%`
      : `Potongan Rp ${(coupon.discount_value || 0).toLocaleString("id-ID")}`;

  const minOrderText =
    coupon.min_order_amount && coupon.min_order_amount > 0
      ? `Min. Order Rp ${Number(coupon.min_order_amount).toLocaleString("id-ID")}`
      : "Tanpa Minimal Order";

  const expiryText = coupon.end_date
    ? `s/d ${new Date(coupon.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
    : "Berlaku Selamanya";

  return (
    <div
      className={`relative flex items-stretch rounded-2xl border transition-all overflow-hidden select-none bg-canvas ${
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-hairline hover:border-primary/40 shadow-xs"
      } ${compact ? "min-w-[280px] max-w-[320px]" : "w-full"}`}
    >
      {/* Sisi Kiri: Badge Diskon Khas Voucher E-Commerce */}
      <div className="w-[100px] sm:w-[115px] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white flex flex-col items-center justify-center p-3 text-center shrink-0 relative overflow-hidden">
        {/* Notch Potongan Tiket Kiri */}
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-canvas border border-hairline z-10"></div>
        <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-canvas border border-hairline z-10"></div>

        {/* Decorative Badge Pattern */}
        <div className="absolute inset-0 bg-white/10 opacity-30 pointer-events-none"></div>

        <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 bg-black/20 px-1.5 py-0.5 rounded mb-1">
          Voucher
        </span>
        <span className="text-xs sm:text-sm font-black leading-tight drop-shadow-sm">
          {coupon.discount_type === "percent" ? `${coupon.discount_value}%` : `Rp ${coupon.discount_value >= 1000 ? `${coupon.discount_value / 1000}RB` : coupon.discount_value}`}
        </span>
        <span className="text-[9px] font-bold text-white/90 mt-0.5">
          {coupon.discount_type === "percent" ? "OFF" : "POTONGAN"}
        </span>
      </div>

      {/* Sisi Kanan: Detail & Tombol Klaim (Shopee Style) */}
      <div className="flex-1 p-3 sm:p-3.5 flex flex-col justify-between gap-2 bg-canvas relative pl-4">
        {/* Garis Putus-putus Tiket */}
        <div className="absolute left-0 top-3 bottom-3 border-l border-dashed border-hairline"></div>

        <div>
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono font-black text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              {coupon.code}
            </span>
            <span className="text-[9px] font-semibold text-ink-muted">
              {expiryText}
            </span>
          </div>

          <h4 className="font-bold text-xs text-ink mt-1 line-clamp-1">{formattedDiscount}</h4>
          <p className="text-[10px] text-ink-muted line-clamp-1">{minOrderText}</p>
        </div>

        {/* Bar Kuota Klaim & Tombol Aksi */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-hairline/60">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center text-[9px] text-ink-muted mb-0.5">
              <span>{isOutOfStock ? "Kuota Habis" : `${percentage}% Diklaim`}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-hairline">
              <div
                className={`h-full rounded-full transition-all ${
                  isOutOfStock ? "bg-slate-400" : percentage > 80 ? "bg-rose-500" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {isClaimed ? (
            onUse ? (
              <button
                type="button"
                onClick={() => onUse(coupon)}
                className="px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
              >
                Gunakan
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Terklaim
              </span>
            )
          ) : isOutOfStock ? (
            <button
              type="button"
              disabled
              className="px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-200 text-slate-500 cursor-not-allowed shrink-0"
            >
              Habis
            </button>
          ) : (
            <button
              type="button"
              disabled={isClaiming}
              onClick={() => onClaim && onClaim(coupon)}
              className="px-3.5 py-1 rounded-xl text-[11px] font-bold bg-primary hover:bg-primary-focus text-white shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1"
            >
              {isClaiming ? "..." : "Klaim"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
