"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { playCoinClaimSound, playWheelTickSound, playPopSound, playDingSound } from "@/lib/soundFx";
import { safeJson } from "@/lib/api";

type GameTab = "wheel" | "mystery_box" | "scratch" | "trivia";

interface GameStatus {
  coins: number;
  can_checkin: boolean;
  today_checkin_done: boolean;
  current_streak: number;
  can_spin: boolean;
  can_mystery_box: boolean;
  can_scratch: boolean;
  can_trivia: boolean;
  today_trivia_done: boolean;
  trivia_coins_earned: number;
}

interface TriviaQuestion {
  number: number;
  id: string;
  question: string;
  options: string[];
}

export default function GamesPage() {
  const { user, setUser } = useApp();
  const router = useRouter();

  // Active Game Tab
  const [activeTab, setActiveTab] = useState<GameTab>("wheel");
  const [loading, setLoading] = useState(true);

  const [gameData, setGameData] = useState<GameStatus>({
    coins: 0,
    can_checkin: true,
    today_checkin_done: false,
    current_streak: 1,
    can_spin: true,
    can_mystery_box: true,
    can_scratch: true,
    can_trivia: true,
    today_trivia_done: false,
    trivia_coins_earned: 0,
  });

  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);

  // 1. Lucky Wheel States
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  // 2. Mystery Box States
  const [openingBox, setOpeningBox] = useState(false);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [boxesResult, setBoxesResult] = useState<any[] | null>(null);
  const [mysteryWonCoins, setMysteryWonCoins] = useState<number | null>(null);

  // 3. Scratch Card States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratching, setScratching] = useState(false);
  const [scratchTiles, setScratchTiles] = useState<number[] | null>(null);
  const [scratchClaimed, setScratchClaimed] = useState(false);
  const [scratchWonAmount, setScratchWonAmount] = useState<number | null>(null);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [scratchRevealed, setScratchRevealed] = useState(false);

  // 4. Trivia Quiz States
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  const [triviaStep, setTriviaStep] = useState(0);
  const [triviaAnswers, setTriviaAnswers] = useState<number[]>([]);
  const [submittingTrivia, setSubmittingTrivia] = useState(false);
  const [triviaResult, setTriviaResult] = useState<any | null>(null);
  const [triviaTimer, setTriviaTimer] = useState(30);

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch("/api/games/status", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status) {
        const payload = data.data || data;
        setGameData({
          coins: payload.coins ?? 0,
          can_checkin: payload.can_checkin ?? true,
          today_checkin_done: payload.today_checkin_done ?? false,
          current_streak: Number(payload.current_streak) || 1,
          can_spin: payload.can_spin ?? true,
          can_mystery_box: payload.can_mystery_box ?? true,
          can_scratch: payload.can_scratch ?? true,
          can_trivia: payload.can_trivia ?? true,
          today_trivia_done: payload.today_trivia_done ?? false,
          trivia_coins_earned: payload.trivia_coins_earned ?? 0,
        });
      }
    } catch (e) {
      console.error("Error loading games:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const fetchCoinHistory = async () => {
    try {
      const res = await fetch("/api/games/history", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status) {
        setCoinHistory(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {}
  };

  // -------------------------------------------------------------
  // 1. Daily Check-In
  // -------------------------------------------------------------
  const rewards = [15, 25, 35, 50, 65, 80, 150];
  const handleDailyCheckin = async () => {
    if (!gameData.can_checkin || claimingCheckin) return;
    setClaimingCheckin(true);

    try {
      const res = await fetch("/api/games/daily-checkin", {
        method: "POST",
        credentials: "include",
      });
      const data = await safeJson(res);

      if (data?.status) {
        playCoinClaimSound();
        Swal.fire({
          icon: "success",
          title: "Klaim Berhasil",
          text: data.message,
          confirmButtonColor: "#0066cc",
          confirmButtonText: "Kumpulkan Koin",
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });

        if (user) {
          setUser({ ...user, coins: data.new_coins_balance });
        }
        setGameData((prev) => ({
          ...prev,
          coins: data.new_coins_balance,
          today_checkin_done: true,
          can_checkin: false,
          current_streak: data.streak || prev.current_streak,
        }));
      } else {
        Swal.fire({
          icon: "info",
          title: "Perhatian",
          text: data.message,
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan koneksi saat klaim koin.",
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: true,
      });
    } finally {
      setClaimingCheckin(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Lucky Spin Wheel
  // -------------------------------------------------------------
  const prizes = [
    { amount: 10, label: "10", color: "#0066cc" },
    { amount: 20, label: "20", color: "#4f46e5" },
    { amount: 35, label: "35", color: "#059669" },
    { amount: 50, label: "50", color: "#7c3aed" },
    { amount: 75, label: "75", color: "#0891b2" },
    { amount: 150, label: "150", color: "#d97706" },
  ];

  const handleLuckySpin = async () => {
    if (!gameData.can_spin || spinningWheel) return;
    setSpinningWheel(true);

    try {
      const res = await fetch("/api/games/lucky-spin", {
        method: "POST",
        credentials: "include",
      });
      const data = await safeJson(res);

      if (data?.status) {
        const prizeIdx = data.prize_index !== undefined ? data.prize_index : 0;
        // Accurate target angle to stop needle right at the center of the winning slice (prizeIdx * 60 + 30 deg)
        const sliceCenter = prizeIdx * 60 + 30;
        const targetOffset = ((360 - sliceCenter - (wheelRotation % 360)) % 360 + 360) % 360;
        const targetAngle = wheelRotation + (360 * 5) + targetOffset;
        setWheelRotation(targetAngle);

        // Play realistic wheel ticking sound
        let tickCount = 0;
        const tickInterval = setInterval(() => {
          playWheelTickSound();
          tickCount++;
          if (tickCount > 26) clearInterval(tickInterval);
        }, 110);

        setTimeout(() => {
          clearInterval(tickInterval);
          playCoinClaimSound();
          Swal.fire({
            icon: "success",
            title: "Selamat",
            text: data.message,
            confirmButtonColor: "#0066cc",
            confirmButtonText: "Kumpulkan Koin",
            timer: 3000,
            timerProgressBar: true,
            allowOutsideClick: true,
          });

          if (user) {
            setUser({ ...user, coins: data.new_coins_balance });
          }
          setGameData((prev) => ({
            ...prev,
            coins: data.new_coins_balance,
            can_spin: false,
          }));
          setSpinningWheel(false);
        }, 3200);
      } else {
        setSpinningWheel(false);
        Swal.fire({
          icon: "info",
          title: "Tiket Habis",
          text: data.message,
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });
      }
    } catch (e) {
      setSpinningWheel(false);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat memutar roda.",
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: true,
      });
    }
  };

  // -------------------------------------------------------------
  // 3. Mystery Box
  // -------------------------------------------------------------
  const handleOpenBox = async (boxIndex: number) => {
    if (!gameData.can_mystery_box || openingBox || selectedBox !== null) return;
    setOpeningBox(true);
    setSelectedBox(boxIndex);
    playPopSound();

    try {
      const res = await fetch("/api/games/mystery-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ box_index: boxIndex }),
      });
      const data = await safeJson(res);

      if (data?.status) {
        setTimeout(() => {
          playCoinClaimSound();
          setBoxesResult(data.boxes_content || []);
          setMysteryWonCoins(data.coins_earned);
          if (user) {
            setUser({ ...user, coins: data.new_coins_balance });
          }
          setGameData((prev) => ({
            ...prev,
            coins: data.new_coins_balance,
            can_mystery_box: false,
          }));
          setOpeningBox(false);

          Swal.fire({
            icon: "success",
            title: "Kotak Terbuka",
            text: data.message,
            confirmButtonColor: "#0066cc",
            confirmButtonText: "Kumpulkan Koin",
            timer: 3200,
            timerProgressBar: true,
            allowOutsideClick: true,
          });
        }, 1200);
      } else {
        setOpeningBox(false);
        setSelectedBox(null);
        Swal.fire({
          icon: "info",
          title: "Perhatian",
          text: data.message,
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });
      }
    } catch (e) {
      setOpeningBox(false);
      setSelectedBox(null);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat membuka kotak misteri.",
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: true,
      });
    }
  };

  // -------------------------------------------------------------
  // 4. Scratch Card Canvas Logic
  // -------------------------------------------------------------
  const initScratchCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth || 320;
    const height = canvas.offsetHeight || 180;
    canvas.width = width;
    canvas.height = height;

    // Draw metallic coating gradient with diagonal texture
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#D1D5DB");
    grad.addColorStop(0.3, "#9CA3AF");
    grad.addColorStop(0.6, "#E5E7EB");
    grad.addColorStop(1, "#9CA3AF");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid line pattern to look like authentic lottery card
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    for (let x = 20; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Centered instructional badge
    ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
    ctx.beginPath();
    ctx.roundRect(width / 2 - 80, height / 2 - 18, 160, 36, 18);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GORES DI SINI", width / 2, height / 2);
  }, []);

  const handleStartScratchCard = async () => {
    if (!gameData.can_scratch || scratching || scratchClaimed) return;
    setScratching(true);

    try {
      const res = await fetch("/api/games/scratch-card", {
        method: "POST",
        credentials: "include",
      });
      const data = await safeJson(res);

      if (data?.status) {
        setScratchTiles(data.tiles || []);
        setScratchWonAmount(data.coins_earned);
        setScratchClaimed(true);

        if (user) {
          setUser({ ...user, coins: data.new_coins_balance });
        }
        setGameData((prev) => ({
          ...prev,
          coins: data.new_coins_balance,
          can_scratch: false,
        }));

        // Initialize canvas
        setTimeout(() => {
          initScratchCanvas();
        }, 50);
      } else {
        setScratching(false);
        Swal.fire({
          icon: "info",
          title: "Tiket Habis",
          text: data.message,
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });
      }
    } catch (e) {
      setScratching(false);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat menyiapkan kartu gores.",
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: true,
      });
    }
  };

  // Scratch Drawing
  const isScratchingRef = useRef(false);
  const scratchAtPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || scratchRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    playPopSound();

    // Calculate percentage scratched every ~10 scratches
    if (Math.random() < 0.25) {
      checkScratchPercentage();
    }
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparentPixels = 0;
      const totalPixels = imgData.data.length / 4;
      for (let i = 3; i < imgData.data.length; i += 16) {
        if (imgData.data[i] === 0) transparentPixels++;
      }
      const pct = Math.min(100, Math.round((transparentPixels / (totalPixels / 4)) * 100));
      setScratchPercent(pct);

      if (pct >= 45 && !scratchRevealed) {
        revealEntireCard();
      }
    } catch (e) {}
  };

  const revealEntireCard = () => {
    setScratchRevealed(true);
    setScratchPercent(100);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    playCoinClaimSound();
    Swal.fire({
      icon: "success",
      title: "Kartu Terbuka Penuh",
      text: `Selamat! Anda berhasil menemukan 3 petak cocok dan memenangkan +${(scratchWonAmount || 0).toLocaleString("id-ID")} RyPoints!`,
      confirmButtonColor: "#0066cc",
      confirmButtonText: "Kumpulkan Koin",
      timer: 3200,
      timerProgressBar: true,
      allowOutsideClick: true,
    });
  };

  // -------------------------------------------------------------
  // 5. Daily Tech Trivia Logic
  // -------------------------------------------------------------
  const loadTriviaQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/games/trivia/today", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.questions)) {
        setTriviaQuestions(data.questions);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (activeTab === "trivia" && triviaQuestions.length === 0 && gameData.can_trivia) {
      loadTriviaQuestions();
    }
  }, [activeTab, triviaQuestions.length, gameData.can_trivia, loadTriviaQuestions]);

  // Trivia countdown timer
  useEffect(() => {
    if (activeTab !== "trivia" || !gameData.can_trivia || triviaResult || triviaQuestions.length === 0) return;
    const interval = setInterval(() => {
      setTriviaTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab, gameData.can_trivia, triviaResult, triviaQuestions.length]);

  const handleSelectTriviaAnswer = (optionIdx: number) => {
    playDingSound();
    const nextAnswers = [...triviaAnswers];
    nextAnswers[triviaStep] = optionIdx;
    setTriviaAnswers(nextAnswers);

    if (triviaStep < 2) {
      setTriviaStep(triviaStep + 1);
    }
  };

  const handleSubmitTrivia = async () => {
    if (triviaAnswers.length < 3 || submittingTrivia) return;
    setSubmittingTrivia(true);

    try {
      const res = await fetch("/api/games/trivia/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: triviaAnswers }),
      });
      const data = await safeJson(res);

      if (data?.status) {
        playCoinClaimSound();
        setTriviaResult(data);
        if (user) {
          setUser({ ...user, coins: data.new_coins_balance });
        }
        setGameData((prev) => ({
          ...prev,
          coins: data.new_coins_balance,
          can_trivia: false,
          today_trivia_done: true,
          trivia_coins_earned: data.coins_earned,
        }));
      } else {
        Swal.fire({
          icon: "info",
          title: "Perhatian",
          text: data.message,
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: true,
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat mengirim jawaban kuis.",
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: true,
      });
    } finally {
      setSubmittingTrivia(false);
    }
  };

  const userCoins = user?.coins || gameData.coins || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & COIN STATS HERO (Apple Wallet / Rewards)     */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.05] dark:border-white/[0.08] relative">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-base font-bold">Ry Koin Rewards</span>
          </button>

          <Link
            href="/vouchers"
            className="p-2 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E8E8ED] transition-colors"
            title="Voucher Saya"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </Link>
        </div>

        {/* Big Coin Balance Display */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#FF9500]/15 border border-[#FF9500]/30 text-[#FF9500] dark:text-[#FF9F0A] flex items-center justify-center font-bold shadow-xs">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                {userCoins.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="text-xs text-[#86868B]">
              1 Koin = Rp 1 Diskon Transaksi (Aktif s.d 30-11-2026)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchCoinHistory();
              setShowHistoryModal(true);
            }}
            className="px-3.5 py-1.5 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] hover:bg-[#DEDEE3] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <span>Riwayat</span>
            <svg className="w-3 h-3 text-[#86868B]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. FLOATING "KOIN CEK-IN" CARD                               */}
        {/* ============================================================ */}
        <div className="mt-5 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] p-4 sm:p-5 border border-black/[0.04] dark:border-white/[0.06] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#1D1D1F] dark:text-[#F5F5F7]">
              Check-In Harian
            </span>
            <span className="text-[11px] text-[#86868B]">
              Streak: {gameData?.current_streak || 1} Hari
            </span>
          </div>

          {/* 7-Day Streak Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center pb-3.5">
            {rewards.map((rewardAmount, idx) => {
              const dayNum = idx + 1;
              const currentStreak = gameData?.current_streak || 1;
              const isToday = dayNum === currentStreak;
              const isPastClaimed = dayNum < currentStreak || (isToday && !!gameData?.today_checkin_done);
              const isDay7 = dayNum === 7;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-between py-2 px-1 rounded-xl border transition-all ${
                    isPastClaimed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : isToday
                      ? "bg-blue-500/10 border-[#0071E3] text-[#0071E3] dark:text-[#2997FF] shadow-xs"
                      : "bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.06] text-[#86868B]"
                  }`}
                >
                  <span className="text-[9px] font-semibold">H-{dayNum}</span>
                  <div className="my-1.5">
                    {isPastClaimed ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-[10px] font-extrabold text-amber-500">
                        +{rewardAmount}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-medium text-ink-muted">
                    {isDay7 ? "Bonus" : "Koin"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Primary Action Button */}
          <Button
            onClick={handleDailyCheckin}
            disabled={!gameData?.can_checkin || claimingCheckin}
            isLoading={claimingCheckin}
            className={`w-full h-11 text-xs sm:text-sm font-semibold rounded-full shadow-xs transition-all ${
              gameData?.can_checkin
                ? "bg-[#0071E3] hover:bg-[#0077ED] text-white active:scale-98"
                : "bg-[#E8E8ED] dark:bg-[#3A3A3C] text-[#86868B] cursor-not-allowed"
            }`}
          >
            {gameData?.today_checkin_done
              ? "Sudah Check-In Hari Ini"
              : `Dapatkan ekstra ${rewards[(gameData?.current_streak || 1) - 1] || 100} Koin sekarang`}
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. GAME CENTER TABS SWITCHER                                */}
      {/* ============================================================ */}
      <div className="space-y-3 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-ink flex items-center gap-1.5">
            <span>Arena Game &amp; Hadiah</span>
          </h2>
          <span className="text-[11px] text-ink-muted">Pilih game favoritmu</span>
        </div>

        {/* 4 Interactive Game Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-parchment rounded-2xl border border-hairline">
          {[
            {
              id: "wheel",
              name: "Roda Hoki",
              available: gameData.can_spin,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              ),
            },
            {
              id: "mystery_box",
              name: "Kotak Misteri",
              available: gameData.can_mystery_box,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25l9 5.25 9-5.25M3 11.25l9-5.25 9 5.25m-9-5.25V3" />
                </svg>
              ),
            },
            {
              id: "scratch",
              name: "Kartu Gores",
              available: gameData.can_scratch,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
            },
            {
              id: "trivia",
              name: "Kuis Cepat",
              available: gameData.can_trivia,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 10-3-3 3 3 0 003 3zm0 0v5.25m-6 3h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6A2.25 2.25 0 003.75 6.75v12A2.25 2.25 0 006 21z" />
                </svg>
              ),
            },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playPopSound();
                  setActiveTab(tab.id as GameTab);
                }}
                className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  isCurrent
                    ? "bg-canvas text-primary shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink hover:bg-canvas/50 font-medium"
                }`}
              >
                <div className="flex items-center gap-1">
                  {tab.icon}
                  <span className={`w-1.5 h-1.5 rounded-full ${tab.available ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                </div>
                <span className="text-[11px] leading-tight truncate">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. ACTIVE GAME PANEL                                         */}
      {/* ============================================================ */}

      {/* --- TAB 1: RODA HOKI --- */}
      {activeTab === "wheel" && (
        <div id="lucky-spin-section" className="pt-1">
          <Card className="p-5 space-y-4 border border-hairline bg-canvas shadow-xl rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-ink">Roda Hoki Koin</h2>
                  <p className="text-[11px] text-ink-muted">
                    Putar gratis 1x sehari &amp; menangkan hingga 150 Koin
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                gameData.can_spin
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-parchment text-ink-muted border border-hairline"
              }`}>
                {gameData.can_spin ? "1 Tiket Tersedia" : "Tiket Habis"}
              </span>
            </div>

            {/* Interactive Wheel Graphic */}
            <div className="flex flex-col items-center justify-center py-6 relative">
              {/* Top Indicator Arrow Pin */}
              <div className="absolute top-2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md"></div>

              {/* Rotating SVG Wheel Container */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                <div
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden relative"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: spinningWheel ? "transform 3.2s cubic-bezier(0.15, 0.9, 0.25, 1)" : "none",
                  }}
                >
                  {/* 6 Wheel Slices rendered as conic gradient & labels */}
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        #0066cc 0deg 60deg,
                        #4f46e5 60deg 120deg,
                        #059669 120deg 180deg,
                        #7c3aed 180deg 240deg,
                        #0891b2 240deg 300deg,
                        #d97706 300deg 360deg
                      )`,
                    }}
                  >
                    {prizes.map((prize, idx) => {
                      const angle = idx * 60 + 30;
                      return (
                        <div
                          key={idx}
                          className="absolute w-full h-full top-0 left-0 flex items-start justify-center pt-4"
                          style={{
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: "50% 50%",
                          }}
                        >
                          <span className="text-white font-black text-xs sm:text-sm tracking-wider drop-shadow-md">
                            +{prize.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Center Hub Button */}
                <div
                  onClick={handleLuckySpin}
                  className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-canvas text-ink border-4 border-amber-400 shadow-xl flex flex-col items-center justify-center z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none"
                >
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-ink">
                    {spinningWheel ? "..." : "PUTAR"}
                  </span>
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <Button
              onClick={handleLuckySpin}
              disabled={!gameData.can_spin || spinningWheel}
              isLoading={spinningWheel}
              className={`w-full h-11 text-xs sm:text-sm font-bold shadow-lg rounded-2xl ${
                gameData.can_spin
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-90 text-white"
                  : "bg-parchment text-ink-muted border border-hairline cursor-not-allowed"
              }`}
            >
              {gameData.can_spin ? "Putar Roda Keberuntungan Sekarang" : "Tiket Habis • Kembali Besok"}
            </Button>
          </Card>
        </div>
      )}

      {/* --- TAB 2: KOTAK MISTERI (MYSTERY BOX) --- */}
      {activeTab === "mystery_box" && (
        <div className="pt-1">
          <Card className="p-5 space-y-4 border border-hairline bg-canvas shadow-xl rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25l9 5.25 9-5.25M3 11.25l9-5.25 9 5.25m-9-5.25V3" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-ink">Kotak Misteri Harian</h2>
                  <p className="text-[11px] text-ink-muted">Pilih 1 dari 3 kotak untuk mengungkap hadiah misteri hingga 150 Koin</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                gameData.can_mystery_box
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-parchment text-ink-muted border border-hairline"
              }`}>
                {gameData.can_mystery_box ? "1 Kesempatan" : "Sudah Dibuka"}
              </span>
            </div>

            {/* 3 3D Mystery Boxes Grid */}
            <div className="py-6 px-2">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[0, 1, 2].map((idx) => {
                  const isSelected = selectedBox === idx;
                  const isOpened = boxesResult !== null;
                  const boxContent = boxesResult ? boxesResult[idx] : null;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenBox(idx)}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border transition-all select-none ${
                        !gameData.can_mystery_box && !isOpened
                          ? "bg-parchment/60 border-hairline opacity-60 cursor-not-allowed"
                          : isOpened
                          ? isSelected
                            ? "bg-gradient-to-b from-amber-500/10 to-amber-500/20 border-amber-500/50 shadow-lg scale-105"
                            : "bg-parchment/50 border-hairline opacity-75"
                          : openingBox && isSelected
                          ? "bg-purple-500/10 border-purple-500 animate-bounce scale-105"
                          : "bg-parchment border-hairline hover:border-primary/40 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                      }`}
                    >
                      {/* Box Number Tag */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-canvas/80 border border-hairline text-[9px] font-extrabold text-ink">
                        #{idx + 1}
                      </span>

                      {/* Box Visual Icon */}
                      <div className="my-4">
                        {isOpened ? (
                          <div className="flex flex-col items-center text-center space-y-1 animate-in zoom-in duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="font-extrabold text-xs sm:text-sm text-ink mt-1">
                              +{boxContent?.amount || 0}
                            </span>
                            <span className="text-[9px] text-ink-muted">
                              {isSelected ? "Pilihan Anda" : "Kotak Lain"}
                            </span>
                          </div>
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                            openingBox && isSelected
                              ? "bg-purple-600 text-white shadow-xl rotate-12"
                              : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md hover:rotate-3"
                          }`}>
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25l9 5.25 9-5.25M3 11.25l9-5.25 9 5.25m-9-5.25V3" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                        {isOpened ? (isSelected ? "MENANG" : "TERBUKA") : "KETUK BUKA"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {mysteryWonCoins !== null && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">Hadiah telah ditambahkan ke dompet Anda</span>
                <span className="font-black text-sm">+{mysteryWonCoins.toLocaleString("id-ID")} Koin</span>
              </div>
            )}

            {!gameData.can_mystery_box && boxesResult === null && (
              <div className="p-3 text-center rounded-2xl bg-parchment text-ink-muted text-xs border border-hairline">
                Tiket Kotak Misteri hari ini sudah digunakan. Kunjungi kembali besok untuk kotak baru.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* --- TAB 3: KARTU GORES (SCRATCH CARD) --- */}
      {activeTab === "scratch" && (
        <div className="pt-1">
          <Card className="p-5 space-y-4 border border-hairline bg-canvas shadow-xl rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-ink">Kartu Gores Berhadiah</h2>
                  <p className="text-[11px] text-ink-muted">Gores perak pelindung untuk menemukan 3 nominal kembar</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                gameData.can_scratch
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-parchment text-ink-muted border border-hairline"
              }`}>
                {gameData.can_scratch ? "1 Tiket Gratis" : "Tiket Habis"}
              </span>
            </div>

            {/* Scratch Interactive Surface */}
            <div className="flex flex-col items-center justify-center py-2">
              {!scratchTiles && (
                <div className="w-full max-w-sm h-52 rounded-3xl border-2 border-dashed border-hairline bg-parchment/60 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">Ambil Kartu Gores Hari Ini</h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">Temukan 3 angka koin yang sama untuk klaim jackpot</p>
                  </div>
                  <Button
                    onClick={handleStartScratchCard}
                    disabled={!gameData.can_scratch || scratching}
                    isLoading={scratching}
                    className="px-6 h-10 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold"
                  >
                    {gameData.can_scratch ? "Mulai Menggores" : "Kembali Besok"}
                  </Button>
                </div>
              )}

              {scratchTiles && (
                <div className="w-full max-w-sm space-y-3">
                  {/* Container with Underneath Prize Grid and Overlaid Canvas */}
                  <div className="relative w-full h-52 rounded-3xl overflow-hidden shadow-2xl border-4 border-cyan-500/30 bg-slate-900">
                    {/* Underlying 6-Tile Grid */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-3">
                      {scratchTiles.map((val, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-cyan-500/20 p-2 shadow-inner"
                        >
                          <span className="text-[9px] uppercase font-bold text-cyan-400">KOIN RY</span>
                          <span className="font-black text-sm sm:text-base text-amber-400 drop-shadow-sm">
                            +{val.toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Canvas Scratch Layer */}
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                      onMouseDown={(e) => {
                        isScratchingRef.current = true;
                        scratchAtPoint(e.clientX, e.clientY);
                      }}
                      onMouseMove={(e) => {
                        if (isScratchingRef.current) {
                          scratchAtPoint(e.clientX, e.clientY);
                        }
                      }}
                      onMouseUp={() => {
                        isScratchingRef.current = false;
                      }}
                      onMouseLeave={() => {
                        isScratchingRef.current = false;
                      }}
                      onTouchStart={(e) => {
                        isScratchingRef.current = true;
                        if (e.touches[0]) {
                          scratchAtPoint(e.touches[0].clientX, e.touches[0].clientY);
                        }
                      }}
                      onTouchMove={(e) => {
                        if (isScratchingRef.current && e.touches[0]) {
                          scratchAtPoint(e.touches[0].clientX, e.touches[0].clientY);
                        }
                      }}
                      onTouchEnd={() => {
                        isScratchingRef.current = false;
                      }}
                    />
                  </div>

                  {/* Controls & Progress bar */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-muted">Terbuka: {scratchPercent}%</span>
                      <div className="w-20 h-2 rounded-full bg-parchment overflow-hidden border border-hairline">
                        <div
                          className="h-full bg-cyan-500 transition-all duration-300"
                          style={{ width: `${scratchPercent}%` }}
                        />
                      </div>
                    </div>

                    {!scratchRevealed && (
                      <button
                        type="button"
                        onClick={revealEntireCard}
                        className="px-3 py-1 rounded-full bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-[11px] text-primary transition-colors"
                      >
                        Buka Semua
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* --- TAB 4: KUIS CEPAT TEKNOLOGI (TRIVIA) --- */}
      {activeTab === "trivia" && (
        <div className="pt-1">
          <Card className="p-5 space-y-4 border border-hairline bg-canvas shadow-xl rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 10-3-3 3 3 0 003 3zm0 0v5.25m-6 3h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6A2.25 2.25 0 003.75 6.75v12A2.25 2.25 0 006 21z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-ink">Kuis Cepat Teknologi</h2>
                  <p className="text-[11px] text-ink-muted">Jawab 3 pertanyaan ringan untuk memenangkan hingga +45 Koin</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-parchment border border-hairline text-xs font-bold text-ink">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{triviaTimer}s</span>
              </div>
            </div>

            {/* Questions Step Flow */}
            {gameData.today_trivia_done && !triviaResult ? (
              <div className="p-6 text-center space-y-3 rounded-2xl bg-parchment border border-hairline">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">Kuis Hari Ini Sudah Selesai</h3>
                  <p className="text-[11px] text-ink-muted mt-1">
                    Anda telah mendapatkan bonus RyPoints dari kuis hari ini. Pertanyaan baru akan tersedia besok!
                  </p>
                </div>
              </div>
            ) : triviaResult ? (
              /* Results Screen */
              <div className="space-y-4 p-4 rounded-3xl bg-parchment/60 border border-hairline animate-in fade-in">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">HASIL KUIS HARIAN</span>
                  <h3 className="text-lg font-black text-ink">
                    Skor: {triviaResult.score} / {triviaResult.total} Benar
                  </h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                    +{triviaResult.coins_earned} RyPoints Diterima
                  </div>
                </div>

                {/* Explanation feedback */}
                <div className="space-y-2 pt-2">
                  {triviaResult.feedback?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-xs space-y-1 ${
                        item.is_correct
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Soal #{idx + 1}</span>
                        <span>{item.is_correct ? "Benar (+100)" : "Salah"}</span>
                      </div>
                      <p className="text-[11px]">{item.question}</p>
                      <p className="text-[10px] opacity-80 pt-0.5">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : triviaQuestions.length > 0 ? (
              /* Active Question Card */
              <div className="space-y-4">
                {/* Step indicator */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">Pertanyaan {triviaStep + 1} dari 3</span>
                  <span className="text-ink-muted text-[11px]">Pilih 1 jawaban</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-parchment overflow-hidden border border-hairline">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((triviaStep + 1) / 3) * 100}%` }}
                  />
                </div>

                {/* Question Box */}
                <div className="p-4 rounded-2xl bg-parchment/60 border border-hairline min-h-[70px] flex items-center">
                  <p className="font-bold text-xs sm:text-sm text-ink leading-relaxed">
                    {triviaQuestions[triviaStep]?.question}
                  </p>
                </div>

                {/* Options list */}
                <div className="space-y-2">
                  {triviaQuestions[triviaStep]?.options?.map((opt, optIdx) => {
                    const isSelected = triviaAnswers[triviaStep] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectTriviaAnswer(optIdx)}
                        className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-canvas hover:bg-parchment text-ink border-hairline"
                        }`}
                      >
                        <span>{opt}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-white bg-white/20" : "border-hairline"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Submit button on last step */}
                {triviaAnswers.length === 3 && (
                  <Button
                    onClick={handleSubmitTrivia}
                    isLoading={submittingTrivia}
                    className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md mt-2"
                  >
                    Kirim Jawaban &amp; Klaim Koin
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-ink-muted text-xs">
                Memuat pertanyaan kuis harian...
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. "RAIH BANYAK KOIN" TASK LIST SECTION                     */}
      {/* ============================================================ */}
      <div className="space-y-3 px-1">
        <h2 className="text-sm sm:text-base font-black text-ink">
          Raih Banyak Koin
        </h2>

        <div className="space-y-2">
          {[
            {
              title: "Check-In Harian",
              desc: "Klaim koin gratis setiap hari berturut-turut",
              reward: "+15 - 150 Koin",
              action: "Check In",
              onClick: handleDailyCheckin,
            },
            {
              title: "Kotak Misteri Harian",
              desc: "Buka peti keberuntungan dengan hadiah koin kejutan",
              reward: "s.d 150 Koin",
              action: "Buka",
              onClick: () => setActiveTab("mystery_box"),
            },
            {
              title: "Kartu Gores Berhadiah",
              desc: "Gores kartu digital dan temukan 3 petak kembar",
              reward: "s.d 100 Koin",
              action: "Gores",
              onClick: () => setActiveTab("scratch"),
            },
            {
              title: "Kuis Cepat Teknologi",
              desc: "Uji wawasan seputar IMEI dan gadget dalam 30 detik",
              reward: "s.d 45 Koin",
              action: "Mulai",
              onClick: () => setActiveTab("trivia"),
            },
            {
              title: "Order Buka IMEI All Operator",
              desc: "Dapatkan cashback koin setiap menyelesaikan order aktivasi",
              reward: "+1% Cashback Koin",
              action: "Belanja",
              onClick: () => router.push("/unblock-imei"),
            },
            {
              title: "Ajak Teman",
              desc: "Bagikan kode referral dan dapatkan koin serta komisi saldo",
              reward: "+500 Koin",
              action: "Ajak",
              onClick: () => router.push("/referral"),
            },
          ].map((task, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-canvas border border-hairline shadow-2xs flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-ink">{task.title}</p>
                <p className="text-[10px] text-ink-muted">{task.desc}</p>
                <span className="inline-block text-[10px] font-black text-amber-600">
                  {task.reward}
                </span>
              </div>
              <button
                type="button"
                onClick={task.onClick}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[11px] shrink-0 shadow-xs"
              >
                {task.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. COIN HISTORY MODAL                                       */}
      {/* ============================================================ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="max-w-md w-full bg-canvas border border-hairline p-5 rounded-3xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-black text-base text-ink">Riwayat RyPoints</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-full bg-parchment hover:bg-parchment/80 border border-hairline flex items-center justify-center text-xs text-ink"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {coinHistory.length === 0 ? (
                <div className="text-center py-8 text-ink-muted text-xs">
                  Belum ada riwayat perolehan koin.
                </div>
              ) : (
                coinHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-parchment/60 border border-hairline flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink">
                        {item.claim_type === "daily_checkin"
                          ? `Check-In Harian (Hari ke-${item.streak_count || 1})`
                          : item.claim_type === "lucky_spin"
                          ? "Hadiah Roda Hoki"
                          : item.claim_type === "mystery_box"
                          ? "Hadiah Kotak Misteri"
                          : item.claim_type === "scratch_card"
                          ? "Hadiah Kartu Gores"
                          : item.claim_type === "daily_trivia"
                          ? `Kuis Cepat (${item.streak_count || 0}/3 Benar)`
                          : "Bonus Koin"}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {new Date(item.claimed_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-black text-amber-600 text-sm">
                      +{item.coins_amount?.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
