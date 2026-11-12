import React, { useContext, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { COUPLES } from './paths'
import { Ctx } from './ctx.js'
import { saveAnswer } from './db'
import * as G from './game.js'
import { now, getCfg } from './clock'
import { useTick } from './hooks'
import { occurrences } from './events.js'
import { PetArt, Egg, Room, PET_LABEL } from './petart.jsx'
import { CatchGame, MemoryGame } from './minigames.jsx'
import { Seg, Bar } from './ui.jsx'
import { BathScene, BrushScene } from './scrub.jsx'
import { useBackLayer } from './nav.js'

const useCtx = () => useContext(Ctx)
const fmtLeft = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':') }
const fmtDate = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
const STAGE_TXT = { bebe: 'bebé', nino: 'niño', adulto: 'adulto' }

export function logText(l, members, me) {
  const who = l.by === me ? 'Tú' : l.by === 'virtual' ? 'Pareja virtual' : members[l.by]?.username || 'Tu pareja'
  const it = (id) => G.item(id)?.emoji + ' ' + G.item(id)?.name
  return ({
    feed: `${who} alimentó a ${l.pet} 🍽️`, bath: `${who} bañó a ${l.pet} 🛁`, wake: `${l.pet} descansó y despertó con energía ⚡`,
    play: `${who} jugó ${l.game === 'memory' ? 'Memoria' : 'Atrapa corazones'} con ${l.pet} (${l.score}) 🎮`,
    level: `${l.pet} subió al nivel ${l.level} 🎉`, evolve: `✨ ${l.pet} evolucionó a etapa ${STAGE_TXT[l.stage]}`,
    hatch: `🐣 ${l.pet} acaba de nacer`, buy: `${who} compró ${it(l.item)}`, mission: `${who} completó: ${l.txt}`, daily: '🎁 Reclamaron el bono diario',
    egg: '🥚 Ganaron un huevo nuevo', brush: `${who} cepilló los dientes de ${l.pet} 🪥`, rename: `${who} le cambió el nombre a ${l.from}: ahora es ${l.pet} ✏️`, graduate: `🌿 ${l.pet} se fue al campo`, unequip: `${l.pet} devolvió al inventario: ${(l.items || []).map((i) => G.item(i)?.emoji).join(' ')} (ya no es compatible con su etapa)`,
  })[l.k] || l.k
}

function message(pet, mood, events, partner) {
  if (pet.sleeping) return 'Zzz… 💤'
  const low = { hunger: '¡Tengo tanta hambre que me comería una pizza entera! Entren a darme de comer 🍕', hygiene: 'Huelo a calcetín viejo… ¿me dan un bañito? 🛁', energy: 'Tengo muchísimo sueño… ¿me acuestan? 😴', fun: 'Me aburro… ¿jugamos un ratito? 🎈' }
  if (mood.mood === 'sad') return low[mood.lowest]
  const ev = occurrences(events, G.today(), G.today()).find((e) => e.status === 'planned')
  if (ev) return `¡Papás, recuerden que hoy tienen agendado: ${ev.title}! ${ev.icon}`
  if (!events.some((e) => e.date > G.today() && e.status !== 'done')) return `${pet.name} los extraña… ¿Cuándo va a ser su próxima cita? 💭`
  const st = pet.stage
  const base = st === 'bebe' ? ['¡Guuu! ¡Más cariñitos! 🍼', 'Mira mis manitas 👶'] : st === 'nino' ? ['¡Juguemos! ¡Juguemos! 🎈', `Hoy me siento ${G.petDef(pet.type).trait} 😄`] : ['Qué bueno verlos juntos 💞', 'Estoy orgullos@ de esta familia 🌟']
  return base[Math.floor(now() / 36e5) % 2].replace('orgullos@', 'orgulloso')
}

/* ---------- Pantalla de la mascota con habitaciones ---------- */
const ROOMS = [['sala', '🛋️', 'Sala'], ['cocina', '🍽️', 'Cocina'], ['bano', '🛁', 'Baño'], ['cuarto', '🛏️', 'Cuarto'], ['jardin', '🌳', 'Jardín']]

