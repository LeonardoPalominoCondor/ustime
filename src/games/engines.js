// Motores de reglas de los 20 juegos de a dos. Son funciones puras: se validan con tests y se ejecutan dentro de una transacción de Firestore.
const clone = (x) => JSON.parse(JSON.stringify(x))
export const other = (ps, me) => ps.find((p) => p !== me)
const side = (ps, me) => ps.indexOf(me)
const inB = (r, c, w, h = w) => r >= 0 && r < h && c >= 0 && c < w
const fail = (m) => { throw new Error(m) }
const byScores = (ps, sc) => (sc[ps[0]] > sc[ps[1]] ? ps[0] : sc[ps[1]] > sc[ps[0]] ? ps[1] : 'draw')
const shuffle = (a, rnd) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }
const sample = (pool, k, rnd) => shuffle(pool, rnd).slice(0, k)
export const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
function run(b, w, h, i, k, len) {
  const r = Math.floor(i / w), c = i % w
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let n = 1
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (inB(rr, cc, w, h) && b[rr * w + cc] === k) { n++; rr += dr * s; cc += dc * s } }
    if (n >= len) return true
  }
  return false
}
const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const adjCount = (mines, i, w, h) => N8.reduce((n, [dr, dc]) => { const r = Math.floor(i / w) + dr, c = (i % w) + dc; return n + (inB(r, c, w, h) && mines.includes(r * w + c) ? 1 : 0) }, 0)

/* 1 · Tres en raya */
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
const ttt = { name: 'Tres en raya', icon: '❌', cat: 'Clásicos', desc: 'Tres en línea gana.',
  init: () => ({ state: { b: Array(9).fill(null) } }),
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me); if (!(i >= 0 && i < 9) || s.b[i] !== null) fail('Casilla ocupada'); s.b[i] = k
    if (LINES.some((l) => l.every((j) => s.b[j] === k))) return { state: s, winner: me }; return s.b.every((x) => x !== null) ? { state: s, winner: 'draw' } : { state: s } } }

/* 2 · Conecta 4 */
const c4 = { name: 'Conecta 4', icon: '🔴', cat: 'Clásicos', desc: 'Cuatro fichas en línea.',
  init: () => ({ state: { b: Array(42).fill(null) } }),
  move: (g, { c }, me) => { const s = g.state, k = side(g.players, me); if (!(c >= 0 && c < 7)) fail('Columna inválida'); let r = 5; while (r >= 0 && s.b[r * 7 + c] !== null) r--; if (r < 0) fail('Columna llena')
    s.b[r * 7 + c] = k; s.last = r * 7 + c; if (run(s.b, 7, 6, r * 7 + c, k, 4)) return { state: s, winner: me }; return s.b.every((x) => x !== null) ? { state: s, winner: 'draw' } : { state: s } } }

/* 3 · Gomoku */
export const GN = 15
const gomoku = { name: 'Gomoku', icon: '⚫', cat: 'Estrategia', desc: 'Cinco en raya en un tablero de 15×15.',
  init: () => ({ state: { b: Array(GN * GN).fill(null) } }),
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me); if (!(i >= 0 && i < GN * GN) || s.b[i] !== null) fail('Casilla ocupada'); s.b[i] = k; s.last = i
    if (run(s.b, GN, GN, i, k, 5)) return { state: s, winner: me }; return s.b.every((x) => x !== null) ? { state: s, winner: 'draw' } : { state: s } } }

/* 4 · Reversi / Othello */
export function flips(b, i, k) {
  if (b[i] !== null) return []
  const r = Math.floor(i / 8), c = i % 8, out = []
  for (const [dr, dc] of N8) { const line = []; let rr = r + dr, cc = c + dc
    while (inB(rr, cc, 8) && b[rr * 8 + cc] === 1 - k) { line.push(rr * 8 + cc); rr += dr; cc += dc }
    if (line.length && inB(rr, cc, 8) && b[rr * 8 + cc] === k) out.push(...line) }
  return out
}
export const hasMove = (b, k) => b.some((v, i) => v === null && flips(b, i, k).length)
const reversi = { name: 'Reversi', icon: '⚪', cat: 'Estrategia', desc: 'Voltea las fichas del rival (Othello).',
  init: () => { const b = Array(64).fill(null); b[27] = 1; b[36] = 1; b[28] = 0; b[35] = 0; return { state: { b } } },
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me), f = flips(s.b, i, k); if (!f.length) fail('Jugada inválida: debe voltear fichas'); s.b[i] = k; f.forEach((j) => { s.b[j] = k })
    const sc = { [g.players[0]]: s.b.filter((x) => x === 0).length, [g.players[1]]: s.b.filter((x) => x === 1).length }; const o = other(g.players, me)
    if (hasMove(s.b, 1 - k)) return { state: s, scores: sc, turn: o }
    if (hasMove(s.b, k)) return { state: s, scores: sc, turn: me }
    return { state: s, scores: sc, winner: byScores(g.players, sc) } } }

