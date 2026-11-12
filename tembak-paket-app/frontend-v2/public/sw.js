// Service Worker khusus Web Push Notification (tanpa fitur offline/PWA cache)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      try {
        payload = { body: event.data.text() };
      } catch (textErr) {
        payload = {};
      }
    }
  }

  const title = payload.title || 'Ry-ITSolutions';
  const options = {
    body: payload.body || 'Ada pembaruan layanan & promo baru!',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/badge.png',
    tag: payload.tag || 'ry-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(targetUrl).then((navigated) => (navigated || client).focus());
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
