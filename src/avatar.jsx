import React, { useContext } from 'react'
import { Ctx } from './ctx.js'

export const AV_BG = [
  { id: 'noche', label: 'Noche', css: 'linear-gradient(135deg,#2e2440,#17121F)' },
  { id: 'atardecer', label: 'Atardecer', css: 'linear-gradient(135deg,#ff9f43,#ff4f8b)' },
  { id: 'menta', label: 'Menta', css: 'linear-gradient(135deg,#5bd6a0,#4dd4e6)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg,#4dd4e6,#9b7bff,#ff4f8b)', need: { ach: 3 } },
  { id: 'galaxia', label: 'Galaxia', css: 'radial-gradient(circle at 30% 30%,#9b7bff,#1b1b4b 70%)', need: { petLevel: 10 } },
  { id: 'oro', label: 'Oro', css: 'linear-gradient(135deg,#ffe29a,#ffc857,#e0932b)', need: { ach: 10 } },
]
export const FRAMES = [
  { id: 'ninguno', label: 'Sin marco' },
  { id: 'rosa', label: 'Rosa' },
  { id: 'estrellas', label: 'Estrellas', need: { petLevel: 5 } },
  { id: 'dorado', label: 'Dorado', need: { ach: 5 } },
  { id: 'neon', label: 'Neón', need: { streak: 7 } },
  { id: 'corazones', label: 'Corazones', need: { titles: 10 } },
  { id: 'fuego', label: 'Fuego', need: { streak: 30 } },
]
export const STICKERS = [
  { id: '', label: 'Ninguno' }, { id: '✨', label: '✨' }, { id: '💖', label: '💖' },
  { id: '🌈', label: '🌈', need: { eventsDone: 1 } }, { id: '🔥', label: '🔥', need: { streak: 7 } },
  { id: '🚀', label: '🚀', need: { titles: 25 } }, { id: '👑', label: '👑', need: { ach: 10 } },
]
export const ACCENTS = ['#FF4F8B', '#FF9F43', '#FFC857', '#8BD450', '#5BD6A0', '#4DD4E6', '#6BA8FF', '#9B7BFF', '#E27BFF']
const LABEL = { ach: 'logros', petLevel: 'nivel de mascota', streak: 'días de racha', titles: 'títulos vistos', eventsDone: 'planes cumplidos' }
export const isUnlocked = (it, s) => !it.need || Object.entries(it.need).every(([k, n]) => (s[k] || 0) >= n)
export const needText = (it) => Object.entries(it.need || {}).map(([k, n]) => `${n} ${LABEL[k]}`).join(' y ')

export function Avatar({ p, size = 44, className = '' }) {
  const bg = AV_BG.find((b) => b.id === p?.avBg) || AV_BG[0]
  return (
    <span className={`av fr-${p?.frame || 'rosa'} ${className}`} style={{ width: size, height: size, fontSize: size * 0.56, background: bg.css }} aria-hidden="true">
      <span>{p?.avatar || '🙂'}</span>
      {p?.sticker && <i style={{ fontSize: size * 0.3 }}>{p.sticker}</i>}
    </span>
  )
}
export function Who({ uid, size = 28 }) {
  const { members } = useContext(Ctx)
  return <span title={members[uid]?.username}><Avatar p={members[uid]} size={size} /></span>
}
export const nameOf = (members, uid) => members[uid]?.username || '…'