function RoomTab({ g, onFamily, onShop }) {
  const { couple, user, events, members, partnerUid, openMail, unread } = useCtx()
  const t = useTick(5000)
  const pet = G.activePet(g)
  const [room, setRoom] = useState('sala')
  const [fx, setFx] = useState(null)
  const [floats, setFloats] = useState([])
  const [fb, setFb] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [mini, setMini] = useState(null)
  const [result, setResult] = useState(null)
  const [evo, setEvo] = useState(null)
  const [scene, setScene] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [askBrush, setAskBrush] = useState(false)
  const lastStroke = useRef(0)
  const cid = couple.id, me = user.uid

  useEffect(() => { // ¿evolucionó desde la última vez que lo vi?
    if (!pet) return
    const k = 'ustime_stage_' + pet.id; const prev = localStorage.getItem(k)
    if (prev && prev !== pet.stage) setEvo({ from: prev, to: pet.stage, pet })
    localStorage.setItem(k, pet.stage)
  }, [pet?.id, pet?.stage])

  if (!pet) return (
    <div className="panel center-t">
      <Egg stage="wobble" size={120} />
      <h3>Todavía no tienen mascota</h3>
      <p className="muted">Pónganle nombre al huevo y espérenlo juntos.</p>
      <button className="btn" onClick={onFamily}>🥚 Ir a mis huevos</button>
    </div>
  )
  const mood = G.moodOf(pet, t, getCfg().decay ?? 1)
  const needs = mood.needs
  const stage = pet.stage || G.petStage(pet)
  const lv = G.levelOf(pet.xp), lo = G.xpForLevel(lv), hi = G.xpForLevel(lv + 1)
  const wall = G.item(pet.bg)?.css
  const popFloat = (txt) => { const k = Math.random(); setFloats((f) => [...f, { k, txt }]); setTimeout(() => setFloats((f) => f.filter((x) => x.k !== k)), 1700) }
  const act = async (fn, { anim, expr, ok }) => {
    setErr(''); setBusy(true)
    try {
      const r = await fn(); setFx({ anim, expr, k: Date.now() }); setTimeout(() => setFx(null), 1700)
      setFb(ok(r)); if (r?.xp) popFloat(`+${r.xp} XP`); if (r?.coins) popFloat(`+${r.coins} 🪙`)
    } catch (e) { setErr(e.message || 'No se pudo completar. Revisa tu conexión.') } finally { setBusy(false) }
  }
  const feed = (it) => act(() => G.feed(cid, me, pet.id, it?.id || null), { anim: 'eat', expr: 'eat', ok: (r) => `${it?.emoji || '🥣'} ¡Ñam! Hambre +${r.amount}` })
  const bath = (it) => act(() => G.bath(cid, me, pet.id, it?.id || null), { anim: 'wash', expr: 'joy', ok: (r) => `${it?.emoji || '💧'} ¡Limpiecito! Limpieza +${r.amount}` })
  const brush = () => act(() => G.brush(cid, me, pet.id), { anim: 'play', expr: 'joy', ok: () => '🪥 ¡Dientes brillantes! Dormirá mejor 😴' })
  const brushedToday = !!pet.brushedAt && t - pet.brushedAt < 12 * G.H
  const stroke = () => {
    setFx({ anim: 'pet', expr: 'love', k: Date.now() }); popFloat('💕')
    if (now() - lastStroke.current > 1500 && !pet.sleeping) { lastStroke.current = now(); G.stroke(cid, me, pet.id).then((r) => r?.xp && popFloat(`+${r.xp} XP`)).catch((e) => setErr(e.message)) }
    setTimeout(() => setFx(null), 1200)
  }
  const sleep = () => act(() => G.sleep(cid, me, pet.id), { anim: 'idle', ok: (r) => r.sleeping ? '😴 Se quedó dormida. ¡Que descanse!' : r.slept >= G.MIN_SLEEP_MS ? '☀️ ¡Despertó con energía!' : 'Despertó (durmió poco, no suma XP).' })
  const finish = async (game, score) => {
    setMini(null)
    try { const r = await G.finishMini(cid, me, pet.id, game, score); setResult({ game, score, ...r }); setFx({ anim: 'play', expr: 'joy', k: Date.now() }); setTimeout(() => setFx(null), 1800) } catch (e) { setErr(e.message) }
  }
  const foods = G.SHOP.filter((i) => i.kind === 'food' && g.inv[i.id] > 0), soaps = G.SHOP.filter((i) => i.kind === 'bath' && g.inv[i.id] > 0)
  const expr = fx?.expr || (mood.mood === 'sleep' ? 'sleep' : mood.mood)
  const anim = fx?.anim || (pet.sleeping ? 'sleep' : 'idle')

  return (
    <>
      <div className="hud">
        <div className="xpbox"><small>Exp de hoy {g.daily.date === G.today() ? g.daily.xp : 0}/{G.DAILY_XP_GOAL}</small><div className="bar xp"><i style={{ width: Math.min(100, ((g.daily.date === G.today() ? g.daily.xp : 0) / G.DAILY_XP_GOAL) * 100) + '%' }} /></div></div>
        <button className="hudbtn" onClick={openMail} aria-label="Buzón de hitos">📬{unread > 0 && <em>{unread}</em>}</button>
        <button className="hudbtn" onClick={onShop} aria-label="Tienda">🛍️</button>
      </div>
      <Room kind={room} wallCss={room === 'sala' ? wall : undefined} dark={!!pet.sleeping}>
        <div className={'petwrap fx-' + anim} onPointerDown={room === 'sala' ? stroke : undefined} onPointerMove={(e) => room === 'sala' && e.buttons && stroke()}>
          <PetArt type={pet.type} stage={stage} mood={mood.mood} expr={expr} anim={anim} equip={G.equipOf(pet)} size={stage === 'bebe' ? 190 : 200} />
          {anim === 'wash' && <div className="bubbles">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: 10 + i * 9 + '%', animationDelay: i * 0.12 + 's' }} />)}</div>}
          {anim === 'eat' && <span className="flyfood">🍽️</span>}
          {anim === 'play' && <div className="confetti">{'🎉✨💕⭐🎈'.match(/./gu).map((c, i) => <i key={i} style={{ left: 8 + i * 18 + '%' }}>{c}</i>)}</div>}
        </div>
        {floats.map((f) => <span key={f.k} className="floatfx">{f.txt}</span>)}
        <div className="bubble-speech" role="status">{message(pet, mood, events, partnerUid)}</div>
      </Room>
      <div className="rooms">{ROOMS.map(([k, ic, l]) => <button key={k} className={room === k ? 'on' : ''} onClick={() => { setRoom(k); setFb('') }}><span>{ic}</span><small>{l}</small></button>)}</div>
      <div className="petinfo">{renaming ? <RenameBox pet={pet} onClose={() => setRenaming(false)} /> : <h2>{pet.name} <button className="iconbtn" aria-label="Cambiar nombre" onClick={() => setRenaming(true)}>✏️</button> <small className="muted">Nv. {lv} · {G.STAGE_LABEL[stage]} · {G.petDef(pet.type).trait}</small></h2>}
        <div className="bar xp"><i style={{ width: ((pet.xp - lo) / (hi - lo)) * 100 + '%' }} /></div><small className="muted">{pet.xp} XP · faltan {hi - pet.xp} para nivel {lv + 1}{stage !== 'adulto' ? ` (${lv < 5 ? 'niño' : 'adulto'} en nivel ${lv < 5 ? 5 : 15})` : ''}</small></div>
      {G.NEEDS.map((n) => <Bar key={n} label={G.NEED_LABEL[n]} icon={G.NEED_ICON[n]} v={needs[n]} />)}
      {fb && <p className="okmsg" role="status">{fb}</p>}
      {err && <p className="error" role="alert">{err}</p>}
      <div className="actions">
        {room === 'sala' && <><p className="muted small">👆 Toca o arrastra el dedo sobre {pet.name} para acariciarla. (+2 XP, hasta 5 veces al día)</p><button className="btn ghost" onClick={onShop}>👕 Vestuario e inventario</button></>}
        {room === 'cocina' && <div className="shelf"><button disabled={busy} onClick={() => feed(null)}><span>🥣</span><b>Croquetas</b><small>+30 · gratis</small></button>{foods.map((i) => <button key={i.id} disabled={busy} onClick={() => feed(i)}><span>{i.emoji}</span><b>{i.name}</b><small>+{i.amount} · ×{g.inv[i.id]}</small></button>)}{!foods.length && <small className="muted">Compra comida en la tienda 🛍️</small>}</div>}
        {room === 'bano' && <div className="shelf"><button disabled={busy || pet.sleeping} onClick={() => setScene({ kind: 'bath', item: null })}><span>💧</span><b>Agua</b><small>+30 · gratis</small></button>{soaps.map((i) => <button key={i.id} disabled={busy || pet.sleeping} onClick={() => setScene({ kind: 'bath', item: i })}><span>{i.emoji}</span><b>{i.name}</b><small>+{i.amount} · ×{g.inv[i.id]}</small></button>)}</div>}
        {room === 'cuarto' && <div className="panel center-t">{pet.sleeping ? <><p>😴 Durmiendo desde hace {Math.max(0, Math.round((t - pet.sleeping.since) / 60000))} min{pet.sleeping.bonus ? ' · descanso reforzado 🪥' : ''}</p><small className="muted">Si descansa 20 min o más, gana +5 XP al despertar.</small><button className="btn" disabled={busy} onClick={sleep}>☀️ Despertar</button></>
          : <><p className="muted">Antes de dormir: ¡a cepillarse los dientes!</p>
            <button className="btn ghost" disabled={busy} onClick={() => setScene({ kind: 'brush' })}>🪥 Cepillar dientes {brushedToday ? '✓' : ''}</button>
            <button className="btn" disabled={busy} onClick={() => (brushedToday ? sleep() : setAskBrush(true))}>🌙 Dormir</button>
            {askBrush && <div className="hint">¿Cepillamos antes de dormir? Duerme mejor (+25% de energía) y gana XP.<div className="two"><button className="btn small" onClick={() => { setAskBrush(false); setScene({ kind: 'brush' }) }}>🪥 Cepillar</button><button className="btn ghost small" onClick={() => { setAskBrush(false); sleep() }}>Dormir sin cepillar</button></div></div>}</>}</div>}
        {room === 'jardin' && <div className="two"><button className="btn" disabled={pet.sleeping || busy} onClick={() => { setResult(null); setMini('catch') }}>❤️ Atrapa corazones</button><button className="btn" disabled={pet.sleeping || busy} onClick={() => { setResult(null); setMini('memory') }}>🃏 Memoria</button></div>}
        {result && <div className="panel result"><h3>{result.game === 'memory' ? 'Memoria completada' : '¡Tiempo!'}</h3><p>{result.game === 'memory' ? `${result.score} movimientos` : `${result.score} puntos`} → <b>+{result.coins} 🪙</b>{result.xp ? <> · <b>+{result.xp} XP</b></> : null}</p>{result.reduced && <small className="muted">Ya jugaron 3 veces hoy: la recompensa de monedas baja al 25%.</small>}<button className="btn ghost" onClick={() => setResult(null)}>Seguir</button></div>}
      </div>
      {mini && <div className="overlay" style={{ alignItems: 'stretch' }}><div className="sheet full">{mini === 'catch' ? <CatchGame onFinish={(s) => finish('catch', s)} onCancel={() => setMini(null)} /> : <MemoryGame onFinish={(s) => finish('memory', s)} onCancel={() => setMini(null)} />}</div></div>}
      {scene?.kind === 'bath' && <BathScene pet={pet} soap={scene.item} onCancel={() => setScene(null)} onDone={() => { const it = scene.item; setScene(null); bath(it) }} />}
      {scene?.kind === 'brush' && <BrushScene pet={pet} onCancel={() => setScene(null)} onDone={() => { setScene(null); brush() }} />}
      {evo && <Evolution evo={evo} onClose={() => setEvo(null)} />}
    </>
  )
}

