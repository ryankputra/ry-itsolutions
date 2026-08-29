"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { playCoinClaimSound, playWheelTickSound } from "@/lib/soundFx";

export default function GamesPage() {
  const { user, setUser } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<{
    coins: number;
    can_checkin: boolean;
    today_checkin_done: boolean;
    current_streak: number;
    can_spin: boolean;
  }>({
    coins: 0,
    can_checkin: true,
    today_checkin_done: false,
    current_streak: 1,
    can_spin: true,
  });

  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);

  // Fetch initial game state
  useEffect(() => {
    async function fetchGameState() {
      try {
        const res = await fetch("/api/games/status", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            const payload = data.data || data;
            setGameData({
              coins: payload.coins ?? 0,
              can_checkin: payload.can_checkin ?? true,
              today_checkin_done: payload.today_checkin_done ?? false,
              current_streak: Number(payload.current_streak) || 1,
              can_spin: payload.can_spin ?? true,
            });
          }
        }
      } catch (e) {
        console.error("Error loading games:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchGameState();
  }, []);

  const fetchCoinHistory = async () => {
    try {
      const res = await fetch("/api/games/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setCoinHistory(data.data || []);
        }
      }
    } catch (e) {}
  };

  // 1. Handle Daily Check-In
  const handleDailyCheckin = async () => {
    if (!gameData.can_checkin || claimingCheckin) return;
    setClaimingCheckin(true);

    try {
      const res = await fetch("/api/games/daily-checkin", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.status) {
        playCoinClaimSound();
        Swal.fire({
          icon: "success",
          title: "Klaim Berhasil!",
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
          can_checkin: false,
          today_checkin_done: true,
          current_streak: data.streak,
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

  // 2. Handle Lucky Spin Wheel
  const prizes = [
    { amount: 250, label: "250", color: "#0066cc" },
    { amount: 500, label: "500", color: "#4f46e5" },
    { amount: 750, label: "750", color: "#059669" },
    { amount: 1000, label: "1.000", color: "#7c3aed" },
    { amount: 1500, label: "1.500", color: "#0891b2" },
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
            title: "Selamat!",
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

  const userCoins = user?.coins || gameData.coins || 0;
  const rewards = [100, 150, 200, 250, 350, 500, 1000];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & COIN STATS HERO (Shopee Style Deep Blue)     */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-gradient-to-b from-blue-700 via-indigo-700 to-blue-900 text-white p-5 shadow-xl relative overflow-hidden">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 font-bold text-sm text-white/90 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-base font-black">Shopee Koin Rewards</span>
          </button>

          <Link
            href="/vouchers"
            className="p-1 text-white/90 hover:text-white transition-colors"
            title="Voucher Saya"
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
              <div className="w-9 h-9 rounded-full bg-yellow-400 text-amber-950 flex items-center justify-center font-black shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                {userCoins.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium">
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
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. FLOATING "KOIN CEK-IN" CARD                               */}
        {/* ============================================================ */}
        <div className="mt-5 rounded-2xl bg-white text-slate-900 p-4 shadow-xl border border-slate-100 relative">
          {/* Centered Top Header Tag */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-black px-4 py-0.5 rounded-full shadow-2xs">
            Koin Cek-In
          </div>

          {/* 7-Day Streak Grid */}
          <div className="grid grid-cols-7 gap-1 text-center pt-2 pb-3">
            {rewards.map((rewardAmount, idx) => {
              const dayNum = idx + 1;
              const currentStreak = gameData?.current_streak || 1;
              const isToday = dayNum === currentStreak;
              const isPastClaimed = dayNum < currentStreak || (isToday && !!gameData?.today_checkin_done);
              const isDay7 = dayNum === 7;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-between p-1 rounded-xl transition-all ${
                    isToday && !gameData?.today_checkin_done
                      ? "border-2 border-primary bg-blue-50/60 shadow-2xs"
                      : "bg-slate-50/80 border border-slate-200/60"
                  }`}
                >
                  {/* Top Tag: Amount */}
                  <span className={`text-[9px] font-black leading-tight ${
                    isPastClaimed ? "text-emerald-600" : isToday ? "text-primary" : "text-slate-500"
                  }`}>
                    +{rewardAmount}
                  </span>

                  {/* Icon */}
                  <div className="my-1 flex items-center justify-center">
                    {isPastClaimed ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    ) : isDay7 ? (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center shadow-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Day Label */}
                  <span className={`text-[8px] sm:text-[9px] font-bold ${
                    isToday ? "text-primary font-black" : "text-slate-500"
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
            disabled={!gameData?.can_checkin || claimingCheckin}
            isLoading={claimingCheckin}
            className={`w-full h-11 text-xs sm:text-sm font-black shadow-md rounded-xl ${
              gameData?.can_checkin
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-90 text-white"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {gameData?.today_checkin_done
              ? "Sudah Check-In Hari Ini"
              : `Dapatkan ekstra ${rewards[(gameData?.current_streak || 1) - 1] || 100} Koin sekarang`}
          </Button>

          {/* Sub Task Bar: Ajak Teman */}
          <div
            onClick={() => router.push("/referral")}
            className="mt-3 p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-primary text-white font-black text-[10px] flex items-center justify-center">
                Ry
              </span>
              <span className="text-[11px] font-bold text-slate-800">
                Ajak Teman Reseller, Dapat 500 Koin
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-primary text-white text-[10px] font-black uppercase">
              Ajak Sekarang
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. "DAPATKAN KOIN RY TAMBAHAN" SECTION                     */}
      {/* ============================================================ */}
      <div className="space-y-3 px-1">
        <h2 className="text-sm sm:text-base font-black text-primary flex items-center gap-1.5">
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
              bg: "bg-indigo-600 text-white",
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              ),
              onClick: () => {
                const el = document.getElementById("lucky-spin-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              },
            },
            {
              name: "Voucher",
              href: "/vouchers",
              bg: "bg-cyan-600 text-white",
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              ),
              onClick: () => router.push("/vouchers"),
            },
            {
              name: "Buka IMEI",
              href: "/unblock-imei",
              bg: "bg-blue-600 text-white",
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              ),
              onClick: () => router.push("/unblock-imei"),
            },
            {
              name: "Ajak Teman",
              href: "/referral",
              bg: "bg-emerald-600 text-white",
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              ),
              onClick: () => router.push("/referral"),
            },
            {
              name: "Cek Garansi",
              href: "/cek-garansi",
              bg: "bg-purple-600 text-white",
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
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
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-ink">Roda Hoki Koin</h2>
                <p className="text-[11px] text-ink-muted">
                  Putar gratis 1x sehari &amp; menangkan hingga 2.500 Koin
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              gameData.can_spin
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-slate-100 text-slate-500"
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
                  {/* Overlay text numbers on slices */}
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
                className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-blue-900 border-4 border-amber-400 shadow-xl flex flex-col items-center justify-center z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none"
              >
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
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
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {gameData.can_spin ? "Putar Roda Keberuntungan Sekarang" : "Tiket Habis • Kembali Besok"}
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
                <h3 className="font-black text-base text-ink">Riwayat Koin Ry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs text-slate-600"
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
