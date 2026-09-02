"use client";
import React, { useRef, useState } from "react";
import { CeirLogRow, ParsedCeirResult, parseCeirResponse } from "@/lib/ceirParser";
import Swal from "@/lib/sweetalert";

interface CeirExportCardProps {
  trxId: string;
  imei: string;
  createdAt: string;
  rawNote?: string;
  packageName?: string;
  storeName?: string;
  storePhone?: string;
}

export function CeirExportCard({
  trxId,
  imei,
  createdAt,
  rawNote,
  packageName = "Pemeriksaan Riwayat CEIR",
  storeName = "Ry-IT Solutions",
  storePhone
}: CeirExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const parsed: ParsedCeirResult = parseCeirResponse(rawNote, new Date(createdAt).toLocaleString("id-ID"));

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `CEIR-Report-${imei || trxId}.png`;
      link.href = dataUrl;
      link.click();
      Swal.fire({
        icon: "success",
        title: "Gambar Berhasil Diunduh!",
        text: "Laporan CEIR resolusi tinggi telah disimpan dalam format PNG.",
        timer: 1800,
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
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPos = 10;
      if (imgHeight < pageHeight - 20) {
        yPos = (pageHeight - imgHeight) / 2; // vertically center if fits
      }

      pdf.addImage(imgData, "PNG", 10, yPos, imgWidth, imgHeight);
      pdf.save(`CEIR-Certificate-${imei || trxId}.pdf`);

      Swal.fire({
        icon: "success",
        title: "PDF Berhasil Diunduh!",
        text: "Sertifikat resmi CEIR telah disimpan dalam format PDF.",
        timer: 1800,
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

  return (
    <div className="space-y-4">
      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800">
            Hasil CEIR Terverifikasi ({parsed.rows.length} Log Riwayat)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadImage}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span>{isExporting ? "Memproses..." : "Download Gambar (.png)"}</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-focus text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>{isExporting ? "Memproses..." : "Download PDF (.pdf)"}</span>
          </button>
        </div>
      </div>

      {/* Visual Branded Printable Card Canvas */}
      <div
        ref={cardRef}
        className="relative bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 overflow-hidden"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Decorative Background Watermark */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Official Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white font-black text-lg shadow-md">
                RY
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
                  {storeName || "Ry-IT Solutions"}
                </h1>
                <p className="text-[11px] font-semibold text-primary mt-1">
                  Pusat Solusi Digital, Gateway IMEI & Verifikasi CEIR Nasional
                </p>
              </div>
            </div>
            {storePhone && (
              <p className="text-[10px] text-slate-500 font-medium">
                Kontak Layanan Pelanggan: {storePhone}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {parsed.status}
            </span>
            <p className="text-[10px] font-mono text-slate-400 mt-1 font-bold">
              TRX: #{trxId ? trxId.substring(0, 16) : "N/A"}
            </p>
          </div>
        </div>

        {/* Highlight Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nomor IMEI</span>
            <span className="text-xs font-mono font-black text-slate-900 block mt-0.5 tracking-wider">
              {imei || "-"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jenis Pemeriksaan</span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5">
              {packageName}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Waktu Verifikasi</span>
            <span className="text-xs font-mono text-slate-700 block mt-0.5">
              {parsed.verifiedAt}
            </span>
          </div>
        </div>

        {/* Structured CEIR Result Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              Tabel Rincian Riwayat Database CEIR
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              Total {parsed.rows.length} Catatan
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                  <th className="py-2 px-3 w-10 text-center">No</th>
                  <th className="py-2 px-3 w-36">Waktu Kejadian</th>
                  <th className="py-2 px-3 w-40">Aksi / Event</th>
                  <th className="py-2 px-3">Keterangan / Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parsed.rows.map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500 text-[11px]">
                      {row.no}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 font-medium">
                      {row.tanggal}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-emerald-700">
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                        {row.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 text-[11px] font-medium leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{row.note}</span>
                        {row.imsi && (
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            IMSI: {row.imsi}
                          </span>
                        )}
                        {row.imei && row.imei !== imei && (
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            IMEI: {row.imei}
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

        {/* Official Security Footer */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
              ✓
            </div>
            <span>
              Dokumen ini dihasilkan secara otomatis oleh sistem <strong>{storeName || "Ry-IT Solutions"}</strong> dan terverifikasi secara digital.
            </span>
          </div>
          <div className="font-mono text-slate-400 font-semibold tracking-wider">
            ID: {trxId}
          </div>
        </div>
      </div>
    </div>
  );
}
