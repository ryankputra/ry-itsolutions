"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Link from "next/link";
import Swal from "sweetalert2";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function HistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") || "all";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  // Sync tab with search params when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_URL}/user/transactions`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.status && Array.isArray(data.data)) {
            setHistory(data.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleQuickShareWhatsApp = async (trx: any) => {
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota via WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (misal: 08123456789):",
      inputPlaceholder: "08xxxxxxxxxx",
      showCancelButton: true,
      confirmButtonText: "Buka WhatsApp 🚀",
      cancelButtonText: "Batal",
      inputValidator: (val) => {
        if (!val || val.replace(/\D/g, "").length < 9) {
          return "Masukkan nomor WhatsApp yang valid!";
        }
      },
    });

    if (!phone) return;

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith("62")) cleanPhone = "62" + cleanPhone;

    const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, "") : "";
    const verifyUrl = `${window.location.origin}/cek-garansi?imei=${primaryImei}`;

    const text =
      `Halo Kak, berikut bukti transaksi dari *Ry-ITSolutions*:\n\n` +
      `🧾 *ID Transaksi:* #${trx.id.substring(0, 14)}\n` +
      `📱 *IMEI:* ${trx.imei || "-"}\n` +
      `📦 *Layanan:* ${trx.package_name || trx.service_type || "Aktivasi IMEI"}\n` +
      `🛡️ *Status:* ${trx.status.toUpperCase()}\n` +
      `📅 *Tanggal:* ${new Date(trx.createdAt).toLocaleDateString("id-ID")}\n\n` +
      `🔗 *Cek Nota & Garansi Digital:* \n${verifyUrl}\n\n` +
      `Terima kasih atas kepercayaannya! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const tabs = [
    { key: "all", label: "Semua" },
    { key: "unpaid", label: "Belum Bayar" },
    { key: "processing", label: "Diproses" },
    { key: "completed", label: "Selesai" },
    { key: "canceled", label: "Dibatalkan" },
  ];

  const filteredHistory = history.filter((trx) => {
    if (activeTab === "all") return true;

    const status = trx.status?.toLowerCase() || "";
    if (activeTab === "unpaid") {
      return status === "pending" || status === "unpaid";
    }
    if (activeTab === "processing") {
      return status === "processing" || status === "in_progress";
    }
    if (activeTab === "completed") {
      return status === "success" || status === "completed";
    }
    if (activeTab === "canceled") {
      return status === "failed" || status === "canceled" || status === "rejected";
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "success" || s === "completed") {
      return {
        label: "Selesai (Garansi Aktif)",
        textColor: "text-emerald-600 font-bold",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (s === "processing" || s === "in_progress") {
      return {
        label: "Sedang Diproses Server",
        textColor: "text-blue-600 font-bold",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    if (s === "pending" || s === "unpaid") {
      return {
        label: "Belum Bayar / Menunggu",
        textColor: "text-amber-600 font-bold",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      label: "Dibatalkan / Gagal",
      textColor: "text-rose-600 font-bold",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    };
  };

  const getServiceIcon = (serviceType: string, packageName: string) => {
    const text = `${serviceType} ${packageName}`.toLowerCase();
    if (text.includes("ceir") || text.includes("cek")) return "🔍";
    if (text.includes("topup") || text.includes("saldo")) return "💳";
    return "📱";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-24">
      {/* ============================================================ */}
      {/* 1. TOP HEADER (Pesanan Saya)                                */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between bg-canvas pt-1 pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 font-bold text-sm text-ink hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="text-base sm:text-lg font-black">Pesanan Saya</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/tickets"
            className="p-1.5 text-ink-muted hover:text-primary transition-colors"
            title="Pusat Bantuan CS"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SHOPEE-STYLE TAB STRIP WITH INDICATOR LINE                */}
      {/* ============================================================ */}
      <div className="flex border-b border-hairline overflow-x-auto scrollbar-none bg-canvas sticky top-14 z-30">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                router.replace(`/history?tab=${tab.key}`);
              }}
              className={`flex-1 min-w-[90px] py-3 text-xs sm:text-sm font-bold text-center relative transition-colors ${
                isActive ? "text-primary font-black" : "text-ink-muted hover:text-ink"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3. ORDER CARDS LIST                                         */}
      {/* ============================================================ */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-parchment/60 animate-pulse border border-hairline" />
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        /* ============================================================ */
        /* EMPTY STATE (Persis Screenshot Clipboard)                   */
        /* ============================================================ */
        <div className="py-16 px-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-24 h-24 rounded-full bg-slate-100/80 border border-slate-200 flex items-center justify-center text-4xl mx-auto shadow-inner">
            📋
          </div>
          <div>
            <h3 className="font-bold text-base text-ink">Belum ada pesanan</h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Tidak ada riwayat transaksi di kategori ini. Yuk cek layanan buka IMEI atau diskon voucher promo terbaru.
            </p>
          </div>
          <Button
            onClick={() => router.push("/unblock-imei")}
            className="bg-primary hover:bg-primary-focus text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md"
          >
            Order Layanan Sekarang ➔
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filteredHistory.map((trx) => {
            const badge = getStatusBadge(trx.status);
            const icon = getServiceIcon(trx.service_type || trx.serviceType, trx.package_name || trx.packageName);
            const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, "") : "";
            const isCompleted = trx.status === "success" || trx.status === "completed";
            const isProcessing = trx.status === "processing" || trx.status === "in_progress";
            const isPending = trx.status === "pending" || trx.status === "unpaid";
            const amount = trx.amount || trx.baseAmount || trx.price || 0;

            return (
              <div
                key={trx.id}
                className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3 transition-all hover:border-primary/30"
              >
                {/* Shop / Header Bar */}
                <div className="flex items-center justify-between border-b border-hairline/70 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏬</span>
                    <span className="font-black text-xs text-ink">Ry-ITSolutions Official</span>
                  </div>
                  <span className={`text-[11px] ${badge.textColor}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Product / Service Item Row */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shrink-0">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-ink line-clamp-1">
                          {trx.package_name || trx.packageName || trx.service_type || "Aktivasi IMEI"}
                        </h4>
                        {trx.imei && (
                          <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                            IMEI: {trx.imei}
                          </p>
                        )}
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          {trx.createdAt ? new Date(trx.createdAt).toLocaleString("id-ID") : "-"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-ink block">
                          Rp {amount.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-ink-muted">x1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Note Box if exists */}
                {(trx.admin_note || trx.adminNote) && (
                  <div className="p-2.5 rounded-xl bg-parchment border border-hairline text-xs space-y-0.5">
                    <span className="font-bold text-[10px] text-primary uppercase block">Catatan Server / Hasil:</span>
                    <p className="text-ink text-[11px] leading-relaxed break-words">
                      {trx.admin_note || trx.adminNote}
                    </p>
                  </div>
                )}

                {/* Total & Action Buttons Bar */}
                <div className="pt-2 border-t border-hairline/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-ink-muted mr-1">Total Pesanan:</span>
                    <span className="text-sm font-black text-primary">
                      Rp {amount.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Belum Bayar */}
                    {isPending && (
                      <>
                        <Link
                          href="/tickets"
                          className="px-3 py-1.5 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-parchment transition-colors"
                        >
                          Hubungi CS
                        </Link>
                        <Link
                          href="/topup"
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-focus text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Bayar Sekarang
                        </Link>
                      </>
                    )}

                    {/* Sedang Diproses */}
                    {isProcessing && (
                      <>
                        {primaryImei && (
                          <Link
                            href={`/cek-garansi?imei=${primaryImei}`}
                            className="px-3 py-1.5 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-parchment transition-colors"
                          >
                            Lacak IMEI
                          </Link>
                        )}
                        <Link
                          href="/tickets"
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Chat CS Admin
                        </Link>
                      </>
                    )}

                    {/* Selesai */}
                    {isCompleted && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickShareWhatsApp(trx)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>💬</span>
                          <span>Kirim WA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceTrx(trx)}
                          className="px-3 py-1.5 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-parchment transition-colors"
                        >
                          Cetak Nota
                        </button>

                        <Link
                          href="/unblock-imei"
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-focus text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Beli Lagi
                        </Link>
                      </>
                    )}

                    {/* Dibatalkan / Gagal */}
                    {!isPending && !isProcessing && !isCompleted && (
                      <>
                        <Link
                          href="/tickets"
                          className="px-3 py-1.5 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-parchment transition-colors"
                        >
                          Tanya CS
                        </Link>
                        <Link
                          href="/unblock-imei"
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-focus text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Order Ulang
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoiceTrx}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={
          selectedInvoiceTrx
            ? {
                trxId: selectedInvoiceTrx.id,
                imei: selectedInvoiceTrx.imei,
                packageName: selectedInvoiceTrx.package_name || selectedInvoiceTrx.packageName,
                serviceType: selectedInvoiceTrx.service_type || selectedInvoiceTrx.serviceType,
                createdAt: selectedInvoiceTrx.createdAt,
                amount: selectedInvoiceTrx.amount || selectedInvoiceTrx.baseAmount,
                status: selectedInvoiceTrx.status,
                warranty: selectedInvoiceTrx.warranty || {
                  hasWarranty: !selectedInvoiceTrx.service_type?.includes("ceir"),
                  remainingDays: selectedInvoiceTrx.remainingDays,
                },
                adminNote: selectedInvoiceTrx.admin_note || selectedInvoiceTrx.adminNote,
              }
            : null
        }
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-muted">Memuat pesanan...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
