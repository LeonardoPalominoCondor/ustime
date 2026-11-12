import React, { useEffect, useMemo, useState } from 'react'
const GROUPS = [[0, '😀', 'Caritas'], [1, '👋', 'Personas'], [3, '🐻', 'Animales'], [4, '🍕', 'Comida'], [5, '✈️', 'Viajes'], [6, '⚽', 'Actividades'], [7, '💡', 'Objetos'], [8, '❤️', 'Símbolos'], [9, '🏳️', 'Banderas']]
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
let cache = null
const load = () => (cache ? Promise.resolve(cache) : import('./emoji-es.json').then((m) => (cache = m.default.map(([g, e, l, t]) => ({ g, e, l, k: norm(l + ' ' + t) })))))
const recent = () => { try { return JSON.parse(localStorage.getItem('ustime_emoji_recent')) || [] } catch { return [] } }

// Selector de emojis: categorías, búsqueda en español y recientes. onPick(emoji)
export function EmojiPicker({ onPick, value }) {
  const [all, setAll] = useState(null)
  const [g, setG] = useState(0)
  const [q, setQ] = useState('')
  useEffect(() => { load().then(setAll) }, [])
  const list = useMemo(() => {
    if (!all) return []
    const s = norm(q.trim())
    return s ? all.filter((x) => x.k.includes(s)).slice(0, 160) : all.filter((x) => x.g === g)
  }, [all, g, q])
  const pick = (e) => { localStorage.setItem('ustime_emoji_recent', JSON.stringify([e, ...recent().filter((x) => x !== e)].slice(0, 16))); onPick(e) }
  return (
    <div className="emoji">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: corazón, gato, pizza…" aria-label="Buscar emoji" />
      {!q && <div className="egroups">{GROUPS.map(([id, ic, l]) => <button key={id} className={g === id ? 'on' : ''} title={l} onClick={() => setG(id)}>{ic}</button>)}</div>}
      {!q && !!recent().length && <div className="erecent">{recent().map((e) => <button key={e} onClick={() => pick(e)}>{e}</button>)}</div>}
      <div className="egrid" role="listbox">
        {!all ? <div className="spinner" /> : list.map((x) => <button key={x.e + x.l} role="option" aria-selected={x.e === value} className={x.e === value ? 'on' : ''} title={x.l} onClick={() => pick(x.e)}>{x.e}</button>)}
        {all && !list.length && <p className="muted">Sin resultados para “{q}”.</p>}
      </div>
    </div>
  )
}
