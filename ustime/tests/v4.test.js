import { describe, it, expect } from 'vitest'
import * as G from '../src/gamecore.js'
import { planNotifications, zonedEpoch, localParts, streakTz } from '../src/notifyplan.js'
import { layoutNotes, JAR_MAX } from '../src/jarlayout.js'

const T0 = new Date(2026, 5, 1, 10, 0).getTime(), c = (now = T0, by = 'A') => ({ now, by, mul: 1 })
function withPet(xp = 0) { const g = G.normalizeGame(G.initialGame(T0), T0); G.incubate(g, g.eggs[0].id, 'Luna', c()); G.hatch(g, g.eggs[0].id, c(T0 + 25 * G.H), 0); g.pets[0].xp = xp; g.pets[0].stage = G.petStage(g.pets[0]); return g }

describe('renombrar mascotas', () => {
  it('se puede en cualquier momento, recorta y registra el cambio', () => {
    const g = withPet(); G.renamePet(g, g.pets[0].id, '  Nube   Azul y más  ', c()); expect(g.pets[0].name).toBe('Nube Azul'); expect(g.log[0]).toMatchObject({ k: 'rename', from: 'Luna' })
    expect(() => G.renamePet(g, g.pets[0].id, '   ', c())).toThrow(/vacío/); expect(() => G.renamePet(g, 'nope', 'X', c())).toThrow()
  })
  it('también funciona con mascotas graduadas', () => { const g = withPet(4900); G.graduate(g, g.pets[0].id, c()); G.renamePet(g, g.pets[0].id, 'Sabio', c()); expect(g.pets[0].name).toBe('Sabio') })
})
describe('cepillado de dientes', () => {
  it('da XP una vez al día, sube limpieza y refuerza el sueño (+25 % de energía)', () => {
    const g = withPet(); const id = g.pets[0].id; g.pets[0].needs.hygiene = { v: 50, at: T0 + 25 * G.H }; const t = T0 + 25 * G.H
    expect(G.doBrush(g, id, c(t)).xp).toBe(5); expect(G.doBrush(g, id, c(t + 1)).xp).toBe(0); expect(G.needsNow(g.pets[0], t + 1).hygiene).toBeGreaterThanOrEqual(60)
    const a = withPet(), b = withPet(); for (const x of [a, b]) x.pets[0].needs.energy = { v: 10, at: T0 + 25 * G.H }
    G.doBrush(a, a.pets[0].id, c(t)); G.doSleep(a, a.pets[0].id, c(t)); G.doSleep(b, b.pets[0].id, c(t))
    expect(a.pets[0].sleeping.bonus).toBe(true); expect(b.pets[0].sleeping.bonus).toBe(false)
    expect(G.needsNow(a.pets[0], t + 4 * G.H).energy).toBeGreaterThan(G.needsNow(b.pets[0], t + 4 * G.H).energy)
  })
  it('no se puede cepillar mientras duerme y cuenta para la misión', () => {
    const g = withPet(); const id = g.pets[0].id; G.doSleep(g, id, c(T0 + 25 * G.H)); expect(() => G.doBrush(g, id, c(T0 + 26 * G.H))).toThrow(/durmiendo/)
    const g2 = withPet(); G.doBrush(g2, g2.pets[0].id, c(T0 + 25 * G.H)); expect(g2.missions.progress.brush).toBe(1)
  })
})
describe('catálogo de ropa', () => {
  it('es amplio, con ids únicos y datos válidos', () => {
    expect(G.SHOP.length).toBeGreaterThanOrEqual(70); expect(new Set(G.SHOP.map((i) => i.id)).size).toBe(G.SHOP.length)
    for (const i of G.SHOP.filter((x) => x.kind === 'wear')) { expect(G.SLOTS).toContain(i.slot); expect(i.phases.length).toBeGreaterThan(0); expect(i.price).toBeGreaterThan(0); if (i.slot === 'bg') expect(i.css).toBeTruthy() }
    for (const s of ['head', 'face', 'body', 'neck', 'hand', 'bg']) expect(G.SHOP.filter((i) => i.slot === s).length).toBeGreaterThanOrEqual(4)
  })
  it('cuello y mano se equipan y respetan etapa; al evolucionar vuelven los incompatibles', () => {
    const g = withPet(); g.owned.push('globo', 'cascabel', 'bodi', 'varita', 'medalla'); const id = g.pets[0].id
    G.equip(g, id, 'globo'); G.equip(g, id, 'cascabel'); G.equip(g, id, 'bodi'); expect(() => G.equip(g, id, 'varita')).toThrow(/etapa/)
    expect(G.equipOf(g.pets[0])).toMatchObject({ hand: 'globo', neck: 'cascabel', body: 'bodi' })
    g.pets[0].xp = 400; G.applyReward(g, { xp: 1 }, T0, 'A'); expect(g.pets[0].body).toBeNull(); expect(g.owned).toContain('bodi'); expect(g.pets[0].hand).toBe('globo'); G.equip(g, id, 'varita')
  })
})
describe('frasco de notas', () => {
  it('acomoda las notas de forma estable y dentro del frasco', () => {
    const ids = Array.from({ length: 40 }, (_, i) => 'n' + i), a = G.SHOP && layoutNotes(ids, 1), b = layoutNotes(ids, 1), c2 = layoutNotes(ids, 2)
    expect(a).toEqual(b); expect(a).toHaveLength(JAR_MAX); expect(c2).not.toEqual(a)
    for (const p of a) { expect(p.x).toBeGreaterThan(55); expect(p.x).toBeLessThan(250); expect(p.y).toBeGreaterThan(150); expect(p.y).toBeLessThan(335) }
  })
})
describe('notificaciones (planificador)', () => {
  const users = { A: { username: 'Ana', tz: 'America/Lima', tokens: ['t'] }, B: { username: 'Leo', tz: 'America/Lima', tokens: ['t'], prefs: { jar: false } } }
  const at = (iso) => Date.parse(iso)
  const couple = (game, notified = {}) => ({ id: 'C', members: ['A', 'B'], game, notified })
  it('zonas horarias: 20:00 en Lima = 01:00 UTC', () => { expect(zonedEpoch('2026-11-10', '20:00', 'America/Lima')).toBe(at('2026-11-11T01:00:00Z')); expect(localParts(at('2026-11-11T01:30:00Z'), 'America/Lima')).toEqual({ date: '2026-11-10', hour: 20 }) })
  it('evento: avisa a la hora del recordatorio, una sola vez', () => {
    const ev = [{ id: 'e', title: 'Cena', categoryId: 'cita', date: '2026-11-10', time: '20:00', reminder: 60, status: 'planned', createdBy: 'A' }]
    expect(planNotifications({ now: at('2026-11-10T23:30:00Z'), couple: couple(null), events: ev, users })).toHaveLength(0) // aún falta más de 1 h
    const due = planNotifications({ now: at('2026-11-11T00:30:00Z'), couple: couple(null), events: ev, users }); expect(due).toHaveLength(1); expect(due[0].uids).toEqual(['A', 'B']); expect(due[0].title).toContain('Cena')
    expect(planNotifications({ now: at('2026-11-11T00:30:00Z'), couple: couple(null, { [due[0].key]: 1 }), events: ev, users })).toHaveLength(0) // ya avisado
    expect(planNotifications({ now: at('2026-11-11T00:30:00Z'), couple: couple(null), events: [{ ...ev[0], status: 'done' }], users })).toHaveLength(0)
    expect(planNotifications({ now: at('2026-11-11T02:00:00Z'), couple: couple(null), events: ev, users })).toHaveLength(0) // ya pasó
  })
  it('huevo listo y huevo nuevo', () => {
    const g = { coins: 0, pets: [], eggs: [{ id: 'e1', rarity: 'comun', hatchAt: at('2026-11-10T20:00:00Z'), name: 'Luna' }, { id: 'e2', rarity: 'raro', hatchAt: null, from: 'streak' }], days: {}, owned: [], inv: {} }
    const p = planNotifications({ now: at('2026-11-10T21:00:00Z'), couple: couple(g), users }); expect(p.map((x) => x.key).sort()).toEqual(['egg-new:e2', 'egg-ready:e1'])
    expect(planNotifications({ now: at('2026-11-10T15:00:00Z'), couple: couple(g), users }).map((x) => x.key)).toEqual(['egg-new:e2'])
  })
  it('racha en peligro: solo de noche, solo si hay racha y no hubo actividad hoy', () => {
    const days = { '2026-11-08': 1, '2026-11-09': 1 }, g = { coins: 0, pets: [], eggs: [], days, owned: [], inv: {} }
    expect(streakTz(days, '2026-11-10')).toBe(2)
    const night = at('2026-11-11T02:00:00Z') // 21:00 en Lima del día 10
    expect(planNotifications({ now: night, couple: couple(g), users })[0]).toMatchObject({ kind: 'streak' })
    expect(planNotifications({ now: at('2026-11-10T17:00:00Z'), couple: couple(g), users })).toHaveLength(0)
    expect(planNotifications({ now: night, couple: couple({ ...g, days: { ...days, '2026-11-10': 1 } }), users })).toHaveLength(0)
  })
  it('frasco: solo avisa al destinatario, respeta sus preferencias y no revela el texto', () => {
    const jar = [{ id: 'j', from: 'B', to: 'A', createdAt: at('2026-11-10T15:00:00Z'), readAt: null, text: 'secreto' }, { id: 'k', from: 'A', to: 'B', createdAt: at('2026-11-10T15:00:00Z'), readAt: null }]
    const p = planNotifications({ now: at('2026-11-10T16:00:00Z'), couple: couple(null), jar, users }); expect(p).toHaveLength(1); expect(p[0].uids).toEqual(['A']); expect(JSON.stringify(p)).not.toContain('secreto')
  })
  it('partidas: avisa al jugador con el turno; no avisa a quien no tiene dispositivos ni de madrugada', () => {
    const games = [{ id: 'g', type: 'ttt', status: 'playing', turn: 'B', players: ['A', 'B'], updatedAt: at('2026-11-10T15:00:00Z'), rev: 3 }]
    expect(planNotifications({ now: at('2026-11-10T16:00:00Z'), couple: couple(null), games, users })[0]).toMatchObject({ kind: 'games', uids: ['B'] })
    expect(planNotifications({ now: at('2026-11-10T16:00:00Z'), couple: couple(null), games, users: { ...users, B: { ...users.B, tokens: [] } } })).toHaveLength(0)
    expect(planNotifications({ now: at('2026-11-10T09:00:00Z'), couple: couple(null), games: [{ ...games[0], updatedAt: at('2026-11-10T08:00:00Z') }], users })).toHaveLength(0) // 04:00 en Lima
  })
  it('mascota con hambre: avisa de día y no se repite en el mismo tramo', () => {
    const g = G.normalizeGame(G.initialGame(T0), T0); G.incubate(g, g.eggs[0].id, 'Luna', c()); const pet = G.hatch(g, g.eggs[0].id, c(T0 + 25 * G.H), 0); const now = at('2026-11-10T17:00:00Z'); pet.needs.hunger = { v: 10, at: now }; g.eggs = []
    const p = planNotifications({ now, couple: couple(g), users }); expect(p.some((x) => x.kind === 'pet')).toBe(true)
    expect(planNotifications({ now: at('2026-11-10T08:00:00Z') + 0, couple: couple(g), users }).some((x) => x.kind === 'pet')).toBe(false)
  })
})
