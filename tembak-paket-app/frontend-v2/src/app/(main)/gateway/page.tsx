"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";

interface GatewayKey {
  id: string;
  name: string;
  apiKey: string;
  status: "active" | "expired" | "suspended";
  pricePerMonth: number;
  createdAt: string;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  autoRenew: boolean;
  gopayPhone: string | null;
  merchantId: string | null;
  outletName: string | null;
  isGopayConnected: boolean;
  qrisTemplate: string;
  webhookUrl: string;
  totalRequests: number;
  lastUsedAt: string | null;
}

export default function GatewayDeveloperPage() {
  const { user } = useApp();
  const router = useRouter();

  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"keys" | "docs" | "tester">("keys");
  const [docLang, setDocLang] = useState<"php" | "nodejs" | "curl" | "python">("php");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createQris, setCreateQris] = useState("");
  const [createWebhook, setCreateWebhook] = useState("");
  const [createAutoRenew, setCreateAutoRenew] = useState(true);
  const [creating, setCreating] = useState(false);

  // OTP GoBiz Pairing Modal
  const [selectedKeyForOtp, setSelectedKeyForOtp] = useState<GatewayKey | null>(null);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Settings Modal
  const [selectedKeyForConfig, setSelectedKeyForConfig] = useState<GatewayKey | null>(null);
  const [configName, setConfigName] = useState("");
  const [configQris, setConfigQris] = useState("");
  const [configWebhook, setConfigWebhook] = useState("");
  const [configAutoRenew, setConfigAutoRenew] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // Key Visibility and Copy
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sandbox Tester
  const [testKey, setTestKey] = useState("");
  const [testAmount, setTestAmount] = useState("1000");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gateway/keys", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && Array.isArray(d.data)) {
        setKeys(d.data);
        setUserBalance(d.userBalance || 0);
        if (d.data.length > 0 && !testKey) {
          setTestKey(d.data[0].apiKey);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCopyKey = (keyText: string, id: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      Swal.fire({ icon: "warning", title: "Nama Wajib Diisi", text: "Masukkan label nama aplikasi atau toko Anda." });
      return;
    }

    if (userBalance < 10000) {
      Swal.fire({
        icon: "error",
        title: "Saldo Kurang",
        text: `Saldo Anda saat ini Rp ${userBalance.toLocaleString("id-ID")}. Dibutuhkan Rp 10.000 untuk langganan 30 hari. Silakan top up saldo terlebih dahulu.`,
        showCancelButton: true,
        confirmButtonText: "Top Up Saldo",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) router.push("/topup");
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Konfirmasi Pembuatan API Key",
      text: `Saldo akun Anda akan dipotong Rp 10.000 untuk masa aktif 30 hari. Lanjutkan?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Buat API Key",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb"
    });

    if (!confirm.isConfirmed) return;

    setCreating(true);
    try {
      const res = await fetch("/api/gateway/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: createName,
          qrisTemplate: createQris,
          webhookUrl: createWebhook,
          autoRenew: createAutoRenew
        })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "Berhasil!", text: data.message });
        setShowCreateModal(false);
        setCreateName("");
        setCreateQris("");
        setCreateWebhook("");
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data?.message || "Terjadi kesalahan sistem." });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const handleRenewKey = async (key: GatewayKey) => {
    if (userBalance < 10000) {
      Swal.fire({
        icon: "error",
        title: "Saldo Kurang",
        text: `Saldo Anda saat ini Rp ${userBalance.toLocaleString("id-ID")}. Dibutuhkan Rp 10.000 untuk perpanjangan 30 hari.`,
        showCancelButton: true,
        confirmButtonText: "Top Up Saldo",
        cancelButtonText: "Batal"
      }).then((result) => {
        if (result.isConfirmed) router.push("/topup");
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Perpanjang Masa Aktif",
      text: `Perpanjang masa aktif '${key.name}' selama +30 hari seharga Rp 10.000?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Perpanjang (+30 Hari)",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/gateway/keys/${key.id}/renew`, {
        method: "POST",
        credentials: "include"
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "Sukses!", text: data.message });
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data?.message || "Gagal memperpanjang." });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    }
  };

  const handleDeleteKey = async (key: GatewayKey) => {
    const confirm = await Swal.fire({
      title: "Hapus API Key?",
      text: `Aplikasi yang menggunakan API Key '${key.name}' tidak akan dapat memproses pembayaran lagi. Yakin ingin menghapus?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/gateway/keys/${key.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "Terhapus", text: data.message });
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data?.message || "Gagal menghapus." });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    }
  };

  const handleOpenOtpModal = (key: GatewayKey) => {
    setSelectedKeyForOtp(key);
    setOtpPhone(key.gopayPhone || user?.verifiedPhone || user?.phone || "");
    setOtpCode("");
    setOtpSent(false);
  };

  const handleRequestOtp = async () => {
    if (!selectedKeyForOtp) return;
    if (!otpPhone.trim() || otpPhone.replace(/\D/g, "").length < 9) {
      Swal.fire({ icon: "warning", title: "Nomor HP Tidak Valid", text: "Masukkan nomor HP GoBiz yang terdaftar (contoh: 08123456789)." });
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(`/api/gateway/keys/${selectedKeyForOtp.id}/otp-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: otpPhone })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        setOtpSent(true);
        Swal.fire({ icon: "info", title: "Kode OTP Terkirim", text: data.message });
      } else {
        Swal.fire({ icon: "error", title: "Gagal Kirim OTP", text: data?.message || "Gagal meminta OTP GoPay." });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedKeyForOtp) return;
    if (!otpCode.trim() || otpCode.trim().length !== 4) {
      Swal.fire({ icon: "warning", title: "Kode OTP Salah", text: "Masukkan 4 digit kode OTP yang Anda terima via SMS." });
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(`/api/gateway/keys/${selectedKeyForOtp.id}/otp-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: otpCode })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "GoBiz Terhubung!", text: data.message });
        setSelectedKeyForOtp(null);
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Verifikasi Gagal", text: data?.message || "Kode OTP salah atau kedaluwarsa." });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDisconnectGoBiz = async (key: GatewayKey) => {
    const confirm = await Swal.fire({
      title: "Putuskan Akun GoBiz?",
      text: `Apakah Anda yakin ingin memutuskan akun GoBiz (${key.outletName || key.gopayPhone}) dari API Key ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Putuskan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/gateway/keys/${key.id}/logout-gopay`, {
        method: "POST",
        credentials: "include"
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "Terputus", text: data.message });
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data?.message });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    }
  };

  const handleOpenConfigModal = (key: GatewayKey) => {
    setSelectedKeyForConfig(key);
    setConfigName(key.name);
    setConfigQris(key.qrisTemplate || "");
    setConfigWebhook(key.webhookUrl || "");
    setConfigAutoRenew(key.autoRenew);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyForConfig) return;

    setConfigSaving(true);
    try {
      const res = await fetch(`/api/gateway/keys/${selectedKeyForConfig.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: configName,
          qrisTemplate: configQris,
          webhookUrl: configWebhook,
          autoRenew: configAutoRenew
        })
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ icon: "success", title: "Tersimpan", text: data.message });
        setSelectedKeyForConfig(null);
        fetchKeys();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data?.message });
      }
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: e.message });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleRunSandboxTest = async () => {
    if (!testKey) {
      Swal.fire({ icon: "warning", title: "Pilih API Key", text: "Pilih API Key yang akan digunakan untuk pengujian." });
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("https://ry-itsolutionts.web.id/create-qris", {
        method: "POST",
        headers: {
          "x-api-key": testKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: parseInt(testAmount, 10) || 1000
        })
      });
      const data = await safeJson(res);
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-28">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 border border-blue-500/20 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <span>⚡ Payment Gateway as a Service</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              GoPay &amp; QRIS Merchant Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Terima pembayaran QRIS otomatis di website, bot, atau aplikasi toko Anda sendiri. Uang langsung masuk ke rekening GoPay Anda tanpa perantara.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Auto Check Mutasi 24 Jam
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Webhook Notifikasi Instan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Rp 10.000 / Bulan per API Key
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[200px] text-center shadow-lg">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">Saldo Akun Anda</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 my-1">
              Rp {userBalance.toLocaleString("id-ID")}
            </span>
            <button
              onClick={() => router.push("/topup")}
              className="mt-2 w-full py-1.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105"
            >
              + Isi Saldo
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        <button
          onClick={() => setActiveTab("keys")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === "keys"
              ? "bg-primary text-white shadow-sm"
              : "text-ink-muted hover:text-ink hover:bg-parchment"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          <span>Daftar API Key ({keys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === "docs"
              ? "bg-primary text-white shadow-sm"
              : "text-ink-muted hover:text-ink hover:bg-parchment"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span>Dokumentasi Integrasi</span>
        </button>

        <button
          onClick={() => setActiveTab("tester")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === "tester"
              ? "bg-primary text-white shadow-sm"
              : "text-ink-muted hover:text-ink hover:bg-parchment"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span>API Sandbox / Tester</span>
        </button>
      </div>

      {/* TAB 1: KEYS MANAGEMENT */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">API Key Aktif Anda</h2>
              <p className="text-xs text-ink-muted">Setiap key memiliki masa aktif 30 hari dan dapat dihubungkan ke GoBiz Anda.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-transform hover:scale-105 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Buat API Key Baru</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-canvas border border-hairline rounded-3xl animate-pulse">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-ink-muted font-bold">Memuat daftar API Key...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-canvas border border-dashed border-hairline rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <h3 className="font-black text-sm text-ink">Belum Ada API Key</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Anda belum memiliki API Key. Buat API Key pertama Anda hanya dengan Rp 10.000 / bulan untuk mulai menerima pembayaran otomatis di website Anda.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all"
              >
                + Buat API Key Pertama Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {keys.map((k) => {
                const isRevealed = revealedKeys[k.id] || false;
                const displayKey = isRevealed ? k.apiKey : k.apiKey.substring(0, 12) + "•".repeat(24);

                return (
                  <div
                    key={k.id}
                    className="p-5 rounded-3xl bg-canvas border border-hairline shadow-sm hover:border-primary/40 transition-all space-y-4"
                  >
                    {/* Top Row: Label & Status Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                          {k.name.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="font-black text-sm text-ink">{k.name}</h3>
                          <span className="text-[10px] text-ink-muted font-mono">ID: {k.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {k.status === "active" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Aktif ({k.daysRemaining} Hari Lagi)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-black uppercase flex items-center gap-1 border border-red-500/20">
                            Kedaluwarsa
                          </span>
                        )}

                        {k.isGopayConnected ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black flex items-center gap-1 border border-blue-500/20">
                            GoBiz: {k.outletName || k.gopayPhone}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black flex items-center gap-1 border border-amber-500/20">
                            GoBiz Belum Terhubung
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: API Key Copy Box */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-ink-muted">Token API Key (x-api-key):</label>
                      <div className="flex items-center gap-2 bg-parchment p-2 rounded-2xl border border-hairline font-mono text-xs">
                        <span className="flex-1 truncate select-all text-ink font-semibold px-2">
                          {displayKey}
                        </span>

                        <button
                          type="button"
                          onClick={() => setRevealedKeys({ ...revealedKeys, [k.id]: !isRevealed })}
                          className="px-2.5 py-1 rounded-lg bg-canvas text-ink-muted hover:text-ink text-[10px] font-bold border border-hairline transition-colors shrink-0"
                          title={isRevealed ? "Sembunyikan" : "Tampilkan"}
                        >
                          {isRevealed ? "Tutup" : "Lihat"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyKey(k.apiKey, k.id)}
                          className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-bold transition-all shadow-xs shrink-0 flex items-center gap-1"
                        >
                          {copiedId === k.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                              </svg>
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {k.isGopayConnected ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnectGoBiz(k)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-xs transition-colors border border-red-500/20"
                          >
                            Putuskan GoBiz
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenOtpModal(k)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            <span>Hubungkan GoBiz (OTP)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenConfigModal(k)}
                          className="px-3 py-1.5 rounded-xl bg-parchment hover:bg-hairline text-ink font-bold text-xs transition-colors border border-hairline flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Pengaturan QRIS &amp; Webhook</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRenewKey(k)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          <span>Perpanjang (+30 Hari - Rp 10.000)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus API Key"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENTATION */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
            <h2 className="text-lg font-black text-ink">Panduan Integrasi API Ry-ITSolutions Gateway</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Integrasikan sistem pembayaran GoPay &amp; QRIS Dinamis ke website toko online, bot Telegram, atau aplikasi Android Anda hanya dengan 2 endpoint sederhana.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 block">1. Base URL API:</span>
                <code className="text-blue-700 font-mono bg-blue-100/80 px-2 py-0.5 rounded block select-all">
                  https://ry-itsolutionts.web.id
                </code>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                <span className="font-bold text-emerald-900 block">2. Header Autentikasi:</span>
                <code className="text-emerald-700 font-mono bg-emerald-100/80 px-2 py-0.5 rounded block select-all">
                  x-api-key: ry_live_xxxxxxxxxxxxxxxx
                </code>
              </div>
            </div>
          </div>

          {/* Endpoint 1: Create QRIS */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-xs uppercase">POST</span>
              <code className="font-mono text-xs sm:text-sm font-bold text-ink">/create-qris</code>
              <span className="text-xs text-ink-muted">Cetak QRIS Dinamis Sesuai Nominal</span>
            </div>

            <div className="flex items-center gap-1.5 border-b border-hairline pb-2">
              <span className="text-xs font-bold text-ink-muted mr-2">Pilih Bahasa:</span>
              {(["php", "nodejs", "curl", "python"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setDocLang(lang)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    docLang === lang ? "bg-primary text-white" : "bg-parchment text-ink-muted hover:text-ink"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Code Samples */}
            <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
              <pre>
                {docLang === "php" &&
`<?php
$apiKey = "${keys[0]?.apiKey || "ry_live_your_api_key_here"}";
$url = "https://ry-itsolutionts.web.id/create-qris";

$payload = json_encode([
    "amount" => 50000 // Nominal pembayaran (Rupiah)
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: " . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($result && $result['success']) {
    $qrisUrl = $result['data']['qris_url'];   // URL halaman bayar
    $qrisCode = $result['data']['qris_code']; // String EMVCo QRIS
    $trxId = $result['data']['trx_id'];       // ID Transaksi
    
    // Redirect pembeli ke halaman QRIS atau tampilkan QR code
    header("Location: " . $qrisUrl);
    exit;
}`}
                {docLang === "nodejs" &&
`const axios = require('axios');

async function createPayment() {
    const apiKey = "${keys[0]?.apiKey || "ry_live_your_api_key_here"}";
    const res = await axios.post("https://ry-itsolutionts.web.id/create-qris", {
        amount: 50000
    }, {
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json"
        }
    });

    console.log("QRIS Bayar:", res.data.data.qris_url);
    console.log("TRX ID:", res.data.data.trx_id);
}
createPayment();`}
                {docLang === "curl" &&
`curl -X POST "https://ry-itsolutionts.web.id/create-qris" \
  -H "x-api-key: ${keys[0]?.apiKey || "ry_live_your_api_key_here"}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000}'`}
                {docLang === "python" &&
`import requests

api_key = "${keys[0]?.apiKey || "ry_live_your_api_key_here"}"
url = "https://ry-itsolutionts.web.id/create-qris"

res = requests.post(url, json={"amount": 50000}, headers={"x-api-key": api_key})
data = res.json()
print("QRIS Checkout URL:", data["data"]["qris_url"])`}
              </pre>
            </div>
          </div>

          {/* Endpoint 2: Check Payment */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs uppercase">POST / GET</span>
              <code className="font-mono text-xs sm:text-sm font-bold text-ink">/check-payment</code>
              <span className="text-xs text-ink-muted">Cek Status Mutasi GoPay</span>
            </div>

            <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
              <pre>
{`// Cek Status Pembayaran via PHP
$ch = curl_init("https://ry-itsolutionts.web.id/check-payment?amount=50000&trx_id=" . $trxId);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["x-api-key: ${keys[0]?.apiKey || "ry_live_your_api_key_here"}"]);
$res = json_decode(curl_exec($ch), true);

if ($res['paid'] === true) {
    // Pembayaran lunas! Update database toko Anda
    echo "Pembayaran Berhasil Diterima!";
} else {
    echo "Menunggu pembayaran pembeli...";
}`}
              </pre>
            </div>
          </div>

          {/* Webhook Specification */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-black text-xs uppercase">WEBHOOK</span>
              <h3 className="font-black text-sm text-ink">Notifikasi Otomatis (Webhook)</h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Jika Anda mengisi <b>Webhook URL</b> di pengaturan API Key, server kami akan otomatis mengirimkan HTTP POST begitu uang dari pembeli masuk ke rekening GoPay Anda.
            </p>
            <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto">
              <pre>
{`// Contoh Payload yang dikirimkan ke Webhook URL Anda:
{
  "event": "payment.success",
  "status": "PAID",
  "trx_id": "TRX-A8F12B",
  "amount": 50000,
  "merchant_name": "Toko Berkah",
  "timestamp": "2026-09-07T14:30:00.000Z"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: API SANDBOX / TESTER */}
      {activeTab === "tester" && (
        <div className="p-6 rounded-3xl bg-canvas border border-hairline shadow-sm space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-ink">API Sandbox &amp; Live Tester</h2>
            <p className="text-xs text-ink-muted">Uji coba pembuatan QRIS Dinamis langsung dari browser Anda.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Gunakan API Key:</label>
              <select
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-xs font-mono font-bold text-ink focus:border-primary outline-none"
              >
                {keys.map((k) => (
                  <option key={k.id} value={k.apiKey}>
                    {k.name} ({k.apiKey.substring(0, 16)}...)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Nominal Pembayaran (Rp):</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-xs font-bold text-ink focus:border-primary outline-none"
                placeholder="1000"
              />
            </div>
          </div>

          <button
            onClick={handleRunSandboxTest}
            disabled={testLoading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            {testLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengirim Request ke Gateway...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <span>Kirim Test Request (POST /create-qris)</span>
              </>
            )}
          </button>

          {testResult && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-ink">Hasil Respon Gateway:</span>
              <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>

              {testResult?.data?.qris_url && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Halaman QRIS berhasil dibuat!
                  </span>
                  <a
                    href={testResult.data.qris_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Buka Halaman QRIS &gt;
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CREATE API KEY                                      */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-canvas border border-hairline rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-black text-sm sm:text-base text-ink">Buat API Key Baru</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-parchment"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs space-y-1">
              <span className="font-black block">Biaya Langganan: Rp 10.000 / Bulan</span>
              <p className="text-[11px] leading-relaxed">
                Biaya Rp 10.000 akan dipotong langsung dari saldo akun Anda. API Key akan aktif selama 30 hari penuh.
              </p>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Label Nama Toko / Aplikasi *</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Contoh: Toko Diamond ML / Bot Discord"
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">String QRIS Statis GoPay Anda (Opsional)</label>
                <textarea
                  value={createQris}
                  onChange={(e) => setCreateQris(e.target.value)}
                  rows={2}
                  placeholder="00020101021126610014COM.GO-JEK..."
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas font-mono text-[11px] text-ink focus:border-primary outline-none"
                />
                <span className="text-[10px] text-ink-muted block">
                  String QRIS statis dari aplikasi GoBiz / banner toko Anda. Jika dikosongkan, bisa diisi nanti.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Webhook URL (Opsional)</label>
                <input
                  type="url"
                  value={createWebhook}
                  onChange={(e) => setCreateWebhook(e.target.value)}
                  placeholder="https://tokoanda.com/api/webhook-gopay"
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoRenewCreate"
                  checked={createAutoRenew}
                  onChange={(e) => setCreateAutoRenew(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <label htmlFor="autoRenewCreate" className="font-bold text-ink select-none cursor-pointer">
                  Auto-Renew (Otomatis perpanjang tiap bulan jika saldo mencukupi)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-parchment hover:bg-hairline text-ink font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {creating ? "Memproses..." : "Bayar & Buat Key (Rp 10.000)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: GOBIZ OTP PAIRING                                   */}
      {/* ============================================================ */}
      {selectedKeyForOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-canvas border border-hairline rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-black text-sm sm:text-base text-ink">Hubungkan Akun GoBiz</h3>
                <span className="text-[10px] text-ink-muted">Key: {selectedKeyForOtp.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKeyForOtp(null)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-parchment"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Login nomor HP GoBiz Anda untuk menghubungkan mutasi transaksi otomatis. Sesi disimpan 100% aman di server Anda sendiri.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Nomor HP Terdaftar di GoBiz</label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    disabled={otpSent}
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    placeholder="08123456789"
                    className="flex-1 p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleRequestOtp}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs shrink-0"
                    >
                      {otpLoading ? "Mengirim..." : "Kirim OTP"}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 border border-blue-200 animate-in fade-in">
                  <label className="font-bold text-blue-950 block">Masukkan 4 Digit Kode OTP (SMS):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234"
                    className="w-full text-center text-xl font-mono tracking-widest font-black p-2.5 rounded-xl border border-blue-300 bg-white text-blue-900 focus:border-primary outline-none"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Ubah Nomor HP
                    </button>
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleVerifyOtp}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-sm"
                    >
                      {otpLoading ? "Memverifikasi..." : "Verifikasi & Hubungkan"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: KEY SETTINGS (QRIS & WEBHOOK)                       */}
      {/* ============================================================ */}
      {selectedKeyForConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-canvas border border-hairline rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-black text-sm sm:text-base text-ink">Pengaturan API Key</h3>
              <button
                type="button"
                onClick={() => setSelectedKeyForConfig(null)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-parchment"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Label Nama</label>
                <input
                  type="text"
                  required
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">String Template QRIS Statis GoPay</label>
                <textarea
                  rows={3}
                  value={configQris}
                  onChange={(e) => setConfigQris(e.target.value)}
                  placeholder="00020101021126610014COM.GO-JEK..."
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas font-mono text-[11px] text-ink focus:border-primary outline-none"
                />
                <span className="text-[10px] text-ink-muted block">
                  Cetak dinamis akan otomatis memakai QRIS statis ini untuk toko Anda.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Webhook URL Notifikasi</label>
                <input
                  type="url"
                  value={configWebhook}
                  onChange={(e) => setConfigWebhook(e.target.value)}
                  placeholder="https://tokoanda.com/api/gopay-callback"
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink focus:border-primary outline-none"
                />
                <span className="text-[10px] text-ink-muted block">
                  Menerima POST webhook saat ada pembayaran sukses.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoRenewConfig"
                  checked={configAutoRenew}
                  onChange={(e) => setConfigAutoRenew(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <label htmlFor="autoRenewConfig" className="font-bold text-ink select-none cursor-pointer">
                  Auto-Renew Langganan (Potong Saldo Rp 10.000 / bln)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setSelectedKeyForConfig(null)}
                  className="px-4 py-2 rounded-xl bg-parchment hover:bg-hairline text-ink font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-md transition-all"
                >
                  {configSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