/* 5 · Hex */
export const HN = 11
const HNB = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]]
export function hexWin(b, k) {
  const st = []; for (let i = 0; i < HN; i++) { const x = k === 0 ? i : i * HN; if (b[x] === k) st.push(x) }
  const seen = new Set()
  while (st.length) { const i = st.pop(); if (seen.has(i)) continue; seen.add(i); const r = Math.floor(i / HN), c = i % HN
    if ((k === 0 && r === HN - 1) || (k === 1 && c === HN - 1)) return true
    for (const [dr, dc] of HNB) { const rr = r + dr, cc = c + dc; if (inB(rr, cc, HN) && b[rr * HN + cc] === k) st.push(rr * HN + cc) } }
  return false
}
const hex = { name: 'Hex', icon: '⬡', cat: 'Estrategia', desc: 'Une tus dos lados del tablero con un camino.',
  init: () => ({ state: { b: Array(HN * HN).fill(null) } }),
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me); if (!(i >= 0 && i < HN * HN) || s.b[i] !== null) fail('Casilla ocupada'); s.b[i] = k; return hexWin(s.b, k) ? { state: s, winner: me } : { state: s } } }

/* 6 · Puntos y cajas */
export const DN = 4
const dots = { name: 'Puntos y cajas', icon: '🔲', cat: 'Clásicos', desc: 'Cierra cajas; si cierras una, repites.',
  init: () => ({ state: { h: Array((DN + 1) * DN).fill(null), v: Array(DN * (DN + 1)).fill(null), box: Array(DN * DN).fill(null) } }),
  move: (g, { t, i }, me) => { const s = g.state, k = side(g.players, me); if (!['h', 'v'].includes(t) || !(i >= 0 && i < s[t].length) || s[t][i] !== null) fail('Línea inválida'); s[t][i] = k; let got = 0
    const chk = (r, c) => { if (!inB(r, c, DN) || s.box[r * DN + c] !== null) return; if (s.h[r * DN + c] !== null && s.h[(r + 1) * DN + c] !== null && s.v[r * (DN + 1) + c] !== null && s.v[r * (DN + 1) + c + 1] !== null) { s.box[r * DN + c] = k; got++ } }
    if (t === 'h') { const r = Math.floor(i / DN), c = i % DN; chk(r - 1, c); chk(r, c) } else { const r = Math.floor(i / (DN + 1)), c = i % (DN + 1); chk(r, c - 1); chk(r, c) }
    const sc = { ...g.scores }; sc[me] = (sc[me] || 0) + got
    if (s.box.every((x) => x !== null)) return { state: s, scores: sc, winner: byScores(g.players, sc) }
    return { state: s, scores: sc, turn: got ? me : other(g.players, me) } } }

/* 7 · SOS */
export const SN = 6
const sos = { name: 'SOS', icon: '🆘', cat: 'Clásicos', desc: 'Forma S‑O‑S; si lo logras, repites.',
  init: () => ({ state: { b: Array(SN * SN).fill(null) } }),
  move: (g, { i, ch }, me) => { const s = g.state; if (!['S', 'O'].includes(ch) || !(i >= 0 && i < SN * SN) || s.b[i]) fail('Jugada inválida'); s.b[i] = ch
    const r = Math.floor(i / SN), c = i % SN, at = (rr, cc) => (inB(rr, cc, SN) ? s.b[rr * SN + cc] : null); let n = 0
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { if (ch === 'O') { if (at(r - dr, c - dc) === 'S' && at(r + dr, c + dc) === 'S') n++ } else for (const sg of [1, -1]) if (at(r + dr * sg, c + dc * sg) === 'O' && at(r + 2 * dr * sg, c + 2 * dc * sg) === 'S') n++ }
    const sc = { ...g.scores }; sc[me] = (sc[me] || 0) + n
    if (s.b.every((x) => x)) return { state: s, scores: sc, winner: byScores(g.players, sc) }
    return { state: s, scores: sc, turn: n ? me : other(g.players, me) } } }

