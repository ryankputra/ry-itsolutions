"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Beranda",
      href: "/dashboard",
      activeGlass:
        "bg-gradient-to-br from-blue-500/25 via-blue-500/15 to-sky-400/10 dark:from-blue-500/35 dark:via-blue-600/20 dark:to-cyan-400/15 border border-blue-400/40 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_14px_-2px_rgba(0,113,227,0.35)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_-2px_rgba(0,113,227,0.5)]",
      inactiveGlass:
        "bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-[#86868B] dark:text-[#a1a1a6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: "Notifikasi",
      href: "/notifications",
      activeGlass:
        "bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-orange-400/10 dark:from-amber-500/35 dark:via-amber-600/20 dark:to-orange-400/15 border border-amber-400/40 dark:border-amber-400/30 text-amber-600 dark:text-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_14px_-2px_rgba(245,158,11,0.35)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_-2px_rgba(245,158,11,0.5)]",
      inactiveGlass:
        "bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-[#86868B] dark:text-[#a1a1a6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      label: "Game Koin",
      href: "/games",
      activeGlass:
        "bg-gradient-to-br from-purple-500/25 via-purple-500/15 to-pink-400/10 dark:from-purple-500/35 dark:via-purple-600/20 dark:to-pink-400/15 border border-purple-400/40 dark:border-purple-400/30 text-purple-600 dark:text-purple-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_14px_-2px_rgba(168,85,247,0.35)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_-2px_rgba(168,85,247,0.5)]",
      inactiveGlass:
        "bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-[#86868B] dark:text-[#a1a1a6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 016.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m0 0a6 6 0 017.38-5.84v4.8m-7.38 1.04a14.98 14.98 0 00-6.16 12.12A14.98 14.98 0 0014.369 15.59m-5.96-5.96a14.926 14.926 0 015.841-2.58" />
        </svg>
      ),
    },
    {
      label: "Saya",
      href: "/saya",
      activeGlass:
        "bg-gradient-to-br from-emerald-500/25 via-emerald-500/15 to-teal-400/10 dark:from-emerald-500/35 dark:via-emerald-600/20 dark:to-teal-400/15 border border-emerald-400/40 dark:border-emerald-400/30 text-emerald-600 dark:text-[#30D158] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_14px_-2px_rgba(16,185,129,0.35)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_-2px_rgba(16,185,129,0.5)]",
      inactiveGlass:
        "bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-[#86868B] dark:text-[#a1a1a6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#161617]/80 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] safe-area-pb select-none">
      <div className="flex items-center justify-around">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href === "/saya" && pathname === "/profile");
          return (
            <Link
              key={idx}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center py-1 px-2.5 relative touch-manipulation select-none group active:scale-95 transition-transform duration-200 ${
                isActive
                  ? "text-primary font-bold"
                  : "text-[#86868B] dark:text-[#a1a1a6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] font-medium"
              }`}
            >
              {/* Liquid Glass Icon Container */}
              <div
                className={`relative w-10 h-7.5 rounded-xl flex items-center justify-center backdrop-blur-md transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                  isActive ? item.activeGlass : item.inactiveGlass
                }`}
              >
                {item.icon(isActive)}
              </div>
              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-1 whitespace-nowrap transition-colors duration-150 ${
                  isActive ? "text-primary font-semibold" : "text-[#86868B] dark:text-[#a1a1a6]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
