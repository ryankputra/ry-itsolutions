"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import { safeJson } from "@/lib/api";

export default function NotificationsPage() {
  const { user } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"all" | "orders" | "promo" | "rewards" | "system">("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/transactions", { credentials: "include" })
        .then((res) => safeJson(res))
        .catch(() => null),
      fetch("/api/coupons/public", { credentials: "include" })
        .then((res) => safeJson(res))
        .catch(() => null),
      fetch("/api/user/announcement", { credentials: "include" })
        .then((res) => safeJson(res))
        .catch(() => null),
    ]).then(([trxData, couponData, annData]) => {
      if (trxData?.status && Array.isArray(trxData.data)) {
        setTransactions([...trxData.data].reverse());
      }
      if (couponData?.status && Array.isArray(couponData.data)) {
        setVouchers(couponData.data);
      }
      if (annData?.status && annData?.data?.message) {
        setAnnouncement(annData.data);
      }
      setLoading(false);
    });
  }, []);

  // Build unified notification items
  const notifications: Array<{
    id: string;
    type: "orders" | "promo" | "rewards" | "system";
    title: string;
    description: string;
    time: string;
    icon: string;
    iconBg: string;
    actionText?: string;
    action?: () => void;
  }> = [];

  // 1. Order Notifications
  transactions.forEach((trx) => {
    const isSuccess = trx.status === "success" || trx.status === "completed";
    const isPending = trx.status === "pending";
    const isFailed = trx.status === "failed" || trx.status === "canceled";

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
      icon: isSuccess ? "✅" : isPending ? "⏳" : "❌",
      iconBg: isSuccess ? "bg-emerald-50 text-emerald-600" : isPending ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600",
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
      icon: "🎟️",
      iconBg: "bg-blue-50 text-primary",
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
    icon: "🪙",
    iconBg: "bg-amber-50 text-amber-600",
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
      icon: "📢",
      iconBg: "bg-indigo-50 text-indigo-600",
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
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
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
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl mx-auto">
            🔔
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
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 ${item.iconBg}`}>
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
                    <span className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5">
                      {item.actionText} ➔
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
                packageName: selectedInvoiceTrx.packageName || selectedInvoiceTrx.package_name,
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
