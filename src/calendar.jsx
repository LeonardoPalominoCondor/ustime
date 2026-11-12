import React, { useContext, useMemo, useRef, useState } from 'react'
import { Ctx } from './ctx.js'
import { img } from './tmdb'
import { addEvent, patchEvent, removeEvent, addPhotos, replacePhoto, removePhoto, claimEventXp, compressImage, MAX_PHOTOS } from './db'
import { today, ymd, award } from './game.js'
import { CATEGORIES, COLORS, REMINDERS, STATUS, catOf, occurrences, normalizeEvent } from './events.js'
import { EmojiPicker } from './emoji.jsx'
import { Who } from './avatar.jsx'
import { useBackLayer } from './nav.js'

const useCtx = () => useContext(Ctx)
const longDate = (d) => new Date(d + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
const addDays = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return ymd(x) }
const mondayOf = (d) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x) }
const Chip = ({ ev, onClick }) => <button className={'evchip ' + ev.status} style={{ '--c': ev.color }} onClick={onClick}><span>{ev.icon}</span><b>{ev.title}</b><small>{ev.time}</small>{ev.photos.length > 0 && <em>📷{ev.photos.length}</em>}</button>

/* ---------- Editor (crear / editar) ---------- */
function Editor({ ev, date, onClose }) {
  useBackLayer(onClose)
  const { couple, user, entries } = useCtx()
  const e0 = ev ? normalizeEvent(ev) : null
  const [f, setF] = useState(() => e0 ? { title: e0.title, description: e0.description, categoryId: e0.categoryId, icon: e0.icon, color: e0.color, date: e0.date, time: e0.time || '20:00', reminder: e0.reminder ?? null, repeat: e0.repeat }
    : { title: '', description: '', categoryId: 'cita', icon: '💕', color: '#FF4F8B', date, time: '20:00', reminder: null, repeat: null })
  const [movie, setMovie] = useState(e0?.movie ? `${e0.movie.type}_${e0.movie.tmdbId}` : '')
  const [emoji, setEmoji] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pending = entries.filter((e) => e.status === 'pendiente')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const pickCat = (c) => setF((x) => ({ ...x, categoryId: c.id, icon: c.icon, color: c.color, repeat: c.repeat || null }))
  const mv = pending.find((e) => e.id === movie) || (e0?.movie && movie ? e0.movie : null)
  const title = (mv ? f.title || `Velada: ${mv.title}` : f.title).trim()
  const save = async () => {
    setBusy(true); setErr('')
    try {
      const data = { ...f, title, reminder: f.reminder, movie: mv ? { type: mv.type, tmdbId: mv.tmdbId, title: mv.title, poster: mv.poster || null } : null }
      if (ev) await patchEvent(couple.id, ev.id, data); else await addEvent(couple.id, { ...data, createdBy: user.uid })
      onClose()
    } catch (e) { setErr(e.message || 'No se pudo guardar. Revisa tu conexión.') } finally { setBusy(false) }
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
        <h2>{ev ? 'Editar plan' : 'Nuevo plan'}</h2>
        <div className="evprev" style={{ '--c': f.color }}><span>{f.icon}</span><b>{title || 'Tu plan'}</b></div>
        <h3>Categoría</h3>
        <div className="chips">{CATEGORIES.map((c) => <button key={c.id} className={f.categoryId === c.id ? 'on' : ''} onClick={() => pickCat(c)}>{c.icon} {c.label}</button>)}</div>
        <h3>Emoji y color</h3>
        <div className="row-s"><button className="btn ghost small" onClick={() => setEmoji(!emoji)}>{f.icon} Cambiar emoji</button>
          <div className="swatches">{COLORS.map((c) => <button key={c} aria-label={'Color ' + c} className={f.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('color', c)} />)}</div></div>
        {emoji && <EmojiPicker value={f.icon} onPick={(e) => { set('icon', e); setEmoji(false) }} />}
        {f.categoryId === 'cine' && !!pending.length && (
          <select value={movie} onChange={(e) => setMovie(e.target.value)}><option value="">Elegir de “Por ver” (opcional)</option>{pending.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
        )}
        <label>Título</label><input value={f.title} maxLength={60} onChange={(e) => set('title', e.target.value)} placeholder={mv ? `Velada: ${mv.title}` : '¿Qué van a hacer?'} />
        <label>Descripción (opcional)</label><textarea rows={2} maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalles, lugar, ideas…" />
        <div className="two"><div><label>Fecha</label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div><div><label>Hora</label><input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></div></div>
        <label>Recordatorio</label>
        <select value={f.reminder ?? ''} onChange={(e) => set('reminder', e.target.value === '' ? null : +e.target.value)}>{REMINDERS.map(([v, l]) => <option key={l} value={v ?? ''}>{l}</option>)}</select>
        <label className="check"><input type="checkbox" checked={f.repeat === 'yearly'} onChange={(e) => set('repeat', e.target.checked ? 'yearly' : null)} /> Repetir cada año (aniversarios, cumpleaños)</label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn" disabled={busy || title.length < 2 || !f.date} onClick={save}>{busy ? 'Guardando…' : ev ? 'Guardar cambios' : 'Agendar'}</button>
      </div>
    </div>
  )
}

/* ---------- Detalle del evento + gestión de evidencias ---------- */
export function EventDetail({ id, onClose }) {
  useBackLayer(onClose)
  const { couple, user, events, members, openTitle, entries } = useCtx()
  const raw = events.find((e) => e.id === id)
  const [view, setView] = useState(null)       // índice de foto abierta
  const [confirm, setConfirm] = useState(null) // 'photo' | 'event'
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const addRef = useRef(); const repRef = useRef()
  if (!raw) return <div className="overlay" onClick={onClose}><div className="sheet"><p className="empty">Este plan ya no existe.</p><button className="btn" onClick={onClose}>Cerrar</button></div></div>
  const ev = normalizeEvent(raw)
  const photo = view != null ? ev.photos[view] : null
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn() } catch (e) { setErr(e.message || 'Algo salió mal. Inténtalo otra vez.') } finally { setBusy(false) } }
  const reward = async () => {
    if (await claimEventXp(couple.id, ev.id)) { await award(couple.id, user.uid, { xp: 40, coins: 20, key: 'event' }); setMsg('🎉 ¡Plan cumplido! +40 XP y +20 🪙 para la mascota') }
  }
  const setStatus = (status) => run(async () => { await patchEvent(couple.id, ev.id, { status, doneAt: status === 'done' ? Date.now() : null }); if (status === 'done') await reward() })
  const upload = (file, replaceId) => run(async () => {
    const data = await compressImage(file)
    await replacePhoto(couple.id, ev.id, replaceId, data, user.uid)
    if (ev.status === 'done') await reward()
    setMsg('📸 Foto reemplazada')
  })
  // Varias fotos a la vez: se reducen una por una y se guardan juntas en una sola transacción.
  const uploadMany = (files) => run(async () => {
    const room = Math.max(0, MAX_PHOTOS - ev.photos.length); const take = files.slice(0, room); const datas = []
    if (!take.length) throw new Error(`Ya hay ${MAX_PHOTOS} fotos (el máximo).`)
    for (const f of take) { setMsg(`Procesando ${datas.length + 1}/${take.length}…`); datas.push(await compressImage(f)) }
    const n = await addPhotos(couple.id, ev.id, datas, user.uid)
    if (ev.status === 'done') await reward()
    setMsg(`📸 ${n} foto${n > 1 ? 's' : ''} agregada${n > 1 ? 's' : ''}` + (files.length > take.length ? ` (solo caben ${MAX_PHOTOS} por plan)` : ''))
  })
  const del = () => run(async () => { await removePhoto(couple.id, ev.id, photo.id); setConfirm(null); setView(null); setMsg('🗑️ Foto eliminada') })
  const movieEntry = ev.movie && entries.find((e) => e.id === `${ev.movie.type}_${ev.movie.tmdbId}`)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="evhead" style={{ '--c': ev.color }}><span>{ev.icon}</span><div><h2>{ev.title}</h2><p className="muted">{catOf(ev.categoryId).label} · {longDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}{ev.repeat ? ' · 🔁 anual' : ''}</p></div></div>
        {ev.description && <p>{ev.description}</p>}
        {ev.reminder != null && <p className="muted small">🔔 {REMINDERS.find(([v]) => v === ev.reminder)?.[1]}</p>}
        {ev.createdBy && <p className="muted small">Creado por <Who uid={ev.createdBy} size={20} /></p>}
        {ev.movie && <button className="up" onClick={() => movieEntry ? (onClose(), openTitle(movieEntry)) : openTitle({ ...ev.movie })}>{ev.movie.poster && <img className="mini" src={img(ev.movie.poster, 'w92')} alt="" />} 🎞️ <b>{ev.movie.title}</b></button>}
        <h3>Estado</h3>
        <div className="seg">{Object.entries(STATUS).map(([k, l]) => <button key={k} disabled={busy} className={ev.status === k ? 'on' : ''} onClick={() => ev.status !== k && setStatus(k)}>{l}</button>)}</div>
        {ev.status === 'done' && !ev.photos.length && <p className="hint">📷 Suban una foto como evidencia para ganar los +40 XP.</p>}
        <h3>Evidencias ({ev.photos.length}/{MAX_PHOTOS})</h3>
        <div className="gallery">
          {ev.photos.map((p, i) => <button key={p.id} className="thumb" onClick={() => { setView(i); setConfirm(null) }}><img src={p.data} alt={`Evidencia ${i + 1}`} /></button>)}
          {ev.photos.length < MAX_PHOTOS && <button className="thumb add" disabled={busy} onClick={() => addRef.current.click()}>{busy ? '…' : '＋'}<small>Agregar varias</small></button>}
        </div>
        <input ref={addRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = [...e.target.files]; e.target.value = ''; fs.length && uploadMany(fs) }} />
        <input ref={repRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; f && upload(f, photo.id) }} />
        {photo && (
          <div className="viewer">
            <img src={photo.data} alt="Evidencia" />
            {photo.by && <small className="muted">Subida por <Who uid={photo.by} size={18} /> · {new Date(photo.at).toLocaleDateString('es')}</small>}
            {confirm === 'photo' ? (
              <div className="confirm" role="alertdialog"><b>¿Eliminar esta foto?</b><small>Se borrará para los dos y no se puede deshacer.</small>
                <div className="two"><button className="btn ghost" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn danger" disabled={busy} onClick={del}>Sí, eliminar</button></div></div>
            ) : (
              <div className="two3"><button className="btn ghost small" onClick={() => setView(null)}>Cerrar</button><button className="btn small" disabled={busy} onClick={() => repRef.current.click()}>🔄 Reemplazar</button><button className="btn danger small" onClick={() => setConfirm('photo')}>🗑️ Eliminar</button></div>
            )}
          </div>
        )}
        {msg && <p className="okmsg" role="status">{msg}</p>}
        {err && <p className="error" role="alert">{err}</p>}
        <div className="two" style={{ marginTop: '1rem' }}>
          <button className="btn ghost" onClick={() => setEdit(true)}>✏️ Editar plan</button>
          {confirm === 'event' ? <button className="btn danger" onClick={() => run(async () => { await removeEvent(couple.id, ev.id); onClose() })}>Confirmar borrado</button> : <button className="btn ghost" onClick={() => setConfirm('event')}>🗑️ Borrar plan</button>}
        </div>
        {confirm === 'event' && <small className="muted">Se borrará el plan y sus {ev.photos.length} fotos. Toca “Confirmar borrado”.</small>}
        {edit && <Editor ev={raw} date={ev.date} onClose={() => setEdit(false)} />}
      </div>
    </div>
  )
}

