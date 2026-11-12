import React, { useContext, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { COUPLES } from '../paths'
import { Ctx } from '../ctx.js'
import { addGame, playGame, removeGame } from '../db'
import { award } from '../game.js'
import { useBackLayer } from '../nav.js'
import * as E from './engines.js'

const Board = ({ w, h, render, onClick, cls = '' }) => (
  <div className={'gboard ' + cls} style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
    {Array.from({ length: w * h }, (_, i) => { const c = render(i) || {}; return <button key={i} className={'gcell ' + (c.cls || '')} disabled={c.off} onClick={() => onClick(i)} aria-label={c.label || `Casilla ${i + 1}`}>{c.t}</button> })}
  </div>
)
const disc = (v) => (v === 0 ? 'p0' : v === 1 ? 'p1' : '')
const dot = (v, big) => (v === null || v === undefined ? '' : '●')

const TTT = ({ s, can, act }) => <Board w={3} h={3} cls="ttt" render={(i) => ({ t: s.b[i] === 0 ? '✕' : s.b[i] === 1 ? '○' : '', cls: disc(s.b[i]), off: !can || s.b[i] !== null })} onClick={(i) => act({ i })} />
const C4 = ({ s, can, act }) => <Board w={7} h={6} cls="c4" render={(i) => ({ t: dot(s.b[i]), cls: disc(s.b[i]) + (s.last === i ? ' last' : ''), off: !can, label: `Columna ${(i % 7) + 1}` })} onClick={(i) => act({ c: i % 7 })} />
const Gomoku = ({ s, can, act }) => <Board w={E.GN} h={E.GN} cls="sm" render={(i) => ({ t: dot(s.b[i]), cls: disc(s.b[i]) + (s.last === i ? ' last' : ''), off: !can || s.b[i] !== null })} onClick={(i) => act({ i })} />
const Reversi = ({ s, can, act, k }) => <Board w={8} h={8} cls="rev" render={(i) => ({ t: s.b[i] !== null ? '●' : can && E.flips(s.b, i, k).length ? '•' : '', cls: disc(s.b[i]) + (s.b[i] === null && can && E.flips(s.b, i, k).length ? ' hint' : ''), off: !can || s.b[i] !== null })} onClick={(i) => act({ i })} />
const Hex = ({ s, can, act }) => (
  <div className="hexboard" role="grid" aria-label="Tablero de Hex"><small className="muted">Tú: {''}conecta tus dos lados del color</small>
    {Array.from({ length: E.HN }, (_, r) => <div key={r} className="hexrow" style={{ marginLeft: r * 15 }}>{Array.from({ length: E.HN }, (_, c) => { const i = r * E.HN + c, v = s.b[i]; return <button key={c} disabled={!can || v !== null} className={'hexcell ' + disc(v) + (r === 0 || r === E.HN - 1 ? ' e0' : '') + (c === 0 || c === E.HN - 1 ? ' e1' : '')} onClick={() => act({ i })} aria-label={`Fila ${r + 1}, columna ${c + 1}`} /> })}</div>)}
  </div>
)
const Dots = ({ s, can, act }) => {
  const S = 64, M = 18, W = E.DN * S + 2 * M, col = (v) => (v === 0 ? '#ff4f8b' : v === 1 ? '#4dd4e6' : 'rgba(255,255,255,.14)')
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="dotsvg" role="group" aria-label="Puntos y cajas">
      {s.box.map((o, i) => o !== null && <rect key={i} x={M + (i % E.DN) * S + 4} y={M + Math.floor(i / E.DN) * S + 4} width={S - 8} height={S - 8} rx="8" fill={col(o)} opacity=".45" />)}
      {s.h.map((v, i) => { const r = Math.floor(i / E.DN), c = i % E.DN; return <g key={'h' + i}><line x1={M + c * S} x2={M + (c + 1) * S} y1={M + r * S} y2={M + r * S} stroke={col(v)} strokeWidth={v === null ? 3 : 7} strokeLinecap="round" /><rect x={M + c * S + 8} y={M + r * S - 14} width={S - 16} height="28" fill="transparent" style={{ cursor: can && v === null ? 'pointer' : 'default' }} onClick={() => can && v === null && act({ t: 'h', i })} /></g> })}
      {s.v.map((v, i) => { const r = Math.floor(i / (E.DN + 1)), c = i % (E.DN + 1); return <g key={'v' + i}><line x1={M + c * S} x2={M + c * S} y1={M + r * S} y2={M + (r + 1) * S} stroke={col(v)} strokeWidth={v === null ? 3 : 7} strokeLinecap="round" /><rect x={M + c * S - 14} y={M + r * S + 8} width="28" height={S - 16} fill="transparent" style={{ cursor: can && v === null ? 'pointer' : 'default' }} onClick={() => can && v === null && act({ t: 'v', i })} /></g> })}
      {Array.from({ length: (E.DN + 1) ** 2 }, (_, i) => <circle key={i} cx={M + (i % (E.DN + 1)) * S} cy={M + Math.floor(i / (E.DN + 1)) * S} r="6" fill="#fff" />)}
    </svg>
  )
}
const SOS = ({ s, can, act }) => { const [ch, setCh] = useState('S'); return <><div className="chips">{['S', 'O'].map((c) => <button key={c} className={ch === c ? 'on' : ''} onClick={() => setCh(c)}>Poner {c}</button>)}</div><Board w={E.SN} h={E.SN} cls="sos" render={(i) => ({ t: s.b[i] || '', off: !can || !!s.b[i] })} onClick={(i) => act({ i, ch })} /></> }

