import React from 'react'
import { item } from './gamecore.js'

/* Mascotas originales dibujadas con SVG. Cada etapa tiene proporciones, ojos, extremidades y rasgos propios:
   bebé = cabeza enorme, cuerpo diminuto, ojos grandes; niño = proporciones equilibradas; adulto = cuerpo alto, ojos serenos, cejas y rasgos maduros. */
const SP = {
  osito: { body: '#b9794a', belly: '#f1d3a8', ear: 'round', earIn: '#8a5632', nose: '#3b2418', tail: 'nub' },
  perrito: { body: '#d9a066', belly: '#f6e3c4', ear: 'floppy', earIn: '#8d5a2b', nose: '#2b1d18', tail: 'wag', spot: '#8d5a2b' },
  gato: { body: '#9aa3b5', belly: '#e6eaf2', ear: 'point', earIn: '#f5a6b8', nose: '#f08aa0', tail: 'long', stripes: '#6f788b', whisk: 1 },
  conejo: { body: '#f2ece6', belly: '#ffffff', ear: 'long', earIn: '#f7b6c6', nose: '#f08aa0', tail: 'puff' },
  capibara: { body: '#a9774a', belly: '#c99a6a', ear: 'tiny', earIn: '#7a5230', nose: '#3b2418', tail: 'none', wide: 1 },
  axolote: { body: '#ffb3c9', belly: '#ffd9e5', ear: 'gills', earIn: '#ff7aa3', nose: '#d94f7e', tail: 'fin' },
  zorro: { body: '#f08a3c', belly: '#fff1de', ear: 'point', earIn: '#3b2418', nose: '#2b1d18', tail: 'bush', socks: '#3b2418', fluff: 1 },
  panda: { body: '#f7f7f7', belly: '#ffffff', ear: 'round', earIn: '#2b2b2b', nose: '#2b2b2b', tail: 'nub', patch: '#2b2b2b', limbs: '#2b2b2b' },
  unicornio: { body: '#f7f0ff', belly: '#ffffff', ear: 'point', earIn: '#ffc4e1', nose: '#f08aa0', tail: 'mane', mane: '#c58bff', horn: 1 },
  dragon: { body: '#5bc77c', belly: '#d9f5b5', ear: 'horns', earIn: '#f3e2bf', nose: '#2f8f52', tail: 'spike', wings: '#3aa65f', spikes: '#2f8f52' },
  fenix: { body: '#ff7a3d', belly: '#ffd166', ear: 'crest', earIn: '#ffd166', nose: '#ffb703', tail: 'plume', wings: '#ff4f3d', beak: '#ffb703' },
  grifo: { body: '#c99a5b', belly: '#f3e2bf', ear: 'tuft', earIn: '#8a5a25', nose: '#f2b705', tail: 'tuft', wings: '#e8d4a6', beak: '#f2b705' },
}
const ST = {
  bebe: { H: { cx: 100, cy: 112, r: 64 }, B: { cx: 100, cy: 178, rx: 38, ry: 32 }, A: { y: 170, len: 14, w: 12 }, L: { y: 202, len: 8, w: 16, gap: 19 }, E: { dx: 25, r: 11 }, wing: 0.45 },
  nino: { H: { cx: 100, cy: 94, r: 50 }, B: { cx: 100, cy: 161, rx: 43, ry: 47 }, A: { y: 140, len: 30, w: 11 }, L: { y: 196, len: 18, w: 15, gap: 22 }, E: { dx: 19, r: 8 }, wing: 0.8 },
  adulto: { H: { cx: 100, cy: 78, r: 40 }, B: { cx: 100, cy: 150, rx: 46, ry: 64 }, A: { y: 120, len: 44, w: 11 }, L: { y: 204, len: 26, w: 15, gap: 23 }, E: { dx: 16, r: 6 }, wing: 1.15 },
}

export const speciesColors = (t) => SP[t] || SP.osito

