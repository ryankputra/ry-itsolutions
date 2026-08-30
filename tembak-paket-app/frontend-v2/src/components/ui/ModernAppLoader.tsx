"use client";
import React, { useEffect } from "react";
import { Logo } from "./Logo";
import { BatikPatternOverlay } from "./BatikPattern";
import { playLoadingSound } from "@/lib/soundFx";

interface ModernAppLoaderProps {
  text?: string;
  subtext?: string;
}

export function ModernAppLoader({
  text = "Memuat Sistem & Layanan...",
  subtext = "High-Speed Gateway • 256-Bit Encrypted",
}: ModernAppLoaderProps) {
  useEffect(() => {
    // Play soft ambient loading sound effect
    try {
      playLoadingSound();
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white transition-all duration-500 select-none overflow-hidden">
      {/* Authentic Indonesian Batik Wallpaper Motif Accent */}
      <BatikPatternOverlay opacity={0.15} />

      {/* Ambient Background Glowing Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Central Glassmorphism Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-4 p-8 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-300">
        
        {/* Animated Brand Logo Container */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Outer Pulsing Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 opacity-40 blur-xl animate-pulse" />
          
          {/* Rotating Spinner Arc */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin"
            style={{ animationDuration: "1.5s" }}
          />

          {/* Inner Logo Card */}
          <div className="relative w-16 h-16 rounded-2xl bg-slate-950/90 border border-white/20 shadow-xl flex items-center justify-center backdrop-blur-md">
            <Logo iconOnly size={38} />
          </div>
        </div>

        {/* Brand Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xl font-extrabold tracking-wider text-white">
              RY-
            </span>
            <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              ITSOLUTIONS
            </span>
          </div>
          
          {/* Status Message */}
          <p className="text-xs font-medium text-blue-100/90 flex items-center justify-center gap-1.5">
            <span>{text}</span>
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </p>
        </div>

        {/* Minimal Progress Track */}
        <div className="w-full max-w-[200px] h-1.5 rounded-full bg-white/10 border border-white/15 overflow-hidden relative shadow-inner">
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_10px_#06b6d4]"
            style={{
              width: "45%",
              animation: "modernLoaderSlide 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Security & Encryption Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-semibold text-blue-100/80 backdrop-blur-md">
          <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{subtext}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes modernLoaderSlide {
          0% {
            left: -45%;
          }
          50% {
            left: 35%;
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
