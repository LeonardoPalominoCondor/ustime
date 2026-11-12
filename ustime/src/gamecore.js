// Reglas del juego 100% puras (sin Firebase ni reloj global): se pueden probar con tests y acelerar con `ctx.now`.
export const H = 36e5
export const MAX_PETS = 10
export const SLOTS = ['head', 'face', 'body', 'neck', 'hand', 'bg']
export const SLOT_LABEL = { head: 'Cabeza', face: 'Cara', body: 'Cuerpo', neck: 'Cuello', hand: 'En la mano', bg: 'Fondo' }
export const equipOf = (p) => ({ head: p.head || null, face: p.face || null, body: p.body || null, neck: p.neck || null, hand: p.hand || null })
export const NEEDS = ['hunger', 'hygiene', 'energy', 'fun']
export const NEED_LABEL = { hunger: 'Hambre', hygiene: 'Limpieza', energy: 'Energía', fun: 'Diversión' }
export const NEED_ICON = { hunger: '🍽️', hygiene: '🛁', energy: '⚡', fun: '🎈' }
export const RARITY = { comun: { label: 'Común', hours: 24 }, raro: { label: 'Raro', hours: 48 }, legendario: { label: 'Legendario', hours: 72 } }
export const STAGE_LABEL = { bebe: 'Bebé', nino: 'Niño/a', adulto: 'Adulto' }
// Pérdida por hora de cada necesidad. El bebé necesita más cuidados que el adulto.
export const DECAY = {
  bebe: { hunger: 6, hygiene: 4, energy: 3, fun: 4 },
  nino: { hunger: 4, hygiene: 3, energy: 2.5, fun: 3 },
  adulto: { hunger: 2.5, hygiene: 2, energy: 2, fun: 2 },
}
const SLEEP_GAIN = 12

export const PETS = [
  { id: 'osito', name: 'Osito', rarity: 'comun', trait: 'cariñoso' },
  { id: 'perrito', name: 'Perrito', rarity: 'comun', trait: 'juguetón' },
  { id: 'gato', name: 'Gato', rarity: 'comun', trait: 'independiente' },
  { id: 'conejo', name: 'Conejo', rarity: 'comun', trait: 'tímido' },
  { id: 'capibara', name: 'Capibara', rarity: 'raro', trait: 'relajado' },
  { id: 'axolote', name: 'Axolote', rarity: 'raro', trait: 'curioso' },
  { id: 'zorro', name: 'Zorro', rarity: 'raro', trait: 'travieso' },
  { id: 'panda', name: 'Panda', rarity: 'raro', trait: 'dormilón' },
  { id: 'unicornio', name: 'Unicornio', rarity: 'legendario', trait: 'soñador' },
  { id: 'dragon', name: 'Dragón', rarity: 'legendario', trait: 'valiente' },
  { id: 'fenix', name: 'Fénix', rarity: 'legendario', trait: 'radiante' },
  { id: 'grifo', name: 'Grifo', rarity: 'legendario', trait: 'noble' },
]
export const petDef = (id) => PETS.find((p) => p.id === id)

