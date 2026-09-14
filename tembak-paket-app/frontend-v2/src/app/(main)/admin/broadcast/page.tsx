"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { Megaphone, RotateCw, Send, Smartphone, MessageSquare, Trash2, Bell, Share2 } from "lucide-react";

export default function AdminBroadcastPage() {
  const [broadcastData, setBroadcastData] = useState({
    title: "PROMO SPESIAL PLATFORM",
    message: "",
    voucherCode: "",
    targetTelegram: true,
    targetWhatsApp: true,
    targetInApp: true,
    targetWebPush: true,
    bgColor: "#0066cc",
  });

  const [pushSubscribersCount, setPushSubscribersCount] = useState<number | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [webBroadcasts, setWebBroadcasts] = useState<any[]>([]);
  const [loadingWebBroadcasts, setLoadingWebBroadcasts] = useState(false);

  const loadPushSubscribers = async () => {
    try {
      const res = await fetch("/api/admin/push/stats", { credentials: "include" });
      const d = await safeJson(res);
      if (d?.status && typeof d.totalSubscribers === "number") {
        setPushSubscribersCount(d.totalSubscribers);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchWebBroadcasts = async () => {
    setLoadingWebBroadcasts(true);
    try {
      const res = await fetch("/api/admin/announcements", { credentials: "include" });
      const d = await safeJson(res);
      if (d && d.status && Array.isArray(d.data)) {
        setWebBroadcasts(d.data);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingWebBroadcasts(false);
    }
  };

  useEffect(() => {
    fetchWebBroadcasts();
    loadPushSubscribers();
  }, []);

  const handleTestMyDevicePush = async () => {
    try {
      const { subscribeToPushNotifications, testPushNotification, isPushSupported } = await import("@/lib/pushClient");
      if (!isPushSupported()) {
        return Swal.fire({ title: "Info", text: "Browser ini tidak mendukung Web Push Notification." });
      }
      const subRes = await subscribeToPushNotifications();
      if (!subRes.success && typeof Notification !== "undefined" && Notification.permission !== "granted") {
        return Swal.fire({ title: "Perhatian", text: subRes.message });
      }
      const testRes = await testPushNotification();
      if (testRes.success) {
        Swal.fire({
          title: "Terkirim",
          text: "Notifikasi tes telah dikirim ke status bar perangkat Anda.",
          timer: 2500,
          showConfirmButton: false,
        });
        loadPushSubscribers();
        import("@/lib/pushClient").then((m) => m.autoSyncPushIfGranted()).catch(() => {});
      } else {
        Swal.fire({ title: "Gagal", text: testRes.message });
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: err.message || "Terjadi kesalahan." });
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.message.trim()) {
      return Swal.fire({ title: "Peringatan", text: "Isi pesan broadcast wajib diisi." });
    }

    const confirmRes = await Swal.fire({
      title: "Kirim Broadcast Promo?",
      text: "Pesan promo akan dipublikasikan ke kanal yang Anda centang.",
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim Sekarang",
      cancelButtonText: "Batal",
    });

    if (!confirmRes.isConfirmed) return;

    setBroadcasting(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(broadcastData),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Sukses", text: d.message || "Broadcast berhasil dikirimkan.", timer: 2000, showConfirmButton: false });
        setBroadcastData((prev) => ({ ...prev, message: "", voucherCode: "" }));
        fetchWebBroadcasts();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal mengirim broadcast." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: e.message || "Terjadi kesalahan jaringan." });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteWebBroadcast = async (id: string) => {
    const resConfirm = await Swal.fire({
      title: "Hapus Broadcast Web?",
      text: "Pengumuman ini tidak akan ditampilkan lagi di website.",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });
    if (!resConfirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/announcement/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await safeJson(res);
      if (d && d.status) {
        Swal.fire({ title: "Berhasil", text: "Broadcast pengumuman berhasil dihapus.", timer: 1200, showConfirmButton: false });
        fetchWebBroadcasts();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal menghapus pengumuman." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Broadcast Pesan Promo & Banner
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Publikasikan pengumuman massal ke WhatsApp pelanggan, Telegram, status bar HP, dan banner web.
          </p>
        </div>
      </div>

      {/* Broadcast Form Card */}
      <Card glass className="p-5 space-y-4">
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">Judul Pengumuman / Event</label>
              <input
                type="text"
                value={broadcastData.title}
                onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                placeholder="Contoh: FLASH SALE DISKON PROMO 12.12"
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline bg-canvas text-xs font-bold text-ink outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">Kode Voucher Diskon (Opsional)</label>
              <input
                type="text"
                value={broadcastData.voucherCode}
                onChange={(e) => setBroadcastData({ ...broadcastData, voucherCode: e.target.value.toUpperCase() })}
                placeholder="Contoh: PROMO1212"
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline bg-canvas text-xs font-mono font-bold text-primary outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">Isi Pesan Broadcast</label>
            <textarea
              rows={4}
              value={broadcastData.message}
              onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
              placeholder="Tuliskan detail promo, diskon yang berlaku, batasan waktu, atau informasi penting lainnya..."
              className="w-full p-3.5 rounded-xl border border-hairline bg-canvas text-xs text-ink outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              required
            />
          </div>

          {/* Target Channel Switches */}
          <div className="p-4 rounded-xl bg-parchment/60 border border-hairline space-y-3">
            <p className="text-xs font-bold text-ink">Pilih Saluran Distribusi Broadcast:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={broadcastData.targetWhatsApp}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetWhatsApp: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">WhatsApp Bot</span>
                  <span className="text-[10px] text-ink-muted">Pesan langsung ke kontak user</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={broadcastData.targetTelegram}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetTelegram: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Telegram Bot</span>
                  <span className="text-[10px] text-ink-muted">Channel / grup resmi</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={broadcastData.targetInApp}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetInApp: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Banner In-App</span>
                  <span className="text-[10px] text-ink-muted">Tampil di dashboard web</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={broadcastData.targetWebPush}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetWebPush: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Push Notifikasi</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-ink-muted">
                      {pushSubscribersCount != null ? `${pushSubscribersCount} HP terdaftar` : "Status bar HP"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTestMyDevicePush();
                      }}
                      className="text-[10px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20"
                    >
                      Uji HP
                    </button>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <Button type="submit" isLoading={broadcasting} className="w-full text-xs font-bold h-10 gap-2">
            <Send className="w-3.5 h-3.5" />
            Kirim Broadcast Sekarang
          </Button>
        </form>
      </Card>

      {/* Active In-App Broadcasts Manager */}
      <Card glass className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <span>Daftar Broadcast In-App Aktif di Website</span>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Banner berikut tampil secara bergantian pada beranda dan dashboard pelanggan.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWebBroadcasts}
            isLoading={loadingWebBroadcasts}
            className="text-xs gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingWebBroadcasts ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {webBroadcasts.length === 0 ? (
          <div className="py-8 text-center text-ink-muted text-xs border border-dashed rounded-xl">
            Belum ada broadcast in-app aktif di website.
          </div>
        ) : (
          <div className="space-y-2.5">
            {webBroadcasts.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-hairline bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-black shadow-xs"
                    style={{ backgroundColor: item.bgColor || "#0066cc" }}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink leading-relaxed break-words">{item.message}</p>
                    <div className="flex items-center gap-2 text-[10px] text-ink-muted mt-1">
                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Baru saja"}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-primary font-bold">ID: {item.id}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteWebBroadcast(item.id)}
                  className="text-xs shrink-0 self-end sm:self-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
