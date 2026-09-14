"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
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
        `ID Pesanan: #${trx.id.substring(0, 14)}\n` +
        `Layanan: ${trx.packageName || "Layanan Resmi"}\n` +
        `IMEI/Target: ${imeiList}\n` +
        `Status: *${statusText}*\n` +
        (trx.admin_note ? `Catatan/SN: ${trx.admin_note}\n` : "") +
        `Waktu: ${new Date(trx.createdAt).toLocaleString("id-ID")}\n\n` +
        `Terima kasih telah bertransaksi bersama kami!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  // Sub-tab filtering: manual IMEI vs automated
  const tabOrders = manualOrders.filter((o) => {
    const isAuto =
      o.service_type === "ceir" ||
      o.service_type === "barcode" ||
      (o.packageId && (o.packageId.startsWith("cek_") || o.packageId.startsWith("create_")));
    return orderQueueSubTab === "automated" ? isAuto : !isAuto;
  });

  // Metrics
  const manualPendingCount = manualOrders.filter(
    (o) =>
      o.status === "pending" &&
      o.service_type !== "ceir" &&
      o.service_type !== "barcode" &&
      !o.packageId?.startsWith("cek_") &&
      !o.packageId?.startsWith("create_")
  ).length;

  const manualProcessingCount = manualOrders.filter(
    (o) =>
      (o.status === "processing" || o.status === "in_queue") &&
      o.service_type !== "ceir" &&
      o.service_type !== "barcode" &&
      !o.packageId?.startsWith("cek_") &&
      !o.packageId?.startsWith("create_")
  ).length;

  const automatedPendingCount = manualOrders.filter(
    (o) =>
      (o.status === "pending" || o.status === "processing") &&
      (o.service_type === "ceir" ||
        o.service_type === "barcode" ||
        o.packageId?.startsWith("cek_") ||
        o.packageId?.startsWith("create_"))
  ).length;

  // Filtered orders list
  const filteredOrders = tabOrders.filter((o) => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (hideSuccess && o.status === "success") return false;
    if (hideFailed && o.status === "failed") return false;

    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase();
      const matchImei = o.imei && o.imei.toLowerCase().includes(q);
      const matchId = o.id && o.id.toLowerCase().includes(q);
      const matchName = o.userName && o.userName.toLowerCase().includes(q);
      const matchPhone = o.targetPhone && o.targetPhone.includes(q);
      return matchImei || matchId || matchName || matchPhone;
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
                  Antrean Buka IMEI (Manual Admin)
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
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 border border-hairline rounded-xl bg-canvas space-y-3 hover:border-primary/30 transition-colors shadow-xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink">{o.packageName}</span>
                      <span className="text-xs font-mono text-ink-muted bg-parchment/60 px-2 py-0.5 rounded border border-hairline">
                        #{o.id.substring(0, 14)}
                      </span>
                    </div>
                    <p className="text-xs text-ink mt-0.5">
                      Pelanggan: <span className="font-bold">{o.userName}</span>
                      {o.targetPhone && <span className="ml-1 text-ink-muted font-mono">({o.targetPhone})</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {o.imei?.split(",").map((im: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md border border-primary/20 font-mono"
                        >
                          {im.trim()}
                        </span>
                      ))}
                    </div>

                    {orderQueueSubTab === "manual" ? (
                      o.speed_option &&
                      o.speed_option !== "instant" && (
                        <p className="text-xs font-semibold text-primary mt-1">
                          Kecepatan:{" "}
                          <span className="font-bold">
                            {o.speed_label || (o.speed_option === "fast" ? "Fast" : o.speed_option === "semi" ? "Semi Fast" : "Slow")}
                          </span>
                        </p>
                      )
                    ) : (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                          Proses Instan Server
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-ink-muted mt-1">{new Date(o.createdAt).toLocaleString("id-ID")}</p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        o.status === "success"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : o.status === "failed"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : o.status === "processing"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {o.status === "in_queue" ? "ANTREAN" : o.status}
                    </span>
                    <span className="text-sm font-bold text-ink font-mono">
                      Rp {(o.platformFee || o.originalPrice || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Screenshot Proofs (Manual Tab) */}
                {orderQueueSubTab === "manual" && (o.user_image || o.user_image_ceir) && (
                  <div className="flex gap-4 flex-wrap pt-2 border-t border-hairline">
                    {o.user_image && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-ink">Foto Bukti Layar:</p>
                        <div className="flex flex-wrap gap-2">
                          {o.user_image.split(",").map((imgUrl: string, idx: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={idx}
                              src={imgUrl}
                              alt="Bukti User"
                              className="h-16 object-contain rounded-xl border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                              onClick={() => {
                                Swal.fire({
                                  imageUrl: imgUrl,
                                  imageAlt: "Bukti User",
                                  showConfirmButton: false,
                                  showCloseButton: true,
                                });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Action Form Inline */}
                {manualActionData?.id === o.id ? (
                  <div className="p-3.5 bg-parchment/40 rounded-xl border border-hairline space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-xs text-ink">Proses & Ubah Status Pesanan</p>
                      <button
                        type="button"
                        onClick={() => setManualActionData(null)}
                        className="text-xs text-ink-muted hover:text-ink"
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
                        <option value="processing">Processing (Sedang Dikerjakan Server)</option>
                        <option value="success">Success (Berhasil Selesai)</option>
                        <option value="failed">Failed (Gagal / Refund)</option>
                      </select>
                    </div>

                    <Input
                      label="Catatan Admin / Serial Number (SN)"
                      placeholder="Contoh: SN: REG-9921 / Sinyal All Operator Aktif"
                      value={manualActionData?.note || ""}
                      onChange={(e) => setManualActionData((prev) => (prev ? { ...prev, note: e.target.value } : null))}
                    />

                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">Lampiran Foto Bukti Hasil (Opsional)</label>
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
                    {orderQueueSubTab === "manual" && (
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
                    )}

                    {orderQueueSubTab === "automated" && (
                      <Button
                        size="sm"
                        disabled={retryingOrderId === o.id}
                        onClick={() => handleRetryCeirgoOrder(o.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retryingOrderId === o.id ? "animate-spin" : ""}`} />
                        Retry Submit API
                      </Button>
                    )}

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
                          serviceType: o.service_type,
                          createdAt: o.createdAt,
                          amount: o.platformFee || o.originalPrice || 0,
                          status: o.status,
                          adminNote: o.admin_note,
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
                )}
              </div>
            ))}
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
