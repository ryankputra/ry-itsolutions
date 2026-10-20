"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, RotateCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminModeBypassPage() {
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/dev-mode-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.status) {
        localStorage.setItem("ryy_dev_mode", "true");
        router.push("/admin/settings");
      } else {
        setError(data.message || "Passkey salah.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-hairline rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <Wrench className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-lg font-bold text-ink">Admin Developer Mode (Jalur Belakang)</h1>
          <p className="text-xs text-ink-muted">
            Masukkan sandi khusus atau pastikan Anda login sebagai Admin untuk membypass mode maintenance dan mengaktifkan Developer Bar.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleBypass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase tracking-wider">
              Admin Passkey / Token
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Masukkan passkey admin..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-2.5 text-xs font-bold gap-2">
            {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Buka Developer Mode & Bypass
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-hairline">
          <a href="/login" className="text-[11px] text-primary hover:underline font-semibold">
            Kembali ke Login Reguler
          </a>
        </div>
      </div>
    </div>
  );
}
