"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import TelegramPopup from "@/components/ui/TelegramPopup";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { analyzeImei, parseMultipleImeis } from "@/lib/imeiHelper";

export default function UnblockImeiPage() {
  const { user } = useApp();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState("");
  
  const [files, setFiles] = useState<File[]>([]);
  const [ceirFiles, setCeirFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ isOpen: true, note: "" });
  const [announcement, setAnnouncement] = useState<any>(null);

  // Coupon Promo State
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [publicCoupons, setPublicCoupons] = useState<any[]>([]);
  const [showManualCouponInput, setShowManualCouponInput] = useState(false);

  // WhatsApp Recipient Phone State
  const [targetPhone, setTargetPhone] = useState("");

  useEffect(() => {
    if (user?.phone && !targetPhone) {
      setTargetPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetch('/api/imei-packages').then(res => res.json()),
      fetch('/api/manual-services-pricing').then(res => res.json()),
      fetch('/api/imei-service-status', { cache: 'no-store' }).then(res => res.json()).catch(() => ({ status: true, isOpen: true, note: "" })),
      fetch('/api/user/announcement', { credentials: 'include' }).then(res => res.json()).catch(() => null),
      fetch('/api/coupons/public', { credentials: 'include' }).then(res => res.json()).catch(() => null)
    ]).then(([pkgData, prcData, statusData, annData, couponData]) => {
      if (statusData && statusData.status) {
        setServiceStatus({ isOpen: statusData.isOpen, note: statusData.note || "" });
      }
      if (annData?.status && annData?.data?.message) setAnnouncement(annData.data);
      if (couponData?.status && couponData?.data) setPublicCoupons(couponData.data);
      if (pkgData.status && pkgData.data.length > 0) {
        setPackages(pkgData.data);
        setSelectedPkgId(pkgData.data[0].id);
      }
      if (prcData.status) {
        setSpeedPricing(prcData.data);
        const speedDefs = [
          { id: 'fast', key: 'imei_speed_fast', label: '⚡ Fast' },
          { id: 'semi', key: 'imei_speed_semi', label: '🚀 Semi Fast' },
          { id: 'slow', key: 'imei_speed_slow', label: '🐌 Slow' }
        ];
        const activeSpeed = speedDefs.find(({ key }) => prcData.data?.[`${key}_status`] !== 'hidden' && Number(prcData.data?.[key]) >= 0)?.id || '';
        setSelectedSpeed(activeSpeed);
      }
    }).finally(() => setLoading(false));
  }, []);

  const imeiList = imei.split(/[\n,]+/).map(i => i.replace(/\s+/g, '').trim()).filter(i => i.length >= 15);
  const imeiCount = imeiList.length > 0 ? imeiList.length : 1;

  const selectedPkg = packages.find(p => p.id === selectedPkgId);
  const basePrice = selectedPkg ? selectedPkg.price : 0;
  const speedPrice = speedPricing[`imei_speed_${selectedSpeed}`] 
    ? parseInt(speedPricing[`imei_speed_${selectedSpeed}`]) || 0 
    : 0;
  const rawTotalPrice = (basePrice + speedPrice) * imeiCount;
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discount_amount, rawTotalPrice) : 0;
  const totalPrice = Math.max(0, rawTotalPrice - discountAmount);

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
      const d = await res.json();
      if (res.ok && d.status) {
        setAppliedCoupon(d.data);
        setCouponCode(d.data.code);
        Swal.fire({
          icon: "success",
          title: "Kupon Berhasil Dipasang! 🎉",
          text: `Hemat Rp ${d.data.discount_amount.toLocaleString('id-ID')} dengan kupon ${d.data.code}`,
          toast: true,
          position: "top-end",
          timer: 3500,
          showConfirmButton: false
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(d.message || "Gagal menerapkan kupon promo.");
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
    if (!agreed) return setError("Anda harus menyetujui Syarat & Ketentuan.");
    if (files.length === 0) return setError("Screenshot *#06# wajib diupload.");
    if (imeiList.length === 0) return setError("Tidak ada IMEI yang valid (harus 15 digit angka).");
    if (!selectedPkg) return setError("Silakan pilih paket durasi.");
    if (user && user.balance < totalPrice) {
      Swal.fire({
      title: 'Saldo Tidak Mencukupi',
      text: 'Saldo Anda tidak mencukupi. Silakan Top Up terlebih dahulu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Top Up Sekarang',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/topup');
      }
    });
    return setError('Saldo tidak mencukupi.');
    }

    const confirm = await Swal.fire({
      title: 'Ready buat checkout? 💸',
      text: `Yakin mau lanjut bayar untuk ${imeiList.length} IMEI? ${appliedCoupon ? `(Diskon Kupon: -Rp ${discountAmount.toLocaleString('id-ID')}) ` : ''}Saldo kepotong Rp ${totalPrice.toLocaleString('id-ID')} ya.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Gass!',
      cancelButtonText: 'Ntar Dulu'
    });

    if (!confirm.isConfirmed) {
      return;
    }

    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("service_type", "imei");
    formData.append("imei", imei);
    formData.append("duration", selectedPkg.duration);
    formData.append("price_key", selectedPkg.id);
    formData.append("speed_option", selectedSpeed);
    formData.append("target_phone", targetPhone);
    if (appliedCoupon) {
      formData.append("coupon_code", appliedCoupon.code);
    }
    
    files.forEach(f => formData.append("image", f));
    ceirFiles.forEach(f => formData.append("ceir_image", f));

    try {
      const res = await fetch("/api/order/manual", {
        method: "POST",
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setShowSuccessPop(true);
      } else {
        setError(data.message || "Gagal membuat pesanan.");
      }
    } catch (err) {
      setError("Kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const speedOptions = [
    { id: 'fast', key: 'imei_speed_fast', label: '⚡ Fast' },
    { id: 'semi', key: 'imei_speed_semi', label: '🚀 Semi Fast' },
    { id: 'slow', key: 'imei_speed_slow', label: '🐌 Slow' }
  ]
    .filter(opt => speedPricing[`${opt.key}_status`] !== 'hidden')
    .map(opt => ({
      id: opt.id,
      label: opt.label,
      price: parseInt(speedPricing[opt.key]) || 0
    }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <TelegramPopup />
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Buka Gembok IMEI 🔓</h1>
          <p className="text-sm text-ink-muted">Bikin sinyal HP Inter lo auto on terus.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {announcement && (
          <div
            className="rounded-2xl p-4 text-white text-sm font-medium"
            style={{ backgroundColor: announcement.bgColor || '#0066cc' }}
          >
            📢 {announcement.message}
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm space-y-3 shadow-inner">
          <h3 className="font-bold flex items-center gap-1.5 text-base">⚠️ Rules (Wajib Baca Dulu Ngab!)</h3>
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
                  <span className="text-emerald-600">📲</span> Nomor WhatsApp Penerima Nota
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink/80">Upload Screenshot *#06# <span className="text-rose-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink/80">Upload Hasil Cek CEIR <span className="text-ink-muted text-xs">(Opsional)</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setCeirFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink/80">Pilih Masa Aktif</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {loading ? <p className="text-sm text-ink-muted col-span-3">Memuat paket...</p> : packages.length === 0 ? <p className="text-sm text-ink-muted col-span-3">Belum ada pilihan paket.</p> : packages.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedPkgId(opt.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${selectedPkgId === opt.id ? 'border-primary bg-primary/5 shadow-sm text-primary ring-1 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                  >
                    <div className="font-bold text-sm">{opt.duration}</div>
                    <div className="text-xs mt-1">Rp {opt.price.toLocaleString('id-ID')}</div>
                  </button>
                ))}
              </div>
            </div>

            {speedOptions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-ink/80">Pilih Kecepatan Proses</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {speedOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSpeed(opt.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${selectedSpeed === opt.id ? 'border-primary bg-primary/5 shadow-sm text-primary ring-1 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                    >
                      <div className="font-bold text-sm capitalize">{opt.label}</div>
                      <div className="text-xs mt-1">{opt.price === 0 ? 'Gratis' : `+ Rp ${opt.price.toLocaleString('id-ID')}`}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kupon Diskon Promo (Voucher Publik & Rahasia) */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                  Voucher Promo & Kupon Diskon
                </label>
                {!appliedCoupon && (
                  <button
                    type="button"
                    onClick={() => setShowManualCouponInput(!showManualCouponInput)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {showManualCouponInput ? "Tutup Ketik Manual" : "Punya Kode Rahasia?"}
                  </button>
                )}
              </div>

              {/* Status Kupon yang Sedang Terpasang */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                      🎟️
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950 text-sm">
                        Kupon <span className="font-mono">{appliedCoupon.code}</span> Terpasang!
                      </p>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                        Potongan Diskon: -Rp {discountAmount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200/60 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Daftar Voucher Publik (Bisa Langsung Diklaim) */}
                  {publicCoupons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-ink-muted font-medium">Voucher Publik Tersedia (Pilih Langsung):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {publicCoupons.map((c) => {
                          const isUsedUp = (c.user_used_count || 0) >= (c.max_per_user || 1);
                          const isMinReached = rawTotalPrice >= (c.min_order_amount || 0);
                          const remainingQuota = Math.max(0, c.max_usage_limit - c.used_count);

                          return (
                            <div
                              key={c.id}
                              className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-2.5 transition-all ${
                                isUsedUp
                                  ? 'bg-slate-100/70 border-slate-200 opacity-60'
                                  : 'bg-canvas border-primary/20 hover:border-primary/50 shadow-sm'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                                    {c.code}
                                  </span>
                                  <p className="font-bold text-ink mt-1.5 text-xs">
                                    Diskon {c.discount_type === 'percent' ? `${c.discount_value}%` : `Rp ${Number(c.discount_value).toLocaleString('id-ID')}`}
                                  </p>
                                  <p className="text-[10px] text-ink-muted mt-0.5">
                                    Min. Order: Rp {Number(c.min_order_amount || 0).toLocaleString('id-ID')} • Sisa Kuota: {remainingQuota}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={isUsedUp || couponLoading}
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                    isUsedUp
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : !isMinReached
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                                  }`}
                                >
                                  {isUsedUp ? "Sudah Dipakai" : !isMinReached ? "Klaim (Cek Min)" : "Klaim & Pakai ➔"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input Kode Kupon Rahasia / Ketik Manual */}
                  {(showManualCouponInput || publicCoupons.length === 0) && (
                    <div className="p-3.5 rounded-2xl bg-parchment/60 border border-hairline space-y-2">
                      <p className="text-xs font-bold text-ink">Ketik Kode Kupon Khusus / Rahasia:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Masukkan kode kupon rahasia..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 rounded-xl border border-hairline bg-canvas px-4 py-2.5 text-xs font-mono font-bold uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={couponLoading || !couponCode.trim()}
                          className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                        >
                          {couponLoading ? "Cek..." : "Terapkan"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {couponError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {couponError}
                </p>
              )}
            </div>

            {/* Price Breakdown Summary */}
            <div className="p-4 rounded-2xl bg-parchment/60 border border-hairline space-y-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal ({imeiCount} IMEI)</span>
                <span className="font-bold text-ink">Rp {rawTotalPrice.toLocaleString('id-ID')}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Diskon Kupon ({appliedCoupon.code})</span>
                  <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-ink pt-2 border-t border-hairline">
                <span>Total Bayar</span>
                <span className="text-primary">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-hairline">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-hairline text-primary" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span className="text-sm text-ink-muted">Saya menyatakan bahwa HP saya memenuhi seluruh persyaratan di atas dan setuju memproses pesanan ini.</span>
              </label>
            </div>
            
            <Button className="w-full h-12 text-sm font-bold shadow-lg" type="submit" isLoading={submitting}>
              Bayar Rp {totalPrice.toLocaleString('id-ID')}
            </Button>
          </form>
        ) : (
          <div className="bg-rose-500/10 border border-rose-200/50 p-6 rounded-2xl text-center space-y-3">
            <span className="text-4xl block">🔒</span>
            <h3 className="font-black text-rose-700 text-lg">Server IMEI Sedang Tutup</h3>
            <p className="text-sm text-rose-600 font-semibold max-w-md mx-auto leading-relaxed">
              {serviceStatus.note || "Layanan unblock IMEI sedang tidak menerima pesanan baru. Silakan pantau terus notifikasi dari kami ya!"}
            </p>
          </div>
        )}


    </Card>

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
