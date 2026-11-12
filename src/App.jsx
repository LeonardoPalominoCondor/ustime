import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { doc, onSnapshot, collection } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { USERS, COUPLES, TEST } from './paths'
import { Ctx } from './ctx.js'
import { saveProfile, createCouple, joinCouple } from './db'
import { Cine, More, Sheet } from './screens.jsx'
import { Inicio } from './home.jsx'
import { PetScreen, logText } from './pet.jsx'
import { Agenda, EventDetail } from './calendar.jsx'
import { ProfileEditor } from './profile.jsx'
import { Loading } from './ui.jsx'
import { Avatar } from './avatar.jsx'
import { ensureGame, normalizeGame } from './game.js'
import { dueReminders } from './events.js'
import { useTick } from './hooks'
import { now } from './clock'
import { logout } from './session.js'
import { useBackLayer, registerTabNav, pushTab } from './nav.js'
import { GamesHub } from './games/GamesHub.jsx'

// Las herramientas de prueba SOLO existen en builds con VITE_TEST_MODE=true (el bundler las elimina en producción).
const DevTools = import.meta.env.VITE_TEST_MODE === 'true' ? React.lazy(() => import('./dev/DevTools.jsx')) : null
const override = () => (TEST ? localStorage.getItem('ustime_test_session') || '' : '')

/* ---------- Pantallas de estado ---------- */
function Splash({ minMs = 0 }) {
  const [help, setHelp] = useState(false)
  useEffect(() => { const t = setTimeout(() => setHelp(true), 8000); return () => clearTimeout(t) }, [])
  return (
    <div className="center"><div className="logo bob">💞</div><div className="spinner" /><p className="muted">Abriendo UsTime…</p>
      {help && <><p className="muted small">Está tardando más de lo normal. Revisa tu conexión.</p><button className="btn ghost small" onClick={() => location.reload()}>Reintentar</button></>}</div>
  )
}
const ErrorScreen = ({ msg, onRetry }) => (
  <div className="center"><div className="logo">📡</div><h2>No pudimos cargar tus datos</h2><p className="muted">{msg || 'Revisa tu conexión e inténtalo de nuevo.'}</p><button className="btn" onClick={onRetry}>Reintentar</button><button className="link" onClick={logout}>Cerrar sesión</button></div>
)

function Login({ notice }) {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async () => {
    setErr(''); setBusy(true)
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') signInWithRedirect(auth, googleProvider)
      else if (e.code === 'auth/network-request-failed') setErr('Sin conexión. Revisa tu internet.')
      else if (e.code !== 'auth/popup-closed-by-user') setErr('No pudimos iniciar sesión. Inténtalo otra vez.')
    } finally { setBusy(false) }
  }
  return (
    <div className="center login"><div className="logo bob">💞</div><h1>UsTime</h1>
      <p>Su tiempo juntos: películas, citas y una mascota que crece con ustedes.</p>
      {notice && <p className="hint" role="status">{notice}</p>}
      <button className="btn big" disabled={busy} onClick={go}>{busy ? 'Conectando…' : 'Entrar con Google'}</button>{err && <p className="error" role="alert">{err}</p>}</div>
  )
}

function ProfileSetup({ user }) {
  return <div className="page narrow"><h1>Crea tu perfil</h1><p className="muted">Así te verá tu pareja. Podrás cambiarlo cuando quieras.</p>
    <ProfileEditor initial={{ username: user.displayName?.split(' ')[0] || '' }} label="Continuar" onSave={(d) => saveProfile(user.uid, d)} /></div>
}

function Pairing({ user, notice }) {
  const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn() } catch (e) { setErr(e.message) } setBusy(false) }
  return (
    <div className="page narrow"><h1>Unan sus cuentas</h1><p className="muted">Uno crea el espacio y le pasa el código al otro.</p>
      {notice && <p className="hint">{notice}</p>}
      <div className="panel"><h3>Soy el primero</h3><button className="btn" disabled={busy} onClick={() => run(() => createCouple(user.uid))}>Crear nuestro espacio</button></div>
      <div className="panel"><h3>Ya tengo un código</h3><input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" aria-label="Código de pareja" /><button className="btn" disabled={busy || code.length < 6} onClick={() => run(() => joinCouple(user.uid, code))}>Unirme</button></div>
      {err && <p className="error" role="alert">{err}</p>}<button className="link" onClick={logout}>Cerrar sesión</button></div>
  )
}

