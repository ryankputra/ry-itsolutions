"use client";
import React, { useMemo } from "react";
import { Logo } from "./Logo";
import { useDynamicTheme } from "@/lib/themeContext";

interface ModernAppLoaderProps {
  text?: string;
  subtext?: string;
}

export function ModernAppLoader({
  text = "Memuat Layanan...",
  subtext,
}: ModernAppLoaderProps) {
  let theme: any = null;
  try {
    const context = useDynamicTheme();
    theme = context?.theme;
  } catch (e) {
    theme = null;
  }

  const themeId = theme?.id || "default-obsidian";
  const category = theme?.category || "default";
  const isDefault = themeId === "default-obsidian" || category === "default";

  // Dynamic Theme Palette Extraction
  const primaryColor = theme?.tokens?.["--theme-primary"] || "#0071E3";
  const badgeText = theme?.assets?.theme_badge_text || theme?.name;

  // Thematic Specific Styling Properties
  const themeConfig = useMemo(() => {
    switch (category) {
      case "islam":
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(5, 150, 105, 0.22) 0%, rgba(217, 119, 6, 0.12) 40%, transparent 70%)",
          cardBorder: "border-emerald-500/25 dark:border-emerald-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(5,150,105,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(5,150,105,0.4)]",
          badgeIcon: "🌙",
          badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          tickColors: ["#059669", "#D97706"], // Emerald & Gold
          barColor: "from-emerald-500 via-amber-400 to-emerald-500",
        };
      case "national":
        if (themeId === "national-batik") {
          return {
            glow: "radial-gradient(circle at 50% 50%, rgba(180, 83, 9, 0.2) 0%, rgba(120, 53, 15, 0.1) 40%, transparent 70%)",
            cardBorder: "border-amber-600/25 dark:border-amber-500/20",
            cardShadow: "shadow-[0_24px_60px_-10px_rgba(180,83,9,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(180,83,9,0.35)]",
            badgeIcon: "✨",
            badgeClass: "bg-amber-600/15 text-amber-800 dark:text-amber-300 border-amber-600/30",
            tickColors: ["#B45309", "#D97706"],
            barColor: "from-amber-600 via-yellow-500 to-amber-600",
          };
        }
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.22) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)",
          cardBorder: "border-red-500/25 dark:border-red-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(220,38,38,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(220,38,38,0.35)]",
          badgeIcon: "🇮🇩",
          badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
          tickColors: ["#DC2626", "#FFFFFF"], // Merah Putih
          barColor: "from-red-600 via-white to-red-600",
        };
      case "chinese":
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.25) 0%, rgba(245, 158, 11, 0.15) 45%, transparent 70%)",
          cardBorder: "border-rose-500/25 dark:border-rose-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(225,29,72,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(225,29,72,0.4)]",
          badgeIcon: "🏮",
          badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
          tickColors: ["#E11D48", "#F59E0B"], // Imperial Red & Gold
          barColor: "from-rose-600 via-amber-400 to-rose-600",
        };
      case "christian":
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(2, 132, 199, 0.2) 0%, rgba(16, 185, 129, 0.12) 40%, transparent 70%)",
          cardBorder: "border-sky-500/25 dark:border-sky-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(2,132,199,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(2,132,199,0.35)]",
          badgeIcon: "❄️",
          badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
          tickColors: ["#0284C7", "#10B981"],
          barColor: "from-sky-500 via-emerald-400 to-sky-500",
        };
      case "buddha":
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.22) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)",
          cardBorder: "border-amber-500/25 dark:border-amber-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(245,158,11,0.22)] dark:shadow-[0_30px_70px_-12px_rgba(245,158,11,0.35)]",
          badgeIcon: "🪷",
          badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
          tickColors: ["#F59E0B", "#8B5CF6"],
          barColor: "from-amber-500 via-purple-400 to-amber-500",
        };
      case "hindu":
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.2) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 70%)",
          cardBorder: "border-indigo-500/25 dark:border-indigo-400/20",
          cardShadow: "shadow-[0_24px_60px_-10px_rgba(79,70,229,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(79,70,229,0.35)]",
          badgeIcon: "🕉️",
          badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          tickColors: ["#4F46E5", "#F59E0B"],
          barColor: "from-indigo-600 via-amber-400 to-indigo-600",
        };
      default:
        // Default Apple Obsidian / Ultra-Clean iOS Aesthetic
        return {
          glow: "radial-gradient(circle at 50% 50%, rgba(0, 113, 227, 0.1) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 70%)",
          cardBorder: "border-white/60 dark:border-white/10",
          cardShadow: "shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)]",
          badgeIcon: null,
          badgeClass: "",
          tickColors: ["currentColor", "currentColor"],
          barColor: "from-[#0071E3] via-[#47a0ff] to-[#0071E3]",
        };
    }
  }, [category, themeId]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-2xl text-ink select-none transition-all duration-300 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',Roboto,sans-serif]">
      {/* 1. Atmospheric Ambient Diffusion (Subtle Liquid Glow) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-40 transition-opacity duration-700"
        style={{ background: themeConfig.glow }}
      />

      {/* 2. Apple iOS Squircle HUD Card (Authentic iOS System Modal Material) */}
      <div
        className={`relative z-10 flex flex-col items-center p-7 sm:p-8 rounded-[32px] sm:rounded-[36px] bg-white/80 dark:bg-[#1C1C1E]/85 backdrop-blur-3xl border ${themeConfig.cardBorder} ${themeConfig.cardShadow} min-w-[220px] max-w-[270px] animate-in fade-in zoom-in-95 duration-200 text-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12)]`}
      >
        {/* Momentum Badge for Thematic Events */}
        {!isDefault && themeConfig.badgeIcon && (
          <div className={`mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold tracking-wide uppercase shadow-2xs ${themeConfig.badgeClass}`}>
            <span>{themeConfig.badgeIcon}</span>
            <span className="truncate max-w-[130px]">{badgeText}</span>
          </div>
        )}

        {/* Brand Emblem in Apple Continuous Corner Squircle Tile */}
        <div className="relative mb-3.5 flex items-center justify-center group">
          <div
            className="w-13 h-13 rounded-[22px] bg-gradient-to-b from-white/95 to-white/70 dark:from-white/15 dark:to-white/5 border border-white/60 dark:border-white/15 shadow-[0_6px_18px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center justify-center backdrop-blur-xl transition-all duration-300"
            style={{
              boxShadow: !isDefault
                ? `0 6px 20px color-mix(in srgb, ${primaryColor} 25%, transparent)`
                : undefined,
            }}
          >
            <div className="animate-pulse duration-1000">
              <Logo iconOnly size={28} />
            </div>
          </div>
        </div>

        {/* Authentic Apple iOS 12-Spoke Activity Indicator */}
        <div className="relative w-8 h-8 my-1.5 flex items-center justify-center text-[#3C3C43] dark:text-white">
          {Array.from({ length: 12 }).map((_, i) => {
            const isAlternate = i % 2 === 1;
            const tickColor = isDefault
              ? "currentColor"
              : isAlternate
              ? themeConfig.tickColors[1]
              : themeConfig.tickColors[0];

            return (
              <div
                key={i}
                className="absolute left-[47%] top-[6%] w-[2.4px] h-[6.8px] rounded-full"
                style={{
                  transformOrigin: "50% 16px",
                  transform: `rotate(${i * 30}deg)`,
                  backgroundColor: tickColor,
                  animation: "iosTickFade 1s linear infinite",
                  animationDelay: `${-(12 - i) * (1 / 12)}s`,
                }}
              />
            );
          })}
        </div>

        {/* Brand Name & Loading Message with Apple Typography */}
        <div className="mt-3 space-y-0.5 max-w-[210px]">
          <span
            className="text-[11px] font-black tracking-widest uppercase block text-ink/90 dark:text-white/90"
            style={{ color: !isDefault ? primaryColor : undefined }}
          >
            RY-ITSOLUTIONS
          </span>
          <p className="text-[12.5px] font-medium text-slate-700 dark:text-zinc-200 leading-snug">
            {text}
          </p>
          {subtext && (
            <p className="text-[10.5px] text-slate-400 dark:text-zinc-400 font-normal">
              {subtext}
            </p>
          )}
        </div>

        {/* Sleek iOS Indeterminate Liquid Progress Pill */}
        <div className="w-24 h-[2.5px] rounded-full bg-black/[0.08] dark:bg-white/10 overflow-hidden relative mt-3.5">
          <div
            className={`absolute top-0 bottom-0 w-12 rounded-full bg-gradient-to-r ${themeConfig.barColor}`}
            style={{
              animation: "iosProgressSlide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite",
            }}
          />
        </div>
      </div>

      {/* Pure iOS Animation Keyframes */}
      <style jsx>{`
        @keyframes iosTickFade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
        @keyframes iosProgressSlide {
          0% {
            left: -48px;
          }
          50% {
            left: 50%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default ModernAppLoader;
