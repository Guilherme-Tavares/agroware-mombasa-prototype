import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Sprout, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
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

export default function ForageDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const planting  = useFarmStore((s) => s.foragePlantings.find((p) => p.id === id))
  const divisions = useFarmStore((s) => s.divisions)
  const forages   = useFarmStore((s) => s.forages)
  const updateForagePlanting = useFarmStore((s) => s.updateForagePlanting)

  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!planting) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Sprout size={28} />}
          title="Forragem não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/forages') }}
        />
      </div>
    )
  }

  const inactive = planting.active === false
  const division = divisions.find((d) => d.id === planting.divisionId)
  const species = planting.speciesId ? forages.find((f) => f.id === planting.speciesId) : undefined

  function handleRemove() {
    updateForagePlanting(planting!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Forragem removida (exclusão lógica).')
  }
  function handleRestore() {
    updateForagePlanting(planting!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Forragem restaurada.')
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
          onClick={() => navigate('/forages')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{species?.name ?? planting.type}</h1>
          <p className="text-caption text-gray-400">{division?.name ?? 'Divisão'}</p>
        </div>
        {inactive ? <Badge variant="neutral">Substituída</Badge> : <Badge variant="ok">Ativa</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Espécie" value={species?.name ?? planting.type} />
        {species?.scientificName && <DataRow label="Nome científico" value={<span className="italic">{species.scientificName}</span>} />}
        <DataRow label="Divisão" value={division?.name ?? '—'} />
        <DataRow label="Implantação" value={planting.plantingDate ? formatDate(planting.plantingDate) : '—'} />
        <DataRow label="Situação" value={inactive ? 'Substituída / inativa' : 'Ativa na divisão'} />
      </div>

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/forages/${planting.id}/edit`)}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover forragem?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A forragem será desativada por <strong>exclusão lógica</strong>. O registro é
          preservado no histórico de plantios da divisão e pode ser restaurado.
        </p>
      </Modal>
    </motion.div>
  )
}
