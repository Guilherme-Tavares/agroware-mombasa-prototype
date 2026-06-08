import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Undo2, Check, Ruler, Satellite, Palette } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import {
  geoPolygonAreaHa, geoPolygonPerimeterM, geoCentroid, geoToViewbox,
  pointInPolygon, snapToEdges, nearestPointOnPolygon,
} from '@/utils/geometry'
import type { Point } from '@/types/domain'
import { TILE_SOURCES } from '@/lib/tiles'
import OfflineTiles from './OfflineTiles.tsx'
import Button from '@/components/ui/Button.tsx'
import Modal from '@/components/ui/Modal.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { GeoPoint, Division, DivisionType } from '@/types/domain'

type DemarcationMode = 'ilustrada' | 'real'
type Target = 'property' | 'division'
type DragState = { index: number; moved: boolean } | null

const DIVISION_TYPE_OPTIONS = [
  { value: 'pasto',      label: 'Pastagem'    },
  { value: 'reserva',    label: 'Reserva'     },
  { value: 'curral',     label: 'Curral'      },
  { value: 'manga',      label: 'Manga'       },
  { value: 'instalacao', label: 'Instalação'  },
]

type LatLng = [number, number]
const toLatLng = (g: GeoPoint): LatLng => [g.lat, g.lng]

// ─── Tile failure detection ───────────────────────────────────────────────────

