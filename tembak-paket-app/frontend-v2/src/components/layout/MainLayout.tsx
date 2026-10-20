"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { EcommerceHeader } from "./EcommerceHeader";
import { BottomNav } from "./BottomNav";
import { DeveloperBar } from "@/components/DeveloperBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAiPage = pathname === "/ai";

  return (
    <div className={`min-h-screen bg-[#F2F2F7] dark:bg-[#050505] flex flex-col transition-colors duration-200 relative ${isAiPage ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : ""}`}>
      {/* Decorative Modern Mesh/Blob Background Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

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
      </main>

      {/* 3. Mobile App Bottom Navigation Bar */}
      <BottomNav />
      <DeveloperBar />
    </div>
  );
}
