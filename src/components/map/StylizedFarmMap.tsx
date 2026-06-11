import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/useFarmStore'
import { useMapPanZoom, type MapPanZoomApi } from '@/hooks/useMapPanZoom'
import {
  polygonCentroid, polygonToPoints, pointInPolygon,
  isNearPolygonEdge, snapToEdges, polygonsOverlap, segmentsIntersect,
} from '@/utils/geometry'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import type { Point } from '@/types/domain'

const VIEWBOX_W = 1000
const VIEWBOX_H = 700
const SNAP_RADIUS = 12

// ─── Public types ─────────────────────────────────────────────────────────────

export interface MapLayers {
  divisions: boolean
  herds:     boolean
  troughs:   boolean
  forages:   boolean
}

export type SelectedElement =
  | { type: 'farm' }
  | { type: 'division'; id: string }
  | { type: 'herd';     id: string }
  | { type: 'trough';   id: string }
  | null

export type MapMode =
  | { type: 'view' }
  | { type: 'edit-polygon'; target: 'farm' | 'division'; divisionId?: string }
  | { type: 'draw-division'; divisionId: string }
  | { type: 'reposition'; elementType: 'herd' | 'trough'; elementId: string }
  | { type: 'place-element'; elementType: 'herd' | 'trough'; elementId: string }

interface StylizedFarmMapProps {
  selected:     SelectedElement
  onSelect:     (sel: SelectedElement) => void
  layers:       MapLayers
  satelliteMode: boolean
  panZoomApi?:  MapPanZoomApi
  className?:   string
  mapMode?:     MapMode
  /** Chamado enquanto âncoras são arrastadas (draft em tempo real). */
  onDraftPolygonChange?: (polygon: Point[]) => void
  /** Chamado quando o reposicionamento de um elemento é confirmado no drop. */
  onElementReposition?: (
    elementType: 'herd' | 'trough',
    elementId: string,
    position: Point,
    divisionId: string,
  ) => void
  /** Vértices pendentes do modo draw-division (gerenciados externamente). */
  pendingVertices?: Point[]
  /** Chamado quando o usuário adiciona um vértice em draw-division. */
  onVertexAdd?: (point: Point) => void
  /** Chamado quando o usuário fecha o polígono (clique perto do 1º vértice). */
  onPolygonClose?: () => void
  /** Chamado quando o usuário clica em um vértice existente para removê-lo. */
  onVertexDelete?: (index: number) => void
}

// ─── Forage colors ────────────────────────────────────────────────────────────

const FORAGE_PATTERN_ID: Record<string, string> = {
  forage_01: 'pattern-mombaca',
  forage_02: 'pattern-brachiaria',
}

const FORAGE_BASE_FILL: Record<string, string> = {
  forage_01: '#B8DDB5',
  forage_02: '#CDDFA0',
}

// ─── Herd anchor calculation ──────────────────────────────────────────────────

const HERD_TROUGH_OFFSET = 52
function herdAnchorInDivision(polygon: Point[], troughPositions: Point[]): Point {
  const c = polygonCentroid(polygon)
  if (troughPositions.length === 0) return c
  const at = {
    x: troughPositions.reduce((s, p) => s + p.x, 0) / troughPositions.length,
    y: troughPositions.reduce((s, p) => s + p.y, 0) / troughPositions.length,
  }
  let dx = c.x - at.x
  let dy = c.y - at.y
  const d = Math.hypot(dx, dy)
  if (d < 1) { dx = 0; dy = -1 } else { dx /= d; dy /= d }
  const candidate = { x: c.x + dx * HERD_TROUGH_OFFSET, y: c.y + dy * HERD_TROUGH_OFFSET }
  return pointInPolygon(candidate, polygon) ? candidate : c
}

// ─── Screen → ViewBox coordinate conversion ───────────────────────────────────
//
// With preserveAspectRatio="xMidYMid meet" the viewBox is scaled uniformly to
// fit inside the SVG element, leaving letterbox bands on whichever axis has
// surplus space. We must account for:
//   1. The uniform scale factor (min of x-scale and y-scale).
//   2. The centering offset in the letterboxed axis.
//
// Previously the code used (x / rect.width * VIEWBOX_W) which is only correct
// for "none" (non-uniform) scaling and caused dead zones on left/right or
// top/bottom depending on the element's aspect ratio.

