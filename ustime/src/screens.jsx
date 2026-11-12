import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { Ctx, AVATARS } from './ctx.js'
import { saveProfile, saveEntry, removeEntry, entryId, addEvent } from './db'
import { revealed, award, today } from './game.js'
import { serverTimestamp } from 'firebase/firestore'
import { search, nowPlaying, details, discover, img, MOODS, PLATFORMS, GENRES } from './tmdb'
import { computeAchievements } from './achievements'

const useCtx = () => useContext(Ctx)
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

function Poster({ item, onClick, badge }) {
  return (
    <button className="poster" onClick={onClick}>
      {item.poster ? <img src={img(item.poster)} alt={item.title} loading="lazy" /> : <div className="noimg">{item.title}</div>}
      {badge && <span className="badge">{badge}</span>}
      <span className="ptitle">{item.title}</span>
    </button>
  )
}

function Stars({ value = 0, onChange, size = 28 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} disabled={!onChange} style={{ fontSize: size }} className={n <= value ? 'on' : ''} onClick={() => onChange?.(n === value ? 0 : n)}>★</button>
      ))}
    </div>
  )
}

function Who({ uid }) {
  const { members } = useCtx()
  return <span className="who" title={members[uid]?.username}>{members[uid]?.avatar || '🙂'}</span>
}

function useEntry(item) {
  const { entries } = useCtx()
  return entries.find((e) => e.id === entryId(item))
}

function Grid({ items, empty }) {
  const { openTitle, entries } = useCtx()
  if (!items.length) return <p className="empty">{empty}</p>
  return (
    <div className="grid">
      {items.map((m) => {
        const e = entries.find((x) => x.id === entryId(m))
        return <Poster key={m.type + m.tmdbId} item={m} onClick={() => openTitle(m)} badge={e?.status === 'visto' ? '✓' : e ? '🔖' : null} />
      })}
    </div>
  )
}

/* ---------- Inicio ---------- */
export function Home() {
  const { profile, partnerUid, members, entries, uids, openTitle } = useCtx()
  const [cartelera, setCartelera] = useState(null)
  useEffect(() => { nowPlaying().then(setCartelera).catch(() => setCartelera([])) }, [])
  const seen = entries.filter((e) => e.status === 'visto')
  const both = seen.filter((e) => uids.every((u) => e.ratings?.[u] > 0))
  const pending = entries.filter((e) => e.status === 'pendiente')
  const score = avg(both.flatMap((e) => uids.map((u) => e.ratings[u])))
  return (
    <>
      <header className="top">
        <div><h1>Hola, {profile.username}</h1><p className="muted">{partnerUid ? `Con ${members[partnerUid]?.username || '...'}` : 'Esperando a tu pareja…'}</p></div>
        <div className="duo"><span>{profile.avatar}</span>{partnerUid && <span>{members[partnerUid]?.avatar}</span>}</div>
      </header>
      <div className="stats">
        <div><b>{seen.length}</b><small>vistas</small></div>
        <div><b>{seen.filter((e) => e.type === 'tv').length}</b><small>series</small></div>
        <div><b>{score ? score.toFixed(1) : '–'}</b><small>nota media</small></div>
        <div><b>{pending.length}</b><small>por ver</small></div>
      </div>
      <h2>En cartelera</h2>
      {cartelera === null ? <div className="spinner" /> : (
        <div className="row">{cartelera.map((m) => <Poster key={m.tmdbId} item={m} onClick={() => openTitle({ ...m, fromCine: true })} />)}</div>
      )}
      {!!pending.length && (<>
        <h2>Pendientes de ver</h2>
        <div className="row">{pending.map((m) => <Poster key={m.id} item={m} onClick={() => openTitle(m)} />)}</div>
      </>)}
      {!seen.length && !pending.length && <p className="empty">Todavía no hay nada registrado. Busca una película o toca una de la cartelera para empezar.</p>}
    </>
  )
}

/* ---------- Buscar ---------- */
export function Search() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return }
    setBusy(true)
    const t = setTimeout(() => search(q).then(setRes).catch(() => setRes([])).finally(() => setBusy(false)), 350)
    return () => clearTimeout(t)
  }, [q])
  return (
    <>
      <h1>Buscar</h1>
      <input className="searchbox" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Película o serie…" />
      {busy && <div className="spinner" />}
      <Grid items={res} empty={q.length < 2 ? 'Escribe el nombre de lo que vieron.' : busy ? '' : 'No encontramos resultados.'} />
    </>
  )
}

