// ⚠️ SOLO PRUEBAS. Este archivo únicamente se importa si VITE_TEST_MODE=true; en producción el bundler lo elimina.
import React, { useContext, useState } from 'react'
import { disableNetwork, enableNetwork, doc, setDoc, addDoc, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { COUPLES } from '../paths'
import { Ctx } from '../ctx.js'
import * as G from '../game.js'
import { planNotifications, DEFAULT_PREFS } from '../notifyplan.js'
import { localTest } from '../push.js'
import { now, advance, resetClock, getOffset, getCfg, setCfg, clearCfg } from '../clock'

const H = 36e5, D = 864e5
// Generador pseudoaleatorio con semilla: los mismos datos ficticios cada vez.
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const SESSIONS = [['', 'Normal'], ['newuser', 'Usuario nuevo (sin perfil)'], ['unlinked', 'Sin vincular'], ['expired', 'Sesión expirada'], ['slow', 'Carga lenta (+5 s)'], ['error', 'Error de red']]

export default function DevTools() {
  const ctx = useContext(Ctx)
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState('')
  const [offline, setOffline] = useState(false)
  const [, force] = useState(0)
  const tick = () => { window.dispatchEvent(new Event('ustime-tick')); force((n) => n + 1) }
  const say = (m) => setLog(m)
  const run = async (fn, msg) => { try { await fn(); say('✅ ' + msg) } catch (e) { say('❌ ' + e.message) } }
  const cid = ctx?.couple.id, me = ctx?.user.uid, partner = ctx?.partnerUid
  const R = (fn) => G.run(cid, me, fn)
  const cfg = getCfg()

  const seed = () => run(async () => {
    const rnd = mulberry32(42)
    for (let i = 0; i < 12; i++) {
      const day = G.dayOf(now() - Math.floor(rnd() * 60) * D)
      const ratings = { [me]: 1 + Math.floor(rnd() * 10), ...(partner ? { [partner]: 1 + Math.floor(rnd() * 10) } : {}) }
      await setDoc(doc(db, COUPLES, cid, 'entries', `movie_${9000000 + i}`), { type: i % 4 === 0 ? 'tv' : 'movie', tmdbId: 9000000 + i, title: `Título de prueba ${i + 1}`, year: '2024', poster: null, genres: [[28, 35, 18, 27, 10749, 878][i % 6]], status: 'visto', watchedDate: day, ratings, xpAwarded: true, seed: true })
    }
    const cats = ['cita', 'salida', 'aniversario', 'viaje', 'celebracion', 'hogar']
    for (let i = 0; i < 6; i++) await addDoc(collection(db, COUPLES, cid, 'events'), { title: `Plan de prueba ${i + 1}`, categoryId: cats[i], date: G.dayOf(now() + (Math.floor(rnd() * 40) - 20) * D), time: '20:00', description: 'Dato ficticio', reminder: 60, status: i % 2 ? 'planned' : 'done', photos: [], seed: true, createdBy: me })
  }, 'Datos ficticios creados (semilla 42)')
  const unseed = () => run(async () => { for (const e of ctx.entries.filter((x) => x.seed)) await deleteDoc(doc(db, COUPLES, cid, 'entries', e.id)); for (const e of ctx.events.filter((x) => x.seed)) await deleteDoc(doc(db, COUPLES, cid, 'events', e.id)) }, 'Datos ficticios borrados')
  const setStage = (xp, n) => run(() => R((g, c) => { const p = G.activePet(g); if (!p) throw new Error('Primero eclosionen una mascota'); p.xp = xp; G.syncStage(g, p, c.now, c.by) }), `Mascota en etapa ${n}`)

  const Btn = ({ f, children }) => <button className="btn ghost small" onClick={f}>{children}</button>
  return (
    <>
      <button className="dev-fab" onClick={() => setOpen(!open)} aria-label="Herramientas de prueba">🛠</button>
      {open && (
        <div className="dev-panel" role="dialog" aria-label="Herramientas de prueba">
          <header><b>🛠 Pruebas</b><button className="x" onClick={() => setOpen(false)}>✕</button></header>
          <p className="muted small">Hora simulada: <b>{new Date(now()).toLocaleString('es')}</b> (desfase {Math.round(getOffset() / H)} h)</p>
          {log && <p className="devlog">{log}</p>}
          <h4>⏱ Tiempo</h4>
          <div className="devgrid">{[['+1 h', H], ['+6 h', 6 * H], ['+24 h', D], ['+7 d', 7 * D], ['+30 d', 30 * D]].map(([l, ms]) => <Btn key={l} f={() => { advance(ms); tick(); say('⏩ ' + l) }}>{l}</Btn>)}<Btn f={() => { resetClock(); tick(); say('Reloj real') }}>Reloj real</Btn></div>
          <h4>⚙️ Intervalos (solo prueba)</h4>
          <div className="devgrid"><Btn f={() => { setCfg({ hatchMs: 10000 }); say('Eclosión en 10 s (huevos nuevos)'); force((n) => n + 1) }}>Eclosión 10 s</Btn><Btn f={() => { setCfg({ hatchMs: 60000 }); say('Eclosión en 1 min'); force((n) => n + 1) }}>Eclosión 1 min</Btn>
            <Btn f={() => { setCfg({ decay: 10 }); tick(); say('Necesidades ×10') }}>Necesidades ×10</Btn><Btn f={() => { setCfg({ decay: 60 }); tick(); say('Necesidades ×60') }}>×60</Btn><Btn f={() => { clearCfg(); tick(); say('Intervalos de producción') }}>Normales</Btn></div>
          <small className="muted">Activo: eclosión {cfg.hatchMs ? cfg.hatchMs / 1000 + ' s' : 'normal'} · necesidades ×{cfg.decay ?? 1}</small>
          {ctx && <>
            <h4>🐾 Mascotas</h4>
            <div className="devgrid"><Btn f={() => setStage(0, 'bebé')}>Bebé</Btn><Btn f={() => setStage(400, 'niño')}>Niño</Btn><Btn f={() => setStage(4900, 'adulto')}>Adulto</Btn>
              <Btn f={() => run(() => R((g) => { g.coins += 500 }), '+500 monedas')}>+500 🪙</Btn>
              <Btn f={() => run(() => R((g) => { G.SHOP.forEach((i) => { if (i.kind === 'wear') { if (!g.owned.includes(i.id)) g.owned.push(i.id) } else g.inv[i.id] = (g.inv[i.id] || 0) + 3 }) }), 'Inventario completo')}>Dar objetos</Btn>
              {['comun', 'raro', 'legendario'].map((r) => <Btn key={r} f={() => run(() => R((g) => g.eggs.push({ id: 'dev' + Math.random().toString(36).slice(2, 6), rarity: r, hatchAt: null, name: '', from: 'dev' })), 'Huevo ' + r)}>🥚 {r}</Btn>)}
              <Btn f={() => run(() => R((g, c) => g.eggs.forEach((e) => { if (e.hatchAt) e.hatchAt = c.now - 1 })), 'Huevos listos para eclosionar')}>Eclosión ya</Btn>
              <Btn f={() => run(() => R((g, c) => g.pets.forEach((p) => G.NEEDS.forEach((n) => { p.needs[n] = { v: 15, at: c.now } }))), 'Necesidades bajas')}>Necesidades 15</Btn>
              <Btn f={() => run(() => R((g, c) => { for (let i = 0; i < 30; i++) g.days[G.dayOf(c.now - i * D)] = 1 }), 'Racha de 30 días')}>Racha 30</Btn>
              <Btn f={() => run(() => R((g, c) => { const p = G.activePet(g); if (!p) throw new Error('Sin mascota'); while (g.pets.filter((x) => !x.gradAt).length < 10) g.pets.push({ ...JSON.parse(JSON.stringify(p)), id: 'dev' + Math.random().toString(36).slice(2, 7), name: 'Clon' }); p.xp = 4900 }), 'Familia llena (10) para probar graduación')}>Llenar 10</Btn>
              <Btn f={() => run(() => R((g, c) => { Object.keys(g).forEach((k) => delete g[k]); Object.assign(g, G.initialGame(c.now)) }), 'Estado de mascotas reiniciado')}>♻️ Reiniciar</Btn></div>
            <h4>👥 Pareja (sincronización)</h4>
            <small className="muted">Para probar de verdad: abre dos ventanas (una privada) con dos cuentas del emulador. Si estás solo, estos botones actúan “como tu pareja”.</small>
            <div className="devgrid">
              <Btn f={() => run(() => R((g, c) => { const p = G.activePet(g); G.doFeed(g, p.id, null, { ...c, by: partner || 'virtual' }) }), 'La pareja alimentó a la mascota')}>Pareja alimenta</Btn>
              <Btn f={() => run(() => R((g, c) => { const p = G.activePet(g); G.doBath(g, p.id, null, { ...c, by: partner || 'virtual' }) }), 'La pareja bañó a la mascota')}>Pareja baña</Btn>
              <Btn f={() => run(async () => { if (!partner) throw new Error('Necesitas una segunda cuenta vinculada'); const e = ctx.entries.find((x) => x.status === 'visto' && !x.ratings?.[partner]); if (!e) throw new Error('No hay título sin su nota'); await setDoc(doc(db, COUPLES, cid, 'entries', e.id), { ratings: { [partner]: Math.max(1, Math.min(10, (e.ratings?.[me] || 5) + 1)) } }, { merge: true }) }, 'La pareja puntuó (±1 → Match)')}>Pareja puntúa</Btn></div>
            <h4>🧪 Datos ficticios</h4><div className="devgrid"><Btn f={seed}>Crear (semilla 42)</Btn><Btn f={unseed}>Borrar ficticios</Btn></div>
          </>}
          {ctx && <>
            <h4>🔔 Notificaciones</h4>
            <small className="muted">El servidor real (GitHub Actions) usa la hora real; aquí se simula con la hora de la app.</small>
            <div className="devgrid">
              <Btn f={() => run(() => localTest(), 'Notificación local enviada')}>Notificación local</Btn>
              <Btn f={() => { const users = Object.fromEntries(ctx.couple.members.map((u) => [u, { username: ctx.members[u]?.username, tokens: ['x'], prefs: DEFAULT_PREFS, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }]))
                const plan = planNotifications({ now: now(), couple: ctx.couple, events: ctx.events, jar: ctx.jar || [], games: [], users }); say(plan.length ? '📋 Enviaría: ' + plan.map((p) => `${p.title} (${p.kind})`).join(' · ') : '📋 Ahora mismo no enviaría nada') }}>¿Qué enviaría el servidor ahora?</Btn></div>
          </>}
          <h4>🔐 Estados de sesión</h4>
          <div className="devgrid">{SESSIONS.map(([k, l]) => <Btn key={k || 'n'} f={() => { localStorage.setItem('ustime_test_session', k); location.reload() }}>{(localStorage.getItem('ustime_test_session') || '') === k ? '● ' : ''}{l}</Btn>)}</div>
          <h4>📡 Red y recuperación</h4>
          <div className="devgrid"><Btn f={async () => { await (offline ? enableNetwork(db) : disableNetwork(db)); setOffline(!offline); say(offline ? '🌐 Conexión restaurada' : '✈️ Sin conexión (las acciones se guardan al volver)') }}>{offline ? 'Volver a conectar' : 'Modo sin conexión'}</Btn><Btn f={() => location.reload()}>Cerrar y reabrir (recargar)</Btn>
            <Btn f={() => { Object.keys(localStorage).filter((k) => k.startsWith('ustime_')).forEach((k) => localStorage.removeItem(k)); location.reload() }}>Borrar datos locales</Btn></div>
        </div>
      )}
    </>
  )
}
