import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Receipt, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatCurrency } from '@/utils/format'
import { EXPENSE_GROUP_LABEL } from '@/utils/labels'
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

export default function ExpenseDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const expense    = useFarmStore((s) => s.expenses.find((e) => e.id === id))
  const categories = useFarmStore((s) => s.expenseCategories)
  const divisions  = useFarmStore((s) => s.divisions)
  const herds      = useFarmStore((s) => s.herds)
  const updateExpense = useFarmStore((s) => s.updateExpense)

  const [confirmRemove, setConfirmRemove] = useState(false)

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Despesa" width="wide" />
  }

  if (!expense) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Receipt size={28} />}
          title="Despesa não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/expenses') }}
        />
      </div>
    )
  }

  const inactive = expense.active === false
  const category = categories.find((c) => c.id === expense.categoryId)
  const division = expense.divisionId ? divisions.find((d) => d.id === expense.divisionId) : undefined
  const herd = expense.herdId ? herds.find((h) => h.id === expense.herdId) : undefined

  function handleRemove() {
    updateExpense(expense!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Despesa removida (exclusão lógica).')
  }
  function handleRestore() {
    updateExpense(expense!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Despesa restaurada.')
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
          onClick={() => navigate('/expenses')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{expense.description}</h1>
          <p className="text-caption text-gray-400">{formatDate(expense.date)}</p>
        </div>
        {inactive && <Badge variant="neutral">Removida</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Valor" value={<span className="font-data tabular-nums text-h2 text-primary">{formatCurrency(expense.amount)}</span>} />
        <DataRow label="Categoria" value={category?.name ?? '—'} />
        {category && <DataRow label="Grupo" value={<Badge variant="neutral" size="sm">{EXPENSE_GROUP_LABEL[category.group] ?? category.group}</Badge>} />}
        <DataRow label="Data" value={formatDate(expense.date)} />
        {division && <DataRow label="Divisão" value={division.name} />}
        {herd && <DataRow label="Rebanho" value={herd.name} />}
      </div>

      {can.finance && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/expenses/${expense.id}/edit`)}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover despesa?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A despesa será desativada por <strong>exclusão lógica</strong> e sai dos totais,
          mas pode ser restaurada depois.
        </p>
      </Modal>
    </motion.div>
  )
}