/* ---------- Calendario: mensual / semanal / agenda ---------- */
export function Agenda() {
  const { events, entries, openTitle, openEvent } = useCtx()
  const [mode, setMode] = useState('month')
  const [sel, setSel] = useState(today())
  const [adding, setAdding] = useState(false)
  const [cursor, setCursor] = useState(today().slice(0, 7) + '-01')
  const y = +cursor.slice(0, 4), m = +cursor.slice(5, 7) - 1
  const lead = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => ymd(new Date(y, m, i + 1)))]
  const monthOcc = useMemo(() => occurrences(events, ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))), [events, y, m])
  const wk = mondayOf(sel)
  const weekOcc = useMemo(() => occurrences(events, wk, addDays(wk, 6)), [events, wk])
  const agendaOcc = useMemo(() => occurrences(events, today(), addDays(today(), 120)).filter((e) => e.status !== 'cancelled'), [events])
  const on = (d, list) => list.filter((e) => e.date === d)
  const seenOn = (d) => entries.filter((e) => e.status === 'visto' && e.watchedDate === d)
  const open = (e) => openEvent(e.id)
  const shift = (k) => { if (mode === 'week') setSel(addDays(sel, 7 * k)); else { const d = new Date(y, m + k, 1); setCursor(ymd(d)) } }
  const dayList = on(sel, monthOcc.length && mode === 'month' ? monthOcc : occurrences(events, sel, sel))
  const upcomingSpecial = agendaOcc.filter((e) => catOf(e.categoryId).special).slice(0, 2)
  return (
    <>
      <h1>Agenda de pareja</h1>
      <div className="seg">{[['month', 'Mes'], ['week', 'Semana'], ['agenda', 'Agenda']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>
      {!!upcomingSpecial.length && mode !== 'agenda' && <div className="specials">{upcomingSpecial.map((e) => <button key={e.key} onClick={() => open(e)} style={{ '--c': e.color }}>{e.icon} <b>{e.title}</b><small>{e.years ? `${e.years} años · ` : ''}{longDate(e.date)}</small></button>)}</div>}
      {mode !== 'agenda' && (
        <div className="calhead"><button aria-label="Anterior" onClick={() => shift(-1)}>‹</button>
          <b>{mode === 'week' ? `${longDate(wk)} – ${longDate(addDays(wk, 6))}` : new Date(y, m, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</b>
          <button aria-label="Siguiente" onClick={() => shift(1)}>›</button></div>
      )}
      {mode === 'month' && (
        <div className="cal" key={cursor}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <small key={i} className="wd">{d}</small>)}
          {cells.map((d, i) => { const es = d ? on(d, monthOcc) : []; return d ? (
            <button key={d} className={'cd' + (d === sel ? ' sel' : '') + (d === today() ? ' today' : '') + (es.some((e) => catOf(e.categoryId).special) ? ' special' : '')} onClick={() => setSel(d)} aria-label={longDate(d)}>
              <span>{+d.slice(8)}</span>
              <em>{es.slice(0, 3).map((e) => <i key={e.key} style={{ background: e.color }} />)}{seenOn(d).length > 0 && <u>🎞️</u>}</em>
            </button>) : <span key={'b' + i} /> })}
        </div>
      )}
      {mode === 'week' && (
        <div className="week" key={wk}>{Array.from({ length: 7 }, (_, i) => addDays(wk, i)).map((d) => (
          <div key={d} className={'wday' + (d === today() ? ' today' : '') + (d === sel ? ' sel' : '')} onClick={() => setSel(d)}>
            <header><b>{new Date(d + 'T12:00').toLocaleDateString('es', { weekday: 'short' })}</b><span>{+d.slice(8)}</span></header>
            <div>{on(d, weekOcc).map((e) => <Chip key={e.key} ev={e} onClick={() => open(e)} />)}{seenOn(d).map((e) => <button key={e.id} className="evchip" onClick={() => openTitle(e)}><span>🎞️</span><b>{e.title}</b></button>)}</div>
          </div>))}</div>
      )}
      {mode === 'agenda' && (
        <div className="agenda">{!agendaOcc.length && <p className="empty">No hay planes próximos. ¡Agenden algo bonito! 💕</p>}
          {Object.entries(agendaOcc.reduce((a, e) => ((a[e.date] = a[e.date] || []).push(e), a), {})).map(([d, es]) => (
            <section key={d}><h3 className="cap">{d === today() ? 'Hoy · ' : ''}{longDate(d)}</h3>{es.map((e) => <Chip key={e.key} ev={e} onClick={() => open(e)} />)}</section>))}</div>
      )}
      {mode !== 'agenda' && <>
        <h2 className="cap">{longDate(sel)}</h2>
        {mode === 'month' && dayList.map((e) => <Chip key={e.key} ev={e} onClick={() => open(e)} />)}
        {mode === 'month' && seenOn(sel).map((e) => <button key={e.id} className="up" onClick={() => openTitle(e)}>🎞️ Vieron <b>{e.title}</b></button>)}
        {mode === 'month' && !dayList.length && !seenOn(sel).length && <p className="empty">Nada agendado este día.</p>}
      </>}
      <button className="fab" aria-label="Agendar plan" onClick={() => setAdding(true)}>＋</button>
      {adding && <Editor date={sel} onClose={() => setAdding(false)} />}
    </>
  )
}
