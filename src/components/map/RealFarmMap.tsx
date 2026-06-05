import { useMemo, useEffect } from 'react'
import {
  MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap,
} from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useFarmStore } from '@/store/useFarmStore'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import type { GeoPoint } from '@/types/domain'
import type { MapLayers, SelectedElement } from './StylizedFarmMap.tsx'

// ─── Base layer ────────────────────────────────────────────────────────────

export type RealBaseLayer = 'satelite' | 'mapa'

const TILES: Record<RealBaseLayer, { url: string; attribution: string; maxZoom: number }> = {
  satelite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  mapa: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
}

// Status → cor (mesmo semáforo do resto do app).
const HP_HEX: Record<'ok' | 'warning' | 'alert', string> = {
  ok: '#2E7D32', warning: '#F9A825', alert: '#C62828',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type LatLng = [number, number]

function toLatLng(g: GeoPoint): LatLng {
  return [g.lat, g.lng]
}

function geoCentroid(points: GeoPoint[]): LatLng {
  const n = points.length || 1
  const lat = points.reduce((s, p) => s + p.lat, 0) / n
  const lng = points.reduce((s, p) => s + p.lng, 0) / n
  return [lat, lng]
}

// Ajusta o enquadramento ao contorno da propriedade na montagem e quando o
// polígono muda. Componente filho porque `useMap` exige estar dentro do mapa.
function FitToFarm({ polygon }: { polygon: GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (polygon.length < 3) return
    const bounds = L.latLngBounds(polygon.map(toLatLng))
    map.fitBounds(bounds, { padding: [24, 24] })
  }, [map, polygon])
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RealFarmMapProps {
  selected: SelectedElement
  onSelect: (sel: SelectedElement) => void
  layers: MapLayers
  baseLayer: RealBaseLayer
  className?: string
}

export default function RealFarmMap({
  selected, onSelect, layers, baseLayer, className,
}: RealFarmMapProps) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const herds       = useFarmStore((s) => s.herds)
  const allocations = useFarmStore((s) => s.allocations)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  // Divisão da alocação ativa de cada rebanho (para posicionar o marcador).
  const activeDivByHerd = useMemo(() => {
    const map = new Map<string, string>()
    allocations.filter((a) => a.active).forEach((a) => map.set(a.herdId, a.divisionId))
    return map
  }, [allocations])

  const tiles = TILES[baseLayer]
  const center: LatLng = farm?.geoCenter ? toLatLng(farm.geoCenter) : [-10.9295, -61.9912]
  const farmGeo = farm?.geoPolygon ?? []

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom
        zoomControl
        className="w-full h-full"
        style={{ background: '#0b1f12' }}
      >
        <TileLayer
          key={baseLayer}
          url={tiles.url}
          attribution={tiles.attribution}
          maxZoom={tiles.maxZoom}
        />

        {farmGeo.length >= 3 && <FitToFarm polygon={farmGeo} />}

        {/* Contorno da propriedade */}
        {farmGeo.length >= 3 && (
          <Polygon
            positions={farmGeo.map(toLatLng)}
            pathOptions={{ color: '#FFFFFF', weight: 2, opacity: 0.9, fill: false, dashArray: '6 6' }}
          />
        )}

        {/* Divisões */}
        {layers.divisions && divisions.map((d) => {
          if (!d.geoPolygon || d.geoPolygon.length < 3) return null
          const isSel = selected?.type === 'division' && selected.id === d.id
          return (
            <Polygon
              key={d.id}
              positions={d.geoPolygon.map(toLatLng)}
              pathOptions={{
                color: isSel ? '#FFFFFF' : '#2E7D32',
                weight: isSel ? 3 : 2,
                fillColor: '#2E7D32',
                fillOpacity: isSel ? 0.35 : 0.18,
              }}
              eventHandlers={{ click: () => onSelect({ type: 'division', id: d.id }) }}
            >
              <Tooltip direction="center" opacity={0.9}>{d.name}</Tooltip>
            </Polygon>
          )
        })}

        {/* Rebanhos (no centroide da divisão alocada) */}
        {layers.herds && herds.map((h) => {
          const divId = activeDivByHerd.get(h.id)
          const div = divisions.find((d) => d.id === divId)
          if (!div?.geoPolygon || div.geoPolygon.length < 3) return null
          const isSel = selected?.type === 'herd' && selected.id === h.id
          const accent = h.purpose === 'engorda' ? '#5D4037' : '#2E7D32'
          return (
            <CircleMarker
              key={h.id}
              center={geoCentroid(div.geoPolygon)}
              radius={isSel ? 12 : 10}
              pathOptions={{
                color: '#FFFFFF', weight: 2,
                fillColor: accent, fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelect({ type: 'herd', id: h.id }) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>{h.name}</Tooltip>
            </CircleMarker>
          )
        })}

        {/* Cochos */}
        {layers.troughs && feedTroughs.map((t) => {
          if (!t.geoPosition) return null
          const pct = calculateHPPercentage(t.currentAmount, t.capacity)
          const status = getHPStatus(pct)
          const isSel = selected?.type === 'trough' && selected.id === t.id
          return (
            <CircleMarker
              key={t.id}
              center={toLatLng(t.geoPosition)}
              radius={isSel ? 9 : 7}
              pathOptions={{
                color: '#FFFFFF', weight: 2,
                fillColor: HP_HEX[status], fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelect({ type: 'trough', id: t.id }) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {t.identifier} · {Math.round(pct)}%
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
