import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const saveProfile = (uid, data) => setDoc(doc(db, 'users', uid), data, { merge: true })

export async function createCouple(uid) {
  const id = Math.random().toString(36).slice(2, 8).toUpperCase()
  await setDoc(doc(db, 'couples', id), { members: [uid], createdAt: serverTimestamp() })
  await saveProfile(uid, { coupleId: id })
}

export async function joinCouple(uid, code) {
  const id = code.trim().toUpperCase()
  const ref = doc(db, 'couples', id)
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
  setDoc(
    doc(db, 'couples', cid, 'entries', entryId(m)),
    {
      type: m.type, tmdbId: m.tmdbId, title: m.title, year: m.year || '',
      poster: m.poster || null, genres: m.genres || [],
      ...patch, updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

export const removeEntry = (cid, m) => deleteDoc(doc(db, 'couples', cid, 'entries', entryId(m)))

import { collection, addDoc } from 'firebase/firestore'
export const addEvent = (cid, ev) => addDoc(collection(db, 'couples', cid, 'events'), { ...ev, done: false, createdAt: serverTimestamp() })
export const patchEvent = (cid, id, patch) => updateDoc(doc(db, 'couples', cid, 'events', id), patch)
export const removeEvent = (cid, id) => deleteDoc(doc(db, 'couples', cid, 'events', id))
export const saveAnswer = (cid, date, uid, text) => setDoc(doc(db, 'couples', cid, 'answers', date), { [uid]: text }, { merge: true })

// Reduce la foto (~60 KB) para guardarla en Firestore sin usar Storage (que exige tarjeta).
export function compressImage(file, max = 720, q = 0.65) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q))
    }
    img.onerror = rej; img.src = url
  })
}
