"use client";
import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { logout } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import Swal from "@/lib/sweetalert";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, setUser, menuSettings } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const isActive = (path: string) => pathname === path;

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallPWA = () => {
    if (typeof window !== "undefined" && (window as any).deferredPrompt) {
      const promptEvent = (window as any).deferredPrompt;
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") console.log("PWA Installed");
        (window as any).deferredPrompt = null;
      });
    } else {
      Swal.fire({
        title: 'Tidak Dapat Menginstall Aplikasi',
        text: 'Kayaknya aplikasi ini udah ter-install di HP lo, atau browser lo emang kurang support (coba pake Chrome/Edge ya!).',
        icon: 'info',
        confirmButtonText: 'Oke Ngab',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      activeGlass:
        "bg-gradient-to-br from-blue-500/25 via-blue-500/15 to-sky-400/10 dark:from-blue-500/35 dark:via-blue-600/20 dark:to-cyan-400/15 border border-blue-400/40 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(0,113,227,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-blue-400/40 group-hover:text-blue-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    },
    {
      name: "Top Up Saldo",
      href: "/topup",
      activeGlass:
        "bg-gradient-to-br from-emerald-500/25 via-emerald-500/15 to-teal-400/10 dark:from-emerald-500/35 dark:via-emerald-600/20 dark:to-teal-400/15 border border-emerald-400/40 dark:border-emerald-400/30 text-emerald-600 dark:text-[#30D158] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(52,199,89,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-emerald-400/40 group-hover:text-emerald-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>,
    },
    {
      name: "Klaim Voucher",
      href: "/vouchers",
      activeGlass:
        "bg-gradient-to-br from-rose-500/25 via-pink-500/15 to-rose-400/10 dark:from-rose-500/35 dark:via-pink-600/20 dark:to-rose-400/15 border border-rose-400/40 dark:border-rose-400/30 text-rose-600 dark:text-[#FF375F] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(255,45,85,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-rose-400/40 group-hover:text-rose-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>,
    },
    {
      name: "Add Roamer",
      href: "/add-roamer",
      activeGlass:
        "bg-gradient-to-br from-sky-500/25 via-blue-500/15 to-cyan-400/10 dark:from-sky-500/35 dark:via-blue-600/20 dark:to-cyan-400/15 border border-sky-400/40 dark:border-sky-400/30 text-sky-600 dark:text-sky-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(14,165,233,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-sky-400/40 group-hover:text-sky-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
    },
    {
      name: "Cek Status & Garansi",
      href: "/cek-garansi",
      activeGlass:
        "bg-gradient-to-br from-indigo-500/25 via-indigo-500/15 to-purple-400/10 dark:from-indigo-500/35 dark:via-indigo-600/20 dark:to-purple-400/15 border border-indigo-400/40 dark:border-indigo-400/30 text-indigo-600 dark:text-[#5E5CE6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(88,86,214,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-indigo-400/40 group-hover:text-indigo-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    },
    {
      name: "Layanan CEIR",
      href: "/cek-ceir",
      activeGlass:
        "bg-gradient-to-br from-teal-500/25 via-emerald-500/15 to-teal-400/10 dark:from-teal-500/35 dark:via-emerald-600/20 dark:to-teal-400/15 border border-teal-400/40 dark:border-teal-400/30 text-teal-600 dark:text-teal-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(20,184,166,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-teal-400/40 group-hover:text-teal-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    },
    {
      name: "Generator Barcode",
      href: "/barcode",
      activeGlass:
        "bg-gradient-to-br from-cyan-500/25 via-teal-500/15 to-sky-400/10 dark:from-cyan-500/35 dark:via-teal-600/20 dark:to-sky-400/15 border border-cyan-400/40 dark:border-cyan-400/30 text-cyan-600 dark:text-[#64D2FF] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(48,176,199,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-cyan-400/40 group-hover:text-cyan-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>,
    },
    ...(menuSettings.showBeliPaket ? [{
      name: "Suntik Kuota",
      href: "/beli-paket",
      activeGlass:
        "bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-yellow-400/10 dark:from-amber-500/35 dark:via-orange-600/20 dark:to-yellow-400/15 border border-amber-400/40 dark:border-amber-400/30 text-amber-600 dark:text-[#FF9F0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(255,149,0,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-amber-400/40 group-hover:text-amber-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
    }] : []),
    {
      name: "Riwayat Transaksi",
      href: "/history",
      activeGlass:
        "bg-gradient-to-br from-violet-500/25 via-purple-500/15 to-indigo-400/10 dark:from-violet-500/35 dark:via-purple-600/20 dark:to-indigo-400/15 border border-violet-400/40 dark:border-violet-400/30 text-violet-600 dark:text-violet-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(139,92,246,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-violet-400/40 group-hover:text-violet-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      name: "Program Referral",
      href: "/referral",
      activeGlass:
        "bg-gradient-to-br from-orange-500/25 via-amber-500/15 to-yellow-400/10 dark:from-orange-500/35 dark:via-amber-600/20 dark:to-yellow-400/15 border border-orange-400/40 dark:border-orange-400/30 text-orange-600 dark:text-orange-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(249,115,22,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-orange-400/40 group-hover:text-orange-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
    },
    {
      name: "Pusat Bantuan",
      href: "/tickets",
      activeGlass:
        "bg-gradient-to-br from-fuchsia-500/25 via-purple-500/15 to-pink-400/10 dark:from-fuchsia-500/35 dark:via-purple-600/20 dark:to-pink-400/15 border border-fuchsia-400/40 dark:border-fuchsia-400/30 text-fuchsia-600 dark:text-fuchsia-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_-2px_rgba(217,70,239,0.35)]",
      inactiveGlass:
        "bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-ink-muted shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-fuchsia-400/40 group-hover:text-fuchsia-500",
      icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    }
  ];

  const sidebarContent = (
    <div className="w-64 h-full border-r border-hairline bg-canvas flex flex-col z-50">
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-hairline">
        <Logo size={28} />
        <button onClick={onClose} className="md:hidden p-2 text-ink hover:bg-parchment rounded-full">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group active:scale-95 select-none ${
                active
                  ? "bg-primary/[0.08] dark:bg-primary/[0.15] text-primary font-bold shadow-xs"
                  : "text-ink/75 hover:bg-parchment hover:text-ink font-medium"
              }`}
            >
              {/* Liquid Glass Icon Container */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                  active ? item.activeGlass : item.inactiveGlass
                }`}
              >
                {item.icon}
              </div>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <div className="pt-3 mt-2 border-t border-hairline">
            <Link
              href="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 group active:scale-95 select-none ${
                isActive("/admin")
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-ink bg-parchment border border-hairline hover:border-primary/50"
              }`}
            >
              {/* Liquid Glass Icon Container for Admin */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                  isActive("/admin")
                    ? "bg-white/20 border border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
                    : "bg-gradient-to-br from-rose-500/20 via-red-500/10 to-orange-400/5 dark:from-rose-500/30 dark:via-red-600/15 dark:to-orange-400/10 border border-rose-400/30 text-rose-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_-2px_rgba(225,29,72,0.25)]"
                }`}
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
              </div>
              <span className="truncate">Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-hairline flex flex-col gap-4 bg-canvas/50">
        <button onClick={handleInstallPWA} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary-focus transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Install Aplikasi
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate text-ink">{user?.name}</p>
            <p className="text-xs text-ink-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-left text-sm font-medium transition-colors">
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform md:hidden transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </div>

      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64">
        {sidebarContent}
      </div>
    </>
  );
}

