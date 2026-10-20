"use client";

import { useEffect, useState } from "react";

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverVersion = data.timestamp || data.version;
        if (!serverVersion) return;

        const storedVersion = localStorage.getItem("app_build_version");
        if (!storedVersion) {
          localStorage.setItem("app_build_version", String(serverVersion));
        } else if (storedVersion !== String(serverVersion)) {
          setUpdateAvailable(true);
        }
      } catch (e) {}
    }

    checkVersion();
    const interval = setInterval(checkVersion, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-20 right-4 sm:bottom-4 sm:top-auto z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400 animate-bounce">
      <div>
        <p className="font-bold text-sm">Update Baru Tersedia! 🚀</p>
        <p className="text-xs text-blue-100">Versi baru aplikasi telah di-deploy.</p>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("app_build_version");
          window.location.reload();
        }}
        className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition"
      >
        Muat Ulang
      </button>
    </div>
  );
}
