import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { EXPENSE_GROUP_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function ExpenseCategoryList() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const categories = useFarmStore((s) => s.expenseCategories)
  const { can }    = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories
      .filter((c) => c.propertyId === farm?.id)
      .filter((c) => (showInactive ? true : c.active !== false))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (EXPENSE_GROUP_LABEL[c.group] ?? c.group).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [categories, farm, showInactive, search])

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Categorias de despesa" width="wide" />
  }

  return (
    <ConsultScreen
      title="Categorias de despesa"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome ou grupo..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.finance ? () => navigate('/expense-categories/new') : undefined}
      newLabel="Nova categoria"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={28} />}
          title={search ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Cadastre categorias para classificar despesas.'}
          action={can.finance ? { label: 'Nova categoria', onClick: () => navigate('/expense-categories/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const inactive = c.active === false
            return (
              <motion.button
                key={c.id}
                layout
                onClick={() => navigate(`/expense-categories/${c.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <DollarSign size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{c.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativa</Badge>}
                  </div>
                </div>
                <Badge variant="neutral" size="sm">{EXPENSE_GROUP_LABEL[c.group] ?? c.group}</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
