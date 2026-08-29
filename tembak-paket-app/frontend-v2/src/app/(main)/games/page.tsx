"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

export default function GamesPage() {
  const { user, setUser } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);

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

  const fetchCoinHistory = async () => {
    try {
      const res = await fetch("/api/games/history", { credentials: "include" });
      const data = await res.json();
      if (data.status && data.data) {
        setCoinHistory(data.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchGameStatus();
  }, []);

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
        Swal.fire({
          icon: "success",
          title: "Klaim Berhasil! 🎉",
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
        const targetAngle = wheelRotation + (360 * 5) + ((6 - prizeIdx) % 6) * 60;
        setWheelRotation(targetAngle);

        setTimeout(() => {
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
  const rewards = gameData.rewards || [100, 200, 300, 400, 500, 750, 1000];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* ============================================================ */}
      {/* 1. SHOPEE "KOIN SAYA" HERO TOP BAR                          */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-gradient-to-b from-amber-500 to-amber-600 text-white p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Top Mini Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-white font-bold text-sm hover:opacity-80 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-base font-black">Koin Saya</span>
          </button>

          <Link
            href="/vouchers"
            className="text-white hover:opacity-80 transition-opacity p-1"
            title="Klaim Voucher Diskon"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </Link>
        </div>

        {/* Big Coin Balance Display */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-yellow-300 text-amber-950 flex items-center justify-center font-black text-xl shadow-md">
                🪙
              </div>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                {userCoins.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="text-[11px] text-amber-100 font-medium">
              {userCoins.toLocaleString("id-ID")} Koin kedaluwarsa pada 30-11-2026
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchCoinHistory();
              setShowHistoryModal(true);
            }}
            className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Riwayat</span>
            <span>➔</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. FLOATING "KOIN CEK-IN" CARD (Persis Sesuai Screenshot)   */}
        {/* ============================================================ */}
        <div className="mt-5 rounded-2xl bg-white text-slate-900 p-4 shadow-xl border border-slate-100 relative">
          {/* Centered Top Header Tag */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-black px-4 py-0.5 rounded-full shadow-2xs">
            Koin Cek-In
          </div>

          {/* 7-Day Streak Grid */}
          <div className="grid grid-cols-7 gap-1 text-center pt-2 pb-3">
            {rewards.map((rewardAmount, idx) => {
              const dayNum = idx + 1;
              const isToday = dayNum === gameData.current_streak;
              const isPastClaimed = dayNum < gameData.current_streak || (isToday && gameData.today_checkin_done);
              const isDay7 = dayNum === 7;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-between p-1 rounded-xl transition-all ${
                    isToday && !gameData.today_checkin_done
                      ? "border-2 border-orange-500 bg-orange-50/50 shadow-2xs"
                      : "bg-slate-50/80 border border-slate-200/60"
                  }`}
                >
                  {/* Top Tag: Amount */}
                  <span className={`text-[9px] font-black leading-tight ${
                    isPastClaimed ? "text-emerald-600" : isToday ? "text-orange-600" : "text-slate-500"
                  }`}>
                    +{rewardAmount}
                  </span>

                  {/* Icon */}
                  <div className="my-1 flex items-center justify-center">
                    {isPastClaimed ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ✓
                      </div>
                    ) : isDay7 ? (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-xs shadow-xs">
                        🎁
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                        🪙
                      </div>
                    )}
                  </div>

                  {/* Day Label */}
                  <span className={`text-[8px] sm:text-[9px] font-bold ${
                    isToday ? "text-orange-600" : "text-slate-500"
                  }`}>
                    {dayNum === 1 ? "Hari ini" : `Hari ${dayNum}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Primary Action Button */}
          <Button
            onClick={handleDailyCheckin}
            disabled={!gameData.can_checkin || claimingCheckin}
            isLoading={claimingCheckin}
            className={`w-full h-11 text-xs sm:text-sm font-black shadow-md rounded-xl ${
              gameData.can_checkin
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-orange-600 hover:opacity-90 text-white"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {gameData.today_checkin_done
              ? "✓ Sudah Check-In Hari Ini"
              : `Dapatkan ekstra 🪙 ${rewards[gameData.current_streak - 1] || 100} sekarang`}
          </Button>

          {/* Sub Task Bar: Ajak Teman */}
          <div
            onClick={() => router.push("/referral")}
            className="mt-3 p-2.5 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-between cursor-pointer hover:bg-orange-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-orange-500 text-white font-black text-[10px] flex items-center justify-center">
                Ry
              </span>
              <span className="text-[11px] font-bold text-slate-800">
                Ajak Teman Reseller, Dapat 🪙 500
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white text-[10px] font-black uppercase">
              Ajak Sekarang
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. "DAPATKAN KOIN RY TAMBAHAN" SECTION                     */}
      {/* ============================================================ */}
      <div className="space-y-3 px-1">
        <h2 className="text-sm sm:text-base font-black text-rose-600 flex items-center gap-1.5">
          <span>Dapatkan Koin Ry Tambahan</span>
        </h2>

        {/* Promo Event Card */}
        <div
          onClick={() => {
            const el = document.getElementById("lucky-spin-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="rounded-2xl p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-md flex items-center justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="space-y-1 relative z-10">
            <span className="inline-block bg-amber-400 text-amber-950 text-[8px] font-black px-1.5 py-0.2 rounded uppercase">
              SPESIAL REJEKI
            </span>
            <h3 className="text-xs sm:text-sm font-black leading-tight">
              Putar Roda Hoki • Hadiah s.d 2.500 Koin!
            </h3>
            <p className="text-[10px] text-blue-200">1x Putar Gratis Setiap Hari</p>
          </div>
          <button className="relative z-10 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-black text-[10px] sm:text-xs shadow-md group-hover:bg-yellow-300 transition-colors shrink-0">
            MAIN SEKARANG
          </button>
        </div>

        {/* Mini Game Apps Launcher */}
        <div className="grid grid-cols-5 gap-2 text-center pt-1">
          {[
            {
              name: "Roda Hoki",
              href: "#lucky-spin-section",
              bg: "bg-rose-500 text-white",
              icon: "🎡",
              onClick: () => {
                const el = document.getElementById("lucky-spin-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              },
            },
            {
              name: "Voucher",
              href: "/vouchers",
              bg: "bg-orange-500 text-white",
              icon: "🎟️",
              onClick: () => router.push("/vouchers"),
            },
            {
              name: "Buka IMEI",
              href: "/unblock-imei",
              bg: "bg-blue-600 text-white",
              icon: "📱",
              onClick: () => router.push("/unblock-imei"),
            },
            {
              name: "Ajak Teman",
              href: "/referral",
              bg: "bg-emerald-600 text-white",
              icon: "👥",
              onClick: () => router.push("/referral"),
            },
            {
              name: "Cek Garansi",
              href: "/cek-garansi",
              bg: "bg-purple-600 text-white",
              icon: "🛡️",
              onClick: () => router.push("/cek-garansi"),
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="flex flex-col items-center group focus:outline-none"
            >
              <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-800 mt-1.5 leading-tight">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LUCKY SPIN WHEEL INTERACTIVE SECTION                     */}
      {/* ============================================================ */}
      <div id="lucky-spin-section" className="pt-2">
        <Card className="p-5 space-y-4 border border-hairline bg-canvas shadow-xl rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm">
                🎡
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-ink">Roda Hoki Koin</h2>
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

          {/* Lucky Wheel SVG Display */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              {/* Pointer Needle */}
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-md">
                <svg width="26" height="30" viewBox="0 0 24 28" fill="none">
                  <path
                    d="M12 28L3 4C2 2 3.5 0 5.5 0H18.5C20.5 0 22 2 21 4L12 28Z"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <circle cx="12" cy="7" r="3.5" fill="#ffffff" />
                </svg>
              </div>

              {/* Rotating SVG Disc */}
              <div
                className="w-full h-full rounded-full shadow-2xl relative overflow-hidden transition-transform duration-3000 ease-out"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <circle cx="100" cy="100" r="98" fill="#1e293b" stroke="#f59e0b" strokeWidth="4" />
                  {prizes.map((item, i) => (
                    <g key={i} transform={`rotate(${i * 60} 100 100)`}>
                      <path
                        d="M 100 100 L 55 22.06 A 90 90 0 0 1 145 22.06 Z"
                        fill={item.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
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
                  {[...Array(12)].map((_, i) => (
                    <circle
                      key={i}
                      cx={100 + 94 * Math.sin((i * 30 * Math.PI) / 180)}
                      cy={100 - 94 * Math.cos((i * 30 * Math.PI) / 180)}
                      r="2.2"
                      fill="#ffffff"
                    />
                  ))}
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
                  >
                    SPIN
                  </text>
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
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {gameData.can_spin ? "🎡 Putar Roda Keberuntungan Sekarang" : "Tiket Habis • Kembali Besok"}
          </Button>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 5. "RAIH BANYAK KOIN" TASK LIST SECTION                     */}
      {/* ============================================================ */}
      <div className="space-y-3 px-1">
        <h2 className="text-sm sm:text-base font-black text-slate-800">
          Raih Banyak Koin
        </h2>

        <div className="space-y-2">
          {[
            {
              title: "Check-In Harian",
              desc: "Klaim koin gratis setiap hari berturut-turut",
              reward: "+100 - 1.000 Koin",
              action: "Check In",
              onClick: handleDailyCheckin,
            },
            {
              title: "Order Buka IMEI All Operator",
              desc: "Dapatkan cashback koin setiap menyelesaikan order aktivasi",
              reward: "+1% Cashback Koin",
              action: "Belanja",
              onClick: () => router.push("/unblock-imei"),
            },
            {
              title: "Ajak Teman Reseller",
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
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shrink-0 shadow-xs"
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
                <span className="text-xl">🪙</span>
                <h3 className="font-black text-base text-ink">Riwayat Koin Ry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600"
              >
                ✕
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
