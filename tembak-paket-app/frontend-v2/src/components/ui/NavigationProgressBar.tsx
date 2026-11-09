"use client";
import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  const t1Ref = useRef<NodeJS.Timeout | null>(null);
  const t2Ref = useRef<NodeJS.Timeout | null>(null);
  const fallbackRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPendingTimers = () => {
    if (t1Ref.current) clearTimeout(t1Ref.current);
    if (t2Ref.current) clearTimeout(t2Ref.current);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    t1Ref.current = null;
    t2Ref.current = null;
    fallbackRef.current = null;
    completeTimerRef.current = null;
  };

  // Complete progress bar on route change
  useEffect(() => {
    if (isNavigating || progress > 0) {
      clearPendingTimers();
      setProgress(100);
      completeTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
    }
    return () => {
      clearPendingTimers();
    };
  }, [pathname]);

  // Intercept internal link taps for instant tactile and visual response
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Ignore modified clicks or non-primary mouse buttons
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");

      // Only internal routes
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !href.startsWith("/#") &&
        href !== "#" &&
        !target.getAttribute("target") &&
        !target.getAttribute("download")
      ) {
        // Do not trigger if clicking current route
        try {
          const targetUrl = new URL(target.href, window.location.href);
          const currentUrl = new URL(window.location.href);
          if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
            return;
          }
        } catch {}

        // Subtle haptic feedback for mobile devices
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(15);
          } catch {}
        }

        clearPendingTimers();

        // Start glowing progress bar instantly
        setIsNavigating(true);
        setProgress(35);

        t1Ref.current = setTimeout(() => setProgress((p) => (p < 75 ? 75 : p)), 120);
        t2Ref.current = setTimeout(() => setProgress((p) => (p < 90 ? 90 : p)), 350);

        // Safety fallback: if navigation takes too long or cancels, reset after 4s
        fallbackRef.current = setTimeout(() => {
          setIsNavigating(false);
          setProgress(0);
        }, 4000);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
      clearPendingTimers();
    };
  }, [pathname]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3.5px] bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 0.2s ease-out, opacity 0.3s 0.08s ease"
              : "width 0.35s cubic-bezier(0.1, 0.6, 0.1, 1)",
        }}
      />
    </div>
  );
}
