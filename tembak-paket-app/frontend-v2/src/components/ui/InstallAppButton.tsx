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
        className={`px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 shrink-0 ${className}`}
        title="Install Aplikasi Ry-ITSolutions di HP / Laptop"
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V6l-8-4zm-1 6h2v5h3l-4 4-4-4h3V8z" />
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
          <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-400/30 shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V6l-8-4zm-1 6h2v5h3l-4 4-4-4h3V8z" />
            </svg>
          </div>
          <div>
            <h4 className="font-black text-xs text-amber-950">Install Aplikasi Official</h4>
            <p className="text-[10px] text-amber-950/80 font-medium">Akses transaksi 2x lebih cepat langsung dari layar HP Anda</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 font-bold text-[10px] uppercase tracking-wider shrink-0 border border-amber-400/20">
          Install &gt;
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 ${className}`}
    >
      <svg className="w-4 h-4 shrink-0 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V6l-8-4zm-1 6h2v5h3l-4 4-4-4h3V8z" />
      </svg>
      <span>Install Aplikasi Sekarang</span>
    </button>
  );
}
