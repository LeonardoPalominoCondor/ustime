// Lógica de la mascota, XP, monedas, huevos y tienda. Todo vive en couples/{id}.game
import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => ymd(new Date())
const rid = () => Math.random().toString(36).slice(2, 9)
const H = 36e5

export const RARITY = {
  comun: { label: 'Común', hours: 24 },
  raro: { label: 'Raro', hours: 48 },
  legendario: { label: 'Legendario', hours: 72 },
}
export const PETS = [
  { id: 'osito', name: 'Osito', emoji: '🐻', rarity: 'comun' },
  { id: 'perrito', name: 'Perrito', emoji: '🐶', rarity: 'comun' },
  { id: 'gato', name: 'Gato', emoji: '🐱', rarity: 'comun' },
  { id: 'conejo', name: 'Conejo', emoji: '🐰', rarity: 'comun' },
  { id: 'capibara', name: 'Capibara', emoji: '🐹', rarity: 'raro' },
  { id: 'axolote', name: 'Axolote', emoji: '🦎', rarity: 'raro' },
  { id: 'zorro', name: 'Zorro', emoji: '🦊', rarity: 'raro' },
  { id: 'panda', name: 'Panda', emoji: '🐼', rarity: 'raro' },
  { id: 'unicornio', name: 'Unicornio', emoji: '🦄', rarity: 'legendario' },
  { id: 'dragon', name: 'Dragón', emoji: '🐲', rarity: 'legendario' },
  { id: 'fenix', name: 'Fénix', emoji: '🐦‍🔥', rarity: 'legendario' },
  { id: 'grifo', name: 'Grifo', emoji: '🦅', rarity: 'legendario' },
]
// Tienda. slot: head/face/body/bg. phases = etapas que pueden usar la prenda.
export const SHOP = [
  { id: 'palomitas', cat: 'Comida', emoji: '🍿', name: 'Palomitas', price: 10, kind: 'food', amount: 50 },
  { id: 'sushi', cat: 'Comida', emoji: '🍣', name: 'Sushi', price: 20, kind: 'food', amount: 70 },
  { id: 'helado', cat: 'Comida', emoji: '🍦', name: 'Helado', price: 15, kind: 'food', amount: 60 },
  { id: 'pocion_e', cat: 'Comida', emoji: '🧪', name: 'Poción de energía', price: 30, kind: 'food', amount: 100 },
  { id: 'jabon', cat: 'Higiene', emoji: '🧼', name: 'Jabón de burbujas', price: 10, kind: 'bath', amount: 50 },
  { id: 'esponja', cat: 'Higiene', emoji: '🧽', name: 'Esponja temática', price: 15, kind: 'bath', amount: 70 },
  { id: 'pocion_l', cat: 'Higiene', emoji: '🧴', name: 'Poción de limpieza', price: 25, kind: 'bath', amount: 100 },
  { id: 'chupon', cat: 'Ropa bebé', emoji: '🍼', name: 'Chupón', price: 15, kind: 'wear', slot: 'face', phases: ['bebe', 'nino'] },
  { id: 'panal', cat: 'Ropa bebé', emoji: '🩲', name: 'Pañal', price: 15, kind: 'wear', slot: 'body', phases: ['bebe', 'nino'] },
  { id: 'vampiro', cat: 'Halloween', emoji: '🧛', name: 'Disfraz de vampiro', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'calabaza', cat: 'Halloween', emoji: '🎃', name: 'Disfraz de calabaza', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'fantasma', cat: 'Halloween', emoji: '👻', name: 'Disfraz de fantasma', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'cineasta', cat: 'Cine', emoji: '🎩', name: 'Sombrero de cineasta', price: 35, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'lentes3d', cat: 'Cine', emoji: '🕶️', name: 'Lentes 3D', price: 35, kind: 'wear', slot: 'face', phases: ['nino', 'adulto'] },
  { id: 'gala', cat: 'Cine', emoji: '🤵', name: 'Traje de gala', price: 80, kind: 'wear', slot: 'body', phases: ['adulto'] },
  { id: 'gorro', cat: 'Accesorios', emoji: '🧢', name: 'Gorro', price: 20, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'lentes', cat: 'Accesorios', emoji: '👓', name: 'Lentes', price: 20, kind: 'wear', slot: 'face', phases: ['nino', 'adulto'] },
  { id: 'bg_noche', cat: 'Fondos', emoji: '🌌', name: 'Noche estrellada', price: 50, kind: 'wear', slot: 'bg', phases: ['bebe', 'nino', 'adulto'], css: 'linear-gradient(#1b1b4b,#5a2d82)' },
  { id: 'bg_playa', cat: 'Fondos', emoji: '🏖️', name: 'Playa', price: 50, kind: 'wear', slot: 'bg', phases: ['bebe', 'nino', 'adulto'], css: 'linear-gradient(#69c7ff,#ffe7a3)' },
  { id: 'bg_jardin', cat: 'Fondos', emoji: '🌸', name: 'Jardín', price: 50, kind: 'wear', slot: 'bg', phases: ['bebe', 'nino', 'adulto'], css: 'linear-gradient(#ffd1e8,#b8f2c4)' },
  { id: 'bg_cine', cat: 'Fondos', emoji: '🎬', name: 'Sala de cine', price: 60, kind: 'wear', slot: 'bg', phases: ['bebe', 'nino', 'adulto'], css: 'linear-gradient(#3b0d1d,#12060b)' },
]
export const item = (id) => SHOP.find((i) => i.id === id)

