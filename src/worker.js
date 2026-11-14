
import { auth } from './firebase'
import { TEST } from './paths'

const WORKER_URL = import.meta.env.VITE_USTIME_WORKER_URL

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
