import type { GeoPoint, Point } from '@/types/domain'

type FarmRef = { polygon: Point[]; geoPolygon?: GeoPoint[] }

function bbox(farm: FarmRef) {
  const relXs = farm.polygon.map((p) => p.x)
  const relYs = farm.polygon.map((p) => p.y)
  const geo = farm.geoPolygon ?? []
  return {
    relXMin:   Math.min(...relXs), relXMax:   Math.max(...relXs),
    relYMin:   Math.min(...relYs), relYMax:   Math.max(...relYs),
    geoLngMin: Math.min(...geo.map((g) => g.lng)),
    geoLngMax: Math.max(...geo.map((g) => g.lng)),
    geoLatMin: Math.min(...geo.map((g) => g.lat)),
    geoLatMax: Math.max(...geo.map((g) => g.lat)),
  }
}

function canProject(farm: FarmRef) {
  return (farm.geoPolygon?.length ?? 0) >= 3 && farm.polygon.length >= 3
}

export function pointToGeo(p: Point, farm: FarmRef): GeoPoint | null {
  if (!canProject(farm)) return null
  const bb = bbox(farm)
  if (bb.relXMax === bb.relXMin || bb.relYMax === bb.relYMin) return null
  return {
    lng: bb.geoLngMin + ((p.x - bb.relXMin) / (bb.relXMax - bb.relXMin)) * (bb.geoLngMax - bb.geoLngMin),
    lat: bb.geoLatMax - ((p.y - bb.relYMin) / (bb.relYMax - bb.relYMin)) * (bb.geoLatMax - bb.geoLatMin),
  }
}

export function polyToGeo(pts: Point[], farm: FarmRef): GeoPoint[] | null {
  if (!canProject(farm)) return null
  const bb = bbox(farm)
  if (bb.relXMax === bb.relXMin || bb.relYMax === bb.relYMin) return null
  return pts.map((p) => ({
    lng: bb.geoLngMin + ((p.x - bb.relXMin) / (bb.relXMax - bb.relXMin)) * (bb.geoLngMax - bb.geoLngMin),
    lat: bb.geoLatMax - ((p.y - bb.relYMin) / (bb.relYMax - bb.relYMin)) * (bb.geoLatMax - bb.geoLatMin),
  }))
}

export function pointToViewbox(g: GeoPoint, farm: FarmRef): Point | null {
  if (!canProject(farm)) return null
  const bb = bbox(farm)
  if (bb.geoLngMax === bb.geoLngMin || bb.geoLatMax === bb.geoLatMin) return null
  return {
    x: bb.relXMin + ((g.lng - bb.geoLngMin) / (bb.geoLngMax - bb.geoLngMin)) * (bb.relXMax - bb.relXMin),
    y: bb.relYMin + ((bb.geoLatMax - g.lat) / (bb.geoLatMax - bb.geoLatMin)) * (bb.relYMax - bb.relYMin),
  }
}

export function polyToViewbox(pts: GeoPoint[], farm: FarmRef): Point[] | null {
  if (!canProject(farm)) return null
  const bb = bbox(farm)
  if (bb.geoLngMax === bb.geoLngMin || bb.geoLatMax === bb.geoLatMin) return null
  return pts.map((g) => ({
    x: bb.relXMin + ((g.lng - bb.geoLngMin) / (bb.geoLngMax - bb.geoLngMin)) * (bb.relXMax - bb.relXMin),
    y: bb.relYMin + ((bb.geoLatMax - g.lat) / (bb.geoLatMax - bb.geoLatMin)) * (bb.relYMax - bb.relYMin),
  }))
}
