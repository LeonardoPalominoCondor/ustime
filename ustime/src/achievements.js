import { revealed } from './game.js'
// Puntuación en escala 10. Se cuentan solo títulos con ambas notas reveladas.
export function computeAchievements(entries, uids, events = []) {
  const seen = entries.filter((e) => e.status === 'visto')
  const series = seen.filter((e) => e.type === 'tv')
  const both = seen.filter((e) => revealed(e, uids))
  const diff = (e) => Math.abs(e.ratings[uids[0]] - e.ratings[uids[1]])
  const same = both.filter((e) => diff(e) === 0)
  const opposite = both.filter((e) => diff(e) >= 6)
  const gems = both.filter((e) => uids.every((u) => e.ratings[u] === 10))
  const matches = seen.filter((e) => e.matchAwarded)
  const cine = seen.filter((e) => e.cine)
  const done = events.filter((e) => e.done)
  const genres = new Set(seen.flatMap((e) => e.genres || []))
  const perMonth = {}
  seen.forEach((e) => { const k = (e.watchedDate || '').slice(0, 7); if (k) perMonth[k] = (perMonth[k] || 0) + 1 })
  const bestMonth = Math.max(0, ...Object.values(perMonth))
  const A = (id, emoji, title, desc, value, goal) => ({ id, emoji, title, desc, value: Math.min(value, goal), goal, done: value >= goal })
  return [
    A('primera', '🎟️', 'Primera función', 'Registren su primer título juntos', seen.length, 1),
    A('diez', '🍿', 'Diez y contando', 'Vean 10 títulos', seen.length, 10),
    A('cincuenta', '🎬', 'Medio centenar', 'Vean 50 títulos', seen.length, 50),
    A('cien', '🏆', 'Cinéfilos de leyenda', 'Vean 100 títulos', seen.length, 100),
    A('series3', '📺', 'Maratoneros', 'Terminen 3 series', series.length, 3),
    A('series10', '🛋️', 'Adictos a las series', 'Terminen 10 series', series.length, 10),
    A('criticos', '🧐', 'Críticos de sofá', 'Puntúen los dos 10 títulos', both.length, 10),
    A('match1', '💘', '¡Primer Match!', 'Coincidan (±1 punto) en un título', matches.length, 1),
    A('match10', '💞', 'Sincronizados', 'Consigan 10 Match', matches.length, 10),
    A('gemelas', '👯', 'Almas gemelas', 'Pongan exactamente la misma nota en 5 títulos', same.length, 5),
    A('opuestos', '⚡', 'Gustos opuestos', 'Discrepen por 3+ iconos en 3 títulos', opposite.length, 3),
    A('joyita', '💎', 'Joyita compartida', 'Pónganle 10/10 los dos a un título', gems.length, 1),
    A('cine1', '🎦', 'Cita de cine', 'Vayan una vez al cine', cine.length, 1),
    A('cine5', '🍫', 'Clientes frecuentes', 'Vayan 5 veces al cine', cine.length, 5),
    A('citas1', '📸', 'Recuerdo guardado', 'Completen su primera cita con foto', done.length, 1),
    A('citas10', '🗓️', 'Pareja de agenda', 'Completen 10 citas', done.length, 10),
    A('generos', '🧭', 'Sin fronteras', 'Vean 8 géneros distintos', genres.size, 8),
    A('mes', '🔥', 'Mes de locura', 'Vean 8 títulos en un solo mes', bestMonth, 8),
  ]
}
