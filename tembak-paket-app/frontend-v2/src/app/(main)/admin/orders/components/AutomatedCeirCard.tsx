"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Cpu, RefreshCw, Printer, Send, Phone, User, Smartphone } from "lucide-react";
import { parseCeirResponse } from "@/lib/ceirParser";

interface AutomatedCeirCardProps {
  order: any;
  retryingOrderId: string | null;
  onRetry: (orderId: string) => void;
  onOpenInvoice: (order: any) => void;
  onQuickShareWA: (order: any) => void;
}

export function AutomatedCeirCard({
  order: o,
  retryingOrderId,
  onRetry,
  onOpenInvoice,
  onQuickShareWA,
}: AutomatedCeirCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const rawData = o?.api_response || o?.admin_note || "";
  const parsedCeir = parseCeirResponse(rawData, o?.createdAt, o?.api_response);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const customerPhone = (() => {
    if (!o) return null;
    const imeiClean = String(o.imei || "").replace(/\D/g, "");
    const candidates = [o.customerPhone, o.userVerifiedPhone, o.targetPhone];
    for (const c of candidates) {
      if (!c) continue;
      const cleanDigits = String(c).trim().replace(/\D/g, "");
      if (
        cleanDigits.length >= 9 &&
        cleanDigits.length <= 14 &&
        cleanDigits !== imeiClean &&
        (cleanDigits.startsWith("08") || cleanDigits.startsWith("628") || cleanDigits.startsWith("8"))
      ) {
        return String(c).trim();
      }
    }
    return null;
  })();

  return (
    <div className="p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl bg-canvas space-y-4 hover:border-emerald-400/80 transition-all shadow-xs">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Otomatis Server CEIR
            </span>
            <span className="font-bold text-sm sm:text-base text-ink">
              {o?.packageName || "Cek Riwayat Database CEIR"}
            </span>
            <span className="text-xs font-mono text-ink-muted bg-parchment/60 px-2 py-0.5 rounded border border-hairline">
              #{o?.id ? String(o.id).substring(0, 14) : "-"}
            </span>
          </div>
          <p className="text-xs text-ink mt-1 flex items-center gap-1.5 flex-wrap">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-ink-muted">Target IMEI:</span>
            <span className="font-mono font-bold text-ink">{o?.imei || "-"}</span>
            {o?.imei && (
              <button
                type="button"
                onClick={() => copyToClipboard(o.imei, `imei-${o.id}`)}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer ml-1"
              >
                {copiedKey === `imei-${o.id}` ? "Tersalin!" : "Salin"}
              </button>
            )}
          </p>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
              Proses Instan Server
            </span>
          </div>
          <p className="text-[11px] text-ink-muted mt-1">
            {o?.createdAt ? new Date(o.createdAt).toLocaleString("id-ID") : "-"}
          </p>
        </div>

        <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
          <span
            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              o?.status === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : o?.status === "failed" || o?.status === "cancelled"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : o?.status === "processing"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {o?.status === "in_queue" ? "ANTREAN" : o?.status === "cancelled" ? "DIBATALKAN (REFUND)" : o?.status || "PENDING"}
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
          {customerPhone ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-ink">{customerPhone}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(customerPhone, `phone-${o.id}`)}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
              >
                {copiedKey === `phone-${o.id}` ? "Tersalin!" : "Salin"}
              </button>
              <a
                href={`https://wa.me/${customerPhone.replace(/^0/, "62").replace(/\D/g, "")}`}
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

      {/* Banner Khusus Order Dibatalkan / Refund */}
      {o?.status === "cancelled" && (
        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <span className="text-base shrink-0 leading-none">⚠️</span>
          <div className="space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wide text-amber-800">
              Otomatis Dibatalkan & Saldo Di-Refund
            </span>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {o?.admin_note || "Saldo pengguna telah dikembalikan secara otomatis karena saldo API server pusat tidak mencukupi."}
            </p>
          </div>
        </div>
      )}

      {/* Log Layanan CEIR Otomatis (Tabel API jika Sukses) */}
      {parsedCeir.rows.length > 0 && o?.status === "success" ? (
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
            <span className="font-bold text-[11px] text-emerald-950 uppercase tracking-wider">
              Log Layanan CEIR (Otomatis)
            </span>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              {parsedCeir.columns.length} Kolom Data
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white shadow-xs">
            <table className="w-full text-left text-[11px] min-w-[450px]">
              <thead className="bg-emerald-100/70 text-emerald-900 border-b border-emerald-200 font-mono">
                <tr>
                  {parsedCeir.columns.map((col, cIdx) => (
                    <th key={cIdx} className="py-2 px-2.5 font-bold uppercase tracking-wider">
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 font-mono text-[10px]">
                {parsedCeir.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-emerald-50/40">
                    {parsedCeir.columns.map((col, cIdx) => (
                      <td key={cIdx} className="py-2 px-2.5 text-slate-800 break-words whitespace-pre-wrap font-sans text-xs">
                        {String(row[col] !== undefined && row[col] !== null ? row[col] : "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (o?.status === "cancelled" || o?.status === "failed") ? (() => {
        const rawErr = String(parsedCeir.errorMessage || o?.admin_note || "").trim();
        const isBalanceErr = rawErr.toLowerCase().includes("balance-mu") || 
                             rawErr.toLowerCase().includes("tidak mencukupi") || 
                             rawErr.toLowerCase().includes("insufficient_balance");

        return (
          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-rose-200/80 pb-1.5">
              <span className="font-bold text-[11px] text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                {isBalanceErr ? "🚨 Saldo API Provider Kurang" : "Status Server Provider"}
              </span>
              <span className="text-[10px] font-mono bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded font-bold">
                {isBalanceErr ? "Perlu Top-Up API" : "Tidak Ada Log CEIR"}
              </span>
            </div>
            {isBalanceErr ? (
              <div className="space-y-1.5">
                <p className="text-xs text-rose-800 leading-relaxed font-semibold">
                  Saldo API Admin di server CeirGO tidak mencukupi. Pesanan telah otomatis dibatalkan & saldo di-refund ke akun pengguna.
                </p>
                <div className="text-[11px] text-rose-700 bg-white/90 p-2 rounded-lg border border-rose-200/70 font-mono break-words">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Respon Server Pusat:</span>
                  {rawErr}
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-700 leading-relaxed font-medium">
                {rawErr || "Pengecekan tidak menghasilkan log data karena pesanan dibatalkan / gagal."}
              </p>
            )}
          </div>
        );
      })() : null}

      {/* Footer Action Buttons */}
      <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-hairline">
        <Button
          size="sm"
          disabled={retryingOrderId === o.id}
          onClick={() => onRetry(o.id)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retryingOrderId === o.id ? "animate-spin" : ""}`} />
          Cek Ulang Server
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
      </div>
    </div>
  );
}