function Tail({ s, B, k, L: lg }) {
  const x = B.cx + B.rx * 0.78, y = B.cy + B.ry * 0.3
  const T = { nub: <circle r={7 * k} fill={s.body} />, puff: <circle r={13 * k} fill="#fff" stroke="#e6dfd8" strokeWidth="1.5" />, none: null,
    wag: <path d={`M0 0 Q${22 * k} ${-6 * k} ${20 * k} ${-26 * k}`} stroke={s.body} strokeWidth={9 * k} strokeLinecap="round" fill="none" />,
    long: <><path d={`M0 0 Q${34 * k} ${8 * k} ${28 * k} ${-34 * k}`} stroke={s.body} strokeWidth={9 * k} strokeLinecap="round" fill="none" /><path d={`M${30 * k} ${-18 * k} l${-4} 0 M${31 * k} ${-26 * k} l${-5} 0`} stroke={s.stripes} strokeWidth="3" /></>,
    bush: <g transform="rotate(-25)"><ellipse cx={22 * k} cy={-4 * k} rx={24 * k} ry={13 * k} fill={s.body} /><ellipse cx={38 * k} cy={-4 * k} rx={10 * k} ry={9 * k} fill="#fff" /></g>,
    fin: <ellipse cx={18 * k} cy={4 * k} rx={22 * k} ry={9 * k} fill={s.earIn} opacity=".85" />,
    mane: <path d={`M0 0 q${30 * k} ${-4 * k} ${22 * k} ${-34 * k} q${-2 * k} ${22 * k} ${-14 * k} ${24 * k}z`} fill={s.mane} />,
    spike: <><path d={`M0 0 Q${28 * k} ${6 * k} ${34 * k} ${-14 * k}`} stroke={s.body} strokeWidth={10 * k} strokeLinecap="round" fill="none" /><path d={`M${28 * k} ${-6 * k} l${8 * k} ${-10 * k} l${4 * k} ${10 * k}z`} fill={s.spikes} /></>,
    plume: <>{[-34, -10, 14].map((a) => <path key={a} d={`M0 0 q${16 * k} ${-8 * k} ${26 * k} ${-16 * k + a / 4} q${-8 * k} ${14 * k} ${-26 * k} ${16 * k}z`} transform={`rotate(${a / 2})`} fill={a === -10 ? s.belly : s.wings} />)}</>,
    tuft: <><path d={`M0 0 Q${26 * k} ${6 * k} ${26 * k} ${-18 * k}`} stroke={s.body} strokeWidth={8 * k} strokeLinecap="round" fill="none" /><path d={`M${26 * k} ${-18 * k} l${-8 * k} ${-8 * k} l${14 * k} ${-2 * k}z`} fill={s.earIn} /></> }
  return <g transform={`translate(${x} ${y})`} className="pa-tail" style={{ transformOrigin: `${x}px ${y}px` }}>{T[s.tail]}</g>
}

