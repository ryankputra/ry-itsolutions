"use client";
import React from "react";
import { EcommerceHeader } from "./EcommerceHeader";
import { BottomNav } from "./BottomNav";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col transition-colors duration-200">
      {/* 1. Full E-Commerce Header (Top Nav) */}
      <EcommerceHeader />

      {/* 2. Main Body Content (Full-Width Responsive Container) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {children}
      </main>

      {/* 3. Mobile App Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
