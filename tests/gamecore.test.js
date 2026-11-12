import { describe, it, expect } from 'vitest'
import * as G from '../src/gamecore.js'

const T0 = new Date(2026, 5, 1, 10, 0).getTime()
const c = (now = T0, by = 'A') => ({ now, by, mul: 1 })
const fresh = (now = T0) => G.normalizeGame(G.initialGame(now), now)
function withPet(now = T0, xp = 0) {
  const g = fresh(now)
  G.incubate(g, g.eggs[0].id, 'Luna', c(now))
  G.hatch(g, g.eggs[0].id, c(now + 24 * G.H), 0)
  g.pets[0].xp = xp
  return g
}

describe('niveles y etapas', () => {
  it('niveles 1-4 bebé, 5-14 niño, 15+ adulto', () => {
    expect(G.stageOf(1)).toBe('bebe'); expect(G.stageOf(4)).toBe('bebe')
    expect(G.stageOf(5)).toBe('nino'); expect(G.stageOf(14)).toBe('nino')
    expect(G.stageOf(15)).toBe('adulto')
  })
  it('XP necesaria coincide con la fórmula', () => { expect(G.levelOf(400)).toBe(5); expect(G.levelOf(4900)).toBe(15) })
})

describe('huevos', () => {
  it('el huevo inicial es común y exige nombre', () => {
    const g = fresh(); expect(g.eggs[0].rarity).toBe('comun')
    expect(() => G.incubate(g, g.eggs[0].id, '  ', c())).toThrow()
  })
  it('no eclosiona antes de tiempo y tarda 24/48/72 h', () => {
    const g = fresh(); G.incubate(g, g.eggs[0].id, 'Luna', c())
    expect(g.eggs[0].hatchAt - T0).toBe(24 * G.H)
    expect(() => G.hatch(g, g.eggs[0].id, c(T0 + 23 * G.H))).toThrow()
    expect(G.RARITY.raro.hours).toBe(48); expect(G.RARITY.legendario.hours).toBe(72)
  })
  it('el modo de pruebas puede acortar la espera sin tocar las reglas', () => {
    const g = fresh(); G.incubate(g, g.eggs[0].id, 'Luna', { ...c(), hatchMs: 5000 })
    expect(g.eggs[0].hatchAt - T0).toBe(5000)
  })
  it('probabilidades 70/25/5', () => {
    expect(G.rollRarity(0.69)).toBe('comun'); expect(G.rollRarity(0.7)).toBe('raro')
    expect(G.rollRarity(0.94)).toBe('raro'); expect(G.rollRarity(0.95)).toBe('legendario')
  })
  it('al eclosionar hereda el XP acumulado y el nombre', () => {
    const g = fresh(); g.bank = 120; G.incubate(g, g.eggs[0].id, 'Luna', c())
    const p = G.hatch(g, g.eggs[0].id, c(T0 + 25 * G.H), 0)
    expect(p.xp).toBe(120); expect(p.name).toBe('Luna'); expect(g.activeId).toBe(p.id)
  })
  it('límite de 10 mascotas', () => {
    const g = withPet(); for (let i = 0; i < 9; i++) g.pets.push({ ...g.pets[0], id: 'x' + i })
    G.addEgg(g, 'streak', 0); g.eggs[0].hatchAt = T0
    expect(() => G.hatch(g, g.eggs[0].id, c(T0 + 1))).toThrow(/10 mascotas/)
  })
  it('solo se gradúan adultas', () => {
    const g = withPet(T0, 100); expect(() => G.graduate(g, g.pets[0].id, c())).toThrow()
    g.pets[0].xp = 4900; G.graduate(g, g.pets[0].id, c()); expect(g.pets[0].gradAt).toBe(T0)
  })
})