function Mailbox({ onClose }) {
  useBackLayer(onClose)
  const { game, members, user } = React.useContext(Ctx)
  return <div className="overlay" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}><button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
    <h2>📬 Buzón de hitos</h2>{!game?.log.length && <p className="empty">Aquí aparecerán los momentos importantes de su mascota.</p>}
    {game?.log.map((l, i) => <div key={i} className="logrow"><Avatar p={members[l.by]} size={26} /><div><span>{logText(l, members, user.uid)}</span><small className="muted">{new Date(l.t).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div></div>)}</div></div>
}
function Reminders({ due, onOpen, onDismiss }) {
  if (!due.length) return null
  return <div className="reminders" role="region" aria-label="Recordatorios">{due.map((e) => (
    <div key={e.rkey} className="rem" style={{ '--c': e.color }}><span>{e.icon}</span><div><b>{e.title}</b><small>{e.time ? `Hoy ${e.time}` : 'Recordatorio'}</small></div>
      <button className="btn small" onClick={() => { onOpen(e.id); onDismiss(e.rkey) }}>Ver</button><button className="x" aria-label="Descartar" onClick={() => onDismiss(e.rkey)}>✕</button></div>))}</div>
}

const TABS = [['home', '🏠', 'Inicio'], ['cine', '🎬', 'Cine'], ['agenda', '📅', 'Agenda'], ['pets', '🐾', 'Mascotas'], ['games', '🎮', 'Juegos'], ['more', '⋯', 'Más']]

