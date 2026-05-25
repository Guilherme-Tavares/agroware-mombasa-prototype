import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Beef, TrendingUp, AlertTriangle, Map as MapIcon } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useUIStore } from '@/store/useUIStore'
import { useResponsive } from '@/hooks/useResponsive'
import { useMapPanZoom } from '@/hooks/useMapPanZoom'

import StylizedFarmMap, {
  type SelectedElement, type MapLayers,
} from '@/components/map/StylizedFarmMap.tsx'
import {
  ZoomControls, LayerTogglePanel, MapStyleToggle,
} from '@/components/map/MapControls.tsx'
import DetailPanel from '@/components/map/DetailPanel.tsx'
import BottomSheet from '@/components/ui/BottomSheet.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import {
  formatArea, formatGMD,
} from '@/utils/format.ts'
import { calculateHPPercentage } from '@/utils/hp-system.ts'

// ─── KPI pill (compact, for map header) ───────────────────────────────────────

function KPIPill({ icon, label, value, accent }: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const navigate        = useNavigate()
  const { isMobile }    = useResponsive()
  const farm            = useFarmStore((s) => s.farm)
  const bovines         = useFarmStore((s) => s.bovines)
  const feedTroughs     = useFarmStore((s) => s.feedTroughs)
  const seasonPassages  = useFarmStore((s) => s.seasonPassages)

  const activeMapLayers = useUIStore((s) => s.activeMapLayers)
  const toggleMapLayer  = useUIStore((s) => s.toggleMapLayer)

  // Pan/zoom api lives at the page level so we can drive ZoomControls
  const panZoomApi = useMapPanZoom({ viewBoxWidth: 1000, viewBoxHeight: 700 })

  const [satelliteMode, setSatelliteMode] = useState(true)
  const [selected, setSelected] = useState<SelectedElement>(null)

  // KPIs
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
  const showDesktopPanel = !isMobile && selected !== null

  function handleClosePanel() { setSelected(null) }

  // ── Empty state ───────────────────────────────────────────────────────
  // Acionado se o usuário limpar dados ou se o polígono da fazenda não
  // tiver vértices suficientes para renderizar. Direciona à demarcação.
  if (!farm || farm.polygon.length < 3) {
    return (
      <EmptyState
        icon={<MapIcon size={28} />}
        title="Propriedade ainda não demarcada"
        description="Desenhe o contorno da sua fazenda para visualizar o mapa com divisões e cochos."
        action={{
          label: 'Demarcar agora',
          onClick: () => navigate('/demarcation'),
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
      >
        <div className="min-w-0">
          {farm && (
            <>
              <h1 className="text-h1 text-gray-900 truncate">{farm.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={13} className="text-gray-400" />
                <p className="text-caption text-gray-400">
                  {farm.city}, {farm.state} · {formatArea(farm.totalArea)}
                </p>
              </div>
            </>
          )}
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

      {/* ── Map container ─────────────────────────────────────────────── */}
      <div
        className="
          relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card bg-white
          h-[calc(100svh-230px)] min-h-[480px] lg:min-h-[560px]
        "
      >
        {/* SVG map (page-owned pan/zoom passed in) */}
        <StylizedFarmMap
          selected={selected}
          onSelect={setSelected}
          layers={layers}
          satelliteMode={satelliteMode}
          panZoomApi={panZoomApi}
          className="absolute inset-0 w-full h-full"
        />

        {/* Floating controls ─ top-right (zoom) */}
        <div className="absolute top-3 right-3 z-10">
          <ZoomControls
            zoom={panZoomApi.zoom}
            onZoomIn={panZoomApi.zoomIn}
            onZoomOut={panZoomApi.zoomOut}
            onReset={panZoomApi.reset}
          />
        </div>

        {/* Floating controls ─ bottom-left (layers) */}
        <div className="absolute bottom-3 left-3 z-10">
          <LayerTogglePanel layers={layers} onToggle={toggleMapLayer} />
        </div>

        {/* Floating controls ─ bottom-right (style) */}
        <div className="absolute bottom-3 right-3 z-10">
          <MapStyleToggle satelliteMode={satelliteMode} onChange={setSatelliteMode} />
        </div>

        {/* Desktop side panel (overlays the right side of the map) */}
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
              <DetailPanel selected={selected} onClose={handleClosePanel} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Hint text on first load (no element selected) */}
        {!selected && (
          <div className="absolute top-3 left-3 z-10 hidden lg:block pointer-events-none">
            <p className="text-caption text-gray-500 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-100">
              Arraste para mover · scroll para zoom · clique em um elemento
            </p>
          </div>
        )}
      </div>

      {/* ── Mobile bottom sheet ───────────────────────────────────────── */}
      <BottomSheet
        isOpen={isMobile && selected !== null}
        onClose={handleClosePanel}
        maxHeight={0.85}
      >
        <DetailPanel selected={selected} onClose={handleClosePanel} />
      </BottomSheet>
    </div>
  )
}
