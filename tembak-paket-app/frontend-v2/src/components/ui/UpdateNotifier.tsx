"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const incomingVersion = data.timestamp || data.version;
        if (!incomingVersion) return;

        const storedVersion = localStorage.getItem("app_build_version");
        if (!storedVersion) {
          localStorage.setItem("app_build_version", String(incomingVersion));
        } else if (storedVersion !== String(incomingVersion)) {
          setServerVersion(incomingVersion);
          setUpdateAvailable(true);
        }
      } catch (e) {}
    }

    checkVersion();
    const interval = setInterval(checkVersion, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm sm:max-w-md bg-blue-600/95 dark:bg-blue-700/95 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-blue-400/40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm text-white truncate">Update Baru Tersedia! 🚀</p>
          <p className="text-[11px] sm:text-xs text-blue-100 truncate">Versi baru aplikasi telah siap.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("app_build_version", String(serverVersion));
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
          className="flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Muat Ulang</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition cursor-pointer"
          title="Tutup banner"
          aria-label="Tutup banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
