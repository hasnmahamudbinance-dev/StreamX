// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.notification?.title || 'StreamX';
  const options = {
    body: data.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
