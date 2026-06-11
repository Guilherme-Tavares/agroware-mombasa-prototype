import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Satellite, Palette, Beef, Droplets, Wheat, Grid3x3,
} from 'lucide-react'
import type { MapLayers } from './StylizedFarmMap.tsx'

/** Camada base do mapa: ilustrada (SVG) ou satélite (Esri). */
export type MapBaseLayer = 'ilustrada' | 'satelite'

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
      {/* Collapsed trigger: icon-only on mobile, icon + label on desktop — same
          metrics (px-3 py-2 / text-button / size-14 icon / label hidden on mobile)
          as the other corner buttons, so all heights match. On mobile the
          "Camadas" title shows in the body instead (the trigger has no label). */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-label="Camadas"
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-button text-gray-900 hover:bg-gray-50 transition-colors"
      >
        <Layers size={14} className="text-primary" />
        <span className="hidden sm:inline">Camadas</span>
        <span className="hidden sm:inline text-caption text-gray-400 ml-1">{activeCount}/4</span>
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
              <div className="flex items-center justify-between px-2 pt-0.5 pb-1 sm:hidden">
                <span className="text-button text-gray-900">Camadas</span>
                <span className="text-caption text-gray-400">{activeCount}/4</span>
              </div>
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

// ─── Base layer toggle (bottom-right) ─────────────────────────────────────────

interface MapStyleToggleProps {
  base:     MapBaseLayer
  onChange: (next: MapBaseLayer) => void
}

const BASE_ITEMS: Array<{ key: MapBaseLayer; label: string; icon: React.ReactNode }> = [
  { key: 'satelite',  label: 'Satélite',  icon: <Satellite size={14} /> },
  { key: 'ilustrada', label: 'Ilustrada', icon: <Palette   size={14} /> },
]

export function MapStyleToggle({ base, onChange }: MapStyleToggleProps) {
  return (
    <div className="flex rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
      {BASE_ITEMS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={base === key}
          className={[
            'flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
            base === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
