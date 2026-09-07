"use client";
import React from "react";
import { Logo } from "./Logo";

interface ModernAppLoaderProps {
  text?: string;
  subtext?: string;
}

export function ModernAppLoader({
  text = "Memuat Layanan...",
}: ModernAppLoaderProps) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-xl text-white select-none transition-all duration-300">
      
      {/* Central Minimalist Container */}
      <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sleek Logo with Micro-Spinner */}
        <div className="relative flex items-center justify-center w-14 h-14">
          {/* Subtle spinning accent ring */}
          <div
            className="absolute -inset-1 rounded-2xl border border-transparent border-t-primary border-r-cyan-400/50 animate-spin"
            style={{ animationDuration: "1.2s" }}
          />

          {/* Minimalist Brand Logo Tile */}
          <div className="w-12 h-12 rounded-xl bg-zinc-900/90 border border-white/10 shadow-lg flex items-center justify-center backdrop-blur-md">
            <Logo iconOnly size={26} />
          </div>
        </div>

        {/* Minimalist Brand Title & Subtext */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-bold tracking-widest text-zinc-100 uppercase">
              RY-ITSOLUTIONS
            </span>
          </div>
          <p className="text-[11px] font-medium text-zinc-400 tracking-tight">
            {text}
          </p>
        </div>

        {/* Razor-thin Minimalist Progress Track */}
        <div className="w-28 h-0.5 rounded-full bg-zinc-800/80 overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-primary via-cyan-400 to-blue-500"
            style={{
              width: "45%",
              animation: "minimalLoaderSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes minimalLoaderSlide {
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
