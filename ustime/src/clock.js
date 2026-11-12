// Reloj inyectable. En producción SIEMPRE devuelve Date.now(); el desfase solo existe en builds de prueba.
import { TEST } from './paths'
const KEY = 'ustime_test_clock'
const CFG = 'ustime_test_cfg'
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
let offset = TEST ? read(KEY, 0) : 0
let cfg = TEST ? read(CFG, {}) : {}
export const now = () => Date.now() + offset
export const getOffset = () => offset
export const advance = (ms) => { if (!TEST) return; offset += ms; localStorage.setItem(KEY, JSON.stringify(offset)) }
export const resetClock = () => { if (!TEST) return; offset = 0; localStorage.setItem(KEY, '0') }
// Intervalos configurables (solo pruebas): hatchMs, decay (multiplicador de necesidades)
export const getCfg = () => cfg
export const setCfg = (patch) => { if (!TEST) return; cfg = { ...cfg, ...patch }; localStorage.setItem(CFG, JSON.stringify(cfg)) }
export const clearCfg = () => { if (!TEST) return; cfg = {}; localStorage.removeItem(CFG) }
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => ymd(new Date(now()))