/* 8 · Damas simplificadas (6×6) */
export const CN = 6
export function checkersMoves(b, k) {
  const out = [], caps = []
  for (let i = 0; i < CN * CN; i++) { const p = b[i]; if (p === null || p % 2 !== k) continue
    const king = p >= 2, r = Math.floor(i / CN), c = i % CN, fwd = k === 0 ? -1 : 1
    for (const [dr, dc] of king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[fwd, 1], [fwd, -1]]) {
      const r1 = r + dr, c1 = c + dc; if (!inB(r1, c1, CN)) continue; const j = r1 * CN + c1
      if (b[j] === null) out.push({ from: i, to: j })
      else if (b[j] % 2 !== k) { const r2 = r1 + dr, c2 = c1 + dc; if (inB(r2, c2, CN) && b[r2 * CN + c2] === null) caps.push({ from: i, to: r2 * CN + c2, cap: j }) } } }
  return caps.length ? caps : out
}
const checkers = { name: 'Damas', icon: '♟️', cat: 'Estrategia', desc: 'Damas simplificadas 6×6: capturar es obligatorio.',
  init: () => { const b = Array(CN * CN).fill(null); for (let r = 0; r < CN; r++) for (let c = 0; c < CN; c++) if ((r + c) % 2 === 1) { if (r < 2) b[r * CN + c] = 1; if (r >= 4) b[r * CN + c] = 0 } return { state: { b } } },
  move: (g, { from, to }, me) => { const s = g.state, k = side(g.players, me), m = checkersMoves(s.b, k).find((x) => x.from === from && x.to === to); if (!m) fail(checkersMoves(s.b, k).some((x) => x.cap !== undefined) ? 'Tienes que capturar' : 'Movimiento inválido')
    let p = s.b[from]; s.b[from] = null; if (m.cap !== undefined) s.b[m.cap] = null; const row = Math.floor(to / CN); if ((k === 0 && row === 0) || (k === 1 && row === CN - 1)) p = k + 2; s.b[to] = p; s.last = to
    return checkersMoves(s.b, 1 - k).length === 0 ? { state: s, winner: me } : { state: s } } }

/* 9 · Isola */
export const IN = 7
export const isolaNb = (i) => { const r = Math.floor(i / IN), c = i % IN; return N8.map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => inB(rr, cc, IN)).map(([rr, cc]) => rr * IN + cc) }
const isola = { name: 'Isola', icon: '🏝️', cat: 'Estrategia', desc: 'Muévete y quita una casilla: deja al rival sin salida.',
  init: () => ({ state: { removed: Array(IN * IN).fill(false), pos: [45, 3] } }),
  move: (g, { to, rm }, me) => { const s = g.state, k = side(g.players, me)
    if (!isolaNb(s.pos[k]).includes(to) || s.removed[to] || s.pos.includes(to)) fail('Movimiento inválido')
    s.pos[k] = to; if (!(rm >= 0 && rm < IN * IN) || s.removed[rm] || s.pos.includes(rm)) fail('No puedes quitar esa casilla'); s.removed[rm] = true
    const o = 1 - k; return isolaNb(s.pos[o]).some((j) => !s.removed[j] && !s.pos.includes(j)) ? { state: s } : { state: s, winner: me } } }

