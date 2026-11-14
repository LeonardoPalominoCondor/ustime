
import { getMessaging, isSupported, onMessage } from 'firebase/messaging'
import { app } from './firebase'

export async function startForegroundPush() {
  if (!('serviceWorker' in navigator)) return

  if (!(await isSupported())) {
    console.warn('[UsTime] Firebase Messaging no está disponible')
    return
  }

  await navigator.serviceWorker.ready

  const messaging = getMessaging(app)

  onMessage(messaging, async (payload) => {
    console.log('[UsTime] Mensaje recibido en primer plano:', payload)

    const data = payload.data || {}
    const registration = await navigator.serviceWorker.ready

    await registration.showNotification(
      data.title || '🔔 UsTime',
      {
        body: data.body || 'Tienes una nueva notificación.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'ustime',
        data: { url: data.url || '/' }
      }
    )
  })

  console.log('[UsTime] Receptor de notificaciones en primer plano activo')
}
