"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface TourStep {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  audioUrl: string;
  speechText?: string;
  icon: string;
  preferredPlacement?: "top" | "bottom";
  actionUrl?: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="wallet-card"]',
    title: "Saldo & Top Up Otomatis",
    badge: "Langkah 1",
    description: "Di sini Anda bisa memantau saldo akun Anda. Klik 'Top Up Cuan' untuk isi saldo via QRIS otomatis 24 jam. Saldo akan langsung masuk detik itu juga tanpa perlu konfirmasi manual admin.",
    audioUrl: "/audio/tour/step_1.mp3",
    icon: "💳",
    preferredPlacement: "bottom",
    actionUrl: "/topup"
  },
  {
    targetSelector: '[data-tour="search-bar"]',
    title: "Pencarian Cepat & Cek IMEI",
    badge: "Langkah 2",
    description: "Ketik atau tempel 15 digit IMEI ataupun ID Transaksi Anda di kolom ini. Sistem akan langsung mendeteksi tipe perangkat, status sinyal, dan riwayat pesanan secara instan.",
    audioUrl: "/audio/tour/step_2.mp3",
    icon: "🔍",
    preferredPlacement: "bottom"
  },
  {
    targetSelector: '[data-tour="service-unblock"]',
    title: "Layanan Buka Sinyal IMEI",
    badge: "Langkah 3",
    description: "Menu utama untuk mengaktifkan sinyal HP luar negeri (Inter) all operator. Cukup ketik IMEI, upload screenshot bintang pagar 06 pagar, masukkan nomor WhatsApp Anda, lalu pilih durasi aktif.",
    audioUrl: "/audio/tour/step_3.mp3",
    icon: "📱",
    preferredPlacement: "bottom",
    actionUrl: "/unblock-imei"
  },
  {
    targetSelector: '[data-tour="service-ceir"]',
    title: "Cek Database CEIR & Bea Cukai",
    badge: "Langkah 4",
    description: "Gunakan menu ini untuk memeriksa riwayat database CEIR dan status registrasi Bea Cukai pada HP Anda sebelum melakukan aktivasi sinyal.",
    audioUrl: "/audio/tour/step_4.mp3",
    icon: "🏛️",
    preferredPlacement: "bottom",
    actionUrl: "/cek-ceir"
  },
  {
    targetSelector: '[data-tour="service-garansi"]',
    title: "Cek & Klaim Garansi Digital",
    badge: "Langkah 5",
    description: "Setiap transaksi memiliki perlindungan garansi digital. Anda bisa memantau sisa masa aktif garansi, mengunduh nota PDF, atau mengajukan bantuan teknis kapan saja.",
    audioUrl: "/audio/tour/step_5.mp3",
    icon: "🛡️",
    preferredPlacement: "bottom",
    actionUrl: "/cek-garansi"
  },
  {
    targetSelector: '[data-tour="service-referral"]',
    title: "Program Referral & Cuan",
    badge: "Bonus Cuan",
    description: "Ajak teman atau rekan sesama teknisi bergabung menggunakan link referral Anda untuk mendapatkan komisi saldo otomatis pada setiap transaksi mereka.",
    audioUrl: "/audio/tour/step_6.mp3",
    icon: "🤝",
    preferredPlacement: "bottom",
    actionUrl: "/referral"
  }
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps?: TourStep[];
}

