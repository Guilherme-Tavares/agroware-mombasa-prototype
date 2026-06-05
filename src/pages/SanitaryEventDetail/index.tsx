import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Stethoscope, Pencil, Trash2, RotateCcw, Check, Ban } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
import { SANITARY_STATUS_LABEL } from '@/utils/labels'
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

const STATUS_VARIANT: Record<string, 'warning' | 'ok' | 'neutral'> = {
  pendente: 'warning', executado: 'ok', cancelado: 'neutral',
}

export default function SanitaryEventDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const event       = useFarmStore((s) => s.sanitaryEvents.find((e) => e.id === id))
  const medications = useFarmStore((s) => s.medications)
  const herds       = useFarmStore((s) => s.herds)
  const bovines     = useFarmStore((s) => s.bovines)
  const updateSanitaryEvent = useFarmStore((s) => s.updateSanitaryEvent)

  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!event) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Stethoscope size={28} />}
          title="Evento não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/sanitary-events') }}
        />
      </div>
    )
  }

  const inactive = event.active === false
  const med = event.medicationId ? medications.find((m) => m.id === event.medicationId) : undefined
  const target = event.herdId ? herds.find((h) => h.id === event.herdId)?.name
    : event.bovineId ? bovines.find((b) => b.id === event.bovineId)?.name
    : 'Toda a propriedade'

  function handleRemove() {
    updateSanitaryEvent(event!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Evento removido (exclusão lógica).')
  }
  function handleRestore() {
    updateSanitaryEvent(event!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Evento restaurado.')
  }
  function handleCancel() {
    updateSanitaryEvent(event!.id, { status: 'cancelado', updatedAt: new Date().toISOString() })
    toast.info('Evento cancelado.')
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
          onClick={() => navigate('/sanitary-events')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{event.type}</h1>
          <p className="text-caption text-gray-400">{formatDate(event.scheduledDate)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[event.status] ?? 'neutral'}>{SANITARY_STATUS_LABEL[event.status] ?? event.status}</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Data programada" value={formatDate(event.scheduledDate)} />
        <DataRow label="Alvo" value={target} />
        <DataRow label="Medicamento" value={med?.commercialName ?? '—'} />
        {event.executionDate && <DataRow label="Executado em" value={formatDate(event.executionDate)} />}
        {event.notes && <DataRow label="Observações" value={event.notes} />}
      </div>

      {event.status === 'pendente' && !inactive && can.writeHusbandry && (
        <button
          onClick={() => navigate('/operations/sanitary-execution')}
          className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-primary-bg text-left hover:bg-primary/10 transition-colors"
        >
          <Check size={18} className="text-primary shrink-0" />
          <span className="flex-1 text-body text-gray-900">Executar evento</span>
          <span className="text-caption text-primary font-medium">Abrir</span>
        </button>
      )}

      {can.writeHusbandry && (
        <div className="mt-6 flex flex-wrap gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/sanitary-events/${event.id}/edit`)}>Editar</Button>
              {event.status === 'pendente' && (
                <Button variant="ghost" icon={<Ban size={15} />} onClick={handleCancel}>Cancelar evento</Button>
              )}
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover evento?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O evento será desativado por <strong>exclusão lógica</strong> e pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
