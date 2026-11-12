// @vitest-environment jsdom
import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'

const hoisted = vi.hoisted(() => ({ gamesDocs: [], snapGames: null }))
vi.mock('../src/firebase.js', () => ({ auth: {}, db: {}, googleProvider: {}, app: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('firebase/messaging', () => ({ isSupported: async () => false, getMessaging: vi.fn(), getToken: vi.fn(), deleteToken: vi.fn() }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), collection: () => ({}), onSnapshot: (ref, cb) => { if (typeof cb === 'function') { cb({ docs: hoisted.gamesDocs.map((g) => ({ id: g.id, data: () => g })), data: () => ({}) }) } return () => {} }, runTransaction: vi.fn(), setDoc: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), getDoc: vi.fn(), arrayUnion: vi.fn(), arrayRemove: vi.fn(), serverTimestamp: () => 0, deleteField: () => 0 }))
vi.mock('../src/tmdb.js', async (orig) => ({ ...(await orig()), nowPlaying: () => Promise.resolve([]), search: () => Promise.resolve([]), details: () => Promise.resolve({}) }))
const dbm = vi.hoisted(() => ({ removePhoto: vi.fn(), replacePhoto: vi.fn(), addPhotos: vi.fn((c, e, d) => Promise.resolve(d.length)), patchEvent: vi.fn(() => Promise.resolve()), removeEvent: vi.fn(), claimEventXp: vi.fn(() => Promise.resolve(false)), addEvent: vi.fn(), saveProfile: vi.fn(), compressImage: vi.fn(() => Promise.resolve('data:x')), saveEntry: vi.fn(), removeEntry: vi.fn(), entryId: (m) => `${m.type}_${m.tmdbId}`, saveAnswer: vi.fn(), MAX_PHOTOS: 10,
  addJarNote: vi.fn(() => Promise.resolve()), markJarRead: vi.fn(() => Promise.resolve()), removeJarNote: vi.fn(), addNote: vi.fn(() => Promise.resolve()), patchNote: vi.fn(() => Promise.resolve()), removeNote: vi.fn(() => Promise.resolve()), addGame: vi.fn(() => Promise.resolve('new1')), removeGame: vi.fn(), playGame: vi.fn() }))
vi.mock('../src/db.js', () => dbm)

import { Ctx } from '../src/ctx.js'
import * as G from '../src/gamecore.js'
import * as E from '../src/games/engines.js'
import { PetScreen } from '../src/pet.jsx'
import { EventDetail } from '../src/calendar.jsx'
import { NotesScreen } from '../src/notes.jsx'
import { JarScreen } from '../src/jar.jsx'
import { GamesHub } from '../src/games/GamesHub.jsx'
import { BathScene, BrushScene } from '../src/scrub.jsx'
import { useBackLayer, registerTabNav, pushTab, _debug } from '../src/nav.js'

const T = Date.now(), me = { username: 'Ana', avatar: '🐻', avBg: 'noche', frame: 'rosa', color: '#FF4F8B' }, you = { username: 'Leo', avatar: '🦊', avBg: 'menta', frame: 'dorado', color: '#4DD4E6' }
function game(xp = 0) { const g = G.normalizeGame(G.initialGame(T), T); G.incubate(g, g.eggs[0].id, 'Luna', { now: T - 30 * G.H, by: 'A' }); g.eggs[0].hatchAt = T - 1; const p = G.hatch(g, g.eggs[0].id, { now: T, by: 'A' }, 0); p.xp = xp; p.stage = G.petStage(p); return g }
const ctxFor = (extra = {}, g = game()) => ({ user: { uid: 'A' }, profile: me, couple: { id: 'C1', members: ['A', 'B'], game: g }, members: { A: me, B: you }, entries: [], events: [], jar: [], notes: [], uids: ['A', 'B'], partnerUid: 'B', game: g, go: vi.fn(), openTitle: vi.fn(), openEvent: vi.fn(), openMail: vi.fn(), unread: 0, ...extra })
const wrap = (ui, c) => render(<Ctx.Provider value={c}>{ui}</Ctx.Provider>)
beforeEach(() => { cleanup(); Object.values(dbm).forEach((f) => f.mockClear?.()); localStorage.clear(); hoisted.gamesDocs = [] })

