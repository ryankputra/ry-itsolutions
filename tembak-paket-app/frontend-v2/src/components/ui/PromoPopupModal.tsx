"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Ticket, Megaphone, Check } from "lucide-react";

interface AnnouncementItem {
  id: string;
  message: string;
  bgColor?: string;
  createdAt?: string;
}

// Module-level guard: ensures popup only opens on full page load/refresh, NOT on internal SPA route changes
let hasTriggeredOnPageLoad = false;

function parseAnnouncement(rawMessage: string) {
  let title = "Pengumuman Resmi";
  let body = rawMessage.trim();
  let coupon: string | null = null;

  // Extract [TAG] if present
  const tagMatch = body.match(/^\[(.*?)\]\s*([\s\S]*)/);
  if (tagMatch) {
    title = tagMatch[1];
    body = tagMatch[2];
  } else if (body.toLowerCase().includes("unblock imei") || body.toLowerCase().includes("jam 2")) {
    title = "Jadwal Operasional IMEI";
  } else if (body.toLowerCase().includes("voucher") || body.toLowerCase().includes("promo")) {
    title = "Promo Spesial";
  }

  // Extract coupon code if present
  const cMatch = body.match(/"([A-Z0-9_-]{4,20})"/i) || body.match(/KODE VOUCHER:\s*([A-Z0-9_-]+)/i);
  if (cMatch) {
    coupon = cMatch[1];
  }

  return { title, body, coupon };
}

export function PromoPopupModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only trigger on full page refresh / first window load
    if (hasTriggeredOnPageLoad) {
      return;
    }
    hasTriggeredOnPageLoad = true;

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

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex] || announcements[0];
  const total = announcements.length;
  const parsed = parseAnnouncement(current.message);
  const isVoucherPromo = Boolean(parsed.coupon) || current.message.toLowerCase().includes("voucher");

  // Determine button target
  let actionText = "Lihat Promo";
  let actionHref = "/vouchers";
  if (current.message.toLowerCase().includes("imei") || current.message.toLowerCase().includes("unblock")) {
    actionText = "Buka Unblock IMEI";
    actionHref = "/unblock-imei";
  } else if (current.message.toLowerCase().includes("koin") || current.message.toLowerCase().includes("game")) {
    actionText = "Klaim RyPoints";
    actionHref = "/games";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop blur */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card: Minimalist, Apple Obsidian Design */}
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] bg-parchment rounded-3xl overflow-hidden shadow-2xl border border-hairline z-10 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Minimalist Visual Header (No AI Stock Images) */}
        <div className="relative px-5 pt-6 pb-4 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border-b border-hairline/50 flex flex-col items-center text-center select-none">
          
          {/* Close button (X) */}
          <button
            onClick={handleClose}
            aria-label="Tutup pengumuman"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-canvas/80 hover:bg-canvas text-ink-muted hover:text-ink border border-hairline/80 flex items-center justify-center active:scale-90 transition-all shadow-xs cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Elegant Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center shadow-lg shadow-primary/20 mb-3 border border-white/20">
            {isVoucherPromo ? (
              <Ticket className="w-6 h-6" />
            ) : (
              <Megaphone className="w-6 h-6" />
            )}
          </div>

          {/* Category Tag */}
          <span className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1 font-mono">
            {isVoucherPromo ? "PROMO & VOUCHER" : "INFO RESMI"}
          </span>

          {/* Title */}
          <h3 className="text-base font-bold text-ink tracking-tight px-4 leading-snug">
            {parsed.title}
          </h3>

          {/* Slide dots if multiple */}
          {total > 1 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {announcements.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => setCurrentIndex(dotIdx)}
                  aria-label={`Slide ${dotIdx + 1}`}
                  className={`h-1 rounded-full transition-all cursor-pointer ${
                    dotIdx === currentIndex
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-ink-muted/30 hover:bg-ink-muted/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Minimalist Coupon Pill (if coupon code present) */}
          {parsed.coupon && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🎟️</span>
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold text-amber-900/70 dark:text-amber-300/80 uppercase tracking-wider font-mono">KODE KUPON</div>
                  <div className="text-xs font-black font-mono tracking-wider truncate">{parsed.coupon}</div>
                </div>
              </div>
              <button
                onClick={() => handleCopyCoupon(parsed.coupon!)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <span>Salin</span>
                )}
              </button>
            </div>
          )}

          {/* Announcement Message */}
          <div className="p-3.5 rounded-2xl bg-canvas/60 border border-hairline/60 text-xs sm:text-sm text-ink leading-relaxed font-medium whitespace-pre-line">
            {parsed.body}
          </div>

          {/* Multiple items arrows if total > 1 */}
          {total > 1 && (
            <div className="flex items-center justify-between pt-0.5 text-xs text-ink-muted select-none">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1))}
                className="flex items-center gap-1 font-semibold hover:text-ink active:scale-95 transition-all cursor-pointer py-1 px-2 rounded-lg hover:bg-muted/50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <span className="font-mono text-[11px] font-bold text-ink-muted">
                {currentIndex + 1} / {total}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0))}
                className="flex items-center gap-1 font-semibold hover:text-ink active:scale-95 transition-all cursor-pointer py-1 px-2 rounded-lg hover:bg-muted/50"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-1 sm:p-5 sm:pt-1 space-y-2 shrink-0">
          <button
            onClick={() => {
              handleClose();
              router.push(actionHref);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{actionText}</span>
            <ChevronRight className="w-4 h-4" />
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
