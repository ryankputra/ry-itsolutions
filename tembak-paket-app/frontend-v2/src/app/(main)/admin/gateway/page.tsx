"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { QrCode, RotateCw, Key, ShieldCheck, AlertCircle, Clock, Send, Plus, Check, Copy, Search } from "lucide-react";

export default function AdminGatewayPage() {
  const [adminGatewayKeys, setAdminGatewayKeys] = useState<any[]>([]);
  const [loadingGatewayKeys, setLoadingGatewayKeys] = useState(false);
  const [gatewayKeyFilter, setGatewayKeyFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [gatewayKeySearch, setGatewayKeySearch] = useState("");
  const [revealedAdminKeys, setRevealedAdminKeys] = useState<Record<string, boolean>>({});
  const [actionLoadingKeyId, setActionLoadingKeyId] = useState<string | null>(null);

  const loadGatewayKeys = async () => {
    setLoadingGatewayKeys(true);
    try {
      const res = await fetch("/api/admin/gateway-keys", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && Array.isArray(d.data)) {
        setAdminGatewayKeys(d.data);
      } else {
        setAdminGatewayKeys([]);
      }
    } catch (e) {
      setAdminGatewayKeys([]);
    } finally {
      setLoadingGatewayKeys(false);
    }
  };

  useEffect(() => {
    loadGatewayKeys();
  }, []);

  const handleRenewGatewayKey = async (keyItem: any) => {
    const { value: days } = await Swal.fire({
      title: "Perpanjang Masa Aktif",
      html: `
        <div class="text-xs text-left space-y-2">
          <p>Perpanjang lisensi API Key <b>${keyItem.name || "Merchant"}</b> milik <b>@${keyItem.username}</b>.</p>
          <p class="text-ink-muted">Masa aktif saat ini: ${keyItem.expiresAt ? new Date(keyItem.expiresAt).toLocaleDateString("id-ID") : "-"}</p>
        </div>
      `,
      input: "number",
      inputLabel: "Jumlah Hari Tambahan",
      inputValue: 30,
      showCancelButton: true,
      confirmButtonText: "Perpanjang Sekarang",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return "Masukkan jumlah hari yang valid (minimal 1 hari)";
        }
      },
    });

    if (!days) return;

    setActionLoadingKeyId(keyItem.id);
    try {
      const res = await fetch(`/api/admin/gateway-keys/${keyItem.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: parseInt(days) }),
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({ title: "Berhasil", text: d.message || "Masa aktif berhasil diperpanjang.", timer: 1500, showConfirmButton: false });
        loadGatewayKeys();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal memperpanjang masa aktif." });
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan sistem." });
    } finally {
      setActionLoadingKeyId(null);
    }
  };

  const handleToggleGatewayKey = async (keyItem: any) => {
    const confirm = await Swal.fire({
      title: keyItem.isActive ? "Nonaktifkan API Key?" : "Aktifkan API Key?",
      text: `Apakah Anda yakin ingin ${keyItem.isActive ? "menonaktifkan" : "mengaktifkan kembali"} API Key ini?`,
      showCancelButton: true,
      confirmButtonText: keyItem.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setActionLoadingKeyId(keyItem.id);
    try {
      const res = await fetch(`/api/admin/gateway-keys/${keyItem.id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({ title: "Berhasil", text: d.message || "Status key berhasil diubah.", timer: 1200, showConfirmButton: false });
        loadGatewayKeys();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal mengubah status key." });
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan sistem." });
    } finally {
      setActionLoadingKeyId(null);
    }
  };

  const handleSendWaReminder = async (keyItem: any) => {
    const phone = keyItem.phone || keyItem.verifiedPhone;
    if (!phone) {
      return Swal.fire({ title: "Perhatian", text: "Pengguna ini belum mendaftarkan nomor WhatsApp." });
    }

    const confirm = await Swal.fire({
      title: "Kirim Pengingat WhatsApp",
      html: `
        <div class="text-xs text-left space-y-1">
          <p>Kirim pesan pengingat masa aktif ke WhatsApp pelanggan <b>${phone}</b> (@${keyItem.username})?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Kirim Pesan WA",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setActionLoadingKeyId(keyItem.id);
    try {
      const res = await fetch(`/api/admin/gateway-keys/${keyItem.id}/remind-wa`, {
        method: "POST",
        credentials: "include",
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({ title: "Terkirim", text: d.message || "Pesan pengingat WhatsApp berhasil dikirim.", timer: 1500, showConfirmButton: false });
        loadGatewayKeys();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal mengirim pesan WhatsApp." });
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setActionLoadingKeyId(null);
    }
  };

  const now = Date.now();
  const totalKeys = adminGatewayKeys.length;
  const activeKeys = adminGatewayKeys.filter(
    (k) => (k.status === "active" || k.isActive) && (!k.expiresAt || new Date(k.expiresAt).getTime() > now)
  ).length;
  const expiringSoonKeys = adminGatewayKeys.filter((k) => {
    if (!k.expiresAt) return false;
    const isAct = k.status === "active" || k.isActive;
    if (!isAct) return false;
    const diff = Math.ceil((new Date(k.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 3;
  }).length;
  const expiredKeys = adminGatewayKeys.filter(
    (k) => k.status === "expired" || (k.expiresAt && new Date(k.expiresAt).getTime() <= now)
  ).length;
  const totalRevenue = adminGatewayKeys.reduce(
    (acc, k) => acc + (Number(k.amountPaid) || Number(k.pricePerMonth) || 10000),
    0
  );

  const filtered = adminGatewayKeys.filter((k) => {
    const q = gatewayKeySearch.toLowerCase();
    const matchesSearch =
      (k.username && k.username.toLowerCase().includes(q)) ||
      (k.name && k.name.toLowerCase().includes(q)) ||
      (k.phone && k.phone.includes(q)) ||
      (k.gopayPhone && k.gopayPhone.includes(q));

    const expiryDate = k.expiresAt ? new Date(k.expiresAt) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
    const isAct = (k.status === "active" || k.isActive) && (daysLeft === null || daysLeft > 0);
    const isExpiring = isAct && daysLeft !== null && daysLeft <= 3;
    const isExp = daysLeft !== null && daysLeft <= 0;

    if (gatewayKeyFilter === "active") return isAct;
    if (gatewayKeyFilter === "expiring") return isExpiring;
    if (gatewayKeyFilter === "expired") return isExp;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-canvas border border-hairline shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 rounded-full border border-blue-500/20">
              FinTech Monitor
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
              Unofficial GoPay QRIS
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Manajemen Langganan Payment Gateway
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Pantau seluruh lisensi API Key merchant, status koneksi GoBiz, masa aktif kuota, serta pengingat WhatsApp.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={loadGatewayKeys} className="text-xs gap-1.5 self-start md:self-auto">
          <RotateCw className={`w-3.5 h-3.5 ${loadingGatewayKeys ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">Total Lisensi</span>
          <p className="text-2xl font-black text-ink mt-1">{totalKeys}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Semua API Key merchant</p>
        </div>

        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">Aktif Digunakan</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeKeys}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Status aktif & masa valid</p>
        </div>

        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">Segera Kedaluwarsa</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{expiringSoonKeys}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">{expiredKeys} lisensi sudah expired</p>
        </div>

        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">Estimasi Omset</span>
          <p className="text-2xl font-black text-primary mt-1">Rp {totalRevenue.toLocaleString("id-ID")}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Dari biaya langganan API</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card glass className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Semua Lisensi" },
              { id: "active", label: "Aktif" },
              { id: "expiring", label: "Segera Habis (<=3 Hari)" },
              { id: "expired", label: "Kedaluwarsa" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGatewayKeyFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                  gatewayKeyFilter === tab.id
                    ? "bg-primary text-white border-primary"
                    : "bg-canvas text-ink-muted border-hairline hover:border-primary/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Cari merchant, username, HP..."
              value={gatewayKeySearch}
              onChange={(e) => setGatewayKeySearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-hairline bg-canvas focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-parchment/40 text-[11px] font-bold text-ink-muted">
                <th className="p-3.5">Pelanggan</th>
                <th className="p-3.5">Nama & API Key</th>
                <th className="p-3.5">Status GoBiz</th>
                <th className="p-3.5">Masa Aktif</th>
                <th className="p-3.5">Saklar Status</th>
                <th className="p-3.5 text-right">Aksi Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loadingGatewayKeys ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-ink-muted">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Memuat data lisensi merchant...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-ink-muted">
                    Tidak ada lisensi gateway yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((k) => {
                  const isRevealed = revealedAdminKeys[k.id] || false;
                  const displayKey = isRevealed ? k.apiKey : k.apiKeyPrefix ? `${k.apiKeyPrefix}••••••••` : "••••••••••••••••";
                  const phone = k.phone || k.verifiedPhone;
                  const expiryDate = k.expiresAt ? new Date(k.expiresAt) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
                  const isActionLoading = actionLoadingKeyId === k.id;

                  return (
                    <tr key={k.id} className="hover:bg-parchment/30 transition-colors">
                      {/* Pelanggan */}
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-ink flex items-center gap-1.5">
                          <span>@{k.username || "user"}</span>
                          {k.role === "admin" && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-primary/10 text-primary font-black rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                        {k.name && k.name !== k.username && <p className="text-[11px] text-ink-muted">{k.name}</p>}
                        {phone ? (
                          <a
                            href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline font-semibold mt-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            {phone}
                          </a>
                        ) : (
                          <span className="text-[10px] text-ink-muted">No WA: -</span>
                        )}
                      </td>

                      {/* Label & API Key */}
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-ink">{k.name || "Merchant"}</div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-ink-muted bg-parchment/60 px-2 py-1 rounded-lg border border-hairline w-fit">
                          <span>{displayKey}</span>
                          <button
                            type="button"
                            onClick={() => setRevealedAdminKeys({ ...revealedAdminKeys, [k.id]: !isRevealed })}
                            className="text-[9px] text-primary hover:underline font-bold"
                          >
                            {isRevealed ? "Tutup" : "Lihat"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(k.apiKey);
                              Swal.fire({ title: "Tersalin", text: "API Key berhasil disalin ke clipboard.", timer: 1200, showConfirmButton: false });
                            }}
                            className="text-[9px] text-ink-muted hover:text-ink"
                            title="Salin API Key"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* GoBiz Status */}
                      <td className="p-3.5 align-top">
                        {k.isGopayConnected && k.merchantId ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              GoBiz Terhubung
                            </span>
                            {k.outletName && <p className="text-[10px] text-ink-muted font-mono">{k.outletName}</p>}
                            {k.gopayPhone && <p className="text-[9px] text-ink-muted font-mono">HP: {k.gopayPhone}</p>}
                          </div>
                        ) : k.gopayPhone ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Menunggu OTP
                            </span>
                            <p className="text-[9px] text-ink-muted font-mono">HP: {k.gopayPhone}</p>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 text-[10px] font-semibold inline-flex items-center gap-1 border border-slate-500/20">
                            Belum Ditautkan
                          </span>
                        )}
                      </td>

                      {/* Masa Aktif */}
                      <td className="p-3.5 align-top">
                        {expiryDate ? (
                          <div className="space-y-1">
                            <div className="text-ink font-semibold text-[11px]">
                              {expiryDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20 inline-block">
                                Kedaluwarsa ({Math.abs(daysLeft || 0)} hari lalu)
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                                Sisa {daysLeft} Hari Lagi
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/20 inline-flex items-center gap-1">
                                Aktif ({daysLeft} Hari)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted text-[11px] font-medium">-</span>
                        )}
                      </td>

                      {/* Status Saklar */}
                      <td className="p-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => handleToggleGatewayKey(k)}
                          disabled={isActionLoading}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            k.status === "active" || k.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }`}
                        >
                          {k.status === "active" || k.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="p-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 gap-1"
                              onClick={() => handleSendWaReminder(k)}
                              disabled={isActionLoading}
                              title="Kirim Pesan Pengingat Masa Aktif ke WhatsApp"
                            >
                              <Send className="w-2.5 h-2.5" />
                              Kirim WA
                            </Button>
                          )}

                          <Button
                            size="sm"
                            className="text-[10px] h-7 px-2.5 gap-1 font-bold"
                            onClick={() => handleRenewGatewayKey(k)}
                            disabled={isActionLoading}
                            title="Perpanjang Masa Aktif Lisensi"
                          >
                            <Plus className="w-3 h-3" />
                            Perpanjang
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
