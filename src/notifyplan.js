// Planificador de notificaciones (puro). Lo usan: el servidor gratuito (scripts/notify.mjs), las pruebas y el panel 🛠.
import { occurrences } from './events.js'
import { normalizeGame, needsNow, toMs } from './gamecore.js'
import { ENGINES } from './games/engines.js'

export const DEFAULT_PREFS = { events: true, eggs: true, streak: true, pet: true, jar: true, games: true }
export const PREF_LABELS = { events: '📅 Planes y recordatorios', eggs: '🥚 Huevos (nuevo o listo)', streak: '🔥 Racha en peligro', pet: '🐾 Cuidados y actividades de la mascota', jar: '💌 Mensajes del frasco', games: '🎮 Te toca jugar' }
export const DEFAULT_TZ = 'America/Lima'

export function tzOffsetMs(epoch, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(new Date(epoch)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(epoch / 1000) * 1000
}
export function zonedEpoch(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = (time || '09:00').split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, mi); const off = tzOffsetMs(guess, tz); let t = guess - off; const off2 = tzOffsetMs(t, tz); if (off2 !== off) t = guess - off2; return t
}
export function localParts(epoch, tz) { const d = new Date(epoch + tzOffsetMs(epoch, tz)); return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() } }
const prevDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10) }
export function streakTz(days, today) { let n = 0, d = days[today] ? today : prevDay(today); while (days[d]) { n++; d = prevDay(d) } return n }
const when = (min) => (min === 0 ? 'Empieza ahora' : min < 60 ? `Empieza en ${min} min` : min < 1440 ? `Empieza en ${Math.round(min / 60)} h` : min < 10080 ? `Es en ${Math.round(min / 1440)} día(s)` : 'Es en una semana')