describe('renombrar mascota', () => {
  it('el lápiz abre el cuadro, guarda con transacción y registra el cambio', async () => {
    const { runTransaction } = await import('firebase/firestore'); const g = game(); const update = vi.fn()
    runTransaction.mockImplementation(async (_d, fn) => { await fn({ get: async () => ({ data: () => ({ members: ['A', 'B'], game: JSON.parse(JSON.stringify(g)) }) }), update }) })
    wrap(<PetScreen />, ctxFor({}, g)); fireEvent.click(screen.getAllByLabelText('Cambiar nombre')[0])
    const inp = screen.getByLabelText('Nuevo nombre'); expect(inp.maxLength).toBe(10); fireEvent.change(inp, { target: { value: 'Nube' } }); fireEvent.click(screen.getByText('Guardar'))
    await waitFor(() => expect(update).toHaveBeenCalled()); const saved = update.mock.calls[0][1].game; expect(saved.pets[0].name).toBe('Nube'); expect(saved.log[0]).toMatchObject({ k: 'rename', from: 'Luna' })
  })
  it('no deja guardar un nombre vacío', () => { wrap(<PetScreen />, ctxFor()); fireEvent.click(screen.getAllByLabelText('Cambiar nombre')[0]); fireEvent.change(screen.getByLabelText('Nuevo nombre'), { target: { value: '  ' } }); expect(screen.getByText('Guardar').disabled).toBe(true) })
})
describe('cuarto: cepillar antes de dormir', () => {
  it('si no se cepillaron, al dormir ofrece cepillar primero', () => {
    wrap(<PetScreen />, ctxFor()); fireEvent.click(screen.getByText('Cuarto').closest('button'))
    expect(screen.getByText(/Antes de dormir/)).toBeTruthy(); fireEvent.click(screen.getByText(/🌙 Dormir/)); expect(screen.getByText(/Cepillamos antes de dormir/)).toBeTruthy(); expect(screen.getByText('Dormir sin cepillar')).toBeTruthy()
    fireEvent.click(screen.getByText('🪥 Cepillar', { selector: '.hint button' })); expect(screen.getByText(/Cepilla los dientes de/)).toBeTruthy()
  })
})

