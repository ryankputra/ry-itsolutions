"use client";

import { useEffect, useState } from "react";
import { Wrench, ShieldAlert, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const dev = localStorage.getItem("ryy_dev_mode") === "true";
    setIsDev(dev);

    fetch("/api/admin/maintenance-status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status && data.maintenanceMode) {
          setMaintenance(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <>{children}</>;
  }

  // Jika mode maintenance aktif dan user TIDAK di mode developer, tampilkan halaman maintenance elegan
  if (maintenance && !isDev) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="max-w-md w-full bg-card/90 backdrop-blur-xl border border-hairline rounded-3xl p-8 shadow-2xl text-center space-y-6 relative z-10">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner ring-4 ring-amber-500/20">
            <Wrench className="w-8 h-8 animate-spin" style={{ animationDuration: "6s" }} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[11px] font-extrabold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Maintenance Mode
            </div>
            <h1 className="text-xl font-extrabold text-ink tracking-tight">Situs Sedang Dalam Pemeliharaan</h1>
            <p className="text-xs text-ink-muted leading-relaxed">
              Mohon maaf atas ketidaknyamanannya. RyyStore IT Solutions sedang memperbarui sistem untuk performa yang lebih optimal. Silakan kembali beberapa saat lagi.
            </p>
          </div>

          <div className="p-3 bg-canvas/80 border border-hairline rounded-xl text-[11px] text-ink-muted flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Akses khusus admin tersedia via jalur belakang.</span>
          </div>

          <div className="pt-2">
            <a href="/adminmode">
              <Button className="w-full text-xs font-bold gap-2 py-2.5 shadow-lg shadow-primary/20">
                Login Jalur Belakang (Admin)
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
