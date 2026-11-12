// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react'

vi.mock('../src/firebase.js', () => ({ auth: {}, db: {}, googleProvider: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), collection: () => ({}), onSnapshot: () => () => {}, runTransaction: vi.fn(), setDoc: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), getDoc: vi.fn(), arrayUnion: vi.fn(), serverTimestamp: () => 0, deleteField: () => 0 }))
vi.mock('../src/tmdb.js', async (orig) => ({ ...(await orig()), nowPlaying: () => Promise.resolve([]), search: () => Promise.resolve([]), details: () => Promise.resolve({}) }))
const dbm = vi.hoisted(() => ({ removePhoto: vi.fn(() => Promise.resolve()), replacePhoto: vi.fn(() => Promise.resolve()), addPhoto: vi.fn(() => Promise.resolve()), patchEvent: vi.fn(() => Promise.resolve()), removeEvent: vi.fn(() => Promise.resolve()), claimEventXp: vi.fn(() => Promise.resolve(false)), addEvent: vi.fn(), saveProfile: vi.fn(() => Promise.resolve()), compressImage: vi.fn(() => Promise.resolve('data:x')), saveEntry: vi.fn(), removeEntry: vi.fn(), entryId: (m) => `${m.type}_${m.tmdbId}`, saveAnswer: vi.fn(), MAX_PHOTOS: 10, addPhotos: vi.fn((c, e, d) => Promise.resolve(d.length)), addJarNote: vi.fn(), markJarRead: vi.fn(), removeJarNote: vi.fn(), addNote: vi.fn(), patchNote: vi.fn(), removeNote: vi.fn() }))
vi.mock('../src/db.js', () => dbm)

import { Ctx } from '../src/ctx.js'
import * as G from '../src/gamecore.js'
import { PetScreen } from '../src/pet.jsx'
import { Inicio } from '../src/home.jsx'
import { Agenda, EventDetail } from '../src/calendar.jsx'
import { Timeline } from '../src/screens.jsx'
import { ProfileEditor } from '../src/profile.jsx'

const T = Date.now()
const me = { username: 'Ana', avatar: '🐻', avBg: 'noche', frame: 'rosa', sticker: '', color: '#FF4F8B' }
const you = { username: 'Leo', avatar: '🦊', avBg: 'menta', frame: 'dorado', sticker: '✨', color: '#4DD4E6' }
function game(xp = 0) {
  const g = G.normalizeGame(G.initialGame(T), T)
  G.incubate(g, g.eggs[0].id, 'Luna', { now: T - 30 * G.H, by: 'A' }); g.eggs[0].hatchAt = T - 1
  const p = G.hatch(g, g.eggs[0].id, { now: T, by: 'A' }, 0); p.xp = xp; p.stage = G.petStage(p); g.owned.push('lazo'); g.coins = 200
  return g
}
const today = G.dayOf(T)
const events = [
  { id: 'e1', title: 'Cena especial', categoryId: 'cita', date: today, time: '20:00', status: 'planned', description: 'Restaurante', photos: [{ id: 'p1', data: 'data:image/jpeg;base64,AA', by: 'A', at: T }, { id: 'p2', data: 'data:image/jpeg;base64,BB', by: 'B', at: T }], createdBy: 'A' },
  { id: 'e2', title: 'Nuestro aniversario', categoryId: 'aniversario', date: '2024-' + today.slice(5), time: '10:00', status: 'planned', photos: [] },
  { id: 'e3', title: 'Plan antiguo', date: '2025-01-05', photo: 'data:legacy', done: true, kind: 'Cita' },
]
const entries = [{ id: 'movie_1', type: 'movie', tmdbId: 1, title: 'Peli X', status: 'visto', watchedDate: today, ratings: { A: 8, B: 9 }, genres: [35] }]
const ctxFor = (g, extra = {}) => ({ user: { uid: 'A' }, profile: me, couple: { id: 'C1', members: ['A', 'B'], game: g }, members: { A: me, B: you }, entries, events, uids: ['A', 'B'], partnerUid: 'B', game: g, go: vi.fn(), openTitle: vi.fn(), openEvent: vi.fn(), openMail: vi.fn(), unread: 2, ...extra })
const wrap = (ui, c) => render(<Ctx.Provider value={c}>{ui}</Ctx.Provider>)
beforeEach(() => { cleanup(); Object.values(dbm).forEach((f) => f.mockClear?.()); localStorage.clear() })

