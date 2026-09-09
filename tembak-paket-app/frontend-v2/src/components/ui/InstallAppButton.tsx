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
        className={`px-3 py-1.5 rounded-full bg-[#E8E8ED] hover:bg-[#DEDEE3] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] text-[11px] font-medium transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${className}`}
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
        className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Install Aplikasi Official</h4>
            <p className="text-[11px] text-[#86868B] font-normal">Akses transaksi cepat langsung dari layar utama</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary text-white font-semibold text-[10px] uppercase tracking-wider shrink-0 hover:bg-primary-hover transition-all active:scale-95 shadow-xs">
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
