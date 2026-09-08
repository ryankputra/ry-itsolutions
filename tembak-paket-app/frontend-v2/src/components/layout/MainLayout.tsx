"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { EcommerceHeader } from "./EcommerceHeader";
import { BottomNav } from "./BottomNav";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAiPage = pathname === "/ai";

  return (
    <div className={`min-h-screen bg-canvas flex flex-col transition-colors duration-200 ${isAiPage ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : ""}`}>
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
    </div>
  );
}
