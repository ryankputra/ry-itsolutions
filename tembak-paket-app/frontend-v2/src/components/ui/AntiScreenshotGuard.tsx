"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/lib/store";
import { ShieldAlert, ShieldCheck, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";

export function AntiScreenshotGuard() {
  const { user } = useApp();
  const isAdmin = user?.role === "admin";
  const [adminTestMode, setAdminTestMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Status proteksi aktif jika BUKAN admin, ATAU jika admin sedang mengaktifkan mode simulasi testing
  const isProtectionActive = !isAdmin || adminTestMode;

  const shieldRef = useRef<HTMLDivElement>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Identitas akun rapi untuk watermark / nota keamanan (Bersih, elegan, tidak bikin pusing)
  const userIdentifier = useMemo(() => {
    return user?.phone || user?.verifiedPhone || user?.email || user?.name || "GUEST_USER";
  }, [user]);

  const userIdTag = useMemo(() => {
    return user?.id ? String(user.id).slice(0, 8) : "GUEST";
  }, [user]);

  useEffect(() => {
    const shieldEl = shieldRef.current;

    const deactivateShieldSync = () => {
      document.body.classList.remove("privacy-shield-active");
      if (shieldEl) {
        shieldEl.style.opacity = "0";
        shieldEl.style.pointerEvents = "none";
        shieldEl.style.visibility = "hidden";
      }
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };

    if (!isProtectionActive) {
      deactivateShieldSync();
      return;
    }

    // FUNGSI BLOKIR SINKRON (0ms Latency - GPU Composited Layer)
    // Tampilan pelindung selalu pre-rendered di DOM body, aktivasi hanya mengubah opacity & visibility di GPU (0 milidetik)
    const activateShieldSync = (autoDismissMs = 0) => {
      document.body.classList.add("privacy-shield-active");
      if (shieldEl) {
        shieldEl.style.opacity = "1";
        shieldEl.style.pointerEvents = "auto";
        shieldEl.style.visibility = "visible";
      }

      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }

      // Auto-unlock bila pemicu adalah tombol volume fisik di HP (agar user tidak terjebak)
      if (autoDismissMs > 0) {
        autoDismissTimerRef.current = setTimeout(() => {
          deactivateShieldSync();
        }, autoDismissMs);
      }
    };

    // 1. Deteksi Tombol Pintasan Keyboard & Hardware Button (Mobile & Desktop)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // A. HARDWARE SCREENSHOT DI HP ANDROID (Power + Volume Down)
      // Tombol Volume Down di browser Android mengirimkan key 'AudioVolumeDown', 'VolumeDown', keyCode 174 / 25
      if (
        e.key === "AudioVolumeDown" ||
        e.key === "VolumeDown" ||
        e.code === "VolumeDown" ||
        e.keyCode === 174 ||
        e.keyCode === 25 ||
        e.which === 174 ||
        e.which === 25
      ) {
        activateShieldSync(3500);
        return;
      }

      // Volume Up juga dideteksi (beberapa merk HP menggunakan Power + Volume Up)
      if (
        e.key === "AudioVolumeUp" ||
        e.key === "VolumeUp" ||
        e.code === "VolumeUp" ||
        e.keyCode === 175 ||
        e.keyCode === 24 ||
        e.which === 175 ||
        e.which === 24
      ) {
        activateShieldSync(3500);
        return;
      }

      // B. PrintScreen (Desktop / Laptop)
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        activateShieldSync();
        return;
      }

      // C. Windows + Shift + S atau Cmd + Shift + 3/4/5 (Snipping Tool & Mac Screenshot)
      if ((isCmdOrCtrl || e.key === "Meta") && e.shiftKey && (e.key === "s" || e.key === "S" || e.code === "KeyS")) {
        e.preventDefault();
        activateShieldSync();
        return;
      }

      // D. Tombol Windows (Meta) atau Alt + PrintScreen
      if (e.key === "Meta" || (e.altKey && (e.key === "PrintScreen" || e.code === "PrintScreen"))) {
        activateShieldSync();
        return;
      }

      // E. Ctrl + P / Cmd + P (Print PDF)
      if (isCmdOrCtrl && (e.key === "p" || e.key === "P" || e.code === "KeyP")) {
        e.preventDefault();
        activateShieldSync();
        return;
      }

      // F. Ctrl + S / Cmd + S (Save Webpage)
      if (isCmdOrCtrl && (e.key === "s" || e.key === "S" || e.code === "KeyS")) {
        e.preventDefault();
        activateShieldSync();
        return;
      }

      // G. F12 atau Ctrl + Shift + I / J / C (DevTools Inspect)
      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
        (isCmdOrCtrl && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault();
        activateShieldSync();
        return;
      }
    };

    // Bersihkan clipboard seketika bila tombol PrintScreen dilepas
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard
            .writeText("⚠️ Tangkapan layar dinonaktifkan demi privasi dan keamanan akun (RY-ITSOLUTIONS).")
            .catch(() => {});
        }
      }
    };

    // 2. Deteksi Kehilangan Fokus Window (Snipping Tool, Screen Recorder, Multi-tasking, Alt-Tab)
    const handleBlur = () => {
      activateShieldSync();
    };

    const handleFocus = () => {
      // Jeda pengaman 250ms saat kembali fokus agar proses tangkapan layar selesai dulu
      setTimeout(() => {
        deactivateShieldSync();
      }, 250);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        activateShieldSync();
      } else {
        setTimeout(() => {
          deactivateShieldSync();
        }, 250);
      }
    };

    // 3. Deteksi Gesture Screenshot Mobile (Swipe Down 3 Jari di Xiaomi/Oppo/Realme/Vivo)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        activateShieldSync(3000);
      }
    };

    // 4. Disable Klik Kanan Context Menu & Drag
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true, passive: false });
    window.addEventListener("keyup", handleKeyUp, { capture: true, passive: true });
    window.addEventListener("blur", handleBlur, { capture: true });
    window.addEventListener("focus", handleFocus, { capture: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      deactivateShieldSync();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("blur", handleBlur, { capture: true });
      window.removeEventListener("focus", handleFocus, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [isProtectionActive]);

  const shieldOverlayJSX = (
    <div
      ref={shieldRef}
      id="privacy-screen-shield"
      style={{
        opacity: 0,
        pointerEvents: "none",
        visibility: "hidden",
        transform: "translateZ(0)",
        willChange: "opacity",
        transition: "none",
      }}
      className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-center select-none"
      onClick={() => {
        document.body.classList.remove("privacy-shield-active");
        if (shieldRef.current) {
          shieldRef.current.style.opacity = "0";
          shieldRef.current.style.pointerEvents = "none";
          shieldRef.current.style.visibility = "hidden";
        }
      }}
    >
      <div 
        className="flex max-w-sm w-full flex-col items-center rounded-3xl border border-rose-500/40 bg-[#121214] p-7 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500 ring-4 ring-rose-500/10">
          <ShieldAlert className="h-9 w-9 animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-extrabold text-rose-400 border border-rose-500/20 mb-3">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>TANGKAPAN LAYAR TERDETEKSI</span>
        </div>

        <h2 className="text-xl font-black tracking-tight text-white">Layar Dilindungi</h2>

        <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-300">
          Tangkapan layar dinonaktifkan demi privasi transaksi dan keamanan akun Anda di RY-ITSOLUTIONS.
        </p>

        <div className="mt-4 w-full rounded-2xl bg-white/5 p-3 text-left border border-white/5 space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Informasi Sesi Pengguna:</div>
          <div className="text-xs font-mono font-bold text-emerald-400 truncate">
            {userIdentifier}
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            ID Akun: #{userIdTag} • Status: Terlindungi
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            document.body.classList.remove("privacy-shield-active");
            if (shieldRef.current) {
              shieldRef.current.style.opacity = "0";
              shieldRef.current.style.pointerEvents = "none";
              shieldRef.current.style.visibility = "hidden";
            }
          }}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer hover:brightness-110"
        >
          Buka Kunci Layar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* CSS Pelindung: Print Blocker, Anti-Selection & Background Blur tanpa mengaburkan kartu teks */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body, html { display: none !important; }
            }
            ${
              isProtectionActive
                ? `
              body {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
              }
              img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
                pointer-events: none;
              }
              /* Hanya blur konten anak body KECUALI portal #privacy-screen-shield */
              body.privacy-shield-active > *:not(#privacy-screen-shield) {
                filter: blur(40px) brightness(0.25) !important;
                pointer-events: none !important;
                user-select: none !important;
              }
            `
                : ""
            }
          `,
        }}
      />

      {/* Watermark Rapi & Minimalis: Micro-badge di pojok bawah layar (Tidak Menutupi Konten & Tidak Bikin Pusing) */}
      {isProtectionActive && (
        <div
          className="pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2 z-[40] select-none opacity-60 hover:opacity-90 transition-opacity"
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 px-3 py-0.5 text-[10px] font-mono font-medium text-slate-700 dark:text-neutral-200 backdrop-blur-md shadow-sm">
            <Lock className="h-3 w-3 text-primary" />
            <span>SECURE SESSION: {userIdentifier} • ID:{userIdTag}</span>
          </div>
        </div>
      )}

      {/* Portal Layar Pelindung Privasi Langsung di Body: Menghindari bug pewarisan blur parent */}
      {mounted && createPortal(shieldOverlayJSX, document.body)}

      {/* Khusus Akun Admin: Kontrol Floating Pill dengan Warna Kontras Tinggi (Jelas di Darkmode & Lightmode) */}
      {isAdmin && (
        <div className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2 rounded-full border border-slate-300 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 px-3 py-1.5 shadow-xl backdrop-blur-md text-[11px] font-bold text-slate-800 dark:text-neutral-100">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Admin</span>
          <button
            type="button"
            onClick={() => setAdminTestMode(!adminTestMode)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black transition-all cursor-pointer ${
              adminTestMode
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:text-black dark:hover:text-white"
            }`}
            title="Klik untuk mensimulasikan tampilan pengguna biasa (Anti-Screenshot Aktif)"
          >
            {adminTestMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {adminTestMode ? "Simulasi User: AKTIF" : "Tes Mode User"}
          </button>
        </div>
      )}
    </>
  );
}
