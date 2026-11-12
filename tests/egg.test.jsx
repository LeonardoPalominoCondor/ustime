// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
vi.mock('../src/firebase.js', () => ({ auth: {}, db: {}, googleProvider: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), collection: () => ({}), onSnapshot: () => () => {}, runTransaction: vi.fn(), setDoc: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), getDoc: vi.fn(), arrayUnion: vi.fn(), serverTimestamp: () => 0, deleteField: () => 0 }))
vi.mock('../src/db.js', () => ({ saveAnswer: vi.fn() }))
import { Ctx } from '../src/ctx.js'
import * as G from '../src/gamecore.js'
import { PetScreen } from '../src/pet.jsx'
const T = Date.now(); const C = (now = T) => ({ now, by: 'A', mul: 1 })
const mk = (egg) => G.normalizeGame({ coins: 50, pets: [], eggs: [egg], owned: [], inv: {}, days: {}, claims: { streakAt: null, hito: 0 }, care: { date: '', count: 0 } }, T)
beforeEach(() => cleanup())

describe('huevos con datos raros o de versiones anteriores (bug: ventana vacía sin botón)', () => {
  const cases = { 'hatchAt como Timestamp de Firestore': { seconds: 1, nanoseconds: 0 }, 'hatchAt como texto': '2026-10-17T10:00:00Z', 'hatchAt = true': true, 'hatchAt = NaN-like': 'basura' }
  for (const [label, hatchAt] of Object.entries(cases)) {
    it(`${label}: siempre muestra el botón Eclosionar`, () => {
      const g = mk({ id: 'e', rarity: 'comun', hatchAt, from: 'inicial' })
      const ctx = { user: { uid: 'A' }, profile: {}, couple: { id: 'C', members: ['A'], game: g }, members: {}, entries: [], events: [], uids: ['A'], game: g, go() {}, openTitle() {}, openEvent() {}, openMail() {}, unread: 0 }
      render(<Ctx.Provider value={ctx}><PetScreen /></Ctx.Provider>)
      fireEvent.click(screen.getByText('Familia')); fireEvent.click(document.querySelector('.eggtile'))
      expect(screen.getByText(/Eclosionar/)).toBeTruthy(); expect(screen.getByText(/Tu huevo está listo/)).toBeTruthy()
    })
  }
  it('rarity inexistente se corrige a común y no rompe la pantalla', () => {
    const g = mk({ id: 'e', hatchAt: T - 5000 }); expect(g.eggs[0].rarity).toBe('comun')
  })
  it('núcleo: toMs entiende todas las formas y se puede eclosionar', () => {
    expect(G.toMs(null)).toBeNull(); expect(G.toMs(123)).toBe(123); expect(G.toMs({ seconds: 2 })).toBe(2000); expect(G.toMs({ toMillis: () => 7 })).toBe(7); expect(G.toMs('x')).toBe(0)
    const g = mk({ id: 'e', rarity: 'comun', hatchAt: { seconds: 1 } }); const p = G.hatch(g, 'e', C(), 0, 'Nube'); expect(p.name).toBe('Nube'); expect(g.pets).toHaveLength(1)
  })
  it('un huevo ya incubado no se puede incubar otra vez, y uno futuro no eclosiona', () => {
    const g = mk({ id: 'e', rarity: 'comun', hatchAt: T + 1000 })
    expect(() => G.incubate(g, 'e', 'X', C())).toThrow(); expect(() => G.hatch(g, 'e', C())).toThrow(/Todavía/)
  })
  it('sin nombre se puede nombrar justo al eclosionar (máx. 10 letras)', () => {
    const g = mk({ id: 'e', rarity: 'comun', hatchAt: T - 1 }); const p = G.hatch(g, 'e', C(), 0, 'NombreMuyLargoXX'); expect(p.name).toBe('NombreMuyL')
  })
})