function RenameBox({ pet, onClose }) {
  const { couple, user } = useCtx()
  const [name, setName] = useState(pet.name); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const save = async () => { setBusy(true); setErr(''); try { await G.rename(couple.id, user.uid, pet.id, name); onClose() } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  return (
    <div className="renamebox"><input value={name} maxLength={10} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Nuevo nombre" onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()} />
      <button className="btn small" disabled={busy || !name.trim()} onClick={save}>Guardar</button><button className="btn ghost small" onClick={onClose}>Cancelar</button>{err && <small className="error">{err}</small>}</div>
  )
}

function Evolution({ evo, onClose }) {
  useBackLayer(onClose)
  const [phase, setPhase] = useState(0)
  useEffect(() => { const a = setTimeout(() => setPhase(1), 1400); return () => clearTimeout(a) }, [])
  return (
    <div className="overlay center-o" onClick={phase ? onClose : undefined}>
      <div className="evo" role="dialog" aria-label="Evolución">
        <div className="rays" />
        <PetArt type={evo.pet.type} stage={phase ? evo.to : evo.from} mood="happy" expr={phase ? 'joy' : 'neutral'} anim={phase ? 'play' : 'shake'} size={220} className={phase ? 'grow' : 'glow'} />
        <h2>{phase ? `¡${evo.pet.name} evolucionó!` : '¿Qué está pasando…?'}</h2>
        {phase ? <><p>Ahora está en etapa <b>{STAGE_TXT[evo.to]}</b>. Los accesorios que ya no le sirven volvieron al inventario compartido.</p><button className="btn" onClick={onClose}>¡Qué lindo!</button></> : <p className="muted">✨</p>}
      </div>
    </div>
  )
}

/* ---------- Huevos (nombre → incubación → eclosión) ---------- */
function EggModal({ egg, onClose }) {
  useBackLayer(onClose)
  const { couple, user } = useCtx()
  const t = useTick(1000)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [born, setBorn] = useState(null)
  const total = G.RARITY[egg.rarity].hours * G.H
  const at = G.toMs(egg.hatchAt)
  const left = at == null ? null : at - t
  // Siempre exactamente una fase: nombrar → esperar → listo (un dato raro nunca deja la ventana vacía)
  const phase = left == null ? 'name' : left > 0 ? 'wait' : 'ready'
  const start = egg.startedAt || (at != null ? at - total : t)
  const progress = at == null ? 0 : Math.max(0, Math.min(1, (t - start) / Math.max(1, at - start)))
  const run = async (fn) => { setBusy(true); setErr(''); try { return await fn() } catch (e) { setErr(e.message || 'No se pudo completar. Inténtalo otra vez.') } finally { setBusy(false) } }
  if (born) return (
    <div className="overlay center-o"><div className="evo"><div className="rays" /><PetArt type={born.type} stage="bebe" expr="joy" anim="play" size={210} />
      <h2>¡{born.name} nació!</h2><p>Es un <b>{PET_LABEL[born.type]}</b> {G.RARITY[G.petDef(born.type).rarity].label.toLowerCase()} · {G.petDef(born.type).trait}.</p><button className="btn" onClick={onClose}>Conocerle</button></div></div>
  )
  return (
    <div className="overlay center-o" onClick={onClose}>
      <div className="eggcard" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
        <Egg stage={phase === 'name' ? 'wobble' : phase === 'wait' ? 'shake' : 'ready'} rarity={egg.rarity} cracks={phase === 'ready' ? 2 : progress > 0.5 ? 1 : 0} />
        {phase === 'name' && <>
          <h3>El nombre de tu mascota</h3>
          <div className="namebox"><input value={name} maxLength={10} onChange={(e) => setName(e.target.value)} placeholder="Ej: Luna" aria-label="Nombre de la mascota" /><small>{name.length}/10</small></div>
          <p className="muted small">Huevo {G.RARITY[egg.rarity].label.toLowerCase()} · tarda {G.RARITY[egg.rarity].hours} h en eclosionar.</p>
          <button className="btn" disabled={busy || !name.trim()} onClick={() => run(async () => { await G.incubate(couple.id, user.uid, egg.id, name); onClose() })}>Incubar huevo</button></>}
        {phase === 'wait' && <><h3>{egg.name ? `El huevo de ${egg.name}` : 'El huevo'} está eclosionando</h3><p className="timer">Tiempo restante <b>{fmtLeft(left)}</b></p><div className="bar"><i style={{ width: progress * 100 + '%' }} /></div><small className="muted">Pueden cerrar la app: la cuenta sigue corriendo.</small></>}
        {phase === 'ready' && <>
          <h3>{egg.name ? `¡${egg.name} está listo!` : '¡Tu huevo está listo!'}</h3>
          {!egg.name && <div className="namebox"><input value={name} maxLength={10} onChange={(e) => setName(e.target.value)} placeholder="Ponle un nombre (opcional)" aria-label="Nombre de la mascota" /><small>{name.length}/10</small></div>}
          <button className="btn" disabled={busy} onClick={() => run(async () => setBorn(await G.hatch(couple.id, user.uid, egg.id, name)))}>{busy ? 'Eclosionando…' : '🐣 Eclosionar'}</button></>}
        {err && <p className="error" role="alert">{err}</p>}
      </div>
    </div>
  )
}

/* ---------- Familia: huevos, mascotas y Santuario ---------- */
function Family({ g }) {
  const { couple, user, entries, uids } = useCtx()
  const t = useTick(30000)
  const [egg, setEgg] = useState(null)
  const [renId, setRenId] = useState(null)
  const [err, setErr] = useState('')
  const run = async (p) => { setErr(''); try { await p } catch (e) { setErr(e.message) } }
  const pets = g.pets.filter((p) => !p.gradAt), grads = g.pets.filter((p) => p.gradAt)
  const streak = G.streakInfo(g.days, t), h = G.harmony(entries, uids)
  const hitoGoal = 50 * ((g.claims.hito || 0) + 1)
  const canStreak = streak.n >= 30 && streak.start !== g.claims.streakAt, canHito = h.total >= hitoGoal && h.pct > 80
  const liveEgg = egg && g.eggs.find((e) => e.id === egg.id)
  return (
    <>
      <h2>Huevos</h2>
      {!g.eggs.length && <p className="empty">No tienen huevos ahora. Consíganlos con una racha o un gran hito de cine 👇</p>}
      <div className="eggs">{g.eggs.map((e) => { const at = G.toMs(e.hatchAt); const left = at == null ? null : at - t; return (
        <button key={e.id} className="eggtile" onClick={() => setEgg(e)}><Egg stage={left == null ? 'idle' : left > 0 ? 'shake' : 'ready'} rarity={e.rarity} cracks={left != null && left <= 0 ? 2 : 0} size={70} />
          <b>{e.name || 'Sin nombre'}</b><small>{left == null ? 'Toca para nombrarlo' : left > 0 ? fmtLeft(left) : '¡Listo!'}</small></button>) })}</div>
      {err && <p className="error" role="alert">{err}</p>}
      <h3>Cómo conseguir huevos nuevos</h3>
      <div className="panel"><b>A · Racha de pareja</b><small className="muted">30 días seguidos con al menos 1 actividad compartida.</small><div className="bar"><i style={{ width: Math.min(100, streak.n / 0.3) + '%' }} /></div><small>{Math.min(streak.n, 30)}/30 días</small><button className="btn" disabled={!canStreak} onClick={() => run(G.claimEgg(couple.id, user.uid, 'streak', streak.start))}>Reclamar huevo</button></div>
      <div className="panel"><b>B · El gran hito de cine</b><small className="muted">{hitoGoal} títulos puntuados por los dos con armonía &gt; 80%.</small><div className="bar"><i style={{ width: Math.min(100, (h.total / hitoGoal) * 100) + '%' }} /></div><small>{h.total}/{hitoGoal} títulos · Armonía {h.pct}%</small><button className="btn" disabled={!canHito} onClick={() => run(G.claimEgg(couple.id, user.uid, 'hito'))}>Reclamar huevo</button></div>
      <p className="muted small">Al ganar un huevo: Común 70% (24 h) · Raro 25% (48 h) · Legendario 5% (72 h).</p>
      <h2>Nuestra familia ({pets.length}/{G.MAX_PETS})</h2>
      {pets.map((p) => { const lv = G.levelOf(p.xp), st = p.stage || G.petStage(p); return (
        <div key={p.id} className={'famcard' + (p.id === g.activeId ? ' active' : '')}>
          <PetArt type={p.type} stage={st} mood="happy" size={70} equip={G.equipOf(p)} />
          <div>{renId === p.id ? <RenameBox pet={p} onClose={() => setRenId(null)} /> : <b>{p.name} <button className="iconbtn" aria-label="Cambiar nombre" onClick={() => setRenId(p.id)}>✏️</button></b>}<small className="muted">{PET_LABEL[p.type]} · Nv. {lv} · {G.STAGE_LABEL[st]} · {G.RARITY[G.petDef(p.type).rarity].label}</small>
            {p.id !== g.activeId ? <button className="btn ghost small" onClick={() => run(G.setActive(couple.id, user.uid, p.id))}>Cuidar a {p.name}</button> : <small className="okmsg">⭐ Mascota principal</small>}
            {pets.length >= G.MAX_PETS && lv >= 15 && <button className="btn ghost small" onClick={() => { if (window.confirm(`¿Dejar ir a ${p.name} a la naturaleza? Pasará al Santuario.`)) run(G.graduate(couple.id, user.uid, p.id)) }}>🌿 Graduar / Dejar ir a la naturaleza</button>}</div>
        </div>) })}
      <h2>El Santuario 🌿</h2>
      {!grads.length && <p className="empty">Aquí vivirán para siempre las mascotas adultas que dejen ir al campo.</p>}
      {grads.map((p) => <div key={p.id} className="famcard"><PetArt type={p.type} stage="adulto" mood="happy" size={70} /><div><b>{p.name}</b><small className="muted">Nivel {G.levelOf(p.xp)} · Adoptada el {fmtDate(p.adoptedAt)} · Se fue al campo el {fmtDate(p.gradAt)}</small></div></div>)}
      {liveEgg && <EggModal egg={liveEgg} onClose={() => setEgg(null)} />}
    </>
  )
}

/* ---------- Tienda, vista previa e inventario compartido ---------- */
function Shop({ g }) {
  const { couple, user } = useCtx()
  const pet = G.activePet(g)
  const [tab, setTab] = useState('shop')
  const [cat, setCat] = useState('Comida')
  const [sel, setSel] = useState(null)
  const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const cats = [...new Set(G.SHOP.map((i) => i.cat))]
  const fl = G.familyLevel(g)
  const run = async (p, msg) => { setErr(''); setOk(''); try { await p; setOk(msg) } catch (e) { setErr(e.message) } }
  const list = tab === 'shop' ? G.SHOP.filter((i) => i.cat === cat) : [...G.SHOP.filter((i) => i.kind === 'wear' && g.owned.includes(i.id)), ...G.SHOP.filter((i) => i.kind !== 'wear' && g.inv[i.id] > 0)]
  const it = sel && G.item(sel)
  const why = it && pet && it.kind === 'wear' ? G.whyNot(it, pet) : null
  const prevEquip = pet ? { ...G.equipOf(pet), ...(it?.kind === 'wear' && it.slot !== 'bg' ? { [it.slot]: it.id } : {}) } : {}
  const equipped = it && pet && pet[it.slot] === it.id
  return (
    <>
      <h2>🪙 {g.coins}</h2>
      <Seg tabs={[['shop', 'Tienda'], ['inv', 'Mi inventario']]} value={tab} onChange={(v) => { setTab(v); setSel(null) }} />
      {tab === 'shop' && <div className="chips scroll">{cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => { setCat(c); setSel(null) }}>{c}</button>)}</div>}
      {it && (
        <div className="panel preview">
          {pet && it.kind === 'wear' ? <Room kind="sala" wallCss={it.slot === 'bg' ? it.css : G.item(pet.bg)?.css} className="mini-room"><PetArt type={pet.type} stage={pet.stage} mood="happy" equip={prevEquip} size={130} /></Room> : <div className="bigemoji">{it.emoji}</div>}
          <h3>{it.emoji} {it.name}</h3>
          <p className="muted small">{it.kind === 'wear' ? `${G.SLOT_LABEL[it.slot]} · se usa en: ${it.phases.map((p) => G.STAGE_LABEL[p].toLowerCase()).join(', ')}${it.rarities ? ' · solo ' + it.rarities.join('/') : ''}` : `Restaura +${it.amount} ${it.kind === 'food' ? 'hambre' : 'limpieza'}`}</p>
          {why && <p className="hint">🔒 {pet.name}: {why}</p>}
          {it.minLevel && fl < it.minLevel && <p className="hint">🔒 Se desbloquea con una mascota nivel {it.minLevel} (ahora {fl})</p>}
          <div className="two">
            {(it.kind === 'wear' ? !g.owned.includes(it.id) : true) && <button className="btn" disabled={g.coins < it.price || (it.minLevel && fl < it.minLevel)} onClick={() => run(G.buy(couple.id, user.uid, it.id), `✅ Compraste ${it.name}`)}>Comprar 🪙 {it.price}</button>}
            {it.kind === 'wear' && g.owned.includes(it.id) && pet && <button className="btn" disabled={!!why && !equipped} onClick={() => run(G.equip(couple.id, user.uid, pet.id, it.id), equipped ? 'Retirado' : `✨ ${pet.name} lleva ${it.name}`)}>{equipped ? 'Quitar' : 'Equipar'}</button>}
          </div>
          {ok && <p className="okmsg" role="status">{ok}</p>}{err && <p className="error" role="alert">{err}</p>}
        </div>
      )}
      <div className="shop">{list.map((i) => { const owned = i.kind === 'wear' && g.owned.includes(i.id); const locked = i.minLevel && fl < i.minLevel; return (
        <button key={i.id} className={(sel === i.id ? 'on ' : '') + (locked ? 'lock' : '')} onClick={() => { setSel(i.id); setOk(''); setErr('') }}>
          <span className="se">{locked ? '🔒' : i.emoji}</span><b>{i.name}</b>
          <small>{tab === 'inv' ? (i.kind === 'wear' ? (pet?.[i.slot] === i.id ? '✓ Puesto' : 'Tienen') : `×${g.inv[i.id]}`) : owned ? '✓ Tienen' : `🪙 ${i.price}${g.inv[i.id] ? ` · ×${g.inv[i.id]}` : ''}`}</small></button>) })}
        {!list.length && <p className="empty" style={{ gridColumn: '1/-1' }}>Todavía no tienen objetos.</p>}</div>
    </>
  )
}

