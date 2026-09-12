"use client";
import React, { useState, useEffect, useRef } from "react";
import { analyzeImei } from "@/lib/imeiHelper";
import { parseCeirResponse } from "@/lib/ceirParser";
import Swal from "@/lib/sweetalert";
import QRCode from "qrcode";
import { playPopSound } from "@/lib/soundFx";

interface InvoiceData {
  trxId: string;
  imei: string;
  packageName: string;
  serviceType?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
  amount?: number;
  status: string;
  user_image?: string;
  user_image_ceir?: string;
  admin_image?: string;
  warranty?: {
    hasWarranty?: boolean;
    isPermanent?: boolean;
    durationDays?: number | null;
    startDate?: string;
    expiryDate?: string | null;
    remainingDays?: number | string;
    warrantyStatus?: string;
    notice?: string | null;
  };
  adminNote?: string;
  speed?: string;
  speed_option?: string;
  speed_label?: string;
  speedLabel?: string;
  ceirData?: {
    gateway?: string;
    status?: string;
    detail?: string;
    verifiedAt?: string;
    operators?: string;
    parsed?: any;
  };
  storeName?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData | null;
}

export function InvoiceModal({ isOpen, onClose, data }: InvoiceModalProps) {
  const [customStoreName, setCustomStoreName] = useState("Ry-ITSolutions");
  const [storePhone, setStorePhone] = useState("");
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      playPopSound();
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const imeiAnalysis = data.imei && data.imei !== '-' ? analyzeImei(data.imei) : null;
  const warranty = data.warranty;
  const isSuccess = data.status === 'success' || data.status === 'completed';
  const isTopUp = data.serviceType === 'topup' || data.serviceType === 'topup_qris' || (data.packageName || '').toLowerCase().includes('top up') || (data.packageName || '').toLowerCase().includes('topup');
  const isGatewayService = !isTopUp && (data.serviceType === 'gateway' || data.serviceType === 'apikey' || (data.packageName || '').toLowerCase().includes('gateway') || (data.packageName || '').toLowerCase().includes('api key'));
  const isCeirService = !isTopUp && !isGatewayService && (data.serviceType === 'ceir' || (data.packageName || '').toLowerCase().includes('ceir') || (warranty?.hasWarranty === false && !isGatewayService));

  // Dynamic Warranty & Duration Computation (Strictly matching product duration from completion date)
  const computeDynamicWarranty = () => {
    const pkg = (data.packageName || '').toLowerCase();
    const doneDate = new Date(data.completedAt || data.updatedAt || data.createdAt || Date.now());

    if (isGatewayService) {
      const expiryDate = new Date(doneDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const diff = expiryDate.getTime() - Date.now();
      const rem = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      return {
        hasWarranty: false,
        warrantyStatus: "subscription",
        durationLabel: "30 Hari",
        expiryDate: expiryDate.toISOString(),
        remainingDays: rem,
        isPermanent: false,
        statusText: rem > 0 ? `Sisa ${rem} Hari (Aktif)` : "Langganan Berakhir"
      };
    }

    if (isCeirService || isTopUp) {
      return {
        hasWarranty: false,
        warrantyStatus: "none",
        durationLabel: isTopUp ? "Saldo Akun" : "Non-Garansi",
        expiryDate: null,
        remainingDays: null,
        isPermanent: false,
        statusText: isTopUp ? "Saldo Berhasil Ditambahkan" : "Pengecekan Selesai"
      };
    }

    // IMEI Services: parse months accurately
    let durationMonths = 1;
    let isPermanent = false;
    if (pkg.includes("permanen") || pkg.includes("permanent") || pkg.includes("lifetime") || pkg.includes("seumur hidup")) {
      isPermanent = true;
    } else if (pkg.includes("12 bulan") || pkg.includes("1 tahun") || pkg.includes("12month") || pkg.includes("1year")) {
      durationMonths = 12;
    } else if (pkg.includes("6 bulan") || pkg.includes("6 month") || pkg.includes("6m")) {
      durationMonths = 6;
    } else if (pkg.includes("3 bulan") || pkg.includes("3 month") || pkg.includes("3m")) {
      durationMonths = 3;
    } else if (pkg.includes("2 bulan") || pkg.includes("2 month") || pkg.includes("2m")) {
      durationMonths = 2;
    } else if (pkg.includes("1 bulan") || pkg.includes("1 month") || pkg.includes("1m")) {
      durationMonths = 1;
    } else {
      const m = pkg.match(/(\d+)\s*bulan/i);
      if (m) durationMonths = parseInt(m[1], 10);
    }

    if (isPermanent) {
      return {
        hasWarranty: true,
        warrantyStatus: "active",
        durationLabel: "Permanen (Seumur Hidup)",
        expiryDate: null,
        remainingDays: "Permanen",
        isPermanent: true,
        statusText: "Aktif (Garansi Permanen)"
      };
    }

    const durationDays = durationMonths * 30;
    const expiryDate = new Date(doneDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const diff = expiryDate.getTime() - Date.now();
    const rem = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const durText = `${durationMonths} Bulan (${durationDays} Hari)`;

    return {
      hasWarranty: rem > 0,
      warrantyStatus: rem > 0 ? "active" : "expired",
      durationLabel: durText,
      expiryDate: expiryDate.toISOString(),
      remainingDays: rem,
      isPermanent: false,
      statusText: rem > 0 ? `Sisa ${rem} Hari` : "Garansi Berakhir"
    };
  };

  const dynWarranty = computeDynamicWarranty();

  const handleDownloadPng = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(printRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `Invoice-${data.trxId || data.imei || "Ry-ITSolutions"}.png`;
      link.href = dataUrl;
      link.click();
      Swal.fire({
        icon: "success",
        title: "Gambar Berhasil Diunduh!",
        text: "Nota / Sertifikat resolusi tinggi telah disimpan dalam format PNG.",
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error("Export Image Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunduh Gambar",
        text: err?.message || "Terjadi kesalahan saat memproses gambar."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const dataUrl = await toPng(printRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal merender gambar sertifikat untuk PDF"));
        img.src = dataUrl;
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margins
      const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

      let yPos = 10;
      if (imgHeight < pageHeight - 20) {
        yPos = (pageHeight - imgHeight) / 2;
      }

      pdf.addImage(dataUrl, "PNG", 10, yPos, imgWidth, imgHeight);
      pdf.save(`Certificate-${data.trxId || data.imei || "Ry-ITSolutions"}.pdf`);

      Swal.fire({
        icon: "success",
        title: "PDF Berhasil Diunduh!",
        text: "Dokumen resmi telah disimpan dalam format PDF.",
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error("Export PDF Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunduh PDF",
        text: err?.message || "Terjadi kesalahan saat mengonversi PDF."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const verifyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/cek-garansi?imei=${data.imei}` 
    : `https://ry-itsolutionts.web.id/cek-garansi?imei=${data.imei}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (verifyUrl) {
      QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 })
        .then((url: string) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(qrImageUrl));
    }
  }, [verifyUrl, qrImageUrl]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const handleShareWhatsApp = async () => {
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota ke WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (contoh: 08123456789):",
      inputPlaceholder: "08xxxxxxxxxx",
      showCancelButton: true,
      confirmButtonText: "Buka WhatsApp",
      cancelButtonText: "Batal",
      inputValidator: (value: string | null) => {
        if (!value || value.replace(/\D/g, '').length < 9) {
          return "Masukkan nomor WhatsApp yang valid!";
        }
      }
    });

    if (!phone) return;

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const currentStore = customStoreName || 'Ry-ITSolutions';
    let messageText = "";
    if (isGatewayService) {
      messageText = `Halo Kak, berikut bukti nota transaksi & langganan API Key Gateway dari *${currentStore}*:\n\n` +
        `*ID Transaksi:* #${(data.trxId || '').substring(0, 14)}\n` +
        `*Layanan:* ${data.packageName || 'Langganan API Key Gateway'}\n` +
        `*Masa Aktif:* 30 Hari\n` +
        `*Status:* ${isSuccess ? 'SUKSES / AKTIF' : data.status.toUpperCase()}\n` +
        `*Tanggal:* ${formatDate(data.createdAt)}\n\n` +
        `Terima kasih atas kepercayaannya kepada *${currentStore}*!`;
    } else if (isTopUp) {
      messageText = `Halo Kak, berikut bukti nota top up saldo dari *${currentStore}*:\n\n` +
        `*ID Transaksi:* #${(data.trxId || '').substring(0, 14)}\n` +
        `*Layanan:* ${data.packageName || 'Top Up Saldo'}\n` +
        `*Nominal:* Rp ${(data.amount || 0).toLocaleString('id-ID')}\n` +
        `*Status:* SUKSES / SALDO MASUK\n` +
        `*Tanggal:* ${formatDate(data.createdAt)}\n\n` +
        `Terima kasih atas kepercayaannya kepada *${currentStore}*!`;
    } else {
      messageText = `Halo Kak, berikut bukti nota transaksi & surat garansi digital dari *${currentStore}*:\n\n` +
        `*ID Transaksi:* #${(data.trxId || '').substring(0, 14)}\n` +
        `*Perangkat / IMEI:* ${imeiAnalysis?.brand ? `${imeiAnalysis.brand} ${imeiAnalysis.model}` : 'Smartphone'} (${data.imei})\n` +
        `*Layanan:* ${data.packageName || 'Layanan Aktivasi IMEI'}\n` +
        `*Garansi Sinyal:* ${dynWarranty.durationLabel} (${dynWarranty.statusText})\n` +
        `*Status:* ${isSuccess ? 'SUKSES / SELESAI' : data.status.toUpperCase()}\n` +
        `*Tanggal:* ${formatDate(data.createdAt)}\n\n` +
        `*Cek Nota & Status Garansi Online:* \n${verifyUrl}\n\n` +
        `Terima kasih atas kepercayaannya kepada *${currentStore}*!`;
    }

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  };

  // Helper to parse CEIR result details from Ceirgo API
  const parseCeirDetails = () => {
    const rawNote = data.adminNote || "";
    const parsed = parseCeirResponse(rawNote, formatDate(data.createdAt));

    return {
      status: parsed.status,
      gateway: "Central CEIR Database & IMEI Verification Gateway",
      logs: parsed.rows.map(r => ({
        index: r.no,
        date: r.tanggal,
        action: r.action,
        note: r.note,
        imsi: r.imsi,
        imei: r.imei
      })),
      rawNote: parsed.rawText || "Data IMEI telah berhasil diverifikasi oleh server CEIR.",
      operators: "Semua Operator Seluler (Telkomsel, Indosat, XL, Smartfren, Tri)"
    };
  };

  const ceirInfo = isCeirService ? parseCeirDetails() : null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-canvas text-ink rounded-2xl sm:rounded-3xl shadow-2xl border border-hairline overflow-hidden flex flex-col h-[94dvh] sm:h-auto sm:max-h-[90vh] my-auto">
        
        {/* Top Sticky Header (Hidden on print) */}
        <div className="p-3 sm:p-4 bg-parchment border-b border-hairline flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-full bg-canvas border border-hairline hover:bg-parchment text-xs font-bold text-ink flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
              title="Kembali ke halaman sebelumnya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Kembali</span>
            </button>
            <span className="text-xs font-bold text-ink truncate">
              {isTopUp ? "Nota Top Up" : isGatewayService ? "Nota Langganan Gateway" : isCeirService ? "Nota CEIR" : "Nota & Garansi"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsEditingStore(!isEditingStore)}
              className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                isEditingStore ? 'bg-primary text-white border-primary' : 'bg-canvas border-hairline hover:bg-parchment text-ink'
              }`}
              title="Ubah Nama Toko (Kustomisasi Nota)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              <span className="hidden sm:inline">{isEditingStore ? "Selesai" : "Ubah Toko"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment transition-colors"
              title="Tutup Modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Store Name Editor Toolbar (Hidden on print) */}
        {isEditingStore && (
          <div className="p-4 bg-slate-50 border-b border-hairline text-xs space-y-2 shrink-0 print:hidden">
            <p className="font-bold text-ink flex items-center gap-1.5">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27.1.06-.12l-.773.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.807-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.205l-.527-.737a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pengaturan Identitas Toko (Kustomisasi Nota):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-ink-muted block mb-0.5">Nama Toko Anda:</label>
                <input
                  type="text"
                  value={customStoreName}
                  onChange={(e) => setCustomStoreName(e.target.value)}
                  placeholder="Nama Konter / Toko"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-hairline bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-muted block mb-0.5">No. Kontak / WA Toko:</label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="0812xxxx (Opsional)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-hairline bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Invoice & Certificate Area (Scrollable Body) */}
        <div className="overflow-y-auto flex-1 p-3.5 sm:p-8 bg-white text-slate-900 font-sans print:p-4 print:shadow-none space-y-4 sm:space-y-6 pb-28 sm:pb-8">
          <div ref={printRef} className="space-y-6">
            {/* Header Brand */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  {customStoreName || "Ry-ITSolutions"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {isTopUp
                    ? "Official Deposit / Top Up Digital Receipt"
                    : isGatewayService
                    ? "Official API Key Gateway Subscription Receipt"
                    : isCeirService 
                    ? "Official CEIR Status & IMEI Verification Report" 
                    : "Official IMEI Unblock & Warranty Certificate"}
                </p>
                {storePhone && (
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Kontak / CS: {storePhone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isSuccess ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  data.status === 'pending' || data.status === 'processing' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {isSuccess ? (isTopUp ? 'SALDO MASUK' : isGatewayService ? 'LANGGANAN AKTIF' : isCeirService ? 'SELESAI DICEK' : 'RESMI AKTIF') : data.status.toUpperCase()}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  TRX: #{data.trxId ? data.trxId.substring(0, 16) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Device & Highlights Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isTopUp ? "Jenis Transaksi" : isGatewayService ? "Target Layanan" : "Target Perangkat"}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm shrink-0">
                    {isTopUp ? (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    ) : isGatewayService ? (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      {isTopUp 
                        ? (data.packageName || "Top Up Deposit Digital") 
                        : isGatewayService 
                        ? (data.packageName || "Langganan API Key Gateway") 
                        : (imeiAnalysis?.brand ? `${imeiAnalysis.brand} ${imeiAnalysis.model}` : "Smartphone Device")}
                    </h3>
                    <p className="text-xs font-mono font-bold text-slate-700 tracking-wider">
                      {isTopUp 
                        ? "Metode: Top Up Deposit Digital" 
                        : isGatewayService 
                        ? "Akses: Integrasi API QRIS Otomatis" 
                        : `IMEI: ${data.imei}`}
                    </p>
                  </div>
                </div>
              </div>

              {!isTopUp && !isGatewayService && imeiAnalysis?.isValidLuhn && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                  GSMA Verified
                </span>
              )}
              {isGatewayService && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                  Masa Aktif 30 Hari
                </span>
              )}
              {isTopUp && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                  Saldo Akun
                </span>
              )}
            </div>

            {/* If CEIR Service: Render Structured CEIR Verification Report Box */}
            {isCeirService && ceirInfo && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      <svg className="w-2.5 h-2.5 inline" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    </div>
                    <div>
                      <p className="font-black text-emerald-950 text-xs uppercase tracking-wider">Laporan Pengecekan Database CEIR</p>
                      <p className="text-[10px] text-emerald-700 font-medium">{ceirInfo.gateway}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                    HTTP 200 OK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-slate-500 block">Status Database CEIR</span>
                    <span className="font-black text-emerald-800 text-xs block mt-0.5">
                      {ceirInfo.status}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-slate-500 block">Jangkauan Sinyal Seluler</span>
                    <span className="font-bold text-slate-800 text-xs block mt-0.5">
                      {ceirInfo.operators}
                    </span>
                  </div>
                </div>

                {/* Log Riwayat Tabel */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-emerald-950">Rincian Log Query CEIR:</p>
                  <div className="overflow-hidden rounded-xl border border-emerald-200/80 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-emerald-100/60 text-emerald-900 border-b border-emerald-200/60">
                        <tr>
                          <th className="py-1.5 px-2.5 font-bold w-8">#</th>
                          <th className="py-1.5 px-2.5 font-bold">Waktu</th>
                          <th className="py-1.5 px-2.5 font-bold">Aktivitas / Event</th>
                          <th className="py-1.5 px-2.5 font-bold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {ceirInfo.logs.map((log) => (
                          <tr key={log.index} className="hover:bg-emerald-50/40">
                            <td className="py-1.5 px-2.5 font-bold text-slate-500">{log.index}</td>
                            <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-600">{log.date}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-[10px] text-emerald-800">{log.action}</td>
                            <td className="py-1.5 px-2.5 text-slate-700">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{log.note}</span>
                                {log.imsi && (
                                  <span className="font-mono text-[9px] text-emerald-900 bg-emerald-100/80 px-1 py-0.5 rounded border border-emerald-300">
                                    IMSI: {log.imsi}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction & Warranty Details Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Layanan</span>
                <span className="font-bold text-slate-800">{data.packageName || "Pemeriksaan IMEI Resmi"}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tanggal Transaksi</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(data.createdAt)}
                </span>
              </div>

              {isTopUp ? (
                <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium">Status Pengisian Saldo</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    Saldo Berhasil Ditambahkan
                  </span>
                </div>
              ) : isGatewayService ? (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Masa Aktif Layanan</span>
                    <span className="font-bold text-slate-800">30 Hari</span>
                  </div>
                  {dynWarranty.expiryDate && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Berlaku Hingga</span>
                      <span className="font-bold text-blue-700">
                        {formatDate(dynWarranty.expiryDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Status Langganan</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      {dynWarranty.statusText}
                    </span>
                  </div>
                </>
              ) : !isCeirService ? (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Masa Garansi Layanan</span>
                    <span className="font-bold text-slate-800">{dynWarranty.durationLabel}</span>
                  </div>
                  {dynWarranty.expiryDate && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Garansi Sinyal Hingga</span>
                      <span className="font-bold text-blue-700">
                        {formatDate(dynWarranty.expiryDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Status Garansi Sinyal</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      {dynWarranty.statusText}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Tipe Layanan</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Pengecekan Data & Diagnostik (Non-Garansi)
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Waktu Pengerjaan</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px]">
                      Proses Instant (Otomatis Sistem)
                    </span>
                  </div>
                </>
              )}

              {/* Manual IMEI Speed Option (Only shown for non-automated manual orders) */}
              {!isCeirService && !isTopUp && (data.speed || data.speed_option) && (data.speed || data.speed_option) !== 'instant' && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium">Opsi Kecepatan</span>
                  <span className="font-bold text-slate-800">
                    {data.speed_label || data.speedLabel || (
                      (data.speed || data.speed_option) === 'fast' ? 'Fast (1-3 Jam)' :
                      (data.speed || data.speed_option) === 'semi' ? 'Semi Fast (1-12 Jam)' :
                      'Slow (Max kirim jam 14:00, selesai max jam 00:00 WIB)'
                    )}
                  </span>
                </div>
              )}

              {data.amount && data.amount > 0 && (
                <div className="flex justify-between py-2 border-t-2 border-slate-200 font-bold text-sm">
                  <span className="text-slate-700">Total Biaya</span>
                  <span className="text-slate-900 font-black">
                    Rp {data.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            {/* Verification QR & Terms */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl || qrImageUrl}
                alt="QR Verifikasi"
                className="w-20 h-20 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
              />
              <div className="space-y-1">
                <p className="font-bold text-[11px] text-slate-900 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                  </svg>
                  Scan untuk Verifikasi Status Realtime
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Scan QR code di atas dengan kamera HP untuk memeriksa keaslian surat dan status pengerjaan IMEI secara online.
                </p>
              </div>
            </div>

            {/* Footer Terms */}
            <div className="pt-2 text-[10px] text-slate-400 space-y-1 border-t border-slate-100 text-center">
              <p>Simpan dokumen/nota ini sebagai bukti sah pengerjaan layanan.</p>
              <p className="font-mono text-[9px]">Sistem Terenkripsi & Otentikasi Digital • {customStoreName || 'Ry-ITSolutions'}</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer (Always Visible, Hidden on print, z-20 above background nav) */}
        <div className="p-3 sm:p-4 bg-slate-50/95 backdrop-blur border-t border-hairline flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 print:hidden z-20">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline hover:bg-parchment text-xs font-bold text-ink flex items-center justify-center gap-2 transition-colors order-2 sm:order-1 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Tutup
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2 order-1 sm:order-2">
            {data?.imei && !isCeirService && !isTopUp && !isGatewayService && dynWarranty.hasWarranty && dynWarranty.warrantyStatus === 'active' && (
              <a
                href={`/cek-garansi?imei=${data.imei}&action=claim`}
                className="px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                title="Ajukan Klaim Garansi Sinyal jika No Service"
              >
                <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zM12 16.5h.008v.008H12v-.008z" />
                </svg>
                <span>Klaim Garansi</span>
              </a>
            )}

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
              </svg>
              <span>Kirim WA</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="px-3 py-2.5 rounded-xl bg-canvas border border-hairline hover:bg-parchment text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
              title="Unduh Gambar PNG"
            >
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="hidden xs:inline">Gambar</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
