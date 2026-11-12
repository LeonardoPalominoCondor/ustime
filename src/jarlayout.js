// Disposición determinista de las notas dentro del frasco (puro, sin Firebase).
export const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
export const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('')

// Acomoda las notas como un montón dentro del frasco (puro y determinista).
export const JAR_MAX = 24
export function layoutNotes(ids, seed = 0) {
  return ids.slice(-JAR_MAX).map((id, i) => {
    const row = Math.floor(i / 4), col = i % 4, h = hash(id + ':' + seed)
    return { id, x: 82 + col * 50 + (row % 2 ? 14 : 0) + ((h % 100) / 100 - 0.5) * 12, y: 326 - row * 26 + (((h >> 7) % 100) / 100 - 0.5) * 6, r: ((h >> 3) % 70) - 35 }
  })
}

