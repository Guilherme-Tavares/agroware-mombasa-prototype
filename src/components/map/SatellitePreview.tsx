import { useEffect } from 'react'
import { MapContainer, Polygon, CircleMarker, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useFarmStore } from '@/store/useFarmStore'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import { TILE_SOURCES } from '@/lib/tiles'
import OfflineTiles from './OfflineTiles.tsx'
import type { GeoPoint } from '@/types/domain'

// Prévia em satélite (Início). Não-interativa — só enquadra a propriedade. O pai
// só renderiza este componente quando há `geoPolygon` e (provavelmente) rede; se
// os tiles falharem (offline sem cache), `onFail` devolve ao fallback ilustrado.

type LatLng = [number, number]
const toLatLng = (g: GeoPoint): LatLng => [g.lat, g.lng]

const HP_HEX: Record<'ok' | 'warning' | 'alert', string> = {
  ok: '#2E7D32', warning: '#F9A825', alert: '#C62828',
}

// Enquadra ao contorno da propriedade (auto-fit) ao montar / quando muda.
// `invalidateSize` primeiro: em container flex/lazy o Leaflet pode medir 0 na
// montagem e não carregar tiles; recalcular o tamanho corrige o mapa vazio.
function FitToFarm({ polygon }: { polygon: GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => {
      map.invalidateSize()
      if (polygon.length >= 3) {
        map.fitBounds(L.latLngBounds(polygon.map(toLatLng)), { padding: [14, 14], animate: false })
      }
    }, 0)
    return () => clearTimeout(id)
  }, [map, polygon])
  return null
}

// Avisa o pai se os tiles falharem antes de qualquer carregar (offline sem cache).
function TileFailWatcher({ onFail }: { onFail: () => void }) {
  const map = useMap()
  useEffect(() => {
    let loaded = false
    const onLoad = () => { loaded = true }
    const onError = () => { if (!loaded) onFail() }
    map.on('tileload', onLoad)
    map.on('tileerror', onError)
    return () => {
      map.off('tileload', onLoad)
      map.off('tileerror', onError)
    }
  }, [map, onFail])
  return null
}

interface SatellitePreviewProps {
  onFail: () => void
}

export default function SatellitePreview({ onFail }: SatellitePreviewProps) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  const farmGeo = farm?.geoPolygon ?? []
  const center: LatLng = farm?.geoCenter ? toLatLng(farm.geoCenter) : [-10.9295, -61.9912]
  const tiles = TILE_SOURCES.satelite

  return (
    <MapContainer
      center={center}
      zoom={15}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
      // `isolate`: contém os z-index internos do Leaflet para a prévia não
      // sobrepor o Sidebar (mobile) nem outros elementos da interface.
      className="w-full h-full isolate"
      style={{ background: '#0b1f12' }}
    >
      <OfflineTiles
        sourceId="satelite"
        url={tiles.url}
        attribution={tiles.attribution}
        maxZoom={tiles.maxZoom}
      />
      <TileFailWatcher onFail={onFail} />
      <FitToFarm polygon={farmGeo} />

      {/* Contorno da propriedade */}
      {farmGeo.length >= 3 && (
        <Polygon
          positions={farmGeo.map(toLatLng)}
          pathOptions={{ color: '#FFFFFF', weight: 2, opacity: 0.9, fill: false, dashArray: '6 6' }}
        />
      )}

      {/* Divisões (sutis) */}
      {divisions.map((d) => (
        d.geoPolygon && d.geoPolygon.length >= 3 ? (
          <Polygon
            key={d.id}
            positions={d.geoPolygon.map(toLatLng)}
            pathOptions={{ color: '#2E7D32', weight: 1.5, fillColor: '#2E7D32', fillOpacity: 0.15 }}
          />
        ) : null
      ))}

      {/* Cochos */}
      {feedTroughs.map((t) => (
        t.geoPosition ? (
          <CircleMarker
            key={t.id}
            center={toLatLng(t.geoPosition)}
            radius={5}
            pathOptions={{
              color: '#FFFFFF', weight: 1.5,
              fillColor: HP_HEX[getHPStatus(calculateHPPercentage(t.currentAmount, t.capacity))],
              fillOpacity: 0.95,
            }}
          />
        ) : null
      ))}
    </MapContainer>
  )
}
