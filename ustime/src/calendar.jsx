import React, { useContext, useState } from 'react'
import { Ctx } from './ctx.js'
import { img } from './tmdb'
import { addEvent, patchEvent, removeEvent, compressImage } from './db'
import { ymd, today, award } from './game.js'

const useCtx = () => useContext(Ctx)
const KINDS = [['💕', 'Cita'], ['🍽️', 'Salida'], ['🎂', 'Aniversario'], ['🎬', 'Velada de cine'], ['✈️', 'Viaje'], ['🎉', 'Celebración']]
const longDate = (d) => new Date(d + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

function AddEvent({ date, onDone }) {
  const { couple, user, entries } = useCtx()
  const [icon, setIcon] = useState('💕')
  const [title, setTitle] = useState('')
  const [d, setD] = useState(date)
  const [time, setTime] = useState('20:00')
  const [movie, setMovie] = useState('')
  const pending = entries.filter((e) => e.status === 'pendiente')
  const save = async () => {
    const mv = pending.find((e) => e.id === movie)
    await addEvent(couple.id, {
      title: mv ? `Velada: ${mv.title}` : title.trim(), kind: KINDS.find((k) => k[0] === icon)[1], icon, date: d, time, createdBy: user.uid,
      ...(mv ? { movie: { type: mv.type, tmdbId: mv.tmdbId, title: mv.title, poster: mv.poster || null } } : {}),
    })
    onDone()
  }
  return (
    <div className="panel">
      <h3>Nuevo plan</h3>
      <div className="chips">{KINDS.map(([i, l]) => <button key={i} className={icon === i ? 'on' : ''} onClick={() => setIcon(i)}>{i} {l}</button>)}</div>
      {icon === '🎬' && !!pending.length && (
        <select value={movie} onChange={(e) => setMovie(e.target.value)}>
          <option value="">Elegir de “Por ver” (opcional)</option>
          {pending.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      )}
      {!movie && <input placeholder="¿Qué van a hacer?" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />}
      <div className="two"><input type="date" value={d} onChange={(e) => setD(e.target.value)} /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      <button className="btn" disabled={!movie && title.trim().length < 2} onClick={save}>Guardar en el calendario</button>
      <button className="link" onClick={onDone}>Cancelar</button>
    </div>
  )
}

function EventCard({ ev }) {
  const { couple } = useCtx()
  const [busy, setBusy] = useState(false)
  const complete = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const photo = await compressImage(file)
      await patchEvent(couple.id, ev.id, { done: true, photo, doneAt: Date.now(), xpAwarded: true })
      if (!ev.xpAwarded) await award(couple.id, { xp: 40, coins: 20 }) // cita cumplida: +40 XP
    } finally { setBusy(false) }
  }
  return (
    <div className={'evc ' + (ev.done ? 'done' : '')}>
      <span className="evi">{ev.icon}</span>
      <div>
        <b>{ev.title}</b>
        <small className="muted">{ev.time} · {ev.kind}{ev.done ? ' · ✅ cumplida (+40 XP)' : ''}</small>
        {ev.movie?.poster && <img className="mini" src={img(ev.movie.poster, 'w92')} alt="" />}
        {ev.photo && <img className="evphoto" src={ev.photo} alt="Recuerdo de la cita" />}
        {!ev.done && (
          <div className="two">
            <label className={'btn small' + (busy ? ' off' : '')}>{busy ? 'Subiendo…' : '📸 Cumplida con foto'}<input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => complete(e.target.files[0])} /></label>
            <button className="btn ghost small" onClick={() => window.confirm('¿Borrar este plan?') && removeEvent(couple.id, ev.id)}>Borrar</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Agenda() {
  const { events, entries, openTitle } = useCtx()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState(today())
  const [adding, setAdding] = useState(false)
  const y = month.getFullYear(), m = month.getMonth()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const n = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => ymd(new Date(y, m, i + 1)))]
  const evOn = (d) => events.filter((e) => e.date === d)
  const seenOn = (d) => entries.filter((e) => e.status === 'visto' && e.watchedDate === d)
  const dayEvents = evOn(sel).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const upcoming = events.filter((e) => !e.done && e.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3)
  return (
    <>
      <h1>Agenda de pareja</h1>
      <div className="calhead">
        <button onClick={() => setMonth(new Date(y, m - 1, 1))}>‹</button>
        <b>{month.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</b>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="cal">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <small key={i} className="wd">{d}</small>)}
        {cells.map((d, i) => d ? (
          <button key={d} className={'cd' + (d === sel ? ' sel' : '') + (d === today() ? ' today' : '')} onClick={() => { setSel(d); setAdding(false) }}>
            <span>{+d.slice(8)}</span>
            <em>{evOn(d).slice(0, 2).map((e) => e.icon).join('')}{seenOn(d).length ? '🎞️' : ''}</em>
          </button>
        ) : <span key={'b' + i} />)}
      </div>
      {!!upcoming.length && !adding && <><h3>Próximos planes</h3>{upcoming.map((e) => <button key={e.id} className="up" onClick={() => { setSel(e.date); setMonth(new Date(+e.date.slice(0, 4), +e.date.slice(5, 7) - 1, 1)) }}>{e.icon} <b>{e.title}</b> <small className="muted">{longDate(e.date)}</small></button>)}</>}
      <h2 className="cap">{longDate(sel)}</h2>
      {adding ? <AddEvent date={sel} onDone={() => setAdding(false)} /> : <button className="btn" onClick={() => setAdding(true)}>＋ Agendar plan</button>}
      {dayEvents.map((e) => <EventCard key={e.id} ev={e} />)}
      {seenOn(sel).map((e) => <button key={e.id} className="up" onClick={() => openTitle(e)}>🎞️ Vieron <b>{e.title}</b></button>)}
      {!dayEvents.length && !seenOn(sel).length && !adding && <p className="empty">Nada agendado este día. Planeen una cita o una velada de cine 💕</p>}
    </>
  )
}
