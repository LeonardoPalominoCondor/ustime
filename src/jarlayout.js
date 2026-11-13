// Disposición determinista de las notas dentro del frasco (puro, sin Firebase).
export const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
export const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('')

// Acomoda las notas como un montón dentro del frasco (puro y determinista).
// Filas alternas de 4 y 3 notas, siempre dentro de las paredes (x 48–252): el centro se limita a [80, 220]
// y la rotación máxima es ±28°, así que ni la nota más girada toca el vidrio. Además el SVG recorta con un clipPath.
export const JAR_MAX = 24
export const JAR_X = [80, 220]
export const JAR_INNER = [48, 252]
const rowSize = (r) => (r % 2 === 0 ? 4 : 3)
export function layoutNotes(ids, seed = 0) {
  return ids.slice(-JAR_MAX).map((id, i) => {
    let row = 0, rest = i
    while (rest >= rowSize(row)) { rest -= rowSize(row); row++ }
    const h = hash(id + ':' + seed), x0 = row % 2 === 0 ? 80 : 103.33
    const x = Math.max(JAR_X[0], Math.min(JAR_X[1], x0 + rest * 46.67 + ((h % 100) / 100 - 0.5) * 6))
    return { id, x, y: 330 - row * 24 + (((h >>> 7) % 100) / 100 - 0.5) * 6, r: ((h >>> 3) % 57) - 28 }
  })
}
