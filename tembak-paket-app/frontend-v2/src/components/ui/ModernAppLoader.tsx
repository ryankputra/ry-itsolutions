"use client";
import React from "react";
import { Logo } from "./Logo";

interface ModernAppLoaderProps {
  text?: string;
  subtext?: string;
}

export function ModernAppLoader({
  text = "Memuat Sistem & Layanan...",
  subtext = "High-Speed Gateway • 256-Bit Encrypted",
}: ModernAppLoaderProps) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/80 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-500 select-none">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: "1s" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative flex flex-col items-center z-10 px-6 py-8">
        {/* Futuristic Multi-Ring Glowing Orb & Logo */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-8">
          {/* Outer Pulsing Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 opacity-30 blur-xl animate-pulse"></div>

          {/* Outer Rotating Gradient Border Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin"
            style={{ animationDuration: "1.8s" }}
          ></div>

          {/* Inner Counter-Rotating Gradient Ring */}
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-indigo-400 border-l-blue-400 animate-spin"
            style={{ animationDuration: "2.6s", animationDirection: "reverse" }}
          ></div>

          {/* Orbiting Laser Particle */}
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ animationDuration: "1.2s" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee] -mt-1 mx-auto"></div>
          </div>

          {/* Core Glass Card with Logo */}
          <div className="relative w-16 h-16 rounded-2xl bg-slate-900/90 border border-white/20 shadow-[0_0_25px_rgba(59,130,246,0.35)] flex items-center justify-center backdrop-blur-md">
            <Logo iconOnly size={36} />
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
            RY-
          </span>
          <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
            ITSOLUTIONS
          </span>
        </div>

        {/* Dynamic Status Text with Animated Dots */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-6">
          <span>{text}</span>
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </span>
        </div>

        {/* Modern Glowing Progress Track */}
        <div className="w-48 h-1.5 rounded-full bg-slate-800/80 border border-white/10 overflow-hidden relative mb-5 shadow-inner">
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_10px_#06b6d4]"
            style={{
              width: "45%",
              animation: "modernLoaderSlide 1.6s ease-in-out infinite",
            }}
          ></div>
        </div>

        {/* Security & Speed Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-400 backdrop-blur-md">
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
