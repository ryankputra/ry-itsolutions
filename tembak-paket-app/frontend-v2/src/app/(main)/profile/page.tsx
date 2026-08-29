"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { safeJson } from "@/lib/api";

export default function ProfilePage() {
  const { user, setUser, cartCount } = useApp();
  const router = useRouter();

  const [vouchersCount, setVouchersCount] = useState(0);
  const [orderCounts, setOrderCounts] = useState({
    pending: 0,
    processing: 0,
    success: 0,
  });

  useEffect(() => {
    // Fetch transaction counts
    fetch("/api/user/transactions", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          const pending = data.data.filter((t: any) => t.status === "pending").length;
          const processing = data.data.filter((t: any) => t.status === "processing").length;
          const success = data.data.filter((t: any) => t.status === "success" || t.status === "completed").length;
          setOrderCounts({ pending, processing, success });
        }
      })
      .catch(() => {});

    // Fetch public vouchers count
    fetch("/api/coupons/public", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          setVouchersCount(data.data.length);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari akun?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (isConfirmed) {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {}
      setUser(null);
      router.push("/login");
    }
  };

  const userCoins = user?.coins || 0;
  const userBalance = user?.balance || 0;
  const username = user?.name || user?.email?.split("@")[0] || "Pengguna Ry";

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-24">
      {/* ============================================================ */}
      {/* 1. TOP PROFILE HEADER BAR (Signature Sapphire Blue)         */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-gradient-to-b from-blue-700 via-indigo-700 to-blue-900 text-white p-5 shadow-xl relative overflow-hidden">
        {/* Top Mini Icons (Settings, Cart, Chat) */}
        <div className="flex items-center justify-end gap-3 mb-3">
          <Link
            href="/cart"
            className="relative p-1.5 text-white hover:opacity-80 transition-opacity"
            title="Keranjang Belanja"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white rounded-full min-w-[16px] h-4 px-1 text-[9px] font-black flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/tickets"
            className="p-1.5 text-white hover:opacity-80 transition-opacity"
            title="Pusat Bantuan CS"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
        </div>

        {/* User Info Row */}
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-white text-blue-900 flex items-center justify-center font-black text-2xl shadow-lg uppercase shrink-0">
            {username[0]}
          </div>

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base sm:text-lg text-white truncate drop-shadow-xs">
                {username}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shrink-0">
                {user?.role === "admin" ? "Admin" : "Member VIP"} ➔
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-mono truncate">
              {user?.email || user?.phone || "ID: #" + (user?.id ? user.id.substring(0, 10) : "user")}
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIP Strip Card                                              */}
        {/* ============================================================ */}
        <div
          onClick={() => router.push("/referral")}
          className="mt-4 p-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-between cursor-pointer shadow-md hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-black text-amber-400 font-black text-[9px] uppercase">
              VIP+
            </span>
            <span className="text-[11px] font-black">
              Dapatkan Extra Diskon &amp; Prioritas Server
            </span>
          </div>
          <span className="text-xs font-black">➔</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PESANAN SAYA CARD (Persis Sesuai Screenshot)              */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-hairline/80 pb-2.5">
          <h3 className="font-black text-xs sm:text-sm text-ink">Pesanan Saya</h3>
          <Link
            href="/history"
            className="text-[11px] font-bold text-ink-muted hover:text-primary transition-colors flex items-center gap-0.5"
          >
            <span>Lihat Riwayat Pesanan</span>
            <span>➔</span>
          </Link>
        </div>

        {/* 4 Status Icons */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          {[
            {
              label: "Belum Bayar",
              href: "/history",
              badge: orderCounts.pending > 0 ? orderCounts.pending : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              ),
            },
            {
              label: "Diproses",
              href: "/history",
              badge: orderCounts.processing > 0 ? orderCounts.processing : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              ),
            },
            {
              label: "Selesai",
              href: "/history",
              badge: null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: "Pusat Bantuan",
              href: "/tickets",
              badge: null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              ),
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-center p-1 group focus:outline-none"
            >
              <div className="relative text-ink group-hover:text-primary transition-colors">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-ink mt-1.5 leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Sub Links */}
        <div className="pt-2 border-t border-hairline/80 space-y-2">
          <div
            onClick={() => router.push("/unblock-imei")}
            className="flex items-center justify-between py-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📱</span>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Aktivasi IMEI &amp; CEIR
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary">
              Order Sekarang ➔
            </span>
          </div>

          <div
            onClick={() => router.push("/cek-garansi")}
            className="flex items-center justify-between py-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Lacak Nota &amp; Garansi Digital
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600">
              Garansi Resmi ➔
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. DOMPET SAYA CARD (Persis Sesuai Screenshot)               */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3.5">
        <h3 className="font-black text-xs sm:text-sm text-ink border-b border-hairline/80 pb-2.5">
          Dompet &amp; Keuangan Saya
        </h3>

        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 1. Saldo Ry */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 text-primary flex items-center justify-center text-base shadow-2xs group-hover:scale-105 transition-transform">
              💳
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Saldo Ry</span>
            <span className="text-[9px] font-bold text-primary mt-0.5">
              Rp {userBalance.toLocaleString("id-ID")}
            </span>
          </div>

          {/* 2. Koin Ry */}
          <div
            onClick={() => router.push("/games")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-base shadow-2xs group-hover:scale-105 transition-transform">
              🪙
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Koin Ry</span>
            <span className="text-[9px] font-bold text-amber-600 mt-0.5">
              {userCoins.toLocaleString("id-ID")} Koin
            </span>
          </div>

          {/* 3. Voucher Saya */}
          <div
            onClick={() => router.push("/vouchers")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center text-base shadow-2xs group-hover:scale-105 transition-transform">
              🎟️
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Voucher</span>
            <span className="text-[9px] font-bold text-cyan-600 mt-0.5">
              {vouchersCount} Kupon
            </span>
          </div>

          {/* 4. Referral */}
          <div
            onClick={() => router.push("/referral")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-base shadow-2xs group-hover:scale-105 transition-transform">
              👥
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Referral</span>
            <span className="text-[9px] font-bold text-purple-600 mt-0.5">
              Komisi Saldo
            </span>
          </div>
        </div>

        {/* Promo Reseller Banner */}
        <div
          onClick={() => router.push("/referral")}
          className="p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary text-white font-black text-[10px] flex items-center justify-center">
              Ry
            </span>
            <span className="text-[11px] font-bold text-slate-800">
              Ajak Teman Reseller, Dapat Komisi Saldo Instan
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-primary text-white text-[10px] font-black uppercase">
            Mulai
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PUSAT BANTUAN & PENGATURAN AKUN                           */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-2">
        <h3 className="font-black text-xs sm:text-sm text-ink border-b border-hairline/80 pb-2.5">
          Pusat Bantuan &amp; Keamanan
        </h3>

        <div className="space-y-1 text-xs">
          <Link
            href="/tickets"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment font-bold text-ink transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🎧</span>
              <span>Hubungi CS WhatsApp 24 Jam</span>
            </div>
            <span className="text-ink-muted">➔</span>
          </Link>

          <Link
            href="/cek-garansi"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment font-bold text-ink transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">📋</span>
              <span>Cek Status &amp; Garansi Layanan</span>
            </div>
            <span className="text-ink-muted">➔</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚪</span>
              <span>Keluar dari Akun</span>
            </div>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
