// Botón/gesto «atrás» del teléfono: cierra la capa abierta (ventana) o vuelve a la pestaña anterior; solo sale de la app desde Inicio.
import { useEffect, useRef } from 'react'
const layers = []
// Cada cierre voluntario provoca un history.back(): su popstate se ignora. Las fichas caducan para no «comerse» un atrás real.
const tokens = []
const takeToken = () => { const t = Date.now(); while (tokens.length && tokens[0] < t) tokens.shift(); return tokens.shift() !== undefined }
let tabBack = null
let tabDepth = 0
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (takeToken()) return
    const top = layers.pop()
    if (top) { top.close(); return }
    if (tabBack && tabDepth > 0) { tabDepth--; tabBack() }
  })
}
function pushLayer(close) {
  const l = { close }; layers.push(l); history.pushState({ ustime: 'layer' }, '')
  return () => { const i = layers.indexOf(l); if (i >= 0) { layers.splice(i, 1); tokens.push(Date.now() + 500); history.back() } }
}
// Úsalo dentro de cualquier ventana/overlay: mientras esté montada, «atrás» la cierra.
export function useBackLayer(onClose) {
  const ref = useRef(onClose); ref.current = onClose
  useEffect(() => pushLayer(() => ref.current && ref.current()), [])
}
// Pestañas: cada cambio añade una entrada al historial; «atrás» devuelve a la anterior.
export function registerTabNav(onBack) { tabBack = onBack }
export function pushTab() { tabDepth++; history.pushState({ ustime: 'tab' }, '') }
export const _debug = { layers: () => layers.length, depth: () => tabDepth }