export default function App() {
  const [user, setUser] = useState(undefined)
  const [expired, setExpired] = useState(false)
  const [profile, setProfile] = useState(undefined)   // undefined = cargando · null = no existe
  const [couple, setCouple] = useState(undefined)     // undefined = cargando · null = no existe
  const [members, setMembers] = useState({})
  const [entries, setEntries] = useState([])
  const [events, setEvents] = useState([])
  const [jar, setJar] = useState([])
  const [notes, setNotes] = useState([])
  const tabStack = useRef([])
  const [tab, setTab] = useState('home'); const [moreInit, setMoreInit] = useState(null)
  const [open, setOpen] = useState(null); const [openEv, setOpenEv] = useState(null); const [mail, setMail] = useState(false)
  const [fatal, setFatal] = useState(null); const [attempt, setAttempt] = useState(0)
  const [slow, setSlow] = useState(override() === 'slow')
  const hadUser = useRef(false)
  const ov = override()
  const fail = (e) => setFatal(e.code === 'permission-denied' ? 'No tienes permiso para ver estos datos.' : 'Sin conexión con el servidor.')

  useEffect(() => { if (slow) { const t = setTimeout(() => setSlow(false), 5000); return () => clearTimeout(t) } }, [])
  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (!u && hadUser.current) { const manual = sessionStorage.getItem('ustime_manual'); sessionStorage.removeItem('ustime_manual'); setExpired(!manual) }
    if (u) { hadUser.current = true; setExpired(false) }
    setUser(u)
  }), [])
  // Perfil: si el dato aún no llegó del servidor (solo caché vacía) seguimos “cargando” en vez de mostrar pantallas equivocadas.
  useEffect(() => {
    if (!user) { setProfile(undefined); return }
    setProfile(undefined)
    return onSnapshot(doc(db, USERS, user.uid), { includeMetadataChanges: true }, (s) => { if (s.exists()) setProfile(s.data()); else if (!s.metadata.fromCache) setProfile(null) }, fail)
  }, [user?.uid, attempt])
  const coupleId = profile?.coupleId
  useEffect(() => {
    if (!coupleId) { setCouple(profile === undefined ? undefined : null); return }
    setCouple(undefined)
    return onSnapshot(doc(db, COUPLES, coupleId), { includeMetadataChanges: true }, (s) => { if (s.exists()) setCouple({ id: s.id, ...s.data() }); else if (!s.metadata.fromCache) setCouple(null) }, fail)
  }, [coupleId, attempt])
  const key = couple?.members?.join(',')
  useEffect(() => {
    if (!couple) { setMembers({}); return }
    const uns = couple.members.map((uid) => onSnapshot(doc(db, USERS, uid), (s) => setMembers((m) => ({ ...m, [uid]: s.data() })), fail))
    return () => uns.forEach((u) => u())
  }, [key])
  useEffect(() => {
    if (!couple?.id) { setEntries([]); setEvents([]); setJar([]); setNotes([]); return }
    const a = onSnapshot(collection(db, COUPLES, couple.id, 'entries'), (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail)
    const b = onSnapshot(collection(db, COUPLES, couple.id, 'events'), (s) => setEvents(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail)
    const c = onSnapshot(collection(db, COUPLES, couple.id, 'jar'), (s) => setJar(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail)
    const d = onSnapshot(collection(db, COUPLES, couple.id, 'notes'), (s) => setNotes(s.docs.map((x) => ({ id: x.id, ...x.data() }))), fail)
    return () => { a(); b(); c(); d() }
  }, [couple?.id])
  // Botón/gesto «atrás»: vuelve a la pestaña anterior (las ventanas se cierran solas con su propia capa)
  useEffect(() => { registerTabNav(() => { const prev = tabStack.current.pop(); if (prev) { setMoreInit(null); setTab(prev) } }) }, [])
  const needsGame = !!couple && !couple.game
  useEffect(() => { if (needsGame && user) ensureGame(couple.id, user.uid).catch(() => {}) }, [needsGame])
  useEffect(() => { document.documentElement.dataset.calm = localStorage.getItem('ustime_calm') === '1' ? '1' : '' }, [])

  const game = useMemo(() => (couple?.game ? normalizeGame(JSON.parse(JSON.stringify(couple.game)), now()) : null), [couple])
  /* Recordatorios */
  const tick = useTick(30000)
  const [dismissed, setDismissed] = useState(() => new Set(JSON.parse(localStorage.getItem('ustime_rem') || '[]')))
  const due = useMemo(() => dueReminders(events, tick, dismissed), [events, tick, dismissed])
  const notified = useRef(new Set())
  useEffect(() => { due.forEach((e) => { if (!notified.current.has(e.rkey) && typeof Notification !== 'undefined' && Notification.permission === 'granted') { notified.current.add(e.rkey); navigator.serviceWorker?.ready.then((r) => r.showNotification(`${e.icon} ${e.title}`, { body: e.time ? `Hoy a las ${e.time}` : 'Recordatorio', icon: '/icon-192.png' })).catch(() => new Notification(e.title)) } }) }, [due])
  const dismiss = (k) => setDismissed((s) => { const n = new Set(s); n.add(k); localStorage.setItem('ustime_rem', JSON.stringify([...n].slice(-200))); return n })
  const seenKey = 'ustime_mail_seen'
  const [mailSeen, setMailSeen] = useState(+localStorage.getItem(seenKey) || 0)
  const unread = game ? game.log.filter((l) => l.t > mailSeen && l.by !== user?.uid).length : 0

  let body; let loggedIn = false
  if (fatal) body = <ErrorScreen msg={fatal} onRetry={() => { setFatal(null); setAttempt((a) => a + 1) }} />
  else if (ov === 'error') body = <ErrorScreen msg="(Prueba) Error de red simulado." onRetry={() => { localStorage.setItem('ustime_test_session', ''); location.reload() }} />
  else if (ov === 'expired') body = <Login notice="Tu sesión expiró. Entra de nuevo para continuar." />
  else if (user === undefined || slow) body = <Splash />
  else if (!user) body = <Login notice={expired ? 'Tu sesión expiró. Entra de nuevo para continuar.' : ''} />
  else if (profile === undefined) body = <Splash />
  else if (ov === 'newuser' || !profile?.username) body = <ProfileSetup user={user} />
  else if (ov === 'unlinked' || !profile.coupleId) body = <Pairing user={user} />
  else if (couple === undefined) body = <Splash />
  else if (couple === null) body = <Pairing user={user} notice="No encontramos tu espacio anterior. Vuelve a vincularte." />
  else {
    loggedIn = true
    const uids = couple.members
    const partnerUid = uids.find((u) => u !== user.uid)
    const go = (t, sub) => { setMoreInit(sub || null); if (t !== tab) { tabStack.current.push(tab); pushTab(); setTab(t) } else setTab(t); window.scrollTo({ top: 0 }) }
    const ctx = { user, profile, couple, members, entries, events, jar, notes, uids, partnerUid, game, go, moreInit, unread, openTitle: setOpen, openEvent: setOpenEv, openMail: () => { setMail(true); const t = now(); localStorage.setItem(seenKey, t); setMailSeen(t) } }
    const screen = { home: <Inicio />, cine: <Cine />, agenda: <Agenda />, pets: <PetScreen />, games: <GamesHub />, more: <More /> }[tab]
    body = (
      <Ctx.Provider value={ctx}>
        <Reminders due={due} onOpen={setOpenEv} onDismiss={dismiss} />
        <main className="page"><div key={tab + (moreInit || '')} className="screen">{screen}</div></main>
        <nav className="tabs" aria-label="Navegación principal">{TABS.map(([id, icon, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'on' : ''} onClick={() => go(id)}><span>{icon}</span><small>{label}</small></button>)}</nav>
        {open && <Sheet item={open} onClose={() => setOpen(null)} />}
        {openEv && <EventDetail id={openEv} onClose={() => setOpenEv(null)} />}
        {mail && <Mailbox onClose={() => setMail(false)} />}
        {DevTools && <Suspense fallback={null}><DevTools /></Suspense>}
      </Ctx.Provider>
    )
  }
  return <>{TEST && <div className="test-ribbon">MODO PRUEBAS · datos separados de producción</div>}{body}{DevTools && !loggedIn && <Suspense fallback={null}><DevTools /></Suspense>}</>
}
