"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { SuccessModal } from "@/components/ui/SuccessModal";

export default function UnblockImeiPage() {
  const { user } = useApp();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [imei, setImei] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState("");
  
  const [files, setFiles] = useState<File[]>([]);
  const [ceirFiles, setCeirFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ isOpen: true, note: "" });

  useEffect(() => {
    Promise.all([
      fetch('/api/imei-packages').then(res => res.json()),
      fetch('/api/manual-services-pricing').then(res => res.json()),
      fetch('/api/imei-service-status', { cache: 'no-store' }).then(res => res.json()).catch(() => ({ status: true, isOpen: true, note: "" }))
    ]).then(([pkgData, prcData, statusData]) => {
      if (statusData && statusData.status) {
        setServiceStatus({ isOpen: statusData.isOpen, note: statusData.note || "" });
      }
      if (pkgData.status && pkgData.data.length > 0) {
        setPackages(pkgData.data);
        setSelectedPkgId(pkgData.data[0].id);
      }
      if (prcData.status) {
        setSpeedPricing(prcData.data);
        // Find first active speed
        const activeSpeed = Object.keys(prcData.data)
          .filter(k => k.startsWith('imei_speed_') && !k.endsWith('_status') && prcData.data[`${k}_status`] !== 'hidden')
          .map(k => k.replace('imei_speed_', ''))[0] || "";
        setSelectedSpeed(activeSpeed);
      }
    }).finally(() => setLoading(false));
  }, []);

  const imeiList = imei.split(/[\n,]+/).map(i => i.replace(/\s+/g, '').trim()).filter(i => i.length >= 14);
  const imeiCount = imeiList.length > 0 ? imeiList.length : 1;

  const selectedPkg = packages.find(p => p.id === selectedPkgId);
  const basePrice = selectedPkg ? selectedPkg.price : 0;
  const speedPrice = speedPricing[`imei_speed_${selectedSpeed}`] 
    ? parseInt(speedPricing[`imei_speed_${selectedSpeed}`]) || 0 
    : 0;
  const totalPrice = (basePrice + speedPrice) * imeiCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return setError("Anda harus menyetujui Syarat & Ketentuan.");
    if (files.length === 0) return setError("Screenshot *#06# wajib diupload.");
    if (imeiList.length === 0) return setError("Tidak ada IMEI yang valid (minimal 14/15 digit).");
    if (!selectedPkg) return setError("Silakan pilih paket durasi.");
    if (user && user.balance < totalPrice) {
      Swal.fire({
      title: 'Saldo Tidak Mencukupi',
      text: 'Saldo Anda tidak mencukupi. Silakan Top Up terlebih dahulu.',
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

    const confirm = await Swal.fire({
      title: 'Ready buat checkout? 💸',
      text: `Yakin mau lanjut bayar untuk ${imeiList.length} IMEI? Saldo kepotong Rp ${totalPrice.toLocaleString('id-ID')} ya.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Gass!',
      cancelButtonText: 'Ntar Dulu'
    });

    if (!confirm.isConfirmed) {
      return;
    }

    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("service_type", "imei");
    formData.append("imei", imei);
    formData.append("duration", selectedPkg.duration);
    formData.append("price_key", selectedPkg.id);
    formData.append("speed_option", selectedSpeed);
    
    files.forEach(f => formData.append("image", f));
    ceirFiles.forEach(f => formData.append("ceir_image", f));

    try {
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

  const speedOptions = Object.keys(speedPricing)
    .filter(k => k.startsWith('imei_speed_') && !k.endsWith('_status') && speedPricing[`${k}_status`] !== 'hidden')
    .map(k => {
      const key = k.replace('imei_speed_', '');
      const prc = parseInt(speedPricing[k]) || 0;
      return {
        id: key,
        label: key === 'fast' ? '⚡ Fast' : key === 'semi' ? '🚀 Semi Fast' : '🐌 Slow',
        price: prc
      };
    });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Buka Gembok IMEI 🔓</h1>
          <p className="text-sm text-ink-muted">Bikin sinyal HP Inter lo auto on terus.</p>
        </div>
      </div>

      <Card glass className="p-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm space-y-3 shadow-inner">
          <h3 className="font-bold flex items-center gap-1.5 text-base">⚠️ Rules (Wajib Baca Dulu Ngab!)</h3>
          <ul className="list-decimal pl-5 space-y-2 leading-relaxed">
            <li>Cuma buat <b>HP Inter (Internasional)</b> ya.</li>
            <li>Buat user iPhone, <i>wajib banget</i> pastiin HP lo <b>bukan barang bypass-an</b>!</li>
            <li>Pastiin <b>IC Baseband HP lo masih sehat</b>. Cara ngeceknya: masukin SIM Card, kalo munculnya <span className="font-semibold text-rose-600">"Tidak ada layanan" (No Service)</span> berarti aman. BUKAN "Tidak ada SIM" (No SIM Card) ya.</li>
            <li>Kalo HP lo statusnya <b>simlock</b>, wajib udah kepasang <i>rsim</i> atau <i>sim sticker</i> dari awal.</li>
            <li>Proses ini manual dikerjain admin (estimasi 1-24 jam). Kalo gagal gara-gara sistem, <b>saldo lo di-refund 100%</b>. (TAPI KALO GAGAL KARENA KESALAHAN LO SENDIRI, NO REFUND!).</li>
          </ul>
        </div>

        {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-500/10 text-green-700 rounded-xl text-sm">{success}</div>}

        {serviceStatus.isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink/80">Nomor IMEI</label>
              <textarea 
                placeholder="Masukkan 15 digit IMEI (Bisa banyak sekaligus, pisahkan dengan enter atau koma)" 
                value={imei} 
                onChange={e => {
                  const val = e.target.value;
                  const sanitized = val.replace(/[^0-9,\n\r ]/g, '');
                  setImei(sanitized);
                }}
                className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px] leading-relaxed"
                required 
              />
              <p className="text-xs text-ink-muted">Terdeteksi: <b className="text-primary">{imeiList.length}</b> IMEI Valid</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink/80">Upload Screenshot *#06# <span className="text-rose-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink/80">Upload Hasil Cek CEIR <span className="text-ink-muted text-xs">(Opsional)</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={e => setCeirFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink/80">Pilih Masa Aktif</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {loading ? <p className="text-sm text-ink-muted col-span-3">Memuat paket...</p> : packages.length === 0 ? <p className="text-sm text-ink-muted col-span-3">Belum ada pilihan paket.</p> : packages.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedPkgId(opt.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${selectedPkgId === opt.id ? 'border-primary bg-primary/5 shadow-sm text-primary ring-1 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                  >
                    <div className="font-bold text-sm">{opt.duration}</div>
                    <div className="text-xs mt-1">Rp {opt.price.toLocaleString('id-ID')}</div>
                  </button>
                ))}
              </div>
            </div>

            {speedOptions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-ink/80">Pilih Kecepatan Proses</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {speedOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSpeed(opt.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${selectedSpeed === opt.id ? 'border-primary bg-primary/5 shadow-sm text-primary ring-1 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                    >
                      <div className="font-bold text-sm capitalize">{opt.label}</div>
                      <div className="text-xs mt-1">{opt.price === 0 ? 'Gratis' : `+ Rp ${opt.price.toLocaleString('id-ID')}`}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-hairline">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-hairline text-primary" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span className="text-sm text-ink-muted">Saya menyatakan bahwa HP saya memenuhi seluruh persyaratan di atas dan setuju memproses pesanan ini.</span>
              </label>
            </div>
            
            <Button className="w-full h-12" type="submit" isLoading={submitting}>
              Bayar Rp {totalPrice.toLocaleString('id-ID')}
            </Button>
          </form>
        ) : (
          <div className="bg-rose-500/10 border border-rose-200/50 p-6 rounded-2xl text-center space-y-3">
            <span className="text-4xl block">🔒</span>
            <h3 className="font-black text-rose-700 text-lg">Server IMEI Sedang Tutup</h3>
            <p className="text-sm text-rose-600 font-semibold max-w-md mx-auto leading-relaxed">
              {serviceStatus.note || "Layanan unblock IMEI sedang tidak menerima pesanan baru. Silakan pantau terus notifikasi dari kami ya!"}
            </p>
          </div>
        )}


    </Card>

    <SuccessModal 
      isOpen={showSuccessPop} 
      onClose={() => router.push('/history')} 
      amount={totalPrice} 
      title="Pembayaran Berhasil"
      statusText="Pesanan Unblock IMEI berhasil dibuat!"
      recipientLabel="IMEI Target"
      recipientValue={imei}
    />
  </div>
  );
}
