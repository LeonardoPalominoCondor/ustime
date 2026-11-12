import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, collection, addDoc, runTransaction, deleteField } from 'firebase/firestore'
import { db } from './firebase'
import { USERS, COUPLES } from './paths'
import { normalizeEvent } from './events'

export const saveProfile = (uid, data) => setDoc(doc(db, USERS, uid), data, { merge: true })

export async function createCouple(uid) {
  const id = Math.random().toString(36).slice(2, 8).toUpperCase()
  await setDoc(doc(db, COUPLES, id), { members: [uid], createdAt: serverTimestamp() })
  await saveProfile(uid, { coupleId: id })
}
export async function joinCouple(uid, code) {
  const id = code.trim().toUpperCase()
  const ref = doc(db, COUPLES, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('No encontramos ese código. Revisa que esté bien escrito.')
  const members = snap.data().members
  if (!members.includes(uid)) {
    if (members.length >= 2) throw new Error('Esa pareja ya está completa.')
    await updateDoc(ref, { members: arrayUnion(uid) })
  }
  await saveProfile(uid, { coupleId: id })
}

export const entryId = (m) => `${m.type}_${m.tmdbId}`
export const saveEntry = (cid, m, patch) =>
  setDoc(doc(db, COUPLES, cid, 'entries', entryId(m)), {
    type: m.type, tmdbId: m.tmdbId, title: m.title, year: m.year || '', poster: m.poster || null, genres: m.genres || [],
    ...patch, updatedAt: serverTimestamp(),
  }, { merge: true })
export const removeEntry = (cid, m) => deleteDoc(doc(db, COUPLES, cid, 'entries', entryId(m)))

/* ---------- eventos ---------- */
const evRef = (cid, id) => doc(db, COUPLES, cid, 'events', id)
export const addEvent = async (cid, ev) => (await addDoc(collection(db, COUPLES, cid, 'events'), { status: 'planned', photos: [], ...ev, createdAt: serverTimestamp() })).id
export const patchEvent = (cid, id, patch) => updateDoc(evRef(cid, id), { ...patch, updatedAt: serverTimestamp() })
export const removeEvent = (cid, id) => deleteDoc(evRef(cid, id))

export const MAX_PHOTOS = 10
const MAX_PHOTO_CHARS = 900_000 // límite de 1 MB por documento de Firestore (con margen)
// Todas las operaciones de fotos son transacciones: si la pareja edita a la vez, no se pierde nada.
async function editPhotos(cid, id, fn) {
  await runTransaction(db, async (tx) => {
    const s = await tx.get(evRef(cid, id)); if (!s.exists()) throw new Error('El evento ya no existe.')
    const photos = checkSize(fn([...normalizeEvent({ id, ...s.data() }).photos]))
    tx.update(evRef(cid, id), { photos, photo: deleteField(), updatedAt: serverTimestamp() })
  })
}
const pid = () => Math.random().toString(36).slice(2, 9)
const checkSize = (p) => { if (p.reduce((s, x) => s + x.data.length, 0) > MAX_PHOTO_CHARS) throw new Error('Las fotos pesan demasiado juntas. Elimina alguna o sube menos a la vez.'); return p }
export const addPhoto = (cid, id, data, by) => editPhotos(cid, id, (p) => { if (p.length >= MAX_PHOTOS) throw new Error(`Máximo ${MAX_PHOTOS} fotos por evento.`); return [...p, { id: pid(), data, at: Date.now(), by }] })
// Agrega varias fotos de una sola vez (una transacción). Devuelve cuántas cupieron.
export async function addPhotos(cid, id, datas, by) {
  let added = 0
  await editPhotos(cid, id, (p) => { const room = Math.max(0, MAX_PHOTOS - p.length); const take = datas.slice(0, room); added = take.length; if (!added) throw new Error(`Ya hay ${MAX_PHOTOS} fotos (el máximo).`); return [...p, ...take.map((data) => ({ id: pid(), data, at: Date.now(), by }))] })
  return added
}
export const replacePhoto = (cid, id, photoId, data, by) => editPhotos(cid, id, (p) => p.map((x) => (x.id === photoId ? { id: pid(), data, at: Date.now(), by } : x)))
export const removePhoto = (cid, id, photoId) => editPhotos(cid, id, (p) => p.filter((x) => x.id !== photoId))
// Marca el XP de la cita como entregado de forma atómica (true = hay que premiar ahora; solo ocurre una vez).
export const claimEventXp = (cid, id) => runTransaction(db, async (tx) => {
  const s = await tx.get(evRef(cid, id)); const e = normalizeEvent({ id, ...s.data() })
  if (e.status !== 'done' || !e.photos.length || e.xpAwarded) return false
  tx.update(evRef(cid, id), { xpAwarded: true }); return true
})

export const saveAnswer = (cid, date, uid, text) => setDoc(doc(db, COUPLES, cid, 'answers', date), { [uid]: text }, { merge: true })

// Reduce cada foto a ~55 KB como máximo (con 10 fotos caben en un documento de Firestore sin usar Storage, que exige tarjeta).
export function compressImage(file, target = 55_000) {
  return new Promise((res, rej) => {
    if (!file?.type?.startsWith('image/')) return rej(new Error('Elige un archivo de imagen.'))
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      for (const [max, q] of [[900, 0.65], [800, 0.55], [720, 0.5], [640, 0.45], [560, 0.4], [480, 0.35]]) {
        const s = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        const out = c.toDataURL('image/jpeg', q)
        if (out.length * 0.75 <= target || max === 480) return res(out)
      }
    }
    img.onerror = () => rej(new Error('No se pudo leer la imagen.')); img.src = url
  })
}

/* ---------- Notas, frasco y partidas ---------- */
const sub = (cid, name) => collection(db, COUPLES, cid, name)
const sdoc = (cid, name, id) => doc(db, COUPLES, cid, name, id)
export const addNote = (cid, n) => addDoc(sub(cid, 'notes'), { ...n, done: false, createdAt: Date.now() })
export const patchNote = (cid, id, patch) => updateDoc(sdoc(cid, 'notes', id), { ...patch, updatedAt: Date.now() })
export const removeNote = (cid, id) => deleteDoc(sdoc(cid, 'notes', id))
export const addJarNote = (cid, n) => addDoc(sub(cid, 'jar'), { ...n, createdAt: Date.now(), readAt: null })
export const markJarRead = (cid, id) => updateDoc(sdoc(cid, 'jar', id), { readAt: Date.now() })
export const removeJarNote = (cid, id) => deleteDoc(sdoc(cid, 'jar', id))
export const addGame = async (cid, g) => (await addDoc(sub(cid, 'games'), { ...g, createdAt: Date.now(), updatedAt: Date.now(), rev: 0 })).id
// Cada jugada es una transacción: se lee la partida más reciente, se valida y se guarda (nadie pisa al otro).
export async function playGame(cid, id, apply) {
  let out
  await runTransaction(db, async (tx) => {
    const s = await tx.get(sdoc(cid, 'games', id)); if (!s.exists()) throw new Error('La partida ya no existe.')
    const g = s.data(); const r = apply({ id, ...g })
    out = { ...r, status: r.status }
    tx.update(sdoc(cid, 'games', id), { ...r, updatedAt: Date.now(), rev: (g.rev || 0) + 1 })
  })
  return out
}
export const removeGame = (cid, id) => deleteDoc(sdoc(cid, 'games', id))
