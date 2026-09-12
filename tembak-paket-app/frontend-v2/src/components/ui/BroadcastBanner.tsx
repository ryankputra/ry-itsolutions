"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Megaphone, Layers } from "lucide-react";

export interface AnnouncementItem {
  id?: string;
  message: string;
  bgColor?: string;
  createdAt?: string;
}

interface BroadcastBannerProps {
  className?: string;
  initialAnnouncements?: AnnouncementItem[];
}

export function BroadcastBanner({ className = "", initialAnnouncements }: BroadcastBannerProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Sync if initialAnnouncements prop updates
  useEffect(() => {
    if (Array.isArray(initialAnnouncements) && initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
    }
  }, [initialAnnouncements]);

  // Fetch from API to ensure always up to date
  useEffect(() => {
    let isMounted = true;
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/user/announcement", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status && isMounted) {
          if (Array.isArray(data.announcements) && data.announcements.length > 0) {
            setAnnouncements(data.announcements);
          } else if (data.data && data.data.message) {
            setAnnouncements([data.data]);
          }
        }
      } catch (err) {
        // silent fail
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto rotate when multiple announcements
  useEffect(() => {
    if (announcements.length <= 1 || isExpanded || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [announcements.length, isExpanded, isPaused]);

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
      }
    }
    touchStartX.current = null;
  };

  const renderMessageContent = (message: string) => {
    return (
      <span className="leading-relaxed select-text font-medium">
        {message}
      </span>
    );
  };

  // SINGLE ANNOUNCEMENT MODE
  if (announcements.length === 1) {
    const item = announcements[0];
    const bg = item.bgColor || "#0066cc";
    return (
      <div
        className={`rounded-2xl p-3.5 sm:p-4 text-white text-xs sm:text-sm font-medium flex items-center gap-3 shadow-sm transition-all ${className}`}
        style={{ backgroundColor: bg }}
      >
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Megaphone className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {renderMessageContent(item.message)}
        </div>
      </div>
    );
  }

  // MULTIPLE ANNOUNCEMENTS: EXPANDED LIST MODE
  if (isExpanded) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Megaphone className="w-3.5 h-3.5 text-primary" />
            <span>Semua Pengumuman &amp; Promo ({announcements.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            <span>Mode Slider</span>
          </button>
        </div>

        <div className="space-y-2">
          {announcements.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-2xl p-3.5 sm:p-4 text-white text-xs sm:text-sm font-medium flex items-start sm:items-center gap-3 shadow-sm transition-all"
              style={{ backgroundColor: item.bgColor || "#0066cc" }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-black text-xs">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                {renderMessageContent(item.message)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // MULTIPLE ANNOUNCEMENTS: INTERACTIVE CAROUSEL SLIDER MODE
  const currentItem = announcements[currentIndex] || announcements[0];
  const bg = currentItem.bgColor || "#0066cc";

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative rounded-2xl p-3.5 sm:p-4 text-white shadow-sm transition-all duration-300 overflow-hidden ${className}`}
      style={{ backgroundColor: bg }}
    >
      {/* Top Header Controls: Badge, Slide Counter & Arrow Buttons */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/15">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/90">
          <div className="w-4.5 h-4.5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="uppercase tracking-wider text-[10px]">Info &amp; Promo Web</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-mono font-bold">
            {currentIndex + 1} / {announcements.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle All Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer mr-1"
            title="Lihat semua pengumuman sekaligus"
          >
            Lihat Semua ({announcements.length})
          </button>

          {/* Prev Slide Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Pengumuman sebelumnya"
            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Next Slide Arrow */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Pengumuman berikutnya"
            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Broadcast Message */}
      <div className="flex items-start sm:items-center gap-3 min-h-[38px]">
        <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium">
          {renderMessageContent(currentItem.message)}
        </div>
      </div>

      {/* Bottom Progress Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-1">
        {announcements.map((_, dotIdx) => (
          <button
            key={dotIdx}
            type="button"
            onClick={() => setCurrentIndex(dotIdx)}
            aria-label={`Buka pengumuman ke-${dotIdx + 1}`}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              dotIdx === currentIndex
                ? "w-5 bg-white shadow-xs"
                : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
