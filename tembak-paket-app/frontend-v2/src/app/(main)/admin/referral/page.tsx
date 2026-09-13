"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { Share2 } from "lucide-react";

export default function AdminReferralPage() {
  const [refSettings, setRefSettings] = useState<any>({
    referral_enabled: true,
    referral_commission_type: "fixed",
    referral_commission_value: 5000,
    referral_new_user_discount: 5000,
  });
  const [loadingRefSettings, setLoadingRefSettings] = useState(false);
  const [savingRefSettings, setSavingRefSettings] = useState(false);

  const loadRefSettings = async () => {
    setLoadingRefSettings(true);
    try {
      const res = await fetch("/api/admin/referral-settings", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && d.data) {
        setRefSettings(d.data);
      }
    } catch (e) {
    } finally {
      setLoadingRefSettings(false);
    }
  };

  useEffect(() => {
    loadRefSettings();
  }, []);

  const handleSaveRefSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRefSettings(true);
    try {
      const res = await fetch("/api/admin/referral-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          referral_enabled: refSettings.referral_enabled === "true" || refSettings.referral_enabled === true,
          referral_commission_type: refSettings.referral_commission_type,
          referral_commission_value: refSettings.referral_commission_value,
          referral_new_user_discount: refSettings.referral_new_user_discount,
        }),
      });
      const d = await safeJson(res);
      if (d?.status) {
        Swal.fire({
          icon: "success",
          title: "Pengaturan Disimpan",
          text: "Konfigurasi komisi referral berhasil diperbarui.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", d?.message || "Gagal menyimpan pengaturan.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghubungi server.", "error");
    } finally {
      setSavingRefSettings(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card glass className="p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-hairline pb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Pengaturan Sistem Referral & Komisi</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Kelola besaran komisi saldo untuk mitra referral dan diskon member baru.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveRefSettings} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-canvas border border-hairline space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-xs text-ink">Aktifkan Sistem Referral</p>
                <p className="text-[11px] text-ink-muted">
                  Jika aktif, seluruh pengguna mendapatkan kode referral unik untuk mengajak teman.
                </p>
              </div>
              <input
                type="checkbox"
                checked={refSettings.referral_enabled === "true" || refSettings.referral_enabled === true}
                onChange={(e) =>
                  setRefSettings({
                    ...refSettings,
                    referral_enabled: e.target.checked ? "true" : "false",
                  })
                }
                className="w-4 h-4 text-primary rounded border-hairline"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink/80">Tipe Komisi Upline</label>
              <select
                className="w-full h-10 rounded-lg border border-hairline px-3 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
                value={refSettings.referral_commission_type || "fixed"}
                onChange={(e) =>
                  setRefSettings({ ...refSettings, referral_commission_type: e.target.value })
                }
              >
                <option value="fixed">Nominal Tetap (Rp)</option>
                <option value="percent">Persentase (%)</option>
              </select>
            </div>

            <Input
              label="Nilai Komisi Upline (Per Order Sukses)"
              type="number"
              placeholder="5000"
              value={refSettings.referral_commission_value || ""}
              onChange={(e) =>
                setRefSettings({ ...refSettings, referral_commission_value: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Diskon Saldo Pengguna Baru (Rp)"
              type="number"
              placeholder="5000"
              value={refSettings.referral_new_user_discount || ""}
              onChange={(e) =>
                setRefSettings({ ...refSettings, referral_new_user_discount: e.target.value })
              }
            />
          </div>

          <Button type="submit" isLoading={savingRefSettings} className="w-full text-xs font-bold h-10">
            Simpan Pengaturan Referral
          </Button>
        </form>
      </Card>
    </div>
  );
}
