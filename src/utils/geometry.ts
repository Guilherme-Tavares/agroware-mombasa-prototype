import type { Point } from '@/types/domain'

/**
 * Area-weighted centroid of a simple polygon (shoelace).
 * Falls back to the vertex average for degenerate polygons.
 */
export function polygonCentroid(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }

  let sumX = 0
  let sumY = 0
  let sumArea = 0

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.y - b.x * a.y
    sumArea += cross
    sumX    += (a.x + b.x) * cross
    sumY    += (a.y + b.y) * cross
  }

  const area = sumArea / 2
  if (Math.abs(area) < 1e-6) {
    const ax = polygon.reduce((s, p) => s + p.x, 0) / polygon.length
    const ay = polygon.reduce((s, p) => s + p.y, 0) / polygon.length
    return { x: ax, y: ay }
  }

  return {
    x: sumX / (6 * area),
    y: sumY / (6 * area),
  }
}

export function polygonToPoints(polygon: Point[]): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(' ')
}
