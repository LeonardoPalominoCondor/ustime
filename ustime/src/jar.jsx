import React, { useContext, useMemo, useState } from 'react'
import { Ctx } from './ctx.js'
import { addJarNote, markJarRead, removeJarNote } from './db'
import { Who } from './avatar.jsx'
import { Seg } from './ui.jsx'
import { useBackLayer } from './nav.js'

export const JAR_COLORS = ['#ffd6e0', '#ffe5a5', '#c8f0d2', '#cfe3ff', '#e3d2ff', '#ffd0b0', '#d0f4f0', '#fff3b0']
export const WHEN = ['', 'estés triste', 'me extrañes', 'necesites ánimo', 'quieras sonreír', 'tengas un mal día', 'dudes de ti', 'no puedas dormir']
const IDEAS = ['Estoy muy orgulloso/a de ti 💪', 'Eres mi lugar favorito en el mundo 🏡', 'Gracias por existir ✨', 'Todo va a salir bien, estoy contigo 🤍', 'Me encanta cómo te ríes 😄', 'Hoy pensé en ti y sonreí 💭', 'Eres más fuerte de lo que crees 🌟']
import { hash, shade, layoutNotes, JAR_MAX } from './jarlayout.js'
export { layoutNotes, JAR_MAX }

function Scroll({ n, pos, onOpen, fresh, mine }) {
  const unread = mine && !n.readAt
  return (
    <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.r})`}>
      <g className={'jnote' + (unread ? ' unread' : '') + (fresh ? ' new' : '')} onClick={() => onOpen(n)} role="button" tabIndex="0" aria-label={unread ? 'Nota sin leer' : 'Nota'} onKeyDown={(e) => e.key === 'Enter' && onOpen(n)}>
        <rect x="-25" y="-10" width="50" height="20" rx="10" fill={n.color} stroke={shade(n.color, 0.82)} strokeWidth="1.5" />
        <ellipse cx="-25" cy="0" rx="5" ry="10" fill={shade(n.color, 0.9)} stroke={shade(n.color, 0.75)} /><ellipse cx="25" cy="0" rx="5" ry="10" fill={shade(n.color, 0.9)} stroke={shade(n.color, 0.75)} />
        <rect x="-4" y="-10" width="8" height="20" fill="#fff" opacity=".75" /><path d="M0 -3 q-8 -9 -9 -1 q2 6 9 1 q7 5 9 -1 q-1 -8 -9 1z" fill="#ff4f8b" />
      </g>
    </g>
  )
}

export function JarSvg({ notes, mine, onOpen, seed }) {
  const lay = useMemo(() => layoutNotes(notes.map((n) => n.id), seed), [notes, seed])
  const byId = Object.fromEntries(notes.map((n) => [n.id, n]))
  const hidden = Math.max(0, notes.length - JAR_MAX)
  return (
    <svg viewBox="0 0 300 400" className="jarsvg" role="img" aria-label={`Frasco de vidrio con ${notes.length} notas`}>
      <defs><linearGradient id="glass" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset=".3" stopColor="#cfe9ff" stopOpacity=".1" /><stop offset=".8" stopColor="#cfe9ff" stopOpacity=".08" /><stop offset="1" stopColor="#fff" stopOpacity=".25" /></linearGradient>
        <linearGradient id="lid" x1="0" x2="1"><stop offset="0" stopColor="#d9a441" /><stop offset=".5" stopColor="#ffe29a" /><stop offset="1" stopColor="#b8862c" /></linearGradient></defs>
      <ellipse cx="150" cy="388" rx="100" ry="9" fill="rgba(0,0,0,.28)" />
      <path d="M88 56 V84 C88 102 40 110 40 152 V350 C40 372 56 384 78 384 H222 C244 384 260 372 260 350 V152 C260 110 212 102 212 84 V56 Z" fill="url(#glass)" stroke="rgba(255,255,255,.6)" strokeWidth="3" />
      <g>{lay.map((p) => <Scroll key={p.id} n={byId[p.id]} pos={p} onOpen={onOpen} mine={mine} fresh={Date.now() - byId[p.id].createdAt < 6000} />)}</g>
      <path d="M52 160 V340" stroke="#fff" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" /><path d="M64 150 q-4 4 -4 12" stroke="#fff" strokeOpacity=".5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="92" y="14" width="116" height="44" rx="12" fill="url(#lid)" stroke="#8a6420" strokeWidth="2" />{[108, 124, 140, 156, 172, 188].map((x) => <path key={x} d={`M${x} 20 V52`} stroke="#8a6420" strokeOpacity=".35" strokeWidth="2" />)}
      <rect x="72" y="116" width="156" height="50" rx="8" fill="#fff8e6" fillOpacity=".94" stroke="#e0c98c" strokeWidth="1.5" transform="rotate(-2 150 141)" />
      <text x="150" y="137" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#7a4a2a" transform="rotate(-2 150 141)">LEER SOLO CUANDO</text><text x="150" y="155" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#7a4a2a" transform="rotate(-2 150 141)">SEA NECESARIO 💌</text>
      {hidden > 0 && <text x="150" y="372" textAnchor="middle" fontSize="12" fill="#fff" opacity=".8">+{hidden} más abajo</text>}
    </svg>
  )
}

function Reader({ n, mine, onClose, onDelete }) {
  useBackLayer(onClose)
  const { members } = useContext(Ctx)
  return (
    <div className="overlay center-o" onClick={onClose}>
      <div className="paper" style={{ background: n.color }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Mensaje del frasco">
        <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
        {n.when && <small className="when">Ábrela cuando {n.when}…</small>}
        <p className="hand">{n.text}</p>
        <footer><Who uid={n.from} size={26} /> <span>{members[n.from]?.username || ''}</span><small>{new Date(n.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}</small></footer>
        {!mine && <button className="link danger" onClick={onDelete}>Quitar esta nota del frasco</button>}
      </div>
    </div>
  )
}

function Composer({ onClose, partnerName, onSend }) {
  useBackLayer(onClose)
  const [text, setText] = useState(''); const [color, setColor] = useState(JAR_COLORS[0]); const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const send = async () => { setBusy(true); setErr(''); try { await onSend({ text: text.trim(), color, when }); onClose() } catch (e) { setErr(e.message || 'No se pudo enviar') } finally { setBusy(false) } }
  return (
    <div className="overlay" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}>
      <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
      <h2>Una nota para {partnerName}</h2>
      <div className="paper-prev" style={{ background: color }}><p className="hand">{text || 'Escribe algo bonito…'}</p></div>
      <div className="swatches" role="radiogroup" aria-label="Color de la nota">{JAR_COLORS.map((c) => <button key={c} role="radio" aria-checked={color === c} aria-label={'Color ' + c} className={color === c ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
      <label>Ábrela cuando… (opcional)</label>
      <div className="chips scroll">{WHEN.map((w) => <button key={w} className={when === w ? 'on' : ''} onClick={() => setWhen(w)}>{w || 'Cuando quieras'}</button>)}</div>
      <textarea rows={4} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="Un mensaje positivo para leer cuando lo necesite" aria-label="Mensaje" /><small className="muted">{text.length}/280</small>
      <div className="chips scroll">{IDEAS.map((i) => <button key={i} onClick={() => setText(i)}>{i}</button>)}</div>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn big" disabled={busy || text.trim().length < 2} onClick={send}>{busy ? 'Enviando…' : '💌 Meter en el frasco'}</button>
    </div></div>
  )
}

export function JarScreen() {
  const { jar = [], user, partnerUid, members, couple } = useContext(Ctx)
  const [view, setView] = useState('mine'); const [seed, setSeed] = useState(0); const [shake, setShake] = useState(false)
  const [open, setOpen] = useState(null); const [compose, setCompose] = useState(false)
  const partner = members[partnerUid]?.username || 'tu pareja'
  const mineJar = jar.filter((n) => n.to === user.uid).sort((a, b) => a.createdAt - b.createdAt)
  const theirJar = jar.filter((n) => n.from === user.uid).sort((a, b) => a.createdAt - b.createdAt)
  const list = view === 'mine' ? mineJar : theirJar
  const unread = mineJar.filter((n) => !n.readAt).length
  const doShake = () => { setShake(true); setSeed((s) => s + 1); setTimeout(() => setShake(false), 700) }
  const pick = () => { const pool = mineJar.filter((n) => !n.readAt); const src = pool.length ? pool : mineJar; if (src.length) { doShake(); setTimeout(() => openNote(src[Math.floor(Math.random() * src.length)]), 600) } }
  const openNote = (n) => { setOpen(n); if (view === 'mine' && n.to === user.uid && !n.readAt) markJarRead(couple.id, n.id).catch(() => {}) }
  if (!partnerUid) return <div className="panel center-t"><h2>🫙 El frasco</h2><p className="muted">Cuando tu pareja se una a su espacio podrán dejarse notas positivos para leer cuando lo necesiten.</p></div>
  return (
    <>
      <Seg tabs={[['mine', `Tu frasco${unread ? ` (${unread})` : ''}`], ['theirs', `Frasco de ${partner}`]]} value={view} onChange={(v) => { setView(v); setOpen(null) }} />
      <div className={'jarwrap' + (shake ? ' shake' : '')}><JarSvg notes={list} mine={view === 'mine'} onOpen={openNote} seed={seed} /></div>
      <p className="muted small center-t">{view === 'mine' ? (list.length ? `${list.length} mensaje${list.length > 1 ? 's' : ''} de ${partner} para ti${unread ? ` · ${unread} sin leer ✨` : ''}. Ábrelos solo cuando los necesites.` : `${partner} todavía no te dejó mensajes. ¡Pídele uno! 😉`) : `Las notas que le escribiste a ${partner} (${list.length}). Toca una para verla o quitarla.`}</p>
      <div className="two"><button className="btn" onClick={() => setCompose(true)}>💌 Escribir nota</button>{view === 'mine' ? <button className="btn ghost" disabled={!mineJar.length} onClick={pick}>🎲 Sacar una</button> : <button className="btn ghost" onClick={doShake}>🫨 Agitar</button>}</div>
      {view === 'mine' && !!mineJar.length && <button className="link" onClick={doShake}>Agitar el frasco</button>}
      {open && <Reader n={open} mine={open.to === user.uid} onClose={() => setOpen(null)} onDelete={() => { removeJarNote(couple.id, open.id); setOpen(null) }} />}
      {compose && <Composer partnerName={partner} onClose={() => setCompose(false)} onSend={async (n) => { await addJarNote(couple.id, { ...n, from: user.uid, to: partnerUid }); setView('theirs'); setSeed((s) => s + 1) }} />}
    </>
  )
}