/* ---------- Descubrir ---------- */
export function Discover() {
  const { openTitle } = useCtx()
  const [type, setType] = useState('movie')
  const [mood, setMood] = useState(null)
  const [platform, setPlatform] = useState(null)
  const [list, setList] = useState([])
  const [pick, setPick] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async (randomPage) => {
    setBusy(true)
    const m = MOODS.find((x) => x.id === mood)
    const page = randomPage ? 1 + Math.floor(Math.random() * 8) : 1
    try {
      const r = await discover(type, { genres: m?.[type], provider: platform, page })
      setList(r); return r
    } catch { setList([]); return [] } finally { setBusy(false) }
  }
  useEffect(() => { load(false); setPick(null) }, [type, mood, platform])
  const surprise = async () => {
    const r = await load(true)
    if (r.length) { const p = r[Math.floor(Math.random() * r.length)]; setPick(await details(p.type, p.tmdbId)) }
  }
  return (
    <>
      <h1>Descubrir</h1>
      <div className="seg">
        <button className={type === 'movie' ? 'on' : ''} onClick={() => setType('movie')}>Películas</button>
        <button className={type === 'tv' ? 'on' : ''} onClick={() => setType('tv')}>Series</button>
      </div>
      <h3>¿Qué mood tienen hoy?</h3>
      <div className="chips">{MOODS.map((m) => <button key={m.id} className={mood === m.id ? 'on' : ''} onClick={() => setMood(mood === m.id ? null : m.id)}>{m.label}</button>)}</div>
      <h3>¿En qué plataforma?</h3>
      <div className="chips">{PLATFORMS.map((p) => <button key={p.id} className={platform === p.id ? 'on' : ''} onClick={() => setPlatform(platform === p.id ? null : p.id)}>{p.label}</button>)}</div>
      <button className="btn big dice" onClick={surprise} disabled={busy}>🎲 Sorpréndanme</button>
      {pick && (
        <div className="pick" onClick={() => openTitle(pick)}>
          {pick.poster && <img src={img(pick.poster)} alt="" />}
          <div>
            <h2>{pick.title}</h2>
            <p className="muted">{pick.year} · ⭐ {pick.vote.toFixed(1)}</p>
            <p className="clamp">{pick.overview}</p>
            <Providers p={pick.providers} compact />
          </div>
        </div>
      )}
      <h2>Recomendados</h2>
      {busy ? <div className="spinner" /> : <Grid items={list} empty="No hay resultados con esos filtros. Prueben quitando alguno." />}
    </>
  )
}

function Providers({ p, compact }) {
  if (!p) return null
  const none = !p.flatrate.length && !p.rent.length && !p.buy.length
  const Row = ({ label, list }) => list.length ? (
    <div className="prov"><small>{label}</small><div>{list.map((x) => <img key={x.provider_id} src={img(x.logo_path, 'w92')} title={x.provider_name} alt={x.provider_name} />)}</div></div>
  ) : null
  if (none) return <p className="muted small">Sin plataformas registradas en tu país.</p>
  return <div><Row label="Incluido en" list={p.flatrate} />{!compact && <><Row label="Alquiler" list={p.rent} /><Row label="Compra" list={p.buy} /></>}</div>
}

/* ---------- Nuestra lista ---------- */
export function Library() {
  const { entries, openTitle } = useCtx()
  const [tab, setTab] = useState('visto')
  const [kind, setKind] = useState('all')
  const list = useMemo(() => entries
    .filter((e) => e.status === tab && (kind === 'all' || e.type === kind))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)), [entries, tab, kind])
  return (
    <>
      <h1>Nuestra lista</h1>
      <div className="seg">
        <button className={tab === 'visto' ? 'on' : ''} onClick={() => setTab('visto')}>Vistas</button>
        <button className={tab === 'pendiente' ? 'on' : ''} onClick={() => setTab('pendiente')}>Por ver</button>
      </div>
      <div className="chips">
        {[['all', 'Todo'], ['movie', 'Películas'], ['tv', 'Series']].map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {!list.length && <p className="empty">Aquí aparecerán los títulos que {tab === 'visto' ? 'vean' : 'guarden'}.</p>}
      {list.map((e) => (
        <button key={e.id} className="ticket" onClick={() => openTitle(e)}>
          {e.poster ? <img src={img(e.poster, 'w154')} alt="" /> : <div className="noimg sm" />}
          <div className="tinfo">
            <b>{e.title}</b>
            <small className="muted">{e.year} · {e.type === 'tv' ? 'Serie' : 'Película'}{e.cine ? ' · 🎦 cine' : ''}</small>
            {tab === 'visto' && <Rates e={e} />}
          </div>
        </button>
      ))}
    </>
  )
}