function Ears({ s, H }) {
  const { cx, cy, r } = H
  const mk = (sg) => {
    const x = cx + sg * r * 0.62, y = cy - r * 0.72
    switch (s.ear) {
      case 'round': return <g key={sg}><circle cx={x} cy={y} r={r * 0.27} fill={s.patch ? s.earIn : s.body} /><circle cx={x} cy={y} r={r * 0.15} fill={s.earIn} /></g>
      case 'tiny': return <circle key={sg} cx={cx + sg * r * 0.7} cy={cy - r * 0.78} r={r * 0.14} fill={s.earIn} />
      case 'point': return <g key={sg}><path d={`M${cx + sg * r * 0.25} ${cy - r * 0.8} L${cx + sg * r * 0.78} ${cy - r * 1.28} L${cx + sg * r * 0.92} ${cy - r * 0.4}z`} fill={s.body} /><path d={`M${cx + sg * r * 0.45} ${cy - r * 0.78} L${cx + sg * r * 0.76} ${cy - r * 1.06} L${cx + sg * r * 0.82} ${cy - r * 0.5}z`} fill={s.earIn} /></g>
      case 'floppy': return <ellipse key={sg} cx={cx + sg * r * 0.92} cy={cy - r * 0.05} rx={r * 0.24} ry={r * 0.46} fill={s.spot} transform={`rotate(${sg * 14} ${cx + sg * r * 0.92} ${cy - r * 0.4})`} />
      case 'long': return <g key={sg} transform={`rotate(${sg * 9} ${cx + sg * r * 0.4} ${cy - r * 0.6})`}><ellipse cx={cx + sg * r * 0.4} cy={cy - r * 1.15} rx={r * 0.2} ry={r * 0.66} fill={s.body} stroke="#e6dfd8" strokeWidth="1" /><ellipse cx={cx + sg * r * 0.4} cy={cy - r * 1.12} rx={r * 0.1} ry={r * 0.5} fill={s.earIn} /></g>
      case 'gills': return <g key={sg}>{[-0.5, 0, 0.5].map((o) => <g key={o}><path d={`M${cx + sg * r * 0.88} ${cy + o * r * 0.5 - r * 0.2} q${sg * r * 0.4} ${o * r * 0.3 - r * 0.15} ${sg * r * 0.5} ${o * r * 0.5 - r * 0.38}`} stroke={s.earIn} strokeWidth={r * 0.1} strokeLinecap="round" fill="none" /><circle cx={cx + sg * r * 1.38} cy={cy + o * r * 0.5 - r * 0.58} r={r * 0.09} fill={s.earIn} /></g>)}</g>
      case 'horns': return <path key={sg} d={`M${cx + sg * r * 0.38} ${cy - r * 0.85} L${cx + sg * r * 0.52} ${cy - r * 1.4} L${cx + sg * r * 0.72} ${cy - r * 0.78}z`} fill={s.earIn} />
      case 'crest': return <path key={sg} d={`M${cx + sg * r * 0.12} ${cy - r * 0.95} q${sg * r * 0.5} ${-r * 0.5} ${sg * r * 0.38} ${-r * 0.78} q${-r * 0.5} ${r * 0.15} ${-sg * r * 0.38} ${r * 0.78}z`} fill={sg > 0 ? s.wings : s.earIn} />
      case 'tuft': return <path key={sg} d={`M${cx + sg * r * 0.3} ${cy - r * 0.9} L${cx + sg * r * 0.82} ${cy - r * 1.35} L${cx + sg * r * 0.8} ${cy - r * 0.6}z`} fill={s.earIn} />
      default: return null
    }
  }
  return <>{[-1, 1].map(mk)}{s.horn && <g><path d={`M${cx - r * 0.12} ${cy - r * 0.92} L${cx} ${cy - r * 1.75} L${cx + r * 0.12} ${cy - r * 0.92}z`} fill="#ffe29a" stroke="#e0932b" strokeWidth="1.5" /><path d={`M${cx - r * 0.09} ${cy - r * 1.2} h${r * 0.18} M${cx - r * 0.06} ${cy - r * 1.45} h${r * 0.12}`} stroke="#e0932b" strokeWidth="1.5" /></g>}</>
}

function Wings({ s, B, k }) {
  if (!s.wings) return null
  const w = (sg) => <g key={sg} className={'pa-wing ' + (sg < 0 ? 'l' : 'r')} style={{ transformOrigin: `${B.cx + sg * B.rx * 0.7}px ${B.cy - B.ry * 0.4}px` }}>
    <path d={`M${B.cx + sg * B.rx * 0.7} ${B.cy - B.ry * 0.3} q${sg * 62 * k} ${-46 * k} ${sg * 54 * k} ${-6 * k} q${sg * -6 * k} ${34 * k} ${sg * -54 * k} ${40 * k}z`} fill={s.wings} stroke="rgba(0,0,0,.12)" strokeWidth="1.5" /></g>
  return <>{[-1, 1].map(w)}</>
}

