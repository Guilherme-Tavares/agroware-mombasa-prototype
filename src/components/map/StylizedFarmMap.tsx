import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/useFarmStore'
import { useMapPanZoom, type MapPanZoomApi } from '@/hooks/useMapPanZoom'
import { polygonCentroid, polygonToPoints } from '@/utils/geometry'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import type { Point } from '@/types/domain'

const VIEWBOX_W = 1000
const VIEWBOX_H = 700

// ─── Layer flags ──────────────────────────────────────────────────────────────

export interface MapLayers {
  divisions: boolean
  herds:     boolean
  troughs:   boolean
  forages:   boolean
}

export type SelectedElement =
  | { type: 'division'; id: string }
  | { type: 'herd';     id: string }
  | { type: 'trough';   id: string }
  | null

interface StylizedFarmMapProps {
  selected:     SelectedElement
  onSelect:     (sel: SelectedElement) => void
  layers:       MapLayers
  satelliteMode: boolean
  panZoomApi?:  MapPanZoomApi
  className?:   string
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function StylizedFarmMap({
  selected,
  onSelect,
  layers,
  satelliteMode,
  panZoomApi,
  className,
}: StylizedFarmMapProps) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const herds       = useFarmStore((s) => s.herds)
  const bovines     = useFarmStore((s) => s.bovines)
  const allocations = useFarmStore((s) => s.allocations)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  // Always call the hook so we have stable refs; the page may also pass its own api
  const internalApi = useMapPanZoom({ viewBoxWidth: VIEWBOX_W, viewBoxHeight: VIEWBOX_H })
  const api = panZoomApi ?? internalApi

  // Active herd per division (for herd markers)
  const activeAllocByDivision = useMemo(() => {
    const map = new Map<string, string>()
    allocations.filter((a) => a.active).forEach((a) => map.set(a.divisionId, a.herdId))
    return map
  }, [allocations])

  // Head count per herd
  const headCountByHerd = useMemo(() => {
    const map = new Map<string, number>()
    bovines.forEach((b) => {
      if (!b.herdId) return
      map.set(b.herdId, (map.get(b.herdId) ?? 0) + 1)
    })
    return map
  }, [bovines])

  const guardedClick = (fn: () => void) => () => {
    if (api.wasDraggingRef.current) return
    fn()
  }

  return (
    <svg
      ref={api.svgRef}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={api.handlePointerDown}
      onPointerMove={api.handlePointerMove}
      onPointerUp={api.handlePointerUp}
      onPointerCancel={api.handlePointerUp}
      style={{
        touchAction: 'none',
        userSelect:  'none',
        cursor:      'grab',
        background:  '#EDF1E2',
      }}
      className={className}
    >
      {/* ── Defs ────────────────────────────────────────────────────────── */}
      <defs>
        {/* Terrain background pattern (subtle dots) */}
        <pattern id="pattern-terrain" patternUnits="userSpaceOnUse" width="16" height="16">
          <rect width="16" height="16" fill="#EDF1E2" />
          <circle cx="4"  cy="4"  r="0.6" fill="#8B9E7B" opacity="0.35" />
          <circle cx="12" cy="11" r="0.5" fill="#8B9E7B" opacity="0.25" />
          <circle cx="8"  cy="14" r="0.4" fill="#8B9E7B" opacity="0.3"  />
        </pattern>

        {/* Mombaça — vertical lines */}
        <pattern id="pattern-mombaca" patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#558B2F" strokeWidth="1.2" opacity="0.5" />
          <line x1="4" y1="0" x2="4" y2="8" stroke="#558B2F" strokeWidth="0.8" opacity="0.3" />
        </pattern>

        {/* Brachiaria — cross-hatch */}
        <pattern id="pattern-brachiaria" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M 0,0 L 10,10 M 10,0 L 0,10" stroke="#7CB342" strokeWidth="0.9" opacity="0.45" />
        </pattern>

        {/* Glow filter for selected element */}
        <filter id="glow-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft drop shadow for markers */}
        <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* ── Pan/Zoom group ──────────────────────────────────────────────── */}
      <g transform={`translate(${api.pan.x},${api.pan.y}) scale(${api.zoom})`}>

        {/* Layer 0 — Background */}
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="#EDF1E2" />
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#pattern-terrain)" />

        {/* Layer 1 — Farm boundary */}
        {farm && (
          <polygon
            points={polygonToPoints(farm.polygon)}
            fill="none"
            stroke="#0277BD"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeDasharray="0"
            opacity="0.85"
          />
        )}

        {/* Layer 2 — Divisions */}
        {layers.divisions && divisions.map((div) => {
          const isSelected = selected?.type === 'division' && selected.id === div.id
          const baseFill   = div.forageId ? (FORAGE_BASE_FILL[div.forageId] ?? '#B8DDB5') : '#CFE8C8'
          // Critical pulse: division contains a critical trough
          const hasCritical = feedTroughs.some(
            (t) => t.divisionId === div.id && calculateHPPercentage(t.currentAmount, t.capacity) <= 20,
          )
          return (
            <DivisionPolygon
              key={div.id}
              points={polygonToPoints(div.polygon)}
              fill={baseFill}
              isSelected={isSelected}
              hasCritical={hasCritical}
              onClick={guardedClick(() => onSelect({ type: 'division', id: div.id }))}
            />
          )
        })}

