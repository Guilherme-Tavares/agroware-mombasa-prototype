import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, Polygon, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Undo2, Check, Ruler } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import {
  geoPolygonAreaHa, geoPolygonPerimeterM, geoCentroid, geoToViewbox,
} from '@/utils/geometry'
import { TILE_SOURCES } from '@/lib/tiles'
import OfflineTiles from './OfflineTiles.tsx'
import Button from '@/components/ui/Button.tsx'
import Modal from '@/components/ui/Modal.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { GeoPoint, Division, DivisionType } from '@/types/domain'

type LatLng = [number, number]
const toLatLng = (g: GeoPoint): LatLng => [g.lat, g.lng]

type Target = 'property' | 'division'

const DIVISION_TYPE_OPTIONS = [
  { value: 'pasto', label: 'Pastagem' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'curral', label: 'Curral' },
  { value: 'manga', label: 'Manga' },
  { value: 'instalacao', label: 'Instalação' },
]

// Captura cliques no mapa: adiciona vértice ou fecha o polígono ao clicar
// próximo ao primeiro vértice. Lê estado via refs para evitar closures velhas.
function ClickCapture({
  verticesRef, closedRef, onAdd, onClose,
}: {
  verticesRef: React.MutableRefObject<GeoPoint[]>
  closedRef: React.MutableRefObject<boolean>
  onAdd: (p: GeoPoint) => void
  onClose: () => void
}) {
  const map = useMapEvents({
    click(e) {
      if (closedRef.current) return
      const v = verticesRef.current
      if (v.length >= 3) {
        const p0 = map.latLngToContainerPoint([v[0].lat, v[0].lng])
        const pc = map.latLngToContainerPoint(e.latlng)
        if (p0.distanceTo(pc) < 16) {
          onClose()
          return
        }
      }
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

interface GeoDemarcationProps {
  onCancel: () => void
}

export default function GeoDemarcation({ onCancel }: GeoDemarcationProps) {
  const navigate    = useNavigate()
  const toast       = useToast()
  const farm        = useFarmStore((s) => s.farm)
  const updateFarm  = useFarmStore((s) => s.updateFarm)
  const addDivision = useFarmStore((s) => s.addDivision)

  const [vertices, setVertices] = useState<GeoPoint[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Formulário do modal
  const [target, setTarget]     = useState<Target>('property')
  const [name, setName]         = useState(farm?.name ?? 'Sítio Santa Fé')
  const [city, setCity]         = useState(farm?.city ?? '')
  const [uf, setUf]             = useState(farm?.state ?? '')
  const [divType, setDivType]   = useState<DivisionType>('pasto')

  // Refs com o valor mais recente, lidos no handler de clique do Leaflet (ligado
  // uma vez). Atualizados em efeito para não escrever na ref durante o render.
  const verticesRef = useRef<GeoPoint[]>(vertices)
  const closedRef = useRef<boolean>(isClosed)
  useEffect(() => { verticesRef.current = vertices }, [vertices])
  useEffect(() => { closedRef.current = isClosed }, [isClosed])

  const areaHa      = useMemo(() => geoPolygonAreaHa(vertices), [vertices])
  const perimeterM  = useMemo(() => geoPolygonPerimeterM(vertices), [vertices])
  const canConclude = vertices.length >= 3

  const center: LatLng = farm?.geoCenter ? toLatLng(farm.geoCenter) : [-10.9295, -61.9912]
  const sat = TILE_SOURCES.satelite

  function handleAdd(p: GeoPoint) {
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
  function handleModalClose() {
    setShowModal(false)
    setIsClosed(false)
  }

  function handleSave() {
    setSaving(true)
    const geoPolygon = vertices
    const relative = geoToViewbox(geoPolygon)
    setTimeout(() => {
      if (target === 'property') {
        updateFarm({
          geoPolygon,
          geoCenter: geoCentroid(geoPolygon),
          polygon: relative,
          totalArea: parseFloat(areaHa.toFixed(1)),
          perimeter: parseFloat(perimeterM.toFixed(0)),
          name: name.trim() || 'Sítio Santa Fé',
          city: city.trim(),
          state: uf.trim().toUpperCase(),
        })
        toast.success('Propriedade demarcada sobre o mapa real.')
      } else {
        const division: Division = {
          id: crypto.randomUUID(),
          farmId: farm?.id ?? '',
          name: name.trim() || 'Nova divisão',
          area: parseFloat(areaHa.toFixed(1)),
          type: divType,
          status: 'active',
          polygon: relative,
          geoPolygon,
          active: true,
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
      {/* Canvas (mapa real) */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card"
        style={{ height: 'calc(100svh - 320px)', minHeight: '360px' }}
      >
        <MapContainer center={center} zoom={15} scrollWheelZoom className="w-full h-full" style={{ background: '#0b1f12' }}>
          <OfflineTiles sourceId="satelite" url={sat.url} attribution={sat.attribution} maxZoom={sat.maxZoom} />
          <ClickCapture
            verticesRef={verticesRef}
            closedRef={closedRef}
            onAdd={handleAdd}
            onClose={handleClose}
          />

          {/* Arestas */}
          {positions.length >= 2 && !isClosed && (
            <Polyline positions={positions} pathOptions={{ color: '#FFFFFF', weight: 2.5, dashArray: '8 6' }} />
          )}
          {positions.length >= 3 && isClosed && (
            <Polygon positions={positions} pathOptions={{ color: '#FFFFFF', weight: 2.5, fillColor: '#2E7D32', fillOpacity: 0.25 }} />
          )}

          {/* Vértices numerados */}
          {vertices.map((v, i) => (
            <CircleMarker
              key={i}
              center={toLatLng(v)}
              radius={i === 0 ? 9 : 7}
              pathOptions={{
                color: '#FFFFFF', weight: 2,
                fillColor: i === 0 ? '#1B5E20' : '#2E7D32', fillOpacity: 1,
              }}
            />
          ))}
        </MapContainer>

        {/* Card de área */}
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

        {/* Dica */}
        {vertices.length === 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-1.5 pointer-events-none">
            <span className="text-caption text-gray-600">Clique no mapa para marcar os cantos</span>
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

      {/* Modal de confirmação */}
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

          {/* Alvo: propriedade ou nova divisão */}
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
