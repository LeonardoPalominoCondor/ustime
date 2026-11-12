import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging'
import { arrayUnion, arrayRemove, doc, setDoc } from 'firebase/firestore'
import { app, db } from './firebase'
import { PUSH } from './paths'
export { DEFAULT_PREFS, PREF_LABELS } from './notifyplan.js'

export async function pushSupported() { try { return 'serviceWorker' in navigator && 'Notification' in window && (await isSupported()) } catch { return false } }
// Pide permiso, registra el service worker y guarda el token FCM de ESTE dispositivo (solo el dueño puede leerlo).
export async function enablePush(uid) {
  if (!(await pushSupported())) throw new Error('Este navegador no admite notificaciones push. En iPhone instala primero la app en la pantalla de inicio.')
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY; if (!vapidKey) throw new Error('Falta VITE_FIREBASE_VAPID_KEY (clave web push de Firebase).')
  const perm = await Notification.requestPermission(); if (perm !== 'granted') throw new Error('Permiso denegado. Actívalo en los ajustes del navegador para este sitio.')
  const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg }); if (!token) throw new Error('No se pudo obtener el token de notificaciones.')
  await setDoc(doc(db, PUSH, uid), { tokens: arrayUnion(token), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updatedAt: Date.now() }, { merge: true })
  localStorage.setItem('ustime_push_token', token); return token
}
export async function disablePush(uid) {
  const t = localStorage.getItem('ustime_push_token'); if (t) await setDoc(doc(db, PUSH, uid), { tokens: arrayRemove(t) }, { merge: true })
  try { await deleteToken(getMessaging(app)) } catch { /* sin token */ } localStorage.removeItem('ustime_push_token')
}
export const savePrefs = (uid, prefs) => setDoc(doc(db, PUSH, uid), { prefs, updatedAt: Date.now() }, { merge: true })
// Muestra una notificación local (sin servidor) para comprobar permisos y apariencia.
export async function localTest() {
  if (!('serviceWorker' in navigator)) throw new Error('Sin service worker')
  if (Notification.permission !== 'granted') throw new Error('Primero activa las notificaciones.')
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('🔔 UsTime', { body: 'Así se verán tus avisos', icon: '/icon-192.png', badge: '/icon-192.png', tag: 'test', data: { url: '/' } })
}
