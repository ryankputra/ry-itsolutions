"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { Ticket, RotateCw, Plus, Trash2, Megaphone, Edit, Check, X, Users, ShoppingBag } from "lucide-react";

export default function AdminVouchersPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "fixed",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    max_usage_limit: "100",
    max_claim_limit: "100",
    max_per_user: "1",
    is_public: "1",
    start_date: "",
    end_date: "",
    notify_wa: false,
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [updatingCoupon, setUpdatingCoupon] = useState(false);

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setCoupons(data.data);
      } else {
        setCoupons([]);
      }
    } catch (e) {
      setCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.discount_value) {
      return Swal.fire({ title: "Peringatan", text: "Kode kupon dan nilai diskon wajib diisi." });
    }
    setCreatingCoupon(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCoupon),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Sukses", text: d.message || "Kupon baru berhasil diterbitkan.", timer: 1500, showConfirmButton: false });
        setNewCoupon({
          code: "",
          discount_type: "fixed",
          discount_value: "",
          min_order_amount: "",
          max_discount_amount: "",
          max_usage_limit: "100",
          max_claim_limit: "100",
          max_per_user: "1",
          is_public: "1",
          start_date: "",
          end_date: "",
          notify_wa: false,
        });
        loadCoupons();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal membuat kupon." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 }),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        loadCoupons();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Kupon?",
      text: "Kupon yang dihapus tidak bisa digunakan lagi oleh pengguna.",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE", credentials: "include" });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Terhapus", text: d.message, timer: 1200, showConfirmButton: false });
        loadCoupons();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    setUpdatingCoupon(true);
    try {
      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingCoupon),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Sukses", text: d.message || "Kupon berhasil diperbarui.", timer: 1500, showConfirmButton: false });
        setEditingCoupon(null);
        loadCoupons();
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal memperbarui kupon." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal memperbarui kupon." });
    } finally {
      setUpdatingCoupon(false);
    }
  };

  const handleBroadcastCoupon = async (coupon: any) => {
    let targetCountText = "Pelanggan & Pengguna Aktif";
    try {
      const recRes = await fetch("/api/admin/broadcast-recipients?mode=all");
      const recData = await safeJson(recRes);
      if (recData?.status && typeof recData.count === "number") {
        targetCountText = `${recData.count} Nomor Pelanggan Riil`;
      }
    } catch (e) {}
    const isPercent = coupon.discount_type === "percent";
    const discStr = isPercent ? `${coupon.discount_value}%` : `Rp ${Number(coupon.discount_value).toLocaleString("id-ID")}`;

    const { value: formValues } = await Swal.fire({
      title: `Sebar Promo: ${coupon.code}`,
      html: `
        <div class="text-left text-xs space-y-3 pt-1">
          <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p class="font-bold text-slate-800 dark:text-slate-200">Voucher: <span class="font-mono text-primary">${coupon.code}</span> (${discStr})</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Disertai banner voucher resmi dan tautan auto-claim.</p>
          </div>

          <div>
            <label class="block font-bold mb-1 text-slate-700 dark:text-slate-300">Pilih Target Kirim:</label>
            <div class="space-y-1.5">
              <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <input type="radio" name="broadcast_target" value="admin_only" checked class="text-primary" />
                <span class="font-medium text-slate-800 dark:text-slate-200">Uji Coba WhatsApp Admin Saja</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <input type="radio" name="broadcast_target" value="all" class="text-primary" />
                <span class="font-medium text-slate-800 dark:text-slate-200">Sebar ke Seluruh Pelanggan Aktif (${targetCountText})</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1 text-slate-700 dark:text-slate-300">Pesan Tambahan (Opsional):</label>
            <textarea id="swal-custom-msg" rows="2" class="w-full p-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-700" placeholder="Contoh: Jangan lewatkan promo spesial minggu ini."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Kirim Sekarang",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const target = (document.querySelector('input[name="broadcast_target"]:checked') as HTMLInputElement)?.value || "admin_only";
        const customMsg = (document.getElementById("swal-custom-msg") as HTMLTextAreaElement)?.value || "";
        return { target, customMsg };
      },
    });

    if (!formValues) return;

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `PROMO SPESIAL: VOUCHER ${coupon.code}`,
          message: formValues.customMsg || `Gunakan kode voucher ${coupon.code} untuk mendapatkan diskon spesial ${discStr}!`,
          voucherCode: coupon.code,
          targetWhatsApp: true,
          targetTelegram: true,
          targetInApp: true,
          targetMode: formValues.target,
        }),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        Swal.fire({ title: "Berhasil", text: d.message || "Promo voucher berhasil disebarkan.", timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: d?.message || "Gagal menyebarkan promo." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted block">Total Kupon</span>
          <span className="text-xl font-bold text-ink">{coupons.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted block">Kupon Aktif</span>
          <span className="text-xl font-bold text-emerald-600">
            {coupons.filter((c) => c.is_active === 1).length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted block">Total Terklaim</span>
          <span className="text-xl font-bold text-blue-600">
            {coupons.reduce((acc, c) => acc + (Number(c.total_claimed_count) || 0), 0)} Pengguna
          </span>
        </div>
        <div className="p-4 rounded-xl bg-canvas border border-hairline shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-muted block">Total Dipakai</span>
          <span className="text-xl font-bold text-primary">
            {coupons.reduce((acc, c) => acc + (Number(c.used_count) || 0), 0)} Transaksi
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Buat Kupon */}
        <div className="lg:col-span-5 space-y-4">
          <Card glass className="p-5 space-y-4">
            <div className="border-b border-hairline pb-3">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Buat Kupon Diskon Baru
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">Atur kode kupon, potongan harga, kuota klaim, dan periode aktif.</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Kode Kupon"
                  placeholder="Misal: PROMOHEMAT"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  required
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80">Tipe Visibilitas</label>
                  <select
                    className="w-full h-10 rounded-xl border border-hairline px-3 bg-canvas text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.is_public}
                    onChange={(e) => setNewCoupon({ ...newCoupon, is_public: e.target.value })}
                  >
                    <option value="1">Publik (Bisa Diklaim Pengguna)</option>
                    <option value="0">Rahasia (Ketik Manual Saat Checkout)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80">Tipe Potongan</label>
                  <select
                    className="w-full h-10 rounded-xl border border-hairline px-3 bg-canvas text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.discount_type}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                  >
                    <option value="fixed">Nominal Tetap (Rp)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>
                <Input
                  label={newCoupon.discount_type === "percent" ? "Nilai Diskon (%)" : "Nilai Diskon (Rp)"}
                  type="number"
                  placeholder={newCoupon.discount_type === "percent" ? "10" : "20000"}
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input
                  label="Min. Order (Rp)"
                  type="number"
                  placeholder="0"
                  value={newCoupon.min_order_amount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: e.target.value })}
                />
                <Input
                  label="Maks. Diskon (Rp)"
                  type="number"
                  placeholder="0"
                  value={newCoupon.max_discount_amount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_discount_amount: e.target.value })}
                />
                <Input
                  label="Batas/User"
                  type="number"
                  placeholder="1"
                  value={newCoupon.max_per_user}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_per_user: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Maks. Kuota Klaim"
                  type="number"
                  placeholder="100"
                  value={newCoupon.max_claim_limit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_claim_limit: e.target.value })}
                  required
                />
                <Input
                  label="Kuota Pemakaian"
                  type="number"
                  placeholder="100"
                  value={newCoupon.max_usage_limit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_usage_limit: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink/80 block mb-1">Mulai Berlaku</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-hairline px-3 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.start_date}
                    onChange={(e) => setNewCoupon({ ...newCoupon, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink/80 block mb-1">Berakhir</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-hairline px-3 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.end_date}
                    onChange={(e) => setNewCoupon({ ...newCoupon, end_date: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" isLoading={creatingCoupon} className="w-full text-xs font-bold h-10 gap-2">
                <Plus className="w-4 h-4" />
                Terbitkan Kupon Promo
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Daftar Kupon */}
        <div className="lg:col-span-7 space-y-4">
          <Card glass className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  Daftar Kupon Promo
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">{coupons.length} kupon terdaftar di database</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadCoupons} className="gap-1.5 text-xs">
                <RotateCw className={`w-3.5 h-3.5 ${loadingCoupons ? "animate-spin" : ""}`} />
                Segarkan
              </Button>
            </div>

            {loadingCoupons ? (
              <div className="py-10 text-center text-xs text-ink-muted">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Memuat daftar kupon...
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-10 text-center text-xs text-ink-muted border border-dashed rounded-xl">
                Belum ada kupon promo yang dibuat.
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border bg-canvas transition-all flex flex-col gap-2.5 ${
                      c.is_active ? "border-primary/30 shadow-xs" : "border-hairline opacity-65"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.is_public === 1 || c.is_public === true || c.is_public === "1"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          }`}
                        >
                          {c.is_public === 1 || c.is_public === true || c.is_public === "1" ? "Publik" : "Rahasia"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {c.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleBroadcastCoupon(c)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1"
                          title="Kirim notifikasi promo voucher ke WhatsApp & Web"
                        >
                          <Megaphone className="w-3 h-3" />
                          <span>Sebar Promo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCoupon({ ...c })}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(c.id, c.is_active)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                            c.is_active
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-hairline">
                      <div>
                        <p className="font-bold text-ink">
                          Diskon: {c.discount_type === "percent" ? `${c.discount_value}%` : `Rp ${Number(c.discount_value).toLocaleString("id-ID")}`}
                          {c.max_discount_amount > 0 && (
                            <span className="text-[10px] font-normal text-ink-muted ml-1">
                              (Maks Rp {Number(c.max_discount_amount).toLocaleString("id-ID")})
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Min. Order: Rp {Number(c.min_order_amount || 0).toLocaleString("id-ID")} &bull; Batas/User: {c.max_per_user || 1}x
                        </p>
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 font-medium text-ink">
                            Klaim: <b className="text-primary">{c.total_claimed_count || 0}</b>/{c.max_claim_limit || 100} Pengguna
                          </span>
                          <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md border border-hairline font-medium text-ink">
                            Pakai: <b className="text-ink">{c.used_count || 0}</b>/{c.max_usage_limit || 100} Trx
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted mt-1">
                          Periode: {c.start_date ? c.start_date.split("T")[0] : "Kapan saja"} s/d {c.end_date ? c.end_date.split("T")[0] : "Selamanya"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Edit Kupon */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-sm text-ink">Edit Kupon Promo</h3>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="text-xs font-bold text-ink-muted hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Kode Kupon"
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  required
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80">Tipe Visibilitas</label>
                  <select
                    className="w-full h-10 rounded-xl border border-hairline px-2.5 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={editingCoupon.is_public}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, is_public: Number(e.target.value) })}
                  >
                    <option value="1">Publik</option>
                    <option value="0">Rahasia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80">Tipe Diskon</label>
                  <select
                    className="w-full h-10 rounded-xl border border-hairline px-2.5 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={editingCoupon.discount_type}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_type: e.target.value })}
                  >
                    <option value="fixed">Nominal (Rp)</option>
                    <option value="percent">Persen (%)</option>
                  </select>
                </div>
                <Input
                  label="Nilai Diskon"
                  type="number"
                  value={editingCoupon.discount_value}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  label="Min. Order"
                  type="number"
                  value={editingCoupon.min_order_amount}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, min_order_amount: e.target.value })}
                />
                <Input
                  label="Maks. Diskon"
                  type="number"
                  value={editingCoupon.max_discount_amount}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, max_discount_amount: e.target.value })}
                />
                <Input
                  label="Batas/User"
                  type="number"
                  value={editingCoupon.max_per_user}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, max_per_user: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Maks. Klaim"
                  type="number"
                  value={editingCoupon.max_claim_limit}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, max_claim_limit: e.target.value })}
                  required
                />
                <Input
                  label="Kuota Stok"
                  type="number"
                  value={editingCoupon.max_usage_limit}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, max_usage_limit: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-ink/80 block mb-1">Mulai</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-hairline px-2.5 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={editingCoupon.start_date ? editingCoupon.start_date.split("T")[0] : ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-ink/80 block mb-1">Berakhir</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-hairline px-2.5 bg-canvas text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={editingCoupon.end_date ? editingCoupon.end_date.split("T")[0] : ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-3.5 py-2 rounded-xl border border-hairline text-xs font-bold text-ink hover:bg-canvas"
                >
                  Batal
                </button>
                <Button type="submit" isLoading={updatingCoupon} className="px-4 py-2 text-xs font-bold">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