export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 25)) + 1
export const xpForLevel = (l) => 25 * (l - 1) * (l - 1)
export const phaseOf = (l) => (l >= 15 ? 'adulto' : l >= 5 ? 'nino' : 'bebe')
export const PHASE_LABEL = { bebe: 'Bebé', nino: 'Niño/a', adulto: 'Adulto' }
export const hunger = (p) => Math.max(0, Math.round(100 - ((Date.now() - p.fed) / H) * 4))
export const clean = (p) => Math.max(0, Math.round(100 - ((Date.now() - p.clean) / H) * 3))
const setStat = (p, key, v) => { p[key] = Date.now() - ((100 - Math.min(100, v)) / (key === 'fed' ? 4 : 3)) * H }

export const revealed = (e, uids) => uids.length > 1 && uids.every((u) => e.ratings?.[u] > 0)
export function harmony(entries, uids) {
  const seen = entries.filter((e) => e.status === 'visto' && revealed(e, uids))
  const m = seen.filter((e) => Math.abs(e.ratings[uids[0]] - e.ratings[uids[1]]) <= 1)
  return { total: seen.length, matches: m.length, pct: seen.length ? Math.round((m.length / seen.length) * 100) : 0 }
}
export function streakInfo(days = {}) {
  const d = new Date(); let n = 0
  if (!days[ymd(d)]) d.setDate(d.getDate() - 1)
  while (days[ymd(d)]) { n++; d.setDate(d.getDate() - 1) }
  d.setDate(d.getDate() + 1)
  return { n, start: n ? ymd(d) : null }
}
const rollRarity = () => { const r = Math.random(); return r < 0.7 ? 'comun' : r < 0.95 ? 'raro' : 'legendario' }
const activePets = (g) => g.pets.filter((p) => !p.gradAt)
export const MAX_PETS = 10

export const initialGame = () => ({
  coins: 50, bank: 0, pets: [], activeId: null, inv: {}, owned: [], days: {},
  eggs: [{ id: rid(), rarity: 'comun', hatchAt: null, from: 'inicial' }],
  claims: { streakAt: null, hito: 0 }, care: { date: '', count: 0 },
})

export async function mutate(cid, fn, { activity = false } = {}) {
  const ref = doc(db, 'couples', cid)
  await runTransaction(db, async (tx) => {
    const s = await tx.get(ref)
    const cur = s.data().game
    const g = cur ? JSON.parse(JSON.stringify(cur)) : initialGame()
    const out = fn(g) || g
    if (activity) out.days = { ...out.days, [today()]: 1 }
    tx.update(ref, { game: out })
  })
}
export const ensureGame = (cid) => mutate(cid, (g) => g)

