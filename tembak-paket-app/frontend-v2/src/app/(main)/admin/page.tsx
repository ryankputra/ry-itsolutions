"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { safeJson } from "@/lib/api";
import {
  LayoutDashboard,
  Clock,
  Headphones,
  Users,
  Smartphone,
  Package,
  QrCode,
  Ticket,
  Megaphone,
  Share2,
  Palette,
  Settings,
  MessageSquare,
  Activity,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Server,
  Zap,
  Coins,
  Wallet,
} from "lucide-react";

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Backward compatibility: redirect ?tab=xxx to dedicated routes
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (!tab) return;
    const tabRoutes: Record<string, string> = {
      "pesanan-manual": "/admin/orders",
      "layanan-imei": "/admin/imei",
      paket: "/admin/packages",
      pengguna: "/admin/users",
      "tiket-bantuan": "/admin/tickets",
      "broadcast-promo": "/admin/broadcast",
      "kupon-promo": "/admin/vouchers",
      referral: "/admin/referral",
      "ulasan-dummy": "/admin/reviews",
      "tema-momentum": "/admin/theme",
      pengaturan: "/admin/settings",
      "gateway-saas": "/admin/gateway",
      "log-aktivitas": "/admin/logs",
    };
    if (tabRoutes[tab]) {
      router.replace(tabRoutes[tab]);
    }
  }, [searchParams, router]);

  // Executive Metrics
  const [metrics, setMetrics] = useState<{
    pendingOrders: number;
    processingOrders: number;
    openTickets: number;
    totalUsers: number;
    activeCoupons: number;
    activeGatewayKeys: number;
  }>({
    pendingOrders: 0,
    processingOrders: 0,
    openTickets: 0,
    totalUsers: 0,
    activeCoupons: 0,
    activeGatewayKeys: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const loadDashboardData = async () => {
    setLoadingMetrics(true);
    try {
      const [ordersRes, ticketsRes, usersRes, couponsRes, gatewayRes] = await Promise.all([
        fetch("/api/admin/manual-orders", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/tickets", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/users", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/coupons", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/gateway-keys", { credentials: "include" }).catch(() => null),
      ]);

      let pendingOrders = 0;
      let processingOrders = 0;
      if (ordersRes?.ok) {
        const d = await ordersRes.json();
        if (Array.isArray(d?.data)) {
          pendingOrders = d.data.filter((o: any) => o.status === "pending" || o.status === "in_queue").length;
          processingOrders = d.data.filter((o: any) => o.status === "processing").length;
        }
      }

      let openTickets = 0;
      if (ticketsRes?.ok) {
        const d = await ticketsRes.json();
        if (Array.isArray(d?.data)) {
          openTickets = d.data.filter((t: any) => t.status === "open" || t.status === "replied").length;
        }
      }

      let totalUsers = 0;
      if (usersRes?.ok) {
        const d = await usersRes.json();
        if (Array.isArray(d?.data)) {
          totalUsers = d.data.length;
        }
      }

      let activeCoupons = 0;
      if (couponsRes?.ok) {
        const d = await couponsRes.json();
        if (Array.isArray(d?.data)) {
          activeCoupons = d.data.filter((c: any) => c.is_active === 1).length;
        }
      }

      let activeGatewayKeys = 0;
      if (gatewayRes?.ok) {
        const d = await gatewayRes.json();
        if (Array.isArray(d?.data)) {
          activeGatewayKeys = d.data.filter((k: any) => k.status === "active" || k.isActive).length;
        }
      }

      setMetrics({
        pendingOrders,
        processingOrders,
        openTickets,
        totalUsers,
        activeCoupons,
        activeGatewayKeys,
      });
    } catch (e) {
      // ignore
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Menu Feature Sections
  const adminFeatureCards = [
    {
      href: "/admin/orders",
      title: "Antrean Pesanan",
      desc: "Kelola pengerjaan pesanan manual, verifikasi IMEI, nota transaksi, & Serial Number.",
      badge: metrics.pendingOrders > 0 ? `${metrics.pendingOrders} Antrean` : "Semua Beres",
      badgeColor: metrics.pendingOrders > 0 ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: Clock,
      iconColor: "text-amber-500 bg-amber-500/10",
    },
    {
      href: "/admin/imei",
      title: "Layanan IMEI & CEIR",
      desc: "Status buka/tutup layanan, tarif 3 kecepatan proses, durasi garansi, & koneksi CEIR.",
      badge: "Layanan Inti",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
      icon: Smartphone,
      iconColor: "text-primary bg-primary/10",
    },
    {
      href: "/admin/users",
      title: "Kelola Pengguna",
      desc: "Manajemen data member, hak akses admin, penyesuaian saldo & koin, serta audit log.",
      badge: `${metrics.totalUsers} Pengguna`,
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: Users,
      iconColor: "text-blue-500 bg-blue-500/10",
    },
    {
      href: "/admin/packages",
      title: "Paket Kuota",
      desc: "Sinkronisasi paket dari server pusat KMSP dan konfigurasi fee keuntungan platform.",
      badge: "KMSP Store",
      badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      icon: Package,
      iconColor: "text-indigo-500 bg-indigo-500/10",
    },
    {
      href: "/admin/gateway",
      title: "Gateway GoPay & QRIS",
      desc: "Monitoring seluruh lisensi API Key merchant, status GoBiz, dan pengingat WhatsApp.",
      badge: `${metrics.activeGatewayKeys} Lisensi Aktif`,
      badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/20",
      icon: QrCode,
      iconColor: "text-sky-500 bg-sky-500/10",
    },
    {
      href: "/admin/tickets",
      title: "Pusat Bantuan CS",
      desc: "Dukungan pelanggan langsung, tanya kendala pesanan, thread percakapan tiket CS.",
      badge: metrics.openTickets > 0 ? `${metrics.openTickets} Terbuka` : "0 Kendala",
      badgeColor: metrics.openTickets > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: Headphones,
      iconColor: "text-emerald-500 bg-emerald-500/10",
    },
    {
      href: "/admin/vouchers",
      title: "Kupon Diskon",
      desc: "Buat kode voucher promosi, batas klaim pelanggan, potongan harga, dan broadcast voucher.",
      badge: `${metrics.activeCoupons} Kupon Aktif`,
      badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
      icon: Ticket,
      iconColor: "text-violet-500 bg-violet-500/10",
    },
    {
      href: "/admin/broadcast",
      title: "Broadcast Promo",
      desc: "Sebar pesan promosi massal ke WhatsApp pelanggan, Telegram bot, push HP, & banner web.",
      badge: "Multi-Kanal",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
      icon: Megaphone,
      iconColor: "text-rose-500 bg-rose-500/10",
    },
    {
      href: "/admin/referral",
      title: "Program Referral",
      desc: "Pengaturan komisi saldo referal, diskon pendaftar baru, dan sistem affiliate member.",
      badge: "Komisi Saldo",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: Share2,
      iconColor: "text-emerald-500 bg-emerald-500/10",
    },
    {
      href: "/admin/theme",
      title: "Tema & Momentum",
      desc: "Kustomisasi tema momentum musiman kalender Indonesia (Ramadhan, Idul Fitri, dsb).",
      badge: "Visual & Desain",
      badgeColor: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
      icon: Palette,
      iconColor: "text-fuchsia-500 bg-fuchsia-500/10",
    },
    {
      href: "/admin/logs",
      title: "Log Aktivitas",
      desc: "Audit trail pencatatan aktivitas seluruh pengguna sistem, login, deposit, dan transaksi.",
      badge: "Audit Trail",
      badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20",
      icon: Activity,
      iconColor: "text-slate-500 bg-slate-500/10",
    },
    {
      href: "/admin/settings",
      title: "Pengaturan & Server",
      desc: "Pairing bot WhatsApp Baileys, konfigurasi gateway deposit, backup DB, dan auto deploy.",
      badge: "Konfigurasi Inti",
      badgeColor: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
      icon: Settings,
      iconColor: "text-zinc-500 bg-zinc-500/10",
    },
    {
      href: "/admin/reviews",
      title: "Ulasan Pelanggan",
      desc: "Manajemen ulasan testimoni pembeli, generator screenshot sinyal, dan ulasan sistem.",
      badge: "Testimoni",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: MessageSquare,
      iconColor: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/orders" className="block group">
          <Card glass className="p-4 space-y-1 border-hairline group-hover:border-primary/50 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Antrean Pesanan</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-ink">{metrics.pendingOrders}</p>
            <p className="text-[11px] text-ink-muted">
              {metrics.processingOrders > 0 ? `${metrics.processingOrders} sedang diproses` : "Menunggu pengerjaan"}
            </p>
          </Card>
        </Link>

        <Link href="/admin/tickets" className="block group">
          <Card glass className="p-4 space-y-1 border-hairline group-hover:border-primary/50 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tiket Bantuan CS</span>
              <Headphones className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-ink">{metrics.openTickets}</p>
            <p className="text-[11px] text-ink-muted">Tiket kendala terbuka</p>
          </Card>
        </Link>

        <Link href="/admin/users" className="block group">
          <Card glass className="p-4 space-y-1 border-hairline group-hover:border-primary/50 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Pengguna</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-ink">{metrics.totalUsers}</p>
            <p className="text-[11px] text-ink-muted">Akun member terdaftar</p>
          </Card>
        </Link>

        <Link href="/admin/gateway" className="block group">
          <Card glass className="p-4 space-y-1 border-hairline group-hover:border-primary/50 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Lisensi Gateway</span>
              <QrCode className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black text-primary">{metrics.activeGatewayKeys}</p>
            <p className="text-[11px] text-ink-muted">API Key aktif digunakan</p>
          </Card>
        </Link>
      </div>

      {/* Main Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            Pusat Kendali Administrator
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Pilih modul pengaturan untuk mengelola seluruh aspek operasional aplikasi. Navigasi dan header di atas tetap tersedia di setiap halaman.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadDashboardData} className="gap-1.5 text-xs">
          <RotateCw className={`w-3.5 h-3.5 ${loadingMetrics ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* Feature Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminFeatureCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="block group">
              <Card
                glass
                className="p-5 h-full border-hairline group-hover:border-primary/50 group-hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-ink group-hover:text-primary transition-colors flex items-center gap-1">
                      {card.title}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-hairline flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Modul</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-ink-muted">
          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Memuat pusat kendali administrator...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
