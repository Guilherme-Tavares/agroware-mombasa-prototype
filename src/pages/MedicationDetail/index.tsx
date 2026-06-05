import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Pill, Pencil, Trash2, RotateCcw, Syringe } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/utils/format'
import { MEDICATION_TYPE_LABEL } from '@/utils/labels'
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

export default function MedicationDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const medication  = useFarmStore((s) => s.medications.find((m) => m.id === id))
  const stocks      = useFarmStore((s) => s.medicationStocks)
  const applications = useFarmStore((s) => s.medicationApplications)
  const bovines     = useFarmStore((s) => s.bovines)
  const updateMedication = useFarmStore((s) => s.updateMedication)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const stock = useMemo(() => stocks.find((s) => s.medicationId === id), [stocks, id])
  const apps = useMemo(
    () => applications.filter((a) => a.medicationId === id).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
    [applications, id],
  )

  if (!medication) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Pill size={28} />}
          title="Medicamento não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/medications') }}
        />
      </div>
    )
  }

  const inactive = medication.active === false
  const bovineName = (bid: string) => bovines.find((b) => b.id === bid)?.name ?? 'Bovino'

  function handleRemove() {
    updateMedication(medication!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Medicamento removido (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateMedication(medication!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Medicamento restaurado.')
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
          onClick={() => navigate('/medications')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{medication.commercialName}</h1>
          <p className="text-caption text-gray-400">{MEDICATION_TYPE_LABEL[medication.type] ?? medication.type}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativo</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Tipo" value={<Badge variant="neutral" size="sm">{MEDICATION_TYPE_LABEL[medication.type] ?? medication.type}</Badge>} />
        <DataRow label="Princípio ativo" value={medication.activeIngredient ?? '—'} />
        <DataRow label="Estoque atual" value={stock ? <span className="font-data tabular-nums">{stock.quantity} {stock.unit}</span> : 'Sem estoque'} />
        {stock && <DataRow label="Estoque mínimo" value={`${stock.minimumStock} ${stock.unit}`} />}
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Aplicações</p>
        {apps.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma aplicação registrada.</p>
        ) : (
          <div className="flex flex-col">
            {apps.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Syringe size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{bovineName(a.bovineId)}</span>
                <span className="font-data text-caption text-gray-500 tabular-nums">{a.dose} {a.doseUnit}</span>
                <span className="text-caption text-gray-400">{formatDateTime(a.appliedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/medications/${medication.id}/edit`)}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover medicamento?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O medicamento será desativado por <strong>exclusão lógica</strong>. As aplicações e o
          estoque permanecem e ele pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
