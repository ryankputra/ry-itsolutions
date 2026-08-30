"use client";
import React, { useEffect, useState } from "react";
import Swal from "@/lib/sweetalert";

interface InstallAppButtonProps {
  className?: string;
  variant?: "header" | "button" | "banner" | "profile";
}

export function InstallAppButton({ className = "", variant = "button" }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    if (typeof window !== "undefined") {
      if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
        setIsInstalled(true);
      }

      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      if (typeof window !== "undefined") {
        (window as any).deferredPrompt = e;
      }
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        (window as any).deferredPrompt = null;
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? (window as any).deferredPrompt : null);

    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        (window as any).deferredPrompt = null;
      }
    } else {
      // Show user-friendly guide for Chrome / Safari / Android / iOS
      const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isIOS) {
        Swal.fire({
          title: "Install Aplikasi di iPhone / iPad",
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Untuk menginstall aplikasi <b>Ry-ITSolutions</b> di iOS:</p>
              <ol class="list-decimal pl-4 space-y-1 font-medium">
                <li>Ketuk tombol <b>Share</b> (ikon bagikan <span class="text-blue-600 font-bold">⎋</span>) di bagian bawah browser Safari.</li>
                <li>Pilih menu <b>"Tambah ke Layar Utama"</b> (<i>Add to Home Screen</i> <span class="font-bold">➕</span>).</li>
                <li>Ketuk <b>"Tambah"</b> di sudut kanan atas.</li>
              </ol>
            </div>
          `,
          icon: "info",
          confirmButtonText: "Mengerti 👍",
        });
      } else {
        Swal.fire({
          title: "Install Aplikasi Ry-ITSolutions",
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Untuk memasang aplikasi resmi di HP Android / Laptop Anda:</p>
              <ol class="list-decimal pl-4 space-y-1 font-medium">
                <li>Ketuk menu <b>Titik Tiga (⋮)</b> di pojok kanan atas browser Google Chrome.</li>
                <li>Pilih <b>"Install aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.</li>
                <li>Konfirmasi pemasangan untuk akses cepat tanpa membuka browser.</li>
              </ol>
            </div>
          `,
          icon: "info",
          confirmButtonText: "Siap, Mengerti 👍",
        });
      }
    }
  };

  if (isInstalled) return null;

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform flex items-center gap-1 shrink-0 ${className}`}
        title="Install Aplikasi Ry-ITSolutions di HP / Laptop"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span>Install App</span>
      </button>
    );
  }

  if (variant === "profile") {
    return (
      <div
        onClick={handleInstallClick}
        className={`p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-amber-950 flex items-center justify-between cursor-pointer shadow-md hover:opacity-95 transition-opacity ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-amber-400 flex items-center justify-center font-black shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div>
            <h4 className="font-black text-xs">Install Aplikasi Official</h4>
            <p className="text-[10px] text-amber-950/80 font-medium">Akses transaksi 2x lebih cepat langsung dari layar HP Anda</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-black text-amber-300 font-bold text-[10px] uppercase tracking-wider shrink-0">
          Install &gt;
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      <span>Install Aplikasi Sekarang</span>
    </button>
  );
}
