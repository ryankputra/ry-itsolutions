"use client";

import { useEffect, useState } from "react";
import { safeJson } from "@/lib/api";

const IG_URL = "https://www.instagram.com/unlocksinyalsolo";
const FALLBACK_HIGHLIGHTS = ["TESTI SEPT '26", "TESTI AUG'26", "TESTI JULE'26", "TESTI JUNE '26"];

interface IGFeed {
  profile: boolean;
  count: number;
  images: string[];
  highlights?: { title: string; count: number }[];
}

export default function IGTestiPreview() {
  const [feed, setFeed] = useState<IGFeed>({ profile: false, count: 0, images: [] });

  useEffect(() => {
    fetch(`/api/ig-feed?_t=${Date.now()}`, { cache: "no-store" })
      .then(safeJson)
      .then((data) => {
        if (data?.status && Array.isArray(data.images)) {
          setFeed({ profile: Boolean(data.profile), count: Number(data.count) || 0, images: data.images });
        }
      })
      .catch(() => {});
  }, []);

  // ponytail: kalau folder ig-testi kosong, sembunyikan card.
  // Cron sync highlight IG yang isi folder ini (butuh IG_GRAPH_TOKEN).
  if (!feed.images.length) return null;

  const highlightNames = feed.highlights?.length
    ? feed.highlights.map((h) => h.title)
    : FALLBACK_HIGHLIGHTS;

  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-3xl bg-parchment border border-hairline overflow-hidden shadow-sm hover:shadow-lg transition-all active:scale-[0.985] group"
    >
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
          {/* badge verified */}
          <svg className="absolute -bottom-0.5 -right-0.5 h-5 w-5 fill-primary" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" className="fill-parchment" />
            <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm-1.2 11.4l-3-3 1.2-1.2 1.8 1.8 4.2-4.2 1.2 1.2-5.4 5.4z" transform="scale(0.75) translate(4,4)" className="fill-primary" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="font-bold text-[15px] text-ink truncate">unlocksinyalsolo</h3>
            <svg className="h-3.5 w-3.5 shrink-0 fill-primary" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.6l-3.1-3.1 1.4-1.4 1.7 1.7 4.5-4.5 1.4 1.4-5.9 5.9z" /></svg>
          </div>
          <p className="text-[11.5px] text-ink-muted font-medium truncate">
            unlocksinyalsolo &middot; {highlightNames.length} highlight testimoni
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/8 group-hover:bg-primary/12 transition-colors">
          <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7v9" /></svg>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-hairline mx-4" />

      {/* Highlight rings */}
      <div className="px-4 pt-3.5 pb-1">
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
          {highlightNames.map((h) => (
            <div key={h} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]">
                <div className="w-full h-full rounded-full bg-parchment flex items-center justify-center">
                  <svg className="h-5 w-5 fill-rose-500" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                </div>
              </div>
              <span className="text-[9px] font-semibold text-ink-muted whitespace-nowrap">{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cover highlight testimoni */}
      <div className="p-4.5 pt-3">
        <div className="grid grid-cols-4 gap-1.5">
          {feed.images.slice(0, 4).map((src, i) => (
            <div key={src} className="aspect-square rounded-xl overflow-hidden bg-canvas">
              <img
                src={src}
                alt={`Cover testimoni ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3.5 text-[12px] font-bold text-primary">
          Lihat semua testimoni di Instagram
          <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </div>
      </div>
    </a>
  );
}
