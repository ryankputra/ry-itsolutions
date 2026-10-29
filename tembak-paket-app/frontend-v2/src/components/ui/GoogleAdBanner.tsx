"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Megaphone, ExternalLink, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";

interface GoogleAdBannerProps {
  slot?: string;
  format?: string;
  className?: string;
}

const DUMMY_SPONSORS = [
  {
    id: "sponsor-1",
    tag: "SPONSOR EKSKLUSIF",
    title: "Ingin Pasang Banner Iklan Bisnis Anda di Sini?",
    subtitle: "Jangkau puluhan ribu pengguna aktif transaksi harian di Ry-ITSolutions. Slot sponsor premium tersedia sekarang!",
    benefits: ["100K+ Pengguna Aktif", "Konversi Tertinggi", "Tampil di Seluruh Halaman"],
    ctaText: "Pasang Iklan Sekarang",
    ctaLink: "https://wa.me/6287767287284?text=Halo%20Admin,%20saya%20ingin%20pasang%20banner%20iklan%20sponsor%20di%20Ry-ITSolutions",
    isExternal: true,
    gradient: "from-blue-600/10 via-indigo-600/15 to-purple-600/10 border-blue-500/30",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25",
  },
  {
    id: "sponsor-2",
    tag: "LAYANAN RESMI",
    title: "Buka Blokir IMEI & Pendaftaran CEIR Kemenperin",
    subtitle: "Garansi sinyal permanen seumur hidup untuk iPhone & Android impor. Resmi Bea Cukai 100% aman bergaransi.",
    benefits: ["Garansi Permanen", "Proses Cepat 1x24 Jam", "Terdaftar Kemenperin Resmi"],
    ctaText: "Cek Status CEIR",
    ctaLink: "/cek-ceir",
    isExternal: false,
    gradient: "from-emerald-600/10 via-teal-600/15 to-cyan-600/10 border-emerald-500/30",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25",
  },
  {
    id: "sponsor-3",
    tag: "SAAS GATEWAY",
    title: "Terima Pembayaran QRIS Otomatis di Web & Bot Anda",
    subtitle: "Biaya 0%, integrasi webhook instan, uang pembayaran langsung masuk saldo rekening GoPay Anda 24 jam.",
    benefits: ["Biaya Admin 0%", "Auto Notifikasi Bot", "Langsung ke GoPay"],
    ctaText: "Integrasi QRIS Sekarang",
    ctaLink: "/gateway",
    isExternal: false,
    gradient: "from-amber-600/10 via-orange-600/15 to-rose-600/10 border-amber-500/30",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    btnColor: "bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white shadow-amber-500/25",
  },
];

export default function GoogleAdBanner({
  slot = "3892653630",
  format = "auto",
  className = "",
}: GoogleAdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [isAdFilled, setIsAdFilled] = useState<boolean>(false);
  const [sponsorIndex, setSponsorIndex] = useState<number>(0);

  // Rotate dummy sponsors every 7 seconds if AdSense is not filled
  useEffect(() => {
    if (isAdFilled) return;
    const interval = setInterval(() => {
      setSponsorIndex((prev) => (prev + 1) % DUMMY_SPONSORS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isAdFilled]);

  // Initialize AdSense and detect when real ad is loaded / filled
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ad blocker or script blocked
    }

    const checkStatus = () => {
      const el = adRef.current;
      if (!el) return;
      const status = el.getAttribute("data-ad-status");
      // ONLY treat as filled if Google AdSense explicitly set data-ad-status="filled"
      if (status === "filled") {
        setIsAdFilled(true);
      } else {
        setIsAdFilled(false);
      }
    };

    const el = adRef.current;
    if (el) {
      const observer = new MutationObserver(() => {
        checkStatus();
      });
      observer.observe(el, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ["data-ad-status", "style"],
      });

      // Periodic check in case AdSense script loads late
      const timer = setInterval(checkStatus, 1500);

      return () => {
        observer.disconnect();
        clearInterval(timer);
      };
    }
  }, []);

  const currentSponsor = DUMMY_SPONSORS[sponsorIndex];

  return (
    <div className={`my-4 relative overflow-hidden rounded-2xl transition-all duration-300 ${className}`}>
      {/* ======================================================== */}
      {/* 1. DUMMY SPONSOR BANNER (Displayed when AdSense not filled) */}
      {/* ======================================================== */}
      {!isAdFilled && (
        <div
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${currentSponsor.gradient} backdrop-blur-md p-4 sm:p-5 shadow-sm transition-all duration-500`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Content */}
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${currentSponsor.badgeColor}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {currentSponsor.tag}
                </span>
                <span className="text-[10px] text-ink-muted flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Iklan Sponsor Terverifikasi
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-bold text-ink tracking-tight flex items-center gap-2">
                  <span>{currentSponsor.title}</span>
                </h4>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  {currentSponsor.subtitle}
                </p>
              </div>

              {/* Benefits Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {currentSponsor.benefits.map((b, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-ink bg-canvas/70 border border-hairline/80 px-2 py-0.5 rounded-md"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Action Button & Indicators */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 shrink-0">
              {currentSponsor.isExternal ? (
                <a
                  href={currentSponsor.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${currentSponsor.btnColor}`}
                >
                  <span>{currentSponsor.ctaText}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  href={currentSponsor.ctaLink}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${currentSponsor.btnColor}`}
                >
                  <span>{currentSponsor.ctaText}</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Dummy Sponsor Dots Navigation */}
              <div className="flex items-center gap-1.5">
                {DUMMY_SPONSORS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSponsorIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      sponsorIndex === idx ? "w-5 bg-primary" : "w-1.5 bg-hairline hover:bg-ink-muted"
                    }`}
                    aria-label={`Sponsor ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REAL GOOGLE ADSENSE CONTAINER                          */}
      {/* Rendered in DOM so AdSense can measure width;             */}
      {/* Hidden when unfilled, smoothly reveals when filled.      */}
      {/* ======================================================== */}
      <div
        className={`w-full overflow-hidden transition-all duration-300 ${
          isAdFilled
            ? "block rounded-2xl bg-canvas border border-hairline/60 p-2 text-center text-xs text-ink-muted shadow-sm"
            : "absolute top-0 left-0 w-full opacity-0 pointer-events-none h-px"
        }`}
      >
        {isAdFilled && (
          <div className="text-[10px] uppercase tracking-wider mb-1 text-ink-muted/60 flex items-center justify-center gap-1">
            <span>Iklan Sponsor</span>
            <span>•</span>
            <span>Google AdSense</span>
          </div>
        )}
        <div className="min-h-[90px] flex items-center justify-center w-full">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client="ca-pub-2898811488813299"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
}
