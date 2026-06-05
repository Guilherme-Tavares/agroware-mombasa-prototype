import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ListTodo, Pencil, Trash2, RotateCcw, Check, Ban } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
import { TASK_STATUS_LABEL } from '@/utils/labels'
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
  pendente: 'warning', concluida: 'ok', cancelada: 'neutral',
}

export default function TaskDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const task      = useFarmStore((s) => s.tasks.find((t) => t.id === id))
  const divisions = useFarmStore((s) => s.divisions)
  const herds     = useFarmStore((s) => s.herds)
  const updateTask = useFarmStore((s) => s.updateTask)

  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!task) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<ListTodo size={28} />}
          title="Tarefa não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/tasks') }}
        />
      </div>
    )
  }

  const inactive = task.active === false
  const division = task.divisionId ? divisions.find((d) => d.id === task.divisionId) : undefined
  const herd = task.herdId ? herds.find((h) => h.id === task.herdId) : undefined

  const upd = (patch: Partial<typeof task>) => updateTask(task!.id, { ...patch, updatedAt: new Date().toISOString() })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{task.title}</h1>
          <p className="text-caption text-gray-400">{task.dueDate ? formatDate(task.dueDate) : 'Sem data prevista'}</p>
        </div>
        <Badge variant={STATUS_VARIANT[task.status] ?? 'neutral'}>{TASK_STATUS_LABEL[task.status] ?? task.status}</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Status" value={<Badge variant={STATUS_VARIANT[task.status] ?? 'neutral'} size="sm">{TASK_STATUS_LABEL[task.status] ?? task.status}</Badge>} />
        <DataRow label="Data prevista" value={task.dueDate ? formatDate(task.dueDate) : '—'} />
        {division && <DataRow label="Divisão" value={division.name} />}
        {herd && <DataRow label="Rebanho" value={herd.name} />}
        {task.description && <DataRow label="Descrição" value={task.description} />}
      </div>

      {can.writeHusbandry && (
        <div className="mt-6 flex flex-wrap gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => { upd({ active: true }); toast.success('Tarefa restaurada.') }} fullWidth>Restaurar</Button>
          ) : (
            <>
              {task.status !== 'concluida' && (
                <Button icon={<Check size={15} />} onClick={() => { upd({ status: 'concluida' }); toast.success('Tarefa concluída.') }}>Concluir</Button>
              )}
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/tasks/${task.id}/edit`)}>Editar</Button>
              {task.status === 'pendente' && (
                <Button variant="ghost" icon={<Ban size={15} />} onClick={() => { upd({ status: 'cancelada' }); toast.info('Tarefa cancelada.') }}>Cancelar</Button>
              )}
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover tarefa?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => { upd({ active: false }); setConfirmRemove(false); toast.success('Tarefa removida (exclusão lógica).') }}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A tarefa será desativada por <strong>exclusão lógica</strong> e pode ser restaurada depois.
        </p>
      </Modal>
    </motion.div>
  )
}
