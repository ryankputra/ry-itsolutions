"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { API_URL, safeJson } from "@/lib/api";
import Swal from "@/lib/sweetalert";
import { playPopSound } from "@/lib/soundFx";

export default function RequiredPhoneModal() {
  const { user, setUser, loading } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Only check once loading has finished and user is authenticated
    if (!loading && user) {
      const existingPhone = (user.verifiedPhone || user.phone || "").trim();
      // Check if phone number is empty or contains non-phone dummy placeholder
      const hasValidPhone = existingPhone.length >= 9 && !existingPhone.includes("@");
      if (!hasValidPhone) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    let cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    } else if (!cleaned.startsWith("62")) {
      cleaned = "62" + cleaned;
    }

    if (!/^628\d{7,12}$/.test(cleaned)) {
      setErrorMsg("Format nomor WhatsApp tidak valid. Masukkan nomor HP aktif (contoh: 081234567890).");
      return;
    }

    setIsSubmitting(true);
    try {
      playPopSound();
      const res = await fetch(`${API_URL}/user/bind-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await safeJson(res);

      if (data && data.status) {
        if (data.user) {
          setUser(data.user);
        } else if (user) {
          setUser({ ...user, verifiedPhone: cleaned, phone: cleaned });
        }
        setIsOpen(false);

        await Swal.fire({
          icon: "success",
          title: "Nomor WhatsApp Terhubung!",
          text: "Nomor Anda berhasil disimpan. Nota pembelian digital & notifikasi pengerjaan akan dikirimkan otomatis ke WhatsApp Anda.",
          confirmButtonColor: "#10b981",
          confirmButtonText: "Selesai"
        });
      } else {
        setErrorMsg(data?.message || "Gagal menyimpan nomor WhatsApp.");
      }
    } catch (err: any) {
      console.error("[RequiredPhoneModal] Error:", err);
      setErrorMsg(err.message || "Terjadi kendala saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-emerald-950/50 text-white relative overflow-hidden"
        style={{ animation: "scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* WhatsApp / Document Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/25 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-emerald-400" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M9 10h.01" />
                <path d="M15 10h.01" />
                <path d="M12 10h.01" />
              </svg>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            Wajib Dilengkapi
          </span>

          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
            Tautkan Nomor WhatsApp
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Halo Kak <span className="text-emerald-400 font-semibold">{user?.name || "Pelanggan"}</span>! 
            Agar Anda dapat <span className="text-white font-medium">menerima nota pembelian resmi</span> dan notifikasi status pengerjaan secara otomatis, mohon masukkan nomor WhatsApp aktif Anda.
          </p>

          <form onSubmit={handleSubmit} className="w-full text-left space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nomor WhatsApp Aktif
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-semibold text-emerald-400 select-none">
                  +62
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber.startsWith("62") ? phoneNumber.slice(2) : (phoneNumber.startsWith("0") ? phoneNumber.slice(1) : phoneNumber)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPhoneNumber(val);
                    setErrorMsg("");
                  }}
                  placeholder="81234567890"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white placeholder-slate-500 text-base font-medium outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Nota transaksi PDF & update IMEI otomatis dikirim ke nomor ini.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !phoneNumber}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>Simpan & Lanjutkan</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