export default function InteractiveTour({ isOpen, onClose, steps = DEFAULT_STEPS }: InteractiveTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 100,
    left: 20,
    placement: "bottom"
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const currentStep = steps[currentStepIndex];

  // Stop current audio cleanly
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  // Play Neural AI voice MP3
  const playAudio = (audioUrl: string) => {
    stopAudio();
    if (!isAudioEnabled || !audioUrl) return;

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio autoplay prevented or error:", err);
          setIsPlaying(false);
        });
      }
    } catch (e) {
      console.warn("Audio playback error:", e);
      setIsPlaying(false);
    }
  };

  // Locate target element and calculate attached position
  useEffect(() => {
    if (!isOpen || !currentStep) {
      stopAudio();
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate smart tooltip coordinates
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const cardWidth = Math.min(420, viewportWidth - 32);
      const cardHeight = 240; // estimated height

      // Check vertical placement
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let placement: "top" | "bottom" = "bottom";
      let top = rect.bottom + 16;

      if (spaceBelow < cardHeight + 20 && spaceAbove > cardHeight + 20) {
        placement = "top";
        top = Math.max(16, rect.top - cardHeight - 16);
      } else {
        placement = "bottom";
        top = Math.min(viewportHeight - cardHeight - 16, rect.bottom + 16);
      }

      // Horizontal alignment: Center with target, but clamp within screen
      let left = rect.left + rect.width / 2 - cardWidth / 2;
      left = Math.max(16, Math.min(left, viewportWidth - cardWidth - 16));

      setCardPosition({ top, left, placement });
    };

    updatePosition();
    const timer = setTimeout(() => {
      updatePosition();
      playAudio(currentStep.audioUrl);
    }, 350);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
      stopAudio();
    };
  }, [isOpen, currentStepIndex, isAudioEnabled]);

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    stopAudio();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    stopAudio();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    stopAudio();
    if (typeof window !== "undefined") {
      localStorage.setItem("ry_tour_completed", "true");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-auto overflow-hidden">
      {/* SVG Spotlight Cutout Mask: Dim the whole screen but leave the target 100% bright and clear */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9998]">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White area = dimmed */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black area = transparent cutout revealing the bright UI below */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="18"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 15, 30, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Pulsating Glowing Border Ring surrounding the cutout target */}
      {targetRect && (
        <div
          className="fixed z-[9999] rounded-[20px] ring-4 ring-[#0066cc] ring-offset-2 ring-offset-transparent pointer-events-none shadow-[0_0_35px_rgba(0,102,204,0.85)] animate-pulse transition-all duration-300"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Floating Guided Card with dynamic attached placement & arrow pointer */}
      <div
        ref={cardRef}
        className="fixed z-[10000] w-full max-w-[420px] px-4 transition-all duration-300"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
        }}
      >
        <div className="bg-canvas border-2 border-primary/40 rounded-3xl p-5 shadow-2xl space-y-4 backdrop-blur-xl bg-opacity-95 text-ink animate-fadeIn relative">
          {/* Header Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white flex items-center justify-center text-lg shadow-sm">
                {currentStep.icon}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {currentStep.badge} ({currentStepIndex + 1}/{steps.length})
                </span>
                <h3 className="font-bold text-sm text-ink leading-tight mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            {/* Audio Toggle & Close */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const nextAudio = !isAudioEnabled;
                  setIsAudioEnabled(nextAudio);
                  if (nextAudio) {
                    playAudio(currentStep.audioUrl);
                  } else {
                    stopAudio();
                  }
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isAudioEnabled
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
                title={isAudioEnabled ? "Matikan Suara AI" : "Aktifkan Suara AI"}
              >
                <span>{isAudioEnabled ? "🔊" : "🔇"}</span>
                {isPlaying && (
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-2"></span>
                    <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-3"></span>
                    <span className="w-1 bg-emerald-600 rounded-full animate-bounce h-1.5"></span>
                  </span>
                )}
              </button>

              <button
                onClick={handleComplete}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition-colors"
                title="Tutup Tur"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Description Body */}
          <p className="text-xs text-ink leading-relaxed font-normal">
            {currentStep.description}
          </p>

          {/* Action Button (if step has quick link) */}
          {currentStep.actionUrl && (
            <div className="pt-1">
              <button
                onClick={() => {
                  handleComplete();
                  router.push(currentStep.actionUrl!);
                }}
                className="w-full py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-primary/20"
              >
                <span>Buka Menu Ini Sekarang</span> ➔
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-hairline">
            <button
              disabled={currentStepIndex === 0}
              onClick={handlePrev}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-hairline disabled:opacity-30 hover:bg-parchment transition-colors"
            >
              ⬅ Sebelumnya
            </button>

            {/* Progress Dots */}
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => {
                    stopAudio();
                    setCurrentStepIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                    currentStepIndex === idx ? "w-5 bg-primary" : "bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
            >
              {currentStepIndex < steps.length - 1 ? "Lanjut ➔" : "Selesai 🎉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
