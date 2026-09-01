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
                Portal Layanan Sinyal & Database CEIR
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink leading-[1.15]">
                Aktivasi Sinyal HP Inter <br />
                <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  All Operator & Bergaransi
                </span>
              </h1>

              <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Layanan aktivasi sinyal seluler All Operator, pengecekan riwayat database gateway CEIR, serta cetak nota transaksi dan surat garansi digital online.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/unblock-imei"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-primary text-white hover:bg-primary/90 font-bold text-sm shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
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
              <div className="pt-2 flex items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-ink-muted">
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

      {/* Services Grid (id="layanan") */}
      <section id="layanan" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-ink tracking-tight">Layanan Utama</h2>
          <p className="text-sm text-ink-muted">Aktivasi sinyal terstruktur dengan laporan digital dan garansi transparan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-primary/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ink">Buka Gembok IMEI</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Aktivasi sinyal seluler iPhone & Android untuk semua operator (Telkomsel, Indosat, XL, Smartfren, Tri) dengan jaminan masa aktif sesuai paket yang dipilih.
            </p>
            <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
              <li className="flex items-center gap-2">✓ Garansi sinyal aktif</li>
              <li className="flex items-center gap-2">✓ Dukungan iPhone & Android</li>
              <li className="flex items-center gap-2">✓ Notifikasi progres pengerjaan</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-primary/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ink">Cek Riwayat Database CEIR</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Pemeriksaan status pendaftaran IMEI pada gateway database CEIR & Bea Cukai untuk melihat data riwayat whitelist perangkat secara realtime.
            </p>
            <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
              <li className="flex items-center gap-2">✓ Terhubung ke server CEIR</li>
              <li className="flex items-center gap-2">✓ Log detail riwayat query</li>
              <li className="flex items-center gap-2">✓ Hasil cek instan & akurat</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs hover:border-primary/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ink">Surat Garansi & Nota Toko</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Cetak nota kwitansi transaksi dan surat garansi atas nama toko Anda sendiri lengkap dengan barcode dan QR Code verifikasi online.
            </p>
            <ul className="text-xs space-y-1.5 text-ink-muted pt-1">
              <li className="flex items-center gap-2">✓ Cetak nota custom nama toko</li>
              <li className="flex items-center gap-2">✓ QR verifikasi masa aktif</li>
              <li className="flex items-center gap-2">✓ Program komisi referral</li>
            </ul>
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
                    <span className="text-[11px] font-bold text-primary uppercase">Durasi {pkg.duration}</span>
                    <h3 className="text-xl font-bold text-ink">Buka Gembok IMEI</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-ink-muted">/ unit</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Aktivasi sinyal seluler iPhone & Android semua operator dengan masa garansi aktif {pkg.duration}.
                    </p>
                    <ul className="text-xs space-y-2 text-ink-muted pt-1">
                      <li className="flex items-center gap-2">✓ Sinyal All Operator (Telkomsel, Indosat, XL, Tri, Smartfren)</li>
                      <li className="flex items-center gap-2 font-bold text-emerald-600">✓ Masa Garansi Sinyal {pkg.duration}</li>
                      <li className="flex items-center gap-2">✓ Surat Garansi Digital + QR Verifikasi</li>
                    </ul>
                  </div>
                  <Link
                    href={`/unblock-imei`}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs text-center shadow-md shadow-primary/20 transition-all block"
                  >
                    Buka Gembok ({pkg.duration})
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

            {/* 3. Paket Mitra Reseller & Referral */}
            <div className="p-6 sm:p-8 rounded-3xl bg-canvas border border-hairline shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Mitra Toko</span>
                <h3 className="text-xl font-bold text-ink">Program Reseller</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-emerald-600">Diskon Saldo</span>
                  <span className="text-xs text-ink-muted">/ transaksi</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Dapatkan diskon harga per unit untuk pemesanan rutin toko HP dan fitur cetak nota white-label.
                </p>
                <ul className="text-xs space-y-2 text-ink-muted pt-1">
                  <li className="flex items-center gap-2">✓ Multi-IMEI Bulk Order (Banyak Unit)</li>
                  <li className="flex items-center gap-2">✓ Nota Custom Atas Nama Toko Sendiri</li>
                  <li className="flex items-center gap-2">✓ Komisi Saldo dari Program Referral</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-parchment hover:bg-parchment/80 border border-hairline font-bold text-xs text-center text-ink transition-colors block"
              >
                Daftar Jadi Reseller
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
