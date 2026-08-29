"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import Swal from "@/lib/sweetalert";
import { useRouter } from "next/navigation";


const ceirgoNameMapping: Record<string, string> = {
  'cek_validity': 'Cek Masa Aktif',
  'create_barcode_samsung': 'Barcode Samsung',
  'create_barcode_redmi': 'Barcode Redmi',
  'create_barcode_ios26': 'Barcode iOS 26',
  'cek_digi': 'Cek DIGI',
  'cek_sf': 'Cek SF',
  'create_barcode': 'Create Barcode',
  'cek_imei_beacukai': 'Cek IMEI Beacukai',
  'cek_history_imei': 'Cek Riwayat IMEI',
  'cek_imei': 'Cek Status IMEI'
};

export default function BarcodePage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [imei2, setImei2] = useState("");
  const [theme, setTheme] = useState("dark");
  
  // Set default option to first available barcode option later
  const [option, setOption] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const normalizeServices = (payload: any) => {
    const services = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.page?.items)
          ? payload.data.page.items
          : [];

    return services
      .map((svc: any) => ({
        code: svc?.code,
        name: svc?.name || ceirgoNameMapping[svc?.code] || svc?.code,
        modalPrice: Number(svc?.modalPrice ?? svc?.price ?? svc?.unit_price ?? 0) || 0,
      }))
      .filter((svc: any) => svc.code && /barcode|create/i.test(`${svc.code} ${svc.name}`));
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/ceirgo-pricing').then(res => res.json()),
      fetch('/api/ceirgo-services').then(res => res.json()).catch(() => ({ status: false })),
      fetch('/api/admin/ceirgo-display-settings', { credentials: 'include' }).then(res => res.json()).catch(() => ({ status: false }))
    ]).then(([ceirPrcData, ceirSvcData, displayData]) => {
      if (ceirPrcData.status) {
        const normalizedPricing = Object.fromEntries(
          Object.entries(ceirPrcData.data || {}).map(([key, value]) => [
            key.replace(/^ceirgo_price_/, ''),
            value
          ])
        );
        setCeirgoPricing(normalizedPricing);
      }
      const services = ceirSvcData.status ? normalizeServices(ceirSvcData.data) : [];
      const hasBarcodeSetting = displayData?.status && displayData.data && Object.prototype.hasOwnProperty.call(displayData.data, 'barcode');
      const visibleCodes = hasBarcodeSetting
        ? new Set(Array.isArray(displayData.data.barcode) ? displayData.data.barcode : [])
        : null;
      setCeirgoServices(visibleCodes ? services.filter((s: any) => visibleCodes.has(s.code)) : services);
    }).finally(() => setLoading(false));
  }, []);

  const getPrice = (opt: string) => {
    const svc = ceirgoServices.find(s => s.code === opt);
    const sellingPrice = Number(ceirgoPricing?.[opt] ?? ceirgoPricing?.[`ceirgo_price_${opt}`]);
    if (Number.isFinite(sellingPrice) && sellingPrice > 0) return sellingPrice;
    const modalPrice = Number(svc?.modalPrice);
    return Number.isFinite(modalPrice) && modalPrice > 0 ? modalPrice : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!option) return setError("Pilih layanan barcode terlebih dahulu.");
    if (!imei || imei.length < 15) return setError("IMEI Utama tidak valid (minimal 15 digit).");
    if (imei2 && imei2.length < 15) return setError("IMEI Kedua tidak valid (minimal 15 digit).");

    const price = getPrice(option);
    if (user && user.balance < price) {
      Swal.fire({
      title: 'Saldo Tidak Mencukupi',
      text: 'Saldo Anda kurang untuk melakukan pesanan ini. Silakan isi saldo terlebih dahulu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Top Up Sekarang',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/topup');
      }
    });
    return setError('Saldo tidak mencukupi.');
    }

    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("service_type", "ceir");
      formData.append("imei", imei);
      if (imei2) formData.append("imei2", imei2);
      formData.append("theme", theme);
      
      let durationStr = "Cetak Barcode";
      const svc = ceirgoServices.find(s => s.code === option);
      if (svc) durationStr = svc.name;

      formData.append("duration", durationStr);
      formData.append("price_key", option);

      const res = await fetch("/api/order/ceir", {
        method: "POST",
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setSuccess("Pesanan berhasil! Hasil cetak barcode akan dikirim ke riwayat transaksi.");
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

  const renderServiceButtons = () => {
    if (loading) return <p className="text-sm text-ink-muted col-span-2">Memuat layanan...</p>;

    const buttons: { id: string, label: string, price: number }[] = [];

    ceirgoServices.forEach(svc => {
      const isBarcodeService = /barcode|create/i.test(`${svc.code} ${svc.name}`);
      if (!isBarcodeService) return;
      const price = Number(ceirgoPricing[svc.code]);
      if (price > 0) {
        buttons.push({ id: svc.code, label: svc.name || ceirgoNameMapping[svc.code] || svc.code.replace(/_/g, " ").toUpperCase(), price });
      }
    });

    if (buttons.length === 0) {
      return <p className="text-sm text-ink-muted col-span-2">Belum ada layanan Barcode yang diaktifkan Admin.</p>;
    }

    return buttons.map(btn => {
      const isSelected = option === btn.id;
      return (
        <button
          key={btn.id}
          type="button"
          onClick={() => setOption(btn.id)}
          className={`p-4 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
            isSelected 
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 text-primary ring-1 ring-primary scale-[1.02]' 
              : 'border-hairline bg-canvas hover:bg-parchment hover:border-primary/30'
          }`}
        >
          <div className="font-bold text-sm leading-tight px-1">{btn.label}</div>
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-parchment text-ink-muted'}`}>
            Rp {btn.price.toLocaleString('id-ID')}
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
          <p className="text-sm text-ink-muted">Buat barcode box HP otomatis via Server Pusat.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
              Pilih Jenis Barcode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {renderServiceButtons()}
            </div>
          </div>

          <div className="pt-4 border-t border-hairline space-y-4">
            <label className="text-sm font-bold text-ink flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
              Detail Perangkat
            </label>
            
            <Input 
              label="IMEI Utama (SIM 1)" 
              placeholder="Masukkan 15 digit IMEI" 
              value={imei} 
              onChange={e => setImei(e.target.value)} 
              maxLength={15} 
              required 
            />

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 mt-2">
              <Input 
                label="IMEI Kedua (SIM 2) - Opsional" 
                placeholder="Masukkan 15 digit IMEI SIM 2" 
                value={imei2} 
                onChange={e => setImei2(e.target.value)} 
                maxLength={15} 
              />
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink/80">Tema Barcode</label>
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
          </div>

          <Button className="w-full h-14 text-lg font-bold shadow-md shadow-primary/20 mt-4" type="submit" isLoading={submitting}>
            Bayar Rp {getPrice(option).toLocaleString('id-ID')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