        {/* Layer 3 — Forage patterns (overlay on top of base fill) */}
        {layers.divisions && layers.forages && satelliteMode && divisions.map((div) => {
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

        {/* Layer 4 — Herd markers (at division centroids) */}
        {layers.herds && divisions.map((div) => {
          const herdId = activeAllocByDivision.get(div.id)
          if (!herdId) return null
          const herd = herds.find((h) => h.id === herdId)
          if (!herd) return null
          const count = headCountByHerd.get(herdId) ?? 0
          const c = polygonCentroid(div.polygon)
          const isSelected = selected?.type === 'herd' && selected.id === herd.id
          return (
            <HerdMarker
              key={`herd-${herd.id}`}
              center={c}
              count={count}
              purpose={herd.purpose}
              isSelected={isSelected}
              onClick={guardedClick(() => onSelect({ type: 'herd', id: herd.id }))}
            />
          )
        })}

        {/* Layer 5 — Trough markers */}
        {layers.troughs && feedTroughs.map((t) => {
          const pct = calculateHPPercentage(t.currentAmount, t.capacity)
          const status = getHPStatus(pct)
          const isSelected = selected?.type === 'trough' && selected.id === t.id
          return (
            <TroughMarker
              key={`trough-${t.id}`}
              position={t.position}
              identifier={t.identifier}
              status={status}
              isSelected={isSelected}
              isCritical={status === 'alert'}
              onClick={guardedClick(() => onSelect({ type: 'trough', id: t.id }))}
            />
          )
        })}

      </g>
    </svg>
  )
}

// ─── Division polygon ─────────────────────────────────────────────────────────

interface DivisionPolygonProps {
  points:      string
  fill:        string
  isSelected:  boolean
  hasCritical: boolean
  onClick:     () => void
}

function DivisionPolygon({ points, fill, isSelected, hasCritical, onClick }: DivisionPolygonProps) {
  return (
    <motion.polygon
      points={points}
      fill={fill}
      stroke={isSelected ? '#1B5E20' : hasCritical ? '#E65100' : '#6EA870'}
      strokeWidth={isSelected ? 4 : 2}
      strokeLinejoin="round"
      animate={{
        opacity: isSelected ? 0.7 : 0.35,
      }}
      whileHover={{ opacity: 0.55 }}
      transition={{ duration: 0.2 }}
      style={{ cursor: 'pointer' }}
      filter={isSelected ? 'url(#glow-soft)' : undefined}
      onClick={onClick}
    />
  )
}

// ─── Herd marker ──────────────────────────────────────────────────────────────

interface HerdMarkerProps {
  center:     Point
  count:      number
  purpose:    'recria' | 'engorda'
  isSelected: boolean
  onClick:    () => void
}

function HerdMarker({ center, count, purpose, isSelected, onClick }: HerdMarkerProps) {
  const accent = purpose === 'engorda' ? '#5D4037' : '#2E7D32'
  return (
    <motion.g
      transform={`translate(${center.x},${center.y})`}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      animate={{ scale: isSelected ? 1.12 : 1 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      filter="url(#marker-shadow)"
    >
      {/* Outer circle */}
      <circle r="22" fill="white" stroke={accent} strokeWidth={isSelected ? 3 : 2} />
      {/* Bovine pictogram — abstract zebu silhouette */}
      <g fill={accent} transform="translate(0,1)">
        <ellipse cx="0" cy="2" rx="10" ry="5" />
        <path d="M -2,-3 Q 3,-9 8,-3" />
        <ellipse cx="9" cy="-1" rx="3.5" ry="2.8" />
      </g>
      {/* Count badge */}
      <g transform="translate(16,-16)">
        <circle r="10" fill={accent} stroke="white" strokeWidth="1.5" />
        <text
          textAnchor="middle"
          y="3.5"
          fill="white"
          fontSize="11"
          fontWeight="600"
          fontFamily="Roboto, sans-serif"
        >
          {count}
        </text>
      </g>
    </motion.g>
  )
}

// ─── Trough marker ────────────────────────────────────────────────────────────

interface TroughMarkerProps {
  position:   Point
  identifier: string
  status:     'ok' | 'warning' | 'alert'
  isSelected: boolean
  isCritical: boolean
  onClick:    () => void
}

const TROUGH_COLORS: Record<'ok' | 'warning' | 'alert', string> = {
  ok:      '#4CAF50',
  warning: '#FFA726',
  alert:   '#EF5350',
}

function TroughMarker({ position, identifier, status, isSelected, isCritical, onClick }: TroughMarkerProps) {
  const color = TROUGH_COLORS[status]
  return (
    <motion.g
      transform={`translate(${position.x},${position.y})`}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      animate={isCritical
        ? { scale: [1, 1.08, 1] }
        : { scale: isSelected ? 1.15 : 1 }}
      whileHover={{ scale: 1.12 }}
      transition={isCritical
        ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 300, damping: 22 }}
      filter="url(#marker-shadow)"
    >
      {/* Capsule body */}
      <rect
        x="-16" y="-12" width="32" height="24" rx="6"
        fill={color}
        stroke={isSelected ? '#212121' : 'white'}
        strokeWidth={isSelected ? 2.5 : 2}
      />
      {/* HP icon — small drop */}
      <path
        d="M 0,-7 Q 4,-2 4,2 Q 4,6 0,6 Q -4,6 -4,2 Q -4,-2 0,-7 Z"
        fill="white"
        opacity="0.9"
        transform="translate(-8,0)"
      />
      <text
        x="3"
        y="3.5"
        fill="white"
        fontSize="10"
        fontWeight="700"
        fontFamily="Roboto, sans-serif"
      >
        {identifier}
      </text>
    </motion.g>
  )
}
