"use client";
import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useApp } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { ModernAppLoader } from "@/components/ui/ModernAppLoader";
import InteractiveTour from "@/components/ui/InteractiveTour";
import RequiredPhoneModal from "@/components/ui/RequiredPhoneModal";
import { MusicProvider } from "@/lib/musicContext";
import { SpotifyPlayerBar } from "@/components/music/SpotifyPlayerBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const isAiPage = pathname === "/ai";
  const isHiburanPage = pathname === "/hiburan" || pathname?.startsWith("/hiburan/");
  const currentPath = typeof window !== "undefined" ? window.location.pathname : (pathname || "");
  const isPublicRoute = Boolean(
    currentPath.startsWith("/gateway") ||
    currentPath.startsWith("/cek-garansi") ||
    currentPath.startsWith("/hiburan") ||
    (pathname && (pathname === "/gateway" || pathname.startsWith("/gateway/") || pathname === "/cek-garansi" || pathname.startsWith("/cek-garansi/") || pathname === "/hiburan" || pathname.startsWith("/hiburan/")))
  );
  const [showWaMenu, setShowWaMenu] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Unregister legacy Service Worker if lingering from older PWA installations
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    }

    const handleOpenTour = () => setShowTour(true);
    window.addEventListener('open_app_tour', handleOpenTour);

    return () => {
      window.removeEventListener('open_app_tour', handleOpenTour);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p.startsWith("/gateway") || p.startsWith("/cek-garansi") || p.startsWith("/hiburan")) {
        return;
      }
    }
    if (!loading && !user && !isPublicRoute) {
      router.push("/login");
    }
  }, [user, loading, router, isPublicRoute]);

  useEffect(() => {
    let currentVersion: number | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/system-version", { credentials: "omit" });
        if (res.ok) {
          const contentType = res.headers?.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data?.status && data?.version) {
              if (currentVersion === null) {
                currentVersion = data.version;
              } else if (currentVersion !== data.version) {
                // Version mismatch! Trigger refresh
                const Swal = (await import("@/lib/sweetalert")).default;
                await Swal.fire({
                  title: 'Update Sistem',
                  text: 'Ada pembaruan web terbaru. Halaman akan dimuat ulang otomatis.',
                  icon: 'info',
                  showConfirmButton: false,
                  timer: 3000,
                  allowOutsideClick: false
                });
                window.location.reload();
              }
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
    return <ModernAppLoader text="Memuat Sistem & Layanan..." />;
  }

  const canRender = Boolean(
    user ||
    isPublicRoute ||
    (typeof window !== "undefined" && (window.location.pathname.startsWith("/gateway") || window.location.pathname.startsWith("/cek-garansi")))
  );

  if (!canRender) return null;

  return (
    <MusicProvider>
      <MainLayout>{children}</MainLayout>

      {/* Spotify-style Persistent Global Audio Player */}
      <SpotifyPlayerBar />

      {/* Floating WhatsApp Unified Speed-Dial FAB (Hidden on /ai and /hiburan) */}
      {!isAiPage && !isHiburanPage && (
        <>
          {showWaMenu && (
            <div
              className="fixed inset-0 z-[95] bg-black/30 backdrop-blur-[1px] animate-in fade-in duration-200"
              onClick={() => setShowWaMenu(false)}
              aria-hidden="true"
            />
          )}

          {showWaMenu && (
            <div className="fixed bottom-[180px] right-4 sm:bottom-28 sm:right-6 z-[100] w-[290px] sm:w-[320px] bg-slate-900/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] font-extrabold tracking-wide text-white/90 uppercase">Bantuan & Komunitas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaMenu(false)}
                  className="text-white/60 hover:text-white text-xs font-bold p-1 rounded-md hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* 1. CS Admin 1 */}
              <a
                href="https://wa.me/6288706611370?text=Halo%20Admin%201,%20saya%20butuh%20bantuan%20terkait%20layanan%20Ry-ITSolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-emerald-600/30 border border-white/5 hover:border-emerald-500/40 text-white transition-all group"
                onClick={() => setShowWaMenu(false)}
              >
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs">CS Admin 1</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Online</span>
                  </div>
                  <p className="text-[11px] text-white/70 truncate">Bantuan Transaksi, Akun & Top Up</p>
                </div>
              </a>

              {/* 2. CS Admin 2 */}
              <a
                href="https://wa.me/6287767287284?text=Halo%20Admin%202,%20saya%20butuh%20konsultasi%20layanan%20Ry-ITSolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-blue-600/30 border border-white/5 hover:border-blue-500/40 text-white transition-all group"
                onClick={() => setShowWaMenu(false)}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs">CS Admin 2</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold">Online</span>
                  </div>
                  <p className="text-[11px] text-white/70 truncate">Konsultasi Layanan, IMEI & Garansi</p>
                </div>
              </a>

              {/* 3. Gabung Grup Komunitas WhatsApp */}
              <a
                href="https://chat.whatsapp.com/E0AO1IoMfHK0gqTvFgNQNl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-green-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-green-500/25 border border-emerald-500/30 text-white transition-all group"
                onClick={() => setShowWaMenu(false)}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-emerald-500/30">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2.3 21.7a.8.8 0 0 0 .97.97l4.63-1.08A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm5 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-5 4c2.33 0 4.31 1.46 5.12 3.5H5.88c.81-2.04 2.79-3.5 5.12-3.5zm5.5 3.5c-.26-.84-.84-1.54-1.6-2.02.66-.31 1.4-.48 2.1-.48 1.55 0 2.87.97 3.41 2.5h-3.91z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-emerald-300">Grup Komunitas WA</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-extrabold uppercase tracking-wider">Join</span>
                  </div>
                  <p className="text-[11px] text-white/80 truncate">Update Info, Promo & Diskusi Member</p>
                </div>
              </a>
            </div>
          )}

          <button
            onClick={() => setShowWaMenu(!showWaMenu)}
            className="fixed bottom-[115px] right-4 sm:bottom-20 sm:right-6 z-[96] bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl shadow-green-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-2 border-white/30"
            aria-label="Hubungi WhatsApp CS Admin & Grup"
            title="Hubungi WhatsApp Admin & Komunitas"
          >
            {showWaMenu ? (
              <span className="w-6 h-6 flex items-center justify-center font-bold text-lg leading-none">✕</span>
            ) : (
              <svg className="w-6 h-6 fill-current animate-pulse" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            )}
          </button>
        </>
      )}

      {/* Interactive Guided App Tour Modal */}
      <InteractiveTour isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Mandatory WhatsApp Binding Modal for Users without Phone */}
      <RequiredPhoneModal />
    </MusicProvider>
  );
}
