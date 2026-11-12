// Service worker de UsTime: hace instalable la app y muestra las notificaciones push (mensajes FCM de solo datos).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: 'UsTime', body: e.data ? e.data.text() : '' } }
  const n = d.data || d
  e.waitUntil(self.registration.showNotification(n.title || 'UsTime', { body: n.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: n.tag || 'ustime', data: { url: n.url || '/' } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => { const c = cs.find((x) => 'focus' in x); return c ? c.focus() : self.clients.openWindow(url) }))
})