function Eyes({ g, H, expr, s, stage }) {
  const y = H.cy + H.r * 0.08, { dx, r } = g.E, c = '#2a1f33'
  const one = (sg) => {
    const x = H.cx + sg * dx * (s.wide ? 1.1 : 1)
    if (expr === 'sleep' || expr === 'wash') return <path key={sg} d={`M${x - r} ${y} q${r} ${r * 0.9} ${r * 2} 0`} stroke={c} strokeWidth="3" strokeLinecap="round" fill="none" />
    if (expr === 'joy') return <path key={sg} d={`M${x - r} ${y + 2} q${r} ${-r * 1.2} ${r * 2} 0`} stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    if (expr === 'love') return <path key={sg} transform={`translate(${x} ${y}) scale(${r / 9})`} d="M0 8 C-14 -2 -6 -12 0 -4 C6 -12 14 -2 0 8z" fill="#ff4f8b" className="pulse" />
    return <g key={sg} className="pa-eye"><ellipse cx={x} cy={y} rx={r} ry={r * (expr === 'sad' ? 1.05 : 1.12)} fill={c} /><circle cx={x - r * 0.3} cy={y - r * 0.38} r={r * 0.34} fill="#fff" /><circle cx={x + r * 0.32} cy={y + r * 0.3} r={r * 0.16} fill="#fff" opacity=".8" />
      {expr === 'sad' && <ellipse cx={x + sg * r * 0.4} cy={y + r * 1.9} rx={r * 0.26} ry={r * 0.4} fill="#7fd1ff" className="tear" />}</g>
  }
  return <g className="pa-eyes">{[-1, 1].map(one)}
    {(stage === 'adulto' || expr === 'sad') && ['sad', 'neutral', 'happy'].includes(expr) && [-1, 1].map((sg) => <path key={'b' + sg} d={`M${H.cx + sg * dx - r} ${y - r * 1.55} l${r * 2} ${expr === 'sad' ? sg * 3 : 0}`} stroke={c} strokeWidth="2.6" strokeLinecap="round" />)}</g>
}

function Face({ s, H, g, expr }) {
  const my = H.cy + H.r * 0.4, ny = H.cy + H.r * 0.24
  const mouth = { happy: <path d={`M${H.cx - 8} ${my} q8 9 16 0`} stroke="#2a1f33" strokeWidth="3" strokeLinecap="round" fill="none" />,
    joy: <path d={`M${H.cx - 9} ${my - 2} q9 16 18 0z`} fill="#7a2a3a" />, eat: <ellipse cx={H.cx} cy={my + 3} rx="7" ry="8" fill="#7a2a3a" className="chew" />,
    neutral: <path d={`M${H.cx - 6} ${my + 2} h12`} stroke="#2a1f33" strokeWidth="3" strokeLinecap="round" />, sad: <path d={`M${H.cx - 7} ${my + 6} q7 -8 14 0`} stroke="#2a1f33" strokeWidth="3" strokeLinecap="round" fill="none" />,
    sleep: <ellipse cx={H.cx} cy={my + 3} rx="3.5" ry="2.5" fill="#2a1f33" opacity=".6" />, love: <path d={`M${H.cx - 8} ${my} q8 10 16 0`} stroke="#2a1f33" strokeWidth="3" strokeLinecap="round" fill="none" />, wash: <path d={`M${H.cx - 8} ${my} q8 9 16 0`} stroke="#2a1f33" strokeWidth="3" strokeLinecap="round" fill="none" /> }
  return <g>
    <ellipse cx={H.cx} cy={H.cy + H.r * 0.3} rx={H.r * (s.wide ? 0.5 : 0.4)} ry={H.r * 0.28} fill={s.belly} />
    {s.beak ? <path d={`M${H.cx - 9} ${ny - 4} Q${H.cx} ${ny + 16} ${H.cx + 9} ${ny - 4}z`} fill={s.beak} /> : <ellipse cx={H.cx} cy={ny} rx={s.wide ? 9 : 6} ry="4.5" fill={s.nose} />}
    {mouth[expr] || mouth.happy}
    {[-1, 1].map((sg) => <ellipse key={sg} cx={H.cx + sg * g.E.dx * 1.55} cy={H.cy + H.r * 0.3} rx={g.E.r * 0.7} ry={g.E.r * 0.45} fill="#ff8fb0" opacity={expr === 'love' || expr === 'joy' ? 0.75 : 0.45} />)}
    {s.whisk && [-1, 1].map((sg) => [0, 7].map((o) => <path key={sg + '' + o} d={`M${H.cx + sg * 22} ${ny + o - 3} l${sg * 22} ${o * 0.6 - 4}`} stroke="#fff" strokeWidth="1.8" opacity=".9" />))}
    {s.stripes && [-8, 0, 8].map((o) => <path key={o} d={`M${H.cx + o} ${H.cy - H.r * 0.92} v${H.r * 0.2}`} stroke={s.stripes} strokeWidth="3" strokeLinecap="round" />)}
    {s.fluff && [-1, 1].map((sg) => <path key={sg} d={`M${H.cx + sg * H.r * 0.82} ${H.cy + H.r * 0.2} l${sg * 12} 6 l${-sg * 2} 12 l${-sg * 6} -4z`} fill="#fff" />)}
  </g>
}

