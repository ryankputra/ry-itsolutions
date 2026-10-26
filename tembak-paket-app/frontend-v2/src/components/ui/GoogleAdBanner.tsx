"use client";

import { useEffect } from "react";

interface GoogleAdBannerProps {
  slot?: string;
  format?: string;
  className?: string;
}

export default function GoogleAdBanner({ slot = "3892653630", format = "auto", className = "" }: GoogleAdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ad blocker or adsbygoogle not loaded yet
    }
  }, []);

  return (
    <div className={`my-4 overflow-hidden rounded-2xl bg-canvas/50 border border-hairline/60 p-2 text-center text-xs text-ink-muted ${className}`}>
      {/* Non-intrusive banner ad container */}
      <div className="text-[10px] uppercase tracking-wider mb-1 opacity-50">Iklan Sponsor</div>
      <div className="min-h-[90px] flex items-center justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-2898811488813299"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
