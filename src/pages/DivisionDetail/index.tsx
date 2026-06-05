import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Layers, Pencil, Trash2, RotateCcw, Droplets, ArrowLeftRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatArea, formatDate } from '@/utils/format'
import { DIVISION_TYPE_LABEL } from '@/utils/labels'
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

export default function DivisionDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const division    = useFarmStore((s) => s.divisions.find((d) => d.id === id))
  const forages     = useFarmStore((s) => s.forages)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const herds       = useFarmStore((s) => s.herds)
  const allocations = useFarmStore((s) => s.allocations)
  const updateDivision = useFarmStore((s) => s.updateDivision)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const troughs = useMemo(() => feedTroughs.filter((t) => t.divisionId === id), [feedTroughs, id])
  const divAllocations = useMemo(
    () => allocations
      .filter((a) => a.divisionId === id)
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
    [allocations, id],
  )

  if (!division) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Layers size={28} />}
          title="Divisão não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/divisions') }}
        />
      </div>
    )
  }

  const inactive = division.active === false
  const forage = division.forageId ? forages.find((f) => f.id === division.forageId) : undefined
  const herdName = (hid: string) => herds.find((h) => h.id === hid)?.name ?? 'Rebanho'

  function handleRemove() {
    updateDivision(division!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Divisão removida (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateDivision(division!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Divisão restaurada.')
  }

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
          onClick={() => navigate('/divisions')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{division.name}</h1>
          <p className="text-caption text-gray-400">{DIVISION_TYPE_LABEL[division.type] ?? division.type}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativa</Badge>}
      </div>

      {/* Dados */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Tipo" value={DIVISION_TYPE_LABEL[division.type] ?? division.type} />
        <DataRow label="Área" value={<span className="font-data tabular-nums">{formatArea(division.area)}</span>} />
        <DataRow label="Status" value={
          <Badge variant={division.status === 'active' ? 'ok' : 'neutral'} size="sm">
            {division.status === 'active' ? 'Ativa' : 'Inativa'}
          </Badge>
        } />
        <DataRow label="Forrageira" value={forage?.name ?? 'Sem forrageira'} />
        {division.forageStartDate && <DataRow label="Implantação" value={formatDate(division.forageStartDate)} />}
        <DataRow label="Cochos" value={String(troughs.length)} />
      </div>

      {/* Cochos */}
      {troughs.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Cochos na divisão</p>
          <div className="flex flex-col">
            {troughs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Droplets size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1">{t.identifier}</span>
                <span className="font-data text-caption text-gray-500 tabular-nums">{t.currentAmount}/{t.capacity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de lotação */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Histórico de lotação</p>
        {divAllocations.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma lotação registrada.</p>
        ) : (
          <div className="flex flex-col">
            {divAllocations.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <ArrowLeftRight size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{herdName(a.herdId)}</span>
                <span className="text-caption text-gray-400 tabular-nums">{formatDate(a.startDate)}</span>
                {a.active && <Badge variant="ok" size="sm">Atual</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>
              Restaurar
            </Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/divisions/${division.id}/edit`)}>
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
        title="Remover divisão?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A divisão será desativada por <strong>exclusão lógica</strong>: sai das listas
          ativas, mas o histórico (lotações, cochos) é preservado e ela pode ser restaurada.
        </p>
      </Modal>
    </motion.div>
  )
}
