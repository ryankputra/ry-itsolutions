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
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between bg-parchment/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
              className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-focus disabled:opacity-50 transition-colors shrink-0 shadow-xs"
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
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-ink">Belum Ada Voucher yang Diklaim</p>
                <p className="text-xs text-ink-muted max-w-xs mx-auto">
                  Silakan buka tab <b>Klaim Voucher Promo</b> untuk mengklaim voucher potongan harga.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1 mx-auto"
                >
                  <span>Lihat Voucher Tersedia</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
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
                      <p className="text-[10px] text-amber-600 font-semibold pl-6 mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>Belum memenuhi minimal belanja Rp {Number(c.min_order_amount).toLocaleString("id-ID")}</span>
                      </p>
                    )}
                  </div>
                );
              })
            )
          ) : unclimedCoupons.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-focus disabled:opacity-50 shadow-md shadow-primary/20 transition-all"
            >
              Pakai Voucher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
