"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import { safeJson } from "@/lib/api";

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "orders" | "promo" | "rewards" | "system">("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [trxRes, voucherRes, configRes] = await Promise.all([
          fetch("/api/user/transactions", { credentials: "include" }),
          fetch("/api/coupons/public", { credentials: "include" }),
          fetch("/api/admin/config/public", { credentials: "include" }),
        ]);

        const [trxData, voucherData, configData] = await Promise.all([
          safeJson(trxRes),
          safeJson(voucherRes),
          safeJson(configRes),
        ]);

        if (trxData?.status && Array.isArray(trxData.data)) {
          setTransactions(trxData.data.slice(0, 10));
        }
        if (voucherData?.status && Array.isArray(voucherData.data)) {
          setVouchers(voucherData.data);
        }
        if (configData?.status && configData.data?.announcement) {
          setAnnouncement(configData.data.announcement);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Build Unified Notification Stream
  const notifications: Array<{
    id: string;
    type: "orders" | "promo" | "rewards" | "system";
    title: string;
    description: string;
    time: string;
    icon: React.ReactNode;
    iconBg: string;
    actionText?: string;
    action?: () => void;
  }> = [];

  // 1. Order Notifications
  transactions.forEach((trx) => {
    const isSuccess = trx.status === "success" || trx.status === "completed";
    const isPending = trx.status === "pending";

    notifications.push({
      id: `trx-${trx.id}`,
      type: "orders",
      title: isSuccess
        ? `Pesanan Selesai • ${trx.packageName || "Aktivasi IMEI"}`
        : isPending
        ? `Pesanan Menunggu Proses • #${trx.id.substring(0, 12)}`
        : `Pesanan Gagal / Dibatalkan`,
      description: `IMEI: ${trx.imei || "-"} | Total: Rp ${(trx.amount || trx.baseAmount || 0).toLocaleString("id-ID")}`,
      time: trx.createdAt ? new Date(trx.createdAt).toLocaleString("id-ID") : "Baru saja",
      icon: isSuccess ? (
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : isPending ? (
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: isSuccess ? "bg-emerald-50 border-emerald-200" : isPending ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200",
      actionText: "Lihat Nota",
      action: () => setSelectedInvoiceTrx(trx),
    });
  });

  // 2. Voucher & Promo Notifications
  vouchers.forEach((v) => {
    notifications.push({
      id: `voucher-${v.id}`,
      type: "promo",
      title: `Voucher Diskon Tersedia: ${v.code}`,
      description: `Dapatkan ${v.discount_type === "percent" ? `Diskon ${v.discount_value}%` : `Potongan Rp ${(v.discount_value || 0).toLocaleString("id-ID")}`} untuk order aktivasi IMEI.`,
      time: v.start_date ? new Date(v.start_date).toLocaleDateString("id-ID") : "Promo Aktif",
      icon: (
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
      iconBg: "bg-blue-50 border-blue-200",
      actionText: "Klaim Voucher",
      action: () => router.push("/vouchers"),
    });
  });

  // 3. Reward Coin Reminder
  notifications.push({
    id: "game-koin-reminder",
    type: "rewards",
    title: "Check-in Harian & Putar Roda Hoki",
    description: "Klaim koin gratis hari ini dan putar roda hoki untuk kesempatan menang hingga 2.500 Koin Ry.",
    time: "Setiap Hari",
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-amber-50 border-amber-200",
    actionText: "Klaim Koin",
    action: () => router.push("/games"),
  });

  // 4. Server Announcement
  if (announcement) {
    notifications.push({
      id: "announcement",
      type: "system",
      title: "Pengumuman Server Ry-ITSolutions",
      description: announcement.message,
      time: "Info Resmi",
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.455a20.89 20.89 0 01-1.503-3.819m3.165-.4c.594-.05 1.189-.125 1.78-.226a11.956 11.956 0 004.832-2.016m-6.612 2.642a12.02 12.02 0 01-1.78-.226m10.172-4.432A11.96 11.96 0 0013.91 5.34m0 0a11.97 11.97 0 00-3.57-1.22m3.57 1.22c.594.05 1.189.125 1.78.226m-1.78-.226c-1.19.1-2.38.25-3.57.446" />
        </svg>
      ),
      iconBg: "bg-indigo-50 border-indigo-200",
      actionText: "Cek Layanan",
      action: () => router.push("/unblock-imei"),
    });
  }

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 font-bold text-sm text-ink hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="text-base font-black">Notifikasi</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        {[
          { key: "all", label: "Semua" },
          { key: "orders", label: "Status Pesanan" },
          { key: "promo", label: "Promo & Kupon" },
          { key: "rewards", label: "Reward Koin" },
          { key: "system", label: "Info Server" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-xs"
                : "bg-canvas border border-hairline text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-parchment/60 animate-pulse border border-hairline" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card glass className="p-10 text-center space-y-3 rounded-3xl border border-hairline">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink">Belum Ada Notifikasi</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
              Semua update pesanan, promo diskon, dan reward koin Anda akan muncul di sini.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={item.action}
              className="p-3.5 sm:p-4 rounded-2xl bg-canvas border border-hairline shadow-2xs hover:border-primary/40 transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-ink group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <span className="text-[9px] text-ink-muted shrink-0">{item.time}</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {item.actionText && (
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1">
                      <span>{item.actionText}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
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
