"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import {
  Clock,
  RotateCw,
  Smartphone,
  Cpu,
} from "lucide-react";
import { OrderFilterBar } from "./components/OrderFilterBar";
import { ManualRoamerCard } from "./components/ManualRoamerCard";
import { AutomatedCeirCard } from "./components/AutomatedCeirCard";
import { ManualActionData } from "./components/OrderActionModal";

export default function AdminOrdersPage() {
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  // Sub-tabs: manual (Add Roamer) vs automated (Cek Log CEIR)
  const [orderQueueSubTab, setOrderQueueSubTab] = useState<"manual" | "automated">("manual");

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [searchOrder, setSearchOrder] = useState("");
  const [hideSuccess, setHideSuccess] = useState(false);
  const [hideFailed, setHideFailed] = useState(false);

  // Processing action form state
  const [manualActionData, setManualActionData] = useState<ManualActionData | null>(null);

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
    } catch {
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
    } catch {
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
        {/* SUB-TABS: ANTREAN MANUAL vs LOG CEIR */}
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

        {/* Filters Bar Component */}
        <OrderFilterBar
          searchOrder={searchOrder}
          setSearchOrder={setSearchOrder}
          orderStatusFilter={orderStatusFilter}
          setOrderStatusFilter={setOrderStatusFilter}
          hideSuccess={hideSuccess}
          setHideSuccess={setHideSuccess}
          hideFailed={hideFailed}
          setHideFailed={setHideFailed}
        />

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
              if (orderQueueSubTab === "manual") {
                return (
                  <ManualRoamerCard
                    key={o?.id || index}
                    order={o}
                    copiedKey={copiedKey}
                    copyToClipboard={copyToClipboard}
                    resolveImgUrl={resolveImgUrl}
                    manualActionData={manualActionData}
                    setManualActionData={setManualActionData}
                    onReload={loadManualData}
                    onOpenInvoice={(order) => {
                      const firstImei = order.imei ? order.imei.split(/[\n,]+/)[0].trim() : "";
                      setSelectedInvoiceTrx({
                        trxId: order.id,
                        imei: firstImei || order.targetPhone || "N/A",
                        packageName: order.packageName || "Add Roamer Resmi",
                        serviceType: order.service_type || "imei",
                        createdAt: order.createdAt,
                        amount: order.platformFee || order.originalPrice || 0,
                        status: order.status,
                        adminNote: order.admin_note,
                        admin_image: order.admin_image,
                        user_image: order.user_image,
                        user_image_ceir: order.user_image_ceir,
                      });
                    }}
                    onQuickShareWA={handleAdminQuickShareWA}
                    onCopyReport={handleCopyReport}
                  />
                );
              }

              /* Automated CEIR Orders */
              return (
                <AutomatedCeirCard
                  key={o?.id || index}
                  order={o}
                  retryingOrderId={retryingOrderId}
                  onRetry={handleRetryCeirgoOrder}
                  onOpenInvoice={(order) => {
                    const firstImei = order.imei ? order.imei.split(/[\n,]+/)[0].trim() : "";
                    setSelectedInvoiceTrx({
                      trxId: order.id,
                      imei: firstImei || order.targetPhone || "N/A",
                      packageName: order.packageName || "Layanan Resmi",
                      serviceType: order.service_type || "ceir",
                      createdAt: order.createdAt,
                      amount: order.platformFee || order.originalPrice || 0,
                      status: order.status,
                      adminNote: order.admin_note,
                      apiResponse: order.api_response,
                    });
                  }}
                  onQuickShareWA={handleAdminQuickShareWA}
                />
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
