import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, CalendarRange, Pencil, Trash2, RotateCcw, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatGMD } from '@/utils/format'
import { SEASON_TYPE_LABEL } from '@/utils/labels'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms > 0 ? Math.round(ms / 86_400_000) : 0
}

export default function SeasonDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const season   = useFarmStore((s) => s.seasons.find((x) => x.id === id))
  const passages = useFarmStore((s) => s.seasonPassages)
  const herds    = useFarmStore((s) => s.herds)
  const updateSeason = useFarmStore((s) => s.updateSeason)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const seasonPassages = useMemo(
    () => passages.filter((p) => p.seasonId === id),
    [passages, id],
  )

  if (!season) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<CalendarRange size={28} />}
          title="Temporada não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/seasons') }}
        />
      </div>
    )
  }

  const inactive = season.active === false
  const herdName = (hid: string) => herds.find((h) => h.id === hid)?.name ?? 'Rebanho'

  function handleRemove() {
    updateSeason(season!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Temporada removida (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateSeason(season!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Temporada restaurada.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/seasons')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{season.name}</h1>
          <p className="text-caption text-gray-400">{SEASON_TYPE_LABEL[season.type] ?? season.type}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativa</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Tipo" value={<Badge variant="info" size="sm">{SEASON_TYPE_LABEL[season.type] ?? season.type}</Badge>} />
        <DataRow label="Início" value={formatDate(season.startDate)} />
        <DataRow label="Fim" value={formatDate(season.endDate)} />
        <DataRow label="Duração" value={`${daysBetween(season.startDate, season.endDate)} dias`} />
      </div>

      {/* Passagens (GMD) nesta temporada */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Desempenho dos lotes</p>
        {seasonPassages.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma passagem registrada nesta temporada.</p>
        ) : (
          <div className="flex flex-col">
            {seasonPassages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <TrendingUp size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{herdName(p.herdId)}</span>
                <span className="text-caption text-gray-400 tabular-nums">{p.initialWeight}→{p.finalWeight} kg</span>
                <Badge variant="ok" size="sm">{formatGMD(p.gmd)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>
              Restaurar
            </Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/seasons/${season.id}/edit`)}>
                Editar
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">
                Remover
              </Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover temporada?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A temporada será desativada por <strong>exclusão lógica</strong>. As passagens
          (GMD) registradas são preservadas e ela pode ser restaurada depois.
        </p>
      </Modal>
    </motion.div>
  )
}
