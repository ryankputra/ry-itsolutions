"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import Swal from "sweetalert2";

export function EcommerceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [unread, setUnread] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check admin pending orders
  useEffect(() => {
    if (user?.role === "admin") {
      const checkOrders = async () => {
        try {
          const res = await fetch("/api/admin/manual-orders", { credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            if (d.status) {
              const pending = d.data.filter((o: any) => o.status === "pending");
              setPendingOrders(pending.length);
            }
          }
        } catch (e) {}
      };
      checkOrders();
      const interval = setInterval(checkOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Check system announcement
  useEffect(() => {
    fetch("/api/user/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (data.status && data.data?.message) {
          setAnnouncement(data.data);
        }
      })
      .catch(() => {});

    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (e) {
      router.push("/login");
    }
  };

  const services = [
    { title: "Buka Blokir IMEI (All Operator)", desc: "1 Bulan, 3 Bulan, Permanen", href: "/unblock-imei", tag: "Populer" },
    { title: "Cek Status CEIR Bea Cukai", desc: "Verifikasi pendaftaran database resmi", href: "/cek-ceir", tag: "Instan" },
    { title: "Cek Garansi & Lacak IMEI", desc: "Pantau masa aktif dan cetak nota digital", href: "/cek-garansi", tag: "Garansi" },
    { title: "Klaim Voucher Diskon", desc: "Kupon promo cashback & potongan harga", href: "/vouchers", tag: "Hemat" },
    { title: "Game Koin Harian", desc: "Check-in & Putar Roda Hoki untuk koin gratis", href: "/games", tag: "Gratis" },
    { title: "Program Referral Reseller", desc: "Ajak teman dan dapatkan komisi", href: "/referral", tag: "Cuan" },
    { title: "Isi Saldo (Top Up QRIS)", desc: "Deposit saldo instan otomatis 24 jam", href: "/topup", tag: "Instan" },
  ];

  const filteredServices = searchQuery.trim()
    ? services.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (/^\d{8,15}$/.test(clean)) {
      router.push(`/cek-garansi?imei=${clean}`);
      setShowSearchDropdown(false);
    } else if (filteredServices.length > 0) {
      router.push(filteredServices[0].href);
      setShowSearchDropdown(false);
    }
  };

  const navLinks = [
    { label: "Beranda", href: "/dashboard" },
    { label: "Buka IMEI", href: "/unblock-imei" },
    { label: "Cek CEIR", href: "/cek-ceir" },
    { label: "Cek Garansi", href: "/cek-garansi" },
    { label: "Klaim Voucher", href: "/vouchers" },
    { label: "Game Koin 🎡", href: "/games", badge: "Bonus" },
    { label: "Riwayat Order", href: "/history" },
    { label: "Bantuan & Tiket", href: "/tickets" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-hairline transition-all duration-200">
      {/* 1. Top Sub-Bar (Tokopedia/Shopee style) */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Server Aktif 24 Jam • QRIS Otomatis
            </span>
            <span className="hidden sm:inline-block text-slate-500">|</span>
            <span className="hidden sm:inline-block text-slate-300">
              Garansi Resmi &amp; Terverifikasi
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <Link href="/cek-garansi" className="hover:text-white transition-colors">
              Lacak Pesanan
            </Link>
            <Link href="/tickets" className="hover:text-white transition-colors">
              Pusat Bantuan
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="bg-primary/20 text-primary hover:bg-primary/30 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1"
              >
                <span>Admin Panel</span>
                {pendingOrders > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    {pendingOrders}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-4 sm:gap-8 justify-between">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-base tracking-tight text-ink block leading-none">
              Ry-ITSolutions
            </span>
            <span className="text-[10px] text-ink-muted font-semibold tracking-wider uppercase">
              Digital Marketplace
            </span>
          </div>
        </Link>

        {/* Central Search Bar (Shopee/Tokopedia large search) */}
        <div ref={searchRef} className="flex-1 max-w-2xl relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Cari layanan, ketik IMEI, atau cek garansi..."
                className="w-full h-11 pl-4 pr-11 rounded-2xl bg-parchment/60 hover:bg-parchment border border-hairline focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm text-ink outline-hidden transition-all shadow-2xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center font-bold text-xs shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-canvas rounded-2xl border border-hairline shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-[10px] font-bold text-ink-muted uppercase px-2 py-1 flex items-center justify-between">
                <span>Rekomendasi Layanan</span>
                <span className="text-primary">Ry-ITSolutions</span>
              </div>
              <div className="space-y-1 mt-1">
                {filteredServices.map((s, idx) => (
                  <Link
                    key={idx}
                    href={s.href}
                    onClick={() => setShowSearchDropdown(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment/80 transition-colors text-left group"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-ink-muted">{s.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] shrink-0">
                      {s.tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Hub: Coins, Vouchers, Notifications, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Coin Hub Button */}
          <Link
            href="/games"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 font-bold text-xs transition-all shadow-2xs group"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-[10px] font-black shadow-xs group-hover:rotate-12 transition-transform">
              🪙
            </div>
            <div>
              <span className="text-[9px] text-amber-900 block leading-tight">Koin Ry</span>
              <span className="text-xs font-black text-amber-700">
                {(user?.coins || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </Link>

          {/* Wallet Balance Pill */}
          <Link
            href="/topup"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary font-bold text-xs transition-all shadow-2xs group"
          >
            <svg className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
            <div className="text-left">
              <span className="text-[9px] text-ink-muted block leading-tight">Saldo Akun</span>
              <span className="text-xs font-black text-ink">
                Rp {(user?.balance || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </Link>

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotif(!showNotif);
                setUnread(false);
              }}
              className="w-10 h-10 rounded-xl bg-parchment/60 hover:bg-parchment border border-hairline flex items-center justify-center text-ink transition-colors relative"
            >
              <svg className="w-5 h-5 text-ink/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unread && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-canvas animate-ping"></span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-canvas rounded-2xl border border-hairline shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <span className="font-bold text-xs text-ink">Notifikasi &amp; Promo</span>
                  <span className="text-[10px] text-primary font-semibold">Tandai sudah dibaca</span>
                </div>
                <div className="py-3 space-y-2">
                  {announcement ? (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                      <p className="font-bold text-primary">{announcement.title || "Pengumuman Resmi"}</p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{announcement.message}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-ink-muted">
                      Belum ada notifikasi baru.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          {user ? (
            <div ref={userRef} className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-parchment/60 hover:bg-parchment border border-hairline transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center uppercase">
                  {user.name ? user.name[0] : "U"}
                </div>
                <span className="hidden md:inline-block font-bold text-xs text-ink max-w-[90px] truncate">
                  {user.name}
                </span>
                <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-canvas rounded-2xl border border-hairline shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-2.5 border-b border-hairline mb-1">
                    <p className="font-black text-xs text-ink truncate">{user.name}</p>
                    <p className="text-[10px] text-ink-muted truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-300 capitalize">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <Link
                      href="/topup"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink transition-colors"
                    >
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      <span>Isi Saldo (Top Up)</span>
                    </Link>
                    <Link
                      href="/games"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink transition-colors"
                    >
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m0 0a6 6 0 017.38-5.84v4.8m-7.38 1.04a14.98 14.98 0 00-6.16 12.12A14.98 14.98 0 0014.369 15.59m-5.96-5.96a14.926 14.926 0 015.841-2.58" />
                      </svg>
                      <span>Game &amp; Koin Ry</span>
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      <span>Riwayat Transaksi</span>
                    </Link>
                    <Link
                      href="/referral"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink transition-colors"
                    >
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <span>Referral &amp; Komisi</span>
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-primary/10 text-primary font-bold transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Panel Admin</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              Masuk / Daftar
            </Link>
          )}
        </div>
      </div>

      {/* 3. Sub-Header Navigation Tabs (Desktop only, Tokopedia category strip) */}
      <div className="hidden lg:block border-t border-hairline/80 bg-canvas/50">
        <div className="max-w-7xl mx-auto px-8 flex items-center gap-6 overflow-x-auto text-xs py-2">
          {navLinks.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={idx}
                href={item.href}
                className={`py-1 font-bold whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                  isActive ? "text-primary font-black" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary rounded-full"></span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
