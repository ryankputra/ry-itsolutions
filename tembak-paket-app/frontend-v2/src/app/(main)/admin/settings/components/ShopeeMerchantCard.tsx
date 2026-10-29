"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Key, RotateCw, Check, ShieldCheck, AlertCircle } from "lucide-react";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";

export function ShopeeMerchantCard() {
  const [shoppepayStatus, setShoppepayStatus] = useState<any>({ token_status: "unknown" });
  const [inputShopeeToken, setInputShopeeToken] = useState("");
  const [inputShopeeQris, setInputShopeeQris] = useState("");
  const [updatingShopee, setUpdatingShopee] = useState(false);

  const loadShopeePayStatus = async () => {
    try {
      const res = await fetch("/api/admin/shoppepay/status", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status) {
        setShoppepayStatus(d.data || {});
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadShopeePayStatus();
  }, []);

  const updateShopeeToken = async () => {
    if (!inputShopeeToken.trim()) {
      Swal.fire({ title: "Perhatian", text: "Token ShopeePay wajib diisi.", icon: "warning" });
      return;
    }
    setUpdatingShopee(true);
    try {
      const res = await fetch("/api/admin/shoppepay/update-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shoppepayToken: inputShopeeToken, qrisStatic: inputShopeeQris }),
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({
          title: "Berhasil",
          html: `<div class="text-left text-xs space-y-1"><p><b>Status:</b> Terhubung & Aktif</p><p><b>Detail:</b> ${
            d.message || "Token ShopeePay berhasil diperbarui."
          }</p></div>`,
          icon: "success",
        });
        setInputShopeeToken("");
        loadShopeePayStatus();
      } else {
        Swal.fire({
          title: "Koneksi Gagal",
          html: `<div class="text-left text-xs space-y-1"><p class="text-rose-600 font-bold">Respon Server:</p><p class="font-mono bg-canvas-muted p-2 rounded">${
            d?.message || "Gagal memperbarui token / Unauthorized."
          }</p></div>`,
          icon: "error",
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: "Error Jaringan",
        html: `<div class="text-left text-xs space-y-1"><p class="text-rose-600 font-bold">Keterangan:</p><p class="font-mono bg-canvas-muted p-2 rounded">${
          err.message || "Gagal menghubungi ShopeePay API Gateway."
        }</p></div>`,
        icon: "error",
      });
    } finally {
      setUpdatingShopee(false);
    }
  };

  return (
    <Card glass className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline pb-3">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <Key className="w-4 h-4 text-orange-500" />
            Setup ShopeePay Merchant (Mitra Utama)
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Masukkan Token ShopeePay Partner (`B:...`) dan QRIS Statis toko mitra Anda untuk otomatisasi mutasi & QRIS dinamis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              shoppepayStatus?.token_status === "valid"
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
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
            type="text"
            value={inputShopeeToken}
            onChange={(e) => setInputShopeeToken(e.target.value)}
            placeholder="Tempel SHOPEE_TOKEN di sini (diawali B:...)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary font-mono"
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
            className="w-full px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas text-ink font-medium focus:outline-none focus:border-primary font-mono"
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
  );
}
