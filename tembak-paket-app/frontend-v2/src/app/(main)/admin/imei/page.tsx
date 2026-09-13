"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import {
  Smartphone,
  RotateCw,
  Zap,
  Clock,
  Gauge,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Server,
  ShieldCheck,
  Megaphone,
} from "lucide-react";

export default function AdminImeiPage() {
  const [loading, setLoading] = useState(false);

  // Global IMEI Service Status
  const [imeiServiceOpen, setImeiServiceOpen] = useState(true);
  const [imeiServiceNote, setImeiServiceNote] = useState("");

  // Speed Pricing
  const [pricing, setPricing] = useState<any>({});
  const debounceRef = useRef<any>(null);

  // IMEI Packages
  const [imeiPackages, setImeiPackages] = useState<any[]>([]);
  const [newImeiPkg, setNewImeiPkg] = useState<{
    duration: string;
    allowed_speeds: string[];
    speed_prices: { fast: string; semi: string; slow: string };
  }>({
    duration: "",
    allowed_speeds: ["fast", "semi", "slow"],
    speed_prices: { fast: "", semi: "", slow: "" },
  });
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [savingImeiPkg, setSavingImeiPkg] = useState(false);

  // Server Pusat CEIR & Barcode
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoDisplayCodes, setCeirgoDisplayCodes] = useState<Set<string>>(new Set());

  const autoSavePricing = (p: any, instant = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const doSave = async () => {
      try {
        await fetch("/api/admin/manual-services-pricing", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
      } catch (e) {
        // ignore
      }
    };
    if (instant) {
      doSave();
      return;
    }
    debounceRef.current = setTimeout(doSave, 1000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingRes, statusRes, imeiRes, ceirSvcRes, dispRes, ceirPriceRes] = await Promise.all([
        fetch("/api/manual-services/pricing").catch(() => null),
        fetch("/api/admin/imei-service-status", { credentials: "include" }).catch(() => null),
        fetch("/api/imei-packages?all=true").catch(() => null),
        fetch("/api/admin/ceirgo-services", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/ceirgo-display-settings", { credentials: "include" }).catch(() => null),
        fetch("/api/admin/ceirgo-pricing", { credentials: "include" }).catch(() => null),
      ]);

      if (pricingRes?.ok) {
        const d = await pricingRes.json();
        if (d?.pricing) setPricing(d.pricing);
      }

      if (statusRes?.ok) {
        const d = await statusRes.json();
        if (d?.status) {
          setImeiServiceOpen(d.isOpen ?? true);
          setImeiServiceNote(d.note || "");
        }
      }

      if (imeiRes?.ok) {
        const d = await imeiRes.json();
        if (d?.status && Array.isArray(d.packages)) setImeiPackages(d.packages);
      }

      if (ceirSvcRes?.ok) {
        const d = await ceirSvcRes.json();
        if (d?.status && Array.isArray(d.services)) setCeirgoServices(d.services);
      }

      if (dispRes?.ok) {
        const d = await dispRes.json();
        if (d?.status && d.data) {
          const codes = new Set<string>([...(d.data.cekCeir || []), ...(d.data.barcode || [])]);
          setCeirgoDisplayCodes(codes);
        }
      }

      if (ceirPriceRes?.ok) {
        const d = await ceirPriceRes.json();
        if (d?.status && d.pricing) setCeirgoPricing(d.pricing);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateImeiPkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImeiPkg.duration.trim()) {
      return Swal.fire({ title: "Perhatian", text: "Isi durasi paket." });
    }
    const activeSpeeds = newImeiPkg.allowed_speeds || [];
    if (activeSpeeds.length === 0) {
      return Swal.fire({ title: "Perhatian", text: "Pilih minimal 1 kecepatan pengerjaan." });
    }

    const spPrices: Record<string, number> = {};
    for (const sp of activeSpeeds) {
      const rawPrice = newImeiPkg.speed_prices?.[sp as "fast" | "semi" | "slow"];
      const num = parseInt(rawPrice || "");
      if (!num || num <= 0) {
        return Swal.fire({ title: "Perhatian", text: `Isi harga valid untuk opsi ${sp.toUpperCase()}` });
      }
      spPrices[sp] = num;
    }

    const minPrice = Math.min(...Object.values(spPrices));

    setSavingImeiPkg(true);
    try {
      const res = await fetch("/api/admin/imei-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          duration: newImeiPkg.duration.trim(),
          price: minPrice,
          isVisible: 1,
          allowed_speeds: activeSpeeds,
          speed_prices: spPrices,
        }),
      });
      const d = await res.json();
      if (d.status) {
        Swal.fire({ title: "Berhasil", text: "Paket IMEI berhasil ditambahkan.", timer: 1500, showConfirmButton: false });
        setNewImeiPkg({
          duration: "",
          allowed_speeds: ["fast", "semi", "slow"],
          speed_prices: { fast: "", semi: "", slow: "" },
        });
        loadData();
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal menambahkan paket." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingImeiPkg(false);
    }
  };

  const handleToggleImeiPkg = async (pkg: any) => {
    const isVisible = pkg.isVisible === 1 || pkg.isVisible === true || pkg.isVisible === undefined;
    try {
      const res = await fetch(`/api/admin/imei-packages/${pkg.id}/toggle`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: isVisible ? 0 : 1 }),
      });
      const d = await res.json();
      if (d.status) {
        loadData();
      } else {
        Swal.fire({ title: "Gagal", text: d.message || "Gagal mengubah status paket." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    }
  };

  const handleDeleteImeiPkg = async (pkg: any) => {
    const confirm = await Swal.fire({
      title: "Hapus Paket IMEI?",
      text: `Hapus durasi ${pkg.duration} secara permanen?`,
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    try {
      const delRes = await fetch(`/api/admin/imei-packages/${pkg.id}`, { method: "DELETE", credentials: "include" });
      const delData = await delRes.json();
      if (delData.status) {
        Swal.fire({ title: "Dihapus", text: "Paket berhasil dihapus.", timer: 1200, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire({ title: "Gagal", text: delData.message || "Gagal menghapus paket." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Layanan Unblock IMEI & CEIR
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Kontrol status buka/tutup layanan, tarif 3 kecepatan proses, durasi paket, dan integrasi server pusat CEIR.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} className="gap-1.5 text-xs">
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Status Global, Kecepatan, & Daftar Paket */}
        <div className="lg:col-span-6 space-y-6">
          {/* Status Layanan Global */}
          <Card glass className="p-5 space-y-3.5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink">Status Operasional Layanan IMEI</h3>
                <p className="text-xs text-ink-muted mt-0.5">Buka atau tutup akses order IMEI secara global untuk seluruh pelanggan.</p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const newStatus = !imeiServiceOpen;
                  setImeiServiceOpen(newStatus);
                  await fetch("/api/admin/imei-service-status", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isOpen: newStatus, note: imeiServiceNote }),
                  });
                  Swal.fire({ title: "Tersimpan", text: `Status layanan: ${newStatus ? "BUKA" : "TUTUP"}`, timer: 1500, showConfirmButton: false });
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  imeiServiceOpen ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {imeiServiceOpen ? "Status: Buka (Aktif)" : "Status: Tutup (Nonaktif)"}
              </button>
            </div>

            <div className="flex gap-2 items-end pt-1">
              <Input
                label="Pemberitahuan Khusus Saat Tutup (Opsional)"
                placeholder="Contoh: Server sedang maintenance rutin..."
                value={imeiServiceNote}
                onChange={(e) => setImeiServiceNote(e.target.value)}
              />
              <Button
                className="h-10 shrink-0 text-xs"
                onClick={async () => {
                  await fetch("/api/admin/imei-service-status", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isOpen: imeiServiceOpen, note: imeiServiceNote }),
                  });
                  Swal.fire({ title: "Berhasil", text: "Catatan status IMEI berhasil disimpan.", timer: 1500, showConfirmButton: false });
                }}
              >
                Simpan
              </Button>
            </div>
          </Card>

          {/* Kecepatan Pengerjaan */}
          <Card glass className="p-5 space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                Tarif Kecepatan Pengerjaan IMEI
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">Atur biaya tambahan dan estimasi waktu untuk tier Fast, Semi, dan Slow.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Fast Option */}
              <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-2 shadow-xs">
                <div className="flex justify-between items-center pb-1 border-b border-hairline">
                  <span className="font-bold text-xs text-ink flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Fast
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...pricing,
                        imei_speed_fast_status: pricing.imei_speed_fast_status === "hidden" ? "active" : "hidden",
                      };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                      pricing.imei_speed_fast_status !== "hidden"
                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {pricing.imei_speed_fast_status !== "hidden" ? "Aktif" : "Hidden"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Biaya Tambahan (Rp)"
                    type="number"
                    placeholder="50000"
                    value={pricing.imei_speed_fast || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_fast: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                  <Input
                    label="Estimasi Range Waktu"
                    placeholder="1-3 Jam"
                    value={pricing.imei_speed_fast_range || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_fast_range: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                </div>
              </div>

              {/* Semi Option */}
              <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-2 shadow-xs">
                <div className="flex justify-between items-center pb-1 border-b border-hairline">
                  <span className="font-bold text-xs text-ink flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Semi Fast
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...pricing,
                        imei_speed_semi_status: pricing.imei_speed_semi_status === "hidden" ? "active" : "hidden",
                      };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                      pricing.imei_speed_semi_status !== "hidden"
                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {pricing.imei_speed_semi_status !== "hidden" ? "Aktif" : "Hidden"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Biaya Tambahan (Rp)"
                    type="number"
                    placeholder="25000"
                    value={pricing.imei_speed_semi || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_semi: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                  <Input
                    label="Estimasi Range Waktu"
                    placeholder="6-12 Jam"
                    value={pricing.imei_speed_semi_range || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_semi_range: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                </div>
              </div>

              {/* Slow Option */}
              <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-2 shadow-xs">
                <div className="flex justify-between items-center pb-1 border-b border-hairline">
                  <span className="font-bold text-xs text-ink flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-500" />
                    Slow
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...pricing,
                        imei_speed_slow_status: pricing.imei_speed_slow_status === "hidden" ? "active" : "hidden",
                      };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                      pricing.imei_speed_slow_status !== "hidden"
                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {pricing.imei_speed_slow_status !== "hidden" ? "Aktif" : "Hidden"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Biaya Tambahan (Rp)"
                    type="number"
                    placeholder="0"
                    value={pricing.imei_speed_slow || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_slow: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                  <Input
                    label="Estimasi Range Waktu"
                    placeholder="24-48 Jam"
                    value={pricing.imei_speed_slow_range || ""}
                    onChange={(e) => {
                      const updated = { ...pricing, imei_speed_slow_range: e.target.value };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Daftar Paket Durasi IMEI */}
          <Card glass className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink">Daftar Paket Durasi IMEI</h3>
                <p className="text-xs text-ink-muted mt-0.5">Kelola pilihan masa aktif garansi sinyal dan harga.</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {imeiPackages.length} Paket
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {imeiPackages.length === 0 ? (
                <div className="col-span-2 text-center py-8 border border-dashed rounded-xl text-ink-muted text-xs">
                  Belum ada paket durasi. Tambahkan paket di formulir bawah.
                </div>
              ) : (
                imeiPackages.map((pkg) => {
                  let speeds: string[] = ["fast", "semi", "slow"];
                  if (pkg.allowed_speeds) {
                    try {
                      const parsed = typeof pkg.allowed_speeds === "string" ? JSON.parse(pkg.allowed_speeds) : pkg.allowed_speeds;
                      if (Array.isArray(parsed) && parsed.length > 0) speeds = parsed;
                    } catch (e) {}
                  }
                  const isVisible = pkg.isVisible === 1 || pkg.isVisible === true || pkg.isVisible === undefined;

                  let spPrices: any = {};
                  if (pkg.speed_prices) {
                    try {
                      spPrices = typeof pkg.speed_prices === "string" ? JSON.parse(pkg.speed_prices) : pkg.speed_prices;
                    } catch (e) {}
                  }

                  return (
                    <div
                      key={pkg.id}
                      className="p-3.5 border border-hairline rounded-xl flex flex-col justify-between bg-canvas shadow-xs hover:border-primary/40 transition-all space-y-2.5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-ink">{pkg.duration}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {speeds.map((s) => {
                              const val = spPrices[s];
                              return (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 flex items-center gap-1"
                                >
                                  <span>{s.toUpperCase()}:</span>
                                  <span>
                                    {val ? `Rp ${Number(val).toLocaleString("id-ID")}` : `Rp ${Number(pkg.price).toLocaleString("id-ID")}`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleImeiPkg(pkg)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                              isVisible
                                ? "bg-emerald-500/10 text-emerald-700 border border-emerald-300"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {isVisible ? "Aktif" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              let spObj: any = { fast: "", semi: "", slow: "" };
                              if (pkg.speed_prices) {
                                try {
                                  const parsed = typeof pkg.speed_prices === "string" ? JSON.parse(pkg.speed_prices) : pkg.speed_prices;
                                  if (parsed && typeof parsed === "object") {
                                    spObj = {
                                      fast: parsed.fast !== undefined ? String(parsed.fast) : "",
                                      semi: parsed.semi !== undefined ? String(parsed.semi) : "",
                                      slow: parsed.slow !== undefined ? String(parsed.slow) : "",
                                    };
                                  }
                                } catch (e) {}
                              }
                              if (!spObj.fast && !spObj.semi && !spObj.slow && pkg.price) {
                                speeds.forEach((s: string) => {
                                  spObj[s] = String(pkg.price);
                                });
                              }
                              setEditingPkg({ ...pkg, allowed_speeds: speeds, speed_prices: spObj });
                            }}
                            className="p-1 text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit paket"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImeiPkg(pkg)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Hapus paket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Tambah Paket Baru */}
            <form onSubmit={handleCreateImeiPkg} className="p-4 rounded-xl bg-parchment/40 border border-hairline space-y-3 pt-3">
              <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                Tambah Paket Durasi Baru
              </h4>

              <Input
                label="Durasi Paket (Contoh: 1 Bulan, 3 Bulan, 1 Tahun, Permanen)"
                placeholder="Contoh: 3 Bulan (Masa Aktif Sinyal)"
                value={newImeiPkg.duration}
                onChange={(e) => setNewImeiPkg({ ...newImeiPkg, duration: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "fast", label: "Fast", desc: "Prioritas Kilat" },
                  { id: "semi", label: "Semi Fast", desc: "Estimasi Sedang" },
                  { id: "slow", label: "Slow", desc: "Paling Hemat" },
                ].map((speed) => {
                  const isSelected = (newImeiPkg.allowed_speeds || []).includes(speed.id);
                  return (
                    <div
                      key={speed.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-hairline bg-canvas opacity-70"
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none mb-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = newImeiPkg.allowed_speeds || [];
                            if (!e.target.checked) {
                              if (current.length === 1) {
                                return Swal.fire({ title: "Info", text: "Minimal harus memilih 1 kecepatan pengerjaan." });
                              }
                              setNewImeiPkg({ ...newImeiPkg, allowed_speeds: current.filter((s) => s !== speed.id) });
                            } else {
                              setNewImeiPkg({ ...newImeiPkg, allowed_speeds: [...current, speed.id] });
                            }
                          }}
                          className="w-4 h-4 rounded text-primary"
                        />
                        <span className="font-bold text-xs text-ink">{speed.label}</span>
                      </label>

                      <Input
                        label={`Harga ${speed.label} (Rp)`}
                        type="number"
                        disabled={!isSelected}
                        placeholder={isSelected ? "150000" : "Non-aktif"}
                        value={newImeiPkg.speed_prices?.[speed.id as "fast" | "semi" | "slow"] || ""}
                        onChange={(e) => {
                          setNewImeiPkg({
                            ...newImeiPkg,
                            speed_prices: {
                              ...newImeiPkg.speed_prices,
                              [speed.id]: e.target.value,
                            },
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <Button type="submit" isLoading={savingImeiPkg} className="w-full text-xs font-bold h-10 gap-1.5">
                <Plus className="w-4 h-4" />
                Simpan Paket Baru
              </Button>
            </form>
          </Card>
        </div>

        {/* Kolom Kanan: Layanan Diagnostik & Server Pusat (CEIR, Bea Cukai, Barcode) */}
        <div className="lg:col-span-6 space-y-6">
          <Card glass className="p-5 space-y-4">
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-hairline pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  Layanan Diagnostik & Server Pusat CEIR
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Atur harga jual dan visibilitas cek database CEIR, Bea Cukai, & Barcode.</p>
              </div>
            </div>

            {/* Category 1: Cek Database Server */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Cek Database & Diagnostik Sinyal</span>
                <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                  {ceirgoServices.filter((s) => !/barcode|create/i.test(`${s.code} ${s.name}`) && ceirgoDisplayCodes.has(s.code)).length} Aktif
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ceirgoServices
                  .filter((s) => !/barcode|create/i.test(`${s.code} ${s.name}`))
                  .map((svc) => (
                    <div
                      key={svc.code}
                      className={`bg-canvas border p-3 rounded-xl flex flex-col gap-2.5 ${
                        ceirgoDisplayCodes.has(svc.code) ? "border-primary ring-1 ring-primary/30" : "border-hairline opacity-75"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-ink text-xs">{svc.name}</p>
                          <p className="text-[10px] text-primary font-mono">{svc.code}</p>
                          <p className="text-[11px] text-ink-muted mt-0.5">Modal: Rp {Number(svc.modalPrice || 0).toLocaleString("id-ID")}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={ceirgoDisplayCodes.has(svc.code)}
                            onChange={(e) => {
                              const newSet = new Set(ceirgoDisplayCodes);
                              if (e.target.checked) newSet.add(svc.code);
                              else newSet.delete(svc.code);
                              setCeirgoDisplayCodes(newSet);
                            }}
                          />
                          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <Input
                        label="Harga Jual (Rp)"
                        type="number"
                        value={ceirgoPricing[svc.code] ?? svc.modalPrice}
                        onChange={(e) => setCeirgoPricing({ ...ceirgoPricing, [svc.code]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Category 2: Generator Barcode Device */}
            <div className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Generator Barcode Device</span>
                <span className="text-[10px] bg-purple-500/10 text-purple-600 font-semibold px-2 py-0.5 rounded-full">
                  {ceirgoServices.filter((s) => /barcode|create/i.test(`${s.code} ${s.name}`) && ceirgoDisplayCodes.has(s.code)).length} Aktif
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ceirgoServices
                  .filter((s) => /barcode|create/i.test(`${s.code} ${s.name}`))
                  .map((svc) => (
                    <div
                      key={svc.code}
                      className={`bg-canvas border p-3 rounded-xl flex flex-col gap-2.5 ${
                        ceirgoDisplayCodes.has(svc.code) ? "border-primary ring-1 ring-primary/30" : "border-hairline opacity-75"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-ink text-xs">{svc.name}</p>
                          <p className="text-[10px] text-purple-600 font-mono">{svc.code}</p>
                          <p className="text-[11px] text-ink-muted mt-0.5">Modal: Rp {Number(svc.modalPrice || 0).toLocaleString("id-ID")}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={ceirgoDisplayCodes.has(svc.code)}
                            onChange={(e) => {
                              const newSet = new Set(ceirgoDisplayCodes);
                              if (e.target.checked) newSet.add(svc.code);
                              else newSet.delete(svc.code);
                              setCeirgoDisplayCodes(newSet);
                            }}
                          />
                          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <Input
                        label="Harga Jual (Rp)"
                        type="number"
                        value={ceirgoPricing[svc.code] ?? svc.modalPrice}
                        onChange={(e) => setCeirgoPricing({ ...ceirgoPricing, [svc.code]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
              </div>
            </div>

            <Button
              onClick={async () => {
                try {
                  const allActive = Array.from(ceirgoDisplayCodes);
                  const cekCeir = allActive.filter((c) => !/barcode|create/i.test(c));
                  const barcode = allActive.filter((c) => /barcode|create/i.test(c));

                  await fetch("/api/admin/ceirgo-display-settings", {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cekCeir, barcode }),
                  });
                  const res = await fetch("/api/admin/ceirgo-pricing", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ceirgoPricing),
                  });
                  if (res.ok) {
                    Swal.fire({ title: "Sukses", text: "Harga dan tampilan layanan pusat berhasil disimpan.", timer: 1500, showConfirmButton: false });
                  }
                } catch (e) {
                  Swal.fire({ title: "Error", text: "Gagal menyimpan pengaturan layanan." });
                }
              }}
              className="w-full text-xs font-bold h-10"
            >
              Simpan Pengaturan Layanan Pusat
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal Edit Paket IMEI */}
      {editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline w-full max-w-lg rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-sm text-ink">Edit Durasi & Harga Paket IMEI</h3>
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="text-ink-muted hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <Input
                label="Durasi Paket"
                value={editingPkg.duration}
                onChange={(e) => setEditingPkg({ ...editingPkg, duration: e.target.value })}
                required
              />

              <div className="space-y-2">
                <label className="font-bold text-ink block">Harga per Kecepatan:</label>
                <div className="space-y-2">
                  {[
                    { id: "fast", label: "Fast" },
                    { id: "semi", label: "Semi Fast" },
                    { id: "slow", label: "Slow" },
                  ].map((s) => {
                    const curSpeeds: string[] = editingPkg.allowed_speeds || [];
                    const isSel = curSpeeds.includes(s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl border border-hairline bg-parchment/30">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                if (curSpeeds.length === 1) return Swal.fire({ title: "Info", text: "Minimal harus 1 kecepatan aktif." });
                                setEditingPkg({ ...editingPkg, allowed_speeds: curSpeeds.filter((x) => x !== s.id) });
                              } else {
                                setEditingPkg({ ...editingPkg, allowed_speeds: [...curSpeeds, s.id] });
                              }
                            }}
                            className="w-4 h-4 rounded text-primary"
                          />
                          <span className="font-bold text-xs text-ink">{s.label}</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-ink-muted font-bold">Rp</span>
                          <input
                            type="number"
                            disabled={!isSel}
                            placeholder={isSel ? "Harga" : "Nonaktif"}
                            value={editingPkg.speed_prices?.[s.id] || ""}
                            onChange={(e) => {
                              setEditingPkg({
                                ...editingPkg,
                                speed_prices: {
                                  ...editingPkg.speed_prices,
                                  [s.id]: e.target.value,
                                },
                              });
                            }}
                            className={`w-32 px-2.5 py-1.5 rounded-lg border text-xs font-bold text-right outline-none ${
                              isSel ? "border-hairline bg-canvas text-ink focus:border-primary" : "border-hairline/40 bg-parchment/40 text-ink-muted cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editPkgVisible"
                  checked={editingPkg.isVisible === 1 || editingPkg.isVisible === true}
                  onChange={(e) => setEditingPkg({ ...editingPkg, isVisible: e.target.checked ? 1 : 0 })}
                  className="rounded text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="editPkgVisible" className="font-bold text-ink select-none cursor-pointer">
                  Tampilkan paket ini ke pembeli (Aktif)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <Button type="button" variant="ghost" onClick={() => setEditingPkg(null)} className="text-xs">
                  Batal
                </Button>
                <Button
                  type="button"
                  isLoading={savingImeiPkg}
                  onClick={async () => {
                    if (!editingPkg.duration?.trim()) {
                      return Swal.fire({ title: "Perhatian", text: "Isi durasi paket." });
                    }
                    const curSpeeds: string[] = editingPkg.allowed_speeds || [];
                    if (curSpeeds.length === 0) {
                      return Swal.fire({ title: "Perhatian", text: "Pilih minimal 1 kecepatan proses." });
                    }

                    const spPrices: Record<string, number> = {};
                    for (const sp of curSpeeds) {
                      const rawPrice = editingPkg.speed_prices?.[sp];
                      const num = parseInt(rawPrice || "");
                      if (!num || num <= 0) {
                        return Swal.fire({ title: "Perhatian", text: `Isi harga valid untuk opsi ${sp.toUpperCase()}` });
                      }
                      spPrices[sp] = num;
                    }

                    const minPrice = Math.min(...Object.values(spPrices));

                    setSavingImeiPkg(true);
                    try {
                      const res = await fetch(`/api/admin/imei-packages/${editingPkg.id}`, {
                        method: "PUT",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          duration: editingPkg.duration.trim(),
                          price: minPrice,
                          isVisible: editingPkg.isVisible,
                          allowed_speeds: curSpeeds,
                          speed_prices: spPrices,
                        }),
                      });
                      const d = await res.json();
                      if (d.status) {
                        Swal.fire({ title: "Berhasil", text: "Paket berhasil diperbarui.", timer: 1500, showConfirmButton: false });
                        setEditingPkg(null);
                        loadData();
                      } else {
                        Swal.fire({ title: "Gagal", text: d.message || "Gagal memperbarui paket." });
                      }
                    } catch (e) {
                      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
                    } finally {
                      setSavingImeiPkg(false);
                    }
                  }}
                  className="text-xs font-bold"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