function usePick(s, key) { const [sel, setSel] = useState(null); useEffect(() => setSel(null), [JSON.stringify(s[key] ?? s)]); return [sel, setSel] }
const Checkers = ({ s, can, act, k }) => {
  const [sel, setSel] = usePick(s, 'b'); const moves = E.checkersMoves(s.b, k), tg = sel !== null ? moves.filter((m) => m.from === sel).map((m) => m.to) : []
  return <Board w={E.CN} h={E.CN} cls="chk" render={(i) => { const r = Math.floor(i / E.CN), c = i % E.CN, p = s.b[i]; return { t: p === null ? '' : p >= 2 ? '♛' : '●', cls: ((r + c) % 2 ? 'dk ' : 'lt ') + (p === null ? '' : 'p' + (p % 2)) + (sel === i ? ' sel' : '') + (tg.includes(i) ? ' tg' : ''), off: !can || !((r + c) % 2) } }}
    onClick={(i) => { if (tg.includes(i)) { act({ from: sel, to: i }); setSel(null) } else if (s.b[i] !== null && s.b[i] % 2 === k && moves.some((m) => m.from === i)) setSel(i) }} />
}
const Isola = ({ s, can, act, k }) => {
  const [to, setTo] = useState(null); useEffect(() => setTo(null), [JSON.stringify(s.pos), s.removed.filter(Boolean).length])
  const pos = to === null ? s.pos : s.pos.map((p, i) => (i === k ? to : p)), free = (j) => !s.removed[j] && !pos.includes(j)
  const opts = to === null ? E.isolaNb(s.pos[k]).filter((j) => !s.removed[j] && !s.pos.includes(j)) : []
  return <><p className="muted small center-t">{!can ? 'Esperando…' : to === null ? '1️⃣ Elige a dónde moverte' : '2️⃣ Ahora elige una casilla para quitar'}</p>
    <Board w={E.IN} h={E.IN} cls="isola" render={(i) => ({ t: pos.includes(i) ? '●' : '', cls: (s.removed[i] ? 'void ' : '') + (pos[0] === i ? 'p0' : pos[1] === i ? 'p1' : '') + (opts.includes(i) ? ' tg' : ''), off: !can || s.removed[i] || (to === null ? !opts.includes(i) : !free(i)) })} onClick={(i) => (to === null ? setTo(i) : act({ to, rm: i }))} />
    {to !== null && <button className="link" onClick={() => setTo(null)}>↩ Cambiar movimiento</button>}</>
}
const Fox = ({ s, can, act, k }) => {
  const [sel, setSel] = usePick(s, 'hounds'); const mine = k === 0 ? [s.fox] : s.hounds
  const tg = sel === null ? [] : k === 0 ? E.foxMoves(s) : E.houndMoves(s, sel)
  return <><p className="muted small center-t">{k === 0 ? '🦊 Eres el zorro: llega a la fila de arriba.' : '🐶 Eres los perros: acorrala al zorro.'}</p>
    <Board w={E.FN} h={E.FN} cls="chk fox" render={(i) => { const r = Math.floor(i / E.FN), c = i % E.FN; return { t: i === s.fox ? '🦊' : s.hounds.includes(i) ? '🐶' : r === 0 && (r + c) % 2 ? '🏁' : '', cls: ((r + c) % 2 ? 'dk' : 'lt') + (sel === i ? ' sel' : '') + (tg.includes(i) ? ' tg' : ''), off: !can || !((r + c) % 2) } }}
      onClick={(i) => { if (tg.includes(i)) { act({ from: sel, to: i }); setSel(null) } else if (mine.includes(i)) setSel(i) }} /></>
}
const Battleship = ({ s, can, act, me, g, name }) => {
  const [fleet, setFleet] = useState(() => E.randomFleet()); const o = E.other(g.players, me)
  const mineCells = new Set((s.fleets[me] || fleet).flat()), enemy = new Set((s.fleets[o] || []).flat()), mine = s.shots[me], theirs = s.shots[o]
  const MyBoard = () => <><h3>Tu flota</h3><Board w={E.BN} h={E.BN} cls="bs" render={(i) => ({ t: theirs.includes(i) ? (mineCells.has(i) ? '💥' : '·') : mineCells.has(i) ? '🚢' : '', cls: mineCells.has(i) ? 'ship' : '', off: true })} onClick={() => {}} /></>
  if (!s.fleets[me]) return <><MyBoard /><div className="two"><button className="btn ghost" onClick={() => setFleet(E.randomFleet())}>🔀 Reacomodar</button><button className="btn" onClick={() => act({ t: 'ready', fleet })}>✅ Listo</button></div></>
  if (!s.fleets[o]) return <><MyBoard /><p className="hint">Esperando a que {name(o)} coloque su flota…</p></>
  return <><h3>Radar enemigo {can ? '· ¡dispara!' : ''}</h3><Board w={E.BN} h={E.BN} cls="bs radar" render={(i) => ({ t: mine.includes(i) ? (enemy.has(i) ? '💥' : '🌊') : '', off: !can || mine.includes(i) })} onClick={(i) => act({ t: 'shoot', i })} /><MyBoard /></>
}
const Memory = ({ s, can, act }) => <Board w={4} h={4} cls="mem" render={(i) => { const up = s.up.includes(i) || s.matched[i] !== null; return { t: up ? s.cards[i] : '❔', cls: (up ? 'up ' : '') + (s.matched[i] !== null ? 'p' + s.matched[i] : ''), off: !can || s.matched[i] !== null || s.up.includes(i) } }} onClick={(i) => act({ i })} />
const Flag = ({ s, can, act, g }) => {
  const [mode, setMode] = useState('reveal'); const done = g.status === 'done'
  return <><div className="seg">{[['reveal', '⛏️ Revelar'], ['flag', '🚩 Marcar mina']].map(([m, l]) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{l}</button>)}</div>
    <Board w={E.MW} h={E.MW} cls="mines" render={(i) => { const mine = s.mines.includes(i); return { t: s.rev[i] ? (mine ? '💥' : E.mineAdj(s.mines, i) || '') : s.flag[i] !== null ? '🚩' : done && mine ? '💣' : '', cls: (s.rev[i] ? 'open ' : '') + (s.flag[i] !== null ? 'p' + s.flag[i] : ''), off: !can || s.rev[i] || s.flag[i] !== null } }} onClick={(i) => act({ t: mode, i })} /></>
}
const Race = ({ s, can, act, k }) => {
  const p = s.pos[k], adj = (i) => Math.abs(Math.floor(i / E.RW) - Math.floor(p / E.RW)) + Math.abs((i % E.RW) - (p % E.RW)) === 1
  return <Board w={E.RW} h={E.RH} cls="race" render={(i) => ({ t: s.pos[0] === i ? '🔴' : s.pos[1] === i ? '🟡' : s.boom.includes(i) ? '💥' : s.seen[i] !== null ? s.seen[i] : i < E.RW ? '🏁' : '', cls: (s.seen[i] !== null ? 'open ' : '') + (can && adj(i) ? 'tg' : ''), off: !can || !adj(i) || i === s.pos[1 - k] })} onClick={(i) => act({ to: i })} />
}
const Treasure = ({ s, can, act }) => <Board w={E.TW} h={E.TW} cls="tre" render={(i) => ({ t: s.tried[i] === null ? '' : s.hint[i] === 0 ? '💎' : s.hint[i], cls: (s.tried[i] !== null ? 'open ' : '') + (s.hint[i] === 0 ? 'p' + s.tried[i] : ''), off: !can || s.tried[i] !== null })} onClick={(i) => act({ i })} />
const Maze = ({ s, can, act, k }) => {
  const p = s.pos[k], mv = (d) => act({ to: p + d })
  return <><Board w={E.LN} h={E.LN} cls="maze" render={(i) => ({ t: s.pos[0] === i ? '🔴' : s.pos[1] === i ? '🟡' : i === E.LEXIT ? '🏁' : '', cls: s.grid[i] ? 'wall' : 'floor', off: true })} onClick={() => {}} />
    <div className="dpad">{[['⬆️', -E.LN, 'u'], ['⬅️', -1, 'l'], ['➡️', 1, 'r'], ['⬇️', E.LN, 'd']].map(([ic, d, c]) => <button key={c} className={'btn ghost ' + c} disabled={!can || s.grid[p + d] !== 0} onClick={() => mv(d)} aria-label={c}>{ic}</button>)}</div></>
}
const Hangman = ({ s, can, act, me, g, name }) => {
  const [w, setW] = useState(''); const setter = g.players[s.setter], guesser = E.other(g.players, setter)
  const word = s.word ? [...s.word].map((c) => (s.guessed.includes(c) || me === setter ? c : '_')).join(' ') : ''
  return <div className="panel center-t"><small className="muted">Ronda {s.round}/2 · {name(setter)} elige · {name(guesser)} adivina</small>
    {s.last && <p className="okmsg">Palabra anterior: <b>{s.last.word}</b> · {s.last.won ? 'la adivinaron' : 'no la adivinaron'}</p>}
    {s.phase === 'set' ? (me === setter ? <><p>Escribe una palabra secreta (3–12 letras)</p><input value={w} maxLength={12} onChange={(e) => setW(e.target.value)} aria-label="Palabra secreta" /><button className="btn" disabled={!can || w.trim().length < 3} onClick={() => act({ t: 'word', word: w })}>Listo</button></> : <p className="hint">{name(setter)} está eligiendo una palabra…</p>)
      : <><p className="hword">{word}</p><p>{'❤️'.repeat(s.lives)}{'🖤'.repeat(6 - s.lives)}</p><div className="kb">{[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => <button key={c} disabled={!can || s.guessed.includes(c)} className={s.guessed.includes(c) ? (s.word.includes(c) ? 'ok' : 'no') : ''} onClick={() => act({ t: 'guess', ch: c })}>{c}</button>)}</div></>}</div>
}
const Mastermind = ({ s, can, act, me, g, name }) => {
  const [pick, setPick] = useState([]); const setter = g.players[s.setter], guesser = E.other(g.players, setter); useEffect(() => setPick([]), [s.guesses.length, s.phase])
  const send = () => (s.phase === 'set' ? act({ t: 'code', code: pick }) : act({ t: 'guess', g: pick }))
  return <div className="panel"><small className="muted">Ronda {s.round}/2 · {name(setter)} crea el código · {name(guesser)} lo descifra</small>
    {s.last && <p className="okmsg">Código anterior: {s.last.code.map((c) => E.MCOLORS[c]).join('')} · {s.last.won ? `resuelto en ${s.last.tries}` : 'no lo resolvieron'}</p>}
    {s.code && me === setter && <p>Tu código: {s.code.map((c) => E.MCOLORS[c]).join(' ')}</p>}
    {s.guesses.map((x, i) => <div key={i} className="mmrow"><span>{x.g.map((c) => E.MCOLORS[c]).join(' ')}</span><b>{'⚫'.repeat(x.b)}{'⚪'.repeat(x.w)}</b></div>)}
    {can && <><div className="mmpick">{[0, 1, 2, 3].map((i) => <span key={i}>{pick[i] !== undefined ? E.MCOLORS[pick[i]] : '◻️'}</span>)}</div><div className="chips">{E.MCOLORS.map((c, i) => <button key={c} disabled={pick.length >= 4} onClick={() => setPick([...pick, i])}>{c}</button>)}<button onClick={() => setPick(pick.slice(0, -1))}>⌫</button></div>
      <button className="btn" disabled={pick.length !== 4} onClick={send}>{s.phase === 'set' ? 'Fijar código' : `Probar (${s.guesses.length + 1}/8)`}</button></>}
    {!can && g.status === 'playing' && <p className="hint">Turno de {name(g.turn)}…</p>}<small className="muted">⚫ color y lugar · ⚪ color en otro lugar</small></div>
}
const Wordle = ({ s, can, act, me, g, name }) => {
  const [w, setW] = useState(''); const o = E.other(g.players, me), colors = { g: '#3fb06a', y: '#d9a441', x: '#3a2f4e' }
  const row = (guess, hide, key) => <div key={key} className="wrow">{[...guess].map((ch, i) => <span key={i} style={{ background: colors[E.wordleFeedback(guess, s.secret)[i]] }}>{hide ? '' : ch}</span>)}</div>
  const blanks = (n) => Array.from({ length: 6 - n }, (_, i) => <div key={'b' + i} className="wrow">{[0, 1, 2, 3, 4].map((j) => <span key={j} />)}</div>)
  return <div className="panel center-t"><b>Tu tablero</b>{s.guesses[me].map((x, i) => row(x, false, i))}{blanks(s.guesses[me].length)}
    {s.done[me] ? <p className="hint">{s.done[me] === 'win' ? '¡Lo lograste!' : `Se acabaron tus intentos. La palabra era ${s.secret}`}</p> : <><input value={w} maxLength={5} onChange={(e) => setW(e.target.value.toUpperCase())} placeholder="5 letras" aria-label="Tu intento" /><button className="btn" disabled={w.length !== 5} onClick={() => { act({ w }); setW('') }}>Probar</button></>}
    <b>{name(o)}</b><small className="muted">{s.guesses[o].length}/6 intentos</small>{s.guesses[o].map((x, i) => row(x, true, i))}</div>
}
const Stop = ({ s, can, act, me, g, name }) => {
  const [a, setA] = useState(['', '', '', '', '']); const letter = s.letters[Math.min(s.round, 3) - 1]; useEffect(() => setA(['', '', '', '', '']), [s.round])
  return <div className="panel"><div className="center-t"><small className="muted">Ronda {Math.min(s.round, 3)}/3</small><div className="bigletter">{letter}</div></div>
    {!s.subs[me] ? <>{E.STOP_CATS.map((c, i) => <label key={c}>{c}<input value={a[i]} maxLength={24} onChange={(e) => setA(a.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`${c} con ${letter}`} /></label>)}<button className="btn" onClick={() => act({ a })}>✋ ¡Basta! Enviar</button></> : <p className="hint">Enviado ✓ Esperando a {name(E.other(g.players, me))}…</p>}
    {s.hist.map((h, i) => <div key={i} className="stophist"><b>Ronda {i + 1} · {h.letter}</b>{g.players.map((p) => <p key={p}><b>{name(p)}</b> ({h.pts[p]} pts): {h.subs[p].map((x) => x || '—').join(' · ')}</p>)}</div>)}</div>
}
const UIS = { ttt: TTT, c4: C4, gomoku: Gomoku, reversi: Reversi, hex: Hex, dots: Dots, sos: SOS, checkers: Checkers, isola: Isola, fox: Fox, battleship: Battleship, memory: Memory, flag: Flag, race: Race, treasure: Treasure, maze: Maze, hangman: Hangman, mastermind: Mastermind, wordle: Wordle, stop: Stop }

function Match({ g, onClose }) {
  useBackLayer(onClose)
  const { couple, user, members } = useContext(Ctx); const me = user.uid; const e = E.ENGINES[g.type]; const UI = UIS[g.type]
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false)
  const name = (u) => (u === me ? 'Tú' : members[u]?.username || 'Pareja'); const k = g.players.indexOf(me)
  const can = g.status === 'playing' && (e.simul ? g.turn === null || g.turn === me : g.turn === me) && !busy
  const act = async (mv) => {
    setErr(''); setBusy(true)
    try { const r = await playGame(couple.id, g.id, (cur) => E.applyMove(cur, mv, me)); if (r.status === 'done') await award(couple.id, me, { xp: 10, coins: 15, key: 'game' }) }
    catch (x) { setErr(x.message || 'No se pudo jugar. Revisa tu conexión.') } finally { setBusy(false) }
  }
  const rematch = async () => { const id = await addGame(couple.id, E.newGame(g.type, [g.players[1], g.players[0]])); onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('ustime-open-game', { detail: id })), 50) }
  const result = g.status === 'done' ? (g.winner === 'draw' ? '🤝 ¡Empate!' : g.winner === me ? '🏆 ¡Ganaste!' : `🎉 Ganó ${name(g.winner)}`) : null
  return (
    <div className="overlay" style={{ alignItems: 'stretch' }}><div className="sheet full match">
      <header className="scene-head"><b>{e.icon} {e.name}</b><button className="link" onClick={onClose}>Volver</button></header>
      <div className="players">{g.players.map((p, i) => <span key={p} className={'pl p' + i + (g.turn === p ? ' turn' : '')}>{!e.simul && <i className={'dotc p' + i} />}{name(p)}{g.scores?.[p] !== undefined && (g.scores[p] !== 0 || ['dots', 'sos', 'memory', 'flag', 'treasure', 'reversi', 'hangman', 'mastermind', 'stop'].includes(g.type)) ? ` · ${g.scores[p]}` : ''}</span>)}</div>
      {result ? <p className="matchbanner">{result}</p> : <p className="muted small center-t">{e.simul ? 'Juegan al mismo tiempo' : g.turn === me ? '✨ Es tu turno' : `Turno de ${name(g.turn)}…`}</p>}
      <UI g={g} s={g.state} me={me} k={k} can={can} act={act} name={name} />
      {err && <p className="error" role="alert">{err}</p>}
      {g.status === 'done' && <button className="btn" onClick={rematch}>🔁 Revancha (cambian de lado)</button>}
      {del ? <div className="confirm"><b>¿Borrar esta partida?</b><div className="two"><button className="btn ghost small" onClick={() => setDel(false)}>Cancelar</button><button className="btn danger small" onClick={async () => { await removeGame(couple.id, g.id); onClose() }}>Borrar</button></div></div> : <button className="link" onClick={() => setDel(true)}>🗑️ Borrar partida</button>}
    </div></div>
  )
}

