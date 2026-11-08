import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-[#f8fafc] dark:bg-black text-slate-800 dark:text-neutral-100">
      <div className="w-full max-w-[420px] text-center space-y-4">
        <Link href="/" className="inline-flex items-center justify-center hover:opacity-90 transition-opacity">
          <Logo size={48} />
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            404
          </h1>
          <h2 className="text-lg font-bold text-slate-800 dark:text-neutral-200">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
