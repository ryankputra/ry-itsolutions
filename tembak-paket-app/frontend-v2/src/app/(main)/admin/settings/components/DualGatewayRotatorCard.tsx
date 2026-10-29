"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  QrCode,
  RotateCw,
  Check,
  Zap,
  Activity,
  Server,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import Swal from "@/lib/sweetalert";

interface GatewayHealth {
  online: boolean;
  message: string;
  latency_ms: number | null;
  details?: any;
}

interface DualGatewayRotatorCardProps {
  onSaved?: () => void;
}

export function DualGatewayRotatorCard({ onSaved }: DualGatewayRotatorCardProps) {
  const [dualMode, setDualMode] = useState<string>("rotate");
  const [rotateStart, setRotateStart] = useState<string>("gopay");
  const [paymentCounter, setPaymentCounter] = useState<number>(0);
  const [shoppepayUrl, setShoppepayUrl] = useState<string>("http://127.0.0.1:3003");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingHealth, setTestingHealth] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  // Health states
  const [healthData, setHealthData] = useState<{
    gopay: GatewayHealth;
    shoppepay: GatewayHealth;
  } | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/dual-gateway", { credentials: "include" });
      const d = await res.json().catch(() => null);
      if (d?.status) {
        setDualMode(d.mode || "rotate");
        setRotateStart(d.rotate_start || "gopay");
        setPaymentCounter(d.counter ?? 0);
        setShoppepayUrl(d.shoppepay_url || "http://127.0.0.1:3003");
      }
    } catch (e) {
      console.error("Failed to load dual gateway config", e);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    setTestingHealth(true);
    try {
      const res = await fetch("/api/admin/dual-gateway/health", { credentials: "include" });
      const d = await res.json().catch(() => null);
      if (d?.status && d.data) {
        setHealthData(d.data);
      }
    } catch (e) {
      console.error("Failed to check gateway health", e);
    } finally {
      setTestingHealth(false);
    }
  };

  useEffect(() => {
    loadData();
    checkHealth();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/dual-gateway", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: dualMode,
          rotate_start: rotateStart,
          shoppepay_url: shoppepayUrl,
        }),
      });
      const d = await res.json().catch(() => null);
      if (d?.status) {
        Swal.fire({
          title: "Berhasil",
          text: d.message || "Dual Gateway berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false,
          icon: "success",
        });
        loadData();
        if (onSaved) onSaved();
      } else {
        Swal.fire({
          title: "Gagal",
          text: d?.message || "Gagal menyimpan konfigurasi.",
          icon: "error",
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: "Error",
        text: err.message || "Terjadi kesalahan jaringan.",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    const confirm = await Swal.fire({
      title: "Reset Counter Rotasi?",
      text: "Counter pembayaran akan dikembalikan ke 0 sehingga giliran kembali ke urutan pertama.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Reset ke 0",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
    });

    if (!confirm.isConfirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/dual-gateway/reset-counter", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json().catch(() => null);
      if (d?.status) {
        Swal.fire({
          title: "Counter Direset",
          text: "Counter rotasi sekarang adalah 0.",
          timer: 1500,
          showConfirmButton: false,
          icon: "success",
        });
        setPaymentCounter(0);
      }
    } catch (e: any) {
      Swal.fire({ title: "Gagal", text: e.message, icon: "error" });
    } finally {
      setResetting(false);
    }
  };

  const handleSimulateRotation = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/admin/dual-gateway/simulate-rotation", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json().catch(() => null);
      if (d?.status && d.data) {
        setPaymentCounter(d.data.newCounter);
        Swal.fire({
          title: "🔄 Rolling Berhasil!",
          html: `<div class="text-left text-xs space-y-1">
            <p><b>Counter Lama:</b> #${d.data.oldCounter}</p>
            <p><b>Counter Baru:</b> #${d.data.newCounter}</p>
            <p><b>Giliran Berikutnya:</b> <span class="uppercase text-emerald-600 font-bold">${d.data.nextGateway}</span></p>
          </div>`,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal simulasi rotasi", icon: "error" });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: e.message, icon: "error" });
    } finally {
      setSimulating(false);
    }
  };

  // Determine which gateway is currently active based on rotation & counter
  const getActiveGateway = (counterVal: number) => {
    if (dualMode === "gopay") return "gopay";
    if (dualMode === "shoppepay") return "shoppepay";
    const isEven = counterVal % 2 === 0;
    if (rotateStart === "shoppepay") {
      return isEven ? "shoppepay" : "gopay";
    }
    return isEven ? "gopay" : "shoppepay";
  };

  const activeNow = getActiveGateway(paymentCounter);
  const activeNext = getActiveGateway(paymentCounter + 1);

  return (
    <Card glass className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Dual Gateway Rotator (GoPay & ShopeePay)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Dual Engine Active
                </span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Otomatis membagi transaksi QRIS dinamis secara bergantian antara GoPay Direct & ShopeePay Mitra untuk memperlancar penerimaan dana.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            disabled={testingHealth}
            className="text-xs h-8 gap-1.5 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingHealth ? "animate-spin" : ""}`} />
            Cek Ping Live
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs h-8 gap-1.5 font-bold bg-primary text-white"
          >
            {saving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Simpan Konfigurasi
          </Button>
        </div>
      </div>

      {/* Gateway Status Cards (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GoPay Gateway Card */}
        <div
          className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
            activeNow === "gopay"
              ? "bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20"
              : "bg-canvas border-hairline"
          }`}
        >
          {activeNow === "gopay" && (
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              Giliran Aktif
            </div>
          )}

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                GP
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  GoPay Direct Gateway
                  <span className="text-[10px] text-ink-muted font-normal">(Port 3002)</span>
                </h4>
                <p className="text-[11px] text-ink-muted">Akun Utama Merchant GoPay</p>
              </div>
            </div>

            <div className="text-right">
              {healthData?.gopay ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    healthData.gopay.online
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      healthData.gopay.online ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  ></span>
                  {healthData.gopay.online ? `Online (${healthData.gopay.latency_ms ?? 0}ms)` : "Offline"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-canvas-muted text-ink-muted">
                  Memeriksa...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] pt-2 border-t border-hairline/60">
            <div className="flex justify-between items-center text-ink-muted">
              <span>Endpoint Target:</span>
              <span className="font-mono text-ink font-medium">http://127.0.0.1:3002</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Fungsi:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">QRIS Dinamis & Mutasi Polling</span>
            </div>
          </div>
        </div>

        {/* ShopeePay Gateway Card */}
        <div
          className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
            activeNow === "shoppepay"
              ? "bg-orange-500/5 border-orange-500/40 shadow-sm ring-1 ring-orange-500/20"
              : "bg-canvas border-hairline"
          }`}
        >
          {activeNow === "shoppepay" && (
            <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              Giliran Aktif
            </div>
          )}

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm">
                SP
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  ShopeePay Partner Gateway
                  <span className="text-[10px] text-ink-muted font-normal">(Port 3003)</span>
                </h4>
                <p className="text-[11px] text-ink-muted">Akun Mitra ShopeePay Merchant</p>
              </div>
            </div>

            <div className="text-right">
              {healthData?.shoppepay ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    healthData.shoppepay.online
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      healthData.shoppepay.online ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  ></span>
                  {healthData.shoppepay.online ? `Online (${healthData.shoppepay.latency_ms ?? 0}ms)` : "Offline"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-canvas-muted text-ink-muted">
                  Memeriksa...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] pt-2 border-t border-hairline/60">
            <div className="flex justify-between items-center text-ink-muted">
              <span>Endpoint Target:</span>
              <span className="font-mono text-ink font-medium">{shoppepayUrl}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Fungsi:</span>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">QRIS Dinamis & Auto-Polling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rotation Status Bar */}
      <div className="p-4 bg-gradient-to-r from-canvas to-canvas-muted border border-hairline rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-ink font-bold">Status Rotasi Berjalan:</span>
            <span className="font-mono px-2 py-0.5 rounded-md bg-canvas border border-hairline text-[11px] font-bold text-ink">
              Counter #{paymentCounter}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <span>Giliran Transaksi Saat Ini:</span>
            <span className="font-bold text-primary capitalize">{activeNow}</span>
            <span>•</span>
            <span>Berikutnya:</span>
            <span className="font-bold text-ink capitalize">{activeNext}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSimulateRotation}
            disabled={simulating}
            className="text-[11px] h-7 px-2.5 text-primary hover:text-primary-focus border-primary/30 gap-1 bg-primary/5"
          >
            <Zap className={`w-3 h-3 ${simulating ? "animate-spin" : ""}`} />
            Uji Rolling (Simulasi +1)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleResetCounter}
            disabled={resetting}
            className="text-[11px] h-7 px-2.5 text-ink-muted hover:text-ink gap-1"
          >
            <RotateCw className="w-3 h-3" />
            Reset Counter
          </Button>
        </div>
      </div>

      {/* Controls Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div>
          <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            Mode Gateway
          </label>
          <select
            value={dualMode}
            onChange={(e) => setDualMode(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary shadow-sm"
          >
            <option value="rotate">🔄 Rotasi Otomatis (50:50 Bergantian)</option>
            <option value="gopay">📌 Prioritas Utama GoPay Saja</option>
            <option value="shoppepay">📌 Prioritas Utama ShopeePay Saja</option>
          </select>
        </div>

        {dualMode === "rotate" && (
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
              Mulai Rotasi Pertama Dari
            </label>
            <select
              value={rotateStart}
              onChange={(e) => setRotateStart(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="gopay">GoPay Duluan (Lalu ShopeePay)</option>
              <option value="shoppepay">ShopeePay Duluan (Lalu GoPay)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
            URL ShopeePay API Gateway
          </label>
          <input
            type="text"
            value={shoppepayUrl}
            onChange={(e) => setShoppepayUrl(e.target.value)}
            placeholder="http://127.0.0.1:3003"
            className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary shadow-sm"
          />
        </div>
      </div>
    </Card>
  );
}