describe('Inicio', () => {
  it('muestra los nombres reales de ambos usuarios', () => {
    wrap(<Inicio />, ctxFor(game()))
    const h = screen.getByRole('heading', { level: 1 }); expect(h.textContent).toBe('Hola, Ana y Leo')
    expect(screen.getByText('Calendario')).toBeTruthy(); expect(screen.getByText('Recuerdos')).toBeTruthy(); expect(screen.getByText('Perfil')).toBeTruthy()
  })
  it('sin pareja vinculada no inventa nombres y muestra el código', () => {
    wrap(<Inicio />, ctxFor(game(), { partnerUid: undefined, uids: ['A'], couple: { id: 'ZZ9999', members: ['A'], game: game() }, members: { A: me } }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hola, Ana')
    expect(screen.getAllByText(/ZZ9999/).length).toBeGreaterThan(0); expect(document.body.textContent).not.toMatch(/undefined|null/)
  })
  it('los accesos navegan', () => {
    const c = ctxFor(game()); wrap(<Inicio />, c); fireEvent.click(screen.getByText('Calendario').closest('button')); expect(c.go).toHaveBeenCalledWith('agenda')
  })
})

describe('Mascotas', () => {
  for (const [name, xp] of [['bebé', 0], ['niño', 400], ['adulto', 4900]]) {
    it(`renderiza la habitación y todas las salas en etapa ${name}`, () => {
      wrap(<PetScreen />, ctxFor(game(xp)))
      expect(screen.getAllByText(/Luna/).length).toBeGreaterThan(0); expect(document.querySelector('svg.pet-art')).toBeTruthy(); expect(document.querySelector('svg.pet-art').getAttribute('class')).toContain('st-' + (xp === 0 ? 'bebe' : xp === 400 ? 'nino' : 'adulto'))
      for (const r of ['Cocina', 'Baño', 'Cuarto', 'Jardín', 'Sala']) fireEvent.click(screen.getByText(r).closest('button'))
      expect(document.body.textContent).not.toMatch(/undefined|NaN/)
    })
  }
  it('alimentar ejecuta una transacción real y muestra reacción en pantalla', async () => {
    const { runTransaction } = await import('firebase/firestore')
    const g = game(); const update = vi.fn()
    runTransaction.mockImplementation(async (_d, fn) => { await fn({ get: async () => ({ data: () => ({ members: ['A', 'B'], game: JSON.parse(JSON.stringify(g)) }) }), update }) })
    wrap(<PetScreen />, ctxFor(g)); fireEvent.click(screen.getByText('Cocina').closest('button'))
    fireEvent.click(screen.getByText('Croquetas').closest('button'))
    await waitFor(() => expect(screen.getByText(/Ñam/)).toBeTruthy())
    expect(update).toHaveBeenCalledTimes(1); const saved = update.mock.calls[0][1].game
    expect(saved.log[0]).toMatchObject({ k: 'feed', by: 'A' }); expect(saved.pets[0].xp).toBe(5)
  })
  it('tienda: vista previa, bloqueos por nivel y compra', () => {
    wrap(<PetScreen />, ctxFor(game())); fireEvent.click(screen.getByText('Tienda'))
    fireEvent.click(screen.getByText('Ropa bebé')); fireEvent.click(screen.getByText('Pañal').closest('button'))
    expect(screen.getByText(/se usa en: bebé/)).toBeTruthy(); expect(screen.getByText(/Comprar/)).toBeTruthy()
    fireEvent.click(screen.getByText('Realeza')); fireEvent.click(screen.getByText('Corona real').closest('button'))
    expect(screen.getAllByText(/🔒/).length).toBeGreaterThan(0)
  })
  it('un accesorio incompatible con la etapa muestra el motivo', () => {
    const g = game(400); g.owned.push('panal')
    wrap(<PetScreen />, ctxFor(g)); fireEvent.click(screen.getByText('Tienda')); fireEvent.click(screen.getByText('Mi inventario'))
    fireEvent.click(screen.getByText('Pañal').closest('button')); expect(screen.getByText(/Solo etapa bebé/)).toBeTruthy()
  })
  it('familia y misiones se muestran sin errores', () => {
    wrap(<PetScreen />, ctxFor(game())); fireEvent.click(screen.getByText('Familia')); expect(screen.getByText(/Nuestra familia \(1\/10\)/)).toBeTruthy(); expect(screen.getByText(/Santuario/)).toBeTruthy()
    fireEvent.click(screen.getByText('Misiones')); expect(screen.getByText(/Bono diario/)).toBeTruthy()
  })
  it('el huevo pide nombre antes de incubar (máx. 10 caracteres)', () => {
    const g = G.normalizeGame(G.initialGame(T), T)
    wrap(<PetScreen />, ctxFor(g)); fireEvent.click(screen.getByText('🥚 Ir a mis huevos')); fireEvent.click(screen.getByText('Sin nombre').closest('button'))
    expect(screen.getByText('El nombre de tu mascota')).toBeTruthy()
    const inp = screen.getByLabelText('Nombre de la mascota'); expect(inp.maxLength).toBe(10)
    expect(screen.getByText('Incubar huevo').disabled).toBe(true); fireEvent.change(inp, { target: { value: 'Luna' } }); expect(screen.getByText('Incubar huevo').disabled).toBe(false)
  })
})

describe('Calendario y evidencias', () => {
  it('cambia entre vistas mes / semana / agenda', () => {
    wrap(<Agenda />, ctxFor(game())); expect(screen.getAllByText('Cena especial').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Semana')); expect(screen.getAllByText('Cena especial').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Agenda', { selector: '.seg button' })); expect(screen.getAllByText('Nuestro aniversario').length).toBeGreaterThan(0)
  })
  it('eliminar una foto pide confirmación y solo entonces borra', async () => {
    wrap(<EventDetail id="e1" onClose={vi.fn()} />, ctxFor(game()))
    fireEvent.click(screen.getByAltText('Evidencia 1').closest('button'))
    fireEvent.click(screen.getByText(/Eliminar/)); expect(screen.getByText('¿Eliminar esta foto?')).toBeTruthy(); expect(dbm.removePhoto).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Cancelar')); expect(dbm.removePhoto).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText(/Eliminar/)); fireEvent.click(screen.getByText('Sí, eliminar'))
    await waitFor(() => expect(dbm.removePhoto).toHaveBeenCalledWith('C1', 'e1', 'p1'))
  })
  it('reemplazar una foto sube la nueva y conserva el evento', async () => {
    const { container } = wrap(<EventDetail id="e1" onClose={vi.fn()} />, ctxFor(game()))
    fireEvent.click(screen.getByAltText('Evidencia 2').closest('button'))
    const inputs = container.querySelectorAll('input[type=file]'); const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    fireEvent.change(inputs[1], { target: { files: [file] } })
    await waitFor(() => expect(dbm.replacePhoto).toHaveBeenCalledWith('C1', 'e1', 'p2', 'data:x', 'A'))
    expect(dbm.removeEvent).not.toHaveBeenCalled()
  })
  it('un evento antiguo con `photo` se sigue viendo y se puede gestionar', () => {
    wrap(<EventDetail id="e3" onClose={vi.fn()} />, ctxFor(game())); expect(screen.getByAltText('Evidencia 1')).toBeTruthy(); expect(screen.getByText(/Evidencias \(1\/10\)/)).toBeTruthy()
  })
  it('permite editar el plan y marcar su estado', async () => {
    wrap(<EventDetail id="e1" onClose={vi.fn()} />, ctxFor(game())); fireEvent.click(screen.getByText('Cumplido'))
    await waitFor(() => expect(dbm.patchEvent).toHaveBeenCalledWith('C1', 'e1', expect.objectContaining({ status: 'done' })))
    fireEvent.click(screen.getByText(/Editar plan/)); expect(screen.getByText('Editar plan', { selector: 'h2' })).toBeTruthy()
  })
})

describe('Línea de tiempo', () => {
  it('reúne películas y eventos con fotos y sin duplicados', () => {
    wrap(<Timeline />, ctxFor(game())); const t = document.body.textContent
    expect(t).toContain('Peli X'); expect(t).toContain('Cena especial'); expect(t).toContain('Plan antiguo'); expect(t).toContain('Restaurante')
    expect(document.querySelectorAll('.tlphotos img').length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText('Cena especial')).toHaveLength(1)
  })
  it('filtra por categoría y abre el detalle', () => {
    const c = ctxFor(game()); wrap(<Timeline />, c)
    fireEvent.click(screen.getByText('🎞️ Películas y series')); expect(document.body.textContent).not.toContain('Cena especial')
    fireEvent.click(screen.getByText('Todo')); fireEvent.click(screen.getByText('Cena especial').closest('button')); expect(c.openEvent).toHaveBeenCalledWith('e1')
  })
})

describe('Perfil', () => {
  it('bloquea lo no desbloqueado, previsualiza y guarda', async () => {
    const onSave = vi.fn(() => Promise.resolve()); render(<ProfileEditor initial={me} stats={{ ach: 0 }} onSave={onSave} />)
    expect(screen.getByTitle(/Se desbloquea con 5 logros/).disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Ej: osito_cine'), { target: { value: 'Anita' } }); expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Anita')
    expect(onSave).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ username: 'Anita' }))); expect(screen.getByText(/Perfil guardado/)).toBeTruthy()
  })
  it('el selector de emojis busca en español y elige', async () => {
    render(<ProfileEditor initial={me} onSave={vi.fn()} />); fireEvent.click(screen.getByText(/Elegir emoji/))
    const box = await screen.findByLabelText('Buscar emoji'); await waitFor(() => expect(document.querySelectorAll('.egrid button').length).toBeGreaterThan(50))
    fireEvent.change(box, { target: { value: 'gato' } }); await waitFor(() => expect(document.querySelector('.egrid button[title*="gato"]')).toBeTruthy())
    fireEvent.click(document.querySelector('.egrid button[title*="gato"]')); expect(document.querySelector('.profile-preview .av').textContent).toMatch(/🐱|😺|🐈|🐾/u)
  })
})