// ---- ayudas para simular el dedo en jsdom ----
const ptr = (el, type, x, y) => fireEvent(el, Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, buttons: 1 }), { pointerId: 1 }))
function stubGeometry() {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 240, right: 200, bottom: 240, x: 0, y: 0 })
  SVGElement.prototype.createSVGPoint = function () { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } } }
  SVGElement.prototype.getScreenCTM = () => ({ inverse: () => ({}) })
}
describe('escenas manuales', () => {
  it('baño: hay que cubrir de espuma y luego enjuagar antes de completar', async () => {
    stubGeometry(); const onDone = vi.fn(); const pet = game().pets[0]; const { container } = render(<BathScene pet={pet} soap={G.item('jabon')} onDone={onDone} onCancel={vi.fn()} />)
    const box = container.querySelector('.scrubbox'); const pass = () => { for (let y = 10; y < 240; y += 22) for (let x = 5; x < 200; x += 20) act(() => ptr(box, 'pointermove', x, y)) }
    act(() => ptr(box, 'pointerdown', 100, 100)); expect(screen.getByText(/Frota a/)).toBeTruthy(); expect(onDone).not.toHaveBeenCalled()
    for (let i = 0; i < 8 && !screen.queryByText(/enjuágala/); i++) pass(); expect(screen.getByText(/enjuágala/)).toBeTruthy(); expect(onDone).not.toHaveBeenCalled()
    for (let i = 0; i < 8 && !screen.queryByText(/Limpia y feliz/); i++) pass(); expect(screen.getByText(/Limpia y feliz/)).toBeTruthy()
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 })
  })
  it('cepillado: se limpian los dientes al restregar y recién entonces termina', async () => {
    stubGeometry(); const onDone = vi.fn(); const pet = game().pets[0]; const { container } = render(<BrushScene pet={pet} onDone={onDone} onCancel={vi.fn()} />)
    const svg = container.querySelector('svg.brushsvg'); act(() => ptr(svg, 'pointerdown', 70, 120)); expect(onDone).not.toHaveBeenCalled()
    for (let pass = 0; pass < 14; pass++) for (const y of [122, 165]) for (let x = 60; x < 240; x += 9) act(() => ptr(svg, 'pointermove', x + (pass % 2) * 3, y))
    expect(screen.getByText(/Dientes brillantes/)).toBeTruthy(); await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 })
  })
})
describe('fotos del calendario (varias a la vez, máx. 10)', () => {
  const ev = (n) => ({ id: 'e1', title: 'Cena', categoryId: 'cita', date: '2026-11-10', time: '20:00', status: 'planned', photos: Array.from({ length: n }, (_, i) => ({ id: 'p' + i, data: 'data:x', by: 'A', at: 1 })) })
  it('el selector admite varias y sube solo las que caben', async () => {
    const { container } = wrap(<EventDetail id="e1" onClose={vi.fn()} />, ctxFor({ events: [ev(2)] })); const input = container.querySelectorAll('input[type=file]')[0]; expect(input.multiple).toBe(true); expect(screen.getByText(/Evidencias \(2\/10\)/)).toBeTruthy()
    const files = Array.from({ length: 12 }, (_, i) => new File(['x'], `f${i}.jpg`, { type: 'image/jpeg' })); fireEvent.change(input, { target: { files } })
    await waitFor(() => expect(dbm.addPhotos).toHaveBeenCalledTimes(1)); expect(dbm.compressImage).toHaveBeenCalledTimes(8); expect(dbm.addPhotos.mock.calls[0][2]).toHaveLength(8); await waitFor(() => expect(screen.getByText(/8 fotos agregadas/)).toBeTruthy())
  })
  it('con 10 fotos ya no ofrece agregar', () => { wrap(<EventDetail id="e1" onClose={vi.fn()} />, ctxFor({ events: [ev(10)] })); expect(screen.queryByText(/Agregar varias/)).toBeNull(); expect(screen.getByText(/Evidencias \(10\/10\)/)).toBeTruthy() })
})
describe('notas', () => {
  it('agregar, completar y borrar con confirmación', async () => {
    const n = [{ id: 'n1', text: 'Poner modo oscuro automático', cat: 'app', by: 'B', createdAt: T, done: false }]; wrap(<NotesScreen />, ctxFor({ notes: n }))
    expect(screen.getByText(/modo oscuro/)).toBeTruthy(); fireEvent.change(screen.getByLabelText('Nueva nota'), { target: { value: 'Ver una peli de terror' } }); fireEvent.click(screen.getByText('Agregar nota'))
    await waitFor(() => expect(dbm.addNote).toHaveBeenCalledWith('C1', expect.objectContaining({ text: 'Ver una peli de terror', by: 'A', cat: 'app' })))
    fireEvent.click(screen.getByLabelText('Marcar como hecha')); expect(dbm.patchNote).toHaveBeenCalledWith('C1', 'n1', { done: true })
    fireEvent.click(screen.getByText(/Borrar/)); expect(dbm.removeNote).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Sí, borrar')); await waitFor(() => expect(dbm.removeNote).toHaveBeenCalledWith('C1', 'n1'))
  })
})
describe('frasco de mensajes', () => {
  const jar = [{ id: 'j1', from: 'B', to: 'A', text: 'Estoy orgulloso de ti', color: '#ffd6e0', when: 'estés triste', createdAt: T - 99999, readAt: null }, { id: 'j2', from: 'B', to: 'A', text: 'Te quiero', color: '#c8f0d2', createdAt: T - 88888, readAt: T - 1000 }, { id: 'j3', from: 'A', to: 'B', text: 'Para ti', color: '#cfe3ff', createdAt: T, readAt: null }]
  it('muestra el frasco con el letrero, notas sin leer resaltadas y solo las mías', () => {
    const { container } = wrap(<JarScreen />, ctxFor({ jar })); expect(container.textContent).toContain('LEER SOLO CUANDO'); expect(container.querySelectorAll('.jnote')).toHaveLength(2); expect(container.querySelectorAll('.jnote.unread')).toHaveLength(1)
  })
  it('al tocar una nota se abre su mensaje y se marca como leída', async () => {
    const { container } = wrap(<JarScreen />, ctxFor({ jar })); fireEvent.click(container.querySelector('.jnote.unread'))
    expect(screen.getByText('Estoy orgulloso de ti')).toBeTruthy(); expect(screen.getByText(/Ábrela cuando estés triste/)).toBeTruthy(); await waitFor(() => expect(dbm.markJarRead).toHaveBeenCalledWith('C1', 'j1'))
  })
  it('escribir una nota la envía a la pareja con el color elegido', async () => {
    wrap(<JarScreen />, ctxFor({ jar })); fireEvent.click(screen.getByText('💌 Escribir nota')); fireEvent.click(screen.getByLabelText('Color #cfe3ff')); fireEvent.click(screen.getByText('necesites ánimo'))
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Eres increíble' } }); fireEvent.click(screen.getByText('💌 Meter en el frasco'))
    await waitFor(() => expect(dbm.addJarNote).toHaveBeenCalledWith('C1', { text: 'Eres increíble', color: '#cfe3ff', when: 'necesites ánimo', from: 'A', to: 'B' }))
  })
})
describe('los 20 juegos', () => {
  it('cada juego se abre sin errores y muestra su tablero', () => {
    for (const g of E.GAME_LIST) {
      cleanup(); hoisted.gamesDocs = [{ id: 'g1', ...E.newGame(g.id, ['A', 'B'], () => 0.37), updatedAt: T }]
      wrap(<GamesHub />, ctxFor()); fireEvent.click(screen.getAllByText(g.name).find((e) => e.closest('.matchrow')).closest('button'))
      expect(document.querySelector('.match')).toBeTruthy(); expect(document.querySelector('.match').textContent).toContain(g.name); expect(document.body.textContent).not.toMatch(/undefined|NaN/)
    }
  })
  it('lobby: lista los 20 juegos, crea partida con el orden de jugadores y la abre', async () => {
    wrap(<GamesHub />, ctxFor()); expect(document.querySelectorAll('.gamegrid button')).toHaveLength(20); fireEvent.click(screen.getByText('Conecta 4').closest('button'))
    await waitFor(() => expect(dbm.addGame).toHaveBeenCalledTimes(1)); expect(dbm.addGame.mock.calls[0][1]).toMatchObject({ type: 'c4', players: ['A', 'B'], turn: 'A', status: 'playing' })
  })
  it('jugar: el tablero aplica las reglas reales en una transacción y bloquea el turno ajeno', async () => {
    hoisted.gamesDocs = [{ id: 'g1', ...E.newGame('ttt', ['A', 'B']), updatedAt: T }]; dbm.playGame.mockImplementation(async (cid, id, apply) => apply({ id, ...hoisted.gamesDocs[0] }))
    wrap(<GamesHub />, ctxFor()); fireEvent.click(screen.getByText('Tres en raya', { selector: '.matchrow b' }).closest('button')); expect(document.querySelector('.match').textContent).toContain('Es tu turno')
    fireEvent.click(document.querySelectorAll('.ttt .gcell')[4]); await waitFor(() => expect(dbm.playGame).toHaveBeenCalledTimes(1))
    cleanup(); hoisted.gamesDocs = [{ id: 'g1', ...E.newGame('ttt', ['B', 'A']), updatedAt: T }]; wrap(<GamesHub />, ctxFor()); fireEvent.click(screen.getByText('Tres en raya', { selector: '.matchrow b' }).closest('button'))
    expect(document.querySelector('.match').textContent).toContain('Turno de Leo'); expect([...document.querySelectorAll('.ttt .gcell')].every((b) => b.disabled)).toBe(true)
  })
  it('sin pareja vinculada no ofrece jugar', () => { wrap(<GamesHub />, ctxFor({ partnerUid: undefined })); expect(screen.getByText(/de a dos/)).toBeTruthy(); expect(document.querySelector('.gamegrid')).toBeNull() })
})
describe('botón atrás del teléfono', () => {
  const pop = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
  beforeEach(async () => { await new Promise((r) => setTimeout(r, 600)) }) // deja caducar los popstate asíncronos de pruebas anteriores
  function Layer({ onClose }) { useBackLayer(onClose); return <div>ventana</div> }
  it('cierra la ventana abierta y la capa se limpia', () => {
    const onClose = vi.fn(); const push = vi.spyOn(history, 'pushState'); const r = render(<Layer onClose={onClose} />); expect(push).toHaveBeenCalled(); expect(_debug.layers()).toBe(1)
    pop(); expect(onClose).toHaveBeenCalledTimes(1); expect(_debug.layers()).toBe(0); r.unmount()
  })
  it('con varias capas cierra primero la de arriba', () => {
    const a = vi.fn(), b = vi.fn(); render(<><Layer onClose={a} /><Layer onClose={b} /></>); pop(); expect(b).toHaveBeenCalledTimes(1); expect(a).not.toHaveBeenCalled(); pop(); expect(a).toHaveBeenCalledTimes(1)
  })
  it('sin ventanas, vuelve a la pestaña anterior; en la raíz no hace nada', () => {
    const back = vi.fn(); registerTabNav(back); pop(); expect(back).not.toHaveBeenCalled(); pushTab(); pushTab(); pop(); expect(back).toHaveBeenCalledTimes(1); pop(); expect(back).toHaveBeenCalledTimes(2); pop(); expect(back).toHaveBeenCalledTimes(2)
  })
  it('cerrar con el botón de la ventana también limpia el historial', () => {
    function Host() { const [o, setO] = useState(true); return o ? <Layer onClose={() => setO(false)} /> : <p>cerrada</p> }
    const back = vi.spyOn(history, 'back'); render(<Host />); pop(); expect(screen.getByText('cerrada')).toBeTruthy(); expect(back).not.toHaveBeenCalled()
  })
})
