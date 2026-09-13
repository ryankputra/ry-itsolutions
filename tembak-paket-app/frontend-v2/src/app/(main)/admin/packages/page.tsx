"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { Package, RotateCw, Search, Check, Layers, ArrowUpRight } from "lucide-react";

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);

  const [searchPkg, setSearchPkg] = useState("");
  const [selectedPkgIndex, setSelectedPkgIndex] = useState<number | null>(null);
  const [isOpenPkg, setIsOpenPkg] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadPackages = async () => {
    setLoadingPkgs(true);
    try {
      const res = await fetch("/api/admin/packages", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setPackages(data.data);
      } else {
        setPackages([]);
      }
    } catch (e) {
      setPackages([]);
    } finally {
      setLoadingPkgs(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenPkg(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-packages", { method: "POST", credentials: "include" });
      if (res.ok) {
        await loadPackages();
        setSelectedPkgIndex(null);
        Swal.fire({ title: "Berhasil", text: "Sinkronisasi paket KMSP selesai." });
      } else {
        Swal.fire({ title: "Gagal", text: "Gagal sinkronisasi data dari KMSP." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setSyncing(false);
    }
  };

  const selectedPkg = selectedPkgIndex !== null ? packages[selectedPkgIndex] : null;

  const filteredPackages = packages.filter((p) => {
    const q = searchPkg.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.package_code && p.package_code.toLowerCase().includes(q))
    );
  });

  const handleSaveSinglePkg = async () => {
    if (selectedPkgIndex === null) return;
    setSavingPkg(true);
    try {
      const res = await fetch("/api/admin/packages/bulk-update", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: [packages[selectedPkgIndex]] }),
      });
      if (res.ok) {
        Swal.fire({ title: "Tersimpan", text: "Pengaturan paket berhasil disimpan.", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: "Gagal", text: "Gagal memperbarui paket." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan komunikasi dengan server." });
    } finally {
      setSavingPkg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Kelola Paket Kuota KMSP
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Sinkronisasi paket dari KMSP dan atur margin fee laba platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPackages} className="gap-2 text-xs">
            <RotateCw className={`w-3.5 h-3.5 ${loadingPkgs ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
          <Button size="sm" onClick={handleSync} isLoading={syncing} className="gap-2 text-xs">
            <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sinkronisasi KMSP
          </Button>
        </div>
      </div>

      {/* Package Selector Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card glass className="p-5 space-y-4 lg:col-span-2 overflow-visible">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Pencarian & Pemilihan Paket
            </h3>
            <span className="text-xs text-ink-muted">
              Total: {packages.length} paket tersedia
            </span>
          </div>

          <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-ink/80">Ketik Nama atau Kode Paket</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                className="w-full h-10 rounded-xl border border-hairline bg-canvas pl-9 pr-4 text-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                placeholder="Ketik nama paket atau kode paket..."
                value={selectedPkg ? selectedPkg.name : searchPkg}
                onChange={(e) => {
                  setSearchPkg(e.target.value);
                  setSelectedPkgIndex(null);
                  setIsOpenPkg(true);
                }}
                onFocus={() => setIsOpenPkg(true)}
              />
            </div>

            {isOpenPkg && filteredPackages.length > 0 && (
              <div className="absolute top-[68px] left-0 right-0 max-h-64 overflow-y-auto bg-canvas border border-hairline rounded-xl shadow-xl z-50 divide-y divide-hairline">
                {filteredPackages.map((p) => {
                  const originalIdx = packages.findIndex((pkg) => pkg.package_code === p.package_code);
                  const isCur = originalIdx === selectedPkgIndex;
                  return (
                    <div
                      key={p.package_code}
                      className={`p-3 hover:bg-parchment cursor-pointer transition-colors ${isCur ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        setSelectedPkgIndex(originalIdx);
                        setIsOpenPkg(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-ink">{p.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.isVisible ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {p.isVisible ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-ink-muted mt-1">
                        <span>Kode: <code className="font-mono">{p.package_code}</code></span>
                        <span>Modal: Rp {p.original_price ? Number(p.original_price).toLocaleString('id-ID') : 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedPkg ? (
            <div className="pt-4 border-t border-hairline space-y-4">
              <div className="p-3.5 rounded-xl bg-parchment/40 border border-hairline">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Paket Terpilih</p>
                <h4 className="font-bold text-sm text-ink">{selectedPkg.name}</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Modal Server Asli: <b className="text-ink">Rp {Number(selectedPkg.original_price || 0).toLocaleString('id-ID')}</b>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Platform Fee (Laba Platform Rp)"
                  type="number"
                  value={selectedPkg.platform_fee || 0}
                  onChange={(e) => {
                    const newPkgs = [...packages];
                    newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], platform_fee: parseInt(e.target.value) || 0 };
                    setPackages(newPkgs);
                  }}
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">Estimasi Harga Jual User</label>
                  <div className="h-10 px-3.5 rounded-xl border border-hairline bg-parchment/30 flex items-center text-xs font-bold text-ink">
                    Rp {(Number(selectedPkg.original_price || 0) + Number(selectedPkg.platform_fee || 0)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-hairline bg-canvas">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-hairline text-primary focus:ring-primary"
                    checked={!!selectedPkg.isVisible}
                    onChange={(e) => {
                      const newPkgs = [...packages];
                      newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], isVisible: e.target.checked };
                      setPackages(newPkgs);
                    }}
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Tampilkan Paket ke Pengguna</p>
                    <p className="text-[11px] text-ink-muted">Jika dinonaktifkan, produk tidak akan muncul pada menu kuota pembeli.</p>
                  </div>
                </label>
              </div>

              <Button className="w-full text-xs font-bold h-10 gap-2" onClick={handleSaveSinglePkg} isLoading={savingPkg}>
                <Check className="w-4 h-4" />
                Simpan Pengaturan Paket
              </Button>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-ink-muted border border-dashed border-hairline rounded-xl">
              Pilih salah satu paket di atas untuk mengatur fee margin dan visibilitas.
            </div>
          )}
        </Card>

        {/* Quick Info Sidecard */}
        <div className="space-y-4">
          <Card glass className="p-5 space-y-3">
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary" />
              Informasi Sinkronisasi
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Tombol <b>Sinkronisasi KMSP</b> akan mengambil daftar paket dan harga terbaru dari provider server pusat.
            </p>
            <div className="p-3 rounded-xl bg-parchment/50 text-[11px] text-ink-muted space-y-1">
              <p className="font-bold text-ink">Pedoman Penetapan Margin:</p>
              <p>&bull; Fee Platform ditambahkan ke harga modal server.</p>
              <p>&bull; Disarankan menjaga margin wajar agar paket tetap kompetitif.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
