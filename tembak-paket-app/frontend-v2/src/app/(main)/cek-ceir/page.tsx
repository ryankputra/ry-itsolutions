"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import Swal from "@/lib/sweetalert";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { analyzeImei } from "@/lib/imeiHelper";

const ceirgoNameMapping: Record<string, string> = {
  'cek_history_imei': 'Cek Riwayat Database CEIR',
  'cek_imei_beacukai': 'Cek IMEI Bea Cukai',
  'cek_icloud': 'Cek iCloud & FMI (Clean / Lost)',
  'cek_fmi': 'Cek iCloud & FMI (Clean / Lost)',
  'cek_simlock': 'Cek Carrier Simlock (Operator Asal)',
  'cek_carrier': 'Cek Carrier Simlock (Operator Asal)',
  'cek_validity': 'Cek Masa Aktif Sinyal',
  'cek_digi': 'Cek DIGI',
  'cek_sf': 'Cek Smartfren',
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
  const [option, setOption] = useState("cek_history_imei");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [ceirResult, setCeirResult] = useState<{ note: string | null, image: string | null } | null>(null);

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
      .filter((svc: any) => svc.code && !/barcode|create|dummy|test|sample|demo/i.test(`${svc.code} ${svc.name}`));
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/manual-services-pricing').then(res => res.json()),
      fetch('/api/ceirgo-pricing').then(res => res.json()),
      fetch('/api/ceirgo-services').then(res => res.json()).catch(() => ({ status: false })),
      fetch('/api/admin/ceirgo-display-settings', { credentials: 'include' }).then(res => res.json()).catch(() => ({ status: false }))
    ]).then(([prcData, ceirPrcData, ceirSvcData, displayData]) => {
      if (prcData.status) setPricing(prcData.data);
      if (ceirPrcData.status) setCeirgoPricing(ceirPrcData.data);
      const services = ceirSvcData.status ? normalizeServices(ceirSvcData.data) : [];

      // Ensure core diagnostic services (CEIR & Bea Cukai) are available
      const coreServices = [
        { code: 'cek_history_imei', name: 'Cek Riwayat Database CEIR', modalPrice: 5100 },
        { code: 'cek_imei_beacukai', name: 'Cek IMEI Bea Cukai', modalPrice: 1500 }
      ];

      coreServices.forEach(cs => {
        if (!services.some((s: any) => s.code === cs.code)) {
          services.push(cs);
        }
      });

      const hasCeirSetting = displayData?.status && displayData.data && Object.prototype.hasOwnProperty.call(displayData.data, 'cekCeir');
      const visibleCodes = hasCeirSetting
        ? new Set(Array.isArray(displayData.data.cekCeir) ? displayData.data.cekCeir : [])
        : null;
      setCeirgoServices(visibleCodes ? services.filter((s: any) => visibleCodes.has(s.code)) : services);
    }).finally(() => setLoading(false));
  }, []);

  const getPrice = (opt: string) => {
    const svc = ceirgoServices.find(s => s.code === opt);
    const aliases = [
      opt,
      `ceirgo_price_${opt}`,
      opt.startsWith('ceirgo_price_') ? opt.replace(/^ceirgo_price_/, '') : null,
      opt.startsWith('price_') ? opt.replace(/^price_/, '') : null,
    ].filter(Boolean) as string[];

    for (const key of aliases) {
      const sellingPrice = Number(ceirgoPricing?.[key]);
      if (Number.isFinite(sellingPrice) && sellingPrice > 0) return sellingPrice;
    }

    const modalPrice = Number(svc?.modalPrice);
    return Number.isFinite(modalPrice) && modalPrice > 0 ? modalPrice : 0;
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

      const res = await fetch("/api/order/ceir", {
        method: "POST",
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status) {
        if (data.data?.adminNote || data.data?.adminImage) {
          setCeirResult({ note: data.data.adminNote, image: data.data.adminImage });
        }
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

    const visibleCodes = new Set(ceirgoServices.map(s => s.code));
    const addButton = (id: string, label: string, price: number) => {
      if (price > 0 && !buttons.some(btn => btn.id === id)) buttons.push({ id, label, price });
    };

    ceirgoServices.forEach(svc => {
      const price = getPrice(svc.code);
      if (price > 0) addButton(svc.code, svc.name || ceirgoNameMapping[svc.code] || svc.code.replace(/_/g, " ").toUpperCase(), price);
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
          className={`p-4 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${isSelected
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
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Cek CEIR & Status HP
          </h1>
          <p className="text-sm text-ink-muted">Pemeriksaan database CEIR Kemenperin, Bea Cukai, Status iCloud & FMI (Clean/Lost), dan Simlock Operator.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {success}
          </div>
        )}

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

            <div>
              <Input
                label={isBarcodeMode ? "IMEI Utama (SIM 1)" : "Nomor IMEI"}
                placeholder="Masukkan 15 digit IMEI"
                value={imei}
                onChange={e => setImei(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                required
              />
              {imei.length >= 8 && (() => {
                const analysis = analyzeImei(imei);
                return (
                  <div className={`mt-2 flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    analysis.isValidLength && analysis.isValidLuhn 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                      : analysis.isValidLength && !analysis.isValidLuhn
                      ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                      : 'bg-canvas border-hairline text-ink-muted'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-hairline flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-ink">
                          {analysis.brand ? `${analysis.brand} ${analysis.model}` : `Perangkat Terdeteksi`}
                        </p>
                        <p className="text-[11px] opacity-75 font-mono">
                          {analysis.clean} ({analysis.clean.length}/15 digit)
                        </p>
                      </div>
                    </div>
                    <div>
                      {analysis.isValidLength && analysis.isValidLuhn ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Luhn Valid
                        </span>
                      ) : analysis.isValidLength && !analysis.isValidLuhn ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Cek Ulang Digit
                        </span>
                      ) : (
                        <span className="text-ink-muted">
                          {15 - analysis.clean.length} digit lagi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

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

      {ceirResult && (
        <Card className="mt-6 p-6 border-2 border-primary/30 bg-primary/5 animate-fade-in">
          <h3 className="font-bold text-lg mb-2 text-primary">🎉 Hasil Pengecekan:</h3>
          <p className="text-ink font-medium leading-relaxed">{ceirResult.note}</p>
          {ceirResult.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={ceirResult.image} alt="Barcode/Hasil CEIR" className="mt-4 rounded-xl border border-hairline w-full max-w-sm object-contain bg-white p-2 shadow-sm" />
          )}
        </Card>
      )}

      <SuccessModal
        isOpen={showSuccessPop}
        onClose={() => {
          setShowSuccessPop(false);
          if (!ceirResult) router.push('/history');
        }}
        amount={getPrice(option)}
        title="Pembayaran Berhasil"
        statusText="Cek CEIR otomatis berhasil!"
        recipientLabel="IMEI Target"
        recipientValue={imei}
      />
    </div>
  );
}
