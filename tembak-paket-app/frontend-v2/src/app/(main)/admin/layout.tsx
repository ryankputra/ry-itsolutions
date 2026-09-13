"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { safeJson } from "@/lib/api";
import { AdminOnlineUsersModal, OnlineUser } from "@/components/admin/AdminOnlineUsersModal";
import {
  LayoutDashboard,
  Clock,
  Headphones,
  Users,
  Smartphone,
  Package,
  QrCode,
  Ticket,
  Megaphone,
  Share2,
  Palette,
  Settings,
  MessageSquare,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Shield,
  RotateCw,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Navigation Items
  const adminNavItems = [
    { href: "/admin", label: "Ikhtisar", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Antrean Pesanan", icon: Clock },
    { href: "/admin/imei", label: "Layanan IMEI & CEIR", icon: Smartphone },
    { href: "/admin/users", label: "Kelola Pengguna", icon: Users },
    { href: "/admin/packages", label: "Paket Kuota", icon: Package },
    { href: "/admin/gateway", label: "Gateway GoPay & QRIS", icon: QrCode },
    { href: "/admin/tickets", label: "Pusat Bantuan CS", icon: Headphones },
    { href: "/admin/vouchers", label: "Kupon Diskon", icon: Ticket },
    { href: "/admin/broadcast", label: "Broadcast Promo", icon: Megaphone },
    { href: "/admin/referral", label: "Program Referral", icon: Share2 },
    { href: "/admin/theme", label: "Tema & Momentum", icon: Palette },
    { href: "/admin/logs", label: "Log Aktivitas", icon: Activity },
    { href: "/admin/settings", label: "Pengaturan & Server", icon: Settings },
    { href: "/admin/reviews", label: "Ulasan Pelanggan", icon: MessageSquare },
  ];

  // Top Metric States
  const [presenceStats, setPresenceStats] = useState<{ totalOnline: number; onlineUsers: OnlineUser[] }>({
    totalOnline: 0,
    onlineUsers: [],
  });
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [providerBalances, setProviderBalances] = useState<{ kmsp: number | null; ceirgo: number | null }>({
    kmsp: null,
    ceirgo: null,
  });
  const [ceirgoStatus, setCeirgoStatus] = useState<{ connected: boolean; error: string | null; loading: boolean }>({
    connected: false,
    error: null,
    loading: true,
  });
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // Horizontal Scroll Nav States
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Protect Admin Access
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  // Load Realtime Data
  const loadPresenceStats = async () => {
    try {
      const res = await fetch("/api/admin/presence", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status) {
        setPresenceStats({
          totalOnline: Number(data.totalOnline) || 0,
          onlineUsers: Array.isArray(data.onlineUsers) ? data.onlineUsers : [],
        });
      }
    } catch (e) {}
  };

  const loadProviderBalances = async () => {
    setRefreshingBalance(true);
    try {
      const res = await fetch("/api/admin/provider-balances", { credentials: "include" });
      const d = await safeJson(res);
      const c = d?.ceirgoBalance ?? d?.balance ?? d?.data?.ceirgoBalance ?? d?.data?.balance;
      const k = d?.kmspBalance ?? d?.data?.kmspBalance ?? d?.data?.balance;
      if (c != null && !isNaN(Number(c))) setProviderBalances((prev) => ({ ...prev, ceirgo: Number(c) }));
      if (k != null && !isNaN(Number(k))) setProviderBalances((prev) => ({ ...prev, kmsp: Number(k) }));
      if (d?.connected != null || d?.ceirgoConnected != null || d?.ceirgoError) {
        const isConn = Boolean(d?.connected ?? d?.ceirgoConnected ?? false);
        setCeirgoStatus({
          connected: isConn,
          error: d?.ceirgoError ?? (!isConn ? d?.message || "Server tidak dapat dijangkau" : null),
          loading: false,
        });
      }
    } catch (e) {
      setCeirgoStatus({ connected: false, error: "Gagal terhubung ke server", loading: false });
    } finally {
      setRefreshingBalance(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadPresenceStats();
      loadProviderBalances();
      const interval = setInterval(loadPresenceStats, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Nav Scroll Helpers
  const checkScroll = () => {
    if (!menuScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = menuScrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  // Auto scroll active tab into view
  useEffect(() => {
    if (!menuScrollRef.current) return;
    const activeEl = menuScrollRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [pathname]);

  const scrollMenu = (direction: "left" | "right") => {
    if (!menuScrollRef.current) return;
    const offset = direction === "left" ? -220 : 220;
    menuScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (userLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-ink-muted">
        Memvalidasi akses administrator...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-28 pt-2 px-3 sm:px-4">
      {/* 1. Header Bar: Status Server & Administrator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-canvas border border-hairline p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-ink tracking-tight">
                Panel Kontrol Administrator
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Pusat konfigurasi layanan, antrean pesanan, manajemen pengguna, dan server.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Online Presence Indicator */}
          <button
            type="button"
            onClick={() => setShowOnlineModal(true)}
            className="h-9 px-3 text-xs font-semibold rounded-xl bg-parchment hover:bg-hairline text-ink border border-hairline transition-colors flex items-center gap-2 shrink-0"
            title="Daftar Pengguna Online"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{presenceStats.totalOnline} Pengguna Online</span>
          </button>

          {/* Refresh Balances Button */}
          <button
            type="button"
            onClick={loadProviderBalances}
            disabled={refreshingBalance}
            className="h-9 px-3 text-xs font-semibold rounded-xl bg-parchment hover:bg-hairline text-ink border border-hairline transition-colors flex items-center gap-1.5 shrink-0"
            title="Segarkan Saldo Provider"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshingBalance ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Navigation Bar (SVG Only - No Emojis) */}
      <div className="bg-canvas border border-hairline p-2 sm:p-2.5 rounded-2xl shadow-xs space-y-2">
        {/* Mobile Quick Dropdown */}
        <div className="block sm:hidden">
          <div className="relative">
            <select
              value={pathname}
              onChange={(e) => router.push(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-parchment/80 border border-hairline text-xs font-bold text-ink focus:outline-none focus:border-primary appearance-none transition-all cursor-pointer"
            >
              {adminNavItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Scrollable Horizontal Navigation Bar */}
        <div className="relative flex items-center gap-1 sm:gap-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollMenu("left")}
            disabled={!canScrollLeft}
            className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border border-hairline bg-canvas shrink-0 shadow-xs transition-all ${
              canScrollLeft
                ? "text-ink hover:bg-parchment hover:border-ink/20 cursor-pointer active:scale-95"
                : "text-ink-muted/30 border-transparent cursor-not-allowed opacity-25"
            }`}
            title="Geser menu ke kiri"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Navigation Items */}
          <div
            ref={menuScrollRef}
            onScroll={checkScroll}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 pt-0.5 px-0.5 select-none"
          >
            {adminNavItems.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive ? "true" : "false"}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border select-none cursor-pointer ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-canvas text-ink-muted border-hairline hover:bg-parchment hover:text-ink"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-ink-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollMenu("right")}
            disabled={!canScrollRight}
            className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border border-hairline bg-canvas shrink-0 shadow-xs transition-all ${
              canScrollRight
                ? "text-ink hover:bg-parchment hover:border-ink/20 cursor-pointer active:scale-95"
                : "text-ink-muted/30 border-transparent cursor-not-allowed opacity-25"
            }`}
            title="Geser menu ke kanan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Online Users Modal */}
      {showOnlineModal && (
        <AdminOnlineUsersModal
          onClose={() => setShowOnlineModal(false)}
          onlineUsers={presenceStats.onlineUsers}
          onInspectUser={() => {}}
        />
      )}

      {/* 3. Main Content of Current Admin Page */}
      <div>{children}</div>
    </div>
  );
}
