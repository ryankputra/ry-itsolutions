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
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-primary selection:text-white transition-colors duration-150">
      {/* Favicon Inline */}
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23004080' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 10V10.5M4.5 19V10.5'/></svg>" />
      </head>

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={32} />
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
              className="p-2.5 text-ink-muted hover:text-ink transition-colors border border-hairline rounded-md hover:bg-parchment"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>

            <Link
              href="/cek-garansi"
              className="px-4 py-2 border border-hairline bg-parchment hover:bg-parchment/80 font-mono text-xs text-ink transition-colors rounded-md"
            >
              Cek Garansi
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 bg-primary text-white hover:bg-primary/90 font-mono text-xs tracking-wide transition-all rounded-md"
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-hairline bg-parchment text-ink font-mono text-xs uppercase tracking-wider rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Pusat Solusi IT &amp; Gateway Terintegrasi
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.1]">
                Infrastruktur Sinyal IMEI &amp; Gateway Pembayaran Digital.
              </h1>

              <p className="text-base sm:text-lg text-ink-muted leading-relaxed font-normal max-w-2xl">
                Layanan aktivasi seluler HP Inter All Operator bergaransi resmi, query database CEIR nasional, serta integrasi Payment Gateway GoPay otomatis untuk sistem transaksi Anda.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/add-roamer"
                  className="px-6 py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider transition-all rounded-md flex items-center gap-2"
                >
                  Aktivasi Sinyal IMEI
                </Link>

                <Link
                  href="/gateway"
                  className="px-6 py-3 border border-hairline bg-parchment hover:bg-parchment/80 text-ink font-mono text-xs uppercase tracking-wider transition-all rounded-md"
                >
                  Payment Gateway GoPay
                </Link>

                <Link
                  href="/cek-ceir"
                  className="px-6 py-3 border border-hairline bg-canvas hover:bg-parchment text-ink font-mono text-xs uppercase tracking-wider transition-all rounded-md"
                >
                  Cek Status CEIR
                </Link>
              </div>

              {/* Metrics / Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-hairline">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-ink">100%</div>
                  <div className="text-xs text-ink-muted font-mono mt-0.5">Garansi Sinyal</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-ink">24/7</div>
                  <div className="text-xs text-ink-muted font-mono mt-0.5">Gateway Otomatis</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-ink">CEIR</div>
                  <div className="text-xs text-ink-muted font-mono mt-0.5">Database Resmi</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-ink">API</div>
                  <div className="text-xs text-ink-muted font-mono mt-0.5">Webhook Instan</div>
                </div>
              </div>
            </div>

            {/* Right Widget: Live IMEI Inspector */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 bg-canvas border border-hairline rounded-lg space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-hairline pb-4">
                  <div>
                    <h2 className="font-bold text-sm text-ink uppercase tracking-wider font-mono">Inspektur IMEI Perangkat</h2>
                    <p className="text-xs text-ink-muted mt-0.5">Uji verifikasi TAC perangkat secara langsung.</p>
                  </div>
                  <span className="px-2 py-1 bg-parchment border border-hairline text-ink font-mono text-[10px] uppercase rounded">
                    Live Test
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-ink uppercase tracking-wider">Nomor IMEI (15 Digit)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={testImei}
                    onChange={(e) => setTestImei(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 353969101788981"
                    className="w-full px-4 py-3 bg-parchment border border-hairline font-mono text-sm outline-none focus:border-primary transition-colors text-ink rounded-md"
                  />
                  <p className="text-[11px] text-ink-muted">Masukkan minimal 8 digit pertama TAC.</p>
                </div>

                {analyzed?.brand ? (
                  <div className="p-4 bg-parchment border border-hairline space-y-2 rounded-md">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-primary font-bold uppercase">Perangkat Dikenali</span>
                      {analyzed.isValidLuhn && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold rounded">
                          Luhn Valid
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
                  <div className="p-3 bg-parchment border border-hairline text-xs font-mono text-ink-muted rounded-md">
                    Menganalisis TAC {testImei.slice(0, 8)}...
                  </div>
                ) : null}

                <div className="pt-2">
                  <Link
                    href={`/add-roamer${testImei.length >= 8 ? `?imei=${testImei}` : ""}`}
                    className="w-full py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider text-center block transition-colors rounded-md"
                  >
                    Proses Unblock Perangkat &gt;
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="layanan" className="py-24 max-w-7xl mx-auto px-6 space-y-16 border-b border-hairline">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Arsitektur Layanan</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">Solusi Sistem &amp; Perangkat</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Pilar operasional utama yang dirancang untuk kehandalan, kecepatan, dan transparansi penuh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Service 1 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-primary font-bold">01 / SELULER</span>
              <h3 className="text-xl font-bold text-ink">Aktivasi Sinyal HP Inter</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Add Roamer resmi untuk iPhone &amp; Android All Operator (Telkomsel, Indosat, XL, Tri, Smartfren) dengan garansi aktif dan update progress langsung.
              </p>
            </div>
            <Link href="/add-roamer" className="text-xs font-mono uppercase tracking-wider text-primary hover:underline pt-4 block">
              Buka Layanan Sinyal &gt;
            </Link>
          </div>

          {/* Service 2 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-blue-600 font-bold">02 / FINTECH</span>
              <h3 className="text-xl font-bold text-ink">Payment Gateway GoPay &amp; QRIS</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Infrastruktur SaaS pembayaran otomatis 24 jam dengan pengecekan mutasi real-time dan webhook instan ke server Anda.
              </p>
            </div>
            <Link href="/gateway" className="text-xs font-mono uppercase tracking-wider text-blue-600 hover:underline pt-4 block">
              Pelajari Gateway &gt;
            </Link>
          </div>

          {/* Service 3 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-emerald-600 font-bold">03 / DATABASE</span>
              <h3 className="text-xl font-bold text-ink">Cek Database CEIR &amp; Bea Cukai</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Query pemeriksaan status pendaftaran IMEI pada gateway database nasional CEIR Kemenperin &amp; Bea Cukai secara instan.
              </p>
            </div>
            <Link href="/cek-ceir" className="text-xs font-mono uppercase tracking-wider text-emerald-600 hover:underline pt-4 block">
              Cek CEIR Sekarang &gt;
            </Link>
          </div>

          {/* Service 4 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-indigo-600 font-bold">04 / DOKUMEN</span>
              <h3 className="text-xl font-bold text-ink">Surat Garansi &amp; Nota Digital</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cetak kwitansi transaksi dan surat garansi resmi berstandar toko Anda lengkap dengan QR Code verifikasi online.
              </p>
            </div>
            <Link href="/cek-garansi" className="text-xs font-mono uppercase tracking-wider text-indigo-600 hover:underline pt-4 block">
              Cek Surat Garansi &gt;
            </Link>
          </div>

          {/* Service 5 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-amber-600 font-bold">05 / OTOMASI</span>
              <h3 className="text-xl font-bold text-ink">Otomasi WhatsApp &amp; Bot Order</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Bot Baileys 24/7 dan Telegram bot untuk notifikasi instan pesanan masuk, update status antrean, dan konfirmasi pembayaran.
              </p>
            </div>
            <Link href="/dashboard" className="text-xs font-mono uppercase tracking-wider text-amber-600 hover:underline pt-4 block">
              Buka Dashboard &gt;
            </Link>
          </div>

          {/* Service 6 */}
          <div className="p-8 bg-canvas border border-hairline space-y-4 flex flex-col justify-between rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <span className="font-mono text-xs text-purple-600 font-bold">06 / DUKUNGAN</span>
              <h3 className="text-xl font-bold text-ink">Konsultasi IT 24/7</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Pendampingan teknis responsif via WhatsApp dan Telegram untuk konfigurasi API gateway dan kendala sistem.
              </p>
            </div>
            <a href="https://wa.me/6285770020477" target="_blank" rel="noopener noreferrer" className="text-xs font-mono uppercase tracking-wider text-purple-600 hover:underline pt-4 block">
              Hubungi CS WhatsApp &gt;
            </a>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="py-24 bg-parchment/30 border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-primary">Daftar Paket Harga</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">Transparansi Tarif &amp; Layanan</h2>
            <p className="text-sm text-ink-muted">Terhubung langsung dengan database sistem operasional kami.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Tier 1 */}
            <div className="p-8 bg-canvas border border-hairline space-y-6 flex flex-col justify-between rounded-lg">
              <div className="space-y-4">
                <span className="font-mono text-xs text-indigo-600 font-bold uppercase">CEIR Database</span>
                <h3 className="text-xl font-bold text-ink">Cek Riwayat IMEI</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-ink">
                    Rp {(ceirgoPricing?.cek_history_imei || 5100).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-ink-muted">/ pengecekan</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Pemeriksaan database pendaftaran CEIR Kemenperin &amp; Bea Cukai dengan log riwayat lengkap.
                </p>
                <ul className="text-xs space-y-2 text-ink-muted font-mono pt-2">
                  <li>• Cek Bea Cukai: Rp {(ceirgoPricing?.cek_imei_beacukai || 1500).toLocaleString('id-ID')}</li>
                  <li>• Cetak Barcode: Rp {(ceirgoPricing?.create_barcode || 5000).toLocaleString('id-ID')}</li>
                </ul>
              </div>
              <Link
                href="/cek-ceir"
                className="w-full py-3 bg-parchment border border-hairline hover:bg-parchment/80 font-mono text-xs uppercase tracking-wider text-center text-ink block rounded-md transition-colors"
              >
                Pilih Cek CEIR
              </Link>
            </div>

            {/* Tier 2 (Live imeiPackages or Default) */}
            {imeiPackages.length > 0 ? (
              imeiPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="p-8 bg-canvas border-2 border-primary space-y-6 flex flex-col justify-between rounded-lg relative shadow-sm"
                >
                  <div className="absolute -top-3 left-6 px-3 py-0.5 bg-primary text-white font-mono text-[10px] uppercase tracking-wider rounded">
                    Rekomendasi Utama
                  </div>
                  <div className="space-y-4">
                    <span className="font-mono text-xs text-primary font-bold uppercase">Add Roamer {pkg?.duration || "1 Bulan"}</span>
                    <h3 className="text-xl font-bold text-ink">Aktivasi Sinyal</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary">
                        Rp {Number(pkg?.price || 0).toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">/ unit</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Aktivasi seluler iPhone &amp; Android semua operator dengan garansi aktif masa berlaku {pkg?.duration || "resmi"}.
                    </p>
                    <ul className="text-xs space-y-2 text-ink-muted font-mono pt-2">
                      <li>• Telkomsel, Indosat, XL, Tri, Smartfren</li>
                      <li>• Garansi Sinyal {pkg?.duration || "Aktif"}</li>
                      <li>• Surat Garansi Digital + QR Verifikasi</li>
                    </ul>
                  </div>
                  <Link
                    href="/add-roamer"
                    className="w-full py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider text-center block rounded-md transition-colors"
                  >
                    Proses Add Roamer &gt;
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 bg-canvas border-2 border-primary space-y-6 flex flex-col justify-between rounded-lg relative">
                <div className="space-y-4">
                  <span className="font-mono text-xs text-primary font-bold uppercase">Add Roamer</span>
                  <h3 className="text-xl font-bold text-ink">Aktivasi Sinyal All Operator</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Aktivasi seluler iPhone &amp; Android untuk semua operator seluler dengan jaminan garansi.
                  </p>
                </div>
                <Link
                  href="/add-roamer"
                  className="w-full py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider text-center block rounded-md transition-colors"
                >
                  Buka Dashboard Add Roamer
                </Link>
              </div>
            )}

            {/* Tier 3 */}
            <div className="p-8 bg-canvas border border-hairline space-y-6 flex flex-col justify-between rounded-lg">
              <div className="space-y-4">
                <span className="font-mono text-xs text-blue-600 font-bold uppercase">Payment Gateway</span>
                <h3 className="text-xl font-bold text-ink">Gateway QRIS GoPay</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-ink">Rp 35.000</span>
                  <span className="text-xs font-mono text-ink-muted">/ aktivasi</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Infrastruktur pembayaran QRIS instan untuk website atau bot Anda dengan pengecekan otomatis.
                </p>
                <ul className="text-xs space-y-2 text-ink-muted font-mono pt-2">
                  <li>• Perpanjangan: Rp 10.000 / bulan</li>
                  <li>• Mutasi Real-time 24 Jam</li>
                  <li>• Webhook API &amp; Sandbox Tester</li>
                </ul>
              </div>
              <Link
                href="/gateway"
                className="w-full py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider text-center block rounded-md transition-colors"
              >
                Mulai Integrasi Gateway
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Warranty Banner */}
      <section id="garansi" className="py-24 max-w-7xl mx-auto px-6">
        <div className="p-10 sm:p-12 bg-canvas border border-hairline rounded-lg space-y-6">
          <span className="font-mono text-xs text-primary font-bold uppercase tracking-widest">Garansi &amp; Transparansi</span>
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight max-w-2xl">
            Surat Garansi Digital Resmi &amp; Verifikasi QR Code Realtime.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-2xl">
            Setiap transaksi aktivasi sinyal dilengkapi dengan dokumen garansi digital dan QR Code unik yang dapat dipindai untuk memastikan status masa berlaku garansi perangkat Anda.
          </p>
          <div>
            <Link
              href="/cek-garansi"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider rounded-md transition-colors"
            >
              Cek Status Garansi Sekarang &gt;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 max-w-3xl mx-auto px-6 space-y-12 border-t border-hairline">
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Pusat Informasi</span>
          <h2 className="text-3xl font-bold text-ink tracking-tight">Pertanyaan Umum</h2>
          <p className="text-xs text-ink-muted">Ketentuan layanan, proses pengerjaan, dan sistem garansi.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-hairline bg-canvas rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-sm text-ink flex items-center justify-between gap-4 hover:bg-parchment/50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-ink-muted">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="p-5 pt-0 text-xs text-ink-muted leading-relaxed border-t border-hairline bg-parchment/20">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 border-t border-hairline bg-parchment/20">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Mulai Aktivasi Sinyal &amp; Integrasi Sistem Anda</h2>
          <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
            Daftar akun gratis dan nikmati kemudahan pengelolaan Add Roamer serta pembayaran otomatis.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="px-6 py-3 bg-primary text-white hover:bg-primary/90 font-mono text-xs uppercase tracking-wider rounded-md transition-colors"
            >
              Daftar Akun Gratis
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-hairline bg-canvas hover:bg-parchment text-ink font-mono text-xs uppercase tracking-wider rounded-md transition-colors"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-hairline text-center text-xs font-mono text-ink-muted space-y-2">
        <p className="font-bold text-ink">&copy; {new Date().getFullYear()} Ry-ITSolutions. All rights reserved.</p>
        <p>Infrastruktur Layanan Aktivasi Sinyal IMEI &amp; Gateway Pembayaran Digital</p>
      </footer>
    </div>
  );
}
