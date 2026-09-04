"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MainLayout ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 px-6 text-center space-y-5 animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20 shadow-xs">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-black text-ink">Gagal Memuat Halaman</h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          Terjadi kendala saat memuat data halaman ini. Silakan muat ulang atau kembali ke halaman pesanan.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <Button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold text-xs shadow-sm transition-all"
        >
          Coba Lagi
        </Button>
        <Link
          href="/history"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-hairline bg-canvas hover:bg-parchment text-ink font-bold text-xs transition-all inline-block"
        >
          Kembali ke Pesanan Saya
        </Link>
      </div>
    </div>
  );
}
