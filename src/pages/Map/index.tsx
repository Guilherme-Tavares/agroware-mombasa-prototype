import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Beef, TrendingUp, AlertTriangle, Map as MapIcon, Download,
  Plus, Check, X as XIcon,
} from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useUIStore } from '@/store/useUIStore'
import { useResponsive } from '@/hooks/useResponsive'
import { useMapPanZoom } from '@/hooks/useMapPanZoom'
import { useToast } from '@/hooks/useToast'

import StylizedFarmMap, {
  type SelectedElement, type MapLayers, type MapMode,
} from '@/components/map/StylizedFarmMap.tsx'
import RealFarmMap from '@/components/map/RealFarmMap.tsx'
import {
  LayerTogglePanel, MapStyleToggle, type MapBaseLayer,
} from '@/components/map/MapControls.tsx'
import DetailPanel from '@/components/map/DetailPanel.tsx'
import BottomSheet from '@/components/ui/BottomSheet.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import Button from '@/components/ui/Button.tsx'
import {
  formatArea, formatGMD,
} from '@/utils/format.ts'
import { calculateHPPercentage } from '@/utils/hp-system.ts'
import { polygonsOverlap, polygonContains } from '@/utils/geometry.ts'
import { polyToGeo, polyToViewbox, pointToGeo, pointToViewbox } from '@/utils/projection.ts'
import type { Point, GeoPoint } from '@/types/domain'

// Converts a GeoPoint to a flat Point so geometry helpers (pointInPolygon,
// polygonContains, polygonsOverlap) can be reused without geo-specific variants.
function geoToPoint(g: GeoPoint): Point { return { x: g.lng, y: g.lat } }

// lazy imports
import { lazy, Suspense } from 'react'
const MapAddPanel = lazy(() => import('@/components/map/MapAddPanel.tsx'))

// ─── KPI pill ─────────────────────────────────────────────────────────────────