function Item({ id, x, y, size, flip }) { const it = item(id); return it ? <text x={x} y={y} fontSize={size} textAnchor="middle" dominantBaseline="central" transform={flip ? `scale(-1 1) translate(${-2 * x} 0)` : undefined}>{it.emoji}</text> : null }

export function PetArt({ type = 'osito', stage = 'nino', mood = 'happy', expr, equip = {}, anim = 'idle', size = 220, className = '' }) {
  const s = SP[type] || SP.osito, g = ST[stage] || ST.nino, { H, B, A, L } = g
  const e = expr || (mood === 'sleep' ? 'sleep' : mood)
  const k = B.rx / 44
  const limb = s.limbs || s.body, foot = s.socks || s.limbs || s.body
  const arm = (sg) => { const x = B.cx + sg * (B.rx - 4); return <g key={sg} className={'pa-arm ' + (sg < 0 ? 'l' : 'r')} style={{ transformOrigin: `${x}px ${A.y}px` }}><path d={`M${x} ${A.y} q${sg * 10} ${A.len * 0.5} ${sg * 6} ${A.len}`} stroke={limb} strokeWidth={A.w} strokeLinecap="round" fill="none" /><circle cx={x + sg * 6} cy={A.y + A.len} r={A.w * 0.62} fill={limb} /></g> }
  const leg = (sg) => <g key={sg}><rect x={B.cx + sg * L.gap - L.w / 2} y={L.y - 6} width={L.w} height={L.len + 8} rx={L.w / 2} fill={s.socks ? foot : s.body} /><ellipse cx={B.cx + sg * L.gap + sg * 2} cy={L.y + L.len + 3} rx={L.w * 0.85} ry={L.w * 0.5} fill={foot} /></g>
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} className={`pet-art st-${stage} an-${anim} ex-${e} ${className}`} role="img" aria-label={`${(PET_LABEL[type] || type)} ${stage === 'bebe' ? 'bebé' : stage === 'nino' ? 'niño' : 'adulto'}`}>
      <ellipse cx="100" cy="233" rx={34 + B.rx * 0.4} ry="6" fill="rgba(0,0,0,.2)" />
      <g className="pa-all">
        <Wings s={s} B={B} k={g.wing} />
        <Tail s={s} B={B} k={k} />
        {leg(-1)}{leg(1)}
        <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} fill={s.body} />
        {s.patch && <ellipse cx={B.cx} cy={B.cy + 6} rx={B.rx * 0.98} ry={B.ry * 0.3} fill={s.patch} opacity=".95" />}
        <ellipse cx={B.cx} cy={B.cy + B.ry * 0.12} rx={B.rx * 0.62} ry={B.ry * 0.68} fill={s.belly} />
        {s.spikes && stage !== 'bebe' && [-0.4, 0, 0.4].map((o) => <path key={o} d={`M${B.cx + o * B.rx} ${B.cy - B.ry * 0.1} l-5 -12 l10 0z`} fill={s.spikes} transform={`translate(0 ${Math.abs(o) * 14})`} />)}
        {equip.body === 'panal' && <g><path d={`M${B.cx - B.rx * 0.8} ${B.cy + B.ry * 0.35} q${B.rx * 0.8} ${B.ry * 0.7} ${B.rx * 1.6} 0 v${B.ry * 0.3} q${-B.rx * 0.8} ${B.ry * 0.3} ${-B.rx * 1.6} 0z`} fill="#fff" stroke="#d6d6e6" strokeWidth="1.5" /><circle cx={B.cx} cy={B.cy + B.ry * 0.62} r="3.5" fill="#ff8fb0" /></g>}
        {equip.body && equip.body !== 'panal' && <Item id={equip.body} x={B.cx} y={B.cy - B.ry * 0.05} size={B.rx * 0.95} />}
        {arm(-1)}{arm(1)}
        {equip.hand && <g className="pa-handitem"><Item id={equip.hand} x={B.cx + B.rx + 8} y={A.y + A.len * 0.85} size={Math.max(26, B.rx * 0.85)} /></g>}
        {equip.neck && <Item id={equip.neck} x={H.cx} y={H.cy + H.r * 0.98} size={Math.max(22, H.r * 0.7)} />}
        <g className="pa-head" style={{ transformOrigin: `${H.cx}px ${H.cy + H.r}px` }}>
          <Ears s={s} H={H} />
          {s.mane && [-1, 1].map((sg) => <circle key={sg} cx={H.cx + sg * H.r * 0.86} cy={H.cy - H.r * 0.2} r={H.r * 0.28} fill={s.mane} />)}
          {s.crest && null}
          <circle cx={H.cx} cy={H.cy} r={H.r} fill={s.body} />
          {s.patch && [-1, 1].map((sg) => <ellipse key={sg} cx={H.cx + sg * g.E.dx} cy={H.cy + H.r * 0.08} rx={g.E.r * 1.5} ry={g.E.r * 1.9} fill={s.patch} transform={`rotate(${sg * 22} ${H.cx + sg * g.E.dx} ${H.cy})`} />)}
          {s.spot && <circle cx={H.cx + H.r * 0.46} cy={H.cy - H.r * 0.2} r={H.r * 0.2} fill={s.spot} opacity=".9" />}
          {stage === 'bebe' && <path d={`M${H.cx} ${H.cy - H.r} q-8 -16 -2 -22 M${H.cx} ${H.cy - H.r} q8 -14 10 -18`} stroke={s.mane || s.body} strokeWidth="4" strokeLinecap="round" fill="none" />}
          <Face s={s} H={H} g={g} expr={e} />
          <Eyes g={g} H={H} expr={e} s={s} stage={stage} />
          {equip.face === 'chupon' ? <g><circle cx={H.cx} cy={H.cy + H.r * 0.44} r="9" fill="#ff8fb0" stroke="#fff" strokeWidth="2.5" /><circle cx={H.cx} cy={H.cy + H.r * 0.44 + 12} r="4" fill="#fff" /></g> : equip.face && <Item id={equip.face} x={H.cx} y={H.cy + H.r * 0.06} size={H.r * 1.05} />}
          {equip.head && <Item id={equip.head} x={H.cx + (equip.head === 'lazo' ? H.r * 0.55 : 0)} y={H.cy - H.r * (equip.head === 'lazo' ? 0.82 : 0.98)} size={H.r * 0.95} />}
        </g>
        {e === 'sleep' && <g className="zzz" fill="#cfd8ff" fontWeight="800"><text x="150" y="60" fontSize="22">Z</text><text x="166" y="40" fontSize="16">z</text></g>}
      </g>
    </svg>
  )
}
export const PET_LABEL = { osito: 'Osito', perrito: 'Perrito', gato: 'Gato', conejo: 'Conejo', capibara: 'Capibara', axolote: 'Axolote', zorro: 'Zorro', panda: 'Panda', unicornio: 'Unicornio', dragon: 'Dragón', fenix: 'Fénix', grifo: 'Grifo' }

