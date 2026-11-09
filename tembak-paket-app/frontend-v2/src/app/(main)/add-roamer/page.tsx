"use client";
import { BroadcastBanner } from "@/components/ui/BroadcastBanner";
import React, { useState, useEffect, Suspense, useMemo } from "react";
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
import IGTestiPreview from "@/components/ui/IGTestiPreview";
import WAGroupPopup from "@/components/ui/WAGroupPopup";
import { safeJson } from "@/lib/api";

function PackageCountdown({ openHour }: { openHour: number }) {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const wibNow = new Date(utc + (7 * 3600000));
      
      const target = new Date(wibNow);
      target.setHours(openHour, 0, 0, 0);
      
      if (wibNow.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      
      const diff = target.getTime() - wibNow.getTime();
      if (diff <= 0) {
        setTimeLeft("Segera buka");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${String(hours).padStart(2, '0')}j ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [openHour]);

  return <span className="font-mono text-[9px] font-bold">{timeLeft}</span>;
}

function UnblockImeiContent() {
  const { user, addToCart, updateBalance } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Progressive 3-Step Wizard State: 1 = Pilih Paket & Harga, 2 = Data HP & IMEI, 3 = Pembayaran & Checkout
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [imei, setImei] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState<string>("slow");
  
  const [files, setFiles] = useState<File[]>([]);
  const [ceirFiles, setCeirFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ketentuanOpen, setKetentuanOpen] = useState(false);
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ isOpen: true, note: "" });
  const [announcements, setAnnouncements] = useState<any[]>([]);

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
      if (annData?.status) {
        if (Array.isArray(annData.announcements) && annData.announcements.length > 0) {
          setAnnouncements(annData.announcements);
        } else if (annData.data && annData.data.message) {
          setAnnouncements([annData.data]);
        }
      }
      if (couponData?.status && Array.isArray(couponData.data)) setPublicCoupons(couponData.data);
      setLoading(false);
    });
  }, []);

  const safePackages = Array.isArray(packages) ? packages : [];

  // Deduplicate packages by duration (case-insensitive) if any legacy duplicates exist
  const uniquePackages = useMemo(() => {
    const map = new Map<string, any>();
    safePackages.forEach(p => {
      if (!p) return;
      const dur = (p.duration || '').trim().toLowerCase();
      if (!map.has(dur)) {
        map.set(dur, p);
      } else {
        const existing = map.get(dur);
        let hasSp1 = false;
        try {
          if (existing?.speed_prices) {
            const parsed1 = typeof existing.speed_prices === 'string' ? JSON.parse(existing.speed_prices) : existing.speed_prices;
            hasSp1 = Boolean(parsed1 && typeof parsed1 === 'object' && Object.keys(parsed1).length > 0);
          }
        } catch (e) {}

        let hasSp2 = false;
        try {
          if (p?.speed_prices) {
            const parsed2 = typeof p.speed_prices === 'string' ? JSON.parse(p.speed_prices) : p.speed_prices;
            hasSp2 = Boolean(parsed2 && typeof parsed2 === 'object' && Object.keys(parsed2).length > 0);
          }
        } catch (e) {}

        if (!hasSp1 && hasSp2) {
          map.set(dur, p);
        }
      }
    });
    return Array.from(map.values());
  }, [safePackages]);

  const imeiList = parseMultipleImeis(imei);
  const imeiCount = imeiList.length > 0 ? imeiList.length : 1;
  const selectedPkg = uniquePackages.find(p => p && p.id === selectedPkgId) || safePackages.find(p => p && p.id === selectedPkgId);

  const pkgSpeedPrices: any = useMemo(() => {
    if (!selectedPkg?.speed_prices) return {};
    try {
      return typeof selectedPkg.speed_prices === 'string'
        ? JSON.parse(selectedPkg.speed_prices)
        : selectedPkg.speed_prices;
    } catch (e) {
      return {};
    }
  }, [selectedPkg]);

  const wholesalePromoInfo = useMemo(() => {
    let minPrice = Infinity;
    let minQty = 2;
    let hasPromo = false;

    safePackages.forEach((p) => {
      if (!p) return;
      if (p.isVisible === 0 || p.isVisible === false || p.is_active === 0 || p.is_active === false || p.status === 'inactive') return;
      if (!p.speed_prices) return;
      try {
        const parsed = typeof p.speed_prices === 'string' ? JSON.parse(p.speed_prices) : p.speed_prices;
        if (parsed && parsed.wholesale_enabled) {
          const prices = parsed.wholesale_prices || {};
          const validPrices = Object.values(prices).map((v) => Number(v)).filter((v) => v > 0);
          if (validPrices.length > 0) {
            hasPromo = true;
            const pkgMin = Math.min(...validPrices);
            if (pkgMin < minPrice) minPrice = pkgMin;
            if (parsed.wholesale_min_qty) minQty = Number(parsed.wholesale_min_qty);
          }
        }
      } catch (e) {}
    });

    return {
      hasPromo,
      minPrice: minPrice !== Infinity ? minPrice : 160000,
      minQty
    };
  }, [safePackages]);

  const speedCost = selectedSpeed && speedPricing ? Number(speedPricing[`imei_speed_${selectedSpeed}`] || speedPricing[selectedSpeed] || 0) : 0;
  const wholesaleMinQty = Number(pkgSpeedPrices?.wholesale_min_qty) || 2;
  const wholesalePrices = pkgSpeedPrices?.wholesale_prices || {};
  const wholesalePriceForSpeed = Number(wholesalePrices[selectedSpeed] || 0);
  const isWholesaleActive = Boolean(
    pkgSpeedPrices?.wholesale_enabled &&
    imeiCount >= wholesaleMinQty &&
    wholesalePriceForSpeed > 0
  );

  let regularPricePerImei = 0;
  if (selectedPkg) {
    if (selectedSpeed && pkgSpeedPrices[selectedSpeed] !== undefined && Number(pkgSpeedPrices[selectedSpeed]) > 0) {
      regularPricePerImei = Number(pkgSpeedPrices[selectedSpeed]);
    } else {
      const basePrice = Number(selectedPkg.price || 0);
      const speedCost = selectedSpeed && speedPricing ? Number(speedPricing[`imei_speed_${selectedSpeed}`] || speedPricing[selectedSpeed] || 0) : 0;
      regularPricePerImei = basePrice + speedCost;
    }
  }

  const pricePerImei = isWholesaleActive ? wholesalePriceForSpeed : regularPricePerImei;
  const rawTotalPrice = pricePerImei * imeiCount;
  const regularTotalPrice = regularPricePerImei * imeiCount;
  const wholesaleSavings = isWholesaleActive ? Math.max(0, regularTotalPrice - rawTotalPrice) : 0;

  const discountAmount = appliedCoupon ? Math.min(Number(appliedCoupon.discount_amount || 0), rawTotalPrice) : 0;
  const priceAfterCoupon = Math.max(0, rawTotalPrice - discountAmount);
  const userCoins = Number(user?.coins || 0);
  const userBalance = Number(user?.balance || 0);

  // Guardrails: Minimal order Rp 50.000, Maks 10%, dan Maksimal Rp 5.000 cap
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.02), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const totalPrice = Math.max(0, priceAfterCoupon - coinsDiscount);

  // Validation functions per Step
  const validateStep1 = () => {
    if (!selectedPkgId) {
      Swal.fire({
        title: "Pilih Paket Masa Aktif",
        text: "Silakan pilih salah satu paket masa aktif (1 Bulan atau 3 Bulan) untuk melanjutkan.",
        icon: "warning",
        confirmButtonColor: "#0071e3",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const missing: string[] = [];

    if (imeiList.length === 0) {
      missing.push("Nomor IMEI target belum diisi atau kurang dari 15 digit angka.");
    }
    if (!targetPhone.trim() && !user?.verifiedPhone && !user?.phone) {
      missing.push("Nomor WhatsApp Penerima Nota harus diisi.");
    } else if (targetPhone.trim() && targetPhone.replace(/\D/g, "").length < 9) {
      missing.push("Nomor WhatsApp Penerima Nota minimal 9 digit angka (contoh: 081234567890).");
    }
    if (files.length === 0) {
      missing.push("Unggah Bukti Screenshot *#06# HP target.");
    }

    if (missing.length > 0) {
      Swal.fire({
        title: "Lengkapi Data Perangkat",
        html: `
          <div class="text-left text-xs space-y-2 py-1">
            <p class="font-bold text-slate-700 dark:text-slate-200">Mohon lengkapi data berikut sebelum lanjut ke pembayaran:</p>
            <ul class="list-disc pl-5 text-rose-600 dark:text-rose-400 space-y-1.5 font-medium">
              ${missing.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
        `,
        icon: "warning",
        confirmButtonText: "Siap, Lengkapi Sekarang",
        confirmButtonColor: "#0071e3",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!agreed) {
      Swal.fire({
        title: "Persetujuan Layanan",
        text: "Mohon centang persetujuan Syarat & Ketentuan Layanan sebelum melanjutkan pembayaran.",
        icon: "warning",
        confirmButtonColor: "#0071e3",
      });
      return false;
    }
    return true;
  };

  const validateFormInputs = () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return false;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return false;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
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
      packageName: pkg.name || `Add Roamer ${pkg.duration}`,
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
      title: "Masuk Keranjang!",
      text: `${pkg.name || "Paket Add Roamer"} berhasil ditambahkan ke keranjang belanja.`,
      showCancelButton: true,
      confirmButtonText: "Lihat Keranjang",
      cancelButtonText: "Lanjut Belanja",
      confirmButtonColor: "#0071e3",
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
      } else if (d?.require_claim) {
        const claimRes = await fetch("/api/coupons/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: targetCode, coupon_id: d.coupon_id })
        });
        const claimData = await safeJson(claimRes);
        if (claimData?.status) {
          const retryRes = await fetch("/api/coupon/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ code: targetCode, order_amount: rawTotalPrice })
          });
          const retryData = await safeJson(retryRes);
          if (retryData?.status && retryData.data) {
            setAppliedCoupon(retryData.data);
            setCouponCode(retryData.data.code);
            setPublicCoupons(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === d.coupon_id ? { ...c, is_claimed: true } : c));
            Swal.fire({
              title: "Voucher Berhasil Diklaim & Terpasang!",
              text: `Hemat Rp ${Number(retryData.data.discount_amount || 0).toLocaleString('id-ID')} dengan kode ${retryData.data.code}`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false
            });
            return;
          }
        }
        setAppliedCoupon(null);
        setCouponError(d?.message || "Voucher perlu diklaim terlebih dahulu.");
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

  // 1-Click Auto Apply Coupon from WhatsApp Broadcast Link (?coupon=CODE or ?claim=CODE)
  useEffect(() => {
    if (searchParams && !appliedCoupon && !loading) {
      const couponParam = searchParams.get("coupon") || searchParams.get("claim");
      if (couponParam) {
        handleApplyCoupon(couponParam);
      }
    }
  }, [searchParams, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      confirmButtonColor: '#0071e3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Lanjutkan Bayar',
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
    if (useCoins) {
      formData.append("use_coins", "true");
      formData.append("useCoins", "true");
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
          title: "Pembayaran & Pesanan Berhasil!",
          text: "Pesanan Add Roamer Anda telah terbuat dan diteruskan ke Admin untuk diproses.",
          icon: "success",
          confirmButtonText: "Lihat Riwayat Pesanan",
          confirmButtonColor: "#0071e3",
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

  const allowedSpeedsForPkg: string[] = (() => {
    if (!selectedPkg) return ['fast', 'semi', 'slow'];
    if (Object.keys(pkgSpeedPrices).length > 0) {
      const activeKeys = Object.keys(pkgSpeedPrices).filter(k => Number(pkgSpeedPrices[k]) > 0);
      if (activeKeys.length > 0) return activeKeys;
    }
    if (!selectedPkg.allowed_speeds) return ['fast', 'semi', 'slow'];
    try {
      const parsed = typeof selectedPkg.allowed_speeds === 'string'
        ? JSON.parse(selectedPkg.allowed_speeds)
        : selectedPkg.allowed_speeds;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
    return ['fast', 'semi', 'slow'];
  })();

  // Check current WIB (Asia/Jakarta) time cutoff (Default: 15:00 WIB or dynamic from settings)
  const cutoffTimeStr = (speedPricing?.rivera_slow_cutoff_time || '15:00').replace('.', ':');
  const [cutoffH, cutoffM] = cutoffTimeStr.split(':').map((n: string) => parseInt(n, 10) || 0);

  const isPastCutoffWib = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(new Date());
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      return hour > cutoffH || (hour === cutoffH && minute >= cutoffM);
    } catch (e) {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const wib = new Date(utc + (3600000 * 7));
      const hour = wib.getHours();
      const minute = wib.getMinutes();
      return hour > cutoffH || (hour === cutoffH && minute >= cutoffM);
    }
  })();

  const speedOptions = [
    { id: 'fast', key: 'imei_speed_fast', label: 'Fast (Super Express)', defaultRange: '30 Menit - 2 Jam Proses' },
    { id: 'semi', key: 'imei_speed_semi', label: 'Semi Fast (Express)', defaultRange: '2 - 6 Jam Proses Kerja' },
    { id: 'slow', key: 'imei_speed_slow', label: 'Slow (Reguler)', defaultRange: `Max kirim ${cutoffTimeStr} WIB, selesai max 00:00 WIB` }
  ]
    .filter(opt => {
      if (!allowedSpeedsForPkg.includes(opt.id)) return false;
      const status = speedPricing ? speedPricing[`${opt.key}_status`] : null;
      return status !== 'hidden';
    })
    .map(opt => {
      const hasSpecificPrice = pkgSpeedPrices[opt.id] !== undefined && Number(pkgSpeedPrices[opt.id]) > 0;
      const displayPrice = hasSpecificPrice
        ? Number(pkgSpeedPrices[opt.id])
        : ((speedPricing && parseInt(speedPricing[opt.key])) || 0);

      const rawRange = (speedPricing && speedPricing[`${opt.key}_range`]) || opt.defaultRange;
      const formattedRange = opt.id === 'slow' && (!rawRange || rawRange.includes('14:00') || rawRange.includes('Max kirim'))
        ? `Max kirim ${cutoffTimeStr} WIB, selesai max 00:00 WIB`
        : rawRange;

      const isMaintenance = speedPricing ? speedPricing[`${opt.key}_status`] === 'maintenance' : false;
      let maintenanceText = '';
      if (isMaintenance) {
        const until = speedPricing && speedPricing[`${opt.key}_maintenance_until`]
          ? new Date(speedPricing[`${opt.key}_maintenance_until`]).getTime()
          : NaN;
        maintenanceText = (!isNaN(until) && until > Date.now())
          ? `Estimasi tersedia kembali ${new Date(until).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB`
          : 'Estimasi waktu belum dapat ditentukan';
      }

      return {
        id: opt.id,
        label: opt.label,
        rangeText: formattedRange,
        isSpecificPrice: hasSpecificPrice,
        price: displayPrice,
        isMaintenance,
        maintenanceText
      };
    });

  useEffect(() => {
    if (speedOptions.length > 0) {
      const exists = speedOptions.some(opt => opt.id === selectedSpeed && !opt.isMaintenance);
      if (!exists) {
        const firstAvailable = speedOptions.find(opt => !opt.isMaintenance);
        setSelectedSpeed(firstAvailable ? firstAvailable.id : '');
      }
    } else {
      setSelectedSpeed('');
    }
  }, [selectedPkgId, speedOptions.map(o => o.id).join(','), selectedSpeed]);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="p-8 rounded-3xl bg-canvas border border-hairline text-center animate-pulse">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-bold text-ink">Memuat Layanan Add Roamer...</p>
        </div>
      </div>
    );
  }

  const parsedImeis = (parseMultipleImeis(imei) || []).filter(Boolean);
  const validImeiCount = parsedImeis.filter(i => i && i.isValidLength && i.isValidLuhn).length;
  const warnImeiCount = parsedImeis.filter(i => i && i.isValidLength && !i.isValidLuhn).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <TelegramPopup />
      
      {/* Header Bar */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-all btn-press shrink-0"
          title="Kembali ke Dashboard"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Add Roamer</h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] uppercase shadow-xs">
              Star Seller
            </span>
          </div>
          <p className="text-xs text-ink-muted">Aktivasi sinyal HP All Operator resmi &amp; 100% bergaransi.</p>
        </div>
      </div>

      {/* Broadcast Announcement Banner */}
      <BroadcastBanner initialAnnouncements={announcements} />

      {/* Promo Diskon Multi-IMEI & Dual SIM Banner */}
      {wholesalePromoInfo.hasPromo && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-ink tracking-tight">Promo Diskon Multi-IMEI</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">Hemat Otomatis</span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                Daftarkan {wholesalePromoInfo.minQty} IMEI atau lebih untuk pemrosesan banyak IMEI sekaligus, otomatis dapat harga grosir spesial mulai dari <span className="font-bold text-emerald-600 dark:text-emerald-400">Rp {wholesalePromoInfo.minPrice.toLocaleString('id-ID')} / IMEI</span>.
              </p>
            </div>
          </div>
          <div className="self-end sm:self-center shrink-0">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-300/60">
              Min. {wholesalePromoInfo.minQty} IMEI
            </span>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <Card glass className="p-4 sm:p-6 space-y-6">

        {/* 1. PROGRESSIVE 3-STEP WIZARD PROGRESS BAR */}
        <div className="p-3 sm:p-4 rounded-2xl bg-canvas border border-hairline shadow-2xs select-none">
          <div className="flex items-center justify-between relative">
            {/* Step 1 Pill: Pilih Paket */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none cursor-pointer text-left z-10 btn-press"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  currentStep === 1
                    ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/15 scale-105"
                    : currentStep > 1
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-parchment text-ink-muted border border-hairline"
                }`}
              >
                {currentStep > 1 ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <div>
                <p className={`text-xs font-bold transition-colors ${currentStep === 1 ? "text-primary" : currentStep > 1 ? "text-ink" : "text-ink-muted"}`}>
                  Pilih Paket
                </p>
                <p className="text-[10px] text-ink-muted hidden sm:block">Durasi &amp; Tarif</p>
              </div>
            </button>

            {/* Connector 1-2 */}
            <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-hairline relative overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: currentStep > 1 ? "100%" : "0%" }}
              />
            </div>

            {/* Step 2 Pill: Data HP & IMEI */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none cursor-pointer text-left z-10 btn-press"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  currentStep === 2
                    ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/15 scale-105"
                    : currentStep > 2
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-parchment text-ink-muted border border-hairline"
                }`}
              >
                {currentStep > 2 ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  "2"
                )}
              </div>
              <div>
                <p className={`text-xs font-bold transition-colors ${currentStep === 2 ? "text-primary" : currentStep > 2 ? "text-ink" : "text-ink-muted"}`}>
                  Data HP &amp; IMEI
                </p>
                <p className="text-[10px] text-ink-muted hidden sm:block">Perangkat &amp; Foto</p>
              </div>
            </button>

            {/* Connector 2-3 */}
            <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-hairline relative overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: currentStep > 2 ? "100%" : "0%" }}
              />
            </div>

            {/* Step 3 Pill: Pembayaran */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none cursor-pointer text-left z-10 btn-press"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  currentStep === 3
                    ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/15 scale-105"
                    : "bg-parchment text-ink-muted border border-hairline"
                }`}
              >
                3
              </div>
              <div>
                <p className={`text-xs font-bold transition-colors ${currentStep === 3 ? "text-primary" : "text-ink-muted"}`}>
                  Pembayaran
                </p>
                <p className="text-[10px] text-ink-muted hidden sm:block">Ringkasan &amp; Bayar</p>
              </div>
            </button>
          </div>
        </div>

        {/* Collapsible Ketentuan Layanan Card */}
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 p-3.5 sm:p-4 rounded-2xl text-sm shadow-2xs">
          <div
            className="font-bold flex items-center justify-between gap-1.5 text-xs sm:text-sm cursor-pointer select-none"
            onClick={() => setKetentuanOpen(!ketentuanOpen)}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Ketentuan Layanan Penting (Wajib Baca)</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
              <span>{ketentuanOpen ? "Tutup" : "Lihat Syarat"}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${ketentuanOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
          {ketentuanOpen && (
            <ul className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed mt-2.5 pt-2.5 border-t border-amber-500/20">
              <li>Layanan ini khusus untuk <b>HP Inter (Internasional)</b>.</li>
              <li>Untuk pengguna iPhone, pastikan HP <b>bukan barang bypass</b>.</li>
              <li>Pastikan <b>IC Baseband HP masih sehat</b>: masukkan SIM Card, jika muncul <span className="font-semibold text-rose-600 dark:text-rose-400">&quot;Tidak ada layanan&quot; (No Service)</span> berarti aman. BUKAN &quot;Tidak ada SIM&quot; (No SIM Card).</li>
              <li>Jika status HP <b>simlock</b>, wajib sudah terpasang <i>rsim</i> atau <i>sim sticker</i> dari awal.</li>
            </ul>
          )}
        </div>

        {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-xs sm:text-sm font-semibold">{error}</div>}
        {success && <div className="p-3 bg-green-500/10 text-green-700 rounded-xl text-xs sm:text-sm font-semibold">{success}</div>}

        {serviceStatus.isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ======================================================== */}
            {/* STEP 1: PILIHAN PAKET ROAMING & KECEPATAN PROSES         */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-hairline pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Langkah 1: Pilih Paket &amp; Kecepatan Proses</h2>
                    <p className="text-xs text-ink-muted">Pilih durasi garansi dan opsi kecepatan untuk melihat rincian harga paket.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    Tahap 1 dari 3
                  </span>
                </div>

                {/* Package Cards Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Pilihan Paket Masa Aktif / Garansi</label>
                    <span className="text-[11px] text-primary font-semibold">100% Bergaransi Resmi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {loading ? (
                      <p className="text-xs text-ink-muted col-span-3">Memuat pilihan paket...</p>
                    ) : safePackages.length === 0 ? (
                      <p className="text-xs text-ink-muted col-span-3">Belum ada pilihan paket yang aktif.</p>
                    ) : (
                      uniquePackages.map((opt, idx) => {
                        const isClosed = opt.is_open_now === false;
                        const isSelected = selectedPkgId === opt.id;
                        const isBestSeller = (opt.duration || "").toLowerCase().includes("3 bulan") || idx === 0;

                        let optSp: any = {};
                        if (opt.speed_prices) {
                          try {
                            optSp = typeof opt.speed_prices === 'string' ? JSON.parse(opt.speed_prices) : opt.speed_prices;
                          } catch (e) {}
                        }
                        const validSpPrices = Object.entries(optSp)
                          .filter(([k, v]) => !k.startsWith("wholesale_") && typeof v !== "boolean" && Number(v) >= 1000)
                          .map(([, v]) => Number(v));
                        const lowestPrice = validSpPrices.length > 0 ? Math.min(...validSpPrices) : Number(opt.price || 0);
                        const activeCardPrice = isSelected && selectedSpeed && optSp[selectedSpeed] && Number(optSp[selectedSpeed]) >= 1000
                          ? Number(optSp[selectedSpeed])
                          : lowestPrice;

                        return (
                          <div
                            key={opt.id || idx}
                            onClick={() => !isClosed && setSelectedPkgId(opt.id)}
                            className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between transition-all card-hover btn-press select-none cursor-pointer ${
                              isClosed ? "opacity-60 cursor-not-allowed border-amber-300/50 bg-amber-50/30" : ""
                            } ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/25"
                                : "border-hairline bg-canvas hover:border-primary/40 hover:bg-parchment"
                            }`}
                          >
                            <div>
                              {/* Header Card */}
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <span className="font-extrabold text-xs sm:text-sm text-ink truncate">{opt.duration}</span>
                                {opt.is_open_now === false ? (
                                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[8px] font-bold uppercase tracking-wider shrink-0 border border-amber-300">
                                    Tutup
                                  </span>
                                ) : isBestSeller ? (
                                  <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                                    TERLARIS
                                  </span>
                                ) : null}
                              </div>

                              {/* Countdown if closed */}
                              {opt.is_open_now === false && (
                                <div className="mb-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-300/60 text-amber-800 dark:text-amber-300">
                                  <div className="text-[10px] font-bold flex items-center justify-between">
                                    <span>Buka Pkl {String(opt.open_hour ?? 0).padStart(2, '0')}:00 WIB</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  </div>
                                  <div className="text-[9px] text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                                    <span>Hitung mundur:</span>
                                    <PackageCountdown openHour={opt.open_hour ?? 0} />
                                  </div>
                                </div>
                              )}

                              {/* Pricing */}
                              <p className="text-[10px] text-ink-muted line-through">
                                Rp {(activeCardPrice + 20000).toLocaleString("id-ID")}
                              </p>
                              <p className="font-black text-sm sm:text-base text-primary">
                                {isSelected ? `Rp ${activeCardPrice.toLocaleString("id-ID")}` : `Mulai Rp ${lowestPrice.toLocaleString("id-ID")}`}
                              </p>
                              <span className="text-[10px] text-ink-muted block mt-0.5">
                                {opt.description || `Garansi Sinyal Penuh ${opt.duration}`}
                              </span>
                            </div>

                            {/* Footer card info */}
                            <div className="mt-3 pt-2 border-t border-hairline/70 flex items-center justify-between text-[10px]">
                              {optSp.wholesale_enabled ? (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Grosir &ge;{optSp.wholesale_min_qty || 2} IMEI
                                </span>
                              ) : (
                                <span className="text-ink-muted">Garansi Resmi</span>
                              )}
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Speed Process Options */}
                {speedOptions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink">Kecepatan Pengerjaan Server</label>
                      {selectedSpeed === 'slow' && isPastCutoffWib && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300/50 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Lewat {cutoffTimeStr} WIB (Kirim Besok)</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {speedOptions.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => !opt.isMaintenance && setSelectedSpeed(opt.id)}
                          className={`p-3 rounded-2xl border text-left transition-all card-hover btn-press select-none cursor-pointer ${
                            opt.isMaintenance
                              ? "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/30 cursor-not-allowed opacity-80"
                              : selectedSpeed === opt.id
                              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/25"
                              : "border-hairline bg-canvas hover:bg-parchment"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-xs text-ink capitalize truncate">
                              {opt.label}
                            </span>
                            {selectedSpeed === opt.id && !opt.isMaintenance && (
                              <span className="w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                              </span>
                            )}
                          </div>

                          {opt.isMaintenance ? (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                                Maintenance
                              </span>
                              {opt.maintenanceText && (
                                <span className="text-[9px] text-amber-600/90 dark:text-amber-500/90 block mt-0.5 line-clamp-2">
                                  {opt.maintenanceText}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="text-[10px] text-ink-muted block line-clamp-2">
                                {opt.rangeText}
                              </span>
                              <span className="text-xs font-black text-primary block mt-1">
                                {opt.isSpecificPrice
                                  ? `Rp ${Number(opt.price).toLocaleString("id-ID")}`
                                  : opt.price === 0
                                  ? "Termasuk Paket"
                                  : `+Rp ${Number(opt.price).toLocaleString("id-ID")}`}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Disclaimer Cutoff Time */}
                    {selectedSpeed === 'slow' && (
                      <div className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                        isPastCutoffWib 
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-2xs" 
                          : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                      }`}>
                        <div className="font-bold flex items-center gap-1.5 text-xs">
                          <svg className={`w-4 h-4 shrink-0 ${isPastCutoffWib ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                          <span>
                            {isPastCutoffWib 
                              ? `Disclaimer Batas Waktu Pengiriman (Lewat ${cutoffTimeStr} WIB):` 
                              : "Jadwal Pengiriman Batch Server Hari Ini:"}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90 pl-5.5">
                          {isPastCutoffWib ? (
                            <>
                              Batas cut-off pengiriman hari ini ({cutoffTimeStr} WIB) telah terlewati. Pesanan Anda akan dikirimkan pada jadwal batch besok pagi (estimasi selesai max 00:00 WIB berikutnya).
                            </>
                          ) : (
                            <>
                              Pemesanan sebelum pukul <strong className="font-semibold">{cutoffTimeStr} WIB</strong> akan langsung dikirim pada batch hari ini dengan target selesai paling lambat <strong className="font-semibold">00:00 WIB malam ini</strong>.
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                                {/* Step 1 Next Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) {
                        setCurrentStep(2);
                      }
                    }}
                    className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md shadow-primary/25 btn-press btn-glow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Lanjut ke Data HP &amp; IMEI (Langkah 2)</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: INPUT NOMOR HP & IMEI DENGAN VALIDASI INSTAN     */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-hairline pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Langkah 2: Data Perangkat &amp; Nomor WhatsApp</h2>
                    <p className="text-xs text-ink-muted">Masukkan IMEI target dan nomor WA untuk pengiriman nota.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    Tahap 2 dari 3
                  </span>
                </div>

                {/* WhatsApp Recipient Phone Input */}
                <div className="space-y-1.5 p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                      <span>Nomor WhatsApp Penerima Nota</span>
                    </label>
                    {targetPhone.replace(/\D/g, "").length >= 9 ? (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300/40">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        <span>WA Valid</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                        Auto Kirim Nota via WA
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890 (Nomor WhatsApp Anda atau Pembeli)"
                    value={targetPhone}
                    onChange={e => setTargetPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                    className="w-full rounded-xl border border-hairline bg-canvas px-4 py-2.5 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    required
                  />
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Bot WhatsApp kami akan otomatis mengirimkan nota digital &amp; link garansi resmi begitu pesanan sukses.
                  </p>
                </div>

                {/* IMEI Input & Luhn Validator */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-bold text-ink">Nomor IMEI Target (15 Digit)</label>
                    {imei.trim().length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {validImeiCount} Valid GSMA
                        </span>
                        {warnImeiCount > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {warnImeiCount} Cek Ulang
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <textarea 
                    placeholder="Ketik atau tempel 15 digit IMEI disini (Bisa banyak sekaligus, pisahkan dengan enter atau koma)" 
                    value={imei} 
                    onChange={e => {
                      const val = e.target.value;
                      const sanitized = val.replace(/[^0-9,\n\r ]/g, '');
                      setImei(sanitized);
                    }}
                    className="w-full rounded-2xl border border-hairline bg-canvas px-4 py-3 text-xs sm:text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[110px] leading-relaxed font-mono"
                    required 
                  />

                  {/* Panduan Multi-IMEI / Dual SIM */}
                  <div className="flex items-start gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-ink-muted">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <p className="text-[11px] leading-relaxed">
                      <span className="font-bold text-ink">Punya HP Dual SIM (IMEI 1 &amp; 2)?</span> Masukkan tiap 15 digit IMEI di baris baru. Pembelian minimal 2 IMEI otomatis mendapatkan harga diskon grosir!
                    </p>
                  </div>

                  {/* Interactive Multi-IMEI Tag Badges & Live Device Auto-Detect */}
                  {imei.trim().length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between px-1 text-xs">
                        <span className="font-bold text-ink">Perangkat Terdeteksi ({parsedImeis.length})</span>
                        <button
                          type="button"
                          onClick={() => setImei("")}
                          className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                        >
                          Hapus Semua
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {parsedImeis.map((analysis, idx) => {
                          if (!analysis) return null;
                          const cleanStr = analysis.clean || analysis.raw || "";
                          const isFullyValid = analysis.isValidLength && analysis.isValidLuhn;
                          const isLuhnTypo = analysis.isValidLength && !analysis.isValidLuhn;

                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                isFullyValid 
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200' 
                                  : isLuhnTypo
                                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                                  : 'bg-canvas border-hairline text-ink-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-parchment font-bold text-[10px] text-ink-muted flex items-center justify-center shrink-0 border border-hairline">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-black text-ink truncate text-xs">
                                    {analysis.brand ? `${analysis.brand} ${analysis.model || ''}`.trim() : `Perangkat #${idx + 1}`}
                                  </p>
                                  <p className="text-[11px] opacity-80 font-mono font-bold tracking-wider truncate">
                                    {cleanStr}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isFullyValid ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300/40">
                                    <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                                    GSMA Valid
                                  </span>
                                ) : isLuhnTypo ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-300/40" title="Digit checksum luhn tidak cocok">
                                    Typo Checksum
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-ink-muted font-mono">
                                    {cleanStr.length}/15 digit
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const lines = imei.split(/[\n,]+/).map(i => i.trim()).filter(Boolean);
                                    setImei(lines.filter((_, i) => i !== idx).join("\n"));
                                  }}
                                  className="w-5 h-5 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-600 flex items-center justify-center text-[10px] transition-colors"
                                  title="Hapus IMEI ini"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5 p-3 rounded-2xl bg-canvas border border-hairline">
                    <label className="text-xs font-bold text-ink block">
                      Upload Screenshot *#06# <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={e => setFiles(Array.from(e.target.files || []))}
                      className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      required
                    />
                    <p className="text-[10px] text-ink-muted">Foto layar dial *#06# yang memuat IMEI asli.</p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-canvas border border-hairline">
                    <label className="text-xs font-bold text-ink block">
                      Upload Cek CEIR <span className="text-ink-muted text-[10px] font-normal">(Opsional)</span>
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={e => setCeirFiles(Array.from(e.target.files || []))}
                      className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                    <p className="text-[10px] text-ink-muted">Screenshot status CEIR Kemenperin jika ada.</p>
                  </div>
                </div>

                                {/* Step 2 Navigation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full h-12 rounded-2xl bg-canvas border border-hairline font-bold text-xs hover:bg-parchment transition-all btn-press"
                  >
                    &larr; Kembali ke Pilih Paket
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) {
                        setCurrentStep(3);
                      }
                    }}
                    className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/20 btn-press btn-glow flex items-center justify-center gap-2"
                  >
                    <span>Lanjut ke Pembayaran (Langkah 3)</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: RINGKASAN PEMESANAN & TOMBOL BAYAR               */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-hairline pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Langkah 3: Ringkasan Pemesanan &amp; Checkout</h2>
                    <p className="text-xs text-ink-muted">Periksa kembali data pesanan dan selesaikan pembayaran.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    Tahap 3 dari 3
                  </span>
                </div>

                {/* Order Review Cards */}
                <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-hairline">
                    <span className="font-extrabold text-xs text-ink uppercase tracking-wider">
                      Detail Perangkat Target
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Ubah Data
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-ink-muted block text-[11px]">Jumlah IMEI Target:</span>
                      <span className="font-bold text-ink font-mono">{imeiCount} Perangkat</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[11px]">WhatsApp Penerima Nota:</span>
                      <span className="font-bold text-ink font-mono">{targetPhone || "-"}</span>
                    </div>
                  </div>

                  {/* Device List preview */}
                  <div className="space-y-1 pt-1">
                    {parsedImeis.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-parchment/60 border border-hairline text-xs font-mono">
                        <span className="truncate text-ink font-semibold">
                          {item.brand ? `${item.brand} ${item.model || ''}` : `Perangkat #${idx + 1}`}
                        </span>
                        <span className="text-ink-muted">{item.clean}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-hairline text-xs">
                    <div>
                      <span className="text-ink-muted block text-[11px]">Paket Dipilih:</span>
                      <span className="font-bold text-ink">{selectedPkg?.name || selectedPkg?.duration}</span>
                      <span className="text-[10px] text-ink-muted ml-1">({selectedSpeed.toUpperCase()})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Ganti Paket
                    </button>
                  </div>
                </div>

                {/* Voucher Diskon Shopee-Style */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink flex items-center justify-between">
                    <span>Voucher Diskon &amp; Promo</span>
                    <span className="text-[10px] text-ink-muted">Bisa hemat biaya order</span>
                  </label>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-emerald-950 dark:text-emerald-100 text-xs">
                            Voucher <span className="font-mono">{appliedCoupon.code}</span> Terpasang
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
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
                          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-800/40 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowVoucherModal(true)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-canvas border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-xs font-bold shadow-2xs group btn-press cursor-pointer"
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

                {/* RyPoints Deduction Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-ink text-xs">
                        Tukarkan RyPoints ({userCoins.toLocaleString("id-ID")} Koin)
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {priceAfterCoupon < 50000
                          ? "Minimal transaksi Rp 50.000 untuk menggunakan koin"
                          : userCoins > 0
                          ? `Hemat -Rp ${Math.min(userCoins, maxCoinsAllowed).toLocaleString("id-ID")} (Maks. 2% / Rp 5.000 per order)`
                          : "Kumpulkan koin diskon dari game atau transaksi"}
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
                      <div className="w-10 h-5.5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  ) : null}
                </div>

                {/* Price Breakdown Summary */}
                <div className="p-4 rounded-2xl bg-parchment/70 border border-hairline space-y-2 text-xs">
                  {/* Wholesale Active Banner */}
                  {isWholesaleActive && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>Harga Grosir Multi-IMEI Diterapkan</span>
                      </div>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full text-[10px]">
                        Hemat Rp {wholesaleSavings.toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-ink-muted">
                    <span>Subtotal ({imeiCount} IMEI {isWholesaleActive ? `@ Rp ${pricePerImei.toLocaleString("id-ID")}` : ""})</span>
                    <div className="text-right">
                      {isWholesaleActive && (
                        <span className="line-through text-ink-muted/70 text-[11px] mr-1.5">
                          Rp {regularTotalPrice.toLocaleString("id-ID")}
                        </span>
                      )}
                      <span className="font-bold text-ink">Rp {rawTotalPrice.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Diskon Kupon ({appliedCoupon.code})</span>
                      <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {useCoins && coinsDiscount > 0 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                      <span>Potongan RyPoints ({coinsDiscount.toLocaleString("id-ID")} Koin)</span>
                      <span>- Rp {coinsDiscount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm sm:text-base font-black text-ink pt-2.5 border-t border-hairline items-baseline">
                    <span>Total Pembayaran</span>
                    <span className="text-primary text-base sm:text-lg font-mono">
                      Rp {totalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Metode Pembayaran Selection */}
                <div className="space-y-2 pt-1 border-t border-hairline">
                  <label className="text-xs font-bold text-ink block">Metode Pembayaran</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div
                      onClick={() => setPaymentMethod("qris")}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all card-hover btn-press select-none ${
                        paymentMethod === "qris"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-hairline bg-canvas hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs text-ink flex items-center gap-1">
                            <span>Direct QRIS Otomatis</span>
                          </h5>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Semua Bank &amp; E-Wallet Realtime 24 Jam</p>
                        </div>
                      </div>
                      <input type="radio" checked={paymentMethod === "qris"} onChange={() => {}} className="text-primary accent-primary" />
                    </div>

                    <div
                      onClick={() => setPaymentMethod("balance")}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all card-hover btn-press select-none ${
                        paymentMethod === "balance"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-hairline bg-canvas hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-primary flex items-center justify-center font-bold shrink-0">
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs text-ink">Saldo RyPay</h5>
                          <p className="text-[10px] text-ink-muted">Tersedia: Rp {userBalance.toLocaleString("id-ID")}</p>
                        </div>
                      </div>
                      <input type="radio" checked={paymentMethod === "balance"} onChange={() => {}} className="text-primary accent-primary" />
                    </div>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-2 border-t border-hairline">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-hairline text-primary accent-primary cursor-pointer shrink-0"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span className="text-xs text-ink-muted leading-relaxed">
                      Saya menyatakan bahwa nomor IMEI dan bukti foto yang saya unggah sudah benar, unit HP memenuhi seluruh ketentuan layanan, dan setuju untuk memproses transaksi ini.
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full h-12 rounded-2xl bg-canvas border border-hairline font-bold text-xs hover:bg-parchment transition-all btn-press sm:col-span-1"
                  >
                    &larr; Ubah Data HP
                  </Button>

                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={submitting}
                    className="w-full h-12 rounded-2xl bg-canvas border border-primary/40 text-primary font-bold text-xs hover:bg-primary/5 transition-all shadow-xs btn-press sm:col-span-1"
                  >
                    + Masukkan Keranjang
                  </Button>

                  <Button
                    type="submit"
                    isLoading={submitting}
                    disabled={submitting}
                    className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/25 transition-all btn-press btn-glow sm:col-span-1"
                  >
                    {paymentMethod === "qris" ? "Bayar via QRIS Langsung" : "Bayar dengan Saldo"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="p-8 text-center space-y-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="font-black text-rose-700 dark:text-rose-300 text-lg">Server IMEI Sedang Tutup</h3>
            <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold max-w-md mx-auto leading-relaxed">
              {serviceStatus.note || "Layanan Add Roamer sedang tidak menerima pesanan baru. Silakan pantau terus notifikasi dari kami ya!"}
            </p>
          </div>
        )}
      </Card>

      <IGTestiPreview />

      {/* Shopee-Style Customer Reviews Section (Ulasan Real Pelanggan) */}
      <ProductReviewsSection productId="add-roamer" title="Ulasan Pelanggan Add Roamer" />

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
        orderTitle="Pembayaran Instant Add Roamer"
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
        statusText="Pesanan Add Roamer berhasil dibuat!"
        recipientLabel="IMEI Target"
        recipientValue={imei}
      />

      <WAGroupPopup />
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
            <p className="text-sm font-bold text-ink">Memuat Layanan Add Roamer...</p>
          </div>
        </div>
      }
    >
      <UnblockImeiContent />
    </Suspense>
  );
}
