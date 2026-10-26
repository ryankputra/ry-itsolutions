"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { parseCeirResponse } from "@/lib/ceirParser";
import {
  Clock,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Printer,
  Send,
  Upload,
  Check,
  X,
  Smartphone,
  Cpu,
  RefreshCw,
  Copy,
  ExternalLink,
  User,
  Phone,
  Image as ImageIcon,
  Zap,
  FileText,
  ShieldCheck,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  // Sub-tabs: manual vs automated
  const [orderQueueSubTab, setOrderQueueSubTab] = useState<"manual" | "automated">("manual");

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [searchOrder, setSearchOrder] = useState("");
  const [hideSuccess, setHideSuccess] = useState(false);
  const [hideFailed, setHideFailed] = useState(false);

  // Processing action form
  const [manualActionData, setManualActionData] = useState<{
    id: string;
    status: string;
    note: string;
    file: File | null;
  } | null>(null);

  // Invoice modal
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any | null>(null);

  // Retry loading
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  // Copied feedback key
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleCopyReport = (o: any) => {
    const imeis = (typeof o?.imei === "string" ? o.imei : "")
      .split(/[\n,;]+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(", ");
    const text = `*LAPORAN PESANAN - RY-ITSOLUTIONS*\nID: #${o.id}\nLayanan: ${o.packageName || "Add Roamer"}\nPelanggan: ${o.userName || "-"}\nNo HP: ${o.targetPhone || "-"}\nIMEI: ${imeis || "-"}\nKecepatan: ${o.speed_label || o.speed_option || "Regular"}\nStatus: ${o.status?.toUpperCase() || "PENDING"}\n${o.admin_note ? `Catatan/SN: ${o.admin_note}\n` : ""}Waktu: ${o.createdAt ? new Date(o.createdAt).toLocaleString("id-ID") : "-"}`;
    copyToClipboard(text, `report-${o.id}`);
    Swal.fire({
      title: "Format Laporan Tersalin",
      text: "Data pesanan berhasil disalin ke clipboard.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const QUICK_NOTE_TEMPLATES = [
    "Sinyal All Operator Aktif (Garansi)",
    "SN: REG-",
    "IMEI Terdaftar ke Database Operator",
    "Garansi Aktif, Mode Pesawat 10s lalu Restart HP",
    "Sedang dalam proses antrean server operator",
  ];

  const resolveImgUrl = (url: string) => {
    const trimmed = (url || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) return trimmed;
    return `/${trimmed}`;
  };

  const loadManualData = async () => {
    setLoadingManual(true);
    try {
      const res = await fetch("/api/admin/manual-orders", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && Array.isArray(d.data)) {
        setManualOrders(d.data);
      } else {
        setManualOrders([]);
      }
    } catch (e) {
      setManualOrders([]);
    } finally {
      setLoadingManual(false);
    }
  };

  useEffect(() => {
    loadManualData();
  }, []);

  const handleRetryCeirgoOrder = async (orderId: string) => {
    setRetryingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/manual-orders/${orderId}/retry-ceirgo`, {
        method: "POST",
        credentials: "include",
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Berhasil", text: d.message || "Pesanan berhasil diproses ulang ke server.", timer: 1500, showConfirmButton: false });
        loadManualData();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal submit ulang ke provider." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleAdminQuickShareWA = async (trx: any) => {
    const defaultPhone = trx.targetPhone || "";
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota via WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (misal: 08123456789):",
      inputValue: defaultPhone,
      inputPlaceholder: "08xxxxxxxxxx",
      showCancelButton: true,
      confirmButtonText: "Buka WhatsApp",
      cancelButtonText: "Batal",
      inputValidator: (val: string | null) => {
        if (!val || val.replace(/\D/g, "").length < 9) {
          return "Masukkan nomor WhatsApp yang valid!";
        }
      },
    });

    if (!phone) return;

    const cleanPhone = phone.replace(/^0/, "62").replace(/\D/g, "");
    const imeiList = trx.imei || "-";
    const statusText =
      trx.status === "success"
        ? "SELESAI (SUKSES)"
        : trx.status === "processing"
        ? "SEDANG DIPROSES"
        : trx.status === "failed"
        ? "GAGAL"
        : "DALAM ANTREAN";

    const msg = encodeURIComponent(
      `*NOTA TRANSAKSI - RY-ITSOLUTIONS*\n\n` +
        `ID Pesanan: #${trx?.id ? String(trx.id).substring(0, 14) : "-"}\n` +
        `Layanan: ${trx?.packageName || "Layanan Resmi"}\n` +
        `IMEI/Target: ${imeiList}\n` +
        `Status: *${statusText}*\n` +
        (trx?.admin_note ? `Catatan/SN: ${trx.admin_note}\n` : "") +
        `Waktu: ${trx?.createdAt ? new Date(trx.createdAt).toLocaleString("id-ID") : "-"}\n\n` +
        `Terima kasih telah bertransaksi bersama kami!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  // Sub-tab filtering: manual IMEI vs automated
  const tabOrders = (Array.isArray(manualOrders) ? manualOrders : []).filter((o) => {
    if (!o || typeof o !== "object") return false;
    const sType = String(o.service_type || "").toLowerCase();
    const pkgId = String(o.packageId || "").toLowerCase();
    const isAuto =
      sType === "ceir" ||
      sType === "barcode" ||
      pkgId.startsWith("cek_") ||
      pkgId.startsWith("create_");
    return orderQueueSubTab === "automated" ? isAuto : !isAuto;
  });

  // Metrics
  const manualPendingCount = (Array.isArray(manualOrders) ? manualOrders : []).filter((o) => {
    if (!o || typeof o !== "object") return false;
    const sType = String(o.service_type || "").toLowerCase();
    const pkgId = String(o.packageId || "").toLowerCase();
    return (
      o.status === "pending" &&
      sType !== "ceir" &&
      sType !== "barcode" &&
      !pkgId.startsWith("cek_") &&
      !pkgId.startsWith("create_")
    );
  }).length;

  const manualProcessingCount = (Array.isArray(manualOrders) ? manualOrders : []).filter((o) => {
    if (!o || typeof o !== "object") return false;
    const sType = String(o.service_type || "").toLowerCase();
    const pkgId = String(o.packageId || "").toLowerCase();
    return (
      (o.status === "processing" || o.status === "in_queue") &&
      sType !== "ceir" &&
      sType !== "barcode" &&
      !pkgId.startsWith("cek_") &&
      !pkgId.startsWith("create_")
    );
  }).length;

  const automatedPendingCount = (Array.isArray(manualOrders) ? manualOrders : []).filter((o) => {
    if (!o || typeof o !== "object") return false;
    const sType = String(o.service_type || "").toLowerCase();
    const pkgId = String(o.packageId || "").toLowerCase();
    return (
      (o.status === "pending" || o.status === "processing") &&
      (sType === "ceir" || sType === "barcode" || pkgId.startsWith("cek_") || pkgId.startsWith("create_"))
    );
  }).length;

  // Filtered orders list
  const filteredOrders = tabOrders.filter((o) => {
    if (!o) return false;
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (hideSuccess && o.status === "success") return false;
    if (hideFailed && o.status === "failed") return false;

    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase();
      const matchImei = o.imei && String(o.imei).toLowerCase().includes(q);
      const matchId = o.id && String(o.id).toLowerCase().includes(q);
      const matchName = o.userName && String(o.userName).toLowerCase().includes(q);
      const matchPhone = o.targetPhone && String(o.targetPhone).toLowerCase().includes(q);
      return Boolean(matchImei || matchId || matchName || matchPhone);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Antrean Pesanan & Log Transaksi
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Eksekusi pengerjaan manual admin, input Serial Number, dan pantau log server pusat.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={loadManualData} className="gap-1.5 text-xs">
          <RotateCw className={`w-3.5 h-3.5 ${loadingManual ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      <Card glass className="p-5 space-y-5">
        {/* SUB-TABS: ANTREAN MANUAL vs LOG CEIRGO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOrderQueueSubTab("manual")}
            className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              orderQueueSubTab === "manual"
                ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-xs"
                : "border-hairline bg-canvas hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  orderQueueSubTab === "manual" ? "bg-primary text-white" : "bg-parchment text-ink"
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold text-xs sm:text-sm ${orderQueueSubTab === "manual" ? "text-primary" : "text-ink"}`}>
                  Antrean Add Roamer (Manual Admin)
                </p>
                <p className="text-[11px] text-ink-muted">Verifikasi nomor IMEI, status garansi, & upload bukti hasil.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {manualPendingCount > 0 && (
                <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold px-2.5 py-0.5 rounded-full text-xs animate-pulse">
                  {manualPendingCount} Antre
                </span>
              )}
              {manualProcessingCount > 0 && (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full text-xs">
                  {manualProcessingCount} Diproses
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOrderQueueSubTab("automated")}
            className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              orderQueueSubTab === "automated"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30 shadow-xs"
                : "border-hairline bg-canvas hover:border-amber-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  orderQueueSubTab === "automated" ? "bg-amber-500 text-white" : "bg-parchment text-ink"
                }`}
              >
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold text-xs sm:text-sm ${orderQueueSubTab === "automated" ? "text-amber-700" : "text-ink"}`}>
                  Log Layanan CEIR (Otomatis)
                </p>
                <p className="text-[11px] text-ink-muted">Layanan cek database server & generator barcode realtime.</p>
              </div>
            </div>
            <div>
              {automatedPendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  {automatedPendingCount} Tertunda
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Cari berdasarkan IMEI, Order ID, nama pelanggan, atau nomor HP..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-hairline bg-canvas text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-ink font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideSuccess}
                onChange={(e) => setHideSuccess(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Sembunyikan Sukses</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-ink font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideFailed}
                onChange={(e) => setHideFailed(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Sembunyikan Gagal</span>
            </label>
          </div>
        </div>

        {/* Orders List */}
        {loadingManual ? (
          <div className="py-12 text-center text-xs text-ink-muted">
            <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Memuat antrean pesanan...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl text-ink-muted text-xs">
            Tidak ada transaksi pesanan yang sesuai dengan filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((o, index) => {
              const isManualTab = orderQueueSubTab === "manual";
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

              if (isManualTab) {
                return (
                  <div
                    key={o?.id || index}
                    className="p-4 sm:p-5 border border-indigo-200/90 dark:border-indigo-900/60 rounded-2xl bg-canvas space-y-4 hover:border-indigo-400/80 transition-all shadow-xs"
                  >
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

                    {/* Admin Action Form Inline */}
                    {manualActionData?.id === o.id ? (
                      <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                            Proses & Ubah Status Add Roamer
                          </p>
                          <button
                            type="button"
                            onClick={() => setManualActionData(null)}
                            className="text-xs text-ink-muted hover:text-ink cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-ink">Status Pengerjaan</label>
                          <select
                            className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                            value={manualActionData?.status || "pending"}
                            onChange={(e) =>
                              setManualActionData((prev) => (prev ? { ...prev, status: e.target.value } : null))
                            }
                          >
                            <option value="pending">Pending (Menunggu Antrean)</option>
                            <option value="processing">Processing (Sedang Dikerjakan)</option>
                            <option value="success">Success (Berhasil Selesai & Garansi Aktif)</option>
                            <option value="failed">Failed (Gagal / Refund Saldo)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-ink flex items-center justify-between">
                            <span>Catatan Admin / Serial Number (SN)</span>
                            <span className="text-[10px] text-ink-muted font-normal">Klik template cepat:</span>
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {QUICK_NOTE_TEMPLATES.map((tmpl, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() => {
                                  setManualActionData((prev) => {
                                    if (!prev) return null;
                                    const current = prev.note || "";
                                    const updated = current ? `${current} - ${tmpl}` : tmpl;
                                    return { ...prev, note: updated };
                                  });
                                }}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                              >
                                + {tmpl}
                              </button>
                            ))}
                          </div>
                          <Input
                            placeholder="Contoh: SN: REG-9921 / Sinyal All Operator Aktif (Garansi 3 Bulan)"
                            value={manualActionData?.note || ""}
                            onChange={(e) => setManualActionData((prev) => (prev ? { ...prev, note: e.target.value } : null))}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-ink block mb-1">
                            Lampiran Bukti Hasil Sinyal / Pengerjaan (Opsional)
                          </label>
                          <input
                            type="file"
                            className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            onChange={(e) =>
                              setManualActionData((prev) => (prev ? { ...prev, file: e.target.files?.[0] || null } : null))
                            }
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="text-xs font-bold h-9 gap-1.5"
                            onClick={async () => {
                              const formData = new FormData();
                              formData.append("status", manualActionData?.status || "pending");
                              formData.append("admin_note", manualActionData?.note || "");
                              if (manualActionData?.file) {
                                formData.append("admin_image", manualActionData.file);
                                formData.append("image", manualActionData.file);
                              }

                              try {
                                const res = await fetch(`/api/admin/manual-orders/${o.id}`, {
                                  method: "PUT",
                                  credentials: "include",
                                  body: formData,
                                });
                                const d = await res.json().catch(() => null);
                                if (res.ok && d?.status) {
                                  Swal.fire({ title: "Tersimpan", text: d.message || "Status pesanan berhasil diperbarui.", timer: 1500, showConfirmButton: false });
                                  setManualActionData(null);
                                  loadManualData();
                                } else {
                                  Swal.fire({ title: "Gagal", text: d?.message || "Gagal memperbarui status pesanan." });
                                }
                              } catch (e: any) {
                                Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
                              }
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Simpan Perubahan
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-9" onClick={() => setManualActionData(null)}>
                            Batal
                          </Button>
                        </div>
                      </div>
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
                          onClick={() => {
                            const firstImei = o.imei ? o.imei.split(/[\n,]+/)[0].trim() : "";
                            setSelectedInvoiceTrx({
                              trxId: o.id,
                              imei: firstImei || o.targetPhone || "N/A",
                              packageName: o.packageName || "Add Roamer Resmi",
                              serviceType: o.service_type || "imei",
                              createdAt: o.createdAt,
                              amount: o.platformFee || o.originalPrice || 0,
                              status: o.status,
                              adminNote: o.admin_note,
                              admin_image: o.admin_image,
                              user_image: o.user_image,
                              user_image_ceir: o.user_image_ceir,
                            });
                          }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak Nota
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs h-8 font-bold gap-1.5"
                          onClick={() => handleAdminQuickShareWA(o)}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Kirim WhatsApp
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1.5 text-ink-muted hover:text-ink"
                          onClick={() => handleCopyReport(o)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Salin Laporan
                        </Button>
                      </div>
                    )}
                  </div>
                );
              }

              /* === TAMPILAN KHUSUS LOG LAYANAN CEIR (OTOMATIS) === */
              return (
                <div
                  key={o?.id || index}
                  className="p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl bg-canvas space-y-4 hover:border-emerald-400/80 transition-all shadow-xs"
                >
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
                      <p className="text-xs text-ink mt-1">
                        Target: <span className="font-mono font-bold">{o?.imei || o?.targetPhone || "-"}</span>
                        {o?.userName && <span className="ml-2 text-ink-muted">({o.userName})</span>}
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                          Proses Instan Server
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">{o?.createdAt ? new Date(o.createdAt).toLocaleString("id-ID") : "-"}</p>
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
                        {o?.status === "in_queue" ? "ANTREAN" : o?.status || "PENDING"}
                      </span>
                      <span className="text-sm font-bold text-ink font-mono">
                        Rp {(Number(o?.platformFee) || Number(o?.originalPrice) || Number(o?.price) || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Log Layanan CEIR Otomatis (Tabel API) */}
                  {(() => {
                    const rawData = o?.api_response || o?.admin_note || "";
                    const parsedCeir = parseCeirResponse(rawData, o?.createdAt, o?.api_response);
                    return (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                          <span className="font-bold text-[11px] text-emerald-950 uppercase tracking-wider">
                            Log Layanan CEIR (Otomatis)
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            {parsedCeir.columns.length} Kolom API
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
                    );
                  })()}

                  {/* Footer Action Buttons */}
                  <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-hairline">
                    <Button
                      size="sm"
                      disabled={retryingOrderId === o.id}
                      onClick={() => handleRetryCeirgoOrder(o.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${retryingOrderId === o.id ? "animate-spin" : ""}`} />
                      Retry Submit API
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => {
                        const firstImei = o.imei ? o.imei.split(/[\n,]+/)[0].trim() : "";
                        setSelectedInvoiceTrx({
                          trxId: o.id,
                          imei: firstImei || o.targetPhone || "N/A",
                          packageName: o.packageName || "Layanan Resmi",
                          serviceType: o.service_type || "ceir",
                          createdAt: o.createdAt,
                          amount: o.platformFee || o.originalPrice || 0,
                          status: o.status,
                          adminNote: o.admin_note,
                          apiResponse: o.api_response,
                        });
                      }}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Nota
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs h-8 font-bold gap-1.5"
                      onClick={() => handleAdminQuickShareWA(o)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Invoice Modal for Admin */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoiceTrx)}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={selectedInvoiceTrx}
      />
    </div>
  );
}
