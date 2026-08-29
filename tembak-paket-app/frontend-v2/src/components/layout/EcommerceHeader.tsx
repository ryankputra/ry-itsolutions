"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export function EcommerceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, cartCount } = useApp();

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
          const lastSeen = localStorage.getItem("last_announcement");
          if (!lastSeen || lastSeen !== data.data.message) {
            setUnread(true);
          }
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {}
    setUser(null);
    router.push("/login");
  };

  const services = [
    { title: "Buka Blokir IMEI (All Operator)", desc: "1 Bulan, 3 Bulan, Garansi Resmi", href: "/unblock-imei", tag: "Populer" },
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
    { label: "Game Koin", href: "/games" },
    { label: "Riwayat Order", href: "/history" },
    { label: "Bantuan & Tiket", href: "/tickets" },
  ];

  return (
    <header className="sticky top-0 z-40 transition-all duration-200">
      {/* ============================================================ */}
      {/* MOBILE TOP HEADER (Signature Ry-ITSolutions Blue)            */}
      {/* ============================================================ */}
      <div className="lg:hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3 py-2 shadow-md flex items-center gap-2.5">
        {/* Search Bar (Clean White Input without Camera icon) */}
        <div ref={searchRef} className="flex-1 relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="w-full h-9 rounded-xl bg-white flex items-center px-2.5 shadow-xs">
              <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Cari layanan, ketik IMEI..."
                className="w-full h-full pl-2 pr-2 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
              />
            </div>
          </form>

          {/* Autocomplete Dropdown (Mobile) */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-canvas rounded-2xl border border-hairline shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-parchment text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink">{s.title}</p>
                      <p className="text-[10px] text-ink-muted">{s.desc}</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[9px] shrink-0">
                      {s.tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cart Icon with real Cart Count */}
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

        {/* Chat / CS WhatsApp Icon */}
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

      {/* ============================================================ */}
      {/* DESKTOP HEADER (Signature Sapphire Blue Theme)              */}
      {/* ============================================================ */}
      <div className="hidden lg:block bg-canvas/95 backdrop-blur-md border-b border-hairline">
        {/* 1. Top Sub-Bar */}
        <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Server Aktif 24 Jam • QRIS Otomatis
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">
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

        {/* 2. Main Desktop Header Bar */}
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-8 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-ink block leading-none">
                Ry-ITSolutions
              </span>
              <span className="text-[10px] text-ink-muted font-semibold tracking-wider uppercase">
                Digital Marketplace
              </span>
            </div>
          </Link>

          {/* Central Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Cari layanan, ketik IMEI, atau cek garansi..."
                  className="w-full h-11 pl-4 pr-11 rounded-2xl bg-parchment/60 hover:bg-parchment border border-hairline focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20 text-sm text-ink outline-none transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center font-bold text-xs shadow-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Desktop Right Action Hub */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Desktop Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-ink hover:text-primary transition-colors"
              title="Keranjang Belanja"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full min-w-[16px] h-4 px-1 text-[9px] font-black flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href="/games"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 font-bold text-xs transition-all shadow-2xs group"
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

            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-md hover:bg-amber-300 transition-all hover:scale-105"
                title="Buka Panel Admin (Owner)"
              >
                <span>👑</span>
                <span>ADMIN PANEL</span>
              </Link>
            )}

            {user ? (
              <div ref={userRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-parchment/60 hover:bg-parchment border border-hairline transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center uppercase overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar.startsWith("http") || user.avatar.startsWith("data:") ? user.avatar : `${user.avatar}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name ? user.name[0] : "U"
                    )}
                  </div>
                  <span className="font-bold text-xs text-ink max-w-[90px] truncate">
                    {user.name}
                  </span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-canvas rounded-2xl border border-hairline shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-hairline mb-1 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-xs text-ink truncate">{user.name}</p>
                        <p className="text-[10px] text-ink-muted truncate">{user.email}</p>
                      </div>
                      {user.role === "admin" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] uppercase shrink-0">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-xs">
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-900 dark:text-amber-300 font-bold hover:bg-amber-400/25 transition-colors mb-1"
                        >
                          <span>👑 Panel Kontrol Admin</span>
                        </Link>
                      )}
                      <Link href="/saya" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <span>👤 Akun Saya</span>
                      </Link>
                      <Link href="/cart" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <span>🛒 Keranjang Belanja</span>
                      </Link>
                      <Link href="/topup" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <span>💳 Isi Saldo</span>
                      </Link>
                      <Link href="/games" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <span>🎮 Game &amp; Koin Ry</span>
                      </Link>
                      <Link href="/history" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <span>📋 Riwayat Transaksi</span>
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-left">
                        <span>🚪 Keluar Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-md hover:opacity-90 transition-opacity"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>

        {/* 3. Sub-Header Category Tabs */}
        <div className="border-t border-hairline/80 bg-canvas/50">
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
                  {isActive && (
                    <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary rounded-full"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
