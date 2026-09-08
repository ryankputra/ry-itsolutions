"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { EcommerceHeader } from "./EcommerceHeader";
import { BottomNav } from "./BottomNav";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVideoPage = pathname === "/videos";

  return (
    <div className="min-h-screen bg-canvas flex flex-col transition-colors duration-200">
      {/* 1. Full E-Commerce Header (Top Nav) */}
      <EcommerceHeader />

      {/* 2. Main Body Content (Adjusted padding for /videos to not exceed header or footer) */}
      <main
        className={
          isVideoPage
            ? "flex-1 w-full flex items-center justify-center px-3 py-1.5 pb-20 sm:pb-22 overflow-hidden"
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
