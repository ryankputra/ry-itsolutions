"use client";

/**
 * Robust Web Push Client for Browser / Mobile Devices
 * Handles explicit Service Worker registration, VAPID subscription, auto-sync, and test pushes.
 */

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

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Explicitly register /sw.js to guarantee the service worker is active and ready.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('[PushClient] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Subscribe current device to Web Push Notification
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message: string;
  subscription?: PushSubscription;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      message: 'Browser perangkat ini belum mendukung Web Push Notifications (misal: iOS memerlukan Add to Home Screen).'
    };
  }

  try {
    // 1. Request user permission
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return {
        success: false,
        message: 'Izin notifikasi belum diberikan. Silakan izinkan notifikasi pada pop-up browser.'
      };
    }

    // 2. Ensure Service Worker is registered
    const reg = await registerServiceWorker();
    if (!reg) {
      return {
        success: false,
        message: 'Gagal mengaktifkan Service Worker di browser Anda.'
      };
    }

    // 3. Fetch VAPID public key
    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyData?.status || !keyData.publicKey) {
      return {
        success: false,
        message: 'Kunci VAPID push notifikasi server tidak tersedia.'
      };
    }

    // 4. Get existing or subscribe new
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey
      });
    }

    // 5. Send subscription to server
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscription })
    });
    const saveData = await saveRes.json();

    if (saveData?.status) {
      return {
        success: true,
        message: 'Notifikasi status bar HP berhasil diaktifkan!',
        subscription
      };
    } else {
      return {
        success: false,
        message: saveData?.message || 'Gagal mendaftarkan perangkat ke server.'
      };
    }
  } catch (err: any) {
    console.error('[PushClient] Error subscribing:', err);
    return {
      success: false,
      message: err?.message || 'Terjadi gangguan saat mendaftarkan notifikasi.'
    };
  }
}

/**
 * Automatically sync and register if permission is already granted
 */
export async function autoSyncPushIfGranted(): Promise<boolean> {
  if (typeof window === 'undefined' || !isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyData?.status || !keyData.publicKey) return false;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscription })
    });
    return true;
  } catch (err) {
    console.warn('[PushClient] Auto-sync skipped:', err);
    return false;
  }
}

/**
 * Send an instant test push notification to this device
 */
export async function testPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const reg = await registerServiceWorker();
    const sub = reg ? await reg.pushManager.getSubscription() : null;

    const res = await fetch('/api/push/test-me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint: sub?.endpoint })
    });
    const data = await res.json();
    return {
      success: !!data.status,
      message: data.message || (data.status ? 'Notifikasi tes terkirim!' : 'Gagal mengirim')
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server untuk uji notifikasi.'
    };
  }
}
