import { createPortal } from 'react-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  MapContainer, Polygon, CircleMarker, Tooltip, useMap, useMapEvent,
} from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useFarmStore } from '@/store/useFarmStore'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import { polygonsOverlap, pointInPolygon, snapToEdges, nearestPointOnPolygon } from '@/utils/geometry'
import { TILE_SOURCES } from '@/lib/tiles'
import OfflineTiles from './OfflineTiles.tsx'
import type { GeoPoint, Point, Division } from '@/types/domain'
import type { MapLayers, SelectedElement, MapMode } from './StylizedFarmMap.tsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealFarmMapProps {
  selected:    SelectedElement
  onSelect:    (sel: SelectedElement) => void
  layers:      MapLayers
  className?:  string
  mapMode:     MapMode
  onDraftGeoPolygonChange?: (poly: GeoPoint[]) => void
  onGeoElementReposition?:  (
    type: 'herd' | 'trough',
    id:   string,
    pos:  GeoPoint,
    divisionId: string,
  ) => void
  pendingGeoVertices?: GeoPoint[]
  onGeoVertexAdd?:    (point: GeoPoint) => void
  onGeoVertexDelete?: (index: number)   => void
  onGeoPolygonClose?: ()                => void
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

type LatLng = [number, number]

const HP_HEX: Record<'ok' | 'warning' | 'alert', string> = {
  ok: '#2E7D32', warning: '#F9A825', alert: '#C62828',
}

function toLatLng(g: GeoPoint): LatLng { return [g.lat, g.lng] }

function geoCentroidLL(points: GeoPoint[]): LatLng {
  const n = points.length || 1
  return [
    points.reduce((s, p) => s + p.lat, 0) / n,
    points.reduce((s, p) => s + p.lng, 0) / n,
  ]
}

function g2p(g: GeoPoint, map: L.Map): Point {
  const pt = map.latLngToContainerPoint(L.latLng(g.lat, g.lng))
  return { x: pt.x, y: pt.y }
}

function p2g(x: number, y: number, map: L.Map): GeoPoint {
  const ll = map.containerPointToLatLng(L.point(x, y))
  return { lat: ll.lat, lng: ll.lng }
}

function geoPolyToPixels(poly: GeoPoint[], map: L.Map): Point[] {
  return poly.map((g) => g2p(g, map))
}

function geoPoly2svgPoints(poly: GeoPoint[], map: L.Map): string {
  return poly.map((g) => { const p = g2p(g, map); return `${p.x},${p.y}` }).join(' ')
}

function findDivisionAtPixel(
  x: number, y: number,
  divs: Division[],
  map: L.Map,
): Division | undefined {
  const pt = { x, y }
  return divs.find((d) => {
    if (!d.geoPolygon || d.geoPolygon.length < 3) return false
    return pointInPolygon(pt, geoPolyToPixels(d.geoPolygon, map))
  })
}


function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function minDistToPolygon(pt: Point, poly: Point[]): number {
  let min = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = distToSegment(pt, poly[i], poly[(i + 1) % poly.length])
    if (d < min) min = d
  }
  return min
}

// ─── FitToFarm ────────────────────────────────────────────────────────────────

function FitToFarm({ polygon }: { polygon: GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (polygon.length < 3) return
    map.fitBounds(L.latLngBounds(polygon.map(toLatLng)), { padding: [24, 24] })
  }, [map, polygon])
  return null
}

// ─── FarmClickHandler ─────────────────────────────────────────────────────────
// Three-zone click logic mirroring the illustrated layer + UX refinements:
//   1. Inside a division            → ignored (division handler takes it)
//   2. Inside farm, outside divs    → select farm
//   3. Outside farm, within margin  → select farm (invisible clickable perimeter)
//   4. Beyond margin                → ignored

const FARM_CLICK_MARGIN_PX = 120

interface FarmClickHandlerProps {
  farmGeo:      GeoPoint[]
  divisions:    Division[]
  onSelectFarm: () => void
  panModeRef:   React.MutableRefObject<boolean>
}

