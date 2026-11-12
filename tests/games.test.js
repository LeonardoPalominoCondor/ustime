import { describe, it, expect } from 'vitest'
import * as E from '../src/games/engines.js'

const A = 'A', B = 'B', P = [A, B]
const rng = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const mk = (type, seed = 7) => ({ ...E.newGame(type, P, rng(seed)), id: 'g' })
const step = (g, mv, me) => { const r = E.applyMove(g, mv, me); return { ...g, ...r } }
const seq = (g, moves) => moves.reduce((x, [me, mv]) => step(x, mv, me), g)
const bad = (g, mv, me, re) => expect(() => E.applyMove(g, mv, me)).toThrow(re)

describe('motor común', () => {
  it('hay 20 juegos y todos inician una partida válida', () => { expect(E.GAME_LIST).toHaveLength(20); for (const g of E.GAME_LIST) { const n = mk(g.id); expect(n.status).toBe('playing'); expect(n.players).toEqual(P) } })
  it('no se juega fuera de turno ni después de terminar', () => {
    const g = mk('ttt'); bad(g, { i: 0 }, B, /turno/)
    const w = seq(g, [[A, { i: 0 }], [B, { i: 3 }], [A, { i: 1 }], [B, { i: 4 }], [A, { i: 2 }]]); expect(w.status).toBe('done'); expect(w.winner).toBe(A); bad(w, { i: 5 }, B, /terminó/)
  })
})
describe('clásicos', () => {
  it('tres en raya: casilla ocupada y empate', () => {
    const g = seq(mk('ttt'), [[A, { i: 0 }]]); bad(g, { i: 0 }, B, /ocupada/)
    const d = seq(mk('ttt'), [[A, { i: 0 }], [B, { i: 1 }], [A, { i: 2 }], [B, { i: 4 }], [A, { i: 3 }], [B, { i: 5 }], [A, { i: 7 }], [B, { i: 6 }], [A, { i: 8 }]]); expect(d.winner).toBe('draw')
  })
  it('conecta 4: gravedad, columna llena y victoria vertical', () => {
    let g = seq(mk('c4'), [[A, { c: 3 }], [B, { c: 4 }], [A, { c: 3 }], [B, { c: 4 }], [A, { c: 3 }], [B, { c: 4 }]]); expect(g.state.b[5 * 7 + 3]).toBe(0); expect(g.state.b[3 * 7 + 3]).toBe(0)
    g = step(g, { c: 3 }, A); expect(g.winner).toBe(A)
    let f = mk('c4'); for (let i = 0; i < 6; i++) f = step(f, { c: 0 }, i % 2 ? B : A) ; bad(f, { c: 0 }, A, /llena/)
  })
  it('gomoku: cinco en línea gana (también en diagonal)', () => {
    const g = seq(mk('gomoku'), [[A, { i: 0 }], [B, { i: 1 }], [A, { i: 16 }], [B, { i: 2 }], [A, { i: 32 }], [B, { i: 3 }], [A, { i: 48 }], [B, { i: 4 }], [A, { i: 64 }]]); expect(g.winner).toBe(A)
  })
  it('puntos y cajas: cerrar una caja da otro turno y suma', () => {
    let g = mk('dots'); g = seq(g, [[A, { t: 'h', i: 0 }], [B, { t: 'v', i: 0 }], [A, { t: 'v', i: 1 }]]); expect(g.turn).toBe(B)
    g = step(g, { t: 'h', i: 4 }, B); expect(g.state.box[0]).toBe(1); expect(g.scores[B]).toBe(1); expect(g.turn).toBe(B)
  })
  it('SOS: formar SOS suma punto y repite turno', () => {
    let g = seq(mk('sos'), [[A, { i: 0, ch: 'S' }], [B, { i: 2, ch: 'S' }]]); g = step(g, { i: 1, ch: 'O' }, A); expect(g.scores[A]).toBe(1); expect(g.turn).toBe(A); bad(g, { i: 5, ch: 'X' }, A, /inválida/)
  })
})
describe('estrategia', () => {
  it('reversi: tablero inicial, jugada que voltea y jugada inválida', () => {
    const g = mk('reversi'); expect(g.state.b.filter((x) => x === 0)).toHaveLength(2); bad(g, { i: 0 }, A, /voltear/)
    const m = step(g, { i: 19 }, A); expect(m.state.b[27]).toBe(0); expect(m.scores[A]).toBe(4); expect(m.turn).toBe(B)
  })
  it('hex: camino arriba-abajo gana', () => {
    let g = mk('hex'); for (let r = 0; r < 11; r++) { g = step(g, { i: r * 11 }, A); if (r < 10) g = step(g, { i: r * 11 + 5 }, B) } expect(g.winner).toBe(A)
  })
  it('damas: captura obligatoria, promoción y victoria', () => {
    const g = mk('checkers'); expect(E.checkersMoves(g.state.b, 0).length).toBeGreaterThan(0)
    const b = Array(36).fill(null); b[20] = 0; b[15] = 1; b[0] = 1
    const s = { ...g, state: { b } }; bad(s, { from: 20, to: 13 }, A, /capturar/); const r = step(s, { from: 20, to: 10 }, A); expect(r.state.b[15]).toBeNull(); expect(r.state.b[10]).toBe(0)
    const k = { ...g, state: { b: (() => { const x = Array(36).fill(null); x[7] = 0; x[34] = 1; return x })() } }; const pr = step(k, { from: 7, to: 0 }, A); expect(pr.state.b[0]).toBe(2)
  })
  it('isola: mover y quitar; ganar si el rival queda encerrado', () => {
    const g = mk('isola'); bad(g, { to: 10, rm: 0 }, A, /inválido/); const r = step(g, { to: 38, rm: 0 }, A); expect(r.state.removed[0]).toBe(true); bad(r, { to: 2, rm: 38 }, B, /quitar/)
    const t = { ...g, state: { removed: Array(49).fill(true), pos: [45, 3] } }; t.state.removed[38] = false; t.state.removed[45] = false; t.state.removed[10] = false; t.state.removed[3] = false; t.state.removed[4] = true
    const w = step(t, { to: 38, rm: 10 }, A); expect(w.winner).toBe(A)
  })
  it('zorro y perros: el zorro gana al llegar arriba; los perros ganan acorralándolo', () => {
    const g = mk('fox'); expect(step({ ...g, state: { fox: 9, hounds: [40, 42, 44, 46] } }, { from: 9, to: 0 }, A).winner).toBe(A)
    const trap = { ...g, turn: B, state: { fox: 7, hounds: [14, 5, 40, 42] } }; expect(step(trap, { from: 5, to: 12 }, B).winner).toBe(B)
    bad({ ...g, turn: B }, { from: 1, to: 9 }, B, /inválido/)
  })
  it('hundir la flota: ambos listos, turnos, disparo repetido y victoria', () => {
    let g = mk('battleship'); const fa = E.randomFleet(rng(3)), fb = E.randomFleet(rng(9)); bad(g, { t: 'shoot', i: 0 }, A, /listos/); bad(g, { t: 'ready', fleet: [[0, 1]] }, A, /inválida/)
    g = step(g, { t: 'ready', fleet: fa }, A); expect(g.turn).toBeNull(); g = step(g, { t: 'ready', fleet: fb }, B); expect(g.turn).toBe(A)
    bad(g, { t: 'shoot', i: 0 }, B, /turno/); g = step(g, { t: 'shoot', i: 0 }, A); g = step(g, { t: 'shoot', i: 1 }, B); bad(g, { t: 'shoot', i: 0 }, A, /Ya disparaste/)
    const targets = () => fb.flat().filter((x) => !g.state.shots[A].includes(x)), safe = [...Array(64).keys()].filter((x) => !fa.flat().includes(x) && x !== 1); let n = 0
    while (g.status !== 'done') g = g.turn === A ? step(g, { t: 'shoot', i: targets()[0] }, A) : step(g, { t: 'shoot', i: safe[g.state.shots[B].length] }, B)
    expect(g.winner).toBe(A)
  })
  it('flotas aleatorias siempre son válidas', () => { for (let s = 1; s < 30; s++) { const f = E.randomFleet(rng(s)); expect(f.map((x) => x.length).sort()).toEqual([2, 2, 3, 3, 4]); expect(new Set(f.flat()).size).toBe(14) } })
})
describe('memoria y azar', () => {
  it('memorama: pareja suma y repite; fallo pasa turno y se ocultan al siguiente movimiento', () => {
    let g = mk('memory'); g.state.cards = [0, 0, 1, 2, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7].map(String)
    g = seq(g, [[A, { i: 0 }], [A, { i: 1 }]]); expect(g.scores[A]).toBe(1); expect(g.turn).toBe(A)
    g = seq(g, [[A, { i: 2 }], [A, { i: 3 }]]); expect(g.turn).toBe(B); expect(g.state.pending).toEqual([2, 3]); bad(g, { i: 2 }, B, /volteada/)
    g = step(g, { i: 4 }, B); expect(g.state.pending).toBeNull(); expect(g.state.up).toEqual([4]); expect(g.turn).toBe(B)
  })
  it('buscaminas duelo: banderas correctas suman, explotar resta, termina al resolver todas', () => {
    let g = mk('flag'); const m = g.state.mines; g = step(g, { t: 'flag', i: m[0] }, A); expect(g.scores[A]).toBe(1)
    const safe = [...Array(64).keys()].find((i) => !m.includes(i) && E.mineAdj(m, i) > 0); g = step(g, { t: 'flag', i: safe }, B); expect(g.scores[B]).toBe(-1)
    g = step(g, { t: 'reveal', i: m[1] }, A); expect(g.scores[A]).toBe(0); bad(g, { t: 'reveal', i: m[1] }, B, /disponible/)
    let t = g; for (const mi of m.slice(2)) t = step(t, { t: 'flag', i: mi }, t.turn); expect(t.status).toBe('done'); expect(t.winner).toBe(A)
  })
  it('carrera minada: mina te manda al inicio; llegar a la meta gana', () => {
    const g = mk('race'); const mine = g.state.mines[0]; const s = { ...g, state: { ...g.state, pos: [mine + E.RW, E.RSTART[1]] } }; const r = step(s, { to: mine }, A); expect(r.state.pos[0]).toBe(E.RSTART[0]); expect(r.state.boom).toContain(mine)
    const w = { ...g, state: { ...g.state, mines: [], pos: [E.RW, E.RSTART[1]] } }; expect(step(w, { to: 0 }, A).winner).toBe(A); bad(g, { to: 0 }, A, /inválido/)
  })
  it('buscador de tesoros: acertar repite turno; pista de distancia; gana quien más encuentra', () => {
    let g = mk('treasure'); const t = g.state.t; g = step(g, { i: t[0] }, A); expect(g.turn).toBe(A); expect(g.scores[A]).toBe(1)
    const empty = [...Array(36).keys()].find((i) => !t.includes(i)); g = step(g, { i: empty }, A); expect(g.state.hint[empty]).toBeGreaterThan(0); expect(g.turn).toBe(B); bad(g, { i: empty }, B, /Ya cavaron/)
    for (const x of t.slice(1)) g = step(g, { i: x }, g.turn); expect(g.status).toBe('done'); expect(g.winner).not.toBeNull()
  })
  it('laberinto: el generado tiene salida alcanzable y las paredes bloquean', () => {
    const g = mk('maze'); const grid = g.state.grid, seen = new Set([E.LSTART]), st = [E.LSTART]
    while (st.length) { const i = st.pop(); for (const j of [i + 1, i - 1, i + E.LN, i - E.LN]) if (grid[j] === 0 && !seen.has(j)) { seen.add(j); st.push(j) } } expect(seen.has(E.LEXIT)).toBe(true)
    const wall = grid.findIndex((v, i) => v === 1 && Math.abs(i - E.LSTART) === 1); bad(g, { to: wall }, A, /pared/)
  })
})
describe('palabras', () => {
  it('ahorcado: palabra, aciertos, vidas, cambio de roles y ganador', () => {
    let g = mk('hangman'); bad(g, { t: 'word', word: 'ab' }, A, /3 a 12/); bad(g, { t: 'word', word: 'gato' }, B, /turno/); g = step(g, { t: 'word', word: 'Árbol' }, A); expect(g.state.word).toBe('ARBOL'); expect(g.turn).toBe(B)
    for (const ch of 'ARBOL') g = step(g, { t: 'guess', ch }, B); expect(g.scores[B]).toBe(1); expect(g.state.round).toBe(2); expect(g.turn).toBe(B)
    g = step(g, { t: 'word', word: 'sol' }, B); for (const ch of 'QWERTY') g = step(g, { t: 'guess', ch }, A); expect(g.status).toBe('done'); expect(g.winner).toBe(B)
  })
  it('mastermind: retroalimentación negro/blanco y rondas', () => {
    expect(E.mmFeedback([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ b: 4, w: 0 }); expect(E.mmFeedback([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ b: 0, w: 4 }); expect(E.mmFeedback([0, 0, 1, 1], [0, 1, 0, 2])).toEqual({ b: 1, w: 2 })
    let g = mk('mastermind'); g = step(g, { t: 'code', code: [0, 1, 2, 3] }, A); g = step(g, { t: 'guess', g: [0, 1, 2, 3] }, B); expect(g.scores[B]).toBe(1); expect(g.state.round).toBe(2); bad(g, { t: 'code', code: [9, 9, 9, 9] }, B, /inválido/)
  })
  it('wordle: duplicados bien tratados; gana el primero en acertar', () => {
    expect(E.wordleFeedback('PERRO', 'PERRO')).toEqual(['g', 'g', 'g', 'g', 'g']); expect(E.wordleFeedback('ARROZ', 'PERRO')).toEqual(['x', 'y', 'g', 'y', 'x']); expect(E.wordleFeedback('LLAMA', 'ALMAS')).toEqual(['x', 'g', 'y', 'y', 'y'])
    let g = mk('wordle'); const secret = g.state.secret; bad(g, { w: 'ab' }, A, /5 letras/); g = step(g, { w: 'zzzzz' }, A); expect(g.status).toBe('playing'); g = step(g, { w: secret.toLowerCase() }, B); expect(g.winner).toBe(B)
    let d = mk('wordle'); for (let i = 0; i < 6; i++) { d = step(d, { w: 'ZZZZZ' }, A); d = step(d, { w: 'YYYYY' }, B) } expect(d.winner).toBe('draw')
  })
  it('basta: puntúa único/repetido/vacío, avanza rondas y declara ganador', () => {
    expect(E.scoreStop('M', ['Maria', 'Mono', 'Mexico', 'Mango', ''], ['Mario', 'Mono', '', 'Mora', 'Mesa'])).toEqual([35, 35])
    let g = mk('stop'); const ans = ['aa', 'bb', 'cc', 'dd', 'ee']; g = step(g, { a: ans }, A); bad(g, { a: ans }, A, /Ya enviaste/)
    g = step(g, { a: ans }, B); expect(g.state.round).toBe(2); for (let r = 2; r <= 3; r++) { g = step(g, { a: ans }, A); g = step(g, { a: ans }, B) } expect(g.status).toBe('done'); expect(g.winner).toBe('draw')
  })
})
