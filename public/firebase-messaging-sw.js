/*
 * Service worker de los avisos push de la web (FCM). Sin el SDK de Firebase: FCM entrega cada aviso como un
 * push estándar con { notification: { title, body, icon }, data: { link, tag } }. El back pone el enlace y la
 * etiqueta en data para no depender de cómo nombra FCM sus campos (fcmOptions).
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const link = data.link || (payload.fcmOptions && payload.fcmOptions.link) || '/';
  const tag = data.tag || notification.tag;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Con la web a la vista ya salen los avisos en pantalla (SSE): igual que hace el SDK de Firebase
    if (windows.some((client) => client.visibilityState === 'visible')) return;
    await self.registration.showNotification(notification.title || 'PokeFantasy', {
      body: notification.body || '',
      icon: notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: tag || undefined,
      renotify: !!tag,
      data: { link },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.link) || '/', self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === target.origin);
    if (open) {
      await open.focus();
      try {
        await open.navigate(target.href);
        return;
      } catch {
        // Pestaña no controlada por este service worker: se abre una nueva
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