/* 10 · El zorro y los perros */
export const FN = 8
export const foxMoves = (s) => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([dr, dc]) => [Math.floor(s.fox / FN) + dr, (s.fox % FN) + dc]).filter(([r, c]) => inB(r, c, FN)).map(([r, c]) => r * FN + c).filter((j) => j !== s.fox && !s.hounds.includes(j))
export const houndMoves = (s, h) => [[1, -1], [1, 1]].map(([dr, dc]) => [Math.floor(h / FN) + dr, (h % FN) + dc]).filter(([r, c]) => inB(r, c, FN)).map(([r, c]) => r * FN + c).filter((j) => j !== s.fox && !s.hounds.includes(j))
const fox = { name: 'Zorro y perros', icon: '🦊', cat: 'Estrategia', desc: 'El zorro (1.º) debe llegar arriba; los perros deben acorralarlo.',
  init: () => ({ state: { fox: 56, hounds: [1, 3, 5, 7] } }),
  move: (g, { from, to }, me) => { const s = g.state, k = side(g.players, me)
    if (k === 0) { if (from !== s.fox || !foxMoves(s).includes(to)) fail('Movimiento inválido'); s.fox = to; if (Math.floor(to / FN) === 0) return { state: s, winner: me }; return s.hounds.some((h) => houndMoves(s, h).length) ? { state: s } : { state: s, winner: me } }
    if (!s.hounds.includes(from) || !houndMoves(s, from).includes(to)) fail('Movimiento inválido'); s.hounds[s.hounds.indexOf(from)] = to
    return foxMoves(s).length ? { state: s } : { state: s, winner: me } } }

/* 11 · Hundir la flota */
export const BN = 8, SHIPS = [4, 3, 3, 2, 2]
export function randomFleet(rnd = Math.random) {
  for (;;) { const occ = new Set(), fleet = []; let ok = true
    for (const len of SHIPS) { let placed = false
      for (let t = 0; t < 200 && !placed; t++) { const h = rnd() < 0.5, r = Math.floor(rnd() * (h ? BN : BN - len + 1)), c = Math.floor(rnd() * (h ? BN - len + 1 : BN)); const cells = Array.from({ length: len }, (_, i) => (h ? r * BN + c + i : (r + i) * BN + c))
        if (cells.every((x) => !occ.has(x))) { cells.forEach((x) => occ.add(x)); fleet.push(cells); placed = true } }
      if (!placed) { ok = false; break } }
    if (ok) return fleet }
}
function validFleet(f) {
  if (!Array.isArray(f) || [...f.map((s) => s.length)].sort().join() !== [...SHIPS].sort().join()) return false
  const seen = new Set()
  for (const s of f) { if (!s.every((x) => Number.isInteger(x) && x >= 0 && x < BN * BN && !seen.has(x))) return false; s.forEach((x) => seen.add(x))
    const rows = new Set(s.map((x) => Math.floor(x / BN))), cols = new Set(s.map((x) => x % BN)); const sorted = [...s].sort((a, b) => a - b)
    if (!(rows.size === 1 && sorted.every((x, i) => i === 0 || x - sorted[i - 1] === 1)) && !(cols.size === 1 && sorted.every((x, i) => i === 0 || x - sorted[i - 1] === BN))) return false }
  return true
}
const battleship = { name: 'Hundir la flota', icon: '🚢', cat: 'Estrategia', simul: true, desc: 'Coloca tu flota y hunde la del rival.',
  init: (ps) => ({ state: { fleets: { [ps[0]]: null, [ps[1]]: null }, shots: { [ps[0]]: [], [ps[1]]: [] } }, turn: null }),
  move: (g, mv, me) => { const s = g.state, o = other(g.players, me)
    if (mv.t === 'ready') { if (s.fleets[me]) fail('Ya estás listo'); if (!validFleet(mv.fleet)) fail('Flota inválida'); s.fleets[me] = mv.fleet; return { state: s, turn: s.fleets[o] ? g.players[0] : null } }
    if (!s.fleets[me] || !s.fleets[o]) fail('Esperen a que ambos estén listos'); if (g.turn !== me) fail('Todavía no es tu turno')
    if (!(mv.i >= 0 && mv.i < BN * BN) || s.shots[me].includes(mv.i)) fail('Ya disparaste ahí'); s.shots[me].push(mv.i)
    const enemy = new Set(s.fleets[o].flat()); return [...enemy].every((x) => s.shots[me].includes(x)) ? { state: s, turn: null, winner: me } : { state: s, turn: o } } }

