"use client";
import React, { useEffect, useState } from "react";
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
}

export function InstantQrisPaymentModal({
  isOpen,
  onClose,
  amount,
  orderTitle = "Pembayaran Pesanan Direct QRIS",
  onSuccess,
}: InstantQrisPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [qrisData, setQrisData] = useState<{
    qris_image: string;
    qris_code: string;
    unique_amount: number;
    topup_id: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 menit
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Direct QRIS saat modal dibuka
  useEffect(() => {
    if (!isOpen || amount <= 0) {
      setQrisData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setTimeLeft(900);

    fetch("/api/topup/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount }),
    })
      .then((res) => safeJson(res))
      .then((data) => {
        if (!isMounted) return;
        if (data?.status && data?.data) {
          setQrisData({
            qris_image: data.data.qris_image,
            qris_code: data.data.qris_code,
            unique_amount: data.data.unique_amount || amount,
            topup_id: data.data.topup_id || `TU-${Date.now()}`,
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
  }, [isOpen, amount]);

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
                <p className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                  Bebas Biaya Admin • QRIS 24 Jam
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-800 bg-amber-100/80 border border-amber-200 py-1.5 px-3 rounded-xl font-bold">
                <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Batas Waktu Pembayaran: {formattedTime}</span>
              </div>

              {/* QRIS Code Image Display */}
              <div className="relative p-3 rounded-2xl bg-white border border-slate-200 shadow-md inline-block mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisData.qris_image}
                  alt="QRIS Pembayaran Direct"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                />
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => copyString(qrisData.qris_code)}
                    className="text-[10px] font-bold text-slate-700 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                    <span>{copied ? "Kode QRIS Terpatri!" : "Salin String QRIS"}</span>
                  </button>
                </div>
              </div>

              {/* Supported Banks & E-Wallet Icons */}
              <div className="space-y-1.5">
                <PaymentLogosGrid />
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-left text-[11px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900">Cara Bayar Instant:</p>
                <ol class="list-decimal pl-4 space-y-0.5 font-medium">
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
