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

/* Cepillado manual (versión tierna): una carita sonriente con manchitas de dulce que se limpian al frotar. */
const MOUTH = { cx: 150, cy: 198, rx: 72, ry: 36 }
const TEETH = [...Array(6)].map((_, i) => ({ x: 90 + i * 21, y: 168, w: 19, h: 26 })).concat([...Array(5)].map((_, i) => ({ x: 100 + i * 20, y: 204, w: 18, h: 16 })))
const HEAD = { cx: 150, cy: 165, r: 112 }

function Ears({ sp }) {
  const body = sp.body, inn = sp.earIn, S = [-1, 1]
  switch (sp.ear) {
    case 'round': return <>{S.map((s) => <g key={s}><circle cx={150 + s * 70} cy={82} r="32" fill={sp.patch ? inn : body} /><circle cx={150 + s * 70} cy={82} r="18" fill={sp.patch ? '#555' : inn} /></g>)}</>
    case 'point': case 'tuft': return <>{S.map((s) => <g key={s}><path d={`M${150 + s * 88} 100 L${150 + s * 92} 14 L${150 + s * 30} 64 Z`} fill={body} /><path d={`M${150 + s * 82} 92 L${150 + s * 88} 34 L${150 + s * 46} 66 Z`} fill={inn} /></g>)}</>
    case 'floppy': return <>{S.map((s) => <ellipse key={s} cx={150 + s * 108} cy={150} rx="24" ry="56" fill={sp.spot || inn} transform={`rotate(${s * 12} ${150 + s * 108} 150)`} />)}</>
    case 'long': return <>{S.map((s) => <g key={s} transform={`rotate(${s * 8} ${150 + s * 40} 80)`}><ellipse cx={150 + s * 40} cy="46" rx="20" ry="46" fill={body} stroke="#e6dfd8" strokeWidth="2" /><ellipse cx={150 + s * 40} cy="48" rx="10" ry="34" fill={inn} /></g>)}</>
    case 'tiny': return <>{S.map((s) => <circle key={s} cx={150 + s * 78} cy="88" r="13" fill={inn} />)}</>
    case 'gills': return <>{S.map((s) => [-1, 0, 1].map((o) => <g key={s + '' + o}><path d={`M${150 + s * 100} ${150 + o * 22} q${s * 24} ${o * 8 - 6} ${s * 40} ${o * 20 - 28}`} stroke={inn} strokeWidth="8" strokeLinecap="round" fill="none" /><circle cx={150 + s * 140} cy={122 + o * 20} r="7" fill={inn} /></g>))}</>
    case 'horns': return <>{S.map((s) => <path key={s} d={`M${150 + s * 40} 62 L${150 + s * 54} 6 L${150 + s * 74} 70 Z`} fill={inn} />)}</>
    case 'crest': return <path d="M150 58 q-26 -10 -18 -44 q22 18 18 44 q26 -14 22 -46 q22 22 -4 46 Z" fill={sp.wings} />
    default: return null
  }
}

