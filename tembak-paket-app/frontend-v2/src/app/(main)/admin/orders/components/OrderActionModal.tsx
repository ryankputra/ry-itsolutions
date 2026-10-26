"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Smartphone, Check } from "lucide-react";
import Swal from "@/lib/sweetalert";

const QUICK_NOTE_TEMPLATES = [
  "Sinyal All Operator Aktif (Garansi 3 Bulan)",
  "Sinyal All Operator Aktif (Garansi 1 Bulan)",
  "Sinyal All Operator Aktif (Permanen)",
  "SN: REG-",
  "Pengerjaan Selesai, Silakan Restart HP & Cek Jaringan",
  "Kendala Server Pusat / Refund Saldo",
];

export interface ManualActionData {
  id: string;
  status: string;
  note: string;
  file: File | null;
}

interface OrderActionModalProps {
  actionData: ManualActionData;
  setActionData: React.Dispatch<React.SetStateAction<ManualActionData | null>>;
  onSuccess: () => void;
}

export function OrderActionModal({
  actionData,
  setActionData,
  onSuccess,
}: OrderActionModalProps) {
  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("status", actionData.status || "pending");
    formData.append("admin_note", actionData.note || "");
    if (actionData.file) {
      formData.append("admin_image", actionData.file);
      formData.append("image", actionData.file);
    }

    try {
      const res = await fetch(`/api/admin/manual-orders/${actionData.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.status) {
        Swal.fire({
          title: "Tersimpan",
          text: d.message || "Status pesanan berhasil diperbarui.",
          timer: 1500,
          showConfirmButton: false,
        });
        setActionData(null);
        onSuccess();
      } else {
        Swal.fire({
          title: "Gagal",
          text: d?.message || "Gagal memperbarui status pesanan.",
        });
      }
    } catch {
      Swal.fire({ title: "Error", text: "Gagal menghubungi server." });
    }
  };

  return (
    <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 pt-2">
      <div className="flex justify-between items-center">
        <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          Proses & Ubah Status Add Roamer
        </p>
        <button
          type="button"
          onClick={() => setActionData(null)}
          className="text-xs text-ink-muted hover:text-ink cursor-pointer"
        >
          Batal
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-ink">Status Pengerjaan</label>
        <select
          className="w-full h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
          value={actionData.status || "pending"}
          onChange={(e) =>
            setActionData((prev) => (prev ? { ...prev, status: e.target.value } : null))
          }
        >
          <option value="pending">Pending (Menunggu Antrean)</option>
          <option value="processing">Processing (Sedang Dikerjakan)</option>
          <option value="success">Success (Berhasil Selesai & Garansi Aktif)</option>
          <option value="failed">Failed (Gagal / Refund Saldo)</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-ink flex items-center justify-between">
          <span>Catatan Admin / Serial Number (SN)</span>
          <span className="text-[10px] text-ink-muted font-normal">Klik template cepat:</span>
        </label>
        <div className="flex flex-wrap gap-1">
          {QUICK_NOTE_TEMPLATES.map((tmpl, tIdx) => (
            <button
              key={tIdx}
              type="button"
              onClick={() => {
                setActionData((prev) => {
                  if (!prev) return null;
                  const current = prev.note || "";
                  const updated = current ? `${current} - ${tmpl}` : tmpl;
                  return { ...prev, note: updated };
                });
              }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              + {tmpl}
            </button>
          ))}
        </div>
        <Input
          placeholder="Contoh: SN: REG-9921 / Sinyal All Operator Aktif (Garansi 3 Bulan)"
          value={actionData.note || ""}
          onChange={(e) => setActionData((prev) => (prev ? { ...prev, note: e.target.value } : null))}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-ink block mb-1">
          Lampiran Bukti Hasil Sinyal / Pengerjaan (Opsional)
        </label>
        <input
          type="file"
          className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          onChange={(e) =>
            setActionData((prev) => (prev ? { ...prev, file: e.target.files?.[0] || null } : null))
          }
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="text-xs font-bold h-9 gap-1.5"
          onClick={handleSubmit}
        >
          <Check className="w-3.5 h-3.5" />
          Simpan Perubahan
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-9" onClick={() => setActionData(null)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
