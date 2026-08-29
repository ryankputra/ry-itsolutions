"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { PaymentLogosGrid } from "@/components/ui/PaymentLogos";
import { safeJson } from "@/lib/api";
import Swal from "sweetalert2";

const QUICK_AMOUNTS = [
  { amount: 20000, label: "Rp 20.000", tag: "Pemula", badge: null },
  { amount: 50000, label: "Rp 50.000", tag: "Rekomendasi", badge: null },
  { amount: 100000, label: "Rp 100.000", tag: "Paling Populer", badge: "HOT" },
  { amount: 250000, label: "Rp 250.000", tag: "Hemat Order", badge: "HEMAT" },
  { amount: 500000, label: "Rp 500.000", tag: "Paket Reseller", badge: "BEST SELLER" },
  { amount: 1000000, label: "Rp 1.000.000", tag: "Sultan / VIP", badge: "VIP" },
];

export default function TopUpPage() {
  const { user, setUser, updateBalance } = useApp();
  const router = useRouter();

  const [amount, setAmount] = useState<string>("100000");
  const [qrisData, setQrisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // Vouchers state
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // States for Timer & Polling
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [topUpId, setTopUpId] = useState<string | null>(null);
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Helper untuk trigger sukses
  const triggerSuccess = (newBalance?: number) => {
    if (success) return;
    setSuccess(true);
    if (typeof newBalance === "number") {
      updateBalance(newBalance);
    }
    setTimeout(() => {
      router.push("/dashboard");
    }, 3500);
  };

  // Gateway readiness state
  const [gatewayInfo, setGatewayInfo] = useState<{ active_gateway: string; is_ready: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ry_show_balance");
      if (saved !== null) {
        setShowBalance(saved === "true");
      }
    }

    const handleBalanceVisibility = (e: any) => {
      if (e.detail !== undefined) setShowBalance(e.detail);
    };
    window.addEventListener("balance_visibility_changed", handleBalanceVisibility);

    // Load public vouchers
    fetch("/api/coupons/public", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d && d.status && Array.isArray(d.data)) setVouchers(d.data);
      })
      .catch(() => {});

    // Check payment gateway status and readiness
    fetch("/api/topup/gateway-info", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d && d.status && d.data) setGatewayInfo(d.data);
      })
      .catch(() => {});

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
          text: data.message,
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

  // Polling Saldo, Status Transaksi & SSE Listener
  useEffect(() => {
    // 1. Dengarkan event SSE global 'topup_success'
    const handleTopUpSuccessEvent = () => {
      triggerSuccess();
    };
    window.addEventListener("topup_success", handleTopUpSuccessEvent);

    let timerInterval: NodeJS.Timeout;
    let pollingInterval: NodeJS.Timeout;

    if (qrisData && !success) {
      // 2. Timer Countdown
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setQrisData(null);
            setTopUpId(null);
            setError("Waktu pembayaran telah habis. Silakan buat QRIS baru.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 3. Polling status transaksi via /api/topup/latest-status dan /api/auth/me
      pollingInterval = setInterval(async () => {
        try {
          const statusRes = await fetch("/api/topup/latest-status", { credentials: "include" });
          if (statusRes.ok) {
            const statusData = await safeJson(statusRes);
            if (statusData?.status && statusData?.transactionStatus === "completed") {
              triggerSuccess(statusData.balance);
              return;
            }
          }

          // Fallback cek saldo profil
          const meRes = await fetch("/api/auth/me", { credentials: "include" });
          if (meRes.ok) {
            const meData = await safeJson(meRes);
            if (meData?.status && meData?.user) {
              if (initialBalance !== null && meData.user.balance > initialBalance) {
                triggerSuccess(meData.user.balance);
              }
            }
          }
        } catch (err) {}
      }, 2500);
    }

    return () => {
      window.removeEventListener("topup_success", handleTopUpSuccessEvent);
      if (timerInterval) clearInterval(timerInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [qrisData, success, topUpId, initialBalance, router, setUser]);

  // Cek perubahan saldo user dari store (Fast track)
  useEffect(() => {
    if (qrisData && !success && initialBalance !== null && user && user.balance > initialBalance) {
      triggerSuccess(user.balance);
    }
  }, [user?.balance, initialBalance, qrisData, success]);

  // Tombol Cek Manual On-Demand
  const handleManualCheck = async () => {
    setIsCheckingManual(true);
    try {
      const res = await fetch(topUpId ? `/api/topup/status/${topUpId}` : "/api/topup/latest-status", {
        credentials: "include",
      });
      const data = await safeJson(res);
      if (data?.status && data?.transactionStatus === "completed") {
        Swal.fire({
          title: "Pembayaran Berhasil!",
          text: "Saldo otomatis ditambahkan ke akun Anda.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        triggerSuccess(data.balance);
      } else {
        Swal.fire({
          title: "Menunggu Mutasi Bank",
          text: "Pembayaran belum terdeteksi di mutasi gateway. Jika Anda baru saja transfer, mohon tunggu beberapa detik lagi lalu tekan tombol ini kembali.",
          icon: "info",
          confirmButtonText: "Mengerti",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server.", icon: "error" });
    } finally {
      setIsCheckingManual(false);
    }
  };

  // Khusus Admin: Simulasi Pembayaran QRIS Sukses Tanpa Bayar Asli
  const handleSimulatePayment = async () => {
    const result = await Swal.fire({
      title: "Simulasi Bayar QRIS",
      html: `Simulasikan pembayaran QRIS sebesar <b>Rp ${(qrisData?.uniqueAmount || 0).toLocaleString("id-ID")}</b> berhasil secara instan tanpa perlu bayar uang asli?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simulasikan Sukses",
      cancelButtonText: "Batal",
      confirmButtonColor: "#7c3aed",
    });

    if (!result.isConfirmed) return;

    setIsSimulating(true);
    try {
      const res = await fetch("/api/topup/simulate-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topUpId }),
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({
          title: "Simulasi Berhasil!",
          text: data.message || "Saldo uji coba berhasil ditambahkan ke akun Anda.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        triggerSuccess(data.balance);
      } else {
        Swal.fire({
          title: "Gagal Simulasi",
          text: data?.message || "Hanya akun admin yang dapat menggunakan fitur simulasi.",
          icon: "error",
        });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server.", icon: "error" });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRequestQris = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount);
    const isAdmin = user?.role === "admin";
    const minLimit = isAdmin ? 1 : 10000;

    if (!num || num < minLimit) {
      setError(`Minimal top up saldo adalah Rp ${minLimit.toLocaleString("id-ID")}`);
      return;
    }

    setError("");
    setLoading(true);
    setInitialBalance(user?.balance || 0);

    try {
      const res = await fetch("/api/topup/request-qris", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        setQrisData(data.qrisData);
        setTopUpId(data.topUpId || null);
        setTimeLeft(data.qrisData?.expiresAt ? data.qrisData.expiresAt - Math.floor(Date.now() / 1000) : 5 * 60);
      } else {
        setError(data?.message || "Gagal membuat QRIS");
        setInitialBalance(null);
      }
    } catch (err) {
      setError("Kesalahan jaringan");
      setInitialBalance(null);
    } finally {
      setLoading(false);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const selectedNum = parseInt(amount) || 0;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-14">
      {/* Header E-Commerce */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-canvas border border-hairline hover:bg-parchment transition-colors"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">Isi Saldo Akun</h1>
            <p className="text-xs text-ink-muted">Top up otomatis 24 Jam via QRIS Nasional</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          QRIS Online
        </div>
      </div>

      {/* ShopeePay Style Wallet Card */}
      <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-primary via-blue-700 to-indigo-900 text-white shadow-lg shadow-primary/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-orange-400/20 blur-xl rounded-full -translate-x-10 translate-y-10"></div>

        <div className="relative z-10 flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Saldo Dompet Anda</p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {showBalance ? `Rp ${(user?.balance || 0).toLocaleString("id-ID")}` : "******"}
                </h2>
                <button
                  type="button"
                  onClick={toggleShowBalance}
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  title={showBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
                >
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
            <div className="px-2.5 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold">
              Bebas Admin (Rp 0)
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/90 pt-2 border-t border-white/15">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Auto-Detect Masuk Instan
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Aman Terenkripsi
            </span>
          </div>
        </div>
      </div>

      {/* Main Top Up Form / QRIS View */}
      <Card glass className="p-0 overflow-hidden">
        {success ? (
          <div className="text-center space-y-4 py-14 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-ink">Top Up Saldo Sukses!</h3>
            <p className="text-xs text-ink-muted">Mengalihkan kembali ke dashboard...</p>
          </div>
        ) : !qrisData ? (
          <form onSubmit={handleRequestQris} className="p-5 sm:p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs border border-rose-200 flex gap-2 items-center">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Warning Banner jika Gateway Sedang Offline / Belum Ter-setup */}
            {gatewayInfo && !gatewayInfo.is_ready && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <svg className="w-5 h-5 shrink-0 text-amber-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Pembayaran QRIS Otomatis Sedang Dalam Pemeliharaan</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
                  {gatewayInfo.message || "Sesi pembayaran otomatis GoPay sedang tidak aktif / belum disiapkan admin. Silakan hubungi CS Admin untuk deposit saldo manual via WhatsApp / Telegram."}
                </p>
                <div className="pt-1 flex gap-2">
                  <a href="https://t.me/ryannkptr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors shadow-xs">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.38-.49 1.04-.75 4.07-1.77 6.78-2.94 8.14-3.51 3.87-1.62 4.67-1.9 5.2-1.91.12 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.21-.04.37z"/>
                    </svg>
                    Hubungi CS Telegram
                  </a>
                </div>
              </div>
            )}

            {/* Pilihan Nominal Cepat (Shopee Style Grid) */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-ink">Pilih Nominal Top Up</label>
                <span className="text-[11px] text-ink-muted">
                  {user?.role === "admin" ? "Admin: Bebas Nominal (Min Rp 1)" : "Min. Rp 10.000"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {QUICK_AMOUNTS.map((item) => {
                  const isSelected = parseInt(amount) === item.amount;
                  return (
                    <button
                      key={item.amount}
                      type="button"
                      onClick={() => setAmount(item.amount.toString())}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 select-none ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                          : "border-hairline bg-canvas hover:border-primary/40 hover:bg-parchment/60"
                      }`}
                    >
                      {item.badge && (
                        <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-[9px] shadow-xs">
                          {item.badge}
                        </span>
                      )}
                      <p className={`font-black text-sm ${isSelected ? "text-primary" : "text-ink"}`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] text-ink-muted font-medium">{item.tag}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Nominal Custom */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Atau Masukkan Nominal Lain (Rp)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">
                  Rp
                </span>
                <input
                  type="number"
                  min={user?.role === "admin" ? "1" : "10000"}
                  step={user?.role === "admin" ? "1" : "1000"}
                  placeholder={user?.role === "admin" ? "Bebas (Contoh: 1, 500, 10000)" : "Contoh: 75000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-hairline bg-canvas text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Metode Pembayaran Supported E-Commerce (Full Vector SVGs) */}
            <div className="p-4 rounded-2xl bg-parchment/50 border border-hairline">
              <PaymentLogosGrid />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={loading}
              disabled={gatewayInfo ? !gatewayInfo.is_ready : false}
              className={`w-full h-12 text-sm font-bold shadow-md ${gatewayInfo && !gatewayInfo.is_ready ? 'opacity-60 cursor-not-allowed bg-gray-500 hover:bg-gray-500' : 'shadow-primary/20'}`}
            >
              {gatewayInfo && !gatewayInfo.is_ready
                ? "Pembayaran Otomatis Offline (Hubungi Admin)"
                : `Lanjut Bayar (Rp ${selectedNum.toLocaleString("id-ID")}) ➔`}
            </Button>
          </form>
        ) : (
          /* Tampilan QRIS E-Commerce */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6 bg-gradient-to-b from-canvas to-parchment/50">
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Pembayaran Tepat</p>
              <div className="bg-canvas border-2 border-primary/30 p-3.5 rounded-2xl shadow-xs">
                <p className="text-3xl sm:text-4xl font-black text-primary">
                  Rp {qrisData.uniqueAmount.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* QR Canvas */}
            <div className="relative w-60 h-60 bg-white p-3.5 rounded-3xl border-2 border-hairline shadow-xl mx-auto">
              <div className="absolute -top-3 -right-3 bg-rose-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeLeft)}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrisData.base64Image} alt="QRIS Code" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-3 max-w-sm">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2.5 text-left">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  Transfer <b>tepat Rp {qrisData.uniqueAmount.toLocaleString("id-ID")}</b> (termasuk kode unik) agar sistem mendeteksi dan saldo masuk otomatis detik ini juga.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-ink-muted text-xs font-semibold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                Menunggu pembayaran QRIS Anda...
              </div>

              {/* Tombol Cek Status Manual On-Demand */}
              <Button
                type="button"
                onClick={handleManualCheck}
                isLoading={isCheckingManual}
                className="w-full h-11 text-xs font-bold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Sudah Bayar? Cek Status Sekarang</span>
              </Button>

              {/* Khusus Akun Admin: Tombol Simulasi Pembayaran Sandbox */}
              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs group"
                >
                  <svg className="w-4 h-4 text-purple-600 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.942A2.25 2.25 0 0117.07 16.5H6.93a2.25 2.25 0 01-1.16-.322L4.2 15.3" />
                  </svg>
                  <span>{isSimulating ? "Memproses Simulasi..." : "Mode Admin: Simulasi Bayar Berhasil (Rp 0)"}</span>
                </button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-ink-muted hover:text-ink"
                onClick={() => {
                  setQrisData(null);
                  setTopUpId(null);
                  setInitialBalance(null);
                }}
              >
                Batalkan & Ganti Nominal
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Shopee Style Voucher Section on Top Up */}
      {vouchers.length > 0 && !qrisData && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <span>Voucher Diskon Siap Klaim</span>
              <span className="text-[9px] font-extrabold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                Shopee Style
              </span>
            </h3>
            <span className="text-[11px] text-ink-muted">Klaim untuk order layanan</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory">
            {vouchers.map((c) => (
              <div key={c.id} className="snap-start shrink-0">
                <ShopeeVoucherCard
                  coupon={c}
                  compact
                  isClaiming={claimingId === c.id}
                  onClaim={handleClaimCoupon}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={success}
        onClose={() => router.push("/dashboard")}
        amount={qrisData ? qrisData.uniqueAmount : parseInt(amount) || 0}
        title="Top Up Berhasil"
        statusText="Saldo Anda telah berhasil bertambah secara instan!"
        recipientLabel="Username"
        recipientValue={user?.name || "Member"}
        methodValue="QRIS Auto-Detect"
      />
    </div>
  );
}