describe('necesidades y paso del tiempo', () => {
  it('el bebé pierde hambre más rápido que el adulto', () => {
    const b = withPet(T0, 0); const a = withPet(T0, 4900)
    b.pets[0].stage = 'bebe'; a.pets[0].stage = 'adulto'
    const t = b.pets[0].needs.hunger.at + 5 * G.H
    const hb = G.needsNow(b.pets[0], t).hunger, ha = G.needsNow(a.pets[0], t).hunger
    expect(hb).toBeLessThan(ha)
  })
  it('dormir recupera energía y gasta menos lo demás', () => {
    const g = withPet(); const p = g.pets[0]; p.needs.energy = { v: 20, at: T0 }
    G.doSleep(g, p.id, c())
    expect(G.needsNow(p, T0 + 2 * G.H).energy).toBeGreaterThan(40)
    expect(() => G.doFeed(g, p.id, null, c(T0 + 100))).toThrow(/durmiendo/)
  })
  it('acelerar el tiempo (mul) acelera el deterioro', () => {
    const p = withPet().pets[0]
    const t = p.needs.hunger.at + 3 * G.H
    expect(G.needsNow(p, t, 4).hunger).toBeLessThan(G.needsNow(p, t, 1).hunger)
  })
  it('alimentar sube el hambre y registra el hito', () => {
    const g = withPet(); const p = g.pets[0]; p.needs.hunger = { v: 10, at: T0 }
    G.doFeed(g, p.id, null, c(T0)); expect(G.needsNow(p, T0).hunger).toBe(40)
    expect(g.log[0].k).toBe('feed')
  })
})

describe('XP y límites', () => {
  it('alimentar/bañar da +5 XP con máximo 3 veces al día', () => {
    const g = withPet(); const id = g.pets[0].id
    for (let i = 0; i < 5; i++) G.doFeed(g, id, null, c(T0 + i))
    expect(g.pets[0].xp).toBe(15)
    G.doFeed(g, id, null, c(T0 + 24 * G.H)); expect(g.pets[0].xp).toBe(20)
  })
  it('las caricias dan +2 XP, máx. 5 veces al día', () => {
    const g = withPet(); for (let i = 0; i < 8; i++) G.doPet(g, g.pets[0].id, c(T0 + i)); expect(g.pets[0].xp).toBe(10)
  })
  it('subir de nivel da monedas', () => {
    const g = withPet(T0, 24); const coins = g.coins; G.applyReward(g, { xp: 5 }, T0, 'A')
    expect(G.levelOf(g.pets[0].xp)).toBe(2); expect(g.coins).toBe(coins + 20)
  })
  it('sin mascota el XP se guarda en el banco', () => { const g = fresh(); G.applyReward(g, { xp: 40 }, T0, 'A'); expect(g.bank).toBe(40) })
  it('despertar tras 20 min da XP una vez al día', () => {
    const g = withPet(); const id = g.pets[0].id
    G.doSleep(g, id, c(T0)); G.doSleep(g, id, c(T0 + 30 * 60000)); expect(g.pets[0].xp).toBe(5)
    G.doSleep(g, id, c(T0 + 31 * 60000)); G.doSleep(g, id, c(T0 + 60 * 60000)); expect(g.pets[0].xp).toBe(5)
  })
})

describe('evolución y accesorios', () => {
  it('el pañal solo sirve en etapa bebé', () => {
    const g = withPet(); g.owned.push('panal', 'lazo'); const id = g.pets[0].id
    G.equip(g, id, 'panal'); expect(g.pets[0].body).toBe('panal')
    g.pets[0].xp = 400; G.applyReward(g, { xp: 1 }, T0, 'A')
    expect(g.pets[0].stage).toBe('nino'); expect(g.pets[0].body).toBeNull()
    expect(g.owned).toContain('panal') // se conserva en el inventario compartido
    expect(g.log.some((l) => l.k === 'evolve')).toBe(true)
    expect(() => G.equip(g, id, 'panal')).toThrow(/bebé/)
  })
  it('los accesorios de todas las etapas se conservan al evolucionar', () => {
    const g = withPet(); g.owned.push('lazo'); G.equip(g, g.pets[0].id, 'lazo')
    g.pets[0].xp = 400; G.applyReward(g, { xp: 1 }, T0, 'A'); expect(g.pets[0].head).toBe('lazo')
  })
  it('la corona es solo para legendarios adultos', () => {
    const g = withPet(T0, 4900); g.owned.push('corona'); g.pets[0].stage = 'adulto'
    g.pets[0].type = 'osito'; expect(() => G.equip(g, g.pets[0].id, 'corona')).toThrow(/legendario/)
    g.pets[0].type = 'dragon'; G.equip(g, g.pets[0].id, 'corona'); expect(g.pets[0].head).toBe('corona')
  })
  it('el inventario es compartido: varias mascotas usan el mismo objeto sin recomprar', () => {
    const g = withPet(); g.pets.push({ ...JSON.parse(JSON.stringify(g.pets[0])), id: 'p2' }); g.owned.push('lazo')
    G.equip(g, g.pets[0].id, 'lazo'); G.equip(g, 'p2', 'lazo')
    expect(g.pets[0].head).toBe('lazo'); expect(g.pets[1].head).toBe('lazo')
  })
})

