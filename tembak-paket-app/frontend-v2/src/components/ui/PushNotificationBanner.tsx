"use client";

import React, { useEffect, useState } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
import { Button } from './Button';
import Swal from '@/lib/sweetalert';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  autoSyncPushIfGranted,
  testPushNotification
} from '@/lib/pushClient';

const STORAGE_DISMISS_KEY = 'ry_push_dismissed_until';

export const PushNotificationBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    const perm = getNotificationPermission();

    // If permission is already granted, silently ensure registration and sync to server!
    if (perm === 'granted') {
      autoSyncPushIfGranted();
      return;
    }

    // If denied, don't nag user
    if (perm === 'denied') {
      return;
    }

    // If default, check 7 days dismissal
    const dismissedUntil = localStorage.getItem(STORAGE_DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // Show banner after brief delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(STORAGE_DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (e) {}
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setShowBanner(false);
        // Immediately fire a test notification so the user sees and hears it on their phone!
        await testPushNotification();

        Swal.fire({
          title: 'Notifikasi Bar HP Aktif! 🔔',
          text: 'Pemberitahuan layanan baru & promo spesial kini akan langsung berdering di status bar HP Anda.',
          icon: 'success',
          timer: 3500,
          showConfirmButton: false
        });
      } else {
        if (Notification.permission === 'denied') {
          setShowBanner(false);
          Swal.fire({
            title: 'Izin Notifikasi Diblokir',
            text: 'Izin notifikasi diblokir di setelan browser. Ketuk ikon gembok 🔒 di sebelah alamat web browser Anda -> Izin -> Izinkan Notifikasi.',
            icon: 'warning'
          });
        } else {
          Swal.fire({
            title: 'Perhatian',
            text: res.message,
            icon: 'info'
          });
        }
      }
    } catch (err: any) {
      console.error('[PushBanner] Subscribe error:', err);
    } finally {
      setSubscribing(false);
    }
  };

  if (!supported || !showBanner) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative p-4 sm:p-4.5 rounded-2xl border border-primary/30 bg-canvas/95 backdrop-blur-md shadow-2xl space-y-3 ring-1 ring-primary/20">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-ink-muted hover:text-ink transition-colors p-1 rounded-lg"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <div className="relative p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
              <span>Aktifkan Notifikasi Bar HP</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </h4>
            <p className="text-[11px] sm:text-xs text-ink-muted leading-relaxed">
              Dapatkan info di status bar HP saat ada layanan baru (misal: Unblock IMEI) & promo diskon spesial.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            Nanti Saja
          </button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xs"
            onClick={handleSubscribe}
            isLoading={subscribing}
          >
            Aktifkan Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
};
