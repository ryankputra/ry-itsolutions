"use client";
import React, { useState } from "react";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { playCoinClaimSound, playPopSound } from "@/lib/soundFx";

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  orderId?: string;
  variation?: string;
  onReviewSubmitted?: () => void;
}

export function WriteReviewModal({
  isOpen,
  onClose,
  productId = "unblock-imei",
  orderId = "manual",
  variation = "Garansi 1 Tahun, All Operator",
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRatingClick = (star: number) => {
    setRating(star);
    try { playPopSound(); } catch {}
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      Swal.fire({ title: "Tulis Ulasan", text: "Mohon tuliskan ulasan pengalaman Anda.", icon: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          productId,
          rating,
          comment,
          variation,
          images,
        }),
      });
      const data = await safeJson(res);

      if (res.ok && data.status) {
        try { playCoinClaimSound(); } catch {}
        Swal.fire({
          title: "Ulasan Berhasil Terkirim! 🎉",
          text: data.message || "Terima kasih atas ulasan Anda! Bonus +500 Koin Ry telah masuk ke dompet Anda.",
          icon: "success",
          confirmButtonColor: "#0066cc",
        });
        setComment("");
        setImages([]);
        onClose();
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        Swal.fire({
          title: "Gagal Mengirim Ulasan",
          text: data?.message || "Terjadi kesalahan saat menyimpan ulasan.",
          icon: "error",
        });
      }
    } catch (err) {
      Swal.fire({ title: "Kesalahan Jaringan", text: "Gagal terhubung ke server ulasan.", icon: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-canvas rounded-3xl border border-hairline shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-amber-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              ⭐
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-950">Berikan Ulasan Produk</h3>
              <p className="text-[10px] text-amber-950/80 font-medium">Dapatkan Bonus +500 Koin Ry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Star Selection */}
          <div className="text-center space-y-1.5">
            <p className="text-xs font-bold text-ink">Bagaimana pengalaman transaksi Anda?</p>
            <div className="flex justify-center gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="transition-transform hover:scale-125 focus:outline-none"
                >
                  <span className={star <= rating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-300"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold text-amber-600">
              {rating === 5 ? "Sangat Puas! 😍" : rating === 4 ? "Puas 👍" : rating === 3 ? "Cukup 🙂" : "Kurang Puas 🙁"}
            </p>
          </div>

          {/* Comment input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink">Tulis Ulasan Anda</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bagaimana kecepatan proses sinyal / layanan kami? Ceritakan pengalaman Anda untuk membantu pembeli lain..."
              className="w-full h-24 p-3 rounded-2xl border border-hairline bg-canvas text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Photo attachment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Tambahkan Foto / Bukti Sinyal (Opsional)</span>
              <span className="text-[10px] text-ink-muted">{images.length}/3 Foto</span>
            </label>
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl border border-hairline overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-hairline hover:border-primary/50 bg-parchment/40 flex flex-col items-center justify-center cursor-pointer text-ink-muted hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  </svg>
                  <span className="text-[9px] font-bold mt-0.5">+ Foto</span>
                  <input type="file" accept="image/*" onChange={handleImageAdd} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-black text-xs shadow-md transition-transform flex items-center justify-center gap-2"
          >
            {submitting ? "Mengirim Ulasan..." : "Kirim Ulasan & Klaim +500 Koin Ry"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default WriteReviewModal;
