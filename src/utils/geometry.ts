import type { Point, GeoPoint } from '@/types/domain'

// ─── Geometria geográfica (lat/lng) ──────────────────────────────────────────

const EARTH_RADIUS_M = 6_378_137

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Área de um polígono geográfico, em hectares (aproximação esférica por
 * excesso). Suficiente para a escala de uma propriedade.
 */
export function geoPolygonAreaHa(points: GeoPoint[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += toRad(b.lng - a.lng) * (2 + Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)))
  }
  const m2 = Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
  return m2 / 10_000
}

/** Perímetro de um polígono geográfico, em metros (soma de haversines). */
export function geoPolygonPerimeterM(points: GeoPoint[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    total += 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
  }
  return total
}

/** Centroide simples (média) de pontos geográficos. */
export function geoCentroid(points: GeoPoint[]): GeoPoint {
  const n = points.length || 1
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / n,
    lng: points.reduce((s, p) => s + p.lng, 0) / n,
  }
}

/**
 * Projeta um polígono geográfico para coordenadas relativas no viewBox
 * ilustrado, mapeando o bounding box do polígono em [pad, VW-pad] × [pad, VH-pad].
 * Mantém a representação relativa (offline) coerente com a geográfica (online)
 * após uma demarcação sobre o mapa real (RF37). Eixo Y invertido (norte em cima).
 */
export function geoToViewbox(
  points: GeoPoint[],
  vw = 1000,
  vh = 700,
  pad = 60,
): Point[] {
  if (points.length === 0) return []
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const latMin = Math.min(...lats), latMax = Math.max(...lats)
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs)
  const spanLat = latMax - latMin || 1e-6
  const spanLng = lngMax - lngMin || 1e-6
  return points.map((p) => ({
    x: Math.round(pad + ((p.lng - lngMin) / spanLng) * (vw - 2 * pad)),
    y: Math.round(pad + ((latMax - p.lat) / spanLat) * (vh - 2 * pad)),
  }))
}

/**
 * Shoelace formula — returns area in the same unit² as the input coordinates.
 */
export function shoelaceArea(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y
    sum -= points[j].x * points[i].y
  }
  return Math.abs(sum) / 2
}

/**
 * Perimeter — sum of edge lengths.
 */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0
  let p = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    p += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
  }
  return p
}

/**
 * Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

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
