"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  RotateCw,
  Power,
  Activity,
  CreditCard,
} from "lucide-react";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";

export function GopaySetupCard() {
  const [gopayStatus, setGopayStatus] = useState<any>(null);
  const [loadingGopay, setLoadingGopay] = useState(false);
  const [gopayPhone, setGopayPhone] = useState("082342392781");
  const [gopayOtp, setGopayOtp] = useState("");
  const [gopayOtpSent, setGopayOtpSent] = useState(false);
  const [gopayRequestingOtp, setGopayRequestingOtp] = useState(false);
  const [gopayVerifyingOtp, setGopayVerifyingOtp] = useState(false);
  const [inputGopayQris, setInputGopayQris] = useState("");
  const [updatingGopayQris, setUpdatingGopayQris] = useState(false);

  const loadGopayStatus = async () => {
    setLoadingGopay(true);
    try {
      const res = await fetch("/api/admin/gopay/status", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && d.data) {
        setGopayStatus(d.data);
        if (d.data.qris_string) {
          setInputGopayQris(d.data.qris_string);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingGopay(false);
    }
  };

  useEffect(() => {
    loadGopayStatus();
  }, []);

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
      const res = await fetch("/api/admin/gopay/logout", { method: "POST", credentials: "include" });
      const d = await safeJson(res);
      if (d?.status || d?.success) {
        Swal.fire({ title: "Terputus", text: d?.message || "Sesi GoPay telah logout.", timer: 1500, showConfirmButton: false });
        loadGopayStatus();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal logout GoPay." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: e?.message || "Gagal menghubungi server." });
    } finally {
      setLoadingGopay(false);
    }
  };

  const handleCheckGopayEndpoint = async () => {
    setLoadingGopay(true);
    try {
      const res = await fetch("/api/admin/gopay/check-endpoint", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({
          title: "Endpoint Aktif",
          html: `<div class="text-left text-xs space-y-1"><p><b>Host:</b> ${d.host}</p><p><b>Status:</b> ${d.message}</p></div>`,
          icon: "success",
        });
      } else {
        Swal.fire({ title: "Kendala", text: d?.message || "Gateway offline.", icon: "warning" });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: e?.message || "Koneksi gagal", icon: "error" });
    } finally {
      setLoadingGopay(false);
    }
  };

  const updateGopayQris = async () => {
    setUpdatingGopayQris(true);
    try {
      const res = await fetch("/api/admin/gopay/update-qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ qrisStatic: inputGopayQris }),
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({ title: "Berhasil", text: "QRIS Statis GoPay berhasil disimpan.", icon: "success" });
        loadGopayStatus();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal menyimpan QRIS GoPay", icon: "error" });
      }
    } catch (err) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan.", icon: "error" });
    } finally {
      setUpdatingGopayQris(false);
    }
  };

  return (
    <Card glass className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-500" />
            GoPay Direct Gateway (Port 3002)
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Integrasi GoPay Merchant mandiri tanpa pihak ketiga. Otomatis cek mutasi via sesi GoBiz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gopayStatus?.token_status === "valid" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aktif (GoBiz)
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
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                Token Valid
              </span>
            </p>
            <p className="text-ink-muted text-[11px]">
              Outlet: <b>{gopayStatus.outlet_name || gopayStatus.session_info?.outlet_name || "Merchant"}</b> &bull; No HP:{" "}
              {gopayStatus.phone_number || gopayStatus.session_info?.phone_number || gopayStatus.gopayPhone || "-"}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
              QRIS Statis GoPay Merchant (GoBiz)
            </label>
            <input
              type="text"
              value={inputGopayQris}
              onChange={(e) => setInputGopayQris(e.target.value)}
              placeholder="00020101021126610014COM.GO-JEK..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={updateGopayQris} disabled={updatingGopayQris} className="text-xs gap-1.5 font-bold">
              {updatingGopayQris ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Simpan QRIS GoPay
            </Button>
          </div>

          <div className="flex gap-2 pt-2 border-t border-hairline">
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
  );
}