function FarmClickHandler({ farmGeo, divisions, onSelectFarm, panModeRef }: FarmClickHandlerProps) {
  const map = useMap()

  useMapEvent('mousemove', (e) => {
    const container = map.getContainer()
    const px = map.latLngToContainerPoint(e.latlng)
    const pt = { x: px.x, y: px.y }

    for (const d of divisions) {
      if (!d.geoPolygon || d.geoPolygon.length < 3) continue
      if (pointInPolygon(pt, geoPolyToPixels(d.geoPolygon, map))) {
        container.style.cursor = ''
        return
      }
    }

    if (farmGeo.length < 3) { container.style.cursor = ''; return }
    const farmPx = geoPolyToPixels(farmGeo, map)
    const near = pointInPolygon(pt, farmPx) || minDistToPolygon(pt, farmPx) <= FARM_CLICK_MARGIN_PX
    container.style.cursor = near ? 'pointer' : ''
  })

  useMapEvent('mouseout', () => { map.getContainer().style.cursor = '' })

  useMapEvent('click', (e) => {
    if (panModeRef.current) return
    const px = map.latLngToContainerPoint(e.latlng)
    const pt = { x: px.x, y: px.y }

    for (const d of divisions) {
      if (!d.geoPolygon || d.geoPolygon.length < 3) continue
      if (pointInPolygon(pt, geoPolyToPixels(d.geoPolygon, map))) return
    }

    if (farmGeo.length < 3) return
    const farmPx = geoPolyToPixels(farmGeo, map)

    if (pointInPolygon(pt, farmPx)) {
      onSelectFarm()
    } else if (minDistToPolygon(pt, farmPx) <= FARM_CLICK_MARGIN_PX) {
      onSelectFarm()
    }
  })
  return null
}

// ─── LongPressPanController ───────────────────────────────────────────────────
// Static map; a long-press activates manual pan via map.panBy. Threshold is
// pointer-type aware: ~100 ms for mouse, ~250 ms for touch (a touch tap can take
// longer than 100 ms, so a shorter threshold would swallow taps).
//
// Touch robustness: the pan engages AT the long-press timer (capture is taken
// while the finger is still held, before the drag), and pointermove/up are bound
// to `document` (not the container) so moves keep arriving even if the implicit
// touch capture target changes — both were why touch panning failed before.
//
// `skipInteractive` (default true) skips presses on [data-geo-anchor] so edit
// anchors stay draggable; view mode passes false (divisions cover the whole map,
// so pan must be allowed to start anywhere). `containerClassName` applies the
// matching cursor/touch-action CSS.

const LONG_PRESS_MS_MOUSE = 100
const LONG_PRESS_MS_TOUCH = 100

interface LongPressPanControllerProps {
  panModeRef:         React.MutableRefObject<boolean>
  skipInteractive?:   boolean
  containerClassName?: string
}

