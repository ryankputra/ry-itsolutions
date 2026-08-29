"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "sweetalert2";

export default function GamesPage() {
  const { user, setUser } = useApp();

  const [loading, setLoading] = useState(true);
  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  const [gameData, setGameData] = useState<{
    coins: number;
    can_checkin: boolean;
    current_streak: number;
    today_checkin_done: boolean;
    can_spin: boolean;
    rewards: number[];
  }>({
    coins: 0,
    can_checkin: false,
    current_streak: 1,
    today_checkin_done: false,
    can_spin: false,
    rewards: [100, 200, 300, 400, 500, 750, 1000],
  });

  const fetchGameStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/games/status", { credentials: "include" });
      const data = await res.json();
      if (data.status) {
        setGameData(data);
      }
    } catch (e) {
      console.error("Gagal mengambil status game:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameStatus();
  }, []);

  const triggerCelebration = () => {
    // Celebration animation handled via SweetAlert2
  };

  // 1. Handle Daily Checkin
  const handleDailyCheckin = async () => {
    if (!gameData.can_checkin) return;
    setClaimingCheckin(true);

    try {
      const res = await fetch("/api/games/daily-checkin", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.status) {
        triggerCelebration();
        Swal.fire({
          icon: "success",
          title: "Klaim Berhasil! 🎉",
          text: data.message,
          confirmButtonColor: "#f97316",
          confirmButtonText: "Mantap!",
        });

        // Update local user and game data
        if (user) {
          setUser({ ...user, coins: data.new_coins_balance });
        }
        setGameData((prev) => ({
          ...prev,
          coins: data.new_coins_balance,
          can_checkin: false,
          today_checkin_done: true,
          current_streak: data.streak,
        }));
      } else {
        Swal.fire({
          icon: "info",
          title: "Perhatian",
          text: data.message,
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan koneksi saat klaim koin.",
      });
    } finally {
      setClaimingCheckin(false);
    }
  };

  // 2. Handle Lucky Spin Wheel
  const prizes = [
    { amount: 250, label: "250", color: "#f97316" },
    { amount: 500, label: "500", color: "#2563eb" },
    { amount: 750, label: "750", color: "#059669" },
    { amount: 1000, label: "1.000", color: "#7c3aed" },
    { amount: 1500, label: "1.500", color: "#db2777" },
    { amount: 2500, label: "2.500", color: "#d97706" },
  ];

  const handleLuckySpin = async () => {
    if (!gameData.can_spin || spinningWheel) return;
    setSpinningWheel(true);

    try {
      const res = await fetch("/api/games/lucky-spin", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.status) {
        const prizeIdx = data.prize_index !== undefined ? data.prize_index : 0;
        // Calculate clockwise spin to land target sector under 12 o'clock needle
        const targetAngle = wheelRotation + (360 * 5) + ((6 - prizeIdx) % 6) * 60;
        setWheelRotation(targetAngle);

        setTimeout(() => {
          triggerCelebration();
          Swal.fire({
            icon: "success",
            title: "Selamat! 🎡✨",
            text: data.message,
            confirmButtonColor: "#f97316",
            confirmButtonText: "Kumpulkan Koin",
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
        });
      }
    } catch (e) {
      setSpinningWheel(false);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat memutar roda hoki.",
      });
    }
  };

  const userCoins = user?.coins !== undefined ? user.coins : gameData.coins;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Banner: Koin Rejeki Shopee Style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white">
              <span>🎮</span>
              <span>Ry Games &amp; Koin Diskon</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kumpulkan Koin, Hemat Belanja!
            </h1>
            <p className="text-xs sm:text-sm text-white/90 max-w-md">
              Klaim bonus koin harian dan putar roda keberuntungan untuk mendapatkan potongan langsung saat checkout pesanan.
            </p>
          </div>

          {/* Big Coin Balance Box */}
          <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-300 to-amber-500 flex items-center justify-center text-2xl shadow-md shrink-0">
              🪙
            </div>
            <div>
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider block">
                Total Koin Kamu
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                {userCoins.toLocaleString("id-ID")}
              </div>
              <span className="text-[10px] text-amber-200 font-semibold block mt-0.5">
                Nilai Diskon: Rp {userCoins.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Games (Check-in & Lucky Spin) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game 1: 7-Day Daily Check-In */}
        <Card className="p-6 space-y-5 border border-hairline bg-canvas shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm">
                  📅
                </div>
                <div>
                  <h2 className="font-bold text-base text-ink">Check-In Harian</h2>
                  <p className="text-[11px] text-ink-muted">
                    Check-in 7 hari berturut-turut untuk koin maksimal
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-black">
                Streak: {gameData.current_streak} Hari
              </span>
            </div>

            {/* 7 Days Reward Cards */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-3">
              {gameData.rewards.map((rew, idx) => {
                const dayNum = idx + 1;
                const isCurrent = dayNum === gameData.current_streak;
                const isClaimedPast = dayNum < gameData.current_streak || (isCurrent && gameData.today_checkin_done);

                return (
                  <div
                    key={dayNum}
                    className={`relative p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1 transition-all ${
                      isClaimedPast
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : isCurrent && !gameData.today_checkin_done
                        ? "bg-orange-50 border-orange-400 text-orange-950 ring-2 ring-orange-400/50 scale-105 shadow-md"
                        : "bg-parchment/60 border-hairline text-ink-muted opacity-75"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase">H-{dayNum}</span>
                    <span className="text-base my-0.5">
                      {isClaimedPast ? "✅" : dayNum === 7 ? "🎁" : "🪙"}
                    </span>
                    <span className="text-[10px] font-black leading-tight">
                      +{rew}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleDailyCheckin}
            disabled={!gameData.can_checkin || claimingCheckin}
            isLoading={claimingCheckin}
            className={`w-full h-12 text-sm font-bold shadow-lg rounded-2xl ${
              gameData.can_checkin
                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                : "bg-parchment text-ink-muted cursor-not-allowed"
            }`}
          >
            {gameData.today_checkin_done
              ? "✓ Sudah Check-In Hari Ini"
              : `Klaim +${gameData.rewards[gameData.current_streak - 1] || 100} Koin Sekarang`}
          </Button>
        </Card>

        {/* Game 2: Lucky Wheel Spin */}
        <Card className="p-6 space-y-5 border border-hairline bg-canvas shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm">
                  🎡
                </div>
                <div>
                  <h2 className="font-bold text-base text-ink">Roda Hoki Koin</h2>
                  <p className="text-[11px] text-ink-muted">
                    Putar gratis 1x sehari &amp; menangkan hingga 2.500 Koin
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                gameData.can_spin
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-parchment text-ink-muted border border-hairline"
              }`}>
                {gameData.can_spin ? "1 Tiket Tersedia" : "Sudah Diputar"}
              </span>
            </div>

            {/* Lucky Wheel Visual Display */}
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                {/* Center Pointer Needle (12 o'clock) */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-md">
                  <svg width="26" height="30" viewBox="0 0 24 28" fill="none">
                    <path
                      d="M12 28L3 4C2 2 3.5 0 5.5 0H18.5C20.5 0 22 2 21 4L12 28Z"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="7" r="3.5" fill="#ffffff" />
                  </svg>
                </div>

                {/* Rotating SVG Wheel Disc */}
                <div
                  className="w-full h-full rounded-full shadow-2xl relative overflow-hidden transition-transform duration-3000 ease-out"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Outer Gold Border Ring */}
                    <circle cx="100" cy="100" r="98" fill="#1e293b" stroke="#f59e0b" strokeWidth="4" />

                    {/* 6 Pie Slices with Numbers */}
                    {prizes.map((item, i) => (
                      <g key={i} transform={`rotate(${i * 60} 100 100)`}>
                        <path
                          d="M 100 100 L 55 22.06 A 90 90 0 0 1 145 22.06 Z"
                          fill={item.color}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Coin Amount Text on Slice */}
                        <g transform="translate(100, 48)">
                          <text
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="900"
                            fontFamily="system-ui, sans-serif"
                            style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" }}
                          >
                            {item.label}
                          </text>
                          <text
                            y="10"
                            textAnchor="middle"
                            fill="#fef08a"
                            fontSize="7.5"
                            fontWeight="800"
                            fontFamily="system-ui, sans-serif"
                          >
                            KOIN
                          </text>
                        </g>
                      </g>
                    ))}

                    {/* Outer Rim Light Bulbs */}
                    {[...Array(12)].map((_, i) => (
                      <circle
                        key={i}
                        cx={100 + 94 * Math.sin((i * 30 * Math.PI) / 180)}
                        cy={100 - 94 * Math.cos((i * 30 * Math.PI) / 180)}
                        r="2.2"
                        fill="#ffffff"
                      />
                    ))}

                    {/* Center Cap Button */}
                    <circle cx="100" cy="100" r="25" fill="#0f172a" stroke="#f59e0b" strokeWidth="3" />
                    <text
                      x="100"
                      y="103.5"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="900"
                      fontFamily="system-ui, sans-serif"
                      letterSpacing="1px"
                    >
                      SPIN
                    </text>
                  </svg>
                </div>
              </div>

              {/* Prize Grid Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 text-[10px] font-bold">
                {prizes.map((p, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-parchment border border-hairline text-ink">
                    🪙 {p.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleLuckySpin}
            disabled={!gameData.can_spin || spinningWheel}
            isLoading={spinningWheel}
            className={`w-full h-12 text-sm font-bold shadow-lg rounded-2xl ${
              gameData.can_spin
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                : "bg-parchment text-ink-muted cursor-not-allowed"
            }`}
          >
            {gameData.can_spin ? "🎡 Putar Roda Keberuntungan Sekarang" : "Tiket Habis • Kembali Besok"}
          </Button>
        </Card>
      </div>

      {/* Info Section: How to use Coins */}
      <Card className="p-6 space-y-4 border border-hairline bg-parchment/50">
        <h3 className="font-bold text-sm text-ink flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Panduan &amp; Keuntungan Koin Ry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-hairline space-y-1">
            <p className="font-bold text-ink">1. Kumpulkan Setiap Hari</p>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Dapatkan koin gratis setiap hari dari check-in streak dan putar roda keberuntungan tanpa batas.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-hairline space-y-1">
            <p className="font-bold text-ink">2. Nilai Tukar 1:1</p>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              1 Koin Ry bernilai <strong>Rp 1 Saldo Belanja</strong>. Semakin banyak koin, semakin hemat pesananmu!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-hairline space-y-1">
            <p className="font-bold text-ink">3. Tukarkan Saat Checkout</p>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Centang opsi <em>&quot;Tukarkan Koin&quot;</em> pada form pemesanan Buka IMEI untuk diskon seketika.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
