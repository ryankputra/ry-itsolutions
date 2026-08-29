"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress bar on route change
  useEffect(() => {
    if (isNavigating || progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Intercept internal link taps for instant tactile and visual response
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      
      // Only internal routes
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !target.getAttribute("target") &&
        !target.getAttribute("download")
      ) {
        // Subtle haptic feedback for mobile devices
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(15);
          } catch {}
        }

        // Start glowing progress bar instantly
        setIsNavigating(true);
        setProgress(30);

        const t1 = setTimeout(() => setProgress((p) => (p < 70 ? 70 : p)), 100);
        const t2 = setTimeout(() => setProgress((p) => (p < 88 ? 88 : p)), 300);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => document.removeEventListener("click", handleAnchorClick, { capture: true });
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
              ? "width 0.2s ease-out, opacity 0.35s 0.1s ease"
              : "width 0.4s cubic-bezier(0.1, 0.6, 0.1, 1)",
        }}
      />
    </div>
  );
}
