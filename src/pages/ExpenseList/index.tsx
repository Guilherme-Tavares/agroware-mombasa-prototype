import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Receipt, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatDate, formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function ExpenseList() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const expenses   = useFarmStore((s) => s.expenses)
  const categories = useFarmStore((s) => s.expenseCategories)
  const { can }    = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoria'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses
      .filter((e) => e.propertyId === farm?.id)
      .filter((e) => (showInactive ? true : e.active !== false))
      .filter((e) => !q || e.description.toLowerCase().includes(q) || catName(e.categoryId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, farm, showInactive, search])

  const total = filtered.filter((e) => e.active !== false).reduce((s, e) => s + e.amount, 0)

  return (
    <ConsultScreen
      title="Despesas"
      subtitle={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''} · ${formatCurrency(total)}`}
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por descrição ou categoria..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.finance ? () => navigate('/expenses/new') : undefined}
      newLabel="Nova despesa"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={28} />}
          title={search ? 'Nenhuma despesa encontrada' : 'Nenhuma despesa'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Registre as despesas da propriedade.'}
          action={can.finance ? { label: 'Nova despesa', onClick: () => navigate('/expenses/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((e) => {
            const inactive = e.active === false
            return (
              <motion.button
                key={e.id}
                layout
                onClick={() => navigate(`/expenses/${e.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{e.description}</span>
                    {inactive && <Badge variant="neutral" size="sm">Removida</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">{catName(e.categoryId)} · {formatDate(e.date)}</p>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{formatCurrency(e.amount)}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