function svgMeetMetrics(svgEl: SVGSVGElement) {
  const rect   = svgEl.getBoundingClientRect()
  const scale  = Math.min(rect.width / VIEWBOX_W, rect.height / VIEWBOX_H)
  const offsetX = (rect.width  - VIEWBOX_W * scale) / 2
  const offsetY = (rect.height - VIEWBOX_H * scale) / 2
  return { rect, scale, offsetX, offsetY }
}

function screenToVB(
  clientX: number, clientY: number,
  svgEl: SVGSVGElement,
  pan: Point, zoom: number,
): Point {
  const { rect, scale, offsetX, offsetY } = svgMeetMetrics(svgEl)
  const svgX = (clientX - rect.left - offsetX) / scale
  const svgY = (clientY - rect.top  - offsetY) / scale
  return { x: (svgX - pan.x) / zoom, y: (svgY - pan.y) / zoom }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StylizedFarmMap({
  selected, onSelect, layers, satelliteMode, panZoomApi, className,
  mapMode = { type: 'view' },
  onDraftPolygonChange, onElementReposition,
  pendingVertices = [], onVertexAdd, onPolygonClose, onVertexDelete,
}: StylizedFarmMapProps) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const herds       = useFarmStore((s) => s.herds)
  const bovines     = useFarmStore((s) => s.bovines)
  const allocations = useFarmStore((s) => s.allocations)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  // Scoped to the active farm only — prevents cross-farm polygon rendering
  const farmDivisions = useMemo(
    () => divisions.filter((d) => d.farmId === farm?.id),
    [divisions, farm?.id],
  )
  const farmTroughs = useMemo(
    () => feedTroughs.filter((t) => farmDivisions.some((d) => d.id === t.divisionId)),
    [feedTroughs, farmDivisions],
  )

  const isPlacing   = mapMode.type === 'place-element' || mapMode.type === 'reposition'
  // Long-press pan is available in view + place/reposition; only polygon
  // edit/draw keeps the SVG fully static.
  const panEnabled  = mapMode.type !== 'edit-polygon' && mapMode.type !== 'draw-division'
  const internalApi = useMapPanZoom({
    viewBoxWidth: VIEWBOX_W, viewBoxHeight: VIEWBOX_H,
    disabled: !panEnabled,
    longPressToPan: true,
    longPressEngageOnArm: isPlacing,
  })
  const api = panZoomApi ?? internalApi
  const { svgRef, pan, zoom, wasDraggingRef, handlePointerDown, handlePointerMove, handlePointerUp } = api

  // ── Derived data ────────────────────────────────────────────────────────────

  const activeAllocByDivision = useMemo(() => {
    const map = new Map<string, string>()
    allocations.filter((a) => a.active).forEach((a) => map.set(a.divisionId, a.herdId))
    return map
  }, [allocations])

  const headCountByHerd = useMemo(() => {
    const map = new Map<string, number>()
    bovines.forEach((b) => {
      if (!b.herdId) return
      map.set(b.herdId, (map.get(b.herdId) ?? 0) + 1)
    })
    return map
  }, [bovines])

  // ── Edit polygon draft ──────────────────────────────────────────────────────

  const [draftPolygon, setDraftPolygon] = useState<Point[]>([])

  useEffect(() => {
    if (mapMode.type === 'edit-polygon') {
      const poly = mapMode.target === 'farm'
        ? (farm?.polygon ?? [])
        : (farmDivisions.find((d) => d.id === mapMode.divisionId)?.polygon ?? [])
      setDraftPolygon([...poly])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode.type])

  useEffect(() => {
    if (mapMode.type === 'edit-polygon') onDraftPolygonChange?.(draftPolygon)
  }, [draftPolygon, mapMode.type, onDraftPolygonChange])

  // ── Cursor tracking (draw, place and reposition modes) ──────────────────────

  const [cursorVB, setCursorVB] = useState<Point | null>(null)

  // ── SVG event handlers ──────────────────────────────────────────────────────

  function handleSVGPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    if (mapMode.type === 'draw-division' || isPlacing) {
      setCursorVB(screenToVB(e.clientX, e.clientY, svgRef.current, pan, zoom))
    }
    if (panEnabled) handlePointerMove(e)
  }

  function handleSVGPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (panEnabled) handlePointerUp(e)
  }

  function handleSVGClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return

    // View mode — three-zone farm selection (mirrors satellite-layer FarmClickHandler):
    //   1. Inside farm + inside a division  → no-op (division's own click already fired)
    //   2. Inside farm + outside divisions  → select farm
    //   3. Outside farm, within 120 px      → select farm (external click perimeter)
    //   4. Beyond 120 px                    → no-op
    if (mapMode.type === 'view' && !wasDraggingRef.current && farm) {
      const pt = screenToVB(e.clientX, e.clientY, svgRef.current, pan, zoom)
      if (pointInPolygon(pt, farm.polygon)) {
        const inDiv = farmDivisions.some((d) => d.polygon.length >= 3 && pointInPolygon(pt, d.polygon))
        if (!inDiv) onSelect({ type: 'farm' })
      } else if (isNearPolygonEdge(pt, farm.polygon, 120 / zoom)) {
        onSelect({ type: 'farm' })
      }
      return
    }

    if (mapMode.type === 'draw-division' && !wasDraggingRef.current) {
      const pt = screenToVB(e.clientX, e.clientY, svgRef.current, pan, zoom)
      const otherDivPolygons = farmDivisions
        .filter((d) => d.id !== mapMode.divisionId)
        .map((d) => d.polygon)
      const snapPolygons = [...(farm ? [farm.polygon] : []), ...otherDivPolygons]
      const snapped = snapToEdges(pt, snapPolygons, SNAP_RADIUS / zoom)

      // Must be inside (or on edge of) farm
      if (farm && !pointInPolygon(snapped, farm.polygon) && !isNearPolygonEdge(snapped, farm.polygon, SNAP_RADIUS / zoom)) return

      // Close polygon if near first vertex
      if (pendingVertices.length >= 3) {
        const first = pendingVertices[0]
        if (Math.hypot(snapped.x - first.x, snapped.y - first.y) < 20 / zoom) {
          onPolygonClose?.()
          return
        }
      }

      // Reject if new segment would cross any existing division edge
      if (pendingVertices.length >= 1) {
        const last = pendingVertices[pendingVertices.length - 1]
        for (const poly of otherDivPolygons) {
          for (let j = 0; j < poly.length; j++) {
            if (segmentsIntersect(last, snapped, poly[j], poly[(j + 1) % poly.length])) return
          }
        }
      }

      onVertexAdd?.(snapped)
    }

    // Place / reposition share the same click-to-drop logic: drop the element
    // into the division under the cursor. A click that ended a long-press pan
    // sets wasDraggingRef → suppressed here, so panning never repositions.
    if ((mapMode.type === 'place-element' || mapMode.type === 'reposition') && !wasDraggingRef.current) {
      const pt = screenToVB(e.clientX, e.clientY, svgRef.current, pan, zoom)
      const foundDiv = farmDivisions.find((d) => pointInPolygon(pt, d.polygon))
      if (foundDiv) {
        onElementReposition?.(mapMode.elementType, mapMode.elementId, pt, foundDiv.id)
      }
    }
  }

  // ── Cursor style ────────────────────────────────────────────────────────────

  const svgCursor =
    mapMode.type === 'draw-division'  ? 'crosshair'
    : isPlacing                         ? 'crosshair'
    : mapMode.type === 'edit-polygon'   ? 'default'
    : 'grab'

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={panEnabled ? handlePointerDown : undefined}
      onPointerMove={handleSVGPointerMove}
      onPointerUp={handleSVGPointerUp}
      onPointerCancel={handleSVGPointerUp}
      onClick={handleSVGClick}
      style={{ touchAction: 'none', userSelect: 'none', cursor: svgCursor, background: '#EDF1E2' }}
      className={className}
    >
      {/* ── Defs ──────────────────────────────────────────────────────────── */}
      <defs>
        <pattern id="pattern-terrain" patternUnits="userSpaceOnUse" width="16" height="16">
          <rect width="16" height="16" fill="#EDF1E2" />
          <circle cx="4"  cy="4"  r="0.6" fill="#8B9E7B" opacity="0.35" />
          <circle cx="12" cy="11" r="0.5" fill="#8B9E7B" opacity="0.25" />
          <circle cx="8"  cy="14" r="0.4" fill="#8B9E7B" opacity="0.3"  />
        </pattern>
        <pattern id="pattern-mombaca" patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#558B2F" strokeWidth="1.2" opacity="0.5" />
          <line x1="4" y1="0" x2="4" y2="8" stroke="#558B2F" strokeWidth="0.8" opacity="0.3" />
        </pattern>
        <pattern id="pattern-brachiaria" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M 0,0 L 10,10 M 10,0 L 0,10" stroke="#7CB342" strokeWidth="0.9" opacity="0.45" />
        </pattern>
        <filter id="glow-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* ── Pan/Zoom group ─────────────────────────────────────────────────── */}
      <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

        {/* Layer 0 — Background (visual only; outside-farm click handled by the SVG element) */}
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="#EDF1E2" />
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#pattern-terrain)" pointerEvents="none" />

        {/* Layer 2 — Divisions (fill hit-test only; click opens division detail) */}
        {layers.divisions && farmDivisions.map((div) => {
          const isSelected = selected?.type === 'division' && selected.id === div.id
          const baseFill   = div.forageId ? (FORAGE_BASE_FILL[div.forageId] ?? '#B8DDB5') : '#CFE8C8'
          const hasCritical = farmTroughs.some(
            (t) => t.divisionId === div.id && calculateHPPercentage(t.currentAmount, t.capacity) <= 20,
          )
          const clickable = mapMode.type === 'view'
          return (
            <DivisionPolygon
              key={div.id}
              points={polygonToPoints(div.polygon)}
              fill={baseFill}
              isSelected={isSelected}
              hasCritical={hasCritical}
              clickable={clickable}
              onClick={() => {
                if (wasDraggingRef.current) return
                onSelect({ type: 'division', id: div.id })
              }}
            />
          )
        })}

        {/* Layer 3 — Forage patterns (non-interactive) */}
        {layers.divisions && layers.forages && satelliteMode && farmDivisions.map((div) => {
          if (!div.forageId) return null
          const patternId = FORAGE_PATTERN_ID[div.forageId]
          if (!patternId) return null
          return (
            <polygon
              key={`forage-${div.id}`}
              points={polygonToPoints(div.polygon)}
              fill={`url(#${patternId})`}
              pointerEvents="none"
              strokeLinejoin="round"
            />
          )
        })}

        {/* Layer 4 — Herd markers */}
        {layers.herds && farmDivisions.map((div) => {
          const herdId = activeAllocByDivision.get(div.id)
          if (!herdId) return null
          const herd = herds.find((h) => h.id === herdId)
          if (!herd) return null
          const count = headCountByHerd.get(herdId) ?? 0
          const troughPositions = farmTroughs.filter((t) => t.divisionId === div.id).map((t) => t.position)
          const c = herd.position ?? herdAnchorInDivision(div.polygon, troughPositions)
          const isSelected = selected?.type === 'herd' && selected.id === herd.id
          const isBeingRepositioned = mapMode.type === 'reposition' && mapMode.elementType === 'herd' && mapMode.elementId === herd.id
          return (
            <HerdMarker
              key={`herd-${herd.id}`}
              center={c}
              count={count}
              purpose={herd.purpose}
              isSelected={isSelected}
              dimmed={isBeingRepositioned}
              interactive={!isPlacing}
              onClick={() => { if (!wasDraggingRef.current) onSelect({ type: 'herd', id: herd.id }) }}
            />
          )
        })}

        {/* Layer 4b — Floating herd preview in place/reposition mode */}
        {(mapMode.type === 'place-element' || mapMode.type === 'reposition') && mapMode.elementType === 'herd' && cursorVB && (() => {
          const herd = herds.find((h) => h.id === mapMode.elementId)
          if (!herd) return null
          const inDiv = farmDivisions.some((d) => pointInPolygon(cursorVB, d.polygon))
          return (
            <HerdMarker
              key="place-herd-preview"
              center={cursorVB}
              count={headCountByHerd.get(herd.id) ?? 0}
              purpose={herd.purpose}
              isSelected={false}
              dimmed={!inDiv}
              interactive={false}
              onClick={() => {}}
            />
          )
        })()}

        {/* Layer 5 — Trough markers (only for this farm) */}
        {layers.troughs && farmTroughs.map((t) => {
          const pct = calculateHPPercentage(t.currentAmount, t.capacity)
          const status = getHPStatus(pct)
          const isSelected = selected?.type === 'trough' && selected.id === t.id
          const isBeingRepositioned = mapMode.type === 'reposition' && mapMode.elementType === 'trough' && mapMode.elementId === t.id
          return (
            <TroughMarker
              key={`trough-${t.id}`}
              position={t.position}
              identifier={t.identifier}
              status={status}
              isSelected={isSelected}
              isCritical={status === 'alert'}
              dimmed={isBeingRepositioned}
              interactive={!isPlacing}
              onClick={() => { if (!wasDraggingRef.current) onSelect({ type: 'trough', id: t.id }) }}
            />
          )
        })}

        {/* Layer 5b — Floating trough preview in place/reposition mode */}
        {(mapMode.type === 'place-element' || mapMode.type === 'reposition') && mapMode.elementType === 'trough' && cursorVB && (() => {
          const trough = farmTroughs.find((t) => t.id === mapMode.elementId)
          if (!trough) return null
          const inDiv = farmDivisions.some((d) => pointInPolygon(cursorVB, d.polygon))
          const pct = calculateHPPercentage(trough.currentAmount, trough.capacity)
          return (
            <TroughMarker
              key="place-trough-preview"
              position={cursorVB}
              identifier={trough.identifier}
              status={getHPStatus(pct)}
              isSelected={false}
              isCritical={false}
              dimmed={!inDiv}
              interactive={false}
              onClick={() => {}}
            />
          )
        })()}

        {/* Layer 6 — Farm boundary: white dashed stroke, non-interactive.
            Rendered last so it always appears above division strokes. */}
        {farm && (
          <polygon
            points={polygonToPoints(farm.polygon)}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={(selected?.type === 'farm' ? 3.5 : 2.5) / zoom}
            strokeDasharray={`${10 / zoom} ${6 / zoom}`}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {/* Layer 7 — Edit mode: draft polygon + draggable anchor points */}
        {mapMode.type === 'edit-polygon' && draftPolygon.length >= 2 && (
          <EditAnchorLayer
            draftPolygon={draftPolygon}
            onChange={setDraftPolygon}
            // Empty array = no farm boundary constraint (allows farm polygon expansion)
            farmPolygon={mapMode.target === 'farm' ? [] : (farm?.polygon ?? [])}
            otherDivisionPolygons={
              mapMode.target === 'farm'
                ? []
                : farmDivisions.filter((d) => d.id !== mapMode.divisionId).map((d) => d.polygon)
            }
            svgRef={svgRef as React.RefObject<SVGSVGElement>}
            zoom={zoom}
          />
        )}

        {/* Layer 8 — Draw mode: in-progress vertices + cursor guide */}
        {mapMode.type === 'draw-division' && (
          <DrawGuideLayer
            vertices={pendingVertices}
            cursorVB={cursorVB}
            zoom={zoom}
            onVertexDelete={onVertexDelete}
            onClose={onPolygonClose}
          />
        )}

      </g>

      {/* Place / reposition: cursor validation ring */}
      {isPlacing && cursorVB && (() => {
        const inDiv = farmDivisions.some((d) => pointInPolygon(cursorVB, d.polygon))
        const screenX = (cursorVB.x * zoom + pan.x) / VIEWBOX_W * 100
        const screenY = (cursorVB.y * zoom + pan.y) / VIEWBOX_H * 100
        return (
          <circle
            cx={`${screenX}%`} cy={`${screenY}%`} r="3%"
            fill="none"
            stroke={inDiv ? '#2E7D32' : '#EF5350'}
            strokeWidth="2"
            strokeDasharray="5 3"
            pointerEvents="none"
            opacity="0.6"
          />
        )
      })()}
    </svg>
  )
}