// Tienda. phases/species/rarities = restricciones. minLevel = nivel de la familia (mascota más alta) para desbloquear.
const ALL = ['bebe', 'nino', 'adulto']
const NA = ['nino', 'adulto']
export const SHOP = [
  { id: 'palomitas', cat: 'Comida', emoji: '🍿', name: 'Palomitas', price: 10, kind: 'food', amount: 50 },
  { id: 'pizza', cat: 'Comida', emoji: '🍕', name: 'Pizza', price: 15, kind: 'food', amount: 65 },
  { id: 'sushi', cat: 'Comida', emoji: '🍣', name: 'Sushi', price: 20, kind: 'food', amount: 70, minLevel: 3 },
  { id: 'helado', cat: 'Comida', emoji: '🍦', name: 'Helado', price: 15, kind: 'food', amount: 60 },
  { id: 'pocion_e', cat: 'Comida', emoji: '🧪', name: 'Poción de energía', price: 30, kind: 'food', amount: 100, minLevel: 5 },
  { id: 'jabon', cat: 'Higiene', emoji: '🧼', name: 'Jabón de burbujas', price: 10, kind: 'bath', amount: 50 },
  { id: 'esponja', cat: 'Higiene', emoji: '🧽', name: 'Esponja temática', price: 15, kind: 'bath', amount: 70 },
  { id: 'pocion_l', cat: 'Higiene', emoji: '🧴', name: 'Poción de limpieza', price: 25, kind: 'bath', amount: 100, minLevel: 5 },
  { id: 'chupon', cat: 'Ropa bebé', emoji: '🍼', name: 'Chupón', price: 15, kind: 'wear', slot: 'face', phases: ['bebe'] },
  { id: 'panal', cat: 'Ropa bebé', emoji: '🩲', name: 'Pañal', price: 15, kind: 'wear', slot: 'body', phases: ['bebe'] },
  { id: 'lazo', cat: 'Accesorios', emoji: '🎀', name: 'Lazo', price: 15, kind: 'wear', slot: 'head', phases: ALL },
  { id: 'gorro', cat: 'Accesorios', emoji: '🧢', name: 'Gorro', price: 20, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'lentes', cat: 'Accesorios', emoji: '👓', name: 'Lentes', price: 20, kind: 'wear', slot: 'face', phases: ['nino', 'adulto'] },
  { id: 'bufanda', cat: 'Accesorios', emoji: '🧣', name: 'Bufanda', price: 25, kind: 'wear', slot: 'body', phases: ['nino', 'adulto'] },
  { id: 'vampiro', cat: 'Halloween', emoji: '🧛', name: 'Disfraz de vampiro', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'calabaza', cat: 'Halloween', emoji: '🎃', name: 'Disfraz de calabaza', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'fantasma', cat: 'Halloween', emoji: '👻', name: 'Disfraz de fantasma', price: 40, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'cineasta', cat: 'Cine', emoji: '🎩', name: 'Sombrero de cineasta', price: 35, kind: 'wear', slot: 'head', phases: ['nino', 'adulto'] },
  { id: 'lentes3d', cat: 'Cine', emoji: '🕶️', name: 'Lentes 3D', price: 35, kind: 'wear', slot: 'face', phases: ['nino', 'adulto'] },
  { id: 'gala', cat: 'Cine', emoji: '🤵', name: 'Traje de gala', price: 80, kind: 'wear', slot: 'body', phases: ['adulto'], minLevel: 8 },
  { id: 'corona', cat: 'Realeza', emoji: '👑', name: 'Corona real', price: 150, kind: 'wear', slot: 'head', phases: ['adulto'], rarities: ['legendario'], minLevel: 10 },
  { id: 'bg_noche', cat: 'Fondos', emoji: '🌌', name: 'Noche estrellada', price: 50, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#1b1b4b,#5a2d82)' },
  { id: 'bg_playa', cat: 'Fondos', emoji: '🏖️', name: 'Playa', price: 50, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#69c7ff,#ffe7a3)' },
  { id: 'bg_jardin', cat: 'Fondos', emoji: '🌸', name: 'Jardín rosa', price: 50, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#ffd1e8,#b8f2c4)' },
  { id: 'bg_cine', cat: 'Fondos', emoji: '🎬', name: 'Sala de cine', price: 60, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#3b0d1d,#12060b)' },
  // ---- Catálogo ampliado ----
  { id: 'paja', cat: 'Accesorios', emoji: '👒', name: 'Sombrero de paja', price: 25, kind: 'wear', slot: 'head', phases: NA },
  { id: 'birrete', cat: 'Accesorios', emoji: '🎓', name: 'Birrete', price: 30, kind: 'wear', slot: 'head', phases: NA },
  { id: 'flor', cat: 'Accesorios', emoji: '🌸', name: 'Flor en la cabeza', price: 15, kind: 'wear', slot: 'head', phases: ALL },
  { id: 'casco', cat: 'Deporte', emoji: '⛑️', name: 'Casco', price: 25, kind: 'wear', slot: 'head', phases: NA },
  { id: 'vaquero', cat: 'Fantasía', emoji: '🤠', name: 'Sombrero vaquero', price: 30, kind: 'wear', slot: 'head', phases: NA },
  { id: 'mago', cat: 'Fantasía', emoji: '🧙', name: 'Disfraz de mago', price: 45, kind: 'wear', slot: 'head', phases: NA },
  { id: 'astronauta', cat: 'Fantasía', emoji: '🧑‍🚀', name: 'Astronauta', price: 60, kind: 'wear', slot: 'head', phases: NA, minLevel: 6 },
  { id: 'ninja', cat: 'Fantasía', emoji: '🥷', name: 'Ninja', price: 50, kind: 'wear', slot: 'head', phases: NA },
  { id: 'payaso', cat: 'Fiesta', emoji: '🤡', name: 'Disfraz de payaso', price: 35, kind: 'wear', slot: 'head', phases: NA },
  { id: 'fiesta', cat: 'Fiesta', emoji: '🎉', name: 'Gorro de fiesta', price: 20, kind: 'wear', slot: 'head', phases: ALL },
  { id: 'navidad', cat: 'Navidad', emoji: '🎅', name: 'Gorro navideño', price: 30, kind: 'wear', slot: 'head', phases: NA },
  { id: 'corazon', cat: 'San Valentín', emoji: '💖', name: 'Corazones', price: 25, kind: 'wear', slot: 'head', phases: ALL },
  { id: 'buceo', cat: 'Deporte', emoji: '🥽', name: 'Gafas de buceo', price: 25, kind: 'wear', slot: 'face', phases: NA },
  { id: 'mascara', cat: 'Cine', emoji: '🎭', name: 'Máscara de teatro', price: 35, kind: 'wear', slot: 'face', phases: NA },
  { id: 'beso', cat: 'San Valentín', emoji: '💋', name: 'Besito', price: 15, kind: 'wear', slot: 'face', phases: ALL },
  { id: 'bodi', cat: 'Ropa bebé', emoji: '👚', name: 'Body de bebé', price: 15, kind: 'wear', slot: 'body', phases: ['bebe'] },
  { id: 'camiseta', cat: 'Ropa', emoji: '👕', name: 'Camiseta', price: 20, kind: 'wear', slot: 'body', phases: NA },
  { id: 'vestido', cat: 'Ropa', emoji: '👗', name: 'Vestido', price: 35, kind: 'wear', slot: 'body', phases: NA },
  { id: 'kimono', cat: 'Ropa', emoji: '👘', name: 'Kimono', price: 40, kind: 'wear', slot: 'body', phases: NA },
  { id: 'chaleco', cat: 'Ropa', emoji: '🦺', name: 'Chaleco', price: 25, kind: 'wear', slot: 'body', phases: NA },
  { id: 'bata', cat: 'Ropa', emoji: '🥼', name: 'Bata de laboratorio', price: 30, kind: 'wear', slot: 'body', phases: NA },
  { id: 'abrigo', cat: 'Ropa', emoji: '🧥', name: 'Abrigo', price: 35, kind: 'wear', slot: 'body', phases: NA, minLevel: 3 },
  { id: 'banador', cat: 'Ropa', emoji: '🩱', name: 'Traje de baño', price: 30, kind: 'wear', slot: 'body', phases: NA },
  { id: 'short', cat: 'Ropa', emoji: '🩳', name: 'Short', price: 20, kind: 'wear', slot: 'body', phases: NA },
  { id: 'karate', cat: 'Deporte', emoji: '🥋', name: 'Karategui', price: 35, kind: 'wear', slot: 'body', phases: NA },
  { id: 'corbata', cat: 'Cuello', emoji: '👔', name: 'Corbata', price: 20, kind: 'wear', slot: 'neck', phases: NA },
  { id: 'collar', cat: 'Cuello', emoji: '📿', name: 'Collar', price: 25, kind: 'wear', slot: 'neck', phases: NA },
  { id: 'medalla', cat: 'Cuello', emoji: '🏅', name: 'Medalla', price: 30, kind: 'wear', slot: 'neck', phases: ALL },
  { id: 'cascabel', cat: 'Cuello', emoji: '🔔', name: 'Cascabel', price: 15, kind: 'wear', slot: 'neck', phases: ALL },
  { id: 'globo', cat: 'En la mano', emoji: '🎈', name: 'Globo', price: 10, kind: 'wear', slot: 'hand', phases: ALL },
  { id: 'paleta', cat: 'En la mano', emoji: '🍭', name: 'Paleta', price: 10, kind: 'wear', slot: 'hand', phases: ALL },
  { id: 'regalo', cat: 'En la mano', emoji: '🎁', name: 'Regalo', price: 20, kind: 'wear', slot: 'hand', phases: ALL },
  { id: 'rosa', cat: 'San Valentín', emoji: '🌹', name: 'Rosa', price: 20, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'palomitas_h', cat: 'Cine', emoji: '🍿', name: 'Cubo de palomitas', price: 15, kind: 'wear', slot: 'hand', phases: ALL },
  { id: 'camara', cat: 'Cine', emoji: '🎥', name: 'Cámara de cine', price: 30, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'trofeo', cat: 'Cine', emoji: '🏆', name: 'Trofeo', price: 60, kind: 'wear', slot: 'hand', phases: NA, minLevel: 5 },
  { id: 'varita', cat: 'Fantasía', emoji: '🪄', name: 'Varita mágica', price: 35, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'espada', cat: 'Fantasía', emoji: '🗡️', name: 'Espada de juguete', price: 40, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'guitarra', cat: 'Fiesta', emoji: '🎸', name: 'Guitarra', price: 40, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'microfono', cat: 'Fiesta', emoji: '🎤', name: 'Micrófono', price: 30, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'paraguas', cat: 'En la mano', emoji: '☂️', name: 'Paraguas', price: 25, kind: 'wear', slot: 'hand', phases: NA },
  { id: 'bg_espacio', cat: 'Fondos', emoji: '🚀', name: 'Espacio', price: 60, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#0b0b2a,#2b1b5e)' },
  { id: 'bg_atardecer', cat: 'Fondos', emoji: '🌇', name: 'Atardecer', price: 50, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#ff9f43,#ff4f8b)' },
  { id: 'bg_bosque', cat: 'Fondos', emoji: '🌲', name: 'Bosque', price: 50, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#9be39f,#2e8b57)' },
  { id: 'bg_nieve', cat: 'Navidad', emoji: '❄️', name: 'Nieve', price: 55, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#cfe8ff,#ffffff)' },
  { id: 'bg_corazones', cat: 'San Valentín', emoji: '💗', name: 'Corazones', price: 55, kind: 'wear', slot: 'bg', phases: ALL, css: 'linear-gradient(#ff9fb8,#ffd1e8)' },
  { id: 'bg_arcoiris', cat: 'Fondos', emoji: '🌈', name: 'Arcoíris', price: 70, kind: 'wear', slot: 'bg', phases: ALL, minLevel: 4, css: 'linear-gradient(#ff9aa2,#ffdf9a,#b5ead7,#a0c4ff)' },
]
export const item = (id) => SHOP.find((i) => i.id === id)

export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 25)) + 1
export const xpForLevel = (l) => 25 * (l - 1) * (l - 1)
export const stageOf = (level) => (level >= 15 ? 'adulto' : level >= 5 ? 'nino' : 'bebe')
export const petStage = (p) => stageOf(levelOf(p.xp))
// Convierte cualquier forma de fecha guardada (número, texto, Timestamp de Firestore) a milisegundos. null = sin fecha.
export const toMs = (v) => (v == null || v === false ? null : typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : typeof v === 'string' ? (Date.parse(v) || 0) : typeof v.toMillis === 'function' ? v.toMillis() : typeof v.seconds === 'number' ? v.seconds * 1000 : 0)
export const dayOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const rid = () => Math.random().toString(36).slice(2, 9)

// ¿Puede este pet usar este objeto?  Devuelve null si sí, o el motivo.
export function whyNot(it, pet) {
  const stage = pet.stage || petStage(pet)
  if (it.phases && !it.phases.includes(stage)) return it.phases.length === 1 ? `Solo etapa ${STAGE_LABEL[it.phases[0]].toLowerCase()}` : `No disponible en etapa ${STAGE_LABEL[stage].toLowerCase()}`
  if (it.species && !it.species.includes(pet.type)) return 'No es para esta especie'
  if (it.rarities && !it.rarities.includes(petDef(pet.type).rarity)) return `Solo ${it.rarities.map((r) => RARITY[r].label.toLowerCase()).join('/')}s`
  return null
}
export const familyLevel = (g) => Math.max(1, ...g.pets.filter((p) => !p.gradAt).map((p) => levelOf(p.xp)))

export const initialGame = (now = Date.now()) => ({
  v: 3, coins: 50, bank: 0, pets: [], activeId: null, inv: {}, owned: [], days: {}, log: [],
  eggs: [{ id: rid(), rarity: 'comun', hatchAt: null, name: '', from: 'inicial' }],
  claims: { streakAt: null, hito: 0 }, daily: { date: '', xp: 0, claimed: false },
  limits: { date: '', care: 0, pet: 0, play: 0, sleep: 0, mini: 0, brush: 0 }, missions: { date: '', progress: {}, claimed: {} },
  stats: { feeds: 0, baths: 0, pets: 0, games: 0 },
})

// Migra estados antiguos (v2) sin perder nada.
export function normalizeGame(g, now = Date.now()) {
  const base = initialGame(now)
  for (const k of ['log', 'daily', 'limits', 'missions', 'stats', 'claims']) if (!g[k]) g[k] = base[k]
  g.bank = g.bank || 0; g.inv = g.inv || {}; g.owned = g.owned || []; g.days = g.days || {}; g.eggs = g.eggs || []; g.pets = g.pets || []
  for (const p of g.pets) {
    if (!p.needs) {
      const dh = Math.max(0, 100 - ((now - (p.fed || now)) / H) * 4), dc = Math.max(0, 100 - ((now - (p.clean || now)) / H) * 3)
      p.needs = { hunger: { v: dh, at: now }, hygiene: { v: dc, at: now }, energy: { v: 100, at: now }, fun: { v: 80, at: now } }
    }
    p.stage = p.stage || petStage(p); p.sleeping = p.sleeping || null; p.lastPet = p.lastPet || 0
  }
  // Huevos con datos antiguos o raros: nunca deben quedar atascados.
  g.eggs = g.eggs.map((e) => ({ ...e, rarity: RARITY[e.rarity] ? e.rarity : 'comun', name: e.name || '', hatchAt: toMs(e.hatchAt) }))
  g.v = 3
  return g
}

/* ---------- necesidades ---------- */
export function needsNow(pet, now, mul = 1) {
  const rate = DECAY[pet.stage || petStage(pet)]
  const out = {}
  for (const n of NEEDS) {
    const { v, at } = pet.needs[n]; const hrs = Math.max(0, (now - at) / H)
    let val
    if (pet.sleeping) val = n === 'energy' ? v + SLEEP_GAIN * (pet.sleeping.bonus ? 1.25 : 1) * hrs : v - rate[n] * 0.5 * mul * hrs
    else val = v - rate[n] * mul * hrs
    out[n] = Math.max(0, Math.min(100, Math.round(val)))
  }
  return out
}
export function settle(pet, now, mul = 1) {
  const cur = needsNow(pet, now, mul)
  for (const n of NEEDS) pet.needs[n] = { v: cur[n], at: now }
}
export function moodOf(pet, now, mul = 1) {
  const n = needsNow(pet, now, mul)
  const lowest = NEEDS.reduce((a, b) => (n[a] <= n[b] ? a : b))
  if (pet.sleeping) return { mood: 'sleep', lowest, needs: n }
  if (n[lowest] < 25) return { mood: 'sad', lowest, needs: n }
  const avg = NEEDS.reduce((s, k) => s + n[k], 0) / 4
  return { mood: avg >= 70 ? 'happy' : 'neutral', lowest, needs: n }
}

/* ---------- registro de hitos ---------- */
export function addLog(g, k, by, now, x = {}) { g.log.unshift({ t: now, by: by || null, k, ...x }); g.log = g.log.slice(0, 60) }

/* ---------- límites diarios ---------- */
export function useLimit(g, key, max, now) {
  const d = dayOf(now)
  if (g.limits.date !== d) g.limits = { date: d, care: 0, pet: 0, play: 0, sleep: 0, mini: 0, brush: 0 }
  if ((g.limits[key] || 0) >= max) return false
  g.limits[key] = (g.limits[key] || 0) + 1; return true
}

/* ---------- misiones diarias ---------- */
export const MISSION_POOL = [
  { id: 'feed', key: 'feed', goal: 1, label: 'Dar de comer a la mascota', coins: 12, xp: 8 },
  { id: 'bath', key: 'bath', goal: 1, label: 'Bañar a la mascota', coins: 12, xp: 8 },
  { id: 'pet', key: 'pet', goal: 5, label: 'Acariciar a la mascota 5 veces', coins: 10, xp: 6 },
  { id: 'play', key: 'play', goal: 1, label: 'Jugar un minijuego', coins: 15, xp: 10 },
  { id: 'sleep', key: 'sleep', goal: 1, label: 'Acostar a dormir a la mascota', coins: 10, xp: 6 },
  { id: 'rate', key: 'rate', goal: 1, label: 'Puntuar una película o serie', coins: 20, xp: 12 },
  { id: 'watch', key: 'watch', goal: 1, label: 'Registrar algo que vieron', coins: 20, xp: 12 },
  { id: 'question', key: 'question', goal: 1, label: 'Responder la pregunta del día', coins: 15, xp: 10 },
  { id: 'event', key: 'event', goal: 1, label: 'Cumplir un plan del calendario', coins: 25, xp: 15 },
  { id: 'brush', key: 'brush', goal: 1, label: 'Cepillar los dientes de la mascota', coins: 12, xp: 8 },
  { id: 'game', key: 'game', goal: 1, label: 'Jugar una partida juntos', coins: 20, xp: 12 },
]
export function missionsFor(dateStr) {
  let h = 0; for (const c of dateStr) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const pool = [...MISSION_POOL]; const out = []
  while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]) }
  return out
}
export function track(g, key, now, n = 1) {
  const d = dayOf(now)
  if (g.missions.date !== d) g.missions = { date: d, progress: {}, claimed: {} }
  g.missions.progress[key] = (g.missions.progress[key] || 0) + n
}
export function claimMission(g, id, now, by) {
  const d = dayOf(now); const m = missionsFor(d).find((x) => x.id === id)
  if (!m || g.missions.date !== d) throw new Error('La misión no está disponible.')
  if (g.missions.claimed[id]) throw new Error('Ya reclamaron esta misión.')
  if ((g.missions.progress[m.key] || 0) < m.goal) throw new Error('Todavía no la completan.')
  g.missions.claimed[id] = true
  applyReward(g, { xp: m.xp, coins: m.coins }, now, by); addLog(g, 'mission', by, now, { txt: m.label })
}
export const DAILY_XP_GOAL = 100
export function claimDaily(g, now, by) {
  if (g.daily.date !== dayOf(now) || g.daily.xp < DAILY_XP_GOAL) throw new Error('Aún no llegan a 100 XP hoy.')
  if (g.daily.claimed) throw new Error('Ya reclamaron el bono de hoy.')
  g.daily.claimed = true; g.coins += 30; addLog(g, 'daily', by, now)
}

/* ---------- recompensas, niveles y evolución ---------- */
export const activePet = (g) => g.pets.find((p) => p.id === g.activeId && !p.gradAt) || null
export function applyReward(g, { xp = 0, coins = 0 }, now, by) {
  const pet = activePet(g)
  const d = dayOf(now)
  if (g.daily.date !== d) g.daily = { date: d, xp: 0, claimed: false }
  g.daily.xp += xp
  if (pet && xp) {
    const before = levelOf(pet.xp); pet.xp += xp; const after = levelOf(pet.xp)
    if (after > before) { coins += 20 * (after - before); addLog(g, 'level', by, now, { pet: pet.name, level: after }) }
    syncStage(g, pet, now, by)
  } else if (xp) g.bank = (g.bank || 0) + xp
  g.coins += coins
}
// Si cambió la etapa: registra el hito y devuelve al inventario lo que ya no es compatible.
export function syncStage(g, pet, now, by) {
  const st = petStage(pet)
  const returned = []
  if (pet.stage !== st) {
    pet.stage = st; addLog(g, 'evolve', by, now, { pet: pet.name, stage: st })
  }
  for (const s of SLOTS) { const it = item(pet[s]); if (it && whyNot(it, pet)) { returned.push(it.id); pet[s] = null } }
  if (returned.length) addLog(g, 'unequip', by, now, { pet: pet.name, items: returned })
  return returned
}

/* ---------- acciones ---------- */
const getPet = (g, id) => { const p = g.pets.find((x) => x.id === id && !x.gradAt); if (!p) throw new Error('Esa mascota no está disponible.'); return p }
export function doFeed(g, petId, itemId, c) {
  const p = getPet(g, petId); if (p.sleeping) throw new Error('Está durmiendo. ¡Déjenla descansar!')
  let amount = 30
  if (itemId) { if (!g.inv[itemId]) throw new Error('Se les acabó.'); g.inv[itemId]--; amount = item(itemId).amount }
  settle(p, c.now, c.mul); p.needs.hunger.v = Math.min(100, p.needs.hunger.v + amount)
  g.stats.feeds++; track(g, 'feed', c.now); addLog(g, 'feed', c.by, c.now, { pet: p.name })
  const xp = useLimit(g, 'care', 3, c.now) ? 5 : 0; if (xp) applyReward(g, { xp }, c.now, c.by)
  return { amount, xp }
}
export function doBath(g, petId, itemId, c) {
  const p = getPet(g, petId); if (p.sleeping) throw new Error('Está durmiendo. ¡Déjenla descansar!')
  let amount = 30
  if (itemId) { if (!g.inv[itemId]) throw new Error('Se les acabó.'); g.inv[itemId]--; amount = item(itemId).amount }
  settle(p, c.now, c.mul); p.needs.hygiene.v = Math.min(100, p.needs.hygiene.v + amount)
  g.stats.baths++; track(g, 'bath', c.now); addLog(g, 'bath', c.by, c.now, { pet: p.name })
  const xp = useLimit(g, 'care', 3, c.now) ? 5 : 0; if (xp) applyReward(g, { xp }, c.now, c.by)
  return { amount, xp }
}
export function doPet(g, petId, c) {
  const p = getPet(g, petId); settle(p, c.now, c.mul)
  p.needs.fun.v = Math.min(100, p.needs.fun.v + 5); p.lastPet = c.now
  g.stats.pets++; track(g, 'pet', c.now)
  const xp = useLimit(g, 'pet', 5, c.now) ? 2 : 0; if (xp) applyReward(g, { xp }, c.now, c.by)
  return { xp }
}
export function doBrush(g, petId, c) {
  const p = getPet(g, petId); if (p.sleeping) throw new Error('Está durmiendo. ¡Déjenla descansar!')
  settle(p, c.now, c.mul); p.needs.hygiene.v = Math.min(100, p.needs.hygiene.v + 10); p.brushedAt = c.now
  g.stats.brushes = (g.stats.brushes || 0) + 1; track(g, 'brush', c.now); addLog(g, 'brush', c.by, c.now, { pet: p.name })
  const xp = useLimit(g, 'brush', 1, c.now) ? 5 : 0; if (xp) applyReward(g, { xp }, c.now, c.by)
  return { xp }
}
export function renamePet(g, petId, name, c) {
  const n = (name || '').replace(/\s+/g, ' ').trim().slice(0, 10).trim()
  if (!n) throw new Error('El nombre no puede estar vacío.')
  const p = g.pets.find((x) => x.id === petId); if (!p) throw new Error('Esa mascota no existe.')
  const old = p.name; p.name = n; if (old !== n) addLog(g, 'rename', c.by, c.now, { pet: n, from: old })
  return { name: n }
}
export const MIN_SLEEP_MS = 20 * 60000
export function doSleep(g, petId, c) {
  const p = getPet(g, petId); settle(p, c.now, c.mul)
  if (!p.sleeping) { const bonus = !!p.brushedAt && c.now - p.brushedAt < 12 * H; p.sleeping = { since: c.now, bonus }; return { sleeping: true, bonus } }
  const slept = c.now - p.sleeping.since; p.sleeping = null
  if (slept >= MIN_SLEEP_MS) { track(g, 'sleep', c.now); addLog(g, 'wake', c.by, c.now, { pet: p.name }); const xp = useLimit(g, 'sleep', 1, c.now) ? 5 : 0; if (xp) applyReward(g, { xp }, c.now, c.by); return { sleeping: false, slept, xp } }
  return { sleeping: false, slept, xp: 0 }
}
export const miniCoins = (game, score) => game === 'memory' ? (score <= 8 ? 30 : score <= 12 ? 20 : score <= 18 ? 12 : 6) : Math.min(30, Math.max(0, score) * 2)
export function finishMini(g, petId, game, score, c) {
  const p = getPet(g, petId); settle(p, c.now, c.mul)
  const full = useLimit(g, 'mini', 3, c.now)
  const coins = Math.round(miniCoins(game, score) * (full ? 1 : 0.25))
  p.needs.fun.v = Math.min(100, p.needs.fun.v + 25); p.needs.energy.v = Math.max(0, p.needs.energy.v - 10)
  g.stats.games++; track(g, 'play', c.now); addLog(g, 'play', c.by, c.now, { pet: p.name, game, score })
  const xp = useLimit(g, 'play', 2, c.now) ? 10 : 0
  applyReward(g, { xp, coins }, c.now, c.by)
  return { coins, xp, reduced: !full }
}

/* ---------- huevos ---------- */
export const rollRarity = (r = Math.random()) => (r < 0.7 ? 'comun' : r < 0.95 ? 'raro' : 'legendario')
export function addEgg(g, from, r) { g.eggs.push({ id: rid(), rarity: rollRarity(r), hatchAt: null, name: '', from }) }
export function incubate(g, eggId, name, c) {
  const e = g.eggs.find((x) => x.id === eggId); if (!e || toMs(e.hatchAt) != null) throw new Error('Ese huevo no se puede incubar.')
  const n = (name || '').trim().slice(0, 10); if (n.length < 1) throw new Error('Ponle un nombre a tu mascota.')
  e.name = n; e.startedAt = c.now; e.hatchAt = c.now + (c.hatchMs ?? RARITY[e.rarity].hours * H)
}
export function hatch(g, eggId, c, r = Math.random(), name = '') {
  if (g.pets.filter((p) => !p.gradAt).length >= MAX_PETS) throw new Error('Ya tienen 10 mascotas. Gradúen a una adulta para hacer espacio.')
  const e = g.eggs.find((x) => x.id === eggId)
  const at = toMs(e?.hatchAt)
  if (at == null || at > c.now) throw new Error('Todavía no está listo.')
  const pool = PETS.filter((p) => p.rarity === e.rarity); const t = pool[Math.floor(r * pool.length) % pool.length]
  const pet = { id: rid(), type: t.id, name: ((name || e.name || t.name) + '').trim().slice(0, 10), xp: g.bank || 0, adoptedAt: c.now, gradAt: null, head: null, face: null, body: null, neck: null, hand: null, bg: null,
    needs: Object.fromEntries(NEEDS.map((n) => [n, { v: 90, at: c.now }])), stage: 'bebe', sleeping: null, lastPet: 0 }
  g.bank = 0; g.pets.push(pet); g.eggs = g.eggs.filter((x) => x.id !== eggId)
  if (!g.activeId) g.activeId = pet.id
  pet.stage = petStage(pet); addLog(g, 'hatch', c.by, c.now, { pet: pet.name, type: t.id })
  return pet
}
export function graduate(g, id, c) {
  const p = g.pets.find((x) => x.id === id); if (!p || levelOf(p.xp) < 15) throw new Error('Solo pueden graduarse las mascotas adultas (nivel 15+).')
  p.gradAt = c.now; p.sleeping = null
  if (g.activeId === id) g.activeId = g.pets.find((x) => !x.gradAt)?.id || null
  addLog(g, 'graduate', c.by, c.now, { pet: p.name })
}

/* ---------- tienda e inventario compartido ---------- */
export function buy(g, id, c) {
  const it = item(id); if (!it) throw new Error('Objeto desconocido.')
  if (it.minLevel && familyLevel(g) < it.minLevel) throw new Error(`Se desbloquea cuando una mascota llegue al nivel ${it.minLevel}.`)
  if (g.coins < it.price) throw new Error('No les alcanzan las monedas.')
  if (it.kind === 'wear') { if (g.owned.includes(id)) throw new Error('Ya lo tienen.'); g.owned.push(id) } else g.inv[id] = (g.inv[id] || 0) + 1
  g.coins -= it.price; addLog(g, 'buy', c.by, c.now, { item: id })
}
export function equip(g, petId, id) {
  const p = getPet(g, petId); const it = item(id)
  if (!it || it.kind !== 'wear' || !g.owned.includes(id)) throw new Error('Primero tienen que comprarlo.')
  if (p[it.slot] === id) { p[it.slot] = null; return }
  const why = whyNot(it, p); if (why) throw new Error(why)
  p[it.slot] = id
}

/* ---------- racha / armonía ---------- */
export const revealed = (e, uids) => uids.length > 1 && uids.every((u) => e.ratings?.[u] > 0)
export function harmony(entries, uids) {
  const seen = entries.filter((e) => e.status === 'visto' && revealed(e, uids))
  const m = seen.filter((e) => Math.abs(e.ratings[uids[0]] - e.ratings[uids[1]]) <= 1)
  return { total: seen.length, matches: m.length, pct: seen.length ? Math.round((m.length / seen.length) * 100) : 0 }
}
export function streakInfo(days = {}, nowMs = Date.now()) {
  const d = new Date(nowMs); let n = 0
  if (!days[dayOf(d.getTime())]) d.setDate(d.getDate() - 1)
  while (days[dayOf(d.getTime())]) { n++; d.setDate(d.getDate() - 1) }
  d.setDate(d.getDate() + 1)
  return { n, start: n ? dayOf(d.getTime()) : null }
}
export function claimEgg(g, key, startDate, c, r) {
  addEgg(g, key, r); if (key === 'streak') g.claims.streakAt = startDate; else g.claims.hito = (g.claims.hito || 0) + 1
  addLog(g, 'egg', c.by, c.now, { from: key })
}
