"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { MessageSquare, Star, Trash2, Upload, RotateCw, Send, ShieldCheck, X } from "lucide-react";

export default function AdminReviewsPage() {
  const [adminReviewsList, setAdminReviewsList] = useState<any[]>([]);
  const [loadingAdminReviews, setLoadingAdminReviews] = useState(false);

  const [dummyReviewForm, setDummyReviewForm] = useState({
    userName: "",
    userAvatar: "",
    productId: "unblock-imei",
    serviceType: "imei",
    variation: "GARANSI 3 BULAN (MASA AKTIF SINYAL)",
    rating: 5,
    comment: "",
    images: [] as string[],
    likesCount: 5,
    userRole: "Pembeli Terverifikasi",
    userTotalOrders: 12,
    userJoinedAt: "2026-01-15T08:30:00.000Z",
    transactionDate: new Date().toISOString().substring(0, 10),
  });

  const loadAdminReviews = () => {
    setLoadingAdminReviews(true);
    fetch("/api/reviews?productId=all", { credentials: "include" })
      .then((r) => safeJson(r))
      .then((data) => {
        if (data?.status && data?.reviews) {
          setAdminReviewsList(data.reviews);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAdminReviews(false));
  };

  useEffect(() => {
    loadAdminReviews();
  }, []);

  const handleDummyImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDummyReviewForm((prev) => ({
            ...prev,
            images: [...(prev.images || []), event.target!.result as string].slice(0, 3),
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateDummyReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dummyReviewForm.userName.trim() || !dummyReviewForm.comment.trim()) {
      Swal.fire({ title: "Form Kurang Lengkap", text: "Nama Pengguna dan Komentar Ulasan wajib diisi." });
      return;
    }
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dummyReviewForm),
      });
      const data = await safeJson(res);
      if (res.ok && data.status) {
        Swal.fire({ title: "Berhasil", text: "Ulasan dummy baru berhasil ditambahkan ke web.", timer: 1500, showConfirmButton: false });
        setDummyReviewForm({
          userName: "",
          userAvatar: "",
          productId: "unblock-imei",
          serviceType: "imei",
          variation: "GARANSI 3 BULAN (MASA AKTIF SINYAL)",
          rating: 5,
          comment: "",
          images: [],
          likesCount: 5,
          userRole: "Pembeli Terverifikasi",
          userTotalOrders: 12,
          userJoinedAt: "2026-01-15T08:30:00.000Z",
          transactionDate: new Date().toISOString().substring(0, 10),
        });
        loadAdminReviews();
      } else {
        Swal.fire({ title: "Gagal", text: data?.message || "Gagal menyimpan ulasan dummy." });
      }
    } catch (e) {
      Swal.fire({ title: "Error Jaringan", text: "Gagal menghubungi server." });
    }
  };

  const handleDeleteAdminReview = async (reviewId: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Ulasan Ini?",
      text: "Ulasan akan dihapus permanen dari sistem.",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE", credentials: "include" });
      const data = await safeJson(res);
      if (res.ok && data.status) {
        Swal.fire({ title: "Dihapus", text: "Ulasan berhasil dihapus.", timer: 1200, showConfirmButton: false });
        loadAdminReviews();
      } else {
        Swal.fire({ title: "Gagal", text: data?.message || "Gagal menghapus ulasan." });
      }
    } catch (e) {
      Swal.fire({ title: "Error Jaringan", text: "Gagal menghubungi server." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Kelola Ulasan Pelanggan
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Manajemen ulasan testimoni pembeli, proof screenshot sinyal, dan ulasan sistem.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadAdminReviews} className="gap-2 text-xs">
          <RotateCw className={`w-3.5 h-3.5 ${loadingAdminReviews ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Form Input Ulasan */}
      <Card glass className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Buat Ulasan Pelanggan Baru
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
            Manual / Dummy Generator
          </span>
        </div>

        <form onSubmit={handleCreateDummyReview} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Nama Pelanggan"
              placeholder="Contoh: Budi Santoso"
              value={dummyReviewForm.userName}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, userName: e.target.value })}
              required
            />
            <Input
              label="URL Avatar (Opsional)"
              placeholder="https://... (kosongkan untuk inisial default)"
              value={dummyReviewForm.userAvatar}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, userAvatar: e.target.value })}
            />
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">ID Produk Terkait</label>
              <select
                value={dummyReviewForm.productId}
                onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, productId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs focus:border-primary outline-none"
              >
                <option value="unblock-imei">unblock-imei (Layanan IMEI & Sinyal)</option>
                <option value="paket-telkomsel">paket-telkomsel (Paket Data Telkomsel)</option>
                <option value="paket-indosat">paket-indosat (Paket Data Indosat)</option>
                <option value="paket-xl">paket-xl (Paket Data XL / Axis)</option>
                <option value="gateway-saas">gateway-saas (Langganan Gateway)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Variasi Garansi / Paket</label>
              <select
                value={dummyReviewForm.variation}
                onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, variation: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs focus:border-primary outline-none"
              >
                <option value="GARANSI 1 BULAN (MASA AKTIF SINYAL)">Garansi 1 Bulan</option>
                <option value="GARANSI 3 BULAN (MASA AKTIF SINYAL)">Garansi 3 Bulan</option>
                <option value="GARANSI 1 TAHUN (MASA AKTIF SINYAL)">Garansi 1 Tahun</option>
                <option value="GARANSI PERMANEN (SEUMUR HIDUP)">Garansi Permanen</option>
                <option value="Paket Flash 50GB 30 Hari">Paket Flash 50GB</option>
                <option value="Paket Unlimited Bulanan">Paket Unlimited</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Rating Bintang (1 - 5)</label>
              <select
                value={dummyReviewForm.rating}
                onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, rating: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs focus:border-primary outline-none font-bold"
              >
                <option value={5}>5 Bintang (Sempurna)</option>
                <option value={4}>4 Bintang (Sangat Baik)</option>
                <option value={3}>3 Bintang (Cukup)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Label Pembeli</label>
              <select
                value={dummyReviewForm.userRole}
                onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, userRole: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs focus:border-primary outline-none"
              >
                <option value="Pembeli Terverifikasi">Pembeli Terverifikasi</option>
                <option value="Member VIP Reseller">Member VIP Reseller</option>
                <option value="Pelanggan Prioritas">Pelanggan Prioritas</option>
              </select>
            </div>

            <Input
              label="Jumlah Like Terbantu"
              type="number"
              placeholder="5"
              value={dummyReviewForm.likesCount}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, likesCount: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Total Pesanan Sukses"
              type="number"
              placeholder="12"
              value={dummyReviewForm.userTotalOrders}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, userTotalOrders: Number(e.target.value) })}
            />
            <Input
              label="Tanggal Transaksi (YYYY-MM-DD)"
              type="date"
              value={dummyReviewForm.transactionDate}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, transactionDate: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-ink">Komentar Ulasan Pelanggan</label>
            <textarea
              placeholder="Contoh: iPhone 13 Pro garansi 3 bulan sinyal 4G & 5G langsung keluar kilat dalam 2 jam. CS ramah dan responsif."
              value={dummyReviewForm.comment}
              onChange={(e) => setDummyReviewForm({ ...dummyReviewForm, comment: e.target.value })}
              className="w-full h-24 p-3 rounded-xl border border-hairline bg-canvas text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Lampirkan Foto Bukti Sinyal (Maks 3 Foto)</span>
              <span className="text-[10px] text-ink-muted">{(dummyReviewForm.images || []).length}/3 Foto</span>
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {(dummyReviewForm.images || []).map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl border border-hairline overflow-hidden group shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setDummyReviewForm((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== idx),
                      }))
                    }
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(dummyReviewForm.images || []).length < 3 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-hairline hover:border-primary/50 bg-parchment/40 flex flex-col items-center justify-center cursor-pointer text-ink-muted hover:text-primary transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] font-bold mt-0.5">Unggah</span>
                  <input type="file" accept="image/*" multiple onChange={handleDummyImageAdd} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full text-xs font-bold h-10">
            Simpan Ulasan Pelanggan Baru
          </Button>
        </form>
      </Card>

      {/* Telegram Bot Review Integration Info Card */}
      <Card glass className="p-5 space-y-2 border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20">
        <h3 className="font-bold text-sm text-ink flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-500" />
          Kirim Ulasan via Telegram Bot Admin
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          Anda juga dapat menambah ulasan secara cepat via Telegram. Cukup kirim pesan atau kirim <b>Foto Bukti Sinyal</b> ke Bot Telegram Admin Anda dengan format:
        </p>
        <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1">
          <p className="text-emerald-400 font-bold">// Format Caption Foto / Pesan:</p>
          <p className="select-all text-slate-300">Nama Pengguna | Bintang (1-5) | Komentar Ulasan | Variasi Garansi</p>
          <p className="text-slate-400 text-[10px] mt-1">// Contoh:</p>
          <p className="text-amber-300 select-all">Rahul Pramudia | 5 | iPhone 13 Pro sinyal Telkomsel 5G aktif kilat garansi 3 bulan | GARANSI 3 BULAN (MASA AKTIF SINYAL)</p>
        </div>
      </Card>

      {/* List Ulasan Aktif di Sistem */}
      <Card glass className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Daftar Ulasan di Database ({adminReviewsList.length})
          </h3>
          <span className="text-[11px] text-ink-muted">Total: {adminReviewsList.length} testimoni</span>
        </div>

        {loadingAdminReviews ? (
          <div className="py-10 text-center text-xs text-ink-muted">
            <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Memuat daftar ulasan...
          </div>
        ) : adminReviewsList.length === 0 ? (
          <div className="py-10 text-center text-xs text-ink-muted">
            Belum ada ulasan terdaftar di sistem.
          </div>
        ) : (
          <div className="space-y-3">
            {adminReviewsList.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-parchment/40 border border-hairline flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.userAvatar} alt={r.userName} className="w-6 h-6 rounded-full border border-hairline object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                        {r.userName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span className="font-bold text-ink">{r.userName}</span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-500" />
                      ))}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      {r.userRole || "Pembeli Terverifikasi"}
                    </span>
                  </div>
                  <p className="text-ink-muted leading-relaxed">{r.comment}</p>
                  <div className="text-[10px] text-ink-muted flex items-center gap-2 flex-wrap">
                    <span>Variasi: <b>{r.variation}</b></span>
                    <span>&bull;</span>
                    <span>Terbantu: <b>{r.likesCount}</b></span>
                    <span>&bull;</span>
                    <span>Produk: <b>{r.productId}</b></span>
                    {r.transactionDate && (
                      <>
                        <span>&bull;</span>
                        <span>Tanggal: {r.transactionDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] shrink-0 gap-1"
                  onClick={() => handleDeleteAdminReview(r.id)}
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
