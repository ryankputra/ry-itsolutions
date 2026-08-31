"use client";
import React, { useState, useEffect } from "react";
import { useApp, CartItem } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { ShopeeVoucherModal } from "@/components/ui/ShopeeVoucherModal";
import { CouponItem } from "@/components/ui/ShopeeVoucherCard";
import InstantQrisPaymentModal from "@/components/ui/InstantQrisPaymentModal";
import { safeJson } from "@/lib/api";

export default function CartPage() {
  const { user, cart, removeFromCart, updateCartQty, clearCart, setUser } = useApp();
  const router = useRouter();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [publicCoupons, setPublicCoupons] = useState<CouponItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "balance">("qris");
  const [showInstantQris, setShowInstantQris] = useState(false);

  const handleApplyCoupon = async (code: string) => {
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, order_amount: subtotal }),
      });
      const data = await safeJson(res);
      if (data?.status && data.data) {
        setAppliedCoupon(data.data);
        setShowVoucherModal(false);
        Swal.fire({
          icon: "success",
          title: "Voucher Terpasang!",
          text: `Voucher ${data.data.code} berhasil digunakan. Hemat Rp ${(data.data.discount_amount || 0).toLocaleString("id-ID")}`,
          timer: 1800,
          showConfirmButton: false,
        });
      } else if (data?.require_claim) {
        // Auto-claim and re-apply for seamless e-commerce UX
        const claimRes = await fetch("/api/coupons/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const claimData = await safeJson(claimRes);
        if (claimData?.status) {
          const retryRes = await fetch("/api/coupon/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ code, order_amount: subtotal }),
          });
          const retryData = await safeJson(retryRes);
          if (retryData?.status && retryData.data) {
            setAppliedCoupon(retryData.data);
            setShowVoucherModal(false);
            Swal.fire({
              icon: "success",
              title: "Voucher Terpasang!",
              text: `Voucher ${retryData.data.code} berhasil diklaim & dipasang. Hemat Rp ${(retryData.data.discount_amount || 0).toLocaleString("id-ID")}`,
              timer: 1800,
              showConfirmButton: false,
            });
            return;
          }
        }
        Swal.fire({ icon: "warning", title: "Klaim Voucher", text: data.message });
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Menggunakan Voucher",
          text: data?.message || "Kupon tidak dapat digunakan untuk pesanan ini.",
        });
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Terjadi kesalahan saat memvalidasi voucher." });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClaimCoupon = async (coupon: CouponItem) => {
    setClaimingCouponId(coupon.id);
    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coupon_id: coupon.id }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        setPublicCoupons((prev) =>
          prev.map((c) =>
            c.id === coupon.id
              ? { ...c, is_claimed: true, total_claimed_count: (c.total_claimed_count || 0) + 1 }
              : c
          )
        );
        handleApplyCoupon(coupon.code);
      }
    } catch (e) {} finally {
      setClaimingCouponId(null);
    }
  };

  // Initialize all items as selected
  useEffect(() => {
    setSelectedItems(cart.map((item) => item.id));
  }, [cart.length]);

  // Load public coupons
  useEffect(() => {
    fetch("/api/coupons/public", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          setPublicCoupons(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSelect = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cart.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.map((item) => item.id));
    }
  };

  // Price calculations
  const activeCartItems = cart.filter((item) => selectedItems.includes(item.id));
  const subtotal = activeCartItems.reduce((sum, item) => {
    const itemPrice = (item.price + (item.speedPrice || 0)) * (item.quantity || 1);
    return sum + itemPrice;
  }, 0);

  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discount_type === "percent") {
      discountAmount = Math.floor((subtotal * appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.max_discount_amount);
      }
    } else {
      discountAmount = appliedCoupon.discount_value || 0;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const priceAfterCoupon = Math.max(0, subtotal - discountAmount);
  const userCoins = user?.coins || 0;
  // Guardrails: Minimal order Rp 50.000, Maks 10%, dan Maksimal Rp 5.000 cap
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.1), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const grandTotal = Math.max(0, priceAfterCoupon - coinsDiscount);

  // Handle Checkout
  const handleCheckout = async () => {
    if (activeCartItems.length === 0) {
      Swal.fire({ icon: "warning", title: "Pilih Item", text: "Pilih minimal 1 layanan di keranjang untuk checkout." });
      return;
    }

    if (paymentMethod === "qris" || (user?.balance || 0) < grandTotal) {
      setShowInstantQris(true);
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "Konfirmasi Pembayaran",
      html: `
        <div class="text-left text-xs space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex justify-between"><span>Jumlah Item:</span><b>${activeCartItems.length} Layanan</b></div>
          <div class="flex justify-between"><span>Subtotal:</span><b>Rp ${subtotal.toLocaleString("id-ID")}</b></div>
          ${discountAmount > 0 ? `<div class="flex justify-between text-emerald-600"><span>Diskon Voucher:</span><b>-Rp ${discountAmount.toLocaleString("id-ID")}</b></div>` : ""}
          ${coinsDiscount > 0 ? `<div class="flex justify-between text-amber-600"><span>Diskon Koin:</span><b>-Rp ${coinsDiscount.toLocaleString("id-ID")}</b></div>` : ""}
          <div class="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-bold text-sm text-slate-900 dark:text-white"><span>Total Bayar:</span><b class="text-blue-600">Rp ${grandTotal.toLocaleString("id-ID")}</b></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Bayar Sekarang",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0066cc",
    });

    if (!isConfirmed) return;

    executeCartCheckout();
  };

  const executeCartCheckout = async () => {
    setCheckingOut(true);
    let successCount = 0;
    const processedItemIds: string[] = [];

    try {
      // Process orders sequentially with proper payload structure
      for (let idx = 0; idx < activeCartItems.length; idx++) {
        const item = activeCartItems[idx];
        const itemPrice = item.price || item.totalPrice || 0;
        const pkgKey = String(item.packageId || item.id);

        const formData = new FormData();
        formData.append("service_type", item.serviceType === "ceir" ? "ceir" : "imei");
        formData.append("imei", item.imei || "111111111111111");
        formData.append("duration", item.duration || "1 Bulan");
        formData.append("amount", itemPrice.toString());
        formData.append("package_id", pkgKey);
        formData.append("price_key", pkgKey);
        formData.append("speed", item.speed || "regular");
        formData.append("speed_option", item.speed || "regular");
        formData.append("target_phone", item.targetPhone || user?.phone || "");

        // Apply coupon & coins on first applicable item to prevent duplicate coupon reuse error
        if (idx === 0 && appliedCoupon) {
          formData.append("couponCode", appliedCoupon.code);
          formData.append("coupon_code", appliedCoupon.code);
        }
        if (idx === 0 && useCoins && coinsDiscount > 0) {
          formData.append("use_coins", "true");
        }

        const res = await fetch("/api/order/manual", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await safeJson(res);
        if (res.ok && data?.status) {
          successCount++;
          processedItemIds.push(item.id);
        } else {
          throw new Error(data?.message || `Gagal memproses item: ${item.packageName}`);
        }
      }

      // Remove only successfully checked out items from cart
      processedItemIds.forEach((id) => removeFromCart(id));

      Swal.fire({
        icon: "success",
        title: "Pesanan Berhasil!",
        text: `${successCount} layanan di keranjang berhasil diproses server.`,
        confirmButtonColor: "#0066cc",
        confirmButtonText: "Lihat Riwayat Pesanan",
      }).then(() => {
        router.push("/history");
      });
    } catch (e: any) {
      // Remove any items that succeeded before failure
      processedItemIds.forEach((id) => removeFromCart(id));
      Swal.fire({
        icon: "error",
        title: "Checkout Terkendala",
        text: e?.message || "Terjadi kesalahan saat memproses checkout.",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 font-bold text-sm text-ink hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="text-base font-black">Keranjang Belanja ({cart.length})</span>
        </button>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => {
              Swal.fire({
                title: "Kosongkan Keranjang?",
                text: "Semua item yang tersimpan di keranjang akan dihapus.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#ef4444",
              }).then((res) => {
                if (res.isConfirmed) clearCart();
              });
            }}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <Card glass className="p-10 text-center space-y-4 rounded-3xl border border-hairline">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-base text-ink">Keranjang Anda Masih Kosong</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              Yuk pilih layanan buka IMEI, cek CEIR, atau paket aktivasi terbaik untuk dimasukkan ke keranjang.
            </p>
          </div>
          <Button
            onClick={() => router.push("/unblock-imei")}
            className="bg-primary hover:bg-primary-focus text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 mx-auto"
          >
            <span>Mulai Belanja Sekarang</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </Card>
      ) : (
        <>
          {/* Select All Bar */}
          <div className="p-3 bg-canvas border border-hairline rounded-2xl flex items-center justify-between text-xs font-bold shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedItems.length === cart.length && cart.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
              <span>Pilih Semua ({cart.length} Item)</span>
            </label>
            <span className="text-ink-muted">{selectedItems.length} dipilih</span>
          </div>

          {/* Cart Item List */}
          <div className="space-y-2.5">
            {cart.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              const itemTotal = (item.price + (item.speedPrice || 0)) * (item.quantity || 1);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl bg-canvas border transition-all flex items-start gap-3 shadow-2xs ${
                    isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-hairline"
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer mt-1"
                  />

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-ink line-clamp-1">{item.packageName}</h4>
                        {item.imei && (
                          <p className="text-[10px] font-mono text-ink-muted mt-0.5">
                            IMEI: {item.imei}
                          </p>
                        )}
                        {item.duration && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold mt-1">
                            Garansi {item.duration}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-ink-muted hover:text-rose-600 transition-colors p-1"
                        title="Hapus dari keranjang"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-black text-xs sm:text-sm text-primary">
                        Rp {itemTotal.toLocaleString("id-ID")}
                      </span>

                      {/* Quantity control */}
                      <div className="flex items-center gap-2 border border-hairline rounded-xl p-0.5 bg-parchment">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, (item.quantity || 1) - 1)}
                          className="w-6 h-6 rounded-lg bg-canvas hover:bg-slate-200 flex items-center justify-center font-bold text-xs text-ink transition-colors"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-ink px-1 min-w-[16px] text-center">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, (item.quantity || 1) + 1)}
                          className="w-6 h-6 rounded-lg bg-canvas hover:bg-slate-200 flex items-center justify-center font-bold text-xs text-ink transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voucher Bar */}
          <div
            onClick={() => setShowVoucherModal(true)}
            className="p-3.5 rounded-2xl bg-canvas border border-hairline shadow-2xs flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-xs text-ink block">Voucher Diskon Belanja</span>
                <span className="text-[10px] text-ink-muted">
                  {appliedCoupon ? `Voucher ${appliedCoupon.code} terpasang (-Rp ${discountAmount.toLocaleString("id-ID")})` : "Gunakan kupon diskon untuk hemat biaya"}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary flex items-center gap-0.5">
              <span>{appliedCoupon ? "Ganti" : "Pilih"}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>

          {/* Koin Deduction Bar */}
          <div className="p-3.5 rounded-2xl bg-canvas border border-hairline shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-ink">Tukarkan Koin Ry</span>
                  <span className="text-[10px] font-bold text-amber-600">({userCoins} Koin)</span>
                </div>
                <p className="text-[10px] text-ink-muted">
                  {maxCoinsAllowed > 0 ? `Hemat hingga Rp ${maxCoinsAllowed.toLocaleString("id-ID")}` : "Minimal belanja Rp 50.000"}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCoins}
                disabled={maxCoinsAllowed === 0 || userCoins === 0}
                onChange={(e) => setUseCoins(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
            {/* Opsi Metode Pembayaran Direct */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-hairline shadow-2xs space-y-2">
              <label className="text-xs font-bold text-ink block">Metode Pembayaran</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setPaymentMethod("qris")}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "qris"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-hairline bg-canvas hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-ink">QRIS Instant 24 Jam</h5>
                      <p className="text-[10px] text-emerald-700 font-bold">Bayar langsung tanpa top up</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "qris"} onChange={() => {}} className="text-primary" />
                </div>

                <div
                  onClick={() => setPaymentMethod("balance")}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "balance"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-hairline bg-canvas hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-primary flex items-center justify-center font-bold shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-ink">Saldo Ry</h5>
                      <p className="text-[10px] text-ink-muted">Rp {(user?.balance || 0).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "balance"} onChange={() => {}} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Bottom Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 backdrop-blur-lg border-t border-hairline p-3 sm:px-8 shadow-2xl safe-area-pb">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-ink-muted block">Total Pembayaran</span>
              <span className="text-base sm:text-lg font-black text-primary">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={activeCartItems.length === 0 || checkingOut}
              isLoading={checkingOut}
              className="bg-primary hover:bg-primary-focus text-white font-black text-xs sm:text-sm px-6 h-11 rounded-2xl shadow-md shrink-0"
            >
              Checkout ({activeCartItems.length})
            </Button>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      <ShopeeVoucherModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        publicCoupons={publicCoupons}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={() => {
          setAppliedCoupon(null);
          setShowVoucherModal(false);
        }}
        onClaimCoupon={handleClaimCoupon}
        claimingId={claimingCouponId}
        loading={couponLoading}
        rawTotalPrice={subtotal}
      />

      <InstantQrisPaymentModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={grandTotal}
        orderTitle={`Pembayaran Direct Keranjang (${activeCartItems.length} Layanan)`}
        onSuccess={() => {
          setShowInstantQris(false);
          executeCartCheckout();
        }}
      />
    </div>
  );
}
