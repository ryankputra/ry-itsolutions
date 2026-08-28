"use client";
import React, { useState } from "react";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";

interface ShopeeVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicCoupons: CouponItem[];
  appliedCoupon: any;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => void;
  onClaimCoupon: (coupon: CouponItem) => Promise<void>;
  claimingId: string | null;
  loading: boolean;
  rawTotalPrice: number;
}

export function ShopeeVoucherModal({
  isOpen,
  onClose,
  publicCoupons,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onClaimCoupon,
  claimingId,
  loading,
  rawTotalPrice,
}: ShopeeVoucherModalProps) {
  const [customCode, setCustomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"available" | "all">("available");
  const [selectedCode, setSelectedCode] = useState<string>(appliedCoupon?.code || "");

  if (!isOpen) return null;

  const claimedCoupons = publicCoupons.filter((c) => c.is_claimed === 1 || c.is_claimed === true);
  const unclimedCoupons = publicCoupons.filter((c) => !c.is_claimed);

  const handleApplyCustom = async () => {
    if (!customCode.trim()) return;
    await onApplyCoupon(customCode.trim().toUpperCase());
    onClose();
  };

  const handleConfirmSelected = async () => {
    if (selectedCode) {
      await onApplyCoupon(selectedCode);
      onClose();
    } else if (appliedCoupon) {
      onRemoveCoupon();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-canvas border border-hairline w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ala Shopee */}
        <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between bg-parchment/40">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm">
              🎟️
            </span>
            <div>
              <h3 className="font-bold text-base text-ink">Voucher Ry-ITSolutions</h3>
              <p className="text-xs text-ink-muted">Pilih atau klaim voucher untuk hemat lebih banyak</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Input Kode Voucher */}
        <div className="p-4 sm:p-5 border-b border-hairline bg-canvas">
          <label className="text-xs font-bold text-ink block mb-1.5">Punya Kode Voucher Rahasia?</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Masukkan kode voucher..."
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-hairline bg-canvas text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCustom}
              disabled={loading || !customCode.trim()}
              className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0 shadow-xs"
            >
              {loading ? "..." : "Pakai"}
            </button>
          </div>
        </div>

        {/* Tab Voucher */}
        <div className="flex border-b border-hairline bg-parchment/30 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors relative ${
              activeTab === "available" ? "text-primary" : "text-ink-muted hover:text-ink"
            }`}
          >
            Voucher Saya ({claimedCoupons.length})
            {activeTab === "available" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors relative ${
              activeTab === "all" ? "text-primary" : "text-ink-muted hover:text-ink"
            }`}
          >
            Klaim Voucher Promo ({unclimedCoupons.length})
            {activeTab === "all" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Voucher List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {activeTab === "available" ? (
            claimedCoupons.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-3xl">🎫</p>
                <p className="text-sm font-bold text-ink">Belum Ada Voucher yang Diklaim</p>
                <p className="text-xs text-ink-muted max-w-xs mx-auto">
                  Silakan buka tab <b>Klaim Voucher Promo</b> untuk mengklaim voucher potongan harga.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Lihat Voucher Tersedia ➔
                </button>
              </div>
            ) : (
              claimedCoupons.map((c) => {
                const isSelected = selectedCode === c.code || appliedCoupon?.code === c.code;
                const isMinMet = rawTotalPrice >= (c.min_order_amount || 0);

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (isMinMet) {
                        setSelectedCode(c.code);
                      }
                    }}
                    className={`cursor-pointer transition-all ${!isMinMet ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selected_voucher"
                        checked={isSelected}
                        disabled={!isMinMet}
                        onChange={() => setSelectedCode(c.code)}
                        className="w-4 h-4 text-primary accent-primary shrink-0"
                      />
                      <div className="flex-1">
                        <ShopeeVoucherCard coupon={c} selected={isSelected} />
                      </div>
                    </div>
                    {!isMinMet && (
                      <p className="text-[10px] text-amber-600 font-semibold pl-6 mt-1">
                        ⚠️ Belum memenuhi minimal belanja Rp {Number(c.min_order_amount).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                );
              })
            )
          ) : unclimedCoupons.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">✨</p>
              <p className="text-sm font-bold text-ink">Semua Voucher Sudah Diklaim</p>
              <p className="text-xs text-ink-muted">Anda sudah mengklaim semua promo yang tersedia saat ini.</p>
            </div>
          ) : (
            unclimedCoupons.map((c) => (
              <ShopeeVoucherCard
                key={c.id}
                coupon={c}
                isClaiming={claimingId === c.id}
                onClaim={async (coupon) => {
                  await onClaimCoupon(coupon);
                  setSelectedCode(coupon.code);
                  setActiveTab("available");
                }}
              />
            ))
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-hairline bg-parchment/40 flex items-center justify-between gap-3">
          {appliedCoupon ? (
            <button
              type="button"
              onClick={() => {
                onRemoveCoupon();
                setSelectedCode("");
                onClose();
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
            >
              Hapus Voucher Terpasang
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-canvas transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedCode || loading}
              onClick={handleConfirmSelected}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 shadow-md shadow-primary/20 transition-all"
            >
              Pakai Voucher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
