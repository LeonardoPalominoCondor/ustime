import { useEffect, useState } from 'react'
import { now } from './clock'
// Reloj reactivo: se actualiza cada `ms` y al instante cuando las herramientas de prueba mueven el tiempo.
export function useTick(ms = 15000) {
  const [t, setT] = useState(now())
  useEffect(() => {
    const f = () => setT(now())
    const i = setInterval(f, ms); window.addEventListener('ustime-tick', f)
    return () => { clearInterval(i); window.removeEventListener('ustime-tick', f) }
  }, [ms])
  return t
}
