"use client";
import React, { useEffect, useState } from 'react';
import { Bell, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import Swal from '@/lib/sweetalert';

const STORAGE_DISMISS_KEY = 'ry_push_dismissed_until';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PushNotificationBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    if (!supported) return;

    // Already granted or denied
    if (Notification.permission !== 'default') return;

    // Check dismissed timeout (7 days)
    const dismissedUntil = localStorage.getItem(STORAGE_DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // Delay banner display by 3 seconds for pleasant UX
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    // Dismiss for 7 days
    try {
      localStorage.setItem(STORAGE_DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (e) {}
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShowBanner(false);
        return;
      }

      // 1. Get VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key');
      const keyData = await keyRes.json();
      if (!keyData?.status || !keyData.publicKey) {
        throw new Error('VAPID public key tidak tersedia');
      }

      // 2. Wait for service worker ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to PushManager
      const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 4. Send subscription to server
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription })
      });

      const saveData = await saveRes.json();
      if (saveData?.status) {
        setShowBanner(false);
        Swal.fire({
          title: 'Notifikasi Aktif! 🔔',
          text: 'Pemberitahuan layanan baru & promo spesial kini akan langsung berdering di status bar HP Anda.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (err: any) {
      console.error('[PushNotification] Subscription error:', err);
      setShowBanner(false);
    } finally {
      setSubscribing(false);
    }
  };

  if (!isSupported || !showBanner) return null;

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
              <span>Aktifkan Notifikasi HP</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </h4>
            <p className="text-[11px] sm:text-xs text-ink-muted leading-relaxed">
              Dapatkan pemberitahuan langsung di status bar HP saat ada layanan baru (misal: Unblock IMEI) & promo diskon.
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
