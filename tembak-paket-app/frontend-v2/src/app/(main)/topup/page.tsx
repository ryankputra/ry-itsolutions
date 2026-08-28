"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ShopeeVoucherCard, CouponItem } from "@/components/ui/ShopeeVoucherCard";
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
  const { user, setUser } = useApp();
  const router = useRouter();

  const [amount, setAmount] = useState<string>("100000");
  const [qrisData, setQrisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);

  // Vouchers state
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // States for Timer & Polling
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    // Load public vouchers
    fetch("/api/coupons/public", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status && Array.isArray(d.data)) setVouchers(d.data);
      })
      .catch(() => {});
  }, []);

  const handleClaimCoupon = async (coupon: CouponItem) => {
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

  // Polling Saldo & Timer
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let pollingInterval: NodeJS.Timeout;

    if (qrisData && !success) {
      // 1. Timer Countdown
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setQrisData(null); // Timeout! Hapus QRIS
            setError("Waktu pembayaran telah habis. Silakan buat QRIS baru.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 2. Fallback Polling (Bertanya ke server setiap 5 detik)
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.status && data.user) {
              if (user && data.user.balance > user.balance) {
                setUser(data.user);
                setSuccess(true);
                setTimeout(() => router.push("/dashboard"), 3500);
              }
            }
          }
        } catch (err) {}
      }, 4000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [qrisData, success, user, router, setUser]);

  // Cek perubahan saldo untuk trigger animasi sukses (Fast track)
  if (qrisData && !success && initialBalance !== null && user && user.balance > initialBalance) {
    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 3500);
  }

  const handleRequestQris = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount);
    if (!num || num < 10000) {
      setError("Minimal top up saldo adalah Rp 10.000");
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
      const data = await res.json();
      if (data.status) {
        setQrisData(data.qrisData);
        setTimeLeft(data.qrisData.expiresAt ? data.qrisData.expiresAt - Math.floor(Date.now() / 1000) : 5 * 60);
      } else {
        setError(data.message || "Gagal membuat QRIS");
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
              <h2 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                Rp {(user?.balance || 0).toLocaleString("id-ID")}
              </h2>
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

            {/* Pilihan Nominal Cepat (Shopee Style Grid) */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-ink">Pilih Nominal Top Up</label>
                <span className="text-[11px] text-ink-muted">Min. Rp 10.000</span>
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
                  min="10000"
                  step="1000"
                  placeholder="Contoh: 75000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-hairline bg-canvas text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Metode Pembayaran Supported E-Commerce */}
            <div className="p-3.5 rounded-2xl bg-parchment/50 border border-hairline space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-ink">Metode Pembayaran:</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  QRIS Semua Bank & E-Wallet
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="bg-white rounded-xl px-2.5 py-1 border border-hairline h-8 flex items-center shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-4 object-contain" />
                </div>
                <div className="bg-white rounded-xl px-2.5 py-1 border border-hairline h-8 flex items-center shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg" alt="GoPay" className="h-3.5 object-contain" />
                </div>
                <div className="bg-white rounded-xl px-2.5 py-1 border border-hairline h-8 flex items-center shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg" alt="DANA" className="h-3 object-contain" />
                </div>
                <div className="bg-white rounded-xl px-2.5 py-1 border border-hairline h-8 flex items-center shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg" alt="OVO" className="h-3 object-contain" />
                </div>
                <div className="bg-white rounded-xl px-2.5 py-1 border border-hairline h-8 flex items-center shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/85/LinkAja.svg" alt="LinkAja" className="h-3.5 object-contain" />
                </div>
                <span className="text-[10px] text-ink-muted font-bold pl-1">+ BCA, Mandiri, BRI, BNI</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={loading}
              className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20"
            >
              Lanjut Bayar (Rp {selectedNum.toLocaleString("id-ID")}) ➔
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

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-ink-muted hover:text-ink"
                onClick={() => {
                  setQrisData(null);
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