function LongPressPanController({
  panModeRef,
  skipInteractive = true,
  containerClassName,
}: LongPressPanControllerProps) {
  const map = useMap()

  useEffect(() => {
    map.dragging.disable()
    const container = map.getContainer()
    // Inline touch-action wins over Leaflet's own class/inline styles, which were
    // leaving the effective value as something that still let the browser turn a
    // one-finger drag into page scroll / pull-to-refresh.
    const prevTouchAction = container.style.touchAction
    container.style.touchAction = 'none'
    if (containerClassName) container.classList.add(containerClassName)
    return () => {
      map.dragging.enable()
      container.style.touchAction = prevTouchAction
      if (containerClassName) container.classList.remove(containerClassName)
    }
  }, [map, containerClassName])

  useEffect(() => {
    const container = map.getContainer()
    let timer: ReturnType<typeof setTimeout> | null = null
    let panActive = false
    let activePointerId: number | null = null
    let lastX = 0
    let lastY = 0

    function engage() {
      panActive = true
      panModeRef.current = true
      container.classList.add('geo-pan-active')
      document.documentElement.style.overscrollBehavior = 'none'
      // Capture now (long-press confirmed). It happens while the finger is held,
      // before the drag, so it never swallows a quick tap's selection click.
      if (activePointerId !== null) {
        try { container.setPointerCapture(activePointerId) } catch { /* ignore */ }
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (skipInteractive && (e.target as Element)?.closest?.('[data-geo-anchor]')) return
      panModeRef.current = false
      panActive = false
      activePointerId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      const ms = e.pointerType === 'touch' ? LONG_PRESS_MS_TOUCH : LONG_PRESS_MS_MOUSE
      timer = setTimeout(engage, ms)
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId !== activePointerId) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (!panActive) return
      e.preventDefault()
      map.panBy([-dx, -dy], { animate: false })
    }

    function onPointerUp(e: PointerEvent) {
      if (activePointerId !== null && e.pointerId !== activePointerId) return
      if (timer) { clearTimeout(timer); timer = null }
      panActive = false
      activePointerId = null
      container.classList.remove('geo-pan-active')
      document.documentElement.style.overscrollBehavior = ''
      if (panModeRef.current) {
        requestAnimationFrame(() => { panModeRef.current = false })
      }
    }

    // Claim every touch gesture on the map: cancel the browser's default (page
    // scroll / pull-to-refresh) on touchmove. pointermove.preventDefault() is
    // unreliable for this; preventing the native touchmove is what actually keeps
    // the gesture ours — so the pointer stream isn't killed mid-drag. Leaflet's
    // two-finger pinch still works (its JS handlers run regardless of this).
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
    }

    // pointerdown on the container (the gesture must start on the map); move/up on
    // document so the pan survives the finger leaving the container or the touch's
    // implicit capture target being recycled.
    container.addEventListener('pointerdown', onPointerDown, { passive: false })
    container.addEventListener('touchmove',    onTouchMove,   { passive: false })
    document.addEventListener('pointermove',   onPointerMove, { passive: false })
    document.addEventListener('pointerup',     onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('touchmove',    onTouchMove)
      document.removeEventListener('pointermove',   onPointerMove)
      document.removeEventListener('pointerup',     onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
    }
  }, [map, panModeRef, skipInteractive])

  return null
}

// ─── GeoEditAnchorLayer ───────────────────────────────────────────────────────

const GEO_SNAP_PX = 14

interface GeoEditAnchorLayerProps {
  initialPoly:  GeoPoint[]
  otherGeoPoly: GeoPoint[][]
  snapTargets?: GeoPoint[][]
  onChange:     (poly: GeoPoint[]) => void
}