export function Egg({ stage = 'idle', rarity = 'comun', cracks = 0, size = 150 }) {
  const col = { comun: ['#dff5e4', '#9ad9b0'], raro: ['#dbe9ff', '#8bb4ff'], legendario: ['#fff0c9', '#ffc857'] }[rarity]
  return <svg viewBox="0 0 120 150" width={size} height={size * 1.25} className={'egg-art ' + stage} role="img" aria-label="Huevo de mascota">
    <ellipse cx="60" cy="144" rx="34" ry="5" fill="rgba(0,0,0,.2)" />
    <g className="egg-body"><path d="M60 8C32 8 14 56 14 92c0 30 20 50 46 50s46-20 46-50C106 56 88 8 60 8z" fill={col[0]} stroke={col[1]} strokeWidth="3" />
      {[[40, 60], [78, 78], [48, 104], [74, 48], [62, 118]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="5" fill={col[1]} opacity=".5" />)}
      {cracks > 0 && <path d="M44 38 l10 14 l-9 8 l12 14" stroke="#4a3b57" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {cracks > 1 && <path d="M86 70 l-10 10 l8 9 l-9 10" stroke="#4a3b57" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}</g>
  </svg>
}

/* ---------- Habitaciones ---------- */
const WALL = { sala: '#f6d3dc', cocina: '#fff0cf', bano: '#cdeaf7', cuarto: '#d9d2f3' }
export function Room({ kind = 'sala', wallCss, dark = false, children, className = '' }) {
  const wall = wallCss || WALL[kind]
  return (
    <div className={`room room-${kind} ${className}`} style={wallCss ? { background: wallCss } : undefined}>
      <svg className="room-bg" viewBox="0 0 360 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {kind === 'jardin' ? <g>
          <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd0ff" /><stop offset="1" stopColor="#d9f4ff" /></linearGradient></defs>
          <rect width="360" height="300" fill="url(#sky)" /><circle cx="300" cy="50" r="28" fill="#ffe27a" /><g fill="#fff" opacity=".9"><ellipse cx="70" cy="60" rx="34" ry="12" /><ellipse cx="95" cy="52" rx="22" ry="12" /><ellipse cx="220" cy="90" rx="30" ry="10" /></g>
          <path d="M0 190 Q90 140 180 180 T360 170 V300 H0z" fill="#8fd694" /><rect y="228" width="360" height="72" fill="#6cc57a" />
          <g fill="#c9925a"><rect x="14" y="196" width="8" height="40" /><rect x="52" y="196" width="8" height="40" /><rect x="90" y="196" width="8" height="40" /><rect x="10" y="206" width="100" height="6" /></g>
          <rect x="300" y="150" width="14" height="70" fill="#8a5a2b" /><circle cx="307" cy="136" r="38" fill="#4fae62" />
          {[[40, 262], [140, 270], [250, 258], [330, 272]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="5" fill={['#ff8fb0', '#ffd166', '#fff'][i % 3]} /><rect x={x - 1} y={y} width="2" height="12" fill="#3e9a52" /></g>)}</g>
        : <g>
          <rect width="360" height="300" fill={wallCss ? 'transparent' : wall} />
          {kind === 'cocina' && <g stroke="#f0d9a6" strokeWidth="1.5" fill="none">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 30} 0 V190 M0 ${i * 30} H360`} />)}</g>}
          {kind === 'bano' && <g stroke="#a9d6ea" strokeWidth="1.5" fill="none">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 30} 0 V190 M0 ${i * 30} H360`} />)}</g>}
          <rect y="200" width="360" height="100" fill={{ sala: '#e3b98a', cocina: '#f4e9d8', bano: '#e8f4f8', cuarto: '#b8a7e6' }[kind]} />
          {kind === 'cocina' && Array.from({ length: 18 }, (_, i) => <rect key={i} x={(i % 9) * 40} y={200 + Math.floor(i / 9) * 50} width="40" height="50" fill={(i + Math.floor(i / 9)) % 2 ? '#e3d3b4' : 'transparent'} />)}
          {kind === 'sala' && <g><rect x="24" y="36" width="82" height="92" rx="8" fill="#9fdcff" stroke="#fff" strokeWidth="6" /><circle cx="52" cy="66" r="14" fill="#ffe27a" /><path d="M65 36 V128 M24 82 H106" stroke="#fff" strokeWidth="5" /><rect x="236" y="48" width="60" height="46" rx="4" fill="#fff" stroke="#c9925a" strokeWidth="5" /><path d="M246 84 l16 -20 l12 12 l8 -8 l12 16z" fill="#8fd694" /><ellipse cx="180" cy="262" rx="90" ry="16" fill="#ff9fb8" opacity=".6" /><rect x="310" y="150" width="30" height="48" rx="5" fill="#c9925a" /><path d="M325 150 q-26 -30 -14 -50 q14 14 14 50 q0 -34 24 -44 q4 28 -24 44z" fill="#4fae62" /></g>}
          {kind === 'cocina' && <g><rect x="20" y="70" width="86" height="130" rx="8" fill="#e8eef5" stroke="#c4cfdb" strokeWidth="3" /><path d="M20 120 H106" stroke="#c4cfdb" strokeWidth="3" /><rect x="94" y="84" width="5" height="22" rx="2" fill="#9aa9b8" /><rect x="94" y="132" width="5" height="36" rx="2" fill="#9aa9b8" /><rect x="130" y="130" width="220" height="70" rx="6" fill="#c9925a" /><rect x="130" y="122" width="220" height="12" rx="4" fill="#fff" /><rect x="150" y="40" width="64" height="48" rx="4" fill="#fff" stroke="#c9925a" strokeWidth="4" /><circle cx="182" cy="64" r="14" fill="#ffd166" /><circle cx="300" cy="112" r="10" fill="#ff8f6b" /></g>}
          {kind === 'bano' && <g><rect x="190" y="130" width="150" height="70" rx="24" fill="#fff" stroke="#bcdcec" strokeWidth="4" /><rect x="200" y="140" width="130" height="30" rx="14" fill="#8fd4f2" /><g fill="#fff" stroke="#bcdcec"><circle cx="220" cy="136" r="9" /><circle cx="240" cy="128" r="7" /><circle cx="300" cy="134" r="10" /></g><rect x="30" y="60" width="70" height="90" rx="8" fill="#fff" stroke="#bcdcec" strokeWidth="4" /><circle cx="65" cy="104" r="22" fill="#e3f4fb" /><rect x="120" y="76" width="44" height="64" rx="4" fill="#ff9fb8" /></g>}
          {kind === 'cuarto' && <g><rect x="230" y="30" width="86" height="92" rx="40" fill="#1e1b4b" stroke="#fff" strokeWidth="6" /><path d="M276 42 a24 24 0 1 0 22 36 a18 18 0 1 1 -22 -36z" fill="#ffe9a8" /><circle cx="252" cy="96" r="2.5" fill="#fff" /><circle cx="296" cy="64" r="2" fill="#fff" /><rect x="20" y="150" width="150" height="60" rx="12" fill="#fff" /><rect x="20" y="136" width="150" height="26" rx="12" fill="#ff9fb8" /><rect x="30" y="140" width="46" height="20" rx="8" fill="#fff" /><rect x="14" y="196" width="10" height="26" fill="#8a5a2b" /><rect x="166" y="196" width="10" height="26" fill="#8a5a2b" /><ellipse cx="260" cy="262" rx="70" ry="12" fill="#ffd1e8" opacity=".7" /></g>}
        </g>}
      </svg>
      <div className="room-pet">{children}</div>
      {dark && <div className="room-dark" />}
    </div>
  )
}
