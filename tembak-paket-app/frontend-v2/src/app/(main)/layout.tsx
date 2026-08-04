"use client";
import React, { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    // Listen for PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    let currentVersion: number | null = null;
    
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/system-version", { credentials: "omit" });
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.version) {
            if (currentVersion === null) {
              currentVersion = data.version;
            } else if (currentVersion !== data.version) {
              // Version mismatch! Trigger refresh
              const Swal = (await import("sweetalert2")).default;
              await Swal.fire({
                title: 'Update Sistem 🚀',
                text: 'Ada pembaruan web terbaru nih. Halaman bakal di-refresh otomatis biar lancar!',
                icon: 'info',
                showConfirmButton: false,
                timer: 3000,
                allowOutsideClick: false
              });
              window.location.reload();
            }
          }
        }
      } catch (e) {}
    };

    // Check version immediately on load, then every 30s
    if (user) {
      checkVersion();
      const interval = setInterval(checkVersion, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return <MainLayout>{children}</MainLayout>;
}
