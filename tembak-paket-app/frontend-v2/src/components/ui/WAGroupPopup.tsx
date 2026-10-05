"use client";

import { useState, useEffect } from "react";

const WA_GROUP_URL = "https://chat.whatsapp.com/E0AO1IoMfHK0gqTvFgNQNl";
const STORAGE_KEY = "wa_group_popup_dismissed_v1";

export default function WAGroupPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      // Ponytail: hanya tampil 1x per browser sampai di-dismiss. Upgrade: pakai
      // user API + flag DB kalau mau target user spesifik (sudah beli vs belum).
      if (!dismissed) {
        const t = setTimeout(() => setShow(true), 2500);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const handleJoin = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    window.open(WA_GROUP_URL, "_blank", "noopener,noreferrer");
    setShow(false);
  };

  const handleClose = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm bg-canvas rounded-3xl border border-hairline shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient hijau WA */}
        <div className="p-5 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white">
          <button
            onClick={handleClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <svg className="h-10 w-10 shrink-0 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            <div>
              <h3 className="font-extrabold text-base">Gabung Grup WhatsApp</h3>
              <p className="text-[11px] text-white/85 font-medium">Komunitas Ry-ITSolutions</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-sm font-bold text-ink">Ragu sebelum order? Cek sendiri di grup kami.</p>
          <ul className="space-y-2.5 text-xs text-ink-muted">
            <li className="flex gap-2.5">
              <svg className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <span><b className="text-ink">Testimoni & bukti sinyal asli</b> dari pelanggan yang sudah order</span>
            </li>
            <li className="flex gap-2.5">
              <svg className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <span><b className="text-ink">Update status pesanan</b> langsung dari admin</span>
            </li>
            <li className="flex gap-2.5">
              <svg className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <span><b className="text-ink">Info promo & harga spesial</b> untuk member grup</span>
            </li>
          </ul>

          <button
            onClick={handleJoin}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xs shadow-md transition-transform flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            Gabung Sekarang (Gratis)
          </button>
          <p className="text-[10px] text-center text-ink-muted">Tanpa biaya. Keluar kapan saja.</p>
        </div>
      </div>
    </div>
  );
}