/* 12 · Memorama */
const FACES = ['🍿', '🎬', '💕', '🌙', '🍕', '🎟️', '🧸', '⭐']
const memory = { name: 'Memorama', icon: '🃏', cat: 'Memoria', desc: 'Encuentra más parejas que tu rival.',
  init: (ps, rnd) => ({ state: { cards: shuffle([...FACES, ...FACES], rnd), up: [], matched: Array(16).fill(null), pending: null } }),
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me); if (!(i >= 0 && i < 16) || s.matched[i] !== null || s.up.includes(i)) fail('Esa carta ya está volteada')
    if (s.pending) { s.up = []; s.pending = null } s.up.push(i); if (s.up.length < 2) return { state: s, turn: me }
    const [a, b] = s.up
    if (s.cards[a] === s.cards[b]) { s.matched[a] = s.matched[b] = k; s.up = []; const sc = { ...g.scores }; sc[me] = (sc[me] || 0) + 1
      return s.matched.every((x) => x !== null) ? { state: s, scores: sc, winner: byScores(g.players, sc) } : { state: s, scores: sc, turn: me } }
    s.pending = [a, b]; return { state: s, turn: other(g.players, me) } } }

/* 13 · Buscaminas competitivo */
export const MW = 8, MMINES = 10
export const mineAdj = (mines, i) => adjCount(mines, i, MW, MW)
const flag = { name: 'Buscaminas duelo', icon: '🚩', cat: 'Azar', desc: 'Marca minas (+1), revela con cuidado (−1 si explota).',
  init: (ps, rnd) => ({ state: { mines: sample([...Array(MW * MW).keys()], MMINES, rnd), rev: Array(MW * MW).fill(false), flag: Array(MW * MW).fill(null) } }),
  move: (g, { t, i }, me) => { const s = g.state, k = side(g.players, me), sc = { ...g.scores }; if (!['reveal', 'flag'].includes(t) || !(i >= 0 && i < MW * MW) || s.rev[i] || s.flag[i] !== null) fail('Casilla no disponible')
    if (t === 'flag') { s.flag[i] = k; sc[me] = (sc[me] || 0) + (s.mines.includes(i) ? 1 : -1) }
    else if (s.mines.includes(i)) { s.rev[i] = true; sc[me] = (sc[me] || 0) - 1 }
    else { const st = [i]; while (st.length) { const j = st.pop(); if (s.rev[j] || s.mines.includes(j) || s.flag[j] !== null) continue; s.rev[j] = true; if (mineAdj(s.mines, j) === 0) N8.forEach(([dr, dc]) => { const r = Math.floor(j / MW) + dr, c = (j % MW) + dc; if (inB(r, c, MW)) st.push(r * MW + c) }) } }
    return s.mines.every((m) => s.flag[m] !== null || s.rev[m]) ? { state: s, scores: sc, winner: byScores(g.players, sc) } : { state: s, scores: sc } } }

/* 14 · Campo minado de carreras */
export const RW = 7, RH = 8, RSTART = [7 * RW + 1, 7 * RW + 5]
const race = { name: 'Carrera minada', icon: '💣', cat: 'Azar', desc: 'Llega a la meta sin pisar minas (las minas te mandan al inicio).',
  init: (ps, rnd) => ({ state: { mines: sample(Array.from({ length: 6 * RW }, (_, i) => RW + i), 10, rnd), pos: [...RSTART], seen: Array(RW * RH).fill(null), boom: [] } }),
  move: (g, { to }, me) => { const s = g.state, k = side(g.players, me), p = s.pos[k]
    const d = Math.abs(Math.floor(to / RW) - Math.floor(p / RW)) + Math.abs((to % RW) - (p % RW)); if (!(to >= 0 && to < RW * RH) || d !== 1 || to === s.pos[1 - k]) fail('Movimiento inválido')
    if (s.mines.includes(to)) { if (!s.boom.includes(to)) s.boom.push(to); s.pos[k] = RSTART[k]; return { state: s } }
    s.pos[k] = to; s.seen[to] = adjCount(s.mines, to, RW, RH); return Math.floor(to / RW) === 0 ? { state: s, winner: me } : { state: s } } }

