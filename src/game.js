// Capa de Firestore: cada acción es una transacción sobre el estado más reciente (nadie pisa al otro).
import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'
import { COUPLES } from './paths'
import { now, getCfg, today, ymd } from './clock'
import * as C from './gamecore'
export * from './gamecore'
export { today, ymd }

export const ctxFor = (by) => ({ now: now(), by, mul: getCfg().decay ?? 1, hatchMs: getCfg().hatchMs })

export async function run(cid, by, fn, { activity = false } = {}) {
  const ref = doc(db, COUPLES, cid)
  let result
  await runTransaction(db, async (tx) => {
    const s = await tx.get(ref)
    const c = ctxFor(by)
    const cur = s.data().game
    const g = C.normalizeGame(cur ? JSON.parse(JSON.stringify(cur)) : C.initialGame(c.now), c.now)
    result = fn(g, c)
    if (activity) g.days = { ...g.days, [C.dayOf(c.now)]: 1 }
    tx.update(ref, { game: g })
  })
  return result
}
export const ensureGame = (cid, by) => run(cid, by, () => {})
// Recompensa genérica (calificar, responder, cumplir plan…). `key` suma a las misiones diarias.
export const award = (cid, by, { xp = 0, coins = 0, activity = true, key = null } = {}) =>
  run(cid, by, (g, c) => { if (key) C.track(g, key, c.now); C.applyReward(g, { xp, coins }, c.now, by) }, { activity })
export const touch = (cid, by, key) => award(cid, by, { key })

export const claimEgg = (cid, by, key, start) => run(cid, by, (g, c) => C.claimEgg(g, key, start, c))
export const incubate = (cid, by, id, name) => run(cid, by, (g, c) => C.incubate(g, id, name, c))
export const hatch = (cid, by, id, name = '') => run(cid, by, (g, c) => C.hatch(g, id, c, Math.random(), name), { activity: true })
export const setActive = (cid, by, id) => run(cid, by, (g) => { g.activeId = id })
export const graduate = (cid, by, id) => run(cid, by, (g, c) => C.graduate(g, id, c))
export const buy = (cid, by, id) => run(cid, by, (g, c) => C.buy(g, id, c))
export const equip = (cid, by, petId, id) => run(cid, by, (g) => C.equip(g, petId, id))
export const feed = (cid, by, petId, id) => run(cid, by, (g, c) => C.doFeed(g, petId, id, c))
export const bath = (cid, by, petId, id) => run(cid, by, (g, c) => C.doBath(g, petId, id, c))
export const stroke = (cid, by, petId) => run(cid, by, (g, c) => C.doPet(g, petId, c))
export const sleep = (cid, by, petId) => run(cid, by, (g, c) => C.doSleep(g, petId, c))
export const finishMini = (cid, by, petId, game, score) => run(cid, by, (g, c) => C.finishMini(g, petId, game, score, c), { activity: true })
export const claimMission = (cid, by, id) => run(cid, by, (g, c) => C.claimMission(g, id, c.now, by))
export const claimDaily = (cid, by) => run(cid, by, (g, c) => C.claimDaily(g, c.now, by))
export const brush = (cid, by, petId) => run(cid, by, (g, c) => C.doBrush(g, petId, c))
export const rename = (cid, by, petId, name) => run(cid, by, (g, c) => C.renamePet(g, petId, name, c))
