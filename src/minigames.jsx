import React, { useEffect, useRef, useState } from 'react'

const rnd = (a, b) => a + Math.random() * (b - a)
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }

// Atrapa corazones: toca ❤️ (+1) y ⭐ (+2); evita 🕷️ (−2). 20 segundos.
export function CatchGame({ onFinish, onCancel }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(20)
  const [hit, setHit] = useState(null)
  const id = useRef(0); const done = useRef(false)
  useEffect(() => {
    const spawn = setInterval(() => {
      const r = Math.random(); const t = r < 0.6 ? { e: '❤️', p: 1 } : r < 0.85 ? { e: '⭐', p: 2 } : { e: '🕷️', p: -2 }
      const it = { id: ++id.current, x: rnd(6, 84), dur: rnd(2.4, 3.8), ...t }
      setItems((l) => [...l, it]); setTimeout(() => setItems((l) => l.filter((x) => x.id !== it.id)), it.dur * 1000)
    }, 520)
    const tick = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => { clearInterval(spawn); clearInterval(tick) }
  }, [])
  useEffect(() => { if (left <= 0 && !done.current) { done.current = true; onFinish(Math.max(0, score)) } }, [left])
  const tap = (it) => { setItems((l) => l.filter((x) => x.id !== it.id)); setScore((s) => s + it.p); setHit({ k: it.id, p: it.p, x: it.x }) }
  return (
    <div className="mini-game">
      <header><b>⏱️ {Math.max(left, 0)} s</b><b>Puntos: {score}</b><button className="link" onClick={onCancel}>Salir</button></header>
      <div className="catch-field" role="application" aria-label="Atrapa los corazones tocándolos">
        {items.map((it) => <button key={it.id} className="catch-item" style={{ left: it.x + '%', animationDuration: it.dur + 's' }} onPointerDown={() => tap(it)} aria-label={it.p > 0 ? 'Atrapar' : 'Evitar'}>{it.e}</button>)}
        {hit && <span key={hit.k} className={'pop ' + (hit.p > 0 ? 'up' : 'down')} style={{ left: hit.x + '%' }}>{hit.p > 0 ? '+' : ''}{hit.p}</span>}
      </div>
    </div>
  )
}

// Memoria de pareja: 6 pares; menos movimientos = más monedas.
const FACES = ['💕', '🍿', '🎬', '🌙', '🍕', '🎟️']
export function MemoryGame({ onFinish, onCancel }) {
  const [cards] = useState(() => shuffle([...FACES, ...FACES].map((e, i) => ({ i, e }))))
  const [open, setOpen] = useState([]); const [found, setFound] = useState([]); const [moves, setMoves] = useState(0)
  const lock = useRef(false)
  const flip = (c) => {
    if (lock.current || open.includes(c.i) || found.includes(c.i)) return
    const o = [...open, c.i]; setOpen(o)
    if (o.length === 2) {
      setMoves((m) => m + 1); lock.current = true
      const [a, b] = o.map((i) => cards.find((x) => x.i === i))
      setTimeout(() => {
        if (a.e === b.e) { const f = [...found, a.i, b.i]; setFound(f); if (f.length === cards.length) onFinish(moves + 1) }
        setOpen([]); lock.current = false
      }, 650)
    }
  }
  return (
    <div className="mini-game">
      <header><b>Movimientos: {moves}</b><b>Pares: {found.length / 2}/6</b><button className="link" onClick={onCancel}>Salir</button></header>
      <div className="memory">{cards.map((c) => { const up = open.includes(c.i) || found.includes(c.i); return <button key={c.i} className={'mcard' + (up ? ' up' : '') + (found.includes(c.i) ? ' ok' : '')} onClick={() => flip(c)} aria-label={up ? c.e : 'Carta oculta'}><span>{up ? c.e : '❔'}</span></button> })}</div>
    </div>
  )
}
