import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, DollarSign, Pencil, Trash2, RotateCcw, Receipt } from 'lucide-react'
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

export default function ExpenseCategoryDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const category = useFarmStore((s) => s.expenseCategories.find((c) => c.id === id))
  const expenses = useFarmStore((s) => s.expenses)
  const updateCategory = useFarmStore((s) => s.updateExpenseCategory)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const catExpenses = useMemo(
    () => expenses.filter((e) => e.categoryId === id && e.active !== false).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, id],
  )
  const total = catExpenses.reduce((s, e) => s + e.amount, 0)

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Categoria de despesa" width="wide" />
  }

  if (!category) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<DollarSign size={28} />}
          title="Categoria não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/expense-categories') }}
        />
      </div>
    )
  }

  const inactive = category.active === false

  function handleRemove() {
    updateCategory(category!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Categoria removida (exclusão lógica). As despesas foram preservadas.')
  }
  function handleRestore() {
    updateCategory(category!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Categoria restaurada.')
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
          onClick={() => navigate('/expense-categories')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{category.name}</h1>
          <p className="text-caption text-gray-400">{EXPENSE_GROUP_LABEL[category.group] ?? category.group}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativa</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Grupo" value={<Badge variant="neutral" size="sm">{EXPENSE_GROUP_LABEL[category.group] ?? category.group}</Badge>} />
        <DataRow label="Despesas" value={String(catExpenses.length)} />
        <DataRow label="Total" value={<span className="font-data tabular-nums">{formatCurrency(total)}</span>} />
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Despesas nesta categoria</p>
        {catExpenses.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma despesa registrada.</p>
        ) : (
          <div className="flex flex-col">
            {catExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Receipt size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{e.description}</span>
                <span className="text-caption text-gray-400">{formatDate(e.date)}</span>
                <span className="font-data text-caption text-gray-900 tabular-nums">{formatCurrency(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {can.finance && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/expense-categories/${category.id}/edit`)}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover categoria?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          A categoria será desativada por <strong>exclusão lógica</strong>. As despesas já
          classificadas são preservadas e ela pode ser restaurada depois.
        </p>
      </Modal>
    </motion.div>
  )
}
