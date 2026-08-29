"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "Format Salah", text: "Pilih file gambar (JPG, PNG, WEBP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Ukuran Terlalu Besar", text: "Ukuran maksimal foto adalah 5MB." });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await safeJson(res);
      if (data?.status && data.avatar) {
        setUser(user ? { ...user, avatar: data.avatar } : null);
        Swal.fire({
          icon: "success",
          title: "Foto Profil Diperbarui",
          text: "Foto profil akun Anda berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: "error", title: "Gagal Mengunggah", text: data?.message || "Terjadi kesalahan." });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengunggah foto profil." });
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        {/* Top Mini Icons (Cart, Chat) */}
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
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-white text-blue-900 flex items-center justify-center font-black text-2xl shadow-lg uppercase shrink-0 relative cursor-pointer group border-2 border-white/40 overflow-hidden"
            title="Klik untuk ubah foto profil"
          >
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith("http") || user.avatar.startsWith("data:") ? user.avatar : `${user.avatar}`}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              username[0]
            )}

            {/* Hover overlay with Camera Icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base sm:text-lg text-white truncate drop-shadow-xs">
                {username}
              </h2>
              {user?.role === "admin" ? (
                <Link
                  href="/admin"
                  className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider shadow-sm hover:scale-105 transition-transform shrink-0 flex items-center gap-1.5"
                  title="Masuk ke Dashboard Admin"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span>ADMIN PANEL</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shrink-0 flex items-center gap-1">
                  <span>MEMBER VIP</span>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-[11px] text-blue-100 font-mono truncate">
              {user?.email || user?.phone || "ID: #" + (user?.id ? user.id.substring(0, 10) : "user")}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-blue-200 hover:text-white font-bold inline-flex items-center gap-1 mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span>Ganti Foto Profil</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Program Referral Reseller Strip                              */}
        {/* ============================================================ */}
        <div
          onClick={() => router.push("/referral")}
          className="mt-4 p-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-between cursor-pointer shadow-md hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-black text-amber-300 font-black text-[9px] uppercase tracking-wider">
              REFERRAL
            </span>
            <span className="text-[11px] font-black">
              Ajak Teman Reseller &amp; Dapatkan Komisi Saldo
            </span>
          </div>
          <svg className="w-4 h-4 font-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1.5. DEDICATED ADMIN CONTROL CARD (Khusus Role Admin / Owner) */}
      {/* ============================================================ */}
      {user?.role === "admin" && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white border border-amber-400/40 p-4 sm:p-5 shadow-xl space-y-3.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </span>
              <div>
                <h3 className="font-black text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                  <span>Panel Kontrol Admin (Owner)</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-bold">Aktif</span>
                </h3>
                <p className="text-[10px] text-slate-300">
                  Manajemen sistem, pengerjaan order manual &amp; pengaturan promo
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform hover:scale-105 shrink-0 flex items-center gap-1"
            >
              <span>Buka Panel</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            {/* Dashboard */}
            <Link
              href="/admin"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Dashboard</span>
              <span className="text-[9px] text-amber-400 font-medium">Statistik Toko</span>
            </Link>

            {/* Order Manual */}
            <Link
              href="/admin#manual-orders"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Order Manual</span>
              <span className="text-[9px] text-amber-400 font-medium">Proses IMEI</span>
            </Link>

            {/* Kelola Kupon */}
            <Link
              href="/admin#coupons"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Kelola Kupon</span>
              <span className="text-[9px] text-amber-400 font-medium">Promo &amp; Diskon</span>
            </Link>

            {/* Pengaturan */}
            <Link
              href="/admin#settings"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Pengaturan</span>
              <span className="text-[9px] text-amber-400 font-medium">Maintenance</span>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PESANAN SAYA CARD (Persis Sesuai Screenshot)              */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-hairline/80 pb-2.5">
          <h3 className="font-black text-xs sm:text-sm text-ink">Pesanan Saya</h3>
          <Link
            href="/history"
            className="text-[11px] font-bold text-ink-muted hover:text-primary transition-colors flex items-center gap-1"
          >
            <span>Lihat Riwayat Pesanan</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {/* 4 Status Icons */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          {[
            {
              label: "Belum Bayar",
              href: "/history?tab=unpaid",
              badge: orderCounts.pending > 0 ? orderCounts.pending : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              ),
            },
            {
              label: "Diproses",
              href: "/history?tab=processing",
              badge: orderCounts.processing > 0 ? orderCounts.processing : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              ),
            },
            {
              label: "Selesai",
              href: "/history?tab=completed",
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
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Aktivasi IMEI &amp; CEIR
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              <span>Order Sekarang</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>

          <div
            onClick={() => router.push("/cek-garansi")}
            className="flex items-center justify-between py-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Lacak Nota &amp; Garansi Digital
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Garansi Resmi</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
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
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-primary flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
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
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
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
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
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
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <span>Hubungi CS WhatsApp 24 Jam</span>
            </div>
            <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <Link
            href="/cek-garansi"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment font-bold text-ink transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Cek Status &amp; Garansi Layanan</span>
            </div>
            <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <span>Keluar dari Akun</span>
            </div>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
