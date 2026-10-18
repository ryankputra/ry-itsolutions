"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { safeJson } from "@/lib/api";
import { analyzeImei } from "@/lib/imeiHelper";

export default function LandingPage() {
  const [testImei, setTestImei] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const analyzed = testImei.length >= 8 ? analyzeImei(testImei) : null;

  // Live Backend Data State
  const [imeiPackages, setImeiPackages] = useState<any[]>([]);
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/imei-packages').then(r => safeJson(r)).catch(() => null),
      fetch('/api/ceirgo-pricing').then(r => safeJson(r)).catch(() => null)
    ]).then(([pkgRes, ceirRes]) => {
      if (pkgRes?.status && Array.isArray(pkgRes.data)) {
        setImeiPackages(pkgRes.data.filter((p: any) => p.isVisible !== 0));
      }
      if (ceirRes?.status && ceirRes.data) {
        setCeirgoPricing(ceirRes.data);
      }
    }).finally(() => setLoadingPackages(false));
  }, []);

  const faqs = [
    {
      q: "Berapa lama proses pengerjaan Add Roamer HP Inter?",
      a: "Rata-rata pengerjaan berkisar antara 1 hingga 24 jam kerja tergantung opsi kecepatan layanan (Fast, Semi-Fast, atau Reguler) yang Anda pilih."
    },
    {
      q: "Bagaimana sistem masa aktif dan garansi sinyal?",
      a: "Masa aktif dan garansi sinyal berlaku sesuai dengan paket layanan yang Anda pilih. Anda dapat memantau sisa hari garansi secara transparan di halaman Cek Garansi."
    },
    {
      q: "Apa syarat HP yang bisa diproses?",
      a: "Pastikan HP Anda bukan barang bypass iCloud/ID dan IC Baseband perangkat dalam kondisi sehat (saat dimasukkan SIM Card muncul status Tidak Ada Layanan / No Service, BUKAN Tidak Ada SIM)."
    },
    {
      q: "Bagaimana cara integrasi Layanan IT & Payment Gateway?",
      a: "Cukup daftar akun gratis di Ry-ITSolutions. Anda langsung mendapatkan akses portal aktivasi sinyal IMEI, pembuatan API Key QRIS GoPay, dan cetak nota digital."
    },
    {
      q: "Apa fungsi layanan Cek CEIR?",
      a: "Layanan Cek CEIR digunakan untuk memeriksa data riwayat dan status pendaftaran IMEI pada gateway CEIR Kemenperin / Bea Cukai secara realtime."
    }
  ];

  // Dark/Light Mode Support with persistence
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme !== 'light';
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-primary selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* Favicon */}
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230071e3' stroke-width='2.5'><path stroke-linecap='round' stroke-linejoin='round' d='M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 10V10.5M4.5 19V10.5'/></svg>" />
      </head>

      {/* Ambient Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] glow-gradient pointer-events-none -z-10" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-xl border-b border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                RY
              </div>
              <span className="font-extrabold tracking-tight text-ink text-lg">Ry-ITSolutions</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-ink-muted">
              <a href="#layanan" className="hover:text-primary transition-colors">Layanan</a>
              <a href="#harga" className="hover:text-primary transition-colors">Daftar Paket</a>
              <a href="#garansi" className="hover:text-primary transition-colors">Garansi</a>
              <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-ink-muted hover:text-ink transition-colors border border-hairline rounded-xl bg-parchment hover:bg-parchment/80 shadow-sm"
              title="Toggle Theme"
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>

            <Link
              href="/cek-garansi"
              className="px-4 py-2 border border-hairline bg-parchment hover:bg-parchment/80 font-medium text-xs text-ink transition-colors rounded-xl shadow-sm"
            >
              Cek Garansi
            </Link>

            <Link
              href="/login"
              className="px-5 py-2.5 bg-primary text-white font-bold text-xs shadow-lg shadow-primary/25 hover:opacity-95 transition-all rounded-xl hover:scale-[1.02]"
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-36 overflow-hidden animate-fade-in-up">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/25 text-primary font-medium text-xs backdrop-blur-md shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                Infrastruktur Sinyal IMEI &amp; Gateway Pembayaran Otomatis
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink leading-[1.08]">
                Sinyal Tanpa Batas, <br />
                <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Gateway Tanpa Kendala.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl font-normal">
                Pusat solusi teknologi digital terpadu: Aktivasi sinyal HP Inter All Operator bergaransi resmi, query database CEIR nasional secara real-time, serta integrasi Payment Gateway QRIS GoPay 24 jam untuk bisnis Anda.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/add-roamer"
                  className="px-7 py-4 bg-primary text-white font-bold text-xs sm:text-sm shadow-xl shadow-primary/25 hover:opacity-95 transition-all rounded-xl flex items-center gap-2.5 hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                  Aktivasi Sinyal IMEI
                </Link>

                <Link
                  href="/gateway"
                  className="px-7 py-4 border border-hairline bg-parchment hover:bg-parchment/80 text-ink font-bold text-xs sm:text-sm transition-all rounded-xl backdrop-blur-md shadow-sm"
                >
                  Payment Gateway GoPay
                </Link>

                <Link
                  href="/cek-ceir"
                  className="px-7 py-4 border border-hairline bg-transparent hover:bg-parchment/40 text-ink font-bold text-xs sm:text-sm transition-all rounded-xl"
                >
                  Cek Status CEIR
                </Link>
              </div>

              {/* Metrics / Trust */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-hairline">
                <div className="space-y-1">
                  <div className="text-3xl font-black text-ink tracking-tight">100%</div>
                  <div className="text-xs text-ink-muted font-medium">Garansi Sinyal Aktif</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-primary tracking-tight">24/7</div>
                  <div className="text-xs text-ink-muted font-medium">Gateway Auto-Mutasi</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-ink tracking-tight">CEIR</div>
                  <div className="text-xs text-ink-muted font-medium">Database Nasional</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-blue-600 tracking-tight">API</div>
                  <div className="text-xs text-ink-muted font-medium">Webhook Instan</div>
                </div>
              </div>
            </div>

            {/* Right Widget: Modern Interactive Glassmorphic Card */}
            <div className="lg:col-span-5">
              <div className="relative p-7 sm:p-9 rounded-3xl bg-parchment border border-hairline backdrop-blur-2xl shadow-2xl space-y-6 group hover:border-primary/50 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 rounded-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-hairline pb-4 relative z-10">
                  <div>
                    <h2 className="font-bold text-sm text-ink tracking-wide">Live IMEI Inspector</h2>
                    <p className="text-xs text-ink-muted mt-0.5">Deteksi otomatis spesifikasi perangkat dari TAC</p>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 font-mono text-[10px] uppercase font-bold rounded-full">
                    Active System
                  </span>
                </div>

                <div className="space-y-2 relative z-10">
                  <label className="text-xs font-semibold text-ink">Nomor IMEI (15 Digit)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={testImei}
                    onChange={(e) => setTestImei(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 353969101788981"
                    className="w-full px-4.5 py-4 bg-canvas border border-hairline focus:border-primary font-mono text-sm outline-none transition-all text-ink rounded-2xl placeholder:text-ink-muted/50 shadow-inner"
                  />
                  <p className="text-[11px] text-ink-muted">Masukkan minimal 8 digit pertama IMEI Anda.</p>
                </div>

                {analyzed?.brand ? (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-2 relative z-10 animate-fade-in-up">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-primary font-bold uppercase">Perangkat Teridentifikasi</span>
                      {analyzed.isValidLuhn && (
                        <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold rounded-md">
                          GSMA Valid
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {analyzed.brand} {analyzed.model}
                    </div>
                    <div className="text-xs font-mono text-ink-muted">
                      IMEI: {testImei}
                    </div>
                  </div>
                ) : testImei.length >= 8 ? (
                  <div className="p-4 bg-canvas border border-hairline text-xs font-mono text-ink-muted rounded-2xl relative z-10">
                    Menganalisis TAC {testImei.slice(0, 8)}...
                  </div>
                ) : null}

                <div className="pt-2 relative z-10">
                  <Link
                    href={`/add-roamer${testImei.length >= 8 ? `?imei=${testImei}` : ""}`}
                    className="w-full py-4 bg-primary text-white hover:opacity-95 font-bold text-xs uppercase tracking-wider text-center block rounded-2xl shadow-lg shadow-primary/25"
                  >
                    Proses Unblock Perangkat Ini &gt;
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Grid with Smooth Scroll Animation */}
      <section id="layanan" className="py-28 max-w-7xl mx-auto px-6 space-y-16 border-t border-hairline relative">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Arsitektur Layanan</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">Solusi Sistem &amp; Perangkat Terpadu</h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
            Pilar operasional digital yang dirancang untuk kecepatan transaksi, keamanan tinggi, dan otomatisasi 24 jam.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-primary/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-primary transition-colors">Aktivasi Sinyal HP Inter</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Add Roamer resmi untuk iPhone &amp; Android All Operator (Telkomsel, Indosat, XL, Tri, Smartfren) dengan garansi aktif dan update progress transparan.
              </p>
            </div>
            <Link href="/add-roamer" className="text-xs font-bold text-primary hover:underline pt-2 flex items-center gap-1">
              Buka Layanan Sinyal &gt;
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-blue-500/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-blue-600 transition-colors">Payment Gateway GoPay &amp; QRIS</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Infrastruktur SaaS pembayaran otomatis 24 jam dengan pengecekan mutasi real-time dan webhook instan ke server Anda.
              </p>
            </div>
            <Link href="/gateway" className="text-xs font-bold text-blue-600 hover:underline pt-2 flex items-center gap-1">
              Pelajari Gateway &gt;
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-emerald-500/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-emerald-600 transition-colors">Cek Database CEIR &amp; Bea Cukai</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Query pemeriksaan status pendaftaran IMEI pada gateway database nasional CEIR Kemenperin &amp; Bea Cukai secara instan.
              </p>
            </div>
            <Link href="/cek-ceir" className="text-xs font-bold text-emerald-600 hover:underline pt-2 flex items-center gap-1">
              Cek CEIR Sekarang &gt;
            </Link>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-indigo-500/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-indigo-600 transition-colors">Surat Garansi &amp; Nota Digital</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Cetak kwitansi transaksi dan surat garansi resmi berstandar toko Anda lengkap dengan QR Code verifikasi online.
              </p>
            </div>
            <Link href="/cek-garansi" className="text-xs font-bold text-indigo-600 hover:underline pt-2 flex items-center gap-1">
              Cek Surat Garansi &gt;
            </Link>
          </div>

          {/* Card 5 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-amber-500/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-amber-600 transition-colors">Otomasi WhatsApp &amp; Bot Order</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Bot Baileys 24/7 dan Telegram bot untuk notifikasi instan pesanan masuk, update status antrean, dan konfirmasi pembayaran.
              </p>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-amber-600 hover:underline pt-2 flex items-center gap-1">
              Buka Dashboard &gt;
            </Link>
          </div>

          {/* Card 6 */}
          <div className="p-8 rounded-3xl bg-parchment border border-hairline hover:border-purple-500/60 hover:shadow-xl transition-all duration-300 space-y-6 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18"/></svg>
              </div>
              <h3 className="text-xl font-bold text-ink group-hover:text-purple-600 transition-colors">Konsultasi IT 24/7</h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Pendampingan teknis responsif via WhatsApp dan Telegram untuk konfigurasi API gateway dan kendala sistem.
              </p>
            </div>
            <a href="https://wa.me/6285770020477" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-purple-600 hover:underline pt-2 flex items-center gap-1">
              Hubungi CS WhatsApp &gt;
            </a>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="py-28 bg-canvas border-t border-hairline">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Daftar Paket Harga</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">Transparansi Tarif &amp; Layanan</h2>
            <p className="text-sm sm:text-base text-ink-muted">Terhubung langsung dengan database sistem operasional kami.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Tier 1 */}
            <div className="p-8 sm:p-10 rounded-3xl bg-parchment border border-hairline space-y-8 flex flex-col justify-between shadow-xl">
              <div className="space-y-5">
                <span className="text-xs font-mono text-indigo-600 font-bold uppercase tracking-wider">CEIR Database</span>
                <h3 className="text-2xl font-bold text-ink">Cek Riwayat IMEI</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-ink">
                    Rp {(ceirgoPricing?.cek_history_imei || 5100).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-ink-muted">/ pengecekan</span>
                </div>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Pemeriksaan database pendaftaran CEIR Kemenperin &amp; Bea Cukai dengan log riwayat lengkap.
                </p>
                <ul className="text-xs sm:text-sm space-y-3 text-ink-muted pt-3 border-t border-hairline">
                  <li className="flex items-center gap-2">✓ Cek Bea Cukai: Rp {(ceirgoPricing?.cek_imei_beacukai || 1500).toLocaleString('id-ID')}</li>
                  <li className="flex items-center gap-2">✓ Cetak Barcode: Rp {(ceirgoPricing?.create_barcode || 5000).toLocaleString('id-ID')}</li>
                </ul>
              </div>
              <Link
                href="/cek-ceir"
                className="w-full py-4 bg-canvas border border-hairline hover:bg-parchment font-bold text-xs uppercase tracking-wider text-center text-ink block rounded-2xl transition-all shadow-sm"
              >
                Pilih Cek CEIR
              </Link>
            </div>

            {/* Tier 2 */}
            {imeiPackages.length > 0 ? (
              imeiPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-parchment via-parchment to-primary/5 border-2 border-primary space-y-8 flex flex-col justify-between relative shadow-2xl"
                >
                  <div className="absolute -top-3 left-8 px-4 py-1 bg-primary text-white font-mono text-[11px] uppercase font-bold tracking-wider rounded-full shadow-md">
                    Rekomendasi Utama
                  </div>
                  <div className="space-y-5">
                    <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">Add Roamer {pkg?.duration || "1 Bulan"}</span>
                    <h3 className="text-2xl font-bold text-ink">Aktivasi Sinyal</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-primary">
                        Rp {Number(pkg?.price || 0).toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-ink-muted">/ unit</span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                      Aktivasi seluler iPhone &amp; Android semua operator dengan garansi aktif masa berlaku {pkg?.duration || "resmi"}.
                    </p>
                    <ul className="text-xs sm:text-sm space-y-3 text-ink-muted pt-3 border-t border-hairline">
                      <li className="flex items-center gap-2 text-primary font-semibold">✓ Telkomsel, Indosat, XL, Tri, Smartfren</li>
                      <li className="flex items-center gap-2">✓ Garansi Sinyal {pkg?.duration || "Aktif"}</li>
                      <li className="flex items-center gap-2">✓ Surat Garansi Digital + QR Verifikasi</li>
                    </ul>
                  </div>
                  <Link
                    href="/add-roamer"
                    className="w-full py-4 bg-primary text-white hover:opacity-95 font-bold text-xs uppercase tracking-wider text-center block rounded-2xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02]"
                  >
                    Proses Add Roamer &gt;
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 sm:p-10 rounded-3xl bg-parchment border-2 border-primary space-y-8 flex flex-col justify-between shadow-2xl">
                <div className="space-y-5">
                  <span className="text-xs font-mono text-primary font-bold uppercase">Add Roamer</span>
                  <h3 className="text-2xl font-bold text-ink">Aktivasi Sinyal All Operator</h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    Aktivasi seluler iPhone &amp; Android untuk semua operator seluler dengan jaminan garansi.
                  </p>
                </div>
                <Link
                  href="/add-roamer"
                  className="w-full py-4 bg-primary text-white font-bold text-xs uppercase tracking-wider text-center block rounded-2xl"
                >
                  Buka Dashboard Add Roamer
                </Link>
              </div>
            )}

            {/* Tier 3 */}
            <div className="p-8 sm:p-10 rounded-3xl bg-parchment border border-hairline space-y-8 flex flex-col justify-between shadow-xl">
              <div className="space-y-5">
                <span className="text-xs font-mono text-blue-600 font-bold uppercase tracking-wider">Payment Gateway</span>
                <h3 className="text-2xl font-bold text-ink">Gateway QRIS GoPay</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-ink">Rp 35.000</span>
                  <span className="text-xs text-ink-muted">/ aktivasi</span>
                </div>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Infrastruktur pembayaran QRIS instan untuk website atau bot Anda dengan pengecekan otomatis.
                </p>
                <ul className="text-xs sm:text-sm space-y-3 text-ink-muted pt-3 border-t border-hairline">
                  <li className="flex items-center gap-2">✓ Perpanjangan: Rp 10.000 / bulan</li>
                  <li className="flex items-center gap-2">✓ Mutasi Real-time 24 Jam</li>
                  <li className="flex items-center gap-2">✓ Webhook API &amp; Sandbox Tester</li>
                </ul>
              </div>
              <Link
                href="/gateway"
                className="w-full py-4 bg-canvas border border-hairline hover:bg-parchment font-bold text-xs uppercase tracking-wider text-center text-ink block rounded-2xl transition-all shadow-sm"
              >
                Mulai Integrasi Gateway
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Warranty Banner */}
      <section id="garansi" className="py-24 max-w-7xl mx-auto px-6">
        <div className="p-10 sm:p-14 rounded-3xl bg-parchment border border-hairline space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-primary/10 blur-[100px] pointer-events-none" />
          <span className="text-xs font-mono text-primary font-bold uppercase tracking-widest">Garansi &amp; Transparansi</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight max-w-2xl">
            Surat Garansi Digital Resmi &amp; Verifikasi QR Code Real-time.
          </h2>
          <p className="text-xs sm:text-base text-ink-muted leading-relaxed max-w-2xl">
            Setiap transaksi aktivasi sinyal dilengkapi dengan dokumen garansi digital dan QR Code unik yang dapat dipindai untuk memastikan status masa berlaku garansi perangkat Anda.
          </p>
          <div>
            <Link
              href="/cek-garansi"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/25 hover:opacity-95 transition-all hover:scale-[1.02]"
            >
              Cek Status Garansi Sekarang &gt;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 max-w-3xl mx-auto px-6 space-y-12 border-t border-hairline">
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Pusat Informasi</span>
          <h2 className="text-3xl font-bold text-ink tracking-tight">Pertanyaan Umum</h2>
          <p className="text-xs sm:text-sm text-ink-muted">Ketentuan layanan, proses pengerjaan, dan sistem garansi.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-hairline bg-parchment rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-6 text-left font-bold text-sm sm:text-base text-ink flex items-center justify-between gap-4 hover:bg-canvas transition-colors"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-primary text-lg">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="p-6 pt-0 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-hairline bg-canvas">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 border-t border-hairline bg-canvas">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Mulai Aktivasi Sinyal &amp; Integrasi Sistem Anda</h2>
          <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
            Daftar akun gratis dan nikmati kemudahan pengelolaan Add Roamer serta pembayaran otomatis.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="px-8 py-4 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
            >
              Daftar Akun Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border border-hairline bg-parchment hover:bg-canvas text-ink font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-hairline text-center text-xs font-mono text-ink-muted space-y-2">
        <p className="font-bold text-ink">&copy; {new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
        <p>Infrastruktur Layanan Aktivasi Sinyal IMEI &amp; Gateway Pembayaran Digital</p>
      </footer>
    </div>
  );
}
