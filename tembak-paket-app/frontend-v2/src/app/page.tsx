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
      q: "Berapa lama proses pengerjaan unblock IMEI HP Inter?",
      a: "Rata-rata pengerjaan berkisar antara 1 hingga 24 jam kerja tergantung opsi kecepatan layanan (Fast, Semi-Fast, atau Reguler) yang Anda pilih."
    },
    {
      q: "Bagaimana sistem masa aktif dan garansi sinyal?",
      a: "Masa aktif dan garansi sinyal berlaku sesuai dengan paket layanan yang Anda pilih. Anda dapat memantau sisa hari garansi dan masa berlaku pengerjaan secara transparan di halaman Cek Garansi."
    },
    {
      q: "Apa syarat HP yang bisa diproses?",
      a: "Pastikan HP Anda bukan barang bypass iCloud/ID dan IC Baseband perangkat dalam kondisi sehat (saat dimasukkan SIM Card muncul status 'Tidak Ada Layanan' / 'No Service', BUKAN 'Tidak Ada SIM')."
    },
    {
      q: "Bagaimana cara integrasi Layanan IT & Payment Gateway?",
      a: "Cukup daftar akun gratis di Ry-ITSolutions. Anda langsung mendapatkan akses portal aktivasi sinyal IMEI, pembuatan API Key QRIS GoPay, cetak nota digital, dan integrasi API untuk bisnis Anda."
    },
    {
      q: "Apa fungsi layanan Cek CEIR?",
      a: "Layanan Cek CEIR digunakan untuk memeriksa data riwayat dan status pendaftaran IMEI pada gateway CEIR Kemenperin / Bea Cukai secara realtime."
    }
  ];

  // Dark Mode Support
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    <div className="min-h-screen bg-canvas text-ink selection:bg-primary selection:text-white scroll-smooth transition-colors duration-200">
      {/* Public Top Navbar */}
      <header className="sticky top-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={32} />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-muted">
              <a href="#layanan" className="hover:text-primary transition-colors">Layanan</a>
              <a href="#harga" className="hover:text-primary transition-colors">Daftar Paket</a>
              <a href="#garansi" className="hover:text-primary transition-colors">Garansi</a>
              <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-parchment flex items-center justify-center"
              title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-700 hover:text-slate-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <Link
              href="/cek-garansi"
              className="px-3.5 py-2 rounded-xl border border-hairline bg-parchment hover:bg-parchment/80 font-bold text-xs sm:text-sm text-ink transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="hidden sm:inline">Cek Garansi</span>
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs sm:text-sm shadow-md shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Pusat Solusi IT, Otomasi &amp; FinTech Digital Terintegrasi
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink leading-[1.15]">
                Solusi Teknologi &amp; Layanan Digital <br />
                <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Cepat, Terpercaya &amp; Terintegrasi
                </span>
              </h1>

              <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Pusat kebutuhan IT &amp; gadget terpadu: Mulai dari aktivasi sinyal seluler HP Inter All Operator bergaransi, integrasi Payment Gateway GoPay &amp; QRIS otomatis untuk website/bot toko, query gateway CEIR nasional, hingga sistem nota kustom digital.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/unblock-imei"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary text-white hover:bg-primary/90 font-bold text-sm shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  Aktivasi Sinyal HP
                </Link>

                <Link
                  href="/gateway"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-primary text-white hover:opacity-95 font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 0v3.75m0-3.75l-3.75 3.75" />
                  </svg>
                  Payment Gateway GoPay
                </Link>

                <Link
                  href="/cek-ceir"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-sm text-ink transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Cek Status CEIR
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs font-semibold text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Buka Sinyal All Operator
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Payment Gateway QRIS
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Gateway Database CEIR
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Garansi Digital Resmi
                </span>
              </div>
            </div>

            {/* Right Interactive Device Identifier Widget */}
            <div className="lg:col-span-5">
              <div className="relative p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-ink">Simulasi & Deteksi Tipe HP</h3>
                    <p className="text-xs text-ink-muted">Cek kecocokan tipe perangkat dari nomor IMEI</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase">
                    Live Demo
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Ketik/Tempelkan Nomor IMEI:</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={testImei}
                    onChange={(e) => setTestImei(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 353969101788981"
                    className="w-full px-4 py-3 rounded-xl bg-parchment border border-hairline font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-primary transition-all text-ink placeholder:text-ink-muted"
                  />
                  <p className="text-[11px] text-ink-muted">Ketik minimal 8 digit pertama (TAC) untuk melihat tipe HP.</p>
                </div>

                {/* Detection Preview */}
                {analyzed?.brand ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Perangkat Teridentifikasi</span>
                      {analyzed.isValidLuhn && (
                        <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                          GSMA Valid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-slate-800 font-bold shadow-xs">
                        📱
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-emerald-950">{analyzed.brand} {analyzed.model}</h4>
                        <p className="text-[11px] font-mono font-bold text-emerald-800">IMEI: {testImei}</p>
                      </div>
                    </div>
                  </div>
                ) : testImei.length >= 8 ? (
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs">
                    Perangkat smartphone terdeteksi ({testImei.length}/15 digit).
                  </div>
                ) : null}

                <div className="pt-1">
                  <Link
                    href={`/unblock-imei${testImei.length >= 8 ? `?imei=${testImei}` : ""}`}
                    className="w-full py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-colors"
                  >
                    Proses Unblock Perangkat Ini
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid (id="layanan") - 6 Universal IT Solutions Pillars */}
      <section id="layanan" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
            Ekosistem Solusi IT Terpadu
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">Layanan &amp; Solusi Digital Kami</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Menyediakan kebutuhan solusi teknologi terpadu untuk gadget, integrasi sistem pembayaran bisnis, otomasi bot, dan basis data resmi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Buka Gembok IMEI */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-primary/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-primary transition-colors">Aktivasi Sinyal HP Inter</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Aktivasi sinyal seluler iPhone &amp; Android All Operator (Telkomsel, Indosat, XL, Smartfren, Tri) bergaransi dengan pilihan durasi 3 bln, 1 thn, hingga permanen.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Garansi sinyal aktif sesuai paket</li>
                <li className="flex items-center gap-2">✓ Support semua tipe iPhone &amp; Android</li>
                <li className="flex items-center gap-2">✓ Update progres transparan via WA</li>
              </ul>
            </div>
            <Link
              href="/unblock-imei"
              className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Lihat Paket Sinyal &gt;
            </Link>
          </div>

          {/* Card 2: Payment Gateway GoPay & QRIS */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 0v3.75m0-3.75l-3.75 3.75" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-ink group-hover:text-blue-600 transition-colors">Payment Gateway GoPay &amp; QRIS</h3>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Solusi SaaS integrasi pembayaran otomatis 24 jam untuk website toko online, bot Telegram, atau aplikasi Android Anda via API Key &amp; Webhook instan.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Aktivasi Rp 35.000 (Perpanjang Rp 10.000 / bln)</li>
                <li className="flex items-center gap-2">✓ Uang langsung masuk rekening GoPay</li>
                <li className="flex items-center gap-2">✓ Auto-check mutasi &amp; HTTP Webhook</li>
              </ul>
            </div>
            <Link
              href="/gateway"
              className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Mulai Integrasi Gateway &gt;
            </Link>
          </div>

          {/* Card 3: Cek Database CEIR */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-emerald-600 transition-colors">Cek Database CEIR &amp; Bea Cukai</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Pemeriksaan status pendaftaran IMEI pada gateway database CEIR Kemenperin &amp; Bea Cukai untuk verifikasi data whitelist nasional secara realtime.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Terkoneksi gateway server CEIR</li>
                <li className="flex items-center gap-2">✓ Riwayat log query lengkap &amp; akurat</li>
                <li className="flex items-center gap-2">✓ Hasil cek instan dalam hitungan detik</li>
              </ul>
            </div>
            <Link
              href="/cek-ceir"
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Cek Status CEIR Sekarang &gt;
            </Link>
          </div>

          {/* Card 4: Surat Garansi & Nota Toko */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-indigo-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-indigo-600 transition-colors">Surat Garansi &amp; Nota Digital</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Cetak nota kwitansi transaksi dan surat garansi resmi atas nama toko Anda sendiri lengkap dengan QR Code verifikasi online dan barcode scanner.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Cetak nota custom nama toko Anda</li>
                <li className="flex items-center gap-2">✓ QR verifikasi masa aktif sinyal</li>
                <li className="flex items-center gap-2">✓ Desain profesional siap kirim ke customer</li>
              </ul>
            </div>
            <Link
              href="/cek-garansi"
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              Cek Garansi &amp; Nota &gt;
            </Link>
          </div>

          {/* Card 5: Otomasi Bot & Notifikasi WA */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-emerald-600 transition-colors">Otomasi WhatsApp &amp; Bot Order</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Sistem pengiriman bukti transaksi, nota digital otomatis, update status antrean, dan notifikasi pesanan ke WhatsApp &amp; Telegram pelanggan secara realtime.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Integrasi WhatsApp Baileys 24/7</li>
                <li className="flex items-center gap-2">✓ Bot Telegram antrean admin</li>
                <li className="flex items-center gap-2">✓ Notifikasi instan pembayaran sukses</li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Lihat Sistem Otomasi &gt;
            </Link>
          </div>

          {/* Card 6: Dukungan Teknis & Konsultasi IT 24/7 */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-emerald-600 transition-colors">Dukungan Teknis &amp; Konsultasi IT</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">
                  Bantuan teknis responsif melalui WhatsApp dan Telegram. Tim kami siap mendampingi kendala aktivasi sinyal, setup gateway, dan panduan integrasi sistem.
                </p>
              </div>
              <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
                <li className="flex items-center gap-2">✓ Layanan bantuan CS responsif 24/7</li>
                <li className="flex items-center gap-2">✓ Panduan setup API &amp; Webhook</li>
                <li className="flex items-center gap-2">✓ Pantauan kendala database CEIR realtime</li>
              </ul>
            </div>
            <a
              href="https://wa.me/6285770020477"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Hubungi Bantuan CS WhatsApp &gt;
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section (id="harga") - 100% Real-time Database Integrated */}
      <section id="harga" className="py-16 bg-parchment/40 border-t border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Daftar Paket</span>
            <h2 className="text-3xl font-black text-ink tracking-tight">Pilihan Paket & Harga</h2>
            <p className="text-sm text-ink-muted">Harga terintegrasi langsung dengan database sistem kami.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* 1. Paket Pengecekan CEIR */}
            <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <span className="text-[11px] font-bold text-indigo-600 uppercase">Pusat Server CEIR</span>
                <h3 className="text-xl font-bold text-ink">Cek Riwayat CEIR</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-ink">
                    Rp {(ceirgoPricing?.cek_history_imei || 5100).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-ink-muted">/ IMEI</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Pengecekan data pendaftaran server CEIR & Bea Cukai lengkap dengan log query.
                </p>
                <ul className="text-xs space-y-2 text-ink-muted pt-1">
                  <li className="flex items-center gap-2">✓ Terkoneksi Database Pusat CEIR</li>
                  <li className="flex items-center gap-2">✓ Cek Bea Cukai: Rp {(ceirgoPricing?.cek_imei_beacukai || 1500).toLocaleString('id-ID')}</li>
                  <li className="flex items-center gap-2">✓ Cetak Barcode: Rp {(ceirgoPricing?.create_barcode || 5000).toLocaleString('id-ID')}</li>
                </ul>
              </div>
              <Link
                href="/cek-ceir"
                className="w-full py-2.5 rounded-xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-xs text-center text-ink transition-colors block"
              >
                Pilih Paket Cek CEIR
              </Link>
            </div>

            {/* 2. Paket Unblock IMEI (Live from imeiPackages) */}
            {imeiPackages.length > 0 ? (
              imeiPackages.map((pkg, idx) => (
                <div 
                  key={pkg.id || idx}
                  className="p-6 sm:p-8 rounded-3xl bg-canvas border-2 border-primary shadow-md relative space-y-5 flex flex-col justify-between"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                    Paket Utama ⭐
                  </div>
                  <div className="space-y-3.5">
                    <span className="text-[11px] font-bold text-primary uppercase">Durasi {pkg?.duration || "1 Bulan"}</span>
                    <h3 className="text-xl font-bold text-ink">Buka Gembok IMEI</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary">
                        Rp {Number(pkg?.price || 0).toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-ink-muted">/ unit</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Aktivasi sinyal seluler iPhone & Android semua operator dengan masa garansi aktif {pkg?.duration || "Garansi Aktif"}.
                    </p>
                    <ul className="text-xs space-y-2 text-ink-muted pt-1">
                      <li className="flex items-center gap-2">✓ Sinyal All Operator (Telkomsel, Indosat, XL, Tri, Smartfren)</li>
                      <li className="flex items-center gap-2 font-bold text-emerald-600">✓ Masa Garansi Sinyal {pkg?.duration || "Sinyal Aktif"}</li>
                      <li className="flex items-center gap-2">✓ Surat Garansi Digital + QR Verifikasi</li>
                    </ul>
                  </div>
                  <Link
                    href={`/unblock-imei`}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs text-center shadow-md shadow-primary/20 transition-all block"
                  >
                    Buka Gembok ({pkg?.duration || "Pilih Paket"})
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 sm:p-8 rounded-3xl bg-canvas border-2 border-primary shadow-md relative space-y-5 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <span className="text-[11px] font-bold text-primary uppercase">All Operator</span>
                  <h3 className="text-xl font-bold text-ink">Unblock IMEI HP Inter</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Aktivasi sinyal seluler iPhone & Android untuk semua operator dengan jaminan garansi.
                  </p>
                </div>
                <Link
                  href="/unblock-imei"
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs text-center shadow-md transition-all block"
                >
                  Lihat Paket di Dashboard
                </Link>
              </div>
            )}

            {/* 3. Payment Gateway GoPay & QRIS Unofficial */}
            <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Payment Gateway SaaS</span>
                <h3 className="text-xl font-bold text-ink">Gateway QRIS GoPay</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-600">Rp 35.000</span>
                  <span className="text-xs text-ink-muted">aktivasi (perpanjang Rp 10.000/bln)</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Integrasi pembayaran QRIS otomatis untuk website atau bot Anda dengan mutasi real-time langsung ke rekening GoPay.
                </p>
                <ul className="text-xs space-y-2 text-ink-muted pt-1">
                  <li className="flex items-center gap-2">✓ Auto Check Mutasi 24 Jam Non-stop</li>
                  <li className="flex items-center gap-2">✓ Webhook Notifikasi Instan ke Server</li>
                  <li className="flex items-center gap-2">✓ Token API Key &amp; Sandbox Tester</li>
                </ul>
              </div>
              <Link
                href="/gateway"
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs text-center shadow-xs transition-colors block"
              >
                Buka Layanan Gateway
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Warranty Section (id="garansi") */}
      <section id="garansi" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#004080] via-[#005bb5] to-[#0066cc] text-white relative overflow-hidden shadow-xl">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs">
              🛡️ Perlindungan & Transparansi
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              Layanan Bergaransi Sinyal & Verifikasi QR Realtime
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Setiap pengerjaan dilengkapi surat garansi digital dan QR Code yang dapat discan kapan saja untuk memeriksa status dan masa berlaku garansi perangkat.
            </p>
            <div className="pt-2">
              <Link
                href="/cek-garansi"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary font-bold text-xs shadow-md hover:bg-white/90 transition-all"
              >
                Cek Status Garansi
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (id="faq") */}
      <section id="faq" className="py-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Pusat Informasi</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">Pertanyaan yang Sering Diajukan</h2>
          <p className="text-xs text-ink-muted">Informasi seputar proses aktivasi IMEI dan ketentuan garansi.</p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-canvas border border-hairline overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-xs sm:text-sm text-ink flex items-center justify-between gap-4 hover:bg-parchment/50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-base font-mono text-ink-muted">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-xs text-ink-muted leading-relaxed border-t border-hairline/60 bg-parchment/30 animate-fadeIn">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="bg-canvas border-t border-hairline py-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">Mulai Aktivasi IMEI Anda Sekarang</h2>
          <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
            Daftar akun gratis dan nikmati kemudahan unblock IMEI serta cek garansi digital online.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-105"
            >
              Daftar Akun Gratis
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-xs text-ink transition-colors"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-hairline text-center text-xs text-ink-muted space-y-1.5">
        <p className="font-semibold text-ink">© {new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
        <p className="text-[11px] text-ink-muted">Portal Layanan Aktivasi Sinyal & Database CEIR</p>
      </footer>
    </div>
  );
}
