"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL, safeJson } from "@/lib/api";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { Button } from "@/components/ui/Button";
import WriteReviewModal from "@/components/ui/WriteReviewModal";
import { InstantQrisPaymentModal } from "@/components/ui/InstantQrisPaymentModal";
import { useApp } from "@/lib/store";

function HistoryContent() {
  const { updateBalance } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const resolveTabKey = (t: string | null) => {
    if (!t) return "all";
    const low = t.toLowerCase();
    if (low === "refund" || low === "cancelled" || low === "failed") return "canceled";
    if (low === "in_queue" || low === "antrean") return "waiting";
    return low;
  };

  const initialTab = resolveTabKey(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [resumeQrisModal, setResumeQrisModal] = useState<{
    isOpen: boolean;
    amount: number;
    orderTitle: string;
    existingQrisData: any;
  } | null>(null);

  // Sync tab with search params when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(resolveTabKey(tabFromUrl));
    }
  }, [searchParams]);

  // Auto scroll active tab into view
  useEffect(() => {
    const activeEl = document.getElementById(`history-tab-${activeTab}`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/user/transactions", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setHistory(data.data);
      } else if (data?.status && Array.isArray(data.transactions)) {
        setHistory(data.transactions);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const handleUpdate = () => {
      fetchHistory();
    };

    window.addEventListener("transaction_status_update", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    // Smart auto-polling: Poll every 4 seconds to guarantee instantaneous updates without refresh
    const interval = setInterval(() => {
      fetchHistory();
    }, 4000);

    return () => {
      window.removeEventListener("transaction_status_update", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleCancelTransaction = async (trx: any) => {
    const confirm = await Swal.fire({
      title: "Batalkan Transaksi?",
      text: `Apakah Anda yakin ingin membatalkan transaksi ${trx.package_name || trx.packageName || trx.id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const isTopup = String(trx.id || '').startsWith("TU-");
      const url = isTopup ? "/api/topup/cancel" : `/api/user/transactions/${trx.id}/cancel`;
      const body = isTopup ? JSON.stringify({ topup_id: trx.id }) : undefined;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (res.ok && data.status) {
        if (typeof data.newBalance === "number") {
          updateBalance(data.newBalance);
        }
        Swal.fire({
          title: "Dibatalkan!",
          text: data.message || "Transaksi telah dibatalkan dan dipindahkan ke tab Refund.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setHistory((prev) =>
          prev.map((t) => (t.id === trx.id ? { ...t, status: "cancelled" } : t))
        );
        setActiveTab("canceled");
        router.replace("/history?tab=canceled");
      } else {
        Swal.fire({ title: "Gagal", text: data?.message || "Gagal membatalkan transaksi.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    }
  };

  const handlePayNow = (trx: any) => {
    const isPaidWithBalance = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';
    if (isPaidWithBalance) {
      Swal.fire({
        title: "Pesanan Sudah Terbayar",
        text: "Pesanan ini sudah dibayar menggunakan Saldo Ry dan saat ini sedang diproses oleh admin/server.",
        icon: "info",
      });
      return;
    }

    const amt = trx.amount || trx.baseAmount || trx.price || 0;
    const existingData = (trx.qrisBase64Image || trx.qris_image)
      ? {
          qris_image: trx.qrisBase64Image || trx.qris_image,
          qris_code: trx.qrisBase64Image || trx.qris_image,
          unique_amount: trx.uniqueAmount || trx.unique_amount || amt,
          topup_id: trx.id,
          createdAt: trx.createdAt || trx.created_at,
          expiresAt: trx.expiresAt || trx.expired_at,
          merchant: trx.merchant,
        }
      : null;

    setResumeQrisModal({
      isOpen: true,
      amount: amt,
      orderTitle: `Bayar ${trx.package_name || trx.packageName || "Pesanan QRIS"}`,
      existingQrisData: existingData,
    });
  };

  const handleQuickShareWhatsApp = async (trx: any) => {
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota via WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (misal: 08123456789):",
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

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith("62")) cleanPhone = "62" + cleanPhone;

    const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, "") : "";
    const verifyUrl = `${window.location.origin}/cek-garansi?imei=${primaryImei}`;

    const text =
      `Halo Kak, berikut bukti transaksi dari *Ry-ITSolutions*:\n\n` +
      `*ID Transaksi:* #${trx.id.substring(0, 14)}\n` +
      `*IMEI:* ${trx.imei || "-"}\n` +
      `*Layanan:* ${trx.package_name || trx.service_type || "Aktivasi IMEI"}\n` +
      `*Status:* ${trx.status.toUpperCase()}\n` +
      `*Tanggal:* ${new Date(trx.createdAt).toLocaleDateString("id-ID")}\n\n` +
      `*Cek Nota & Garansi Digital:* \n${verifyUrl}\n\n` +
      `Terima kasih atas kepercayaannya!`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const tabs = [
    { key: "all", label: "Semua" },
    { key: "unpaid", label: "Belum Bayar" },
    { key: "waiting", label: "Menunggu" },
    { key: "processing", label: "Diproses" },
    { key: "completed", label: "Selesai" },
    { key: "canceled", label: "Refund" },
  ];

  const normalizedHistory = history.map((trx) => {
    const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';
    // Only treat as waiting admin if explicitly unpaid/pending with balance or in_queue
    const isWaitingAdmin = (
      trx.status === 'in_queue' ||
      trx.status === 'waiting' ||
      trx.status === 'waiting_admin' ||
      (isBalancePaid && (trx.status === 'pending' || trx.status === 'unpaid'))
    );
    if (isWaitingAdmin && trx.status !== 'processing' && trx.status !== 'success' && trx.status !== 'failed') {
      return { ...trx, status: 'in_queue' };
    }
    return trx;
  });

  const filteredHistory = normalizedHistory.filter((trx) => {
    if (activeTab === "all") return true;

    const status = (trx.status || "").toLowerCase();
    const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';
    const rawNote = (trx.admin_note || trx.adminNote || "").toLowerCase();

    if (activeTab === "unpaid") {
      return (status === "pending" || status === "unpaid") && !isBalancePaid;
    }
    if (activeTab === "waiting") {
      return status === "in_queue" || status === "waiting" || status === "waiting_admin";
    }
    if (activeTab === "processing") {
      return status === "processing" || status === "in_progress";
    }
    if (activeTab === "completed") {
      return status === "success" || status === "completed";
    }
    if (activeTab === "canceled") {
      return (
        status === "failed" ||
        status === "canceled" ||
        status === "cancelled" ||
        status === "rejected" ||
        status === "refunded"
      );
    }
    return false;
  });

  const getStatusBadge = (status: string, serviceType?: string, packageName?: string) => {
    const s = status?.toLowerCase() || "";
    const isTopUp = serviceType === "topup" || serviceType === "topup_qris" || (packageName || "").toLowerCase().includes("top up") || (packageName || "").toLowerCase().includes("topup");

    if (s === "success" || s === "completed") {
      return {
        label: isTopUp ? "Selesai (Saldo Masuk)" : "Selesai (Garansi Aktif)",
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
    if (s === "in_queue" || s === "waiting" || s === "waiting_admin") {
      return {
        label: "Menunggu Konfirmasi Admin",
        textColor: "text-amber-600 font-bold",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    if (s === "pending" || s === "unpaid") {
      return {
        label: "Belum Bayar",
        textColor: "text-orange-600 font-bold",
        badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
      };
    }
    return {
      label: "Dibatalkan / Pengembalian Dana",
      textColor: "text-rose-600 font-bold",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    };
  };

  const renderServiceSvg = (serviceType: string, packageName: string) => {
    const text = `${serviceType} ${packageName}`.toLowerCase();
    if (text.includes("ceir") || text.includes("cek")) {
      return (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      );
    }
    if (text.includes("topup") || text.includes("saldo")) {
      return (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
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

        <div className="w-6" />
      </div>

      {/* ============================================================ */}
      {/* 2. SHOPEE-STYLE TAB STRIP WITH DYNAMIC BADGE COUNTERS         */}
      {/* ============================================================ */}
      {(() => {
        const tabCounts: Record<string, number> = {
          all: 0,
          unpaid: 0,
          waiting: 0,
          processing: 0,
        };

        normalizedHistory.forEach((trx) => {
          const status = (trx.status || "").toLowerCase();
          const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';

          if ((status === "pending" || status === "unpaid") && !isBalancePaid) {
            tabCounts.unpaid += 1;
            tabCounts.all += 1;
          } else if (status === "in_queue" || status === "waiting" || status === "waiting_admin") {
            tabCounts.waiting += 1;
            tabCounts.all += 1;
          } else if (status === "processing" || status === "in_progress") {
            tabCounts.processing += 1;
            tabCounts.all += 1;
          }
        });

        return (
          <div className="flex border-b border-hairline overflow-x-auto scrollbar-none bg-canvas sticky top-14 z-30">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tabCounts[tab.key] || 0;
              const showBadge = (tab.key === "all" || tab.key === "unpaid" || tab.key === "waiting" || tab.key === "processing") && count > 0;

              return (
                <button
                  key={tab.key}
                  id={`history-tab-${tab.key}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    router.replace(`/history?tab=${tab.key}`);
                  }}
                  className={`flex-1 min-w-[72px] sm:min-w-[90px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-center relative transition-colors flex flex-col items-center justify-center ${
                    isActive ? "text-primary font-black" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <div className="relative inline-flex items-center gap-1">
                    <span>{tab.label}</span>
                    {showBadge && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full leading-tight transition-transform ${
                        isActive 
                          ? "bg-primary text-white shadow-xs" 
                          : tab.key === "unpaid"
                          ? "bg-rose-500 text-white"
                          : tab.key === "waiting"
                          ? "bg-amber-500 text-white"
                          : tab.key === "processing"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-white"
                      }`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

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
        /* EMPTY STATE                                                  */
        /* ============================================================ */
        <div className="py-16 px-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-slate-100/80 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto shadow-inner">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-base text-ink">Belum ada pesanan</h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Tidak ada riwayat transaksi di kategori ini. Yuk cek layanan buka IMEI atau diskon voucher promo terbaru.
            </p>
          </div>
          <Button
            onClick={() => router.push("/unblock-imei")}
            className="bg-primary hover:bg-primary-focus text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 mx-auto"
          >
            <span>Order Layanan Sekarang</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filteredHistory.map((trx) => {
            const isPaidByBalance = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';
            const rawNote = (trx.admin_note || trx.adminNote || "").toLowerCase();
            const isWaiting = (
              trx.status === "in_queue" ||
              trx.status === "waiting" ||
              trx.status === "waiting_admin" ||
              (isPaidByBalance && (trx.status === "pending" || trx.status === "unpaid")) ||
              (isPaidByBalance && trx.status === "processing" && rawNote.includes("menunggu"))
            );
            const effectiveStatus = isWaiting ? "in_queue" : (trx.status || "");
            const badge = getStatusBadge(effectiveStatus, trx.serviceType || trx.service_type, trx.packageName);
            const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, "") : "";
            const isCompleted = effectiveStatus === "success" || effectiveStatus === "completed";
            const isProcessing = (effectiveStatus === "processing" || effectiveStatus === "in_progress") && !isWaiting;
            const isPending = (effectiveStatus === "pending" || effectiveStatus === "unpaid") && !isPaidByBalance;
            const amount = trx.amount || trx.baseAmount || trx.price || 0;

            return (
              <div
                key={trx.id}
                className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3 transition-all hover:border-primary/30"
              >
                {/* Shop / Header Bar */}
                <div className="flex items-center justify-between border-b border-hairline/70 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009 9.35c.694 0 1.343-.238 1.86-.639.517.401 1.166.639 1.86.639.694 0 1.343-.238 1.86-.639.517.401 1.166.639 1.86.639.694 0 1.343-.238 1.86-.639a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .414.336.75.75.75z" />
                    </svg>
                    <span className="font-black text-xs text-ink">Ry-ITSolutions Official</span>
                  </div>
                  <span className={`text-[11px] ${badge.textColor}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Product / Service Item Row */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {renderServiceSvg(trx.service_type || trx.serviceType, trx.package_name || trx.packageName)}
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
                        {/* Duration cleanup: Automated vs Manual IMEI */}
                        {(trx.service_type === 'ceir' || trx.service_type === 'barcode' || trx.packageId?.startsWith('cek_') || trx.packageId?.startsWith('create_')) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Proses Instant (Otomatis System)
                          </span>
                        ) : trx.speed_option && trx.speed_option !== 'instant' ? (
                          <p className="text-[10px] text-ink-muted mt-1">
                            Opsi Kecepatan: <strong className="text-ink font-bold">
                              {trx.speed_label || (
                                trx.speed_option === 'fast' ? 'Fast (1-3 Jam)' :
                                trx.speed_option === 'semi' ? 'Semi Fast (1-12 Jam)' :
                                'Slow (Max kirim jam 14:00, selesai max jam 00:00 WIB)'
                              )}
                            </strong>
                          </p>
                        ) : null}
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          {trx.createdAt ? new Date(trx.createdAt).toLocaleString("id-ID") : "-"}
                        </p>

                        {/* Image attachments indicator */}
                        {(trx.user_image || trx.user_image_ceir || trx.admin_image) ? (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-ink-muted font-bold">Lampiran:</span>
                            {trx.user_image && (
                              <a
                                href={trx.user_image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 transition-colors"
                              >
                                <span>📷 Foto IMEI</span>
                              </a>
                            )}
                            {trx.user_image_ceir && (
                              <a
                                href={trx.user_image_ceir}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200 transition-colors"
                              >
                                <span>🔍 Cek CEIR</span>
                              </a>
                            )}
                            {trx.admin_image && (
                              <a
                                href={trx.admin_image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                              >
                                <span>✅ Bukti Admin</span>
                              </a>
                            )}
                          </div>
                        ) : null}
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

                {/* Safe User Note Box (Zero Technical Error Leakage) */}
                {(() => {
                  const rawNote = (trx.admin_note || trx.adminNote || "").trim();
                  if (!rawNote) return null;
                  const isLeakedOrGeneric = /sedang dikerjakan oleh admin|sedang diproses oleh admin|ceirgo|balance|upps|provider|api|sqlite|exception|auto-submit|antrean manual/i.test(rawNote);
                  if (isLeakedOrGeneric) return null;
                  return (
                    <div className="p-2.5 rounded-xl bg-parchment border border-hairline text-xs space-y-0.5">
                      <span className="font-bold text-[10px] text-primary uppercase block">Catatan Pesanan:</span>
                      <p className="text-ink text-[11px] leading-relaxed break-words">
                        {rawNote}
                      </p>
                    </div>
                  );
                })()}

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
                        <button
                          type="button"
                          onClick={() => handleCancelTransaction(trx)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          Batalkan
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePayNow(trx)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-focus text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Bayar Sekarang
                        </button>
                      </>
                    )}

                    {/* Menunggu Konfirmasi (Dalam Antrean) */}
                    {isWaiting && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCancelTransaction(trx)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                          title="Batalkan dan kembalikan dana ke saldo akun"
                        >
                          Batalkan & Refund
                        </button>
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
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Chat CS Admin
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
                          onClick={() => setReviewTarget(trx)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <span>⭐ Beri Ulasan (+500 Koin)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickShareWhatsApp(trx)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
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

                    {/* Dibatalkan / Gagal / Pengembalian Dana */}
                    {!isPending && !isWaiting && !isProcessing && !isCompleted && (
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

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        orderId={reviewTarget?.id}
        productId={reviewTarget?.service_type || reviewTarget?.serviceType || "unblock-imei"}
        variation={reviewTarget?.package_name || reviewTarget?.packageName || "Layanan Official"}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoiceTrx}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={
          selectedInvoiceTrx
            ? {
                trxId: selectedInvoiceTrx.id || selectedInvoiceTrx.trxId || "-",
                imei: selectedInvoiceTrx.imei || selectedInvoiceTrx.imeiNumber || "-",
                packageName: selectedInvoiceTrx.package_name || selectedInvoiceTrx.packageName || "Layanan Ry-ITSolutions",
                serviceType: selectedInvoiceTrx.service_type || selectedInvoiceTrx.serviceType,
                createdAt: selectedInvoiceTrx.createdAt || new Date().toISOString(),
                amount: selectedInvoiceTrx.amount || selectedInvoiceTrx.totalAmount,
                status: selectedInvoiceTrx.status || "completed",
                warranty: selectedInvoiceTrx.warranty || {
                  hasWarranty: !selectedInvoiceTrx.service_type?.includes("ceir"),
                  remainingDays: selectedInvoiceTrx.remainingDays,
                },
                adminNote: selectedInvoiceTrx.admin_note || selectedInvoiceTrx.adminNote,
              }
            : null
        }
      />

      {resumeQrisModal?.isOpen && (
        <InstantQrisPaymentModal
          isOpen={resumeQrisModal.isOpen}
          onClose={() => setResumeQrisModal(null)}
          amount={resumeQrisModal.amount}
          orderTitle={resumeQrisModal.orderTitle}
          existingQrisData={resumeQrisModal.existingQrisData}
          onSuccess={() => {
            setResumeQrisModal(null);
            fetchHistory();
            Swal.fire({
              title: "Pembayaran Berhasil! 🎉",
              text: "Pembayaran QRIS Anda telah terverifikasi oleh sistem.",
              icon: "success",
              timer: 2500,
              showConfirmButton: false
            });
          }}
        />
      )}
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
