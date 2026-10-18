"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrCode, Key, Shield, RotateCw, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";

export default function AdminGatewayPage() {
  const [loading, setLoading] = useState(true);
  const [dualMode, setDualMode] = useState("rotate");
  const [shoppepayUrl, setShoppepayUrl] = useState("http://127.0.0.1:3003");
  const [paymentCounter, setPaymentCounter] = useState(0);
  const [savingDual, setSavingDual] = useState(false);

  // ShopeePay Merchant State
  const [shoppepayStatus, setShoppepayStatus] = useState<any>(null);
  const [inputShopeeToken, setInputShopeeToken] = useState("");
  const [inputShopeeQris, setInputShopeeQris] = useState("");
  const [updatingShopee, setUpdatingShopee] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const resDual = await fetch("/api/admin/dual-gateway", { credentials: "include" });
      const dDual = await resDual.json();
      if (dDual?.status) {
        setDualMode(dDual.mode || "rotate");
        setShoppepayUrl(dDual.shoppepayUrl || "http://127.0.0.1:3003");
        setPaymentCounter(dDual.counter || 0);
      }

      const resShopee = await fetch("/api/admin/shoppepay-status", { credentials: "include" });
      const dShopee = await resShopee.json();
      if (dShopee) {
        setShoppepayStatus(dShopee);
        if (dShopee.qris_statis) setInputShopeeQris(dShopee.qris_statis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveDualGateway = async () => {
    setSavingDual(true);
    try {
      const res = await fetch("/api/admin/dual-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: dualMode, shoppepayUrl }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire({ title: "Berhasil", text: "Pengaturan Dual Gateway disimpan.", icon: "success", timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal menyimpan.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    } finally {
      setSavingDual(false);
    }
  };

  const updateShopeeToken = async () => {
    if (!inputShopeeToken.trim()) {
      Swal.fire({ title: "Peringatan", text: "Token ShopeePay tidak boleh kosong.", icon: "warning" });
      return;
    }
    setUpdatingShopee(true);
    try {
      const res = await fetch("/api/admin/shoppepay-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: inputShopeeToken, qris_statis: inputShopeeQris }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire({ title: "Berhasil", text: "Token ShopeePay berhasil diperbarui.", icon: "success", timer: 2000, showConfirmButton: false });
        setInputShopeeToken("");
        loadData();
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal memperbarui token.", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan.", icon: "error" });
    } finally {
      setUpdatingShopee(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="p-2 rounded-xl bg-canvas border border-hairline hover:bg-canvas-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-ink" />
            </Link>
            <h1 className="text-xl font-bold text-ink">Manajemen Langganan Payment Gateway</h1>
          </div>
          <p className="text-xs text-ink-muted">
            Kelola konfigurasi Dual Gateway (GoPay & ShopeePay Merchant) dan setup token mutasi QRIS.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Dual Gateway Rotator (GoPay & ShopeePay) */}
        <Card glass className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-500" />
                Dual Gateway Rotator (GoPay & ShopeePay)
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Atur rotasi otomatis atau prioritas manual pembayaran antara akun Anda (GoPay) dan akun pacar Anda (ShopeePay).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted">Total Counter: {paymentCounter}</span>
              <Button size="sm" onClick={saveDualGateway} disabled={savingDual} className="text-xs gap-1.5 font-bold">
                {savingDual ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simpan Dual Gateway
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                Mode Gateway
              </label>
              <select
                value={dualMode}
                onChange={(e) => setDualMode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary"
              >
                <option value="rotate">🔄 Rotasi Otomatis (Ganjil GoPay, Genap ShopeePay)</option>
                <option value="gopay">📌 Prioritas Utama GoPay (GoBiz Anda)</option>
                <option value="shoppepay">📌 Prioritas Utama ShopeePay (Shopee Merchant Pacar)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                URL ShopeePay API Gateway (Port 3003)
              </label>
              <input
                type="text"
                value={shoppepayUrl}
                onChange={(e) => setShoppepayUrl(e.target.value)}
                placeholder="http://127.0.0.1:3003"
                className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </Card>

        {/* ShopeePay Merchant Setup Card */}
        <Card glass className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-500" />
                Setup ShopeePay Merchant (Akun Pacar)
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Masukkan Token ShopeePay Partner (`B:...`) dan QRIS Statis toko pacar Anda untuk otomatisasi mutasi & QRIS dinamis.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                shoppepayStatus?.token_status === "valid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              }`}>
                Status: {shoppepayStatus?.token_status === "valid" ? "Terhubung & Aktif" : shoppepayStatus?.token_status || "Belum Dikonfigurasi"}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                ShopeeToken (`B: ...`)
              </label>
              <input
                type="password"
                value={inputShopeeToken}
                onChange={(e) => setInputShopeeToken(e.target.value)}
                placeholder="Tempel SHOPEE_TOKEN di sini (diawali B:...)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                QRIS Statis ShopeePay Merchant (Opsional)
              </label>
              <input
                type="text"
                value={inputShopeeQris}
                onChange={(e) => setInputShopeeQris(e.target.value)}
                placeholder="00020101021126610016ID.CO.SHOPEE..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={updateShopeeToken} disabled={updatingShopee} className="text-xs gap-1.5 font-bold">
              {updatingShopee ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Simpan & Update Token ShopeePay
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