export function BrushScene({ pet, onDone, onCancel }) {
  useBackLayer(onCancel)
  const [dirt, setDirt] = useState(() => TEETH.map((_, i) => 0.75 + ((i * 37) % 25) / 100))
  const [foam, setFoam] = useState([])
  const [tool, setTool] = useState(null)
  const [drag, setDrag] = useState(false)
  const svg = useRef(null); const k = useRef(0); const last = useRef(null)
  const done = dirt.every((d) => d <= 0.02)
  const sp = speciesColors(pet.type), eye = '#2a1f33'
  const toSvg = (e) => { const p = svg.current.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.current.getScreenCTM().inverse()) }
  const scrub = (e) => {
    const p = toSvg(e); setTool(p)
    const moved = last.current ? Math.hypot(p.x - last.current.x, p.y - last.current.y) : 0; last.current = p
    if (moved < 1.5) return
    setDirt((d) => d.map((v, i) => { const t = TEETH[i]; return p.x > t.x - 10 && p.x < t.x + t.w + 10 && p.y > t.y - 10 && p.y < t.y + t.h + 10 ? Math.max(0, v - Math.min(0.2, moved / 120)) : v }))
    const id = ++k.current; setFoam((f) => [...f.slice(-10), { id, x: p.x + (Math.random() - 0.5) * 18, y: p.y + (Math.random() - 0.5) * 12, r: 5 + Math.random() * 5 }]); setTimeout(() => setFoam((f) => f.filter((b) => b.id !== id)), 900)
  }
  useEffect(() => { if (done) { const t = setTimeout(onDone, 1300); return () => clearTimeout(t) } }, [done])
  const progress = 1 - dirt.reduce((a, v) => a + v, 0) / dirt.length / 0.87
  const happy = drag || done
  const eyeAt = (x) => happy ? <path d={`M${x - 14} 138 q14 -17 28 0`} stroke={eye} strokeWidth="5" strokeLinecap="round" fill="none" /> : <g className="blink-eye"><ellipse cx={x} cy="136" rx="12" ry="14" fill={eye} /><circle cx={x - 4} cy="130" r="4.5" fill="#fff" /><circle cx={x + 4} cy="141" r="2.2" fill="#fff" opacity=".85" /></g>
  return (
    <div className="overlay" style={{ alignItems: 'stretch' }}>
      <div className="sheet full scene">
        <header className="scene-head"><b>{done ? '💖 ¡Dientes brillantes!' : `🪥 Cepilla a ${pet.name}`}</b><button className="link" onClick={onCancel}>Salir</button></header>
        <div className="bar xp"><i style={{ width: Math.max(0, Math.min(1, progress)) * 100 + '%' }} /></div>
        <svg ref={svg} viewBox="0 0 300 300" className="brushsvg" role="application" aria-label="Arrastra el cepillo sobre los dientes para quitar las manchitas de dulce"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); last.current = null; scrub(e) }} onPointerMove={(e) => drag && scrub(e)} onPointerUp={() => { setDrag(false); setTool(null) }} onPointerCancel={() => { setDrag(false); setTool(null) }}>
          <defs><linearGradient id="bgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe3ef" /><stop offset="1" stopColor="#d9f0ff" /></linearGradient><clipPath id="mouthclip"><ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx} ry={MOUTH.ry} /></clipPath></defs>
          <rect width="300" height="300" rx="24" fill="url(#bgb)" />
          {[[30, 40, 9], [265, 60, 7], [40, 250, 6], [262, 245, 10], [276, 150, 5]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity=".7" />)}
          <Ears sp={sp} />
          {sp.mane && S2.map((s) => <circle key={s} cx={150 + s * 102} cy={140} r="30" fill={sp.mane} />)}
          <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={sp.body} stroke="rgba(0,0,0,.12)" strokeWidth="3" />
          {sp.horn && <path d="M138 58 L150 4 L162 58 Z" fill="#ffe29a" stroke="#e0932b" strokeWidth="2" />}
          {sp.patch && S2.map((s) => <ellipse key={s} cx={150 + s * 42} cy="138" rx="22" ry="27" fill={sp.patch} transform={`rotate(${s * 22} ${150 + s * 42} 138)`} />)}
          {S2.map((s) => <g key={s}>{eyeAt(150 + s * 42)}</g>)}
          {S2.map((s) => <ellipse key={'c' + s} cx={150 + s * 70} cy="172" rx="16" ry="10" fill="#ff8fb0" opacity={happy ? 0.8 : 0.5} />)}
          {sp.beak ? <path d="M141 154 Q150 174 159 154 Z" fill={sp.beak} /> : <ellipse cx="150" cy="158" rx="8" ry="5.5" fill={sp.nose} />}
          {sp.whisk && S2.map((s) => [0, 8].map((o) => <path key={s + '' + o} d={`M${150 + s * 78} ${166 + o} l${s * 32} ${o * 0.6 - 6}`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".9" />))}
          <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx} ry={MOUTH.ry} fill="#ff9db0" stroke={eye} strokeWidth="4" />
          <g clipPath="url(#mouthclip)">
            {TEETH.map((t, i) => <g key={i}><rect x={t.x} y={t.y} width={t.w} height={t.h} rx="7" fill="#fff" stroke="#e7e1f0" strokeWidth="1.5" />
              {dirt[i] > 0.02 && <g opacity={Math.min(1, dirt[i] + 0.1)}><ellipse cx={t.x + t.w / 2} cy={t.y + t.h * 0.5} rx={t.w * 0.3 * (0.5 + dirt[i] / 2)} ry={t.h * 0.22 * (0.5 + dirt[i] / 2)} fill="#f0a995" /><circle cx={t.x + t.w * 0.7} cy={t.y + t.h * 0.28} r="2.2" fill="#e58f7a" /></g>}</g>)}
            <ellipse cx="150" cy="228" rx="34" ry="13" fill="#ff7b95" />
          </g>
          {TEETH.map((t, i) => dirt[i] <= 0.02 && <text key={'s' + i} x={t.x + t.w / 2} y={t.y + 5} fontSize="13" textAnchor="middle" fill="#ffc857" className="sparkle">✦</text>)}
          {done && [110, 150, 190].map((x, i) => <text key={x} x={x} y="60" fontSize="22" textAnchor="middle" className="heartfx" style={{ animationDelay: i * 0.25 + 's' }}>💖</text>)}
          {foam.map((b) => <circle key={b.id} cx={b.x} cy={b.y} r={b.r} fill="#fff" fillOpacity=".92" stroke="#bfe9ff" strokeWidth="2" className="foamdot" />)}
          {tool && <text x={tool.x} y={tool.y} fontSize="46" textAnchor="middle" transform={`rotate(-30 ${tool.x} ${tool.y})`} className="brushtool">🪥</text>}
        </svg>
        <p className="muted small center-t">{done ? '¡Qué sonrisa más linda! ✨' : 'Frota los dulces con el cepillo 🍬 Arrastra el dedo sobre los dientes.'}</p>
      </div>
    </div>
  )
}
const S2 = [-1, 1]