function GeoEditAnchorLayer({ initialPoly, otherGeoPoly, snapTargets = [], onChange }: GeoEditAnchorLayerProps) {
  const map = useMap()
  const [localPoly, setLocalPoly] = useState<GeoPoint[]>(initialPoly)
  const [hoveredIdx, setHoveredIdx] = useState(-1)
  const dragRef = useRef<{
    idx:          number
    startClientX: number
    startClientY: number
    moved:        boolean
    origGeo:      GeoPoint
  } | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    onChangeRef.current(localPoly)
  }, [localPoly])

  const R = 7
  const canDelete = localPoly.length > 3

  function handleAnchorDown(e: React.PointerEvent, idx: number) {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragRef.current = {
      idx,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
      origGeo: localPoly[idx],
    }
  }

  function handleAnchorMove(e: React.PointerEvent, idx: number) {
    if (!dragRef.current || dragRef.current.idx !== idx) return
    const dx = e.clientX - dragRef.current.startClientX
    const dy = e.clientY - dragRef.current.startClientY
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 4) return
    dragRef.current.moved = true
    const origPx = g2p(dragRef.current.origGeo, map)
    let newPx = { x: origPx.x + dx, y: origPx.y + dy }
    // Snap to nearby edges of farm boundary and adjacent divisions (pixel space)
    if (snapTargets.length > 0) {
      newPx = snapToEdges(newPx, snapTargets.map((poly) => geoPolyToPixels(poly, map)), GEO_SNAP_PX)
    }
    const newGeo = p2g(newPx.x, newPx.y, map)
    // Use the closure `idx`, never `dragRef.current` here: pointermove is a
    // continuous event whose state update can be deferred/flushed AFTER a
    // pointerup/pointercancel has already set dragRef.current = null, which would
    // throw inside this updater and crash into the route error boundary.
    setLocalPoly((prev) => {
      const next = [...prev]
      next[idx] = newGeo
      return next
    })
  }

  function handleAnchorUp(idx: number) {
    if (!dragRef.current || dragRef.current.idx !== idx) return
    const wasDrag = dragRef.current.moved
    dragRef.current = null
    if (!wasDrag && canDelete) {
      setLocalPoly((prev) => {
        if (prev.length <= 3) return prev
        const next = prev.filter((_, i) => i !== idx)
        const nextPx = geoPolyToPixels(next, map)
        for (const other of otherGeoPoly) {
          if (other.length >= 3 && polygonsOverlap(nextPx, geoPolyToPixels(other, map))) return prev
        }
        return next
      })
    }
  }

  function handleMidpointClick(e: React.MouseEvent, edgeIdx: number) {
    e.stopPropagation()
    const a = localPoly[edgeIdx]
    const b = localPoly[(edgeIdx + 1) % localPoly.length]
    const mid: GeoPoint = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
    setLocalPoly((prev) => {
      const next = [...prev]
      next.splice(edgeIdx + 1, 0, mid)
      return next
    })
  }

  const pixelPoly = localPoly.map((g) => g2p(g, map))
  const pathD = pixelPoly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <g>
      <path d={pathD} fill="rgba(46,125,50,0.15)" stroke="#2E7D32" strokeWidth={2} strokeDasharray="6 4" />

      {pixelPoly.map((p, i) => {
        const b = pixelPoly[(i + 1) % pixelPoly.length]
        const mx = (p.x + b.x) / 2
        const my = (p.y + b.y) / 2
        return (
          <g key={`mid-${i}`} data-geo-anchor="true" onClick={(e) => handleMidpointClick(e, i)} style={{ cursor: 'copy', pointerEvents: 'all' }}>
            <rect
              x={mx - 5} y={my - 5} width={10} height={10}
              transform={`rotate(45,${mx},${my})`}
              fill="white" stroke="#2E7D32" strokeWidth={1.5}
            />
          </g>
        )
      })}

      {pixelPoly.map((p, i) => {
        const isHov = hoveredIdx === i
        const showDel = isHov && canDelete
        return (
          <g
            key={`anc-${i}`}
            data-geo-anchor="true"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(-1)}
            style={{ touchAction: 'none', pointerEvents: 'all' }}
          >
            <circle
              cx={p.x} cy={p.y} r={R}
              fill={showDel ? '#EF4444' : 'white'}
              stroke={showDel ? '#B91C1C' : '#2E7D32'}
              strokeWidth={2}
              style={{ cursor: showDel ? 'pointer' : 'move' }}
              onPointerDown={(e) => handleAnchorDown(e, i)}
              onPointerMove={(e) => handleAnchorMove(e, i)}
              onPointerUp={() => handleAnchorUp(i)}
              // End the drag cleanly when the browser cancels the gesture (common
              // on mobile). Clear the ref directly — routing to handleAnchorUp would
              // misread a cancel as a click and delete the vertex.
              onPointerCancel={() => { dragRef.current = null }}
              onClick={(e) => e.stopPropagation()}
            />
            {showDel && (
              <text
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={9} fontWeight="bold" fill="white"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >×</text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ─── GeoDrawGuideLayer ────────────────────────────────────────────────────────

interface GeoDrawGuideLayerProps {
  vertices:      GeoPoint[]
  cursorGeo:     GeoPoint | null
  onVertexClick: (index: number) => void
}

function GeoDrawGuideLayer({ vertices, cursorGeo, onVertexClick }: GeoDrawGuideLayerProps) {
  const map = useMap()
  const pixVerts  = vertices.map((g) => g2p(g, map))
  const pixCursor = cursorGeo ? g2p(cursorGeo, map) : null
  const canClose  = vertices.length >= 3

  if (pixVerts.length === 0) return null

  const polylineD = pixVerts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')

  return (
    <g>
      <path d={polylineD} fill="none" stroke="#2E7D32" strokeWidth={2} strokeDasharray="6 4" />

      {pixCursor && pixVerts.length > 0 && (
        <line
          x1={pixVerts[pixVerts.length - 1].x} y1={pixVerts[pixVerts.length - 1].y}
          x2={pixCursor.x} y2={pixCursor.y}
          stroke="#2E7D32" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6}
        />
      )}

      {canClose && pixCursor && (
        <line
          x1={pixVerts[0].x} y1={pixVerts[0].y}
          x2={pixCursor.x} y2={pixCursor.y}
          stroke="#2E7D32" strokeWidth={1} strokeDasharray="3 4" opacity={0.35}
        />
      )}

      {pixVerts.map((p, i) => {
        const isV0     = i === 0
        const showClose = isV0 && canClose
        const showDel   = !showClose && vertices.length > 1
        return (
          <g
            key={`v-${i}`}
            data-geo-anchor="true"
            onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); onVertexClick(i) }}
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
          >
            {showClose ? (
              <>
                <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
                <circle cx={p.x} cy={p.y} r={6} fill="#16A34A" />
              </>
            ) : (
              <circle
                cx={p.x} cy={p.y} r={5}
                fill={showDel ? '#EF4444' : '#2E7D32'}
                stroke="white" strokeWidth={1.5}
              />
            )}
            {showDel && (
              <text
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={8} fontWeight="bold" fill="white"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >×</text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ─── SatelliteEditOverlay ─────────────────────────────────────────────────────

interface SatelliteEditOverlayProps {
  mapMode:                  MapMode
  onDraftGeoPolygonChange?: (poly: GeoPoint[]) => void
  onGeoElementReposition?:  (type: 'herd' | 'trough', id: string, pos: GeoPoint, divisionId: string) => void
  pendingGeoVertices?:      GeoPoint[]
  onGeoVertexAdd?:          (point: GeoPoint) => void
  onGeoVertexDelete?:       (index: number)   => void
  onGeoPolygonClose?:       ()                => void
}

function SatelliteEditOverlay({
  mapMode, onDraftGeoPolygonChange, onGeoElementReposition,
  pendingGeoVertices = [], onGeoVertexAdd, onGeoVertexDelete, onGeoPolygonClose,
}: SatelliteEditOverlayProps) {
  const map = useMap()
  const [, setTick] = useState(0)
  const [cursorGeo, setCursorGeo] = useState<GeoPoint | null>(null)
  const panModeRef = useRef(false)

  const farm      = useFarmStore((s) => s.farm)
  const divisions = useFarmStore((s) => s.divisions)

  useMapEvent('move', () => setTick((t) => t + 1))
  useMapEvent('zoom', () => setTick((t) => t + 1))

  const farmGeo = useMemo(() => farm?.geoPolygon ?? [], [farm])
  const farmDivisions = useMemo(
    () => divisions.filter((d) => farm && d.farmId === farm.id),
    [divisions, farm],
  )

  const editPoly = useMemo<GeoPoint[] | null>(() => {
    if (mapMode.type !== 'edit-polygon') return null
    if (mapMode.target === 'farm') return farmGeo.length >= 2 ? farmGeo : null
    const div = farmDivisions.find((d) => d.id === mapMode.divisionId)
    return div?.geoPolygon && div.geoPolygon.length >= 2 ? div.geoPolygon : null
  }, [mapMode, farmGeo, farmDivisions])

  const otherGeoPoly = useMemo<GeoPoint[][]>(() => {
    if (mapMode.type !== 'edit-polygon' || mapMode.target === 'farm') return []
    return farmDivisions
      .filter((d) => d.id !== mapMode.divisionId && (d.geoPolygon?.length ?? 0) >= 3)
      .map((d) => d.geoPolygon!)
  }, [mapMode, farmDivisions])

  // Snap targets in edit mode: farm boundary + adjacent division edges
  const snapTargets = useMemo<GeoPoint[][]>(() => {
    if (mapMode.type !== 'edit-polygon') return []
    if (mapMode.target === 'farm') {
      // Farm anchors snap to division edges so corners align automatically
      return farmDivisions
        .filter((d) => (d.geoPolygon?.length ?? 0) >= 3)
        .map((d) => d.geoPolygon!)
    }
    // Division anchors snap to farm boundary + other division edges
    return [
      ...(farmGeo.length >= 3 ? [farmGeo] : []),
      ...farmDivisions
        .filter((d) => d.id !== mapMode.divisionId && (d.geoPolygon?.length ?? 0) >= 3)
        .map((d) => d.geoPolygon!),
    ]
  }, [mapMode, farmGeo, farmDivisions])

  const isPlacing = mapMode.type === 'place-element' || mapMode.type === 'reposition'

  useMapEvent('click', (e) => {
    // A click that ends a long-press pan must not add a vertex or drop an element.
    if (panModeRef.current) return
    const rawGeo = { lat: e.latlng.lat, lng: e.latlng.lng }
    if (mapMode.type === 'draw-division') {
      let finalGeo = rawGeo
      if (farmGeo.length >= 3) {
        const ptFlat:   Point   = { x: rawGeo.lng, y: rawGeo.lat }
        const farmFlat: Point[] = farmGeo.map((g) => ({ x: g.lng, y: g.lat }))
        if (!pointInPolygon(ptFlat, farmFlat)) {
          const s = nearestPointOnPolygon(ptFlat, farmFlat)
          finalGeo = { lat: s.y, lng: s.x }
        } else {
          for (const div of farmDivisions) {
            if (!div.geoPolygon || div.geoPolygon.length < 3) continue
            const divFlat = div.geoPolygon.map((g) => ({ x: g.lng, y: g.lat }))
            if (pointInPolygon(ptFlat, divFlat)) {
              const s = nearestPointOnPolygon(ptFlat, divFlat)
              finalGeo = { lat: s.y, lng: s.x }
              break
            }
          }
        }
      }
      onGeoVertexAdd?.(finalGeo)
    } else if (mapMode.type === 'place-element' || mapMode.type === 'reposition') {
      const { x, y } = map.latLngToContainerPoint(e.latlng)
      const div = findDivisionAtPixel(x, y, farmDivisions, map)
      if (div) {
        onGeoElementReposition?.(mapMode.elementType, mapMode.elementId, rawGeo, div.id)
      }
    }
  })

  useMapEvent('mousemove', (e) => {
    if (mapMode.type !== 'draw-division' && !isPlacing) return
    setCursorGeo({ lat: e.latlng.lat, lng: e.latlng.lng })
  })

  useMapEvent('mouseout', () => setCursorGeo(null))

  useEffect(() => {
    const container = map.getContainer()
    container.classList.toggle('geo-demarcation-map', mapMode.type === 'draw-division')
    container.classList.toggle('geo-edit-map',        mapMode.type === 'edit-polygon')
    container.classList.toggle('geo-place-map',       isPlacing)
    return () => {
      container.classList.remove('geo-demarcation-map')
      container.classList.remove('geo-edit-map')
      container.classList.remove('geo-place-map')
    }
  }, [map, mapMode.type, isPlacing])

  function handleVertexClick(i: number) {
    if (i === 0 && pendingGeoVertices.length >= 3) {
      onGeoPolygonClose?.()
    } else if (pendingGeoVertices.length > 1) {
      onGeoVertexDelete?.(i)
    }
  }

  const container = map.getContainer()

  return (
    <>
      {(mapMode.type === 'edit-polygon' || mapMode.type === 'draw-division' || isPlacing) && <LongPressPanController panModeRef={panModeRef} />}
      {createPortal(
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 450,
        pointerEvents: 'none',
      }}
    >
      {/* Farm boundary reference */}
      {farmGeo.length >= 3 && (
        <polygon
          points={geoPoly2svgPoints(farmGeo, map)}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Division outlines */}
      {farmDivisions.map((d) => {
        if (!d.geoPolygon || d.geoPolygon.length < 3) return null
        const isEditing = mapMode.type === 'edit-polygon' && mapMode.divisionId === d.id
        if (isEditing) return null
        return (
          <polygon
            key={d.id}
            points={geoPoly2svgPoints(d.geoPolygon, map)}
            fill={isPlacing ? 'rgba(46,125,50,0.12)' : 'rgba(46,125,50,0.08)'}
            stroke={isPlacing ? '#2E7D32' : 'rgba(46,125,50,0.55)'}
            strokeWidth={isPlacing ? 2 : 1.5}
            strokeDasharray={isPlacing ? '5 3' : undefined}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* Farm edit anchors */}
      {mapMode.type === 'edit-polygon' && mapMode.target === 'farm' && editPoly && (
        <GeoEditAnchorLayer
          key="edit-farm"
          initialPoly={editPoly}
          otherGeoPoly={[]}
          snapTargets={snapTargets}
          onChange={(poly) => onDraftGeoPolygonChange?.(poly)}
        />
      )}

      {/* Division edit anchors */}
      {mapMode.type === 'edit-polygon' && mapMode.target === 'division' && editPoly && (
        <GeoEditAnchorLayer
          key={`edit-div-${mapMode.divisionId}`}
          initialPoly={editPoly}
          otherGeoPoly={otherGeoPoly}
          snapTargets={snapTargets}
          onChange={(poly) => onDraftGeoPolygonChange?.(poly)}
        />
      )}

      {/* Draw guide */}
      {mapMode.type === 'draw-division' && (
        <GeoDrawGuideLayer
          vertices={pendingGeoVertices}
          cursorGeo={cursorGeo}
          onVertexClick={handleVertexClick}
        />
      )}

      {/* Place/reposition ghost preview following the crosshair */}
      {isPlacing && cursorGeo && (mapMode.type === 'place-element' || mapMode.type === 'reposition') && (() => {
        const px = g2p(cursorGeo, map)
        const inDiv = !!findDivisionAtPixel(px.x, px.y, farmDivisions, map)
        const color = inDiv ? '#2E7D32' : '#EF5350'
        return (
          <g style={{ pointerEvents: 'none' }} opacity={0.85}>
            <circle cx={px.x} cy={px.y} r={18} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
            {mapMode.elementType === 'herd' ? (
              <circle cx={px.x} cy={px.y} r={10} fill={color} fillOpacity={0.9} stroke="#FFFFFF" strokeWidth={2} />
            ) : (
              <rect x={px.x - 9} y={px.y - 7} width={18} height={14} rx={4} fill={color} fillOpacity={0.9} stroke="#FFFFFF" strokeWidth={2} />
            )}
          </g>
        )
      })()}
    </svg>,
    container,
  )}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RealFarmMap({
  selected, onSelect, layers, className, mapMode,
  onDraftGeoPolygonChange, onGeoElementReposition,
  pendingGeoVertices, onGeoVertexAdd, onGeoVertexDelete, onGeoPolygonClose,
}: RealFarmMapProps) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const herds       = useFarmStore((s) => s.herds)
  const allocations = useFarmStore((s) => s.allocations)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  const inEditMode = mapMode.type !== 'view'

  const activeDivByHerd = useMemo(() => {
    const m = new Map<string, string>()
    allocations.filter((a) => a.active).forEach((a) => m.set(a.herdId, a.divisionId))
    return m
  }, [allocations])

  const tiles  = TILE_SOURCES['satelite']
  const center: LatLng = farm?.geoCenter ? toLatLng(farm.geoCenter) : [-10.9295, -61.9912]
  const farmGeo = useMemo(() => farm?.geoPolygon ?? [], [farm])

  // View-mode pan: true while a long-press pan is happening, so selection clicks
  // (farm, division, herd, trough) are suppressed when the gesture was a pan.
  const viewPanModeRef = useRef(false)

  return (
    <div className={`${className ?? ''} isolate`}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom
        zoomControl={false}
        className="w-full h-full"
        style={{ background: '#0b1f12' }}
      >
        <OfflineTiles
          sourceId="satelite"
          url={tiles.url}
          attribution={tiles.attribution}
          maxNativeZoom={tiles.maxNativeZoom}
        />

        {farmGeo.length >= 3 && <FitToFarm polygon={farmGeo} />}

        {/* View mode: Leaflet native layers */}
        {!inEditMode && (
          <>
            {/* Static map; long-press to pan (same model as the edit modes). */}
            <LongPressPanController
              panModeRef={viewPanModeRef}
              skipInteractive={false}
              containerClassName="geo-view-map"
            />

            <FarmClickHandler
              farmGeo={farmGeo}
              divisions={divisions}
              onSelectFarm={() => onSelect({ type: 'farm' })}
              panModeRef={viewPanModeRef}
            />

            {farmGeo.length >= 3 && (
              <>
                <Polygon
                  positions={farmGeo.map(toLatLng)}
                  pathOptions={{ color: '#000000', weight: 6, opacity: 0.45, fill: false, dashArray: '10 6', interactive: false }}
                />
                <Polygon
                  positions={farmGeo.map(toLatLng)}
                  pathOptions={{ color: '#FFFFFF', weight: 3, opacity: 1, fill: false, dashArray: '10 6', interactive: false }}
                />
              </>
            )}

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
                  eventHandlers={{ click: (e: L.LeafletMouseEvent) => {
                    if (viewPanModeRef.current) return
                    ;(e.originalEvent.target as HTMLElement | null)?.blur?.()
                    onSelect({ type: 'division', id: d.id })
                  } }}
                >
                  <Tooltip direction="center" opacity={0.9}>{d.name}</Tooltip>
                </Polygon>
              )
            })}

            {layers.herds && herds.map((h) => {
              const divId = activeDivByHerd.get(h.id)
              const div   = divisions.find((d) => d.id === divId)
              if (!div?.geoPolygon || div.geoPolygon.length < 3) return null
              const isSel  = selected?.type === 'herd' && selected.id === h.id
              const accent = h.purpose === 'engorda' ? '#5D4037' : '#2E7D32'
              return (
                <CircleMarker
                  key={h.id}
                  center={geoCentroidLL(div.geoPolygon)}
                  radius={isSel ? 12 : 10}
                  pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: accent, fillOpacity: 0.95 }}
                  eventHandlers={{ click: () => { if (!viewPanModeRef.current) onSelect({ type: 'herd', id: h.id }) } }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>{h.name}</Tooltip>
                </CircleMarker>
              )
            })}

            {layers.troughs && feedTroughs.map((t) => {
              if (!t.geoPosition) return null
              const pct    = calculateHPPercentage(t.currentAmount, t.capacity)
              const status = getHPStatus(pct)
              const isSel  = selected?.type === 'trough' && selected.id === t.id
              return (
                <CircleMarker
                  key={t.id}
                  center={toLatLng(t.geoPosition)}
                  radius={isSel ? 9 : 7}
                  pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: HP_HEX[status], fillOpacity: 0.95 }}
                  eventHandlers={{ click: () => { if (!viewPanModeRef.current) onSelect({ type: 'trough', id: t.id }) } }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    {t.identifier} · {Math.round(pct)}%
                  </Tooltip>
                </CircleMarker>
              )
            })}
          </>
        )}

        {/* Edit mode: SVG overlay */}
        {inEditMode && (
          <SatelliteEditOverlay
            mapMode={mapMode}
            onDraftGeoPolygonChange={onDraftGeoPolygonChange}
            onGeoElementReposition={onGeoElementReposition}
            pendingGeoVertices={pendingGeoVertices}
            onGeoVertexAdd={onGeoVertexAdd}
            onGeoVertexDelete={onGeoVertexDelete}
            onGeoPolygonClose={onGeoPolygonClose}
          />
        )}
      </MapContainer>
    </div>
  )
}
