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
import { safeJson } from "@/lib/api";
import InstantQrisPaymentModal from "@/components/ui/InstantQrisPaymentModal";

const ceirgoNameMapping: Record<string, string> = {
  'cek_imei': 'Cek Status IMEI',
  'cek_imei_beacukai': 'Cek IMEI Bea Cukai',
  'cek_history_imei': 'Cek Riwayat Database CEIR',
  'cek_validity': 'Cek Masa Aktif Sinyal',
  'cek_digi': 'Cek DIGI',
  'cek_sf': 'Cek Smartfren',
  'cek_icloud': 'Cek iCloud & FMI',
  'cek_simlock': 'Cek Carrier / Simlock'
};

const DIAGNOSTIC_SERVICES_CORE = [
  { code: 'cek_imei', name: 'Cek Status IMEI', modalPrice: 2000 },
  { code: 'cek_imei_beacukai', name: 'Cek IMEI Bea Cukai', modalPrice: 1500 },
  { code: 'cek_history_imei', name: 'Cek Riwayat Database CEIR', modalPrice: 5100 },
  { code: 'cek_validity', name: 'Cek Masa Aktif Sinyal', modalPrice: 1000 },
  { code: 'cek_digi', name: 'Cek DIGI', modalPrice: 1000 },
  { code: 'cek_sf', name: 'Cek Smartfren', modalPrice: 1000 }
];