// ─── Edit anchor layer ────────────────────────────────────────────────────────

interface AnchorDragStart {
  clientX: number
  clientY: number
  vertex: Point
}

interface EditAnchorLayerProps {
  draftPolygon: Point[]
  onChange: (poly: Point[]) => void
  farmPolygon: Point[]
  otherDivisionPolygons: Point[][]
  svgRef: React.RefObject<SVGSVGElement>
  zoom: number
}

function EditAnchorLayer({
  draftPolygon, onChange, farmPolygon, otherDivisionPolygons, svgRef, zoom,
}: EditAnchorLayerProps) {
  const [hoveredAnchorIdx, setHoveredAnchorIdx] = useState(-1)
  const dragIndexRef    = useRef(-1)
  const dragStartRef    = useRef<AnchorDragStart | null>(null)
  const dragHasMovedRef = useRef(false)

  const snapPolygons = useMemo(
    () => [...(farmPolygon.length > 0 ? [farmPolygon] : []), ...otherDivisionPolygons],
    [farmPolygon, otherDivisionPolygons],
  )

  function handleAnchorDown(e: React.PointerEvent<SVGCircleElement>, index: number) {
    e.stopPropagation()
    dragIndexRef.current    = index
    dragHasMovedRef.current = false
    dragStartRef.current    = {
      clientX: e.clientX,
      clientY: e.clientY,
      vertex: { ...draftPolygon[index] },
    }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  function handleAnchorMove(e: React.PointerEvent<SVGCircleElement>) {
    if (dragIndexRef.current < 0 || !svgRef.current || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.clientX
    const dy = e.clientY - dragStartRef.current.clientY
    // Only commit to dragging once past a small movement threshold (avoids accidental moves on clicks)
    if (!dragHasMovedRef.current && Math.hypot(dx, dy) > 4) {
      dragHasMovedRef.current = true
    }
    if (!dragHasMovedRef.current) return

    const { scale } = svgMeetMetrics(svgRef.current)
    const raw: Point = {
      x: dragStartRef.current.vertex.x + dx / (scale * zoom),
      y: dragStartRef.current.vertex.y + dy / (scale * zoom),
    }
    const snapped = snapToEdges(raw, snapPolygons, SNAP_RADIUS / zoom)

    if (farmPolygon.length > 0) {
      const inFarm = pointInPolygon(snapped, farmPolygon) || isNearPolygonEdge(snapped, farmPolygon, SNAP_RADIUS / zoom)
      if (!inFarm) return
    }

    const newPoly = draftPolygon.map((p, i) => (i === dragIndexRef.current ? snapped : p))
    for (const other of otherDivisionPolygons) {
      if (polygonsOverlap(newPoly, other)) return
    }

    onChange(newPoly)
  }

  function handleAnchorUp(e: React.PointerEvent<SVGCircleElement>) {
    const idx      = dragIndexRef.current
    const hasMoved = dragHasMovedRef.current
    dragIndexRef.current    = -1
    dragStartRef.current    = null
    dragHasMovedRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

    // Click without drag: remove this vertex if the polygon stays valid (≥ 3 points)
    if (!hasMoved && idx >= 0 && draftPolygon.length > 3) {
      const newPoly = draftPolygon.filter((_, i) => i !== idx)
      for (const other of otherDivisionPolygons) {
        if (polygonsOverlap(newPoly, other)) return
      }
      onChange(newPoly)
    }
  }

  // Click on a midpoint diamond: insert a new vertex between vertices i and i+1
  function handleMidpointClick(e: React.MouseEvent<SVGRectElement>, edgeIdx: number) {
    e.stopPropagation()
    const next = (edgeIdx + 1) % draftPolygon.length
    const mid: Point = {
      x: (draftPolygon[edgeIdx].x + draftPolygon[next].x) / 2,
      y: (draftPolygon[edgeIdx].y + draftPolygon[next].y) / 2,
    }
    onChange([
      ...draftPolygon.slice(0, edgeIdx + 1),
      mid,
      ...draftPolygon.slice(edgeIdx + 1),
    ])
  }

  const r  = Math.max(6, 8 / zoom)   // vertex anchor radius
  const mr = Math.max(4, 5 / zoom)   // midpoint diamond half-size

  return (
    <g>
      {/* Polygon outline */}
      <polygon
        points={polygonToPoints(draftPolygon)}
        fill="rgba(2, 119, 189, 0.08)"
        stroke="#0277BD"
        strokeWidth={2 / zoom}
        strokeDasharray={`${8 / zoom} ${5 / zoom}`}
        pointerEvents="none"
        strokeLinejoin="round"
      />

      {/* Edge midpoint handles: click to insert a new vertex */}
      {draftPolygon.map((p, i) => {
        const next = draftPolygon[(i + 1) % draftPolygon.length]
        const mx   = (p.x + next.x) / 2
        const my   = (p.y + next.y) / 2
        return (
          <rect
            key={`mid-${i}`}
            x={mx - mr} y={my - mr}
            width={mr * 2} height={mr * 2}
            fill="#E3F2FD"
            stroke="#0277BD"
            strokeWidth={1.5 / zoom}
            opacity="0.8"
            transform={`rotate(45, ${mx}, ${my})`}
            style={{ cursor: 'copy', touchAction: 'none' }}
            onClick={(e) => handleMidpointClick(e, i)}
          />
        )
      })}

      {/* Vertex anchor handles: drag to move, click to remove */}
      {draftPolygon.map((p, i) => {
        const isHovered  = hoveredAnchorIdx === i
        const canDelete  = draftPolygon.length > 3
        const showDelete = isHovered && canDelete
        return (
          <g key={`anchor-${i}`}>
            <circle
              cx={p.x} cy={p.y} r={r}
              fill={showDelete ? '#FFEBEE' : 'white'}
              stroke={showDelete ? '#EF5350' : '#0277BD'}
              strokeWidth={2 / zoom}
              style={{ cursor: 'grab', touchAction: 'none' }}
              onPointerDown={(e) => handleAnchorDown(e, i)}
              onPointerMove={handleAnchorMove}
              onPointerUp={handleAnchorUp}
              onPointerCancel={handleAnchorUp}
              onMouseEnter={() => setHoveredAnchorIdx(i)}
              onMouseLeave={() => setHoveredAnchorIdx(-1)}
            />
            {/* Delete indicator shown on hover when removal is allowed */}
            {showDelete && (
              <text
                x={p.x} y={p.y + 0.5}
                textAnchor="middle" dominantBaseline="middle"
                fill="#EF5350"
                fontSize={r * 1.1}
                fontWeight="bold"
                pointerEvents="none"
              >
                ×
              </text>
            )}
          </g>
        )
      })}

      {/* First-point indicator ring */}
      <circle
        cx={draftPolygon[0].x} cy={draftPolygon[0].y} r={r + 3}
        fill="none" stroke="#0277BD" strokeWidth={1.5 / zoom}
        strokeDasharray={`${3 / zoom} ${2 / zoom}`}
        pointerEvents="none"
      />
    </g>
  )
}

// ─── Draw guide layer ─────────────────────────────────────────────────────────

function DrawGuideLayer({ vertices, cursorVB, zoom, onVertexDelete, onClose }: {
  vertices: Point[]
  cursorVB: Point | null
  zoom: number
  onVertexDelete?: (index: number) => void
  onClose?: () => void
}) {
  const r = Math.max(5, 7 / zoom)
  const all = cursorVB && vertices.length > 0 ? [...vertices, cursorVB] : vertices

  function handleVertexClick(e: React.MouseEvent<SVGCircleElement>, i: number) {
    e.stopPropagation()
    if (i === 0) {
      // First vertex: close polygon if possible, otherwise delete the start point
      if (vertices.length >= 3) { onClose?.(); return }
      if (vertices.length > 1)  { onVertexDelete?.(0) }
    } else {
      // Other vertices: delete them (keep at least the start point)
      if (vertices.length > 1) onVertexDelete?.(i)
    }
  }

  return (
    <g>
      {/* In-progress polyline + cursor preview */}
      {all.length >= 2 && (
        <polyline
          points={all.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#FF6F00"
          strokeWidth={2 / zoom}
          strokeDasharray={`${8 / zoom} ${5 / zoom}`}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {/* Vertex handles: interactive — click to close (v0) or delete (v1+) */}
      {vertices.map((p, i) => {
        const isFirst    = i === 0
        const canClose   = isFirst && vertices.length >= 3
        const canDelete  = !isFirst && vertices.length > 1
        const interactive = canClose || canDelete
        return (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={isFirst ? r + 2 : r}
              fill={isFirst ? '#FF6F00' : 'white'}
              stroke="#FF6F00"
              strokeWidth={2 / zoom}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={interactive ? (e) => handleVertexClick(e, i) : undefined}
            />
            {/* × label on deletable vertices (not first) */}
            {canDelete && (
              <text
                x={p.x} y={p.y + 0.5}
                textAnchor="middle" dominantBaseline="middle"
                fill="#FF6F00" fontSize={r * 1.1} fontWeight="bold"
                pointerEvents="none"
              >
                ×
              </text>
            )}
            {/* Green ring on first vertex when polygon can be closed */}
            {canClose && (
              <circle
                cx={p.x} cy={p.y} r={r + 5}
                fill="none" stroke="#2E7D32"
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${2.5 / zoom} ${2 / zoom}`}
                pointerEvents="none"
              />
            )}
          </g>
        )
      })}

      {/* Cursor ghost */}
      {cursorVB && (
        <circle
          cx={cursorVB.x} cy={cursorVB.y} r={r}
          fill="none" stroke="#FF6F00" strokeWidth={1.5 / zoom}
          strokeDasharray={`${3 / zoom} ${2 / zoom}`}
          pointerEvents="none"
        />
      )}

      {/* Closing guide line when cursor hovers near first vertex */}
      {vertices.length >= 3 && cursorVB && (() => {
        const first = vertices[0]
        const last  = vertices[vertices.length - 1]
        if (Math.hypot(cursorVB.x - first.x, cursorVB.y - first.y) >= 24 / zoom) return null
        return (
          <line
            x1={last.x} y1={last.y} x2={first.x} y2={first.y}
            stroke="#FF6F00" strokeWidth={1.5 / zoom}
            strokeDasharray={`${4 / zoom} ${3 / zoom}`}
            pointerEvents="none" opacity="0.5"
          />
        )
      })()}
    </g>
  )
}

// ─── Division polygon ─────────────────────────────────────────────────────────

interface DivisionPolygonProps {
  points:      string
  fill:        string
  isSelected:  boolean
  hasCritical: boolean
  clickable:   boolean
  onClick:     () => void
}

function DivisionPolygon({ points, fill, isSelected, hasCritical, clickable, onClick }: DivisionPolygonProps) {
  return (
    <motion.polygon
      points={points}
      fill={fill}
      stroke={isSelected ? '#1B5E20' : hasCritical ? '#E65100' : '#6EA870'}
      strokeWidth={isSelected ? 2.5 : 1.5}
      strokeLinejoin="round"
      animate={{ opacity: isSelected ? 0.7 : 0.35 }}
      whileHover={clickable ? { opacity: 0.55 } : undefined}
      transition={{ duration: 0.2 }}
      pointerEvents={clickable ? 'fill' : 'none'}
      style={clickable ? { cursor: 'pointer' } : undefined}
      filter={isSelected ? 'url(#glow-soft)' : undefined}
      onClick={clickable ? onClick : undefined}
    />
  )
}

// ─── Herd marker ──────────────────────────────────────────────────────────────

interface HerdMarkerProps {
  center:     Point
  count:      number
  purpose:    'recria' | 'engorda' | 'misto'
  isSelected: boolean
  dimmed?:    boolean
  /** Quando false, o marcador não captura cliques (cursor passa direto). */
  interactive?: boolean
  onClick:    () => void
}

function HerdMarker({ center, count, purpose, isSelected, dimmed, interactive = true, onClick }: HerdMarkerProps) {
  const accent = purpose === 'engorda' ? '#5D4037' : '#2E7D32'
  return (
    <g transform={`translate(${center.x},${center.y})`}>
      <motion.g
        style={{
          cursor: interactive ? 'pointer' : 'inherit',
          opacity: dimmed ? 0.6 : 1,
          pointerEvents: interactive ? undefined : 'none',
        }}
        onClick={interactive ? onClick : undefined}
        animate={{ scale: isSelected ? 1.12 : 1 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        filter="url(#marker-shadow)"
      >
        <circle r="22" fill="white" stroke={accent} strokeWidth={isSelected ? 3 : 2} />
        <g fill={accent} transform="translate(0,1)">
          <ellipse cx="0" cy="2" rx="10" ry="5" />
          <path d="M -2,-3 Q 3,-9 8,-3" />
          <ellipse cx="9" cy="-1" rx="3.5" ry="2.8" />
        </g>
        <g transform="translate(16,-16)">
          <circle r="10" fill={accent} stroke="white" strokeWidth="1.5" />
          <text textAnchor="middle" y="3.5" fill="white" fontSize="11" fontWeight="600" fontFamily="Roboto, sans-serif">
            {count}
          </text>
        </g>
      </motion.g>
    </g>
  )
}

// ─── Trough marker ────────────────────────────────────────────────────────────

interface TroughMarkerProps {
  position:   Point
  identifier: string
  status:     'ok' | 'warning' | 'alert'
  isSelected: boolean
  isCritical: boolean
  dimmed?:    boolean
  /** Quando false, o marcador não captura cliques (cursor passa direto). */
  interactive?: boolean
  onClick:    () => void
}

const TROUGH_COLORS: Record<'ok' | 'warning' | 'alert', string> = {
  ok:      '#4CAF50',
  warning: '#FFA726',
  alert:   '#EF5350',
}

function TroughMarker({ position, identifier, status, isSelected, isCritical, dimmed, interactive = true, onClick }: TroughMarkerProps) {
  const color = TROUGH_COLORS[status]
  return (
    <g transform={`translate(${position.x},${position.y})`}>
      <motion.g
        style={{
          cursor: interactive ? 'pointer' : 'inherit',
          opacity: dimmed ? 0.6 : 1,
          pointerEvents: interactive ? undefined : 'none',
        }}
        onClick={interactive ? onClick : undefined}
        animate={isCritical ? { scale: [1, 1.08, 1] } : { scale: isSelected ? 1.15 : 1 }}
        whileHover={{ scale: 1.12 }}
        transition={isCritical
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 300, damping: 22 }}
        filter="url(#marker-shadow)"
      >
        <rect x="-16" y="-12" width="32" height="24" rx="6"
          fill={color} stroke={isSelected ? '#212121' : 'white'} strokeWidth={isSelected ? 2.5 : 2} />
        <path d="M 0,-7 Q 4,-2 4,2 Q 4,6 0,6 Q -4,6 -4,2 Q -4,-2 0,-7 Z"
          fill="white" opacity="0.9" transform="translate(-8,0)" />
        <text x="3" y="3.5" fill="white" fontSize="10" fontWeight="700" fontFamily="Roboto, sans-serif">
          {identifier}
        </text>
      </motion.g>
    </g>
  )
}
