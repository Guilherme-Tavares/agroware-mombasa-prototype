import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, MapPinned, Pencil, Crown, CheckCircle2, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import { formatArea } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function PropertyDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()

  const farm = useFarmStore((s) => s.farms.find((f) => f.id === id))
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const currentUserId    = useFarmStore((s) => s.currentUserId)
  const users            = useFarmStore((s) => s.users)
  const divisions        = useFarmStore((s) => s.divisions)
  const setActiveProperty = useFarmStore((s) => s.setActiveProperty)

  const divisionCount = useMemo(() => divisions.filter((d) => d.farmId === id && d.active !== false).length, [divisions, id])

  if (!farm) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<MapPinned size={28} />}
          title="Propriedade não encontrada"
          description="O registro pode não existir mais."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/properties') }}
        />
      </div>
    )
  }

  const isActive = farm.id === activePropertyId
  const isOwner = farm.ownerId === currentUserId
  const ownerName = users.find((u) => u.id === farm.ownerId)?.name ?? '—'
  const demarcated = farm.polygon.length >= 3
  const georeferenced = (farm.geoPolygon?.length ?? 0) >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/properties')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate flex items-center gap-1.5">
            {farm.name}
            {isOwner && <Crown size={15} className="text-warning" aria-label="Você é o dono" />}
          </h1>
          <p className="text-caption text-gray-400">{farm.city}, {farm.state}</p>
        </div>
        {isActive && <Badge variant="ok">Ativa</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Área total" value={<span className="font-data tabular-nums">{formatArea(farm.totalArea)}</span>} />
        <DataRow label="Município" value={`${farm.city}, ${farm.state}`} />
        <DataRow label="Dono" value={ownerName} />
        <DataRow label="Divisões" value={String(divisionCount)} />
        <DataRow label="Demarcação" value={
          demarcated
            ? <Badge variant={georeferenced ? 'ok' : 'warning'} size="sm">{georeferenced ? 'Georreferenciada' : 'Ilustrada'}</Badge>
            : <Badge variant="neutral" size="sm">Não demarcada</Badge>
        } />
        {farm.mapBaseCapturedAt && <DataRow label="Mapa offline" value="Capturado" />}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {!isActive && (
          <Button variant="secondary" icon={<CheckCircle2 size={15} />} onClick={() => { setActiveProperty(farm.id); toast.success(`${farm.name} é a propriedade ativa.`) }}>
            Tornar ativa
          </Button>
        )}
        <button
          onClick={() => navigate('/demarcation')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white text-left hover:bg-gray-50 transition-colors"
        >
          <MapPin size={18} className="text-primary shrink-0" />
          <span className="flex-1 text-body text-gray-900">{demarcated ? 'Rever demarcação' : 'Demarcar propriedade'}</span>
          <span className="text-caption text-primary font-medium">Abrir</span>
        </button>
      </div>

      {isOwner && (
        <div className="mt-6 flex gap-3 pb-4">
          <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/properties/${farm.id}/edit`)}>
            Editar
          </Button>
        </div>
      )}

      <p className="text-caption text-gray-400 mt-2 px-1">
        A posse é imutável (muda só por transferência) e a propriedade não pode ser
        apagada por outro usuário — por isso não há remoção aqui.
      </p>
    </motion.div>
  )
}
