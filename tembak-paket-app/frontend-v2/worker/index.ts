/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Listen for incoming Web Push Notifications from server
self.addEventListener('push', (event: any) => {
  let data: any = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Ry-ITSolutions',
      body: event.data ? event.data.text() : 'Ada pembaruan layanan & promo baru!'
    };
  }

  const title = data.title || 'Ry-ITSolutions';
  const options: any = {
    body: data.body || 'Buka aplikasi untuk melihat promo & layanan terbaru.',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || `ry-${Date.now()}`,
    vibrate: [200, 100, 200],
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listen for notification clicks on mobile status bar
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client && client.url && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

export {};
