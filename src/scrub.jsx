import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PetArt, Room, speciesColors } from './petart.jsx'
import * as G from './gamecore.js'
import { useBackLayer } from './nav.js'

const COLS = 6, ROWS = 7

/* Baño manual: frota con el jabón hasta cubrirla de espuma y luego enjuaga con la ducha. */
export function BathScene({ pet, soap, onDone, onCancel }) {
  useBackLayer(onCancel)
  const mask = useMemo(() => Array.from({ length: COLS * ROWS }, (_, i) => { const x = ((i % COLS) + 0.5) / COLS - 0.5, y = (Math.floor(i / COLS) + 0.5) / ROWS - 0.55; return (x / 0.44) ** 2 + (y / 0.46) ** 2 <= 1 }), [])
  const targets = useMemo(() => mask.map((m, i) => (m ? i : -1)).filter((i) => i >= 0), [mask])
  const [foam, setFoam] = useState(() => Array(COLS * ROWS).fill(0))
  const [phase, setPhase] = useState('soap')
  const [tool, setTool] = useState(null)
  const [drag, setDrag] = useState(false)
  const box = useRef(null)
  const sign = phase === 'soap' ? 1 : -1
  const hit = (e) => {
    const r = box.current.getBoundingClientRect()
    const px = e.clientX - r.left, py = e.clientY - r.top
    setTool({ x: px, y: py })
    const c = Math.floor((px / r.width) * COLS), rw = Math.floor((py / r.height) * ROWS)
    if (c < 0 || c >= COLS || rw < 0 || rw >= ROWS) return
    setFoam((f) => {
      const n = [...f]
      for (const [dc, dr, k] of [[0, 0, 1], [1, 0, 0.5], [-1, 0, 0.5], [0, 1, 0.5], [0, -1, 0.5]]) {
        const cc = c + dc, rr = rw + dr
        if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue
        const i = rr * COLS + cc; n[i] = Math.max(0, Math.min(1, n[i] + sign * 0.5 * k))
      }
      return n
    })
  }
  useEffect(() => {
    if (phase === 'soap' && targets.every((i) => foam[i] >= 0.95)) setPhase('rinse')
    if (phase === 'rinse' && targets.every((i) => foam[i] <= 0.05)) setPhase('done')
  }, [foam, phase])
  // Efecto aparte: si compartiera el de arriba, el cambio de fase cancelaría su propio temporizador.
  useEffect(() => { if (phase === 'done') { const t = setTimeout(onDone, 1100); return () => clearTimeout(t) } }, [phase])
  const avg = targets.reduce((s, i) => s + foam[i], 0) / targets.length
  const progress = phase === 'soap' ? avg : phase === 'rinse' ? 1 - avg : 1
  return (
    <div className="overlay" style={{ alignItems: 'stretch' }}>
      <div className="sheet full scene">
        <header className="scene-head"><b>{phase === 'soap' ? `${soap?.emoji || '💧'} Frota a ${pet.name} con ${soap?.name || 'agua'}` : phase === 'rinse' ? '🚿 ¡Ahora enjuágala!' : '✨ ¡Limpia y feliz!'}</b><button className="link" onClick={onCancel}>Salir</button></header>
        <div className="bar xp"><i style={{ width: progress * 100 + '%' }} /></div>
        <Room kind="bano">
          <div ref={box} className="scrubbox" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); hit(e) }} onPointerMove={(e) => drag && hit(e)} onPointerUp={() => { setDrag(false); setTool(null) }} onPointerCancel={() => { setDrag(false); setTool(null) }}>
            <PetArt type={pet.type} stage={pet.stage} mood="happy" expr={phase === 'done' ? 'joy' : 'wash'} anim={drag ? 'wash' : 'idle'} equip={G.equipOf(pet)} size={200} />
            {foam.map((v, i) => v > 0.02 && mask[i] && <i key={i} className="foam" style={{ left: (i % COLS) * (100 / COLS) + '%', top: Math.floor(i / COLS) * (100 / ROWS) + '%', width: 100 / COLS + '%', height: 100 / ROWS + '%', opacity: Math.min(1, v + 0.1), transform: `scale(${0.6 + v * 0.6})` }} />)}
            {tool && <span className={'tool ' + phase} style={{ left: tool.x, top: tool.y }}>{phase === 'soap' ? soap?.emoji || '🧽' : '🚿'}{phase === 'rinse' && <em className="drops">💧💧💧</em>}</span>}
          </div>
        </Room>
        <p className="muted small center-t">Arrastra el dedo sobre {pet.name}. {phase === 'soap' ? 'Cúbrela toda de espuma.' : phase === 'rinse' ? 'Quita toda la espuma.' : ''}</p>
      </div>
    </div>
  )
}

