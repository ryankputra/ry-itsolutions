"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
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
      fetch('/api/imei-packages').then(r => r.json()).catch(() => null),
      fetch('/api/ceirgo-pricing').then(r => r.json()).catch(() => null)
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
      q: "Bagaimana cara bergabung menjadi mitra Reseller?",
      a: "Cukup daftar akun di Ry-ITSolutions. Anda langsung mendapatkan akses harga spesial reseller, fitur cetak nota kustom atas nama toko Anda sendiri, serta komisi dari program referral."
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
              <a href="#testimoni" className="hover:text-primary transition-colors">Testimoni</a>
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
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Layanan Unblock & Verifikasi IMEI Terpercaya
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink leading-[1.15]">
                Aktivasi Sinyal HP Inter <br />
                <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  All Operator & Bergaransi
                </span>
              </h1>

              <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Solusi aktivasi sinyal seluler All Operator (Telkomsel, Indosat, XL, Smartfren, Tri), pengecekan data server CEIR, serta cetak nota transaksi dan surat garansi digital.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/unblock-imei"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-sm shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Buka Gembok IMEI
                </Link>

                <Link
                  href="/cek-ceir"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-sm text-ink transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Cek Status CEIR
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Garansi Sinyal Sesuai Paket
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Proses Cepat & Terpantau
                </span>
              </div>
            </div>

            {/* Right Interactive Device Identifier Widget */}
            <div className="lg:col-span-5">
              <div className="relative p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-2xl shadow-slate-900/10 space-y-5">
                <div className="flex items-center justify-between border-b border-hairline pb-4">
                  <div>
                    <h3 className="font-black text-base text-ink">Simulasi & Deteksi IMEI</h3>
                    <p className="text-xs text-ink-muted mt-0.5">Uji coba deteksi tipe HP secara instan</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                    Live Demo
                  </span>
                </div>

                <div className="space-y-2">
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
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Perangkat Teridentifikasi</span>
                      {analyzed.isValidLuhn && (
                        <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                          GSMA Valid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-slate-800 font-bold shadow-xs">
                        📱
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-emerald-950">{analyzed.brand} {analyzed.model}</h4>
                        <p className="text-xs font-mono font-bold text-emerald-800">IMEI: {testImei}</p>
                      </div>
                    </div>
                  </div>
                ) : testImei.length >= 8 ? (
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs">
                    Perangkat smartphone terdeteksi ({testImei.length}/15 digit).
                  </div>
                ) : null}

                <div className="pt-2">
                  <Link
                    href={`/unblock-imei${testImei.length >= 8 ? `?imei=${testImei}` : ""}`}
                    className="w-full py-3 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-colors"
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

      {/* Stats Counter Bar */}
      <section className="border-y border-hairline bg-parchment/60 py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-primary">50.000+</p>
              <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">IMEI Sukses Diproses</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-emerald-600">99.8%</p>
              <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">Keberhasilan Sinyal</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-indigo-600">1.200+</p>
              <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">Mitra Reseller Aktif</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-amber-500">24 / 7</p>
              <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">Sistem & Customer Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid (id="layanan") */}
      <section id="layanan" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">Layanan Unggulan Kami</h2>
          <p className="text-sm sm:text-base text-ink-muted font-medium">Solusi lengkap untuk pengguna individu, toko HP, maupun master reseller di seluruh Indonesia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-canvas border border-hairline shadow-sm hover:shadow-xl transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-ink">Buka Gembok IMEI</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Aktivasi sinyal HP Inter semua tipe (iPhone & Android) agar dapat menggunakan SIM Card Telkomsel, Indosat, XL, Smartfren, dan Tri sesuai paket yang dipilih.
            </p>
            <ul className="text-xs space-y-2 text-ink/80 pt-2 font-medium">
              <li className="flex items-center gap-2">✓ Jaminan Garansi Sinyal Aktif</li>
              <li className="flex items-center gap-2">✓ Opsi pengerjaan Fast-Track</li>
              <li className="flex items-center gap-2">✓ Diskon kupon promo & harga reseller</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-canvas border border-hairline shadow-sm hover:shadow-xl transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-ink">Cek Status Database CEIR</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Pemeriksaan status pendaftaran IMEI langsung ke database CEIR Kemenperin & Bea Cukai untuk melihat data riwayat whitelist perangkat Anda.
            </p>
            <ul className="text-xs space-y-2 text-ink/80 pt-2 font-medium">
              <li className="flex items-center gap-2">✓ Output Terverifikasi Database CEIR</li>
              <li className="flex items-center gap-2">✓ Laporan Log Riwayat Pengecekan</li>
              <li className="flex items-center gap-2">✓ Bukti otentikasi format surat digital</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-canvas border border-hairline shadow-sm hover:shadow-xl transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-ink">Nota & White-Label Reseller</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Cetak nota kwitansi transaksi dan surat garansi dengan nama toko Anda sendiri lengkap dengan QR Code verifikasi online yang dapat discan oleh konsumen akhir.
            </p>
            <ul className="text-xs space-y-2 text-ink/80 pt-2 font-medium">
              <li className="flex items-center gap-2">✓ Kustomisasi Nama Toko & No. WA</li>
              <li className="flex items-center gap-2">✓ Siap Cetak Thermal / Export PDF</li>
              <li className="flex items-center gap-2">✓ QR Code Status Realtime</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section (id="harga") - 100% Real-time Database Integrated */}
      <section id="harga" className="py-20 bg-parchment/50 border-t border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Transparan & Realtime</span>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">Daftar Paket & Harga Layanan</h2>
            <p className="text-sm sm:text-base text-ink-muted font-medium">Harga live yang terintegrasi langsung dengan database sistem dan paket server kami.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* 1. Paket Pengecekan CEIR */}
            <div className="p-8 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-600 uppercase">Pusat Server CEIR</span>
                <h3 className="text-2xl font-black text-ink">Cek Riwayat CEIR</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-ink">
                    Rp {(ceirgoPricing?.cek_history_imei || 5100).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-ink-muted">/ IMEI</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Pengecekan data pendaftaran server CEIR Kemenperin & Bea Cukai lengkap dengan log query.
                </p>
                <ul className="text-xs space-y-2.5 text-ink/80 pt-2 font-medium">
                  <li className="flex items-center gap-2">✓ Terkoneksi Database Pusat CEIR</li>
                  <li className="flex items-center gap-2">✓ Cek Bea Cukai: Rp {(ceirgoPricing?.cek_imei_beacukai || 1500).toLocaleString('id-ID')}</li>
                  <li className="flex items-center gap-2">✓ Cetak Barcode: Rp {(ceirgoPricing?.create_barcode || 5000).toLocaleString('id-ID')}</li>
                  <li className="flex items-center gap-2">✓ Laporan Cetak Nota Digital</li>
                </ul>
              </div>
              <Link
                href="/cek-ceir"
                className="w-full py-3 rounded-xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-xs text-center text-ink transition-colors block"
              >
                Pilih Paket Cek CEIR
              </Link>
            </div>

            {/* 2. Paket Unblock IMEI (Live from imeiPackages) */}
            {imeiPackages.length > 0 ? (
              imeiPackages.map((pkg, idx) => (
                <div 
                  key={pkg.id || idx}
                  className="p-8 rounded-3xl bg-canvas border-2 border-primary shadow-xl relative space-y-6 flex flex-col justify-between"
                >
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    Paket Rekomendasi ⭐
                  </div>
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-primary uppercase">Durasi {pkg.duration}</span>
                    <h3 className="text-2xl font-black text-ink">Buka Gembok IMEI</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-primary">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-ink-muted">/ unit</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Aktivasi sinyal seluler iPhone & Android untuk semua operator dengan masa garansi aktif {pkg.duration}.
                    </p>
                    <ul className="text-xs space-y-2.5 text-ink font-medium">
                      <li className="flex items-center gap-2">✓ Sinyal All Operator (Telkomsel, Indosat, XL, Tri, Smartfren)</li>
                      <li className="flex items-center gap-2 font-bold text-emerald-600">✓ Masa Garansi Sinyal {pkg.duration}</li>
                      <li className="flex items-center gap-2">✓ Surat Garansi Digital + QR Verifikasi</li>
                      <li className="flex items-center gap-2">✓ Bisa Gunakan Kupon Diskon Promo</li>
                    </ul>
                  </div>
                  <Link
                    href={`/unblock-imei`}
                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs text-center shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] block"
                  >
                    Buka Gembok ({pkg.duration})
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-3xl bg-canvas border-2 border-primary shadow-xl relative space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-primary uppercase">All Operator</span>
                  <h3 className="text-2xl font-black text-ink">Unblock IMEI HP Inter</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-primary">Paket Aktif</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Aktivasi sinyal seluler iPhone & Android untuk semua operator dengan jaminan garansi.
                  </p>
                </div>
                <Link
                  href="/unblock-imei"
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs text-center shadow-lg transition-all block"
                >
                  Lihat Paket di Dashboard
                </Link>
              </div>
            )}

            {/* 3. Paket Mitra Reseller & Referral */}
            <div className="p-8 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-emerald-600 uppercase">Mitra & Reseller</span>
                <h3 className="text-2xl font-black text-ink">Program Reseller</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-600">Diskon Saldo</span>
                  <span className="text-xs text-ink-muted">/ transaksi</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Dapatkan diskon harga khusus per unit untuk reseller dengan volume pesanan rutin dan fitur white-label.
                </p>
                <ul className="text-xs space-y-2.5 text-ink/80 pt-2 font-medium">
                  <li className="flex items-center gap-2">✓ Multi-IMEI Bulk Order (Banyak Unit)</li>
                  <li className="flex items-center gap-2">✓ Nota Custom Atas Nama Toko Sendiri</li>
                  <li className="flex items-center gap-2">✓ Komisi Saldo dari Program Referral</li>
                  <li className="flex items-center gap-2">✓ Prioritas CS & Layanan Cepat</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 rounded-xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-xs text-center text-ink transition-colors block"
              >
                Daftar Jadi Reseller
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Warranty Section (id="garansi") */}
      <section id="garansi" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 font-bold text-xs">
              🛡️ Jaminan Perlindungan Layanan
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Layanan Bergaransi Sinyal & Verifikasi QR Realtime
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Kami memberikan perlindungan masa garansi untuk setiap pesanan unblock IMEI. Pelanggan Anda dapat melakukan verifikasi surat garansi digital dan tanggal pengerjaan secara transparan melalui kamera HP kapan saja.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h4 className="font-bold text-sm text-emerald-400">✓ QR Code Dinamis</h4>
                <p className="text-xs text-slate-400">Scan QR di nota untuk melihat riwayat garansi online.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h4 className="font-bold text-emerald-400">✓ Jaminan Refund Sistem</h4>
                <p className="text-xs text-slate-400">Refund saldo 100% otomatis jika gagal dari sistem.</p>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/cek-garansi"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all"
              >
                Coba Cek Garansi Sekarang
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section (id="testimoni") */}
      <section id="testimoni" className="py-20 bg-parchment/40 border-t border-hairline transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Kepuasan Mitra</span>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">Apa Kata Mereka?</h2>
            <p className="text-sm sm:text-base text-ink-muted font-medium">Dipercaya oleh ribuan pengguna individu dan konter toko HP di seluruh kota.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review 1 */}
            <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
              <div className="flex text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                "Udah langganan unblock puluhan unit iPhone Inter buat stok toko saya. Prosesnya cepet, nota bisa dipakein nama toko sendiri jadi pembeli makin percaya."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                  DA
                </div>
                <div>
                  <h4 className="font-bold text-xs text-ink">Dimas Anggara</h4>
                  <p className="text-[11px] text-ink-muted">Owner Gadget Store, Bandung</p>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
              <div className="flex text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                "iPhone 13 Pro Max saya sempet no service lama. Dikerjain di Ry-ITSolutions 2 jam langsung on Telkomsel 4G lancar jaya sampai sekarang."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                  RN
                </div>
                <div>
                  <h4 className="font-bold text-xs text-ink">Rian Nugraha</h4>
                  <p className="text-[11px] text-ink-muted">Pengguna Pribadi, Jakarta Selatan</p>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
              <div className="flex text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed">
                "Fitur Cek CEIR sama kupon promo 12.12 kemarin ngebantu banget. Ditambah komisi referral saldo ngalir terus tiap temen transaksi."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-xs">
                  HW
                </div>
                <div>
                  <h4 className="font-bold text-xs text-ink">Hendra Wijaya</h4>
                  <p className="text-[11px] text-ink-muted">Master Reseller, Surabaya</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (id="faq") */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Paling Sering Ditanyakan</span>
          <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">Pertanyaan Populer (FAQ)</h2>
          <p className="text-sm text-ink-muted">Semua informasi seputar proses aktivasi IMEI dan garansi layanan.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-canvas border border-hairline overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left font-bold text-sm text-ink flex items-center justify-between gap-4 hover:bg-parchment/50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-lg font-mono text-ink-muted">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-hairline/60 bg-parchment/30 animate-fadeIn">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Siap Aktifkan Sinyal HP Anda Hari Ini?</h2>
          <p className="text-base sm:text-lg opacity-90 max-w-xl mx-auto font-medium">
            Daftar sekarang dan nikmati kemudahan unblock IMEI, cek garansi online, serta dapatkan komisi saldo dari program referral.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-2xl bg-white text-primary hover:bg-slate-100 font-black text-sm shadow-xl transition-all hover:scale-105"
            >
              Daftar Akun Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-2xl bg-primary-focus text-white hover:bg-primary-focus/80 border border-white/20 font-bold text-sm transition-colors"
            >
              Masuk ke Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-hairline text-center text-xs text-ink-muted space-y-2">
        <p className="font-semibold">© {new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
        <p className="font-mono text-[11px]">Sistem Terenkripsi & Otentikasi Digital • Pusat Verifikasi Database CEIR</p>
      </footer>
    </div>
  );
}