export function GamesHub() {
  const { couple, user, partnerUid, members } = useContext(Ctx); const [games, setGames] = useState([]); const [open, setOpen] = useState(null); const [err, setErr] = useState(''); const [cat, setCat] = useState('Todos')
  useEffect(() => onSnapshot(collection(db, COUPLES, couple.id, 'games'), (s) => setGames(s.docs.map((d) => ({ id: d.id, ...d.data() })))), [couple.id])
  useEffect(() => { const f = (ev) => setOpen(ev.detail); window.addEventListener('ustime-open-game', f); return () => window.removeEventListener('ustime-open-game', f) }, [])
  const cats = ['Todos', ...new Set(E.GAME_LIST.map((g) => g.cat))]
  const playing = games.filter((g) => g.status === 'playing').sort((a, b) => b.updatedAt - a.updatedAt), done = games.filter((g) => g.status === 'done').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
  const start = async (type) => { setErr(''); try { setOpen(await addGame(couple.id, E.newGame(type, [user.uid, partnerUid]))) } catch (e) { setErr(e.message) } }
  const cur = games.find((g) => g.id === open)
  const label = (g) => (g.status === 'done' ? (g.winner === 'draw' ? 'Empate' : g.winner === user.uid ? 'Ganaste 🏆' : 'Perdiste') : E.ENGINES[g.type]?.simul ? 'Juegan a la vez' : g.turn === user.uid ? '¡Te toca!' : `Turno de ${members[g.turn]?.username || 'tu pareja'}`)
  if (!partnerUid) return <div className="panel center-t"><h2>🎮 Juegos</h2><p className="muted">Estos juegos son de a dos. Cuando tu pareja se una a su espacio podrán jugar en línea desde sus teléfonos.</p></div>
  return (
    <>
      <h1>Juegos de a dos</h1><p className="muted small">En línea y en tiempo real. Ganar suma monedas y XP para la mascota.</p>
      {err && <p className="error">{err}</p>}
      {!!playing.length && <><h2>En curso</h2>{playing.map((g) => <button key={g.id} className={'matchrow' + (g.turn === user.uid ? ' mine' : '')} onClick={() => setOpen(g.id)}><span>{E.ENGINES[g.type]?.icon}</span><b>{E.ENGINES[g.type]?.name}</b><small>{label(g)}</small></button>)}</>}
      <h2>Elegir juego</h2><div className="chips scroll">{cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="gamegrid">{E.GAME_LIST.filter((g) => cat === 'Todos' || g.cat === cat).map((g) => <button key={g.id} onClick={() => start(g.id)}><span>{g.icon}</span><b>{g.name}</b><small>{g.desc}</small></button>)}</div>
      {!!done.length && <><h2>Terminadas</h2>{done.map((g) => <button key={g.id} className="matchrow" onClick={() => setOpen(g.id)}><span>{E.ENGINES[g.type]?.icon}</span><b>{E.ENGINES[g.type]?.name}</b><small>{label(g)}</small></button>)}</>}
      {cur && <Match g={cur} onClose={() => setOpen(null)} />}
    </>
  )
}