function reward(g, xp, coins) {
  const pet = activePets(g).find((p) => p.id === g.activeId)
  if (pet && xp) {
    const before = levelOf(pet.xp); pet.xp += xp
    coins += 20 * (levelOf(pet.xp) - before) // monedas por subir de nivel
  } else g.bank = (g.bank || 0) + xp
  g.coins += coins
}
export const award = (cid, { xp = 0, coins = 0, activity = true } = {}) => mutate(cid, (g) => reward(g, xp, coins), { activity })

export const claimEgg = (cid, key, startDate) => mutate(cid, (g) => {
  g.eggs.push({ id: rid(), rarity: rollRarity(), hatchAt: null, from: key })
  if (key === 'streak') g.claims.streakAt = startDate; else g.claims.hito = (g.claims.hito || 0) + 1
})
export const incubate = (cid, eggId) => mutate(cid, (g) => {
  const e = g.eggs.find((x) => x.id === eggId); e.hatchAt = Date.now() + RARITY[e.rarity].hours * H
})
export const hatch = (cid, eggId, name) => mutate(cid, (g) => {
  if (activePets(g).length >= MAX_PETS) throw new Error('Ya tienen 10 mascotas. Gradúen a una adulta para hacer espacio.')
  const e = g.eggs.find((x) => x.id === eggId)
  if (!e?.hatchAt || e.hatchAt > Date.now()) throw new Error('Todavía no está listo.')
  const pool = PETS.filter((p) => p.rarity === e.rarity)
  const t = pool[Math.floor(Math.random() * pool.length)]
  const pet = { id: rid(), type: t.id, name: name || t.name, xp: g.bank || 0, adoptedAt: Date.now(), gradAt: null, fed: Date.now(), clean: Date.now(), head: null, face: null, body: null, bg: null }
  g.bank = 0; g.pets.push(pet); g.eggs = g.eggs.filter((x) => x.id !== eggId)
  if (!g.activeId) g.activeId = pet.id
})
export const setActive = (cid, id) => mutate(cid, (g) => { g.activeId = id })
export const graduate = (cid, id) => mutate(cid, (g) => {
  const p = g.pets.find((x) => x.id === id)
  if (levelOf(p.xp) < 15) throw new Error('Solo pueden graduarse las mascotas adultas (nivel 15+).')
  p.gradAt = Date.now()
  if (g.activeId === id) g.activeId = activePets(g)[0]?.id || null
})
export const buy = (cid, id) => mutate(cid, (g) => {
  const it = item(id)
  if (g.coins < it.price) throw new Error('No les alcanzan las monedas.')
  if (it.kind === 'wear') { if (g.owned.includes(id)) throw new Error('Ya lo tienen.'); g.owned.push(id) }
  else g.inv[id] = (g.inv[id] || 0) + 1
  g.coins -= it.price
})
export const equip = (cid, petId, id) => mutate(cid, (g) => {
  const p = g.pets.find((x) => x.id === petId); const it = item(id)
  p[it.slot] = p[it.slot] === id ? null : id
})
// kind: 'feed' | 'bath'. id = objeto de la tienda o null (básico, gratis)
export const care = (cid, petId, kind, id) => mutate(cid, (g) => {
  const p = g.pets.find((x) => x.id === petId); const key = kind === 'feed' ? 'fed' : 'clean'
  let amount = 30
  if (id) { if (!g.inv[id]) throw new Error('Se les acabó.'); g.inv[id]--; amount = item(id).amount }
  setStat(p, key, (key === 'fed' ? hunger(p) : clean(p)) + amount)
  if (g.care.date !== today()) g.care = { date: today(), count: 0 }
  if (g.care.count < 3) { g.care.count++; reward(g, 5, 0) } // +5 XP, máx. 3 veces al día
})
