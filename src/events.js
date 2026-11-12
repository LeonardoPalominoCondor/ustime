// Lógica pura de eventos: categorías, repeticiones, recordatorios, fusión con la línea de tiempo.
export const CATEGORIES = [
  { id: 'cita', label: 'Cita', icon: '💕', color: '#FF4F8B' },
  { id: 'salida', label: 'Salida', icon: '🍽️', color: '#FF9F43' },
  { id: 'aniversario', label: 'Aniversario', icon: '🎂', color: '#FFC857', special: true, repeat: 'yearly' },
  { id: 'cine', label: 'Cine', icon: '🎬', color: '#9B7BFF' },
  { id: 'viaje', label: 'Viaje', icon: '✈️', color: '#4DD4E6' },
  { id: 'celebracion', label: 'Celebración', icon: '🎉', color: '#FF6B6B', special: true },
  { id: 'hogar', label: 'En casa', icon: '🏡', color: '#5BD6A0' },
  { id: 'deporte', label: 'Actividad', icon: '🚴', color: '#8BD450' },
  { id: 'otro', label: 'Otro', icon: '⭐', color: '#A79DB8' },
]
export const COLORS = ['#FF4F8B', '#FF9F43', '#FFC857', '#8BD450', '#5BD6A0', '#4DD4E6', '#6BA8FF', '#9B7BFF', '#E27BFF', '#FF6B6B']
export const REMINDERS = [[null, 'Sin recordatorio'], [0, 'A la hora'], [15, '15 min antes'], [60, '1 hora antes'], [1440, '1 día antes'], [10080, '1 semana antes']]
export const STATUS = { planned: 'Planeado', done: 'Cumplido', cancelled: 'Cancelado' }
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

// Compatibilidad con eventos creados en la v2 (campo `photo`, `kind`, `done`).
export function normalizeEvent(e) {
  const cat = e.categoryId ? catOf(e.categoryId) : CATEGORIES.find((c) => c.label === e.kind) || catOf('otro')
  const photos = e.photos || (e.photo ? [{ id: 'legacy', data: e.photo, at: e.doneAt || 0 }] : [])
  return {
    ...e, categoryId: cat.id, icon: e.icon || cat.icon, color: e.color || cat.color, description: e.description || '',
    status: e.status || (e.done ? 'done' : 'planned'), photos, repeat: e.repeat || cat.repeat || null,
  }
}
export const eventPhotos = (e) => normalizeEvent(e).photos

const pad = (n) => String(n).padStart(2, '0')
const toYmd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
// Ocurrencias de un evento dentro de [from,to] (strings YYYY-MM-DD). Los anuales se repiten cada año.
export function occurrences(events, from, to) {
  const out = []
  for (const raw of events) {
    const e = normalizeEvent(raw)
    if (e.repeat === 'yearly') {
      const [y0, m0, d0] = e.date.split('-').map(Number)
      for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) {
        if (y < y0) continue
        const date = toYmd(y, m0 - 1, d0)
        if (date >= from && date <= to) out.push({ ...e, date, base: e.date, years: y - y0, key: e.id + '@' + date })
      }
    } else if (e.date >= from && e.date <= to) out.push({ ...e, key: e.id })
  }
  return out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
}

// Recordatorios vencidos (para avisos dentro de la app). `dismissed` = Set de claves ya mostradas.
export function dueReminders(events, nowMs, dismissed = new Set()) {
  const d = new Date(nowMs)
  const from = toYmd(d.getFullYear(), d.getMonth(), d.getDate())
  const end = new Date(nowMs + 8 * 864e5)
  const out = []
  for (const e of occurrences(events, from, toYmd(end.getFullYear(), end.getMonth(), end.getDate()))) {
    if (e.reminder == null || e.status !== 'planned') continue
    const [h, m] = (e.time || '09:00').split(':').map(Number)
    const [y, mo, da] = e.date.split('-').map(Number)
    const start = new Date(y, mo - 1, da, h, m).getTime()
    const fire = start - e.reminder * 60000
    const k = e.key + '|' + e.reminder
    if (nowMs >= fire && nowMs < start + 3 * 36e5 && !dismissed.has(k)) out.push({ ...e, start, rkey: k })
  }
  return out
}

// Línea de tiempo unificada: títulos vistos + eventos. Un evento vinculado a una película vista el mismo día se fusiona (sin duplicados).
export function buildTimeline(entries, events, todayStr) {
  const items = []
  const seenKeys = new Map()
  entries.filter((e) => e.status === 'visto').forEach((e) => {
    const it = { kind: 'title', key: 'e_' + e.id, date: e.watchedDate || '', entry: e, photos: [], title: e.title, cat: e.type === 'tv' ? 'serie' : 'pelicula' }
    items.push(it); seenKeys.set(e.id + '|' + e.watchedDate, it)
  })
  const upcoming = []
  for (const raw of events) {
    const ev = normalizeEvent(raw)
    if (ev.status === 'cancelled') continue
    const link = ev.movie ? `${ev.movie.type}_${ev.movie.tmdbId}|${ev.date}` : null
    if (link && seenKeys.has(link)) { const t = seenKeys.get(link); t.photos = ev.photos; t.event = ev; continue }
    const it = { kind: 'event', key: 'v_' + ev.id, date: ev.date, event: ev, photos: ev.photos, title: ev.title, cat: ev.categoryId }
    ;(ev.date > todayStr && ev.status !== 'done' ? upcoming : items).push(it)
  }
  const sort = (a, b) => b.date.localeCompare(a.date)
  return { past: items.sort(sort), upcoming: upcoming.sort((a, b) => a.date.localeCompare(b.date)) }
}
