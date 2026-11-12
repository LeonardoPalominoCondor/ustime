import React, { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, onSnapshot, collection } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { saveProfile, createCouple, joinCouple } from './db'
import { Ctx, AVATARS } from './ctx.js'
import { Cine, History, More, Sheet } from './screens.jsx'
import { PetScreen } from './pet.jsx'
import { Agenda } from './calendar.jsx'
import { ensureGame } from './game.js'


const Loading = () => <div className="center"><div className="spinner" /></div>

function Login() {
  const [err, setErr] = useState('')
  const go = async () => {
    setErr('')
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') signInWithRedirect(auth, googleProvider)
      else if (e.code !== 'auth/popup-closed-by-user') setErr('No pudimos iniciar sesión. Inténtalo otra vez.')
    }
  }
  return (
    <div className="center login">
      <div className="logo">🎟️</div>
      <h1>UsTime</h1>
      <p>Su tiempo juntos: películas, citas y una mascota que crece con ustedes.</p>
      <button className="btn big" onClick={go}>Entrar con Google</button>
      {err && <p className="error">{err}</p>}
    </div>
  )
}

function ProfileSetup({ user }) {
  const [username, setUsername] = useState(user.displayName?.split(' ')[0] || '')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const ok = username.trim().length >= 2
  return (
    <div className="page narrow">
      <h1>Crea tu perfil</h1>
      <p className="muted">Así te verá tu pareja.</p>
      <div className="avatar-xl">{avatar}</div>
      <div className="avatar-grid">{AVATARS.map((a) => <button key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>{a}</button>)}</div>
      <label>Nombre de usuario</label>
      <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} placeholder="Ej: osito_cine" />
      <button className="btn big" disabled={!ok} onClick={() => saveProfile(user.uid, { username: username.trim(), avatar })}>Continuar</button>
    </div>
  )
}

function Pairing({ user }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn() } catch (e) { setErr(e.message) } setBusy(false) }
  return (
    <div className="page narrow">
      <h1>Unan sus cuentas</h1>
      <p className="muted">Uno crea el espacio y le pasa el código al otro.</p>
      <div className="panel">
        <h3>Soy el primero</h3>
        <button className="btn" disabled={busy} onClick={() => run(() => createCouple(user.uid))}>Crear nuestro espacio</button>
      </div>
      <div className="panel">
        <h3>Ya tengo un código</h3>
        <input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
        <button className="btn" disabled={busy || code.length < 6} onClick={() => run(() => joinCouple(user.uid, code))}>Unirme</button>
      </div>
      {err && <p className="error">{err}</p>}
      <button className="link" onClick={() => signOut(auth)}>Cerrar sesión</button>
    </div>
  )
}

const TABS = [['pet', '🐾', 'Mascota'], ['cine', '🎬', 'Cine'], ['agenda', '📅', 'Agenda'], ['history', '🎞️', 'Historia'], ['more', '👤', 'Más']]

export default function App() {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [couple, setCouple] = useState(null)
  const [members, setMembers] = useState({})
  const [entries, setEntries] = useState([])
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('pet')
  const [open, setOpen] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  useEffect(() => {
    if (!user) { setProfile(undefined); return }
    return onSnapshot(doc(db, 'users', user.uid), (s) => setProfile(s.exists() ? s.data() : null))
  }, [user])
  useEffect(() => {
    if (!profile?.coupleId) { setCouple(null); return }
    return onSnapshot(doc(db, 'couples', profile.coupleId), (s) => setCouple(s.exists() ? { id: s.id, ...s.data() } : null))
  }, [profile?.coupleId])
  const key = couple?.members?.join(',')
  useEffect(() => {
    if (!couple) { setMembers({}); return }
    const uns = couple.members.map((uid) => onSnapshot(doc(db, 'users', uid), (s) => setMembers((m) => ({ ...m, [uid]: s.data() }))))
    return () => uns.forEach((u) => u())
  }, [key])
  useEffect(() => {
    if (!couple) { setEntries([]); setEvents([]); return }
    const a = onSnapshot(collection(db, 'couples', couple.id, 'entries'), (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const b = onSnapshot(collection(db, 'couples', couple.id, 'events'), (s) => setEvents(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    return () => { a(); b() }
  }, [couple?.id])
  // Primer huevo gratis: se crea una vez al entrar a la pareja
  const needsGame = !!couple && !couple.game
  useEffect(() => { if (needsGame) ensureGame(couple.id).catch(() => {}) }, [needsGame])

  if (user === undefined || (user && profile === undefined)) return <Loading />
  if (!user) return <Login />
  if (!profile?.username) return <ProfileSetup user={user} />
  if (!profile.coupleId || !couple) return <Pairing user={user} />

  const uids = couple.members
  const partnerUid = uids.find((u) => u !== user.uid)
  const ctx = { user, profile, couple, members, entries, events, uids, partnerUid, openTitle: setOpen }
  const screen = { pet: <PetScreen />, cine: <Cine />, agenda: <Agenda />, history: <History />, more: <More /> }[tab]

  return (
    <Ctx.Provider value={ctx}>
      <main className="page">{screen}</main>
      <nav className="tabs">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><span>{icon}</span><small>{label}</small></button>
        ))}
      </nav>
      {open && <Sheet item={open} onClose={() => setOpen(null)} />}
    </Ctx.Provider>
  )
}