function KPIPill({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent?: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
      <span className={accent ?? 'text-primary'}>{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-caption text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="font-data text-body text-gray-900 tabular-nums">{value}</span>
      </div>
    </div>
  )
}

// ─── Mode label helpers ────────────────────────────────────────────────────────

function getModeLabel(mode: MapMode, divisionName?: string): string {
  switch (mode.type) {
    case 'edit-polygon':
      return mode.target === 'farm'
        ? 'Editando demarcação da propriedade'
        : `Editando demarcação: ${divisionName ?? 'divisão'}`
    case 'draw-division':
      return 'Desenhando divisão — clique para adicionar pontos'
    case 'reposition':
      return `Reposicionando ${mode.elementType === 'herd' ? 'rebanho' : 'cocho'} — arraste para nova posição`
    case 'place-element':
      return `Posicionando ${mode.elementType === 'herd' ? 'rebanho' : 'cocho'} — clique dentro de uma divisão`
    default:
      return ''
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const navigate        = useNavigate()
  const toast           = useToast()
  const { isMobile }    = useResponsive()
  const farm            = useFarmStore((s) => s.farm)
  const divisions       = useFarmStore((s) => s.divisions)
  const herds           = useFarmStore((s) => s.herds)
  const feedTroughs     = useFarmStore((s) => s.feedTroughs)
  const bovines         = useFarmStore((s) => s.bovines)
  const allocations     = useFarmStore((s) => s.allocations)
  const seasonPassages  = useFarmStore((s) => s.seasonPassages)
  const updateFarm      = useFarmStore((s) => s.updateFarm)
  const updateDivision  = useFarmStore((s) => s.updateDivision)
  const updateHerd      = useFarmStore((s) => s.updateHerd)
  const updateFeedTrough = useFarmStore((s) => s.updateFeedTrough)
  const allocateHerd    = useFarmStore((s) => s.allocateHerd)

  const activeMapLayers = useUIStore((s) => s.activeMapLayers)
  const toggleMapLayer  = useUIStore((s) => s.toggleMapLayer)

  // ── Map mode ──────────────────────────────────────────────────────────────
  const [mapMode, setMapMode] = useState<MapMode>({ type: 'view' })
  const inEditMode = mapMode.type !== 'view'

  // The illustrated map is static and panning requires a long-press. Pan is only
  // fully disabled while editing/drawing polygons; view + place/reposition keep
  // long-press pan available (mirrors the satellite layer behavior).
  const panZoomApi = useMapPanZoom({
    viewBoxWidth: 1000, viewBoxHeight: 700,
    disabled: mapMode.type === 'edit-polygon' || mapMode.type === 'draw-division',
    // Mapa estático + long-press para pan no view e em posicionar/reposicionar.
    // Em posicionar/reposicionar, segurar já entra em modo pan (não solta o
    // elemento ao soltar) e o toque rápido solta.
    longPressToPan: true,
    longPressEngageOnArm: mapMode.type === 'place-element' || mapMode.type === 'reposition',
  })

  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('satelite')
  const [selected, setSelected]   = useState<SelectedElement>(null)
  const isIllustrated = baseLayer === 'ilustrada'

  // Clicking the same element again toggles the panel closed.
  // Opening any panel closes the add panel, and vice-versa.
  function handleSelect(el: SelectedElement) {
    if (el !== null && selected !== null) {
      const same =
        el.type === selected.type &&
        (el.type === 'farm' || (el as { id: string }).id === (selected as { id: string }).id)
      if (same) { setSelected(null); return }
    }
    setSelected(el)
    if (el !== null) setShowAddPanel(false)
  }

  // Draft polygon — illustrated layer
  const latestDraftRef = useRef<Point[] | null>(null)

  // Draw-division vertices — illustrated layer
  const [pendingVertices, setPendingVertices] = useState<Point[]>([])

  // Draft polygon — satellite layer
  const latestGeoDraftRef = useRef<GeoPoint[] | null>(null)

  // Draw-division vertices — satellite layer
  const [pendingGeoVertices, setPendingGeoVertices] = useState<GeoPoint[]>([])

  // Add panel visibility
  const [showAddPanel, setShowAddPanel] = useState(false)

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalHead = bovines.length
  const avgGMD    = useMemo(() => {
    if (seasonPassages.length === 0) return 0
    return seasonPassages.reduce((s, sp) => s + sp.gmd, 0) / seasonPassages.length
  }, [seasonPassages])
  const criticalTroughs = useMemo(
    () => feedTroughs.filter((t) => calculateHPPercentage(t.currentAmount, t.capacity) <= 20).length,
    [feedTroughs],
  )

  const layers: MapLayers = activeMapLayers
  const showDesktopPanel  = !isMobile && selected !== null && !inEditMode

  function handleClosePanel() { setSelected(null) }

  // ── Mode management ───────────────────────────────────────────────────────

  function handleStartEdit(target: 'farm' | 'division', divisionId?: string) {
    setSelected(null)
    // Pre-populate both layer drafts so confirming without any anchor drag is valid.
    // The anchor layers only fire onChange when a drag actually occurs, so without
    // pre-population the ref stays null and confirmation would fail with "Polígono inválido".
    latestDraftRef.current = isIllustrated
      ? target === 'farm'
        ? (farm?.polygon ?? null)
        : (divisions.find((d) => d.id === divisionId)?.polygon ?? null)
      : null
    latestGeoDraftRef.current = !isIllustrated
      ? target === 'farm'
        ? (farm?.geoPolygon ?? null)
        : (divisions.find((d) => d.id === divisionId)?.geoPolygon ?? null)
      : null
    setMapMode({ type: 'edit-polygon', target, divisionId })
  }

  function handleStartReposition(elementType: 'herd' | 'trough', elementId: string) {
    setSelected(null)
    setMapMode({ type: 'reposition', elementType, elementId })
  }

  function handleConfirmMode() {
    if (!isIllustrated) {
      // ── Satellite layer: validate + save geo + mirrored viewBox ──
      if (mapMode.type === 'edit-polygon') {
        const poly = latestGeoDraftRef.current
        if (!poly || poly.length < 3) { toast.error('Polígono inválido.'); return }

        if (mapMode.target === 'farm') {
          const newFarmPts = poly.map(geoToPoint)
          const farmDivs = divisions.filter(
            (d) => d.farmId === farm?.id && (d.geoPolygon?.length ?? 0) >= 3,
          )
          // Skip when the polygon is unchanged (same reference = no anchor was dragged).
          // Avoids false positives from division vertices sitting exactly on the farm boundary.
          if (poly !== farm?.geoPolygon) {
            for (const div of farmDivs) {
              if (!polygonContains(div.geoPolygon!.map(geoToPoint), newFarmPts)) {
                toast.error('A nova área exclui ou cruza divisões internas. Expanda o contorno ou redefina as divisões primeiro.')
                return
              }
            }
          }
          updateFarm({
            geoPolygon: poly,
            ...(farm && { polygon: polyToViewbox(poly, farm) ?? undefined }),
          })
          toast.success('Demarcação da propriedade atualizada.')

        } else if (mapMode.divisionId) {
          // Division must be inside farm and must not overlap other divisions.
          // Skip when unchanged (same ref = no anchor dragged) so confirming
          // without editing never blocks, even if mock vertices touch a boundary.
          const editedDiv = divisions.find((d) => d.id === mapMode.divisionId)
          if (poly !== editedDiv?.geoPolygon && farm?.geoPolygon && farm.geoPolygon.length >= 3) {
            const farmPts = farm.geoPolygon.map(geoToPoint)
            const polyPts = poly.map(geoToPoint)
            if (!polygonContains(polyPts, farmPts)) {
              toast.error('A nova demarcação extrapola a área da propriedade.')
              return
            }
            const otherDivs = divisions.filter(
              (d) => d.farmId === farm.id && d.id !== mapMode.divisionId && (d.geoPolygon?.length ?? 0) >= 3,
            )
            for (const other of otherDivs) {
              if (polygonsOverlap(polyPts, other.geoPolygon!.map(geoToPoint))) {
                toast.error('A nova demarcação sobrepõe outra divisão existente.')
                return
              }
            }
          }
          updateDivision(mapMode.divisionId, {
            geoPolygon: poly,
            ...(farm && { polygon: polyToViewbox(poly, farm) ?? undefined }),
          })
          toast.success('Demarcação da divisão atualizada.')
        }
        latestGeoDraftRef.current = null

      } else if (mapMode.type === 'draw-division') {
        if (pendingGeoVertices.length < 3) { toast.error('Mínimo de 3 pontos.'); return }
        if (farm?.geoPolygon && farm.geoPolygon.length >= 3) {
          const farmPts = farm.geoPolygon.map(geoToPoint)
          const polyPts = pendingGeoVertices.map(geoToPoint)
          if (!polygonContains(polyPts, farmPts)) {
            toast.error('A nova divisão extrapola a área da propriedade.')
            return
          }
          const otherDivs = divisions.filter(
            (d) => d.farmId === farm.id && d.id !== mapMode.divisionId && (d.geoPolygon?.length ?? 0) >= 3,
          )
          for (const other of otherDivs) {
            if (polygonsOverlap(polyPts, other.geoPolygon!.map(geoToPoint))) {
              toast.error('A nova divisão sobrepõe outra divisão existente.')
              return
            }
          }
        }
        updateDivision(mapMode.divisionId, {
          geoPolygon: pendingGeoVertices,
          ...(farm && { polygon: polyToViewbox(pendingGeoVertices, farm) ?? undefined }),
        })
        toast.success('Divisão demarcada.')
        setPendingGeoVertices([])
      }
      setMapMode({ type: 'view' })
      return
    }

    // ── Illustrated layer: validate + save viewBox + mirrored geo ──
    if (mapMode.type === 'edit-polygon') {
      const poly = latestDraftRef.current
      if (!poly || poly.length < 3) { toast.error('Polígono inválido.'); return }

      if (mapMode.target === 'farm') {
        const farmDivs = divisions.filter(
          (d) => d.farmId === farm?.id && d.polygon.length >= 3,
        )
        if (poly !== farm?.polygon) {
          for (const div of farmDivs) {
            if (!polygonContains(div.polygon, poly)) {
              toast.error('A nova área exclui ou cruza divisões internas. Expanda o contorno ou redefina as divisões primeiro.')
              return
            }
          }
        }
        updateFarm({
          polygon: poly,
          ...(farm && { geoPolygon: polyToGeo(poly, farm) ?? undefined }),
        })
        toast.success('Demarcação da propriedade atualizada.')

      } else if (mapMode.divisionId && farm) {
        // Skip validation when unchanged (same ref = no anchor dragged) so
        // confirming without editing never blocks, even if mock vertices touch
        // a boundary.
        const editedDiv = divisions.find((d) => d.id === mapMode.divisionId)
        if (poly !== editedDiv?.polygon) {
          // Division must be inside farm
          if (farm.polygon.length >= 3 && !polygonContains(poly, farm.polygon)) {
            toast.error('A nova demarcação extrapola a área da propriedade.')
            return
          }
          // Division must not overlap other divisions
          const others = divisions
            .filter((d) => d.farmId === farm.id && d.id !== mapMode.divisionId)
            .map((d) => d.polygon)
          for (const other of others) {
            if (polygonsOverlap(poly, other)) {
              toast.error('A nova demarcação sobrepõe outra divisão existente.')
              return
            }
          }
        }
        updateDivision(mapMode.divisionId, {
          polygon: poly,
          ...(farm && { geoPolygon: polyToGeo(poly, farm) ?? undefined }),
        })
        toast.success('Demarcação da divisão atualizada.')
      }
      latestDraftRef.current = null

    } else if (mapMode.type === 'draw-division') {
      if (pendingVertices.length < 3) { toast.error('Mínimo de 3 pontos.'); return }
      if (farm) {
        // Division must be inside farm
        if (farm.polygon.length >= 3 && !polygonContains(pendingVertices, farm.polygon)) {
          toast.error('A nova divisão extrapola a área da propriedade.')
          return
        }
        // Division must not overlap other divisions
        const others = divisions
          .filter((d) => d.farmId === farm.id && d.id !== mapMode.divisionId)
          .map((d) => d.polygon)
        for (const other of others) {
          if (polygonsOverlap(pendingVertices, other)) {
            toast.error('A nova divisão sobrepõe outra divisão existente.')
            return
          }
        }
      }
      updateDivision(mapMode.divisionId, {
        polygon: pendingVertices,
        ...(farm && { geoPolygon: polyToGeo(pendingVertices, farm) ?? undefined }),
      })
      toast.success('Divisão demarcada.')
      setPendingVertices([])
    }
    setMapMode({ type: 'view' })
  }

  function handleCancelMode() {
    latestDraftRef.current = null
    latestGeoDraftRef.current = null
    setPendingVertices([])
    setPendingGeoVertices([])
    setMapMode({ type: 'view' })
  }

  function handleAddDivision(divisionId: string) {
    setSelected(null)
    setPendingVertices([])
    setPendingGeoVertices([])
    setMapMode({ type: 'draw-division', divisionId })
  }

  function handleAddElement(type: 'herd' | 'trough', elementId: string) {
    setSelected(null)
    setMapMode({ type: 'place-element', elementType: type, elementId })
  }

  // ── Element reposition / place ────────────────────────────────────────────

  function handleElementReposition(
    elementType: 'herd' | 'trough',
    elementId: string,
    position: Point,
    divisionId: string,
  ) {
    if (elementType === 'herd') {
      const herd = herds.find((h) => h.id === elementId)
      if (!herd) return
      const activeAlloc = allocations.find((a) => a.herdId === elementId && a.active)
      if (mapMode.type === 'place-element') {
        // New herd: create allocation
        allocateHerd({
          id:         crypto.randomUUID(),
          herdId:     elementId,
          divisionId,
          startDate:  new Date().toISOString().split('T')[0],
          active:     true,
          createdAt:  new Date().toISOString(),
          updatedAt:  new Date().toISOString(),
        })
      } else if (activeAlloc && activeAlloc.divisionId !== divisionId) {
        // Moved to different division: update allocation
        allocateHerd({
          id:         crypto.randomUUID(),
          herdId:     elementId,
          divisionId,
          startDate:  new Date().toISOString().split('T')[0],
          active:     true,
          createdAt:  new Date().toISOString(),
          updatedAt:  new Date().toISOString(),
        })
      }
      updateHerd(elementId, { position })
      toast.success('Rebanho posicionado.')
    } else {
      updateFeedTrough(elementId, {
        position,
        divisionId,
        ...(farm && { geoPosition: pointToGeo(position, farm) ?? undefined }),
      })
      toast.success('Cocho posicionado.')
    }
    setMapMode({ type: 'view' })
  }

  // Satellite layer: geo element reposition / place
  function handleGeoElementReposition(
    elementType: 'herd' | 'trough',
    elementId: string,
    geoPosition: GeoPoint,
    divisionId: string,
  ) {
    if (elementType === 'herd') {
      const activeAlloc = allocations.find((a) => a.herdId === elementId && a.active)
      if (mapMode.type === 'place-element' || !activeAlloc) {
        allocateHerd({
          id:        crypto.randomUUID(),
          herdId:    elementId,
          divisionId,
          startDate: new Date().toISOString().split('T')[0],
          active:    true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else if (activeAlloc.divisionId !== divisionId) {
        allocateHerd({
          id:        crypto.randomUUID(),
          herdId:    elementId,
          divisionId,
          startDate: new Date().toISOString().split('T')[0],
          active:    true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      toast.success('Rebanho posicionado.')
    } else {
      updateFeedTrough(elementId, {
        geoPosition,
        divisionId,
        ...(farm && { position: pointToViewbox(geoPosition, farm) ?? undefined }),
      })
      toast.success('Cocho posicionado.')
    }
    setMapMode({ type: 'view' })
  }

  // Illustrated layer: draw-division vertex handlers
  function handleVertexAdd(point: Point) {
    setPendingVertices((v) => [...v, point])
  }
  function handleVertexDelete(index: number) {
    setPendingVertices((v) => v.filter((_, i) => i !== index))
  }
  function handlePolygonClose() {
    if (pendingVertices.length >= 3) handleConfirmMode()
  }

  // Satellite layer: geo vertex handlers
  function handleGeoVertexAdd(point: GeoPoint) {
    setPendingGeoVertices((v) => [...v, point])
  }
  function handleGeoVertexDelete(index: number) {
    setPendingGeoVertices((v) => v.filter((_, i) => i !== index))
  }
  function handleGeoPolygonClose() {
    if (pendingGeoVertices.length >= 3) handleConfirmMode()
  }

  // Division name for mode label
  const editDivName = mapMode.type === 'edit-polygon' && mapMode.divisionId
    ? divisions.find((d) => d.id === mapMode.divisionId)?.name
    : undefined

  // ── Empty state (sem fazenda alguma) ─────────────────────────────────────
  if (!farm) {
    return (
      <EmptyState
        icon={<MapIcon size={28} />}
        title="Nenhuma propriedade encontrada"
        description="Cadastre uma propriedade para visualizar o mapa."
        action={{ label: 'Demarcar Propriedade', onClick: () => navigate('/demarcation') }}
      />
    )
  }

  const farmHasPolygon = isIllustrated
    ? farm.polygon.length >= 3
    : (farm.geoPolygon?.length ?? 0) >= 3

  return (
    <div className="flex flex-col gap-4 h-[calc(100svh-156px)] lg:h-[calc(100svh-108px)] min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-h1 text-gray-900 truncate">{farm.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin size={13} className="text-gray-400" />
            <p className="text-caption text-gray-400">
              {farm.city}, {farm.state} · {formatArea(farm.totalArea)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <KPIPill icon={<Beef size={14} />}          label="Cabeças"  value={totalHead.toString()} />
          <KPIPill icon={<TrendingUp size={14} />}    label="GMD méd." value={formatGMD(avgGMD)} />
          <KPIPill
            icon={<AlertTriangle size={14} />}
            label="Críticos"
            value={criticalTroughs.toString()}
            accent={criticalTroughs > 0 ? 'text-alert-dark' : 'text-primary'}
          />
        </div>
      </motion.div>

      {/* ── Map container ──────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card bg-white flex-1 min-h-0">

        {!farmHasPolygon ? (
          /* ── Undemarked state inside map area ── */
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4 text-center px-8 py-10 rounded-2xl bg-white border border-gray-200 shadow-card max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center">
                <MapIcon size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-h2 text-gray-900">Propriedade não demarcada</p>
                <p className="text-body text-gray-400 mt-1">Defina o contorno da fazenda para visualizar o mapa.</p>
              </div>
              <Button variant="primary" onClick={() => navigate('/demarcation')}>
                Demarcar Propriedade
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Base layer */}
            {isIllustrated ? (
              <StylizedFarmMap
                selected={selected}
                onSelect={handleSelect}
                layers={layers}
                satelliteMode={false}
                panZoomApi={panZoomApi}
                className="absolute inset-0 w-full h-full"
                mapMode={mapMode}
                onDraftPolygonChange={(poly) => { latestDraftRef.current = poly }}
                onElementReposition={handleElementReposition}
                pendingVertices={pendingVertices}
                onVertexAdd={handleVertexAdd}
                onVertexDelete={handleVertexDelete}
                onPolygonClose={handlePolygonClose}
              />
            ) : (
              <RealFarmMap
                selected={selected}
                onSelect={handleSelect}
                layers={layers}
                className="absolute inset-0 w-full h-full"
                mapMode={mapMode}
                onDraftGeoPolygonChange={(poly) => { latestGeoDraftRef.current = poly }}
                onGeoElementReposition={handleGeoElementReposition}
                pendingGeoVertices={pendingGeoVertices}
                onGeoVertexAdd={handleGeoVertexAdd}
                onGeoVertexDelete={handleGeoVertexDelete}
                onGeoPolygonClose={handleGeoPolygonClose}
              />
            )}

            {/* Offline map shortcut — satellite only, top-right */}
            {!isIllustrated && !inEditMode && (
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => navigate('/map/offline')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white shadow-floating border border-gray-200 text-button text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download size={14} className="text-primary" />
                  <span className="hidden sm:inline">Mapa offline</span>
                </button>
              </div>
            )}

            {/* Layer toggles (bottom-left) */}
            {!inEditMode && (
              <div className="absolute bottom-6 left-3 z-10">
                <LayerTogglePanel layers={layers} onToggle={toggleMapLayer} />
              </div>
            )}

            {/* Base layer toggle (bottom-right) */}
            {!inEditMode && (
              <div className="absolute bottom-6 right-3 z-10">
                <MapStyleToggle base={baseLayer} onChange={setBaseLayer} />
              </div>
            )}

            {/* Add button (top-left, both layers, view mode) */}
            {!inEditMode && (
              <div className="absolute top-3 left-3 z-10">
                <button
                  onClick={() => { setShowAddPanel((v) => !v); setSelected(null) }}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-floating border text-button transition-colors',
                    showAddPanel
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </div>
            )}

            {/* Hint (view mode, no selection) */}
            {!selected && !inEditMode && !showAddPanel && (
              <div className="absolute top-14 left-3 z-10 hidden lg:block pointer-events-none">
                <p className="text-caption text-gray-500 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-100">
                  {isIllustrated
                    ? 'Arraste · scroll · clique em uma divisão ou fora da propriedade'
                    : 'Clique em uma divisão para ver detalhes'}
                </p>
              </div>
            )}

            {/* Desktop side panel */}
            <AnimatePresence>
              {showDesktopPanel && (
                <motion.aside
                  key="side-panel"
                  initial={{ x: 360, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 360, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                  className="absolute top-0 right-0 bottom-0 w-[340px] bg-white border-l border-gray-200 shadow-floating z-20 flex flex-col p-5"
                >
                  <DetailPanel
                    selected={selected}
                    onClose={handleClosePanel}
                    onStartEdit={handleStartEdit}
                    onStartReposition={handleStartReposition}
                  />
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Edit/draw mode confirmation bar */}
            <AnimatePresence>
              {inEditMode && (
                <motion.div
                  key="mode-bar"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-3 bg-white rounded-2xl shadow-floating border border-gray-200 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-gray-900 truncate">{getModeLabel(mapMode, editDivName)}</p>
                    {mapMode.type === 'edit-polygon' && (
                      <p className="text-caption text-gray-400">Arraste âncora para mover · clique para remover · clique no losango para inserir</p>
                    )}
                    {mapMode.type === 'draw-division' && (() => {
                      const vCount = isIllustrated ? pendingVertices.length : pendingGeoVertices.length
                      return (
                        <p className="text-caption text-gray-400">
                          {vCount} ponto{vCount !== 1 ? 's' : ''}
                          {vCount >= 3
                            ? ' · clique no 1º ponto (verde) para fechar · clique em outro para remover'
                            : ' · mínimo 3 · clique em um ponto para removê-lo'}
                        </p>
                      )
                    })()}
                    {(mapMode.type === 'reposition' || mapMode.type === 'place-element') && (
                      <p className="text-caption text-gray-400">Deve cair dentro de uma divisão (anel verde)</p>
                    )}
                  </div>
                  <Button variant="ghost" onClick={handleCancelMode} icon={<XIcon size={14} />}>
                    Cancelar
                  </Button>
                  {(mapMode.type === 'edit-polygon' || (mapMode.type === 'draw-division' && (isIllustrated ? pendingVertices.length >= 3 : pendingGeoVertices.length >= 3))) && (
                    <Button variant="primary" onClick={handleConfirmMode} icon={<Check size={14} />}>
                      Confirmar
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add panel (slide-up overlay, both layers, view mode) */}
            <AnimatePresence>
              {showAddPanel && !inEditMode && (
                <Suspense fallback={null}>
                  <MapAddPanel
                    onClose={() => setShowAddPanel(false)}
                    onAddDivision={handleAddDivision}
                    onAddElement={handleAddElement}
                  />
                </Suspense>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Mobile bottom sheet ──────────────────────────────────────────── */}
      {farmHasPolygon && (
        <BottomSheet
          isOpen={isMobile && selected !== null && !inEditMode}
          onClose={handleClosePanel}
          maxHeight={0.85}
        >
          <DetailPanel
            selected={selected}
            onClose={handleClosePanel}
            onStartEdit={handleStartEdit}
            onStartReposition={handleStartReposition}
          />
        </BottomSheet>
      )}
    </div>
  )
}
