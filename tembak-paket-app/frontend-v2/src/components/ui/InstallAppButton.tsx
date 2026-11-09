"use client";
import React from "react";
import { Download, Smartphone } from "lucide-react";

interface InstallAppButtonProps {
  className?: string;
  variant?: "header" | "button" | "banner" | "profile";
}

export function InstallAppButton({ className = "", variant = "button" }: InstallAppButtonProps) {
  if (variant === "header") {
    return (
      <a
        href="/Ry-ITSolutions.apk"
        download
        className={`px-2.5 py-1.5 sm:px-3 rounded-full bg-[#E8E8ED] hover:bg-[#DEDEE3] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] text-[11px] font-medium transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${className}`}
        title="Download APK Native Android"
      >
        <Download className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300" />
        <span className="hidden sm:inline">Download APK</span>
      </a>
    );
  }

  if (variant === "profile") {
    return (
      <a
        href="/Ry-ITSolutions.apk"
        download
        className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Download Aplikasi Native</h4>
            <p className="text-[11px] text-[#86868B] font-normal">Aplikasi mobile native Android (APK / Expo)</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary text-white font-semibold text-[10px] uppercase tracking-wider shrink-0 hover:bg-primary-hover transition-all active:scale-95 shadow-xs">
          Download
        </span>
      </a>
    );
  }

  return (
    <a
      href="/Ry-ITSolutions.apk"
      download
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-all active:scale-95 ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Download APK Native</span>
    </a>
  );
}
