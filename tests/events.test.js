import { describe, it, expect } from 'vitest'
import { occurrences, dueReminders, buildTimeline, normalizeEvent } from '../src/events.js'

describe('eventos', () => {
  it('normaliza eventos antiguos (photo → photos, kind → categoría)', () => {
    const e = normalizeEvent({ id: '1', kind: 'Cita', date: '2026-06-01', done: true, photo: 'data:x' })
    expect(e.photos).toHaveLength(1); expect(e.status).toBe('done'); expect(e.categoryId).toBe('cita')
  })
  it('los aniversarios se repiten cada año', () => {
    const ev = [{ id: 'a', categoryId: 'aniversario', date: '2024-03-10', title: 'Nuestro día' }]
    const o = occurrences(ev, '2026-03-01', '2026-03-31'); expect(o).toHaveLength(1); expect(o[0].years).toBe(2)
    expect(occurrences(ev, '2023-03-01', '2023-03-31')).toHaveLength(0)
  })
  it('recordatorios: vencen a la hora indicada y no se repiten', () => {
    const ev = [{ id: 'r', date: '2026-06-01', time: '20:00', reminder: 60, status: 'planned', title: 'Cena' }]
    const at = (h, m) => new Date(2026, 5, 1, h, m).getTime()
    expect(dueReminders(ev, at(18, 59))).toHaveLength(0)
    const due = dueReminders(ev, at(19, 5)); expect(due).toHaveLength(1)
    expect(dueReminders(ev, at(19, 5), new Set([due[0].rkey]))).toHaveLength(0)
    expect(dueReminders([{ ...ev[0], status: 'done' }], at(19, 5))).toHaveLength(0)
  })
})

describe('línea de tiempo unificada', () => {
  const entry = { id: 'movie_1', type: 'movie', tmdbId: 1, status: 'visto', watchedDate: '2026-05-10', title: 'Peli' }
  it('incluye películas y eventos ordenados del más reciente al más antiguo', () => {
    const ev = [{ id: 'e1', title: 'Cena', date: '2026-05-20', categoryId: 'salida' }]
    const t = buildTimeline([entry], ev, '2026-06-01'); expect(t.past.map((x) => x.title)).toEqual(['Cena', 'Peli'])
  })
  it('fusiona el evento vinculado a una película del mismo día (sin duplicados) y conserva sus fotos', () => {
    const ev = [{ id: 'e2', title: 'Velada: Peli', date: '2026-05-10', categoryId: 'cine', movie: { type: 'movie', tmdbId: 1 }, photos: [{ id: 'p', data: 'x' }] }]
    const t = buildTimeline([entry], ev, '2026-06-01'); expect(t.past).toHaveLength(1); expect(t.past[0].photos).toHaveLength(1)
  })
  it('separa los planes futuros y oculta los cancelados', () => {
    const ev = [{ id: 'f', title: 'Viaje', date: '2026-07-01' }, { id: 'c', title: 'X', date: '2026-05-01', status: 'cancelled' }]
    const t = buildTimeline([], ev, '2026-06-01'); expect(t.upcoming).toHaveLength(1); expect(t.past).toHaveLength(0)
  })
})
