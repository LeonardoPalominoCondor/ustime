
import { auth } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { PUSH } from './paths'
import { TEST } from './paths'

const WORKER_URL = import.meta.env.VITE_USTIME_WORKER_URL

export async function testWorkerAuth() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Primero inicia sesión en UsTime.')
  }

  if (!WORKER_URL) {
    throw new Error('Falta VITE_USTIME_WORKER_URL en .env.local')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${WORKER_URL}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idToken })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'No se pudo verificar la sesión.')
  }

  console.log('Verificación de UsTime:', {
    authenticated: result.authenticated,
    uid: result.uid,
    email: result.email,
    emailVerified: result.emailVerified
  })

  return result
}

export async function testWorkerPush() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Primero inicia sesión.')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${WORKER_URL}/test-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idToken })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Error al enviar la prueba.')
  }

  console.log('Resultado de notificación:', result)

  return result
}

export async function inspectPushTokens() {
  const user = auth.currentUser

  if (!user) throw new Error('No hay sesión iniciada.')

  const snap = await getDoc(doc(db, PUSH, user.uid))
  const data = snap.data()

  const result = {
    uid: user.uid,
    collection: PUSH,
    exists: snap.exists(),
    tokenCount: Array.isArray(data?.tokens) ? data.tokens.length : null,
    tokenTypes: Array.isArray(data?.tokens)
      ? data.tokens.map(token => typeof token)
      : []
  }

  console.log('Inspección Firestore:', result)
  return result
}


export async function sendJarNote(coupleId, note) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Primero inicia sesión.')
  }

  if (!WORKER_URL) {
    throw new Error('Falta VITE_USTIME_WORKER_URL.')
  }

  const idToken = await user.getIdToken()

  const endpoint = TEST
    ? '/test/jar/send'
    : '/jar/send'

  const response = await fetch(`${WORKER_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idToken,
      coupleId,
      text: note.text,
      color: note.color,
      when: note.when
    })
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || 'No se pudo enviar la nota.'
    )
  }

  console.log('Resultado del envío del frasco:', {
    noteId: result.noteId,
    notification: result.notification,
    notificationError: result.notificationError
  })

  return result
}
