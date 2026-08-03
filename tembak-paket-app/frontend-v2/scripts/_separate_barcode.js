const fs = require('fs');

// 1. Buat halaman baru /barcode/page.tsx
const barcodePageContent = `"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function BarcodePage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [imei2, setImei2] = useState("");
  const [theme, setTheme] = useState("dark");
  const [option, setOption] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch('/api/ceirgo-pricing').then(res => res.json()),
      fetch('/api/admin/ceirgo-services', { credentials: 'include' }).then(res => res.json()).catch(() => ({ status: false }))
    ]).then(([ceirPrcData, ceirSvcData]) => {
      if (ceirPrcData.status) setCeirgoPricing(ceirPrcData.data);
      if (ceirSvcData.status && ceirSvcData.data) {
          // Hanya ambil layanan yang mengandung kata barcode
          const barcodeSvcs = ceirSvcData.data.filter((s: any) => s.code.includes('barcode'));
          setCeirgoServices(barcodeSvcs);
          if (barcodeSvcs.length > 0) {
              setOption(barcodeSvcs[0].code);
          }
      }
    }).finally(() => setLoading(false));
  }, []);

  const getPrice = (opt: string) => ceirgoPricing[opt] || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || imei.length < 15) return setError("IMEI Utama tidak valid.");
    if (!option) return setError("Silakan pilih layanan cetak barcode.");
    if (imei2 && imei2.length < 15) return setError("IMEI Kedua tidak valid.");

    const price = getPrice(option);
    if (user && user.balance < price) return setError("Saldo tidak mencukupi.");

    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("service_type", "ceir");
      formData.append("imei", imei);
      if (imei2) formData.append("imei2", imei2);
      formData.append("theme", theme);
      
      const svc = ceirgoServices.find(s => s.code === option);
      formData.append("duration", svc ? svc.name : "Cetak Barcode");
      formData.append("price_key", option);

      const res = await fetch("/api/order/manual", {
        method: "POST",
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setSuccess("Pesanan Cetak Barcode berhasil! Hasil gambar akan muncul di Riwayat Transaksi.");
        setTimeout(() => router.push('/history'), 4000);
      } else {
        setError(data.message || "Gagal membuat pesanan.");
      }
    } catch (err) {
      setError("Kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderButtons = () => {
    if (loading) return <p className="text-sm text-ink-muted col-span-2">Memuat layanan...</p>;
    
    const available = ceirgoServices.filter(s => ceirgoPricing[s.code] > 0);
    if (available.length === 0) return <p className="text-sm text-ink-muted col-span-2">Layanan Cetak Barcode belum diaktifkan Admin.</p>;

    return available.map(svc => {
      const price = ceirgoPricing[svc.code];
      const isSelected = option === svc.code;
      return (
        <button key={svc.code} type="button" onClick={() => setOption(svc.code)}
          className={\`p-4 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 \${isSelected ? 'border-primary bg-primary/5 shadow-md text-primary ring-1 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}\`}
        >
          <div className="font-bold text-sm">{svc.name}</div>
          <div className={\`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 \${isSelected ? 'bg-primary/10 text-primary' : 'bg-parchment text-ink-muted'}\`}>
            Rp {price.toLocaleString('id-ID')}
          </div>
        </button>
      );
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Cetak Barcode</h1>
          <p className="text-sm text-ink-muted">Buat stiker barcode dus box untuk Samsung, iPhone, dll.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">⚠️ {error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center gap-2">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Pilih Jenis Barcode</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {renderButtons()}
            </div>
          </div>

          <div className="pt-4 border-t border-hairline space-y-4">
            <Input label="IMEI Utama (SIM 1)" placeholder="Masukkan 15 digit IMEI" value={imei} onChange={e => setImei(e.target.value)} maxLength={15} required />
            <Input label="IMEI Kedua (SIM 2) - Opsional" placeholder="Masukkan 15 digit IMEI SIM 2" value={imei2} onChange={e => setImei2(e.target.value)} maxLength={15} />
            
            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-ink/80">Tema Warna</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Dark Mode (Hitam)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Light Mode (Putih)</span>
                </label>
              </div>
            </div>
          </div>

          <Button className="w-full h-14 text-lg font-bold shadow-md shadow-primary/20" type="submit" isLoading={submitting}>
            Cetak Rp {getPrice(option).toLocaleString('id-ID')}
          </Button>
        </form>
      </Card>
    </div>
  );
}`;

fs.mkdirSync('src/app/(main)/barcode', { recursive: true });
fs.writeFileSync('src/app/(main)/barcode/page.tsx', barcodePageContent);

// 2. Modifikasi Cek CEIR agar tidak memunculkan barcode
let ceirPage = fs.readFileSync('src/app/(main)/cek-ceir/page.tsx', 'utf8');
ceirPage = ceirPage.replace(
    "const svc = ceirgoServices.find(s => s.code === code);",
    "if (code.includes('barcode')) return; // Jangan tampilkan barcode di sini\n        const svc = ceirgoServices.find(s => s.code === code);"
);
// Hapus form barcode dari cek ceir
ceirPage = ceirPage.replace(/\{isBarcodeMode && \([\s\S]*?\}\)/g, '');
ceirPage = ceirPage.replace(/const isBarcodeMode = option\.includes\('barcode'\);/g, '');
ceirPage = ceirPage.replace(/label=\{isBarcodeMode \? "IMEI Utama \(SIM 1\)" : "Nomor IMEI"\}/g, 'label="Nomor IMEI"');
fs.writeFileSync('src/app/(main)/cek-ceir/page.tsx', ceirPage);

// 3. Tambahkan ke Sidebar
let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
    /\{\s*name:\s*"Cek CEIR",\s*href:\s*"\/cek-ceir"[\s\S]*?\},/g,
    \`{ name: "Cek CEIR", href: "/cek-ceir", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> },
          { name: "Cetak Barcode", href: "/barcode", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg> },\`
);
fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar);

// 4. Tambahkan ke Dashboard grid
let dash = fs.readFileSync('src/app/(main)/dashboard/page.tsx', 'utf8');
dash = dash.replace(
    /\{ name: "Cek CEIR", icon: "🔍", href: "\/cek-ceir", color: "bg-emerald-50 text-emerald-600" \}/g,
    \`{ name: "Cek CEIR", icon: "🔍", href: "/cek-ceir", color: "bg-emerald-50 text-emerald-600" },
            { name: "Cetak Barcode", icon: "🏷️", href: "/barcode", color: "bg-purple-50 text-purple-600" }\`
);
fs.writeFileSync('src/app/(main)/dashboard/page.tsx', dash);

console.log('Barcode separated to new page');
