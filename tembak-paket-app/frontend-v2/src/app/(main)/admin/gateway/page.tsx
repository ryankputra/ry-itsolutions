"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrCode, Key, Shield, RotateCw, Check, AlertTriangle, ArrowLeft, RefreshCw, MessageSquare, ExternalLink, UserCheck, Calendar } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";

interface GatewayKey {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  apiKeyPrefix: string;
  phone: string;
  username: string;
  expiresAt: string;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  amountPaid: number;
  daysRemaining: number;
  isGopayConnected: boolean;
}

export default function AdminGatewayKeysPage() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [metrics, setMetrics] = useState({
    totalKeys: 0,
    activeKeys: 0,
    expiringSoonKeys: 0,
    expiredKeys: 0,
    totalRevenue: 0,
  });

  const loadKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/gateway-keys", { credentials: "include" });
      const d = await res.json();
      if (res.ok && d.status) {
        setKeys(d.data || []);
        if (d.metrics) setMetrics(d.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleRenew = async (id: string, name: string) => {
    const { value: days } = await Swal.fire({
      title: `Perpanjang Langganan`,
      text: `Masukkan durasi perpanjangan untuk '${name}' (dalam hari):`,
      input: "number",
      inputValue: "30",
      showCancelButton: true,
      confirmButtonText: "Perpanjang",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return "Masukkan angka yang valid!";
        }
      }
    });

    if (!days) return;

    try {
      const res = await fetch(`/api/admin/gateway-keys/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: parseInt(days) }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire({ title: "Berhasil", text: d.message, icon: "success", timer: 2000, showConfirmButton: false });
        loadKeys();
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal memperpanjang.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/gateway-keys/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire({ title: "Berhasil", text: d.message, icon: "success", timer: 1500, showConfirmButton: false });
        loadKeys();
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal mengubah status.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    }
  };

  const handleRemindWa = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/gateway-keys/${id}/remind-wa`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire({ title: "Terkirim", text: `Pesan pengingat WhatsApp terkirim ke member ${name}.`, icon: "success", timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal mengirim pesan WhatsApp.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="p-2 rounded-xl bg-canvas border border-hairline hover:bg-canvas-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-ink" />
            </Link>
            <h1 className="text-xl font-bold text-ink">Manajemen Langganan API Key & Klien Gateway</h1>
          </div>
          <p className="text-xs text-ink-muted">
            Pantau klien yang menyewa API Key Gateway, status koneksi GoBiz, masa aktif langganan, dan perpanjangan manual.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadKeys} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card glass className="p-4 space-y-1 border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Total Klien Sewa</span>
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-ink">{metrics.totalKeys}</p>
          <p className="text-[11px] text-ink-muted">Total terdaftar di sistem</p>
        </Card>

        <Card glass className="p-4 space-y-1 border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Aktif Berjalan</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{metrics.activeKeys}</p>
          <p className="text-[11px] text-ink-muted">Langganan aktif normal</p>
        </Card>

        <Card glass className="p-4 space-y-1 border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Segera Berakhir (&le; 3h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{metrics.expiringSoonKeys}</p>
          <p className="text-[11px] text-ink-muted">Perlu perpanjangan</p>
        </Card>

        <Card glass className="p-4 space-y-1 border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Estimasi Pendapatan</span>
            <span className="text-xs font-bold text-primary">IDR</span>
          </div>
          <p className="text-2xl font-black text-primary">{formatRupiah(metrics.totalRevenue)}</p>
          <p className="text-[11px] text-ink-muted">Akumulasi sewa gateway</p>
        </Card>
      </div>

      {/* Main Table */}
      <Card glass className="p-5 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Daftar Klien Penyewa API Key & Status Koneksi
          </h3>
          <span className="text-xs text-ink-muted">Menampilkan {keys.length} klien</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-ink-muted">Memuat data klien gateway...</div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-xs text-ink-muted">Belum ada klien yang menyewa API Key Gateway.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-hairline text-ink-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Klien / Member</th>
                  <th className="py-3 px-3">Label Gateway</th>
                  <th className="py-3 px-3">API Key Prefix</th>
                  <th className="py-3 px-3">Status GoBiz</th>
                  <th className="py-3 px-3">Masa Aktif</th>
                  <th className="py-3 px-3 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-canvas-muted/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-ink">
                      <div>{k.username || "User"}</div>
                      <div className="text-[11px] text-ink-muted">{k.phone || "-"}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-ink">{k.name}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-primary">{k.apiKeyPrefix}...</td>
                    <td className="py-3 px-3">
                      {k.isGopayConnected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Connected (GoBiz)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                          Belum Connect
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-ink">
                        {new Date(k.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <div className={`text-[10px] font-bold ${k.isExpired ? "text-rose-500" : k.daysRemaining <= 3 ? "text-amber-500" : "text-emerald-500"}`}>
                        {k.isExpired ? "Sudah Berakhir" : `${k.daysRemaining} hari lagi`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => handleRenew(k.id, k.name)} className="h-7 px-2.5 text-[11px] gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-primary" />
                        Perpanjang
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggle(k.id)} className={`h-7 px-2.5 text-[11px] font-semibold ${k.status === "active" ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"}`}>
                        {k.status === "active" ? "Suspend" : "Aktifkan"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRemindWa(k.id, k.name)} className="h-7 px-2.5 text-[11px] gap-1 font-semibold text-emerald-600 border-emerald-200">
                        <MessageSquare className="w-3 h-3" />
                        Ingatkan WA
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
