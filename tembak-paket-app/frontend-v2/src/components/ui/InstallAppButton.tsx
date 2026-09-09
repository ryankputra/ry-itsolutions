"use client";
import React, { useEffect, useState } from "react";
import Swal from "@/lib/sweetalert";
import { Download, Smartphone } from "lucide-react";

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
                <li>Ketuk tombol <b>Share</b> (ikon bagikan di bagian bawah browser Safari).</li>
                <li>Pilih menu <b>\"Tambah ke Layar Utama\"</b> (<i>Add to Home Screen</i>).</li>
                <li>Ketuk <b>\"Tambah\"</b> di sudut kanan atas.</li>
              </ol>
            </div>
          `,
          icon: "info",
          confirmButtonText: "Mengerti",
        });
      } else {
        Swal.fire({
          title: "Install Aplikasi Ry-ITSolutions",
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Untuk memasang aplikasi resmi di HP Android / Laptop Anda:</p>
              <ol class="list-decimal pl-4 space-y-1 font-medium">
                <li>Ketuk menu <b>Titik Tiga</b> di pojok kanan atas browser Google Chrome.</li>
                <li>Pilih <b>\"Install aplikasi\"</b> atau <b>\"Tambahkan ke Layar Utama\"</b>.</li>
                <li>Konfirmasi pemasangan untuk akses cepat tanpa membuka browser.</li>
              </ol>
            </div>
          `,
          icon: "info",
          confirmButtonText: "Siap, Mengerti",
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
        className={`px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 ${className}`}
        title="Install Aplikasi Ry-ITSolutions di HP / Laptop"
      >
        <Download className="w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-slate-300" />
        <span>Install App</span>
      </button>
    );
  }

  if (variant === "profile") {
    return (
      <div
        onClick={handleInstallClick}
        className={`p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between cursor-pointer shadow-sm hover:bg-slate-800 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-semibold shrink-0 border border-slate-700 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-white">Install Aplikasi Official</h4>
            <p className="text-[10px] text-slate-400 font-medium">Akses transaksi cepat langsung dari layar utama</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-medium text-[10px] uppercase tracking-wider shrink-0 border border-white/10">
          Install
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 ${className}`}
    >
      <Download className="w-4 h-4 shrink-0" />
      <span>Install Aplikasi Sekarang</span>
    </button>
  );
}