/* ---------- Misiones y bono diario ---------- */
function Quests({ g }) {
  const { couple, user } = useCtx()
  const t = useTick(30000)
  const [err, setErr] = useState('')
  const d = G.dayOf(t), ms = G.missionsFor(d), prog = g.missions.date === d ? g.missions : { progress: {}, claimed: {} }
  const xp = g.daily.date === d ? g.daily.xp : 0
  const run = async (p) => { setErr(''); try { await p } catch (e) { setErr(e.message) } }
  return (
    <>
      <h2>Misiones de hoy</h2>
      {ms.map((m) => { const n = Math.min(prog.progress[m.key] || 0, m.goal), done = n >= m.goal, claimed = prog.claimed[m.id]; return (
        <div key={m.id} className={'mission' + (claimed ? ' claimed' : '')}><div><b>{m.label}</b><div className="bar"><i style={{ width: (n / m.goal) * 100 + '%' }} /></div><small className="muted">{n}/{m.goal} · 🪙 {m.coins} · {m.xp} XP</small></div>
          <button className="btn small" disabled={!done || claimed} onClick={() => run(G.claimMission(couple.id, user.uid, m.id))}>{claimed ? '✓' : 'Reclamar'}</button></div>) })}
      <div className="mission"><div><b>🎁 Bono diario: 100 XP</b><div className="bar"><i style={{ width: Math.min(100, xp) + '%' }} /></div><small className="muted">{Math.min(xp, 100)}/100 XP hoy · 🪙 30</small></div>
        <button className="btn small" disabled={xp < 100 || (g.daily.date === d && g.daily.claimed)} onClick={() => run(G.claimDaily(couple.id, user.uid))}>{g.daily.date === d && g.daily.claimed ? '✓' : 'Reclamar'}</button></div>
      {err && <p className="error" role="alert">{err}</p>}
      <p className="muted small">Las misiones se renuevan cada día. Puntuar, registrar títulos, responder la pregunta del día y cumplir planes también cuentan.</p>
      <DailyQ />
    </>
  )
}
const QUESTIONS = ['¿Cuál fue tu momento favorito de esta semana juntos?', '¿Qué película te gustaría ver conmigo esta noche?', '¿Qué es lo que más te gusta de nuestras citas?', '¿Qué lugar te gustaría que visitemos?', '¿Cuál es tu recuerdo favorito de nosotros?', '¿Qué canción te recuerda a mí?', '¿Qué plan perfecto harías para un domingo?', '¿Qué es algo pequeño que te hizo feliz hoy?', '¿Qué serie podríamos maratonear este mes?', '¿Qué te gustaría que probemos juntos por primera vez?', '¿Qué comida elegirías para nuestra próxima cita?', '¿Qué cosa te hace reír de mí?', '¿Cuál fue tu primera impresión de mí?', '¿Qué película te hizo llorar y por qué?', '¿Qué meta te gustaría cumplir juntos este año?']
function DailyQ() {
  const { couple, user, partnerUid } = useCtx()
  const day = G.today(); const q = QUESTIONS[Math.floor(now() / 864e5) % QUESTIONS.length]
  const [ans, setAns] = useState({}); const [text, setText] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => onSnapshot(doc(db, COUPLES, couple.id, 'answers', day), (s) => setAns(s.data() || {})), [couple.id, day])
  const mine = ans[user.uid], theirs = ans[partnerUid]
  const send = async () => { setBusy(true); try { await saveAnswer(couple.id, day, user.uid, text.trim()); await G.award(couple.id, user.uid, { key: 'question' }) } finally { setBusy(false) } }
  return (
    <div className="panel"><h3>Pregunta del día</h3><p>{q}</p>
      {mine ? <><p className="pnote">Tú: {mine}</p>{theirs ? <p className="pnote">Tu pareja: {theirs}</p> : <small className="muted">Su respuesta se mostrará cuando conteste.</small>}</>
        : <><textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tu respuesta…" /><button className="btn" disabled={!text.trim() || busy} onClick={send}>{busy ? 'Enviando…' : 'Responder'}</button></>}</div>
  )
}

export function PetScreen() {
  const { game: g } = useCtx()
  const [sec, setSec] = useState('room')
  if (!g) return <div className="spinner" />
  return (
    <>
      <Seg tabs={[['room', 'Habitación'], ['shop', 'Tienda'], ['quests', 'Misiones'], ['family', 'Familia']]} value={sec} onChange={setSec} />
      {sec === 'room' && <RoomTab g={g} onFamily={() => setSec('family')} onShop={() => setSec('shop')} />}
      {sec === 'shop' && <Shop g={g} />}
      {sec === 'quests' && <Quests g={g} />}
      {sec === 'family' && <Family g={g} />}
    </>
  )
}