/* 15 · Buscador de tesoros */
export const TW = 6
const treasure = { name: 'Buscador de tesoros', icon: '💎', cat: 'Azar', desc: 'Cava casillas: el número indica qué tan cerca está un tesoro.',
  init: (ps, rnd) => ({ state: { t: sample([...Array(TW * TW).keys()], 7, rnd), tried: Array(TW * TW).fill(null), hint: Array(TW * TW).fill(null) } }),
  move: (g, { i }, me) => { const s = g.state, k = side(g.players, me), sc = { ...g.scores }; if (!(i >= 0 && i < TW * TW) || s.tried[i] !== null) fail('Ya cavaron ahí'); s.tried[i] = k
    const hit = s.t.includes(i); if (hit) { s.hint[i] = 0; sc[me] = (sc[me] || 0) + 1 } else s.hint[i] = Math.min(...s.t.filter((x) => s.tried[x] === null).map((x) => Math.abs(Math.floor(x / TW) - Math.floor(i / TW)) + Math.abs((x % TW) - (i % TW))))
    if (s.t.every((x) => s.tried[x] !== null)) return { state: s, scores: sc, winner: byScores(g.players, sc) }; return { state: s, scores: sc, turn: hit ? me : other(g.players, me) } } }

/* 16 · Ahorcado para dos */
function endRound(g, s, scorer, last, sc) {
  s.last = last
  if (s.round === 1) { s.round = 2; s.setter = 1 - s.setter; s.word = null; s.guessed = []; s.lives = 6; s.phase = 'set'; return { state: s, scores: sc, turn: g.players[s.setter] } }
  return { state: s, scores: sc, winner: byScores(g.players, sc) }
}
const hangman = { name: 'Ahorcado', icon: '🔤', cat: 'Palabras', desc: 'Uno elige la palabra, el otro la adivina. Luego se cambian.',
  init: (ps) => ({ state: { round: 1, setter: 0, word: null, guessed: [], lives: 6, phase: 'set', last: null }, turn: ps[0] }),
  move: (g, mv, me) => { const s = g.state, setter = g.players[s.setter], guesser = other(g.players, setter), sc = { ...g.scores }
    if (mv.t === 'word') { if (s.phase !== 'set' || me !== setter) fail('Ahora elige la palabra el otro'); const w = norm(mv.word); if (!/^[A-Z]{3,12}$/.test(w)) fail('Usa de 3 a 12 letras, sin espacios'); s.word = w; s.phase = 'guess'; return { state: s, turn: guesser } }
    if (s.phase !== 'guess' || me !== guesser) fail('Ahora adivina el otro'); const ch = norm(mv.ch); if (!/^[A-Z]$/.test(ch) || s.guessed.includes(ch)) fail('Letra inválida o repetida')
    s.guessed.push(ch); if (!s.word.includes(ch)) s.lives--
    const won = [...s.word].every((x) => s.guessed.includes(x)), lost = s.lives <= 0
    if (won || lost) { const sc2 = { ...sc, [won ? guesser : setter]: (sc[won ? guesser : setter] || 0) + 1 }; return endRound(g, s, won ? guesser : setter, { word: s.word, won, round: s.round }, sc2) }
    return { state: s, turn: me } } }

/* 17 · Mastermind */
export const MCOLORS = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣']
export function mmFeedback(code, guess) {
  const b = guess.filter((x, i) => x === code[i]).length
  const w = MCOLORS.reduce((n, _, c) => n + Math.min(code.filter((x) => x === c).length, guess.filter((x) => x === c).length), 0) - b
  return { b, w }
}
const okCode = (a) => Array.isArray(a) && a.length === 4 && a.every((x) => Number.isInteger(x) && x >= 0 && x < 6)
const mastermind = { name: 'Mastermind', icon: '🎯', cat: 'Palabras', desc: 'Descifra el código de 4 colores en 8 intentos.',
  init: (ps) => ({ state: { round: 1, setter: 0, code: null, guesses: [], phase: 'set', last: null }, turn: ps[0] }),
  move: (g, mv, me) => { const s = g.state, setter = g.players[s.setter], guesser = other(g.players, setter), sc = { ...g.scores }
    if (mv.t === 'code') { if (s.phase !== 'set' || me !== setter) fail('Ahora crea el código el otro'); if (!okCode(mv.code)) fail('Código inválido'); s.code = mv.code; s.phase = 'guess'; return { state: s, turn: guesser } }
    if (s.phase !== 'guess' || me !== guesser) fail('Ahora adivina el otro'); if (!okCode(mv.g)) fail('Intento inválido')
    const fb = mmFeedback(s.code, mv.g); s.guesses.push({ g: mv.g, ...fb }); const won = fb.b === 4, lost = !won && s.guesses.length >= 8
    if (won || lost) { const who = won ? guesser : setter; const sc2 = { ...sc, [who]: (sc[who] || 0) + 1 }; const last = { code: s.code, won, tries: s.guesses.length, round: s.round }
      const r = endRound(g, s, who, last, sc2); if (s.phase === 'set') { s.code = null; s.guesses = [] } return r }
    return { state: s, turn: me } } }

