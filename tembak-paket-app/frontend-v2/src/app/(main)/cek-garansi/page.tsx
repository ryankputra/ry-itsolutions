"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { analyzeImei } from "@/lib/imeiHelper";
import { InvoiceModal } from "@/components/ui/InvoiceModal";

function CekGaransiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialImei = searchParams.get("imei") || "";

  const [searchImei, setSearchImei] = useState(initialImei);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const doCheck = async (imeiToCheck: string) => {
    const clean = (imeiToCheck || "").replace(/\D/g, "");
    if (!clean || clean.length < 8) {
      setError("Masukkan nomor IMEI minimal 8 digit.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/public/check-warranty?imei=${clean}`);
      const d = await res.json();
      if (res.ok && d.status && d.data) {
        setResult(d.data);
      } else {
        setError(d?.message || "Data pelacakan IMEI tidak ditemukan.");
      }
    } catch (err) {
      setError("Gagal menghubungi server. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialImei && initialImei.length >= 8) {
      doCheck(initialImei);
    }
  }, [initialImei]);

  // Real-time update listener: auto re-check if admin changes order status
  useEffect(() => {
    const handleTxUpdate = () => {
      const activeImei = searchImei || initialImei;
      if (activeImei && activeImei.replace(/\D/g, '').length >= 8) {
        doCheck(activeImei);
      }
    };
    window.addEventListener("transaction_status_update", handleTxUpdate);
    return () => window.removeEventListener("transaction_status_update", handleTxUpdate);
  }, [searchImei, initialImei]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchImei) {
      const clean = searchImei.replace(/\D/g, "");
      router.push(`/cek-garansi?imei=${clean}`);
      doCheck(clean);
    }
  };

  const imeiAnalysis = searchImei.length >= 8 ? analyzeImei(searchImei) : null;
  const rawStatus = String(result?.orderStatus || result?.status || 'processing').toLowerCase();
  const rawService = String(result?.serviceType || result?.service_type || 'imei').toLowerCase();
  const isCeirService = rawService === 'ceir' || (result?.packageName || '').toLowerCase().includes('ceir') || result?.hasWarranty === false;
  const warranty = result?.warranty;

  const isCompleted = rawStatus === 'success' || rawStatus === 'completed';
  const isProcessing = rawStatus === 'processing' || rawStatus === 'in_progress';
  const isPending = rawStatus === 'pending' || rawStatus === 'unpaid';

  let statusBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
  let statusBadgeLabel = 'SEDANG DIPROSES';

  if (isCompleted) {
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    statusBadgeLabel = isCeirService ? 'CEIR SELESAI DICEK' : 'SELESAI / SINYAL ON';
  } else if (isProcessing) {
    statusBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
    statusBadgeLabel = 'SEDANG DIPROSES';
  } else if (isPending) {
    statusBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
    statusBadgeLabel = 'MENUNGGU';
  } else {
    statusBadgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
    statusBadgeLabel = (rawStatus || 'GAGAL').toUpperCase();
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Cek Status &amp; Garansi IMEI
          </h1>
          <p className="text-sm text-ink-muted">Cek keabsahan pengerjaan, progress pengerjaan, dan status garansi layanan.</p>
        </div>
      </div>

      {/* Search Card */}
      <Card glass className="p-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ketik 15 Digit Nomor IMEI"
                value={searchImei}
                onChange={(e) => setSearchImei(e.target.value.replace(/\D/g, ""))}
                maxLength={15}
                required
              />
            </div>
            <Button type="submit" isLoading={loading} className="h-11 sm:w-36 font-bold flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Cek Status
            </Button>
          </div>

          {imeiAnalysis && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div>
                  <span className="font-black text-slate-900 block">
                    {imeiAnalysis.brand} {imeiAnalysis.model}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    TAC Prefix: {searchImei.substring(0, 8)}
                  </span>
                </div>
              </div>
              <span className={imeiAnalysis.isValidLuhn ? "text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-0.5 rounded" : "text-amber-700 font-bold bg-amber-100 px-2.5 py-0.5 rounded"}>
                {imeiAnalysis.isValidLuhn ? "Luhn Valid" : "Cek Ulang Digit"}
              </span>
            </div>
          )}
        </form>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              Data Tidak Ditemukan
            </p>
            <p className="opacity-90">{error}</p>
          </div>
        )}
      </Card>

      {/* Result Card */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6 space-y-6 border border-hairline bg-canvas shadow-xl overflow-hidden relative">
            {/* Top Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline">
              <div>
                <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Hasil Pelacakan IMEI</span>
                <h2 className="text-xl font-black text-ink font-mono mt-0.5 tracking-wider">
                  {result.imei}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusBadgeClass}`}>
                  {statusBadgeLabel}
                </span>
              </div>
            </div>

            {/* Service & Warranty Highlight Box */}
            {!isCeirService ? (
              // Unblock IMEI with Sinyal Warranty
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                warranty?.warrantyStatus === 'permanent' || warranty?.warrantyStatus === 'active'
                  ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300/80 text-emerald-950'
                  : warranty?.warrantyStatus === 'in_progress'
                  ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300/80 text-amber-950'
                  : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-300/80 text-rose-950'
              }`}>
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-base">
                      {warranty?.isPermanent ? 'Garansi Aktif Permanen' : warranty?.warrantyStatus === 'active' ? `Garansi Aktif (Sisa ${warranty?.remainingDays} Hari)` : 'Dalam Antrean / Proses'}
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      {warranty?.isPermanent
                        ? 'Layanan ini memiliki jaminan sinyal aktif seumur hidup.'
                        : warranty?.expiryDate
                        ? `Garansi berlaku sampai: ${(() => {
                            try {
                              const d = new Date(warranty.expiryDate);
                              return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                            } catch { return '-'; }
                          })()}`
                        : 'Sedang dalam pengerjaan oleh tim operasional.'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="w-full sm:w-auto font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Cetak Nota &amp; Garansi
                </Button>
              </div>
            ) : (
              // Cek CEIR (Non-Warranty Service)
              <div className="p-5 rounded-2xl border bg-gradient-to-r from-blue-500/10 via-slate-500/5 to-transparent border-blue-200 text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <h3 className="font-black text-base text-slate-900">Layanan Cek Status &amp; Riwayat CEIR</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Non-Garansi</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Layanan ini adalah pengecekan database status pendaftaran IMEI pada server CEIR (bukan aktivasi/unblock sinyal).
                    </p>
                    {result.adminNote && (
                      <p className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                        Hasil CEIR: {result.adminNote}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="w-full sm:w-auto font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Cetak Bukti Cek CEIR
                </Button>
              </div>
            )}

            {/* Stepper Progress Timeline */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Alur Proses Transaksi</p>
              {!isCeirService ? (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[
                    { step: 1, label: "Order Masuk", done: true },
                    { step: 2, label: "Validasi IMEI", done: true },
                    { step: 3, label: "Proses Server", done: isProcessing || isCompleted },
                    { step: 4, label: "Sinyal ON", done: isCompleted }
                  ].map((st) => (
                    <div key={st.step} className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        st.done ? 'bg-primary text-white shadow-sm' : 'bg-parchment text-ink-muted border border-hairline'
                      }`}>
                        {st.done ? "✓" : st.step}
                      </div>
                      <span className={`text-[11px] font-semibold leading-tight ${st.done ? 'text-ink' : 'text-ink-muted'}`}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { step: 1, label: "Order Dibuat", done: true },
                    { step: 2, label: "Query Database CEIR", done: isProcessing || isCompleted },
                    { step: 3, label: "Hasil Cek Selesai", done: isCompleted }
                  ].map((st) => (
                    <div key={st.step} className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        st.done ? 'bg-primary text-white shadow-sm' : 'bg-parchment text-ink-muted border border-hairline'
                      }`}>
                        {st.done ? "✓" : st.step}
                      </div>
                      <span className={`text-[11px] font-semibold leading-tight ${st.done ? 'text-ink' : 'text-ink-muted'}`}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-hairline text-xs">
              <div className="p-3 rounded-xl bg-parchment/60 border border-hairline">
                <span className="text-ink-muted block text-[11px]">Tipe Layanan</span>
                <span className="font-bold text-ink text-sm">{result.packageName || result.service_type || 'Aktivasi IMEI'}</span>
              </div>
              <div className="p-3 rounded-xl bg-parchment/60 border border-hairline">
                <span className="text-ink-muted block text-[11px]">Waktu Transaksi</span>
                <span className="font-bold text-ink text-sm">
                  {result.createdAt ? new Date(result.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </span>
              </div>
              {result.speed_label || result.speed_option ? (
                <div className="p-3 rounded-xl bg-parchment/60 border border-hairline">
                  <span className="text-ink-muted block text-[11px]">Kecepatan Proses Server</span>
                  <span className="font-bold text-ink text-sm text-primary">
                    {result.speed_label || (
                      result.speed_option === 'fast' ? 'Fast (1-3 Jam)' :
                      result.speed_option === 'semi' ? 'Semi Fast (1-12 Jam)' :
                      'Slow (Max kirim jam 14:00, selesai max jam 00:00 WIB)'
                    )}
                  </span>
                </div>
              ) : null}
              {imeiAnalysis && (
                <div className="p-3 rounded-xl bg-parchment/60 border border-hairline">
                  <span className="text-ink-muted block text-[11px]">Model Perangkat Terdeteksi</span>
                  <span className="font-bold text-ink text-sm">
                    {imeiAnalysis.brand} {imeiAnalysis.model}
                  </span>
                </div>
              )}
              {result.adminNote && (
                <div className="p-3 rounded-xl bg-parchment/60 border border-hairline sm:col-span-2">
                  <span className="text-ink-muted block text-[11px]">Catatan / Hasil Sistem</span>
                  <span className="font-bold text-ink text-sm">{result.adminNote}</span>
                </div>
              )}
            </div>

            {/* Lampiran Gambar & Bukti (User Uploaded & Admin Verified) */}
            {(result.user_image || result.user_image_ceir || result.admin_image) && (
              <div className="pt-4 border-t border-hairline space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Lampiran Foto &amp; Bukti Perangkat
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {result.user_image && (
                    <a
                      href={result.user_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-3 rounded-2xl bg-parchment/70 border border-hairline hover:border-primary/50 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-ink">Foto IMEI Pelanggan</span>
                        <span className="text-[10px] text-primary group-hover:underline">Buka ↗</span>
                      </div>
                      <div className="w-full h-36 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center border border-hairline relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.user_image}
                          alt="Foto IMEI Pelanggan"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  )}

                  {result.user_image_ceir && (
                    <a
                      href={result.user_image_ceir}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-3 rounded-2xl bg-parchment/70 border border-hairline hover:border-primary/50 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-ink">Screenshot CEIR Pelanggan</span>
                        <span className="text-[10px] text-primary group-hover:underline">Buka ↗</span>
                      </div>
                      <div className="w-full h-36 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center border border-hairline relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.user_image_ceir}
                          alt="Screenshot CEIR Pelanggan"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  )}

                  {result.admin_image && (
                    <a
                      href={result.admin_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 hover:border-emerald-400 transition-all flex flex-col gap-2 sm:col-span-2 md:col-span-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Bukti Selesai Admin
                        </span>
                        <span className="text-[10px] text-emerald-700 group-hover:underline">Buka ↗</span>
                      </div>
                      <div className="w-full h-36 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center border border-emerald-200 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.admin_image}
                          alt="Bukti Selesai Admin"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Invoice / Warranty Certificate Modal */}
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        data={result ? {
          trxId: result.trxId || result.id || '-',
          imei: result.imei,
          packageName: result.packageName,
          serviceType: result.serviceType || result.service_type,
          createdAt: result.createdAt,
          status: rawStatus,
          warranty: result.warranty,
          adminNote: result.adminNote || result.admin_note,
          ceirData: result.ceirData,
          user_image: result.user_image,
          user_image_ceir: result.user_image_ceir,
          admin_image: result.admin_image
        } : null}
      />
    </div>
  );
}

export default function CekGaransiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink-muted">Memuat halaman cek garansi...</div>}>
      <CekGaransiContent />
    </Suspense>
  );
}
