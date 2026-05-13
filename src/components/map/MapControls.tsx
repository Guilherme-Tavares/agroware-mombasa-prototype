import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Minus, Maximize2, Layers,
  Satellite, Map as MapIcon, Beef, Droplets, Wheat,
  Grid3x3,
} from 'lucide-react'
import type { MapLayers } from './StylizedFarmMap.tsx'

// ─── Zoom controls (top-right) ────────────────────────────────────────────────

interface ZoomControlsProps {
  zoom:    number
  onZoomIn:  () => void
  onZoomOut: () => void
  onReset:   () => void
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex flex-col rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
      <CtrlBtn icon={<Plus  size={16} />} onClick={onZoomIn}  ariaLabel="Aproximar" />
      <div className="h-px bg-gray-100" />
      <button
        onClick={onReset}
        aria-label="Centralizar"
        className="px-2 py-1.5 text-caption font-data text-gray-600 hover:bg-gray-50 transition-colors tabular-nums"
      >
        {Math.round(zoom * 100)}%
      </button>
      <div className="h-px bg-gray-100" />
      <CtrlBtn icon={<Minus size={16} />} onClick={onZoomOut} ariaLabel="Afastar" />
      <div className="h-px bg-gray-100" />
      <CtrlBtn icon={<Maximize2 size={14} />} onClick={onReset} ariaLabel="Resetar visualização" />
    </div>
  )
}

function CtrlBtn({
  icon, onClick, ariaLabel,
}: { icon: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {icon}
    </button>
  )
}

// ─── Layer toggle (bottom-left, expandable) ───────────────────────────────────

interface LayerTogglePanelProps {
  layers:    MapLayers
  onToggle:  (layer: keyof MapLayers) => void
}

const LAYER_ITEMS: Array<{ key: keyof MapLayers; label: string; icon: React.ReactNode }> = [
  { key: 'divisions', label: 'Divisões', icon: <Grid3x3  size={16} /> },
  { key: 'herds',     label: 'Rebanhos', icon: <Beef     size={16} /> },
  { key: 'troughs',   label: 'Cochos',   icon: <Droplets size={16} /> },
  { key: 'forages',   label: 'Forragem', icon: <Wheat    size={16} /> },
]

export function LayerTogglePanel({ layers, onToggle }: LayerTogglePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const activeCount = Object.values(layers).filter(Boolean).length

  return (
    <div className="rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
      {/* Header / collapsed state */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-button text-gray-900 hover:bg-gray-50 transition-colors"
      >
        <Layers size={16} className="text-primary" />
        <span>Camadas</span>
        <span className="text-caption text-gray-400 ml-1">{activeCount}/4</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-gray-100 p-2 flex flex-col gap-1 min-w-[180px]">
              {LAYER_ITEMS.map(({ key, label, icon }) => {
                const active = layers[key]
                return (
                  <button
                    key={key}
                    onClick={() => onToggle(key)}
                    className={[
                      'flex items-center justify-between gap-3 px-2 py-1.5 rounded-md',
                      'text-body transition-colors',
                      active ? 'text-gray-900 hover:bg-gray-50' : 'text-gray-400 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2">
                      <span className={active ? 'text-primary' : 'text-gray-400'}>{icon}</span>
                      {label}
                    </span>
                    {/* Switch pill */}
                    <span
                      className={[
                        'inline-flex h-4 w-7 rounded-full transition-colors items-center',
                        active ? 'bg-primary' : 'bg-gray-200',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform',
                          active ? 'translate-x-3.5' : 'translate-x-0.5',
                        ].join(' ')}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Style toggle (bottom-right) ──────────────────────────────────────────────

interface MapStyleToggleProps {
  satelliteMode:   boolean
  onChange: (next: boolean) => void
}

export function MapStyleToggle({ satelliteMode, onChange }: MapStyleToggleProps) {
  return (
    <div className="flex rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
      <button
        onClick={() => onChange(true)}
        className={[
          'flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
          satelliteMode ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
        ].join(' ')}
      >
        <Satellite size={14} />
        <span className="hidden sm:inline">Satélite</span>
      </button>
      <button
        onClick={() => onChange(false)}
        className={[
          'flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
          !satelliteMode ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
        ].join(' ')}
      >
        <MapIcon size={14} />
        <span className="hidden sm:inline">Mapa</span>
      </button>
    </div>
  )
}