/* 18 · Wordle competitivo */
export const WORDS = 'ABEJA ACERO AGUAS AIRES ALMAS ANGEL ARBOL BAILE BANCO BESOS BOLSA BRAZO CAFES CAMPO CANTO CARNE CARTA CERCA CINCO CLASE COLOR CORTO DANZA DEDOS DOLOR DULCE FELIZ FIRMA FRUTA FUEGO GENTE GLOBO GRADO HIELO HORAS HUEVO IDEAS JUEGO JUNTO LAGOS LECHE LEJOS LENTO LIBRE LUCES LUGAR MADRE MANOS MARCA MARZO MIRAR MOTOR MUJER MUSEO NIEVE NIETO NOBLE NORTE NUEVO OLIVA ONDAS PAPEL PARED PASTA PECES PIANO PIZZA PLAZA POEMA POLLO PRIMO PUNTO QUESO RADIO RAMAS REINA RELOJ RISAS ROBOT ROCAS ROPAS SABOR SALIR SALSA SELVA SONAR SUELO TABLA TANGO TAZAS TECHO TELAS TENER TINTA TORRE TRAJE TRIGO TURNO UNION VALLE VELAS VIAJE VIDAS VINOS VISTA VUELO YEGUA ZORRO PERRO GATOS PLAYA NUBES CIELO TIGRE LEONA RATON PLATO SILLA CALLE AVION CARRO BARCO MUNDO LLAMA NOCHE TARDE VERDE NEGRO ROSAS AMIGO AMIGA'.split(' ')
export function wordleFeedback(guess, secret) {
  const res = Array(5).fill('x'), left = {}
  for (let i = 0; i < 5; i++) { if (guess[i] === secret[i]) res[i] = 'g'; else left[secret[i]] = (left[secret[i]] || 0) + 1 }
  for (let i = 0; i < 5; i++) if (res[i] === 'x' && left[guess[i]] > 0) { res[i] = 'y'; left[guess[i]]-- }
  return res
}
const wordle = { name: 'Wordle duelo', icon: '🟩', cat: 'Palabras', simul: true, desc: 'La misma palabra para los dos: gana quien la adivine primero.',
  init: (ps, rnd) => ({ state: { secret: WORDS[Math.floor(rnd() * WORDS.length)], guesses: { [ps[0]]: [], [ps[1]]: [] }, done: { [ps[0]]: null, [ps[1]]: null } }, turn: null }),
  move: (g, { w }, me) => { const s = g.state, o = other(g.players, me), word = norm(w); if (s.done[me]) fail('Ya terminaste tus intentos'); if (!/^[A-Z]{5}$/.test(word)) fail('Escribe 5 letras')
    s.guesses[me].push(word); if (word === s.secret) { s.done[me] = 'win'; return { state: s, turn: null, winner: me } }
    if (s.guesses[me].length >= 6) s.done[me] = 'fail'
    return s.done[me] && s.done[o] === 'fail' ? { state: s, turn: null, winner: 'draw' } : { state: s, turn: null } } }

