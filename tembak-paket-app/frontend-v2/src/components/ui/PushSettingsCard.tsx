"use client";

import React, { useEffect, useState } from "react";
import { Bell, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import Swal from "@/lib/sweetalert";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  autoSyncPushIfGranted,
  testPushNotification
} from "@/lib/pushClient";

export const PushSettingsCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const refreshStatus = () => {
    if (typeof window === "undefined") return;
    const supp = isPushSupported();
    setSupported(supp);
    if (supp) {
      setPermission(getNotificationPermission());
    }
  };

  useEffect(() => {
    refreshStatus();
    // Silently sync if already granted
    autoSyncPushIfGranted().then(() => refreshStatus()).catch(() => {});
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await subscribeToPushNotifications();
      refreshStatus();
      if (res.success) {
        Swal.fire({
          title: "Berhasil Diaktifkan! 🔔",
          text: "Status bar HP Anda kini terhubung dan akan berdering saat ada layanan baru atau promo.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false
        });
        // Auto test
        await testPushNotification();
      } else {
        if (Notification.permission === "denied") {
          Swal.fire({
            title: "Izin Diblokir",
            text: "Izin notifikasi diblokir di browser. Ketuk ikon gembok 🔒 di sebelah alamat web browser Anda -> Izin -> Izinkan Notifikasi.",
            icon: "warning"
          });
        } else {
          Swal.fire("Perhatian", res.message, "info");
        }
      }
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testPushNotification();
      if (res.success) {
        Swal.fire({
          title: "Notifikasi Terkirim! 🔔",
          text: "Periksa bilah notifikasi di bagian atas layar HP Anda sekarang.",
          icon: "success",
          timer: 3500,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          title: "Gagal Mengirim",
          text: res.message || "Pastikan notifikasi sudah diaktifkan di perangkat ini.",
          icon: "error"
        });
      }
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setTesting(false);
    }
  };

  if (!supported) return null;

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <div className={`rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-hairline/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-ink flex items-center gap-1.5">
              <span>Notifikasi Bilah / Status Bar HP</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </h3>
            <p className="text-[10px] sm:text-[11px] text-ink-muted">
              Pemberitahuan berdering langsung di layar atas HP saat ada produk & promo baru
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isGranted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Aktif di HP Ini
            </span>
          ) : isDenied ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <AlertCircle className="w-3 h-3" />
              Diblokir Browser
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Belum Aktif
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          {isGranted
            ? "Perangkat HP ini sudah terhubung. Anda dapat mengetuk tombol Uji untuk mencoba notifikasi berdering."
            : isDenied
            ? "Izin notifikasi diblokir. Ketuk ikon gembok 🔒 pada URL bar browser Anda untuk mengizinkan."
            : "Aktifkan agar Anda langsung mendapat notifikasi di status bar HP saat ada layanan baru (misal: Unblock IMEI Fast)."}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {!isGranted && (
            <Button
              size="sm"
              onClick={handleActivate}
              isLoading={loading}
              className="h-8 px-3.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90"
            >
              Aktifkan di HP Ini
            </Button>
          )}

          {isGranted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              isLoading={testing}
              className="h-8 px-3 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>🔔 Tes Notifikasi HP</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
