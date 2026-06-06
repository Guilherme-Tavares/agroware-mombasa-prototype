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

/**
 * Ponto dentro do polígono (ray casting). Usado para garantir que marcadores
 * (rebanho, cocho) caiam dentro da divisão correspondente.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (intersect) inside = !inside
  }
  return inside
}

/** Distância mínima de um ponto a um segmento de reta. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Ponto mais próximo de p no segmento [a, b]. */
export function nearestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { ...a }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * Verifica se o ponto está a ≤ tolerance unidades de qualquer aresta do
 * polígono. Usado para aceitar âncoras posicionadas "sobre" uma linha.
 */
export function isNearPolygonEdge(point: Point, polygon: Point[], tolerance: number): boolean {
  for (let i = 0; i < polygon.length; i++) {
    if (distanceToSegment(point, polygon[i], polygon[(i + 1) % polygon.length]) <= tolerance) return true
  }
  return false
}

/**
 * Snapping: se p estiver a menos de snapRadius de qualquer aresta dos
 * polígonos fornecidos, retorna o ponto projetado na aresta mais próxima.
 * Caso contrário retorna p inalterado.
 */
export function snapToEdges(p: Point, polygons: Point[][], snapRadius: number): Point {
  // Vértices têm prioridade: estão simultaneamente em duas arestas, então
  // snap para o vértice mais próximo dentro do raio sempre que existir.
  let bestVertex: Point | null = null
  let bestVertexDist = snapRadius
  for (const poly of polygons) {
    for (const v of poly) {
      const d = Math.hypot(p.x - v.x, p.y - v.y)
      if (d < bestVertexDist) {
        bestVertexDist = d
        bestVertex = { ...v }
      }
    }
  }
  if (bestVertex !== null) return bestVertex

  // Sem vértice próximo — projeta no ponto mais próximo de qualquer aresta.
  let best = p
  let bestDist = snapRadius
  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      const d = distanceToSegment(p, a, b)
      if (d < bestDist) {
        bestDist = d
        best = nearestPointOnSegment(p, a, b)
      }
    }
  }
  return best
}

/** Retorna true se os dois segmentos se cruzam (sem contar extremidades compartilhadas). */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  function cross(o: Point, p: Point, q: Point): number {
    return (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x)
  }
  const d1 = cross(b1, b2, a1)
  const d2 = cross(b1, b2, a2)
  const d3 = cross(a1, a2, b1)
  const d4 = cross(a1, a2, b2)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/**
 * Verifica se dois polígonos têm arestas que se cruzam (sem contar
 * extremidades). Não detecta sobreposição total sem cruzamentos.
 */
export function polygonEdgesIntersect(a: Point[], b: Point[]): boolean {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  return false
}

/**
 * Ponto válido para âncora de divisão: deve estar dentro (ou na borda) do
 * polígono da propriedade E não estar dentro da área de qualquer outra divisão
 * (excluindo a própria divisão sendo editada).
 */
export function isValidDivisionAnchor(
  point: Point,
  farmPolygon: Point[],
  otherDivisionPolygons: Point[][],
  edgeTolerance = 8,
): boolean {
  const inFarm = pointInPolygon(point, farmPolygon) || isNearPolygonEdge(point, farmPolygon, edgeTolerance)
  if (!inFarm) return false
  for (const poly of otherDivisionPolygons) {
    if (pointInPolygon(point, poly)) return false
  }
  return true
}

/**
 * Retorna true se inner está completamente dentro de outer.
 * Usa tolerância adaptativa baseada no tamanho de outer para lidar com vértices
 * exatamente sobre a fronteira (comportamento ambíguo do ray-casting): um vértice
 * é aceito se estiver dentro OU sobre uma aresta de outer.
 * Rejeita apenas arestas que se cruzam (não coincidentes).
 */
export function polygonContains(inner: Point[], outer: Point[]): boolean {
  if (inner.length < 3 || outer.length < 3) return false
  // Tolerance ~0.5% of outer bbox diagonal — works for both viewBox (px) and geo (°)
  const xs = outer.map((p) => p.x), ys = outer.map((p) => p.y)
  const tol = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.005
  if (inner.some((pt) => !pointInPolygon(pt, outer) && !isNearPolygonEdge(pt, outer, tol))) return false
  if (polygonEdgesIntersect(inner, outer)) return false
  return true
}

/**
 * Verifica sobreposição real entre dois polígonos: detecta cruzamento de
 * arestas E contenção total (um dentro do outro sem arestas cruzadas).
 * Polígonos que apenas se TOCAM (arestas compartilhadas) não são considerados
 * sobrepostos — essa é a distinção essencial para divisões adjacentes.
 */
export function polygonsOverlap(a: Point[], b: Point[], edgeTol = 2): boolean {
  if (a.length < 3 || b.length < 3) return false
  if (polygonEdgesIntersect(a, b)) return true
  // Contenção: se qualquer vértice de A está dentro de B (não na borda) → sobreposição
  if (pointInPolygon(a[0], b) && !isNearPolygonEdge(a[0], b, edgeTol)) return true
  // Contenção inversa: B dentro de A
  if (pointInPolygon(b[0], a) && !isNearPolygonEdge(b[0], a, edgeTol)) return true
  return false
}
