// Service worker mínimo: hace la app instalable (APK/PWA). No guarda caché para evitar versiones viejas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