/* Cepillado manual: restriega los dientes con el cepillo hasta que no quede suciedad. */
const TEETH = [...Array(6)].map((_, i) => ({ x: 66 + i * 28, y: 108, w: 25, h: 32 })).concat([...Array(6)].map((_, i) => ({ x: 66 + i * 28, y: 150, w: 25, h: 30 })))
export function BrushScene({ pet, onDone, onCancel }) {
  useBackLayer(onCancel)
  const [dirt, setDirt] = useState(() => TEETH.map((_, i) => 0.7 + ((i * 37) % 30) / 100))
  const [foam, setFoam] = useState([])
  const [tool, setTool] = useState(null)
  const [drag, setDrag] = useState(false)
  const svg = useRef(null); const k = useRef(0); const last = useRef(null)
  const done = dirt.every((d) => d <= 0.02)
  const color = speciesColors(pet.type).body
  const toSvg = (e) => { const p = svg.current.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.current.getScreenCTM().inverse()) }
  const scrub = (e) => {
    const p = toSvg(e); setTool(p)
    const moved = last.current ? Math.hypot(p.x - last.current.x, p.y - last.current.y) : 0; last.current = p
    if (moved < 1.5) return
    setDirt((d) => d.map((v, i) => { const t = TEETH[i]; return p.x > t.x - 8 && p.x < t.x + t.w + 8 && p.y > t.y - 8 && p.y < t.y + t.h + 8 ? Math.max(0, v - Math.min(0.2, moved / 120)) : v }))
    const id = ++k.current; setFoam((f) => [...f.slice(-12), { id, x: p.x + (Math.random() - 0.5) * 16, y: p.y + (Math.random() - 0.5) * 12 }]); setTimeout(() => setFoam((f) => f.filter((b) => b.id !== id)), 800)
  }
  useEffect(() => { if (done) { const t = setTimeout(onDone, 1100); return () => clearTimeout(t) } }, [done])
  const progress = 1 - dirt.reduce((s, v) => s + v, 0) / dirt.length / 0.85
  return (
    <div className="overlay" style={{ alignItems: 'stretch' }}>
      <div className="sheet full scene">
        <header className="scene-head"><b>{done ? '✨ ¡Dientes brillantes!' : `🪥 Cepilla los dientes de ${pet.name}`}</b><button className="link" onClick={onCancel}>Salir</button></header>
        <div className="bar xp"><i style={{ width: Math.max(0, Math.min(1, progress)) * 100 + '%' }} /></div>
        <svg ref={svg} viewBox="0 0 300 280" className="brushsvg" role="application" aria-label="Arrastra el cepillo sobre los dientes"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); last.current = null; scrub(e) }} onPointerMove={(e) => drag && scrub(e)} onPointerUp={() => { setDrag(false); setTool(null) }} onPointerCancel={() => { setDrag(false); setTool(null) }}>
          <rect width="300" height="280" rx="24" fill="#cfeaf7" />
          <circle cx="150" cy="150" r="128" fill={color} />
          <path d="M96 62 q10 -12 22 0 M182 62 q10 -12 22 0" stroke="#2a1f33" strokeWidth="5" strokeLinecap="round" fill="none" />
          <ellipse cx="76" cy="92" rx="16" ry="10" fill="#ff8fb0" opacity=".5" /><ellipse cx="224" cy="92" rx="16" ry="10" fill="#ff8fb0" opacity=".5" />
          <ellipse cx="150" cy="150" rx="104" ry="52" fill="#7a2a3a" />
          <ellipse cx="150" cy="178" rx="52" ry="14" fill="#e0707f" />
          {TEETH.map((t, i) => <g key={i}><rect x={t.x} y={t.y} width={t.w} height={t.h} rx="7" fill="#fff" /><rect x={t.x} y={t.y} width={t.w} height={t.h} rx="7" fill="#c9a227" opacity={dirt[i] * 0.85} />{dirt[i] > 0.3 && <circle cx={t.x + 7} cy={t.y + 10} r="3" fill="#7b5a12" opacity={dirt[i]} />}{dirt[i] <= 0.02 && <text x={t.x + t.w / 2} y={t.y + 8} fontSize="12" textAnchor="middle" className="sparkle">✨</text>}</g>)}
          {foam.map((b) => <circle key={b.id} cx={b.x} cy={b.y} r="7" fill="#fff" stroke="#bfe9ff" strokeWidth="2" className="foamdot" />)}
          {tool && <text x={tool.x} y={tool.y} fontSize="46" textAnchor="middle" transform={`rotate(-30 ${tool.x} ${tool.y})`} className="brushtool">🪥</text>}
        </svg>
        <p className="muted small center-t">Arrastra el cepillo de un lado a otro sobre los dientes sucios.</p>
      </div>
    </div>
  )
}
