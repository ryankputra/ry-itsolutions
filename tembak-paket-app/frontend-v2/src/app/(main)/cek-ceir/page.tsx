"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/ui/SuccessModal";

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

export default function CekCeirPage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [pricing, setPricing] = useState<any>({});
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [imei2, setImei2] = useState("");
  const [theme, setTheme] = useState("dark");
  const [option, setOption] = useState("register");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/manual-services-pricing').then(res => res.json()),
      fetch('/api/ceirgo-pricing').then(res => res.json()),
      fetch('/api/admin/ceirgo-services', { credentials: 'include' }).then(res => res.json()).catch(() => ({ status: false }))
    ]).then(([prcData, ceirPrcData, ceirSvcData]) => {
      if (prcData.status) setPricing(prcData.data);
      if (ceirPrcData.status) setCeirgoPricing(ceirPrcData.data);
      if (ceirSvcData.status && ceirSvcData.data) setCeirgoServices(ceirSvcData.data);
    }).finally(() => setLoading(false));
  }, []);

  const getPrice = (opt: string) => {
    if (ceirgoPricing[opt]) return ceirgoPricing[opt];
    switch (opt) {
      case 'register': return ceirgoPricing['cek_imei_beacukai'] || pricing['price_ceir_register'] || 0;
      case 'history': return ceirgoPricing['cek_history_imei'] || pricing['price_ceir_history'] || 0;
      default: return 0;
    }
  };

  const getPriceKey = (opt: string) => {
    if (opt === 'register') return 'price_ceir_register';
    if (opt === 'history') return 'price_ceir_history';
    return opt;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || imei.length < 15) return setError("IMEI Utama tidak valid (minimal 15 digit).");
    
    const isBarcodeMode = option.includes('barcode');
    if (isBarcodeMode && imei2 && imei2.length < 15) return setError("IMEI Kedua tidak valid (minimal 15 digit).");

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
      if (isBarcodeMode && imei2) formData.append("imei2", imei2);
      if (isBarcodeMode) formData.append("theme", theme);
      
      let durationStr = "Cek Layanan CEIR";
      const svc = ceirgoServices.find(s => s.code === option);
      if (svc) durationStr = svc.name;
      else if (option === 'register') durationStr = 'Cek Beacukai';
      else if (option === 'history') durationStr = 'Cek History CEIR';

      formData.append("duration", durationStr);
      formData.append("price_key", getPriceKey(option));

      const confirm = await Swal.fire({
        title: 'Ready buat checkout? 💸',
        text: 'Udah fix nih mau lanjut bayar? Saldo lo bakal kepotong ya.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Gass!',
        cancelButtonText: 'Ntar Dulu'
      });

      if (!confirm.isConfirmed) {
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/order/manual", {
        method: "POST",
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setShowSuccessPop(true);
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
    
    if (!ceirgoPricing['cek_imei_beacukai'] && pricing['price_ceir_register']) {
      buttons.push({ id: 'register', label: 'Cek Beacukai (Manual)', price: pricing['price_ceir_register'] });
    }
    if (!ceirgoPricing['cek_history_imei'] && pricing['price_ceir_history']) {
      buttons.push({ id: 'history', label: 'Cek History (Manual)', price: pricing['price_ceir_history'] });
    }

    Object.keys(ceirgoPricing).forEach(code => {
      const price = ceirgoPricing[code];
      if (price > 0 && !code.includes('barcode')) {
        const svc = ceirgoServices.find(s => s.code === code);
        const name = svc ? svc.name : (ceirgoNameMapping[code] || code.replace(/_/g, " ").toUpperCase());
        buttons.push({ id: code, label: name, price: price });
      }
    });

    if (buttons.length === 0) {
      return <p className="text-sm text-ink-muted col-span-2">Belum ada layanan yang diaktifkan Admin.</p>;
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

  const isBarcodeMode = option.includes('barcode');

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Investigasi & Cek CEIR 🔍</h1>
          <p className="text-sm text-ink-muted">Kepoin status IMEI lo atau generate barcode box HP auto sat-set.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2"><span className="text-lg">⚠️</span>{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center gap-2"><span className="text-lg">✅</span>{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
              Pilih Jenis Layanan
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
              label={isBarcodeMode ? "IMEI Utama (SIM 1)" : "Nomor IMEI"} 
              placeholder="Masukkan 15 digit IMEI" 
              value={imei} 
              onChange={e => setImei(e.target.value)} 
              maxLength={15} 
              required 
            />

            {isBarcodeMode && (
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
            )}
          </div>

        <Button className="w-full h-14 text-lg font-bold shadow-md shadow-primary/20 mt-4" type="submit" isLoading={submitting}>
          Bayar Rp {getPrice(option).toLocaleString('id-ID')}
        </Button>
      </form>
    </Card>

    <SuccessModal 
      isOpen={showSuccessPop} 
      onClose={() => router.push('/history')} 
      amount={getPrice(option)} 
      title="Pembayaran Berhasil"
      statusText="Pesanan CEIR berhasil dibuat!"
      recipientLabel="IMEI Target"
      recipientValue={imei}
    />
  </div>
  );
}
