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
  icon: React.ReactNode;
  preferredPlacement?: "top" | "bottom";
  actionUrl?: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="wallet-card"]',
    title: "Saldo & Top Up Instan 24 Jam",
    badge: "Langkah 1",
    description: "Halo! Selamat datang di Ry IT Solutions. Ini adalah kartu saldo Anda. Anda bisa melakukan isi saldo secara instan melalui QRIS otomatis 24 jam. Begitu transfer, saldo langsung masuk dalam hitungan detik tanpa perlu konfirmasi manual.",
    audioUrl: "/audio/tour/step_1.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    preferredPlacement: "bottom",
    actionUrl: "/topup"
  },
  {
    targetSelector: '[data-tour="search-bar"]',
    title: "Pencarian Cerdas & Cek IMEI",
    badge: "Langkah 2",
    description: "Ini adalah kolom pencarian cerdas. Cukup masukkan 15 digit nomor IMEI atau nomor pesanan Anda di sini, sistem akan langsung menampilkan tipe perangkat, status sinyal, dan riwayat transaksi secara real-time.",
    audioUrl: "/audio/tour/step_2.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    preferredPlacement: "bottom"
  },
  {
    targetSelector: '[data-tour="service-unblock"]',
    title: "Buka Sinyal IMEI All Operator",
    badge: "Langkah 3",
    description: "Menu Buka Sinyal IMEI adalah layanan utama kami untuk mengaktifkan kembali sinyal HP luar negeri all operator. Masukkan nomor IMEI, lampirkan foto *#06#, pilih durasi yang diinginkan, dan pesanan Anda langsung kami proses.",
    audioUrl: "/audio/tour/step_3.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    preferredPlacement: "bottom",
    actionUrl: "/unblock-imei"
  },
  {
    targetSelector: '[data-tour="service-ceir"]',
    title: "Cek Database CEIR & Bea Cukai",
    badge: "Langkah 4",
    description: "Gunakan menu Cek Database CEIR untuk memeriksa histori registrasi dan database resmi Bea Cukai pada perangkat Anda sebelum aktivasi sinyal.",
    audioUrl: "/audio/tour/step_4.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    preferredPlacement: "bottom",
    actionUrl: "/cek-ceir"
  },
  {
    targetSelector: '[data-tour="service-garansi"]',
    title: "Perlindungan Garansi Digital",
    badge: "Langkah 5",
    description: "Setiap transaksi di sini dilengkapi dengan garansi digital resmi. Di menu ini, Anda bisa memantau sisa masa garansi, mengunduh nota PDF, ataupun menghubungi bantuan teknis kapan saja.",
    audioUrl: "/audio/tour/step_5.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    preferredPlacement: "bottom",
    actionUrl: "/cek-garansi"
  },
  {
    targetSelector: '[data-tour="service-voucher"]',
    title: "Pusat Klaim Voucher Promo",
    badge: "Diskon Hemat",
    description: "Ini adalah Pusat Klaim Voucher Promo. Anda bisa mengambil berbagai kupon potongan harga spesial di sini. Setelah diklaim, voucher bisa langsung Anda pasang saat checkout agar mendapatkan diskon otomatis.",
    audioUrl: "/audio/tour/step_voucher.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
      </svg>
    ),
    preferredPlacement: "bottom",
    actionUrl: "/vouchers"
  },
  {
    targetSelector: '[data-tour="service-referral"]',
    title: "Program Referral & Kemitraan",
    badge: "Bonus Cuan",
    description: "Dapatkan penghasilan tambahan melalui Program Referral. Bagikan link referral Anda kepada teman atau pelanggan, dan nikmati komisi saldo otomatis pada setiap transaksi mereka.",
    audioUrl: "/audio/tour/step_6.mp3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  // Play Neural AI voice MP3 (with SpeechSynthesis fallback)
  const playAudio = (audioUrl: string, fallbackText?: string) => {
    stopAudio();
    if (!isAudioEnabled) return;

    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          // Fallback to Web Speech API jika file MP3 gagal dimuat
          if (fallbackText && typeof window !== "undefined" && window.speechSynthesis) {
            try {
              const utter = new SpeechSynthesisUtterance(fallbackText);
              utter.lang = "id-ID";
              utter.rate = 1.0;
              utter.onstart = () => setIsPlaying(true);
              utter.onend = () => setIsPlaying(false);
              utter.onerror = () => setIsPlaying(false);
              window.speechSynthesis.speak(utter);
            } catch (e) {}
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
        return;
      } catch (e) {
        setIsPlaying(false);
      }
    }

    if (fallbackText && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        const utter = new SpeechSynthesisUtterance(fallbackText);
        utter.lang = "id-ID";
        utter.rate = 1.0;
        utter.onstart = () => setIsPlaying(true);
        utter.onend = () => setIsPlaying(false);
        utter.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utter);
      } catch (e) {}
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
    const timer1 = setTimeout(updatePosition, 150);
    const timer2 = setTimeout(() => {
      updatePosition();
      playAudio(currentStep.audioUrl, currentStep.description);
    }, 450);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
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
      {/* SVG Spotlight Cutout Mask */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9998]">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
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

      {/* Pulsating Glowing Border Ring surrounding target */}
      {targetRect && (
        <div
          className="fixed z-[9999] rounded-[20px] ring-4 ring-blue-500 ring-offset-2 ring-offset-transparent pointer-events-none shadow-[0_0_35px_rgba(37,99,235,0.85)] animate-pulse transition-all duration-300"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Floating Guided Card */}
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
                    playAudio(currentStep.audioUrl, currentStep.description);
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
                {isAudioEnabled ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a6 6 0 010 7.427M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.41 0-.75-.34-.75-.75V9c0-.41.34-.75.75-.75h2.24z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.41 0-.75-.34-.75-.75V9c0-.41.34-.75.75-.75h2.24z" />
                  </svg>
                )}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                <span>Buka Menu Ini Sekarang</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-hairline">
            <button
              disabled={currentStepIndex === 0}
              onClick={handlePrev}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-hairline disabled:opacity-30 hover:bg-parchment transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Sebelumnya</span>
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
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all flex items-center gap-1"
            >
              <span>{currentStepIndex < steps.length - 1 ? "Lanjut" : "Selesai"}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