describe('tienda', () => {
  it('compra descuenta monedas, bloquea duplicados y respeta nivel mínimo', () => {
    const g = withPet(); G.buy(g, 'lazo', c()); expect(g.coins).toBe(35)
    expect(() => G.buy(g, 'lazo', c())).toThrow(/Ya lo tienen/)
    g.coins = 500; expect(() => G.buy(g, 'corona', c())).toThrow(/nivel 10/)
    g.coins = 0; expect(() => G.buy(g, 'pizza', c())).toThrow(/monedas/)
  })
})

describe('misiones y bono diario', () => {
  it('son 3 misiones deterministas por día', () => {
    const a = G.missionsFor('2026-06-01').map((m) => m.id), b = G.missionsFor('2026-06-01').map((m) => m.id)
    expect(a).toEqual(b); expect(new Set(a).size).toBe(3)
  })
  it('se reclaman al completarlas, una sola vez', () => {
    const g = withPet(); const m = G.missionsFor(G.dayOf(T0))[0]
    expect(() => G.claimMission(g, m.id, T0, 'A')).toThrow()
    G.track(g, m.key, T0, m.goal); const coins = g.coins
    G.claimMission(g, m.id, T0, 'A'); expect(g.coins).toBe(coins + m.coins)
    expect(() => G.claimMission(g, m.id, T0, 'A')).toThrow(/Ya reclamaron/)
  })
  it('el bono de 100 XP se reclama una vez', () => {
    const g = withPet(); G.applyReward(g, { xp: 100 }, T0, 'A'); const coins = g.coins
    G.claimDaily(g, T0, 'A'); expect(g.coins).toBe(coins + 30); expect(() => G.claimDaily(g, T0, 'A')).toThrow()
  })
})

describe('minijuegos', () => {
  it('recompensa por puntaje y reducida tras 3 partidas al día', () => {
    const g = withPet(); const id = g.pets[0].id
    expect(G.finishMini(g, id, 'catch', 10, c()).coins).toBe(20)
    G.finishMini(g, id, 'catch', 10, c()); G.finishMini(g, id, 'catch', 10, c())
    expect(G.finishMini(g, id, 'catch', 10, c())).toMatchObject({ coins: 5, reduced: true })
  })
})

describe('crianza compartida (sin pisarse)', () => {
  it('dos usuarios actuando en secuencia sobre el último estado conservan ambos cambios', () => {
    const g = withPet(); const id = g.pets[0].id; g.pets[0].needs.hunger = { v: 10, at: T0 }; g.pets[0].needs.hygiene = { v: 10, at: T0 }
    G.doFeed(g, id, null, c(T0, 'A')); G.doBath(g, id, null, c(T0, 'B'))
    const n = G.needsNow(g.pets[0], T0); expect(n.hunger).toBe(40); expect(n.hygiene).toBe(40)
    expect(g.log.slice(0, 2).map((l) => l.by)).toEqual(['B', 'A'])
  })
})

describe('migración desde v2', () => {
  it('convierte mascotas antiguas sin perder XP ni accesorios', () => {
    const old = { coins: 70, pets: [{ id: 'p', type: 'gato', name: 'Mishi', xp: 500, fed: T0 - 2 * G.H, clean: T0, head: 'gorro', face: null, body: null, bg: null }], eggs: [], owned: ['gorro'], inv: {}, days: {}, claims: { streakAt: null, hito: 0 }, care: { date: '', count: 0 }, activeId: 'p' }
    const g = G.normalizeGame(old, T0)
    expect(g.pets[0].xp).toBe(500); expect(g.pets[0].head).toBe('gorro'); expect(g.pets[0].needs.hunger.v).toBe(92); expect(g.coins).toBe(70)
  })
})

describe('racha y armonía', () => {
  it('cuenta días consecutivos', () => {
    const d = (n) => G.dayOf(T0 - n * 864e5); const days = { [d(0)]: 1, [d(1)]: 1, [d(2)]: 1, [d(4)]: 1 }
    expect(G.streakInfo(days, T0).n).toBe(3)
  })
  it('armonía = % de títulos con diferencia ≤ 1', () => {
    const e = (a, b) => ({ status: 'visto', ratings: { A: a, B: b } })
    expect(G.harmony([e(8, 9), e(5, 9), e(10, 10), e(6, 6)], ['A', 'B'])).toEqual({ total: 4, matches: 3, pct: 75 })
  })
})
