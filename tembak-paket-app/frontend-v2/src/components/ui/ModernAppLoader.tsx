"use client";
import React from "react";
import { Logo } from "./Logo";
import { useDynamicTheme } from "@/lib/themeContext";

interface ModernAppLoaderProps {
  text?: string;
  subtext?: string;
}

export function ModernAppLoader({
  text = "Memuat Sistem & Layanan...",
  subtext,
}: ModernAppLoaderProps) {
  let theme: any = null;
  try {
    const context = useDynamicTheme();
    theme = context?.theme;
  } catch (e) {
    theme = null;
  }

  const isCustomTheme = Boolean(theme && theme.id !== "default-obsidian");
  const primaryColor = theme?.tokens?.["--theme-primary"] || "#0071E3";

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/25 dark:bg-black/45 backdrop-blur-2xl text-ink select-none transition-all duration-300">
      {/* Ambient Theme Backlight (Soft & Atmospheric Glass Glow) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-30 transition-opacity duration-700"
        style={{
          background: isCustomTheme
            ? `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${primaryColor} 20%, transparent) 0%, transparent 60%)`
            : "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)",
        }}
      />

      {/* iOS Frosted Glass HUD Box (Apple Modal HUD Style) */}
      <div className="relative z-10 flex flex-col items-center p-6 sm:p-7 rounded-[26px] bg-white/75 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] min-w-[210px] max-w-[260px] animate-in fade-in zoom-in-95 duration-200 text-center">
        {/* Brand Emblem in Apple Squircle Tile */}
        <div className="relative mb-3 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-b from-white/90 to-white/60 dark:from-white/15 dark:to-white/5 border border-white/40 dark:border-white/15 shadow-xs flex items-center justify-center backdrop-blur-md transition-transform"
            style={{
              boxShadow: isCustomTheme
                ? `0 4px 16px color-mix(in srgb, ${primaryColor} 25%, transparent)`
                : undefined,
            }}
          >
            <Logo iconOnly size={26} />
          </div>
        </div>

        {/* Authentic Apple iOS 12-Spoke Activity Indicator */}
        <div className="relative w-8 h-8 my-1 flex items-center justify-center text-slate-800 dark:text-white">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-[47%] top-[6%] w-[2.2px] h-[6.5px] rounded-full"
              style={{
                transformOrigin: "50% 16px",
                transform: `rotate(${i * 30}deg)`,
                backgroundColor: isCustomTheme ? primaryColor : "currentColor",
                animation: "iosSpinner 1s linear infinite",
                animationDelay: `${-(12 - i) * (1 / 12)}s`,
                opacity: 0.15 + (i / 12) * 0.85,
              }}
            />
          ))}
        </div>

        {/* Brand Name & Loading Message in Apple SF Typography */}
        <div className="mt-2.5 space-y-0.5 max-w-[200px]">
          <span
            className="text-[11px] font-black tracking-widest uppercase block text-ink"
            style={{ color: isCustomTheme ? primaryColor : undefined }}
          >
            RY-ITSOLUTIONS
          </span>
          <p className="text-[12px] font-medium text-slate-600 dark:text-zinc-300 leading-tight">
            {text}
          </p>
          {subtext && (
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">
              {subtext}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes iosSpinner {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
}

export default ModernAppLoader;
