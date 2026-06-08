import { putTile, getTile } from './idb'

// ──────────────────────────────────────────────────────────────────────────────
// Fontes de tiles e matemática de slippy map. Compartilhado pelo mapa real
// (RealFarmMap / OfflineTiles) e pela tela de configurar mapa base offline (RF36).
// ──────────────────────────────────────────────────────────────────────────────

export type TileSourceId = 'satelite' | 'mapa'

export interface TileSource {
  id: TileSourceId
  label: string
  url: string
  attribution: string
  /** Zoom máximo que o provedor realmente disponibiliza tiles. */
  maxNativeZoom: number
  /** Zoom máximo para cache offline (tilesForBounds). */
  maxZoom: number
  /** Subdomínio fixo para o template {s} (OSM); satélite não usa. */
  subdomain?: string
}

export const TILE_SOURCES: Record<TileSourceId, TileSource> = {
  satelite: {
    id: 'satelite',
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 16,
    maxZoom: 18,
  },
  mapa: {
    id: 'mapa',
    label: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    maxZoom: 19,
    subdomain: 'a',
  },
}

export interface GeoBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface TileCoord {
  z: number
  x: number
  y: number
}

// ─── Slippy map math ──────────────────────────────────────────────────────────

export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z)
}

export function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  )
}

/** Chave de cache: única por fonte e coordenada de tile. */
export function tileKey(sourceId: string, z: number, x: number, y: number): string {
  return `${sourceId}/${z}/${x}/${y}`
}

/** Monta a URL do tile a partir do template da fonte. */
export function buildTileUrl(source: TileSource, z: number, x: number, y: number): string {
  return source.url
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{s}', source.subdomain ?? 'a')
}

/**
 * Lista as coordenadas de tiles que cobrem um bounding box, do zoom mínimo ao
 * máximo. Limitado por `cap` para manter o volume modesto (RF36).
 */
export function tilesForBounds(
  bounds: GeoBounds,
  zMin: number,
  zMax: number,
  cap = 400,
): TileCoord[] {
  const out: TileCoord[] = []
  for (let z = zMin; z <= zMax; z++) {
    const xMin = lngToTileX(bounds.west, z)
    const xMax = lngToTileX(bounds.east, z)
    const yMin = latToTileY(bounds.north, z)
    const yMax = latToTileY(bounds.south, z)
    for (let x = Math.min(xMin, xMax); x <= Math.max(xMin, xMax); x++) {
      for (let y = Math.min(yMin, yMax); y <= Math.max(yMin, yMax); y++) {
        out.push({ z, x, y })
        if (out.length >= cap) return out
      }
    }
  }
  return out
}

/** Bounding box de um conjunto de pontos {lat,lng}. */
export function boundsOf(points: Array<{ lat: number; lng: number }>): GeoBounds | null {
  if (points.length === 0) return null
  return {
    north: Math.max(...points.map((p) => p.lat)),
    south: Math.min(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lng)),
    west: Math.min(...points.map((p) => p.lng)),
  }
}

/**
 * Baixa e armazena no IndexedDB os tiles que cobrem o bounding box, do zMin ao
 * zMax. Reporta progresso (0..1). Pula tiles já em cache. Sequencial para não
 * estourar conexões; o volume é pequeno por construção.
 */
export async function prefillTiles(
  sourceId: TileSourceId,
  bounds: GeoBounds,
  zMin: number,
  zMax: number,
  onProgress?: (done: number, total: number) => void,
  cap = 400,
): Promise<{ stored: number; total: number }> {
  const source = TILE_SOURCES[sourceId]
  const coords = tilesForBounds(bounds, zMin, zMax, cap)
  const total = coords.length
  let stored = 0

  for (let i = 0; i < coords.length; i++) {
    const { z, x, y } = coords[i]
    const key = tileKey(sourceId, z, x, y)
    try {
      const existing = await getTile(key)
      if (!existing) {
        const res = await fetch(buildTileUrl(source, z, x, y))
        if (res.ok) {
          await putTile(key, await res.blob())
          stored++
        }
      }
    } catch {
      // tile individual falho não interrompe o lote
    }
    onProgress?.(i + 1, total)
  }

  return { stored, total }
}
