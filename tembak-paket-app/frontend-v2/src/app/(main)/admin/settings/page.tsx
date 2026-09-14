"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import {
  Settings,
  RotateCw,
  MessageSquare,
  QrCode,
  Server,
  Database,
  ShieldCheck,
  Terminal,
  Download,
  Send,
  Power,
  CreditCard,
  Layers,
  Edit2,
  X,
  AlertTriangle,
  Activity,
} from "lucide-react";

export default function AdminSettingsPage() {
  // Baileys WhatsApp State
  const [baileysStatus, setBaileysStatus] = useState<any>({
    isConnected: false,
    state: "disconnected",
    connectedPhone: null,
    qrCode: null,
  });
  const [loadingBaileys, setLoadingBaileys] = useState(false);

  // External WhatsApp Gateway Settings
  const [waToken, setWaToken] = useState("");
  const [waUrl, setWaUrl] = useState("https://api.fonnte.com/send");
  const [waAutoSend, setWaAutoSend] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // Payment Gateway
  const [paymentGateway, setPaymentGateway] = useState<"orkut" | "gopay">("orkut");
  const [savingGateway, setSavingGateway] = useState(false);

  // GoPay Direct Gateway State
  const [gopayStatus, setGopayStatus] = useState<any>(null);
  const [loadingGopay, setLoadingGopay] = useState(false);
  const [gopayPhone, setGopayPhone] = useState("082342392781");
  const [gopayOtp, setGopayOtp] = useState("");
  const [gopayOtpSent, setGopayOtpSent] = useState(false);
  const [gopayRequestingOtp, setGopayRequestingOtp] = useState(false);
  const [gopayVerifyingOtp, setGopayVerifyingOtp] = useState(false);

  // Provider Balances
  const [providerBalances, setProviderBalances] = useState<{ kmsp: number | null; ceirgo: number | null }>({
    kmsp: null,
    ceirgo: null,
  });
  const [ceirgoStatus, setCeirgoStatus] = useState<{ connected: boolean; error: string | null; loading: boolean }>({
    connected: false,
    error: null,
    loading: false,
  });

  // Saldo Top Up CeirGO Modal
  const [showCeirgoTopUp, setShowCeirgoTopUp] = useState(false);
  const [ceirgoDepositProviders, setCeirgoDepositProviders] = useState<any[]>([]);
  const [ceirgoDepositProviderCode, setCeirgoDepositProviderCode] = useState("");
  const [ceirgoDepositAmount, setCeirgoDepositAmount] = useState("");
  const [ceirgoTopUpLoading, setCeirgoTopUpLoading] = useState(false);
  const [ceirgoPaymentData, setCeirgoPaymentData] = useState<any>(null);

  // Dashboard Announcement
  const [announcement, setAnnouncement] = useState("");
  const [savingAnn, setSavingAnn] = useState(false);

  // Sidebar Menu Settings
  const [showBeliPaket, setShowBeliPaket] = useState(false);
  const [savingMenuSettings, setSavingMenuSettings] = useState(false);

  // Auto Deploy Console
  const [showDeployConsole, setShowDeployConsole] = useState(false);
  const [deployLogs, setDeployLogs] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  // Load Baileys Status
  const loadBaileysStatus = async () => {
    try {
      const res = await fetch("/api/admin/baileys/status", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status) {
        const payload = d.data || d;
        const isConn = Boolean(payload.isConnected || payload.connected || payload.state === "open");
        setBaileysStatus((prev: any) => {
          const isConnectingOrOpen = payload.state === "connecting" || payload.state === "open" || isConn;
          const qr = isConn ? null : isConnectingOrOpen ? prev.qrCode || payload.qrCode : payload.qrCode;
          return {
            ...payload,
            isConnected: isConn,
            connected: isConn,
            qrCode: qr,
          };
        });
        return isConn;
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const handleInitBaileys = async (forceNew = false) => {
    setLoadingBaileys(true);
    try {
      await fetch("/api/admin/baileys/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ forceNew }),
      });
      const initialConnected = await loadBaileysStatus();
      if (initialConnected) {
        setLoadingBaileys(false);
        return;
      }

      let attempts = 0;
      let interval: any = null;
      interval = setInterval(async () => {
        attempts++;
        const connected = await loadBaileysStatus();
        if (connected || attempts >= 15) {
          if (interval) clearInterval(interval);
        }
      }, 1500);
    } catch (e) {
      // ignore
    } finally {
      setLoadingBaileys(false);
    }
  };

  const handleLogoutBaileys = async () => {
    const confirm = await Swal.fire({
      title: "Putus Koneksi WhatsApp?",
      text: "WhatsApp Bot toko akan logout dari server.",
      showCancelButton: true,
      confirmButtonText: "Ya, Putus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    setLoadingBaileys(true);
    try {
      const res = await fetch("/api/admin/baileys/logout", { method: "POST", credentials: "include" });
      const d = await safeJson(res);
      if (d?.status || d?.success) {
        Swal.fire({ title: "Terputus", text: d?.message || "WhatsApp bot telah logout.", timer: 1500, showConfirmButton: false });
        setBaileysStatus({ isConnected: false, connected: false, state: "disconnected", connectedPhone: null, qrCode: null });
        await loadBaileysStatus();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal logout WhatsApp." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: e?.message || "Gagal menghubungi server." });
    } finally {
      setLoadingBaileys(false);
    }
  };

  // Load GoPay Status
  const loadGopayStatus = async () => {
    setLoadingGopay(true);
    try {
      const res = await fetch("/api/admin/gopay/status", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && d.data) {
        setGopayStatus(d.data);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingGopay(false);
    }
  };

  const handleRequestGopayOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gopayPhone.trim()) {
      return Swal.fire({ title: "Peringatan", text: "Nomor HP GoBiz/GoFood Merchant wajib diisi." });
    }
    setGopayRequestingOtp(true);
    try {
      const res = await fetch("/api/admin/gopay/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: gopayPhone }),
      });
      const d = await safeJson(res);
      if (d?.status || d?.success) {
        setGopayOtpSent(true);
        Swal.fire({
          title: "OTP Dikirim",
          text: d?.message || "Kode OTP 4 digit telah dikirim via SMS ke nomor Anda.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "GoPay Gateway tidak merespon." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan koneksi ke GoPay Gateway." });
    } finally {
      setGopayRequestingOtp(false);
    }
  };

  const handleVerifyGopayOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gopayOtp.trim() || gopayOtp.trim().length !== 4) {
      return Swal.fire({ title: "Peringatan", text: "Masukkan 4 digit kode OTP yang diterima." });
    }
    setGopayVerifyingOtp(true);
    try {
      const res = await fetch("/api/admin/gopay/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: gopayOtp.trim() }),
      });
      const d = await safeJson(res);
      if (d?.status || d?.success) {
        setGopayOtpSent(false);
        setGopayOtp("");
        Swal.fire({
          title: "Login Berhasil",
          text: d?.message || "Sesi GoPay Merchant telah aktif.",
          timer: 2000,
          showConfirmButton: false,
        });
        loadGopayStatus();
      } else {
        Swal.fire({ title: "Verifikasi Gagal", text: d?.message || "Kode OTP salah atau kedaluwarsa." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan saat verifikasi OTP." });
    } finally {
      setGopayVerifyingOtp(false);
    }
  };

  const handleLogoutGopay = async () => {
    const confirm = await Swal.fire({
      title: "Putus Sesi GoBiz?",
      text: "Sesi merchant GoPay (GoBiz) akan diputus dan file token akan dihapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Disconnect",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    setLoadingGopay(true);
    try {
      const res = await fetch("/api/admin/gopay/logout", {
        method: "POST",
        credentials: "include",
      });
      const d = await safeJson(res);
      if (d?.status || d?.success) {
        Swal.fire({
          title: "Terputus",
          text: d?.message || "Sesi GoPay Merchant berhasil diputus.",
          timer: 2000,
          showConfirmButton: false,
        });
        loadGopayStatus();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal memutus sesi GoPay." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan koneksi saat logout GoPay." });
    } finally {
      setLoadingGopay(false);
    }
  };

  const handleCheckGopayEndpoint = async () => {
    setLoadingGopay(true);
    try {
      const startTime = Date.now();
      const res = await fetch("/api/admin/gopay/status", { credentials: "include" });
      const elapsed = Date.now() - startTime;
      const d = await safeJson(res);

      if (d?.status && d.data) {
        setGopayStatus(d.data);
        const isConnected = d.data.token_status === "valid";
        const outlet = d.data.outlet_name || d.data.session_info?.outlet_name || "Merchant";
        const phone = d.data.phone_number || d.data.session_info?.phone_number || d.data.gopayPhone || "-";

        Swal.fire({
          title: isConnected ? "Endpoint GoPay Terhubung!" : "Endpoint GoPay Aktif",
          html: `
            <div class="text-left text-xs space-y-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono">
              <div><b>Status API:</b> <span class="text-emerald-600 font-bold">200 OK (${elapsed}ms)</span></div>
              <div><b>Status Sesi:</b> <span class="${isConnected ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}">${d.data.token_status || 'Belum Login'}</span></div>
              <div><b>Nama Outlet:</b> ${outlet}</div>
              <div><b>No HP Merchant:</b> ${phone}</div>
            </div>
          `,
          icon: isConnected ? "success" : "info",
        });
      } else {
        Swal.fire({
          title: "Koneksi Endpoint Gagal",
          text: d?.message || "Gateway GoPay tidak merespon dengan benar.",
          icon: "error",
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: "Error Endpoint",
        text: "Tidak dapat terhubung ke endpoint GoPay Gateway.",
        icon: "error",
      });
    } finally {
      setLoadingGopay(false);
    }
  };

  // Balances
  const loadBalances = async () => {
    fetch("/api/admin/ceirgo-balance", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        const b = d?.ceirgoBalance ?? d?.balance ?? d?.data?.ceirgoBalance ?? d?.data?.balance;
        if (b != null && !isNaN(Number(b))) {
          setProviderBalances((prev) => ({ ...prev, ceirgo: Number(b) }));
        }
        const isConn = Boolean(d?.connected ?? d?.status ?? false);
        const errMsg = d?.error ?? d?.data?.error ?? (!isConn ? d?.message || "Server tidak dapat dijangkau" : null);
        setCeirgoStatus({
          connected: isConn,
          error: errMsg,
          loading: false,
        });
      })
      .catch(() => {
        setCeirgoStatus({ connected: false, error: "Gagal terhubung ke backend", loading: false });
      });

    fetch("/api/admin/kmsp-balance", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        const bal = d?.kmspBalance ?? d?.balance ?? d?.data?.kmspBalance ?? d?.data?.balance;
        if (bal != null && !isNaN(Number(bal))) {
          setProviderBalances((prev) => ({ ...prev, kmsp: Number(bal) }));
        }
      })
      .catch(() => {});
  };

  // Load Initial Settings
  useEffect(() => {
    loadBaileysStatus();
    loadGopayStatus();
    loadBalances();

    // Load WhatsApp Gateway Settings
    fetch("/api/admin/whatsapp-settings", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d?.status && d.data) {
          setWaToken(d.data.token || "");
          setWaUrl(d.data.url || "https://api.fonnte.com/send");
          setWaAutoSend(d.data.autoSend ?? true);
        }
      })
      .catch(() => {});

    // Load Payment Gateway
    fetch("/api/admin/payment-gateway", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d?.status && d.gateway) {
          setPaymentGateway(d.gateway);
        }
      })
      .catch(() => {});

    // Load Announcement
    fetch("/api/admin/announcement", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d?.status && d.data) {
          setAnnouncement(d.data.message || "");
        }
      })
      .catch(() => {});

    // Load Menu Settings
    fetch("/api/admin/menu-settings", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d?.status && d.data) {
          setShowBeliPaket(Boolean(d.data.showBeliPaket));
        }
      })
      .catch(() => {});

    // Load Ceirgo Deposit Providers
    fetch("/api/admin/ceirgo-deposit-providers", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((d) => {
        if (d?.status && Array.isArray(d.data)) {
          setCeirgoDepositProviders(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveWhatsAppSettings = async () => {
    setSavingWhatsApp(true);
    try {
      const res = await fetch("/api/admin/whatsapp-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: waToken, url: waUrl, autoSend: waAutoSend }),
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ title: "Berhasil", text: "Pengaturan WhatsApp Gateway berhasil disimpan.", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: data?.message || "Gagal menyimpan pengaturan WhatsApp." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan sistem." });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnn(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: announcement, isEnabled: true }),
      });
      if (res.ok) {
        Swal.fire({ title: "Tersimpan", text: "Pengumuman berhasil diperbarui.", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: "Gagal menyimpan pengumuman." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan." });
    } finally {
      setSavingAnn(false);
    }
  };

  const handleSaveMenuSettings = async () => {
    setSavingMenuSettings(true);
    try {
      const res = await fetch("/api/admin/menu-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showBeliPaket }),
      });
      if (res.ok) {
        Swal.fire({ title: "Tersimpan", text: "Pengaturan visibilitas menu disimpan.", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: "Gagal menyimpan pengaturan menu." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan komunikasi server." });
    } finally {
      setSavingMenuSettings(false);
    }
  };

  // Auto Deploy Trigger
  const startDeploy = async () => {
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST", credentials: "include" });
      const d = await safeJson(res);
      if (d?.status) {
        setShowDeployConsole(true);
        setIsDeploying(true);
        setDeployLogs("Menghubungi server dan menyiapkan proses deploy...\n");

        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch("/api/admin/deploy-status", { credentials: "include" });
            const statusData = await safeJson(statusRes);
            if (statusData?.status && statusData?.log) {
              setDeployLogs(statusData.log);
              if (statusData.log.includes("SELESAI DENGAN KODE")) {
                clearInterval(interval);
                setIsDeploying(false);
              }
            }
          } catch (err) {
            setDeployLogs((prev) => prev + "\n[SISTEM] Server sedang proses pembaruan. Menunggu koneksi...\n");
            clearInterval(interval);
            let checkCount = 0;
            const reconnectInterval = setInterval(async () => {
              checkCount++;
              try {
                const ping = await fetch("/api/admin/menu-settings", { credentials: "include" });
                if (ping.ok) {
                  clearInterval(reconnectInterval);
                  setDeployLogs((prev) => prev + "\n[SISTEM] Koneksi terhubung kembali. Deploy berhasil.\n");
                  setIsDeploying(false);
                }
              } catch (e) {
                if (checkCount >= 30) clearInterval(reconnectInterval);
              }
            }, 3000);
          }
        }, 2000);
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal memulai auto deploy." });
      }
    } catch (err) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server deploy." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Pengaturan & Konfigurasi Server
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Integrasi bot WhatsApp, gateway pembayaran GoPay & Orkut, saldo modal server, dan pembaruan sistem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: WhatsApp Bot Toko & Gateway Pembayaran */}
        <div className="lg:col-span-6 space-y-6">
          {/* WhatsApp Bot Toko (Baileys Engine) */}
          <Card glass className="p-5 space-y-4 border-emerald-500/30">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  WhatsApp Bot Toko (Engine Otomatis)
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Tautkan nomor WhatsApp toko untuk mengirim nota otomatis.</p>
              </div>

              <div>
                {baileysStatus.isConnected ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Terhubung: +{baileysStatus.connectedPhone}
                  </span>
                ) : baileysStatus.state === "qr_ready" ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    Menunggu Scan QR
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                    Belum Login
                  </span>
                )}
              </div>
            </div>

            {/* State Area */}
            {baileysStatus.isConnected ? (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                    WhatsApp Bot Aktif (+{baileysStatus.connectedPhone})
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                    Nota transaksi dan pembaruan pengerjaan pesanan otomatis terkirim melalui nomor resmi toko ini.
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      const { value: phone } = await Swal.fire({
                        title: "Tes WhatsApp Bot",
                        input: "text",
                        inputLabel: "Nomor WhatsApp tujuan (misal: 08123456789):",
                        inputPlaceholder: "08xxxxxxxxxx",
                        showCancelButton: true,
                        confirmButtonText: "Kirim Pesan Tes",
                        cancelButtonText: "Batal",
                        inputValidator: (val: string | null) => {
                          if (!val || val.replace(/\D/g, "").length < 9) return "Nomor WA tidak valid!";
                        },
                      });
                      if (!phone) return;

                      try {
                        Swal.showLoading();
                        const res = await fetch("/api/admin/baileys/test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ targetPhone: phone }),
                        });
                        const d = await res.json();
                        if (res.ok && d.status) {
                          Swal.fire({ title: "Berhasil", text: d.message, timer: 2000, showConfirmButton: false });
                        } else {
                          Swal.fire({ title: "Gagal", text: d.message || "Gagal mengirim pesan tes." });
                        }
                      } catch (e) {
                        Swal.fire({ title: "Error", text: "Kesalahan jaringan." });
                      }
                    }}
                  >
                    <Send className="w-3 h-3" />
                    Tes Kirim Pesan
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={loadingBaileys}
                    onClick={handleLogoutBaileys}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Power className="w-3 h-3" />
                    Putus Koneksi
                  </Button>
                </div>
              </div>
            ) : baileysStatus.qrCode ? (
              <div className="p-4 bg-canvas border border-hairline rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-ink">Pindai Kode QR dengan WhatsApp</h4>
                  <p className="text-[11px] text-ink-muted">
                    Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat
                  </p>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="p-2 bg-white border border-emerald-400 rounded-xl shadow-xs">
                  <img src={baileysStatus.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleInitBaileys(true)} className="text-xs">
                    Buat QR Baru
                  </Button>
                  <Button size="sm" variant="ghost" onClick={loadBaileysStatus} className="text-xs">
                    Cek Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-parchment/40 rounded-xl border border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-ink">Engine WhatsApp Siap Dihubungkan</h4>
                  <p className="text-[11px] text-ink-muted">Klik tombol di samping untuk menghasilkan kode QR login.</p>
                </div>
                <Button size="sm" isLoading={loadingBaileys} onClick={() => handleInitBaileys(false)} className="text-xs font-bold shrink-0">
                  Tautkan Nomor WhatsApp
                </Button>
              </div>
            )}
          </Card>

          {/* Payment Gateway Selector */}
          <Card glass className="p-5 space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment Gateway (Deposit Pengguna)
              </h3>
              <p className="text-xs text-ink-muted">Pilih sistem QRIS yang aktif untuk proses deposit saldo pelanggan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentGateway("orkut")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  paymentGateway === "orkut"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-hairline bg-canvas hover:bg-parchment"
                }`}
              >
                <div className="font-bold text-xs text-ink">Nobu Bank / Orkut</div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  Merchant: <b>RYYSTORE OK2285905</b>
                </div>
                <div className="text-[9px] text-emerald-600 font-semibold mt-1">Polling mutasi OK2285905</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentGateway("gopay")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  paymentGateway === "gopay"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-hairline bg-canvas hover:bg-parchment"
                }`}
              >
                <div className="font-bold text-xs text-ink">GoPay Direct Gateway</div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  Merchant: <b>RyyStore IT Solutions</b>
                </div>
                <div className="text-[9px] text-blue-600 font-semibold mt-1">Port 3002 / Direct Dynamic</div>
              </button>
            </div>

            <Button
              className="w-full text-xs font-bold h-10"
              isLoading={savingGateway}
              onClick={async () => {
                setSavingGateway(true);
                try {
                  const res = await fetch("/api/admin/payment-gateway", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gateway: paymentGateway }),
                  });
                  const data = await res.json();
                  if (res.ok && data.status) {
                    Swal.fire({ title: "Berhasil", text: data.message || "Gateway aktif berhasil disimpan.", timer: 1500, showConfirmButton: false });
                  } else {
                    Swal.fire({ title: "Gagal", text: data.message || "Gagal menyimpan gateway." });
                  }
                } catch (e) {
                  Swal.fire({ title: "Error", text: "Kesalahan jaringan." });
                } finally {
                  setSavingGateway(false);
                }
              }}
            >
              Simpan Gateway Aktif
            </Button>
          </Card>

          {/* GoPay Merchant Partner (GoBiz) Login */}
          <Card glass className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-hairline pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-sky-500" />
                  GoPay Merchant Partner (GoBiz)
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Sesi login merchant & mutasi QRIS GoPay instan via web.</p>
              </div>

              <div className="flex items-center gap-2">
                {gopayStatus?.token_status === "valid" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                    Belum Login
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={loadGopayStatus} disabled={loadingGopay} className="p-1 h-8 w-8">
                  <RotateCw className={`w-3.5 h-3.5 ${loadingGopay ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {gopayStatus?.token_status === "valid" ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <p className="font-bold text-ink flex items-center justify-between">
                    <span>Sesi GoBiz Aktif</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">Token Valid</span>
                  </p>
                  <p className="text-ink-muted text-[11px]">
                    Outlet: <b>{gopayStatus.outlet_name || gopayStatus.session_info?.outlet_name || "Merchant"}</b> &bull; No HP: {gopayStatus.phone_number || gopayStatus.session_info?.phone_number || gopayStatus.gopayPhone || "-"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckGopayEndpoint}
                    disabled={loadingGopay}
                    className="flex-1 text-xs font-bold h-9 gap-1.5 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Cek Endpoint
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleLogoutGopay}
                    disabled={loadingGopay}
                    className="text-xs font-bold h-9 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Diskonek (Logout)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckGopayEndpoint}
                    disabled={loadingGopay}
                    className="text-[11px] h-7 gap-1 text-sky-600 dark:text-sky-400 border-sky-500/30"
                  >
                    <Activity className="w-3 h-3" />
                    Cek Endpoint
                  </Button>
                </div>
                {!gopayOtpSent ? (
                  <form onSubmit={handleRequestGopayOtp} className="space-y-3">
                    <Input
                      label="Nomor HP GoBiz Merchant"
                      placeholder="08xxxxxxxxxx"
                      value={gopayPhone}
                      onChange={(e) => setGopayPhone(e.target.value)}
                      required
                    />
                    <Button type="submit" isLoading={gopayRequestingOtp} className="w-full text-xs font-bold h-9">
                      Kirim Kode OTP via SMS
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyGopayOtp} className="space-y-3 p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20">
                    <Input
                      label="Masukkan 4 Digit Kode OTP SMS"
                      placeholder="Contoh: 1234"
                      value={gopayOtp}
                      onChange={(e) => setGopayOtp(e.target.value.replace(/\D/g, ""))}
                      maxLength={4}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" isLoading={gopayVerifyingOtp} className="flex-1 text-xs font-bold h-9">
                        Verifikasi OTP
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setGopayOtpSent(false);
                          setGopayOtp("");
                        }}
                        className="text-xs h-9"
                      >
                        Batal
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Kolom Kanan: Saldo Provider, Pengumuman, Menu, Database & Deploy */}
        <div className="lg:col-span-6 space-y-6">
          {/* Saldo Modal Provider */}
          <Card glass className="p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  Saldo Modal Provider Server
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Pantau dan isi saldo deposit pada server penyedia layanan.</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadBalances} className="gap-1.5 text-xs">
                <RotateCw className="w-3.5 h-3.5" />
                Segarkan
              </Button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-3.5 bg-canvas border border-hairline rounded-xl">
                <div>
                  <div className="font-bold text-xs text-ink">KMSP Store (Paket Kuota)</div>
                  <div className="text-[10px] text-ink-muted">Penyedia paket kuota data</div>
                </div>
                <div className="font-bold text-xs text-primary font-mono">
                  Rp {providerBalances.kmsp != null ? Number(providerBalances.kmsp).toLocaleString("id-ID") : "..."}
                </div>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-canvas border border-hairline rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-xs text-ink">Server Pusat (CEIR / IMEI)</div>
                    {ceirgoStatus.connected ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Terkoneksi
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        Terputus
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-primary font-mono mt-0.5">
                    Rp {Number(providerBalances.ceirgo || 0).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" className="text-xs h-8" onClick={() => setShowCeirgoTopUp(true)}>
                    Isi Saldo
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Pengumuman Banner Dashboard */}
          <Card glass className="p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Pengumuman Banner Dashboard</h3>
              <p className="text-xs text-ink-muted mt-0.5">Teks pemberitahuan berjalan pada dashboard pelanggan.</p>
            </div>
            <textarea
              className="w-full p-3.5 border border-hairline rounded-xl bg-canvas text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              rows={3}
              placeholder="Masukkan pengumuman penting di sini..."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
            <Button className="w-full text-xs font-bold h-9" onClick={handleSaveAnnouncement} isLoading={savingAnn}>
              Simpan Pengumuman
            </Button>
          </Card>

          {/* Menu Sidebar Settings */}
          <Card glass className="p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Pengaturan Menu Sidebar</h3>
              <p className="text-xs text-ink-muted mt-0.5">Atur fitur yang tampil pada sidebar pengguna.</p>
            </div>
            <div className="flex items-center justify-between p-3.5 border border-hairline rounded-xl bg-canvas">
              <div>
                <p className="font-bold text-xs text-ink">Menu Suntik Kuota</p>
                <p className="text-[11px] text-ink-muted">Tampilkan fitur Suntik Kuota pada menu navigasi pelanggan.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showBeliPaket}
                  onChange={(e) => setShowBeliPaket(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <Button className="w-full text-xs font-bold h-9" onClick={handleSaveMenuSettings} isLoading={savingMenuSettings}>
              Simpan Pengaturan Menu
            </Button>
          </Card>

          {/* Database & Auto Deploy */}
          <Card glass className="p-5 space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Database & Pembaruan Sistem
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Unduh cadangan database dan deploy commit terbaru dari GitHub.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href="/api/admin/backup-database" download className="block">
                <Button variant="outline" className="w-full text-xs h-9 gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Unduh Backup DB (.sqlite)
                </Button>
              </a>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5"
                onClick={() => {
                  Swal.fire({
                    title: "Mulai Auto Deploy?",
                    text: "Server akan menarik commit terbaru dari GitHub dan restart PM2 secara instan.",
                    showCancelButton: true,
                    confirmButtonText: "Ya, Jalankan Deploy",
                    cancelButtonText: "Batal",
                  }).then((res) => {
                    if (res.isConfirmed) startDeploy();
                  });
                }}
              >
                <Terminal className="w-3.5 h-3.5" />
                Jalankan Auto Deploy
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Top Up Saldo Pusat Modal */}
      {showCeirgoTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-hairline pb-3">
              <h3 className="font-bold text-base text-ink">Top Up Saldo Server Pusat</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCeirgoTopUp(false);
                  setCeirgoPaymentData(null);
                }}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!ceirgoPaymentData ? (
              <div className="space-y-4">
                <Input
                  label="Jumlah Deposit (Rp)"
                  type="number"
                  min={10000}
                  placeholder="Minimal Rp 10.000"
                  value={ceirgoDepositAmount}
                  onChange={(e) => setCeirgoDepositAmount(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Pilih Metode Pembayaran</label>
                  <select
                    className="w-full h-10 rounded-xl border border-hairline px-3 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={ceirgoDepositProviderCode}
                    onChange={(e) => setCeirgoDepositProviderCode(e.target.value)}
                  >
                    <option value="">-- Pilih Provider --</option>
                    {ceirgoDepositProviders.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.display_name || p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full text-xs font-bold h-10"
                  isLoading={ceirgoTopUpLoading}
                  onClick={async () => {
                    if (!ceirgoDepositAmount || parseInt(ceirgoDepositAmount) < 10000) {
                      return Swal.fire({ title: "Perhatian", text: "Minimal top up Rp 10.000." });
                    }
                    if (!ceirgoDepositProviderCode) {
                      return Swal.fire({ title: "Perhatian", text: "Pilih provider pembayaran." });
                    }

                    setCeirgoTopUpLoading(true);
                    try {
                      const res = await fetch("/api/admin/ceirgo-deposit", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          amount: parseInt(ceirgoDepositAmount),
                          provider_code: ceirgoDepositProviderCode,
                        }),
                      });
                      const d = await res.json();
                      if (d.status) {
                        setCeirgoPaymentData(d.data);
                      } else {
                        Swal.fire({ title: "Gagal", text: d.message || "Gagal membuat pesanan deposit." });
                      }
                    } catch (e) {
                      Swal.fire({ title: "Error", text: "Kesalahan jaringan." });
                    } finally {
                      setCeirgoTopUpLoading(false);
                    }
                  }}
                >
                  Buat Pesanan Deposit
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-semibold mb-1">Total Tagihan Bayar:</p>
                  <p className="text-2xl font-black font-mono">
                    Rp{" "}
                    {(
                      ceirgoPaymentData.total_pay ??
                      ceirgoPaymentData.amounts?.total_pay ??
                      ceirgoPaymentData.amount ??
                      0
                    ).toLocaleString("id-ID")}
                  </p>
                </div>

                {ceirgoPaymentData.qr_url || ceirgoPaymentData.qr || ceirgoPaymentData.qr_string ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-xs font-semibold text-ink">Pindai QRIS Realtime di bawah:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        ceirgoPaymentData.qr_url ||
                        ceirgoPaymentData.qr ||
                        (ceirgoPaymentData.qr_string
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                              ceirgoPaymentData.qr_string
                            )}`
                          : "")
                      }
                      alt="QRIS Deposit"
                      className="w-48 h-48 border border-hairline rounded-xl p-2 bg-white shadow-xs mx-auto"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-left bg-parchment/40 p-4 rounded-xl border border-hairline">
                    <p>
                      <b>Provider:</b> {ceirgoPaymentData.provider || ceirgoPaymentData.provider_code}
                    </p>
                    {ceirgoPaymentData.account_number && (
                      <p>
                        <b>No Rekening / VA:</b>{" "}
                        <span className="font-mono font-bold text-ink">{ceirgoPaymentData.account_number}</span>
                      </p>
                    )}
                  </div>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setShowCeirgoTopUp(false);
                    setCeirgoPaymentData(null);
                    loadBalances();
                  }}
                >
                  Tutup & Selesai
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Deploy Terminal Modal */}
      {showDeployConsole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Card className="w-full max-w-2xl bg-[#1e1e1e] border border-zinc-700 p-0 overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center bg-zinc-900 p-3.5 border-b border-zinc-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Terminal Auto Deploy
                {isDeploying && (
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-zinc-500 border-t-amber-400 rounded-full ml-2"></span>
                )}
              </h4>
              {!isDeploying && (
                <button
                  type="button"
                  onClick={() => setShowDeployConsole(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <pre className="w-full h-[55vh] max-h-[450px] bg-black p-4 overflow-y-auto text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed select-all">
              {deployLogs}
            </pre>
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-[11px] text-zinc-500">*Jangan menutup jendela ini hingga proses selesai.</span>
              {!isDeploying && (
                <Button size="sm" onClick={() => window.location.reload()} className="bg-primary text-white text-xs">
                  Muat Ulang Halaman
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