// users: { uid: { username, tz, prefs, tokens:[...] } }  ·  devuelve [{ key, kind, uids, title, body, url, tag }]
export function planNotifications({ now, couple, events = [], jar = [], games = [], users = {} }) {
  const out = [], notified = couple.notified || {}, members = couple.members || []
  const tzOf = (u) => users[u]?.tz || DEFAULT_TZ, nameOf = (u) => users[u]?.username || 'Tu pareja'
  const quiet = (u) => { const h = localParts(now, tzOf(u)).hour; return h >= 23 || h < 7 }
  const push = (kind, key, uids, title, body, { ignoreQuiet = false } = {}) => {
  const sent = notified[key]

  // Compatibilidad: los registros antiguos (números o true)
  // indican que el aviso ya fue procesado.
  if (sent && typeof sent !== 'object') return

  const to = uids.filter((u) =>
    !sent?.[u] &&
    users[u]?.tokens?.length &&
    (users[u].prefs?.[kind] ?? DEFAULT_PREFS[kind]) &&
    (ignoreQuiet || !quiet(u))
  )

  if (to.length) {
    out.push({ key, kind, uids: to, title, body, url: '/', tag: kind })
  }
}
  const lp = localParts(now, tzOf(members[0]))
  // 1 · Planes cercanos
  const from = localParts(now - 864e5, tzOf(members[0])).date, to = localParts(now + 8 * 864e5, tzOf(members[0])).date
  for (const e of occurrences(events, from, to)) {
    if (e.status !== 'planned') continue
    const start = zonedEpoch(e.date, e.time, tzOf(e.createdBy || members[0]))
    if (e.reminder != null) { if (now >= start - e.reminder * 60000 && now < start + 45 * 60000) push('events', `ev:${e.key}:${e.reminder}`, members, `${e.icon} ${e.title}`, `${when(e.reminder)}${e.time ? ' · ' + e.time : ''}`, { ignoreQuiet: true }) }
    else if (lp.date === e.date && lp.hour >= 9 && now < start + 3 * 36e5) push('events', `evday:${e.key}`, members, `${e.icon} Hoy: ${e.title}`, e.time ? `A las ${e.time}` : 'Tienen un plan hoy')
  }
  // 2 · Huevos y racha y mascota
  if (couple.game) {
    const g = normalizeGame(JSON.parse(JSON.stringify(couple.game)), now)
    for (const e of g.eggs) { const at = toMs(e.hatchAt)
      if (at != null && at <= now) push('eggs', `egg-ready:${e.id}`, members, '🐣 ¡Tu huevo está listo!', `${e.name || 'Tu huevo'} ya puede eclosionar`)
      if (at == null && ['streak', 'hito'].includes(e.from)) push('eggs', `egg-new:${e.id}`, members, '🥚 ¡Ganaron un huevo nuevo!', 'Pónganle nombre e incúbenlo') }
    if (!g.days[lp.date] && lp.hour >= 20 && lp.hour < 23) { const n = streakTz(g.days, lp.date); if (n >= 2) push('streak', `streak:${lp.date}`, members, '🔥 ¡Su racha está por perderse!', `Llevan ${n} días seguidos. Hagan algo juntos hoy para mantenerla`) }
    for (const pet of g.pets.filter((p) => !p.gradAt)) {
      // Alertas de necesidades mientras la mascota está despierta.
      if (!pet.sleeping && lp.hour >= 8 && lp.hour < 22) {
        const n = needsNow(pet, now)

        if (n.hunger < 20) {
          push('pet', `pet-hunger:${pet.id}:${lp.date}`, members,
            `🍽️ ${pet.name} tiene hambre`, '¡Denle de comer!')
        }

        if (n.hygiene < 15) {
          push('pet', `pet-clean:${pet.id}:${lp.date}`, members,
            `🛁 ${pet.name} necesita un baño`, '¡Necesita cuidados de higiene!')
        }

        if (n.energy < 20) {
          push('pet', `pet-energy:${pet.id}:${lp.date}`, members,
            `😴 ${pet.name} está cansada`, '¡Necesita descansar!')
        }

        if (n.fun < 20) {
          push('pet', `pet-fun:${pet.id}:${lp.date}`, members,
            `🎮 ${pet.name} está aburrida`, '¡Jueguen un rato con ella!')
        }
      }

      // Aviso cuando lleva más de 8 horas durmiendo.
      if (pet.sleeping) {
        const sleepSince = toMs(pet.sleeping.since)

        if (sleepSince != null && now - sleepSince >= 8 * 60 * 60 * 1000) {
          push('pet', `pet-sleep-too-long:${pet.id}:${sleepSince}`, members,
            `☀️ ¡${pet.name} lleva mucho tiempo durmiendo!`,
            'Despiértenla para continuar cuidándola.')
        }
      }
    }

        // 2.1 · Avisos de actividades entre Papi y Mami.
    const activityMessages = {
      feed: {
        title: (role, pet) => `🍽️ ${role} alimentó a ${pet}`,
        body: 'Le dio de comer.'
      },
      bath: {
        title: (role, pet) => `🛁 ${role} bañó a ${pet}`,
        body: 'Le dio un baño.'
      },
      brush: {
        title: (role, pet) => `🪥 ${role} cepilló a ${pet}`,
        body: 'Le dio sus cuidados dentales.'
      },
      pet: {
        title: (role, pet) => `💗 ${role} acarició a ${pet}`,
        body: 'Le dedicó un momento de cariño.'
      },
      play: {
        title: (role, pet) => `🎮 ${role} jugó con ${pet}`,
        body: 'Compartieron un minijuego.'
      },
      sleep: {
        title: (role, pet) => `🌙 ${role} acostó a ${pet}`,
        body: 'Es hora de descansar.'
      },
      wake: {
        title: (role, pet) => `☀️ ${role} despertó a ${pet}`,
        body: 'Ya terminó su descanso.'
      }
    }

    for (const entry of g.log || []) {
      const message = activityMessages[entry.k]
      const activityAt = toMs(entry.t)

      if (!message || !entry.by || activityAt == null) continue
      if (!members.includes(entry.by)) continue
      if (now - activityAt < 0 || now - activityAt > 24 * 60 * 60 * 1000) continue

      const recipient = members.find((uid) => uid !== entry.by)
      if (!recipient) continue

      const role = users[entry.by]?.petRole === 'papi'
        ? 'Papi'
        : users[entry.by]?.petRole === 'mami'
          ? 'Mami'
          : 'Tu pareja'

      const petName = entry.pet || 'la mascota'
      const key = `pet-action:${entry.by}:${entry.k}:${petName}:${activityAt}`

      push(
        'pet',
        key,
        [recipient],
        message.title(role, petName),
        message.body
      )
    }
  }
  // 3 · Frasco y partidas
  for (const n of jar) if (n.to && !n.readAt && now - n.createdAt < 3 * 864e5) push('jar', `jar:${n.id}`, [n.to], '💌 Nuevo mensaje en tu frasco', `${nameOf(n.from)} te dejó una nota. Léela cuando la necesites`)
  for (const g of games) if (g.status === 'playing' && g.turn && now - g.updatedAt > 60000 && now - g.updatedAt < 3 * 864e5) push('games', `turn:${g.id}:${g.rev || 0}`, [g.turn], '🎮 ¡Te toca jugar!', `${ENGINES[g.type]?.name || 'Partida'} contra ${nameOf(g.players.find((p) => p !== g.turn))}`)
  return out
}
