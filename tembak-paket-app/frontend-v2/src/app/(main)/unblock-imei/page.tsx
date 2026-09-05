"use client";
import React, { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import TelegramPopup from "@/components/ui/TelegramPopup";
import Swal from "@/lib/sweetalert";
import { useRouter, useSearchParams } from "next/navigation";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { parseMultipleImeis } from "@/lib/imeiHelper";
import { CouponItem } from "@/components/ui/ShopeeVoucherCard";
import { ShopeeVoucherModal } from "@/components/ui/ShopeeVoucherModal";
import InstantQrisPaymentModal from "@/components/ui/InstantQrisPaymentModal";
import { ProductReviewsSection } from "@/components/ui/ProductReviewsSection";
import { safeJson } from "@/lib/api";

function UnblockImeiContent() {
  const { user, addToCart, updateBalance } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState<string>("slow");
  
  const [files, setFiles] = useState<File[]>([]);
  const [ceirFiles, setCeirFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ isOpen: true, note: "" });
  const [announcement, setAnnouncement] = useState<{ message: string, bgColor?: string } | null>(null);

  // Coupon Promo & Voucher Modal State (Shopee Style)
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [publicCoupons, setPublicCoupons] = useState<CouponItem[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "balance">("qris");
  const [showInstantQris, setShowInstantQris] = useState(false);

  // WhatsApp Recipient Phone State
  const [targetPhone, setTargetPhone] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams) {
      const paramImei = searchParams.get("imei") || searchParams.get("q") || "";
      if (paramImei) {
        setImei(paramImei);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const defaultPhone = user?.phone || user?.verifiedPhone;
    if (defaultPhone && !targetPhone) {
      setTargetPhone(defaultPhone);
    }
  }, [user, targetPhone]);

  useEffect(() => {
    Promise.all([
      fetch('/api/imei-packages', { credentials: 'include' }).then(res => safeJson(res)).catch(() => null),
      fetch('/api/manual-services-pricing', { credentials: 'include' }).then(res => safeJson(res)).catch(() => null),
      fetch('/api/imei-service-status', { credentials: 'include' }).then(res => safeJson(res)).catch(() => null),
      fetch('/api/user/announcement', { credentials: 'include' }).then(res => safeJson(res)).catch(() => null),
      fetch('/api/coupons/public', { credentials: 'include' }).then(res => safeJson(res)).catch(() => null)
    ]).then(([pkgData, prcData, statusData, annData, couponData]) => {
      if (pkgData?.status && Array.isArray(pkgData.data)) {
        const visiblePkgs = pkgData.data.filter((p: any) => p && p.isVisible !== false);
        setPackages(visiblePkgs);
        if (visiblePkgs.length > 0 && !selectedPkgId) {
          setSelectedPkgId(visiblePkgs[0].id);
        }
      }
      if (prcData?.status && prcData.data) setSpeedPricing(prcData.data);
      if (statusData?.status) {
        const isOpen = (typeof statusData.isOpen === 'boolean') ? statusData.isOpen : (statusData.service_status !== 'closed');
        setServiceStatus({ isOpen, note: statusData.note || "" });
      }
      if (annData?.status && annData?.data?.message) setAnnouncement(annData.data);
      if (couponData?.status && Array.isArray(couponData.data)) setPublicCoupons(couponData.data);
      setLoading(false);
    });
  }, []);

  const safePackages = Array.isArray(packages) ? packages : [];
  const imeiList = parseMultipleImeis(imei);
  const imeiCount = imeiList.length > 0 ? imeiList.length : 1;
  const selectedPkg = safePackages.find(p => p && p.id === selectedPkgId);
  const basePrice = selectedPkg ? Number(selectedPkg.price || 0) : 0;
  const speedCost = selectedSpeed && speedPricing && speedPricing[selectedSpeed] ? Number(speedPricing[selectedSpeed] || 0) : 0;
  const pricePerImei = basePrice + speedCost;
  const rawTotalPrice = pricePerImei * imeiCount;

  const discountAmount = appliedCoupon ? Math.min(Number(appliedCoupon.discount_amount || 0), rawTotalPrice) : 0;
  const priceAfterCoupon = Math.max(0, rawTotalPrice - discountAmount);
  const userCoins = Number(user?.coins || 0);
  const userBalance = Number(user?.balance || 0);

  // Guardrails: Minimal order Rp 50.000, Maks 10%, dan Maksimal Rp 5.000 cap
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.1), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const totalPrice = Math.max(0, priceAfterCoupon - coinsDiscount);

  const validateFormInputs = () => {
    const missing: string[] = [];

    if (imeiList.length === 0) {
      missing.push("Nomor IMEI target belum diisi atau kurang dari 15 digit angka.");
    }
    if (!selectedPkgId) {
      missing.push("Pilih Paket Masa Aktif / Garansi (3 Bulan, 1 Tahun, atau Permanent).");
    }
    if (files.length === 0) {
      missing.push("Unggah Bukti Screenshot *#06# HP target.");
    }
    if (!agreed) {
      missing.push("Centang persetujuan Syarat & Ketentuan Layanan.");
    }

    if (missing.length > 0) {
      Swal.fire({
        title: "Mohon Lengkapi Data Pesanan ⚠️",
        html: `
          <div class="text-left text-xs space-y-2 py-1">
            <p class="font-bold text-slate-700 dark:text-slate-200">Pesanan belum dapat diproses karena ada data yang belum lengkap:</p>
            <ul class="list-disc pl-5 text-rose-600 dark:text-rose-400 space-y-1.5 font-medium">
              ${missing.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
        `,
        icon: "warning",
        confirmButtonText: "Siap, Lengkapi Sekarang 👍",
        confirmButtonColor: "#0066cc",
      });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateFormInputs()) return;

    const pkg = safePackages.find((p) => p && p.id === selectedPkgId);
    if (!pkg) return;

    addToCart({
      packageId: pkg.id,
      packageName: pkg.name || `Unblock IMEI ${pkg.duration}`,
      serviceType: "manual_imei",
      price: Number(pkg.price || 0),
      duration: pkg.duration,
      imei: imei.trim(),
      targetPhone: targetPhone || user?.phone || user?.verifiedPhone || "",
      quantity: imeiCount,
      speed: selectedSpeed || "regular",
      speedPrice: speedCost,
    });

    Swal.fire({
      icon: "success",
      title: "Masuk Keranjang! 🛒",
      text: `${pkg.name || "Paket Buka IMEI"} berhasil ditambahkan ke keranjang belanja.`,
      showCancelButton: true,
      confirmButtonText: "Lihat Keranjang",
      cancelButtonText: "Lanjut Belanja",
      confirmButtonColor: "#0066cc",
    }).then((result) => {
      if (result.isConfirmed) {
        router.push("/cart");
      }
    });
  };

  const handleClaimCoupon = async (coupon: CouponItem) => {
    setClaimingCouponId(coupon.id);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ couponId: coupon.id, coupon_id: coupon.id, code: coupon.code })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({
          icon: "success",
          title: "Voucher Diklaim!",
          text: `Kode ${coupon.code} berhasil diklaim.`,
          timer: 1800,
          showConfirmButton: false
        });
        setPublicCoupons(prev =>
          (Array.isArray(prev) ? prev : []).map(c =>
            c.id === coupon.id
              ? { ...c, is_claimed: true, total_claimed_count: (c.total_claimed_count || 0) + 1 }
              : c
          )
        );
        handleApplyCoupon(coupon.code);
      } else {
        setCouponError(data?.message || "Gagal mengklaim voucher.");
      }
    } catch (e) {
      setCouponError("Terjadi kesalahan jaringan.");
    } finally {
      setClaimingCouponId(null);
    }
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const targetCode = (typeof codeToApply === 'string' ? codeToApply : couponCode).trim();
    if (!targetCode) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: targetCode, order_amount: rawTotalPrice })
      });
      const d = await safeJson(res);
      if (res.ok && d?.status && d?.data) {
        setAppliedCoupon(d.data);
        setCouponCode(d.data.code);
        Swal.fire({
          title: "Voucher Terpasang!",
          text: `Hemat Rp ${Number(d.data.discount_amount || 0).toLocaleString('id-ID')} dengan kode ${d.data.code}`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(d?.message || "Gagal menerapkan kupon promo.");
      }
    } catch (e) {
      setCouponError("Terjadi kendala saat memeriksa kupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormInputs()) return;

    if (paymentMethod === "qris" || userBalance < totalPrice) {
      setShowInstantQris(true);
      return;
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Checkout',
      text: `Yakin mau lanjut bayar untuk ${imeiList.length} IMEI? ${appliedCoupon ? `(Diskon Kupon: -Rp ${discountAmount.toLocaleString('id-ID')}) ` : ''}Saldo terpotong Rp ${totalPrice.toLocaleString('id-ID')}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Lanjutkan',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) {
      return;
    }

    executeOrderSubmission();
  };

  const executeOrderSubmission = async () => {
    const pkg = safePackages.find(p => p && p.id === selectedPkgId);
    if (!pkg) return;

    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("service_type", "imei");
    formData.append("imei", imei);
    formData.append("duration", pkg.duration || "1 Bulan");
    formData.append("amount", totalPrice.toString());
    formData.append("package_id", pkg.id);
    formData.append("price_key", pkg.id);
    formData.append("speed", selectedSpeed || "regular");
    formData.append("speed_option", selectedSpeed || "regular");
    formData.append("speedPrice", speedCost.toString());
    if (appliedCoupon) {
      formData.append("couponCode", appliedCoupon.code);
      formData.append("coupon_code", appliedCoupon.code);
    }

    const finalPhone = targetPhone || user?.phone || user?.verifiedPhone || "";
    if (finalPhone) {
      formData.append("targetPhone", finalPhone);
      formData.append("target_phone", finalPhone);
    }

    (files || []).forEach(f => {
      formData.append("screenshot", f);
      formData.append("image", f);
    });
    (ceirFiles || []).forEach(f => {
      formData.append("ceir_screenshot", f);
      formData.append("ceir_image", f);
    });

    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await safeJson(res);
      if (res.ok && data?.status) {
        if (typeof data.newBalance === "number") {
          updateBalance(data.newBalance);
        }
        setShowInstantQris(false);
        Swal.fire({
          title: "Pembayaran & Pesanan Berhasil! 🚀",
          text: "Pesanan Buka Gembok IMEI Anda telah terbuat dan diteruskan ke Admin untuk diproses.",
          icon: "success",
          confirmButtonText: "Lihat Riwayat Pesanan",
          confirmButtonColor: "#2563eb",
          allowOutsideClick: false
        }).then(() => {
          router.push("/history");
        });
      } else {
        Swal.fire({
          title: "Gagal Membuat Pesanan",
          text: data?.message || "Terjadi kesalahan saat memproses pesanan.",
          icon: "error"
        });
        setError(data?.message || "Gagal membuat pesanan.");
      }
    } catch (err) {
      Swal.fire({
        title: "Error Jaringan",
        text: "Kesalahan jaringan saat memproses pesanan. Silakan periksa koneksi Anda.",
        icon: "error"
      });
      setError("Kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const speedOptions = [
    { id: 'fast', key: 'imei_speed_fast', label: 'Fast', defaultRange: '1-3 Jam' },
    { id: 'semi', key: 'imei_speed_semi', label: 'Semi Fast', defaultRange: '1-12 Jam' },
    { id: 'slow', key: 'imei_speed_slow', label: 'Slow', defaultRange: 'Max kirim 14:00, Selesai 00:00 WIB' }
  ]
    .filter(opt => {
      const status = speedPricing ? speedPricing[`${opt.key}_status`] : null;
      return status === 'visible' || status === 'active';
    })
    .map(opt => ({
      id: opt.id,
      label: opt.label,
      rangeText: (speedPricing && speedPricing[`${opt.key}_range`]) || opt.defaultRange,
      price: (speedPricing && parseInt(speedPricing[opt.key])) || 0
    }));

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="p-8 rounded-3xl bg-canvas border border-hairline text-center animate-pulse">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-bold text-ink">Memuat Layanan Buka IMEI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <TelegramPopup />
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Buka Gembok IMEI</h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] uppercase">Star Seller</span>
          </div>
          <p className="text-xs text-ink-muted">Aktivasi sinyal HP All Operator resmi &amp; 100% bergaransi.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {announcement && (
          <div
            className="rounded-2xl p-4 text-white text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: announcement.bgColor || '#0066cc' }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.455a20.89 20.89 0 01-1.503-3.819m3.165-.4c.594-.05 1.189-.125 1.78-.226a11.956 11.956 0 004.832-2.016m-6.612 2.642a12.02 12.02 0 01-1.78-.226m10.172-4.432A11.96 11.96 0 0013.91 5.34m0 0a11.97 11.97 0 00-3.57-1.22m3.57 1.22c.594.05 1.189.125 1.78.226m-1.78-.226c-1.19.1-2.38.25-3.57.446" />
            </svg>
            <span>{announcement.message}</span>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm space-y-3 shadow-inner">
          <h3 className="font-bold flex items-center gap-1.5 text-base">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>Ketentuan Layanan</span>
          </h3>
          <ul className="list-decimal pl-5 space-y-2 leading-relaxed">
            <li>Cuma buat <b>HP Inter (Internasional)</b> ya.</li>
            <li>Buat user iPhone, <i>wajib banget</i> pastiin HP lo <b>bukan barang bypass-an</b>!</li>
            <li>Pastiin <b>IC Baseband HP lo masih sehat</b>. Cara ngeceknya: masukin SIM Card, kalo munculnya <span className="font-semibold text-rose-600">"Tidak ada layanan" (No Service)</span> berarti aman. BUKAN "Tidak ada SIM" (No SIM Card) ya.</li>
            <li>Kalo HP lo statusnya <b>simlock</b>, wajib udah kepasang <i>rsim</i> atau <i>sim sticker</i> dari awal.</li>
            <li>Proses ini manual dikerjain admin (estimasi 1-24 jam). Kalo gagal gara-gara sistem, <b>saldo lo di-refund 100%</b>. (TAPI KALO GAGAL KARENA KESALAHAN LO SENDIRI, NO REFUND!).</li>
          </ul>
        </div>

        {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-500/10 text-green-700 rounded-xl text-sm">{success}</div>}

        {serviceStatus.isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-ink/80">Nomor IMEI (15 Digit)</label>
                {imei.trim().length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {parseMultipleImeis(imei).filter(i => i.isValidLength).length} IMEI Valid
                  </span>
                )}
              </div>
              <textarea 
                placeholder="Masukkan 15 digit IMEI (Bisa banyak sekaligus, pisahkan dengan enter atau koma)" 
                value={imei} 
                onChange={e => {
                  const val = e.target.value;
                  const sanitized = val.replace(/[^0-9,\n\r ]/g, '');
                  setImei(sanitized);
                }}
                className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px] leading-relaxed"
                required 
              />

              {/* Interactive Multi-IMEI Tag Badges & Live Device Auto-Detect */}
              {imei.trim().length > 0 && (() => {
                const parsedList = parseMultipleImeis(imei);
                const validCount = parsedList.filter(i => i.isValidLength && i.isValidLuhn).length;
                const warnCount = parsedList.filter(i => i.isValidLength && !i.isValidLuhn).length;

                const removeImeiAtIndex = (indexToRemove: number) => {
                  const lines = imei.split(/[\n,]+/).map(i => i.trim()).filter(Boolean);
                  const updated = lines.filter((_, idx) => idx !== indexToRemove).join("\n");
                  setImei(updated);
                };

                return (
                  <div className="space-y-2.5 pt-1">
                    {/* Summary Stats Header */}
                    <div className="flex items-center justify-between px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">Total: {parsedList.length} IMEI</span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          {validCount} Siap Proses
                        </span>
                        {warnCount > 0 && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            {warnCount} Cek Ulang
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setImei("")}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold transition-colors"
                      >
                        Hapus Semua
                      </button>
                    </div>

                    {/* Interactive Tag Cards */}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {parsedList.map((analysis, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            analysis.isValidLength && analysis.isValidLuhn 
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                              : analysis.isValidLength && !analysis.isValidLuhn
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-canvas border-hairline text-ink-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-parchment font-bold text-[10px] text-ink-muted flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-ink truncate text-xs">
                                {analysis.brand ? `${analysis.brand} ${analysis.model}` : `Perangkat #${idx + 1}`}
                              </p>
                              <p className="text-[11px] opacity-80 font-mono font-bold tracking-wider truncate">
                                {analysis.clean || analysis.raw}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {analysis.isValidLength && analysis.isValidLuhn ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                GSMA Valid
                              </span>
                            ) : analysis.isValidLength && !analysis.isValidLuhn ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200" title="Digit checksum luhn tidak cocok">
                                Typo Checksum
                              </span>
                            ) : (
                              <span className="text-[10px] text-ink-muted">
                                {analysis.clean.length}/15 digit
                              </span>
                            )}

                            {/* Remove Tag Button */}
                            <button
                              type="button"
                              onClick={() => removeImeiAtIndex(idx)}
                              className="w-5 h-5 rounded-full bg-slate-200/80 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-[10px] text-slate-600 transition-colors"
                              title="Hapus IMEI ini"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* WhatsApp Recipient Phone Input */}
            <div className="space-y-1.5 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  <span>Nomor WhatsApp Penerima Nota</span>
                </label>
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Auto Kirim Nota via WA
                </span>
              </div>
              <input
                type="tel"
                placeholder="Contoh: 081234567890 (Nomor WhatsApp Anda atau Pembeli)"
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                className="w-full rounded-xl border border-hairline bg-canvas px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Bot WhatsApp akan otomatis mengirimkan nota &amp; link garansi ke nomor ini begitu pesanan sukses.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink/80">Upload Screenshot *#06# <span className="text-rose-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink/80">Upload Cek CEIR <span className="text-ink-muted text-[10px]">(Opsional)</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setCeirFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">Pilih Paket Masa Aktif</label>
                <span className="text-[11px] text-primary font-semibold">100% Bergaransi Resmi</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {loading ? (
                  <p className="text-xs text-ink-muted col-span-3">Memuat paket...</p>
                ) : safePackages.length === 0 ? (
                  <p className="text-xs text-ink-muted col-span-3">Belum ada pilihan paket.</p>
                ) : (
                  safePackages.map((opt, idx) => {
                    const isSelected = selectedPkgId === opt.id;
                    const isBestSeller = (opt.duration || "").toLowerCase().includes("3 bulan") || idx === 0;
                    const optPrice = Number(opt.price || 0);

                    return (
                      <button
                        key={opt.id || idx}
                        type="button"
                        onClick={() => setSelectedPkgId(opt.id)}
                        className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 scale-[1.01]"
                            : "border-hairline bg-canvas hover:border-primary/40 hover:bg-parchment"
                        }`}
                      >
                        {/* Top tag */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-bold text-xs text-ink truncate">{opt.duration}</span>
                          {isBestSeller && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                              TERLARIS
                            </span>
                          )}
                        </div>

                        {/* Pricing */}
                        <div>
                          <p className="text-[9px] text-ink-muted line-through">
                            Rp {(optPrice + 20000).toLocaleString("id-ID")}
                          </p>
                          <p className="font-black text-xs sm:text-sm text-primary">
                            Rp {optPrice.toLocaleString("id-ID")}
                          </p>
                        </div>

                        {/* Guarantee tag */}
                        <div className="pt-1.5 border-t border-hairline/60 flex items-center gap-1 text-[9px] text-emerald-700 font-medium">
                          <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                          <span className="truncate">Garansi Sinyal</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {speedOptions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-ink">Pilih Kecepatan Proses Server</label>
                <div className="grid grid-cols-3 gap-2">
                  {speedOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSpeed(opt.id)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        selectedSpeed === opt.id
                          ? "border-primary bg-primary/5 shadow-sm text-primary ring-1 ring-primary font-bold"
                          : "border-hairline bg-canvas hover:bg-parchment"
                      }`}
                    >
                      <div className="font-bold text-xs capitalize truncate">{opt.label}</div>
                      {opt.rangeText && (
                        <div
                          className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5 leading-tight line-clamp-2"
                          style={{ color: '#d97706' }}
                        >
                          ⏱️ {opt.rangeText}
                        </div>
                      )}
                      <div className="text-[10px] font-semibold mt-0.5 text-ink-muted">
                        {opt.price === 0 ? "Gratis" : `+Rp ${Number(opt.price).toLocaleString("id-ID")}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voucher Diskon Checkout Bar */}
            <div className="pt-1 space-y-2">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Voucher Diskon &amp; Promo</span>
                <span className="text-[10px] text-ink-muted">Bisa hemat biaya order</span>
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950 text-xs">
                        Voucher <span className="font-mono">{appliedCoupon.code}</span> Terpasang
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Potongan Diskon: -Rp {discountAmount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowVoucherModal(true)}
                      className="text-xs font-bold text-primary hover:underline px-2 py-1"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1 bg-rose-50 rounded-xl border border-rose-200/60 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-canvas border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-xs font-bold shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-ink font-bold text-xs">Voucher Ry-ITSolutions</p>
                      <p className="text-[10px] text-ink-muted">Pilih atau klaim voucher untuk hemat lebih banyak</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold text-xs shrink-0">
                    <span>Gunakan / Masukkan Kode</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>
              )}

              {couponError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {couponError}
                </p>
              )}
            </div>

            {/* Koin Ry Deduction Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-ink text-xs">
                    Tukarkan Koin Ry ({userCoins.toLocaleString("id-ID")} Koin)
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    {priceAfterCoupon < 50000
                      ? "Minimal transaksi Rp 50.000 untuk menggunakan koin"
                      : userCoins > 0
                      ? `Hemat -Rp ${Math.min(userCoins, maxCoinsAllowed).toLocaleString("id-ID")} (Maks. 10% / Rp 5.000 per order)`
                      : "Mainkan Game Koin untuk kumpulkan koin diskon"}
                  </p>
                </div>
              </div>

              {userCoins > 0 && maxCoinsAllowed > 0 ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={useCoins}
                    onChange={(e) => setUseCoins(e.target.checked)}
                  />
                  <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/games")}
                  className="text-xs font-bold text-amber-700 hover:underline px-2 py-1"
                >
                  Dapatkan Koin
                </button>
              )}
            </div>

            {/* Price Breakdown Summary */}
            <div className="p-4 rounded-2xl bg-parchment/60 border border-hairline space-y-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal ({imeiCount} IMEI)</span>
                <span className="font-bold text-ink">Rp {rawTotalPrice.toLocaleString("id-ID")}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Diskon Kupon ({appliedCoupon.code})</span>
                  <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
              {useCoins && coinsDiscount > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Potongan Koin Ry ({coinsDiscount.toLocaleString("id-ID")} Koin)</span>
                  <span>- Rp {coinsDiscount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-ink pt-2 border-t border-hairline">
                <span>Total Bayar</span>
                <span className="text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Opsi Metode Pembayaran Direct */}
            <div className="space-y-2 pt-2 border-t border-hairline">
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
                      <h5 className="font-extrabold text-xs text-ink flex items-center gap-1.5">
                        <span>⚡</span> Direct QRIS Otomatis
                      </h5>
                      <p className="text-[10px] text-emerald-700 font-bold">Semua Bank &amp; E-Wallet (Realtime 24 Jam)</p>
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
                      <p className="text-[10px] text-ink-muted">Rp {userBalance.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "balance"} onChange={() => {}} className="text-primary" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-hairline">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-hairline text-primary"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-xs text-ink-muted">
                  Saya menyatakan bahwa HP saya memenuhi seluruh persyaratan di atas dan setuju memproses pesanan ini.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-canvas border border-primary/30 text-primary font-bold text-xs hover:bg-primary/5 transition-all shadow-xs"
              >
                + Masukkan Keranjang
              </Button>
              <Button
                type="submit"
                isLoading={submitting}
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/20 transition-all"
              >
                {paymentMethod === "qris" ? "Bayar via QRIS Langsung ➔" : "Bayar dengan Saldo ➔"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center space-y-3 bg-rose-50/50">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="font-black text-rose-700 text-lg">Server IMEI Sedang Tutup</h3>
            <p className="text-sm text-rose-600 font-semibold max-w-md mx-auto leading-relaxed">
              {serviceStatus.note || "Layanan unblock IMEI sedang tidak menerima pesanan baru. Silakan pantau terus notifikasi dari kami ya!"}
            </p>
          </div>
        )}

      </Card>

      {/* Shopee-Style Customer Reviews Section (Ulasan Real Pelanggan) */}
      <ProductReviewsSection productId="unblock-imei" title="Ulasan Pelanggan Unblock IMEI" />

      <ShopeeVoucherModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        publicCoupons={publicCoupons}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        onClaimCoupon={handleClaimCoupon}
        claimingId={claimingCouponId}
        loading={couponLoading}
        rawTotalPrice={rawTotalPrice}
      />

      <InstantQrisPaymentModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={totalPrice}
        orderTitle="Pembayaran Instant Buka Sinyal IMEI"
        preferredGateway="auto"
        onSuccess={() => {
          setShowInstantQris(false);
          executeOrderSubmission();
        }}
      />

      <SuccessModal 
        isOpen={showSuccessPop} 
        onClose={() => router.push('/history')} 
        amount={totalPrice} 
        title="Pembayaran Berhasil"
        statusText="Pesanan Unblock IMEI berhasil dibuat!"
        recipientLabel="IMEI Target"
        recipientValue={imei}
      />
    </div>
  );
}

export default function UnblockImeiPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="p-8 rounded-3xl bg-canvas border border-hairline text-center animate-pulse">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-ink">Memuat Layanan Buka IMEI...</p>
          </div>
        </div>
      }
    >
      <UnblockImeiContent />
    </Suspense>
  );
}
