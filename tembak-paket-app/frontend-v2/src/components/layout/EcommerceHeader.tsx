"use client";
import { stripEmojis } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import { InstallAppButton } from "@/components/ui/InstallAppButton";

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
  const [showBarcodeMenu, setShowBarcodeMenu] = useState(true);

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
            if (d?.status && Array.isArray(d?.data)) {
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

  useEffect(() => {
    // Check system announcement
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

    // Dynamic Barcode Menu Toggle
    fetch("/api/services/status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.status && data.hasActiveBarcode !== undefined) {
          setShowBarcodeMenu(Boolean(data.hasActiveBarcode));
        }
      })
      .catch(() => setShowBarcodeMenu(true));

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
    { title: "Payment Gateway GoPay & QRIS (Unofficial)", desc: "Integrasi API terima pembayaran otomatis toko Anda", href: "/gateway", tag: "Developer" },
    { title: "Buka Blokir IMEI (All Operator)", desc: "1 Bulan, 3 Bulan, Garansi Resmi", href: "/unblock-imei", tag: "Populer" },
    { title: "Cek Status & Diagnostik IMEI", desc: "Verifikasi CEIR, Bea Cukai, Sinyal, DIGI & SF", href: "/cek-ceir", tag: "Instan" },
    { title: "Generator Barcode Device", desc: "Cetak barcode IMEI Samsung, Redmi & iOS 26", href: "/barcode", tag: "Alat" },
    { title: "Cek Garansi & Lacak IMEI", desc: "Pantau masa aktif dan cetak nota digital", href: "/cek-garansi", tag: "Garansi" },
    { title: "Klaim Voucher Diskon", desc: "Kupon promo cashback & potongan harga", href: "/vouchers", tag: "Hemat" },
    { title: "Game Koin Harian", desc: "Check-in & Putar Roda Hoki untuk koin gratis", href: "/games", tag: "Gratis" },
    { title: "Program Referral", desc: "Ajak teman dan dapatkan komisi", href: "/referral", tag: "Cuan" },
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

  const isGuestGateway = !user && Boolean(pathname && pathname.startsWith("/gateway"));

  const navLinks = isGuestGateway
    ? [{ label: "Payment Gateway", href: "/gateway" }]
    : [
        { label: "Beranda", href: "/dashboard" },
        { label: "Payment Gateway", href: "/gateway" },
        { label: "AI Chat", href: "/ai" },
        { label: "Buka IMEI", href: "/unblock-imei" },
        { label: "Cek CEIR", href: "/cek-ceir" },
        ...(showBarcodeMenu ? [{ label: "Create Barcode", href: "/barcode" }] : []),
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
      <div className="lg:hidden bg-white/85 dark:bg-[#161617]/85 backdrop-blur-xl text-[#1D1D1F] dark:text-[#F5F5F7] border-b border-black/[0.06] dark:border-white/[0.08] px-3 py-2 flex items-center gap-2 relative transition-colors">
        {/* Search Bar (Spacious Flex-1 with Auto-Width) */}
        <div ref={searchRef} data-tour="search-bar" className="flex-1 min-w-0 relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <div className="w-full h-9 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] border border-transparent focus-within:border-[#0071E3]/40 focus-within:bg-white dark:focus-within:bg-[#1C1C1E] flex items-center px-3 transition-all">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Cari layanan, ketik IMEI..."
                className="w-full h-full pl-2 pr-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 bg-transparent outline-none truncate"
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
              {/* Quick Tour Guide link inside dropdown so it is still easily accessible */}
              <div className="pt-2 mt-1 border-t border-hairline/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchDropdown(false);
                    window.dispatchEvent(new Event("open_app_tour"));
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Buka Panduan Aplikasi Interaktif</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Group (Clean, Uncrowded & Spacious) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Install App Button (Compact icon on mobile, auto-hides if already installed) */}
          <InstallAppButton variant="header" />

          {/* Panduan Tour Button (Shown on sm+ to keep small mobile screens spacious) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open_app_tour"))}
            className="hidden sm:flex p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 items-center gap-1 font-medium text-[11px]"
            title="Panduan Aplikasi Interaktif"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Notification Bell (Hidden on small mobile as it is already in Bottom Navigation) */}
          <Link
            href="/notifications"
            className="hidden sm:block relative p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Notifikasi & Promo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unread && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-black"></span>
            )}
          </Link>

          {/* Cart Icon with real Cart Count */}
          <Link
            href="/cart"
            className="relative p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Keranjang Belanja"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full min-w-[15px] h-3.5 px-1 text-[8px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Theme Toggle (Mobile) */}
          <ThemeToggle className="text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:bg-gray-800 !p-1.5 shrink-0 rounded-lg" />

          {/* Chat / CS WhatsApp Icon (Hidden on small mobile since permanent floating WhatsApp widget is active) */}
          <Link
            href="/tickets"
            className="hidden sm:block p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Pusat Bantuan CS"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP HEADER (Signature Sapphire Blue Theme)              */}
      {/* ============================================================ */}
      <div className="hidden lg:block bg-canvas/95 backdrop-blur-md border-b border-hairline">
        {/* 1. Top Sub-Bar */}
        <div className="bg-gray-50/90 dark:bg-slate-950/80 border-b border-gray-200/60 dark:border-gray-800/60 text-gray-500 text-[11px] py-1 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Server Aktif 24 Jam • QRIS Otomatis
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">
                Garansi Resmi &amp; Terverifikasi
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open_app_tour"))}
                className="hover:text-gray-900 dark:hover:text-white transition-colors font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Panduan Aplikasi</span>
              </button>
              <Link href="/cek-garansi" className="hover:text-white transition-colors">
                Lacak Pesanan
              </Link>
              <Link href="/tickets" className="hover:text-white transition-colors">
                Pusat Bantuan
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-85 px-2.5 py-0.5 rounded-full font-semibold transition-opacity flex items-center gap-1 text-[10px]"
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
            <div className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white block leading-none">
                Ry-ITSolutions
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5 block">
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
                  className="w-full h-9 pl-3.5 pr-10 rounded-lg bg-gray-50/80 hover:bg-gray-50 border border-gray-200/80 focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-300 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center font-medium text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Desktop Right Action Hub */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Desktop Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-ink hover:text-primary transition-colors"
              title="Notifikasi & Promo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-black"></span>
              )}
            </Link>

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
                <span className="absolute top-0.5 right-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full min-w-[15px] h-3.5 px-1 text-[8px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href="/games"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 text-gray-700 text-xs transition-all group"
            >
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9h-5v6h5"/><path d="M12 7v10"/></svg>
              <div>
                <span className="text-[9px] text-gray-400 font-medium block leading-tight">Koin Ry</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  {(user?.coins || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </Link>

            <Link
              href="/topup"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 text-gray-700 text-xs transition-all group"
            >
              <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
              <div className="text-left">
                <span className="text-[9px] text-gray-400 font-medium block leading-tight">Saldo</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  Rp {(user?.balance || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </Link>

            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-xs hover:bg-gray-800 transition-colors shadow-xs"
                title="Buka Panel Admin (Owner)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Admin</span>
              </Link>
            )}

            {/* Desktop Theme Toggle */}
            <ThemeToggle className="shrink-0" />

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
                      user.name ? (stripEmojis(user.name)[0] || "U") : "U"
                    )}
                  </div>
                  <span className="font-bold text-xs text-ink max-w-[90px] truncate">
                    {stripEmojis(user.name)}
                  </span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-canvas rounded-2xl border border-hairline shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-hairline mb-1 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-ink truncate">{stripEmojis(user.name)}</p>
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
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                          <span>Panel Kontrol Admin</span>
                        </Link>
                      )}
                      <Link href="/saya" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span>Akun Saya</span>
                      </Link>
                      <Link href="/cart" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        <span>Keranjang Belanja</span>
                      </Link>
                      <Link href="/topup" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                        </svg>
                        <span>Isi Saldo</span>
                      </Link>
                      <Link href="/games" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Game &amp; Koin Ry</span>
                      </Link>
                      <Link href="/history" className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment font-semibold text-ink">
                        <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        <span>Riwayat Transaksi</span>
                      </Link>

                      {/* Theme Toggle in Dropdown */}
                      <div className="pt-1 pb-1 border-t border-hairline/60 my-1">
                        <ThemeToggle variant="full" />
                      </div>

                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-left">
                        <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
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
                className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-xs"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>

        {/* 3. Sub-Header Category Tabs */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617]/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-8 flex items-center gap-6 overflow-x-auto text-xs py-2">
            {navLinks.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`py-1 font-medium whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                    isActive ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-primary rounded-full"></span>
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