export default function CekCeirPage() {
  const { user, updateBalance } = useApp();
  const router = useRouter();

  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [option, setOption] = useState("cek_imei");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [ceirResult, setCeirResult] = useState<{ note: string | null, image: string | null, rows?: any[] } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"balance" | "qris">("balance");
  const [showInstantQris, setShowInstantQris] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/ceirgo-pricing').then(res => safeJson(res)).catch(() => null),
      fetch('/api/ceirgo-services').then(res => safeJson(res)).catch(() => ({ status: false })),
      fetch('/api/admin/ceirgo-display-settings', { credentials: 'include' }).then(res => safeJson(res)).catch(() => ({ status: false }))
    ]).then(([ceirPrcData, ceirSvcData, displayData]) => {
      if (ceirPrcData?.status && ceirPrcData.data) {
        setCeirgoPricing(ceirPrcData.data);
      }

      // Build available diagnostic services
      const rawServices = Array.isArray(ceirSvcData?.data?.page?.items)
        ? ceirSvcData.data.page.items
        : Array.isArray(ceirSvcData?.data)
          ? ceirSvcData.data
          : [];

      const merged = [...DIAGNOSTIC_SERVICES_CORE];
      rawServices.forEach((svc: any) => {
        if (!svc?.code || /barcode|create/i.test(`${svc.code} ${svc.name}`)) return;
        const exists = merged.find(m => m.code === svc.code);
        if (exists) {
          exists.name = svc.name || ceirgoNameMapping[svc.code] || exists.name;
          exists.modalPrice = Number(svc.modalPrice ?? svc.unit_price ?? exists.modalPrice);
        } else {
          merged.push({
            code: svc.code,
            name: svc.name || ceirgoNameMapping[svc.code] || svc.code,
            modalPrice: Number(svc.modalPrice ?? svc.unit_price ?? 2000)
          });
        }
      });

      // Filter by Admin Toggle Settings
      const hasSetting = displayData?.status && displayData.data && Array.isArray(displayData.data.cekCeir);
      const activeCodes = hasSetting ? new Set(displayData.data.cekCeir) : new Set(merged.map(s => s.code));

      const finalServices = merged.filter(s => activeCodes.has(s.code));
      setCeirgoServices(finalServices);
      if (finalServices.length > 0 && !activeCodes.has(option)) {
        setOption(finalServices[0].code);
      }
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
    return Number.isFinite(modalPrice) && modalPrice > 0 ? modalPrice : 5000;
  };

  const executeCeirSubmission = async (methodOverride?: string) => {
    const activeMethod = methodOverride || paymentMethod;
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("service_type", "ceir");
      formData.append("service_code", option);
      formData.append("price_key", option);
      formData.append("imei", imei);
      formData.append("duration", ceirgoNameMapping[option] || option);
      formData.append("payment_method", activeMethod);
    const userPhone = user?.phone || user?.verifiedPhone || "";
    if (userPhone) {
      formData.append("target_phone", userPhone);
      formData.append("targetPhone", userPhone);
    }

      const res = await fetch("/api/order/ceir", {
        method: "POST",
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.status) {
        if (typeof data.data?.newBalance === 'number') {
          updateBalance(data.data.newBalance);
        } else if (typeof data.newBalance === 'number') {
          updateBalance(data.newBalance);
        }

        const note = data.data?.result?.status || data.data?.adminNote || (typeof data.data?.result === 'string' ? data.data.result : 'Pengecekan berhasil diterima.');
        const rows = Array.isArray(data.data?.result?.[0]?.history) ? data.data.result[0].history : null;
        setCeirResult({ note, image: null, rows });
        setShowSuccessPop(true);
      } else {
        Swal.fire({
          title: "Gagal Membuat Pesanan",
          text: data.message || "Gagal membuat pesanan.",
          icon: "error"
        });
        setError(data.message || "Gagal membuat pesanan.");
      }
    } catch (err) {
      Swal.fire({
        title: "Error Jaringan",
        text: "Kesalahan jaringan saat memproses pesanan.",
        icon: "error"
      });
      setError("Kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || imei.length < 15) return setError("IMEI Utama tidak valid (minimal 15 digit angka).");

    const price = getPrice(option);

    // If Direct QRIS chosen or balance < price, trigger Instant QRIS directly
    if (paymentMethod === "qris" || (user && user.balance < price)) {
      setShowInstantQris(true);
      return;
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Pesanan Diagnostik',
      text: `Anda akan melakukan ${ceirgoNameMapping[option] || option} untuk IMEI ${imei}. Biaya: Rp ${price.toLocaleString('id-ID')}. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Bayar Sekarang!',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    executeCeirSubmission("balance");
  };

  const renderServiceButtons = () => {
    if (loading) return <p className="text-sm text-ink-muted col-span-full py-4 text-center">Memuat katalog layanan...</p>;

    if (ceirgoServices.length === 0) {
      return (
        <div className="col-span-full p-4 text-center text-sm text-ink-muted border rounded-xl border-dashed">
          Belum ada layanan Diagnostik IMEI yang diaktifkan oleh Admin.
        </div>
      );
    }

    return ceirgoServices.map(svc => {
      const isSelected = option === svc.code;
      const price = getPrice(svc.code);
      return (
        <button
          key={svc.code}
          type="button"
          onClick={() => setOption(svc.code)}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2 ${
            isSelected
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary'
              : 'border-hairline bg-canvas hover:bg-parchment hover:border-primary/40'
          }`}
        >
          <div>
            <div className="font-bold text-xs text-ink line-clamp-1">{svc.name}</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">{svc.code}</div>
          </div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-lg self-start ${isSelected ? 'bg-primary text-white' : 'bg-parchment text-primary'}`}>
            Rp {price.toLocaleString('id-ID')}
          </div>
        </button>
      );
    });
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12">
      {/* Category Switcher Tabs */}
      <div className="flex p-1 bg-parchment rounded-2xl border border-hairline max-w-sm mx-auto shadow-2xs">
        <button
          type="button"
          className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-primary text-white shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span>🔍</span> Diagnostik IMEI
        </button>
        <button
          type="button"
          onClick={() => router.push('/barcode')}
          className="flex-1 py-2 px-3 text-xs font-semibold text-ink-muted hover:text-ink rounded-xl flex items-center justify-center gap-1.5 transition-all"
        >
          <span>🏷️</span> Generator Barcode
        </button>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">🔍</span>
            Cek Status & Diagnostik IMEI
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">Pemeriksaan database CEIR Kemenperin, Bea Cukai, Masa Aktif Sinyal, DIGI & Smartfren.</p>
        </div>
      </div>

      <Card glass className="p-5 sm:p-6 space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-ink flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">1</span>
              Pilih Layanan Diagnostik
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {renderServiceButtons()}
            </div>
          </div>

          <div className="pt-4 border-t border-hairline space-y-4">
            <label className="text-xs font-bold text-ink flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">2</span>
              Masukkan Nomor IMEI Target
            </label>

            <div>
              <Input
                label="Nomor IMEI (15 Digit)"
                placeholder="Contoh: 358921098765432"
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
                        <p className="font-bold text-ink text-xs">
                          {analysis.brand ? `${analysis.brand} ${analysis.model}` : `Perangkat Terdeteksi`}
                        </p>
                        <p className="text-[10px] opacity-75 font-mono">
                          {analysis.clean} ({analysis.clean.length}/15 digit)
                        </p>
                      </div>
                    </div>
                    <div>
                      {analysis.isValidLength && analysis.isValidLuhn ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                          Luhn Valid
                        </span>
                      ) : analysis.isValidLength && !analysis.isValidLuhn ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                          Periksa Digit
                        </span>
                      ) : (
                        <span className="text-ink-muted text-[11px]">
                          {15 - analysis.clean.length} digit lagi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Pilihan Metode Pembayaran Direct vs Saldo */}
          <div className="space-y-2 pt-4 border-t border-hairline">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">3</span>
                Pilih Metode Pembayaran
              </span>
              <span className="text-[10px] text-ink-muted">Langsung diproses otomatis 24 Jam</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("balance")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentMethod === "balance"
                    ? "border-primary bg-primary/5 ring-1 ring-primary font-bold shadow-xs"
                    : "border-hairline bg-canvas hover:bg-parchment"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>💳</span> Saldo Akun
                  </span>
                  <input type="radio" checked={paymentMethod === "balance"} onChange={() => {}} className="text-primary" />
                </div>
                <div className="text-xs text-primary font-mono font-bold mt-1.5">
                  Rp {Number(user?.balance || 0).toLocaleString("id-ID")}
                </div>
                <p className="text-[10px] text-ink-muted mt-0.5">Potong langsung dari dompet akun</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("qris")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentMethod === "qris"
                    ? "border-primary bg-primary/5 ring-1 ring-primary font-bold shadow-xs"
                    : "border-hairline bg-canvas hover:bg-parchment"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>⚡</span> Direct QRIS Otomatis
                  </span>
                  <input type="radio" checked={paymentMethod === "qris"} onChange={() => {}} className="text-primary" />
                </div>
                <div className="text-xs text-emerald-600 font-bold mt-1.5">
                  Semua Bank &amp; E-Wallet (Realtime 24 Jam)
                </div>
                <p className="text-[10px] text-ink-muted mt-0.5">BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay</p>
              </button>
            </div>
          </div>

          <Button className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 mt-4" type="submit" isLoading={submitting}>
            {submitting
              ? "Memproses Server..."
              : paymentMethod === "qris" || (user && user.balance < getPrice(option))
              ? `Bayar via QRIS Direct (Rp ${getPrice(option).toLocaleString('id-ID')}) ➔`
              : `Bayar Sekarang (Rp ${getPrice(option).toLocaleString('id-ID')}) ➔`}
          </Button>
        </form>
      </Card>

      {ceirResult && (
        <Card className="mt-4 p-5 border border-primary/30 bg-primary/5 animate-fade-in space-y-3">
          <h3 className="font-bold text-sm text-primary flex items-center gap-2">
            <span>🎉</span> Hasil Pemeriksaan Server:
          </h3>
          <p className="text-xs text-ink font-medium leading-relaxed bg-canvas p-3 rounded-xl border border-hairline whitespace-pre-line">
            {ceirResult.note}
          </p>
          {ceirResult.rows && ceirResult.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-hairline rounded-xl overflow-hidden">
                <thead className="bg-canvas border-b border-hairline font-bold text-ink">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Tanggal</th>
                    <th className="p-2">Aksi</th>
                    <th className="p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-canvas/50">
                  {ceirResult.rows.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2">{row.no || idx + 1}</td>
                      <td className="p-2">{row.date || '-'}</td>
                      <td className="p-2 font-mono font-semibold">{row.action || '-'}</td>
                      <td className="p-2">{row.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <SuccessModal
        isOpen={showSuccessPop}
        onClose={() => {
          setShowSuccessPop(false);
          router.push('/history');
        }}
        amount={getPrice(option)}
        title="Pemeriksaan Berhasil Dikirim"
        statusText="Pesanan diagnostik berhasil diproses oleh server CeirGO!"
        recipientLabel="IMEI Target"
        recipientValue={imei}
      />

      <InstantQrisPaymentModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={getPrice(option)}
        orderTitle={`Cek ${ceirgoNameMapping[option] || option} (${imei})`}
        onSuccess={() => {
          setShowInstantQris(false);
          executeCeirSubmission("qris");
        }}
      />
    </div>
  );
}
