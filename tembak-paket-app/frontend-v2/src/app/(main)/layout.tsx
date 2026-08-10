"use client";
import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const router = useRouter();
  const [showWaMenu, setShowWaMenu] = useState(false);

  useEffect(() => {
    // Listen for PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    let currentVersion: number | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/system-version", { credentials: "omit" });
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.version) {
            if (currentVersion === null) {
              currentVersion = data.version;
            } else if (currentVersion !== data.version) {
              // Version mismatch! Trigger refresh
              const Swal = (await import("sweetalert2")).default;
              await Swal.fire({
                title: 'Update Sistem 🚀',
                text: 'Ada pembaruan web terbaru nih. Halaman bakal di-refresh otomatis biar lancar!',
                icon: 'info',
                showConfirmButton: false,
                timer: 3000,
                allowOutsideClick: false
              });
              window.location.reload();
            }
          }
        }
      } catch (e) { }
    };

    // Check version immediately on load, then every 30s
    if (user) {
      checkVersion();
      const interval = setInterval(checkVersion, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <MainLayout>{children}</MainLayout>
      {showWaMenu && (
        <div className="fixed bottom-[145px] right-5 sm:bottom-24 sm:right-8 z-[100] bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 min-w-[210px]">
          <p className="text-[10px] font-black tracking-wider text-white/50 uppercase px-2 mb-1">Pilih Chat CS Admin 💬</p>
          <a
            href="https://wa.me/6288706611370"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-green-500 hover:text-white text-white text-xs font-bold transition-all"
            onClick={() => setShowWaMenu(false)}
          >
            <span className="text-base">🟢</span>
            <div className="text-left">
              <p className="font-bold">Admin 1</p>
              <p className="text-[10px] text-white/60 font-normal">6288706611370</p>
            </div>
          </a>
          <a
            href="https://wa.me/6287767287284"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-green-500 hover:text-white text-white text-xs font-bold transition-all"
            onClick={() => setShowWaMenu(false)}
          >
            <span className="text-base">🔵</span>
            <div className="text-left">
              <p className="font-bold">Admin 2</p>
              <p className="text-[10px] text-white/60 font-normal">6287767287284</p>
            </div>
          </a>
        </div>
      )}
      <button
        onClick={() => setShowWaMenu(!showWaMenu)}
        className="fixed bottom-[85px] right-5 sm:bottom-8 sm:right-8 z-[100] bg-[#25D366] text-white p-3.5 rounded-full shadow-xl shadow-green-500/40 hover:scale-110 transition-all flex items-center justify-center animate-pulse"
        aria-label="Hubungi CS Admin"
        title="Hubungi Admin"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </button>
    </>
  );
}