/* ---------- Logros ---------- */
export function Achievements() {
  const { entries, uids, events } = useCtx()
  const list = computeAchievements(entries, uids, events)
  const done = list.filter((a) => a.done).length
  return (
    <>
      <h1>Logros en pareja</h1>
      <p className="muted">{done} de {list.length} desbloqueados</p>
      <div className="ach">
        {list.map((a) => (
          <div key={a.id} className={'achc ' + (a.done ? 'done' : '')}>
            <span className="em">{a.emoji}</span>
            <b>{a.title}</b>
            <small>{a.desc}</small>
            <div className="bar"><i style={{ width: `${(a.value / a.goal) * 100}%` }} /></div>
            <small>{a.value}/{a.goal}</small>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Perfil ---------- */
export function Profile() {
  const { user, profile, couple } = useCtx()
  const [username, setUsername] = useState(profile.username)
  const [avatar, setAvatar] = useState(profile.avatar)
  const dirty = username.trim() !== profile.username || avatar !== profile.avatar
  return (
    <>
      <h1>Tu perfil</h1>
      <div className="avatar-xl">{avatar}</div>
      <div className="avatar-grid">{AVATARS.map((a) => <button key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>{a}</button>)}</div>
      <label>Nombre de usuario</label>
      <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} />
      <button className="btn" disabled={!dirty || username.trim().length < 2} onClick={() => saveProfile(user.uid, { username: username.trim(), avatar })}>Guardar cambios</button>
      <div className="panel">
        <h3>Código de su espacio</h3>
        <div className="code">{couple.id}</div>
        <small className="muted">{couple.members.length < 2 ? 'Pásaselo a tu pareja para que se una.' : 'Ya están los dos conectados.'}</small>
      </div>
      <p className="muted small">Sesión: {user.email}</p>
      <button className="link" onClick={() => signOut(auth)}>Cerrar sesión</button>
    </>
  )
}

/* ---------- Puntuación con medios íconos (escala 10) ---------- */
export const genreIcon = (g = []) =>
  g.some((x) => [27, 53, 9648].includes(x)) ? '👻' : g.includes(10749) ? '❤️' : g.some((x) => [878, 14, 10765].includes(x)) ? '🚀' : g.some((x) => [28, 12, 10759].includes(x)) ? '💥' : '🍿'

export function HalfRating({ value = 0, onChange, icon = '🍿', size = 34, readOnly }) {
  const ref = useRef(null)
  const [drag, setDrag] = useState(null)
  const shown = drag ?? value
  const calc = (e) => { const r = ref.current.getBoundingClientRect(); const x = Math.min(Math.max(e.clientX - r.left, 0), r.width - 1); return Math.floor((x / r.width) * 10) + 1 }
  const down = (e) => { if (readOnly) return; ref.current.setPointerCapture(e.pointerId); setDrag(calc(e)) }
  const move = (e) => { if (drag !== null) setDrag(calc(e)) }
  const up = () => { if (drag === null) return; const v = drag; setDrag(null); onChange?.(v) }
  return (
    <div className="half">
      <div ref={ref} className={'half-icons' + (readOnly ? ' ro' : '')} style={{ fontSize: size }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(Math.max(shown - 2 * i, 0), 2) / 2
          return <span key={i} className="hi"><span className="base">{icon}</span><span className="fill" style={{ width: fill * 100 + '%' }}>{icon}</span></span>
        })}
      </div>
      <b className="score">{shown ? `${shown}/10` : '–'}</b>
    </div>
  )
}

export function Rates({ e }) {
  const { uids, user } = useCtx()
  const rv = revealed(e, uids)
  return (
    <div className="rates">
      {uids.map((u) => {
        const v = e.ratings?.[u] || 0
        const show = v > 0 && (rv || u === user.uid)
        return <span key={u}><Who uid={u} />{show ? <HalfRating value={v} readOnly size={15} icon={genreIcon(e.genres)} /> : <small className="muted">{v > 0 ? '🔒 oculta' : '—'}</small>}</span>
      })}
    </div>
  )
}

/* ---------- Contenedores de pestañas ---------- */
function Seg({ tabs, value, onChange }) {
  return <div className="seg">{tabs.map(([k, l]) => <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>
}
export function Cine() {
  const [s, setS] = useState('home')
  return <><Seg tabs={[['home', 'Cartelera'], ['search', 'Buscar'], ['disc', 'Descubrir']]} value={s} onChange={setS} />{s === 'home' ? <Home /> : s === 'search' ? <Search /> : <Discover />}</>
}
export function History() {
  const [s, setS] = useState('time')
  return <><Seg tabs={[['time', 'Línea de tiempo'], ['list', 'Listas']]} value={s} onChange={setS} />{s === 'time' ? <Timeline /> : <Library />}</>
}
export function More() {
  const [s, setS] = useState('ach')
  return <><Seg tabs={[['ach', 'Logros'], ['me', 'Perfil']]} value={s} onChange={setS} />{s === 'ach' ? <Achievements /> : <Profile />}</>
}

/* ---------- Línea de tiempo en pareja ---------- */
export function Timeline() {
  const { entries, openTitle } = useCtx()
  const seen = entries.filter((e) => e.status === 'visto').sort((a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || ''))
  const groups = {}
  seen.forEach((e) => { const k = (e.watchedDate || 'sin-fecha').slice(0, 7); (groups[k] = groups[k] || []).push(e) })
  if (!seen.length) return <p className="empty">Cuando registren lo que ven, aparecerá aquí con su fecha y las notas de los dos.</p>
  return (
    <>
      <h1>Nuestra línea de tiempo</h1>
      {Object.entries(groups).map(([k, list]) => (
        <section key={k} className="month">
          <h2>{k === 'sin-fecha' ? 'Sin fecha' : new Date(k + '-15').toLocaleDateString('es', { month: 'long', year: 'numeric' })}</h2>
          {list.map((e) => (
            <button key={e.id} className="tl" onClick={() => openTitle(e)}>
              <span className="day">{e.watchedDate ? e.watchedDate.slice(8) : '–'}</span>
              {e.poster ? <img src={img(e.poster, 'w154')} alt="" /> : <div className="noimg sm" />}
              <div className="tinfo"><b>{e.title}</b><small className="muted">{e.type === 'tv' ? 'Serie' : 'Película'}{e.cine ? ' · 🎦 cine' : ''}{e.matchAwarded ? ' · 💘 Match' : ''}</small><Rates e={e} /></div>
            </button>
          ))}
        </section>
      ))}
    </>
  )
}

/* ---------- Ficha del título ---------- */
export function Sheet({ item, onClose }) {
  const { couple, user, partnerUid, profile } = useCtx()
  const entry = useEntry(item)
  const [d, setD] = useState(null)
  const [note, setNote] = useState('')
  const [match, setMatch] = useState(false)
  const [agendar, setAgendar] = useState(null)
  useEffect(() => { details(item.type, item.tmdbId).then(setD).catch(() => setD(item)) }, [item.type, item.tmdbId])
  useEffect(() => { setNote(entry?.notes?.[user.uid] || '') }, [entry?.id])
  const m = d || item
  const save = (patch) => saveEntry(couple.id, m, patch)
  const icon = genreIcon(m.genres)
  const mark = async (status) => {
    const first = status === 'visto' && !entry?.xpAwarded
    await save({ status, ...(status === 'visto' ? { watchedDate: entry?.watchedDate || today(), xpAwarded: true } : {}), ...(item.fromCine && !entry ? { cine: true } : {}) })
    if (first) award(couple.id, { xp: 20, coins: 10 }) // registrar con fecha: +20 XP
  }
  const mine = entry?.ratings?.[user.uid] || 0
  const theirs = entry?.ratings?.[partnerUid] || 0
  const rate = async (n) => {
    await save({ ratings: { [user.uid]: n } })
    if (partnerUid && theirs && Math.abs(theirs - n) <= 1 && !entry?.matchAwarded) {
      await save({ matchAwarded: true })
      award(couple.id, { xp: 30, coins: 15 }) // MATCH a ciegas: +30 XP
      setMatch(true)
    } else award(couple.id, { activity: true })
  }
  const schedule = async () => {
    if (!agendar) return
    await addEvent(couple.id, { title: `Velada: ${m.title}`, kind: 'cine', icon: '🎬', date: agendar, time: '20:00', createdBy: user.uid, movie: { type: m.type, tmdbId: m.tmdbId, title: m.title, poster: m.poster || null } })
    if (!entry) await save({ status: 'pendiente' })
    setAgendar(null); onClose()
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        {m.backdrop && <div className="hero" style={{ backgroundImage: `url(${img(m.backdrop, 'w780')})` }} />}
        <h2>{m.title}</h2>
        <p className="muted">{m.year}{m.runtime ? ` · ${m.runtime} min` : ''}{m.seasons ? ` · ${m.seasons} temp.` : ''} · {m.type === 'tv' ? 'Serie' : 'Película'}</p>
        <div className="chips ro">{(m.genres || []).slice(0, 4).map((g) => GENRES[g] && <span key={g}>{GENRES[g]}</span>)}</div>
        <p>{m.overview || 'Sin sinopsis disponible.'}</p>
        <h3>¿Dónde verla?</h3>
        {d ? <Providers p={d.providers} /> : <div className="spinner" />}
        <div className="seg">
          <button className={entry?.status === 'visto' ? 'on' : ''} onClick={() => mark('visto')}>✓ Ya la vimos</button>
          <button className={entry?.status === 'pendiente' ? 'on' : ''} onClick={() => mark('pendiente')}>🔖 Por ver</button>
        </div>
        {entry?.status !== 'visto' && (
          agendar === null
            ? <button className="btn ghost" onClick={() => setAgendar(today())}>📅 Agendar velada de cine</button>
            : <div className="panel"><label>¿Qué día?</label><input type="date" min={today()} value={agendar} onChange={(e) => setAgendar(e.target.value)} /><button className="btn" onClick={schedule}>Agendar en el calendario</button></div>
        )}
        {entry?.status === 'visto' && (<>
          <label>¿Qué día la vieron?</label>
          <input type="date" max={today()} value={entry.watchedDate || today()} onChange={(e) => e.target.value && save({ watchedDate: e.target.value })} />
          <h3>Puntuación a ciegas</h3>
          <div className="ratings">
            <div className="rrow"><Who uid={user.uid} /><HalfRating value={mine} icon={icon} onChange={rate} /></div>
            {partnerUid && (
              <div className="rrow">
                <Who uid={partnerUid} />
                {mine && theirs ? <HalfRating value={theirs} icon={icon} readOnly />
                  : theirs ? <small className="muted">✅ Ya puntuó. Puntúa tú para ver su nota.</small>
                  : <small className="muted">⏳ Aún no puntúa. Su nota se muestra cuando los dos hayan votado.</small>}
              </div>
            )}
          </div>
          <p className="muted small">Desliza o toca: cada medio ícono vale 1 punto.</p>
          {(match || entry.matchAwarded) && <p className="matchbanner">💘 ¡MATCH! Coincidieron con ±1 punto{match ? ' (+30 XP para la mascota)' : ''}</p>}
          <label className="check"><input type="checkbox" checked={!!entry.cine} onChange={(e) => save({ cine: e.target.checked })} /> Lo vimos en el cine</label>
          <label>Tu comentario</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (entry?.notes?.[user.uid] || '') && save({ notes: { [user.uid]: note } })} placeholder="¿Qué te pareció?" />
          {partnerUid && mine && entry?.notes?.[partnerUid] && <p className="pnote"><Who uid={partnerUid} /> {entry.notes[partnerUid]}</p>}
        </>)}
        {entry && <button className="link danger" onClick={() => { removeEntry(couple.id, m); onClose() }}>Quitar de la lista</button>}
      </div>
    </div>
  )
}
