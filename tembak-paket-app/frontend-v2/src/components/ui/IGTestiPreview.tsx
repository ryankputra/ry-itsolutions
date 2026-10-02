"use client";

import { useEffect, useState, useCallback } from "react";
import { safeJson } from "@/lib/api";

const IG_URL = "https://www.instagram.com/unlocksinyalsolo";

interface IGItem {
  url: string;
  takenAt?: string | null;
}
interface IGHighlight {
  id?: string;
  title: string;
  cover?: string | null;
  mediaCount?: number;
  items?: IGItem[];
}
interface IGFeed {
  profile: boolean;
  count: number;
  syncedAt?: string | null;
  images: string[];
  highlights?: IGHighlight[];
  stories?: { url: string; takenAt?: string | null }[];
}

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    : "";

export default function IGTestiPreview() {
  const [feed, setFeed] = useState<IGFeed>({ profile: false, count: 0, images: [] });
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/ig-feed?_t=${Date.now()}`, { cache: "no-store" })
      .then(safeJson)
      .then((data) => {
        if (data?.status && Array.isArray(data.images)) {
          setFeed({
            profile: Boolean(data.profile),
            count: Number(data.count) || 0,
            syncedAt: data.syncedAt ?? null,
            images: data.images,
            highlights: Array.isArray(data.highlights) ? data.highlights : undefined,
            stories: Array.isArray(data.stories) ? data.stories : undefined,
          });
        }
      })
      .catch(() => {});
  }, []);

  // ponytail: bila folder ig-testi kosong (cron belum jalan), sembunyikan card.
  const totalItems = feed.highlights?.reduce((n, h) => n + (h.items?.length || 0), 0) || 0;
  if (!feed.images.length && !feed.stories?.length) return null;

  const storyList = feed.stories ?? [];
  const highlights = feed.highlights ?? [];

  return (
    <>
      <div className="rounded-3xl bg-parchment border border-hairline overflow-hidden shadow-sm">
        {/* Header: avatar + info IG */}
        <div className="p-4 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600">
              <img
                src="/ig-testi/ig-profile.jpg"
                alt="Foto profil Instagram unlocksinyalsolo"
                width={44}
                height={44}
                className="w-[44px] h-[44px] rounded-full object-cover ring-2 ring-parchment"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-[15px] text-ink truncate">unlocksinyalsolo</h3>
              <svg className="h-3.5 w-3.5 shrink-0 fill-primary" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.6l-3.1-3.1 1.4-1.4 1.7 1.7 4.5-4.5 1.4 1.4-5.9 5.9z" /></svg>
            </div>
            <p className="text-[11.5px] text-ink-muted font-medium truncate">
              unlocksinyalsolo &middot; {highlights.length} highlight &middot; {totalItems} testimoni
            </p>
          </div>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/8 hover:bg-primary/12 transition-colors"
            aria-label="Buka profil Instagram"
          >
            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7v9" /></svg>
          </a>
        </div>

        {/* Divider */}
        <div className="h-px bg-hairline mx-4" />

        {/* Highlight rings — klik untuk buka lightbox isinya */}
        {highlights.length > 0 && (
          <div className="px-4 pt-3.5 pb-1">
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
              {highlights.map((h, i) => (
                <button
                  key={h.id || h.title}
                  type="button"
                  onClick={() => (h.items?.length ? setActive(i) : h.url && window.open(h.url, "_blank", "noopener,noreferrer"))}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-14 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px] transition-transform group-active:scale-95">
                    {h.cover ? (
                      <img
                        src={h.cover}
                        alt={h.title}
                        width={44}
                        height={44}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-parchment flex items-center justify-center">
                        <svg className="h-5 w-5 fill-rose-500" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-ink-muted whitespace-nowrap max-w-full truncate">
                    {h.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stories testimoni (24 jam, auto-sync) */}
        {storyList.length > 0 && (
          <div className="pt-3 pb-1">
            <div className="px-4 mb-2 flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Story terbaru</span>
              <span className="ml-auto text-[10px] text-ink-muted/70">{storyList.length} story</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
              {storyList.map((s, i) => (
                <div
                  key={s.url + i}
                  className="shrink-0 w-[88px] aspect-[3/5] rounded-2xl overflow-hidden bg-canvas ring-1 ring-hairline relative"
                >
                  <img src={s.url} alt="Story testimoni" className="w-full h-full object-cover" loading="lazy" />
                  {s.takenAt && (
                    <span className="absolute bottom-1 left-1 right-1 text-[8px] text-white font-semibold drop-shadow text-center">
                      {fmtDate(s.takenAt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: link profil */}
        <div className="p-4 pt-3">
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-primary"
          >
            Lihat profil Instagram lengkap
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </a>
        </div>
      </div>

      {active !== null && highlights[active] && (
        <Lightbox
          highlight={highlights[active]}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

/** Lightbox full-screen: isi highlight, swipe horizontal. */
function Lightbox({ highlight, onClose }: { highlight: IGHighlight; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const items = highlight.items?.length ? highlight.items : [];
  const current = items[idx];

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, items.length - 1)), [items.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    // Kunci scroll body saat lightbox terbuka.
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Highlight ${highlight.title}`}
    >
      {/* Bar atas: judul + tombol tutup */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white safe-area-top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px] shrink-0">
          {highlight.cover && (
            <img src={highlight.cover} alt="" className="w-full h-full rounded-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[14px] truncate">{highlight.title}</p>
          <p className="text-[10.5px] text-white/60">
            unlocksinyalsolo &middot; {idx + 1}/{items.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center"
          aria-label="Tutup"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Area gambar: klik kiri/kanan untuk nav, tombol panah di desktop */}
      <div
        className="flex-1 flex items-center justify-center relative px-2 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={`Testimoni ${highlight.title} ${idx + 1}`}
          className="max-h-full max-w-full object-contain rounded-lg"
        />

        {idx > 0 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 active:bg-white/25 flex items-center justify-center"
            aria-label="Sebelumnya"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        {idx < items.length - 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 active:bg-white/25 flex items-center justify-center"
            aria-label="Berikutnya"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {/* Progress bar bawah */}
      <div
        className="flex gap-1 px-4 py-3 safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it, i) => (
          <button
            key={it.url + i}
            type="button"
            onClick={() => setIdx(i)}
            className="h-1 flex-1 rounded-full overflow-hidden bg-white/20"
            aria-label={`Ke testimoni ${i + 1}`}
          >
            <span
              className="block h-full bg-white rounded-full transition-all"
              style={{ width: i === idx ? "100%" : i < idx ? "100%" : "0%" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
