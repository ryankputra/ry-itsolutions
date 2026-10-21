"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { EcommerceHeader } from "./EcommerceHeader";
import { BottomNav } from "./BottomNav";
import { DeveloperBar } from "@/components/DeveloperBar";
import GoogleAdBanner from "@/components/ui/GoogleAdBanner";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAiPage = pathname === "/ai";

  return (
    <div className={`min-h-screen bg-[#F2F2F7] dark:bg-[#050505] flex flex-col transition-colors duration-200 relative overflow-x-hidden w-full max-w-full ${isAiPage ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : ""}`}>
      {/* Decorative Modern Mesh/Blob Background Accents - Active on all menus */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-rose-500/20 dark:bg-rose-500/25 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-amber-500/15 dark:bg-amber-500/20 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />

      {/* 1. Full E-Commerce Header (Top Nav) */}
      <EcommerceHeader />

      {/* 2. Main Body Content (Full height viewport on /ai with no double scroll) */}
      <main
        className={
          isAiPage
            ? "flex-1 w-full max-w-3xl mx-auto flex flex-col overflow-hidden p-0 pb-[64px] lg:pb-0 relative"
            : "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12"
        }
      >
        {children}
        {!isAiPage && <GoogleAdBanner className="mt-8" />}
      </main>

      {/* 3. Mobile App Bottom Navigation Bar */}
      <BottomNav />
      <DeveloperBar />
    </div>
  );
}
