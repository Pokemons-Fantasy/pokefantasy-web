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

  // Se muestra siempre, también con la web a la vista: el turno del draft y el cierre de ventana no tienen
  // otro aviso fuera del Draft, y Safari retira el permiso si un push no muestra nada. La etiqueta evita
  // que se acumulen avisos repetidos.
  event.waitUntil(self.registration.showNotification(notification.title || 'PokeFantasy', {
    body: notification.body || '',
    icon: notification.icon || '/icons/icon-192.png',
    // Android pinta el icono pequeño solo con la transparencia: monocromo, o sale un cuadrado blanco
    badge: '/icons/badge-96.png',
    tag: tag || undefined,
    renotify: !!tag,
    data: { link },
  }));
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
