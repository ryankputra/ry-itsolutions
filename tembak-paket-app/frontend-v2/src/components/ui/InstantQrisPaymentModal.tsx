"use client";
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { PaymentLogosGrid } from "./PaymentLogos";
import { playTopupSuccessSound, playPopSound } from "@/lib/soundFx";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";

interface InstantQrisPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderTitle?: string;
  onSuccess: () => void;
  preferredGateway?: 'nobu' | 'gopay' | 'auto';
  existingQrisData?: {
    qris_image: string;
    qris_code: string;
    unique_amount: number;
    topup_id: string;
    merchant?: string;
  } | null;
}

export function InstantQrisPaymentModal({
  isOpen,
  onClose,
  amount,
  orderTitle = "Pembayaran Pesanan Direct QRIS",
  onSuccess,
  preferredGateway = 'auto',
  existingQrisData,
}: InstantQrisPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [renderedQrImage, setRenderedQrImage] = useState<string>("");
  const [qrisData, setQrisData] = useState<{
    qris_image: string;
    qris_code: string;
    unique_amount: number;
    topup_id: string;
    merchant?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 menit
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Automatically render QR code if payload string is given
  useEffect(() => {
    if (!qrisData) {
      setRenderedQrImage("");
      return;
    }

    const raw = qrisData.qris_image || qrisData.qris_code || "";
    if (raw.startsWith("data:image/") || raw.startsWith("http://") || raw.startsWith("https://")) {
      setRenderedQrImage(raw);
    } else if (raw) {
      QRCode.toDataURL(raw, {
        margin: 2,
        scale: 8,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((url) => setRenderedQrImage(url))
        .catch((err) => {
          console.error("QR Code conversion error:", err);
          setRenderedQrImage(raw);
        });
    }
  }, [qrisData]);

  // Generate atau tampilkan Direct QRIS eksisting saat modal dibuka
  useEffect(() => {
    if (!isOpen) {
      setQrisData(null);
      setRenderedQrImage("");
      return;
    }

    if (existingQrisData) {
      setQrisData(existingQrisData);
      setTimeLeft(900);
      setLoading(false);
      return;
    }

    if (amount <= 0) return;

    let isMounted = true;
    setLoading(true);
    setTimeLeft(900);

    fetch("/api/topup/request-qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount, gateway: 'auto', provider: 'auto' }),
    })
      .then((res) => safeJson(res))
      .then(async (data) => {
        if (!isMounted) return;
        if (data?.status && (data?.data || data?.qrisData)) {
          const qData = data.data || {};
          const qInfo = data.qrisData || {};
          const rawImg = qData.qris_image || qInfo.base64Image || "";
          const rawCode = qData.qris_code || qData.qris_image || qInfo.base64Image || "";

          let resolvedImage = rawImg;
          if (rawCode && (!rawImg || (!rawImg.startsWith("data:image/") && !rawImg.startsWith("http")))) {
            try {
              resolvedImage = await QRCode.toDataURL(rawCode, { margin: 2, scale: 8 });
            } catch (e) {}
          }

          setQrisData({
            qris_image: resolvedImage,
            qris_code: rawCode,
            unique_amount: qData.unique_amount || qInfo.uniqueAmount || amount,
            topup_id: qData.topup_id || data.topUpId || `TU-${Date.now()}`,
            merchant: qData.merchant || qInfo.merchant || 'Direct QRIS Otomatis'
          });
        } else {
          Swal.fire({
            title: "Gagal Membuat QRIS",
            text: data?.message || "Layanan pembayaran QRIS sedang sibuk. Silakan coba lagi.",
            icon: "error",
          });
          onClose();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        Swal.fire({
          title: "Error Jaringan",
          text: "Gagal terhubung ke server pembayaran QRIS.",
          icon: "error",
        });
        onClose();
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, amount, existingQrisData]);

  // Realtime Polling & Listener Pemasukan Pembayaran SSE
  useEffect(() => {
    if (!isOpen || !qrisData) return;

    // Timer Hitung Mundur 15 Menit
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listener Event SSE
    const handlePaymentSuccess = () => {
      try { playTopupSuccessSound(); } catch {}
      onSuccess();
    };

    window.addEventListener("topup_success", handlePaymentSuccess);

    // Polling Backend Setiap 3 Detik
    const pollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/topup/status/${qrisData.topup_id}`, { credentials: "include" });
        const data = await safeJson(res);
        if (data?.status && (data.transactionStatus === "completed" || data.transactionStatus === "success")) {
          clearInterval(pollingInterval);
          clearInterval(timerInterval);
          window.removeEventListener("topup_success", handlePaymentSuccess);
          handlePaymentSuccess();
        }
      } catch (err) {}
    }, 3000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollingInterval);
      window.removeEventListener("topup_success", handlePaymentSuccess);
    };
  }, [isOpen, qrisData, onClose, onSuccess]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const copyString = (str: string) => {
    if (!str) return;
    navigator.clipboard.writeText(str);
    setCopied(true);
    try { playPopSound(); } catch {}
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-canvas rounded-3xl border border-hairline shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">QRIS Pembayaran Instant</h3>
              <p className="text-[10px] text-blue-100 font-medium">Tanpa perlu top up saldo terlebih dahulu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-center">
          {loading || !qrisData ? (
            <div className="py-12 space-y-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-ink">Menyiapkan QRIS Pembayaran...</p>
            </div>
          ) : (
            <>
              {/* Order Title & Amount */}
              <div className="p-3.5 rounded-2xl bg-parchment/60 border border-hairline space-y-1">
                <p className="text-[11px] text-ink-muted font-medium">{orderTitle}</p>
                <p className="text-xl sm:text-2xl font-black text-primary">
                  Rp {qrisData.unique_amount.toLocaleString("id-ID")}
                </p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    Bebas Biaya Admin • QRIS 24 Jam
                  </span>
                  <span className="text-[10px] text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full inline-block">
                    Merchant: {qrisData.merchant || 'Direct QRIS Otomatis'}
                  </span>
                </div>
              </div>

              {/* Single Unified Gateway Card: ⚡ Direct QRIS Otomatis (Semua Bank & E-Wallet) */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-left flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                      <span>⚡</span> Direct QRIS Otomatis
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold tracking-wider">
                      SEMUA BANK &amp; E-WALLET
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    Realtime 24 Jam • Bebas Biaya Admin • Instan
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  ✓
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-800 bg-amber-100/80 border border-amber-200 py-1.5 px-3 rounded-xl font-bold">
                <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Batas Waktu Pembayaran: {formattedTime}</span>
              </div>

              {/* QRIS Code Image Display with Robust Conversion */}
              <div className="relative p-3 rounded-2xl bg-white border border-slate-200 shadow-md inline-block mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={renderedQrImage || qrisData.qris_image}
                  alt="QRIS Pembayaran Direct"
                  onError={async () => {
                    const raw = qrisData.qris_code || qrisData.qris_image;
                    if (raw) {
                      try {
                        const fallbackUrl = await QRCode.toDataURL(raw, { margin: 2, scale: 8 });
                        setRenderedQrImage(fallbackUrl);
                      } catch (err) {}
                    }
                  }}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                />
                <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const imgToDownload = renderedQrImage || qrisData.qris_image;
                      if (!imgToDownload) return;
                      const a = document.createElement("a");
                      a.href = imgToDownload;
                      a.download = `QRIS-${qrisData.unique_amount}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      try { playPopSound(); } catch {}
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Unduh Gambar QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyString(qrisData.qris_code || qrisData.qris_image)}
                    className="text-[10px] font-bold text-slate-700 hover:text-primary transition-colors flex items-center gap-1 px-2 py-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                    <span>{copied ? "Kode Terpatri!" : "Salin String"}</span>
                  </button>
                </div>
              </div>

              {/* Informative Labeling as Requested */}
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Dapat di-scan menggunakan seluruh aplikasi Bank (BCA, Mandiri, BRI, BNI) dan E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).
              </p>

              {/* Supported Banks & E-Wallet Icons */}
              <div className="space-y-1.5">
                <PaymentLogosGrid />
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-left text-[11px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900">Cara Bayar Instant:</p>
                <ol className="list-decimal pl-4 space-y-0.5 font-medium">
                  <li>Buka aplikasi m-Banking (BCA, BNI, BRI, Mandiri) atau E-Wallet (GoPay, DANA, OVO, ShopeePay).</li>
                  <li>Pilih menu <b>Scan QRIS</b> dan arahkan kamera ke kode QR di atas.</li>
                  <li>Konfirmasi nominal <b>Rp {qrisData.unique_amount.toLocaleString("id-ID")}</b> lalu bayar.</li>
                  <li>Begitu sukses, pesanan Anda <b>langsung diproses otomatis</b>!</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstantQrisPaymentModal;
