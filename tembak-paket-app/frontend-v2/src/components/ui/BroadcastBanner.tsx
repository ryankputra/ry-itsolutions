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

  useEffect(() => {
    if (initialAnnouncements && initialAnnouncements.length > 0) return;

    let isMounted = true;
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/user/announcement", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status && isMounted) {
          if (Array.isArray(data.announcements) && data.announcements.length > 0) {
            setAnnouncements(data.announcements);
          } else if (data.data && data.data.message) {
            setAnnouncements([data.data]);
          } else {
            setAnnouncements([]);
          }
        }
      } catch (err) {
        // silent fail
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60000); // refresh every 1 min
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialAnnouncements]);

  // Auto rotate when there are multiple announcements and not paused
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
        // swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
      } else {
        // swipe right -> prev
        setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
      }
    }
    touchStartX.current = null;
  };

  // Helper to extract voucher code if present
  const renderMessageContent = (message: string) => {
    return (
      <span className="leading-relaxed select-text">
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
        className={`rounded-2xl p-3.5 sm:p-4 text-white text-xs sm:text-sm font-medium flex items-center gap-3 shadow-xs transition-all ${className}`}
        style={{ backgroundColor: bg }}
      >
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.455a20.89 20.89 0 01-1.503-3.819m3.165-.4c.594-.05 1.189-.125 1.78-.226a11.956 11.956 0 004.832-2.016m-6.612 2.642a12.02 12.02 0 01-1.78-.226m10.172-4.432A11.96 11.96 0 0013.91 5.34m0 0a11.97 11.97 0 00-3.57-1.22m3.57 1.22c.594.05 1.189.125 1.78.226m-1.78-.226c-1.19.1-2.38.25-3.57.446" />
          </svg>
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
            <span>Semua Pengumuman & Promo ({announcements.length})</span>
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
              className="rounded-2xl p-3.5 sm:p-4 text-white text-xs sm:text-sm font-medium flex items-start sm:items-center gap-3 shadow-xs transition-all"
              style={{ backgroundColor: item.bgColor || "#0066cc" }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <span className="text-[11px] font-black">{idx + 1}</span>
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
      className={`relative rounded-2xl p-3.5 sm:p-4 text-white shadow-xs transition-all duration-300 overflow-hidden ${className}`}
      style={{ backgroundColor: bg }}
    >
      {/* Top Header Controls: Badge, Slide Counter & Arrow Buttons */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/15">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/90">
          <div className="w-4.5 h-4.5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="uppercase tracking-wider text-[10px]">Info & Promo Web</span>
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
        <svg className="w-5 h-5 shrink-0 text-white mt-0.5 sm:mt-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.455a20.89 20.89 0 01-1.503-3.819m3.165-.4c.594-.05 1.189-.125 1.78-.226a11.956 11.956 0 004.832-2.016m-6.612 2.642a12.02 12.02 0 01-1.78-.226m10.172-4.432A11.96 11.96 0 0013.91 5.34m0 0a11.97 11.97 0 00-3.57-1.22m3.57 1.22c.594.05 1.189.125 1.78.226m-1.78-.226c-1.19.1-2.38.25-3.57.446" />
        </svg>

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