/* 19 · Stop / Basta */
export const STOP_CATS = ['Nombre', 'Animal', 'País o ciudad', 'Fruta o comida', 'Objeto']
export function scoreStop(letter, a, b) {
  const ok = (x) => { const n = norm(x); return n.length >= 2 && n[0] === letter }
  return STOP_CATS.map((_, i) => { const va = ok(a[i]), vb = ok(b[i]); if (va && vb) return norm(a[i]) === norm(b[i]) ? [5, 5] : [10, 10]; return [va ? 10 : 0, vb ? 10 : 0] })
    .reduce((t, [x, y]) => [t[0] + x, t[1] + y], [0, 0])
}
const stop = { name: 'Basta', icon: '✋', cat: 'Palabras', simul: true, desc: 'Escribe una palabra por categoría con la letra. 3 rondas.',
  init: (ps, rnd) => ({ state: { round: 1, letters: sample([...'ABCDEFGHILMNOPRSTV'], 3, rnd), subs: { [ps[0]]: null, [ps[1]]: null }, hist: [] }, turn: null }),
  move: (g, { a }, me) => { const s = g.state, o = other(g.players, me); if (s.subs[me]) fail('Ya enviaste esta ronda'); if (!Array.isArray(a) || a.length !== 5 || a.some((x) => typeof x !== 'string' || x.length > 24)) fail('Respuestas inválidas')
    s.subs[me] = a; if (!s.subs[o]) return { state: s, turn: null }
    const letter = s.letters[s.round - 1], [pa, pb] = scoreStop(letter, s.subs[g.players[0]], s.subs[g.players[1]]); const sc = { ...g.scores }; sc[g.players[0]] = (sc[g.players[0]] || 0) + pa; sc[g.players[1]] = (sc[g.players[1]] || 0) + pb
    s.hist.push({ letter, subs: s.subs, pts: { [g.players[0]]: pa, [g.players[1]]: pb } })
    if (s.round >= 3) return { state: s, turn: null, scores: sc, winner: byScores(g.players, sc) }
    s.round++; s.subs = { [g.players[0]]: null, [g.players[1]]: null }; return { state: s, turn: null, scores: sc } } }

/* 20 · Laberinto por turnos */
export const LN = 11, LEXIT = 9 * LN + 9, LSTART = LN + 1
export function genMaze(rnd) {
  const g = Array(LN * LN).fill(1); g[LSTART] = 0; const st = [[1, 1]]
  while (st.length) { const [r, c] = st[st.length - 1]
    const opts = [[0, 2], [2, 0], [0, -2], [-2, 0]].filter(([dr, dc]) => r + dr > 0 && c + dc > 0 && r + dr < LN - 1 && c + dc < LN - 1 && g[(r + dr) * LN + c + dc] === 1)
    if (!opts.length) { st.pop(); continue }
    const [dr, dc] = opts[Math.floor(rnd() * opts.length)]; g[(r + dr / 2) * LN + c + dc / 2] = 0; g[(r + dr) * LN + c + dc] = 0; st.push([r + dr, c + dc]) }
  return g
}
const maze = { name: 'Laberinto', icon: '🌀', cat: 'Azar', desc: 'Carrera por turnos hasta la salida 🏁.',
  init: (ps, rnd) => ({ state: { grid: genMaze(rnd), pos: [LSTART, LSTART] } }),
  move: (g, { to }, me) => { const s = g.state, k = side(g.players, me), p = s.pos[k]
    const d = Math.abs(Math.floor(to / LN) - Math.floor(p / LN)) + Math.abs((to % LN) - (p % LN)); if (!(to >= 0 && to < LN * LN) || d !== 1 || s.grid[to] !== 0) fail('Ahí hay una pared')
    s.pos[k] = to; return to === LEXIT ? { state: s, winner: me } : { state: s } } }

export const ENGINES = { ttt, c4, gomoku, reversi, hex, dots, sos, checkers, isola, fox, battleship, memory, flag, race, treasure, hangman, mastermind, wordle, stop, maze }
export const GAME_LIST = Object.entries(ENGINES).map(([id, e]) => ({ id, ...e }))

export function newGame(type, players, rnd = Math.random) {
  const e = ENGINES[type]; if (!e) fail('Juego desconocido'); const i = e.init(players, rnd)
  return { type, players, status: 'playing', turn: i.turn === undefined ? players[0] : i.turn, state: i.state, scores: i.scores || { [players[0]]: 0, [players[1]]: 0 }, winner: null, createdBy: players[0] }
}
export function applyMove(game, mv, me) {
  const e = ENGINES[game.type]; if (!e) fail('Juego desconocido')
  if (game.status === 'done') fail('La partida ya terminó.'); if (!game.players.includes(me)) fail('No eres jugador de esta partida.')
  if (!e.simul && game.turn !== me) fail('Todavía no es tu turno.')
  const g = clone({ state: game.state, players: game.players, turn: game.turn, scores: game.scores || {} })
  const r = e.move(g, mv, me), winner = r.winner ?? null
  return { state: r.state, turn: winner ? null : r.turn === undefined ? other(game.players, me) : r.turn, status: winner ? 'done' : 'playing', winner, scores: r.scores || g.scores }
}
