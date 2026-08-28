"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface TourStep {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  speechText: string;
  icon: string;
  actionUrl?: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="wallet-card"]',
    title: "Saldo & Top Up Otomatis",
    badge: "Langkah 1",
    description: "Di sini Anda bisa memantau saldo akun Anda. Klik 'Top Up Cuan' untuk isi saldo via QRIS otomatis 24 jam. Saldo akan langsung masuk detik itu juga tanpa perlu konfirmasi manual admin.",
    speechText: "Selamat datang di Ry IT Solutions! Ini adalah kartu saldo Anda. Anda dapat mengisi saldo kapan saja secara otomatis via QRIS 24 jam, dan saldo akan langsung masuk dalam hitungan detik.",
    icon: "💳",
    actionUrl: "/topup"
  },
  {
    targetSelector: '[data-tour="search-bar"]',
    title: "Pencarian Cepat & Cek IMEI",
    badge: "Langkah 2",
    description: "Ketik atau tempel 15 digit IMEI ataupun ID Transaksi Anda di kolom ini. Sistem akan langsung mendeteksi tipe perangkat, status sinyal, dan riwayat pesanan secara instan.",
    speechText: "Ini adalah kolom pencarian cerdas. Anda cukup mengetik atau menempelkan 15 digit nomor IMEI atau ID transaksi untuk memeriksa status perangkat dan riwayat secara instan.",
    icon: "🔍"
  },
  {
    targetSelector: '[data-tour="service-unblock"]',
    title: "Layanan Buka Sinyal IMEI",
    badge: "Langkah 3",
    description: "Menu utama untuk mengaktifkan sinyal HP luar negeri (Inter) all operator. Cukup ketik IMEI, upload screenshot bintang pagar 06 pagar, masukkan nomor WhatsApp Anda, lalu pilih durasi aktif.",
    speechText: "Di menu Buka IMEI, Anda dapat mengaktifkan sinyal HP luar negeri untuk semua operator. Cukup masukkan nomor IMEI, screenshot, dan pilih durasi yang diinginkan.",
    icon: "📱",
    actionUrl: "/unblock-imei"
  },
  {
    targetSelector: '[data-tour="service-ceir"]',
    title: "Cek Database CEIR & Bea Cukai",
    badge: "Langkah 4",
    description: "Gunakan menu ini untuk memeriksa riwayat database CEIR dan status registrasi Bea Cukai pada HP Anda sebelum melakukan aktivasi sinyal.",
    speechText: "Menu Cek CEIR berguna untuk memeriksa riwayat database dan status Bea Cukai perangkat Anda secara resmi sebelum melakukan order aktivasi sinyal.",
    icon: "🏛️",
    actionUrl: "/cek-ceir"
  },
  {
    targetSelector: '[data-tour="service-garansi"]',
    title: "Cek & Klaim Garansi Digital",
    badge: "Langkah 5",
    description: "Setiap transaksi memiliki perlindungan garansi digital. Anda bisa memantau sisa masa aktif garansi, mengunduh nota PDF, atau mengajukan bantuan teknis kapan saja.",
    speechText: "Menu Cek Garansi memungkinkan Anda memantau sisa masa aktif garansi digital, mencetak nota resmi, dan mengajukan bantuan jika terjadi kendala pada sinyal Anda.",
    icon: "🛡️",
    actionUrl: "/cek-garansi"
  },
  {
    targetSelector: '[data-tour="service-referral"]',
    title: "Program Referral & Cuan",
    badge: "Bonus Cuan",
    description: "Ajak teman atau rekan sesama teknisi bergabung menggunakan link referral Anda untuk mendapatkan komisi saldo otomatis pada setiap transaksi mereka.",
    speechText: "Dapatkan komisi saldo otomatis dengan membagikan link referral Anda kepada teman atau pelanggan. Saldo komisi dapat langsung digunakan untuk transaksi!",
    icon: "🤝",
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const router = useRouter();

  const currentStep = steps[currentStepIndex];

  // Speech Narration Logic using Web Speech API
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    if (!isAudioEnabled) {
      setIsSpeaking(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.96;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(v => 
        v.lang.includes("id") || v.lang.includes("ID") || v.name.toLowerCase().includes("indonesia")
      );
      if (indonesianVoice) utterance.voice = indonesianVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Locate current step element & speak narration
  useEffect(() => {
    if (!isOpen || !currentStep) {
      stopSpeech();
      return;
    }

    const updateTargetPosition = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    updateTargetPosition();
    const timer = setTimeout(() => {
      updateTargetPosition();
      speakText(currentStep.speechText || currentStep.description);
    }, 400);

    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
      stopSpeech();
    };
  }, [isOpen, currentStepIndex, isAudioEnabled]);

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    stopSpeech();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    stopSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    stopSpeech();
    if (typeof window !== "undefined") {
      localStorage.setItem("ry_tour_completed", "true");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden">
      {/* Dark Overlay Background */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={handleComplete}
      />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          className="absolute z-10 rounded-2xl ring-4 ring-primary ring-offset-4 ring-offset-black/50 pointer-events-none transition-all duration-300 shadow-[0_0_40px_rgba(0,102,204,0.6)] animate-pulse"
          style={{
            top: targetRect.top + window.scrollY - 8,
            left: targetRect.left + window.scrollX - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Floating Guided Card (Interactive Tooltip) */}
      <div className="fixed inset-x-4 bottom-6 md:inset-auto md:bottom-8 md:right-8 z-20 max-w-md mx-auto md:mx-0">
        <div className="bg-canvas border-2 border-primary/30 rounded-3xl p-5 shadow-2xl space-y-4 backdrop-blur-xl bg-opacity-95 text-ink animate-fadeIn">
          {/* Header Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                {currentStep.icon}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
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
                    speakText(currentStep.speechText || currentStep.description);
                  } else {
                    stopSpeech();
                  }
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  isAudioEnabled 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
                title={isAudioEnabled ? "Matikan Suara AI" : "Aktifkan Suara AI"}
              >
                <span>{isAudioEnabled ? "🔊" : "🔇"}</span>
                {isSpeaking && (
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
          <p className="text-xs text-ink-muted leading-relaxed">
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
                className="w-full py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
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
                    stopSpeech();
                    setCurrentStepIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                    currentStepIndex === idx ? 'w-5 bg-primary' : 'bg-slate-300 hover:bg-slate-400'
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
