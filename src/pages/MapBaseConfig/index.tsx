import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Download, Trash2, MapPin, Layers, WifiOff } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import {
  TILE_SOURCES, boundsOf, tilesForBounds, prefillTiles, type TileSourceId,
} from '@/lib/tiles'
import { countTiles, clearTiles } from '@/lib/idb'
import { formatArea, formatDateTime } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Select from '@/components/ui/Select.tsx'

// Poucos níveis de zoom, restritos à área da propriedade (RF36 — volume modesto).
const ZOOM_MIN = 13
const ZOOM_MAX = 16
const TILE_CAP = 400

export default function MapBaseConfig() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const farm       = useFarmStore((s) => s.farm)
  const updateFarm = useFarmStore((s) => s.updateFarm)

  const [sourceId, setSourceId]   = useState<TileSourceId>('satelite')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [cached, setCached]       = useState<number | null>(null)

  const bounds = useMemo(
    () => (farm?.geoPolygon ? boundsOf(farm.geoPolygon) : null),
    [farm],
  )
  const estimatedTiles = useMemo(
    () => (bounds ? tilesForBounds(bounds, ZOOM_MIN, ZOOM_MAX, TILE_CAP).length : 0),
    [bounds],
  )

  useEffect(() => {
    countTiles().then(setCached).catch(() => setCached(null))
  }, [])

  async function handleDownload() {
    if (!bounds) return
    setDownloading(true)
    setProgress({ done: 0, total: estimatedTiles })
    try {
      const { stored, total } = await prefillTiles(
        sourceId, bounds, ZOOM_MIN, ZOOM_MAX,
        (done, t) => setProgress({ done, total: t }),
        TILE_CAP,
      )
      updateFarm({ mapBaseCapturedAt: new Date().toISOString() })
      setCached(await countTiles())
      toast.success(`Mapa base salvo: ${stored} novos tiles de ${total}.`)
    } catch {
      toast.error('Falha ao baixar o mapa base.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleClear() {
    await clearTiles()
    updateFarm({ mapBaseCapturedAt: null })
    setCached(0)
    toast.info('Cache de mapa offline limpo.')
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Mapa base offline</h1>
          <p className="text-caption text-gray-400">
            Baixe os tiles da propriedade para uso sem internet
          </p>
        </div>
      </div>

      {!farm?.geoPolygon ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <WifiOff size={28} className="text-gray-300" />
          <p className="text-body text-gray-500 max-w-xs">
            A propriedade ainda não tem demarcação georreferenciada. Demarque sobre
            o mapa real para então baixar o mapa base offline.
          </p>
          <Button variant="secondary" onClick={() => navigate('/demarcation')}>
            Ir para demarcação
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {/* Resumo */}
          <div className="p-5 flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Área a capturar
            </p>
            <div className="flex items-center gap-2 text-body text-gray-900">
              <MapPin size={15} className="text-primary" />
              {farm.name} · {formatArea(farm.totalArea)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Stat label="Níveis de zoom" value={`${ZOOM_MIN}–${ZOOM_MAX}`} />
              <Stat label="Tiles estimados" value={String(estimatedTiles)} />
            </div>
          </div>

          {/* Camada */}
          <div className="p-5 flex flex-col gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Camada
            </p>
            <Select
              label="Fonte do mapa"
              value={sourceId}
              options={[
                { value: 'satelite', label: 'Satélite (Esri)' },
                { value: 'mapa', label: 'Mapa de ruas (OSM)' },
              ]}
              onChange={(e) => setSourceId(e.target.value as TileSourceId)}
              disabled={downloading}
            />
            <p className="text-caption text-gray-400">
              {TILE_SOURCES[sourceId].attribution.replace(/<[^>]+>/g, '')}
            </p>
          </div>

          {/* Progresso */}
          {downloading && (
            <div className="p-5">
              <div className="flex items-center justify-between text-caption text-gray-500 mb-2">
                <span>Baixando tiles…</span>
                <span className="tabular-nums">{progress.done}/{progress.total} · {pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Estado do cache */}
          <div className="p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-caption text-gray-500">
              <Layers size={14} className="text-gray-400" />
              <span>
                {cached != null ? `${cached} tiles em cache` : 'verificando cache…'}
                {farm.mapBaseCapturedAt && (
                  <> · capturado em {formatDateTime(farm.mapBaseCapturedAt)}</>
                )}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="p-5 flex gap-3">
            {cached ? (
              <Button
                variant="ghost"
                icon={<Trash2 size={15} />}
                onClick={handleClear}
                disabled={downloading}
                className="shrink-0 text-alert"
              >
                Limpar cache
              </Button>
            ) : null}
            <Button
              fullWidth
              icon={<Download size={16} />}
              loading={downloading}
              onClick={handleDownload}
            >
              Baixar mapa base
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col p-3 rounded-xl bg-gray-50">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="font-data text-h2 text-gray-900 tabular-nums leading-tight mt-0.5">{value}</span>
    </div>
  )
}
