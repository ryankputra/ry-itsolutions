"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AnnouncementItem {
  id: string;
  message: string;
  bgColor?: string;
  createdAt?: string;
  imageUrl?: string;
}

export function PromoPopupModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch("/api/user/announcement", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        let list: AnnouncementItem[] = [];
        if (Array.isArray(data.announcements) && data.announcements.length > 0) {
          list = data.announcements;
        } else if (data.data && data.data.message) {
          list = [{
            id: data.data.id || "ann_1",
            message: data.data.message,
            bgColor: data.data.bgColor,
            createdAt: data.data.createdAt
          }];
        }

        if (list.length > 0) {
          setAnnouncements(list);
          // Selalu muncul ketika masuk ke dashboard
          setIsOpen(true);
        }
      } catch (err) {
        // silent error
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex] || announcements[0];
  const total = announcements.length;
  const msgLower = (current.message || "").toLowerCase();

  // Banner image selection
  let bannerImg = "/banners/banner_voucher.jpg";
  let defaultAction = { label: "Klaim Voucher Sekarang", href: "/vouchers" };

  if (msgLower.includes("imei") || msgLower.includes("unblock")) {
    bannerImg = "/banners/banner_imei.jpg";
    defaultAction = { label: "Order Unblock IMEI", href: "/unblock-imei" };
  } else if (msgLower.includes("koin") || msgLower.includes("game") || msgLower.includes("reward")) {
    bannerImg = "/banners/banner_rewards.jpg";
    defaultAction = { label: "Main Game & RyPoints", href: "/games" };
  } else if (msgLower.includes("gopay") || msgLower.includes("topup") || msgLower.includes("saldo") || msgLower.includes("rypay")) {
    bannerImg = "/banners/banner_gopay.jpg";
    defaultAction = { label: "Top Up RyPay Sekarang", href: "/topup" };
  }

  // Extract promo voucher code if present
  const voucherMatch = current.message.match(/"([A-Z0-9_-]{4,20})"/i) || current.message.match(/KODE VOUCHER:\s*([A-Z0-9_-]+)/i);
  const detectedCode = voucherMatch ? voucherMatch[1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog (Mobile & Desktop optimized) */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-parchment rounded-3xl overflow-hidden shadow-2xl border border-hairline z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Image Banner with Floating Close (X) Button */}
        <div className="relative w-full h-44 sm:h-52 bg-slate-900 shrink-0 overflow-hidden">
          <img
            src={current.imageUrl || bannerImg}
            alt="Promo Announcement Banner"
            className="w-full h-full object-cover select-none"
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 pointer-events-none" />

          {/* Floating Close Button (Silang) */}
          <button
            onClick={handleClose}
            aria-label="Tutup pengumuman"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-lg transition-all z-20 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Top Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold select-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Info &amp; Promo Spesial</span>
          </div>

          {/* Slide Navigation controls (if multiple announcements) */}
          {total > 1 && (
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
                }}
                className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center text-xs border border-white/20 transition-all"
                title="Sebelumnya"
              >
                &#8249;
              </button>
              <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15">
                {currentIndex + 1} / {total}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
                }}
                className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center text-xs border border-white/20 transition-all"
                title="Selanjutnya"
              >
                &#8250;
              </button>
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
          {/* Highlight Promo Tag / Voucher Code if found */}
          {detectedCode && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">🎟️</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-amber-950/70 dark:text-amber-300/80 uppercase tracking-wider">Kupon Promo Tersedia</div>
                  <div className="text-xs font-black font-mono tracking-wider truncate">{detectedCode}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(detectedCode);
                  alert(`Kode kupon "${detectedCode}" berhasil disalin!`);
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
              >
                Salin
              </button>
            </div>
          )}

          {/* Announcement Message Text */}
          <div className="text-xs sm:text-sm text-ink leading-relaxed font-medium whitespace-pre-line">
            {current.message}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 pt-2 sm:p-5 sm:pt-2 border-t border-hairline/60 bg-muted/20 space-y-2 shrink-0">
          <button
            onClick={() => {
              handleClose();
              router.push(defaultAction.href);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{defaultAction.label}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          <button
            onClick={handleClose}
            className="w-full py-1.5 text-center text-xs text-ink-muted hover:text-ink font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
