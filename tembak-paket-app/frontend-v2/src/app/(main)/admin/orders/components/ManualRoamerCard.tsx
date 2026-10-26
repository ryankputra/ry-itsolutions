"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Smartphone,
  Copy,
  Check,
  Zap,
  Clock,
  User,
  Phone,
  ShieldCheck,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Printer,
  Send,
} from "lucide-react";
import Swal from "@/lib/sweetalert";
import { OrderActionModal, ManualActionData } from "./OrderActionModal";

interface ManualRoamerCardProps {
  order: any;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  resolveImgUrl: (url: string) => string;
  manualActionData: ManualActionData | null;
  setManualActionData: React.Dispatch<React.SetStateAction<ManualActionData | null>>;
  onReload: () => void;
  onOpenInvoice: (order: any) => void;
  onQuickShareWA: (order: any) => void;
  onCopyReport: (order: any) => void;
}

export function ManualRoamerCard({
  order: o,
  copiedKey,
  copyToClipboard,
  resolveImgUrl,
  manualActionData,
  setManualActionData,
  onReload,
  onOpenInvoice,
  onQuickShareWA,
  onCopyReport,
}: ManualRoamerCardProps) {
  const imeis = (typeof o?.imei === "string" ? o.imei : "")
    .split(/[\n,;]+/)
    .map((s: string) => s.trim())
    .filter(Boolean);
  const userImages = (typeof o?.user_image === "string" ? o.user_image : "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const userCeirImages = (typeof o?.user_image_ceir === "string" ? o.user_image_ceir : "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const adminImages = (typeof o?.admin_image === "string" ? o.admin_image : "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const isEditingThisOrder = manualActionData?.id === o.id;

  return (
    <div className="p-4 sm:p-5 border border-indigo-200/90 dark:border-indigo-900/60 rounded-2xl bg-canvas space-y-4 hover:border-indigo-400/80 transition-all shadow-xs">
      {/* Header Row: Title, ID, Speed, Status & Price */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Antrean Add Roamer (Manual)
            </span>
            <span className="font-bold text-sm sm:text-base text-ink">
              {o?.packageName || "Add Roamer Resmi"}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(String(o?.id || ""), `id-${o?.id}`)}
              className="text-[11px] font-mono text-ink-muted hover:text-ink bg-parchment/70 hover:bg-parchment px-2 py-0.5 rounded border border-hairline inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="Klik untuk salin Order ID"
            >
              <span>#{o?.id ? String(o.id).substring(0, 14) : "-"}</span>
              {copiedKey === `id-${o?.id}` ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-ink-muted" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {o?.speed_label || (o?.speed_option && o.speed_option !== "instant") ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Zap className="w-3 h-3 text-amber-600" />
                Kecepatan: {o.speed_label || (o.speed_option === "fast" ? "Fast" : o.speed_option === "semi" ? "Semi Fast" : "Slow")}
              </span>
            ) : null}
            <span className="text-[11px] text-ink-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {o?.createdAt ? new Date(o.createdAt).toLocaleString("id-ID") : "-"}
            </span>
          </div>
        </div>

        <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
          <span
            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              o?.status === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : o?.status === "failed"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : o?.status === "processing"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {o?.status === "in_queue" ? "ANTREAN" : o?.status === "processing" ? "SEDANG DIPROSES" : o?.status?.toUpperCase() || "PENDING"}
          </span>
          <span className="text-sm font-bold text-ink font-mono">
            Rp {(Number(o?.platformFee) || Number(o?.originalPrice) || Number(o?.price) || 0).toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Info Pelanggan & Kontak WhatsApp */}
      <div className="p-2.5 rounded-xl bg-parchment/40 dark:bg-slate-900/50 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-ink-muted shrink-0" />
          <span className="text-ink-muted">Pelanggan:</span>
          <span className="font-bold text-ink">{o?.userName || "Pelanggan"}</span>
          {o?.userId && (
            <span className="text-[10px] text-ink-muted font-mono hidden md:inline">
              (ID: {String(o.userId).substring(0, 12)}...)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-ink-muted">WhatsApp:</span>
          {o?.targetPhone ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-ink">{o.targetPhone}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(o.targetPhone, `phone-${o.id}`)}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
              >
                {copiedKey === `phone-${o.id}` ? "Tersalin!" : "Salin"}
              </button>
              <a
                href={`https://wa.me/${o.targetPhone.replace(/^0/, "62").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
              >
                Chat WA
              </a>
            </div>
          ) : (
            <span className="text-ink-muted italic">Tidak ada nomor HP</span>
          )}
        </div>
      </div>

      {/* Hero Box: Data IMEI Target (Khusus Add Roamer) */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Nomor IMEI Target (Pengerjaan Add Roamer)
          </span>
          {imeis.length > 1 && (
            <button
              type="button"
              onClick={() => copyToClipboard(imeis.join(", "), `imei-all-${o.id}`)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedKey === `imei-all-${o.id}` ? "Semua IMEI Tersalin!" : "Salin Semua IMEI"}</span>
            </button>
          )}
        </div>

        {imeis.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada nomor IMEI yang dimasukkan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {imeis.map((im: string, iIdx: number) => (
              <div
                key={iIdx}
                className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono shrink-0">
                    {imeis.length > 1 ? `IMEI ${iIdx + 1}` : "IMEI"}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wider truncate select-all">
                    {im}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(im, `im-${o.id}-${iIdx}`)}
                    className="px-2 py-1 rounded text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Salin IMEI ini"
                  >
                    {copiedKey === `im-${o.id}-${iIdx}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[11px]">Salin</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/cek-garansi?q=${encodeURIComponent(im)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                    title="Cek Status Garansi / Sinyal IMEI"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Cek</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bukti Foto dari Pelanggan */}
      {(userImages.length > 0 || userCeirImages.length > 0) && (
        <div className="p-3 rounded-xl bg-parchment/30 dark:bg-slate-900/40 border border-hairline space-y-2">
          <p className="text-xs font-bold text-ink flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            Foto Bukti Layar dari Pelanggan:
          </p>
          <div className="flex gap-4 flex-wrap">
            {userImages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase">Tentang Ponsel (IMEI):</span>
                <div className="flex flex-wrap gap-2">
                  {userImages.map((imgUrl: string, idx: number) => {
                    const src = resolveImgUrl(imgUrl);
                    return (
                      <img
                        key={idx}
                        src={src}
                        alt={`Bukti User ${idx + 1}`}
                        className="h-16 object-contain rounded-xl border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                        onClick={() => {
                          Swal.fire({
                            imageUrl: src,
                            imageAlt: "Bukti Layar Ponsel (IMEI)",
                            showConfirmButton: false,
                            showCloseButton: true,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {userCeirImages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase">Bukti Status CEIR:</span>
                <div className="flex flex-wrap gap-2">
                  {userCeirImages.map((imgUrl: string, idx: number) => {
                    const src = resolveImgUrl(imgUrl);
                    return (
                      <img
                        key={idx}
                        src={src}
                        alt={`Bukti CEIR ${idx + 1}`}
                        className="h-16 object-contain rounded-xl border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                        onClick={() => {
                          Swal.fire({
                            imageUrl: src,
                            imageAlt: "Bukti Status CEIR",
                            showConfirmButton: false,
                            showCloseButton: true,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Catatan Admin / SN & Bukti Hasil Pengerjaan Admin */}
      {(o?.admin_note || adminImages.length > 0) && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          {o?.admin_note && (
            <div className="space-y-1.5">
              <p className="font-bold text-[10px] text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Catatan / Serial Number (SN) Admin:
                </span>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                  Hasil Pengerjaan
                </span>
              </p>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                {(() => {
                  const note = String(o.admin_note);
                  if (note.includes("|") && (note.includes("USERID") || note.includes("PACKAGEID") || note.includes("IMEI"))) {
                    return note.split("|").map((item, idx) => {
                      const parts = item.trim().split(":");
                      if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join(":").trim();
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                            <span className="text-slate-500 font-bold uppercase">{key}:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium sm:text-right break-all">{val}</span>
                          </div>
                        );
                      }
                      return <div key={idx} className="text-slate-700 dark:text-slate-300 py-0.5">{item.trim()}</div>;
                    });
                  }
                  return <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans text-xs">{note}</div>;
                })()}
              </div>
            </div>
          )}

          {adminImages.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Bukti Sinyal / Hasil Pengerjaan Admin:
              </p>
              <div className="flex flex-wrap gap-2">
                {adminImages.map((imgUrl: string, idx: number) => {
                  const src = resolveImgUrl(imgUrl);
                  return (
                    <img
                      key={idx}
                      src={src}
                      alt={`Bukti Admin ${idx + 1}`}
                      className="h-16 object-contain rounded-xl border border-emerald-300 bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                      onClick={() => {
                        Swal.fire({
                          imageUrl: src,
                          imageAlt: "Bukti Hasil Pengerjaan Admin",
                          showConfirmButton: false,
                          showCloseButton: true,
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Action Form Inline OR Action Buttons */}
      {isEditingThisOrder ? (
        <OrderActionModal
          actionData={manualActionData}
          setActionData={setManualActionData}
          onSuccess={onReload}
        />
      ) : (
        <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-hairline">
          <Button
            variant="outline"
            size="sm"
            className="bg-primary/5 text-primary border-primary/30 hover:bg-primary hover:text-white text-xs h-8 font-bold"
            onClick={() =>
              setManualActionData({ id: o.id, status: o.status, note: o.admin_note || "", file: null })
            }
          >
            Proses Pesanan
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => onOpenInvoice(o)}
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Nota
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs h-8 font-bold gap-1.5"
            onClick={() => onQuickShareWA(o)}
          >
            <Send className="w-3.5 h-3.5" />
            Kirim WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 text-ink-muted hover:text-ink"
            onClick={() => onCopyReport(o)}
          >
            <FileText className="w-3.5 h-3.5" />
            Salin Laporan
          </Button>
        </div>
      )}
    </div>
  );
}