function TileFailWatcher({ onFail }: { onFail?: () => void }) {
  const map = useMap()
  useEffect(() => {
    if (!onFail) return
    let loaded = false
    const onLoad  = () => { loaded = true }
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

// ─── Click to add vertex or close polygon ────────────────────────────────────

function ClickCapture({
  verticesRef, closedRef, anchorClickedRef, onAdd, onClose,
}: {
  verticesRef:      React.MutableRefObject<GeoPoint[]>
  closedRef:        React.MutableRefObject<boolean>
  anchorClickedRef: React.MutableRefObject<boolean>
  onAdd:   (p: GeoPoint) => void
  onClose: () => void
}) {
  const map = useMapEvents({
    click(e) {
      if (closedRef.current) return
      // An anchor was pressed → deletion already handled; don't add a new vertex.
      if (anchorClickedRef.current) {
        anchorClickedRef.current = false
        return
      }
      const v = verticesRef.current
      if (v.length >= 3) {
        const p0 = map.latLngToContainerPoint([v[0].lat, v[0].lng])
        const pc = map.latLngToContainerPoint(e.latlng)
        if (p0.distanceTo(pc) < 16) { onClose(); return }
      }
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// ─── Draggable / deletable anchor markers ────────────────────────────────────

const GEO_SNAP_PX = 14

function AnchorLayer({
  vertices, interactive, snapTargets, dragRef, anchorClickedRef, onUpdate, onDelete, onClose,
}: {
  vertices:         GeoPoint[]
  interactive:      boolean
  snapTargets:      GeoPoint[][]
  dragRef:          React.MutableRefObject<DragState>
  anchorClickedRef: React.MutableRefObject<boolean>
  onUpdate: (index: number, pos: GeoPoint) => void
  onDelete: (index: number) => void
  onClose:  () => void
}) {
  const map = useMap()

  // Safety net: if mouseup/touchend fires outside the map container (e.g. the
  // user drags an anchor off-screen), the useMapEvents mouseup below never fires.
  // Without this, map.dragging stays disabled and every subsequent tap/click
  // becomes a vertex instead of a pan.
  useEffect(() => {
    function cleanup() {
      if (!dragRef.current) return
      dragRef.current = null
      map.dragging.enable()
    }
    document.addEventListener('mouseup',     cleanup)
    document.addEventListener('touchend',    cleanup)
    document.addEventListener('touchcancel', cleanup)
    return () => {
      document.removeEventListener('mouseup',     cleanup)
      document.removeEventListener('touchend',    cleanup)
      document.removeEventListener('touchcancel', cleanup)
    }
  }, [map, dragRef])

  function geoPolyToPx(poly: GeoPoint[]): Point[] {
    return poly.map((g) => {
      const px = map.latLngToContainerPoint([g.lat, g.lng] as L.LatLngTuple)
      return { x: px.x, y: px.y }
    })
  }

  function pxToGeo(px: Point): GeoPoint {
    const ll = map.containerPointToLatLng(L.point(px.x, px.y))
    return { lat: ll.lat, lng: ll.lng }
  }

  function applySnap(rawPx: Point): Point {
    if (snapTargets.length === 0) return rawPx
    return snapToEdges(rawPx, snapTargets.map(geoPolyToPx), GEO_SNAP_PX)
  }

  useMapEvents({
    mousemove(e) {
      if (!dragRef.current || !interactive) return
      dragRef.current.moved = true
      const snapped = applySnap({ x: e.containerPoint.x, y: e.containerPoint.y })
      onUpdate(dragRef.current.index, pxToGeo(snapped))
    },
    mouseup() {
      if (!dragRef.current) return
      const { index, moved } = dragRef.current
      dragRef.current = null
      map.dragging.enable()
      if (!moved && interactive) {
        anchorClickedRef.current = true
        if (index === 0 && vertices.length >= 3) {
          onClose()
        } else {
          onDelete(index)
        }
      }
    },
  })

  return (
    <>
      {vertices.map((v, i) => (
        <CircleMarker
          key={i}
          center={toLatLng(v)}
          radius={i === 0 ? 9 : 7}
          pathOptions={{
            color: '#FFFFFF', weight: 2,
            fillColor: i === 0 ? '#1B5E20' : '#2E7D32', fillOpacity: 1,
          }}
          eventHandlers={interactive ? {
            mousedown: (e: L.LeafletMouseEvent) => {
              ;(e.originalEvent.target as HTMLElement)?.blur?.()
              dragRef.current = { index: i, moved: false }
              map.dragging.disable()
            },
          } : {}}
        />
      ))}
    </>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GeoDemarcationProps {
  onCancel:     () => void
  onFail?:      () => void
  mode:         DemarcationMode
  onModeChange: (m: DemarcationMode) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GeoDemarcation({ onCancel, onFail, mode, onModeChange }: GeoDemarcationProps) {
  const navigate    = useNavigate()
  const toast       = useToast()
  const farm          = useFarmStore((s) => s.farm)
  const updateFarm    = useFarmStore((s) => s.updateFarm)
  const addDivision   = useFarmStore((s) => s.addDivision)
  const allDivisions  = useFarmStore((s) => s.divisions)

  const existingDivisions = useMemo(
    () => allDivisions.filter((d) => d.farmId === farm?.id && (d.geoPolygon?.length ?? 0) >= 3),
    [allDivisions, farm?.id],
  )

  const [vertices, setVertices]   = useState<GeoPoint[]>([])
  const [isClosed, setIsClosed]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)

  const [target, setTarget]   = useState<Target>('property')
  const [name, setName]       = useState(farm?.name ?? 'Sítio Santa Fé')
  const [city, setCity]       = useState(farm?.city ?? '')
  const [uf, setUf]           = useState(farm?.state ?? '')
  const [divType, setDivType] = useState<DivisionType>('pasto')

  const verticesRef      = useRef<GeoPoint[]>(vertices)
  const closedRef        = useRef<boolean>(isClosed)
  const dragRef          = useRef<DragState>(null)
  const anchorClickedRef = useRef(false)

  useEffect(() => { verticesRef.current = vertices }, [vertices])
  useEffect(() => { closedRef.current   = isClosed  }, [isClosed])

  const areaHa      = useMemo(() => geoPolygonAreaHa(vertices),    [vertices])
  const perimeterM  = useMemo(() => geoPolygonPerimeterM(vertices), [vertices])
  const canConclude = vertices.length >= 3

  const center: LatLng = farm?.geoCenter ? toLatLng(farm.geoCenter) : [-10.9295, -61.9912]
  const sat = TILE_SOURCES.satelite

  // Snap targets: when drawing a division, snap anchors to the farm boundary.
  const snapTargets = useMemo((): GeoPoint[][] => {
    if (target !== 'division' || !farm?.geoPolygon || farm.geoPolygon.length < 3) return []
    return [farm.geoPolygon]
  }, [target, farm])

  function handleAdd(p: GeoPoint) {
    if (target === 'division' && farm?.geoPolygon && farm.geoPolygon.length >= 3) {
      const ptFlat:   Point   = { x: p.lng,  y: p.lat  }
      const farmFlat: Point[] = farm.geoPolygon.map((g) => ({ x: g.lng, y: g.lat }))

      let snapped = ptFlat

      if (!pointInPolygon(ptFlat, farmFlat)) {
        // Outside farm: project onto nearest farm boundary point
        snapped = nearestPointOnPolygon(ptFlat, farmFlat)
      } else {
        // Inside farm: if inside an existing division, project onto its boundary
        for (const div of existingDivisions) {
          const divFlat = div.geoPolygon!.map((g) => ({ x: g.lng, y: g.lat }))
          if (pointInPolygon(ptFlat, divFlat)) {
            snapped = nearestPointOnPolygon(ptFlat, divFlat)
            break
          }
        }
      }

      setVertices((prev) => [...prev, { lat: snapped.y, lng: snapped.x }])
      return
    }
    setVertices((prev) => [...prev, p])
  }

  function handleClose() {
    if (verticesRef.current.length < 3) return
    setIsClosed(true)
    setShowModal(true)
  }

  function handleUndo() {
    if (isClosed) { setIsClosed(false); return }
    setVertices((prev) => prev.slice(0, -1))
  }

  function handleUpdate(index: number, pos: GeoPoint) {
    setVertices((v) => v.map((p, i) => (i === index ? pos : p)))
  }

  function handleDeleteVertex(index: number) {
    setVertices((v) => v.filter((_, i) => i !== index))
    setIsClosed(false)
  }

  function handleModalClose() {
    setShowModal(false)
    setIsClosed(false)
  }

  function handleSave() {
    setSaving(true)
    const geoPolygon = vertices
    const relative   = geoToViewbox(geoPolygon)
    setTimeout(() => {
      if (target === 'property') {
        updateFarm({
          geoPolygon,
          geoCenter: geoCentroid(geoPolygon),
          polygon:   relative,
          totalArea: parseFloat(areaHa.toFixed(1)),
          perimeter: parseFloat(perimeterM.toFixed(0)),
          name:      name.trim() || 'Sítio Santa Fé',
          city:      city.trim(),
          state:     uf.trim().toUpperCase(),
        })
        toast.success('Propriedade demarcada sobre o mapa real.')
      } else {
        const division: Division = {
          id:        crypto.randomUUID(),
          farmId:    farm?.id ?? '',
          name:      name.trim() || 'Nova divisão',
          area:      parseFloat(areaHa.toFixed(1)),
          type:      divType,
          status:    'active',
          polygon:   relative,
          geoPolygon,
          active:    true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        addDivision(division)
        toast.success('Divisão demarcada e cadastrada.')
      }
      setSaving(false)
      navigate('/map')
    }, 600)
  }

  const positions = vertices.map(toLatLng)

  return (
    <>
      {/* Canvas
          `isolate` creates a stacking context that contains Leaflet's internal
          z-indices (200-700), so the Modal portal at z-50 renders above the map. */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card isolate"
        style={{ height: 'calc(100svh - 320px)', minHeight: '360px' }}
      >
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom
          zoomControl={false}
          className="w-full h-full geo-demarcation-map"
          style={{ background: '#0b1f12' }}
        >
          <OfflineTiles sourceId="satelite" url={sat.url} attribution={sat.attribution} maxNativeZoom={sat.maxNativeZoom} />
          <TileFailWatcher onFail={onFail} />
          <ClickCapture
            verticesRef={verticesRef}
            closedRef={closedRef}
            anchorClickedRef={anchorClickedRef}
            onAdd={handleAdd}
            onClose={handleClose}
          />
          <AnchorLayer
            vertices={vertices}
            interactive={!showModal}
            snapTargets={snapTargets}
            dragRef={dragRef}
            anchorClickedRef={anchorClickedRef}
            onUpdate={handleUpdate}
            onDelete={handleDeleteVertex}
            onClose={handleClose}
          />

          {/* Farm boundary reference when drawing a division */}
          {target === 'division' && farm?.geoPolygon && farm.geoPolygon.length >= 3 && (
            <Polygon
              positions={farm.geoPolygon.map((g) => [g.lat, g.lng] as LatLng)}
              pathOptions={{ color: '#0277BD', weight: 2, dashArray: '6 4', fillOpacity: 0.08, fillColor: '#0277BD' }}
            />
          )}

          {/* Edges being drawn */}
          {positions.length >= 2 && !isClosed && (
            <Polyline positions={positions} pathOptions={{ color: '#FFFFFF', weight: 2.5, dashArray: '8 6' }} />
          )}
          {positions.length >= 3 && isClosed && (
            <Polygon positions={positions} pathOptions={{ color: '#FFFFFF', weight: 2.5, fillColor: '#2E7D32', fillOpacity: 0.25 }} />
          )}
        </MapContainer>

        {/* Area card */}
        {vertices.length >= 3 && (
          <div className="absolute top-3 right-3 z-[500] bg-white/96 backdrop-blur-sm rounded-xl border border-gray-200 shadow-floating px-4 py-3 pointer-events-none">
            <div className="flex items-center gap-1.5 text-caption text-gray-400 mb-1.5">
              <Ruler size={12} />
              <span className="uppercase tracking-wide font-medium text-[10px]">Área estimada</span>
            </div>
            <p className="font-data text-h2 text-primary tabular-nums leading-tight">
              {areaHa.toFixed(1).replace('.', ',')} ha
            </p>
            <span className="text-caption text-gray-400 tabular-nums">
              {perimeterM >= 1000
                ? `${(perimeterM / 1000).toFixed(2).replace('.', ',')} km`
                : `${Math.round(perimeterM)} m`} · {vertices.length} pts
            </span>
          </div>
        )}

        {/* Hint */}
        {vertices.length === 0 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-1.5 pointer-events-none">
            <span className="text-caption text-gray-600">Clique no mapa para marcar os cantos</span>
          </div>
        )}

        {/* Base layer toggle */}
        {!showModal && (
          <div className="absolute bottom-6 right-3 z-[500] flex rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => onModeChange('real')}
              aria-pressed={mode === 'real'}
              className={['flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
                mode === 'real' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'].join(' ')}
            >
              <Satellite size={14} />
              <span className="hidden sm:inline">Satélite</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('ilustrada')}
              aria-pressed={mode === 'ilustrada'}
              className={['flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
                mode === 'ilustrada' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'].join(' ')}
            >
              <Palette size={14} />
              <span className="hidden sm:inline">Ilustrada</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-4">
        <Button variant="ghost" icon={<Undo2 size={15} />} onClick={handleUndo} disabled={vertices.length === 0}>
          Desfazer
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" fullWidth icon={<Check size={15} />} disabled={!canConclude} onClick={handleClose}>
          Concluir Demarcação
        </Button>
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title="Confirmar Demarcação"
        description="Revise e escolha o que esta área representa."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-bg">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Área</span>
              <span className="font-data text-h2 text-primary tabular-nums leading-tight">
                {areaHa.toFixed(1).replace('.', ',')} ha
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Vértices</span>
              <span className="font-data text-h2 text-gray-900 tabular-nums leading-tight">{vertices.length}</span>
            </div>
          </div>

          <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
            {([['property', 'Propriedade'], ['division', 'Nova divisão']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTarget(key)}
                className={[
                  'flex-1 py-2 rounded-md text-button transition-colors',
                  target === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {target === 'property' ? (
            <>
              <Input label="Nome da propriedade" value={name} onChange={(e) => setName(e.target.value)} required />
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Input label="Município" value={city} onChange={(e) => setCity(e.target.value)} required />
                <Input label="UF" value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} required />
              </div>
            </>
          ) : (
            <>
              <Input label="Nome da divisão" value={name} onChange={(e) => setName(e.target.value)} required />
              <Select
                label="Tipo"
                value={divType}
                options={DIVISION_TYPE_OPTIONS}
                onChange={(e) => setDivType(e.target.value as DivisionType)}
              />
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" fullWidth onClick={handleModalClose} disabled={saving}>
              Revisar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={saving}
              icon={<Check size={15} />}
              onClick={handleSave}
              disabled={target === 'property' ? (!name.trim() || !city.trim() || !uf.trim()) : !name.trim()}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
